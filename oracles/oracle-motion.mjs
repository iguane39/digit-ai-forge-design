#!/usr/bin/env node
// oracle-motion — Domaine « Mouvement : craft de l'animation » (déterministe).
// Sept règles R1–R7 dérivées de review-animations d'Emil Kowalski (MIT) :
//   R1  `transition: all` — transition non ciblée : coûts cachés, surprises au moindre
//       changement de propriété. Toujours nommer les propriétés animées.
//   R2  entrée depuis `scale(0)` — un élément qui naît de rien paraît artificiel ;
//       partir d'un scale proche de 1 (0.95–0.97).
//   R3  `ease-in` seul sur une transition UI — l'interface doit répondre vite puis se
//       poser : ease-out attendu (ease-in réservé aux sorties, ease-in-out toléré).
//   R4  durée de transition > 300 ms — au-delà, l'UI paraît lente (les animations
//       décoratives longues passent par `animation`, non jugée ici).
//   R5  `transform-origin: center` sur un élément ancré (dropdown, popover, tooltip,
//       menu) qui scale — le mouvement doit naître du déclencheur, pas du centre.
//   R6  propriété de layout animée (width/height/top/left/margin/padding) — reflow à
//       chaque frame ; animer transform/opacity.
//   R7  animation au survol non protégée par `@media (hover: hover)` — sur écran
//       tactile, le hover « colle » après le tap.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-motion.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import { parse, css } from './lib/html.mjs';

const DOM = 'Mouvement : craft de l\'animation';
const NON_JUGE = [
  'fréquence d\'usage (un geste répété 100+ fois/jour ne devrait pas être animé du tout) — jugement produit',
  'cohésion du mouvement avec la personnalité du composant — jugement humain',
  'timing asymétrique entrée/sortie : intention non décidable sur le fichier seul',
  'durées des `animation` (décoratives, loaders) — seules les transitions UI sont bornées (R4)',
  'CSS porté par des gabarits JS (runtime) — non parsé par cette v1',
];

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');

function sortir(verdict, findings, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-motion', domaine: DOM, artefact: file || null,
    verdict, findings, non_juge: NON_JUGE,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) sortir('SKIP', [{ sev: 'info', msg: 'fichier introuvable', where: String(file) }], 2);
if (!/\.(html?|css)$/i.test(file)) sortir('SKIP', [{ sev: 'info', msg: 'extension non gérée', where: file }], 2);

const brut = fs.readFileSync(file, 'utf8');
const html = /\.css$/i.test(file) ? null : parse(brut);
const cssText = (html ? css(brut, html) : brut).replace(/\/\*[\s\S]*?\*\//g, ' ');

const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

// Découpe plate des blocs { sélecteur → déclarations } — les corps de @media/@keyframes
// remontent aussi comme blocs (leurs déclarations restent analysables au même titre).
const blocs = [];
for (const m of cssText.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  blocs.push({ sel: m[1].trim().replace(/\s+/g, ' '), decl: m[2] });
}
const declsDe = (prop, decl) => [...decl.matchAll(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`, 'gi'))].map(x => x[1].trim());

// ── R1 · transition: all ──────────────────────────────────────────────────
for (const b of blocs) {
  for (const v of [...declsDe('transition', b.decl), ...declsDe('transition-property', b.decl)]) {
    if (/(^|[\s,])all([\s,]|$)/i.test(v)) {
      add('majeur', 'R1', `transition non ciblée « all » : nommer les propriétés animées (« ${v.slice(0, 60)} »)`, b.sel.slice(0, 80));
      break;
    }
  }
}

// ── R2 · entrée depuis scale(0) ───────────────────────────────────────────
for (const b of blocs) {
  if (/scale\(\s*0(\.0+)?\s*\)/i.test(b.decl)) {
    add('majeur', 'R2', 'départ à scale(0) : l\'élément naît de rien — partir de 0.95–0.97', b.sel.slice(0, 80));
  }
}

// ── R3 · ease-in seul sur transition UI ───────────────────────────────────
for (const b of blocs) {
  const timings = [...declsDe('transition', b.decl), ...declsDe('transition-timing-function', b.decl)];
  if (timings.some(v => /(^|[\s,])ease-in([\s,]|$)/i.test(v) && !/ease-in-out/i.test(v))) {
    add('majeur', 'R3', 'ease-in sur une transition UI : l\'interface doit répondre vite puis décélérer (ease-out)', b.sel.slice(0, 80));
  }
}

// ── R4 · durée de transition > 300 ms ─────────────────────────────────────
for (const b of blocs) {
  const durs = [];
  for (const v of [...declsDe('transition', b.decl), ...declsDe('transition-duration', b.decl)]) {
    for (const d of v.matchAll(/([\d.]+)\s*(ms|s)\b/gi)) {
      durs.push(d[2].toLowerCase() === 's' ? parseFloat(d[1]) * 1000 : parseFloat(d[1]));
    }
  }
  // le shorthand transition porte durée PUIS delay : on ne juge que la plus longue durée déclarée
  const max = durs.length ? Math.max(...durs) : 0;
  if (max > 300) add('majeur', 'R4', `transition de ${Math.round(max)} ms > 300 ms : l'UI paraîtra lente`, b.sel.slice(0, 80));
}

// ── R5 · transform-origin center sur élément ancré qui scale ──────────────
const ANCRES = /(dropdown|popover|tooltip|menu|combobox|flyout)/i;
for (const b of blocs) {
  if (!ANCRES.test(b.sel)) continue;
  if (!/scale\(/i.test(b.decl)) continue;
  const origins = declsDe('transform-origin', b.decl);
  if (origins.some(o => /center/i.test(o))) {
    add('majeur', 'R5', 'transform-origin: center sur un élément ancré qui scale — le mouvement doit naître du déclencheur (ex. top left)', b.sel.slice(0, 80));
  } else if (origins.length === 0) {
    add('avertissement', 'R5', 'élément ancré qui scale sans transform-origin déclaré (défaut = center) — déclarer l\'origine côté déclencheur', b.sel.slice(0, 80));
  }
}

// ── R6 · propriété de layout animée ───────────────────────────────────────
const LAYOUT = /^(width|height|top|left|right|bottom|margin[a-z-]*|padding[a-z-]*|inset[a-z-]*)$/i;
for (const b of blocs) {
  const props = [];
  for (const v of declsDe('transition-property', b.decl)) props.push(...v.split(',').map(s => s.trim()));
  for (const v of declsDe('transition', b.decl)) {
    for (const part of v.split(',')) {
      const first = part.trim().split(/\s+/)[0];
      if (first) props.push(first);
    }
  }
  const mauvaises = [...new Set(props.filter(p => LAYOUT.test(p)))];
  if (mauvaises.length) {
    add('majeur', 'R6', `propriété(s) de layout animée(s) : ${mauvaises.join(', ')} — reflow à chaque frame, animer transform/opacity`, b.sel.slice(0, 80));
  }
}
// … et dans les @keyframes : toute déclaration de propriété de layout.
// Extraction du corps par appariement d'accolades (un indexOf('}}') raterait « }\n} »).
for (const kf of cssText.matchAll(/@keyframes\s+([\w-]+)/gi)) {
  const debut = cssText.indexOf('{', kf.index);
  if (debut === -1) continue;
  let prof = 0, fin = debut;
  for (let i = debut; i < cssText.length; i++) {
    if (cssText[i] === '{') prof++;
    else if (cssText[i] === '}' && --prof === 0) { fin = i; break; }
  }
  const corps = cssText.slice(debut, fin + 1);
  const touchees = [...new Set([...corps.matchAll(/(?:^|[;{\s])(width|height|top|left|right|bottom|margin|padding)\s*:/gi)].map(m => m[1].toLowerCase()))];
  if (touchees.length) add('majeur', 'R6', `@keyframes ${kf[1]} anime ${touchees.join(', ')} — reflow à chaque frame, animer transform/opacity`, '@keyframes ' + kf[1]);
}

// ── R7 · survol animé non protégé par @media (hover: hover) ───────────────
const hoverAnime = blocs.some(b => /:hover/i.test(b.sel) && /(transition|transform|animation)/i.test(b.decl))
  || /:hover\s*[^{}]*\{[^}]*(transition|transform|animation)/i.test(cssText);
if (hoverAnime && !/@media[^{]*\(\s*hover\s*:\s*hover\s*\)/i.test(cssText)) {
  add('majeur', 'R7', 'animation au survol sans garde @media (hover: hover) : sur tactile, l\'état hover « colle » après le tap', 'feuille de style');
}

F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (durs.length) sortir('FAIL', F, 1);
sortir('PASS', F.length ? F : [{ sev: 'info', regle: '—', msg: 'R1–R7 sans écart', where: file }], 0);
