#!/usr/bin/env node
// self-test — verrou de non-régression des oracles de la forge design.
// Chaque oracle est rejoué sur sa fixture verte (doit PASS, exit 0) et sa
// fixture rouge (doit FAIL, exit 1, et déclencher TOUTES ses règles).
// À rejouer après toute modification d'un oracle ou de lib/.
//
// Usage : node self-test.mjs   ·   exit 0 = tout vert, 1 = régression.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const fx = f => path.join(ici, 'fixtures', f);

const CAS = [
  {
    oracle: 'oracle-slop.mjs',
    regles: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'],
    verte: [fx('slop-verte.html')],
    rouge: [fx('slop-rouge.html')],
  },
  {
    // Verrou du trou decouvert au run bout-en-bout : tout le slop est porte par
    // des gabarits JS. Un oracle aveugle au rendu dynamique renverrait PASS.
    oracle: 'oracle-slop.mjs',
    regles: ['S6', 'S7', 'S10'],
    verte: [fx('slop-verte.html')],
    rouge: [fx('slop-runtime-rouge.html')],
  },
  {
    oracle: 'oracle-tokens.mjs',
    regles: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    verte: [fx('tokens-verte.html')],
    rouge: [fx('tokens-rouge.html')],
  },
  {
    oracle: 'oracle-mobile.mjs',
    regles: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
    verte: [fx('mobile-verte.html')],
    rouge: [fx('mobile-rouge.html')],
  },
  {
    oracle: 'oracle-images.mjs',
    regles: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'],
    verte: [fx('images-verte.html')],
    // Plafonds abaissés : I2 et I3 sont des seuils, la fixture reste légère.
    rouge: [fx('images-rouge.html'), '--max-ko', '1', '--max-mo', '0.001'],
  },
  {
    oracle: 'oracle-corpus.mjs',
    regles: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
    verte: [fx('corpus-verte')],
    rouge: [fx('corpus-rouge')],
  },
];

function lancer(oracle, argv) {
  const r = spawnSync(process.execPath, [path.join(ici, oracle), ...argv, '--json-only'], { encoding: 'utf8' });
  let json = null;
  try { json = JSON.parse(r.stdout.trim()); } catch { /* sortie illisible */ }
  return { code: r.status, json, brut: r.stdout };
}

let echecs = 0;
const ligne = (ok, txt) => { console.log(`${ok ? '  ok  ' : ' ÉCHEC'} ${txt}`); if (!ok) echecs++; };

for (const cas of CAS) {
  console.log(`\n${cas.oracle}`);

  const v = lancer(cas.oracle, cas.verte);
  ligne(v.code === 0, `verte · exit 0 (obtenu ${v.code})`);
  ligne(v.json?.verdict === 'PASS', `verte · verdict PASS (obtenu ${v.json?.verdict})`);

  const r = lancer(cas.oracle, cas.rouge);
  ligne(r.code === 1, `rouge · exit 1 (obtenu ${r.code})`);
  ligne(r.json?.verdict === 'FAIL', `rouge · verdict FAIL (obtenu ${r.json?.verdict})`);

  const vues = new Set((r.json?.findings || []).map(f => f.regle));
  const manquantes = cas.regles.filter(x => !vues.has(x));
  ligne(manquantes.length === 0, `rouge · ${cas.regles.length} règles déclenchées${manquantes.length ? ' — manquantes : ' + manquantes.join(', ') : ''}`);

  const contrat = ['oracle', 'domaine', 'artefact', 'verdict', 'findings', 'non_juge'];
  const absents = contrat.filter(k => !(k in (r.json || {})));
  ligne(absents.length === 0, `contrat JSON complet${absents.length ? ' — champs absents : ' + absents.join(', ') : ''}`);
  ligne(Array.isArray(r.json?.non_juge) && r.json.non_juge.length > 0, 'non_juge déclaré et non vide');
}

console.log(echecs === 0
  ? `\nTout vert — ${CAS.length} oracles, ${CAS.reduce((n, c) => n + c.regles.length, 0)} règles verrouillées.`
  : `\n${echecs} vérification(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
