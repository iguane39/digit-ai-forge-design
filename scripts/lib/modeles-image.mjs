// scripts/lib/modeles-image.mjs — LA LISTE DES MODÈLES D'IMAGE GEMINI EST UNE DONNÉE, PAS DU CODE
// (TF-2111, 04/11/2026 ; loi n° 4 de la Factory : une donnée volatile est une donnée, datée et sourcée).
//
// LE FAIT. La liste MODELES de generer-images.mjs, écrite de mémoire le 04/08/2026, portait au
// 03/11/2026 un modèle déprécié depuis le 28/05/2026 en tête de liste, deux modèles de repli
// « preview » ARRÊTÉS depuis le 25/06/2026 (un repli qui vise un modèle éteint ne répond jamais) et
// un modèle dont l'arrêt est annoncé au 15/03/2027. Les identifiants exacts ne sont pas recopiés
// ici : un identifiant arrêté écrit dans un fichier de code est un défaut pour `oracle-modeles-tiers.mjs`
// du pilot (MT1), citation de commentaire comprise. Le calendrier du fournisseur vit au pilot, dans
// `references/MODELES-TIERS.json` (TF-2109). Ce module lit le même fichier : la liste suit le
// calendrier, elle ne le recopie pas.
//
// CE QUE LE MODULE FAIT, sans réseau ni clé :
//   - référentiel joignable (le fichier du pilot, ou `--referentiel <fichier>`) : la liste est celle des
//     modèles d'image à l'état « courant », les préférés d'abord. Un déprécié ou un arrêté n'y entre pas.
//   - référentiel injoignable ou illisible : liste en dur, DATÉE et SOURCÉE (REPLI), et le dire.
//   - un modèle imposé par l'appelant (--modele) est vérifié au calendrier : arrêté = REFUSÉ, déprécié =
//     avertissement avec son remplaçant, absent du calendrier = avertissement (non vérifié).
// Il ne fait aucun appel à l'API : aucune dépense, aucune lecture de .env.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Ordre de préférence : le remplaçant courant d'abord, puis les paliers moins chers (le quota est par palier). */
export const PREFERES = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image', 'gemini-3-pro-image'];

/** Liste en dur, utilisée seulement si le référentiel du pilot est injoignable. À relire quand elle vieillit (MT4, 30 jours). */
export const REPLI = {
  lu_le: '2026-11-03',
  source: 'https://ai.google.dev/gemini-api/docs/deprecations.md.txt, section « Nano Banana models », relue le 03/11/2026 et recopiée dans references/MODELES-TIERS.json du pilot (TF-2109)',
  modeles: PREFERES,
};

const SCHEMA = 'pilot/modeles-tiers@1';
const JOURS_PERIME = 30;

/** Le fichier du référentiel : l'argument, sinon `<racine des forges>/digit-ai-factory/references/MODELES-TIERS.json`. */
export function cheminReferentiel({ explicite = null, env = process.env } = {}) {
  if (explicite) return explicite;
  const ici = path.dirname(fileURLToPath(import.meta.url));
  const depot = path.resolve(ici, '..', '..');
  const racine = env.FORGE_ROOT || path.dirname(depot);
  return path.join(racine, 'digit-ai-factory', 'references', 'MODELES-TIERS.json');
}

/** Lit le référentiel. Rend { ok: true, date, modeles } ou { ok: false, raison }. */
export function lireReferentiel(chemin) {
  if (!chemin || !fs.existsSync(chemin)) return { ok: false, raison: `référentiel introuvable : ${chemin}` };
  let j;
  try { j = JSON.parse(fs.readFileSync(chemin, 'utf8')); } catch (e) { return { ok: false, raison: `référentiel illisible : ${String(e.message).slice(0, 80)}` }; }
  if (j.schema !== SCHEMA) return { ok: false, raison: `schéma inattendu (${j.schema}) dans ${chemin}` };
  const modeles = j.fournisseurs?.gemini?.modeles;
  if (!Array.isArray(modeles) || !modeles.length) return { ok: false, raison: `aucun modèle gemini dans ${chemin}` };
  return { ok: true, date: j.date || null, modeles, chemin };
}

const joursEntre = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);

/**
 * Compose la liste des modèles à essayer, dans l'ordre.
 * Rend { modeles, source, date, avertissements[], refus }. `refus` non nul = l'appel doit s'arrêter.
 */
export function composerListe({ explicite = null, referentiel = null, aujourdhui = new Date().toISOString().slice(0, 10) } = {}) {
  const avertissements = [];
  let base;
  let source;
  let date;
  if (referentiel && referentiel.ok) {
    const courants = referentiel.modeles.filter(m => m.famille === 'image' && m.etat === 'courant').map(m => m.id);
    const rang = id => { const i = PREFERES.indexOf(id); return i === -1 ? PREFERES.length : i; };
    base = [...courants].sort((a, b) => rang(a) - rang(b));
    source = `référentiel du pilot (${referentiel.chemin})`;
    date = referentiel.date;
    if (!base.length) {
      avertissements.push('le référentiel ne porte aucun modèle d\'image à l\'état « courant » : liste en dur utilisée');
      base = [...REPLI.modeles]; source = `liste en dur du ${REPLI.lu_le}`; date = REPLI.lu_le;
    }
  } else {
    base = [...REPLI.modeles];
    source = `liste en dur du ${REPLI.lu_le} (${REPLI.source})`;
    date = REPLI.lu_le;
    avertissements.push(`${referentiel ? referentiel.raison : 'référentiel non cherché'} — liste en dur datée du ${REPLI.lu_le}, à recouper avec le calendrier du fournisseur`);
  }
  if (date && joursEntre(date, aujourdhui) > JOURS_PERIME) {
    avertissements.push(`la liste date du ${date} (${joursEntre(date, aujourdhui)} jours) : un modèle a pu être déprécié depuis, relire le calendrier du fournisseur`);
  }

  let refus = null;
  const modeles = [];
  if (explicite) {
    const connu = referentiel && referentiel.ok ? referentiel.modeles.find(m => m.id === explicite) : null;
    if (connu && connu.etat === 'arrete') {
      refus = `le modèle « ${explicite} » est ARRÊTÉ depuis le ${connu.arret || 'date inconnue'}`
        + (connu.remplacant ? ` : remplaçant « ${connu.remplacant} »` : '') + ' (calendrier du fournisseur, référentiel du pilot) — aucun appel n\'est fait';
    } else {
      if (connu && connu.etat === 'deprecie') {
        avertissements.push(`le modèle « ${explicite} » est déprécié${connu.arret ? ` (arrêt le ${connu.arret})` : ''}${connu.remplacant ? `, remplaçant « ${connu.remplacant} »` : ''}`);
      } else if (!connu) {
        avertissements.push(`le modèle « ${explicite} » est absent du calendrier lu : son état n'a pas été vérifié`);
      }
      modeles.push(explicite);
    }
  }
  for (const id of base) if (!modeles.includes(id)) modeles.push(id);
  return { modeles, source, date, avertissements, refus };
}
