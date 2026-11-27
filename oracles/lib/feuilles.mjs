// lib/feuilles.mjs — LIRE LES FEUILLES D'UNE APPLICATION, ET EN TIRER CLASSES, COULEURS ET FAMILLES DE POLICES
// (TF-2901 et TF-2910, lot Produit-82 du 27/11/2026).
//
// LE FAIT. Deux contrôles comparent une page ou une maquette à ce que l'application SERVIE dessine : oracle-composition
// (les classes de la page contre la feuille de la composition, TF-2901) et oracle-charte-application (les couleurs et les
// familles de polices d'une maquette contre celles de la charte de l'application, TF-2910). Ils lisent la même chose, une
// feuille ou une page servie avec ses feuilles liées, et la lisent ici, une fois.
//
// LA BORNE. Comme rendre-autonome.mjs (TF-2309), aucun accès réseau vers un tiers : une URL doit viser la boucle locale
// (localhost, 127.0.0.1, ::1), et les feuilles qu'une page servie lie sont lues à son origine ou à côté du fichier. Une
// référence refusée ou illisible est RENDUE dans `non_lues`, avec sa raison : une feuille qu'on n'a pas lue ne se compte
// jamais comme une feuille vide.

import fs from 'node:fs';
import path from 'node:path';
import { parse as parseHtml, css as cssDeLaPage, cssRulesDeep, arbres, elements } from './html.mjs';
import { estHoteLocal, lirePageServie } from './lire-page-servie.mjs';
import { rendreAutonome } from './rendre-autonome.mjs';
import { parse as parseCouleur, findColors, resoudreVar } from './color.mjs';

const TAILLE_MAX = 5_000_000;
const sansCommentaires = css => String(css).replace(/\/\*[\s\S]*?\*\//g, ' ');

/** Une référence d'URL ? (une lettre de lecteur Windows, « C:\… », n'en est pas une). */
export const estUrl = ref => /^https?:\/\//i.test(String(ref));

/**
 * Lit UNE référence : un fichier .css, un fichier .html (sa feuille intégrée et ses feuilles liées), ou une URL de la boucle
 * locale (une page, dont les feuilles liées sont lues à son origine ; ou une feuille).
 * @returns {Promise<{ref:string, css:string, html:string|null, non_lues:object[], erreur:string|null}>}
 */
export async function lireReference(ref, { certificatLocal = false } = {}) {
  const vide = { ref, css: '', html: null, non_lues: [], erreur: null };
  let texte; let dossier = process.cwd(); let origine = null;
  if (estUrl(ref)) {
    if (!estHoteLocal(ref)) return { ...vide, erreur: `hôte non local : aucun accès réseau vers un tiers (servir l'application en local, ou passer la feuille en fichier)` };
    try {
      const rep = await lirePageServie(ref, { certificatLocal });
      if (!rep.ok) return { ...vide, erreur: `HTTP ${rep.status}` };
      texte = await rep.text();
      origine = new URL(ref).origin;
    } catch (e) { return { ...vide, erreur: `lecture impossible (${String((e.cause && e.cause.code) || e.message || e).split('\n')[0]})` }; }
  } else {
    if (!fs.existsSync(ref) || !fs.statSync(ref).isFile()) return { ...vide, erreur: 'fichier introuvable' };
    texte = fs.readFileSync(ref, 'utf8');
    dossier = path.dirname(path.resolve(ref));
  }
  if (texte.length > TAILLE_MAX) return { ...vide, erreur: `plus de ${TAILLE_MAX} caractères` };
  // Une feuille de style n'ouvre pas sur une balise ; une page, si.
  const estPage = /^\s*(?:<!doctype|<html|<head|<body|<!--|<[a-z])/i.test(texte) && /<\/?[a-z][\s\S]*>/i.test(texte);
  if (!estPage) return { ...vide, css: sansCommentaires(texte) };
  const autonome = await rendreAutonome(texte, { dossier, origine, certificatLocal });
  const racine = parseHtml(autonome.html);
  let css = sansCommentaires(cssDeLaPage(autonome.html, racine));
  let non_lues = autonome.non_integrees.filter(x => x.type === 'style' && !/tiers/.test(x.raison));
  // rendre-autonome.mjs laisse liée une page dont toutes les ressources se résolvent sur le disque (« jugée telle quelle »). Ici la
  // feuille EST la matière du jugement : celles qui se lisent à côté du fichier sont lues, les autres restent dites non lues.
  if (!origine) {
    const lues = [];
    for (const x of non_lues) {
      const f = fichierDeFeuille(x.ref, dossier);
      if (f) { css += '\n' + sansCommentaires(fs.readFileSync(f, 'utf8')); lues.push(x); }
    }
    for (const el of elements(racine, 'link')) {
      if (!/\bstylesheet\b/i.test(el.attrs.rel || '') || !el.attrs.href || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(el.attrs.href)) continue;
      const f = fichierDeFeuille(el.attrs.href, dossier);
      if (f) css += '\n' + sansCommentaires(fs.readFileSync(f, 'utf8'));
    }
    non_lues = non_lues.filter(x => !lues.includes(x));
  }
  return { ...vide, html: autonome.html, css, non_lues };
}

/** Le fichier d'une feuille liée : relatif au dossier de la page, ou « racine du site » cherchée en remontant l'arborescence. */
function fichierDeFeuille(ref, dossier) {
  const chemin = decodeURIComponent(String(ref).split(/[?#]/)[0]);
  if (!chemin) return null;
  const candidats = chemin.startsWith('/')
    ? (() => { const l = []; for (let d = path.resolve(dossier); ; d = path.dirname(d)) { l.push(path.join(d, chemin)); if (path.dirname(d) === d) return l; } })()
    : [path.resolve(dossier, chemin)];
  return candidats.find(f => fs.existsSync(f) && fs.statSync(f).isFile()) || null;
}

// ── Les classes ────────────────────────────────────────────────────────────────────────────────────────────────

const retirerEchappement = s => s.replace(/\\(.)/g, '$1');

/** Les classes que les sélecteurs d'une feuille DESSINENT : celles d'un `:not(…)` ne sont pas dessinées, elles sont exclues. */
export function classesDessinees(cssText) {
  const out = new Set();
  for (const r of cssRulesDeep(sansCommentaires(cssText))) {
    if (r.atRules.some(a => /^@(?:-\w+-)?keyframes\b/i.test(a))) continue;
    const sel = r.selector.replace(/:not\([^)]*\)/gi, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/(["'])(?:(?!\1).)*\1/g, ' ');
    for (const m of sel.matchAll(/\.((?:[\w-]|\\.)+)/g)) out.add(retirerEchappement(m[1]));
  }
  return out;
}

/**
 * Les classes que le balisage d'une page EMPLOIE : le DOM statique et les fragments que ses scripts écrivent en gabarit
 * (lib/html.mjs `arbres`). Chaque classe porte son nombre d'éléments et la balise du premier.
 * @returns {Map<string,{n:number, balise:string}>}
 */
export function classesEmployees(html) {
  const racine = parseHtml(html);
  const out = new Map();
  for (const arbre of arbres(html, racine)) {
    for (const el of elements(arbre)) {
      for (const c of String((el.attrs && el.attrs.class) || '').split(/\s+/).filter(Boolean)) {
        if (/[${}]/.test(c)) continue; // jeton d'interpolation d'un gabarit, pas une classe
        const v = out.get(c);
        if (v) v.n++; else out.set(c, { n: 1, balise: el.tag });
      }
    }
  }
  return out;
}

/** Une classe est-elle couverte par la liste des classes libres (« a », « prefixe-* ») ? */
export function estClasseLibre(classe, libres) {
  return libres.some(l => (l.endsWith('*') ? classe.startsWith(l.slice(0, -1)) : classe === l));
}

// ── Les couleurs et les familles de polices ─────────────────────────────────────────────────────────────────────

// Les mots-clés qui ne nomment pas une famille précise : ils ne se comparent pas.
const GENERIQUES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace',
  'ui-rounded', 'emoji', 'math', 'fangsong', 'inherit', 'initial', 'unset', 'revert', 'revert-layer']);

/** Les noms de famille d'une pile `font-family`, sans guillemets, hors génériques et hors var(). Casse conservée. */
export function nomsDePile(valeur) {
  const v = String(valeur).replace(/!important/i, '');
  const morceaux = [];
  let courant = ''; let guillemet = null; let parentheses = 0;
  for (const ch of v) {
    if (guillemet) { courant += ch; if (ch === guillemet) guillemet = null; continue; }
    if (ch === '"' || ch === "'") { guillemet = ch; courant += ch; continue; }
    if (ch === '(') parentheses++;
    if (ch === ')') parentheses--;
    if (ch === ',' && parentheses === 0) { morceaux.push(courant); courant = ''; continue; }
    courant += ch;
  }
  morceaux.push(courant);
  return morceaux.map(s => s.trim().replace(/^(["'])(.*)\1$/, '$2').trim())
    .filter(s => s && !/^var\(/i.test(s) && !GENERIQUES.has(s.toLowerCase()));
}

const clePile = nom => nom.toLowerCase().replace(/\s+/g, ' ');

/** Une propriété personnalisée porte-t-elle une pile de polices ? Par son nom, ou par la forme de sa valeur. */
function ressembleAUnePile(nom, valeur) {
  if (/font|police|typo|famille|family/i.test(nom) && !/size|taille|weight|poids|height|hauteur|style|variant|stretch|spacing|feature/i.test(nom)) return true;
  return /^(?:(?:"[^"]+"|'[^']+'|[\w -]+),\s*)+(?:serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace|cursive|fantasy)\s*$/i.test(valeur.trim());
}

/**
 * Les jetons d'une feuille (ou d'une page) : propriétés personnalisées de couleur et de police, et littéraux de couleur
 * et de famille posés par les règles. `litteralement` = la valeur est écrite dans la feuille, pas un alias.
 * @returns {{couleurs: Array<{jeton:string|null, valeur:string, rgba:object, origine:string}>,
 *            familles: Array<{jeton:string|null, nom:string, premier:boolean, origine:string}>,
 *            non_resolus: string[]}}
 */
export function jetonsDe(cssText) {
  const css = sansCommentaires(cssText);
  const regles = cssRulesDeep(css);
  // La table des propriétés personnalisées (dernière déclaration), pour résoudre un alias var(--x).
  const table = new Map();
  for (const r of regles) for (const m of r.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) table.set(m[1], m[2].trim());
  const resoudre = v => resoudreVar(v, [n => table.get(n)]);
  const couleurs = []; const familles = []; const non_resolus = [];
  const vuesC = new Set(); const vuesF = new Set();
  const posC = (jeton, valeur, origine) => {
    const rgba = parseCouleur(valeur);
    if (!rgba) return false;
    const cle = `${jeton || ''}|${rgba.r.toFixed(0)},${rgba.g.toFixed(0)},${rgba.b.toFixed(0)},${(rgba.a ?? 1).toFixed(2)}`;
    if (vuesC.has(cle)) return true;
    vuesC.add(cle); couleurs.push({ jeton, valeur: valeur.trim(), rgba, origine });
    return true;
  };
  const posF = (jeton, valeurPile, origine) => {
    const noms = nomsDePile(valeurPile);
    noms.forEach((nom, i) => {
      const cle = `${jeton || ''}|${clePile(nom)}|${i === 0}`;
      if (vuesF.has(cle)) return;
      vuesF.add(cle); familles.push({ jeton, nom, premier: i === 0, origine });
    });
  };
  for (const r of regles) {
    const dansFontFace = /^@font-face\b/i.test(r.selector) || r.atRules.some(a => /^@font-face\b/i.test(a));
    for (const m of r.body.matchAll(/(?:^|[;\s{])(--[\w-]+|font-family|[a-z-]+)\s*:\s*([^;]+)/gi)) {
      const prop = m[1].toLowerCase(); const brut = m[2].trim();
      if (prop.startsWith('--')) {
        const nom = m[1];
        const valeur = resoudre(brut);
        if (valeur === null) { non_resolus.push(`${nom} : ${brut.slice(0, 40)}`); continue; }
        if (ressembleAUnePile(nom, valeur)) { posF(nom, valeur, r.selector.slice(0, 60)); continue; }
        if (!posC(nom, valeur, r.selector.slice(0, 60)) && /color|couleur|bg|fond|encre|ink|accent|brand|marque|trait|bord/i.test(nom) && !/^var\(/i.test(brut)
          && !/^(?:transparent|currentcolor|inherit|initial|unset|none)$/i.test(brut)) non_resolus.push(`${nom} : ${brut.slice(0, 40)}`);
      } else if (prop === 'font-family' && !dansFontFace) {
        const valeur = resoudre(brut);
        if (valeur !== null) posF(null, valeur, r.selector.slice(0, 60));
      } else if (!dansFontFace) {
        // Un littéral de couleur posé par une règle (color: #fff, border: 1px solid rgb(…)) : membre de la charte, jamais un jeton.
        for (const c of findColors(brut)) posC(null, c.raw, r.selector.slice(0, 60));
      }
    }
    if (dansFontFace) {
      const m = /font-family\s*:\s*([^;]+)/i.exec(r.body);
      if (m) for (const nom of nomsDePile(m[1])) {
        const cle = `@font-face|${clePile(nom)}`;
        if (!vuesF.has(cle)) { vuesF.add(cle); familles.push({ jeton: null, nom, premier: false, origine: '@font-face', fournie: true }); }
      }
    }
  }
  return { couleurs, familles, non_resolus };
}

/** Deux couleurs sont-elles la même ? Chaque canal à 1/255 près, l'opacité à 1 % près : la charte ne se lit pas à l'œil. */
export function memeCouleur(a, b) {
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.g - b.g) <= 1 && Math.abs(a.b - b.b) <= 1 && Math.abs((a.a ?? 1) - (b.a ?? 1)) <= 0.011;
}

export const nomDeFamille = clePile;
