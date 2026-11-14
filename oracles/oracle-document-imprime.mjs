#!/usr/bin/env node
// oracle-document-imprime — Domaine « Support imprimé ou projeté : PPTX et PDF » (déterministe).
//
// TF-2386 (retour du 29/09/2026, RV-206) et TF-2385 (retour du 28/09/2026, RV-205). Les oracles de la forge design
// lisent du HTML : oracle-slop, oracle-tokens, oracle-taste, oracle-images, oracle-a11y et render_page.py rendent
// « non exécuté, entrée HTML seulement » sur un deck PPTX ou un PDF. Le relecteur du deck d'une propale a mesuré à la
// main le motif S1 d'oracle-slop sur la géométrie du PPTX et écrit ses propres scripts de contraste et de débordement
// (seq 441). Et l'équilibre des colonnes d'une page imprimée n'avait aucun juge : 19,8 mm de vide sous les cartes de la
// page 1 d'un dossier de compétences, vus par la seule sonde de la critique d'implémentation, qui note aussi que
// l'émulation d'impression de Playwright place les cartes 2,2 mm plus haut que l'impression Chrome : une sonde
// d'impression lit le PDF.
//
// Ce que l'oracle lit : la géométrie qu'un rendu pose, en points (lib/lire_document_imprime.py : PPTX par python-pptx, PDF par
// PyMuPDF) — aplats, textes, images, dans l'ordre de superposition. Une page HTML est d'abord imprimée en PDF par Chromium
// (lib/imprimer_page.py) : on juge le PDF, pas l'écran.
//
// Cinq règles, décidables sur cette géométrie :
//   DP1  une forme pleine de moins de 0,1 po de large, plus haute que large, ACCOLÉE au bord d'un bloc : le bandeau
//        latéral coloré du motif S1 d'oracle-slop, transposé aux supports sans CSS (PPTX et PDF)
//   DP2  contraste d'un texte contre l'aplat qui le porte : 4.5:1, 3:1 pour un grand texte (≥ 18 pt, ou ≥ 14 pt gras)
//   DP3  débordement : un texte ou une image qui sort de la page ; un texte PDF qui sort du bloc qui le porte ; un
//        texte PPTX dont la hauteur estimée dépasse sa boîte (estimation, en avertissement)
//   DP4  équilibre des colonnes (PDF) : les pieds de deux colonnes côte à côte diffèrent de plus du seuil
//   DP5  vide sous le contenu (PDF) : une page suivie d'une autre s'arrête plus haut que la page la plus pleine,
//        de plus du seuil — les 19,8 mm sous les cartes de la page 1
//
// Seuils : DP1 et DP2 sont des constantes de norme ou de la règle S1 ; DP4 et DP5 ont UN seuil de 10 mm (--seuil-mm), posé
// entre les deux mesures du retour (19,8 mm refusés, 5,3 mm acceptés) : c'est un réglage de la forge, à réviser sur les
// retours des produits. Une page où l'écart est VOULU (un saut de page par section) se déclare par --pages-libres 3,5 :
// c'est la déclaration qui exempte, jamais la forme de la page.
//
// Ce que cet oracle NE juge PAS est déclaré en non_juge, à chaque sortie.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-document-imprime.mjs <fichier.pptx|.pdf|.html> [--seuil-mm 10] [--pages-libres 1,4] [--json-only]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse as couleur, contrast } from './lib/color.mjs';
import { plageDeRegles } from './lib/regles-jouees.mjs';
// TF-2287 — les règles que l'oracle JOUE, déclarées UNE fois ; la plage citée à la sortie en dérive, jamais écrite en dur.
const REGLES_JOUEES = ['DP1', 'DP2', 'DP3', 'DP4', 'DP5'];
const PLAGE_JOUEE = plageDeRegles(REGLES_JOUEES);

const DOM = 'Support imprimé ou projeté : PPTX et PDF';
const ici = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const opt = n => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const file = args.find((a, i) => !a.startsWith('--') && !['--seuil-mm', '--pages-libres'].includes(args[i - 1]));

const MM = 72 / 25.4;
const SEUIL_MM = opt('--seuil-mm') !== null ? Number(opt('--seuil-mm')) : 10;
const PAGES_LIBRES = new Set((opt('--pages-libres') || '').split(',').map(s => Number(s.trim())).filter(Number.isFinite));
const mm = pt => (pt / MM).toFixed(1);

// Constantes de norme ou de règle
const BANDEAU_MAX_PT = 0.1 * 72;   // « moins de 0,1 po »
const BANDEAU_MIN_PT = 1.4;        // 2 px (1,5 pt) et plus : la règle S1 vise « border > 1px » ; un filet de 1 pt n'est pas un bandeau
const ACCOLE_PT = 3;               // écart toléré entre la forme et le bord du bloc
const SEUIL_TEXTE = 4.5, SEUIL_GRAND = 3;
const estGrand = s => s.taille >= 18 || (s.gras && s.taille >= 14);

const NJ = [
  'rendu réel d\'un PPTX (polices de remplacement, retours à la ligne, ordre de superposition exact) — l\'export PDF depuis le logiciel de présentation, puis cet oracle sur ce PDF',
  'lisibilité sémantique : ordre de lecture, balisage du PDF (PDF/UA), texte alternatif des images, langue — hors périmètre d\'une lecture de géométrie',
  'contraste d\'un texte posé sur une image, un dégradé, un motif ou un aplat translucide non résolu : fond non mesurable, compté plus bas quand il existe',
  'DP4 et DP5 supposent qu\'un écart est un défaut : un saut de page VOULU (une section par page) produit le même vide, et seule la déclaration --pages-libres le dit',
];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

// TF-2535 — « sans écart » dit qu'un jugement a eu lieu : un SKIP n'a rien jugé, il ne rend jamais cette ligne.
function sortir(verdict, code, artefact = file || null) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-document-imprime', domaine: DOM, artefact,
    verdict, findings: F.length || verdict === 'SKIP' ? F : [{ sev: 'info', regle: '—', msg: `${PLAGE_JOUEE} sans écart`, where: artefact }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) { NJ.push('fichier absent'); sortir('SKIP', 2); }
const ext = path.extname(file).toLowerCase();
if (!['.pptx', '.pdf', '.html', '.htm'].includes(ext)) {
  NJ.push(`cible de format non pris en charge (${ext || 'sans extension'}) : attendu .pptx, .pdf ou une page .html à imprimer`);
  sortir('SKIP', 2);
}
if (!Number.isFinite(SEUIL_MM) || SEUIL_MM <= 0) { NJ.push(`--seuil-mm « ${opt('--seuil-mm')} » : un nombre de millimètres strictement positif est attendu`); sortir('SKIP', 2); }

// ── Outillage : un interpréteur Python qui importe PyMuPDF et python-pptx (et playwright pour une page HTML) ──
function python(modules) {
  for (const candidat of ['python', 'python3']) {
    const r = spawnSync(candidat, ['-c', `import ${modules.join(', ')}`], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return candidat;
  }
  return null;
}
const MODULES = ext === '.html' || ext === '.htm' ? ['pymupdf', 'pptx', 'playwright'] : ['pymupdf', 'pptx'];
const PY = python(MODULES);
if (!PY) {
  NJ.push(`outillage absent : aucun interpréteur Python (python / python3) n'importe ${MODULES.join(', ')} — pip install pymupdf python-pptx${MODULES.includes('playwright') ? ' playwright' : ''}. Rien n'est jugé.`);
  sortir('SKIP', 2);
}
const env = { ...process.env, PYTHONUTF8: '1' };

// ── Lecture de la géométrie ──
let cible = file;
let dossierTmp = null;
let imprime = false;
if (ext === '.html' || ext === '.htm') {
  dossierTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'document-imprime-'));
  cible = path.join(dossierTmp, 'imprime.pdf');
  const r = spawnSync(PY, [path.join(ici, 'lib', 'imprimer_page.py'), file, cible], { encoding: 'utf8', env, timeout: 120000 });
  if (r.status !== 0 || !fs.existsSync(cible)) {
    NJ.push(`impression de la page en PDF impossible (${(r.stderr || r.stdout || 'sans message').trim().slice(0, 200)}) : rien n'est jugé`);
    fs.rmSync(dossierTmp, { recursive: true, force: true });
    sortir('SKIP', 2);
  }
  imprime = true;
  NJ.push('le PDF produit par Chromium (page.pdf) n\'est pas l\'impression du navigateur du lecteur : un écart de 2,2 mm a été mesuré entre l\'émulation d\'impression de Playwright et l\'impression Chrome (retour du 28/09/2026). Pour un pied de page à la tolérance du millimètre, imprimer en PDF depuis le navigateur et fournir ce PDF');
}
const lu = spawnSync(PY, [path.join(ici, 'lib', 'lire_document_imprime.py'), cible], { encoding: 'utf8', env, maxBuffer: 256 * 1024 * 1024, timeout: 120000 });
if (dossierTmp) fs.rmSync(dossierTmp, { recursive: true, force: true });
let doc = null;
try { doc = JSON.parse(lu.stdout); } catch { /* illisible : dit ci-dessous */ }
if (lu.status !== 0 || !doc) {
  NJ.push(`fichier illisible : ${(lu.stderr || 'sortie vide').trim().slice(0, 250)}. Rien n'est jugé.`);
  sortir('SKIP', 2);
}
NJ.push(...doc.non_juge);
const estPdf = doc.format === 'pdf';
const nature = imprime ? 'page' : (estPdf ? 'page' : 'diapositive');
const lieu = p => `${nature} ${p.n}`;
if (!doc.pages.length) { NJ.push('document sans page ni diapositive : rien à juger'); sortir('SKIP', 2); }

// ── Géométrie ──
const contient = (e, cx, cy) => cx >= e.x && cx <= e.x + e.w && cy >= e.y && cy <= e.y + e.h;
const aire = e => e.w * e.h;
const PLEINE_PAGE = (p, e) => aire(e) >= 0.8 * p.largeur * p.hauteur;
const hex = h => couleur(h);

/** Fond effectif d'un texte : le dernier aplat qui le contient, sous lui (null = non mesurable, avec le motif). */
function fondDe(p, indice, cx, cy) {
  let fond = p.fond, motif = null;
  for (let i = 0; i < p.elements.length; i++) {
    const e = p.elements[i];
    const dessous = i < indice;
    if (e.type === 'image' && contient(e, cx, cy) && (dessous || estPdf)) { fond = null; motif = 'image'; continue; }
    if (e.type !== 'forme' || !dessous || !contient(e, cx, cy)) continue;
    if (e.fond === null) { fond = null; motif = e.indecidable || 'fond non résolu'; continue; }
    if (e.opacite < 1) {
      if (fond === null) continue;
      const a = hex(e.fond), b = hex(fond);
      if (!a || !b) { fond = null; motif = 'fond non résolu'; continue; }
      const m = (x, y) => Math.round(x * e.opacite + y * (1 - e.opacite));
      fond = '#' + [m(a.r, b.r), m(a.g, b.g), m(a.b, b.b)].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      continue;
    }
    fond = e.fond; motif = null;
  }
  return { fond, motif };
}

// ── DP1 · forme étroite accolée au bord d'un bloc ───────────────────────────
// Le motif S1 d'oracle-slop (« bandeau latéral coloré ») sans CSS : une forme pleine de moins de 0,1 po de large, plus
// haute que large, dont un bord touche le bord gauche ou droit d'un bloc (texte ou aplat) sur l'essentiel de sa hauteur.
// Une forme à la marge de la page, sans bloc contre elle, n'est pas un bandeau accolé.
for (const p of doc.pages) {
  for (const [i, b] of p.elements.entries()) {
    if (b.type !== 'forme' || b.fond === null) continue;
    if (!(b.w > BANDEAU_MIN_PT && b.w < BANDEAU_MAX_PT && b.h >= 4 * b.w && b.h >= 18)) continue;
    for (const [k, bloc] of p.elements.entries()) {
      if (k === i || bloc.type === 'image' || PLEINE_PAGE(p, bloc)) continue;
      if (bloc.type === 'forme' && bloc.fond === null) continue;
      if (bloc.w < 36 || bloc.h < 12 || bloc.w <= b.w * 2) continue; // un bloc, pas une autre barre
      const recouvre = Math.min(b.y + b.h, bloc.y + bloc.h) - Math.max(b.y, bloc.y);
      if (recouvre < 0.6 * b.h) continue;
      const surGauche = b.x + b.w >= bloc.x - ACCOLE_PT && b.x <= bloc.x + ACCOLE_PT;
      const surDroite = b.x <= bloc.x + bloc.w + ACCOLE_PT && b.x + b.w >= bloc.x + bloc.w - ACCOLE_PT;
      if (!surGauche && !surDroite) continue;
      add('bloquant', 'DP1',
        `forme pleine ${b.fond} de ${(b.w / 72).toFixed(2)} po de large sur ${(b.h / 72).toFixed(1)} po de haut, accolée au bord ${surGauche ? 'gauche' : 'droit'} d'un bloc ` +
        `(${bloc.type === 'texte' ? 'texte' : 'aplat ' + bloc.fond}, ${(bloc.w / 72).toFixed(1)} × ${(bloc.h / 72).toFixed(1)} po) : bandeau latéral coloré, le motif S1 d'oracle-slop — ` +
        'séparer la forme du bloc, la supprimer, ou porter la hiérarchie par la typographie et l\'aplat du bloc',
        `${lieu(p)}, forme à x=${(b.x / 72).toFixed(2)} po y=${(b.y / 72).toFixed(2)} po`);
      break; // un constat par forme
    }
  }
}

// ── DP2 · contraste du texte contre l'aplat qui le porte ────────────────────
const indecidables = { n: 0, motifs: new Set() };
let nonResolus = 0, mesures = 0;
for (const p of doc.pages) {
  const vus = new Set();
  for (const [i, e] of p.elements.entries()) {
    if (e.type !== 'texte') continue;
    for (const s of e.spans) {
      if (!s.couleur) { nonResolus++; continue; }
      const bb = s.bbox, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
      const { fond, motif } = fondDe(p, i, cx, cy);
      if (fond === null) { indecidables.n++; indecidables.motifs.add(motif); continue; }
      const ct = hex(s.couleur), cf = hex(fond);
      if (!ct || !cf) { nonResolus++; continue; }
      mesures++;
      const ratio = contrast(ct, cf);
      const seuil = estGrand(s) ? SEUIL_GRAND : SEUIL_TEXTE;
      if (ratio >= seuil) continue;
      const cle = `${s.couleur}|${fond}|${estGrand(s)}`;
      if (vus.has(cle)) continue;
      vus.add(cle);
      add('majeur', 'DP2',
        `contraste ${ratio.toFixed(2)}:1 < ${seuil}:1 — texte ${s.couleur} sur ${fond}${estGrand(s) ? ' (grand texte)' : ''}, « ${s.texte.trim().slice(0, 40)} » en ${s.taille.toFixed(0)} pt`,
        lieu(p));
    }
  }
}
if (mesures === 0) {
  add('avertissement', 'DP2', 'aucun texte dont le fond soit mesurable : AUCUN contraste n\'a été mesuré — le PASS de cet oracle ne vaut pas validation du contraste', 'document');
}
if (indecidables.n) NJ.push(`DP2 : ${indecidables.n} texte(s) posé(s) sur un fond non mesurable (${[...indecidables.motifs].join(', ')}) — contraste non jugé, à mesurer au rendu`);
if (nonResolus) NJ.push(`DP2 : ${nonResolus} texte(s) dont la couleur ou le fond n'a pas pu être lu — contraste non jugé`);

// ── DP3 · débordement ───────────────────────────────────────────────────────
const TOL = 1; // pt
for (const p of doc.pages) {
  for (const e of p.elements) {
    if (e.type !== 'texte' && e.type !== 'image') continue;
    const dehors = [];
    if (e.x < -TOL) dehors.push(`${(-e.x).toFixed(0)} pt à gauche`);
    if (e.y < -TOL) dehors.push(`${(-e.y).toFixed(0)} pt en haut`);
    if (e.x + e.w > p.largeur + TOL) dehors.push(`${(e.x + e.w - p.largeur).toFixed(0)} pt à droite`);
    if (e.y + e.h > p.hauteur + TOL) dehors.push(`${(e.y + e.h - p.hauteur).toFixed(0)} pt en bas`);
    if (!dehors.length) continue;
    const quoi = e.type === 'texte' ? `texte « ${e.spans[0].texte.trim().slice(0, 40)} »` : 'image';
    add('majeur', 'DP3', `${quoi} qui sort de la ${nature} de ${dehors.join(', ')} (${(p.largeur / 72).toFixed(2)} × ${(p.hauteur / 72).toFixed(2)} po)`, lieu(p));
  }
  if (estPdf) {
    // un texte qui déborde du bloc qui le porte : il chevauche l'aplat sans y tenir
    const cartes = p.elements.filter(e => e.type === 'forme' && e.fond !== null && e.w >= 40 && e.h >= 20 && !PLEINE_PAGE(p, e));
    for (const e of p.elements.filter(x => x.type === 'texte')) {
      for (const s of e.spans) {
        const [x0, y0, x1, y1] = s.bbox;
        for (const c of cartes) {
          const ox = Math.min(x1, c.x + c.w) - Math.max(x0, c.x), oy = Math.min(y1, c.y + c.h) - Math.max(y0, c.y);
          if (ox <= 0 || oy <= 0) continue;
          const dedans = ox * oy / ((x1 - x0) * (y1 - y0));
          const sort = x0 < c.x - 1.5 || x1 > c.x + c.w + 1.5 || y0 < c.y - 1.5 || y1 > c.y + c.h + 1.5;
          if (dedans >= 0.3 && sort) {
            add('majeur', 'DP3', `texte « ${s.texte.trim().slice(0, 40)} » qui dépasse du bloc qui le porte (aplat ${c.fond} de ${(c.w / 72).toFixed(1)} × ${(c.h / 72).toFixed(1)} po)`, lieu(p));
            break;
          }
        }
      }
    }
  } else {
    // PPTX : estimation de la hauteur du texte contre sa boîte — dite estimation, jamais un constat dur
    for (const e of p.elements.filter(x => x.type === 'texte')) {
      if (!e.retour_auto || /SHAPE_TO_FIT_TEXT/.test(e.ajuste || '')) continue;
      const taille = Math.max(...e.spans.map(s => s.taille));
      const signes = e.spans.reduce((n, s) => n + s.texte.length, 0);
      const utile = Math.max(e.w - 14.4, 1);
      const lignes = Math.ceil(signes * 0.5 * taille / utile);
      const hauteur = lignes * taille * 1.2 + 7.2;
      if (hauteur > e.h + 1) {
        add('avertissement', 'DP3', `texte « ${e.spans[0].texte.trim().slice(0, 40)} » : hauteur ESTIMÉE ${(hauteur / 72).toFixed(2)} po pour une boîte de ${(e.h / 72).toFixed(2)} po (${lignes} ligne(s) de ${taille.toFixed(0)} pt) — estimation sur la largeur moyenne des signes, à mesurer sur l'export PDF`, lieu(p));
      }
    }
  }
}

// ── DP4 · équilibre des colonnes, DP5 · vide sous le contenu — lus sur le PDF imprimé ──
if (!estPdf) {
  NJ.push('DP4 et DP5 non jouées : l\'équilibre des colonnes et le vide sous le contenu se lisent sur le PDF IMPRIMÉ (TF-2385) ; un PPTX n\'est pas paginé par le moteur d\'impression — exporter en PDF, puis rejouer cet oracle');
} else {
  const modele = doc.pages.map(p => {
    const cartes = p.elements.filter(e => e.type === 'forme' && e.fond !== null && e.w >= 40 && e.h >= 30 && !PLEINE_PAGE(p, e));
    const dansCarte = e => cartes.some(c => contient(c, e.x + e.w / 2, e.y + e.h / 2));
    const courant = (e, autres) => e.type === 'texte' && e.y >= 0.9 * p.hauteur &&
      (/^\s*\d+(\s*[\/sur]+\s*\d+)?\s*$/i.test(e.spans.map(s => s.texte).join('')) ||
       autres.some(q => q !== p && q.elements.some(f => f.type === 'texte' && Math.abs(f.x - e.x) < 2 && Math.abs(f.y - e.y) < 2)));
    const libres = p.elements.filter(e => (e.type === 'texte' && !dansCarte(e) && !courant(e, doc.pages)) || e.type === 'image');
    return { p, cartes, contenu: [...cartes, ...libres] };
  });
  const pied = m => m.contenu.length ? Math.max(...m.contenu.map(e => e.y + e.h)) : null;
  const seuilPt = SEUIL_MM * MM;

  // DP5 — une page suivie d'une autre qui s'arrête plus haut que la page la plus pleine
  const pieds = modele.map(pied);
  const zoneBas = Math.max(...pieds.filter(v => v !== null));
  if (doc.pages.length < 2) {
    NJ.push('DP5 sans objet : un document d\'une seule page n\'a pas de page « suivie d\'une autre »');
  } else {
    for (const [i, m] of modele.entries()) {
      if (i === modele.length - 1 || pieds[i] === null || PAGES_LIBRES.has(m.p.n)) continue;
      const vide = zoneBas - pieds[i];
      if (vide > seuilPt) {
        add('majeur', 'DP5',
          `${mm(vide)} mm de vide sous le dernier bloc : le contenu s'arrête à ${mm(pieds[i])} mm du haut, la page la plus pleine descend jusqu'à ${mm(zoneBas)} mm (seuil ${SEUIL_MM} mm) — ` +
          'si le saut de page est voulu, déclarer la page par --pages-libres',
          lieu(m.p));
      }
    }
  }

  // DP4 — les pieds de colonnes côte à côte
  for (const m of modele) {
    if (PAGES_LIBRES.has(m.p.n)) continue;
    const etroits = m.contenu.filter(e => e.w < 0.6 * m.p.largeur).sort((a, b) => a.x - b.x);
    const colonnes = [];
    for (const e of etroits) {
      const c = colonnes.find(k => Math.min(k.x1, e.x + e.w) - Math.max(k.x0, e.x) > 0.5 * Math.min(k.x1 - k.x0, e.w));
      if (c) { c.items.push(e); c.x0 = Math.min(c.x0, e.x); c.x1 = Math.max(c.x1, e.x + e.w); }
      else colonnes.push({ x0: e.x, x1: e.x + e.w, items: [e] });
    }
    const vraies = colonnes.filter(k => k.items.length >= 2).map(k => ({
      ...k, haut: Math.min(...k.items.map(e => e.y)), pied: Math.max(...k.items.map(e => e.y + e.h)),
    }));
    for (let a = 0; a < vraies.length; a++) {
      for (let b = a + 1; b < vraies.length; b++) {
        const A = vraies[a], B = vraies[b];
        const cote = Math.min(A.pied, B.pied) - Math.max(A.haut, B.haut);
        if (cote < 0.5 * Math.min(A.pied - A.haut, B.pied - B.haut)) continue; // pas côte à côte
        const ecart = Math.abs(A.pied - B.pied);
        if (ecart > seuilPt) {
          add('majeur', 'DP4',
            `colonnes déséquilibrées : la colonne de gauche (x=${mm(A.x0)} mm) finit à ${mm(A.pied)} mm, celle de droite (x=${mm(B.x0)} mm) à ${mm(B.pied)} mm — ${mm(ecart)} mm d'écart (seuil ${SEUIL_MM} mm)`,
            lieu(m.p));
        }
      }
    }
  }
  NJ.push(`DP4 et DP5 : seuil unique de ${SEUIL_MM} mm, posé entre 19,8 mm (refusé) et 5,3 mm (accepté) des retours du 25 et 28/09/2026 — un réglage de la forge, à réviser sur les retours des produits ; un pied de page courant (numéro de page, élément répété) n'est pas du contenu`);
}

// ── Verdict ─────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(dur.length
  ? `FAIL — ${dur.length} écart(s) dur(s) sur ${doc.pages.length} ${nature}(s) (${doc.format})\n`
  : `PASS — ${doc.pages.length} ${nature}(s) (${doc.format}), ${PLAGE_JOUEE} sans écart dur\n`);
if (dur.length) sortir('FAIL', 1);
sortir('PASS', 0);
