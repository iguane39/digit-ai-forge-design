#!/usr/bin/env node
// oracle-baseline — Domaine « Régression visuelle : baseline versionnée » (TF-0102).
//
// Capture le rendu courant d'une page (via render_page.py, digit-ai-page-html) à
// la grille de baseline du corpus (corpus\grille-viewports.json, TF-1066) et le
// compare pixel à pixel aux captures
// APPROUVÉES du dossier baseline/<slug>/ (versionnées dans ce dépôt). Décodage et
// diff PNG en Node pur (oracles/lib/png.mjs, zéro dépendance — seul node:zlib) :
// aucune dépendance Python supplémentaire au-delà de ce que --rendu exige déjà.
//
// Gouvernance des baselines (anti-gaming, même esprit que R5) :
//   · baseline absente → SKIP motivé sur cette entrée, JAMAIS de création
//     automatique pendant un jugement ;
//   · création/mise à jour uniquement via --approuver, hors boucle de jugement ;
//     refusée si le dernier verdict journalisé pour ce slug est un FAIL non
//     encore rejugé — on n'entérine pas une régression au lieu de la corriger ;
//   · chaque approbation est journalisée dans baseline/<slug>/historique.jsonl ;
//   · TF-1798 — un ÉCART VOULU (refonte décidée, nouveau composant) s'approuve après
//     un FAIL avec `--motif "<écart voulu>"` : le motif est exigé, tracé à
//     l'historique et publié au rapport. Sans motif, B3 refuse et nomme ce remède.
//
// Règles B0–B3 :
//   B0  invocation ou rendu impossible : mot d'action positionnel (« approuver »,
//       « juger »), option inconnue, baseline d'une page HORS de la forge sans
//       --racine (elle s'écrirait dans digit-ai-forge-design), capture manquante
//   B1  dimensions du rendu courant ≠ dimensions de la baseline approuvée
//   B2  ratio de pixels divergents (> tolérance de canal) au-delà du seuil
//   B3  --approuver après un FAIL journalisé, sans --motif
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage :
//   node oracle-baseline.mjs <page.html | http://localhost:…> --slug <nom> --racine <racine du produit>
//     [--widths <grille du corpus par défaut>] [--seuil 0.001] [--tolerance 24]
//     [--approuver [--motif "<écart voulu>"]] [--etat-session <fichier>] [--theme clair|sombre]
//     [--origine-distante] [--json-only]
//   Une URL (instance servie, TF-1797) est rendue par le même moteur (render_page.py) ;
//   --etat-session et --theme lui sont transmis tels quels.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detecterOutillageRendu } from './lib/rendu.mjs';
import { lireGrille } from './lib/grille.mjs';
import { decoderPng, comparerPng } from './lib/png.mjs';

const DOM = 'Régression visuelle : baseline versionnée';
const args = process.argv.slice(2);
const OPTS_VALEUR = ['--slug', '--widths', '--seuil', '--tolerance', '--racine', '--motif', '--etat-session', '--etat-connexion', '--theme'];
const DRAPEAUX = ['--approuver', '--json-only', '--origine-distante'];
const jsonOnly = args.includes('--json-only');
const approuver = args.includes('--approuver');
const opt = (n, def) => { const i = args.indexOf(n); return i === -1 ? def : args[i + 1]; };
// Positionnels : tout ce qui n'est ni une option, ni la valeur d'une option à valeur.
const positionnels = [];
const inconnues = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (OPTS_VALEUR.includes(a)) { i++; continue; }
  if (DRAPEAUX.includes(a)) continue;
  if (a.startsWith('--')) { inconnues.push(a); continue; }
  positionnels.push(a);
}
// TF-1770 — un mot d'action positionnel (« approuver », « juger ») était pris pour le
// nom de la page : SKIP « fichier absent », exit 2, et l'approbation prescrite ne se
// faisait jamais. Il se refuse désormais en nommant la syntaxe réelle.
const MOTS_ACTION = ['approuver', 'approve', 'juger', 'judge', 'valider', 'comparer'];
const actionPositionnelle = positionnels.find(p => MOTS_ACTION.includes(p.toLowerCase()));
const file = positionnels.find(p => !MOTS_ACTION.includes(p.toLowerCase())) || null;
const estUrl = !!file && /^https?:\/\//i.test(file);

const FORGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const racineDonnee = opt('--racine', null);
const RACINE = racineDonnee ? path.resolve(racineDonnee) : FORGE;
const MOTIF = (opt('--motif', '') || '').trim();
const MOTIF_MIN = 12;
// Grille par défaut — LUE au corpus (TF-1066), jamais écrite ici : `corpus\grille-viewports.json`
// porte les largeurs, leur date, leur source et la raison du sous-ensemble de baseline.
// La « grille réduite v0 (3 largeurs) » s'y est close le 12/09/2026 : une baseline
// approuvée à 1920 ne prouvait rien à 3840, et c'est là que le débordement ou le vide
// se découvrent. La dissymétrie avec la grille de rendu est déclarée en non_juge.
const GRILLE = lireGrille();
const WIDTHS = opt('--widths', GRILLE.baselines);
const SEUIL = parseFloat(opt('--seuil', '0.001'));
const TOLERANCE = parseInt(opt('--tolerance', '24'), 10);
const slug = opt('--slug', file && !estUrl ? path.basename(file, path.extname(file)) : null);

const NJ = [
  'V5 (croisements de flèches) et V6 (images déformées) — inspection visuelle, pas de ce diff pixel',
  `${GRILLE.rendu.filter(w => !GRILLE.baseline.includes(w)).join(' px et ')} px — hors de la grille de BASELINE par défaut (${GRILLE.baselines}) pour borner le nombre de PNG approuvés ; ces largeurs restent jugées par render_page.py (grille de rendu à ${GRILLE.rendu.length} largeurs, run-oracles-design.mjs --rendu), jamais par ce diff pixel`,
  'zones dynamiques (horodatage, contenu aléatoire) — pas de masques en v0, voir oracle-visual-diff.py (quality-oracles) pour ce mécanisme',
];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-baseline', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'B1–B2 sans écart', where: file }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

const SYNTAXE = 'syntaxe : node oracle-baseline.mjs <page.html | url> --slug <nom> --racine <racine du produit> [--approuver [--motif "<écart voulu>"]]';
// Erreurs d'invocation : FAIL B0, exit 1 — jamais un SKIP qu'une chaîne lirait comme « rien à juger ».
if (actionPositionnelle) {
  add('bloquant', 'B0', `mot d'action positionnel inconnu « ${actionPositionnelle} » : l'oracle n'a pas de sous-commande. `
    + (actionPositionnelle.toLowerCase().startsWith('appro') || actionPositionnelle.toLowerCase() === 'valider'
      ? 'Approuver s\'écrit avec le drapeau --approuver. ' : 'Juger est l\'action par défaut, sans mot. ')
    + SYNTAXE, actionPositionnelle);
}
if (inconnues.length) add('bloquant', 'B0', `option(s) inconnue(s) : ${inconnues.join(', ')} — ${SYNTAXE}`, inconnues.join(' '));
if (positionnels.filter(p => !MOTS_ACTION.includes(p.toLowerCase())).length > 1) {
  add('bloquant', 'B0', `une seule page par appel, reçu : ${positionnels.join(' ; ')} — ${SYNTAXE}`, positionnels.join(' ; '));
}
if (args.includes('--motif') && !approuver) add('bloquant', 'B0', '--motif n\'a de sens qu\'avec --approuver (il trace un écart voulu)', '--motif');
if (F.length) sortir('FAIL', 1);

if (!file) { NJ.push(`aucune page désignée — ${SYNTAXE}`); sortir('SKIP', 2); }
if (!estUrl && !fs.existsSync(file)) { NJ.push(`fichier absent : ${file} — une instance servie se passe en URL http://localhost:… (TF-1797)`); sortir('SKIP', 2); }
if (!slug) {
  add('bloquant', 'B0', `--slug requis${estUrl ? ' sur une URL (aucun nom de fichier dont le déduire)' : ''} : nom du dossier baseline/<slug>/`, file);
  sortir('FAIL', 1);
}
// TF-1770 — sans --racine, la baseline d'une page de produit s'écrivait dans le baseline/
// versionné de la forge. La racine par défaut ne vaut que pour une page de la forge.
const dansLaForge = !estUrl && !path.relative(FORGE, path.resolve(file)).startsWith('..')
  && !path.isAbsolute(path.relative(FORGE, path.resolve(file)));
if (!racineDonnee && !dansLaForge) {
  add('bloquant', 'B0', `--racine requis : la page n'est pas dans la forge, et sans --racine sa baseline s'écrirait dans ${path.join(FORGE, 'baseline', slug)}. `
    + 'Passer --racine <racine du produit> (la baseline vit alors dans <racine>\\baseline\\<slug>\\, versionnée chez le produit)', file);
  sortir('FAIL', 1);
}

const outillage = detecterOutillageRendu();
if (!outillage.ok) {
  NJ.push(`outillage de rendu indisponible : ${outillage.manques.join(' ; ')}`);
  sortir('SKIP', 2);
}

const dossierBaseline = path.join(RACINE, 'baseline', slug);
const historique = path.join(dossierBaseline, 'historique.jsonl');
const largeurs = WIDTHS.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);

function rendreVersTmp() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-design-baseline-'));
  const passe = [];
  const session = opt('--etat-session', opt('--etat-connexion', null));
  if (session) passe.push('--etat-session', session);
  if (opt('--theme', null)) passe.push('--theme', opt('--theme', null));
  if (args.includes('--origine-distante')) passe.push('--origine-distante');
  const r = spawnSync(outillage.python,
    [outillage.renderPage, file, '--widths', largeurs.join(','), '--output', 'json', '--out', tmp, ...passe],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.error || r.status === null) throw new Error('rendu impossible : ' + (r.error?.message || r.stderr));
  if (!fs.readdirSync(tmp).some(n => /-w\d+\.png$/.test(n))) {
    throw new Error(`render_page.py n'a produit aucune capture (exit ${r.status}) : ${(r.stderr || '').trim().split(/\r?\n/).slice(-2).join(' ')}`);
  }
  return tmp;
}

// La capture principale d'une largeur : `<stem>-w<largeur>.png`. Sur une URL, le stem est
// dérivé par render_page.py ; on cherche donc le suffixe exact (les captures d'états,
// de sections ou de paires portent un suffixe de plus et ne correspondent pas).
function capture(dir, w) {
  const nom = fs.readdirSync(dir).find(n => n.endsWith(`-w${w}.png`));
  return nom ? path.join(dir, nom) : path.join(dir, `absent-w${w}.png`);
}

function nettoyer(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

let tmp;
try {
  tmp = rendreVersTmp();
} catch (e) {
  add('bloquant', 'B0', e.message, file);
  sortir('FAIL', 1);
}

// ── --approuver : gouvernance hors boucle ───────────────────────────────────
if (approuver) {
  let apresFail = false;
  if (fs.existsSync(historique)) {
    try {
      const lignes = fs.readFileSync(historique, 'utf8').trim().split('\n').filter(Boolean);
      const derniere = JSON.parse(lignes[lignes.length - 1]);
      if (derniere.action === 'jugement' && derniere.verdict === 'FAIL') apresFail = true;
    } catch { /* historique illisible : on n'en fait pas un blocage d'approbation */ }
  }
  // TF-1798 — B3 interdisait son propre remède : un écart VOULU (refonte décidée) ne
  // pouvait jamais s'entériner, puisque le jugement qui le constate est un FAIL. Le
  // remède est un motif écrit, exigé, tracé ; une régression subie se corrige toujours.
  if (apresFail && MOTIF.length < MOTIF_MIN) {
    add('bloquant', 'B3', '--approuver refusé : le dernier jugement journalisé pour ce slug est un FAIL. '
      + 'Régression subie : corriger puis rejuger. Écart voulu : --approuver --motif "<ce qui change et pourquoi>"'
      + (MOTIF ? ` (motif reçu trop court : ${MOTIF.length} caractères, ${MOTIF_MIN} au moins)` : ''), historique);
    nettoyer(tmp);
    sortir('FAIL', 1);
  }
  fs.mkdirSync(dossierBaseline, { recursive: true });
  const approuves = [];
  for (const w of largeurs) {
    const src = capture(tmp, w);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(dossierBaseline, `w${w}.png`);
    fs.copyFileSync(src, dst);
    approuves.push(`w${w}.png`);
  }
  fs.writeFileSync(path.join(dossierBaseline, 'PROVENANCE.json'), JSON.stringify({
    date_iso: new Date().toISOString(), source_html: estUrl ? file : path.relative(RACINE, file),
    widths: largeurs, tolerance: TOLERANCE, seuil: SEUIL,
    ...(MOTIF ? { motif: MOTIF } : {}),
  }, null, 2));
  fs.appendFileSync(historique, JSON.stringify({
    date_iso: new Date().toISOString(), action: 'approuver', captures: approuves,
    ...(MOTIF ? { motif: MOTIF } : {}), ...(apresFail ? { apres_fail: true } : {}),
  }) + '\n');
  nettoyer(tmp);
  add('info', '—', `baseline approuvée hors boucle : ${approuves.join(', ')}`, dossierBaseline);
  if (apresFail) add('info', 'B3', `écart voulu approuvé après un FAIL journalisé, motif tracé à l'historique : « ${MOTIF} »`, historique);
  sortir('PASS', 0);
}

// ── Jugement ─────────────────────────────────────────────────────────────────
let juges = 0;
for (const w of largeurs) {
  const courantPath = capture(tmp, w);
  const baselinePath = path.join(dossierBaseline, `w${w}.png`);
  if (!fs.existsSync(baselinePath)) {
    NJ.push(`baseline absente pour ${slug} à ${w}px — approuver hors boucle via --approuver avant tout jugement (${baselinePath})`);
    continue;
  }
  if (!fs.existsSync(courantPath)) {
    add('bloquant', 'B0', `capture courante manquante à ${w}px (render_page.py n'a rien produit)`, courantPath);
    continue;
  }
  let courant, base;
  try {
    courant = decoderPng(fs.readFileSync(courantPath));
    base = decoderPng(fs.readFileSync(baselinePath));
  } catch (e) {
    NJ.push(`PNG non décodable à ${w}px (${e.message}) — format hors du sous-ensemble supporté par lib/png.mjs`);
    continue;
  }
  const diff = comparerPng(courant, base, TOLERANCE);
  juges++;
  if (!diff) {
    add('bloquant', 'B1', `dimensions divergentes à ${w}px : rendu ${courant.width}x${courant.height} ≠ baseline ${base.width}x${base.height}`, baselinePath);
    continue;
  }
  if (diff.ratio > SEUIL) {
    add('bloquant', 'B2', `régression visuelle à ${w}px : ${(diff.ratio * 100).toFixed(3)}% de pixels divergents (${diff.divergents}/${diff.total}) > seuil ${(SEUIL * 100).toFixed(3)}%`, baselinePath);
  } else {
    add('info', '—', `${w}px conforme à la baseline (${(diff.ratio * 100).toFixed(4)}% ≤ seuil)`, baselinePath);
  }
}
nettoyer(tmp);

const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
const verdict = dur.length ? 'FAIL' : juges > 0 ? 'PASS' : 'SKIP';
try {
  if (fs.existsSync(path.dirname(dossierBaseline)) || juges > 0 || dur.length) {
    fs.mkdirSync(dossierBaseline, { recursive: true });
    fs.appendFileSync(historique, JSON.stringify({ date_iso: new Date().toISOString(), action: 'jugement', verdict, ecarts: dur.length }) + '\n');
  }
} catch { /* journalisation best-effort : ne bloque jamais un verdict déjà calculé */ }

if (!jsonOnly) process.stderr.write(verdict === 'FAIL' ? `FAIL — ${dur.length} écart(s) dur(s)\n` : verdict === 'SKIP' ? 'SKIP — aucune baseline jugeable\n' : `PASS — ${juges} largeur(s) conforme(s)\n`);
if (verdict === 'FAIL') sortir('FAIL', 1);
if (verdict === 'SKIP') sortir('SKIP', 2);
sortir('PASS', 0);
