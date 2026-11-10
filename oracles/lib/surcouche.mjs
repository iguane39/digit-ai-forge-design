// lib/surcouche.mjs — QU'EST-CE QU'UNE SUR-COUCHE ? UNE SEULE RÉPONSE, SUR L'ARBRE (TF-2092)
//
// Le lanceur (run-oracles-design) décidait de lancer oracle-surcouche en cherchant des MOTS dans le
// texte de la page — `showModal(`, `role="dialog"`, `<dialog` — script compris. Une mire de connexion
// ou une 404 anonyme, sans aucun <dialog>, dont le script CITE ces mots (chaîne, test de capacité),
// lançait donc l'oracle ; lui, qui juge l'arbre, ne trouvait rien : SKIP, et l'agrégat tombait en
// SKIP exit 2. TF-1772 avait réglé la voie du commentaire ; ceci règle la voie du script.
//
// La règle vit ici, à un seul endroit, et l'oracle comme le lanceur la lisent : ce que le lanceur
// croit être une sur-couche est exactement ce que l'oracle jugera (même doctrine que
// lib/cible-mobile.mjs : une portée, deux juges).
//
// Une page porte une sur-couche si, et seulement si :
//   - un élément de son arbre en est une (<dialog>, attribut popover, role="dialog"/"alertdialog"),
//     dans le DOM statique OU dans un gabarit de script (arbres() les extrait, l'oracle les juge) ;
//   - ou une règle d'une feuille de style (<style>, attribut style) vise un ::backdrop.
// Le texte d'un script, d'un commentaire HTML ou d'un commentaire CSS n'en est jamais une.

import { parse, arbres, elements, css, cssRulesDeep } from './html.mjs';

/** Un élément est un composant en sur-couche. */
export function estSurcouche(el) {
  if (!el || !el.tag || el.tag.startsWith('#')) return false;
  if (el.tag === 'dialog') return true;
  const attrs = el.attrs || {};
  if (Object.prototype.hasOwnProperty.call(attrs, 'popover')) return true;
  const role = String(attrs.role || '').toLowerCase();
  return role === 'dialog' || role === 'alertdialog';
}

/** La page (texte HTML) porte-t-elle une sur-couche dans son arbre ou dans ses feuilles de style ? */
export function pageAUneSurcouche(html) {
  const racine = parse(html);
  if (arbres(html, racine).some(a => elements(a).some(estSurcouche))) return true;
  const feuilles = css(html, racine).replace(/\/\*[\s\S]*?\*\//g, ' ');
  return cssRulesDeep(feuilles).some(r => /::backdrop/i.test(r.selector));
}

// ── Le thème sombre : SC4 vaut pour toute page qui en déclare un, sur-couche ou non (TF-2384) ──
// SC4 (`color-scheme` déclaré par thème) ne concerne pas que le composant en sur-couche : le navigateur peint
// pour son propre compte les barres de défilement, les contrôles natifs et le fond de la page elle-même. Une page
// dotée d'un thème sombre qui n'a ni <dialog> ni [popover] a donc la même barre de défilement blanche en sombre :
// le format des dossiers consultant l'a eue du 16 au 28/09/2026, parce que l'oracle sortait en SKIP avant SC4.
// Les deux définitions vivent ici, lues par l'oracle ET par le lanceur : une portée, deux juges (TF-2092).
/** R-30 : un bloc @media (prefers-color-scheme: dark) n'est PAS le thème sombre de la forge. */
export const estAutoSombre = r => r.atRules.some(a => /prefers-color-scheme\s*:\s*dark/i.test(a));
export const estSombre = r => !estAutoSombre(r) && /dark/i.test(r.selector);

/** Ces règles CSS déclarent-elles un thème sombre : un bloc [data-theme="dark"] portant des jetons, ou une règle prefers-color-scheme: dark ? */
export function reglesDeclarentUnThemeSombre(regles) {
  return regles.some(r => estAutoSombre(r) || (estSombre(r) && /--[\w-]+\s*:/.test(r.body)));
}

/** La page (texte HTML), avec le CSS d'un éventuel fichier de jetons, déclare-t-elle un thème sombre ? */
export function pageAUnThemeSombre(html, cssJetons = '') {
  const racine = parse(html);
  const feuilles = (cssJetons + '\n' + css(html, racine)).replace(/\/\*[\s\S]*?\*\//g, ' ');
  return reglesDeclarentUnThemeSombre(cssRulesDeep(feuilles).filter(r => !r.atRules.some(a => /\bprint\b/i.test(a))));
}
