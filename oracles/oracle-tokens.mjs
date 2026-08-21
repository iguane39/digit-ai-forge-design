#!/usr/bin/env node
// oracle-tokens — Domaine « Système de marque : traçabilité des tokens » (déterministe).
//
// Règles T0–T8. Ce que l'oracle exige :
//   T0  au moins un bloc de tokens exploitable (sinon rien n'est jugeable)
//   T1  aucune couleur littérale hors des blocs qui définissent les tokens
//   T2  aucune famille de police littérale hors des blocs de tokens
//   T3  espacements en px multiples de 4 (échelle 4pt)
//   T4  parité de thèmes : tout token défini en clair l'est aussi en sombre
//   T5  contraste ≥ 4.5:1 sur les paires réellement posées l'une sur l'autre, par thème
//   T6  chroma réduit aux extrêmes de luminosité (tokens OKLCH)
//   T7  contraste NON TEXTUEL ≥ 3:1 des paires d'interface posées (WCAG 1.4.11, GL03)
//   T8  focus PRESCRIT et contrasté : --focus-anneau / --focus-decalage existent,
//       l'anneau tient ≥ 3:1 contre les surfaces de la page (RGAA 10.7, WCAG 2.4.7)
//
// T7 et T8 (TF-0409, option O4 de l'étude RGAA) réutilisent l'appariement de T5 : mêmes
// poses relevées dans le CSS, même héritage, même échappatoire déclarative — seul le seuil
// et la nature de la paire changent. T7 se garde de juger ce qu'il ne peut pas qualifier :
// WCAG 1.4.11 n'exige 3:1 que des frontières NÉCESSAIRES à identifier un composant, jamais
// d'un séparateur décoratif ; un trait sous 3:1 est donc mesuré, signalé, et son rôle
// déclaré non jugé — pas refusé à tort.
//
// Appariement de T5 — par CO-OCCURRENCE CSS, pas par nommage (TF-0276) :
//   une règle qui pose color:var(--t) et background:var(--f) déclare la paire (t, f) ;
//   une règle qui n'en pose qu'un est appariée à l'AMBIANCE (le color / background
//   posé sur :root, html, body ou *), ce qui couvre l'héritage courant.
//   Échappatoire explicite pour ce que le CSS ne dit pas :
//     :root { --paires-contraste: --texte-sur-accent sur --accent, --encre sur --fond; }
// Une paire jamais posée n'est PAS jugée : elle est déclarée au non_juge. Le produit
// cartésien texte-* × fond-* sortait --texte-sur-accent en FAIL 1.0:1 sur --fond alors
// qu'il n'y est jamais posé — l'oracle contredisait references/tokens.md de sa forge.
// La convention de nommage (texte|text|fg|encre|ink × fond|bg|surface|papier|canvas)
// ne sert plus qu'à ÉNUMÉRER les paires non jugées, jamais à en fabriquer.
// Aucune paire résolvable ⇒ T5 déclaré non jugé, jamais approuvé par défaut.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-tokens.mjs <fichier.html> [--tokens tokens.css] [--json-only]

import fs from 'node:fs';
import { parse as parseHtml, css, cssRulesDeep, lineOf } from './lib/html.mjs';
import { parse as color, hsl, contrast, findColors } from './lib/color.mjs';

const DOM = 'Système de marque : traçabilité des tokens';
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const tokensArg = args.includes('--tokens') ? args[args.indexOf('--tokens') + 1] : null;
const jsonOnly = args.includes('--json-only');

const NJ = [];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-tokens', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'T1–T6 sans écart', where: file }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) { NJ.push('fichier absent'); sortir('SKIP', 2); }

const html = fs.readFileSync(file, 'utf8');
const root = parseHtml(html);
let cssText = css(html, root).replace(/\/\*[\s\S]*?\*\//g, ' ');
if (tokensArg && fs.existsSync(tokensArg)) cssText = fs.readFileSync(tokensArg, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ') + '\n' + cssText;

const regles = cssRulesDeep(cssText);
const estBlocToken = r =>
  /:root|\[data-theme|^html(\.|:)|\.theme-/i.test(r.selector) || /--[\w-]+\s*:/.test(r.body) && /:root/i.test(r.selector);
const estSombre = r =>
  r.atRules.some(a => /prefers-color-scheme\s*:\s*dark/i.test(a)) ||
  /dark/i.test(r.selector);

// ── Collecte des tokens déclarés ───────────────────────────────────────────
const tokens = { clair: new Map(), sombre: new Map() };
for (const r of regles) {
  if (!estBlocToken(r)) continue;
  const cible = estSombre(r) ? tokens.sombre : tokens.clair;
  const re = /(--[\w-]+)\s*:\s*([^;]+)/g;
  let m;
  while ((m = re.exec(r.body))) cible.set(m[1], m[2].trim());
}

if (tokens.clair.size === 0) {
  add('bloquant', 'T0', 'aucun token déclaré : ni :root, ni [data-theme], ni fichier --tokens exploitable', file);
  sortir('FAIL', 1);
}

// ── T1 · couleurs littérales hors blocs de tokens ──────────────────────────
const PROPS_COULEUR = /(^|[;{\s])(color|background|background-color|border(?:-\w+)?-color|border|outline(?:-color)?|fill|stroke|caret-color|accent-color|text-decoration-color)\s*:\s*([^;]+)/gi;
for (const r of regles) {
  if (estBlocToken(r)) continue;
  let m;
  PROPS_COULEUR.lastIndex = 0;
  while ((m = PROPS_COULEUR.exec(r.body))) {
    const val = m[3];
    for (const c of findColors(val)) {
      add('bloquant', 'T1', `couleur en dur « ${c.raw} » sur ${m[2]} : passer par var(--token)`,
        `sélecteur « ${r.selector.slice(0, 60)} », ligne ~${lineOf(cssText, r.start)} du CSS`);
    }
  }
}

// ── T2 · familles de police littérales hors blocs de tokens ────────────────
for (const r of regles) {
  if (estBlocToken(r)) continue;
  const re = /font-family\s*:\s*([^;]+)/gi;
  let m;
  while ((m = re.exec(r.body))) {
    if (/var\(\s*--/.test(m[1])) continue;
    add('bloquant', 'T2', `famille de police en dur « ${m[1].trim().slice(0, 50)} » : passer par var(--token)`,
      `sélecteur « ${r.selector.slice(0, 60)} »`);
  }
}

// ── T3 · échelle 4pt ───────────────────────────────────────────────────────
const PROPS_ESPACE = /(^|[;{\s])(margin|padding|gap|row-gap|column-gap)(-top|-right|-bottom|-left|-block|-inline)?\s*:\s*([^;]+)/gi;
for (const r of regles) {
  let m;
  PROPS_ESPACE.lastIndex = 0;
  while ((m = PROPS_ESPACE.exec(r.body))) {
    const val = m[4];
    if (/var\(\s*--|calc\(|clamp\(|auto|%/.test(val)) continue;
    for (const px of val.matchAll(/(-?[\d.]+)px/g)) {
      const v = Math.abs(parseFloat(px[1]));
      if (v !== 0 && v % 4 !== 0) {
        add('majeur', 'T3', `espacement ${px[1]}px hors échelle 4pt sur ${m[2]}${m[3] || ''}`,
          `sélecteur « ${r.selector.slice(0, 60)} »`);
      }
    }
  }
}

// ── T4 · parité de thèmes ──────────────────────────────────────────────────
// Le thème sombre est OPTIONNEL : la doctrine du socle (digit-ai-page-html) est le thème
// clair, confirmée par décision humaine du 09/08 (« les fiches HTML doivent être en thème
// clair »). Un livrable clair seul est conforme ; en revanche, dès qu'un bloc sombre est
// déclaré, la parité complète et les contrastes des deux thèmes restent exigés — un sombre
// partiel est pire qu'aucun sombre.
if (tokens.sombre.size === 0) {
  add('info', 'T4', 'thème clair seul — conforme à la doctrine du socle (sombre optionnel ; s\'il est déclaré, la parité redevient bloquante)', file);
} else {
  const couleurClair = [...tokens.clair].filter(([, v]) => color(v) || /oklch\(/i.test(v)).map(([k]) => k);
  for (const k of couleurClair) {
    if (!tokens.sombre.has(k)) add('bloquant', 'T4', `token de couleur « ${k} » défini en clair mais absent du thème sombre`, 'bloc de thème sombre');
  }
  for (const k of tokens.sombre.keys()) {
    if (!tokens.clair.has(k)) add('majeur', 'T4', `token « ${k} » défini en sombre seulement : le thème clair y référera dans le vide`, 'bloc :root');
  }
}

// ── T5 · contraste des paires réellement posées l'une sur l'autre ──────────
const EST_TEXTE = /(^|-)(texte|text|fg|encre|ink)(-|$)/i;
const EST_SURFACE = /(^|-)(fond|bg|surface|papier|canvas)(-|$)/i;
const PROP_TEXTE = /(^|[;{\s])color\s*:\s*([^;]+)/gi;
const PROP_FOND = /(^|[;{\s])background(?:-color)?\s*:\s*([^;]+)/gi;
// Sélecteur d'ambiance : ce qui habille la page et dont tout le reste hérite.
const EST_AMBIANCE = s => s.split(',').some(x => /^\s*(:root|html|body|\*)\s*$/i.test(x));
const varsDe = val => [...val.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]);

// 1. Relevé des poses : ce que chaque règle met en texte et en fond.
const poses = [];
const ambiance = { texte: new Set(), fond: new Set() };
// Aucune règle n'est écartée ici : une déclaration de token (« --fond: #fff »)
// ne matche pas ces propriétés, tandis qu'un « :root { color: var(--texte) } »
// ou un « [data-theme="dark"] .bouton { … } » posent bel et bien des couleurs.
for (const r of regles) {
  const t = [], f = [];
  let m;
  PROP_TEXTE.lastIndex = 0;
  while ((m = PROP_TEXTE.exec(r.body))) t.push(...varsDe(m[2]));
  PROP_FOND.lastIndex = 0;
  while ((m = PROP_FOND.exec(r.body))) f.push(...varsDe(m[2]));
  if (!t.length && !f.length) continue;
  if (EST_AMBIANCE(r.selector)) { for (const x of t) ambiance.texte.add(x); for (const x of f) ambiance.fond.add(x); }
  poses.push({ sel: r.selector, t, f });
}

// 2. Héritage : une règle qui ne pose qu'une des deux couleurs complète l'autre
// par son ANCÊTRE le plus proche dans le CSS (préfixe de sélecteur), et à défaut
// par l'ambiance. Sans cet étage, un « .toc-d { color: var(--surface) } » niché
// dans un onglet à fond accentué serait jugé contre le fond de page : une paire
// qui n'existe nulle part, exactement le défaut que ce chantier corrige.
const morceaux = s => s.split(',').map(x => x.trim()).filter(Boolean);
const estAncetre = (a, d) => d.length > a.length && d.startsWith(a) && /[\s>+~]/.test(d[a.length]);
function heriter(selecteur, sources, defaut, quoi) {
  let meilleur = null;
  for (const p of morceaux(selecteur)) {
    for (const s of sources) {
      for (const a of morceaux(s.sel)) {
        if (estAncetre(a, p) && (!meilleur || a.length > meilleur.taille)) meilleur = { taille: a.length, vals: s.vals };
      }
    }
  }
  return meilleur
    ? { vals: meilleur.vals, origine: `${quoi} hérité de l'ancêtre CSS` }
    : { vals: defaut, origine: `${quoi} hérité de l'ambiance` };
}
const sourcesFond = poses.filter(p => p.f.length).map(p => ({ sel: p.sel, vals: p.f }));
const sourcesTexte = poses.filter(p => p.t.length).map(p => ({ sel: p.sel, vals: p.t }));

// 3. Paires : co-occurrence dans la même règle, ou complétée par l'héritage.
const paires = new Map(); // "t|f" -> origine lisible
const noter = (t, f, origine) => { if (t !== f && !paires.has(t + '|' + f)) paires.set(t + '|' + f, origine); };
for (const p of poses) {
  let textes = p.t, fonds = p.f, origine = 'posés par la même règle';
  if (!textes.length) { const h = heriter(p.sel, sourcesTexte, [...ambiance.texte], 'texte'); textes = h.vals; origine = h.origine; }
  if (!fonds.length) { const h = heriter(p.sel, sourcesFond, [...ambiance.fond], 'fond'); fonds = h.vals; origine = h.origine; }
  for (const a of textes) for (const b of fonds) noter(a, b, origine);
}

// 4. Paires déclarées à la main — pour ce que le CSS du fichier ne dit pas.
for (const table of [tokens.clair, tokens.sombre]) {
  const v = table.get('--paires-contraste');
  if (!v) continue;
  for (const morceau of v.split(',')) {
    const m = /(--[\w-]+)\s+sur\s+(--[\w-]+)/i.exec(morceau);
    if (m) noter(m[1], m[2], 'déclarée par --paires-contraste');
    else add('avertissement', 'T5', `--paires-contraste : « ${morceau.trim().slice(0, 50)} » illisible (forme attendue : --texte sur --fond)`, 'bloc de tokens');
  }
}

let pairesTestees = 0;
let pairesComposees = 0;
// Une couleur semi-transparente se compose avec ce qu'il y a derrière : son
// contraste n'est pas décidable sur le seul fichier. La déclarer, ne pas
// l'inventer — c'est render_page.py V2 qui mesure le rendu composé.
for (const [theme, table] of [['clair', tokens.clair], ['sombre', tokens.sombre]]) {
  for (const [cle, origine] of paires) {
    const [kt, ks] = cle.split('|');
    const vt = table.get(kt), vs = table.get(ks);
    if (vt === undefined || vs === undefined) continue; // paire absente de ce thème
    const ct = color(vt), cs = color(vs);
    if (!ct || !cs) continue;
    if (ct.a !== 1 || cs.a !== 1) { pairesComposees++; continue; }
    pairesTestees++;
    const ratio = contrast(ct, cs);
    if (ratio < 4.5) {
      // TF-0427 (lot Hoopiz 20260820a, 21/08) : une paire dont le texte est HÉRITÉ DE L'AMBIANCE
      // n'est pas forcément réalisée — une barre de répartition posée sur --blue ne porte aucun
      // texte, et le produit cartésien la jugeait « --ink sur --blue » en majeur. Statiquement
      // indécidable : AVERTISSEMENT nommé, la mesure de vérité est render_page.py V2 (texte réel
      // sur fond calculé). Une paire posée par la même règle, héritée d'un ancêtre ou déclarée
      // reste un majeur : là, le texte existe.
      const presumee = /hérité de l'ambiance/.test(origine);
      add(presumee ? 'avertissement' : 'majeur', 'T5',
        `contraste ${ratio.toFixed(2)}:1 < 4.5:1 — ${kt} (${vt}) sur ${ks} (${vs}), thème ${theme} [${origine}]` +
        (presumee ? ' — paire PRÉSUMÉE (texte hérité, peut-être jamais posé sur ce fond) : mesurer au rendu (render_page.py V2) ou déclarer la paire réelle par --paires-contraste' : ''),
        `thème ${theme}`);
    }
  }
}
if (pairesTestees === 0) {
  // Un PASS silencieux alors qu'aucun contraste n'a été mesuré est le pire des
  // verdicts : il se lit comme « contraste vérifié ». Le rendre visible.
  add('avertissement', 'T5', 'aucune paire texte/fond posée par le CSS : AUCUN contraste n\'a été mesuré. Poser les couleurs par var(--token), déclarer les paires par --paires-contraste, ou mesurer par render_page.py V2',
    'CSS du document');
  NJ.push('T5 : contraste non mesuré faute de paire posée — le PASS de cet oracle ne vaut pas validation du contraste');
}
if (pairesComposees > 0) {
  NJ.push(`T5 : ${pairesComposees} paire(s) écartée(s) car un token est semi-transparent — contraste composé indécidable sur le fichier, à mesurer par render_page.py V2`);
}
// Ce que la co-occurrence n'a PAS jugé : les tokens nommés selon la convention
// que rien ne pose l'un sur l'autre. Les taire ferait lire le PASS comme
// « toutes les combinaisons sont sûres » — elles ne sont simplement pas posées.
{
  const jamais = [];
  for (const [theme, table] of [['clair', tokens.clair], ['sombre', tokens.sombre]]) {
    const textes = [...table].filter(([k, v]) => EST_TEXTE.test(k) && color(v)).map(([k]) => k);
    const surfaces = [...table].filter(([k, v]) => EST_SURFACE.test(k) && color(v)).map(([k]) => k);
    for (const kt of textes) for (const ks of surfaces) {
      if (kt !== ks && !paires.has(kt + '|' + ks)) jamais.push(`${kt} sur ${ks} (${theme})`);
    }
  }
  if (jamais.length) {
    NJ.push(`T5 : ${jamais.length} paire(s) texte/fond nommée(s) selon la convention mais jamais posée(s) l'une sur l'autre — non jugée(s) : ${jamais.slice(0, 8).join(', ')}${jamais.length > 8 ? ', …' : ''}. Les déclarer par --paires-contraste si elles se rencontrent au rendu.`);
  }
}
NJ.push('T5 : l\'héritage est approché par le préfixe de sélecteur puis par l\'ambiance (:root, html, body, *) — un texte dont le conteneur réel n\'est pas un ancêtre de sélecteur (composition à l\'exécution, portail, classe posée en JS) est jugé contre le fond ambiant, pas contre le sien');
NJ.push('contraste des couleurs composées (color-mix, superpositions) — déléguer à render_page.py V2 sur les deux thèmes');
NJ.push('adéquation de la palette et de la voix à la marque — arbitrage commanditaire');

// ── T7 · contraste NON TEXTUEL des paires d'interface posées (WCAG 1.4.11) ─
// Même appareil que T5 — poses relevées dans le CSS, héritage du fond, échappatoire
// déclarative — seuls le seuil (3:1) et la nature de la paire changent : un TRAIT
// (bordure, contour) sur sa surface, pas un texte sur son fond.
//
// Ce que T7 se garde de faire. WCAG 1.4.11 n'exige 3:1 que des frontières NÉCESSAIRES à
// identifier un composant ou son état ; un séparateur décoratif n'est pas concerné, et
// aucune analyse de CSS ne distingue les deux. Un trait sous 3:1 est donc MESURÉ et
// SIGNALÉ (avertissement), son rôle déclaré non jugé — refuser à tort ferait désactiver la
// règle, la taire ferait lire le PASS comme « contrastes d'interface vérifiés ».
// L'auteur qui SAIT qu'une frontière est nécessaire la déclare par `--paires-interface`
// (même forme que `--paires-contraste`) : elle devient alors un écart DUR.
const PROP_TRAIT = /(^|[;{\s])(?:border(?:-[a-z]+)?-color|border(?:-[a-z]+)?|outline(?:-color)?)\s*:\s*([^;]+)/gi;
const traits = [];
for (const r of regles) {
  const t = [];
  let m;
  PROP_TRAIT.lastIndex = 0;
  while ((m = PROP_TRAIT.exec(r.body))) t.push(...varsDe(m[2]));
  if (!t.length) continue;
  const f = [];
  PROP_FOND.lastIndex = 0;
  let mf;
  while ((mf = PROP_FOND.exec(r.body))) f.push(...varsDe(mf[2]));
  let fonds = f, origine = 'trait et fond posés par la même règle';
  if (!fonds.length) { const h = heriter(r.selector, sourcesFond, [...ambiance.fond], 'fond'); fonds = h.vals; origine = h.origine; }
  for (const a of t) for (const b of fonds) if (a !== b) traits.push({ trait: a, fond: b, origine });
}

// Frontières DÉCLARÉES nécessaires : l'auteur prend la responsabilité, la règle durcit.
const interfaceDeclaree = new Set();
for (const table of [tokens.clair, tokens.sombre]) {
  const v = table.get('--paires-interface');
  if (!v) continue;
  for (const morceau of v.split(',')) {
    const m = /(--[\w-]+)\s+sur\s+(--[\w-]+)/i.exec(morceau);
    if (m) { interfaceDeclaree.add(m[1] + '|' + m[2]); traits.push({ trait: m[1], fond: m[2], origine: 'déclarée par --paires-interface' }); }
    else add('avertissement', 'T7', `--paires-interface : « ${morceau.trim().slice(0, 50)} » illisible (forme attendue : --trait sur --fond)`, 'bloc de tokens');
  }
}

let traitsTestes = 0, traitsSousSeuil = 0;
const vus7 = new Set();
for (const [theme, table] of [['clair', tokens.clair], ['sombre', tokens.sombre]]) {
  for (const { trait, fond, origine } of traits) {
    const cle = `${trait}|${fond}|${theme}`;
    if (vus7.has(cle)) continue;
    vus7.add(cle);
    const vt = table.get(trait), vf = table.get(fond);
    if (vt === undefined || vf === undefined) continue;
    const ct = color(vt), cf = color(vf);
    if (!ct || !cf || ct.a !== 1 || cf.a !== 1) continue;
    traitsTestes++;
    const ratio = contrast(ct, cf);
    if (ratio >= 3) continue;
    traitsSousSeuil++;
    const dure = interfaceDeclaree.has(trait + '|' + fond);
    add(dure ? 'majeur' : 'avertissement', 'T7',
      `contraste non textuel ${ratio.toFixed(2)}:1 < 3:1 — ${trait} (${vt}) sur ${fond} (${vf}), thème ${theme} [${origine}]` +
      (dure ? ' — frontière DÉCLARÉE nécessaire par --paires-interface' : ' — si cette frontière identifie un composant ou son état, la déclarer par --paires-interface : WCAG 1.4.11 l\'exige alors à 3:1'),
      `thème ${theme}`);
  }
}
if (traitsTestes === 0) {
  NJ.push('T7 : aucun trait d\'interface (bordure, contour) posé par var(--token) — AUCUN contraste non textuel n\'a été mesuré ; le PASS ne vaut pas validation de WCAG 1.4.11');
} else if (traitsSousSeuil > 0) {
  NJ.push(`T7 : ${traitsSousSeuil} trait(s) sous 3:1 mesuré(s) et signalé(s) — leur RÔLE (frontière nécessaire ou séparateur décoratif) n'est pas jugeable depuis le CSS, seule la déclaration --paires-interface le tranche`);
}

// ── T8 · focus PRESCRIT et contrasté (RGAA 10.7, WCAG 2.4.7 et 1.4.11) ─────
// Le fait qui la fait naître (TF-0409, O4) : le gabarit posait déjà
// `outline: 3px solid var(--accent)` et `outline-offset: 2px`, le DESIGN.md généré affirmait
// « états focus visibles au clavier », et le contrat de tokens ne nommait AUCUN token de
// focus. Une affordance consommée sans être prescrite est une valeur improvisée par chaque
// auteur, et une charte qui affirme plus que ce que la marque a fixé.
//
// Ce que T8 refuse, et ce qu'il ne fait pas : il ne réclame pas des tokens de focus à un
// fichier qui ne pose aucun focus — sans quoi il mettrait en échec tout l'existant du parc
// (R-33 bis) et se ferait désactiver. Il refuse DEUX choses : poser un focus sans le
// prescrire, et prescrire un anneau qu'on ne voit pas.
const REGLE_FOCUS = /:focus(-visible|-within)?\b/i;
const PROP_ANNEAU = /(^|[;{\s])(?:outline(?:-color)?|box-shadow|border(?:-color)?)\s*:\s*([^;]+)/gi;
const PROP_DECALAGE = /(^|[;{\s])outline-offset\s*:\s*([^;]+)/gi;

const anneau = ['--focus-anneau', '--focus-ring', '--anneau-focus'];
const decalage = ['--focus-decalage', '--focus-offset', '--focus-ecart'];
const trouve = (table, noms) => noms.map(n => [n, table.get(n)]).find(([, v]) => v !== undefined);
const tokenAnneau = trouve(tokens.clair, anneau) || trouve(tokens.sombre, anneau);
const tokenDecalage = trouve(tokens.clair, decalage) || trouve(tokens.sombre, decalage);

const reglesFocus = regles.filter(r => REGLE_FOCUS.test(r.selector));
let focusImprovise = 0;
for (const r of reglesFocus) {
  const vals = [];
  let m;
  PROP_ANNEAU.lastIndex = 0;
  while ((m = PROP_ANNEAU.exec(r.body))) vals.push(m[2]);
  if (!vals.length) continue;
  const tokensPoses = vals.flatMap(varsDe);
  if (tokensPoses.some(t => anneau.includes(t))) continue; // prescrit : rien à dire
  focusImprovise++;
  add('majeur', 'T8',
    `focus POSÉ sans être PRESCRIT — « ${r.selector.trim().slice(0, 60)} » dessine un anneau ` +
    `(${vals[0].trim().slice(0, 40)}) qui ne vient d'aucun token de focus. Une affordance consommée ` +
    'sans être prescrite est une valeur improvisée par chaque auteur : poser --focus-anneau et ' +
    '--focus-decalage au bloc de tokens, et les consommer ici (RGAA 10.7, WCAG 2.4.7)',
    r.selector.trim().slice(0, 60));
}

if (tokenAnneau) {
  // Prescrit : alors il se voit. 3:1 contre CHAQUE surface du thème — un anneau qui tient
  // 4:1 sur le fond de page peut tomber à 1.6:1 sur une carte sombre.
  for (const [theme, table] of [['clair', tokens.clair], ['sombre', tokens.sombre]]) {
    const va = table.get(tokenAnneau[0]);
    if (va === undefined) continue; // parité : c'est T4 qui la réclame
    const ca = color(va);
    if (!ca || ca.a !== 1) { NJ.push(`T8 : ${tokenAnneau[0]} semi-transparent ou illisible en thème ${theme} — contraste de l'anneau non décidable sur le fichier`); continue; }
    const surfaces = [...table].filter(([k, v]) => EST_SURFACE.test(k) && color(v) && color(v).a === 1);
    if (!surfaces.length) { NJ.push(`T8 : aucune surface nommée en thème ${theme} — l'anneau de focus n'a été confronté à rien`); continue; }
    for (const [ks, vs] of surfaces) {
      const ratio = contrast(ca, color(vs));
      if (ratio >= 3) continue;
      add('majeur', 'T8',
        `anneau de focus ${ratio.toFixed(2)}:1 < 3:1 — ${tokenAnneau[0]} (${va}) sur ${ks} (${vs}), thème ${theme} : ` +
        'visible pour l\'auteur, invisible pour l\'utilisateur au clavier (WCAG 1.4.11, RGAA 10.7)',
        `thème ${theme}`);
    }
  }
  if (!tokenDecalage) {
    add('majeur', 'T8',
      `${tokenAnneau[0]} est prescrit mais aucun écart ne l'est — poser --focus-decalage (≥ 2px) : ` +
      'un anneau collé au contrôle est indiscernable de sa bordure',
      'bloc de tokens');
  } else {
    const px = /(-?[\d.]+)\s*px/.exec(String(tokenDecalage[1]));
    if (!px) NJ.push(`T8 : ${tokenDecalage[0]} = « ${tokenDecalage[1]} » n'est pas en px — écart non mesuré`);
    else if (parseFloat(px[1]) < 2) {
      add('majeur', 'T8',
        `${tokenDecalage[0]} = ${tokenDecalage[1]} < 2px — un anneau collé au contrôle est indiscernable de sa bordure (WCAG 2.4.13)`,
        'bloc de tokens');
    }
  }
} else if (!focusImprovise) {
  // Ni tokens, ni focus posé : rien à refuser, mais le silence serait un faux vert.
  add('avertissement', 'T8',
    'aucun token de focus prescrit (--focus-anneau / --focus-decalage) et aucun style de focus posé — ' +
    'l\'accessibilité au clavier n\'est ni fixée par la marque ni mesurée ici (RGAA 10.7)',
    'bloc de tokens');
  NJ.push('T8 : focus ni prescrit ni posé — le PASS ne vaut pas validation du focus visible ; la mesure sur le rendu relève de render_page.py et du pan clavier de forge-tests');
}
NJ.push('T8 : la VISIBILITÉ réelle de l\'anneau au rendu (épaisseur, recouvrement par un parent en overflow, ordre de tabulation) n\'est pas jugeable depuis le CSS — elle relève du pan clavier de forge-tests (TF-0409, O3)');

// ── T6 · chroma aux extrêmes de luminosité ─────────────────────────────────
for (const [theme, table] of [['clair', tokens.clair], ['sombre', tokens.sombre]]) {
  for (const [k, v] of table) {
    const m = /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/i.exec(v);
    if (!m) continue;
    let L = parseFloat(m[1]); if (L > 1) L /= 100;
    const C = parseFloat(m[2]);
    if ((L >= 0.85 || L <= 0.15) && C > 0.10) {
      add('avertissement', 'T6', `${k} : chroma ${C} à L=${L.toFixed(2)} — réduire le chroma aux extrêmes, sinon rendu criard (thème ${theme})`, `thème ${theme}`);
    }
  }
}

// ── Verdict ────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(dur.length ? `FAIL — ${dur.length} écart(s) dur(s)\n` : `PASS — ${tokens.clair.size} tokens clairs, ${tokens.sombre.size} sombres, ${pairesTestees} paire(s) de contraste testée(s)\n`);
if (dur.length) sortir('FAIL', 1);
sortir('PASS', 0);
