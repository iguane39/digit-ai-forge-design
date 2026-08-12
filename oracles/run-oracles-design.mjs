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
import { detecterOutillageRendu } from './lib/rendu.mjs';

const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const rendu = args.includes('--rendu');
const LARGEURS_RENDU = '1920,1440,1024,768,390'; // convention grille.md / criteres-sortie.md
const opt = n => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const cible = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--racine'
  && args[args.indexOf(a) - 1] !== '--tokens' && args[args.indexOf(a) - 1] !== '--corpus');

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

function sortir(verdict, resultats, nonJuge, code) {
  process.stdout.write(JSON.stringify({
    orchestrateur: 'run-oracles-design', racine: RACINE, artefact: cible || opt('--corpus') || null,
    verdict, oracles: resultats, non_juge: nonJuge,
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
      oracle: j.oracle, verdict: j.verdict, exit: r.status,
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

function injecterThemeSombre(html) {
  if (/<html\b[^>]*\bdata-theme\s*=\s*"[^"]*"/i.test(html)) {
    return html.replace(/(<html\b[^>]*\bdata-theme\s*=\s*")[^"]*(")/i, '$1dark$2');
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b([^>]*)>/i, (m, attrs) => `<html${attrs} data-theme="dark">`);
  }
  return html; // pas de <html> détecté — copie renvoyée telle quelle
}

function nettoyerRendu(tmpHtml) {
  const dir = path.dirname(tmpHtml);
  const stem = path.basename(tmpHtml, path.extname(tmpHtml));
  for (const f of fs.readdirSync(dir)) {
    if (f === path.basename(tmpHtml) || f.startsWith(stem + '-w')) {
      try { fs.unlinkSync(path.join(dir, f)); } catch { /* best-effort */ }
    }
  }
}

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

  const findings = [];
  const durs = { v1_overflow: 'V1', v2_contrast: 'V2', v4_overlap: 'V4' };
  const avert = { v3_align: 'V3', v7_spacing: 'V7' };
  for (const [largeur, bp] of Object.entries(j.breakpoints || {})) {
    for (const [cle, regle] of Object.entries(durs))
      for (const it of bp.issues[cle] || []) findings.push({ sev: 'bloquant', regle, msg: `${largeur}px — ${it.what} — ${it.detail}` });
    for (const [cle, regle] of Object.entries(avert))
      for (const it of bp.issues[cle] || []) findings.push({ sev: 'avertissement', regle, msg: `${largeur}px — ${it.what} — ${it.detail}` });
    for (const it of bp.issues.unmeasured || []) findings.push({ sev: 'info', regle: '—', msg: `${largeur}px — ${it.what} — ${it.detail}` });
  }
  return {
    oracle: `render_page(${etiquette})`, verdict: j.verdict, exit: r.status,
    ecarts_durs: findings.filter(f => f.sev === 'bloquant').length,
    avertissements: findings.filter(f => f.sev === 'avertissement').length,
    findings,
    non_juge: ['V5 croisements de flèches et V6 images déformées — inspection visuelle des PNG produits, non jugés ici'],
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
const estMobile = args.includes('--mobile')
  || /viewport-fit\s*=\s*cover|safe-area-inset|data-chassis|class="[^"]*chassis/i.test(html);

const resultats = [];
const sansObjet = [];

resultats.push(lancer('oracle-slop.mjs', [cible]));
resultats.push(lancer('oracle-tokens.mjs', opt('--tokens') ? [cible, '--tokens', opt('--tokens')] : [cible]));
resultats.push(lancer('oracle-motion.mjs', [cible]));

if (estMobile) resultats.push(lancer('oracle-mobile.mjs', [cible]));
else sansObjet.push('oracle-mobile : SANS OBJET — cible non mobile (ni --mobile, ni marqueur de châssis détecté)');

if (aDesImages) resultats.push(lancer('oracle-images.mjs', [cible]));
else sansObjet.push('oracle-images : SANS OBJET — aucune image dans le document');

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
];

const echecs = resultats.filter(r => r.verdict === 'FAIL');
const skips = resultats.filter(r => r.verdict === 'SKIP');

if (!jsonOnly) {
  for (const r of resultats) {
    process.stderr.write(`  ${r.verdict.padEnd(4)} ${r.oracle}` +
      (r.verdict === 'SKIP' ? ` — ${r.raison}` : ` — ${r.ecarts_durs} dur(s), ${r.avertissements} avert.`) + '\n');
  }
  for (const s of sansObjet) process.stderr.write(`  —    ${s}\n`);
  process.stderr.write(echecs.length ? `\nFAIL — ${echecs.length} oracle(s) en échec\n`
    : skips.length ? `\nINDÉTERMINÉ — ${skips.length} oracle(s) non exécuté(s)\n`
    : '\nPASS — tous les oracles applicables sont verts\n');
}

if (echecs.length) sortir('FAIL', resultats, nonJuge, 1);
if (skips.length) sortir('SKIP', resultats, nonJuge, 2);
sortir('PASS', resultats, nonJuge, 0);
