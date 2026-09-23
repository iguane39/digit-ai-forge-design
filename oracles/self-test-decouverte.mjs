#!/usr/bin/env node
// self-test-decouverte — verrou à double sens de decouvrir-oracles.mjs (TF-1319, 23/09/2026).
//
// Séparé de self-test.mjs à dessein, comme self-test-baseline : la découverte n'est pas un oracle
// de page, elle ne juge rien — elle dit au juge d'enclenchement du pilot ce que cette forge porte.
// Ce qui se prouve ici, dans les deux sens :
//   vert  : la forge découvre ses oracles sur son propre disque, au contrat
//           `digit-ai/decouverte-oracles@1` ; un oracle posé sur un arbre jetable est découvert ;
//           un oracle AJOUTÉ l'est au passage suivant, sans liste à tenir ;
//   rouge : une recette, le lanceur, un outil de capture, une fixture, une archive, une
//           dépendance et un entrant ne sont JAMAIS pris pour des oracles ; une racine absente
//           sort en 2 avec son motif.
// Plus un constat qui relie les deux listes de la forge : tout oracle que `run-oracles-design.mjs`
// NOMME en dur est bien découvert — l'inverse n'est pas exigé, un oracle appelé par son skill
// reste un oracle de la forge.
//
// Usage : node oracles/self-test-decouverte.mjs   ·   exit 0 = vert, 1 = régression.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const DECOUVRIR = path.join(ici, 'decouvrir-oracles.mjs');
let echecs = 0;
let tenus = 0;
const ligne = (ok, txt) => { console.log(`${ok ? '  ok  ' : ' ÉCHEC'} ${txt}`); if (ok) tenus++; else echecs++; };

function decouvre(racine) {
  const r = spawnSync(process.execPath, [DECOUVRIR, ...(racine ? ['--racine', racine] : [])], { encoding: 'utf8' });
  let j = null;
  try { j = JSON.parse(r.stdout); } catch { /* sortie illisible : les lignes ci-dessous la disent */ }
  return { code: r.status, j };
}

// ── le dépôt lui-même ──────────────────────────────────────────────────────────────────────────
const reel = decouvre(null);
const decouverts = new Set((reel.j?.oracles || []).map(o => o.nom));
ligne(reel.code === 0 && reel.j?.contrat === 'digit-ai/decouverte-oracles@1' && reel.j?.forge === 'digit-ai-forge-design'
  && decouverts.size > 0 && reel.j.oracles.every(o => fs.existsSync(path.join(ici, '..', o.chemin))),
  `vert · la forge découvre ${decouverts.size} oracle(s) sur son propre disque, contrat tenu, chaque chemin rendu existe`);

// Les oracles que le lanceur NOMME en dur : chacun doit exister, donc être découvert. La liste est
// lue dans le CODE du lanceur, jamais recopiée ici.
const lanceur = fs.readFileSync(path.join(ici, 'run-oracles-design.mjs'), 'utf8');
const nommes = [...new Set([...lanceur.matchAll(/lancer\(\s*'(oracle-[\w-]+)\.mjs'/g)].map(m => m[1]))];
const nommesAbsents = nommes.filter(n => !decouverts.has(n));
ligne(nommesAbsents.length === 0,
  `vert · les ${nommes.length} oracle(s) nommé(s) en dur par run-oracles-design.mjs sont tous découverts`
  + (nommesAbsents.length ? ` — ABSENTS : ${nommesAbsents.join(', ')}` : '')
  + ` ; ${[...decouverts].filter(n => !nommes.includes(n)).length} autre(s) ne partent que par --oracle <nom> ou par leur skill`);

// ── un arbre jetable ───────────────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-design-decouverte-'));
try {
  const poser = (rel) => {
    const p = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, '// fixture de découverte\n');
  };
  ['oracles/oracle-alpha.mjs', 'skills/un-skill/scripts/oracle_beta.py'].forEach(poser);
  const leurres = ['oracles/oracle-alpha.test.mjs', 'oracles/self-test.mjs', 'oracles/run-oracles-design.mjs',
    'oracles/rendu-comparatif.mjs', 'oracles/fixtures/oracle-faux.mjs', 'Old/oracle-vieux.mjs',
    'node_modules/paquet/oracle-dep.mjs', 'input/oracle-entrant.mjs'];
  leurres.forEach(poser);
  const v = decouvre(tmp);
  const noms = (v.j?.oracles || []).map(o => o.nom).sort();
  ligne(v.code === 0 && JSON.stringify(noms) === JSON.stringify(['oracle-alpha', 'oracle_beta']),
    `vert · un oracle posé sur le disque est découvert, où qu'il vive dans le dépôt (obtenu ${JSON.stringify(noms)})`);
  ligne(v.code === 0 && !(v.j?.oracles || []).some(o => leurres.includes(o.chemin)),
    `rouge · recette, lanceur, capture, fixture, archive, dépendance et entrant ne sont JAMAIS pris pour des oracles (${leurres.length} leurres refusés)`);
  poser('oracles/oracle-gamma.mjs');
  const apres = decouvre(tmp);
  ligne((apres.j?.oracles || []).some(o => o.nom === 'oracle-gamma' && o.chemin === 'oracles/oracle-gamma.mjs'),
    'vert · un oracle AJOUTÉ est découvert au passage suivant sans qu\'aucune liste soit tenue à jour');
  poser('skills/autre/scripts/oracle-alpha.mjs');
  const doublon = decouvre(tmp);
  ligne((doublon.j?.non_juge || []).some(n => /oracle-alpha/.test(n) && /2 fichiers/.test(n)),
    'vert · deux fichiers du même nom sont DITS : un verdict qui le nomme ne dit pas lequel a tourné');
} finally {
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best-effort */ }
}

const absente = decouvre(path.join(os.tmpdir(), 'forge-design-racine-qui-n-existe-pas'));
ligne(absente.code === 2 && absente.j?.oracles?.length === 0 && /introuvable/.test(absente.j?.motif || ''),
  `rouge · une racine absente sort en 2 avec son motif, jamais en liste vide muette (obtenu exit ${absente.code})`);

console.log(echecs === 0
  ? `\nTout vert — découverte des oracles : ${tenus}/${tenus} vérifications, dans les deux sens.`
  : `\n${echecs} vérification(s) en échec sur ${tenus + echecs}.`);
process.exit(echecs === 0 ? 0 : 1);
