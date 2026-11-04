// lib/lire-page-servie.mjs — LIRE UNE PAGE SERVIE, AVEC UN CERTIFICAT AUTO-SIGNÉ ACCEPTÉ POUR LA BOUCLE LOCALE SEULE
// (TF-2122, 04/11/2026).
//
// LE FAIT. Une instance locale servie en https avec le certificat auto-signé du serveur de développement n'était
// pas jugeable : oracle-exploitabilite échouait au chargement (corrigé chez lui, option
// `--accepter-certificat-local`), et les deux oracles qui LISENT la page servie par `fetch` — faits-commerciaux et
// valeur-affichee — rendaient SKIP (« DEPTH_ZERO_SELF_SIGNED_CERT »), donc l'agrégat tombait en INDÉTERMINÉ même
// quand le seul oracle d'exploitabilité passait. Cette lecture est écrite une fois, ici.
//
// LA BORNE. Le certificat n'est accepté que pour un hôte de boucle locale (localhost, 127.0.0.1, ::1). Avec
// l'option, une cible sur un autre hôte est REFUSÉE (erreur de code CERTIFICAT_LOCAL_HOTE_NON_LOCAL), et une
// redirection qui mène hors de la boucle locale l'est aussi. Sans l'option, c'est `fetch`, strictement comme avant.

import http from 'node:http';
import https from 'node:https';

/** Les hôtes dont un certificat auto-signé peut être accepté (hostname d'une URL : l'IPv6 s'écrit [::1]). */
export const HOTES_LOCAUX = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Vrai si l'URL vise un hôte de la boucle locale. Une URL illisible n'est pas locale. */
export function estHoteLocal(url) {
  try { return HOTES_LOCAUX.has(new URL(url).hostname.toLowerCase()); } catch { return false; }
}

const refus = (message, code) => Object.assign(new Error(message), { cause: { code } });

function lireLocal(url, restant, delai) {
  return new Promise((ok, ko) => {
    if (!estHoteLocal(url)) return ko(refus(`hôte non local : ${url}`, 'CERTIFICAT_LOCAL_HOTE_NON_LOCAL'));
    const module = /^https:/i.test(url) ? https : http;
    const requete = module.get(url, { rejectUnauthorized: false, timeout: delai }, reponse => {
      const statut = reponse.statusCode || 0;
      if (statut >= 300 && statut < 400 && reponse.headers.location) {
        reponse.resume();
        if (restant <= 0) return ko(refus('trop de redirections', 'TOO_MANY_REDIRECTS'));
        let suite;
        try { suite = new URL(reponse.headers.location, url).href; } catch { return ko(refus('redirection illisible', 'REDIRECTION_ILLISIBLE')); }
        return lireLocal(suite, restant - 1, delai).then(ok, ko);
      }
      const morceaux = [];
      reponse.on('data', m => morceaux.push(m));
      reponse.on('end', () => {
        const texte = Buffer.concat(morceaux).toString('utf8');
        ok({ ok: statut >= 200 && statut < 300, status: statut, text: async () => texte });
      });
      reponse.on('error', ko);
    });
    requete.on('timeout', () => requete.destroy(refus('délai dépassé', 'ETIMEDOUT')));
    requete.on('error', e => ko(e.code ? refus(e.message, e.code) : e));
  });
}

/**
 * Lit une page servie. Rend un objet de la forme de `fetch` : { ok, status, text() }. Les erreurs portent `cause.code`.
 * `certificatLocal` : accepte un certificat auto-signé pour la boucle locale seulement (voir l'en-tête).
 */
export async function lirePageServie(url, { certificatLocal = false, delai = 15000 } = {}) {
  if (certificatLocal && /^https:/i.test(url)) return lireLocal(url, 5, delai);
  return fetch(url, { signal: AbortSignal.timeout(delai), redirect: 'follow' });
}
