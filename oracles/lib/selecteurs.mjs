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

// ── TF-1774 · LA CASCADE, quand un oracle la demande ─────────────────────────
// LE FAIT (lot Produit-83 du 15/10/2026). `declarationsPour` lit les règles dans l'ordre du
// fichier et ne remonte pas les ancêtres : la couleur d'un `a.btn` du corps était lue dans
// `.pied a` (le pied de page), et oracle-perceptibilite mesurait 1,22:1 à tort. Les fonctions
// ci-dessous appliquent ce que le navigateur applique : le sélecteur ENTIER (combinateurs
// descendant, enfant, frère adjacent et frère suivant, sur les liens parent du parseur), puis
// la spécificité, puis l'ordre, avec `!important` au-dessus. `declarationsPour` reste tel quel
// pour ses autres consommateurs, dont les recettes reposent sur son approximation déclarée.

/** Découpe un sélecteur en compounds et combinateurs, sans casser [..] ni (..). */
export function decouper(part) {
  const compounds = [], combinateurs = [];
  let cour = '', prof = 0, comb = null;
  const pousser = () => {
    if (!cour.trim()) return;
    if (compounds.length) combinateurs.push(comb || ' ');
    compounds.push(cour.trim()); cour = ''; comb = null;
  };
  for (const ch of String(part).trim()) {
    if (ch === '[' || ch === '(') prof++;
    if (ch === ']' || ch === ')') prof--;
    if (prof === 0 && (ch === '>' || ch === '+' || ch === '~')) { pousser(); comb = ch; continue; }
    if (prof === 0 && /\s/.test(ch)) { pousser(); continue; }
    cour += ch;
  }
  pousser();
  return { compounds, combinateurs };
}

/** Spécificité [ids, classes|attributs|pseudo-classes, balises|pseudo-éléments]. */
export function specificite(part) {
  const s = [0, 0, 0];
  for (const c of decouper(part).compounds) {
    for (const mo of c.match(MORCEAUX) || []) {
      if (mo === '*') continue;
      if (/^:where\(/i.test(mo)) continue;
      if (mo.startsWith('#')) s[0]++;
      else if (mo.startsWith('.') || mo.startsWith('[')) s[1]++;
      else if (mo.startsWith('::')) s[2]++;
      else if (mo.startsWith(':')) s[1]++;
      else s[2]++;
    }
  }
  return s;
}

const enfantsElements = p => (p && p.children ? p.children.filter(n => n.tag && !n.tag.startsWith('#')) : []);

function tient(el, compounds, combinateurs, i) {
  if (!el || !el.tag || el.tag.startsWith('#')) return false;
  if (!correspond(el, compounds[i])) return false;
  if (i === 0) return true;
  const comb = combinateurs[i - 1];
  if (comb === '>') return tient(el.parent, compounds, combinateurs, i - 1);
  if (comb === ' ') {
    for (let a = el.parent; a && a.tag !== '#root'; a = a.parent) if (tient(a, compounds, combinateurs, i - 1)) return true;
    return false;
  }
  const freres = enfantsElements(el.parent);
  const rang = freres.indexOf(el);
  if (comb === '+') return rang > 0 && tient(freres[rang - 1], compounds, combinateurs, i - 1);
  for (let k = rang - 1; k >= 0; k--) if (tient(freres[k], compounds, combinateurs, i - 1)) return true; // '~'
  return false;
}

/** L'élément satisfait-il le sélecteur ENTIER, ancêtres et frères compris ? */
export function correspondEnCascade(el, part) {
  const { compounds, combinateurs } = decouper(part);
  if (!compounds.length) return false;
  return tient(el, compounds, combinateurs, compounds.length - 1);
}

const plusFort = (a, b) => {
  if (a.imp !== b.imp) return a.imp > b.imp;
  for (let k = 0; k < 4; k++) if (a.spec[k] !== b.spec[k]) return a.spec[k] > b.spec[k];
  return a.ordre > b.ordre;
};

/**
 * Les déclarations qui habillent l'élément AU REPOS après cascade : sélecteur entier, puis
 * !important, spécificité, ordre ; le style en ligne compte comme une spécificité maximale.
 * Mêmes exclusions que declarationsPour (pseudo-éléments et états écartés).
 */
export function declarationsEnCascade(el, regles) {
  const gagnantes = new Map();
  let ordre = 0;
  const proposer = (prop, val, spec) => {
    ordre++;
    const imp = /!\s*important\s*$/i.test(val) ? 1 : 0;
    const cand = { val: val.replace(/\s*!\s*important\s*$/i, '').trim(), imp, spec, ordre };
    const actuelle = gagnantes.get(prop);
    if (!actuelle || plusFort(cand, actuelle)) gagnantes.set(prop, cand);
  };
  for (const r of regles) {
    let meilleure = null;
    for (const part of String(r.selector).split(',')) {
      const s = part.trim();
      if (!s || s.includes('::') || ETAT.test(s)) continue;
      if (!correspondEnCascade(el, s)) continue;
      const sp = specificite(s);
      if (!meilleure || sp[0] > meilleure[0] || (sp[0] === meilleure[0] && (sp[1] > meilleure[1] || (sp[1] === meilleure[1] && sp[2] > meilleure[2])))) meilleure = sp;
    }
    if (!meilleure) continue;
    for (const m of r.body.matchAll(/(^|[;{\s])([-\w]+)\s*:\s*([^;]+)/g)) proposer(m[2].toLowerCase(), m[3].trim(), [0, ...meilleure]);
  }
  for (const m of String((el.attrs && el.attrs.style) || '').matchAll(/(^|[;\s])([-\w]+)\s*:\s*([^;]+)/g)) {
    proposer(m[2].toLowerCase(), m[3].trim(), [1, 0, 0, 0]);
  }
  const decls = new Map();
  for (const [p, c] of gagnantes) decls.set(p, c.val);
  return decls;
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
