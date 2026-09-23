// lib/cible-mobile.mjs — QU'EST-CE QU'UNE CIBLE MOBILE ? UNE SEULE RÉPONSE POUR TOUT LE PARC
// (TF-1322, décision humaine D-13 (a) du 23/09/2026).
//
// LE FAIT. Deux juges de la maison donnaient deux PORTÉES à la même règle. Le point d'entrée de
// cette forge (`run-oracles-design.mjs`) ne joue oracle-mobile que sur une cible mobile — l'appel
// le déclare (`--mobile`), ou la page porte un marqueur de châssis ou d'encoche — et le déclare
// SANS OBJET ailleurs. Le lanceur général de quality-oracles (digit-ai-forge-agents) le jouait sur
// TOUTE page HTML. Mesuré le 22/09 sur une page d'étude bâtie sur le socle : sept juges PASS au
// point d'entrée, un FAIL au lanceur général, porté par les trois barres collées du GABARIT DU
// SOCLE lui-même. Toute page conforme échouait donc ce domaine au lanceur, quel que soit son auteur,
// et un rouge permanent s'apprend comme du bruit.
//
// LE REMÈDE : la règle vit ICI, une fois. Le point d'entrée l'importe ; oracle-mobile la consulte
// quand on lui passe `--si-cible-mobile`, et le registre de quality-oracles lui passe cette option.
// Recopier le motif dans le registre lui aurait donné un second domicile, qui aurait dérivé en
// silence au premier marqueur ajouté (la leçon de TF-1207).

/** Les marqueurs qui font d'une page une cible mobile : encoche déclarée, ou châssis d'application. */
export const MOTIF_CIBLE_MOBILE = /viewport-fit\s*=\s*cover|safe-area-inset|data-chassis|class="[^"]*chassis/i;

/** Le motif de « sans objet », écrit une fois pour les deux lanceurs. */
export const MOTIF_SANS_OBJET = 'cible non mobile (ni --mobile, ni marqueur de châssis détecté)';

/** Vrai si l'appel déclare la cible mobile (`--mobile`) ou si la page en porte un marqueur. */
export function estCibleMobile(html, args = []) {
  return args.includes('--mobile') || MOTIF_CIBLE_MOBILE.test(String(html || ''));
}
