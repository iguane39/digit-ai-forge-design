// lib/feuilles.mjs — LIRE LES FEUILLES D'UNE APPLICATION, ET EN TIRER LES CLASSES
// (TF-2901, lot Produit-82 du 27/11/2026).
//
// LE FAIT. oracle-composition (TF-2901) compare les classes qu'une page emploie à celles que la feuille de la composition dessine.
// Il lit une feuille, ou une page servie avec ses feuilles liées, et la lit ici, une fois.
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
