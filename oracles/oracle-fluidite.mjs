#!/usr/bin/env node
// oracle-fluidite — Domaine « Fluidité d'une page animée : durée d'image de bout en bout » (rendu réel).
//
// D-108 (b), 29/10/2026. Chez un produit (visite 3D animée), un oracle de fluidité a rendu PASS à
// « 60 images par seconde » alors que la mesure réelle donnait 3,3 : il comptait les rappels de
// requestAnimationFrame sans attendre le travail du processeur graphique. Ce juge ne compte pas des
// rappels : il ouvre la page dans Chromium, et ferme CHAQUE image par une lecture synchronisante du
// canevas WebGL (lecture d'un pixel, readPixels ; gl.finish() seul ne bloque pas). La durée d'image qu'il rend est celle du travail
// de la page ET de la carte (`lib/fluidite.mjs`, qui porte la doctrine, les seuils et le jugement).
//
//   F1  cadence mesurée de bout en bout sous 30 images par seconde — bloquant
//   F2  95e centile de la durée d'image au-delà de 50 ms (saccades) — avertissement
//   F3  cadence entre 30 et 55 images par seconde, sous la cadence d'écran — avertissement
//   F0  la mesure elle-même (info), ou le MOTIF d'un SKIP
//
// PASS n'a qu'une porte : des images toutes synchronisées sur le travail graphique, sur une fenêtre
// assez longue, au-dessus du plancher. Mesure impossible (pas de navigateur, pas de contexte WebGL,
// pas d'animation, synchronisation en échec, contexte perdu) ⇒ SKIP motivé, exit 2 — jamais PASS.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[],mesures} · exit 0/1/2.
// Usage : node oracle-fluidite.mjs <page.html|url> [--largeur N] [--hauteur N] [--echauffement ms]
//         [--fenetre ms] [--temoin-naif] [--json-only]
//
// --temoin-naif : rejoue en plus l'ANCIENNE mesure (compte de rappels, sans attendre la carte) dans une
// session neuve, et la rend à côté, au champ `mesures.ancienne_mesure` et en constat info F0. Elle ne
// fonde jamais le verdict ; elle sert à montrer ce que l'ancien oracle aurait annoncé (la recette s'en
// sert pour prouver que sa fixture rouge reproduit bien le cas du 27/10).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { detecterOutillageRendu } from './lib/rendu.mjs';
import { SEUILS, SCRIPT_MESURE, jugerFluidite } from './lib/fluidite.mjs';

const DOM = 'Fluidité d\'une page animée : durée d\'image de bout en bout';
const ici = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const jsonOnly = args.includes('--json-only');
const temoinNaif = args.includes('--temoin-naif');
const VALEURS = ['--largeur', '--hauteur', '--echauffement', '--fenetre'];
const cible = args.find((a, i) => !a.startsWith('--') && !VALEURS.includes(args[i - 1]));
const LARGEUR = Number(opt('--largeur')) || 1280;
const HAUTEUR = Number(opt('--hauteur')) || 720;
const ECHAUFFEMENT = Number(opt('--echauffement')) || SEUILS.echauffementMs;
const FENETRE = Number(opt('--fenetre')) || SEUILS.fenetreMs;

const NJ = [
  'la PRÉSENTATION à l\'écran (compositeur, synchronisation verticale, affichage réel) : la durée d\'image s\'arrête quand le travail graphique de la page est terminé (lecture d\'un pixel du canevas), pas quand l\'image est affichée',
  'seuls les canevas WebGL / WebGL2 de la PAGE PRINCIPALE sont attendus : un canevas dans une iframe, un OffscreenCanvas piloté par un worker, un canevas 2D et les animations CSS ne sont pas mesurés ici',
  'la durée est celle de CE poste et de CE moteur de rendu (nommé dans la mesure) : sur un rendu logiciel (SwiftShader, llvmpipe), elle majore la durée d\'un vrai processeur graphique ; sur une carte plus rapide que celle de l\'utilisateur, elle la minore',
  'l\'animation AU REPOS seulement : aucune interaction n\'est jouée (rotation, défilement, changement de scène, ouverture d\'un panneau) — une page lente seulement sous geste n\'est pas vue',
  'les seuils (30 i/s au plancher, 55 i/s visés, 95e centile de 50 ms) sont un choix de la forge rendu dans `mesures.seuils`, pas une norme',
];
const F = [];
let mesures = null;

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-fluidite', domaine: DOM, artefact: cible || null, verdict,
    largeur: LARGEUR, hauteur: HAUTEUR,
    findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'durée d\'image sans écart (règles de lib/fluidite.mjs)', where: cible }],
    non_juge: NJ, ...(mesures ? { mesures } : {}),
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

function skip(motif) { NJ.unshift(motif); F.push({ sev: 'info', regle: 'F0', msg: `SKIP — ${motif}`, where: cible || null }); sortir('SKIP', 2); }

if (!cible) skip('aucune cible fournie (fichier HTML ou URL http(s))');
let url = cible;
if (!/^https?:\/\//i.test(cible)) {
  if (!fs.existsSync(cible)) skip(`cible introuvable : ${cible}`);
  url = pathToFileURL(path.resolve(cible)).href;
}

const outillage = detecterOutillageRendu();
if (!outillage.python || outillage.manques.some((m) => /playwright|python/i.test(m))) {
  skip(`outillage de rendu indisponible (aucune durée d'image ne peut être mesurée) : ${outillage.manques.join(' ; ')}`);
}

const r = spawnSync(outillage.python, [path.join(ici, 'lib', 'mesure_fluidite.py')], {
  input: JSON.stringify({
    cible: url, largeur: LARGEUR, hauteur: HAUTEUR, init: SCRIPT_MESURE,
    armer: '(mode) => window.__forgeFluidite.armer(mode)',
    demarrer: '() => window.__forgeFluidite.demarrer()',
    arreter: '() => window.__forgeFluidite.arreter()',
    echauffement_ms: ECHAUFFEMENT, fenetre_ms: FENETRE,
    passes: temoinNaif ? ['naif', 'bout_en_bout'] : ['bout_en_bout'],
  }),
  encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' }, maxBuffer: 64 * 1024 * 1024,
  timeout: 120000 + 2 * (ECHAUFFEMENT + FENETRE),
});
let sortiePilote = null;
try { sortiePilote = JSON.parse((r.stdout || '').trim().split(/\r?\n/).pop()); } catch { /* illisible, dit ci-dessous */ }
if (!sortiePilote || !sortiePilote.ok) {
  skip(`rendu impossible : ${(sortiePilote && sortiePilote.erreur) || (r.stderr || '').trim().split(/\r?\n/).pop() || 'sortie du pilote illisible'}`);
}

const passeDe = (mode) => sortiePilote.passes.find((p) => p.mode === mode);
const passeMesure = passeDe('bout_en_bout');
const juge = jugerFluidite(passeMesure.brut);
const tentatives = passeMesure.tentatives || [];
mesures = { ...juge.mesures, navigateur: sortiePilote.navigateur, tentatives };
// Un contexte perdu est rejoué par le pilote (lib/mesure_fluidite.py) : la mesure dit quelle stratégie l'a
// fournie, et qu'un moteur logiciel a été FORCÉ s'il l'a été — la durée est alors celle du processeur central.
const derniere = tentatives[tentatives.length - 1];
if (tentatives.length > 1) {
  NJ.unshift(`mesure obtenue à la tentative ${tentatives.length} sur ${tentatives.length} jouée(s) : le contexte WebGL a été perdu aux précédentes `
    + `(${tentatives.slice(0, -1).map((t) => t.strategie).join(', ')}) — poste instable, cause non établie`);
}
if (derniere && derniere.strategie === 'logiciel_force') {
  NJ.unshift('moteur de rendu LOGICIEL FORCÉ (--use-angle=swiftshader) après perte du contexte avec le moteur par défaut : la cadence mesurée est celle du processeur central de ce poste, non celle d\'une carte graphique');
}

// Le témoin : ce que l'ancienne mesure aurait annoncé sur cette même page. Il ne pèse sur aucun verdict.
if (temoinNaif) {
  const n = passeDe('naif').brut;
  const imgs = Array.isArray(n.images) ? n.images : [];
  if (imgs.length > 1) {
    const fenetre = imgs[imgs.length - 1][0] - imgs[0][0];
    mesures.ancienne_mesure = {
      methode: 'compte de rappels requestAnimationFrame, sans attendre le travail graphique',
      images: imgs.length, fps: Math.round(((imgs.length - 1) / fenetre) * 10000) / 10,
      // Selon le moteur, le navigateur freine ou non les rappels quand la carte est en retard : le témoin dit lequel.
      strategie: ((passeDe('naif').tentatives || []).slice(-1)[0] || {}).strategie || null,
    };
    juge.findings.push({
      sev: 'info', regle: 'F0',
      msg: `témoin — l'ancienne mesure aurait annoncé ${mesures.ancienne_mesure.fps} i/s (${imgs.length} rappels) ; `
        + `la mesure de bout en bout donne ${mesures.fps ?? 'n/d'} i/s. Seule la seconde fonde le verdict`,
      where: 'canevas WebGL',
    });
  } else {
    mesures.ancienne_mesure = { methode: 'compte de rappels', images: imgs.length, fps: null };
  }
}

F.push(...juge.findings);
if (juge.verdict === 'SKIP') { NJ.unshift(juge.motif); sortir('SKIP', 2); }
if (mesures.rendu_logiciel) NJ.unshift(`moteur de rendu LOGICIEL (${mesures.rendu_gl}) : aucun processeur graphique sur ce poste — la cadence mesurée est une borne haute de la durée d'une vraie carte`);

const dur = F.filter((f) => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) {
  process.stderr.write(dur.length
    ? `FAIL — ${dur.length} écart(s) dur(s) : ${mesures.fps} i/s de bout en bout\n`
    : `PASS — ${mesures.fps} i/s de bout en bout sur ${mesures.images} images\n`);
}
sortir(juge.verdict, juge.verdict === 'FAIL' ? 1 : 0);
