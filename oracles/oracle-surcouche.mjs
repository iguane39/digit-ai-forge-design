#!/usr/bin/env node
// oracle-surcouche — Domaine « Composant dynamique et sur-couche : habillage explicite » (déterministe).
//
// TF-0796 (lot pilot du 05/09/2026, fait du 01/09/2026). Une fenêtre `dialog` de choix
// de dossier, stylée aux jetons et VERTE à sa campagne de tests (api 483/483, suite
// 989/989), s'est affichée en boîte sombre aux boutons natifs sur le poste de
// l'utilisateur : mode sombre au niveau du système, composant rendu en top-layer,
// `color-scheme` absent du socle. Mots de l'utilisateur : « des trucs moches sortis de
// nulle part ». Aucun référentiel de la forge ne pouvait le voir — tous jugent ce que la
// PAGE dessine, aucun ne jugeait ce que le NAVIGATEUR dessine à sa place.
//
// Quatre règles, décidables sur le fichier seul :
//   SC1  chaque composant en sur-couche (<dialog>, [popover], role="dialog"/"alertdialog")
//        porte un habillage EXPLICITE de sa surface — fond, couleur de texte, et un
//        contour (bordure, contour ou ombre portée). Une facette absente = la valeur par
//        défaut du navigateur, jamais celle de la marque.
//   SC2  les contrôles portés par la sur-couche (button, input, select, textarea) portent
//        eux aussi fond ET couleur : c'est le défaut exact du 01/09 — « boutons natifs ».
//   SC3  le voile ::backdrop d'un composant modal est habillé depuis les jetons — sinon
//        c'est le voile par défaut du navigateur, qui ignore le thème de la page.
//   SC4  `color-scheme` est déclaré PAR THÈME : `light` au bloc de base, `dark` au bloc
//        sombre dès qu'un thème sombre existe. Sans lui, la page obéit à data-theme et le
//        navigateur au réglage du système : deux autorités sur un même écran.
//
// Ce que cet oracle NE juge PAS (déclaré en non_juge, jamais dupliqué) :
//   - la prescription et le contraste de l'anneau de focus → oracle-tokens T8 ;
//   - la traçabilité des couleurs employées (couleur en dur hors bloc de tokens) → T1 ;
//   - le rendu réel du composant OUVERT (top-layer, ::backdrop composé) → render_page.py,
//     matrice d'états de la critique d'implémentation ;
//   - l'ouverture effective (showModal(), popovertarget) → pan `interface` de forge-tests ;
//   - un habillage porté par une feuille externe (<link rel="stylesheet">) ou un
//     framework : lecture limitée au CSS du document et au fichier --tokens ;
//   - un composant construit sans littéral de gabarit (document.createElement en série).
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-surcouche.mjs <fichier.html> [--tokens tokens.css] [--json-only]

import fs from 'node:fs';
import { parse as parseHtml, elements, arbres, css, cssRulesDeep } from './lib/html.mjs';

const DOM = 'Composant dynamique et sur-couche : habillage explicite depuis les jetons';
const args = process.argv.slice(2);
const iTokens = args.indexOf('--tokens');
const file = args.find((a, i) => !a.startsWith('--') && !(iTokens !== -1 && i === iTokens + 1));
const tokensArg = iTokens === -1 ? null : args[iTokens + 1];
const jsonOnly = args.includes('--json-only');

const NJ = [
  'prescription et contraste de l\'anneau de focus — oracle-tokens T8, non dupliqué ici',
  'traçabilité des couleurs employées (couleur en dur hors bloc de tokens) — oracle-tokens T1',
  'rendu réel du composant OUVERT (top-layer, ::backdrop composé, ordre d\'empilement) — render_page.py, matrice d\'états de la critique d\'implémentation',
  'ouverture effective du composant (showModal(), popovertarget, piège de focus) — pan « interface » de forge-tests',
  'habillage porté par une feuille externe (<link rel="stylesheet">) ou un framework — lecture limitée au CSS du document et au fichier --tokens',
  'composant construit sans littéral de gabarit (document.createElement en série) — non lu par l\'analyse statique',
];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-surcouche', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'SC1–SC4 sans écart', where: file }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) { NJ.push('fichier absent'); sortir('SKIP', 2); }
if (!/\.html?$/i.test(file)) { NJ.push('cible non HTML'); sortir('SKIP', 2); }

const html = fs.readFileSync(file, 'utf8');
const root = parseHtml(html);
let cssText = css(html, root).replace(/\/\*[\s\S]*?\*\//g, ' ');
if (tokensArg && fs.existsSync(tokensArg)) {
  cssText = fs.readFileSync(tokensArg, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ') + '\n' + cssText;
} else if (tokensArg) {
  NJ.push(`fichier --tokens introuvable (${tokensArg}) : SC4 jugé sur le seul CSS du document`);
}
if (elements(root, 'link').some(l => /stylesheet/i.test(l.attrs.rel || ''))) {
  NJ.push('au moins un <link rel="stylesheet"> détecté : son contenu n\'est pas lu (habillage éventuellement porté par lui)');
}

const regles = cssRulesDeep(cssText).filter(r => !r.atRules.some(a => /\bprint\b/i.test(a)));

// ── Repérage des composants en sur-couche, DOM statique ET gabarits JS ─────
// Le contrat technique de la forge impose un rendu dynamique : la fenêtre du 01/09
// vivait dans un littéral de gabarit, pas dans le DOM statique. Un oracle aveugle au
// runtime rendrait PASS sur le composant même qu'il doit juger.
const ARBRES = arbres(html, root);
const classesDe = el => String((el.attrs && el.attrs.class) || '').split(/\s+/).filter(Boolean);
const roleDe = el => String((el.attrs && el.attrs.role) || '').toLowerCase();
const aAttribut = (el, n) => Object.prototype.hasOwnProperty.call(el.attrs || {}, n);

function estSurcouche(el) {
  if (el.tag.startsWith('#')) return false;
  if (el.tag === 'dialog') return true;
  if (aAttribut(el, 'popover')) return true;
  return roleDe(el) === 'dialog' || roleDe(el) === 'alertdialog';
}
function estNatif(el) {
  return el.tag === 'dialog' || aAttribut(el, 'popover');
}
function estModal(el) {
  return estNatif(el) || String((el.attrs && el.attrs['aria-modal']) || '') === 'true';
}

const composants = [];
for (const [i, a] of ARBRES.entries()) {
  const provenance = i === 0 ? 'DOM statique' : 'gabarit JS';
  for (const el of elements(a)) {
    if (!estSurcouche(el)) continue;
    const id = el.attrs.id ? `#${el.attrs.id}` : '';
    const cls = classesDe(el).length ? `.${classesDe(el)[0]}` : '';
    const nom = `${el.tag}${id}${cls}` + (aAttribut(el, 'popover') ? '[popover]' : '');
    composants.push({ el, nom, provenance, natif: estNatif(el), modal: estModal(el) });
  }
}

if (composants.length === 0) {
  NJ.push('aucun composant en sur-couche dans ce document (ni <dialog>, ni [popover], ni role="dialog"/"alertdialog") : SC1–SC3 sans objet');
  sortir('SKIP', 2);
}

// ── Appariement élément → règles CSS ───────────────────────────────────────
// Par jetons de sélecteur : le nom de balise, l'id, chaque classe, l'attribut popover
// et le rôle ARIA. Une règle compte pour l'élément dès qu'un de ses morceaux (séparés
// par la virgule) porte un de ces jetons. Approximation assumée et déclarée : elle ne
// résout pas la spécificité, elle établit qu'un habillage a été ÉCRIT pour ce composant.
const echap = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FIN = '([\\s.:>+~,)\\[]|$)';
function jetonsDe(el) {
  const j = [new RegExp(`(^|[\\s>+~,(])${echap(el.tag)}${FIN}`, 'i')];
  if (el.attrs.id) j.push(new RegExp(`#${echap(el.attrs.id)}${FIN}`));
  for (const c of classesDe(el)) j.push(new RegExp(`\\.${echap(c)}${FIN}`));
  if (aAttribut(el, 'popover')) j.push(/\[popover/i);
  if (roleDe(el)) j.push(new RegExp(`\\[role[~|^$*]?=["']?${echap(roleDe(el))}`, 'i'));
  return j;
}
const ETAT = /:(hover|active|disabled|checked|visited|focus)/i;
function declarationsPour(el, { pseudo = false } = {}) {
  const jetons = jetonsDe(el);
  const decls = new Map();
  for (const r of regles) {
    for (const part of r.selector.split(',')) {
      const s = part.trim();
      if (!s) continue;
      if (!pseudo && (s.includes('::') || ETAT.test(s))) continue;
      if (pseudo && !s.includes('::backdrop')) continue;
      if (!jetons.some(j => j.test(s))) continue;
      for (const m of r.body.matchAll(/(^|[;{\s])([-\w]+)\s*:\s*([^;]+)/g)) {
        decls.set(m[2].toLowerCase(), m[3].trim());
      }
      break;
    }
  }
  const enLigne = String((el.attrs && el.attrs.style) || '');
  for (const m of enLigne.matchAll(/(^|[;\s])([-\w]+)\s*:\s*([^;]+)/g)) decls.set(m[2].toLowerCase(), m[3].trim());
  return decls;
}

const NUL = /^(none|transparent|initial|unset|revert|0|0px)\b/i;
const CONTOUR = ['border', 'border-color', 'border-width', 'border-style', 'border-top',
  'border-block-start', 'outline', 'box-shadow'];
// Deux questions distinctes, deux mesures. « Posé et opaque » pour la SURFACE d'une
// sur-couche : un fond transparent laisse voir la page à travers la fenêtre. « Déclaré »
// pour un CONTRÔLE : un `background: transparent` explicite est une DÉCISION (un bouton
// fantôme), pas un oubli — sa légitimité comme point d'entrée relève du registre des
// déclencheurs (oracle-declencheurs), pas d'ici.
const pose = (d, props) => props.some(p => d.get(p) !== undefined && !NUL.test(d.get(p)));
const declare = (d, props) => props.some(p => d.get(p) !== undefined);
const aFond = d => pose(d, ['background', 'background-color']);
const aTexte = d => pose(d, ['color']);
const aContour = d => pose(d, CONTOUR);

// ── SC1 · la surface du composant est habillée ─────────────────────────────
// Le degré d'exigence suit le RENDU PAR DÉFAUT, il n'est pas un goût : la feuille de
// style du navigateur pose sur un <dialog> ou un [popover] `background-color: canvas`,
// `color: canvastext` et une bordure — trois valeurs qui gagnent sur l'héritage et qui
// suivent le schéma de l'OS. Un conteneur `role="dialog"`, lui, hérite normalement de
// la couleur de texte de la page : la lui réclamer serait un contrôle qui ment.
for (const c of composants) {
  const d = declarationsPour(c.el);
  const manques = [];
  if (!aFond(d)) manques.push('fond');
  if (c.natif && !aTexte(d)) manques.push('couleur de texte');
  if (!aContour(d)) manques.push('contour (bordure, outline ou ombre)');
  if (!manques.length) continue;
  add('bloquant', 'SC1',
    `composant en sur-couche « ${c.nom} » (${c.provenance}) rendu NU : ${manques.join(', ')} — ` +
    'aucune règle du document ne le pose, donc c\'est le rendu par défaut du navigateur qui s\'affiche, ' +
    'pas l\'habillage de la marque (TF-0796)',
    c.provenance);
}

// ── SC2 · les contrôles de la sur-couche sont habillés ─────────────────────
const CONTROLES = new Set(['button', 'input', 'select', 'textarea']);
for (const c of composants) {
  const vus = new Set();
  for (const el of elements(c.el)) {
    if (!CONTROLES.has(el.tag)) continue;
    if (el.tag === 'input' && /^(hidden)$/i.test(String(el.attrs.type || ''))) continue;
    const signature = `${el.tag}${el.attrs.type ? `[type=${el.attrs.type}]` : ''}` +
      (classesDe(el).length ? `.${classesDe(el)[0]}` : '');
    if (vus.has(signature)) continue;
    vus.add(signature);
    const d = declarationsPour(el);
    const manques = [];
    if (!declare(d, ['background', 'background-color', 'appearance', '-webkit-appearance'])) manques.push('fond ou appearance');
    if (!declare(d, ['color'])) manques.push('couleur de texte');
    if (manques.length < 2) continue; // une facette déclarée = le contrôle a été pris en main
    add('bloquant', 'SC2',
      `contrôle « ${signature} » de la sur-couche « ${c.nom} » rendu NATIF : ${manques.join(', ')} — ` +
      'un bouton non habillé prend l\'apparence du système d\'exploitation, pas celle de la page ' +
      '(le défaut constaté le 01/09 : « boutons natifs »)',
      `${c.provenance} · ${c.nom}`);
  }
}

// ── SC3 · le voile ::backdrop d'un composant modal est habillé ─────────────
// Le pseudo-élément ::backdrop n'existe QUE pour le top-layer (dialog modal, popover) :
// un conteneur role="dialog" peint son voile avec un élément à lui, que cette règle ne
// saurait pas reconnaître. La réclamer là serait un refus au nom d'une convention.
for (const c of composants) {
  if (!c.natif || !c.modal) continue;
  const d = declarationsPour(c.el, { pseudo: true });
  if (aFond(d)) continue;
  add('majeur', 'SC3',
    `composant modal « ${c.nom} » sans voile habillé : aucune règle ::backdrop ne pose de fond — ` +
    'le voile par défaut du navigateur ignore le thème de la page et ne suit aucun jeton',
    `${c.provenance} · ${c.nom}`);
}

// ── SC4 · color-scheme déclaré par thème ───────────────────────────────────
// La règle vaut pour la page qui rend un composant en sur-couche : c'est là que le
// navigateur peint pour son propre compte. Le socle de jetons la porte à la source
// (scripts/generer-tokens-css.mjs, vérifié par oracle-dtcg D3) ; ici on vérifie qu'elle
// est bien ARRIVÉE jusqu'à la page — par son CSS ou par le fichier --tokens.
{
  const estSombre = r => r.atRules.some(a => /prefers-color-scheme\s*:\s*dark/i.test(a)) || /dark/i.test(r.selector);
  const schemas = [];
  for (const r of regles) {
    for (const m of r.body.matchAll(/(^|[;{\s])color-scheme\s*:\s*([^;]+)/gi)) {
      schemas.push({ sombre: estSombre(r), valeur: m[2].trim().toLowerCase(), selecteur: r.selector.trim().slice(0, 60) });
    }
  }
  const aThemeSombre = regles.some(r => estSombre(r) && /--[\w-]+\s*:/.test(r.body));
  const clairDeclare = schemas.some(s => !s.sombre && /\blight\b/.test(s.valeur));
  const sombreDeclare = schemas.some(s => s.sombre && /\bdark\b/.test(s.valeur));
  const meta = elements(root, 'meta').find(m => /^color-scheme$/i.test(String(m.attrs.name || '')));

  if (!clairDeclare) {
    add('bloquant', 'SC4',
      'aucune déclaration CSS « color-scheme » pour le thème de base : les composants que le ' +
      'navigateur peint lui-même (top-layer, contrôles natifs, barres de défilement, ::backdrop) ' +
      'suivent le réglage du système d\'exploitation, pas le thème de la page' +
      (meta ? ` — la balise <meta name="color-scheme" content="${String(meta.attrs.content || '').slice(0, 20)}"> annonce ce que la page SUPPORTE, elle ne suit pas la bascule` : '') +
      '. Poser « color-scheme: light » au bloc :root (TF-0796)',
      'bloc de tokens');
  }
  if (aThemeSombre && !sombreDeclare) {
    add('bloquant', 'SC4',
      'un thème sombre est déclaré (bloc [data-theme="dark"] ou @media prefers-color-scheme: dark) ' +
      'mais aucun « color-scheme: dark » ne l\'accompagne : la page bascule, les composants natifs ' +
      'restent clairs — le rendu bâtard du 01/09, dans l\'autre sens',
      'bloc de thème sombre');
  }
  if (!aThemeSombre) {
    NJ.push('SC4 : aucun bloc de thème sombre dans ce document — seul le schéma de base a été exigé (clair strict)');
  }
}

// ── Verdict ────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) {
  process.stderr.write(durs.length
    ? `FAIL — ${durs.length} écart(s) dur(s) sur ${composants.length} composant(s) en sur-couche\n`
    : `PASS — ${composants.length} composant(s) en sur-couche, SC1–SC4 sans écart\n`);
}
if (durs.length) sortir('FAIL', 1);
sortir('PASS', 0);
