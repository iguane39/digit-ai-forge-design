// lib/site-servi.mjs — RELEVER LES PAGES D'UN SITE SERVI PAR SA NAVIGATION (TF-2901, lot Produit-82 du 27/11/2026).
//
// LE FAIT. Une nouvelle composition a été jugée sur la liste des 6 écrans refaits (12 pages, tout PASS) ; les 9 autres écrans
// servis sous la même adresse gardaient l'ancienne composition, et aucun oracle ne les avait rendus, faute d'être nommés. La
// liste des écrans à juger ne se tient pas à la main : elle se RELÈVE de la navigation que le site sert lui-même.
//
// CE QUE FAIT CETTE LIB. À partir d'une page servie, elle suit les liens de MÊME ORIGINE que portent les éléments de navigation
// (<nav>, <header>, un rôle ARIA navigation / menu / menubar), de page en page, jusqu'à épuisement ou jusqu'au plafond. Elle rend
// les pages lues ET ce qu'elle n'a pas pu lire, avec la raison : un écran relevé et non lu se dit, il ne disparaît pas.
//
// LA BORNE. Comme rendre-autonome.mjs (TF-2309) : aucun accès réseau vers un tiers, l'URL de départ vise la boucle locale
// (localhost, 127.0.0.1, ::1), et un lien d'une autre origine n'est jamais suivi (il est compté et dit, pas lu).

import { parse as parseHtml, elements, walk } from './html.mjs';
import { estHoteLocal, lirePageServie } from './lire-page-servie.mjs';

const ROLES_DE_NAVIGATION = new Set(['navigation', 'menu', 'menubar']);
const EXTENSIONS_HORS_PAGE = /\.(?:pdf|zip|gz|png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|json|xml|txt|csv|docx?|xlsx?|pptx?|mp[34]|webm|woff2?|ttf|map)$/i;

/** L'adresse d'une page sans son ancre ; null si ce n'est pas une adresse http(s). */
export function adresseNormalisee(href, base) {
  try {
    const u = new URL(href, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = '';
    return u.href;
  } catch { return null; }
}

/**
 * Les liens que la NAVIGATION d'une page porte : les <a href> sous un <nav>, un <header> ou un élément de rôle navigation, menu
 * ou menubar, et les éléments de rôle menuitem qui portent un href. Les liens du corps de la page ne sont pas des liens de navigation.
 * @returns {Array<{href:string, texte:string}>} dans l'ordre du document, doublons conservés (l'appelant les écarte)
 */
export function liensDeNavigation(html) {
  const racine = parseHtml(html);
  const conteneurs = elements(racine).filter(el => el.tag === 'nav' || el.tag === 'header'
    || ROLES_DE_NAVIGATION.has(String((el.attrs && el.attrs.role) || '').toLowerCase()));
  const vus = new Set(); const liens = [];
  for (const c of conteneurs) {
    walk(c, el => {
      if (el.tag.startsWith('#') || vus.has(el)) return;
      const href = el.attrs && el.attrs.href;
      const estLien = el.tag === 'a' || String(el.attrs.role || '').toLowerCase() === 'menuitem';
      if (!estLien || !href || href.startsWith('#') || el.attrs.download !== undefined) return;
      vus.add(el);
      liens.push({ href, texte: texteDe(el).slice(0, 60) });
    });
  }
  return liens;
}

function texteDe(el) {
  let t = '';
  walk(el, n => { if (n.tag === '#text') t += ` ${n.text}`; });
  return t.replace(/\s+/g, ' ').trim();
}

/**
 * Relève les pages d'un site servi par sa navigation, en largeur d'abord.
 * @param {string} depart  URL de la page de départ (boucle locale)
 * @param {{pagesMax?:number, certificatLocal?:boolean, lire?:Function}} o  `lire(url)` : lecture injectable → { ok, status, text(), headers?, url? }
 * @returns {Promise<{origine:string, pages:Array, hors_origine:string[], hors_page:string[], au_dela_du_plafond:string[]}>}
 *   pages[] = { url, finale, statut, html|null, raison|null, trouvee_par|null } — `raison` non nulle = écran relevé et NON lu
 */
export async function releverSite(depart, { pagesMax = 40, certificatLocal = false, lire = null } = {}) {
  const lecture = lire || (u => lirePageServie(u, { certificatLocal }));
  const origine = new URL(depart).origin;
  const resultat = { origine, pages: [], hors_origine: [], hors_page: [], au_dela_du_plafond: [] };
  const connues = new Set(); const finales = new Set();
  const file = [{ url: adresseNormalisee(depart, depart), par: null }];
  connues.add(file[0].url);
  const horsOrigine = new Set(); const horsPage = new Set();
  while (file.length) {
    const { url, par } = file.shift();
    if (resultat.pages.length >= pagesMax) { resultat.au_dela_du_plafond.push(url); continue; }
    const page = { url, finale: url, statut: null, html: null, raison: null, trouvee_par: par };
    resultat.pages.push(page);
    let rep;
    try { rep = await lecture(url); } catch (e) {
      page.raison = `lecture impossible (${String((e.cause && e.cause.code) || e.message || e).split('\n')[0]})`;
      continue;
    }
    page.statut = rep.status;
    if (rep.url) page.finale = adresseNormalisee(rep.url, url) || url;
    if (!rep.ok) { page.raison = `HTTP ${rep.status}`; continue; }
    if (page.finale !== url && new URL(page.finale).origin !== origine) { page.raison = `redirigée hors du site (${page.finale})`; continue; }
    const texte = await rep.text();
    const type = (rep.headers && rep.headers.get && rep.headers.get('content-type')) || '';
    if ((type && !/html/i.test(type)) || (!type && !/<\s*(?:!doctype|html|body|head)\b/i.test(texte.slice(0, 2000)))) { page.raison = `pas une page HTML${type ? ` (${type.split(';')[0]})` : ''}`; continue; }
    if (finales.has(page.finale)) { page.raison = `doublon de ${page.finale} (même page après redirection)`; page.doublon = true; continue; }
    finales.add(page.finale);
    page.html = texte;
    for (const lien of liensDeNavigation(texte)) {
      const adresse = adresseNormalisee(lien.href, page.finale);
      if (!adresse) continue;
      if (new URL(adresse).origin !== origine) { horsOrigine.add(adresse); continue; }
      if (EXTENSIONS_HORS_PAGE.test(new URL(adresse).pathname)) { horsPage.add(adresse); continue; }
      if (connues.has(adresse)) continue;
      connues.add(adresse);
      file.push({ url: adresse, par: page.finale });
    }
  }
  resultat.hors_origine = [...horsOrigine];
  resultat.hors_page = [...horsPage];
  return resultat;
}

/** L'URL de départ est-elle une adresse http(s) de la boucle locale ? Sinon, la raison du refus. */
export function departAcceptable(depart) {
  let u;
  try { u = new URL(depart); } catch { return `adresse illisible : ${depart}`; }
  if (!/^https?:$/.test(u.protocol)) return `ni http ni https : ${depart}`;
  if (!estHoteLocal(depart)) return `hôte « ${u.hostname} » non local : aucun accès réseau vers un tiers, servir le site en local (localhost, 127.0.0.1, ::1)`;
  return null;
}
