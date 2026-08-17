#!/usr/bin/env node
// generer-tokens-css — transforme une source de tokens W3C DTCG (format stable
// 2025.10, https://www.designtokens.org/tr/drafts/format/) en tokens.css.
//
// Zéro dépendance npm : ce n'est pas un moteur générique façon Style Dictionary,
// juste la transformation nécessaire à CE fichier de tokens (groupes couleur
// clair/sombre, typographie, rayon, espacement, alias). Le fichier DTCG devient
// la SOURCE ; tokens.css devient une SORTIE dérivée, jamais éditée à la main.
//
// oracle-dtcg.mjs importe `genererCss` pour vérifier qu'un tokens.css livré est
// bien la régénération de sa source — c'est la même fonction des deux côtés,
// donc aucun risque de dérive entre « ce que le générateur produit » et « ce que
// l'oracle attend ».
//
// Usage CLI : node generer-tokens-css.mjs <source.tokens.json> --sortie <tokens.css>

import { readFileSync, writeFileSync } from 'node:fs';

/** Un token « feuille » DTCG porte $value (objet). Les groupes n'en portent pas. */
export function estFeuille(noeud) {
  return noeud && typeof noeud === 'object' && '$value' in noeud;
}

/** Une feuille est un alias si sa valeur est la syntaxe {chemin.pointille}. */
export function estAlias(noeud) {
  return estFeuille(noeud) && typeof noeud.$value === 'string' && /^\{[^{}]+\}$/.test(noeud.$value.trim());
}

/** Résout un chemin pointillé "a.b.c" depuis la racine du document DTCG. */
export function resoudreChemin(racine, chemin) {
  const segments = chemin.split('.');
  let courant = racine;
  for (const seg of segments) {
    if (courant == null || typeof courant !== 'object' || !(seg in courant)) return null;
    courant = courant[seg];
  }
  return courant;
}

/** Liste les [chemin, noeud] de toutes les feuilles sous un groupe. */
export function feuillesDe(groupe, prefixe = []) {
  if (!groupe || typeof groupe !== 'object') return [];
  if (estFeuille(groupe)) return [[prefixe.join('.'), groupe]];
  const out = [];
  for (const [k, v] of Object.entries(groupe)) {
    if (k.startsWith('$')) continue;
    out.push(...feuillesDe(v, [...prefixe, k]));
  }
  return out;
}

const GENERIQUES = new Set(['system-ui', '-apple-system', 'sans-serif', 'serif', 'monospace',
  'ui-monospace', 'ui-sans-serif', 'ui-serif']);

function pileDePolices(valeur) {
  const items = Array.isArray(valeur) ? valeur : [valeur];
  return items.map(n => (GENERIQUES.has(n) ? n : `"${n}"`)).join(', ');
}

function valeurCss(noeud) {
  if (noeud.$type === 'fontFamily') return pileDePolices(noeud.$value);
  if (noeud.$type === 'cubicBezier') {
    const p = noeud.$value;
    if (!Array.isArray(p) || p.length !== 4) throw new Error('token cubicBezier attend quatre nombres');
    return `cubic-bezier(${p.join(', ')})`;
  }
  return String(noeud.$value);
}

function blocCouleurs(groupe, indent = '  ') {
  return Object.entries(groupe || {})
    .filter(([k]) => !k.startsWith('$'))
    .map(([nom, noeud]) => `${indent}--${nom}: ${valeurCss(noeud)};`)
    .join('\n');
}

/**
 * Transforme un document DTCG (déjà parsé) en tokens.css.
 * Contrat de groupes attendu (voir corpus/tokens-digit-ai.tokens.json) :
 *   couleur.clair, couleur.sombre, typographie, rayon, espacement, mouvement, alias.
 * `mouvement` est émis SEULEMENT s'il est présent dans la source : une source
 * antérieure à TF-0321 se régénère donc à l'octet près, et oracle-dtcg D3 ne
 * requalifie aucun tokens.css existant.
 * Un alias { "$value": "{couleur.clair.bg}" } devient `var(--bg)` : le dernier
 * segment du chemin porte le nom de la custom property, quel que soit le thème
 * référencé dans la source — la résolution réelle se fait au runtime CSS via
 * la cascade des blocs de thème, pas à la génération.
 */
export function genererCss(dtcg) {
  const preambule = dtcg.$description
    ? dtcg.$description.split('\n').map(l => ` * ${l}`).join('\n')
    : ' * Généré depuis une source DTCG.';

  const clair = dtcg.couleur?.clair || {};
  const sombre = dtcg.couleur?.sombre || {};
  const typo = dtcg.typographie || {};
  const rayon = dtcg.rayon || {};
  const espacement = dtcg.espacement || {};
  const mouvement = dtcg.mouvement || {};
  const alias = dtcg.alias || {};

  const lignesAlias = Object.entries(alias).map(([nom, noeud]) => {
    if (!estAlias(noeud)) throw new Error(`alias « ${nom} » sans référence {chemin} exploitable`);
    const chemin = noeud.$value.trim().slice(1, -1);
    if (resoudreChemin(dtcg, chemin) == null) throw new Error(`alias « ${nom} » référence un chemin introuvable : ${chemin}`);
    const cible = chemin.split('.').pop();
    return `  --${nom}: var(--${cible});`;
  }).join('\n');

  const lignesTypo = Object.entries(typo).map(([nom, noeud]) => `  --${nom}: ${valeurCss(noeud)};`).join('\n');
  const lignesRayon = Object.entries(rayon).map(([nom, noeud]) => `  --${nom}: ${valeurCss(noeud)};`).join('\n');
  const lignesEspace = Object.entries(espacement).map(([nom, noeud]) => `  --${nom}: ${valeurCss(noeud)};`).join('\n');

  // Le mouvement se prescrit là où il se juge : ce bloc est ce que oracle-motion
  // R4/R8/R9 lisent pour résoudre les durées d'une feuille (TF-0321). Groupe absent
  // ⇒ bloc absent, à l'octet près : la sortie d'une source antérieure ne bouge pas.
  const blocMouvement = Object.keys(mouvement).filter(k => !k.startsWith('$')).length
    ? `\n  /* --- Mouvement : durées par taille de geste, easings nommés, seuils (oracle-motion R4/R8/R9) --- */\n`
      + Object.entries(mouvement).filter(([k]) => !k.startsWith('$'))
        .map(([nom, noeud]) => `  --${nom}: ${valeurCss(noeud)};`).join('\n') + '\n'
    : '';

  const sombreUneLigle = Object.entries(sombre).filter(([k]) => !k.startsWith('$'))
    .map(([nom, noeud]) => `--${nom}: ${valeurCss(noeud)};`).join(' ');
  const clairUneLigne = Object.entries(clair).filter(([k]) => !k.startsWith('$'))
    .map(([nom, noeud]) => `--${nom}: ${valeurCss(noeud)};`).join(' ');

  return `/* tokens.css — DÉRIVÉ, ne pas éditer à la main.
 * Source unique : corpus/tokens-digit-ai.tokens.json (format W3C DTCG, stable 2025.10).
 * Régénérer : node scripts/generer-tokens-css.mjs corpus/tokens-digit-ai.tokens.json --sortie corpus/tokens-digit-ai.css
 * Vérifié par : node oracles/oracle-dtcg.mjs corpus/tokens-digit-ai.tokens.json corpus/tokens-digit-ai.css
 *
${preambule}
 */

:root {
  /* --- Couleurs, thème clair (référence) --- */
${blocCouleurs(clair)}

  /* --- Typographie --- */
${lignesTypo}

  /* --- Rayons --- */
${lignesRayon}

  /* --- Alias au nommage de la forge (oracle-tokens T5 résout les paires par le nom) --- */
${lignesAlias}

  /* --- Échelle d'espacement 4pt (oracle-tokens T3) --- */
${lignesEspace}
${blocMouvement}}

/* --- Thème sombre, dérivé --- */
@media (prefers-color-scheme: dark) {
  :root {
${blocCouleurs(sombre)}
  }
}

:root[data-theme="dark"] { ${sombreUneLigle} }

:root[data-theme="light"] { ${clairUneLigne} }
`;
}

// ---- CLI --------------------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1]?.endsWith('generer-tokens-css.mjs')) {
  const args = process.argv.slice(2);
  const entree = args.find(a => !a.startsWith('--'));
  const sortie = args.includes('--sortie') ? args[args.indexOf('--sortie') + 1] : null;
  if (!entree || !sortie) {
    console.error('usage : node generer-tokens-css.mjs <source.tokens.json> --sortie <tokens.css>');
    process.exit(1);
  }
  try {
    const dtcg = JSON.parse(readFileSync(entree, 'utf8'));
    const css = genererCss(dtcg);
    writeFileSync(sortie, css, 'utf8');
    console.log(`tokens.css généré : ${sortie} (source : ${entree})`);
  } catch (e) {
    console.error(`génération impossible : ${e.message}`);
    process.exit(1);
  }
}
