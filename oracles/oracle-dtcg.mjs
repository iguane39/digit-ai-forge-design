#!/usr/bin/env node
// oracle-dtcg — Domaine « Pipeline de tokens : source DTCG → tokens.css dérivé » (déterministe).
//
// Règles D1–D3. Ce que l'oracle exige :
//   D1  chaque token feuille non-alias porte $type et $value (forme DTCG minimale)
//   D2  chaque alias {chemin.pointille} résout vers un token existant du document
//   D3  le tokens.css fourni est EXACTEMENT la régénération de sa source DTCG —
//       aucune dérive manuelle entre le fichier édité et le fichier livré
//
// Utilise scripts/generer-tokens-css.mjs pour D2 (résolution d'alias) et D3
// (régénération) : c'est la même fonction qui génère et qui vérifie, donc
// aucune règle de transformation dupliquée qui pourrait diverger de l'oracle.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-dtcg.mjs <source.tokens.json> <tokens.css> [--json-only]

import fs from 'node:fs';
import { estFeuille, estAlias, resoudreChemin, feuillesDe, genererCss } from '../scripts/generer-tokens-css.mjs';

const DOM = 'Pipeline de tokens : source DTCG → tokens.css dérivé';
const args = process.argv.slice(2);
const fichiers = args.filter(a => !a.startsWith('--'));
const [source, derive] = fichiers;
const jsonOnly = args.includes('--json-only');

const NJ = ['adéquation des valeurs à la charte (palette, voix) — arbitrage commanditaire, hors oracle',
  'transformation générique multi-plateformes (Figma Variables, iOS, Android) — hors périmètre V0, voir restes de TF-0102'];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-dtcg', domaine: DOM, artefact: derive || source || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'D1–D3 sans écart', where: derive }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!source || !fs.existsSync(source)) { NJ.push('source .tokens.json absente'); sortir('SKIP', 2); }
if (!derive || !fs.existsSync(derive)) { NJ.push('tokens.css dérivé absent'); sortir('SKIP', 2); }

let dtcg;
try {
  dtcg = JSON.parse(fs.readFileSync(source, 'utf8'));
} catch (e) {
  add('bloquant', 'D0', `source .tokens.json illisible : ${e.message}`, source);
  sortir('FAIL', 1);
}

// ── D1 · forme minimale de chaque token feuille ─────────────────────────────
for (const [chemin, noeud] of feuillesDe(dtcg)) {
  if (estAlias(noeud)) continue; // un alias hérite le $type de sa cible — absence légitime
  if (!('$type' in noeud)) {
    add('bloquant', 'D1', `token « ${chemin} » sans $type (et n'est pas un alias {chemin})`, source);
  }
  if (noeud.$value === undefined || noeud.$value === null || noeud.$value === '') {
    add('bloquant', 'D1', `token « ${chemin} » sans $value exploitable`, source);
  }
}

// ── D2 · résolution des alias ────────────────────────────────────────────────
for (const [chemin, noeud] of feuillesDe(dtcg)) {
  if (!estAlias(noeud)) continue;
  const cible = noeud.$value.trim().slice(1, -1);
  const resolu = resoudreChemin(dtcg, cible);
  if (resolu == null || !estFeuille(resolu)) {
    add('bloquant', 'D2', `alias « ${chemin} » référence un chemin introuvable : {${cible}}`, source);
  }
}

// ── D3 · synchronisation source → dérivé ────────────────────────────────────
// On ne compare jamais le dérivé "à l'oeil" : on le régénère et on diffe le texte.
// Indépendant du verdict D1/D2 : une source qui ne génère plus rend le dérivé
// non vérifiable, ce qui EST la question que pose D3 (peut-on garantir la synchro ?).
{
  let attendu;
  try {
    attendu = genererCss(dtcg);
  } catch (e) {
    add('bloquant', 'D3', `synchronisation non vérifiable : la source ne régénère plus (${e.message})`, source);
  }
  if (attendu !== undefined) {
    const obtenu = fs.readFileSync(derive, 'utf8');
    const normalise = s => s.replace(/\r\n/g, '\n').trimEnd();
    if (normalise(attendu) !== normalise(obtenu)) {
      const A = normalise(attendu).split('\n'), B = normalise(obtenu).split('\n');
      let i = 0;
      while (i < A.length && i < B.length && A[i] === B[i]) i++;
      add('bloquant', 'D3',
        `tokens.css désynchronisé de sa source : première différence ligne ${i + 1} — ` +
        `attendu « ${(A[i] ?? '(fin de fichier)').slice(0, 80)} », obtenu « ${(B[i] ?? '(fin de fichier)').slice(0, 80)} ». ` +
        `Régénérer : node scripts/generer-tokens-css.mjs ${source} --sortie ${derive}`,
        derive);
    }
  }
}

// ── Verdict ──────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(dur.length ? `FAIL — ${dur.length} écart(s) dur(s)\n` : 'PASS — source et dérivé synchronisés\n');
if (dur.length) sortir('FAIL', 1);
sortir('PASS', 0);
