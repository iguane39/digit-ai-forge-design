#!/usr/bin/env node
// self-test-regles-jouees — verrou de non-régression : la plage de règles qu'un oracle CITE à sa sortie dérive de la liste
// qu'il JOUE (TF-2287, 09/11/2026 ; même geste que TF-2250 pour oracle-exploitabilite).
//
// Le fait. 23 oracles de la forge (hors oracle-exploitabilite, corrigé par TF-2250) citaient une plage en dur à leur sortie :
// « M1–M8 sans écart », « R1–R7 sans écart », « SA1–SA7 sans écart »… alors qu'ils émettaient aussi M9 à M11, R8 à R14, SA8.
// La plage disait un périmètre plus étroit que celui joué, et rien ne la rougissait quand une règle s'ajoutait. Chaque oracle déclare maintenant `REGLES_JOUEES` (et, s'il y a lieu,
// `REGLES_HORS_PLAGE` : porte d'appel, voie d'approbation), et ce verrou, à double sens, refuse trois dérives :
//   1. une règle émise (`add('sév', 'Xn', …)`, `regle: 'Xn'`) qui ne figure à aucune des deux listes ;
//   2. une règle déclarée que le fichier n'émet pas, ou déclarée aux deux listes ;
//   3. un message qui cite une plage entre guillemets simples ou doubles, « sans écart » ou « déclenchée » à la suite.
// Le sens vert joue en plus les oracles sur une fixture verte : le message rendu est la plage dérivée de la liste.
//
// Exclu : oracle-exploitabilite, dont le verrou propre (self-test-exploitabilite.mjs, TF-2250) traite X0 comme porte.
//
// Usage : node oracles/self-test-regles-jouees.mjs   ·   exit 0 = vert, 1 = régression.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { plageDeRegles, reglesEmises, reglesDeclarees, reglesHorsPlage, ecartDeListe } from './lib/regles-jouees.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const fx = n => path.join(ici, 'fixtures', n);
let echecs = 0, total = 0;
const ligne = (ok, texte) => { total++; if (!ok) echecs++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${texte}`); };

const oracles = fs.readdirSync(ici).filter(f => /^oracle-.*\.mjs$/.test(f) && f !== 'oracle-exploitabilite.mjs').sort();
const sources = Object.fromEntries(oracles.map(f => [f, fs.readFileSync(path.join(ici, f), 'utf8')]));
const dotes = oracles.filter(f => reglesDeclarees(sources[f]).length > 0);

// Une plage citée en dur : un littéral entre guillemets droits (pas un gabarit) qui contient « Xn–Xm » puis « sans écart »
// ou « déclenchée ». Les gabarits (`…${PLAGE_JOUEE}…`) ne sont pas des littéraux.
const RX_PLAGE_EN_DUR = /(['"])(?:(?!\1)[^\n`])*\b[A-Z]{1,3}(?:-[A-Z]+)?-?\d+(?:–|…|-|\/)[A-Z]{0,3}(?:-[A-Z]+)?-?\d+(?:(?!\1)[^\n`])*(?:sans écart|déclenchée)/;
const plageEnDur = src => src.split('\n').filter(l => !/^\s*\/\//.test(l) && RX_PLAGE_EN_DUR.test(l));

console.log('plageDeRegles — la fonction');
ligne(plageDeRegles(['X1', 'X2', 'X3', 'X5']) === 'X1–X3, X5', `suites consécutives en plages, le reste isolé (obtenu « ${plageDeRegles(['X1', 'X2', 'X3', 'X5'])} »)`);
ligne(plageDeRegles(['T4-1', 'T4-2', 'T4-3', 'T4-4'], '…') === 'T4-1…T4-4', 'préfixe à tiret et séparateur propre à l\'oracle (T4-1…T4-4)');
ligne(plageDeRegles(['B-T1', 'B-T2', 'B-T3', 'B-T4']) === 'B-T1–B-T4', 'préfixe composé (B-T1–B-T4)');
ligne(plageDeRegles(['RL-1', 'RL-3', 'RL-4', 'RL-9', 'RL-10']) === 'RL-1, RL-3–RL-4, RL-9–RL-10', `numéros à deux chiffres triés en nombres (obtenu « ${plageDeRegles(['RL-1', 'RL-3', 'RL-4', 'RL-9', 'RL-10'])} »)`);
ligne(plageDeRegles(['M1', 'M2', 'M11'], '-') === 'M1-M2, M11', 'une règle ajoutée hors suite se cite à part');

console.log('Les listes déclarées — chaque oracle, au vrai fichier');
ligne(dotes.length >= 20, `au moins 20 oracles déclarent REGLES_JOUEES (obtenu ${dotes.length} : ${dotes.map(f => f.replace(/^oracle-|\.mjs$/g, '')).join(', ')})`);
for (const f of dotes) {
  const e = ecartDeListe(sources[f]);
  const bilan = `hors liste : ${e.emises_non_declarees.join(' ') || 'aucune'} ; sans émission : ${e.declarees_non_emises.join(' ') || 'aucune'} ; en double : ${e.en_double.join(' ') || 'aucune'}`;
  ligne(!e.emises_non_declarees.length && !e.declarees_non_emises.length && !e.en_double.length,
    `${f} · REGLES_JOUEES [${reglesDeclarees(sources[f]).join(' ')}]${reglesHorsPlage(sources[f]).length ? ` + hors plage [${reglesHorsPlage(sources[f]).join(' ')}]` : ''} égale les règles émises (${bilan})`);
}
const nus = oracles.filter(f => !dotes.includes(f) && plageEnDur(sources[f]).length);
ligne(nus.length === 0, `aucun oracle sans liste ne cite de plage en dur à sa sortie (obtenu : ${nus.join(', ') || 'aucun'})`);
const enDur = dotes.filter(f => plageEnDur(sources[f]).length);
ligne(enDur.length === 0, `aucun oracle à liste ne garde une plage en dur à sa sortie (obtenu : ${enDur.join(', ') || 'aucun'})`);

console.log('Les trois dérives — sens rouge, jouées sur la source réelle d\'un oracle');
const modele = sources['oracle-saisie.mjs'];
const nouvelle = ecartDeListe(modele + "\nadd('avertissement', 'SA9', 'règle neuve non déclarée', ou);\n");
ligne(nouvelle.emises_non_declarees.join(' ') === 'SA9', `une règle SA9 émise sans figurer à aucune liste est vue (obtenu : ${nouvelle.emises_non_declarees.join(' ') || 'rien'})`);
const fantome = ecartDeListe(modele.replace("'SA8']", "'SA8', 'SA12']"));
ligne(fantome.declarees_non_emises.join(' ') === 'SA12', `une règle SA12 déclarée sans être émise est vue (obtenu : ${fantome.declarees_non_emises.join(' ') || 'rien'})`);
const double = ecartDeListe(sources['oracle-tokens.mjs'].replace("['T0']", "['T0', 'T1']"));
ligne(double.en_double.join(' ') === 'T1', `une règle déclarée aux deux listes est vue (obtenu : ${double.en_double.join(' ') || 'rien'})`);
const retourEnDur = modele.replace('msg: `${PLAGE_JOUEE} sans écart`', "msg: 'SA1–SA7 sans écart'");
ligne(retourEnDur !== modele && plageEnDur(retourEnDur).length === 1, 'le retour de « SA1–SA7 sans écart » en dur dans la sortie est vu');
const retourEnDurHorsListe = "sortir('PASS', F.length ? F : [{ sev: 'info', regle: '—', msg: \"aucune des règles Z1–Z9 déclenchée\", where: file }], 0);";
ligne(plageEnDur(retourEnDurHorsListe).length === 1, 'une plage en dur entre guillemets doubles (« aucune des règles Z1–Z9 déclenchée ») est vue');
ligne(plageEnDur('msg: `${PLAGE_JOUEE} sans écart`').length === 0 && plageEnDur('// M1–M8 sans écart (ancien)').length === 0,
  'sens vert · un gabarit dérivé et un commentaire ne sont pas des plages en dur');

console.log('Le message rendu — sens vert, les oracles joués sur une fixture verte');
// [oracle, fixture verte, arguments en plus]. Chaque oracle dont la fixture rend la ligne « sans écart » doit y dire la
// plage dérivée de sa propre liste ; un oracle dont la fixture porte un constat (avertissement, registre) est compté à part.
// Une page minimale (titre, un paragraphe) n'offre rien à juger à la plupart des oracles : leur ligne « sans écart » est rendue.
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'regles-jouees-'));
const MINIMALE = path.join(dossier, 'minimale.html');
fs.writeFileSync(MINIMALE, '<!DOCTYPE html>\n<html lang="fr"><head><meta charset="utf-8"><title>Page</title></head><body><main><h1>Titre</h1><p>Texte.</p></main></body></html>\n');
const VERTES = [
  ['bascule', 'bascule-verte.html'], ['perceptibilite', 'perceptibilite-verte.html'], ['restitution', 'restitution-verte.html'],
  ['taste', 'taste-verte.html'], ['erreurs-formulaire', 'erreurs-formulaire-verte.html'],
  ['textes-application', 'textes-application-verte.json'], ['liste-demande', 'liste-demande-verte.md'],
  // TF-2405 : un dossier de clip ; sa ligne « sans écart » se rend quand ffprobe lit son MP4, sinon CL1 rend SKIP et le jeu est compté à part.
  ['clip', 'clip/verte'],
  ...['declencheurs', 'images', 'motion', 'panneau-tache', 'saisie', 'surcouche', 'slop'].map(n => [n, MINIMALE]),
];
let atteints = 0;
for (const [nom, fixture] of VERTES) {
  const f = `oracle-${nom}.mjs`;
  if (!sources[f]) { ligne(false, `${f} introuvable`); continue; }
  const cible = path.isAbsolute(fixture) ? fixture : fx(fixture);
  const r = spawnSync(process.execPath, [path.join(ici, f), cible, '--json-only'], { encoding: 'utf8', timeout: 120000 });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* sortie non JSON : dite ci-dessous */ }
  if (!json) { ligne(false, `${f} sur ${path.basename(fixture)} · sortie non lisible (exit ${r.status}) : ${(r.stdout || r.stderr || '').slice(0, 120)}`); continue; }
  const placeholder = (json.findings || []).find(x => x.regle === '—' || (x.sev === 'info' && /^(D1-D5|B1-B4)$/.test(x.regle)));
  if (!placeholder) { console.log(`  --   ${f} sur ${path.basename(fixture)} · la fixture porte des constats (${json.findings.length}) : la ligne « sans écart » n'est pas rendue ici`); continue; }
  atteints++;
  const sep = /plageDeRegles\(REGLES_JOUEES, (['"])(.+?)\1\)/.exec(sources[f])?.[2];
  const plage = plageDeRegles(reglesDeclarees(sources[f]), sep);
  const dit = /^(D1-D5|B1-B4)$/.test(placeholder.regle) ? placeholder.regle : placeholder.msg;
  ligne(dit.includes(plage), `${f} sur ${path.basename(fixture)} · la ligne rendue cite « ${plage} » (obtenu « ${dit} »)`);
}
ligne(atteints >= 14, `au moins 14 jeux (oracle, entrée) rendent la ligne « sans écart » dite par la liste (obtenu ${atteints} sur ${VERTES.length})`);

fs.rmSync(dossier, { recursive: true, force: true });
console.log(echecs === 0 ? `\nTout vert — ${total} vérifications : les plages citées dérivent des listes jouées, deux sens.`
  : `\n${echecs} ÉCHEC(S) sur ${total}.`);
process.exit(echecs === 0 ? 0 : 1);
