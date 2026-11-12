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
//   3. FORGE_DESIGN_ROOT dans le .env voisin (celui de la forge, dossier parent de ce script ; jamais le .env du
//      dossier courant : le verdict ne dépend pas du dossier de lancement, TF-2431)
//   4. le dossier parent de ce script
// Aucune racine résolue ⇒ exit 2 et verdict SKIP. Un contrôle qui ne trouve pas
// ses oracles ne se tait pas : il le dit.
//
// Contrat : JSON sur stdout, exit 0 = PASS, 1 = FAIL, 2 = indéterminé.
// Usage :
//   node run-oracles-design.mjs <fichier.html> [--mobile] [--tokens t.css] [--json-only] [--rendu]
//   node run-oracles-design.mjs <deck.pptx|livret.pdf> [--seuil-mm 10] [--pages-libres 1,4]   (TF-2386 : oracle-document-imprime seul)
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
//
// --instance <url|page.html> [--instance …] [--etat-connexion etat.json] (TF-1687) : enrôle
// oracle-exploitabilite (règles au README de la forge) sur l'instance ALIMENTÉE fournie — une URL servie, ou la page
// rendue au volume réel —, jamais sur le fichier de conception. Opt-in : sans --instance, l'oracle
// est déclaré SANS OBJET à voix haute et ne pèse pas sur le verdict d'un projet sans instance.
// TF-2172 : la même option enrôle oracle-erreurs-formulaire (EF0–EF5), qui saisit une valeur fausse par champ de l'instance,
// tente l'envoi (les écritures sont interceptées) et mesure où le refus se dit ; SANS OBJET dit si l'instance n'a aucun champ éprouvable.
// --etat-connexion passe l'état Playwright (storageState) d'une application derrière une connexion.
// --accepter-certificat-local (TF-2122) : l'instance est servie en https avec un certificat auto-signé ; transmis à
// oracle-exploitabilite, oracle-faits-commerciaux et oracle-valeur-affichee (qui lisent l'instance), et n'est accepté que pour un hôte de
// boucle locale (localhost, 127.0.0.1, ::1) ; tout autre hôte avec l'option est refusé (SKIP).
//
// TF-2121 — une page d'APPLICATION sans --instance ne rend plus « SANS OBJET » : elle rend FAIL (X7, oracle-exploitabilite),
// car un contrôle jamais joué ne se lit pas « vert » (lot Produit-86 : dix pages PASS, deux défauts à l'instance). La
// nature de la page vient de l'appel (--type-page application|editoriale), de la page (<meta name="forge-type-page">
// ou data-type-page) ou de sa structure (data-panneau-tache, data-branche, data-exigence) — lib/type-page.mjs. Une MAQUETTE
// n'a pas d'instance par nature : --maquette l'exempte, à voix haute (SANS OBJET dit au non_juge, jamais un PASS).
//
// --origine <url> (TF-2309) : la cible est une PAGE CAPTURÉE d'une instance servie, dont les feuilles de style et les
// scripts sont restés des ressources externes (`/assets/app.css`). Avant la première passe, chaque ressource liée qui ne se
// retrouve pas à côté du fichier est lue à cette origine et INTÉGRÉE à la page (lib/rendre-autonome.mjs) : sans cela les
// oracles statiques jugent une page sans CSS ni script, et render_page.py une copie aux liens cassés. L'origine doit être de
// la boucle locale (localhost, 127.0.0.1, ::1) : aucun accès réseau vers un tiers, une ressource d'un autre hôte reste liée
// et est dite au non_juge. Sans --origine, une page dont toutes les ressources se résolvent sur le disque est jugée telle
// quelle, comme avant ; ce qui ne se résout pas est listé au non_juge avec le remède.
//
// --valeurs-derivees <valeurs-derivees.json> (TF-2043) : enrôle oracle-valeur-affichee (VA1–VA4), qui compare
// chaque valeur dérivée affichée (version, environnement, date) à la commande qui la donne. Opt-in par la
// DÉCLARATION du produit : le fichier passé, sinon `valeurs-derivees.json` voisin de la page (dossier puis
// parents). La page jugée est chaque --instance fournie, sinon la cible. Sans déclaration, l'oracle est dit
// SANS OBJET à voix haute — il rendrait SKIP, et un SKIP sur tout projet qui n'a rien déclaré ferait tomber
// l'agrégat en INDÉTERMINÉ ; c'est donc ce rapport, jamais un PASS, qui dit que rien n'a été comparé.
//
// oracle-faits-commerciaux (FC1–FC7, TF-2050) tourne SANS déclaration du produit, sur toute page : il
// repère les formes d'un fait commercial (données d'avis, note, prix barré, rareté, volume de clients,
// allégation de santé) et les rend en AVERTISSEMENTS « à faire confirmer » — jamais un échec, le verdict
// reste celui des autres juges. Ces avertissements sont REPRIS dans le rapport : le compte sur stderr, leurs
// lignes (ligne, sélecteur, texte exact), `a_confirmer` par juge et `a_faire_confirmer` au niveau de l'agrégat. Chaque --instance
// fournie est lue aussi : c'est la page servie qui porte les vrais avis.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detecterOutillageRendu, injecterThemeSombre, neutraliserVisite } from './lib/rendu.mjs';
import { lireGrille } from './lib/grille.mjs';
import { blocsDuSocle, neutraliser } from './lib/socle.mjs';
import { estCibleMobile, MOTIF_SANS_OBJET } from './lib/cible-mobile.mjs';
import { pageAUneSurcouche, pageAUnThemeSombre } from './lib/surcouche.mjs';
import { trouverDeclaration, NOM_DECLARATION } from './lib/declaration-valeurs.mjs';
import { typerPage } from './lib/type-page.mjs';
import { rendreAutonome } from './lib/rendre-autonome.mjs';
import { estHoteLocal } from './lib/lire-page-servie.mjs';

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
  && args[args.indexOf(a) - 1] !== '--oracle' && args[args.indexOf(a) - 1] !== '--instance'
  && args[args.indexOf(a) - 1] !== '--etat-connexion' && args[args.indexOf(a) - 1] !== '--valeurs-derivees'
  && args[args.indexOf(a) - 1] !== '--type-page' && args[args.indexOf(a) - 1] !== '--origine'
  && args[args.indexOf(a) - 1] !== '--seuil-mm' && args[args.indexOf(a) - 1] !== '--pages-libres');
// TF-1687 — les instances alimentées, une par --instance (URL ou page rendue au volume réel).
const instances = args.filter((a, i) => args[i - 1] === '--instance');
const etatConnexion = opt('--etat-connexion');
// TF-2122 — certificat auto-signé accepté pour une instance locale (boucle locale seulement, dit à l'oracle).
const certificatLocal = args.includes('--accepter-certificat-local');
// TF-2121 — une page d'application sans instance servie n'est pas « sans objet » ; --maquette l'exempte à voix haute.
const maquette = args.includes('--maquette');

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
  // TF-2431 : seul le `.env` de la forge elle-même (dossier parent du script, lieu fixe de l'installation) est lu. Celui du
  // dossier COURANT ne l'est plus : le même fichier et la même commande rendaient SKIP ou PASS selon le dossier de lancement.
  const candidat = path.join(ici, '..', '.env');
  if (fs.existsSync(candidat)) {
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
// TF-2309 : ce que l'intégration des ressources d'une page capturée a fait, dit au rapport quand elle a eu lieu.
let autonomieDite = null;

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
    ...(autonomieDite ? { page_rendue_autonome: autonomieDite } : {}),
    // TF-2050 : le total des faits commerciaux « à faire confirmer », pour que l'agrégat le porte lui-même.
    a_faire_confirmer: resultats.reduce((n, r) => n + (r.a_confirmer || 0), 0),
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
      // TF-2050 : un constat « à faire confirmer » est compté à part pour que le rapport le nomme.
      a_confirmer: (j.findings || []).filter(f => f.a_confirmer).length,
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

function lancerRenderPage(tmpHtml, etiquette, outillage, extra = []) {
  const r = spawnSync(outillage.python,
    [outillage.renderPage, tmpHtml, '--widths', LARGEURS_RENDU, '--output', 'json', ...extra],
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
  // TF-1775 — un thème demandé que la page a réécrit n'a pas été mesuré : le dire au rapport agrégé.
  for (const l of j.non_juge || []) if (/THEME DEMANDE NON RENDU/.test(l)) nonJugeRendu.push(l);
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
  // TF-2199 : la visite guidée ouverte au premier affichage recouvre la page statique et fabrique des écarts ; elle est
  // masquée dans les copies de rendu (son câblage est jugé par X8 sur l'instance), et le rapport le dit.
  const statique = neutraliserVisite(html);
  fs.writeFileSync(tmpClair, statique, 'utf8');
  fs.writeFileSync(tmpSombre, injecterThemeSombre(statique), 'utf8');
  const out = [];
  try {
    out.push(lancerRenderPage(tmpClair, 'clair', outillage));
    // TF-1775 : le schéma du navigateur suit le thème demandé, et render_page dit si la page l'a réécrit.
    out.push(lancerRenderPage(tmpSombre, 'sombre', outillage, ['--theme', 'sombre']));
  } finally {
    nettoyerRendu(tmpClair);
    nettoyerRendu(tmpSombre);
  }
  if (/data-visite/.test(html)) {
    const note = 'visite guidée masquée dans la copie rendue (style sur [data-visite-etape], TF-2199) : le rendu statique ne juge pas la page recouverte par sa bulle ; '
      + 'le câblage de la visite est jugé par X8 (--instance), et une bulle qui ne porte pas [data-visite-etape] n\'est pas masquée';
    for (const r of out) r.non_juge = [...(r.non_juge || []), note];
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

// TF-2386 — un deck PPTX ou un PDF n'a ni CSS ni DOM : lui lancer les oracles HTML lisait un binaire et rendait PASS (slop, tokens…)
// sur du bruit. Il part à sa variante, oracle-document-imprime (DP1–DP5), et les juges HTML sont dits SANS OBJET, à voix haute.
if (/\.(pptx|pdf)$/i.test(cible)) {
  const reglages = [...(opt('--seuil-mm') ? ['--seuil-mm', opt('--seuil-mm')] : []), ...(opt('--pages-libres') ? ['--pages-libres', opt('--pages-libres')] : [])];
  const r = lancer('oracle-document-imprime.mjs', [cible, ...reglages]);
  const code = r.verdict === 'PASS' ? 0 : r.verdict === 'FAIL' ? 1 : 2;
  if (!jsonOnly) process.stderr.write(`${r.verdict} — ${path.basename(cible)} (support sans CSS)\n`);
  sortir(r.verdict, [r], [
    ...(r.non_juge || []),
    'oracle-slop, oracle-tokens, oracle-taste, oracle-images, oracle-mobile, oracle-surcouche, render_page.py et oracle-a11y : SANS OBJET — entrée HTML seulement ; sur un deck PPTX ou un PDF, la grille se joue par oracle-document-imprime, le reste est déclaré non_juge',
  ], code);
}

let html = fs.readFileSync(cible, 'utf8');
// TF-2309 — une page capturée d'une instance servie est rendue AUTONOME avant toute passe : ses feuilles de style et ses
// scripts liés sont lus (à côté du fichier, ou à l'origine donnée) et intégrés. Les oracles et le rendu jugent alors le
// fichier autonome (copie temporaire, jamais d'écriture à côté de la cible) ; les constats citent la cible.
const origine = opt('--origine');
if (origine) {
  let refus = null;
  try {
    const u = new URL(origine);
    if (!/^https?:$/.test(u.protocol)) refus = 'ni http ni https';
    else if (!estHoteLocal(origine)) refus = `hôte « ${u.hostname} » non local`;
  } catch { refus = 'adresse illisible'; }
  if (refus) sortir('SKIP', [], [`--origine REFUSÉ pour ${origine} (${refus}) : l'origine d'une page capturée est bornée aux hôtes de boucle locale (localhost, 127.0.0.1, ::1), aucun accès réseau vers un tiers — rien n'a été jugé`], 2);
}
const autonomie = await rendreAutonome(html, { dossier: path.dirname(path.resolve(cible)), origine, certificatLocal });
let fichierJuge = cible;
if (autonomie.declenche) {
  html = autonomie.html;
  const tmpAutonome = path.join(os.tmpdir(), `forge-design-autonome-${process.pid}-${Date.now()}.html`);
  fs.writeFileSync(tmpAutonome, html, 'utf8');
  process.on('exit', () => { try { fs.unlinkSync(tmpAutonome); } catch { /* best-effort */ } });
  fichierJuge = tmpAutonome;
}
if (autonomie.declenche || autonomie.non_integrees.length) {
  autonomieDite = { integrees: autonomie.integrees, non_integrees: autonomie.non_integrees, notes: autonomie.notes };
}
// Les constats d'une passe sur la copie autonome citent la cible, jamais le chemin temporaire.
const citerLaCible = r => {
  if (fichierJuge === cible) return r;
  const jeton = s => JSON.stringify(s).slice(1, -1);
  return JSON.parse(JSON.stringify(r).split(jeton(fichierJuge)).join(jeton(cible)));
};
// TF-2121 — la nature de la page (application | éditoriale), qui décide si l'absence d'instance échoue.
const typePage = typerPage(html, args);
if (typePage.valeur_inconnue !== undefined) {
  sortir('SKIP', [], [`--type-page « ${typePage.valeur_inconnue} » inconnu : application ou editoriale`], 2);
}
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
// TF-1772 (lot Produit-83 du 15/10) : le mot « ::backdrop » cité dans un COMMENTAIRE de tokens.css
// lançait oracle-surcouche sur une page sans sur-couche — SKIP, et l'agrégat tombait en SKIP exit 2.
// La détection se fait sur le document sans ses commentaires HTML ni CSS : ce qui est cité n'agit pas.
// TF-2092 (lot Produit-86 du 03/11) : récidive par la voie du SCRIPT. Une page sans <dialog> dont le script
// citait `showModal(`, `role="dialog"` ou `<dialog` en chaîne lançait l'oracle, qui ne trouvait rien : SKIP,
// agrégat SKIP exit 2. La détection ne lit plus de texte : elle lit l'ARBRE, par la même règle que l'oracle
// (lib/surcouche.mjs — éléments du DOM et des gabarits de script, règles ::backdrop des feuilles de style).
const aUneSurcouche = pageAUneSurcouche(html);
// TF-2384 (28/09/2026) : SC4 (`color-scheme` par thème) juge le THÈME de la page, pas un composant. Une page sans
// sur-couche mais dotée d'un thème sombre (bloc [data-theme="dark"], règle prefers-color-scheme), dans son CSS ou dans
// le fichier --tokens, lance donc oracle-surcouche, qui n'y évalue que SC4. Même définition que l'oracle (lib/surcouche.mjs).
const jetonsCss = opt('--tokens') && fs.existsSync(opt('--tokens')) ? fs.readFileSync(opt('--tokens'), 'utf8') : '';
const aUnThemeSombre = pageAUnThemeSombre(html, jetonsCss);
// TF-1219 : une action nommée par une exigence (data-exigence="<id>", convention posée au
// 10e oracle) — une page sans aucune action nommée n'a rien à juger en perceptibilité.
const aUneActionNommee = /data-exigence\s*=/i.test(html);
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
    // TF-2043 : l'oracle de valeur affichée se joue HORS de cette passe (voir plus bas) — sur la copie
    // sans socle, dans le dossier temporaire, il ne retrouverait pas la déclaration voisine de la page.
    if (seul === 'valeur-affichee') return [];
    const script = `oracle-${seul}.mjs`;
    const avecTokens = ['oracle-tokens.mjs', 'oracle-declencheurs.mjs', 'oracle-surcouche.mjs', 'oracle-perceptibilite.mjs'].includes(script);
    return [lancer(script, avecTokens && opt('--tokens') ? [fichier, '--tokens', opt('--tokens')] : [fichier])];
  }
  const out = [];
  out.push(lancer('oracle-slop.mjs', [fichier]));
  out.push(lancer('oracle-tokens.mjs', opt('--tokens') ? [fichier, '--tokens', opt('--tokens')] : [fichier]));
  out.push(lancer('oracle-motion.mjs', [fichier]));
  out.push(lancer('oracle-bascule.mjs', [fichier]));
  // TF-1980 : un octet de contrôle dans la page ou une feuille de style locale (« \25F7 » lu en octal par un script).
  out.push(lancer('oracle-caracteres-controle.mjs', [fichier]));
  out.push(lancer('oracle-taste.mjs', [fichier]));
  // TF-2050 : les formes d'un fait commercial, en avertissement « à faire confirmer » (jamais un échec).
  out.push(lancer('oracle-faits-commerciaux.mjs', [fichier]));

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

  if (aUneSurcouche || aUnThemeSombre) {
    out.push(lancer('oracle-surcouche.mjs', opt('--tokens') ? [fichier, '--tokens', opt('--tokens')] : [fichier]));
  } else if (!muet) sansObjet.push('oracle-surcouche : SANS OBJET — aucun composant en sur-couche (<dialog>, [popover], role="dialog") ni thème sombre déclaré dans le document');

  if (aUneActionNommee) {
    out.push(lancer('oracle-perceptibilite.mjs', opt('--tokens') ? [fichier, '--tokens', opt('--tokens')] : [fichier]));
  } else if (!muet) sansObjet.push('oracle-perceptibilite : SANS OBJET — aucune action nommée par une exigence (data-exigence) dans le document');

  return out;
}

const resultats = passeFichier(fichierJuge).map(citerLaCible);

// ── TF-0830 · ce que l'auteur n'a pas le droit de changer ne lui est pas imputé ──
// Les blocs `COMPOSANT-EMBARQUE` scellés viennent du socle et sont sous parité d'asset :
// les éditer sur place est REFUSÉ par ailleurs. Leur imputer des écarts durs rendait FAIL
// trois pages neuves et conformes (19 à 20 écarts chacune, TOUS du socle). On ne les efface
// pas pour autant : la passe complète reste la vérité, et chaque constat mis de côté est
// RENDU, nommé, avec le bloc qui le porte. Un bloc seulement DÉCLARÉ — socle absent,
// empreinte fausse, copie éditée — reste jugé comme le CSS de l'auteur.
const socle = blocsDuSocle(html);
socleExempte = { verifies: [], declares: socle.declares.map(b => ({ nom: b.nom, socle: b.socle, ...(b.origine ? { origine: b.origine } : {}), raison: b.raison })), findings: [] };
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
  // TF-2430 : un composant servi (feuille ou script intégré à l'origine) n'a pas de sceau, il est reconnu à son contenu : `origine` et `reconnu_par` le disent.
  socleExempte.verifies = socle.verifies.map(b => ({ nom: b.nom, socle: b.socle, empreinte: `sha256:${b.empreinte}`, ...(b.origine ? { origine: b.origine, reconnu_par: b.par } : {}) }));
}

// ── TF-1687 · l'exploitabilité au volume réel, sur l'instance alimentée seulement ──
// oracle-exploitabilite juge l'écran que l'utilisateur subit quand les données ont leur volume
// réel (TF-1654). Joué sur le fichier de conception, il ne prouverait rien : il n'entre donc dans
// la passe que sur une instance FOURNIE, hors de la passe du socle (le socle ne vit pas dans
// l'instance). Sans instance, il n'est ni lancé ni en échec : il est dit SANS OBJET, à voix haute.
if (!seul) {
  if (instances.length) {
    resultats.push(lancer('oracle-exploitabilite.mjs',
      [...instances, ...(etatConnexion ? ['--etat-connexion', etatConnexion] : []),
        ...(certificatLocal ? ['--accepter-certificat-local'] : [])]));
  } else if (typePage.type === 'application' && !maquette) {
    // TF-2121 — une page d'APPLICATION sans instance servie : le contrôle n'a pas eu lieu, et le dire
    // dans le non_juge laissait lire un PASS (lot Produit-86 : dix pages PASS, deux défauts à l'instance).
    resultats.push({
      oracle: 'oracle-exploitabilite', domaine: 'Écran d\'application : exploitabilité au volume réel des données',
      verdict: 'FAIL', exit: 1, ecarts_durs: 1, avertissements: 0, a_confirmer: 0,
      findings: [{
        sev: 'bloquant', regle: 'X7', where: cible,
        msg: `page d'application (${typePage.source}) jugée sans instance servie : l'exploitabilité au volume réel (oracle-exploitabilite, règles au README de la forge) n'a pas été jouée, `
          + 'et un écran jamais mesuré ne se déclare pas conforme',
        voie: 'fournir l\'instance alimentée (--instance <url|page rendue au volume réel> [--etat-connexion etat.json]) ; '
          + 'pour une maquette, qui n\'a pas d\'instance par nature : --maquette ; pour une page éditoriale : --type-page editoriale ou <meta name="forge-type-page" content="editoriale">',
      }],
      non_juge: [],
    });
  } else if (typePage.type === 'application') {
    sansObjet.push('oracle-exploitabilite : SANS OBJET — page d\'application déclarée MAQUETTE (--maquette) : aucune instance n\'existe encore. '
      + 'Ce n\'est pas un PASS de l\'exploitabilité : elle se rejoue sur l\'instance alimentée (--instance) après la première alimentation réelle');
  } else {
    sansObjet.push('oracle-exploitabilite : SANS OBJET — aucune instance alimentée fournie '
      + '(--instance <url|page rendue au volume réel> [--etat-connexion etat.json]) : l\'exploitabilité '
      + 'au volume réel ne se juge pas sur le fichier de conception, elle se rejoue après la première alimentation réelle'
      + (typePage.type === 'editoriale' ? ` — page déclarée éditoriale (${typePage.source}), le contrôle ne lui est pas dû`
        : typePage.probable ? ' — ATTENTION : la page porte un champ de saisie et un tableau, elle ressemble à une APPLICATION mais n\'est pas classée comme telle ; '
          + 'la déclarer (--type-page application, ou <meta name="forge-type-page" content="application">) pour que l\'absence d\'instance échoue'
          : ' — page non classée application (ni déclaration, ni marqueur data-panneau-tache / data-branche / data-exigence), traitée comme éditoriale'));
  }
}

// ── TF-2172 · une saisie refusée se dit sous son champ, sur l'instance servie ──
// oracle-erreurs-formulaire saisit une valeur fausse par champ, quitte le champ, tente l'envoi (les écritures sont
// interceptées) et mesure où le refus se dit. Même chemin que l'exploitabilité, pour la même raison : joué sur le
// fichier de conception il ne prouverait rien, et sans lui aucun des juges n'envoie une valeur fausse (lot Produit-86
// du 05/11/2026). Une instance sans champ éprouvable est dite SANS OBJET à voix haute — son SKIP ferait tomber
// l'agrégat en INDÉTERMINÉ sur tout écran sans formulaire.
if (!seul && instances.length) {
  const ef = lancer('oracle-erreurs-formulaire.mjs',
    [...instances, ...(etatConnexion ? ['--etat-connexion', etatConnexion] : []),
      ...(certificatLocal ? ['--accepter-certificat-local'] : [])]);
  if (ef.verdict === 'SKIP' && (ef.findings || []).some(f => f.regle === 'EF0' && f.sans_objet)) {
    sansObjet.push('oracle-erreurs-formulaire : SANS OBJET — aucun champ éprouvable sur l\'instance (aucun formulaire visible, ou aucun champ à contrainte ni à data-valeur-fausse) : '
      + 'aucune valeur fausse n\'a été saisie. Ce n\'est pas un PASS des erreurs de formulaire ; déclarer data-valeur-fausse sur un champ à règle du produit');
  } else {
    if (ef.verdict === 'SKIP' && !ef.raison) ef.raison = (ef.non_juge || []).slice(-1)[0] || 'non jugé';
    resultats.push(ef);
  }
}

// ── TF-2043 · la valeur affichée égale sa source, sur la DÉCLARATION du produit ──
// Hors de la passe du socle, pour la même raison qu'oracle-exploitabilite : la déclaration vit chez le
// produit, à côté de sa page, et un constat d'une copie temporaire ne s'impute pas à un composant du socle.
if (!seul || seul === 'valeur-affichee') {
  const declaration = opt('--valeurs-derivees') || trouverDeclaration(cible);
  if (declaration || seul) {
    const pages = instances.length ? instances : [cible];
    for (const p of pages) {
      const r = lancer('oracle-valeur-affichee.mjs', [p, ...(declaration ? ['--declaration', declaration] : []), ...(certificatLocal ? ['--accepter-certificat-local'] : [])]);
      if (r.verdict === 'SKIP' && !r.raison) r.raison = (r.findings.find(f => f.regle === 'VA0') || {}).msg || 'non jugé';
      resultats.push(r);
    }
  } else {
    sansObjet.push(`oracle-valeur-affichee : SANS OBJET — aucune déclaration de valeurs dérivées (${NOM_DECLARATION} voisin de la page, ou `
      + '--valeurs-derivees <fichier>) : aucune version, environnement ou date affichés n\'a été comparé à sa source');
  }
}

// ── TF-2050 · les faits commerciaux de chaque instance SERVIE ──
// La passe du fichier a déjà lu la cible. Une instance (URL, ou page rendue au volume réel) porte les
// vrais avis, les vrais prix : elle est lue aussi. Une instance illisible rend SKIP, dit à voix haute.
if (!seul || seul === 'faits-commerciaux') {
  for (const i of instances) {
    const r = lancer('oracle-faits-commerciaux.mjs', [i, ...(certificatLocal ? ['--accepter-certificat-local'] : [])]);
    if (r.verdict === 'SKIP' && !r.raison) r.raison = (r.findings.find(f => f.regle === 'FC0') || {}).msg || 'non jugé';
    resultats.push(r);
  }
}

if (rendu) resultats.push(...lancerRendu(fichierJuge).map(citerLaCible));

// ── Ce que cet orchestrateur ne couvre pas, et qui reste dû ────────────────
const nonJuge = [
  ...new Set(resultats.flatMap(r => r.non_juge)),
  ...sansObjet,
  ...(rendu ? [] : [
    'rendu réel (V1–V7) — render_page.py de digit-ai-page-html, 5 breakpoints × 2 thèmes : NON LANCÉ par cet orchestrateur',
    'accessibilité structurelle — oracle-a11y.py de quality-oracles : NON LANCÉ par cet orchestrateur',
  ]),
  ...(autonomie.declenche ? [
    `page capturée rendue AUTONOME avant les oracles (TF-2309) : ${autonomie.integrees.filter(x => x.type === 'style').length} feuille(s) de style et `
    + `${autonomie.integrees.filter(x => x.type === 'script').length} script(s) intégrés (${autonomie.integrees.map(x => x.ref).join(', ')}), lus à côté du fichier ou à l'origine ${origine || 'déclarée dans la page'} ; `
    + 'les images, les polices, les @import et les imports relatifs d\'un module ne sont pas intégrés'
    + (autonomie.notes.length ? ` — ${autonomie.notes.join(' ; ')}` : ''),
  ] : []),
  ...(autonomie.non_integrees.length ? [
    `${autonomie.non_integrees.length} ressource(s) liée(s) NON intégrée(s), la page est jugée sans elle(s) : `
    + autonomie.non_integrees.map(x => `${x.ref} (${x.raison})`).join(' ; '),
  ] : []),
  'parcours de bout en bout (C13) — trace à produire à la main, voir references/criteres-sortie.md',
  ...(socleExempte && socleExempte.verifies.length ? [
    `conformité de ${socleExempte.verifies.length} composant(s) embarqué(s) du socle `
    + `(${socleExempte.verifies.map(b => b.nom).join(', ')}) : NON JUGÉE ici — ${socleExempte.verifies.every(b => b.origine) ? 'contenu confronté à la source' : 'sceau vérifié contre la source'}, `
    + `${socleExempte.findings.length} constat(s) mis à leur compte et listés dans socle_exempte. `
    + (socleExempte.verifies.some(b => b.origine)
      ? `${socleExempte.verifies.filter(b => b.origine).length} d'entre eux, servis en feuille ou script liés (${socleExempte.verifies.filter(b => b.origine).map(b => b.origine).join(', ')}), `
        + 'sont reconnus à leur CONTENU, identique à la source du socle installée, faute de sceau (TF-2430). '
      : '')
    + 'Leur correction relève du socle et se propage par R-47, pas de l\'auteur de la page',
  ] : []),
  ...(socleExempte ? socleExempte.declares.map(b => (b.origine
    ? `composant du socle servi « ${b.nom} » (${b.origine}) NON reconnu (${b.raison}) : aucune exemption`
    : `bloc COMPOSANT-EMBARQUE « ${b.nom} » DÉCLARÉ mais non vérifié (${b.raison}) : jugé comme le CSS de l'auteur, aucune exemption`)) : []),
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
    // TF-2050 : un fait « à faire confirmer » ne se résume pas à un compte — ses lignes sont écrites ici,
    // bornées à 12 par juge avec le total dit, le JSON gardant tout.
    const aConfirmer = (r.findings || []).filter(f => f.a_confirmer);
    for (const f of aConfirmer.slice(0, 12)) process.stderr.write(`         ? ${f.regle} · ${f.where} · « ${f.texte} » — à faire confirmer\n`);
    if (aConfirmer.length > 12) process.stderr.write(`         ? … et ${aConfirmer.length - 12} autre(s) sur ${aConfirmer.length} : voir findings[] du JSON\n`);
    // TF-1860 : un refus qui porte son remède (`voie`) le dit ici, une fois par remède — le produit
    // ne lit pas toujours le JSON, et n'a pas à deviner qu'une exemption existe.
    const voies = new Set();
    for (const f of (r.findings || [])) {
      if (!f.voie || !(f.sev === 'bloquant' || f.sev === 'majeur') || voies.has(f.voie)) continue;
      voies.add(f.voie);
      process.stderr.write(`         ↳ ${f.regle} : ${f.voie}\n`);
    }
  }
  for (const s of sansObjet) process.stderr.write(`  —    ${s}\n`);
  if (socleExempte && socleExempte.verifies.length) {
    process.stderr.write(`  socle  ${socleExempte.verifies.map(b => b.nom).join(', ')} — ${socleExempte.verifies.every(b => b.origine) ? 'contenu identique à la source' : 'sceau vérifié'}, `
      + `${socleExempte.findings.length} constat(s) hors du verdict (correction chez le socle)\n`);
  }
  // TF-2050 : un PASS qui porte des faits à confirmer ne se lit pas comme un PASS sans reste.
  const totalAConfirmer = resultats.reduce((n, r) => n + (r.a_confirmer || 0), 0);
  if (totalAConfirmer) process.stderr.write(`\n  ${totalAConfirmer} fait(s) commercial(aux) à FAIRE CONFIRMER par le produit (avertissement, pas un échec) — véracité non jugée\n`);
  process.stderr.write(echecs.length ? `\nFAIL — ${echecs.length} oracle(s) en échec\n`
    : skips.length ? `\nINDÉTERMINÉ — ${skips.length} oracle(s) non exécuté(s)\n`
    : '\nPASS — tous les oracles applicables sont verts\n');
}

if (echecs.length) sortir('FAIL', resultats, nonJuge, 1);
if (skips.length) sortir('SKIP', resultats, nonJuge, 2);
sortir('PASS', resultats, nonJuge, 0);
