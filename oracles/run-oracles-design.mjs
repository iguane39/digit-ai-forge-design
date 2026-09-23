#!/usr/bin/env node
// run-oracles-design — point d'entrée unique des oracles de la forge design.
//
// Un seul chemin à connaître pour les skills, au lieu de cinq. Détecte quels
// oracles s'appliquent à la cible, les lance, agrège les verdicts, et déclare
// explicitement ceux qui sont SANS OBJET ou indisponibles — jamais PASS par défaut.
//
// Résolution de la racine de forge, dans l'ordre :
//   1. --racine <chemin>
//   2. $FORGE_DESIGN_ROOT
//   3. FORGE_DESIGN_ROOT dans le .env voisin
//   4. le dossier parent de ce script
// Aucune racine résolue ⇒ exit 2 et verdict SKIP. Un contrôle qui ne trouve pas
// ses oracles ne se tait pas : il le dit.
//
// Contrat : JSON sur stdout, exit 0 = PASS, 1 = FAIL, 2 = indéterminé.
// Usage :
//   node run-oracles-design.mjs <fichier.html> [--mobile] [--tokens t.css] [--json-only] [--rendu]
//   node run-oracles-design.mjs --corpus <dossier-corpus>
//   node run-oracles-design.mjs --dtcg <source.tokens.json> <tokens.css>
//
// --rendu : détecte render_page.py (digit-ai-page-html) et oracle-a11y.py
// (quality-oracles) aux chemins canoniques sous ~/.claude/skills/. Si les deux
// scripts, un interpréteur Python et le module playwright sont disponibles,
// les exécute sur une copie temporaire du HTML fourni (thème clair) ET sur
// une copie temporaire avec data-theme="dark" injecté (thème sombre), puis
// lance oracle-a11y.py sur l'original — jamais d'écriture à côté du fichier
// cible. Sans --rendu, comportement strictement inchangé. Outillage manquant
// ⇒ SKIP motivé dans les résultats, jamais une erreur.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detecterOutillageRendu, injecterThemeSombre } from './lib/rendu.mjs';
import { lireGrille } from './lib/grille.mjs';
import { blocsDuSocle, neutraliser } from './lib/socle.mjs';
import { estCibleMobile, MOTIF_SANS_OBJET } from './lib/cible-mobile.mjs';

const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const rendu = args.includes('--rendu');
// Grille de rendu — LUE au corpus, jamais écrite ici (TF-1066, loi n° 4 du noyau :
// une donnée volatile est une donnée, pas du code). Source, date et raison de chaque
// largeur : corpus\grille-viewports.json, entrée GL45 de corpus\guidelines.csv.
const GRILLE = lireGrille();
const LARGEURS_RENDU = GRILLE.rendus;
const LARGEUR_CONCEPTION = GRILLE.largeurConception;
const opt = n => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const cible = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--racine'
  && args[args.indexOf(a) - 1] !== '--tokens' && args[args.indexOf(a) - 1] !== '--corpus'
  && args[args.indexOf(a) - 1] !== '--oracle');

// ── TF-1241 (22/09/2026) · UN SEUL JUGE, AVEC LA PASSE DU SOCLE, À LA FORME DU LANCEUR GÉNÉRAL ──
// Le lanceur général de quality-oracles (`run-oracles.mjs`) indexait oracle-slop et oracle-tokens
// par leur commande DIRECTE : il les jouait un par un, SANS la passe d'imputation au socle que ce
// point d'entrée porte depuis TF-0830. Mesuré le 19/09 sur une même page, le même jour : ce point
// d'entrée rendait PASS (22 constats au compte du socle, 0 à la page), le lanceur général rendait
// NON CONFORME sur 26 constats — tous portés par un composant que l'auteur n'a pas le droit de
// modifier. Et c'est le lanceur général qui écrit le journal de la page. La passe n'est pas
// dupliquée chez lui : elle vit ici, et deux options la rendent empruntable.
//   --oracle <nom>     ne joue QUE ce juge (« slop », « tokens »…), sur la page puis sur la copie
//                      sans socle — la liste des juges reste décidée une fois, sur le document.
//   --contrat-runner   rend la forme d'ENTRÉE du lanceur, `{oracle, domaine, artefact, verdict,
//                      findings[], non_juge[]}`, exit 0/1/2 — celle d'un oracle direct, imputation
//                      faite, les constats du socle restant RENDUS dans `socle_exempte`.
const seul = opt('--oracle');
const contratRunner = args.includes('--contrat-runner');

function racineDeForge() {
  const ici = path.dirname(fileURLToPath(import.meta.url));
  if (opt('--racine')) return opt('--racine');
  if (process.env.FORGE_DESIGN_ROOT) return process.env.FORGE_DESIGN_ROOT;
  for (const candidat of [path.join(ici, '..', '.env'), path.join(process.cwd(), '.env')]) {
    if (!fs.existsSync(candidat)) continue;
    const m = /^FORGE_DESIGN_ROOT\s*=\s*(.+)$/m.exec(fs.readFileSync(candidat, 'utf8'));
    if (m && m[1].trim()) return m[1].trim();
  }
  return path.join(ici, '..');
}

const RACINE = racineDeForge();
const ORACLES = path.join(RACINE, 'oracles');

// `socle_exempte` n'est rempli qu'en mode livrable (TF-0830) : les blocs du socle
// reconnus, ceux qui n'ont pas pu l'être avec leur raison, et — nommés un par un — les
// constats mis au compte du socle. Rien n'est effacé : ce qui sort du verdict reste lisible.
let socleExempte = null;

function sortir(verdict, resultats, nonJuge, code) {
  // TF-1241 — la forme d'ENTRÉE du lanceur général, pour un seul juge. Le verdict et le code sont
  // ceux du juge APRÈS imputation au socle ; les constats mis au compte du socle ne sont pas
  // effacés, ils partent dans `socle_exempte`, et le non_juge dit pourquoi.
  if (contratRunner && seul) {
    const r = resultats[0] || { oracle: `oracle-${seul}`, verdict, findings: [], non_juge: [] };
    const v = r.verdict || verdict;
    process.stdout.write(JSON.stringify({
      oracle: r.oracle || `oracle-${seul}`, domaine: r.domaine || null,
      artefact: cible || null, verdict: v, findings: r.findings || [], non_juge: nonJuge,
      ...(socleExempte ? { socle_exempte: socleExempte } : {}),
      emprunte: 'run-oracles-design --oracle (passe d\'imputation au socle, TF-0830 / TF-1241)',
    }));
    process.exit(v === 'FAIL' ? 1 : v === 'PASS' ? 0 : 2);
  }
  process.stdout.write(JSON.stringify({
    orchestrateur: 'run-oracles-design', racine: RACINE, artefact: cible || opt('--corpus') || null,
    // La grille est DITE, pas seulement passée à render_page.py : un lecteur du JSON
    // doit pouvoir constater à quelles largeurs le verdict a été rendu (TF-1066).
    grille_rendu: {
      largeur_conception: LARGEUR_CONCEPTION, largeurs: LARGEURS_RENDU.split(',').map(Number),
      source: 'corpus/grille-viewports.json', date: GRILLE.date,
    },
    verdict, oracles: resultats, non_juge: nonJuge,
    ...(socleExempte ? { socle_exempte: socleExempte } : {}),
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!fs.existsSync(ORACLES)) {
  sortir('SKIP', [], [`racine de forge non résolue : ${ORACLES} introuvable. Poser FORGE_DESIGN_ROOT dans .env ou passer --racine`], 2);
}

function lancer(oracle, argv) {
  const script = path.join(ORACLES, oracle);
  if (!fs.existsSync(script)) {
    return { oracle, verdict: 'SKIP', raison: `${oracle} absent de ${ORACLES}`, findings: [], non_juge: [] };
  }
  const r = spawnSync(process.execPath, [script, ...argv, '--json-only'], { encoding: 'utf8' });
  if (r.error) return { oracle, verdict: 'SKIP', raison: 'exécution impossible : ' + r.error.message, findings: [], non_juge: [] };
  try {
    const j = JSON.parse(r.stdout.trim());
    const durs = (j.findings || []).filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
    return {
      oracle: j.oracle, domaine: j.domaine, verdict: j.verdict, exit: r.status,
      ecarts_durs: durs.length,
      avertissements: (j.findings || []).filter(f => f.sev === 'avertissement').length,
      findings: j.findings || [], non_juge: j.non_juge || [],
    };
  } catch {
    return { oracle, verdict: 'SKIP', raison: 'sortie illisible (exit ' + r.status + ')', findings: [], non_juge: [] };
  }
}

// ── --rendu : détection + exécution de render_page.py et oracle-a11y.py ────
// Chemins canoniques, ceux que grille.md et criteres-sortie.md documentent :
//   ~/.claude/skills/digit-ai-page-html/scripts/render_page.py
//   ~/.claude/skills/quality-oracles/scripts/oracle-a11y.py
// Détection mutualisée dans lib/rendu.mjs (réutilisée par oracle-baseline.mjs).

function nettoyerRendu(tmpHtml) {
  const dir = path.dirname(tmpHtml);
  const stem = path.basename(tmpHtml, path.extname(tmpHtml));
  for (const f of fs.readdirSync(dir)) {
    if (f === path.basename(tmpHtml) || f.startsWith(stem + '-w')) {
      try { fs.unlinkSync(path.join(dir, f)); } catch { /* best-effort */ }
    }
  }
}

// TF-1100 (14/09/2026, récidive de la classe close en TF-0885/TF-0278) — cet agrégateur
// tenait sa PROPRE COPIE de la sévérité par famille (durs/avert/info ci-dessous, en
// commentaire pour mémoire), pendant que render_page.py fait évoluer son registre FAMILLES
// (nouvelles familles bloquantes : l2_conteneur, l2_filet, etat_muet, v9_actif_invisible,
// contenu_rogne, controles_desalignes, rognage_donnees, prose_etroite,
// conteneur_bride_donnees, sommaire_perdu, etats_indiscernables, entete_pose_sur_lignes,
// entete_masque_par_collants, v18_prose_etiree, v18_tableau_etrique…). Le garde-fou de
// TF-0278 (le bloc « inconnues » plus bas) REND VISIBLE une famille non répertoriée ici,
// mais il ne corrige pas sa sévérité : il la démontait systématiquement en avertissement,
// puis rattrapait l'incohérence de verdict par un finding bloquant PLACEHOLDER (« relancer
// render_page.py pour le détail ») — visible, mais faux : v18_prose_etiree EST bloquante
// pour render_page.py lui-même (FAMILLES, sev="bloquant"), pas seulement pour son verdict
// global. Le fichier source le dit explicitement : « --familles publie cette table : un
// consommateur la LIT au lieu d'en tenir une copie. » Cet agrégateur ne la lisait pas.
// Fait mesuré le 14/09 : `render_page.py --familles` liste 21 familles ; ce fichier n'en
// codait que 8 en dur avant ce correctif.
let FAMILLES_CACHE = null;
function familles(outillage) {
  if (FAMILLES_CACHE !== null) return FAMILLES_CACHE;
  const r = spawnSync(outillage.python, [outillage.renderPage, '--familles'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) { FAMILLES_CACHE = null; return null; }
  try {
    const j = JSON.parse(r.stdout.trim());
    FAMILLES_CACHE = (j.schema === 'digit-ai/familles-mesure@1' && j.familles) ? j.familles : null;
  } catch { FAMILLES_CACHE = null; }
  return FAMILLES_CACHE;
}
// Repli si `--familles` est indisponible (render_page.py trop ancien, ou exécution
// impossible) : la copie historique, connue incomplète — mieux qu'un agrégateur muet,
// mais le bloc « inconnues » plus bas reste la seule garantie tant que ce repli sert.
const REPLI_DUR = { v1_overflow: 'V1', v2_contrast: 'V2', v4_overlap: 'V4', l2_width: 'L2', l2_gouttiere: 'L2' };
const REPLI_AVERT = { v3_align: 'V3', v7_spacing: 'V7' };
const REPLI_INFO = { unmeasured: '—' };

// Le code court (« V1 », « L2 »…) qui préfixe le libellé d'une famille — repris tel quel
// pour que les règles publiées par cet agrégateur ne changent pas de nom au fil des versions
// de render_page.py. Sans préfixe reconnaissable (ex. « État vide MUET… »), le nom de la
// famille elle-même sert de règle, jamais un code inventé.
const codeDe = libelle => (/^([A-Z]+\d+)\b/.exec(libelle || '') || [, null])[1];

function lancerRenderPage(tmpHtml, etiquette, outillage) {
  const r = spawnSync(outillage.python,
    [outillage.renderPage, tmpHtml, '--widths', LARGEURS_RENDU, '--output', 'json'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.error) {
    return { oracle: `render_page(${etiquette})`, verdict: 'SKIP',
      raison: 'exécution impossible : ' + r.error.message, findings: [], non_juge: [] };
  }
  let j;
  try { j = JSON.parse(r.stdout.trim()); }
  catch {
    return { oracle: `render_page(${etiquette})`, verdict: 'SKIP',
      raison: `sortie illisible (exit ${r.status}) : ${(r.stderr || '').slice(0, 300)}`, findings: [], non_juge: [] };
  }

  const reg = familles(outillage);
  const repliUtilise = reg === null;
  const findings = [];
  const inconnues = new Set();
  for (const [largeur, bp] of Object.entries(j.breakpoints || {})) {
    const issues = bp.issues || {};
    for (const [cle, liste] of Object.entries(issues)) {
      if (!Array.isArray(liste) || !liste.length) continue;
      const fam = reg && reg[cle];
      let sev, regle;
      if (fam) { sev = fam.severite; regle = codeDe(fam.libelle) || `render_page:${cle}`; }
      else if (cle in REPLI_DUR) { sev = 'bloquant'; regle = REPLI_DUR[cle]; }
      else if (cle in REPLI_AVERT) { sev = 'avertissement'; regle = REPLI_AVERT[cle]; }
      else if (cle in REPLI_INFO) { sev = 'info'; regle = REPLI_INFO[cle]; }
      else { sev = 'avertissement'; regle = `render_page:${cle}`; inconnues.add(cle); }
      for (const it of liste) findings.push({ sev, regle, msg: `${largeur}px — ${it.what} — ${it.detail}` });
    }
  }
  // Filet de cohérence : un FAIL sans aucun constat dur propagé serait
  // exactement le défaut que ce correctif ferme. Le dire plutôt que le taire.
  if (j.verdict === 'FAIL' && !findings.some(f => f.sev === 'bloquant')) {
    findings.push({ sev: 'bloquant', regle: '—',
      msg: `render_page rend FAIL sans constat bloquant propageable — relancer render_page.py sur ${path.basename(tmpHtml)} pour le détail` });
  }
  const nonJugeRendu = ['V5 croisements de flèches et V6 images déformées — inspection visuelle des PNG produits, non jugés ici'];
  if (repliUtilise) {
    nonJugeRendu.push('`render_page.py --familles` indisponible (exécution impossible, ou schéma inattendu) : sévérités lues '
      + 'depuis la copie de repli de cet agrégateur, connue incomplète — une famille bloquante absente de ce repli '
      + `redescendrait en avertissement${inconnues.size ? ` (ici : ${[...inconnues].join(', ')})` : ''}`);
  } else if (inconnues.size) {
    // Ne devrait plus arriver : `reg` vient de la même exécution de render_page.py que les
    // issues[] elles-mêmes. Une clé absente du registre qu'il publie lui-même est une
    // incohérence INTERNE à render_page.py, pas un oubli de cet agrégateur — à signaler côté socle.
    nonJugeRendu.push(`famille(s) présente(s) dans issues[] mais absente(s) du registre --familles de render_page.py `
      + `lui-même : ${[...inconnues].join(', ')} — incohérence à signaler côté digit-ai-page-html`);
  }
  return {
    oracle: `render_page(${etiquette})`, verdict: j.verdict, exit: r.status,
    ecarts_durs: findings.filter(f => f.sev === 'bloquant').length,
    avertissements: findings.filter(f => f.sev === 'avertissement').length,
    findings,
    non_juge: nonJugeRendu,
  };
}

function lancerOracleA11y(cible, outillage) {
  const r = spawnSync(outillage.python, [outillage.oracleA11y, cible], { encoding: 'utf8' });
  if (r.error) {
    return { oracle: 'oracle-a11y', verdict: 'SKIP',
      raison: 'exécution impossible : ' + r.error.message, findings: [], non_juge: [] };
  }
  let j;
  try { j = JSON.parse(r.stdout.trim()); }
  catch {
    return { oracle: 'oracle-a11y', verdict: 'SKIP',
      raison: `sortie illisible (exit ${r.status}) : ${(r.stderr || '').slice(0, 300)}`, findings: [], non_juge: [] };
  }
  const findings = (j.findings || []).map(f => ({ sev: f.sev === 'warn' ? 'avertissement' : f.sev, regle: '—', msg: f.msg }));
  return {
    oracle: 'oracle-a11y', verdict: j.verdict, exit: r.status,
    ecarts_durs: findings.filter(f => f.sev === 'bloquant').length,
    avertissements: findings.filter(f => f.sev === 'avertissement').length,
    findings, non_juge: j.non_juge || [],
  };
}

function lancerRendu(cible) {
  const outillage = detecterOutillageRendu();
  if (!outillage.ok) {
    return [{ oracle: 'rendu(render_page+a11y)', verdict: 'SKIP',
      raison: `--rendu demandé mais outillage indisponible : ${outillage.manques.join(' ; ')}`,
      findings: [], non_juge: [] }];
  }
  const html = fs.readFileSync(cible, 'utf8');
  const base = `forge-design-rendu-${process.pid}-${Date.now()}`;
  const tmpClair = path.join(os.tmpdir(), `${base}-clair.html`);
  const tmpSombre = path.join(os.tmpdir(), `${base}-sombre.html`);
  fs.writeFileSync(tmpClair, html, 'utf8');
  fs.writeFileSync(tmpSombre, injecterThemeSombre(html), 'utf8');
  const out = [];
  try {
    out.push(lancerRenderPage(tmpClair, 'clair', outillage));
    out.push(lancerRenderPage(tmpSombre, 'sombre', outillage));
  } finally {
    nettoyerRendu(tmpClair);
    nettoyerRendu(tmpSombre);
  }
  out.push(lancerOracleA11y(cible, outillage)); // structurel, non sensible au thème — sur l'original, lecture seule
  return out;
}

// ── Mode corpus ────────────────────────────────────────────────────────────
if (opt('--corpus')) {
  const r = lancer('oracle-corpus.mjs', [opt('--corpus')]);
  const code = r.verdict === 'PASS' ? 0 : r.verdict === 'FAIL' ? 1 : 2;
  if (!jsonOnly) process.stderr.write(`${r.verdict} — corpus\n`);
  sortir(r.verdict, [r], r.non_juge, code);
}

// ── Mode dtcg : synchronisation source .tokens.json → tokens.css dérivé ────
if (opt('--dtcg')) {
  const dtcgSource = opt('--dtcg');
  const dtcgDerive = args[args.indexOf('--dtcg') + 2];
  const r = lancer('oracle-dtcg.mjs', [dtcgSource, dtcgDerive || '']);
  const code = r.verdict === 'PASS' ? 0 : r.verdict === 'FAIL' ? 1 : 2;
  if (!jsonOnly) process.stderr.write(`${r.verdict} — dtcg (${dtcgSource} → ${dtcgDerive})\n`);
  sortir(r.verdict, [r], r.non_juge, code);
}

// ── Mode livrable ──────────────────────────────────────────────────────────
if (!cible || !fs.existsSync(cible)) {
  sortir('SKIP', [], ['cible absente : passer un fichier .html ou --corpus <dossier>'], 2);
}

const html = fs.readFileSync(cible, 'utf8');
const aDesImages = /<img\b|<source\b[^>]*srcset/i.test(html);
// TF-0736/TF-0739 et TF-0707/TF-0708 : deux domaines qui n'existaient nulle part avant les
// retours Produit-12. Détection par contenu, jamais imposée — une page sans champ de saisie
// n'a pas de champ mal typé, et une page sans panneau de création n'a pas de branche exclusive.
const aDesChamps = /<input\b|<textarea\b|<select\b/i.test(html);
const aUnPanneau = /data-panneau-tache|data-branche\s*=/i.test(html);
// TF-0796 : un composant rendu en top-layer (dialog, popover) ou déclaré en sur-couche
// (role="dialog") est peint EN PARTIE par le navigateur — c'est le seul cas où la page
// n'a pas le dernier mot. Détection par contenu, comme les deux précédentes : une page
// sans sur-couche n'a pas de sur-couche nue.
// TF-0797 : la nature d'un déclencheur se juge sur TOUTE page qui en porte un — un bouton
// qui a l'air d'un lien coûte deux tours de retour utilisateur, quel que soit le domaine de
// la page. Une page sans déclencheur, elle, n'a pas de déclencheur mal formé.
const aUnDeclencheur = /<button[\s>]|<a[\s>]|<summary[\s>]|data-action|onclick|role\s*=\s*["'](button|link)["']/i.test(html);
const aUneSurcouche = /<dialog\b|\spopover(\s|=|>)|::backdrop|showModal\s*\(|role\s*=\s*["'](alert)?dialog["']/i.test(html);
// TF-1322 (23/09/2026) : la règle vit dans lib/cible-mobile.mjs, que le lanceur général de
// quality-oracles consulte aussi (par oracle-mobile --si-cible-mobile) — une portée, deux juges.
const estMobile = estCibleMobile(html, args);

const sansObjet = [];

// Une passe complète d'oracles de fichier sur UNE cible. Les oracles applicables sont
// décidés une fois pour toutes sur le document réel (ci-dessus) : une passe sur la copie
// sans socle ne doit jamais changer la LISTE des juges, seulement leurs constats.
function passeFichier(fichier, { muet = false } = {}) {
  // TF-1241 : avec `--oracle`, un seul juge est joué — et aucun « SANS OBJET » n'est écrit pour
  // les autres : ils ne sont pas sans objet, ils n'ont simplement pas été demandés.
  if (seul) {
    const script = `oracle-${seul}.mjs`;
    const avecTokens = ['oracle-tokens.mjs', 'oracle-declencheurs.mjs', 'oracle-surcouche.mjs'].includes(script);
    return [lancer(script, avecTokens && opt('--tokens') ? [fichier, '--tokens', opt('--tokens')] : [fichier])];
  }
  const out = [];
  out.push(lancer('oracle-slop.mjs', [fichier]));
  out.push(lancer('oracle-tokens.mjs', opt('--tokens') ? [fichier, '--tokens', opt('--tokens')] : [fichier]));
  out.push(lancer('oracle-motion.mjs', [fichier]));
  out.push(lancer('oracle-bascule.mjs', [fichier]));
  out.push(lancer('oracle-taste.mjs', [fichier]));

  if (estMobile) out.push(lancer('oracle-mobile.mjs', [fichier]));
  else if (!muet) sansObjet.push(`oracle-mobile : SANS OBJET — ${MOTIF_SANS_OBJET}`);

  if (aDesImages) out.push(lancer('oracle-images.mjs', [fichier]));
  else if (!muet) sansObjet.push('oracle-images : SANS OBJET — aucune image dans le document');

  if (aDesChamps) out.push(lancer('oracle-saisie.mjs', [fichier]));
  else if (!muet) sansObjet.push('oracle-saisie : SANS OBJET — aucun champ de saisie dans le document');

  if (aUnPanneau) out.push(lancer('oracle-panneau-tache.mjs', [fichier]));
  else if (!muet) sansObjet.push('oracle-panneau-tache : SANS OBJET — aucun panneau de création balisé (data-panneau-tache / data-branche) dans le document');

  if (aUnDeclencheur) {
    out.push(lancer('oracle-declencheurs.mjs', opt('--tokens') ? [fichier, '--tokens', opt('--tokens')] : [fichier]));
  } else if (!muet) sansObjet.push('oracle-declencheurs : SANS OBJET — aucun déclencheur (bouton, lien, élément porteur de data-action/onclick) dans le document');

  if (aUneSurcouche) {
    out.push(lancer('oracle-surcouche.mjs', opt('--tokens') ? [fichier, '--tokens', opt('--tokens')] : [fichier]));
  } else if (!muet) sansObjet.push('oracle-surcouche : SANS OBJET — aucun composant en sur-couche (<dialog>, [popover], role="dialog") dans le document');

  return out;
}

const resultats = passeFichier(cible);

// ── TF-0830 · ce que l'auteur n'a pas le droit de changer ne lui est pas imputé ──
// Les blocs `COMPOSANT-EMBARQUE` scellés viennent du socle et sont sous parité d'asset :
// les éditer sur place est REFUSÉ par ailleurs. Leur imputer des écarts durs rendait FAIL
// trois pages neuves et conformes (19 à 20 écarts chacune, TOUS du socle). On ne les efface
// pas pour autant : la passe complète reste la vérité, et chaque constat mis de côté est
// RENDU, nommé, avec le bloc qui le porte. Un bloc seulement DÉCLARÉ — socle absent,
// empreinte fausse, copie éditée — reste jugé comme le CSS de l'auteur.
const socle = blocsDuSocle(html);
socleExempte = { verifies: [], declares: socle.declares.map(b => ({ nom: b.nom, socle: b.socle, raison: b.raison })), findings: [] };
if (socle.verifies.length) {
  const tmp = path.join(os.tmpdir(), `forge-design-socle-${process.pid}-${Date.now()}.html`);
  fs.writeFileSync(tmp, neutraliser(html, socle.verifies), 'utf8');
  try {
    const sansSocle = passeFichier(tmp, { muet: true });
    // La copie sans socle vit dans un fichier temporaire : son chemin apparaît dans les
    // constats qui citent l'artefact. Le neutraliser avant de comparer, sinon un constat
    // identique des deux côtés passerait pour un constat disparu.
    const norm = s => String(s ?? '').split(tmp).join(cible);
    // L'IDENTITÉ D'UN CONSTAT NE PORTE AUCUNE POSITION (22/09/2026). Le neutraliseur garde les lignes
    // du HTML, mais la balise <style> du bloc vidé disparaît : les lignes du CSS, que l'oracle des
    // jetons cite (« ligne ~N du CSS »), se DÉCALENT pour tout ce qui suit le bloc. Le même constat
    // changeait d'identité d'une passe à l'autre, et une couleur en dur écrite par l'AUTEUR après un
    // composant du socle passait au compte du socle — effacée du verdict. Mesuré sur une page d'étude
    // du pilot : T1 sur « .find-count.zero » imputé au socle, verdict PASS. Deux constats identiques
    // restent distincts par leur NOMBRE (multiensemble ci-dessous), pas par leur position.
    const sansPosition = s => String(s ?? '').replace(/\b(ligne|line|l\.)\s*~?\s*\d+/gi, '').replace(/:\d+(:\d+)?\b/g, '');
    const cle = f => `${f.sev}|${f.regle}|${sansPosition(norm(f.msg))}|${sansPosition(norm(f.where))}`;
    for (const r of resultats) {
      const pair = sansSocle.find(x => x.oracle === r.oracle);
      if (!pair) continue;
      const restants = new Map();
      for (const f of pair.findings || []) restants.set(cle(f), (restants.get(cle(f)) || 0) + 1);
      const gardes = [];
      for (const f of r.findings || []) {
        // Un `info` ne pèse dans aucun verdict : il n'a rien à faire dans une exemption,
        // et le placeholder « sans écart » d'un oracle muet en est un.
        if (f.sev === 'info') { gardes.push(f); continue; }
        const k = cle(f);
        if (restants.get(k)) { restants.set(k, restants.get(k) - 1); gardes.push(f); continue; }
        // Présent AVEC le socle, absent SANS : c'est le socle qui le porte.
        socleExempte.findings.push({ oracle: r.oracle, ...f });
      }
      if (gardes.length === (r.findings || []).length) continue;
      r.findings = gardes;
      r.ecarts_durs = gardes.filter(f => f.sev === 'bloquant' || f.sev === 'majeur').length;
      r.avertissements = gardes.filter(f => f.sev === 'avertissement').length;
      r.exemptes_socle = (socleExempte.findings.filter(f => f.oracle === r.oracle) || []).length;
      if (r.verdict === 'FAIL' && r.ecarts_durs === 0) r.verdict = 'PASS';
    }
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* best-effort */ }
  }
  socleExempte.verifies = socle.verifies.map(b => ({ nom: b.nom, socle: b.socle, empreinte: `sha256:${b.empreinte}` }));
}

if (rendu) resultats.push(...lancerRendu(cible));

// ── Ce que cet orchestrateur ne couvre pas, et qui reste dû ────────────────
const nonJuge = [
  ...new Set(resultats.flatMap(r => r.non_juge)),
  ...sansObjet,
  ...(rendu ? [] : [
    'rendu réel (V1–V7) — render_page.py de digit-ai-page-html, 5 breakpoints × 2 thèmes : NON LANCÉ par cet orchestrateur',
    'accessibilité structurelle — oracle-a11y.py de quality-oracles : NON LANCÉ par cet orchestrateur',
  ]),
  'parcours de bout en bout (C13) — trace à produire à la main, voir references/criteres-sortie.md',
  ...(socleExempte && socleExempte.verifies.length ? [
    `conformité de ${socleExempte.verifies.length} composant(s) embarqué(s) du socle `
    + `(${socleExempte.verifies.map(b => b.nom).join(', ')}) : NON JUGÉE ici — sceau vérifié contre la source, `
    + `${socleExempte.findings.length} constat(s) mis à leur compte et listés dans socle_exempte. `
    + 'Leur correction relève du socle et se propage par R-47, pas de l\'auteur de la page',
  ] : []),
  ...(socleExempte ? socleExempte.declares.map(b =>
    `bloc COMPOSANT-EMBARQUE « ${b.nom} » DÉCLARÉ mais non vérifié (${b.raison}) : jugé comme le CSS de l'auteur, aucune exemption`) : []),
];

const echecs = resultats.filter(r => r.verdict === 'FAIL');
const skips = resultats.filter(r => r.verdict === 'SKIP');

if (!jsonOnly) {
  const largeurs = LARGEURS_RENDU.split(',');
  process.stderr.write(`\n  grille de rendu (${largeurs.length} largeurs) : `
    + largeurs.map(w => (Number(w) === LARGEUR_CONCEPTION ? `${w}*` : w)).join(' / ')
    + ` px — * = largeur de conception (Full HD, E5)`
    + (rendu ? '' : ' — NON LANCÉE ici (ajouter --rendu)') + '\n');
  for (const r of resultats) {
    process.stderr.write(`  ${r.verdict.padEnd(4)} ${r.oracle}` +
      (r.verdict === 'SKIP' ? ` — ${r.raison}` : ` — ${r.ecarts_durs} dur(s), ${r.avertissements} avert.`
        + (r.exemptes_socle ? `, ${r.exemptes_socle} au compte du socle` : '')) + '\n');
  }
  for (const s of sansObjet) process.stderr.write(`  —    ${s}\n`);
  if (socleExempte && socleExempte.verifies.length) {
    process.stderr.write(`  socle  ${socleExempte.verifies.map(b => b.nom).join(', ')} — sceau vérifié, `
      + `${socleExempte.findings.length} constat(s) hors du verdict (correction chez le socle)\n`);
  }
  process.stderr.write(echecs.length ? `\nFAIL — ${echecs.length} oracle(s) en échec\n`
    : skips.length ? `\nINDÉTERMINÉ — ${skips.length} oracle(s) non exécuté(s)\n`
    : '\nPASS — tous les oracles applicables sont verts\n');
}

if (echecs.length) sortir('FAIL', resultats, nonJuge, 1);
if (skips.length) sortir('SKIP', resultats, nonJuge, 2);
sortir('PASS', resultats, nonJuge, 0);
