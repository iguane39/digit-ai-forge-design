#!/usr/bin/env node
// oracle-tokens — Domaine « Système de marque : traçabilité des tokens » (déterministe).
//
// Règles T1–T6. Ce que l'oracle exige :
//   T1  aucune couleur littérale hors des blocs qui définissent les tokens
//   T2  aucune famille de police littérale hors des blocs de tokens
//   T3  espacements en px multiples de 4 (échelle 4pt)
//   T4  parité de thèmes : tout token défini en clair l'est aussi en sombre
//   T5  contraste ≥ 4.5:1 sur les paires texte/surface résolvables, par thème
//   T6  chroma réduit aux extrêmes de luminosité (tokens OKLCH)
//
// Convention de nommage requise par T5 — c'est une précondition, pas une devinette :
//   un token de texte contient texte, text, fg, encre ou ink dans son nom ;
//   un token de surface contient fond, bg, surface, papier ou canvas.
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
if (tokens.sombre.size === 0) {
  add('bloquant', 'T4', 'aucun thème sombre déclaré : le contrat exige clair ET sombre', file);
} else {
  const couleurClair = [...tokens.clair].filter(([, v]) => color(v) || /oklch\(/i.test(v)).map(([k]) => k);
  for (const k of couleurClair) {
    if (!tokens.sombre.has(k)) add('bloquant', 'T4', `token de couleur « ${k} » défini en clair mais absent du thème sombre`, 'bloc de thème sombre');
  }
  for (const k of tokens.sombre.keys()) {
    if (!tokens.clair.has(k)) add('majeur', 'T4', `token « ${k} » défini en sombre seulement : le thème clair y référera dans le vide`, 'bloc :root');
  }
}

// ── T5 · contraste des paires résolvables ──────────────────────────────────
const EST_TEXTE = /(^|-)(texte|text|fg|encre|ink)(-|$)/i;
const EST_SURFACE = /(^|-)(fond|bg|surface|papier|canvas)(-|$)/i;
let pairesTestees = 0;
let pairesComposees = 0;
// Une couleur semi-transparente se compose avec ce qu'il y a derrière : son
// contraste n'est pas décidable sur le seul fichier. La déclarer, ne pas
// l'inventer — c'est render_page.py V2 qui mesure le rendu composé.
const opaque = ([, v]) => { const c = color(v); return c && c.a === 1; };
for (const [theme, table] of [['clair', tokens.clair], ['sombre', tokens.sombre]]) {
  const textes = [...table].filter(([k, v]) => EST_TEXTE.test(k) && color(v));
  const surfaces = [...table].filter(([k, v]) => EST_SURFACE.test(k) && color(v));
  pairesComposees += textes.filter(t => !opaque(t)).length * surfaces.length
    + surfaces.filter(s => !opaque(s)).length * textes.filter(opaque).length;
  for (const [kt, vt] of textes.filter(opaque)) {
    for (const [ks, vs] of surfaces.filter(opaque)) {
      pairesTestees++;
      const ratio = contrast(color(vt), color(vs));
      if (ratio < 4.5) {
        add('majeur', 'T5', `contraste ${ratio.toFixed(2)}:1 < 4.5:1 — ${kt} (${vt}) sur ${ks} (${vs}), thème ${theme}`, `thème ${theme}`);
      }
    }
  }
}
if (pairesTestees === 0) {
  // Un PASS silencieux alors qu'aucun contraste n'a été mesuré est le pire des
  // verdicts : il se lit comme « contraste vérifié ». Le rendre visible.
  add('avertissement', 'T5', 'aucune paire texte/surface résolvable : AUCUN contraste n\'a été mesuré. Renommer selon la convention (texte|text|fg|encre|ink × fond|bg|surface|papier|canvas) ou mesurer par render_page.py V2',
    'convention de nommage des tokens');
  NJ.push('T5 : contraste non mesuré faute de paire résolvable — le PASS de cet oracle ne vaut pas validation du contraste');
}
if (pairesComposees > 0) {
  NJ.push(`T5 : ${pairesComposees} paire(s) écartée(s) car un token est semi-transparent — contraste composé indécidable sur le fichier, à mesurer par render_page.py V2`);
}
NJ.push('contraste des couleurs composées (color-mix, superpositions) — déléguer à render_page.py V2 sur les deux thèmes');
NJ.push('adéquation de la palette et de la voix à la marque — arbitrage commanditaire');

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
