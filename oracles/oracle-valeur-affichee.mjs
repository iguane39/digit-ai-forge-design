#!/usr/bin/env node
// oracle-valeur-affichee — une valeur affichée par la page égale sa source (TF-2043, 02/11/2026).
//
// LE FAIT. Un produit affichait « v1.06 » sous l'étiquette « v1.8.0 » : la version vit à un endroit
// (package.json), l'affichage à un autre, et aucun oracle ne les rapprochait — tous jugent la page
// ISOLÉMENT. Une version, un environnement, une date sont des valeurs DÉRIVÉES : la page les montre,
// une commande sait les recalculer.
//
// LE CONTRAT. Le produit déclare ses valeurs dérivées dans `valeurs-derivees.json` (voisin de la page,
// ou passé par --declaration) : pour chacune, un nom, OÙ la page l'affiche (un sélecteur à un seul
// compound, ou un motif sur le texte visible) et la COMMANDE qui donne la source. L'oracle relit la page
// servie (une URL http ou un fichier) et rejoue la commande : il ne lit JAMAIS le code qui écrit la valeur
// dans la page — une valeur recopiée d'une constante fausse ne se trahirait pas autrement.
//
// {
//   "schema": "digit-ai/valeurs-derivees@1",
//   "valeurs": [
//     { "nom": "version", "selecteur": "#version", "commande": "node -p \"require('./package.json').version\"",
//       "dossier": ".", "retirer_prefixe": "v" },
//     { "nom": "environnement", "motif": "Environnement\\s*:\\s*(\\S+)", "commande": ["node", "-p", "…"] },
//     { "nom": "date", "selecteur": ".maj", "commande": "…", "comparaison": "contient" }
//   ]
// }
// Champs : `selecteur` XOR `motif` (capture 1, sinon le motif entier) · `commande` (chaîne : lancée par
// le shell ; tableau : lancée sans shell) · `dossier` (relatif à la déclaration, par défaut son dossier) ·
// `retirer_prefixe` (ôté des deux côtés avant comparaison) · `comparaison` : « egal » (défaut) ou
// « contient » (le texte affiché contient la source).
//
// VA0 (SKIP, jamais PASS) : aucune déclaration, ou déclaration sans valeur — l'oracle dit qu'il n'a rien jugé.
// VA1 (bloquant) : la page affiche autre chose que la source. Le cas du fait fondateur.
// VA2 (bloquant) : la valeur déclarée est introuvable sur la page, ou son emplacement est vide.
// VA3 (bloquant) : la commande échoue, dépasse 30 s, ou ne rend rien — une source qui ne se recalcule pas
//                  ne prouve rien, et la déclaration promettait qu'elle le faisait.
// VA4 (bloquant) : déclaration illisible, ou entrée incomplète ou contradictoire.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0 PASS / 1 FAIL / 2 SKIP.
// Usage : node oracles/oracle-valeur-affichee.mjs <page.html|http(s)://…> [--declaration valeurs-derivees.json] [--json-only]

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse, elements } from './lib/html.mjs';
import { correspond, decouper } from './lib/selecteurs.mjs';
import { trouverDeclaration } from './lib/declaration-valeurs.mjs';

const DOM = 'Valeur affichée ↔ source (version, environnement, date)';
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const iDecl = args.indexOf('--declaration');
const declarationArg = iDecl >= 0 ? args[iDecl + 1] : null;
const page = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--declaration');
const DELAI_COMMANDE_MS = 30000;

const NON_JUGE = [
  'une valeur dérivée que la page affiche et que le produit N\'A PAS déclarée : l\'oracle ne juge que ce qui est déclaré',
  'la page servie telle que le serveur la rend : une valeur écrite par un script après le chargement n\'est pas vue (VA2 la dit alors absente), et une page derrière une connexion n\'est pas atteinte',
  'la commande est celle du produit, jouée telle quelle : une commande qui relit la page, ou la même constante que l\'affichage, rendrait une égalité vide de sens — l\'oracle ne le détecte pas',
  'le code qui écrit la valeur dans la page : jamais lu, par construction (seuls la page servie et la sortie de la commande sont comparées)',
  'la pertinence du choix de valeurs déclarées : une déclaration qui oublie la version la plus visible passe',
];

const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code, extra = {}) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-valeur-affichee', domaine: DOM, artefact: page || null, verdict,
    findings: F, non_juge: NON_JUGE, ...extra,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

// SKIP : l'oracle n'a rien jugé, et le dit — jamais un PASS par défaut.
function sauter(motif, extra = {}) {
  add('info', 'VA0', `SKIP — ${motif} : rien n'a été comparé, ce n'est pas un PASS`, page || null);
  NON_JUGE.unshift(motif);
  sortir('SKIP', 2, extra);
}

if (!page) sauter('aucune page fournie (fichier .html ou URL http/https)');

// ── La déclaration ─────────────────────────────────────────────────────────
const cheminDecl = declarationArg ? path.resolve(declarationArg) : trouverDeclaration(page);
if (!cheminDecl) {
  sauter('aucune déclaration de valeurs dérivées (valeurs-derivees.json voisin de la page, ou --declaration)');
}
if (!fs.existsSync(cheminDecl)) {
  sauter(`déclaration introuvable : ${cheminDecl}`, { declaration: cheminDecl });
}
let decl;
try { decl = JSON.parse(fs.readFileSync(cheminDecl, 'utf8').replace(/^﻿/, '')); }
catch (e) {
  add('bloquant', 'VA4', `déclaration illisible (${e.message.slice(0, 120)}) : le JSON ne se charge pas`, cheminDecl);
  sortir('FAIL', 1, { declaration: cheminDecl });
}
const valeurs = decl && Array.isArray(decl.valeurs) ? decl.valeurs : null;
if (!valeurs) {
  add('bloquant', 'VA4', 'déclaration sans tableau « valeurs »', cheminDecl);
  sortir('FAIL', 1, { declaration: cheminDecl });
}
if (!valeurs.length) sauter('la déclaration ne liste aucune valeur dérivée', { declaration: cheminDecl });

// ── La page servie ─────────────────────────────────────────────────────────
let html;
if (/^https?:\/\//i.test(page)) {
  try {
    const rep = await fetch(page, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
    if (!rep.ok) sauter(`page non servie : ${page} répond ${rep.status}`, { declaration: cheminDecl });
    html = await rep.text();
  } catch (e) {
    sauter(`page injoignable : ${page} (${String(e.cause?.code || e.message).slice(0, 80)})`, { declaration: cheminDecl });
  }
} else {
  if (!fs.existsSync(page)) sauter(`page introuvable : ${page}`, { declaration: cheminDecl });
  html = fs.readFileSync(page, 'utf8');
}

const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' };
const decoder = s => s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, d, h, n) =>
  d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : (ENTITES[n.toLowerCase()] ?? m));
const nettoyer = s => decoder(s).replace(/\s+/g, ' ').trim();

// Le texte d'un élément : ses noeuds texte descendants, hors script et style.
function texteDe(el) {
  const out = [];
  const rec = n => {
    for (const c of n.children || []) {
      if (c.tag === '#text') out.push(c.text);
      else if (c.tag === '#raw' || c.tag === 'script' || c.tag === 'style') continue;
      else if (!c.tag.startsWith('#')) rec(c);
    }
  };
  rec(el);
  return nettoyer(out.join(' '));
}

const racine = parse(html);
const texteVisible = texteDe(racine);

// ── La source : la commande du produit, rejouée ────────────────────────────
function lireSource(v) {
  const base = path.dirname(cheminDecl);
  const cwd = path.resolve(base, v.dossier || '.');
  if (!fs.existsSync(cwd)) return { erreur: `dossier de la commande introuvable : ${cwd}` };
  const tableau = Array.isArray(v.commande);
  const r = tableau
    ? spawnSync(v.commande[0], v.commande.slice(1), { cwd, encoding: 'utf8', timeout: DELAI_COMMANDE_MS, windowsHide: true })
    : spawnSync(v.commande, { cwd, encoding: 'utf8', timeout: DELAI_COMMANDE_MS, windowsHide: true, shell: true });
  if (r.error) return { erreur: `commande impossible à lancer : ${r.error.message.slice(0, 120)}` };
  if (r.status !== 0) return { erreur: `commande en échec (exit ${r.status})${r.stderr ? ' — ' + r.stderr.trim().slice(0, 160) : ''}` };
  const valeur = nettoyer(r.stdout || '');
  if (!valeur) return { erreur: 'la commande ne rend rien sur sa sortie standard' };
  return { valeur };
}

const sansPrefixe = (s, p) => (p && s.startsWith(p) ? s.slice(p.length) : s);
const libelleCmd = c => (Array.isArray(c) ? c.join(' ') : String(c));

let compares = 0;
for (const v of valeurs) {
  const nom = v && typeof v.nom === 'string' && v.nom.trim() ? v.nom.trim() : null;
  const ou = `${path.basename(cheminDecl)} › ${nom || '(sans nom)'}`;
  // VA4 — l'entrée est complète et ne se contredit pas.
  const defauts = [];
  if (!nom) defauts.push('« nom » manquant');
  if (!!v?.selecteur === !!v?.motif) defauts.push('exactement un de « selecteur » ou « motif » est attendu');
  const cmdOk = typeof v?.commande === 'string' ? v.commande.trim() : Array.isArray(v?.commande) && v.commande.length && v.commande.every(x => typeof x === 'string');
  if (!cmdOk) defauts.push('« commande » manquante (chaîne, ou tableau de chaînes)');
  if (v?.comparaison && !['egal', 'contient'].includes(v.comparaison)) defauts.push(`« comparaison » inconnue : ${v.comparaison}`);
  let motif = null;
  if (v?.motif) {
    try { motif = new RegExp(v.motif, 'u'); } catch (e) { defauts.push(`« motif » n'est pas une expression régulière valide (${e.message.slice(0, 60)})`); }
  }
  if (v?.selecteur && decouper(v.selecteur).compounds.length !== 1) {
    defauts.push('« selecteur » doit désigner un seul compound (#id, .classe, [attribut], balise) : un sélecteur à ancêtres ne se vérifie pas ici');
  }
  if (defauts.length) { add('bloquant', 'VA4', `entrée de déclaration incomplète ou contradictoire : ${defauts.join(' ; ')}`, ou); continue; }

  // Ce que la page affiche.
  let affiches;
  if (v.selecteur) {
    const els = elements(racine).filter(el => correspond(el, v.selecteur));
    if (!els.length) { add('bloquant', 'VA2', `« ${nom} » : aucun élément ne correspond à « ${v.selecteur} » dans la page servie`, ou); continue; }
    affiches = els.map(texteDe);
    if (affiches.every(t => !t)) {
      add('bloquant', 'VA2', `« ${nom} » : « ${v.selecteur} » existe mais ne porte aucun texte dans la page servie (rempli après chargement ?)`, ou);
      continue;
    }
  } else {
    const m = motif.exec(texteVisible);
    if (!m) { add('bloquant', 'VA2', `« ${nom} » : le motif « ${v.motif} » ne trouve rien dans le texte visible de la page servie`, ou); continue; }
    affiches = [nettoyer(m[1] ?? m[0])];
  }

  // Ce que la source rend.
  const src = lireSource(v);
  if (src.erreur) { add('bloquant', 'VA3', `« ${nom} » : ${src.erreur} (commande : ${libelleCmd(v.commande)})`, ou); continue; }
  const attendu = sansPrefixe(src.valeur, v.retirer_prefixe);

  // La comparaison — chaque occurrence affichée doit tenir (une version en en-tête ET en pied).
  compares++;
  const contient = v.comparaison === 'contient';
  const faux = affiches.filter(t => (contient
    ? !(t.includes(src.valeur) || t.includes(attendu))
    : sansPrefixe(t, v.retirer_prefixe) !== attendu));
  if (faux.length) {
    add('bloquant', 'VA1', `« ${nom} » : la page affiche « ${faux[0]} », la source donne « ${src.valeur} » (commande : ${libelleCmd(v.commande)})`
      + (affiches.length > 1 ? ` — ${faux.length} occurrence(s) sur ${affiches.length} divergent` : ''), ou);
  } else {
    add('info', 'VA1', `« ${nom} » : « ${affiches[0]} » égale la source « ${src.valeur} »`
      + (affiches.length > 1 ? ` (${affiches.length} occurrences)` : ''), ou);
  }
}

const extra = { declaration: cheminDecl, valeurs_declarees: valeurs.length, valeurs_comparees: compares };
if (F.some(f => f.sev === 'bloquant')) sortir('FAIL', 1, extra);
if (!compares) sauter('aucune valeur déclarée n\'a pu être comparée', extra);
sortir('PASS', 0, extra);
