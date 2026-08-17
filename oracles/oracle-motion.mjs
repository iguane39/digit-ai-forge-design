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
// Trois règles de PRESCRIPTION (TF-0321). R1–R7 savaient dire non ; rien en amont ne
// disait quoi écrire, et la maquette était jugée sur des valeurs que la marque n'avait
// jamais fixées. Le systeme-de-marque prescrit désormais des tokens de mouvement
// (`references/tokens.md`, section « Mouvement ») et ces trois règles ferment la boucle :
//   R8  durée écrite EN DUR alors que la feuille prescrit des tokens de mouvement —
//       la prescription contournée ne prescrit plus rien. Aucun token déclaré : la
//       feuille est seulement signalée comme non prescrite (avertissement), pas refusée,
//       sinon la règle requalifierait tout l'existant au lieu de le faire progresser.
//   R9  token de mouvement hors barème — une durée prescrite au-delà du PLAFOND (le même
//       seuil que R4, une seule constante pour les deux : prescrire et juger ne peuvent
//       pas diverger), ou une courbe à dépassement (rebond déguisé, cf. slop S8).
//   R10 révocation `prefers-reduced-motion: reduce` absente, ou DÉCLARÉE SANS EFFET —
//       un @media qui ne neutralise rien est une affordance non câblée (loi n° 1).
//       Règle jouée, pas un avertissement : c'était le statut de C4 dans check_maquette,
//       qui délègue maintenant ici plutôt que d'entretenir un contrôle divergent.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-motion.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import { parse, css } from './lib/html.mjs';

const DOM = 'Mouvement : craft de l\'animation';

// Le plafond de la forge, en un seul endroit : R4 le fait tenir à la FEUILLE, R9 le fait
// tenir au TOKEN. `--dur-plafond` de systeme-de-marque porte la même valeur — un écart
// entre les deux est un défaut, jamais un réglage.
const PLAFOND_MS = 300;

const NON_JUGE = [
  'fréquence d\'usage (un geste répété 100+ fois/jour ne devrait pas être animé du tout) — jugement produit',
  'cohésion du mouvement avec la personnalité du composant — jugement humain',
  'timing asymétrique entrée/sortie : intention non décidable sur le fichier seul',
  'durées des `animation` (décoratives, loaders) — seules les transitions UI sont bornées (R4)',
  'CSS porté par des gabarits JS (runtime) — non parsé par cette v1',
  'finalité de chaque geste (« ce mouvement sert à quoi ») — un token prescrit une durée, pas une intention',
  'durées passées à `animate()` en JavaScript (Motion vendoré) — R8 ne juge que le CSS',
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

// ── Isolement de la révocation ────────────────────────────────────────────
// Les déclarations d'un `@media (prefers-reduced-motion: reduce)` ne sont pas du
// mouvement : c'est ce qui l'annule. Les confondre reviendrait à voir du mouvement
// dans sa propre sortie de secours — et à juger « en dur » un `.01ms !important`
// qui est précisément la neutralisation attendue. R1–R7 continuent de lire toute la
// feuille (comportement inchangé) ; seules R8 et R10 travaillent sur cette vue.
const BLOCS_REVOCATION = [];
let cssHorsRevocation = '';
{
  const entete = /@media[^{]*prefers-reduced-motion[^{]*reduce[^{]*\{/gi;
  let curseur = 0, m;
  while ((m = entete.exec(cssText))) {
    const debut = m.index + m[0].length - 1; // positionné sur l'accolade ouvrante
    let prof = 0, fin = cssText.length - 1;
    for (let i = debut; i < cssText.length; i++) {
      if (cssText[i] === '{') prof++;
      else if (cssText[i] === '}' && --prof === 0) { fin = i; break; }
    }
    BLOCS_REVOCATION.push(cssText.slice(debut, fin + 1));
    cssHorsRevocation += cssText.slice(curseur, m.index);
    curseur = fin + 1;
    entete.lastIndex = fin + 1;
  }
  cssHorsRevocation += cssText.slice(curseur);
}
const blocsHorsRevocation = [];
for (const m of cssHorsRevocation.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  blocsHorsRevocation.push({ sel: m[1].trim().replace(/\s+/g, ' '), decl: m[2] });
}

// ── La prescription telle que la feuille la porte ─────────────────────────
// Un token de mouvement est une custom property de durée (`--dur-…`), d'easing
// (`--ease-…`) ou de seuil d'échelle (`--echelle-entree`) — les noms du contrat
// `systeme-de-marque/references/tokens.md`. Relevés où qu'ils soient déclarés :
// ce qui compte est qu'ils EXISTENT, pas l'endroit où ils sont posés.
const TOKENS = new Map();
for (const m of cssText.matchAll(/--([\w-]+)\s*:\s*([^;{}]+)/g)) {
  if (/^(dur|ease|echelle-entree)/i.test(m[1])) TOKENS.set(m[1], m[2].trim());
}
const tokensDuree = [...TOKENS].filter(([n]) => /^dur/i.test(n));
const tokensEase = [...TOKENS].filter(([n]) => /^ease/i.test(n));
const prescrit = TOKENS.size > 0;

/** Remplace les `var(--token)` par la valeur prescrite — c'est ce qui rend R4 capable
 *  de juger une durée écrite proprement, et non seulement une durée écrite en dur. */
function resoudre(valeur, profondeur = 0) {
  if (profondeur > 4 || !/var\(/.test(valeur)) return valeur;
  const remplace = valeur.replace(/var\(\s*--([\w-]+)\s*(?:,[^()]*)?\)/g,
    (tout, nom) => (TOKENS.has(nom) ? TOKENS.get(nom) : tout));
  return remplace === valeur ? valeur : resoudre(remplace, profondeur + 1);
}

/** Durées en millisecondes portées par une valeur CSS. */
const msDe = (valeur) => [...valeur.matchAll(/([\d.]+)\s*(ms|s)\b/gi)]
  .map(d => (d[2].toLowerCase() === 's' ? parseFloat(d[1]) * 1000 : parseFloat(d[1])));

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
// Les tokens sont RÉSOLUS avant jugement (TF-0321) : sans cela, prescrire proprement
// `var(--dur-surface)` suffisait à rendre la règle aveugle — plus une feuille consomme
// la prescription, moins l'oracle la voyait.
for (const b of blocs) {
  const durs = [];
  let viaToken = null;
  for (const v of [...declsDe('transition', b.decl), ...declsDe('transition-duration', b.decl)]) {
    const resolu = resoudre(v);
    if (resolu !== v) viaToken = v;
    durs.push(...msDe(resolu));
  }
  // le shorthand transition porte durée PUIS delay : on ne juge que la plus longue durée déclarée
  const max = durs.length ? Math.max(...durs) : 0;
  if (max > PLAFOND_MS) {
    add('majeur', 'R4', `transition de ${Math.round(max)} ms > ${PLAFOND_MS} ms : l'UI paraîtra lente`
      + (viaToken ? ` (durée résolue depuis « ${viaToken.slice(0, 50)} » — le token lui-même est refusé par R9)` : ''),
      b.sel.slice(0, 80));
  }
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

// ── R8 · durée en dur alors que la feuille prescrit des tokens ────────────
// Ne juge que les TRANSITIONS : la durée d'une `animation` décorative (loader,
// spinner) ne relève pas du barème par taille de geste, et le non_juge de cet
// oracle le déclare déjà.
{
  const enDur = [];
  for (const b of blocsHorsRevocation) {
    for (const v of [...declsDe('transition', b.decl), ...declsDe('transition-duration', b.decl)]) {
      if (msDe(v.replace(/var\([^()]*\)/g, ' ')).length) { enDur.push({ sel: b.sel, v }); break; }
    }
  }
  if (prescrit && enDur.length) {
    for (const e of enDur) {
      add('majeur', 'R8', `durée en dur « ${e.v.slice(0, 60)} » alors que la feuille prescrit `
        + `${tokensDuree.length} token(s) de durée : consommer var(--dur-…) — une prescription contournée ne prescrit plus rien`,
        e.sel.slice(0, 80));
    }
  } else if (enDur.length) {
    add('avertissement', 'R8', `${enDur.length} durée(s) de transition en dur et AUCUN token de mouvement `
      + 'déclaré : le mouvement de cette feuille n\'est prescrit nulle part — poser --dur-* / --ease-* '
      + '(contrat : systeme-de-marque, references/tokens.md § Mouvement)', 'feuille de style');
  }
}

// ── R9 · token de mouvement hors barème ───────────────────────────────────
// Le seuil est PLAFOND_MS, celui de R4 : la marque ne peut pas prescrire ce que
// l'oracle refusera derrière.
if (!prescrit) {
  NON_JUGE.push('R9 SANS OBJET — la feuille ne déclare aucun token de mouvement à mettre au barème');
} else {
  for (const [nom, valeur] of tokensDuree) {
    const ms = msDe(valeur);
    const max = ms.length ? Math.max(...ms) : 0;
    if (max > PLAFOND_MS) {
      add('majeur', 'R9', `token --${nom} prescrit ${Math.round(max)} ms > ${PLAFOND_MS} ms : `
        + 'la marque prescrirait exactement ce que R4 refuse', ':root');
    }
  }
  for (const [nom, valeur] of tokensEase) {
    const m = /cubic-bezier\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i.exec(valeur);
    if (!m) continue;
    const y1 = parseFloat(m[2]), y2 = parseFloat(m[4]);
    if (y1 > 1 || y2 > 1 || y1 < 0 || y2 < 0) {
      add('majeur', 'R9', `token --${nom} : courbe à dépassement ${m[0]} — rebond déguisé prescrit `
        + 'par la marque (même refus que slop S8)', ':root');
    }
  }
}

// ── R10 · révocation prefers-reduced-motion ───────────────────────────────
// Règle JOUÉE, pas un avertissement : c'était le statut de C4 dans check_maquette.py,
// qui délègue désormais ici (TF-0321). WCAG 2.2 SC 2.3.3.
{
  const declareDuMouvement = blocsHorsRevocation.some(b =>
    /(?:^|[;\s])(transition|transition-duration|transition-property|animation|animation-name|animation-duration)\s*:/i.test(b.decl))
    || /@keyframes/i.test(cssHorsRevocation);

  if (!declareDuMouvement) {
    NON_JUGE.push('R10 SANS OBJET — la feuille ne déclare aucun mouvement hors du bloc de révocation');
  } else if (!BLOCS_REVOCATION.length) {
    add('majeur', 'R10', 'aucune révocation @media (prefers-reduced-motion: reduce) alors que la feuille '
      + 'déclare du mouvement — WCAG 2.2 SC 2.3.3', 'feuille de style');
  } else {
    const corps = BLOCS_REVOCATION.join('\n');
    const coupe = /(transition|animation)\s*:\s*none/i.test(corps)
      || /(transition|animation)-duration\s*:\s*0m?s?\b/i.test(corps)
      || /animation-play-state\s*:\s*paused/i.test(corps);
    const quasiNul = [...corps.matchAll(/(?:transition|animation)(?:-duration)?\s*:\s*([^;}]+)/gi)]
      .some(m => msDe(m[1]).some(v => v <= 1));
    if (!coupe && !quasiNul) {
      add('majeur', 'R10', 'bloc @media (prefers-reduced-motion: reduce) présent mais il ne neutralise rien : '
        + 'ni durée ramenée à ~0, ni transition/animation coupée — une révocation non câblée n\'existe pas (loi n° 1)',
        '@media prefers-reduced-motion');
    }
  }
}

F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (durs.length) sortir('FAIL', F, 1);
sortir('PASS', F.length ? F : [{ sev: 'info', regle: '—', msg: 'R1–R7 sans écart', where: file }], 0);
