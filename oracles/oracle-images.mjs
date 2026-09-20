#!/usr/bin/env node
// oracle-images — Domaine « Visuels générés : traçabilité et budget » (déterministe).
//
// Règles I1–I7 :
//   I1  toute <img> porte un alt utile, ou est explicitement décorative
//   I2  chaque image embarquée respecte le plafond unitaire (IMAGES_MAX_KO)
//   I3  le fichier respecte le plafond global de 10 Mo
//   I4  aucune image chargée depuis le réseau — contrat zéro-CDN
//   I5  toute image embarquée est tracée dans le manifeste de traçabilité
//   I6  chaque entrée du manifeste porte de quoi remonter à l'origine de l'image :
//       générée (défaut) → prompt, modèle et date ; relevée → source et date de relevé
//   I7  deux actifs déclarés VARIANTES l'un de l'autre rendent réellement différemment
//
// Variantes : deux actifs sont déclarés variantes soit par la convention de nommage
// (suffixe -white / -blanc / -dark / -sombre / -light / -clair / -inverse / -negatif
// / -mono sur un même radical), soit explicitement par « variante_de » au manifeste :
//   [{"id":"logo"}, {"id":"logo-blanc","variante_de":"logo"}]
//
// Manifeste attendu dans le fichier :
//   <script type="application/json" id="manifeste-images">
//     [{"id":"hero","modele":"gemini-3.1-flash-image","prompt":"…","date":"2026-08-04","genere":true},
//      {"id":"vitrine","genere":false,"source":"photothèque du propriétaire, mandat du 12/08/2026","date":"2026-08-12"}]
//   </script>
// et chaque <img> embarquée porte data-image-id="hero".
//
// « genere »: false — TF-0277. Pour une photo réelle reprise sur mandat, prompt et
// modèle n'ont pas d'objet : les exiger fait remplir le manifeste de « aucun », ce
// qui détruit l'information au lieu de la tracer (18 déclarations sur le run
// digit-desk.fr). L'exigence de traçabilité ne disparaît pas, elle CHANGE D'OBJET :
// d'où vient l'image (source) et quand elle a été relevée (date). L'absence du champ
// vaut « générée » : un manifeste antérieur reste jugé exactement comme avant.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-images.mjs <fichier.html> [--env .env] [--max-ko N] [--max-mo N] [--json-only]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse as parseHtml, arbres, elements, lineOf } from './lib/html.mjs';

const DOM = 'Visuels générés : traçabilité et budget';
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');
const opt = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };

const NJ = [
  'ce que l\'image montre réellement (ressemblance à une personne, un lieu ou une marque existante) — revue humaine obligatoire',
  'qualité esthétique et adéquation de l\'image à la direction retenue',
  'poids perçu après compression du transport (gzip/brotli) — hors périmètre d\'un fichier ouvert en local',
];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-images', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'I1–I7 sans écart', where: file }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) { NJ.push('fichier absent'); sortir('SKIP', 2); }

// ── Plafonds : ligne de commande, puis .env, puis défauts du contrat ────────
let maxKo = 400, maxMo = 10;
const envPath = opt('--env', path.join(path.dirname(file), '..', '..', '.env'));
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  const g = k => { const m = new RegExp('^' + k + '\\s*=\\s*(.+)$', 'm').exec(env); return m ? m[1].trim() : null; };
  const v = g('IMAGES_MAX_KO'); if (v && !Number.isNaN(+v)) maxKo = +v;
}
if (opt('--max-ko')) maxKo = +opt('--max-ko');
if (opt('--max-mo')) maxMo = +opt('--max-mo');

const html = fs.readFileSync(file, 'utf8');
const root = parseHtml(html);

// ── I3 · plafond global ────────────────────────────────────────────────────
{
  const mo = fs.statSync(file).size / (1024 * 1024);
  if (mo > maxMo) add('bloquant', 'I3', `fichier de ${mo.toFixed(2)} Mo > plafond ${maxMo} Mo`, path.basename(file));
}

// ── Manifeste ──────────────────────────────────────────────────────────────
let manifeste = null;
for (const s of elements(root, 'script')) {
  if ((s.attrs.id || '') !== 'manifeste-images') continue;
  const brut = (s.children.find(c => c.tag === '#raw') || {}).text || '';
  try { manifeste = JSON.parse(brut); }
  catch (e) { add('bloquant', 'I5', 'manifeste-images présent mais JSON invalide : ' + e.message, 'ligne ' + lineOf(html, s.start)); }
}
const parId = new Map();
if (Array.isArray(manifeste)) for (const e of manifeste) if (e && e.id) parId.set(String(e.id), e);

// ── I6 · complétude des entrées ────────────────────────────────────────────
let relevees = 0;
for (const [id, e] of parId) {
  if ('genere' in e && typeof e.genere !== 'boolean') {
    add('majeur', 'I6', `entrée « ${id} » : « genere » vaut ${JSON.stringify(e.genere)} — booléen attendu (true = générée, false = relevée)`, 'manifeste-images');
  }
  const relevee = e.genere === false;
  if (relevee) relevees++;
  // Générée : prompt + modèle + date. Relevée : source + date de relevé.
  const requis = relevee ? ['source', 'date'] : ['prompt', 'modele', 'date'];
  for (const champ of requis) {
    if (!e[champ] || String(e[champ]).trim() === '') {
      add('majeur', 'I6', relevee
        ? `entrée « ${id} » déclarée « genere »: false et sans ${champ} — une image relevée doit sa traçabilité à sa source et à sa date de relevé`
        : `entrée « ${id} » du manifeste sans ${champ}`, 'manifeste-images');
    }
  }
  if (e.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(e.date))) {
    add('majeur', 'I6', `entrée « ${id} » : date « ${e.date} » hors format AAAA-MM-JJ`, 'manifeste-images');
  }
}
if (relevees > 0) {
  NJ.push(`I6 : ${relevees} image(s) déclarée(s) « genere »: false — la réalité du mandat de reprise, les droits attachés à la source et l'exactitude de la date de relevé sont hors de portée d'un contrôle de fichier : revue humaine`);
}

// ── I1, I2, I4, I5 · balayage des images ───────────────────────────────────
// Les images d'une maquette sont injectees a l'execution : les chercher aussi
// dans les gabarits JS, sinon I1-I5 se taisent sur des images qu'ils ne voient pas.
const ARBRES = arbres(html, root).map((r, i) => ({ r, statique: i === 0, n: i }));
const sources = ARBRES.flatMap(a => [
  ...elements(a.r, 'img').map(el => ({ a, el, src: el.attrs.src || '', tag: 'img' })),
  ...elements(a.r, 'source').map(el => ({ a, el, src: el.attrs.srcset || el.attrs.src || '', tag: 'source' })),
]);
let embarquees = 0;
const actifs = []; // I7 · nom, charge utile réelle et forme de chaque actif servi par la page

for (const { a, el, src, tag } of sources) {
  const ou = a.statique ? 'ligne ' + lineOf(html, el.start) : `fragment de gabarit JS n°${a.n}`;

  if (/^(https?:)?\/\//i.test(src)) {
    add('bloquant', 'I4', `image chargée depuis le réseau : ${src.slice(0, 70)}`, ou);
  }

  if (tag === 'img') {
    const alt = el.attrs.alt;
    const decorative = alt === '' && (el.attrs.role === 'presentation' || el.attrs['aria-hidden'] === 'true');
    if (alt === undefined) add('majeur', 'I1', 'image sans attribut alt', ou);
    else if (alt.trim() === '' && !decorative) add('majeur', 'I1', 'alt vide sans role="presentation" ni aria-hidden : intention indécidable', ou);
    else if (alt.trim() && /^(image|photo|illustration|visuel|logo)$/i.test(alt.trim())) {
      add('majeur', 'I1', `alt non informatif « ${alt.trim()} »`, ou);
    }
  }

  if (src.startsWith('data:')) {
    embarquees++;
    const b64 = src.slice(src.indexOf(',') + 1);
    const ko = Math.round(b64.length * 0.75 / 1024);
    if (ko > maxKo) add('majeur', 'I2', `image embarquée de ${ko} Ko > plafond ${maxKo} Ko`, ou);

    const id = el.attrs['data-image-id'];
    if (!id) add('bloquant', 'I5', 'image embarquée sans data-image-id : génération non traçable', ou);
    else if (!parId.has(id)) add('bloquant', 'I5', `data-image-id="${id}" absent du manifeste-images`, ou);
  }

  // I7 · charge utile réelle de l'actif — embarquée en data: URI, ou posée sur disque
  // à côté de la page. Le nom sert à reconnaître les variantes : l'identifiant de
  // traçabilité s'il existe, le nom de fichier sinon.
  const chemin = src.split(/[?#]/)[0];
  const nom = el.attrs['data-image-id']
    || (chemin && !chemin.startsWith('data:') ? path.basename(chemin, path.extname(chemin)) : null);
  let charge = null, forme = null;
  if (src.startsWith('data:')) {
    const virgule = src.indexOf(',');
    const entete = src.slice(5, virgule < 0 ? undefined : virgule);
    forme = entete.split(';')[0] || 'application/octet-stream';
    if (virgule > 0) {
      charge = entete.includes('base64')
        ? Buffer.from(src.slice(virgule + 1), 'base64')
        : Buffer.from(decodeURIComponent(src.slice(virgule + 1)), 'utf8');
    }
  } else if (chemin && !/^(https?:)?\/\//i.test(chemin) && !chemin.startsWith('#')) {
    const surDisque = path.resolve(path.dirname(file), chemin);
    if (fs.existsSync(surDisque) && fs.statSync(surDisque).isFile()) {
      charge = fs.readFileSync(surDisque);
      forme = path.extname(surDisque).toLowerCase() === '.svg' ? 'image/svg+xml' : 'binaire';
    }
  }
  if (nom && charge && charge.length) actifs.push({ nom, charge, forme, ou });
}

if (embarquees > 0 && manifeste === null) {
  add('bloquant', 'I5', `${embarquees} image(s) embarquée(s) et aucun <script id="manifeste-images"> : aucune traçabilité de génération`, path.basename(file));
}
if (embarquees === 0 && sources.length === 0) {
  NJ.push('aucune image dans le document : I1–I2, I5–I6 sans objet');
}

// ── I7 · deux actifs déclarés variantes doivent RENDRE différemment ─────────
// TF-1074. Le voisin oracle-parite-assets (TF-0784) garde qu'une COPIE déclarée
// reste identique à sa source ; l'invariant INVERSE n'était gardé nulle part. Le
// 25/08, `logo-white.svg` a reçu le contenu de `logo.svg`, octet pour octet : le
// bandeau a servi un logo bleu foncé sur fond foncé, vu en production par
// l'exploitant avant l'auteur du correctif (lot Produit-02 20260825b RT-28, défaut
// E-06 du banc des défauts échappés).
//
// L'EMPREINTE NE SUFFIT PAS, et c'est tout le sujet. Elle n'est que CORRÉLÉE à ce
// qu'on protège : l'invariant n'est pas « les deux fichiers diffèrent », c'est
// « les deux variantes rendent différemment ». Un `logo-white.svg` qui ne diffère
// de `logo.svg` que par un commentaire XML ou un identifiant interne porte bien
// deux empreintes et pose exactement la même encre — le défaut de production est
// le même, et l'empreinte le laisse passer. I7 mesure donc les deux grandeurs :
//   I7a  empreintes identiques → refus (le cas littéral du 25/08) ;
//   I7b  encres identiques alors que les empreintes diffèrent → refus.
{
  const SUFFIXES = ['white', 'blanc', 'dark', 'sombre', 'light', 'clair', 'inverse', 'negatif', 'mono'];
  const RE_SUFFIXE = new RegExp('^(.+)[-_](' + SUFFIXES.join('|') + ')$', 'i');
  // L'encre d'un SVG : toutes les couleurs qu'il POSE, quelle que soit leur notation.
  const RE_LITTERALE = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/gi;
  const RE_NOMMEE = /\b(?:fill|stroke|stop-color|flood-color|lighting-color|color)\s*[:=]\s*["']?\s*([a-z][a-z0-9-]*)/gi;
  const HORS_ENCRE = new Set(['none', 'currentcolor', 'inherit', 'transparent', 'url', 'unset', 'initial']);

  function encre(actif) {
    if (!/svg/i.test(actif.forme || '')) return null; // matriciel : l'encre demande un rendu
    const texte = actif.charge.toString('utf8');
    const jeu = new Set();
    for (const m of texte.matchAll(RE_LITTERALE)) jeu.add(m[0].toLowerCase().replace(/\s+/g, ''));
    for (const m of texte.matchAll(RE_NOMMEE)) {
      const v = m[1].toLowerCase();
      if (!HORS_ENCRE.has(v)) jeu.add(v);
    }
    return jeu.size ? [...jeu].sort().join(' ') : null;
  }

  const parNom = new Map();
  for (const a of actifs) if (!parNom.has(a.nom)) parNom.set(a.nom, a);
  const paires = new Map();
  const appairer = (x, y, motif) => {
    if (!x || !y || x === y) return;
    const cle = [x.nom, y.nom].sort().join('|');
    if (!paires.has(cle)) paires.set(cle, { x, y, motif });
  };

  // Convention de nommage : « logo-white » est une variante de « logo », et deux
  // variantes d'un même radical (« logo-light » et « logo-dark ») le sont entre elles.
  const parRadical = new Map();
  for (const a of actifs) {
    const m = RE_SUFFIXE.exec(a.nom);
    if (!m) continue;
    if (!parRadical.has(m[1])) parRadical.set(m[1], []);
    parRadical.get(m[1]).push(a);
    appairer(a, parNom.get(m[1]), `convention de nommage : « ${a.nom} » variante de « ${m[1]} »`);
  }
  for (const [radical, liste] of parRadical) {
    for (let i = 0; i < liste.length; i++) {
      for (let k = i + 1; k < liste.length; k++) appairer(liste[i], liste[k], `convention de nommage : deux variantes de « ${radical} »`);
    }
  }
  // Déclaration explicite — le nommage n'est pas toujours tenu, la déclaration l'emporte.
  for (const [id, e] of parId) {
    if (!e || !e.variante_de) continue;
    const source = parNom.get(String(e.variante_de));
    if (!source) {
      add('majeur', 'I7', `entrée « ${id} » : « variante_de »: « ${e.variante_de} » ne désigne aucun actif servi par la page`, 'manifeste-images');
      continue;
    }
    appairer(parNom.get(id), source, `déclaration « variante_de » au manifeste`);
  }

  const empreinte = a => crypto.createHash('sha256').update(a.charge).digest('hex');
  let matricielles = 0;
  for (const { x, y, motif } of paires.values()) {
    const ex = empreinte(x), ey = empreinte(y);
    if (ex === ey) {
      add('bloquant', 'I7',
        `« ${x.nom} » et « ${y.nom} » sont déclarés variantes (${motif}) et portent la MÊME charge utile, octet pour octet — sha256 ${ex.slice(0, 12)}…, ${x.charge.length} octets : l'une des deux variantes n'a jamais été produite`,
        `${x.ou} et ${y.ou}`);
      continue;
    }
    const ix = encre(x), iy = encre(y);
    if (ix === null || iy === null) { matricielles++; continue; }
    if (ix === iy) {
      add('bloquant', 'I7',
        `« ${x.nom} » et « ${y.nom} » sont déclarés variantes (${motif}), portent des empreintes DIFFÉRENTES et posent la même encre — ${ix.slice(0, 90)} : l'écart d'octets ne change rien au rendu, la variante est vide de ce qui la distingue`,
        `${x.ou} et ${y.ou}`);
    }
  }

  if (paires.size === 0) {
    NJ.push('I7 : aucune paire d\'actifs déclarés variantes (suffixe -white/-blanc/-dark/-sombre/-light/-clair/-inverse/-negatif/-mono, ou « variante_de » au manifeste) — sans objet sur cette page');
  }
  if (matricielles > 0) {
    NJ.push(`I7 : ${matricielles} paire(s) de variantes matricielles (PNG, JPEG…) — seule l'identité octet pour octet y est jugée ; l'encre d'une image matricielle se mesure au rendu (render_page.py V9), pas à la lecture du fichier`);
  }
  NJ.push('I7 : les actifs servis depuis un chemin absent du disque à l\'heure du contrôle ne sont pas comparés, et un parc d\'actifs entier (dossier assets/ jamais référencé par la page) relève d\'un balayage de dossier, hors du périmètre d\'un oracle de page');
}

// ── Verdict ────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(dur.length
  ? `FAIL — ${dur.length} écart(s) dur(s) sur ${sources.length} image(s)\n`
  : `PASS — ${sources.length} image(s), ${embarquees} embarquée(s), plafonds ${maxKo} Ko / ${maxMo} Mo\n`);
if (dur.length) sortir('FAIL', 1);
sortir('PASS', 0);
