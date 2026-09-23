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
// La racine des skills installés se RÉSOUT, dans l'ordre même du pilot (scripts/lib-config-installee.mjs
// de digit-ai-factory) : `FORGE_SKILLS_INSTALLES` d'abord — c'est ce qui permet à une recette de poser
// un socle d'ESSAI —, puis `CLAUDE_CONFIG_DIR/skills`, sinon `~/.claude/skills`. TF-1241 (22/09/2026) :
// figée sur le répertoire personnel, cette racine rendait la passe d'imputation IMPROUVABLE dès que le
// socle réel est propre — aucune fixture ne peut alors porter à la fois un sceau vérifié et des
// constats, et la fixture verte de TF-0830 avait perdu, le 15/09, tout ce qu'elle démontrait.
const RACINE_SKILLS = process.env.FORGE_SKILLS_INSTALLES
  || (process.env.CLAUDE_CONFIG_DIR ? path.join(process.env.CLAUDE_CONFIG_DIR, 'skills') : null)
  || path.join(os.homedir(), '.claude', 'skills');
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

// ── LA CHARTE DE POLICE DU SOCLE SE LIT DANS LE SOCLE (TF-1023, décision humaine D-11 (a) du 23/09/2026) ──
//
// LE FAIT. oracle-slop reconnaissait une page « au socle » à une paire de polices ÉCRITE ICI — Roboto
// en titres, DM Sans en corps — et exemptait ces deux familles de la règle S3. Le 23/09, le socle a
// pris les polices de la charte des présentations (Montserrat, Inter), sur la décision humaine D-5 (a)
// du 22/09 « la charte des présentations fait foi, les pages s'y alignent ». La paire écrite ici
// devenait un second domicile de la charte : chaque page neuve bâtie sur le socle aurait échoué S3,
// bancs compris, pour une police que le socle lui-même prescrit.
//
// LE REMÈDE. La paire se LIT dans le gabarit du socle INSTALLÉ, sous la même racine que les blocs
// embarqués ci-dessus : la page reconnue est celle qui déclare les mêmes familles de tête que le
// socle qui s'exécute sur ce poste. Jusqu'à la propagation du socle, c'est l'ancienne paire ;
// après, la nouvelle — le juge suit le socle au moment exact où les générateurs le suivent.
/** La paire de polices du socle installé : { head, sans, familles[], source }, ou null s'il est introuvable. */
export function charteDePoliceDuSocle(racine = RACINE_SKILLS) {
  const fichier = path.join(racine, 'digit-ai-page-html', 'assets', 'boilerplate.html');
  let txt;
  try { txt = fs.readFileSync(fichier, 'utf8'); } catch { return null; }
  const pile = (motif) => {
    const m = motif.exec(txt);
    return m ? m[1].split(',').map((x) => x.trim().replace(/^["']|["']$/g, '').toLowerCase()).filter(Boolean) : null;
  };
  const head = pile(/--head\s*:\s*([^;]+);/);
  const sans = pile(/--sans\s*:\s*([^;]+);/);
  if (!head || !sans) return null;
  return { head: head[0], sans: sans[0], familles: [...new Set([...head, ...sans])], source: fichier };
}
