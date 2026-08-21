#!/usr/bin/env node
// oracle-slop — Domaine « Design généré : marqueurs de slop » (déterministe).
// Dix règles S1–S10 dérivées des bans absolus d'impeccable et de la doctrine
// frontend-design. Aucune ne demande de jugement : chacune matche un motif CSS,
// HTML ou colorimétrique localisable.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-slop.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import { parse, arbres, elements, visibleText, css, cssRules, lineOf } from './lib/html.mjs';
import { parse as color, hsl, findColors } from './lib/color.mjs';

const DOM = 'Design généré : marqueurs de slop';
const NON_JUGE = [
  'généricité de la direction artistique (crème+serif+terracotta, noir+accent acide, broadsheet à filets) — indices seulement, jugement humain',
  'qualité du contenu rédactionnel et pertinence des choix pour le brief',
  'rendu réel : débordements, chevauchements, contraste mesuré — déléguer à render_page.py',
];

// Les 22 familles réflexes listées par impeccable <reflex_fonts_to_reject>.
const POLICES_REFLEXES = ['fraunces', 'newsreader', 'lora', 'crimson', 'crimson pro', 'crimson text',
  'playfair display', 'cormorant', 'cormorant garamond', 'syne', 'ibm plex mono', 'ibm plex sans',
  'ibm plex serif', 'space mono', 'space grotesk', 'inter', 'dm sans', 'dm serif display',
  'dm serif text', 'outfit', 'plus jakarta sans', 'instrument sans', 'instrument serif'];

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');

function sortir(verdict, findings, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-slop', domaine: DOM, artefact: file || null,
    verdict, findings, non_juge: NON_JUGE,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) sortir('SKIP', [{ sev: 'info', msg: 'fichier introuvable', where: String(file) }], 2);

let html;
try { html = fs.readFileSync(file, 'utf8'); }
catch (e) { sortir('SKIP', [{ sev: 'info', msg: 'lecture impossible : ' + e.message, where: file }], 2); }

const root = parse(html);
// Les commentaires CSS ne sont pas du design : les retirer évite de matcher un
// motif cité en commentaire et de polluer la localisation des sélecteurs.
const cssText = css(html, root).replace(/\/\*[\s\S]*?\*\//g, ' ');
const regles = cssRules(cssText);
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });
const L = i => 'ligne ' + lineOf(html, i);

// Le contrat de la forge impose un rendu dynamique : sans les fragments portés
// par les gabarits JS, S6, S7 et S10 ne verraient aucun écran et se tairaient.
const ARBRES = arbres(html, root).map((r, i) => ({ r, statique: i === 0, n: i, boucle: !!r.boucle }));
const ou = (a, el) => a.statique ? L(el.start) : `fragment de gabarit JS n°${a.n}`;
const tous = tag => ARBRES.flatMap(a => elements(a.r, tag).map(el => ({ a, el })));

// ── S1 · Bandeau latéral coloré ────────────────────────────────────────────
// border-left / border-right d'une largeur > 1px : le « design touch » le plus
// recyclé des UI d'admin. Interdit quelle que soit la couleur ou la variable.
{
  const re = /border-(left|right)(?:-width)?\s*:\s*([^;{}]+)/gi;
  let m;
  while ((m = re.exec(cssText))) {
    const val = m[2].trim();
    if (/^(none|0|0px|initial|inherit|unset)\b/.test(val)) continue;
    const lm = /(-?[\d.]+)\s*(px|rem|em)/.exec(val);
    const epais = lm ? (lm[2] === 'px' ? parseFloat(lm[1]) : parseFloat(lm[1]) * 16) : (/\bthick\b/.test(val) ? 5 : null);
    if (epais !== null && epais > 1) {
      add('bloquant', 'S1', `bandeau latéral de ${lm ? lm[1] + lm[2] : 'thick'} : border-${m[1]} > 1px sur un bloc`,
        `css « ${m[0].trim().slice(0, 70)} »`);
    }
  }
}

// ── S2 · Texte en dégradé ──────────────────────────────────────────────────
// background-clip: text combiné à un gradient. Ban absolu d'impeccable.
{
  const clipRe = /(?:-webkit-)?background-clip\s*:\s*text/i;
  for (const r of regles) {
    if (!clipRe.test(r.body)) continue;
    const memeSelecteur = regles.filter(x => x.selector === r.selector).map(x => x.body).join(' ');
    if (/-gradient\s*\(/i.test(r.body) || /-gradient\s*\(/i.test(memeSelecteur)) {
      add('bloquant', 'S2', 'texte rempli par un dégradé (background-clip: text + gradient)',
        `sélecteur « ${r.selector.slice(0, 60)} »`);
    }
  }
}

// ── S3 · Polices réflexes ──────────────────────────────────────────────────
{
  const vus = new Set();
  const scan = (texte, ou) => {
    const re = /font-family\s*:\s*([^;{}]+)/gi;
    let m;
    while ((m = re.exec(texte))) {
      for (const fam of m[1].split(',')) {
        const n = fam.trim().replace(/^["']|["']$/g, '').toLowerCase();
        if (POLICES_REFLEXES.includes(n) && !vus.has(n)) {
          vus.add(n);
          add('majeur', 'S3', `police réflexe « ${fam.trim()} » — famille bannie par impeccable, monoculture inter-projets`, ou);
        }
      }
    }
  };
  scan(cssText, 'feuille de style');
  for (const l of elements(root, 'link')) {
    const href = l.attrs.href || '';
    if (!/fonts\.(googleapis|gstatic)/i.test(href)) continue;
    for (const n of POLICES_REFLEXES) {
      const slug = n.replace(/\s+/g, '\\+'); // « + » est le séparateur de Google Fonts, pas un quantificateur
      if (new RegExp('family=' + slug + '(?![a-z])', 'i').test(href) && !vus.has(n)) {
        vus.add(n);
        add('majeur', 'S3', `police réflexe « ${n} » importée depuis Google Fonts`, L(l.start));
      }
    }
  }
}

// ── S4 · Noir et blanc purs ────────────────────────────────────────────────
// « pure black/white never appears in nature » — toujours teinter.
{
  const vus = new Set();
  // TF-0426 (lot Client-B 20260820a, 21/08) : la charte Digit-AI PRESCRIT `--surface: #FFFFFF`.
  // S4 le signalait à chaque page conforme — un échec permanent n'est plus lu (« écart
  // documenté, charte prime », deux fois le même jour). Liste FERMÉE d'exemption : les valeurs
  // pures déclarées comme TOKENS (`--x: …`) dans :root / html / [data-theme] — ce que la charte
  // impose, pas ce qu'un composant pose à la main. `color: #000` dans `.x` reste un majeur.
  const exemptes = new Set();
  for (const r of regles) {
    if (!/(^|,)\s*(:root|html|\[data-theme[^\]]*\])\s*(,|$)/i.test(r.selector)) continue;
    for (const m of r.body.matchAll(/--[\w-]+\s*:\s*([^;]+)/g)) for (const c of findColors(m[1])) exemptes.add(c.raw.toLowerCase());
  }
  for (const c of findColors(cssText)) {
    if (c.a < 1) continue; // ombres et voiles : hors règle
    const pur = (c.r === 0 && c.g === 0 && c.b === 0) || (c.r === 255 && c.g === 255 && c.b === 255);
    if (pur && exemptes.has(c.raw.toLowerCase())) { vus.add(c.raw); continue; } // valeur de token de charte
    if (pur && !vus.has(c.raw)) {
      vus.add(c.raw);
      add('majeur', 'S4', `couleur pure « ${c.raw} » : teinter vers la hue de marque`, 'feuille de style');
    }
  }
  const kw = /:\s*(black|white)\s*[;}]/gi;
  let m;
  while ((m = kw.exec(cssText))) {
    if (vus.has(m[1])) continue;
    vus.add(m[1]);
    add('majeur', 'S4', `mot-clé « ${m[1]} » : couleur pure non teintée`, 'feuille de style');
  }
}

// ── S5 · Palette IA ────────────────────────────────────────────────────────
// (a) dégradé violet→bleu, (b) accent néon sur fond sombre.
{
  const gradRe = /(linear|radial|conic)-gradient\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/gi;
  let m;
  while ((m = gradRe.exec(cssText))) {
    const stops = findColors(m[2]).filter(c => c.a > 0.5).map(c => ({ raw: c.raw, ...hsl(c) }));
    const violet = stops.find(s => s.h >= 255 && s.h <= 295 && s.s > 0.3);
    const bleu = stops.find(s => s.h >= 195 && s.h < 255 && s.s > 0.3);
    if (violet && bleu) {
      add('majeur', 'S5', `dégradé violet→bleu (${violet.raw} → ${bleu.raw}) : signature visuelle IA la plus reconnaissable`,
        `css « ${m[0].slice(0, 60)}… »`);
    }
  }

  const fonds = [];
  const fondRe = /background(?:-color)?\s*:\s*([^;{}]+)/gi;
  while ((m = fondRe.exec(cssText))) {
    for (const c of findColors(m[1])) if (c.a === 1) fonds.push(hsl(c));
  }
  const sombre = fonds.some(f => f.l < 0.2);
  if (sombre) {
    const vus = new Set();
    for (const c of findColors(cssText)) {
      if (c.a < 1) continue;
      const h = hsl(c);
      if (h.s >= 0.9 && h.l >= 0.5 && !vus.has(c.raw)) {
        vus.add(c.raw);
        add('majeur', 'S5', `accent néon « ${c.raw} » (saturation ${Math.round(h.s * 100)}%) sur fond sombre : défaut, pas choix`,
          'feuille de style');
      }
    }
  }
}

// ── S6 · Emojis en production ──────────────────────────────────────────────
{
  const emoji = /\p{Extended_Pictographic}/u;
  const vus = new Set();
  // TF-0436 (lot Client-B 20260820b, 21/08) : un oracle de forme ne juge pas un texte que le
  // livrable n'a pas ÉCRIT. Le contenu CITÉ — <pre>, <code>, <blockquote>, [data-cite] (sources
  // embarquées, extraits de correspondance) — est exclu de l'analyse « interface » : corriger
  // un « ↔ » dans une décision citée reviendrait à falsifier la citation.
  const CITES = new Set(['pre', 'code', 'blockquote']);
  const exclus = new Set();
  for (const a of ARBRES) {
    for (const el of elements(a.r)) {
      if (CITES.has(el.tag) || (el.attrs && Object.prototype.hasOwnProperty.call(el.attrs, 'data-cite')))
        for (const t of visibleText(el)) exclus.add(t);
    }
  }
  for (const a of ARBRES) {
    for (const t of visibleText(a.r)) {
      if (exclus.has(t)) continue;
      if (!emoji.test(t.text)) continue;
      for (const ch of [...t.text]) {
        if (!emoji.test(ch) || vus.has(ch)) continue;
        vus.add(ch);
        add('majeur', 'S6', `emoji « ${ch} » dans l'interface : utiliser une icône SVG dessinée`,
          a.statique ? L(t.start) : `fragment de gabarit JS n°${a.n}`);
        if (vus.size >= 8) break;
      }
      if (vus.size >= 8) break;
    }
  }
}

// ── S7 · Grille de cartes clonée ───────────────────────────────────────────
{
  const sig = new Map();
  for (const { a, el } of ARBRES.flatMap(a => elements(a.r).map(el => ({ a, el })))) {
    if (!['div', 'article', 'section', 'li', 'a'].includes(el.tag)) continue;
    const enfants = el.children.filter(c => !c.tag.startsWith('#')).map(c => c.tag);
    if (enfants.length < 2) continue;
    const cle = `${el.tag}.${(el.attrs.class || '').trim()}|${enfants.join('>')}`;
    if (!sig.has(cle)) sig.set(cle, []);
    sig.get(cle).push({ a, el });
  }
  for (const [cle, els] of sig) {
    const enfants = cle.split('|')[1].split('>');
    const titre = enfants.some(t => /^h[1-6]$/.test(t));
    const icone = enfants.some(t => ['svg', 'img', 'i'].includes(t));
    if (!titre || !icone) continue;
    // Une carte produite dans une boucle vaut N cartes à l'écran : le comptage
    // statique ne s'applique pas.
    const enBoucle = els.some(x => x.a.boucle);
    if (els.length < 3 && !enBoucle) continue;
    add('avertissement', 'S7', enBoucle
      ? `carte de structure ${enfants.join(' + ')} répétée par une boucle : grille templatée`
      : `${els.length} cartes de structure identique (${enfants.join(' + ')}) : grille templatée`,
      ou(els[0].a, els[0].el));
  }
}

// ── S8 · Easing daté ───────────────────────────────────────────────────────
{
  const kw = /\b(bounce|elastic)\b/gi;
  let m;
  const vus = new Set();
  while ((m = kw.exec(cssText))) {
    const k = m[1].toLowerCase();
    if (vus.has(k)) continue; vus.add(k);
    add('avertissement', 'S8', `easing « ${m[1]} » : les objets réels décélèrent sans rebond`, 'feuille de style');
  }
  const bez = /cubic-bezier\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/gi;
  while ((m = bez.exec(cssText))) {
    const y1 = parseFloat(m[2]), y2 = parseFloat(m[4]);
    if (y1 > 1 || y2 > 1 || y1 < 0 || y2 < 0) {
      add('avertissement', 'S8', `courbe à dépassement ${m[0]} : effet rebond déguisé`, 'feuille de style');
    }
  }
}

// ── S9 · Rayon uniforme + ombre générique ──────────────────────────────────
{
  const rayons = [];
  const re = /border-radius\s*:\s*([^;{}]+)/gi;
  let m;
  while ((m = re.exec(cssText))) {
    const v = m[1].trim();
    if (!/^0(px|rem|em|%)?$/.test(v)) rayons.push(v);
  }
  const uniques = new Set(rayons);
  const ombreFade = /box-shadow\s*:\s*[^;{}]*rgba?\(\s*0\s*,\s*0\s*,\s*0\s*[,/)]/i.test(cssText);
  if (rayons.length >= 3 && uniques.size === 1 && ombreFade) {
    add('avertissement', 'S9', `rayon unique « ${rayons[0]} » sur ${rayons.length} règles + ombre noire non teintée : rectangle arrondi générique`,
      'feuille de style');
  }
}

// ── S10 · Sparkline décoratif ──────────────────────────────────────────────
{
  for (const { a, el: svg } of tous('svg')) {
    const inner = elements(svg).filter(e => e !== svg).map(e => e.tag);
    const trace = inner.some(t => ['path', 'polyline', 'line'].includes(t));
    const parlant = inner.some(t => ['text', 'title', 'desc'].includes(t))
      || svg.attrs['aria-label'] || svg.attrs['aria-labelledby'] || svg.attrs.role === 'img';
    if (!trace || parlant) continue;
    const vb = (svg.attrs.viewbox || '').split(/[\s,]+/).map(Number);
    const w = vb.length === 4 ? vb[2] : parseFloat(svg.attrs.width || '0');
    const h = vb.length === 4 ? vb[3] : parseFloat(svg.attrs.height || '0');
    // Un sparkline est large et plat. Une icône est petite et carrée : hors règle
    // ici (son libellé relève de l'accessibilité, pas du slop).
    if (w > 0 && h > 0 && w >= 60 && w <= 220 && h <= 90 && w / h >= 2) {
      add('avertissement', 'S10', `mini-graphique ${w}×${h} sans axe, sans légende, sans libellé : décoration qui mime la sophistication`,
        ou(a, svg));
    }
  }
}

// ── Verdict ────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');

if (!jsonOnly) {
  const n = F.filter(f => f.sev === 'avertissement').length;
  process.stderr.write(dur.length
    ? `FAIL — ${dur.length} règle(s) dure(s) déclenchée(s)${n ? `, ${n} avertissement(s)` : ''}\n`
    : `PASS${n ? ` — ${n} avertissement(s)` : ' — aucun marqueur'}\n`);
}
if (dur.length) sortir('FAIL', F, 1);
sortir('PASS', F.length ? F : [{ sev: 'info', regle: '—', msg: 'aucune des règles S1–S10 déclenchée', where: file }], 0);
