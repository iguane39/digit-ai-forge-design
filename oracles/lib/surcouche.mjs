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
