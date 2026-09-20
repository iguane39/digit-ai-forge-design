// lib/grille.mjs — la grille de largeurs de la forge, LUE et non écrite en dur.
//
// TF-1066. Une largeur de conception est une donnée périssable : le parc de postes
// bouge, le 4K est arrivé, le 1280 des maquettes s'est périmé. Tant qu'elle vivait
// en constante dans trois scripts et recopiée dans cinq documents, elle a dérivé —
// le 12/09/2026, la grille est passée à sept largeurs dans run-oracles-design.mjs et
// à cinq dans oracle-baseline.mjs, mais rendu-comparatif.mjs est resté à
// `1920,1440,1024,768,390` : un correctif comparé avant/après ne voyait rien de ce
// qui se passe à 2560 et à 3840, là précisément où le débordement et le vide se
// découvrent. Quatre jours d'écart entre deux scripts du même dossier, et personne
// pour le dire — c'est la signature d'une donnée rangée dans du code.
//
// La grille vit donc dans `corpus/grille-viewports.json`, datée, sourcée, éditable,
// et citée au corpus (GL45 de `corpus/guidelines.csv`). Les oracles la LISENT.
//
// UN FICHIER ABSENT OU INCOHÉRENT LÈVE. Pas de repli silencieux sur une grille
// devinée : un oracle qui juge à une autre grille que celle qu'on croit lui avoir
// donnée rend un verdict vrai sur la mauvaise question, et rien ne le signale.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FICHIER_GRILLE = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'corpus', 'grille-viewports.json');

/**
 * Lit la grille de largeurs du corpus. Renvoie `{ largeurConception, rendu[],
 * baseline[], rendus, baselines, source, date, fichier }` — les listes triées de la
 * plus large à la plus étroite, `rendus`/`baselines` prêtes pour `--widths`.
 * Lève, avec le chemin du fichier fautif, dès que la donnée manque ou se contredit.
 */
export function lireGrille(fichier = FICHIER_GRILLE) {
  if (!fs.existsSync(fichier)) {
    throw new Error(`grille de largeurs introuvable : ${fichier} — c'est une donnée du corpus (TF-1066), pas une constante à redeviner`);
  }
  let brut;
  try { brut = JSON.parse(fs.readFileSync(fichier, 'utf8')); }
  catch (e) { throw new Error(`grille de largeurs illisible (${fichier}) : ${e.message}`); }

  const entier = v => Number.isInteger(v) && v > 0;
  const liste = (v, nom) => {
    if (!Array.isArray(v) || v.length === 0 || !v.every(entier)) {
      throw new Error(`grille de largeurs : « ${nom} » doit être une liste non vide d'entiers positifs (${fichier})`);
    }
    return [...v].sort((a, b) => b - a);
  };

  if (!entier(brut.largeur_conception)) {
    throw new Error(`grille de largeurs : « largeur_conception » absente ou non entière (${fichier})`);
  }
  const rendu = liste(brut.rendu, 'rendu');
  const baseline = liste(brut.baseline, 'baseline');

  // Une grille de vérification qui saute la largeur où l'écran a été DESSINÉ ne
  // vérifie pas l'écran qu'on a fait : l'incohérence se refuse, elle ne s'arbitre pas.
  if (!rendu.includes(brut.largeur_conception)) {
    throw new Error(`grille de largeurs : la largeur de conception ${brut.largeur_conception} px ne figure pas dans la grille de rendu ${rendu.join(', ')} (${fichier})`);
  }
  // La baseline est un SOUS-ENSEMBLE de la grille de rendu, jamais un ailleurs :
  // une capture approuvée à une largeur que nul oracle ne rend ne prouve rien.
  const horsRendu = baseline.filter(w => !rendu.includes(w));
  if (horsRendu.length) {
    throw new Error(`grille de largeurs : la grille de baseline sort de la grille de rendu à ${horsRendu.join(', ')} px (${fichier})`);
  }

  return {
    largeurConception: brut.largeur_conception,
    rendu, baseline,
    rendus: rendu.join(','), baselines: baseline.join(','),
    source: brut.$source || null,
    date: brut.$date || null,
    fichier,
  };
}
