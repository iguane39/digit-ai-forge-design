#!/usr/bin/env node
// rendu-comparatif — le geste « avant / après » d'un correctif ad hoc (TF-0286).
//
// Ce qui manquait : hors run complet, un correctif posé sur une page vivante ne
// se vérifiait qu'à l'œil, page fermée, sur un seul écran. Le réflexe ne tient
// que s'il coûte UNE commande — c'est le cahier des charges de cet outil.
//
//   node oracles/rendu-comparatif.mjs --avant <fichier|url> --apres <fichier|url>
//        [--zone <sélecteur>] [--largeurs 1920,1440,1024,768,390]
//        [--sortie <dossier>] [--etats-ouverts] [--matrice-etats] [--json-only]
//
// Ce qu'il fait, mécaniquement :
//   1. capture les DEUX versions sur N largeurs × 2 thèmes (clair et sombre),
//      en réutilisant render_page.py du skill digit-ai-page-html — jamais une
//      capture maison : outillage absent ⇒ SKIP motivé, exit 2 ;
//   2. pose les captures côte à côte dans une page de comparaison lisible ;
//   3. signale les constats NOUVEAUX — présents après, absents avant :
//      V1 débordements, V4 chevauchements, V2 contraste, L2 largeur de texte
//      et gouttière, V3/V7 en avertissement ;
//   4. RC-1 : l'allongement du rendu à largeur constante, qui est la trace
//      mécanique d'un retour à la ligne nouveau (un titre qui passe sur deux
//      lignes rend la page plus haute) ;
//   5. RC-2 : à hauteur inchangée, la part de pixels qui bougent — pour voir
//      d'un chiffre si le correctif a débordé de sa zone.
//
// Ce qui est RÉPARÉ par le correctif (constat présent avant, absent après) n'est
// jamais un défaut : il est compté et affiché, il ne pèse pas sur le verdict.
//
// Verdict machine : exit 0 = aucun constat dur nouveau · 1 = régression de rendu
// · 2 = indéterminé (outillage absent, page illisible). JSON sur stdout.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { detecterOutillageRendu, injecterThemeSombre } from './lib/rendu.mjs';
import { decoderPng, comparerPng } from './lib/png.mjs';

const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const jsonOnly = args.includes('--json-only');
const etatsOuverts = args.includes('--etats-ouverts');
// TF-0493 : la matrice d'etats se propage telle quelle a render_page. Les DEUX rendus (avant et
// apres) la jouent, sinon la comparaison porterait sur deux etats differents.
const matriceEtats = args.includes('--matrice-etats');
const avantArg = opt('--avant');
const apresArg = opt('--apres');
const zone = opt('--zone');
const largeurs = opt('--largeurs', '1920,1440,1024,768,390');

// LES FAMILLES ET LEUR POIDS SONT LUS DANS LE SOCLE (choix humain du 23/08/2026, option
// « source unique »). Cette table était tenue ICI, en copie — et c'est ici que la dérive a été
// payée : trois familles nées après elle n'y figuraient pas, dont DEUX bloquantes chez render_page
// qui arrivaient en simple avertissement. Le constat était là, visible, et ne pesait plus rien
// dans le verdict. Une double vérité ne se corrige pas, elle se supprime.
//
// Le repli reste, et il n'est pas une paresse : une famille inconnue du socle — parce qu'il est
// plus vieux que l'appelant — est rapportée en avertissement au lieu d'être perdue.
function famillesDuSocle() {
  const r = spawnSync(outillage.python, [outillage.renderPage, '--familles'], { encoding: 'utf8' });
  try {
    const lu = JSON.parse((r.stdout || '').trim());
    if (lu.schema !== 'digit-ai/familles-mesure@1') return null;
    const table = {};
    for (const [cle, v] of Object.entries(lu.familles)) {
      // La règle de l'appelant : le poids vient du socle, le libellé aussi, et le code de règle se
      // dérive du nom de la famille (V1, V2, L2…) comme il l'a toujours fait.
      const regle = /^v(\d+)/.exec(cle) ? `V${/^v(\d+)/.exec(cle)[1]}`
        : cle.startsWith('l2_') ? 'L2' : cle === 'etat_muet' ? 'É3' : '—';
      table[cle] = { regle, sev: v.severite === 'bloquant' ? 'bloquant'
        : v.severite === 'avertissement' ? 'avertissement' : 'info', quoi: v.libelle };
    }
    return table;
  } catch { return null; }
}

const NJ = [
  'ce que la page raconte : le correctif est jugé sur ses effets de rendu, jamais sur sa justesse fonctionnelle ou éditoriale',
  'V5 croisements de flèches et V6 images déformées — inspection visuelle des captures posées côte à côte',
  'RC-1 approche les retours à la ligne par la hauteur du rendu à largeur constante : un retour à la ligne compensé ailleurs (bloc raccourci en même temps) peut passer inaperçu',
  'l2_freres (TF-0491) est un AVERTISSEMENT et jamais un bloquant : une mesure de lecture étroite au-dessus d\'un bloc large est un choix typographique défendable — mais il se DÉCLARE (data-mesure-lecture) au lieu d\'être subi',
  '--zone filtre sur l\'étiquette produite par render_page.py (tag, #id ou PREMIÈRE classe, puis extrait de texte) : une zone désignée par une classe secondaire ou un sélecteur composé n\'est pas reconnue',
];
const F = [];
const add = (sev, regle, msg, ou) => F.push({ sev, regle, msg, ou });

function sortir(verdict, code, extra = {}) {
  process.stdout.write(JSON.stringify({
    outil: 'rendu-comparatif', avant: avantArg, apres: apresArg, zone: zone || null,
    verdict, findings: F, non_juge: NJ, ...extra,
  }, null, jsonOnly ? 0 : 2) + '\n');
  process.exit(code);
}

if (!avantArg || !apresArg) {
  NJ.push('appel incomplet : --avant et --apres sont requis');
  sortir('SKIP', 2);
}

const outillage = detecterOutillageRendu();
if (!outillage.ok) {
  // Une capture maison silencieuse serait pire que pas de contrôle du tout :
  // elle mesurerait autre chose que ce que la forge mesure partout ailleurs.
  NJ.push(`outillage de rendu indisponible : ${outillage.manques.join(' ; ')}`);
  sortir('SKIP', 2);
}

// ── Matérialisation des deux côtés ─────────────────────────────────────────
const FAMILLES = famillesDuSocle();
if (!FAMILLES) {
  // Sans la table du socle, on ne recopie pas une liste : on le dit. Recréer la copie serait
  // recréer exactement le défaut que ce changement supprime.
  NJ.push('table des familles non publiée par le socle (`render_page.py --familles`) : les poids '
    + 'ne sont pas connus, donc aucun constat ne peut être pesé — un poids deviné serait pire '
    + "qu'un SKIP");
  sortir('SKIP', 2);
}

const base = path.join(os.tmpdir(), `rendu-comparatif-${process.pid}-${Date.now()}`);
const sortieArg = opt('--sortie');
const dossierRapport = sortieArg || path.join(base, 'rapport');
fs.mkdirSync(dossierRapport, { recursive: true });

async function materialiser(source, etiquette) {
  if (!/^https?:\/\//i.test(source)) {
    if (!fs.existsSync(source)) { NJ.push(`${etiquette} : fichier introuvable — ${source}`); sortir('SKIP', 2); }
    return fs.readFileSync(source, 'utf8');
  }
  // URL vivante : le HTML est rapatrié et une <base> est posée pour que les
  // ressources relatives continuent de résoudre depuis la copie locale.
  let html;
  try {
    const r = await fetch(source);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    html = await r.text();
  } catch (e) {
    NJ.push(`${etiquette} : URL non rapatriable (${e.message}) — passer un fichier local`);
    sortir('SKIP', 2);
  }
  if (!/<base\b/i.test(html)) html = html.replace(/<head\b([^>]*)>/i, (m, a) => `<head${a}><base href="${source}">`);
  return html;
}

function lancerRenderPage(html, etiquette) {
  const dossier = path.join(base, etiquette);
  fs.mkdirSync(dossier, { recursive: true });
  const fichier = path.join(dossier, `${etiquette}.html`);
  fs.writeFileSync(fichier, html, 'utf8');
  const argv = [outillage.renderPage, fichier, '--widths', largeurs, '--output', 'json', '--out', dossier];
  if (etatsOuverts) argv.push('--etats-ouverts');
  if (matriceEtats) argv.push('--matrice-etats');
  const r = spawnSync(outillage.python, argv, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  try { return JSON.parse(r.stdout.trim()); }
  catch {
    NJ.push(`${etiquette} : render_page.py illisible (exit ${r.status}) — ${(r.stderr || '').slice(0, 300)}`);
    sortir('SKIP', 2);
  }
}

// ── Filtre de zone ─────────────────────────────────────────────────────────
// L'étiquette de render_page.py est « tag#id » ou « tag.premiere-classe », suivie
// d'un extrait de texte. Le filtre s'y applique, jamais à un DOM qu'on n'a pas.
function dansLaZone(quoi) {
  if (!zone) return true;
  const tete = String(quoi).split('«')[0].trim();
  return zone.split(',').map(z => z.trim()).filter(Boolean).some(z => {
    const classes = [...z.matchAll(/\.([\w-]+)/g)].map(m => m[1]);
    const ids = [...z.matchAll(/#([\w-]+)/g)].map(m => m[1]);
    const tag = (/^([a-z][\w-]*)/i.exec(z) || [])[1];
    return (!tag || new RegExp(`(^|[\\s×])${tag}\\b`, 'i').test(tete))
      && classes.every(c => tete.includes('.' + c))
      && ids.every(i => tete.includes('#' + i));
  });
}

const cle = (famille, it) => `${famille} ${it.what} ${it.detail}`;

function hauteurPng(chemin) {
  try { return decoderPng(fs.readFileSync(chemin)); } catch { return null; }
}

// ── Comparaison ────────────────────────────────────────────────────────────
const THEMES = [['clair', h => h], ['sombre', injecterThemeSombre]];
const mesures = { largeurs: [], nouveaux: 0, repares: 0, comparaisons: 0 };
const vignettes = [];

const htmlAvant = await materialiser(avantArg, 'avant');
const htmlApres = await materialiser(apresArg, 'apres');

for (const [theme, transformer] of THEMES) {
  const ra = lancerRenderPage(transformer(htmlAvant), `avant-${theme}`);
  const rb = lancerRenderPage(transformer(htmlApres), `apres-${theme}`);
  const bpsA = ra.breakpoints || {}, bpsB = rb.breakpoints || {};

  for (const largeur of Object.keys(bpsB)) {
    const a = bpsA[largeur], b = bpsB[largeur];
    if (!a) { NJ.push(`largeur ${largeur}px absente du rendu « avant » — non comparée`); continue; }
    mesures.comparaisons++;

    const vusAvant = new Set();
    for (const [famille, liste] of Object.entries(a.issues || {}))
      for (const it of liste || []) vusAvant.add(cle(famille, it));

    for (const [famille, liste] of Object.entries(b.issues || {})) {
      const meta = FAMILLES[famille] || { regle: `render_page:${famille}`, sev: 'avertissement', quoi: famille };
      for (const it of liste || []) {
        if (vusAvant.has(cle(famille, it))) continue;
        if (!dansLaZone(it.what)) continue;
        mesures.nouveaux++;
        add(meta.sev, meta.regle, `NOUVEAU ${meta.quoi} — ${it.what} — ${it.detail}`, `${largeur}px, thème ${theme}`);
      }
    }
    // TF-0493 · les ÉTATS, comparés comme le repos. Sans cette boucle, la matrice tournerait
    // dans les deux rendus et l'outil n'en dirait rien : les constats vivent sous `etats`, pas
    // sous `issues`. Un contrôle qu'on lance et qu'on ne lit pas est plus coûteux qu'absent —
    // il donne la conscience tranquille sans la preuve.
    const etatsA = a.etats || {}, etatsB = b.etats || {};
    for (const [nomEtat, eb] of Object.entries(etatsB)) {
      if (!eb.applique) {
        NJ.push(`état « ${nomEtat} » NON JOUÉ à ${largeur}px (${theme}) : ${eb.motif || ''}`);
        continue;
      }
      const ea = etatsA[nomEtat];
      if (!ea || !ea.applique) {
        NJ.push(`état « ${nomEtat} » joué APRÈS et pas AVANT à ${largeur}px — non comparé (le composant n'existait pas encore)`);
        continue;
      }
      const vusEtatAvant = new Set();
      for (const [famille, liste] of Object.entries(ea.issues || {}))
        for (const it of liste || []) vusEtatAvant.add(cle(famille, it));
      for (const [famille, liste] of Object.entries(eb.issues || {})) {
        const meta = FAMILLES[famille] || { regle: `render_page:${famille}`, sev: 'avertissement', quoi: famille };
        for (const it of liste || []) {
          if (vusEtatAvant.has(cle(famille, it))) continue;
          if (!dansLaZone(it.what)) continue;
          mesures.nouveaux++;
          add(meta.sev, meta.regle, `NOUVEAU ${meta.quoi} dans l'état « ${nomEtat} » — ${it.what} — ${it.detail}`,
            `${largeur}px, thème ${theme}, état ${nomEtat}`);
        }
      }
    }

    // Ce que le correctif a réparé : compté, jamais porté au débit.
    const vusApres = new Set();
    for (const [famille, liste] of Object.entries(b.issues || {}))
      for (const it of liste || []) vusApres.add(cle(famille, it));
    for (const c of vusAvant) if (!vusApres.has(c)) mesures.repares++;

    // RC-1 / RC-2 · la trace pixel du correctif.
    const pa = hauteurPng(a.png), pb = hauteurPng(b.png);
    let delta = null, ratio = null;
    if (pa && pb) {
      delta = pb.height - pa.height;
      if (delta > 0) {
        // Sans --zone, l'allongement est imputable au correctif : c'est dur.
        // Avec --zone, la hauteur reste une mesure de page : on la dit sans
        // l'imputer à une zone qu'elle ne sait pas isoler.
        add(zone ? 'avertissement' : 'bloquant', 'RC-1',
          `le rendu s'allonge de ${delta}px à largeur constante — retour(s) à la ligne ou bloc(s) plus hauts qu'avant`,
          `${largeur}px, thème ${theme}`);
      } else if (delta === 0) {
        const cmp = comparerPng(pa, pb);
        ratio = cmp ? cmp.ratio : null;
        if (cmp && cmp.ratio > 0) {
          add('info', 'RC-2', `${(cmp.ratio * 100).toFixed(2)} % des pixels changent à hauteur identique`,
            `${largeur}px, thème ${theme}`);
        }
      }
    }
    mesures.largeurs.push({ largeur: +largeur, theme, delta_hauteur_px: delta, ratio_pixels: ratio });
    vignettes.push({ theme, largeur: +largeur, avant: a.png, apres: b.png, delta });
  }
}

// ── Page de comparaison, captures côte à côte ──────────────────────────────
const echapper = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function copier(src, nom) {
  const dest = path.join(dossierRapport, nom);
  try { fs.copyFileSync(src, dest); return nom; } catch { return null; }
}

const durs = F.filter(f => f.sev === 'bloquant');
const lignes = vignettes.map((v, i) => {
  const a = copier(v.avant, `avant-${v.theme}-w${v.largeur}-${i}.png`);
  const b = copier(v.apres, `apres-${v.theme}-w${v.largeur}-${i}.png`);
  return `<section>
    <h2>${v.largeur} px — thème ${v.theme}${v.delta ? ` <em>(${v.delta > 0 ? '+' : ''}${v.delta} px de hauteur)</em>` : ''}</h2>
    <div class="cote-a-cote">
      <figure><figcaption>avant</figcaption>${a ? `<img src="${a}" alt="Rendu avant, ${v.largeur} px, thème ${v.theme}">` : '<p>capture indisponible</p>'}</figure>
      <figure><figcaption>après</figcaption>${b ? `<img src="${b}" alt="Rendu après, ${v.largeur} px, thème ${v.theme}">` : '<p>capture indisponible</p>'}</figure>
    </div>
  </section>`;
}).join('\n');

const rapport = path.join(dossierRapport, 'comparatif.html');
fs.writeFileSync(rapport, `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rendu comparatif — ${echapper(path.basename(String(apresArg)))}</title>
<style>
  :root { --fond: #fbf9f5; --fond-eleve: #f2eee6; --texte: #1d2126; --trait: #d8d2c6; --alerte: #8a1c10; }
  body { background: var(--fond); color: var(--texte); font: 16px/1.6 system-ui, sans-serif; margin: 0; padding: 32px; }
  h1 { margin-top: 0; }
  .cote-a-cote { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  figure { margin: 0; background: var(--fond-eleve); border: 1px solid var(--trait); padding: 8px; }
  figcaption { font-weight: 600; margin-bottom: 8px; }
  img { width: 100%; height: auto; display: block; }
  li.bloquant { color: var(--alerte); font-weight: 600; }
  section { margin-bottom: 32px; }
</style></head><body>
<h1>Rendu comparatif</h1>
<p><strong>avant</strong> : ${echapper(avantArg)}<br><strong>après</strong> : ${echapper(apresArg)}${zone ? `<br><strong>zone</strong> : ${echapper(zone)}` : ''}</p>
<h2>Constats nouveaux (${F.length ? F.length : 0})</h2>
${F.length ? `<ul>${F.map(f => `<li class="${f.sev}">[${f.sev}] ${echapper(f.regle)} — ${echapper(f.msg)} <small>(${echapper(f.ou)})</small></li>`).join('')}</ul>`
    : '<p>Aucun constat nouveau : le correctif n\'a rien cassé de mesurable.</p>'}
<p>${mesures.repares} constat(s) présent(s) avant et disparu(s) après.</p>
${lignes}
<h2>Ce qui n'est pas jugé ici</h2>
<ul>${NJ.map(n => `<li>${echapper(n)}</li>`).join('')}</ul>
</body></html>
`, 'utf8');

if (!jsonOnly) {
  process.stderr.write(`${durs.length ? 'FAIL' : 'PASS'} — ${mesures.nouveaux} constat(s) nouveau(x), ` +
    `${mesures.repares} réparé(s), ${mesures.comparaisons} comparaison(s)\n`);
  for (const f of F) process.stderr.write(`  [${f.sev}] ${f.regle} ${f.ou} — ${f.msg}\n`);
  process.stderr.write(`  rapport : ${rapport}\n`);
}

sortir(durs.length ? 'FAIL' : 'PASS', durs.length ? 1 : 0, { mesures, rapport });
