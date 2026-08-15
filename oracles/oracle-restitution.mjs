#!/usr/bin/env node
// oracle-restitution — Domaine « Restitution lisible : la page se conçoit pour ses
// lecteurs » (déterministe). Campagne TF-0235 (pilot), mandat humain du 15/08/2026.
//
// Une page se déclare restitution par <body data-restitution="rapport|suivi|registre">.
// Sans déclaration : SKIP motivé (exit 2) — le périmètre est déclaratif, l'écart
// non déclaré relève de la revue de campagne, pas de cet oracle.
//
// Règles RL, décidables sur le fichier (référentiel : REFERENTIEL-RESTITUTION.md) :
//   RL-1  vue d'ensemble : un verdict (.verdict|[data-verdict]), ≥ 3 KPI (.kpi)
//         et une navigation de vues (≥ 2 entrées [data-vue])
//   RL-3  chaque KPI porte ses 4 emplacements : valeur (.k-valeur), définition
//         (.kpi-d ≥ 12 car.), repère de lecture (.k-repere ≥ 20 car.)
//   RL-4  chaque figure graphique (svg/canvas ou classe graphe) énonce sa question :
//         figcaption non vide terminée par « ? »
//   RL-9  chemins d'entrée par lecteur : .chemins|[data-lecteurs] avec ≥ 2 .chemin
//   RL-10 manifeste d'écarts présent : .ecarts|[data-ecarts] non vide — « aucun
//         écart » se déclare, l'absence du manifeste ne se tait pas
//
// Ce qui exige la source, un rendu ou un jugement est déclaré non jugé :
// RL-2 (une question par vue — le chapeau est tenu par le socle L7), RL-5 (tableaux
// exploitables — composant filtres-tableau G1-G6 + socle L4), RL-6 (effet significatif
// des interactions — rendu), RL-7 (texte ancré — revue), RL-8 (iso-contenu — exige
// l'artefact source, contrôle de campagne).
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-restitution.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import { parse as parseHtml, walk, visibleText, lineOf } from './lib/html.mjs';

const DOM = 'Restitution lisible : la page se conçoit pour ses lecteurs';
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');

const NJ = [
  'RL-2 pertinence « une question par vue » — le chapeau .ch-apprend est tenu par le socle (check_html L7)',
  'RL-5 exploitabilité des tableaux — délégué au composant filtres-tableau (G1-G6) et au socle (L4)',
  'RL-6 effet significatif des interactions — exige un rendu (delta de contenu visible)',
  'RL-7 texte ancré constat→impact→action — revue outillée (critique-le-design D8)',
  'RL-8 iso-contenu source→cible — exige l\'artefact source, contrôle de campagne',
];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-restitution', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'RL-1/3/4/9/10 sans écart', where: file }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) { NJ.push('fichier absent'); sortir('SKIP', 2); }

const html = fs.readFileSync(file, 'utf8');
const root = parseHtml(html);

const classes = el => String(el.attrs?.class || '').toLowerCase().split(/\s+/).filter(Boolean);
const aClasse = (el, c) => classes(el).includes(c);
const texteDe = el => visibleText(el).map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
const ou = el => 'ligne ' + lineOf(html, el.start);

const tous = [];
walk(root, el => { if (!el.tag.startsWith('#')) tous.push(el); });

// ── périmètre : la page se déclare restitution ─────────────────────────────
const porteur = tous.find(el => el.attrs && 'data-restitution' in el.attrs);
if (!porteur) {
  NJ.push('page sans data-restitution : hors périmètre déclaré — l\'écart non déclaré relève de la revue de campagne');
  sortir('SKIP', 2);
}
const famille = String(porteur.attrs['data-restitution'] || '').toLowerCase();
if (!['rapport', 'suivi', 'registre'].includes(famille)) {
  add('majeur', 'RL-1', `data-restitution="${famille}" hors familles connues (rapport|suivi|registre)`, ou(porteur));
}

// ── RL-1 · vue d'ensemble ──────────────────────────────────────────────────
{
  const verdict = tous.find(el => aClasse(el, 'verdict') || (el.attrs && 'data-verdict' in el.attrs));
  if (!verdict) add('bloquant', 'RL-1', 'aucun verdict (.verdict ou [data-verdict]) : la vue d\'ensemble ne conclut pas', 'document');
  const kpis = tous.filter(el => aClasse(el, 'kpi'));
  if (kpis.length < 3) add('bloquant', 'RL-1', `${kpis.length} KPI (.kpi) — la vue d'ensemble en attend au moins 3`, 'document');
  const entreesVues = tous.filter(el => el.attrs && 'data-vue' in el.attrs);
  if (entreesVues.length < 2) add('bloquant', 'RL-1', `${entreesVues.length} entrée(s) de navigation [data-vue] — une restitution s'organise en vues naviguées (≥ 2)`, 'document');
}

// ── RL-3 · chaque KPI porte ses emplacements ───────────────────────────────
{
  for (const kpi of tous.filter(el => aClasse(el, 'kpi'))) {
    const enfants = []; walk(kpi, el => { if (!el.tag.startsWith('#')) enfants.push(el); });
    const valeur = enfants.find(el => aClasse(el, 'k-valeur'));
    const def = enfants.find(el => aClasse(el, 'kpi-d'));
    const repere = enfants.find(el => aClasse(el, 'k-repere'));
    if (!valeur || !texteDe(valeur)) add('bloquant', 'RL-3', 'KPI sans valeur (.k-valeur)', ou(kpi));
    if (!def || texteDe(def).length < 12) add('bloquant', 'RL-3', 'KPI sans définition (.kpi-d ≥ 12 caractères)', ou(kpi));
    if (!repere || texteDe(repere).length < 20) add('bloquant', 'RL-3', 'KPI sans repère de lecture (.k-repere ≥ 20 caractères) : un chiffre sans lecture ne s\'affiche pas en KPI', ou(kpi));
  }
}

// ── RL-4 · chaque graphique énonce sa question ─────────────────────────────
{
  for (const fig of tous.filter(el => el.tag === 'figure')) {
    const contenus = []; walk(fig, el => { if (!el.tag.startsWith('#')) contenus.push(el); });
    const graphique = contenus.some(el => el.tag === 'svg' || el.tag === 'canvas')
      || classes(fig).some(c => c.includes('graphe') || c.includes('chart'))
      || contenus.some(el => classes(el).some(c => c.includes('barre') || c.includes('empile')));
    if (!graphique) continue;
    const cap = contenus.find(el => el.tag === 'figcaption');
    const q = cap ? texteDe(cap) : '';
    if (!q) add('bloquant', 'RL-4', 'figure graphique sans figcaption : un graphique sans question n\'existe pas', ou(fig));
    else if (!/\?\s*$/.test(q)) add('majeur', 'RL-4', `figcaption « ${q.slice(0, 50)} » n'est pas une question (« ? » final attendu)`, ou(fig));
  }
}

// ── RL-9 · chemins d'entrée par lecteur ────────────────────────────────────
{
  const bloc = tous.find(el => aClasse(el, 'chemins') || (el.attrs && 'data-lecteurs' in el.attrs));
  if (!bloc) add('bloquant', 'RL-9', 'aucun bloc de chemins par lecteur (.chemins ou [data-lecteurs]) : « par où commencer selon qui vous êtes » est dû au lecteur', 'document');
  else {
    const chemins = []; walk(bloc, el => { if (aClasse(el, 'chemin')) chemins.push(el); });
    if (chemins.length < 2) add('bloquant', 'RL-9', `${chemins.length} chemin(s) de lecteur — au moins 2 lecteurs types attendus`, ou(bloc));
  }
}

// ── RL-10 · manifeste d'écarts ─────────────────────────────────────────────
{
  const manifeste = tous.find(el => aClasse(el, 'ecarts') || (el.attrs && 'data-ecarts' in el.attrs));
  if (!manifeste) add('bloquant', 'RL-10', 'aucun manifeste d\'écarts (.ecarts ou [data-ecarts]) : « aucun écart » se déclare, l\'absence se tait', 'document');
  else if (texteDe(manifeste).length < 20) add('majeur', 'RL-10', 'manifeste d\'écarts vide : déclarer les écarts, ou déclarer qu\'il n\'y en a aucun', ou(manifeste));
}

const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
sortir(durs.length ? 'FAIL' : 'PASS', durs.length ? 1 : 0);
