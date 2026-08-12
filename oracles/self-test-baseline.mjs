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
//
// Usage : node self-test-baseline.mjs   ·   exit 0 = vert ou SKIP motivé, 1 = régression.

import { spawnSync } from 'node:child_process';
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

try { fs.rmSync(racine, { recursive: true, force: true }); } catch { /* best-effort */ }

console.log(echecs === 0 ? '\nTout vert — approbation, rejugement conforme et gouvernance B1-B3 vérifiés sur mesures réelles.'
  : `\n${echecs} vérification(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
