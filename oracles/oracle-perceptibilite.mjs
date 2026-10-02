#!/usr/bin/env node
// oracle-perceptibilite — Domaine « Perceptibilité : une action nommée par une exigence se
// voit, se distingue et répond » (déterministe).
//
// TF-1219. La loi transverse n°1 du pilot (« toute affordance est câblée ou n'existe pas »)
// n'avait aucun contrôle de PERCEPTIBILITÉ parmi les neuf oracles de rendu de cette forge : un
// bouton présent dans le DOM et câblé (une ancre fonctionnelle, un gestionnaire attaché) mais
// INVISIBLE passait pour livré. Cas réel : un bouton « Panier » câblé, sans contraste ni taille
// ni position suffisants, déclaré « inactif » par un humain alors qu'il était techniquement
// fonctionnel — câblé n'est pas perceptible.
//
// Convention d'entrée (posée ici faute d'existant dans ce dépôt ou ses fixtures — ni
// EXIGENCES.json ni la fiche de cadrage dérivée de ce référentiel ne nomment, côté HTML,
// « quelle action correspond à quelle exigence ») : `data-exigence="<id>"` sur l'élément
// PORTEUR de l'action, <id> étant l'identifiant tel qu'il vit dans EXIGENCES.json
// (`exigences[].id`, schéma de redige-les-exigences/references/schema-referentiel.md). Cet
// oracle ne juge QUE les éléments qui portent cet attribut, non vide : une interface entière
// n'a pas à être couverte, seules les actions explicitement nommées par une exigence le sont —
// la loi n°1 porte sur l'affordance câblée, pas sur tout élément cliquable d'une page.
//
// Quatre règles, décidables sur le fichier seul :
//   PC1  position — ni display:none, ni visibility:hidden, ni hors-écran sans indice
//        (position absolute/fixed à ≥500px d'un bord, signe négatif), ni technique « sr-only »
//        (clip/clip-path) : ce que la page RETIRE de l'écran sans aucun rappel
//   PC2  taille — largeur ET hauteur déclarées ≥ 24×24px (WCAG 2.2 2.5.8, seuil minimal)
//   PC3  contraste — le composant lui-même tient le seuil que porte déjà oracle-tokens :
//        4.5:1 s'il porte du texte visible (même seuil que T5), 3:1 sinon, traité comme une
//        frontière/un fond d'interface (même seuil que T7)
//   PC4  retour visuel après activation — un état :hover/:focus(-visible/-within) qui change
//        au moins une facette visuelle, OU une mutation de classe/attribut/texte câblée en
//        script et référençant l'élément (id ou classe)
//
// Ce qui exige un rendu réel (position AU-DESSUS DE LA LIGNE DE FLOTTAISON après cascade,
// contraste composé, câblage effectif du clic) est déclaré non jugé et délégué — même doctrine
// que les neuf oracles voisins de cette forge.
//
// Ce que cet oracle NE juge PAS (déclaré en non_juge, jamais dupliqué) :
//   - l'existence et la validité de l'identifiant d'exigence dans EXIGENCES.json —
//     oracle-exigences / oracle-tracabilite, pas ce fichier ;
//   - le placement réel au-dessus de la ligne de flottaison (viewport initial après cascade,
//     aux largeurs de la grille) — render_page.py ;
//   - le câblage effectif du gestionnaire de clic (le clic fait-il quelque chose) — pan
//     « interface » de forge-tests ;
//   - la nature du déclencheur (bouton plein, lien, fantôme) — oracle-declencheurs ;
//   - la traçabilité des couleurs employées à un token déclaré — oracle-tokens T1 ;
//   - le contraste composé (opacité, superposition réelle) — render_page.py V2 ;
//   - la partie ANCÊTRE d'un sélecteur descendant — seul le dernier compound est confronté à
//     l'élément, l'arbre n'est pas remonté (lib/selecteurs.mjs, TF-0921).
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-perceptibilite.mjs <fichier.html> [--tokens tokens.css] [--json-only]

import fs from 'node:fs';
import { parse as parseHtml, elements, arbres, css, cssRulesDeep, visibleText } from './lib/html.mjs';
import { declarationsPour as declarationsDe, correspond } from './lib/selecteurs.mjs';
import { parse as color, contrast, resoudreVar } from './lib/color.mjs';

const DOM = 'Perceptibilité : une action nommée par une exigence se voit, se distingue et répond';
const args = process.argv.slice(2);
const iTokens = args.indexOf('--tokens');
const file = args.find((a, i) => !a.startsWith('--') && !(iTokens !== -1 && i === iTokens + 1));
const tokensArg = iTokens === -1 ? null : args[iTokens + 1];
const jsonOnly = args.includes('--json-only');

const NJ = [
  'existence et validité de l\'identifiant d\'exigence dans EXIGENCES.json (exigences[].id) — oracle-exigences / oracle-tracabilite, pas ce fichier',
  'placement réel au-dessus de la ligne de flottaison (viewport initial après cascade, aux largeurs de la grille) — render_page.py',
  'câblage effectif du gestionnaire de clic (le clic fait-il quelque chose) — pan « interface » de forge-tests',
  'nature du déclencheur (bouton plein, lien, fantôme) — oracle-declencheurs, non dupliqué ici',
  'traçabilité des couleurs employées à un token déclaré — oracle-tokens T1',
  'contraste composé (opacité, superposition réelle) — render_page.py V2',
  'partie ANCÊTRE d\'un sélecteur descendant — seul le dernier compound est confronté à l\'élément, l\'arbre n\'est pas remonté (lib/selecteurs.mjs, TF-0921)',
];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-perceptibilite', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'PC1–PC4 sans écart', where: file }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) { NJ.push('fichier absent'); sortir('SKIP', 2); }
if (!/\.html?$/i.test(file)) { NJ.push('cible non HTML'); sortir('SKIP', 2); }

const html = fs.readFileSync(file, 'utf8');
const root = parseHtml(html);
let cssText = css(html, root).replace(/\/\*[\s\S]*?\*\//g, ' ');
if (tokensArg && fs.existsSync(tokensArg)) {
  cssText = fs.readFileSync(tokensArg, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ') + '\n' + cssText;
}
const regles = cssRulesDeep(cssText).filter(r => !r.atRules.some(a => /\bprint\b/i.test(a)));
const declarationsPour = el => declarationsDe(el, regles);

// ── Les actions nommées par une exigence ───────────────────────────────────
const actions = [];
for (const [i, a] of arbres(html, root).entries()) {
  const provenance = i === 0 ? 'DOM statique' : 'gabarit JS';
  for (const el of elements(a)) {
    const exigence = el.attrs && el.attrs['data-exigence'];
    if (!exigence || !String(exigence).trim()) continue;
    actions.push({ el, exigence: String(exigence).trim(), provenance });
  }
}

if (actions.length === 0) {
  NJ.push('aucun élément ne porte data-exigence="<id>" dans ce document : PC1–PC4 sans objet (convention TF-1219)');
  sortir('SKIP', 2);
}

// ── Tokens pour la résolution des var(--jeton) — mêmes blocs que oracle-tokens ──
const tokensTable = new Map();
for (const r of regles) {
  if (!/^\s*:root\b/i.test(r.selector)) continue;
  for (const m of r.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) tokensTable.set(m[1], m[2].trim());
}
const resoudre = v => resoudreVar(v, [n => tokensTable.get(n)]);

// ── Ambiance (:root, html, body, *) — repli du fond/texte hérité, comme oracle-tokens ──
const ambiance = { fond: null, texte: null };
for (const r of regles) {
  if (!r.selector.split(',').some(s => /^\s*(:root|html|body|\*)\s*$/i.test(s))) continue;
  const mf = /(^|[;{\s])background(?:-color)?\s*:\s*([^;]+)/i.exec(r.body);
  if (mf) ambiance.fond = mf[2].trim();
  const mt = /(^|[;{\s])color\s*:\s*([^;]+)/i.exec(r.body);
  if (mt) ambiance.texte = mt[2].trim();
}

// ── PC1 · position et visibilité ─────────────────────────────────────────────
function motifCache(d) {
  const disp = d.get('display');
  if (disp && /^\s*none\b/i.test(disp)) return 'display: none';
  const vis = d.get('visibility');
  if (vis && /^\s*hidden\b/i.test(vis)) return 'visibility: hidden';
  const clip = d.get('clip');
  if (clip && /rect\(\s*0/i.test(clip)) return `clip: ${clip.trim()} — technique « sr-only », retire l'élément de l'écran`;
  const clipPath = d.get('clip-path');
  if (clipPath && /inset\(\s*50%/i.test(clipPath)) return `clip-path: ${clipPath.trim()} — technique « sr-only », retire l'élément de l'écran`;
  const pos = d.get('position');
  if (pos && /^(absolute|fixed)\b/i.test(pos)) {
    for (const p of ['left', 'right', 'top', 'bottom']) {
      const v = d.get(p);
      const m = v && /(-?[\d.]+)px/.exec(v);
      if (m && parseFloat(m[1]) <= -500) {
        return `position: ${pos.trim()}; ${p}: ${v.trim()} — hors de l'écran, sans aucun indice de rappel`;
      }
    }
  }
  return null;
}

// ── PC2 · taille minimale (WCAG 2.2 2.5.8, seuil AA « Minimum ») ────────────
const TAILLE_MIN = 24;
function dimensionDeclaree(d, props) {
  for (const p of props) {
    const v = d.get(p);
    const m = v && /([\d.]+)px/.exec(v);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

// ── PC3 · contraste du composant lui-même ───────────────────────────────────
function couleurResolue(valeur) {
  if (valeur === undefined || valeur === null) return null;
  const c = color(resoudre(valeur));
  return c && c.a === 1 ? c : null;
}

// ── PC4 · retour visuel après activation ────────────────────────────────────
const ETAT_VISUEL = /:(hover|focus|focus-visible|focus-within)\b/i;
const FACETTES = ['background', 'background-color', 'color', 'outline', 'outline-color',
  'box-shadow', 'border', 'border-color', 'transform', 'opacity'];

// Les déclarations d'un état visuel (:hover/:focus…) qui matchent l'élément — même mécanique
// que declarationsPour, mais SANS écarter les sélecteurs à pseudo-classe d'état : c'est
// justement eux qu'on veut lire ici. correspond() ignore de toute façon la condition de la
// pseudo-classe elle-même (non décidable sans navigateur) : ce qui compte est que le reste du
// compound (classe, id, balise) désigne bien l'élément.
function declsEtat(el) {
  const decls = new Map();
  for (const r of regles) {
    for (const part of String(r.selector).split(',')) {
      const s = part.trim();
      if (!ETAT_VISUEL.test(s)) continue;
      if (!correspond(el, s)) continue;
      for (const m of r.body.matchAll(/(^|[;{\s])([-\w]+)\s*:\s*([^;]+)/g)) decls.set(m[2].toLowerCase(), m[3].trim());
    }
  }
  return decls;
}

// Mutation de classe/attribut/texte câblée en script et référençant l'élément (id ou classe).
// Approximation TEXTUELLE déclarée en non_juge : elle prouve qu'un script référence l'élément
// ET mute quelque chose quelque part, jamais que ce clic précis déclenche cette mutation précise
// — même limite assumée que la détection de localStorage d'oracle-bascule ou du rechargement
// de document d'oracle-mobile M7.
const scripts = elements(root, 'script').flatMap(s => s.children.filter(c => c.tag === '#raw').map(c => c.text)).join('\n');
const MUTATION = /\.classList\s*\.\s*(add|remove|toggle)\s*\(|\.setAttribute\s*\(|\.textContent\s*=|\.innerHTML\s*=|\.className\s*=/;
function aMutationScriptee(el) {
  const id = el.attrs && el.attrs.id;
  const classes = String((el.attrs && el.attrs.class) || '').split(/\s+/).filter(Boolean);
  const refs = [];
  if (id) refs.push(new RegExp(`getElementById\\(\\s*['"\`]${id}['"\`]\\s*\\)|#${id}\\b`));
  for (const c of classes) refs.push(new RegExp(`querySelector(?:All)?\\(\\s*['"\`][^'"\`]*\\.${c}\\b|classList\\b[^;]*\\b${c}\\b`));
  if (!refs.length) return false;
  return refs.some(re => re.test(scripts)) && MUTATION.test(scripts);
}

// ── Passe par action nommée ───────────────────────────────────────────────────
for (const { el, exigence, provenance } of actions) {
  const d = declarationsPour(el);
  const libelle = (visibleText(el).map(t => t.text).join(' ').replace(/\s+/g, ' ').trim()
    || String(el.attrs['aria-label'] || '') || `<${el.tag}>`).slice(0, 40);
  const nomme = `« ${libelle} » (data-exigence="${exigence}")`;

  // PC1
  const cache = motifCache(d);
  if (cache) {
    add('bloquant', 'PC1',
      `${nomme} : ${cache} — une action nommée par une exigence doit être perceptible ou atteignable sans ambiguïté`,
      provenance);
  }

  // PC2
  const w = dimensionDeclaree(d, ['width', 'min-width']);
  const h = dimensionDeclaree(d, ['height', 'min-height']);
  if (w !== null && w < TAILLE_MIN) add('bloquant', 'PC2', `${nomme} : largeur ${w}px < ${TAILLE_MIN}px (WCAG 2.2 2.5.8)`, provenance);
  if (h !== null && h < TAILLE_MIN) add('bloquant', 'PC2', `${nomme} : hauteur ${h}px < ${TAILLE_MIN}px (WCAG 2.2 2.5.8)`, provenance);
  if (w === null && h === null) {
    NJ.push(`PC2 : ${nomme} ne déclare aucune largeur/hauteur — taille rendue non décidable sur le fichier, déléguer à render_page.py`);
  }

  // PC3
  const texteVisible = visibleText(el).some(t => t.text.trim());
  const seuil = texteVisible ? 4.5 : 3;
  const fg = couleurResolue(d.get('color')) || (texteVisible ? couleurResolue(ambiance.texte) : null);
  const bg = couleurResolue(d.get('background') ?? d.get('background-color')) || couleurResolue(ambiance.fond);
  if (fg && bg) {
    const ratio = contrast(fg, bg);
    if (ratio < seuil) {
      add('bloquant', 'PC3',
        `${nomme} : contraste ${ratio.toFixed(2)}:1 < ${seuil}:1 ${texteVisible ? '(texte, seuil de oracle-tokens T5)' : '(composant d\'interface, seuil de oracle-tokens T7)'}`,
        provenance);
    }
  } else {
    NJ.push(`PC3 : ${nomme} — couleur et/ou fond non résolus statiquement (héritage réel, composition) : contraste non mesuré ici`);
  }

  // PC4
  const etat = declsEtat(el);
  const changeAEtat = FACETTES.some(f => etat.has(f) && etat.get(f) !== d.get(f));
  const mutationScriptee = aMutationScriptee(el);
  if (!changeAEtat && !mutationScriptee) {
    add('bloquant', 'PC4',
      `${nomme} : aucun retour visuel détecté après activation — ni :hover/:focus(-visible) qui change une facette visuelle, ni mutation de classe/attribut/texte câblée en script et référençant l'élément`,
      provenance);
  }
}

// ── Verdict ────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) {
  process.stderr.write(durs.length
    ? `FAIL — ${durs.length} écart(s) dur(s) sur ${actions.length} action(s) nommée(s)\n`
    : `PASS — ${actions.length} action(s) nommée(s), PC1–PC4 sans écart\n`);
}
if (durs.length) sortir('FAIL', 1);
sortir('PASS', 0);
