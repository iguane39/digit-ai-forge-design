#!/usr/bin/env node
// oracle-declencheurs — Domaine « Déclencheurs : nature du point d'entrée d'une fonctionnalité ».
//
// TF-0797 (lot pilot du 05/09/2026, faits des 31/08 et 01/09/2026). Le point d'entrée
// UNIQUE d'une fenêtre d'arborescence était un bouton fantôme — sans fond ni bordure,
// lisible comme un lien ou comme du texte. Premier retour de l'utilisateur, sur la
// fonctionnalité livrée : « je ne vois pas de changement ». Second, le lendemain :
// « mets-le sous forme de bouton, pas de lien — le lien a une signification particulière,
// tout comme le bouton a la sienne ». Deux tours de retour pour un bouton, parce que la
// grille de design ne portait aucun registre des déclencheurs : rien ne mesurait qu'une
// fonctionnalité a au moins un point d'entrée qui A L'AIR de ce qu'il fait.
//
// Le registre, en trois lignes : une ACTION se déclenche par un bouton qui a l'air d'un
// bouton · une NAVIGATION se fait par un lien · la variante FANTÔME est une action
// secondaire, jamais l'unique accès à une fonctionnalité.
//
// Trois règles, décidables sur le fichier seul :
//   DE1  une action portée par un lien : <a> SANS destination réelle (href absent, « # »
//        seul, « javascript: ») — qu'il porte un data-action, un onclick, ou rien
//   DE2  une navigation portée par un bouton : <button> qui pose location/window.open,
//        ou qui porte un href
//   DE3  une fonctionnalité (data-fonctionnalite="<nom>") dont TOUS les points d'entrée
//        sont fantômes ou du texte nu : unique accès fantôme
//
// Le contrôle produit AUSSI le registre lui-même — la liste des points d'entrée de la
// page avec la nature de chacun, dans le champ `registre` du JSON. C'est le critère
// mesurable que la grille cite en maquette (ameliore-le-design) comme à l'implémentation
// (critique-le-design, mode aval) : une nature se lit, elle ne se discute pas.
//
// Ce que cet oracle NE juge PAS (déclaré en non_juge, jamais dupliqué) :
//   - qu'un déclencheur ait une cible nommée (href réel, data-action, type=submit) et
//     qu'un même libellé pointe la même cible → check_maquette C15 ;
//   - le câblage effectif du déclencheur → pan « interface » de forge-tests ;
//   - la taille rendue de la cible de geste → oracle-saisie SA5 et render_page.py ;
//   - la NAVIGATION portée par un routeur applicatif (un data-action interprété par un
//     aiguillage JS) : indécidable statiquement, déclarée plutôt que devinée ;
//   - la justesse du découpage en fonctionnalités : c'est la conception, pas un attribut.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[],registre[]} · exit 0/1/2.
// Usage : node oracle-declencheurs.mjs <fichier.html> [--tokens tokens.css] [--json-only]

import fs from 'node:fs';
import { parse as parseHtml, elements, arbres, css, cssRulesDeep, visibleText } from './lib/html.mjs';

const DOM = 'Déclencheurs : nature du point d\'entrée d\'une fonctionnalité';
const args = process.argv.slice(2);
const iTokens = args.indexOf('--tokens');
const file = args.find((a, i) => !a.startsWith('--') && !(iTokens !== -1 && i === iTokens + 1));
const tokensArg = iTokens === -1 ? null : args[iTokens + 1];
const jsonOnly = args.includes('--json-only');

const NJ = [
  'cible nommée du déclencheur (href réel, data-action, type=submit) et unicité libellé → cible — check_maquette C15, non dupliqué ici',
  'câblage effectif du déclencheur (le clic fait-il quelque chose) — pan « interface » de forge-tests',
  'taille rendue de la cible de geste — oracle-saisie SA5 pour le câblage, render_page.py pour la géométrie',
  'navigation portée par un routeur applicatif (data-action interprété par un aiguillage JS) — indécidable statiquement : DE2 ne juge que la navigation ÉCRITE sur le bouton',
  'justesse du découpage en fonctionnalités et pertinence des libellés — jugement de conception',
];
const F = [];
const REGISTRE = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-declencheurs', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'DE1–DE3 sans écart', where: file }],
    non_juge: NJ, registre: REGISTRE,
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
}
const regles = cssRulesDeep(cssText).filter(r => !r.atRules.some(a => /\bprint\b/i.test(a)));

// ── Appariement élément → règles CSS (mêmes jetons que oracle-surcouche) ───
const echap = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FIN = '([\\s.:>+~,)\\[]|$)';
const ETAT = /:(hover|active|disabled|checked|visited|focus)/i;
const classesDe = el => String((el.attrs && el.attrs.class) || '').split(/\s+/).filter(Boolean);

function declarationsPour(el) {
  const jetons = [new RegExp(`(^|[\\s>+~,(])${echap(el.tag)}${FIN}`, 'i')];
  if (el.attrs.id) jetons.push(new RegExp(`#${echap(el.attrs.id)}${FIN}`));
  for (const c of classesDe(el)) jetons.push(new RegExp(`\\.${echap(c)}${FIN}`));
  const decls = new Map();
  for (const r of regles) {
    for (const part of r.selector.split(',')) {
      const s = part.trim();
      if (!s || s.includes('::') || ETAT.test(s)) continue;
      if (!jetons.some(j => j.test(s))) continue;
      for (const m of r.body.matchAll(/(^|[;{\s])([-\w]+)\s*:\s*([^;]+)/g)) decls.set(m[2].toLowerCase(), m[3].trim());
      break;
    }
  }
  for (const m of String((el.attrs && el.attrs.style) || '').matchAll(/(^|[;\s])([-\w]+)\s*:\s*([^;]+)/g)) {
    decls.set(m[2].toLowerCase(), m[3].trim());
  }
  return decls;
}

// ── Ce qui est un déclencheur, et de quelle nature ─────────────────────────
const NUL = /^(none|transparent|initial|unset|revert|0|0px)\b/i;
const aFondVisible = d => {
  const v = d.get('background') ?? d.get('background-color');
  return v !== undefined && !NUL.test(v);
};
const aFondDeclare = d => (d.get('background') ?? d.get('background-color')) !== undefined;
const aBordVisible = d => ['border', 'border-color', 'border-width', 'border-style', 'box-shadow', 'outline']
  .some(p => d.get(p) !== undefined && !NUL.test(d.get(p)));

const hrefReel = el => {
  const h = el.attrs.href;
  if (h === undefined) return false;
  const v = String(h).trim();
  return v !== '' && v !== '#' && !/^javascript:/i.test(v);
};
const porteUneAction = el =>
  Object.prototype.hasOwnProperty.call(el.attrs || {}, 'data-action') ||
  Object.prototype.hasOwnProperty.call(el.attrs || {}, 'onclick');

const estDeclencheur = el => {
  if (el.tag.startsWith('#')) return false;
  if (el.tag === 'button' || el.tag === 'a' || el.tag === 'summary') return true;
  if (String(el.attrs.role || '').toLowerCase() === 'button' || String(el.attrs.role || '').toLowerCase() === 'link') return true;
  return porteUneAction(el);
};

/**
 * Nature d'un déclencheur, telle qu'un utilisateur la LIT :
 *   lien           — un <a> qui mène quelque part ;
 *   lien-degrade   — un <a> sans destination réelle : à l'écran, du texte souligné —
 *                    jamais un bouton, quoi qu'il déclenche ;
 *   bouton-plein   — un bouton dont le fond est posé et visible ;
 *   bouton-natif   — un bouton dont rien n'est déclaré : le navigateur lui donne son
 *                    apparence de bouton, ce qui reste lisible comme un bouton (son
 *                    habillage relève d'oracle-surcouche SC2, pas de cette règle) ;
 *   bouton-fantome — un bouton dont le fond est EXPLICITEMENT transparent et qui n'a
 *                    pas de bordure visible : à l'écran, du texte ;
 *   texte          — ni bouton ni lien : un conteneur rendu cliquable par un attribut.
 */
function natureDe(el) {
  const role = String(el.attrs.role || '').toLowerCase();
  if (el.tag === 'a' || role === 'link') {
    // Un href REEL est la destination annoncée, et c'est elle que l'utilisateur lit. Un
    // data-action posé EN PLUS est le câblage de la maquette (convention « un CTA = une
    // cible », patterns-interaction), pas une action déguisée : condamner ce cas ferait
    // refuser à cet oracle la convention de sa propre forge.
    return hrefReel(el) ? 'lien' : 'lien-degrade';
  }
  const estBouton = el.tag === 'button' || el.tag === 'summary' || role === 'button';
  if (!estBouton) return 'texte';
  const d = declarationsPour(el);
  if (aFondVisible(d)) return 'bouton-plein';
  if (!aFondDeclare(d) && el.tag === 'button') return 'bouton-natif';
  if (aBordVisible(d)) return 'bouton-plein';
  return 'bouton-fantome';
}

const libelleDe = el => (visibleText(el).map(t => t.text).join(' ').replace(/\s+/g, ' ').trim() ||
  String(el.attrs['aria-label'] || '')).slice(0, 40);

const declencheurs = [];
for (const [i, a] of arbres(html, root).entries()) {
  const provenance = i === 0 ? 'DOM statique' : 'gabarit JS';
  for (const el of elements(a)) {
    if (!estDeclencheur(el)) continue;
    const nature = natureDe(el);
    const fonctionnalite = el.attrs['data-fonctionnalite'] || null;
    declencheurs.push({ el, nature, provenance, fonctionnalite, libelle: libelleDe(el) });
    REGISTRE.push({
      libelle: libelleDe(el) || '(sans libellé)',
      balise: el.tag,
      nature,
      fonctionnalite,
      cible: el.attrs['data-action'] ? `data-action=${el.attrs['data-action']}` : (el.attrs.href ? `href=${el.attrs.href}` : null),
      provenance,
    });
  }
}

if (declencheurs.length === 0) {
  NJ.push('aucun déclencheur dans ce document (ni bouton, ni lien, ni élément porteur de data-action/onclick) : DE1–DE3 sans objet');
  sortir('SKIP', 2);
}

// ── DE1 · une action portée par un lien ────────────────────────────────────
// « Le lien a une signification particulière, tout comme le bouton a la sienne » —
// l'utilisateur, 01/09/2026. Un lien annonce un déplacement ; l'employer pour agir
// trompe sur ce qui va se passer, et prive du contrat clavier du bouton (Espace).
for (const d of declencheurs) {
  if (d.el.tag !== 'a') continue;
  if (hrefReel(d.el)) continue; // il navigue vers une destination écrite : c'est un lien
  if (porteUneAction(d.el)) {
    add('bloquant', 'DE1',
      `« ${d.libelle || '(sans libellé)'} » est un lien qui déclenche une action ` +
      `(${d.el.attrs['data-action'] ? `data-action="${d.el.attrs['data-action']}"` : 'onclick'}) : ` +
      'une action se déclenche par un bouton, un lien navigue — registre des déclencheurs (TF-0797)',
      d.provenance);
  } else if (!hrefReel(d.el)) {
    add('bloquant', 'DE1',
      `« ${d.libelle || '(sans libellé)'} » est un lien sans destination réelle ` +
      `(href ${d.el.attrs.href === undefined ? 'absent' : `« ${String(d.el.attrs.href).slice(0, 20)} »`}) : ` +
      'si ce déclencheur agit, c\'est un bouton ; s\'il navigue, sa destination doit exister',
      d.provenance);
  }
}

// ── DE2 · une navigation portée par un bouton ──────────────────────────────
const NAVIGUE = /(location\s*\.\s*(href|assign|replace)|window\s*\.\s*open\s*\()/i;
for (const d of declencheurs) {
  if (d.el.tag !== 'button') continue;
  const onclick = String(d.el.attrs.onclick || '');
  const aHref = Object.prototype.hasOwnProperty.call(d.el.attrs || {}, 'href');
  if (!NAVIGUE.test(onclick) && !aHref) continue;
  add('majeur', 'DE2',
    `« ${d.libelle || '(sans libellé)'} » est un bouton qui navigue ` +
    `(${aHref ? `href="${String(d.el.attrs.href).slice(0, 30)}"` : onclick.trim().slice(0, 40)}) : ` +
    'une navigation se fait par un lien — ouvrable dans un onglet, copiable, annonçable par ' +
    'les technologies d\'assistance, ce qu\'un bouton ne sera jamais',
    d.provenance);
}

// ── DE3 · unique accès fantôme ─────────────────────────────────────────────
// « Fantôme = action secondaire seulement, jamais l'unique accès. » La règle ne condamne
// pas le bouton fantôme : elle refuse qu'il soit SEUL. Elle ne se prononce que sur les
// fonctionnalités DÉCLARÉES par data-fonctionnalite — inventer un regroupement à partir
// des libellés serait deviner, et un contrôle qui devine ment.
const MOU = new Set(['bouton-fantome', 'texte', 'lien-degrade']);
const parFonctionnalite = new Map();
for (const d of declencheurs) {
  if (!d.fonctionnalite) continue;
  if (!parFonctionnalite.has(d.fonctionnalite)) parFonctionnalite.set(d.fonctionnalite, []);
  parFonctionnalite.get(d.fonctionnalite).push(d);
}
for (const [nom, liste] of parFonctionnalite) {
  if (liste.some(d => !MOU.has(d.nature))) continue;
  const natures = [...new Set(liste.map(d => d.nature))].join(', ');
  const fantome = liste.some(d => d.nature === 'bouton-fantome');
  add('bloquant', 'DE3',
    `fonctionnalité ${nom} : ${fantome ? 'unique accès fantôme' : 'unique accès sans forme de bouton'} — ` +
    `ses ${liste.length} point(s) d'entrée sont ` +
    `de nature ${natures}, aucun n'a l'air de ce qu'il fait. Un fantôme est une action ` +
    'SECONDAIRE ; l\'accès principal est un bouton plein ou secondaire (TF-0797)',
    liste[0].provenance);
}
if (parFonctionnalite.size === 0) {
  NJ.push('DE3 : aucun point d\'entrée déclaré par data-fonctionnalite="<nom>" — la couverture des fonctionnalités n\'a PAS été jugée ; le registre ci-dessus liste les déclencheurs trouvés et leur nature, à confronter à la main');
}

// ── Le registre, toujours rendu ────────────────────────────────────────────
{
  const compte = {};
  for (const d of declencheurs) compte[d.nature] = (compte[d.nature] || 0) + 1;
  add('info', 'DE0',
    `registre des déclencheurs : ${declencheurs.length} point(s) d'entrée — ` +
    Object.entries(compte).map(([n, c]) => `${c} ${n}`).join(', ') +
    (parFonctionnalite.size ? ` · ${parFonctionnalite.size} fonctionnalité(s) déclarée(s)` : ' · aucune fonctionnalité déclarée'),
    'document');
}

// ── Verdict ────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) {
  process.stderr.write(durs.length
    ? `FAIL — ${durs.length} écart(s) dur(s) sur ${declencheurs.length} déclencheur(s)\n`
    : `PASS — ${declencheurs.length} déclencheur(s), DE1–DE3 sans écart\n`);
}
if (durs.length) sortir('FAIL', 1);
sortir('PASS', 0);
