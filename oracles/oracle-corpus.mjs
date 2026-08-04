#!/usr/bin/env node
// oracle-corpus — Domaine « Corpus design : résolution des sources » (déterministe).
//
// Règles C1–C6 :
//   C1  colonnes obligatoires présentes dans chaque CSV
//   C2  aucune cellule obligatoire vide
//   C3  statut dans le vocabulaire fermé {ok, todo} ; une entrée todo est signalée
//   C4  identifiants uniques (palettes : unique par couple id+theme)
//   C5  aucune police de la liste réflexe dans les appariements typographiques
//   C6  source résolue : URL http(s), skill:<nom>[#ancre] existant, ou chemin existant
//
// Un corpus dont une entrée n'a pas de source résolue n'est pas servable : c'est
// la règle qui empêche la forge de recommander une matière inventée.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-corpus.mjs <dossier-corpus> [--skills <dir>] [--json-only]

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DOM = 'Corpus design : résolution des sources';
const args = process.argv.slice(2);
const dossier = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');
const skillsDir = args.includes('--skills')
  ? args[args.indexOf('--skills') + 1]
  : path.join(os.homedir(), '.claude', 'skills');

const SCHEMA = {
  'styles.csv': { requis: ['id', 'nom', 'famille', 'quand', 'anti_pattern', 'source', 'statut'], cleUnique: ['id'] },
  'palettes.csv': { requis: ['id', 'nom', 'theme', 'fond', 'texte', 'accent', 'source', 'statut'], cleUnique: ['id', 'theme'] },
  'pairings-typo.csv': { requis: ['id', 'display', 'corps', 'dispo', 'ton', 'source', 'statut'], cleUnique: ['id'] },
  'patterns.csv': { requis: ['id', 'nom', 'surface', 'job', 'anti_pattern', 'source', 'statut'], cleUnique: ['id'] },
  'guidelines.csv': { requis: ['id', 'regle', 'domaine', 'seuil', 'source', 'statut'], cleUnique: ['id'] },
};

const POLICES_REFLEXES = ['fraunces', 'newsreader', 'lora', 'crimson', 'crimson pro', 'crimson text',
  'playfair display', 'cormorant', 'cormorant garamond', 'syne', 'ibm plex mono', 'ibm plex sans',
  'ibm plex serif', 'space mono', 'space grotesk', 'inter', 'dm sans', 'dm serif display',
  'dm serif text', 'outfit', 'plus jakarta sans', 'instrument sans', 'instrument serif'];

const NJ = [
  'pertinence sectorielle d\'un style ou d\'une palette — jugement humain, jamais scoré',
  'accessibilité réelle des couples de couleurs une fois composés — oracle-tokens T5 puis render_page.py V2',
  'disponibilité effective d\'une police sous licence d\'embarquement — vérification au build',
];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-corpus', domaine: DOM, artefact: dossier || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'C1–C6 sans écart', where: dossier }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!dossier || !fs.existsSync(dossier)) { NJ.push('dossier corpus absent'); sortir('SKIP', 2); }

// Les skills ne vivent pas tous au même endroit : installés, empaquetés dans une
// marketplace de plugins, ou locaux au projet. Chercher partout avant de conclure.
function racinesDeSkills() {
  const racines = [skillsDir, path.join(dossier, '..', 'skills')];
  const mk = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces');
  if (fs.existsSync(mk)) {
    for (const place of fs.readdirSync(mk)) {
      const plugins = path.join(mk, place, 'plugins');
      if (!fs.existsSync(plugins)) continue;
      for (const p of fs.readdirSync(plugins)) {
        const s = path.join(plugins, p, 'skills');
        if (fs.existsSync(s)) racines.push(s);
      }
    }
  }
  return racines.filter(r => fs.existsSync(r));
}
const RACINES = racinesDeSkills();
const skillsPresents = RACINES.length > 0;
if (!skillsPresents) NJ.push(`C6 : aucune racine de skills trouvée (${skillsDir}) — les sources « skill: » ne sont pas résolues, seulement leur forme`);
else NJ.push(`C6 : les skills intégrés au harnais (non présents sur disque) ne sont pas résolvables — citer leur source amont plutôt que « skill:<nom> ». Racines inspectées : ${RACINES.length}`);

/** Parse CSV à séparateur « ; », sans guillemets : le corpus est écrit à la main. */
function lireCsv(chemin) {
  const lignes = fs.readFileSync(chemin, 'utf8').split(/\r?\n/).filter(l => l.trim());
  const entetes = lignes[0].split(';').map(s => s.trim());
  return {
    entetes,
    rangs: lignes.slice(1).map((l, i) => {
      const cells = l.split(';');
      const o = { _ligne: i + 2 };
      entetes.forEach((e, k) => { o[e] = (cells[k] ?? '').trim(); });
      if (cells.length !== entetes.length) o._arite = cells.length;
      return o;
    }),
  };
}

function sourceResolue(src) {
  if (/^https?:\/\/\S+$/.test(src)) return { ok: true };
  const m = /^skill:([\w-]+)(#[\w-]+)?$/.exec(src);
  if (m) {
    if (!skillsPresents) return { ok: true, forme: true };
    const trouve = RACINES.some(r => fs.existsSync(path.join(r, m[1])));
    return trouve ? { ok: true } : { ok: false, raison: `skill « ${m[1]} » introuvable dans ${RACINES.length} racine(s)` };
  }
  if (fs.existsSync(path.join(dossier, src))) return { ok: true };
  return { ok: false, raison: 'ni URL, ni skill:<nom>, ni chemin existant' };
}

let total = 0;
for (const [fichier, schema] of Object.entries(SCHEMA)) {
  const chemin = path.join(dossier, fichier);
  if (!fs.existsSync(chemin)) {
    add('bloquant', 'C1', `${fichier} absent du corpus`, dossier);
    continue;
  }
  const { entetes, rangs } = lireCsv(chemin);

  // C1 · colonnes obligatoires
  for (const c of schema.requis) {
    if (!entetes.includes(c)) add('bloquant', 'C1', `colonne « ${c} » absente`, fichier);
  }

  const vues = new Set();
  for (const r of rangs) {
    total++;
    const ou = `${fichier}:${r._ligne}`;

    if (r._arite) add('bloquant', 'C1', `ligne à ${r._arite} colonnes au lieu de ${entetes.length} (point-virgule dans une cellule ?)`, ou);

    // C2 · cellules obligatoires renseignées
    for (const c of schema.requis) {
      if (entetes.includes(c) && !r[c]) add('bloquant', 'C2', `cellule « ${c} » vide`, ou);
    }

    // C3 · vocabulaire fermé des statuts
    if (r.statut && !['ok', 'todo'].includes(r.statut)) {
      add('bloquant', 'C3', `statut « ${r.statut} » hors vocabulaire {ok, todo}`, ou);
    } else if (r.statut === 'todo') {
      add('avertissement', 'C3', `entrée « ${r.id} » en statut todo : non servable tant qu'elle n'est pas durcie`, ou);
    }

    // C4 · unicité
    const cle = schema.cleUnique.map(c => r[c]).join('|');
    if (vues.has(cle)) add('bloquant', 'C4', `clé « ${cle} » en doublon`, ou);
    vues.add(cle);

    // C6 · source résolue
    if (r.source) {
      const v = sourceResolue(r.source);
      if (!v.ok) add('bloquant', 'C6', `source non résolue « ${r.source.slice(0, 60)} » : ${v.raison}`, ou);
    }

    // C5 · polices réflexes
    if (fichier === 'pairings-typo.csv') {
      for (const champ of ['display', 'corps', 'utilitaire']) {
        const n = (r[champ] || '').toLowerCase();
        if (POLICES_REFLEXES.includes(n)) {
          add('bloquant', 'C5', `police réflexe « ${r[champ]} » en ${champ} : le corpus ne peut pas servir la monoculture qu'il est censé éviter`, ou);
        }
      }
    }
  }
}

// ── C7 · monoculture inter-clients ─────────────────────────────────────────
// Un corpus fixe fait converger les propositions faites à des clients différents.
// C'est l'effet de 2e ordre le plus coûteux d'une forge de design, et le seul que
// rien d'autre n'attrape. La règle est déterministe : elle compare les entrées
// deux à deux, jamais à « maintenant ».
{
  const chemin = path.join(dossier, 'journal-directions.csv');
  if (!fs.existsSync(chemin)) {
    NJ.push('C7 : journal-directions.csv absent — la répétition d\'une même direction entre clients n\'est pas surveillée');
  } else {
    const { entetes, rangs } = lireCsv(chemin);
    for (const c of ['date', 'client', 'style_id', 'typo_id', 'hue_accent']) {
      if (!entetes.includes(c)) add('bloquant', 'C7', `journal-directions.csv : colonne « ${c} » absente`, 'journal-directions.csv');
    }
    const jours = (a, b) => Math.abs(new Date(a) - new Date(b)) / 86400000;
    for (let i = 0; i < rangs.length; i++) {
      for (let k = i + 1; k < rangs.length; k++) {
        const a = rangs[i], b = rangs[k];
        if (a.client && b.client && a.client === b.client) continue; // même client : cohérence voulue
        const memeStyle = a.style_id && a.style_id === b.style_id;
        const memeTypo = a.typo_id && a.typo_id === b.typo_id;
        const hueProche = a.hue_accent && b.hue_accent
          && Math.abs(Number(a.hue_accent) - Number(b.hue_accent)) <= 30;
        const recent = a.date && b.date && jours(a.date, b.date) <= 180;
        const repetitions = [memeStyle, memeTypo, hueProche].filter(Boolean).length;
        if (repetitions >= 2 && recent) {
          add('avertissement', 'C7',
            `direction répétée entre « ${a.client} » et « ${b.client} » à ${Math.round(jours(a.date, b.date))} jours : ${[memeStyle && 'même style', memeTypo && 'même appariement typo', hueProche && 'hue d\'accent à moins de 30°'].filter(Boolean).join(', ')}`,
            `journal-directions.csv:${a._ligne} et :${b._ligne}`);
        }
      }
    }
  }
}

F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(dur.length
  ? `FAIL — ${dur.length} écart(s) dur(s) sur ${total} entrées\n`
  : `PASS — ${total} entrées, toutes sourcées\n`);
if (dur.length) sortir('FAIL', 1);
sortir('PASS', 0);
