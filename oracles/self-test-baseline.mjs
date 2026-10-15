#!/usr/bin/env node
// self-test-baseline — verrou de non-régression d'oracle-baseline.mjs (TF-0102).
//
// Séparé de self-test.mjs à dessein : contrairement aux six oracles purement JS,
// oracle-baseline dépend de l'outillage externe --rendu (python, playwright,
// render_page.py). Comme pour --rendu lui-même, l'outillage absent est un SKIP
// motivé, jamais un échec de ce verrou — sinon un poste sans Python ferait
// échouer une garantie que rien de son ressort n'a cassé.
//
// Fixtures à double sens exercées sur un --racine jetable (jamais le baseline/
// versionné du dépôt) :
//   verte : approuver puis rejuger la même page → PASS, 0 % de divergence (B1/B2 muets)
//   rouge : rejuger contre une page de contenu différent → FAIL, B2 déclenché
//           puis --approuver après ce FAIL → refusé, B3 déclenché
//   TF-1798 : --approuver --motif après FAIL → accepté et tracé ; motif trop court → B3
//   TF-1770 : « approuver » positionnel → B0 ; page hors forge sans --racine → B0, rien écrit
//   TF-1797 : URL locale servie → approuvée puis rejugée PASS ; URL sans --slug → B0
//
// Usage : node self-test-baseline.mjs   ·   exit 0 = vert ou SKIP motivé, 1 = régression.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detecterOutillageRendu } from './lib/rendu.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const oracle = path.join(ici, 'oracle-baseline.mjs');
const fx = f => path.join(ici, 'fixtures', f);

const outillage = detecterOutillageRendu();
if (!outillage.ok) {
  console.log('SKIP — outillage de rendu indisponible, self-test-baseline non exécuté :');
  for (const m of outillage.manques) console.log(`  · ${m}`);
  process.exit(0);
}

const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-design-self-test-baseline-'));
let echecs = 0;
const ligne = (ok, txt) => { console.log(`${ok ? '  ok  ' : ' ÉCHEC'} ${txt}`); if (!ok) echecs++; };

function lancer(argv) {
  const r = spawnSync(process.execPath, [oracle, ...argv, '--racine', racine, '--json-only'], { encoding: 'utf8' });
  let json = null;
  try { json = JSON.parse(r.stdout.trim()); } catch { /* sortie illisible */ }
  return { code: r.status, json };
}

console.log('oracle-baseline.mjs (racine jetable : ' + racine + ')');

// ── verte : approuver puis rejuger la même page ─────────────────────────────
const approbation = lancer([fx('tokens-verte.html'), '--slug', 'verte', '--widths', '600', '--approuver']);
ligne(approbation.code === 0 && approbation.json?.verdict === 'PASS', 'verte · approbation initiale PASS');

const jugeIdentique = lancer([fx('tokens-verte.html'), '--slug', 'verte', '--widths', '600']);
ligne(jugeIdentique.code === 0 && jugeIdentique.json?.verdict === 'PASS', 'verte · rejugement de la même page PASS (exit ' + jugeIdentique.code + ')');
const zeroDivergence = (jugeIdentique.json?.findings || []).every(f => f.sev === 'info');
ligne(zeroDivergence, 'verte · aucun écart dur au rejugement (0 % mesuré)');

// ── rouge : contenu différent → B2, puis --approuver refusé → B3 ───────────
const jugeDivergent = lancer([fx('tokens-rouge.html'), '--slug', 'verte', '--widths', '600']);
ligne(jugeDivergent.code === 1 && jugeDivergent.json?.verdict === 'FAIL', 'rouge · rejugement contre une page différente FAIL (exit ' + jugeDivergent.code + ')');
const vuB2 = (jugeDivergent.json?.findings || []).some(f => f.regle === 'B2');
ligne(vuB2, 'rouge · règle B2 déclenchée (régression mesurée)');

const approbationRefusee = lancer([fx('tokens-rouge.html'), '--slug', 'verte', '--widths', '600', '--approuver']);
ligne(approbationRefusee.code === 1 && approbationRefusee.json?.verdict === 'FAIL', 'rouge · --approuver après un FAIL journalisé est refusé (exit ' + approbationRefusee.code + ')');
const vuB3 = (approbationRefusee.json?.findings || []).some(f => f.regle === 'B3');
ligne(vuB3, 'rouge · règle B3 déclenchée (gouvernance anti-gaming)');

// ── TF-1798 : un écart VOULU s'approuve après FAIL avec un motif tracé ──────
const motifCourt = lancer([fx('tokens-rouge.html'), '--slug', 'verte', '--widths', '600', '--approuver', '--motif', 'voulu']);
ligne(motifCourt.code === 1 && (motifCourt.json?.findings || []).some(f => f.regle === 'B3'),
  'rouge · --motif trop court laisse B3 refuser (exit ' + motifCourt.code + ')');
const motifOk = lancer([fx('tokens-rouge.html'), '--slug', 'verte', '--widths', '600', '--approuver', '--motif', 'refonte décidée de la palette du bandeau']);
ligne(motifOk.code === 0 && motifOk.json?.verdict === 'PASS', 'verte · --approuver --motif après FAIL accepté (exit ' + motifOk.code + ')');
const histo = (() => { try { return fs.readFileSync(path.join(racine, 'baseline', 'verte', 'historique.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l)); } catch { return []; } })();
const derniere = histo[histo.length - 1] || {};
ligne(derniere.action === 'approuver' && derniere.apres_fail === true && /refonte/.test(derniere.motif || ''),
  'verte · motif et apres_fail tracés à historique.jsonl');

// ── TF-1770 : mot d'action positionnel et racine implicite refusés ──────────
const actionMot = lancer(['approuver', fx('tokens-verte.html'), '--slug', 'verte', '--widths', '600']);
ligne(actionMot.code === 1 && actionMot.json?.verdict === 'FAIL'
  && (actionMot.json?.findings || []).some(f => f.regle === 'B0' && /--approuver/.test(f.msg)),
  'rouge · « approuver » positionnel refusé en B0 qui nomme --approuver (exit ' + actionMot.code + ')');
const horsForge = path.join(racine, 'page-produit.html');
fs.copyFileSync(fx('tokens-verte.html'), horsForge);
const sansRacine = spawnSync(process.execPath, [oracle, horsForge, '--slug', 'tf1770-sans-racine', '--widths', '600', '--approuver', '--json-only'], { encoding: 'utf8' });
let jSans = null; try { jSans = JSON.parse(sansRacine.stdout.trim()); } catch { /* illisible */ }
const pollue = path.join(ici, '..', 'baseline', 'tf1770-sans-racine');
ligne(sansRacine.status === 1 && (jSans?.findings || []).some(f => f.regle === 'B0' && /--racine/.test(f.msg)) && !fs.existsSync(pollue),
  'rouge · page hors forge sans --racine refusée, rien écrit dans baseline/ de la forge (exit ' + sansRacine.status + ')');
try { fs.rmSync(pollue, { recursive: true, force: true }); } catch { /* best-effort */ }

// ── TF-1797 : une instance servie (URL locale) se juge par le même moteur ───
const port = 18000 + Math.floor(Math.random() * 2000);
const serveur = spawn(outillage.python, ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', racine], { stdio: 'ignore' });
let pret = false;
for (let i = 0; i < 40 && !pret; i++) {
  const s = spawnSync(outillage.python, ['-c', 'import urllib.request,sys;urllib.request.urlopen(sys.argv[1],timeout=1)', `http://127.0.0.1:${port}/page-produit.html`]);
  pret = s.status === 0;
}
if (!pret) {
  ligne(false, 'url · serveur local de recette indisponible');
} else {
  const url = `http://127.0.0.1:${port}/page-produit.html`;
  const urlSansSlug = lancer([url, '--widths', '600']);
  ligne(urlSansSlug.code === 1 && (urlSansSlug.json?.findings || []).some(f => f.regle === 'B0' && /--slug/.test(f.msg)),
    'rouge · URL sans --slug refusée en B0 (exit ' + urlSansSlug.code + ')');
  const urlAppro = lancer([url, '--slug', 'servie', '--widths', '600', '--approuver']);
  ligne(urlAppro.code === 0 && urlAppro.json?.verdict === 'PASS', 'verte · URL servie approuvée (exit ' + urlAppro.code + ')');
  const urlJuge = lancer([url, '--slug', 'servie', '--widths', '600']);
  ligne(urlJuge.code === 0 && urlJuge.json?.verdict === 'PASS', 'verte · URL servie rejugée PASS (exit ' + urlJuge.code + ')');
}
serveur.kill();

try { fs.rmSync(racine, { recursive: true, force: true }); } catch { /* best-effort */ }

console.log(echecs === 0 ? '\nTout vert — approbation, rejugement conforme et gouvernance B1-B3 vérifiés sur mesures réelles.'
  : `\n${echecs} vérification(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
