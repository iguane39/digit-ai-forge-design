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
const skill = f => path.join(ici, '..', 'skills', 'ameliore-le-design', 'scripts', f);

// Contrat JSON par défaut : celui des oracles .mjs de la forge.
const CONTRAT_MJS = ['oracle', 'domaine', 'artefact', 'verdict', 'findings', 'non_juge'];
// check_maquette.py est un contrôle de parcours, pas un oracle de domaine : son
// contrat de sortie nomme l'outil et le fichier, et ses findings portent un
// « critere » là où les oracles portent une « regle ».
const CONTRAT_PY = ['outil', 'fichier', 'verdict', 'findings', 'non_juge'];

function pythonDisponible() {
  for (const candidat of ['python', 'python3']) {
    const r = spawnSync(candidat, ['--version'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return candidat;
  }
  return null;
}
const PYTHON = pythonDisponible();

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
    // TF-0276 : preuve dédiée du PÉRIMÈTRE de T5. Le produit cartésien
    // texte-* × fond-* sortait --texte-sur-accent en FAIL 1.0:1 sur --fond —
    // une paire qu'aucune règle ne pose — tout en restant AVEUGLE à la vraie
    // paire (--texte-sur-accent sur --accent). Les deux fixtures ne diffèrent
    // que par la valeur de --accent : la verte le garde sombre (le blanc y
    // tient), la rouge le passe en teinte claire (1.54:1). Le seuil de 4.5:1
    // est intact ; seul l'appariement a changé.
    oracle: 'oracle-tokens.mjs',
    regles: ['T5'],
    verte: [fx('tokens-t5-verte.html')],
    rouge: [fx('tokens-t5-rouge.html')],
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
  {
    oracle: 'oracle-motion.mjs',
    regles: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'],
    verte: [fx('motion-verte.html')],
    rouge: [fx('motion-rouge.html')],
  },
  {
    oracle: 'oracle-dtcg.mjs',
    regles: ['D1', 'D2', 'D3'],
    verte: [fx('dtcg-verte.tokens.json'), fx('dtcg-verte.css')],
    rouge: [fx('dtcg-rouge.tokens.json'), fx('dtcg-rouge.css')],
  },
  {
    // TF-0133 (aval R-30) : bouton présent mais aucun écouteur de clic attaché —
    // bascule morte (loi n° 1). Seule B-T2 est délibérément cassée dans cette
    // fixture ; B-T1, B-T3, B-T4 y restent verts (voir le commentaire en tête de
    // bascule-rouge.html — c'est la fixture demandée par le mandat TF-0133).
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T2'],
    verte: [fx('bascule-verte.html')],
    rouge: [fx('bascule-rouge.html')],
  },
  {
    // Preuve dédiée B-T1 (loi du gabarit : une règle sans fixture rouge n'est pas
    // prouvée) : bouton de bascule absent du DOM, tout le reste conforme.
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T1'],
    verte: [fx('bascule-verte.html')],
    rouge: [fx('bascule-rouge-bt1.html')],
  },
  {
    // Preuve dédiée B-T3 : câblage et palette conformes, aucune trace de
    // localStorage nulle part — persistance jamais déclarée.
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T3'],
    verte: [fx('bascule-verte.html')],
    rouge: [fx('bascule-rouge-bt3.html')],
  },
  {
    // Preuve dédiée B-T4 : bouton câblé et persisté, mais aucun bloc
    // [data-theme="dark"] — la bascule ne change jamais rien visuellement.
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T4'],
    verte: [fx('bascule-verte.html')],
    rouge: [fx('bascule-rouge-bt4.html')],
  },
  {
    // TF-0235 (campagne pilot du 15/08) : restitution lisible — une page déclarée
    // data-restitution porte verdict, KPIs complets, questions de graphiques,
    // chemins de lecteurs et manifeste d'écarts. RL-2/5/6/7/8 déclarées non jugées
    // (socle L7, composant filtres G1-G6, rendu, revue D8, iso-contenu de campagne).
    oracle: 'oracle-restitution.mjs',
    regles: ['RL-1', 'RL-3', 'RL-4', 'RL-9', 'RL-10'],
    verte: [fx('restitution-verte.html')],
    rouge: [fx('restitution-rouge.html')],
  },
  {
    // TF-0199 : règles extraites du skill tiers taste-skill (MIT, consulté le
    // 14/08/2026) — seules celles qui sont mécaniquement vérifiables. Les deux
    // prescriptions de rendu (hero dans la fenêtre, nav sur une ligne) restent
    // des points de revue de lecture, jamais des contrôles qui mentiraient.
    oracle: 'oracle-taste.mjs',
    regles: ['TA1', 'TA2', 'TA3', 'TA4'],
    verte: [fx('taste-verte.html')],
    rouge: [fx('taste-rouge.html')],
  },
  {
    // TF-0275 : le scan de balisage de check_maquette lisait le JS inline. Une
    // bibliothèque minifiée vendorée (Motion) porte « e<a||void 0!==l&&e> », lu
    // comme une ancre ouvrante qui avale le document — C15 se déclenchait et C2
    // voyait des routes fantômes sur une page saine. La fixture verte embarque
    // cette source minifiée ET un gabarit JS écrit à la main (qui, lui, reste
    // jugé) ; la rouge porte la même source et deux vrais CTA sans cible plus
    // une route orpheline — la règle sait toujours refuser.
    python: true,
    oracle: 'check_maquette.py',
    script: skill('check_maquette.py'),
    regles: ['C2', 'C15'],
    cleRegle: 'critere',
    contrat: CONTRAT_PY,
    verte: [fx('maquette-vendor-verte.html')],
    rouge: [fx('maquette-cta-rouge.html')],
  },
];

function lancer(cas, argv) {
  const bin = cas.python ? PYTHON : process.execPath;
  const script = cas.script || path.join(ici, cas.oracle);
  const r = spawnSync(bin, [script, ...argv, '--json-only'], {
    encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' },
  });
  let json = null;
  try { json = JSON.parse(r.stdout.trim()); } catch { /* sortie illisible */ }
  return { code: r.status, json, brut: r.stdout };
}

let echecs = 0;
const ligne = (ok, txt) => { console.log(`${ok ? '  ok  ' : ' ÉCHEC'} ${txt}`); if (!ok) echecs++; };

const sautes = [];

for (const cas of CAS) {
  console.log(`\n${cas.oracle}`);

  if (cas.python && !PYTHON) {
    // Même doctrine que self-test-baseline : un poste sans Python ne fait pas
    // échouer une garantie que rien de son ressort n'a cassé — mais le saut se dit.
    console.log('  SKIP  interpréteur python introuvable dans le PATH (python / python3)');
    sautes.push(cas.oracle);
    continue;
  }

  const v = lancer(cas, cas.verte);
  ligne(v.code === 0, `verte · exit 0 (obtenu ${v.code})`);
  ligne(v.json?.verdict === 'PASS', `verte · verdict PASS (obtenu ${v.json?.verdict})`);

  const r = lancer(cas, cas.rouge);
  ligne(r.code === 1, `rouge · exit 1 (obtenu ${r.code})`);
  ligne(r.json?.verdict === 'FAIL', `rouge · verdict FAIL (obtenu ${r.json?.verdict})`);

  const cleRegle = cas.cleRegle || 'regle';
  const vues = new Set((r.json?.findings || []).map(f => f[cleRegle]));
  const manquantes = cas.regles.filter(x => !vues.has(x));
  ligne(manquantes.length === 0, `rouge · ${cas.regles.length} règles déclenchées${manquantes.length ? ' — manquantes : ' + manquantes.join(', ') : ''}`);

  const contrat = cas.contrat || CONTRAT_MJS;
  const absents = contrat.filter(k => !(k in (r.json || {})));
  ligne(absents.length === 0, `contrat JSON complet${absents.length ? ' — champs absents : ' + absents.join(', ') : ''}`);
  ligne(Array.isArray(r.json?.non_juge) && r.json.non_juge.length > 0, 'non_juge déclaré et non vide');
}

const joues = CAS.filter(c => !(c.python && !PYTHON));
console.log(echecs === 0
  ? `\nTout vert — ${joues.length} oracles, ${joues.reduce((n, c) => n + c.regles.length, 0)} règles verrouillées.`
    + (sautes.length ? ` ${sautes.length} saut(s) motivé(s) : ${sautes.join(', ')}.` : '')
  : `\n${echecs} vérification(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
