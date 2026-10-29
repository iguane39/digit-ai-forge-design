// lib/captures.mjs — une capture manquante à une largeur EXIGÉE est un échec, jamais un silence (D-108 (b)).
//
// LE FAIT. Une capture à 390 px était exigée ; elle n'a pas pu être faite, et le rendu a quand même été
// jugé PASS. La cause est mécanique : render_page.py DÉCLARE une capture manquée (`captures_manquees`,
// `breakpoints[largeur].capture.faite === false`, `png: null`) et rend quand même son verdict sur les
// seules mesures du DOM, qu'il dit « valide pour ce qu'il dit, et muet sur le rendu ». Les consommateurs
// de cette forge ne lisaient pas ce champ : `run-oracles-design.mjs --rendu` ne regardait que les
// constats par largeur (aucun constat à 390 px ⇒ rien à signaler ⇒ PASS), et `rendu-comparatif.mjs` ne
// parcourait que les largeurs présentes dans le rendu « après ».
//
// La règle, tenue ici une fois pour les deux : toute largeur de la grille exigée dont la capture manque
// — absente de la sortie de render_page, sans PNG, déclarée non faite, ou PNG disparu du disque — est
// rendue avec son motif, et le consommateur en fait un constat BLOQUANT qui NOMME la largeur.
//
// `oracle-baseline.mjs` tient déjà cette règle de son côté (B0 « capture courante manquante à Wpx »,
// bloquant) : il ne passe pas par ce module.

import fs from 'node:fs';

/**
 * @param {object} rapport  sortie JSON de render_page.py (`breakpoints`, `captures_manquees`)
 * @param {number[]} largeursExigees  les largeurs de la grille qui devaient être capturées
 * @param {{ fichierExiste?: (chemin: string) => boolean }} [options]
 * @returns {{ largeur: number, motif: string }[]}  une entrée par largeur dont la capture manque
 */
export function capturesManquantes(rapport, largeursExigees, { fichierExiste = (p) => fs.existsSync(p) } = {}) {
  const bps = (rapport && rapport.breakpoints) || {};
  const declarees = new Set(((rapport && rapport.captures_manquees) || []).map(Number));
  const manquantes = [];
  for (const largeur of largeursExigees) {
    const bp = bps[largeur];
    let motif = null;
    if (!bp) {
      motif = 'aucun rendu de cette largeur dans la sortie de render_page.py';
    } else if (bp.capture && bp.capture.faite === false) {
      motif = bp.capture.motif || 'capture déclarée non faite par render_page.py';
    } else if (!bp.png) {
      motif = 'aucun PNG produit par render_page.py';
    } else if (!fichierExiste(bp.png)) {
      motif = `PNG annoncé mais absent du disque (${bp.png})`;
    } else if (declarees.has(Number(largeur))) {
      motif = 'largeur listée dans captures_manquees de render_page.py';
    }
    if (motif) manquantes.push({ largeur: Number(largeur), motif });
  }
  return manquantes;
}
