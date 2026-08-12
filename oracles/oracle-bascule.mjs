#!/usr/bin/env node
// oracle-bascule — Domaine « Bascule sombre : présence, câblage, dérivation » (déterministe).
//
// Aval R-30 (REGLES-PROJET §J du pilot, TF-0133) : tout HTML autonome livré porte une
// bascule sombre en zone d'en-tête, câblée (loi transverse n° 1 — une bascule sans effet
// observable est un défaut), persistée, et une palette sombre dérivée des mêmes tokens
// (jamais une seconde charte). Quatre règles, décidables sur le fichier seul :
//   B-T1  bouton .theme-toggle ou [data-theme-toggle] présent, en zone d'en-tête
//         (ancêtre <header>, ou classe header/entete/topbar/navbar/app-bar)
//   B-T2  câblé — un écouteur de clic est bien attaché à CE bouton (getElementById /
//         querySelector + addEventListener, onclick=, ou attribut onclick inline) ET
//         le JS inline mute data-theme sur la racine (<html>/documentElement) quelque
//         part — un bouton sans écouteur, ou un écouteur qui ne mute jamais la racine,
//         est une bascule morte (loi n° 1)
//   B-T3  persistance localStorage déclarée (lecture ET écriture d'une clé « *theme* »)
//   B-T4  palette sombre présente sous [data-theme="dark"] (ou @media prefers-color-scheme:
//         dark), dérivée des tokens clairs (parité) — aucune couleur en dur nouvelle dans
//         une règle scopée au thème sombre hors du bloc de définition des tokens
//
// Ce que cet oracle NE juge PAS (déclaré en non_juge, jamais dupliqué) :
//   - le contraste AA des deux thèmes : delegué à render_page.py (mesure déjà 2 thèmes,
//     voir --rendu de run-oracles-design.mjs) ;
//   - la révocation par projet (frontmatter docs/projet/PARAMETRAGE.md) : hors périmètre
//     d'un fichier HTML unique ;
//   - le câblage porté par un script externe ou un framework (React/Vue/Web Components) :
//     analyse statique limitée au JS inline ;
//   - la corrélation causale stricte écouteur→mutation : ce contrôle vérifie leur
//     coprésence (écouteur sur CE bouton + mutation data-theme quelque part dans le JS
//     inline), pas un suivi de flux d'exécution complet.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-bascule.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import { parse as parseHtml, elements, css, cssRulesDeep } from './lib/html.mjs';
import { findColors } from './lib/color.mjs';

const DOM = 'Bascule sombre : présence, câblage, dérivation';
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');

const NON_JUGE = [
  'contraste AA des deux thèmes — délégué à render_page.py (mesure déjà 2 thèmes), non dupliqué ici',
  'révocation par projet (frontmatter docs/projet/PARAMETRAGE.md) — hors périmètre d\'un fichier HTML unique',
  'câblage porté par un script externe (src=…) ou un framework (React/Vue/Web Components) — analyse statique limitée au JS inline',
  'corrélation causale stricte entre l\'écouteur de clic et la mutation observée — coprésence vérifiée, pas un suivi de flux d\'exécution complet',
  'priorité effective du choix persisté sur prefers-color-scheme au runtime — comportement dynamique non observable sur le fichier seul',
];

const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-bascule', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'B-T1–B-T4 sans écart', where: file }],
    non_juge: NON_JUGE,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) sortir('SKIP', 2);
if (!/\.html?$/i.test(file)) sortir('SKIP', 2);

const html = fs.readFileSync(file, 'utf8');
const root = parseHtml(html);

// ── B-T1 · bouton présent, en zone d'en-tête ────────────────────────────────
function classesDe(el) {
  return ((el.attrs && el.attrs.class) || '').split(/\s+/).filter(Boolean);
}
function estBoutonBascule(el) {
  if (el.tag.startsWith('#')) return false;
  return classesDe(el).includes('theme-toggle')
    || Object.prototype.hasOwnProperty.call(el.attrs || {}, 'data-theme-toggle');
}
function enZoneEntete(el) {
  let p = el.parent;
  while (p) {
    if (p.tag === 'header') return true;
    const cls = (p.attrs && p.attrs.class) || '';
    if (/(^|\s)(header|entete|en-tete|topbar|navbar|app-bar)(\s|$)/i.test(cls)) return true;
    p = p.parent;
  }
  return false;
}

const boutons = elements(root).filter(estBoutonBascule);
let bouton = null;
if (boutons.length === 0) {
  add('bloquant', 'B-T1', 'aucun bouton de bascule détecté (sélecteur .theme-toggle ou [data-theme-toggle])', file);
} else {
  bouton = boutons.find(enZoneEntete) || boutons[0];
  if (!enZoneEntete(bouton)) {
    add('majeur', 'B-T1', 'bouton de bascule présent mais hors zone d\'en-tête (aucun ancêtre <header> ou conteneur d\'en-tête reconnu)', 'DOM');
  }
}

// ── Collecte du JS inline (scripts sans src) + attribut onclick du bouton ──
const scriptsInline = [];
for (const s of elements(root, 'script')) {
  if (s.attrs && Object.prototype.hasOwnProperty.call(s.attrs, 'src')) continue;
  for (const c of s.children) if (c.tag === '#raw') scriptsInline.push(c.text);
}
const texteScripts = scriptsInline.join('\n');
const boutonOnclick = bouton && bouton.attrs ? bouton.attrs.onclick || '' : '';
const texteAnalyse = texteScripts + '\n' + boutonOnclick;
if (elements(root, 'script').some(s => s.attrs && Object.prototype.hasOwnProperty.call(s.attrs, 'src'))) {
  NON_JUGE.push('au moins un <script src="…"> détecté : son contenu n\'est pas analysé (câblage éventuellement porté par lui, hors périmètre)');
}

// ── B-T2 · câblage : écouteur sur CE bouton + mutation data-theme sur la racine ──
function coincideBouton(fn, arg, bt) {
  if (!bt) return false;
  const id = bt.attrs && bt.attrs.id;
  if (fn === 'getElementById') return !!id && arg === id;
  const a = arg.trim();
  if (a.startsWith('#')) return !!id && a.slice(1) === id;
  if (a.startsWith('.')) return classesDe(bt).includes(a.slice(1));
  if (a.startsWith('[')) return /data-theme-toggle/i.test(a) && Object.prototype.hasOwnProperty.call(bt.attrs || {}, 'data-theme-toggle');
  return false;
}

let ecouteurTrouve = !!boutonOnclick;
if (bouton) {
  const REF_DIRECTE = /document\.(getElementById|querySelector)\(\s*(['"])([^'"]+)\2\s*\)/g;
  for (const m of texteScripts.matchAll(REF_DIRECTE)) {
    if (!coincideBouton(m[1], m[3], bouton)) continue;
    const suite = texteScripts.slice(m.index + m[0].length, m.index + m[0].length + 60);
    if (/^\s*\.\s*(addEventListener\(\s*['"]click['"]|onclick\s*=)/.test(suite)) ecouteurTrouve = true;
  }
  const REF_ALIAS = /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.(getElementById|querySelector)\(\s*(['"])([^'"]+)\3\s*\)/g;
  for (const m of texteScripts.matchAll(REF_ALIAS)) {
    if (!coincideBouton(m[2], m[4], bouton)) continue;
    const alias = m[1];
    const usage = new RegExp(`\\b${alias}\\b\\s*\\.\\s*(?:addEventListener\\(\\s*['"]click['"]|onclick\\s*=)`);
    if (usage.test(texteScripts)) ecouteurTrouve = true;
  }
}

const ROOT_ALIAS_RE = /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.(?:documentElement\b|querySelector\(\s*['"](?:html|:root)['"]\s*\)|getElementsByTagName\(\s*['"]html['"]\s*\)\s*\[0\])/g;
const aliasRacine = [...texteAnalyse.matchAll(ROOT_ALIAS_RE)].map(m => m[1]);
const alternatives = ['document\\.documentElement', "document\\.querySelector\\(\\s*['\"](?:html|:root)['\"]\\s*\\)", ...aliasRacine.map(a => `\\b${a}\\b`)];
const MUTATION_RE = new RegExp(`(?:${alternatives.join('|')})\\s*\\.\\s*(?:setAttribute\\(\\s*['"]data-theme['"]|dataset\\.theme\\s*=)`, 'i');
const mutationTrouvee = MUTATION_RE.test(texteAnalyse);

if (bouton) {
  if (!ecouteurTrouve) {
    add('bloquant', 'B-T2', 'bouton de bascule présent mais aucun écouteur de clic ne lui est attaché (getElementById/querySelector + addEventListener, ou onclick) : bascule morte — loi n° 1', 'JS inline');
  } else if (!mutationTrouvee) {
    add('bloquant', 'B-T2', 'écouteur de clic détecté sur le bouton, mais aucune mutation de data-theme sur la racine (<html>) trouvée dans le JS inline : bascule inopérante — loi n° 1', 'JS inline');
  }
} else {
  NON_JUGE.push('câblage (B-T2) non jugé : bouton absent (voir B-T1)');
}

// ── B-T3 · persistance localStorage déclarée ────────────────────────────────
const A_ECRITURE = /localStorage\.setItem\(\s*['"][^'"]*theme[^'"]*['"]/i.test(texteAnalyse);
const A_LECTURE = /localStorage\.getItem\(\s*['"][^'"]*theme[^'"]*['"]/i.test(texteAnalyse);
if (!A_ECRITURE && !A_LECTURE) {
  add('bloquant', 'B-T3', 'aucune persistance localStorage déclarée pour le thème (ni lecture ni écriture d\'une clé contenant « theme »)', 'JS inline');
} else if (!A_ECRITURE) {
  add('majeur', 'B-T3', 'persistance localStorage partielle : lecture (getItem) sans écriture (setItem) — le choix de l\'utilisateur ne serait jamais sauvegardé', 'JS inline');
} else if (!A_LECTURE) {
  add('majeur', 'B-T3', 'persistance localStorage partielle : écriture (setItem) sans lecture (getItem) au chargement — le choix persisté ne serait jamais relu', 'JS inline');
}

// ── B-T4 · palette sombre dérivée des tokens clairs ─────────────────────────
const cssText = css(html, root).replace(/\/\*[\s\S]*?\*\//g, ' ');
const regles = cssRulesDeep(cssText);
const estBlocToken = r => /:root|\[data-theme|^html(\.|:)|\.theme-/i.test(r.selector);
const estSombre = r =>
  r.atRules.some(a => /prefers-color-scheme\s*:\s*dark/i.test(a)) || /dark/i.test(r.selector);

const tokensClairs = new Map();
const tokensSombres = new Map();
for (const r of regles) {
  if (!estBlocToken(r)) continue;
  const dest = estSombre(r) ? tokensSombres : tokensClairs;
  for (const m of r.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) dest.set(m[1], m[2].trim());
}

if (tokensSombres.size === 0) {
  add('bloquant', 'B-T4', 'aucun bloc de thème sombre détecté ([data-theme="dark"] ou @media (prefers-color-scheme: dark)) : palette sombre absente', file);
} else {
  for (const [k, v] of tokensClairs) {
    if (/#|rgb|hsl|oklch/i.test(v) && !tokensSombres.has(k)) {
      add('bloquant', 'B-T4', `token « ${k} » défini en clair mais absent du thème sombre : palette non dérivée (une source, deux projections attendu)`, 'bloc de thème sombre');
    }
  }
  for (const r of regles) {
    if (estBlocToken(r) || !estSombre(r)) continue;
    for (const c of findColors(r.body)) {
      add('bloquant', 'B-T4', `couleur en dur « ${c.raw} » dans une règle scopée au thème sombre « ${r.selector.slice(0, 60)} » : dériver de var(--token) au lieu d'une nouvelle charte`, 'CSS');
    }
  }
}

// ── Verdict ──────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(durs.length ? `FAIL — ${durs.length} écart(s) dur(s)\n` : 'PASS — B-T1–B-T4 sans écart\n');
if (durs.length) sortir('FAIL', 1);
sortir('PASS', 0);
