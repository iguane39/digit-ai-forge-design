#!/usr/bin/env node
// oracle-images — Domaine « Visuels générés : traçabilité et budget » (déterministe).
//
// Règles I1–I6 :
//   I1  toute <img> porte un alt utile, ou est explicitement décorative
//   I2  chaque image embarquée respecte le plafond unitaire (IMAGES_MAX_KO)
//   I3  le fichier respecte le plafond global de 10 Mo
//   I4  aucune image chargée depuis le réseau — contrat zéro-CDN
//   I5  toute image embarquée est tracée dans le manifeste de traçabilité
//   I6  chaque entrée du manifeste porte de quoi remonter à l'origine de l'image :
//       générée (défaut) → prompt, modèle et date ; relevée → source et date de relevé
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
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'I1–I6 sans écart', where: file }],
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
}

if (embarquees > 0 && manifeste === null) {
  add('bloquant', 'I5', `${embarquees} image(s) embarquée(s) et aucun <script id="manifeste-images"> : aucune traçabilité de génération`, path.basename(file));
}
if (embarquees === 0 && sources.length === 0) {
  NJ.push('aucune image dans le document : I1–I2, I5–I6 sans objet');
}

// ── Verdict ────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(dur.length
  ? `FAIL — ${dur.length} écart(s) dur(s) sur ${sources.length} image(s)\n`
  : `PASS — ${sources.length} image(s), ${embarquees} embarquée(s), plafonds ${maxKo} Ko / ${maxMo} Mo\n`);
if (dur.length) sortir('FAIL', 1);
sortir('PASS', 0);
