// selecteurs.mjs — appariement élément ↔ règle CSS. UNE implémentation, partagée (TF-0921).
//
// LE FAIT. TF-0833 (05/09/2026) a corrigé dans `oracle-declencheurs.mjs` un appariement par
// JETON : il suffisait qu'un morceau du sélecteur — un nom de classe, un id, une balise — se
// retrouve n'importe où dedans pour que la règle compte. `.bouton.fantome { background:
// transparent }` tombait donc sur TOUS les `.bouton`, et la page entière se lisait en boutons
// fantômes ; le seul contournement connu était de renommer la classe, c'est-à-dire de plier
// l'écriture du CSS à un défaut du juge.
//
// Le 08/09, la même mécanique a été retrouvée INTACTE dans `oracle-surcouche.mjs` : deux
// implémentations divergentes du même geste, dont une déjà corrigée. Un élément y héritait
// d'une bordure venue d'une règle dont il ne portait qu'un jeton du sélecteur, et le contrôle
// passait POUR LA MAUVAISE RAISON — le pire des verdicts, parce qu'il ne se signale pas.
// D'où cette bibliothèque : la correction vit à UN endroit, et les deux oracles la partagent.
//
// LA RÈGLE. L'appariement se fait sur le DERNIER COMPOUND du sélecteur, celui qui désigne
// l'élément : TOUTES ses conditions doivent être tenues, jamais une seule. Les ancêtres
// (`.carte .bouton`) restent non vérifiés — l'arbre n'est pas remonté ici. C'est une
// approximation LARGE, déclarée au non_juge des deux oracles, mais plus jamais l'inverse
// d'une intersection.

/** Les classes portées par l'élément. */
export const classesDe = el => String((el.attrs && el.attrs.class) || '').split(/\s+/).filter(Boolean);

/** Les pseudo-classes d'ÉTAT : une règle qui n'existe qu'au survol n'habille pas le repos. */
export const ETAT = /:(hover|active|disabled|checked|visited|focus)/i;

// Les morceaux d'un compound : #id, .classe, [attribut], pseudo, balise.
const MORCEAUX = /::[\w-]+(?:\([^)]*\))?|:[\w-]+(?:\([^)]*\))?|\[[^\]]*\]|[.#][\w-]+|\*|[A-Za-z][\w-]*/g;

function attributTenu(el, morceau) {
  const m = /^\[\s*([-\w:]+)\s*(?:([~^$*|]?=)\s*["']?([^\]"']*)["']?\s*)?\]$/.exec(morceau);
  if (!m) return true; // forme non reconnue : ne pas inventer une exclusion
  const val = el.attrs ? el.attrs[m[1].toLowerCase()] : undefined;
  if (val === undefined) return false;
  if (!m[2]) return true; // présence seule
  const v = String(val);
  switch (m[2]) {
    case '=': return v === m[3];
    case '~=': return v.split(/\s+/).includes(m[3]);
    case '^=': return v.startsWith(m[3]);
    case '$=': return v.endsWith(m[3]);
    case '*=': return v.includes(m[3]);
    default: return v === m[3] || v.startsWith(m[3] + '-');
  }
}

/** L'élément satisfait-il TOUTES les conditions du compound qui le désigne ? */
export function correspond(el, part) {
  // Le dernier compound : ce qui suit le dernier combinateur (espace, >, +, ~).
  const dernier = String(part).trim().split(/\s*[>+~]\s*|\s+/).filter(Boolean).pop() || '';
  const classes = new Set(classesDe(el));
  const morceaux = dernier.match(MORCEAUX) || [];
  if (!morceaux.length) return false;
  for (const mo of morceaux) {
    if (mo === '*') continue;
    if (mo.startsWith('::') || mo.startsWith(':')) continue; // pseudo : non décidable ici
    if (mo.startsWith('.')) { if (!classes.has(mo.slice(1))) return false; continue; }
    if (mo.startsWith('#')) { if (String((el.attrs && el.attrs.id) || '') !== mo.slice(1)) return false; continue; }
    if (mo.startsWith('[')) { if (!attributTenu(el, mo)) return false; continue; }
    if (mo.toLowerCase() !== el.tag) return false; // nom de balise
  }
  return true;
}

/**
 * Les déclarations qui habillent l'élément, dans l'ordre des règles, le style en ligne en
 * dernier (il gagne). `pseudoElement` (par exemple '::backdrop') ne retient QUE les parts qui
 * le portent ; sans lui, les pseudo-éléments et les états sont écartés — une règle de survol
 * n'habille pas l'élément au repos.
 */
export function declarationsPour(el, regles, { pseudoElement = null } = {}) {
  const decls = new Map();
  for (const r of regles) {
    for (const part of String(r.selector).split(',')) {
      const s = part.trim();
      if (!s) continue;
      if (pseudoElement) { if (!s.includes(pseudoElement)) continue; }
      else if (s.includes('::') || ETAT.test(s)) continue;
      if (!correspond(el, s)) continue;
      for (const m of r.body.matchAll(/(^|[;{\s])([-\w]+)\s*:\s*([^;]+)/g)) decls.set(m[2].toLowerCase(), m[3].trim());
      break;
    }
  }
  for (const m of String((el.attrs && el.attrs.style) || '').matchAll(/(^|[;\s])([-\w]+)\s*:\s*([^;]+)/g)) {
    decls.set(m[2].toLowerCase(), m[3].trim());
  }
  return decls;
}
