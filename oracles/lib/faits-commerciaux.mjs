// faits-commerciaux.mjs — la table des motifs de faits commerciaux, LUE et jamais écrite en dur (TF-2050).
//
// Loi n° 4 du noyau : une donnée volatile est une donnée, pas du code. Les formes d'un avis, d'un prix
// barré, d'une rareté vivent dans `corpus/faits-commerciaux.json`, datées, sourcées, éditables ; ce module
// les compile et les VÉRIFIE. Même discipline que lib/grille.mjs : un fichier absent ou incohérent est une
// anomalie de l'oracle, dite avec son chemin, jamais un repli silencieux sur une liste devinée — un oracle
// qui chercherait d'autres formes que celles qu'on croit lui avoir données rendrait un verdict vrai sur la
// mauvaise question.
//
// La preuve est dans la table : chaque motif porte un `exemple` qu'il doit reconnaître, et un
// `contre_exemple` qu'il ne doit pas reconnaître quand il en a un. Ils sont rejoués à CHAQUE lecture.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FICHIER_MOTIFS = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'corpus', 'faits-commerciaux.json');

export const FAMILLES_ATTENDUES = ['FC1', 'FC2', 'FC3', 'FC4', 'FC5', 'FC6', 'FC7'];

// \b ne connaît pas les lettres accentuées : la borne de mot est posée en propriétés Unicode.
const AVANT = '(?<![\\p{L}\\p{N}])';
const APRES = '(?![\\p{L}\\p{N}])';
export const borne = motif => new RegExp(`${AVANT}(?:${motif})${APRES}`, 'giu');

const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Un terme de santé s'écrit une fois : le tiret est facultatif, l'espace vaut un tiret ou une espace,
// l'apostrophe droite et la courbe s'y valent.
const motifDeTerme = terme => echapper(terme.trim()).replace(/-/g, '[-\\s]?').replace(/\s+/g, '[-\\s]+').replace(/['’]/g, '[\'’]');

const dateIso = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/**
 * Lit et vérifie la table. Rend `{ fichier, table, motifs, sante, structure, erreurs[] }`.
 * `erreurs` vide = table saine. Les motifs compilés sont des expressions à drapeaux g, i, u : le
 * appelant remet `lastIndex` à 0 avant chaque usage.
 */
export function lireMotifs(fichier = FICHIER_MOTIFS) {
  const erreurs = [];
  const sortie = { fichier, table: null, motifs: [], sante: [], structure: null, erreurs };
  if (!fs.existsSync(fichier)) {
    erreurs.push(`table des motifs introuvable : ${fichier} — c'est une donnée du corpus (TF-2050), pas une constante à redeviner`);
    return sortie;
  }
  let table;
  try { table = JSON.parse(fs.readFileSync(fichier, 'utf8').replace(/^﻿/, '')); }
  catch (e) { erreurs.push(`table des motifs illisible (${fichier}) : ${e.message.slice(0, 120)}`); return sortie; }
  sortie.table = table;

  if (!dateIso(table.$date)) erreurs.push('« $date » absente ou invalide : une table de motifs est datée (AAAA-MM-JJ)');
  if (!dateIso(table.$range_le)) erreurs.push('« $range_le » absente ou invalide : la date de relecture de la table est posée (AAAA-MM-JJ)');
  if (typeof table.$source !== 'string' || !table.$source.trim()) erreurs.push('« $source » absente : une table de motifs est sourcée');

  const familles = table.familles && typeof table.familles === 'object' ? table.familles : {};
  for (const f of FAMILLES_ATTENDUES) if (!familles[f]) erreurs.push(`famille ${f} absente de « familles »`);

  const ids = new Set();
  for (const m of Array.isArray(table.motifs) ? table.motifs : []) {
    const nom = m && m.id ? m.id : '(sans id)';
    if (!m || !m.id || !m.motif || !m.famille || !m.exemple) { erreurs.push(`motif ${nom} : « id », « famille », « motif » et « exemple » sont obligatoires`); continue; }
    if (ids.has(m.id)) { erreurs.push(`motif ${m.id} : identifiant en double`); continue; }
    ids.add(m.id);
    if (!familles[m.famille]) { erreurs.push(`motif ${m.id} : famille « ${m.famille} » inconnue`); continue; }
    let re;
    try { re = borne(m.motif); } catch (e) { erreurs.push(`motif ${m.id} : expression invalide (${e.message.slice(0, 80)})`); continue; }
    if (!borne(m.motif).test(m.exemple)) { erreurs.push(`motif ${m.id} : il ne reconnaît pas son propre exemple « ${m.exemple} »`); continue; }
    if (m.contre_exemple && borne(m.motif).test(m.contre_exemple)) { erreurs.push(`motif ${m.id} : il reconnaît son contre-exemple « ${m.contre_exemple} »`); continue; }
    sortie.motifs.push({ id: m.id, famille: m.famille, langue: m.langue || '', libelle: m.libelle || m.id, re });
  }
  if (!sortie.motifs.length && !erreurs.length) erreurs.push('la table ne porte aucun motif');

  const termes = table.sante && Array.isArray(table.sante.termes) ? table.sante.termes : null;
  if (!termes || !termes.length) erreurs.push('« sante.termes » absent ou vide : la liste des allégations de santé est une donnée de la table');
  else {
    for (const t of termes) {
      if (!t || typeof t.terme !== 'string' || !t.terme.trim()) { erreurs.push('terme de santé sans « terme »'); continue; }
      let re;
      try { re = borne(motifDeTerme(t.terme)); } catch (e) { erreurs.push(`terme de santé « ${t.terme} » : expression invalide (${e.message.slice(0, 80)})`); continue; }
      if (!borne(motifDeTerme(t.terme)).test(t.terme)) { erreurs.push(`terme de santé « ${t.terme} » : il ne se reconnaît pas lui-même`); continue; }
      sortie.sante.push({ terme: t.terme.trim(), langue: t.langue || '', re });
    }
  }

  // La structure : des expressions et des listes que l'oracle ne devine pas.
  const s = table.structure && typeof table.structure === 'object' ? table.structure : null;
  if (!s) erreurs.push('« structure » absente de la table');
  else {
    const liste = n => (Array.isArray(s[n]) && s[n].length && s[n].every(x => typeof x === 'string') ? s[n] : (erreurs.push(`structure.${n} : liste de chaînes non vide attendue`), []));
    const expr = (n, drapeaux = 'iu') => {
      if (typeof s[n] !== 'string' || !s[n]) { erreurs.push(`structure.${n} : expression attendue`); return null; }
      try { return new RegExp(s[n], drapeaux); } catch (e) { erreurs.push(`structure.${n} : expression invalide (${e.message.slice(0, 80)})`); return null; }
    };
    sortie.structure = {
      jsonldTypes: liste('jsonld_types').map(x => x.toLowerCase()),
      jsonldClesNoeud: liste('jsonld_cles_noeud'),
      jsonldClesValeur: liste('jsonld_cles_valeur'),
      microdonneesTypes: expr('microdonnees_types'),
      microdonneesProps: liste('microdonnees_props').map(x => x.toLowerCase()),
      classesTemoignage: expr('classes_temoignage'),
      titresTemoignage: s.titres_temoignage ? (() => { try { return new RegExp(`^\\s*(?:${s.titres_temoignage})$`, 'iu'); } catch (e) { erreurs.push(`structure.titres_temoignage : expression invalide (${e.message.slice(0, 80)})`); return null; } })() : (erreurs.push('structure.titres_temoignage : expression attendue'), null),
      attribution: expr('attribution_en_ligne', 'u'),
      tagsPrixBarre: liste('tags_prix_barre'),
      classesPrixBarre: expr('classes_prix_barre'),
      decorationBarree: expr('decoration_barree'),
      montant: expr('montant'),
      classesCompteARebours: expr('classes_compte_a_rebours'),
      attributsCompteARebours: liste('attributs_compte_a_rebours').map(x => x.toLowerCase()),
    };
  }
  return sortie;
}
