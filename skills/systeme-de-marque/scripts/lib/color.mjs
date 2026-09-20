// lib/color.mjs — analyse de couleurs sans dépendance. SOURCE CANONIQUE (TF-0242).
// Parse hex / rgb / rgba / hsl / oklch, expose teinte, saturation, luminosité
// et le ratio de contraste WCAG. Utilisé par generer-design-md.mjs et, via le
// ré-export oracles/lib/color.mjs, par oracle-slop, oracle-tokens, oracle-taste
// et oracle-bascule.
//
// Pourquoi la lib vit ICI et pas sous oracles/lib : la synchronisation des skills
// (oracle-skills du pilot) copie le DOSSIER du skill, elle ne suit pas les imports
// qui en sortent. Une dépendance hors dossier n'existe pas dans la copie installée
// (ERR_MODULE_NOT_FOUND constaté le 15/08 — leçon K). Toute correction se fait ici,
// jamais dans le ré-export.

const NAMED = { black: [0, 0, 0], white: [255, 255, 255] };

/** Renvoie {r,g,b,a} ou null si non parsable (var(), currentColor, gradient…). */
export function parse(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();

  if (NAMED[s]) return { r: NAMED[s][0], g: NAMED[s][1], b: NAMED[s][2], a: 1 };

  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    const h = m[1];
    const ex = n => parseInt(n.length === 1 ? n + n : n, 16);
    if (h.length === 3 || h.length === 4)
      return { r: ex(h[0]), g: ex(h[1]), b: ex(h[2]), a: h.length === 4 ? ex(h[3]) / 255 : 1 };
    if (h.length === 6 || h.length === 8)
      return { r: ex(h.slice(0, 2)), g: ex(h.slice(2, 4)), b: ex(h.slice(4, 6)), a: h.length === 8 ? ex(h.slice(6, 8)) / 255 : 1 };
    return null;
  }

  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(v => v.endsWith('%') ? parseFloat(v) * 2.55 : parseFloat(v));
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? (p[3] > 1 ? p[3] / 100 : p[3]) : 1 };
  }

  m = /^hsla?\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    const h = parseFloat(p[0]), sa = parseFloat(p[1]) / 100, l = parseFloat(p[2]) / 100;
    if ([h, sa, l].some(Number.isNaN)) return null;
    const rgb = hslToRgb(h, sa, l);
    return { r: rgb[0], g: rgb[1], b: rgb[2], a: p[3] !== undefined ? parseFloat(p[3]) : 1 };
  }

  m = /^oklch\(([^)]+)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    let L = parseFloat(p[0]); if (p[0].endsWith('%')) L /= 100; else if (L > 1) L /= 100;
    const C = parseFloat(p[1]);
    const H = parseFloat(p[2]);
    if ([L, C, H].some(Number.isNaN)) return null;
    const rgb = oklchToRgb(L, C, H);
    return { r: rgb[0], g: rgb[1], b: rgb[2], a: p[3] !== undefined ? parseFloat(p[3]) : 1 };
  }

  return null; // color-mix, var(), currentColor : hors de portée déterministe
}

/**
 * OKLCH → sRGB, d'après CSS Color 4 §Oklab.
 * Sans cette conversion, aucun contraste n'est mesurable sur une palette issue du
 * corpus — qui est entièrement en OKLCH. T5 resterait mort en production.
 */
export function oklchToRgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;

  const lin = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  return lin.map(v => {
    const g = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, g)) * 255);
  });
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return t.map(v => Math.round((v + m) * 255));
}

/** {h: 0-360, s: 0-1, l: 0-1} depuis un rgb. */
export function hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s, l };
}

export function luminance({ r, g, b }) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(c1, c2) {
  const a = luminance(c1), b = luminance(c2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const RACCOURCI_STYLES = new Set(['none', 'hidden', 'dotted', 'dashed', 'solid', 'double',
  'groove', 'ridge', 'inset', 'outset']);
const RACCOURCI_LARGEURS = new Set(['thin', 'medium', 'thick']);
const estLargeurRaccourci = t => RACCOURCI_LARGEURS.has(t.toLowerCase())
  || /^-?\d*\.?\d+(px|em|rem|pt|cm|mm|in|pc|q|%)$/i.test(t);

/** Découpe sur les espaces, SAUF à l'intérieur d'une parenthèse (var(--x), rgb(...)). */
function tokeniserRaccourci(valeur) {
  const out = [];
  let buf = '', profondeur = 0;
  for (const ch of valeur) {
    if (ch === '(') profondeur++;
    if (ch === ')') profondeur--;
    if (/\s/.test(ch) && profondeur === 0) { if (buf) out.push(buf); buf = ''; }
    else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * Extrait la composante COULEUR d'un raccourci `border`/`outline` (« 2px solid var(--blue) »,
 * « 3px dashed #1d4ed8 ») en retirant largeur et style — dans CET ORDRE, TOUJOURS avant
 * `resoudreVar` : un raccourci n'est jamais lui-même une chaîne `var(...)` valide, et lui
 * laisser un raccourci intact revient à ne rien résoudre.
 *
 * TF-1108 (14/09/2026) — le boilerplate du socle digit-ai-page-html prescrit
 * `--focus-anneau: 2px solid var(--blue)` (le token PORTE tout le raccourci, pas seulement
 * la couleur) ; `oracle-tokens` T8 lisait cette valeur telle quelle et la jugeait illisible
 * après TF-1106 déjà, faute d'extraction du composant couleur. Une valeur à un seul
 * composant (pas de largeur ni de style détectés) est renvoyée TELLE QUELLE : ce n'est pas
 * un raccourci, `resoudreVar` la traite normalement. Une valeur dont PLUSIEURS composants
 * restent après avoir retiré largeur et style (ambiguïté — deux couleurs candidates, ou une
 * syntaxe non reconnue) est renvoyée telle quelle aussi : deviner serait pire que refuser.
 */
export function extraireCouleurRaccourci(valeur) {
  if (valeur == null) return valeur;
  const s = String(valeur).trim();
  const tokens = tokeniserRaccourci(s);
  if (tokens.length <= 1) return s;
  const reste = tokens.filter(t => !RACCOURCI_STYLES.has(t.toLowerCase()) && !estLargeurRaccourci(t));
  return reste.length === 1 ? reste[0] : s;
}

/**
 * Résout une chaîne `var(--x[, repli])` contre une liste de TABLES consultées dans
 * l'ordre (chaque table : une fonction nom-avec-tirets → valeur brute, ou undefined/null
 * si absente). Renvoie la valeur telle quelle si ce n'est pas un var(), ou `null` si la
 * chaîne ne résout vers rien (ni table, ni repli). Boucle bornée à 8 sauts pour qu'un
 * alias circulaire échoue proprement plutôt que de tourner.
 *
 * TF-1035 (11/09/2026) — `generer-design-md.mjs` refusait « couleur illisible pour
 * --accent : var(--blue) » sur tout tokens.css employant le groupe ALIAS que le contrat
 * de cette forge prescrit lui-même (references/tokens.md), et que son propre générateur
 * émet en `var(--cible)`. TF-1106 (14/09/2026) — la même non-résolution touchait
 * `oracle-tokens.mjs` T5/T8 : un `--focus-anneau: var(--blue)` ou une paire de contraste
 * nommée par alias étaient jugés « illisibles » plutôt que résolus. Une seule
 * implémentation ICI, consommée par les deux : jamais une seconde résolution qui
 * pourrait diverger.
 */
export function resoudreVar(valeur, tables, profondeur = 0) {
  if (valeur == null) return valeur;
  const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(String(valeur).trim());
  if (!m) return valeur;
  if (profondeur >= 8) return null; // chaîne d'alias trop longue ou circulaire
  for (const table of tables) {
    const brut = table(m[1]);
    if (brut !== undefined && brut !== null) return resoudreVar(brut, tables, profondeur + 1);
  }
  return m[2] !== undefined ? resoudreVar(m[2].trim(), tables, profondeur + 1) : null;
}

/**
 * Neutralise le contenu de chaque appel `var(...)` d'une valeur CSS — REPLI compris,
 * `var(--jeton, <repli>)` — avant toute recherche de couleur littérale dans le texte qui
 * l'entoure. Gère les parenthèses imbriquées (un repli peut lui-même contenir `var(...)`
 * ou `calc(...)`).
 *
 * TF-1123 (15/09/2026) — `oracle-tokens` T1 cherchait des couleurs littérales dans la
 * valeur ENTIÈRE d'une déclaration (`color: var(--muted, #475569)`) sans écarter
 * l'intérieur d'un `var()` : le repli n'est JAMAIS la couleur appliquée, il ne l'est que
 * si le jeton nommé est absent — un bloquant tombait sur la forme même que la règle
 * réclame (« passer par var(--token) »), et le seul geste qui l'éteignait était de
 * SUPPRIMER le repli, rendant le composant plus fragile. Même bibliothèque canonique que
 * `resoudreVar` (TF-1106) et `extraireCouleurRaccourci` (TF-1108) : une seule
 * implémentation, jamais une résolution parallèle qui pourrait diverger.
 */
export function neutraliserVar(valeur) {
  if (valeur == null) return valeur;
  const s = String(valeur);
  let out = '', i = 0;
  while (i < s.length) {
    if (s.startsWith('var(', i)) {
      let profondeur = 1, j = i + 4;
      while (j < s.length && profondeur > 0) {
        if (s[j] === '(') profondeur++;
        else if (s[j] === ')') profondeur--;
        j++;
      }
      i = j; // saute tout var(...), repli et parenthèses imbriquées compris
      continue;
    }
    out += s[i];
    i++;
  }
  return out;
}

/** Toutes les couleurs littérales trouvées dans un texte CSS, avec leur offset. */
export function findColors(text) {
  const out = [];
  const re = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|\boklch\([^)]*\)/g;
  let m;
  while ((m = re.exec(text))) {
    const c = parse(m[0]);
    if (c) out.push({ raw: m[0], index: m.index, ...c });
  }
  return out;
}
