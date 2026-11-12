// lib/statut-attendu.mjs — l'option --statut-attendu <code> des juges qui lisent une instance servie (TF-2432, lot Produit-82 du 10/11/2026).
//
// LE FAIT. L'écran « Page introuvable » d'une application, servi avec son 404, rendait SKIP exit 2 : tout juge qui lit une instance
// refuse une réponse en 400 ou plus (X0, EF0, « page non servie »), et aucune critique d'implémentation ne jugeait donc les écrans
// d'état. Refuser est juste quand le code est une panne ; ça ne l'est plus quand le code est VOULU.
//
// LE REMÈDE. L'appelant ANNONCE le code : un écran servi avec ce code est jugé comme un écran ; servi avec un autre code, y compris
// 200, il reste refusé. Sans l'option, rien ne change : une réponse en 400 ou plus est refusée. La valeur est un code HTTP de trois
// chiffres (100 à 599) ; autre chose est refusé à voix haute par l'appelant, jamais ignoré. L'option vaut pour TOUTES les instances
// de l'appel : des écrans de codes différents se jouent en appels séparés.

export const OPTION = '--statut-attendu';

/** Lit l'option dans les arguments : { present, code, erreur }. `code` vaut null sans l'option ou si la valeur est illisible. */
export function lireStatutAttendu(args) {
  const i = args.indexOf(OPTION);
  if (i === -1) return { present: false, code: null, erreur: null };
  const brut = args[i + 1];
  if (typeof brut === 'string' && /^[1-5]\d\d$/.test(brut)) return { present: true, code: Number(brut), erreur: null };
  return { present: true, code: null, erreur: `${OPTION} « ${brut ?? ''} » illisible : un code HTTP de trois chiffres (100 à 599) est attendu, par exemple 404` };
}

/** Vrai quand la réponse ne doit PAS être jugée : sans code annoncé, toute réponse en 400 ou plus ; avec un code annoncé, tout autre code. */
export const ecranRefuse = (statut, attendu) => (attendu === null ? Boolean(statut && statut >= 400) : statut !== attendu);

/** Le motif du refus, pour le constat X0 ou EF0. */
export const motifDuRefus = (statut, attendu) => (attendu === null
  ? `réponse HTTP ${statut} : écran non jugé`
  : `réponse HTTP ${statut} au lieu du ${attendu} annoncé (${OPTION}) : écran non jugé`);
