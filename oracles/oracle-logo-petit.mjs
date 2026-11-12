#!/usr/bin/env node
// oracle-logo-petit — Domaine « Logo : lisibilité d'un pictogramme SVG à 16 et 32 px ».
//
// POURQUOI IL EXISTE (TF-2074, essai du 03/11/2026). Un audit tiers de logo (svg_audit du skill
// logo-design-skill) a rendu 100/100 à trois SVG qui, une fois rendus à 16 px, se réduisaient à des
// points en diagonale. Il juge la PROPRETÉ d'un SVG (texte vivant, filtres, angles proches, centrage),
// pas son rendu en petit ; oracle-images juge alt, poids, réseau et variantes. Aucun juge de la forge ne
// rendait le logo à la taille d'un onglet de navigateur. Celui-ci le fait, et juge la FORME rendue.
//
// COMMENT IL MESURE. Chromium (Playwright) rend le SVG comme image, fond transparent, à 16 px et à
// 32 px (les tailles d'un favicon et d'une icône d'en-tête) et à 128 px (la référence). Les mesures se
// font sur les pixels, en Node pur (lib/png.mjs). Un pixel « d'encre » a une opacité d'au moins 50 %.
//
// LES RÈGLES, CRITÈRES MESURABLES ET SEUILS FIGÉS ICI (aucun n'est réglé au cas par cas) :
//   LP1  trait plus fin qu'un pixel. Part de l'encre de la référence (128 px) qui disparaît quand on
//        l'ouvre par un disque d'un pixel de la taille jugée (diamètre 8 px à 16 px, 4 px à 32 px, au
//        rayon corrigé d'un demi-pixel de référence). Ce qui disparaît est trop fin pour exister :
//        il sort en gris pâle ou en pointillé. À 16 px : plus de 20 % = majeur, de 5 à 20 % =
//        avertissement. À 32 px : plus de 20 % = avertissement.
//   LP2  détail fusionné ou perdu. Nombre de pièces d'encre (connexité à 8 voisins) et de trous
//        (fond enclos) du rendu, comparé à la référence. Un trou rebouché, deux pièces soudées ou une
//        pièce effacée est un détail qui n'existe plus à cette taille. À 16 px : majeur ; à 32 px :
//        avertissement. Un trou qui survit sur UN SEUL pixel à 16 px est à la limite de survie (le moindre
//        décalage de grille le rebouche) : avertissement.
//   LP3  contraste du pictogramme sur son fond (seulement avec --fond <#hex>, répétable). Part de
//        l'encre à 16 px dont le contraste WCAG avec le fond est inférieur à 3:1 (critère 1.4.11,
//        composants graphiques). Plus de 20 % = majeur. Sans --fond, la règle n'est pas jouée et le
//        non_juge le dit : un fond n'est pas déductible du fichier.
//   LP4  présence à 16 px. Aucun pixel d'opacité 25 % ou plus : majeur (le logo disparaît). Le
//        pictogramme occupe moins de la moitié de la boîte sur son plus grand côté : avertissement
//        (marge excessive du viewBox, le logo flotte, il est rendu plus petit que 16 px).
//   LP5  texte vivant (<text>) dans le SVG : avertissement. Le rendu dépend des polices du poste ;
//        un logo se livre en tracés.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[],mesures{}} · exit 0/1/2.
// Usage : node oracle-logo-petit.mjs <logo.svg>… [--fond '#FFFFFF']… [--sortie <dossier>] [--json-only]
//   --sortie : écrit les PNG rendus (<nom>-16.png, <nom>-32.png) pour que l'œil les regarde.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detecterOutillageRendu, direInterpreteur } from './lib/rendu.mjs';
import { decoderPng } from './lib/png.mjs';
import { parse, contrast } from './lib/color.mjs';
import { plageDeRegles } from './lib/regles-jouees.mjs';
// TF-2287 — les règles que l'oracle JOUE, déclarées UNE fois ; la plage citée à la sortie en dérive, jamais écrite en dur.
// Une règle neuve s'ajoute ici : self-test-regles-jouees.mjs refuse la liste qui s'écarte des règles émises par ce fichier.
const REGLES_JOUEES = ['LP1', 'LP2', 'LP3', 'LP4', 'LP5'];
const PLAGE_JOUEE = plageDeRegles(REGLES_JOUEES);

const DOM = 'Logo : lisibilité d\'un pictogramme SVG à 16 et 32 px';
const ici = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const AVEC_VALEUR = ['--fond', '--sortie'];
const fichiers = args.filter((a, i) => !a.startsWith('--') && !AVEC_VALEUR.includes(args[i - 1]));
const fonds = args.flatMap((a, i) => (a === '--fond' && args[i + 1] ? [args[i + 1]] : []));
const SORTIE = (() => { const i = args.indexOf('--sortie'); return i === -1 ? null : args[i + 1]; })();

const TAILLES = [16, 32];
const REFERENCE = 128;
const SEUIL_ENCRE = 128;      // opacité (0-255) d'un pixel « d'encre » : 50 %
const SEUIL_PRESENCE = 64;    // opacité d'un pixel « présent » : 25 %
const SEUILS = { partFineMajeure: 0.20, partFineAvert: 0.05, contrasteMin: 3, partSousContraste: 0.20, occupationMin: 0.5 };

const NJ = [
  'le GOÛT, la distinction et la ressemblance avec une marque existante : le rendu en petit ne dit pas si le logo est bon, seulement s\'il tient — le jugement reste à celui qui regarde (--sortie écrit les PNG à regarder)',
  'la LISIBILITÉ SÉMANTIQUE : un pictogramme peut garder la même topologie à 16 px et se lire autre chose (une lettre qui se lit « P! ») ; ce que le logo représente n\'est pas jugé',
  'le rendu d\'AUTRES moteurs (Safari, Firefox, rasterisation d\'un favicon .ico) : un seul moteur, Chromium, à l\'échelle 1',
  'les tailles autres que 16 et 32 px, le mode sombre du navigateur (invert), le recadrage circulaire des avatars',
  'le SVG animé ou à script : rendu comme image, donc sans script ni animation',
];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });
const mesures = {};

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-logo-petit', domaine: DOM, artefact: fichiers.join(' ') || null,
    verdict, tailles: TAILLES, reference: REFERENCE, seuils: SEUILS, mesures,
    findings: F.length ? F : [{ sev: 'info', regle: '—', msg: `${PLAGE_JOUEE} sans écart`, where: fichiers.join(' ') }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!fichiers.length) { NJ.push('aucun fichier fourni (un ou plusieurs .svg)'); sortir('SKIP', 2); }
for (const f of fichiers) {
  if (!fs.existsSync(f)) { NJ.push(`fichier introuvable : ${f}`); sortir('SKIP', 2); }
  if (!/\.svg$/i.test(f)) { NJ.push(`${f} n'est pas un .svg : l'oracle juge des logos vectoriels`); sortir('SKIP', 2); }
}
const fondsLus = [];
for (const f of fonds) {
  const c = parse(f);
  if (!c) { NJ.push(`--fond « ${f} » illisible : une couleur #RRGGBB est attendue`); sortir('SKIP', 2); }
  fondsLus.push({ texte: f, couleur: c });
}

const outillage = detecterOutillageRendu();
if (!outillage.python || outillage.manques.some(m => /playwright|python/i.test(m))) {
  NJ.push(`outillage de rendu indisponible : ${outillage.manques.join(' ; ')}`);
  sortir('SKIP', 2);
}
NJ.push(direInterpreteur(outillage)); // TF-2461 : l'interpréteur qui a joué, dit à chaque rendu

const r = spawnSync(outillage.python, [path.join(ici, 'lib', 'rendre_logo.py')], {
  input: JSON.stringify({ fichiers: fichiers.map(f => path.resolve(f)), tailles: [...TAILLES, REFERENCE] }),
  encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' }, maxBuffer: 64 * 1024 * 1024, timeout: 300000,
});
let rendu = null;
try { rendu = JSON.parse((r.stdout || '').trim().split(/\r?\n/).pop()); } catch { /* illisible, dit ci-dessous */ }
if (!rendu || !rendu.ok) {
  NJ.push(`rendu impossible : ${(rendu && rendu.erreur) || (r.stderr || '').trim().split(/\r?\n/).pop() || 'sortie du pilote illisible'}`);
  sortir('SKIP', 2);
}

// ── Mesures sur les pixels ─────────────────────────────────────────────────
const masque = (png, seuil) => {
  const m = new Uint8Array(png.width * png.height);
  for (let i = 0; i < m.length; i++) m[i] = png.pixels[i * png.canaux + 3] >= seuil ? 1 : 0;
  return m;
};

/** Étiquette les composantes connexes de la valeur `v` du masque. `huit` : connexité à 8 voisins, sinon 4. */
function composantes(m, w, h, v, huit) {
  const vu = new Uint8Array(m.length);
  const voisins = huit ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const liste = [];
  for (let s = 0; s < m.length; s++) {
    if (m[s] !== v || vu[s]) continue;
    const pile = [s]; vu[s] = 1; let taille = 0; let toucheLeBord = false;
    while (pile.length) {
      const p = pile.pop(); taille++;
      const x = p % w, y = (p - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) toucheLeBord = true;
      for (const [dx, dy] of voisins) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (m[q] === v && !vu[q]) { vu[q] = 1; pile.push(q); }
      }
    }
    liste.push({ taille, toucheLeBord });
  }
  return liste;
}

/** Pièces d'encre (8 voisins) et trous (fond de 4 voisins qui ne touche pas le bord, sur le masque encadré d'un pixel de vide). */
function topologie(m, w, h) {
  const W = w + 2, H = h + 2;
  const p = new Uint8Array(W * H);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p[(y + 1) * W + x + 1] = m[y * w + x];
  const pieces = composantes(p, W, H, 1, true).length;
  const lesTrous = composantes(p, W, H, 0, false).filter(c => !c.toucheLeBord);
  return { pieces, trous: lesTrous.length, plus_petit_trou: lesTrous.length ? Math.min(...lesTrous.map(c => c.taille)) : null };
}

/** Part de l'encre qui ne survit pas à l'ouverture par un disque de rayon `rayon` (en pixels du masque). */
function partFine(m, w, h, rayon) {
  const dec = [];
  const n = Math.ceil(rayon);
  for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) if (dx * dx + dy * dy <= rayon * rayon) dec.push([dx, dy]);
  const erode = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!m[y * w + x]) continue;
    let ok = 1;
    for (const [dx, dy] of dec) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || !m[ny * w + nx]) { ok = 0; break; }
    }
    erode[y * w + x] = ok;
  }
  const ouvert = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!erode[y * w + x]) continue;
    for (const [dx, dy] of dec) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) ouvert[ny * w + nx] = 1;
    }
  }
  let encre = 0, perdu = 0;
  for (let i = 0; i < m.length; i++) if (m[i]) { encre++; if (!ouvert[i]) perdu++; }
  return { encre, part: encre ? perdu / encre : 0 };
}

const pct = x => `${Math.round(x * 100)} %`;
let jugees = 0;
for (const res of rendu.resultats) {
  const nom = path.basename(res.fichier);
  if (res.erreur) { NJ.push(`${nom} : non jugé, ${res.erreur}`); continue; }
  jugees++;
  const png = {};
  for (const t of [...TAILLES, REFERENCE]) png[t] = decoderPng(Buffer.from(res.rendus[String(t)], 'base64'));
  if (SORTIE) {
    fs.mkdirSync(SORTIE, { recursive: true });
    for (const t of TAILLES) fs.writeFileSync(path.join(SORTIE, `${path.basename(nom, '.svg')}-${t}.png`), Buffer.from(res.rendus[String(t)], 'base64'));
  }
  const ref = masque(png[REFERENCE], SEUIL_ENCRE);
  const topoRef = topologie(ref, REFERENCE, REFERENCE);
  const m = { reference: { ...topoRef, encre_px: ref.reduce((a, b) => a + b, 0) } };

  for (const t of TAILLES) {
    const grave = t === 16;
    // LP1 — trait plus fin qu'un pixel de cette taille
    const diametre = REFERENCE / t;                 // un pixel de la taille jugée, en pixels de référence
    const fin = partFine(ref, REFERENCE, REFERENCE, diametre / 2 - 0.5);
    // LP2 — pièces et trous du rendu contre la référence
    const rendue = masque(png[t], SEUIL_ENCRE);
    const topo = topologie(rendue, t, t);
    m[t] = { part_fine: Math.round(fin.part * 1000) / 1000, pieces: topo.pieces, trous: topo.trous, plus_petit_trou_px: topo.plus_petit_trou };

    if (fin.part > SEUILS.partFineMajeure) {
      add(grave ? 'majeur' : 'avertissement', 'LP1', `${nom} à ${t} px : ${pct(fin.part)} de l'encre est plus fine qu'un pixel (seuil ${pct(SEUILS.partFineMajeure)}) — un trait de moins de ${(100 / t).toFixed(1)} % du côté du logo sort en gris pâle ou en pointillé ; épaissir les traits`, res.fichier);
    } else if (grave && fin.part > SEUILS.partFineAvert) {
      add('avertissement', 'LP1', `${nom} à ${t} px : ${pct(fin.part)} de l'encre est plus fine qu'un pixel (avertissement dès ${pct(SEUILS.partFineAvert)}) — un détail trop fin reste flou`, res.fichier);
    }
    const ecarts = [];
    if (topo.pieces !== topoRef.pieces) ecarts.push(`${topo.pieces} pièce(s) d'encre au lieu de ${topoRef.pieces}`);
    if (topo.trous !== topoRef.trous) ecarts.push(`${topo.trous} trou(s) au lieu de ${topoRef.trous}`);
    if (ecarts.length) {
      add(grave ? 'majeur' : 'avertissement', 'LP2', `${nom} à ${t} px : ${ecarts.join(', ')} — un détail fusionne ou disparaît à cette taille (écarter les pièces ou agrandir les trous)`, res.fichier);
    } else if (grave && topo.plus_petit_trou !== null && topo.plus_petit_trou < 2) {
      add('avertissement', 'LP2', `${nom} à ${t} px : un trou ne survit que sur ${topo.plus_petit_trou} pixel — à la limite de survie, le moindre décalage de grille le rebouche ; l'agrandir à 2 px ou le supprimer`, res.fichier);
    }
  }

  // LP4 — présence à 16 px
  const p16 = png[16];
  let minX = 16, minY = 16, maxX = -1, maxY = -1, presents = 0;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (p16.pixels[(y * 16 + x) * p16.canaux + 3] < SEUIL_PRESENCE) continue;
    presents++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  m.presence_16 = { pixels: presents, cote_max: presents ? Math.max(maxX - minX + 1, maxY - minY + 1) : 0 };
  if (!presents) {
    add('majeur', 'LP4', `${nom} à 16 px : aucun pixel d'opacité ${Math.round(SEUIL_PRESENCE / 255 * 100)} % ou plus — le logo disparaît à la taille d'un onglet`, res.fichier);
  } else if (m.presence_16.cote_max / 16 < SEUILS.occupationMin) {
    add('avertissement', 'LP4', `${nom} à 16 px : le pictogramme n'occupe que ${m.presence_16.cote_max} px sur 16 (moins de ${pct(SEUILS.occupationMin)} de la boîte) — marge excessive du viewBox, il est rendu plus petit que la taille demandée`, res.fichier);
  }

  // LP3 — contraste du pictogramme sur chaque fond déclaré
  for (const fond of fondsLus) {
    let encre = 0, faibles = 0;
    for (let i = 0; i < 16 * 16; i++) {
      if (p16.pixels[i * p16.canaux + 3] < SEUIL_ENCRE) continue;
      encre++;
      const c = { r: p16.pixels[i * p16.canaux], g: p16.pixels[i * p16.canaux + 1], b: p16.pixels[i * p16.canaux + 2] };
      if (contrast(c, fond.couleur) < SEUILS.contrasteMin) faibles++;
    }
    m[`contraste_${fond.texte}`] = { encre_px: encre, sous_3_pour_1: faibles };
    if (encre && faibles / encre > SEUILS.partSousContraste) {
      add('majeur', 'LP3', `${nom} sur le fond ${fond.texte} : ${pct(faibles / encre)} de l'encre à 16 px a un contraste inférieur à ${SEUILS.contrasteMin}:1 (seuil ${pct(SEUILS.partSousContraste)}, critère WCAG 1.4.11) — le pictogramme se confond avec son fond`, res.fichier);
    }
  }

  // LP5 — texte vivant
  if (/<text[\s>]/i.test(fs.readFileSync(res.fichier, 'utf8'))) {
    add('avertissement', 'LP5', `${nom} : le SVG porte du texte vivant (<text>) — son rendu dépend des polices du poste ; convertir en tracés`, res.fichier);
  }
  mesures[nom] = m;
}

if (!fondsLus.length) NJ.push('LP3 (contraste du pictogramme sur son fond) non jouée : aucun --fond fourni, un fond d\'usage ne se déduit pas du fichier');
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(!jugees ? 'SKIP — aucun logo jugé\n' : durs.length ? `FAIL — ${durs.length} écart(s) dur(s) sur ${jugees} logo(s)\n` : `PASS — ${jugees} logo(s) jugé(s) à ${TAILLES.join(' et ')} px\n`);
if (!jugees) { NJ.push('aucun logo jugé'); sortir('SKIP', 2); }
if (durs.length) sortir('FAIL', 1);
sortir('PASS', 0);
