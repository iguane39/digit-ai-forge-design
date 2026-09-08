// lib/socle.mjs — reconnaissance des blocs `COMPOSANT-EMBARQUE` du socle digit-ai-page-html.
//
// TF-0830 (lot Produit-12, 06/09/2026). Trois pages NEUVES et conformes — `check_html` PASS
// sur 36 règles, `render_page` PASS aux quatre largeurs — sortaient de `run-oracles-design`
// en FAIL avec 19 à 20 écarts durs CHACUNE (T1 couleurs en dur `#fff` / `#f6f8fc`, T3
// espacements hors échelle 4pt, T8 focus posés, S4 couleur pure). Les vingt étaient portés
// par le MÊME composant du socle, `table-filters.css`, embarqué dans la page par le poseur
// du socle et NON MODIFIABLE localement : la parité d'asset (`oracle-parite-assets`) refuse
// justement qu'on l'édite sur place. Une fois le CSS de l'auteur corrigé, la liste hors
// socle était vide sur les trois pages. Un juge qui refuse ce que l'auteur n'a pas le droit
// de changer n'apprend rien à personne : il apprend à ignorer le juge.
//
// Ce module reconnaît ces blocs et dit lesquels sont VÉRIFIÉS, c'est-à-dire scellés par une
// empreinte qui correspond bel et bien à la source du socle installée sur le poste. Un bloc
// déclaré mais non vérifiable — socle absent, empreinte fausse, copie éditée sur place —
// n'est PAS exempté : sans quoi le marqueur deviendrait une porte de sortie, et il suffirait
// d'entourer son propre CSS de deux commentaires pour ne plus être jugé.
//
// Contrat de marquage (source : digit-ai-page-html/scripts/embarquer-composants.mjs) :
//   <!-- COMPOSANT-EMBARQUE:DEBUT <fichier> [socle=<chemin/relatif>] … -->
//   <style|script data-composant="<fichier>" data-empreinte="sha256:…">…</style|script>
//   <!-- COMPOSANT-EMBARQUE:FIN <fichier> -->

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const SOCLE_DEFAUT = 'digit-ai-page-html/assets';
const RACINE_SKILLS = path.join(os.homedir(), '.claude', 'skills');
const RE_DEBUT = /<!--\s*COMPOSANT-EMBARQUE:DEBUT\s+([A-Za-z0-9._-]+)(?:\s+socle=([A-Za-z0-9._/-]+))?/g;

export const sha = txt => crypto.createHash('sha256').update(txt, 'utf8').digest('hex');

// L'ÉCHAPPEMENT N'EST PAS UN DÉTAIL : `</script` à l'intérieur d'un `<script>` fermerait le
// bloc de la page hôte. Le poseur du socle l'échappe à la copie — c'est la SEULE
// transformation admise entre la source et le bloc embarqué, et on la refait ici à
// l'identique pour comparer. On ne l'INVERSE jamais : une source peut déjà contenir la
// séquence échappée (c'est le cas de source-reader.js), et l'inversion la casserait.
const echapper = txt => txt.replace(/<\/script/gi, '<\\/script');

// Comparaison à la ligne près, pas à l'octet : la copie vit dans un dépôt git qui peut la
// livrer en CRLF, la source vit hors dépôt. L'empreinte, elle, reste calculée sur la SOURCE
// telle qu'elle est sur le disque — c'est elle qui scelle, pas la comparaison de texte.
const lignesLf = txt => txt.replace(/\r\n/g, '\n');

/** Bornes des blocs marqués d'un HTML : { nom, socle, debut, fin } (offsets d'octets). */
export function blocsMarques(html) {
  const trouves = [];
  RE_DEBUT.lastIndex = 0;
  let m;
  while ((m = RE_DEBUT.exec(html)) !== null) {
    const nom = m[1];
    const marqueFin = `<!-- COMPOSANT-EMBARQUE:FIN ${nom} -->`;
    const j = html.indexOf(marqueFin, m.index);
    // Un marqueur d'ouverture sans sa fermeture n'est pas un bloc : le dire plutôt que de
    // deviner sa borne — une borne devinée exempterait du contenu voisin.
    trouves.push({ nom, socle: m[2] || SOCLE_DEFAUT, debut: m.index, fin: j < 0 ? -1 : j + marqueFin.length });
  }
  return trouves;
}

/**
 * Les blocs du socle d'une page, partagés en `verifies` (exemptables) et `declares`
 * (marqués mais non vérifiables — jugés comme le CSS de l'auteur, avec leur raison).
 */
export function blocsDuSocle(html) {
  const verifies = [];
  const declares = [];
  for (const bloc of blocsMarques(html)) {
    if (bloc.fin < 0) {
      declares.push({ ...bloc, raison: 'marqueur de fin absent : bornes du bloc indécidables' });
      continue;
    }
    const tranche = html.slice(bloc.debut, bloc.fin);
    const b = /<(style|script)([^>]*)>([\s\S]*?)<\/\1\s*>/i.exec(tranche);
    if (!b) {
      declares.push({ ...bloc, raison: 'aucun <style> ni <script> entre les marqueurs' });
      continue;
    }
    const empreinte = (/data-empreinte\s*=\s*["']sha256:([0-9a-f]{64})["']/i.exec(b[2]) || [])[1];
    const composant = (/data-composant\s*=\s*["']([^"']+)["']/i.exec(b[2]) || [])[1];
    if (!empreinte || composant !== bloc.nom) {
      declares.push({ ...bloc, raison: 'bloc sans data-empreinte sha256 exploitable, ou data-composant qui ne nomme pas le bloc' });
      continue;
    }
    const source = path.join(RACINE_SKILLS, bloc.socle, bloc.nom);
    if (!fs.existsSync(source)) {
      declares.push({ ...bloc, empreinte, raison: `source du socle introuvable (${source}) : le sceau n'a pas pu être confronté` });
      continue;
    }
    const texte = fs.readFileSync(source, 'utf8');
    if (sha(texte) !== empreinte) {
      declares.push({ ...bloc, empreinte, raison: `empreinte déclarée ≠ empreinte de la source du socle (${sha(texte).slice(0, 12)}…)` });
      continue;
    }
    const attendu = (b[1].toLowerCase() === 'script' ? echapper(texte) : texte).replace(/\n+$/, '');
    const corps = b[3].replace(/^\r?\n/, '').replace(/\r?\n$/, '');
    if (lignesLf(corps) !== lignesLf(attendu)) {
      declares.push({ ...bloc, empreinte, raison: 'copie éditée sur place : le bloc ne correspond plus à la source qu\'il déclare' });
      continue;
    }
    verifies.push({ ...bloc, empreinte, source });
  }
  return { verifies, declares };
}

/**
 * Copie du HTML dont les blocs donnés sont vidés, EN CONSERVANT le nombre de lignes :
 * les numéros de ligne des findings restent ceux du fichier réel.
 */
export function neutraliser(html, blocs) {
  let out = html;
  // De la fin vers le début : les offsets des blocs précédents restent valides.
  for (const bloc of [...blocs].sort((a, b) => b.debut - a.debut)) {
    const tranche = out.slice(bloc.debut, bloc.fin);
    out = out.slice(0, bloc.debut) + '\n'.repeat((tranche.match(/\n/g) || []).length) + out.slice(bloc.fin);
  }
  return out;
}
