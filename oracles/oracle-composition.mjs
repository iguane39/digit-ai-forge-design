#!/usr/bin/env node
// oracle-composition — Domaine « Composition d'une page servie : ses composants sont-ils dessinés par la feuille de la composition ? ».
//
// POURQUOI IL EXISTE (TF-2901, lot Produit-82 du 27/11/2026). Une nouvelle composition a été jugée par run-oracles-design sur 6
// écrans refaits (12 pages, tout PASS). Les 9 autres écrans servis sous la même adresse gardaient l'ancienne composition —
// titres en capitales, plaques sombres, cadres de 2 px, boutons en pilule — et le porteur l'a vu à l'œil : aucun oracle ne les
// avait rendus, faute d'être nommés. Le mode `--site` de run-oracles-design relève toutes les pages que la navigation sert ;
// ce juge-ci lit CHAQUE page contre la feuille de la composition et nomme les composants que celle-ci ne dessine pas.
//
// COMMENT IL JUGE. Il compare des noms de classes, rien d'autre :
//   - les classes que le balisage de la page EMPLOIE (DOM statique et fragments de gabarit écrits par ses scripts) ;
//   - les classes que la feuille de la composition DESSINE (un sélecteur qui les nomme, hors `:not(…)`, hors @keyframes) ;
//   - les classes que la page dessine par SES feuilles (celles qu'elle lie, et ses blocs <style>) : une classe que la page
//     dessine elle-même mais que la composition ne dessine pas est un composant d'une AUTRE composition.
// La composition est donnée par une feuille .css, une page servie (ses feuilles liées sont lues à son origine) ou une URL de
// la boucle locale ; plusieurs `--composition` s'additionnent.
//
// LES RÈGLES.
//   CO1  composant d'une autre composition (bloquant). Une classe employée par la page, dessinée par une feuille de la page
//        mais par aucune feuille de la composition : le composant existe à l'écran et la composition ne le dessine pas.
//        Une règle par classe, avec le nombre d'éléments et la première balise qui la porte.
//   CO2  classe employée que nulle feuille ne dessine (avertissement). Ni la composition ni la page n'ont de règle pour elle :
//        point d'accroche d'un script, état, ou composant resté sans mise en forme. Elle ne fait pas échouer la page — une
//        classe sans règle ne dessine rien, donc rien d'une ancienne composition —, mais elle se nomme.
//   CO3  la composition ne dessine aucune classe (bloquant). Une feuille sans un seul sélecteur de classe n'est pas la feuille
//        d'une composition (feuille vide, mauvaise référence) : comparer à elle ferait échouer toute page, ou aucune.
//   CO0  la page ou la composition est illisible, ou aucune --composition n'est passée (porte d'appel, SKIP motivé exit 2).
// Une classe se dispense par `--classes-libres a,b,prefixe-*` : la page déclare ce qu'elle emploie hors composition (outil
// utilitaire d'un cadre, composant propre à la page). La dispense est DITE au rapport, jamais silencieuse.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0 PASS, 1 FAIL, 2 SKIP.
// Usage : node oracle-composition.mjs <page.html|url> --composition <feuille.css|page.html|url>… [--classes-libres a,b,p-*]
//         [--accepter-certificat-local] [--json-only]

import { lireReference, classesDessinees, classesEmployees, estClasseLibre } from './lib/feuilles.mjs';
import { plageDeRegles } from './lib/regles-jouees.mjs';

// TF-2287 — les règles que l'oracle JOUE, déclarées UNE fois ; la plage citée à la sortie en dérive.
const REGLES_JOUEES = ['CO1', 'CO2', 'CO3'];
// La porte d'appel : page ou composition illisible, aucune composition donnée. Elle rend SKIP, elle ne fait pas partie de la plage jugée.
const REGLES_HORS_PLAGE = ['CO0'];
const PLAGE_JOUEE = plageDeRegles(REGLES_JOUEES);

const DOM = 'Composition d\'une page servie : ses composants sont-ils dessinés par la feuille de la composition ?';
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const certificatLocal = args.includes('--accepter-certificat-local');
const AVEC_VALEUR = ['--composition', '--classes-libres'];
const cible = args.find((a, i) => !a.startsWith('--') && !AVEC_VALEUR.includes(args[i - 1]));
const compositions = args.flatMap((a, i) => (a === '--composition' && args[i + 1] ? [args[i + 1]] : []));
const libres = args.flatMap((a, i) => (a === '--classes-libres' && args[i + 1] ? args[i + 1].split(',').map(s => s.trim()).filter(Boolean) : []));

const NJ = [];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

// TF-2901 : la sortie attend un battement. Les ressources d'une page servie sont lues par fetch ; un process.exit() immédiat ferme le processus
// pendant que libuv referme ces connexions (« Assertion failed: !(handle->flags & UV_HANDLE_CLOSING) », exit 127 au lieu de 0/1/2 sous Windows).
async function sortir(verdict, code) {
  const sansEcart = verdict !== 'SKIP' && !F.some(f => f.sev !== 'info');
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-composition', domaine: DOM, artefact: cible || null, verdict,
    findings: sansEcart ? [...F, { sev: 'info', regle: '—', msg: `${PLAGE_JOUEE} sans écart`, where: cible }] : F,
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  await new Promise(r => setTimeout(r, 150));
  process.exit(code);
}

NJ.push('ce que la page DESSINE n\'est pas jugé, seulement quels composants (classes) la feuille de la composition sait dessiner : une classe que la composition dessine d\'une autre manière, ou une ancienne composition portée par des classes que la composition dessine encore (règles héritées), passe');
NJ.push('seules les classes sont comparées : un style posé par balise (h1 { text-transform: uppercase }), par attribut ou en ligne ne l\'est pas, et un menu ou un composant rendu après le chargement par un script (hors gabarit littéral) n\'est pas lu');
NJ.push('un composant propre à la page (classe dessinée par la seule feuille ou le seul bloc <style> de la page) est refusé comme celui d\'une autre composition : le déclarer par --classes-libres est la voie, dite au rapport');

if (!cible) { add('bloquant', 'CO0', 'aucune page à juger : passer <page.html|url> --composition <feuille>', null); NJ.push('appel incomplet : page absente'); await sortir('SKIP', 2); }
if (!compositions.length) {
  add('bloquant', 'CO0', 'aucune feuille de composition donnée (--composition <feuille.css|page|url>) : rien à quoi comparer la page', cible);
  NJ.push('comparaison à la feuille de la composition NON JOUÉE : aucune --composition');
  await sortir('SKIP', 2);
}

const page = await lireReference(cible, { certificatLocal });
if (page.erreur || page.html === null) {
  add('bloquant', 'CO0', `page illisible (${page.erreur || 'ni une page HTML ni un fichier lisible'}) : ${cible}`, cible);
  NJ.push('page non lue : rien n\'a été jugé');
  await sortir('SKIP', 2);
}
const dessineesParLaComposition = new Set();
for (const ref of compositions) {
  const lue = await lireReference(ref, { certificatLocal });
  if (lue.erreur) {
    add('bloquant', 'CO0', `composition illisible (${lue.erreur}) : ${ref}`, ref);
    NJ.push(`composition ${ref} non lue : rien n'a été jugé`);
    await sortir('SKIP', 2);
  }
  for (const c of classesDessinees(lue.css)) dessineesParLaComposition.add(c);
  for (const x of lue.non_lues) NJ.push(`feuille ${x.ref} liée par la composition ${ref} NON lue (${x.raison}) : ses classes ne comptent pas parmi celles que la composition dessine, des composants peuvent être refusés à tort`);
}
if (dessineesParLaComposition.size === 0) {
  add('bloquant', 'CO3', `la feuille de la composition (${compositions.join(', ')}) ne dessine aucune classe : ce n'est pas la feuille d'une composition (feuille vide, mauvaise référence, ou page sans feuille liée lisible) ; comparer à elle ferait échouer toute page, ou aucune`, compositions.join(', '));
  await sortir('FAIL', 1);
}
for (const x of page.non_lues) NJ.push(`feuille ${x.ref} liée par la page NON lue (${x.raison}) : les classes qu'elle dessine ne sont pas connues, un composant d'une autre composition peut passer`);

const dessineesParLaPage = classesDessinees(page.css);
const employees = classesEmployees(page.html);
const dispensees = [];
let autres = 0; let sansRegle = 0;
for (const [classe, v] of employees) {
  if (dessineesParLaComposition.has(classe)) continue;
  if (estClasseLibre(classe, libres)) { dispensees.push(classe); continue; }
  if (dessineesParLaPage.has(classe)) {
    autres++;
    add('bloquant', 'CO1', `composant d'une autre composition : .${classe} (${v.n} élément${v.n > 1 ? 's' : ''}, ${v.balise}…) — la page le dessine par sa feuille, la feuille de la composition ne le dessine pas`
      + ' ; le remplacer par le composant de la composition, ou le déclarer propre à la page (--classes-libres)', `.${classe}`);
  } else {
    sansRegle++;
    add('avertissement', 'CO2', `classe sans règle : .${classe} (${v.n} élément${v.n > 1 ? 's' : ''}, ${v.balise}…) — ni la composition ni la page ne la dessinent (accroche de script, état, ou composant sans mise en forme)`, `.${classe}`);
  }
}
if (dispensees.length) {
  F.push({ sev: 'info', regle: '—', msg: `${dispensees.length} classe(s) dispensée(s) par --classes-libres (déclaration de la page) : ${dispensees.slice(0, 20).join(', ')}${dispensees.length > 20 ? `, … (${dispensees.length} au total)` : ''}`, where: cible });
}
NJ.push(`${employees.size} classe(s) employée(s) par la page, ${dessineesParLaComposition.size} dessinée(s) par la composition : ${autres} composant(s) d'une autre composition, ${sansRegle} classe(s) sans règle, ${dispensees.length} dispensée(s)`);
await sortir(F.some(f => f.sev === 'bloquant') ? 'FAIL' : 'PASS', F.some(f => f.sev === 'bloquant') ? 1 : 0);
