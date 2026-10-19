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
// Trois règles d'AVERTISSEMENT (TF-1904, étude 20261019i : une page jetable de 9 lignes portant
// une boucle de 40 s, une animation de 1,2 s et une révocation partielle rendait PASS, exit 0).
// Avertissement et non refus : elles ne requalifient aucun livrable existant (cf. R8).
//   R11 animation CSS `infinite` dont le cycle dépasse 5 s, sans mécanisme de pause (WCAG 2.2
//       SC 2.2.2, niveau A) — pause = `animation-play-state` déclaré hors révocation, ou
//       `.pause()` / `playState` dans un script.
//   R12 durée LITTÉRALE passée à `animate()` au-delà du plafond de 300 ms — secondes pour
//       Motion (`animate(` nu ou `Motion.animate(`), millisecondes pour l'API Web Animations
//       (`element.animate(`). Les bibliothèques vendorées (script > 20 000 car.) sont écartées.
//   R13 révocation `prefers-reduced-motion: reduce` qui neutralise quelque chose mais ne couvre
//       pas CHAQUE sélecteur portant une `animation` — sauf règle universelle `*`.
//
// Une règle d'AVERTISSEMENT, extraite de textes tiers (TF-1911, voie taste-skill ; attribution :
// `regles-importees-vercel-emil.md`). Elle entre ICI et non dans un oracle neuf : le mouvement se
// juge en un seul lieu (`registre-entrees.md`, arbitrage d'autorité). Elle n'est pas la règle
// d'appui de R11–R13, qui ne portent aucun retour d'appui : pas de doublon.
//   R14 un contrôle pressable (button, role="button", input button/submit/reset) qu'aucune règle
//       `:active` n'atteint : l'interface ne répond pas à l'appui, seulement au relâchement
//       (Emil Kowalski, review-animations STANDARDS l.59 ; mobile-native §5 ; UI/UX Pro Max n° 30)
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-motion.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import { parse, css, arbres, elements } from './lib/html.mjs';
import { correspond } from './lib/selecteurs.mjs';

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
  'durées passées à `animate()` : R12 ne lit que les durées numériques LITTÉRALES — une durée portée par une variable, un jeton ou une expression n\'est pas résolue ; R8 ne juge que le CSS',
  'R11 : un cycle `infinite` de 5 s ou moins (loader, spinner) n\'est pas jugé ; la durée doit être dans le même bloc que `infinite` ; une boucle JavaScript (`repeat: Infinity`) n\'est pas lue ; la pause est reconnue par sa seule présence dans la page, pas par son câblage à un contrôle',
  'R14 : une règle :active qui atteint le contrôle suffit, sans juger ce qu\'elle fait (échelle, ombre, couleur) ; un retour d\'appui posé par JavaScript (pointerdown) n\'est pas lu ; les liens stylés en boutons ne sont pas visés',
  'R13 : ne juge que les sélecteurs portant une `animation` CSS (pas les transitions, couvertes seulement dans leur existence par R10) ; compare les sélecteurs par égalité de texte, sans résoudre la cascade — le rendu réel relève de render_page.py',
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

// ── Matière commune à R11, R12, R13 (TF-1904) ─────────────────────────────
// Les scripts de la page, sans commentaires, bibliothèque vendorée écartée : un bundle
// de plusieurs dizaines de ko (Motion, 79 ko) porte des centaines d'`animate(` et de
// `duration:` qui ne sont pas ceux de l'auteur de la page.
const TAILLE_MAX_SCRIPT = 20000;
const scriptsJs = (html ? [...brut.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]) : [])
  .filter(s => s.length <= TAILLE_MAX_SCRIPT)
  .map(s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/.*$/gm, '$1'));
/** Découpe une liste séparée par des virgules, hors parenthèses (cubic-bezier, var()). */
function virgules(v) {
  const parts = []; let prof = 0, debut = 0;
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '(') prof++;
    else if (v[i] === ')') prof--;
    else if (v[i] === ',' && prof === 0) { parts.push(v.slice(debut, i)); debut = i + 1; }
  }
  parts.push(v.slice(debut));
  return parts.map(p => p.trim()).filter(Boolean);
}
/** Durées CSS (ms) portées par une valeur, sans lire un « 5s » collé à un nom de keyframes. */
const dureesIsolees = (valeur) => [...valeur.matchAll(/(?<![\w.-])(\d*\.?\d+)\s*(ms|s)\b/gi)]
  .map(d => (d[2].toLowerCase() === 's' ? parseFloat(d[1]) * 1000 : parseFloat(d[1])));

// ── R11 · boucle infinie de plus de 5 s sans pause (avertissement) ────────
// WCAG 2.2 SC 2.2.2 : un contenu qui bouge seul plus de 5 s demande un moyen de pause.
// Le cycle est lu dans le MÊME bloc que `infinite` (shorthand `animation`, ou
// `animation-duration` à côté de `animation-iteration-count: infinite`).
{
  const SEUIL_BOUCLE_MS = 5000;
  const pause = /animation-play-state\s*:/i.test(cssHorsRevocation)
    || scriptsJs.some(s => /\.pause\s*\(|playState|animationPlayState|animation-play-state/.test(s));
  for (const b of blocsHorsRevocation) {
    const cycles = [];
    for (const v of declsDe('animation', b.decl)) {
      for (const part of virgules(v)) {
        if (/(^|\s)infinite(\s|$)/i.test(part)) cycles.push(dureesIsolees(resoudre(part))[0] ?? 0);
      }
    }
    if (declsDe('animation-iteration-count', b.decl).some(v => /(^|[\s,])infinite([\s,]|$)/i.test(v))) {
      for (const v of declsDe('animation-duration', b.decl)) cycles.push(...dureesIsolees(resoudre(v)));
    }
    const max = cycles.length ? Math.max(...cycles) : 0;
    if (max > SEUIL_BOUCLE_MS && !pause) {
      add('avertissement', 'R11', `animation infinie de cycle ${Math.round(max / 100) / 10} s (> 5 s) sans mécanisme de pause : `
        + 'poser un contrôle qui bascule animation-play-state, ou borner la boucle — WCAG 2.2 SC 2.2.2', b.sel.slice(0, 80));
    }
  }
}

// ── R12 · durée littérale d'animate() au-delà de 300 ms (avertissement) ───
// Motion compte en SECONDES (`animate(el, kf, { duration: 0.24 })`), l'API Web Animations
// en MILLISECONDES (`el.animate(kf, { duration: 240 })`) : l'unité se lit sur l'appelant.
{
  for (const s of scriptsJs) {
    for (const m of s.matchAll(/(?<![\w$])animate\s*\(/g)) {
      const avant = s.slice(Math.max(0, m.index - 40), m.index);
      const motion = /(^|[^\w$.])$/.test(avant) || /(?<![\w$])[Mm]otion\s*\.\s*$/.test(avant);
      const debut = m.index + m[0].length - 1;
      let prof = 0, fin = Math.min(s.length - 1, debut + 4000);
      for (let i = debut; i < Math.min(s.length, debut + 4000); i++) {
        if (s[i] === '(') prof++;
        else if (s[i] === ')' && --prof === 0) { fin = i; break; }
      }
      const appel = s.slice(debut, fin + 1);
      for (const d of appel.matchAll(/(?<![\w$])duration\s*:\s*(\d*\.?\d+)\s*(?=[,}\s)])/g)) {
        const ms = parseFloat(d[1]) * (motion ? 1000 : 1);
        if (ms > PLAFOND_MS) {
          add('avertissement', 'R12', `animate() avec duration: ${d[1]} (${motion ? 'secondes, Motion' : 'millisecondes, Web Animations'}) `
            + `= ${Math.round(ms)} ms > ${PLAFOND_MS} ms : l'UI paraîtra lente — même plafond que R4`, 'script (appel animate)');
        }
      }
    }
  }
}

// ── R13 · révocation prefers-reduced-motion qui ne couvre pas chaque animation ──
// R10 sait qu'un bloc de révocation existe et neutralise quelque chose ; il se satisfait
// d'UN sélecteur neutralisé. R13 demande que chaque sélecteur portant une `animation`
// le soit, sauf règle universelle `*` qui neutralise.
{
  const neutralise = (decl) => /(transition|animation)\s*:\s*none/i.test(decl)
    || /(transition|animation)-duration\s*:\s*0m?s?\b/i.test(decl)
    || /animation-play-state\s*:\s*paused/i.test(decl)
    || [...decl.matchAll(/(?:transition|animation)(?:-duration)?\s*:\s*([^;}]+)/gi)].some(m => msDe(m[1]).some(v => v <= 1));
  const couverts = new Set();
  let universel = false, neutralisation = false;
  for (const bloc of BLOCS_REVOCATION) {
    const interieur = bloc.slice(1, -1);
    for (const r of interieur.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!neutralise(r[2])) continue;
      neutralisation = true;
      for (const p of r[1].split(',').map(x => x.trim().replace(/\s+/g, ' ')).filter(Boolean)) {
        if (p === '*') universel = true;
        couverts.add(p);
      }
    }
  }
  if (neutralisation && !universel) {
    const animes = new Map();
    for (const b of blocsHorsRevocation) {
      const porte = [...declsDe('animation', b.decl), ...declsDe('animation-name', b.decl)]
        .some(v => !/^\s*none\b/i.test(v));
      if (!porte || b.sel.startsWith('@')) continue;
      for (const p of b.sel.split(',').map(x => x.trim().replace(/\s+/g, ' ')).filter(Boolean)) {
        if (!couverts.has(p)) animes.set(p, true);
      }
    }
    if (animes.size) {
      add('avertissement', 'R13', `révocation prefers-reduced-motion partielle : ${animes.size} sélecteur(s) animé(s) hors de la révocation `
        + `(${[...animes.keys()].slice(0, 4).join(' ; ')}) — neutraliser chacun, ou une règle universelle « * » (WCAG 2.2 SC 2.3.3)`,
        '@media prefers-reduced-motion');
    }
  }
}

// ── R14 · contrôle pressable sans retour d'appui :active (avertissement, TF-1911) ──
// Un seul constat par page : le nombre de contrôles atteints par aucune règle `:active`.
// L'appariement est celui de la bibliothèque partagée (dernier compound, ancêtres non remontés).
if (html) {
  const parties = [];
  for (const b of blocs) {
    if (b.sel.startsWith('@')) continue;
    for (const p of b.sel.split(',').map(x => x.trim()).filter(Boolean)) {
      if (/:active\b/i.test(p)) parties.push(p);
    }
  }
  const pressables = arbres(brut, html).flatMap(r => elements(r)).filter(e =>
    e.tag === 'button' || String(e.attrs.role || '').toLowerCase() === 'button'
    || (e.tag === 'input' && ['button', 'submit', 'reset'].includes(String(e.attrs.type || '').toLowerCase())));
  const sansAppui = pressables.filter(e => !parties.some(p => correspond(e, p)));
  if (sansAppui.length) {
    add('avertissement', 'R14',
      `${sansAppui.length} contrôle(s) pressable(s) sur ${pressables.length} qu'aucune règle :active n'atteint : l'interface répond au relâchement, `
      + 'pas à l\'appui — ex. « .btn:active { transform: scale(0.97); } » avec une transition courte (STANDARDS, Emil Kowalski)',
      'feuille de style');
  }
}

F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (durs.length) sortir('FAIL', F, 1);
sortir('PASS', F.length ? F : [{ sev: 'info', regle: '—', msg: 'R1–R7 sans écart', where: file }], 0);
