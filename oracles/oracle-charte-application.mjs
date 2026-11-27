#!/usr/bin/env node
// oracle-charte-application — Domaine « Maquette d'un produit existant : suit-elle la charte graphique de l'application servie ? ».
//
// POURQUOI IL EXISTE (TF-2910, lot Produit-82 du 27/11/2026). Consigne du porteur, mot pour mot : « les maquettes doivent suivre la
// charte graphique de l'application existante, sinon il est difficile de se projeter sur le résultat final une fois implémenté. »
// 18 maquettes d'un produit déjà servi avaient chacune leur propre charte, sans lien avec l'interface servie, et ont dû être refaites.
// Aucun contrôle ne comparait ce que la maquette déclare à ce que l'application dessine. Celui-ci le fait sur les jetons.
//
// CE QU'IL COMPARE.
//   - les propriétés personnalisées de COULEUR de la maquette (`--accent: #d6336c`, alias var() résolus) contre les couleurs que
//     la charte de l'application porte : ses propres jetons ET les couleurs littérales de ses règles. Deux couleurs sont la même à
//     1/255 près par canal (hex, rgb, hsl, oklch confondus) et à 1 % d'opacité près ;
//   - la PREMIÈRE famille de chaque pile de polices de la maquette (jeton ou `font-family`) contre toutes les familles que la
//     charte nomme (ses piles et ses @font-face), sans casse ni guillemets. Les génériques (serif, sans-serif, system-ui…) et les
//     familles de repli, qui suivent la première, ne se comparent pas.
// La charte est celle de l'application SERVIE : une ou plusieurs feuilles .css, une page servie dont les feuilles liées sont lues
// (fichier, ou URL de la boucle locale — aucun accès réseau vers un tiers), plusieurs `--charte` s'additionnent.
//
// LES RÈGLES.
//   CH1  couleur hors charte (bloquant). Un jeton de couleur de la maquette n'existe dans aucune couleur de la charte de
//        l'application. Le message nomme la couleur de la charte la plus proche.
//   CH2  police hors charte (bloquant). La première famille d'une pile de la maquette n'est nommée par aucune pile ni aucun
//        @font-face de la charte.
//   CH3  dispense. Une dispense DÉCLARÉE et motivée (`--dispense "<motif>"`, ou <meta name="forge-charte-dispense" content="<motif>">
//        dans la maquette) lève CH1 et CH2 : ils restent écrits, en information, avec le motif — la dispense se lit, elle ne
//        s'efface pas. `--dispenser "<jeton|valeur|famille>=<motif>"` (répétable) ne lève que l'écart qu'il nomme. Un motif de moins
//        de 12 caractères, ou vide, n'est pas une dispense : CH3 bloquant, et les écarts restent refusés.
//   CH0  l'appel ou une entrée est illisible, ou rien n'est comparable (porte d'appel, SKIP motivé exit 2) : une charte sans couleur
//        ni police, une maquette sans jeton de couleur ni famille, une feuille introuvable. Un contrôle qui n'a rien comparé ne
//        se lit pas « vert ».
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0 PASS, 1 FAIL, 2 SKIP.
// Usage : node oracle-charte-application.mjs <maquette.html> --charte <feuille.css|page|url>… [--tokens <tokens.css>]
//         [--dispense "<motif>"] [--dispenser "<clé>=<motif>"]… [--accepter-certificat-local] [--json-only]

import fs from 'node:fs';
import { lireReference, jetonsDe, memeCouleur, nomDeFamille } from './lib/feuilles.mjs';
import { parse as parseHtml, elements } from './lib/html.mjs';
import { plageDeRegles } from './lib/regles-jouees.mjs';

// TF-2287 — les règles que l'oracle JOUE, déclarées UNE fois ; la plage citée à la sortie en dérive.
const REGLES_JOUEES = ['CH1', 'CH2', 'CH3'];
// La porte d'appel : entrée illisible ou rien à comparer. Elle rend SKIP, elle ne fait pas partie de la plage jugée.
const REGLES_HORS_PLAGE = ['CH0'];
const PLAGE_JOUEE = plageDeRegles(REGLES_JOUEES);

const DOM = 'Maquette d\'un produit existant : suit-elle la charte graphique de l\'application servie ?';
const MOTIF_MIN = 12;
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const certificatLocal = args.includes('--accepter-certificat-local');
const AVEC_VALEUR = ['--charte', '--tokens', '--dispense', '--dispenser'];
const cible = args.find((a, i) => !a.startsWith('--') && !AVEC_VALEUR.includes(args[i - 1]));
const chartes = args.flatMap((a, i) => (a === '--charte' && args[i + 1] ? [args[i + 1]] : []));
const fichierTokens = (() => { const i = args.indexOf('--tokens'); return i === -1 ? null : args[i + 1]; })();
const dispenseDonnee = (() => { const i = args.indexOf('--dispense'); return i === -1 ? null : (args[i + 1] ?? ''); })();
const dispenses = args.flatMap((a, i) => {
  if (a !== '--dispenser') return [];
  const brut = args[i + 1] || ''; const egal = brut.indexOf('=');
  return [egal === -1 ? { cle: brut.trim(), motif: '' } : { cle: brut.slice(0, egal).trim(), motif: brut.slice(egal + 1).trim() }];
});

const NJ = [];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

// TF-2901 : la sortie attend un battement. Une feuille servie est lue par fetch ; un process.exit() immédiat ferme le processus pendant que
// libuv referme ces connexions (« Assertion failed: !(handle->flags & UV_HANDLE_CLOSING) », exit 127 au lieu de 0/1/2 sous Windows).
async function sortir(verdict, code) {
  // « sans écart » dit qu'aucun écart n'a été vu : une dispense lève des écarts, elle ne les efface pas, la ligne ne se pose pas.
  const sansEcart = verdict !== 'SKIP' && F.length === 0;
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-charte-application', domaine: DOM, artefact: cible || null, verdict,
    findings: sansEcart ? [...F, { sev: 'info', regle: '—', msg: `${PLAGE_JOUEE} sans écart`, where: cible }] : F,
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  await new Promise(r => setTimeout(r, 150));
  process.exit(code);
}

NJ.push('seules les VALEURS sont comparées : une couleur de la maquette qui existe dans la charte mais pour un autre rôle (le fond de l\'application employé comme couleur de texte) passe ; le rôle de chaque jeton, l\'usage, la hiérarchie et la mise en page ne sont pas jugés');
NJ.push('la charte est celle des feuilles LUES, pas celle de leur source : une couleur que l\'application calcule à l\'exécution (script, color-mix, calc) ou tire d\'une feuille non lue n\'est pas connue, et la maquette qui la reprend est refusée à tort');
NJ.push('les couleurs écrites en dur dans les règles de la maquette (hors jeton) ne sont pas comparées ici : oracle-tokens (T1) les refuse ; les familles de repli d\'une pile, la propriété raccourcie `font` et les familles d\'une règle @font-face de la maquette ne sont pas comparées non plus');

if (!cible || !fs.existsSync(cible)) { add('bloquant', 'CH0', `aucune maquette à juger${cible ? ` (fichier introuvable : ${cible})` : ''} : passer <maquette.html> --charte <feuille>`, cible || null); NJ.push('appel incomplet : maquette absente'); await sortir('SKIP', 2); }
if (!chartes.length) {
  add('bloquant', 'CH0', 'aucune charte d\'application donnée (--charte <feuille.css|page servie|url>) : rien à quoi comparer la maquette', cible);
  NJ.push('comparaison à la charte de l\'application NON JOUÉE : aucune --charte. Pour un produit déjà servi, la maquette part de l\'interface servie (ses feuilles et ses polices réelles) ; pour un produit sans application, ce contrôle ne s\'applique pas');
  await sortir('SKIP', 2);
}

const maquette = await lireReference(cible, { certificatLocal });
if (maquette.erreur || maquette.html === null) {
  add('bloquant', 'CH0', `maquette illisible (${maquette.erreur || 'pas une page HTML'}) : ${cible}`, cible);
  NJ.push('maquette non lue : rien n\'a été jugé');
  await sortir('SKIP', 2);
}
let cssMaquette = maquette.css;
if (fichierTokens) {
  const t = await lireReference(fichierTokens, { certificatLocal });
  if (t.erreur) { add('bloquant', 'CH0', `fichier de jetons illisible (${t.erreur}) : ${fichierTokens}`, fichierTokens); NJ.push('--tokens non lu : rien n\'a été jugé'); await sortir('SKIP', 2); }
  cssMaquette += '\n' + t.css;
}
for (const x of maquette.non_lues) NJ.push(`feuille ${x.ref} liée par la maquette NON lue (${x.raison}) : ses jetons ne sont pas comparés`);

let cssCharte = '';
for (const ref of chartes) {
  const c = await lireReference(ref, { certificatLocal });
  if (c.erreur) { add('bloquant', 'CH0', `charte illisible (${c.erreur}) : ${ref}`, ref); NJ.push(`charte ${ref} non lue : rien n'a été jugé`); await sortir('SKIP', 2); }
  cssCharte += '\n' + c.css;
  for (const x of c.non_lues) NJ.push(`feuille ${x.ref} liée par la charte ${ref} NON lue (${x.raison}) : les couleurs et polices qu'elle porte ne sont pas connues, la maquette peut être refusée à tort`);
}

const charte = jetonsDe(cssCharte);
const jetons = jetonsDe(cssMaquette);
if (!charte.couleurs.length && !charte.familles.length) {
  add('bloquant', 'CH0', `la charte (${chartes.join(', ')}) ne porte aucune couleur ni aucune famille de police lisible : ce n'est pas la feuille d'une application (feuille vide, mauvaise référence, ou page sans feuille liée lisible)`, chartes.join(', '));
  await sortir('SKIP', 2);
}
const couleursMaquette = jetons.couleurs.filter(c => c.jeton);
const famillesMaquette = jetons.familles.filter(f => f.premier);
if (!couleursMaquette.length && !famillesMaquette.length) {
  add('bloquant', 'CH0', 'la maquette ne déclare aucun jeton de couleur (propriété personnalisée) ni famille de police : il n\'y a rien à comparer à la charte — un contrôle qui n\'a rien comparé ne se lit pas « vert »', cible);
  NJ.push('maquette sans jeton comparable : si elle emploie des couleurs en dur, oracle-tokens (T1) les refuse ; poser ses couleurs et ses polices en jetons, repris de la charte');
  await sortir('SKIP', 2);
}
for (const ligne of jetons.non_resolus) NJ.push(`jeton de la maquette non résolu, non comparé : ${ligne}`);
for (const ligne of charte.non_resolus) NJ.push(`jeton de la charte non résolu (alias vers rien, color-mix…), sa couleur n'est pas connue : ${ligne}`);

// La dispense : celle de l'appel, ou celle que la maquette porte (<meta name="forge-charte-dispense" content="…">).
const metaDispense = elements(parseHtml(maquette.html), 'meta').find(m => String(m.attrs.name || '').toLowerCase() === 'forge-charte-dispense');
const dispenseTotale = dispenseDonnee !== null ? { motif: dispenseDonnee.trim(), source: 'option --dispense' }
  : metaDispense ? { motif: String(metaDispense.attrs.content || '').trim(), source: '<meta name="forge-charte-dispense"> de la maquette' } : null;
const motifValable = m => m.length >= MOTIF_MIN;
if (dispenseTotale && !motifValable(dispenseTotale.motif)) {
  add('bloquant', 'CH3', `dispense sans motif exploitable (${dispenseTotale.source}) : « ${dispenseTotale.motif} » — un motif d'au moins ${MOTIF_MIN} caractères dit POURQUOI la maquette quitte la charte de l'application (refonte voulue de la charte, produit neuf…) ; sans lui, les écarts restent refusés`, cible);
}
const dispenseValable = dispenseTotale && motifValable(dispenseTotale.motif) ? dispenseTotale : null;
for (const d of dispenses) {
  if (!motifValable(d.motif)) add('bloquant', 'CH3', `--dispenser « ${d.cle}=${d.motif} » sans motif exploitable : « clé=motif » avec un motif d'au moins ${MOTIF_MIN} caractères`, d.cle);
}
const dispensePour = (...cles) => dispenses.find(d => motifValable(d.motif) && cles.some(c => c && c.toLowerCase() === d.cle.toLowerCase())) || null;

const dispensesUsees = [];
// Un écart est bloquant, sauf dispensé : alors il reste écrit en information, avec le motif. Les règles s'émettent par add() plus bas,
// littéralement, pour que le verrou des règles jouées (self-test-regles-jouees) les lise.
function levee(cles) {
  const d = dispensePour(...cles);
  if (d) { dispensesUsees.push(`${d.cle} (${d.motif})`); return { sev: 'info', suite: ` — DISPENSÉ (--dispenser) : ${d.motif}` }; }
  if (dispenseValable) return { sev: 'info', suite: ` — DISPENSÉ (${dispenseValable.source}) : ${dispenseValable.motif}` };
  return { sev: 'bloquant', suite: '' };
}

// CH1 — les couleurs.
const distance = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
let nHorsCharte = 0;
for (const c of couleursMaquette) {
  if (charte.couleurs.some(k => memeCouleur(c.rgba, k.rgba))) continue;
  nHorsCharte++;
  const proche = charte.couleurs.map(k => ({ k, d: distance(c.rgba, k.rgba) })).sort((x, y) => x.d - y.d)[0];
  const l = levee([c.jeton, c.valeur]);
  F.push({ sev: l.sev, regle: 'CH1', where: c.jeton,
    msg: `couleur hors charte : ${c.jeton} : ${c.valeur} n'existe dans aucune des ${charte.couleurs.length} couleurs de la charte de l'application`
      + (proche ? ` (la plus proche : ${proche.k.jeton ? `${proche.k.jeton} : ` : ''}${proche.k.valeur}, écart ${proche.d}/255 sur un canal)` : '')
      + ` ; reprendre la valeur de la charte, ou déclarer la dispense (--dispense "<motif>")${l.suite}` });
}
// CH2 — les polices (la première famille de chaque pile).
const nomsCharte = new Set(charte.familles.map(f => nomDeFamille(f.nom)));
const vues = new Set();
let nPolicesHorsCharte = 0;
for (const f of famillesMaquette) {
  const cle = nomDeFamille(f.nom);
  if (nomsCharte.has(cle) || vues.has(cle)) continue;
  vues.add(cle); nPolicesHorsCharte++;
  const l = levee([f.jeton, f.nom]);
  F.push({ sev: l.sev, regle: 'CH2', where: f.jeton || f.origine,
    msg: `police hors charte : ${f.jeton ? `${f.jeton} : ` : 'font-family : '}« ${f.nom} » n'est nommée par aucune pile ni aucun @font-face de la charte de l'application`
      + ` (familles de la charte : ${[...new Set(charte.familles.map(x => x.nom))].slice(0, 8).join(', ') || 'aucune'}) ; reprendre la police de la charte, ou déclarer la dispense (--dispense "<motif>")${l.suite}` });
}
if (dispenseValable) {
  add('info', 'CH3', `dispense déclarée (${dispenseValable.source}) : « ${dispenseValable.motif} » — la maquette quitte la charte de l'application en connaissance de cause ; ${nHorsCharte} couleur(s) et ${nPolicesHorsCharte} police(s) hors charte restent écrites ci-dessus, en information`, cible);
}
for (const d of dispenses) {
  if (motifValable(d.motif) && !dispensesUsees.some(u => u.startsWith(`${d.cle} (`))) add('avertissement', 'CH3', `--dispenser « ${d.cle} » ne correspond à aucun écart : jeton, valeur ou famille inconnu de cette maquette, la dispense est sans objet`, d.cle);
}
NJ.push(`${couleursMaquette.length} jeton(s) de couleur et ${famillesMaquette.length} famille(s) de police de la maquette comparés à ${charte.couleurs.length} couleur(s) et ${new Set(charte.familles.map(f => nomDeFamille(f.nom))).size} famille(s) de la charte : ${nHorsCharte} couleur(s) et ${nPolicesHorsCharte} police(s) hors charte`);
const dur = F.some(f => f.sev === 'bloquant');
await sortir(dur ? 'FAIL' : 'PASS', dur ? 1 : 0);
