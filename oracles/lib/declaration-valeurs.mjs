// declaration-valeurs.mjs — où un produit déclare ses valeurs dérivées (TF-2043).
//
// UNE seule règle de recherche, partagée par oracle-valeur-affichee.mjs et par run-oracles-design.mjs :
// la déclaration s'appelle `valeurs-derivees.json` et se cherche dans le dossier de la page, puis dans
// ses parents (six niveaux au plus). Deux implémentations divergentes de ce geste ont déjà coûté (TF-0921) :
// l'agrégateur qui décide « sans objet » et l'oracle qui décide « SKIP » doivent lire le même fichier.

import fs from 'node:fs';
import path from 'node:path';

export const NOM_DECLARATION = 'valeurs-derivees.json';
export const SCHEMA_DECLARATION = 'digit-ai/valeurs-derivees@1';

/** Le chemin de la déclaration voisine de la page, ou null. Une URL n'a pas de voisinage. */
export function trouverDeclaration(fichierPage, { remontees = 6 } = {}) {
  if (!fichierPage || /^https?:\/\//i.test(fichierPage)) return null;
  let d = path.dirname(path.resolve(fichierPage));
  for (let n = 0; n <= remontees; n++) {
    const c = path.join(d, NOM_DECLARATION);
    if (fs.existsSync(c)) return c;
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return null;
}
