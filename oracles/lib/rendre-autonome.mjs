// lib/rendre-autonome.mjs — RENDRE AUTONOME UNE PAGE CAPTURÉE D'UNE INSTANCE SERVIE (TF-2309, lot Produit-81 du 09/11/2026).
//
// LE FAIT. Une page capturée d'une instance servie garde ses feuilles de style et ses scripts en ressources externes
// (`<link rel="stylesheet" href="/assets/app.css">`, `<script src="/assets/app.js">`). Posée en fichier, elle ne les retrouve
// plus : les oracles statiques lisent une page sans CSS ni script (oracle-tokens rend FAIL sur une page conforme) et
// render_page.py rend une copie aux liens cassés (un débordement factice de 737 px à 390 px). Le produit contournait par un
// script d'intégration écrit chez lui, avant chaque passe.
//
// CE QUE FAIT CETTE LIB. Elle remplace chaque feuille de style liée par un `<style data-origine="…">` et chaque script lié par
// un `<script data-origine="…">`, avec le contenu lu SOIT dans le fichier voisin de la page (quand il existe), SOIT à
// l'origine servie, quand l'appelant en donne une (`--origine`, ou un `<base href>` absolu, ou une adresse absolue de boucle
// locale dans la page). Elle ne touche à rien quand aucune ressource n'est à aller chercher : une page déjà autonome, ou dont
// les liens se résolvent sur le disque, repart octet pour octet.
//
// LA BORNE. Aucun accès réseau vers un tiers : seules les adresses de la boucle locale (localhost, 127.0.0.1, ::1) sont lues,
// une redirection n'est pas suivie, et une ressource d'un autre hôte est listée « non intégrée », jamais lue. Les images, les
// polices, les `@import` et les imports relatifs d'un module ne sont pas intégrés : dits au non_juge par l'appelant.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { estHoteLocal, lirePageServie } from './lire-page-servie.mjs';

const TAILLE_MAX = 5_000_000;

/** Valeur d'un attribut d'une balise ouvrante, ou null. */
function attribut(balise, nom) {
  const m = new RegExp(`\\s${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(balise);
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
}

/** Retire un attribut (avec sa valeur) d'une balise ouvrante. */
function sansAttribut(balise, nom) {
  return balise.replace(new RegExp(`\\s${nom}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, 'gi'), '');
}

/** Lecture par défaut d'une ressource de la boucle locale : pas de redirection suivie, taille bornée. */
export async function lireRessourceLocale(url, { certificatLocal = false } = {}) {
  if (!estHoteLocal(url)) throw new Error('hôte non local : aucun accès réseau vers un tiers');
  const rep = (/^https:/i.test(url) && certificatLocal)
    ? await lirePageServie(url, { certificatLocal: true })
    : await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (rep.status >= 300 && rep.status < 400) throw new Error(`redirection non suivie (HTTP ${rep.status})`);
  if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
  const texte = await rep.text();
  if (texte.length > TAILLE_MAX) throw new Error(`ressource de plus de ${TAILLE_MAX} caractères`);
  return texte;
}

/** Le fichier local d'une référence relative ou « racine du site » ; la racine du site se cherche en remontant. */
function fichierLocal(ref, dossier) {
  const chemin = decodeURIComponent(ref.split(/[?#]/)[0]);
  if (!chemin) return null;
  if (chemin.startsWith('/')) {
    for (let d = path.resolve(dossier); ; d = path.dirname(d)) {
      const f = path.join(d, chemin);
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
      if (path.dirname(d) === d) return null;
    }
  }
  const f = path.resolve(dossier, chemin);
  return fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}

/** Les url(…) relatifs d'une feuille deviennent absolus : la feuille quitte son dossier, ses polices et images la suivent. */
function absolutiserUrls(css, base) {
  return css.replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi, (tout, q, ref) => {
    if (/^(?:data:|#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref.trim())) return tout;
    try { return `url(${q}${new URL(ref.trim(), base).href}${q})`; } catch { return tout; }
  });
}

/**
 * @param {string} html            la page capturée
 * @param {{dossier:string, origine?:string|null, lire?:Function, certificatLocal?:boolean}} o
 *        dossier : celui de la page (résolution des liens relatifs) ; origine : adresse servie de la boucle locale ;
 *        lire(url) : lecture d'une ressource (injectable, par défaut lireRessourceLocale).
 * @returns {Promise<{html:string, declenche:boolean, integrees:object[], non_integrees:object[], notes:string[]}>}
 */
export async function rendreAutonome(html, { dossier, origine = null, lire = null, certificatLocal = false } = {}) {
  const lireRessource = lire || (u => lireRessourceLocale(u, { certificatLocal }));
  const resultat = { html, declenche: false, integrees: [], non_integrees: [], notes: [] };

  // Base de résolution : <base href> (absolu ou relatif à l'origine), sinon l'origine elle-même.
  const baseHtml = (/<base\b[^>]*>/i.exec(html.replace(/<!--[\s\S]*?-->/g, '')) || [])[0];
  const baseHref = baseHtml ? attribut(baseHtml, 'href') : null;
  let base = null;
  try { base = baseHref ? new URL(baseHref, origine || undefined).href : (origine || null); } catch { base = origine || null; }

  // Les ressources liées, hors commentaires.
  const motif = /<!--[\s\S]*?-->|<link\b[^>]*>|<script\b[^>]*>\s*<\/script>/gi;
  const trouvees = [];
  for (const m of html.matchAll(motif)) {
    const balise = m[0];
    if (balise.startsWith('<!--')) continue;
    const feuille = /^<link/i.test(balise);
    if (feuille && !/\bstylesheet\b/i.test(attribut(balise, 'rel') || '')) continue;
    const ref = (attribut(balise, feuille ? 'href' : 'src') || '').trim();
    if (!ref || ref.startsWith('#') || /^(?:data|blob|javascript):/i.test(ref)) continue;
    trouvees.push({ debut: m.index, fin: m.index + balise.length, balise, ref, type: feuille ? 'style' : 'script' });
  }

  // Où chaque ressource se lit : un fichier voisin, l'origine servie, ou nulle part (et pourquoi).
  const aLire = [];
  for (const t of trouvees) {
    const absolue = /^(?:https?:)?\/\//i.test(t.ref);
    if (absolue) {
      const url = t.ref.startsWith('//') ? `http:${t.ref}` : t.ref;
      if (estHoteLocal(url)) t.source = { genre: 'origine', url };
      else t.refus = 'hôte non local : aucun accès réseau vers un tiers, ressource laissée liée';
    } else {
      // Une adresse « racine du site » (/assets/app.css) est celle de l'instance servie : avec une origine, c'est elle qui fait
      // foi, pas un fichier de même chemin trouvé en remontant l'arborescence (la source du produit n'est pas le servi).
      const f = (t.ref.startsWith('/') && base) ? null : fichierLocal(t.ref, dossier);
      if (f) t.source = { genre: 'fichier', fichier: f };
      else if (base) {
        try {
          const url = new URL(t.ref, base).href;
          if (estHoteLocal(url)) t.source = { genre: 'origine', url };
          else t.refus = 'hôte non local : aucun accès réseau vers un tiers, ressource laissée liée';
        } catch { t.refus = 'adresse illisible'; }
      } else t.refus = 'introuvable à côté de la page et aucune origine donnée (--origine <url de la boucle locale>)';
    }
    if (t.source && t.source.genre === 'origine') aLire.push(t);
  }

  // Rien à aller chercher à l'origine : la page repart telle quelle, mais ce qui reste lié sans source est dit.
  if (!aLire.length) {
    for (const t of trouvees) if (t.refus && !/tiers/.test(t.refus)) resultat.non_integrees.push({ type: t.type, ref: t.ref, raison: t.refus });
    return resultat;
  }

  // Lecture, puis remplacement de la fin vers le début (les positions restent valables).
  resultat.declenche = true;
  for (const t of trouvees) {
    if (!t.source) { resultat.non_integrees.push({ type: t.type, ref: t.ref, raison: t.refus }); continue; }
    let texte; let urlBase;
    try {
      if (t.source.genre === 'fichier') { texte = fs.readFileSync(t.source.fichier, 'utf8'); urlBase = pathToFileURL(t.source.fichier).href; }
      else { texte = await lireRessource(t.source.url); urlBase = t.source.url; }
    } catch (e) {
      resultat.non_integrees.push({ type: t.type, ref: t.ref, raison: `lecture impossible (${String(e.message || e).split('\n')[0]})` });
      continue;
    }
    t.texte = texte; t.urlBase = urlBase;
    resultat.integrees.push({ type: t.type, ref: t.ref, source: t.source.genre === 'fichier' ? 'fichier voisin' : t.source.url, caracteres: texte.length });
    if (t.type === 'style' && /@import\b/i.test(texte)) resultat.notes.push(`${t.ref} : @import non suivi`);
    if (t.type === 'script' && /\bimport\s[^;]*\bfrom\s*['"]\.{0,2}\//.test(texte)) resultat.notes.push(`${t.ref} : import relatif d'un module non suivi`);
  }
  let sortie = html;
  for (const t of [...trouvees].reverse()) {
    if (t.texte === undefined) continue;
    let remplacement;
    if (t.type === 'style') {
      const media = attribut(t.balise, 'media');
      remplacement = `<style data-origine="${t.ref.replace(/"/g, '&quot;')}"${media ? ` media="${media}"` : ''}>\n${absolutiserUrls(t.texte, t.urlBase)}\n</style>`;
    } else {
      let ouvrante = /^<script\b[^>]*>/i.exec(t.balise)[0];
      for (const a of ['src', 'integrity', 'crossorigin']) ouvrante = sansAttribut(ouvrante, a);
      remplacement = ouvrante.replace(/^<script\b/i, `<script data-origine="${t.ref.replace(/"/g, '&quot;')}"`)
        + `\n${t.texte.replace(/<\/script/gi, '<\\/script')}\n</script>`;
    }
    sortie = sortie.slice(0, t.debut) + remplacement + sortie.slice(t.fin);
  }
  resultat.html = sortie;
  return resultat;
}
