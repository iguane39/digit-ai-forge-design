#!/usr/bin/env node
// oracle-baseline — Domaine « Régression visuelle : baseline versionnée » (TF-0102).
//
// Capture le rendu courant d'une page (via render_page.py, digit-ai-page-html) à
// une grille de largeurs réduite, et le compare pixel à pixel aux captures
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
//   · chaque approbation est journalisée dans baseline/<slug>/historique.jsonl.
//
// Règles B1–B2 :
//   B1  dimensions du rendu courant ≠ dimensions de la baseline approuvée
//   B2  ratio de pixels divergents (> tolérance de canal) au-delà du seuil
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage :
//   node oracle-baseline.mjs <page.html> --slug <nom> [--widths 1920,1024,390]
//     [--seuil 0.001] [--tolerance 24] [--approuver] [--json-only]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detecterOutillageRendu } from './lib/rendu.mjs';
import { decoderPng, comparerPng } from './lib/png.mjs';

const DOM = 'Régression visuelle : baseline versionnée';
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const approuver = args.includes('--approuver');
const opt = (n, def) => { const i = args.indexOf(n); return i === -1 ? def : args[i + 1]; };
const file = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--slug'
  && args[args.indexOf(a) - 1] !== '--widths' && args[args.indexOf(a) - 1] !== '--seuil'
  && args[args.indexOf(a) - 1] !== '--tolerance' && args[args.indexOf(a) - 1] !== '--racine');

const RACINE = opt('--racine', path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const WIDTHS = opt('--widths', '1920,1024,390');
const SEUIL = parseFloat(opt('--seuil', '0.001'));
const TOLERANCE = parseInt(opt('--tolerance', '24'), 10);
const slug = opt('--slug', file ? path.basename(file, path.extname(file)) : null);

const NJ = [
  'V5 (croisements de flèches) et V6 (images déformées) — inspection visuelle, pas de ce diff pixel',
  'grille réduite v0 (3 largeurs) — étendre à la grille complète (1920,1440,1024,768,390) est un reste',
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

if (!file || !fs.existsSync(file)) { NJ.push('fichier absent'); sortir('SKIP', 2); }
if (!slug) { NJ.push('--slug requis (nom du dossier baseline/<slug>/)'); sortir('SKIP', 2); }

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
  const r = spawnSync(outillage.python,
    [outillage.renderPage, file, '--widths', largeurs.join(','), '--output', 'json', '--out', tmp],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.error || r.status === null) throw new Error('rendu impossible : ' + (r.error?.message || r.stderr));
  return tmp;
}

function nettoyer(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

const stem = path.basename(file, path.extname(file));
let tmp;
try {
  tmp = rendreVersTmp();
} catch (e) {
  add('bloquant', 'B0', e.message, file);
  sortir('FAIL', 1);
}

// ── --approuver : gouvernance hors boucle ───────────────────────────────────
if (approuver) {
  if (fs.existsSync(historique)) {
    try {
      const lignes = fs.readFileSync(historique, 'utf8').trim().split('\n').filter(Boolean);
      const derniere = JSON.parse(lignes[lignes.length - 1]);
      if (derniere.action === 'jugement' && derniere.verdict === 'FAIL') {
        add('bloquant', 'B3', '--approuver refusé : le dernier jugement journalisé pour ce slug est un FAIL — rejuger après correction avant d\'entériner une nouvelle baseline', historique);
        nettoyer(tmp);
        sortir('FAIL', 1);
      }
    } catch { /* historique illisible : on n'en fait pas un blocage d'approbation */ }
  }
  fs.mkdirSync(dossierBaseline, { recursive: true });
  const approuves = [];
  for (const w of largeurs) {
    const src = path.join(tmp, `${stem}-w${w}.png`);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(dossierBaseline, `w${w}.png`);
    fs.copyFileSync(src, dst);
    approuves.push(`w${w}.png`);
  }
  fs.writeFileSync(path.join(dossierBaseline, 'PROVENANCE.json'), JSON.stringify({
    date_iso: new Date().toISOString(), source_html: path.relative(RACINE, file),
    widths: largeurs, tolerance: TOLERANCE, seuil: SEUIL,
  }, null, 2));
  fs.appendFileSync(historique, JSON.stringify({ date_iso: new Date().toISOString(), action: 'approuver', captures: approuves }) + '\n');
  nettoyer(tmp);
  add('info', '—', `baseline approuvée hors boucle : ${approuves.join(', ')}`, dossierBaseline);
  sortir('PASS', 0);
}

// ── Jugement ─────────────────────────────────────────────────────────────────
let juges = 0;
for (const w of largeurs) {
  const courantPath = path.join(tmp, `${stem}-w${w}.png`);
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
