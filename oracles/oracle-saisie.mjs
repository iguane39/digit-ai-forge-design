#!/usr/bin/env node
// oracle-saisie — Domaine « Champs de saisie : TYPÉ, PROPOSÉ, BORNÉ, ATTEIGNABLE » (déterministe).
//
// TF-0736 + TF-0739 (lots Produit-12 des 31/08 et 01/09, retours utilisateur captures à
// l'appui). Deux retours en deux jours sur LE MÊME composant d'un écran livré ET audité :
// la campagne de tests le mesurait « câblé » (interface 233/235) et il l'était — l'affordance
// existait. Ce qui manquait n'était mesuré par aucun référentiel :
//   1. la VALEUR : deux <input type="date"> rendus vides alors que le système connaissait la
//      dernière position de lecture, affichée en texte à trois lignes des champs ;
//   2. la BORNE : « Jusqu'au » acceptait une date future ;
//   3. la PROMESSE : le texte d'aide annonçait « la période part de la … » — jamais câblé ;
//   4. la CIBLE DE GESTE : sur un input date natif, seul le clic sur l'icône de vingt pixels
//      au bord droit ouvre le sélecteur ; le corps du champ — la quasi-totalité de sa surface
//      — place un curseur de saisie. « Vu la taille du composant, personne ne pense à cliquer
//      tout à droite. »
// Le même dépôt portait le bon motif ailleurs (trois écrans de stats préremplissaient leurs
// dates) mais sans borne max : deux conventions dans un produit, aucun référentiel pour
// trancher. Cet oracle tranche, et se mesure — attributs et câblage, pas jugement.
//
// Six règles, décidables sur le fichier seul :
//   SA1  TYPÉ       — un champ dont le sens désigne un format connu (date, e-mail, téléphone,
//                     URL, nombre, mot de passe, heure, couleur) est rendu avec le type d'entrée
//                     natif correspondant, jamais en type=text. Échappatoire déclarée :
//                     data-type-motive="<raison>".
//   SA2  PROPOSÉ    — tout champ temporel (date, datetime-local, month, week, time) porte la
//                     meilleure hypothèse du système : attribut value, data-defaut, ou une
//                     valeur posée sur CE champ par le JS inline. Le vide qui a un sens se
//                     déclare : data-vide-motive="<raison>".
//   SA3  BORNÉ      — tout champ temporel ou numérique porte au moins une borne (min/max) posée
//                     par le sens ; aucune borne est bloquant, une seule borne est un
//                     avertissement levé par data-borne-motive="<raison>".
//   SA4  PROMESSE   — une promesse de valeur ou de borne écrite dans l'aide du champ (label,
//                     aria-describedby, encart d'aide voisin) est CÂBLÉE dans le champ.
//                     Une promesse non câblée n'existe pas (loi transverse n° 1).
//   SA5  ATTEIGNABLE (surface) — la cible de geste couvre TOUT le composant : un geste global
//                     appelle showPicker() depuis un écouteur de clic sur les champs temporels.
//                     Sans lui, la surface utile du composant se réduit à l'icône native.
//   SA6  ATTEIGNABLE (clavier) — le mode de saisie alternatif reste ouvert : pas de readonly
//                     posé sur un champ temporel pour forcer le sélecteur, pas de preventDefault
//                     dans un écouteur keydown qui confisquerait la frappe.
//
// Ce que cet oracle NE juge PAS (déclaré en non_juge, jamais supposé) :
//   - la JUSTESSE de la valeur proposée (fin de période = aujourd'hui, début = dernière position
//     connue sinon profondeur métier 1/3/6 mois) : la présence est décidable, la pertinence non ;
//   - la surface de geste RÉELLE en pixels : mesurable au rendu seulement (render_page.py) ;
//   - la garde serveur symétrique des bornes : hors périmètre d'un fichier HTML ;
//   - les champs rendus par un script externe (src=…) ou un framework ;
//   - le support navigateur effectif de showPicker() et son refus hors geste utilisateur.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-saisie.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import { parse as parseHtml, elements, walk, arbres } from './lib/html.mjs';

const DOM = 'Champs de saisie : typé, proposé, borné, atteignable';
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');

const NON_JUGE = [
  'justesse de la valeur proposée (fin de période = aujourd\'hui, début = dernière position connue sinon profondeur métier justifiée) — la présence est décidable sur le fichier, la pertinence métier non',
  'surface de geste réelle en pixels — mesurable au rendu seulement (render_page.py) ; cet oracle juge le câblage du geste, pas sa géométrie rendue',
  'garde serveur symétrique des bornes min/max — hors périmètre d\'un fichier HTML autonome, à exiger au contrat du produit',
  'champs rendus par un <script src="…"> externe ou un framework (React/Vue/Web Components) — analyse statique limitée au DOM et au JS inline',
  'support navigateur effectif de showPicker() et son refus hors geste utilisateur — comportement runtime, non observable sur le fichier',
];

const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-saisie', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'SA1–SA6 sans écart', where: file }],
    non_juge: NON_JUGE,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) sortir('SKIP', 2);
if (!/\.html?$/i.test(file)) sortir('SKIP', 2);

const html = fs.readFileSync(file, 'utf8');
const root = parseHtml(html);

// ── JS inline (les scripts externes sont hors périmètre, et c'est dit) ──────
const scriptsInline = [];
for (const s of elements(root, 'script')) {
  if (s.attrs && Object.prototype.hasOwnProperty.call(s.attrs, 'src')) continue;
  for (const c of s.children) if (c.tag === '#raw') scriptsInline.push(c.text);
}
const JS = scriptsInline.join('\n');
if (elements(root, 'script').some(s => s.attrs && Object.prototype.hasOwnProperty.call(s.attrs, 'src'))) {
  NON_JUGE.push('au moins un <script src="…"> détecté : son contenu n\'est pas analysé (valeur proposée ou geste éventuellement portés par lui)');
}

// ── Outillage de lecture ───────────────────────────────────────────────────
const at = (el, k) => (el.attrs && el.attrs[k] != null ? String(el.attrs[k]) : '');
const aAttr = (el, k) => !!el.attrs && Object.prototype.hasOwnProperty.call(el.attrs, k);
const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const texteDe = el => {
  let t = '';
  walk(el, n => { if (n.tag === '#text') t += ' ' + n.text; });
  return t.replace(/\s+/g, ' ').trim();
};
const typeDe = el => (at(el, 'type') || (el.tag === 'input' ? 'text' : el.tag)).toLowerCase();
const nomDe = el => at(el, 'name') || at(el, 'id') || at(el, 'placeholder') || '(sans nom)';

const TEMPORELS = new Set(['date', 'datetime-local', 'month', 'week', 'time']);
const NUMERIQUES = new Set(['number', 'range']);

// Le contrat impose un rendu DYNAMIQUE : les formulaires d'une maquette vivent
// dans des gabarits JS autant que dans le DOM statique. Un oracle aveugle au
// runtime se tairait sur le champ qu'il devait justement juger — c'est le faux
// négatif que le dépôt a déjà payé une fois sur oracle-slop (slop-runtime-rouge).
const TOUS_ARBRES = arbres(html, root);
let labelsParFor = new Map();
let parId = new Map();
let arbreCourant = 'DOM statique';

function indexer(tree) {
  labelsParFor = new Map();
  for (const l of elements(tree, 'label')) {
    const f = at(l, 'for');
    if (f) labelsParFor.set(f, texteDe(l));
  }
  parId = new Map();
  for (const el of elements(tree)) { const i = at(el, 'id'); if (i && !parId.has(i)) parId.set(i, el); }
}

function libelleDe(el) {
  const morceaux = [];
  const id = at(el, 'id');
  if (id && labelsParFor.has(id)) morceaux.push(labelsParFor.get(id));
  if (at(el, 'aria-label')) morceaux.push(at(el, 'aria-label'));
  for (const ref of at(el, 'aria-labelledby').split(/\s+/).filter(Boolean)) {
    if (parId.has(ref)) morceaux.push(texteDe(parId.get(ref)));
  }
  let p = el.parent;
  while (p && p.tag !== '#root') { if (p.tag === 'label') { morceaux.push(texteDe(p)); break; } p = p.parent; }
  return morceaux.join(' ');
}

// Aide du champ : aria-describedby, title, et tout frère porteur d'une classe d'aide.
function aideDe(el) {
  const morceaux = [];
  for (const ref of at(el, 'aria-describedby').split(/\s+/).filter(Boolean)) {
    if (parId.has(ref)) morceaux.push(texteDe(parId.get(ref)));
  }
  if (at(el, 'title')) morceaux.push(at(el, 'title'));
  const freres = (el.parent && el.parent.children) || [];
  for (const f of freres) {
    if (f === el || f.tag.startsWith('#')) continue;
    const cls = at(f, 'class');
    if (f.tag === 'small' || /aide|hint|help|indice|astuce/i.test(cls)) morceaux.push(texteDe(f));
  }
  return morceaux.join(' ');
}

// ── SA1 · TYPÉ ─────────────────────────────────────────────────────────────
// Table sens → type natif. Motifs ancrés au bord de mot : un oracle qui crie sur
// « candidature » parce qu'elle contient « date » serait désactivé dans la semaine.
const FORMATS = [
  { type: 'date', motif: /(^|[^a-z])(dates?|debut|d[ée]but|fin|naissance|[ée]ch[ée]ance|jusquau|depuis_le|deadline)([^a-z]|$)/i },
  { type: 'email', motif: /(^|[^a-z])(e[-_]?mail|email|courriel|mail)([^a-z]|$)/i },
  { type: 'tel', motif: /(^|[^a-z])(t[ée]l|tel|t[ée]l[ée]phone|telephone|phone|mobile|portable)([^a-z]|$)/i },
  { type: 'url', motif: /(^|[^a-z])(url|lien|site[-_ ]?web|adresse[-_ ]?web|endpoint)([^a-z]|$)/i },
  { type: 'number', motif: /(^|[^a-z])(port|quantit[ée]|quantite|nombre|montant|age|âge|nb|effectif|seuil)([^a-z]|$)/i },
  { type: 'password', motif: /(^|[^a-z])(mot[-_ ]de[-_ ]passe|motdepasse|password|passphrase|secret)([^a-z]|$)/i },
  { type: 'time', motif: /(^|[^a-z])(heure|horaire|time)([^a-z]|$)/i },
  { type: 'color', motif: /(^|[^a-z])(couleur|color|teinte)([^a-z]|$)/i },
];

// ── Valeur proposée : attribut, data-defaut, ou pose par le JS inline ──────
function valeurPoseeParJs(el) {
  const cles = [at(el, 'id'), at(el, 'name')].filter(Boolean).map(echapper);
  for (const cle of cles) {
    const direct = new RegExp(`['"#\\[]\\s*${cle}[^\\n]{0,160}?\\.\\s*(?:value|valueAsDate|valueAsNumber|defaultValue)\\s*=`);
    if (direct.test(JS)) return true;
    const alias = new RegExp(`\\b(?:var|let|const)\\s+([A-Za-z_$][\\w$]*)\\s*=[^\\n;]{0,140}${cle}`);
    const m = alias.exec(JS);
    if (m && new RegExp(`\\b${m[1]}\\b\\s*\\.\\s*(?:value|valueAsDate|valueAsNumber)\\s*=`).test(JS)) return true;
  }
  return false;
}
const aValeur = el => (at(el, 'value').trim() !== '') || (at(el, 'data-defaut').trim() !== '') || valeurPoseeParJs(el);

// ── SA4 · promesses à câbler ───────────────────────────────────────────────
const PROMESSES = [
  { quoi: 'valeur par défaut',
    motif: /par d[ée]faut|pr[ée][- ]?rempli|part de la|part du|d[ée]marre (?:à|au|le)|initialis[ée]|derni[èe]re (?:lecture|position)/i,
    tenue: el => aValeur(el) },
  { quoi: 'borne haute',
    motif: /jusqu(?:'|’)(?:à|au) aujourd|au plus tard|jamais dans le futur|aucune date future|pas de date future|au maximum|ne peut d[ée]passer/i,
    tenue: el => at(el, 'max').trim() !== '' },
  { quoi: 'borne basse',
    motif: /au plus t[ôo]t|à partir (?:de|du) |pas avant|au minimum/i,
    tenue: el => at(el, 'min').trim() !== '' },
];

// ── SA1–SA4 et SA6/readonly, arbre par arbre (DOM statique + gabarits JS) ──
const toutesSaisies = [];
const temporels = [];

for (const tree of TOUS_ARBRES) {
  indexer(tree);
  arbreCourant = tree === root ? 'DOM statique' : 'gabarit JS';
  const champs = elements(tree).filter(el => el.tag === 'input' || el.tag === 'textarea' || el.tag === 'select');
  const saisies = champs.filter(el => el.tag !== 'input'
    || !['hidden', 'submit', 'button', 'reset', 'image', 'radio', 'checkbox', 'file'].includes(typeDe(el)));
  toutesSaisies.push(...saisies);
  const ou = el => `${arbreCourant} · input[name=${nomDe(el)}]`;

  // ── SA1 · TYPÉ ───────────────────────────────────────────────────────────
  for (const el of saisies) {
    if (el.tag !== 'input') continue;
    const t = typeDe(el);
    if (t !== 'text' && t !== 'search') continue;
    if (at(el, 'data-type-motive').trim() !== '') continue;
    const foin = [at(el, 'name'), at(el, 'id'), at(el, 'placeholder'), libelleDe(el)].join(' | ');
    const trouve = FORMATS.find(f => f.motif.test(foin));
    if (!trouve) continue;
    add('bloquant', 'SA1',
      `champ « ${nomDe(el)} » au format connu (${trouve.type}) rendu en type="${t}" : poser le type d'entrée natif, ou déclarer data-type-motive="<raison>"`,
      ou(el));
  }

  const temporelsIci = saisies.filter(el => el.tag === 'input' && TEMPORELS.has(typeDe(el)));
  temporels.push(...temporelsIci);

  // ── SA2 · PROPOSÉ ────────────────────────────────────────────────────────
  for (const el of temporelsIci) {
    if (at(el, 'data-vide-motive').trim() !== '') continue;
    if (aValeur(el)) continue;
    add('bloquant', 'SA2',
      `champ ${typeDe(el)} « ${nomDe(el)} » rendu vide : aucune valeur proposée (ni value, ni data-defaut, ni pose par le JS inline) alors que le système peut fournir sa meilleure hypothèse — sinon déclarer data-vide-motive="<raison>"`,
      ou(el));
  }

  // ── SA3 · BORNÉ ──────────────────────────────────────────────────────────
  for (const el of saisies) {
    if (el.tag !== 'input') continue;
    const t = typeDe(el);
    if (!TEMPORELS.has(t) && !NUMERIQUES.has(t)) continue;
    const aMin = at(el, 'min').trim() !== '';
    const aMax = at(el, 'max').trim() !== '';
    const motive = at(el, 'data-borne-motive').trim() !== '';
    if (!aMin && !aMax) {
      if (motive) continue;
      add(TEMPORELS.has(t) ? 'bloquant' : 'majeur', 'SA3',
        `champ ${t} « ${nomDe(el)} » sans aucune borne (ni min ni max) : le sens du champ pose ses bornes (une période ne finit pas dans le futur, un port tient dans 1–65535) — sinon déclarer data-borne-motive="<raison>"`,
        ou(el));
    } else if (!(aMin && aMax) && !motive) {
      add('avertissement', 'SA3',
        `champ ${t} « ${nomDe(el)} » borné d'un seul côté (${aMin ? 'min' : 'max'} seul) : vérifier que l'autre borne n'a pas de sens, ou la poser — data-borne-motive="<raison>" lève cet avertissement`,
        ou(el));
    }
  }

  // ── SA4 · PROMESSE CÂBLÉE ────────────────────────────────────────────────
  for (const el of saisies) {
    const aide = [libelleDe(el), aideDe(el)].join(' ');
    if (!aide.trim()) continue;
    for (const p of PROMESSES) {
      if (!p.motif.test(aide)) continue;
      if (p.tenue(el)) continue;
      add('bloquant', 'SA4',
        `champ « ${nomDe(el)} » : l'aide promet une ${p.quoi} qui n'est pas câblée dans le champ — une promesse non câblée n'existe pas (loi transverse n° 1)`,
        ou(el));
    }
  }

  // ── SA6 · ATTEIGNABLE (clavier) — volet porté par l'attribut ─────────────
  for (const el of temporelsIci) {
    if (aAttr(el, 'readonly') || aAttr(el, 'disabled')) {
      add('bloquant', 'SA6',
        `champ ${typeDe(el)} « ${nomDe(el)} » en ${aAttr(el, 'readonly') ? 'readonly' : 'disabled'} : la saisie clavier est confisquée pour forcer le sélecteur — le mode de saisie alternatif reste toujours ouvert`,
        ou(el));
    }
  }
}

// ── SA5 · ATTEIGNABLE (surface de geste) ───────────────────────────────────
const gesteGlobal = /\.\s*showPicker\s*\(/.test(JS)
  && /addEventListener\(\s*['"](?:click|pointerdown|mousedown)['"]/.test(JS);
const temporelsSansMotif = temporels.filter(el => at(el, 'data-geste-motive').trim() === '');
if (temporelsSansMotif.length && !gesteGlobal) {
  add('bloquant', 'SA5',
    `${temporelsSansMotif.length} champ(s) temporel(s) natif(s) sans geste global d'ouverture : aucun appel à showPicker() depuis un écouteur de clic dans le JS inline. Seule l'icône native (~20 px) ouvre alors le sélecteur, alors que le composant en fait dix fois plus — la cible de geste couvre TOUT le composant`,
    'JS inline');
} else if (temporels.length && gesteGlobal) {
  if (!/\b(?:disabled|readOnly)\b/.test(JS)) {
    add('avertissement', 'SA5',
      'geste global d\'ouverture présent, mais aucune garde disabled/readOnly visible : un champ inactif ouvrirait quand même son sélecteur',
      'JS inline');
  }
  if (!/try\s*\{[\s\S]{0,240}showPicker[\s\S]{0,240}\}\s*catch/.test(JS)) {
    add('avertissement', 'SA5',
      'geste global d\'ouverture présent, mais showPicker() n\'est pas protégé par try/catch : un navigateur qui refuse le geste lèverait une erreur au lieu de rester silencieux',
      'JS inline');
  }
}

// ── SA6 · ATTEIGNABLE (clavier) — volet porté par le JS ────────────────────
if (temporels.length && /addEventListener\(\s*['"]keydown['"][\s\S]{0,300}?preventDefault\s*\(/.test(JS)) {
  add('bloquant', 'SA6',
    'un écouteur keydown appelle preventDefault() alors que le document porte des champs temporels : la frappe au clavier est confisquée (Tab n\'ouvre rien, Échap ferme et le champ reste éditable)',
    'JS inline');
}

// ── Verdict ────────────────────────────────────────────────────────────────
if (toutesSaisies.length === 0) {
  NON_JUGE.push('aucun champ de saisie dans le document : SA1–SA6 sans objet ici, jamais PASS par défaut sur un domaine absent');
}
const RANG = { bloquant: 0, majeur: 1, avertissement: 2, info: 3 };
F.sort((x, y) => RANG[x.sev] - RANG[y.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(durs.length ? `FAIL — ${durs.length} écart(s) dur(s)\n` : 'PASS — SA1–SA6 sans écart\n');
if (durs.length) sortir('FAIL', 1);
sortir('PASS', 0);
