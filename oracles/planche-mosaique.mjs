#!/usr/bin/env node
// planche-mosaique — la planche mosaïque d'une comparaison de maquettes ou de directions (TF-2909, lot Produit-82 du 27/11/2026).
//
// Consigne du porteur du 27/11/2026, mot pour mot : « Très bien les mosaïques d'images, à conserver dans les principes de la Factory. »
// Les 2 planches livrées par le produit assemblaient 9 captures à 1920 px en 3 rangées, une par concepteur, avec le nom de chaque
// maquette ; le script qui les produisait tenait en 30 lignes de Pillow, dans une session. Il est versé ici, et la règle avec lui :
// toute comparaison de maquettes ou de directions se livre avec sa planche (skills studio-de-direction et ameliore-le-design).
//
// Ce que fait l'outil :
//   1. capture chaque maquette à 1920 px de large (la largeur de conception, corpus/grille-viewports.json) : le premier écran
//      (1920×1080), ou la page entière jusqu'à --hauteur-max avec --pleine-page ;
//   2. pose les captures en RANGÉES — une par concepteur ou par direction —, le nom de la rangée en tête, le nom de chaque maquette
//      sous sa vignette ;
//   3. écrit `planche.png` (la planche, à livrer), `planche.html` (la même planche, autoportante, images incluses) et le dossier
//      `captures/` (les PNG pleins, un par maquette : la matière d'une comparaison pixel à pixel, voir rendu-comparatif.mjs).
// Une capture qui échoue n'est JAMAIS omise : sa vignette dit « CAPTURE MANQUANTE » avec le motif, et le code de sortie est 1.
//
// Entrée : un manifeste JSON, ou des rangées en ligne de commande.
//   node planche-mosaique.mjs --sortie <dossier> --manifeste planche.json
//   node planche-mosaique.mjs --sortie <dossier> [--titre "<titre>"] --rangee "<nom>" <maquette>… [--rangee "<nom>" <maquette>…]
//   <maquette> = <fichier.html> | <url de la boucle locale> | <nom>=<fichier.html|url> (le nom par défaut est celui du fichier)
//   manifeste  = { "titre": "…", "rangees": [ { "nom": "Concepteur A", "maquettes": [ { "nom": "Tableau de bord", "source": "chemin|url" } ] } ] }
//   --vignette <px>   largeur d'une vignette dans la planche (défaut 960 : la moitié de la capture)
//   --largeur <px>    largeur de capture (défaut : la largeur de conception du corpus, 1920)
//
// Les livrables vont dans --sortie, jamais dans ce dépôt. Un chemin relatif d'un manifeste se lit depuis le dossier du manifeste.
// Contrat : JSON {outil, planche, rangees[], findings[], non_juge[]} sur stdout · exit 0 planche complète, 1 au moins une capture
// manquante (la planche existe, vignette marquée), 2 impossible (outillage de navigateur absent, appel incomplet : SKIP motivé).
// Aucun accès réseau vers un tiers : une URL doit viser la boucle locale (localhost, 127.0.0.1, ::1).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { detecterOutillageRendu, direInterpreteur } from './lib/rendu.mjs';
import { lireGrille } from './lib/grille.mjs';
import { estHoteLocal } from './lib/lire-page-servie.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const opt = n => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const AVEC_VALEUR = ['--sortie', '--manifeste', '--titre', '--vignette', '--largeur', '--hauteur', '--hauteur-max'];
const GRILLE = lireGrille();

const F = [];
const NJ = [
  'la planche montre ce que le navigateur rend de chaque maquette, thème clair, mouvement réduit à sa fin : ni le thème sombre, ni les états ouverts, ni les largeurs autres que celle de la capture ne sont montrés — ils se jugent par run-oracles-design --rendu',
  'la planche aide à CHOISIR, elle ne juge rien : aucun oracle n\'est joué sur les maquettes',
  'sans --pleine-page, seul le premier écran de chaque maquette est capturé ; une maquette qui montre sa substance plus bas se capture avec --pleine-page (plafonnée par --hauteur-max)',
];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });
let planche = null; let rangeesRendues = [];

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({ outil: 'planche-mosaique', verdict, planche, rangees: rangeesRendues, findings: F, non_juge: NJ }, null, jsonOnly ? 0 : 2) + '\n');
  process.exit(code);
}

// ── L'entrée : manifeste, ou rangées en ligne de commande ─────────────────────────────────────────────────
const dossierSortie = opt('--sortie');
const manifestePath = opt('--manifeste');
let titre = opt('--titre') || null;
let rangees = [];
let racineRelative = process.cwd();
if (manifestePath) {
  try {
    const m = JSON.parse(fs.readFileSync(manifestePath, 'utf8'));
    titre = titre || m.titre || null;
    rangees = Array.isArray(m.rangees) ? m.rangees : [];
    racineRelative = path.dirname(path.resolve(manifestePath));
  } catch (e) { add('bloquant', 'PM0', `manifeste illisible (${manifestePath}) : ${e.message}`, manifestePath); sortir('SKIP', 2); }
} else {
  // --rangee "<nom>" <maquette>… : les mots qui suivent, jusqu'à la prochaine option, sont les maquettes de la rangée.
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--rangee') continue;
    const nom = args[i + 1]; const maquettes = [];
    for (let j = i + 2; j < args.length && !args[j].startsWith('--'); j++) {
      const brut = args[j]; const egal = /^[^/\\:=]+=(.+)$/.exec(brut);
      maquettes.push(egal ? { nom: brut.slice(0, brut.indexOf('=')), source: egal[1] } : { source: brut });
    }
    rangees.push({ nom, maquettes });
  }
}
const nbMaquettes = rangees.reduce((n, r) => n + ((r && r.maquettes) || []).length, 0);
if (!dossierSortie || !rangees.length || !nbMaquettes || rangees.some(r => !r || !r.nom || !Array.isArray(r.maquettes) || !r.maquettes.length)) {
  add('bloquant', 'PM0', 'appel incomplet : --sortie <dossier> et au moins une rangée nommée qui porte au moins une maquette (--manifeste <json>, ou --rangee "<nom>" <maquette>…)', null);
  sortir('SKIP', 2);
}
for (const o of ['--largeur', '--vignette', '--hauteur', '--hauteur-max']) {
  if (opt(o) !== null && !/^\d{3,5}$/.test(opt(o))) { add('bloquant', 'PM0', `${o} « ${opt(o)} » illisible : un nombre de pixels entier`, null); sortir('SKIP', 2); }
}
const largeur = Number(opt('--largeur') || GRILLE.largeurConception);
const hauteur = Number(opt('--hauteur') || 1080);
const hauteurMax = Number(opt('--hauteur-max') || 4000);
const vignette = Number(opt('--vignette') || Math.round(largeur / 2));
const pleinePage = args.includes('--pleine-page');

const outillage = detecterOutillageRendu();
if (!outillage.python) {
  add('bloquant', 'PM0', `outillage de navigateur indisponible : ${outillage.manques.join(' ; ')}`, null);
  NJ.push('aucune planche écrite : sans navigateur, aucune capture n\'a eu lieu (SKIP, jamais une planche vide)');
  sortir('SKIP', 2);
}

// ── Les sources : un fichier ou une URL de la boucle locale ───────────────────────────────────────────────
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 48) || 'maquette';
const aCapturer = []; // { rangee, indice, nom, source, adresse, capture }
const dossierCaptures = path.join(path.resolve(dossierSortie), 'captures');
fs.mkdirSync(dossierCaptures, { recursive: true });
rangees.forEach((r, ri) => r.maquettes.forEach((m, mi) => {
  const brut = typeof m === 'string' ? m : m.source;
  const nom = (typeof m === 'object' && m.nom) || (/^https?:\/\//i.test(brut) ? new URL(brut).pathname.split('/').filter(Boolean).pop() || new URL(brut).host : path.basename(brut, path.extname(brut)));
  const entree = { rangee: ri, indice: mi, nom, source: brut, adresse: null, capture: path.join(dossierCaptures, `${String(ri + 1).padStart(2, '0')}-${String(mi + 1).padStart(2, '0')}-${slug(r.nom)}-${slug(nom)}.png`), erreur: null };
  if (/^https?:\/\//i.test(brut)) {
    if (estHoteLocal(brut)) entree.adresse = brut; else entree.erreur = 'hôte non local : aucun accès réseau vers un tiers (servir la maquette en local, ou passer le fichier)';
  } else {
    const fichier = path.resolve(manifestePath ? racineRelative : process.cwd(), brut);
    if (fs.existsSync(fichier) && fs.statSync(fichier).isFile()) entree.adresse = pathToFileURL(fichier).href; else entree.erreur = `fichier introuvable (${fichier})`;
  }
  aCapturer.push(entree);
}));

// ── 1. Les captures ───────────────────────────────────────────────────────────────────────────────────────
const dossierTravail = path.join(path.resolve(dossierSortie), '.travail');
fs.mkdirSync(dossierTravail, { recursive: true });
const helper = path.join(ici, 'lib', 'capturer_planche.py');
const jouer = spec => {
  const fichierSpec = path.join(dossierTravail, `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`);
  fs.writeFileSync(fichierSpec, JSON.stringify(spec), 'utf8');
  const r = spawnSync(outillage.python, [helper, fichierSpec], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, PYTHONUTF8: '1' } });
  try { fs.unlinkSync(fichierSpec); } catch { /* best-effort */ }
  if (r.error || r.status !== 0) return { erreur: (r.error && r.error.message) || String(r.stderr || '').trim().split('\n').pop() || `exit ${r.status}` };
  try { return JSON.parse(r.stdout.trim()); } catch { return { erreur: `sortie illisible : ${String(r.stdout || '').slice(0, 120)}` }; }
};
const lisibles = aCapturer.filter(e => e.adresse);
if (lisibles.length) {
  const res = jouer({ mode: 'capturer', largeur, hauteur, pleine_page: pleinePage, hauteur_max: hauteurMax, captures: lisibles.map(e => ({ source: e.adresse, sortie: e.capture })) });
  if (res.erreur) {
    add('bloquant', 'PM0', `navigateur impossible : ${res.erreur}`, null);
    NJ.push('aucune planche écrite : le navigateur n\'a pu capturer aucune page (SKIP, jamais une planche vide)');
    fs.rmSync(dossierTravail, { recursive: true, force: true });
    sortir('SKIP', 2);
  }
  res.resultats.forEach((x, i) => {
    if (x.ok) { lisibles[i].dimensions = { largeur: x.largeur, hauteur: x.hauteur }; } else lisibles[i].erreur = x.motif;
  });
}
const taillePng = f => { const b = fs.readFileSync(f); return { largeur: b.readUInt32BE(16), hauteur: b.readUInt32BE(20) }; };
for (const e of aCapturer) {
  if (e.erreur || !fs.existsSync(e.capture)) { e.erreur = e.erreur || 'capture non écrite'; add('bloquant', 'PM1', `capture MANQUANTE : « ${e.nom} » (rangée « ${rangees[e.rangee].nom} ») — ${e.erreur} ; la vignette de la planche le dit, la maquette n'est pas montrée`, e.source); continue; }
  e.png = taillePng(e.capture);
}

// ── 2. La planche, en HTML autoportant ────────────────────────────────────────────────────────────────────
const echapper = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const marge = 32; const ecart = 24;
const colonnes = Math.max(...rangees.map(r => r.maquettes.length));
const largeurPlanche = marge * 2 + colonnes * vignette + (colonnes - 1) * ecart;
const hauteurVignette = e => (e.png ? Math.round(vignette * e.png.hauteur / e.png.largeur) : Math.round(vignette * hauteur / largeur));
const blocs = rangees.map((r, ri) => {
  const figures = aCapturer.filter(e => e.rangee === ri).map(e => e.png
    ? `<figure><img src="data:image/png;base64,${fs.readFileSync(e.capture).toString('base64')}" alt="Capture de la maquette ${echapper(e.nom)}" width="${vignette}" height="${hauteurVignette(e)}"><figcaption>${echapper(e.nom)}</figcaption></figure>`
    : `<figure><div class="manquante" style="width:${vignette}px;height:${hauteurVignette(e)}px" role="img" aria-label="Capture manquante : ${echapper(e.nom)}"><strong>CAPTURE MANQUANTE</strong><span>${echapper(e.erreur)}</span></div><figcaption>${echapper(e.nom)}</figcaption></figure>`);
  return `<section class="rangee"><h2>${echapper(r.nom)}</h2><div class="vignettes">${figures.join('')}</div></section>`;
});
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${largeurPlanche}">
<title>${echapper(titre || 'Planche de comparaison')}</title>
<style>
  body { margin: 0; padding: ${marge}px; width: ${largeurPlanche - marge * 2}px; background: #f4f4f2; color: #1c1c1c; font-family: system-ui, "Segoe UI", sans-serif; }
  h1 { font-size: 32px; margin: 0 0 ${ecart}px; }
  .rangee { margin: 0 0 ${marge}px; }
  .rangee h2 { font-size: 24px; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #1c1c1c; }
  .vignettes { display: flex; gap: ${ecart}px; align-items: flex-start; }
  figure { margin: 0; width: ${vignette}px; }
  img { display: block; border: 1px solid #8a8a8a; background: #fff; }
  figcaption { font-size: 20px; font-weight: 600; padding-top: 8px; }
  .manquante { box-sizing: border-box; border: 2px dashed #b3261e; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #b3261e; font-size: 20px; text-align: center; padding: 16px; }
  .manquante span { color: #1c1c1c; font-size: 16px; overflow-wrap: anywhere; }
</style>
</head>
<body>
${titre ? `<h1>${echapper(titre)}</h1>\n` : ''}${blocs.join('\n')}
</body>
</html>
`;
const fichierHtml = path.join(path.resolve(dossierSortie), 'planche.html');
const fichierPng = path.join(path.resolve(dossierSortie), 'planche.png');
fs.writeFileSync(fichierHtml, html, 'utf8');

// ── 3. La planche, en PNG ─────────────────────────────────────────────────────────────────────────────────
const photo = jouer({ mode: 'photographier', page: pathToFileURL(fichierHtml).href, sortie: fichierPng, largeur: largeurPlanche });
fs.rmSync(dossierTravail, { recursive: true, force: true });
if (photo.erreur || !photo.resultats[0].ok || !fs.existsSync(fichierPng)) {
  add('bloquant', 'PM0', `la planche n'a pas pu être photographiée : ${photo.erreur || photo.resultats[0].motif}`, fichierPng);
  NJ.push(`planche.html est écrite (${fichierHtml}) mais planche.png ne l'est pas`);
  sortir('SKIP', 2);
}
planche = { png: fichierPng, html: fichierHtml, captures: dossierCaptures, ...taillePng(fichierPng), largeur_capture: largeur, vignette };
rangeesRendues = rangees.map((r, ri) => ({
  nom: r.nom,
  maquettes: aCapturer.filter(e => e.rangee === ri).map(e => ({ nom: e.nom, source: e.source, capture: e.png ? e.capture : null, ...(e.png ? { dimensions: e.png } : { manquante: e.erreur }) })),
}));
NJ.push(direInterpreteur(outillage));
const manquantes = aCapturer.filter(e => !e.png).length;
if (!jsonOnly) process.stderr.write(`planche ${fichierPng} — ${aCapturer.length - manquantes} capture(s) sur ${aCapturer.length}, ${rangees.length} rangée(s), ${planche.largeur}×${planche.hauteur} px\n`);
sortir(manquantes ? 'FAIL' : 'PASS', manquantes ? 1 : 0);
