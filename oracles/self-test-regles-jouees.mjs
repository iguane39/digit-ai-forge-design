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
//   3. un message qui cite une plage entre guillemets simples ou doubles, « sans écart », « déclenchée » ou « sans objet » à la suite.
// TF-2293 (14/11/2026) étend le verrou aux sous-plages : un message « sans objet » qui ne cite qu'une partie des règles en dérive
// sa plage d'une seconde liste `REGLES_SANS_OBJET_<CAS>`, que le verrou refuse si elle contient une règle hors REGLES_JOUEES.
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
import { plageDeRegles, reglesEmises, reglesDeclarees, reglesHorsPlage, sousListesSansObjet, ecartDeListe } from './lib/regles-jouees.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const fx = n => path.join(ici, 'fixtures', n);
let echecs = 0, total = 0;
const ligne = (ok, texte) => { total++; if (!ok) echecs++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${texte}`); };

const oracles = fs.readdirSync(ici).filter(f => /^oracle-.*\.mjs$/.test(f) && f !== 'oracle-exploitabilite.mjs').sort();
const sources = Object.fromEntries(oracles.map(f => [f, fs.readFileSync(path.join(ici, f), 'utf8')]));
// oracle-exploitabilite est hors de `oracles` (son verrou propre traite X0), mais ses citations en documentation se lisent comme les autres (TF-2534).
const sourceDe = f => sources[f] ?? fs.readFileSync(path.join(ici, f), 'utf8');
const dotes = oracles.filter(f => reglesDeclarees(sources[f]).length > 0);

// Une plage citée en dur : un littéral entre guillemets droits (pas un gabarit) qui contient « Xn–Xm » puis « sans écart »,
// « déclenchée » ou « sans objet » (TF-2293). Les gabarits (`…${PLAGE_JOUEE}…`) ne sont pas des littéraux.
const RX_PLAGE_EN_DUR = /(['"])(?:(?!\1)[^\n`])*\b[A-Z]{1,3}(?:-[A-Z]+)?-?\d+(?:–|…|-|\/)[A-Z]{0,3}(?:-[A-Z]+)?-?\d+(?:(?!\1)[^\n`])*(?:sans écart|déclenchée|sans objet)/;
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
  const bilan = `hors liste : ${e.emises_non_declarees.join(' ') || 'aucune'} ; sans émission : ${e.declarees_non_emises.join(' ') || 'aucune'} ; en double : ${e.en_double.join(' ') || 'aucune'} ; sous-liste hors jouées : ${e.sous_liste_hors_jouees.join(' ') || 'aucune'}`;
  ligne(!e.emises_non_declarees.length && !e.declarees_non_emises.length && !e.en_double.length && !e.sous_liste_hors_jouees.length,
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
// TF-2293 — les messages « sans objet » et leurs sous-plages.
const sansObjetEnDur = sources['oracle-declencheurs.mjs'].replace('${PLAGE_JOUEE} sans objet`', "DE1–DE3 sans objet'").replace('NJ.push(`aucun déclencheur', "NJ.push('aucun déclencheur");
ligne(plageEnDur(sansObjetEnDur).length === 1, 'sens rouge · TF-2293 · le retour de « DE1–DE3 sans objet » en dur dans le non_juge est vu');
ligne(plageEnDur("NJ.push('aucune image dans le document : I1–I2, I5–I6 sans objet');").length === 1, 'sens rouge · TF-2293 · une sous-plage « I1–I2, I5–I6 sans objet » écrite en dur est vue');
ligne(plageEnDur('NJ.push(`aucune image dans le document : ${plageDeRegles(REGLES_SANS_OBJET_SANS_IMAGE)} sans objet`);').length === 0,
  'sens vert · TF-2293 · une sous-plage dérivée de sa liste n\'est pas une plage en dur');
const sousListes = sousListesSansObjet(sources['oracle-images.mjs']);
ligne(Object.keys(sousListes).join(' ') === 'REGLES_SANS_OBJET_SANS_IMAGE' && sousListes.REGLES_SANS_OBJET_SANS_IMAGE.join(' ') === 'I1 I2 I5 I6',
  `sens vert · TF-2293 · la sous-liste d'images est lue (obtenu : ${JSON.stringify(sousListes)})`);
const sousListeFantome = ecartDeListe(sources['oracle-surcouche.mjs'].replace("['SC1', 'SC2', 'SC3', 'SC5']", "['SC1', 'SC2', 'SC3', 'SC5', 'SC9']"));
ligne(sousListeFantome.sous_liste_hors_jouees.join(' ') === 'REGLES_SANS_OBJET_SANS_COMPOSANT:SC9',
  `sens rouge · TF-2293 · une règle SC9 de sous-liste que REGLES_JOUEES ne contient pas est vue (obtenu : ${sousListeFantome.sous_liste_hors_jouees.join(' ') || 'rien'})`);

console.log('Le message rendu — sens vert, les oracles joués sur une fixture verte');
// [oracle, fixture verte, arguments en plus]. Chaque oracle dont la fixture rend la ligne « sans écart » doit y dire la
// plage dérivée de sa propre liste ; un oracle dont la fixture porte un constat (avertissement, registre) est compté à part.
// Une page minimale (titre, un paragraphe) rend la ligne « sans écart » aux oracles qui PASSENT dessus ; ceux qui n'y ont rien à juger
// rendent SKIP et ne la rendent pas (TF-2535) : ils se jouent sur une fixture verte.
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'regles-jouees-'));
const MINIMALE = path.join(dossier, 'minimale.html');
fs.writeFileSync(MINIMALE, '<!DOCTYPE html>\n<html lang="fr"><head><meta charset="utf-8"><title>Page</title></head><body><main><h1>Titre</h1><p>Texte.</p></main></body></html>\n');
const VERTES = [
  ['bascule', 'bascule-verte.html'], ['perceptibilite', 'perceptibilite-verte.html'], ['restitution', 'restitution-verte.html'],
  ['taste', 'taste-verte.html'], ['erreurs-formulaire', 'erreurs-formulaire-verte.html'],
  ['textes-application', 'textes-application-verte.json'], ['liste-demande', 'liste-demande-verte.md'],
  // TF-2405 : un dossier de clip ; sa ligne « sans écart » se rend quand ffprobe lit son MP4, sinon CL1 rend SKIP et le jeu est compté à part.
  ['clip', 'clip/verte'],
  // TF-2535 : sur une page minimale, declencheurs, saisie et surcouche n'ont rien à juger et rendent SKIP, qui ne rend plus la ligne « sans
  // écart » (elle y était rendue À TORT) : leur ligne se lit sur une fixture verte qu'ils jugent vraiment.
  ['declencheurs', 'declencheurs-verte.html'], ['saisie', 'saisie-sa8-verte.html'], ['surcouche', 'surcouche-sc5-verte.html'],
  // TF-2576 : sur une page minimale, images, motion et panneau-tache n'ont rien à juger et rendent SKIP (la ligne n'y était rendue qu'à
  // tort) : leur ligne se lit sur une fixture verte qu'ils jugent vraiment — des images sans écart, un appui, un panneau sans annonce.
  ['images', 'images-i8-verte.html'], ['motion', 'motion-appui-verte.html'], ['panneau-tache', 'panneau-tache-sans-annonce-verte.html'],
  ['slop', MINIMALE],
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

// Un oracle joué sur une cible (ou sans), sa sortie JSON lue ; null si elle ne l'est pas.
const jouer = (nom, cible) => {
  const r = spawnSync(process.execPath, [path.join(ici, `oracle-${nom}.mjs`), ...(cible ? [cible] : []), '--json-only'], { encoding: 'utf8', timeout: 120000 });
  try { return JSON.parse(r.stdout); } catch { return null; }
};
// TF-2293 — oracle-exploitabilite (hors verrou : X0 est sa porte) ne garde plus sa copie de plageDeRegles : une seule fonction, celle de la lib.
{
  const f = 'oracle-exploitabilite.mjs';
  const src = fs.readFileSync(path.join(ici, f), 'utf8');
  const copieLocale = s => /\bfunction\s+plageDeRegles\b|\b(?:const|let)\s+plageDeRegles\s*=/.test(s);
  const importe = s => /import\s*\{[^}]*\bplageDeRegles\b[^}]*\}\s*from\s*['"]\.\/lib\/regles-jouees\.mjs['"]/.test(s);
  ligne(importe(src) && !copieLocale(src), `sens vert · TF-2293 · ${f} importe plageDeRegles de lib/regles-jouees.mjs et n'en garde aucune copie`);
  ligne(copieLocale(src + '\nfunction plageDeRegles(regles) { return regles.join(); }\n') && !importe('import { lireGrille } from "./lib/grille.mjs";'),
    `sens rouge · TF-2293 · le retour d'une copie locale de plageDeRegles, ou l'absence de l'import, est vu`);
  // TF-2535 : sans cible l'oracle rend SKIP, et un SKIP ne rend plus la ligne « sans écart » (il ne la rendait qu'à tort) : la plage
  // dérivée se lit dans la source, au gabarit qui construit la ligne d'un écran jugé (PASS), et la sortie sans cible n'en porte aucune.
  const sansCible = jouer('exploitabilite', null);
  const gabarit = "msg: `${plageDeRegles(REGLES_JOUEES)} sans écart`";
  ligne(src.includes(gabarit) && !/findings: F\.length \? F : \[\{ sev: 'info', regle: '—', msg: [^\n]*sans écart/.test(src),
    `${f} · la ligne « sans écart » d'un écran jugé se construit depuis la fonction de la lib (« ${plageDeRegles(reglesDeclarees(src))} sans écart ») et n'est jamais rendue pour un SKIP`);
  ligne(sansCible?.verdict === 'SKIP' && !(sansCible.findings || []).some(x => /sans écart/.test(String(x.msg))),
    `${f} sans cible · SKIP, et aucune ligne « sans écart » (obtenu ${sansCible?.verdict}, ${(sansCible?.findings || []).length} constat(s))`);
}

console.log('La documentation — la plage citée pour un oracle atteint sa dernière règle jouée (TF-2293)');
// Un document qui écrit « oracle-saisie (SA1–SA7) » alors que l'oracle joue aussi SA8 dit un périmètre plus étroit que le joué, comme
// le message de sortie que TF-2287 a corrigé. Le verrou lit les .md de la forge : après « oracle-<nom> », la première plage du préfixe
// de l'oracle (dans les 90 caractères, sans franchir une autre mention d'oracle) doit finir à sa dernière règle, ou à la règle que
// « , SAn » lui ajoute (« SA1–SA7, SA8 en avertissement »), ou à celle d'une seconde plage (« M1–M9, M10–M11 »). Posé d'abord pour trois
// oracles (TF-2293), étendu le 14/11/2026 à huit autres, un par un (TF-2534 : PA, M, T, D de oracle-dtcg et de oracle-liste-demande, X, R, I) :
// chacun a ses lignes ci-dessous ; oracle-slop les rejoint avec TF-2595 (demo/NOTE-partis-pris.md citait S1–S10, relevé rejoué sur S1–S12).
// Les citations des oracles qui ne figurent pas encore ici restent à aligner, un oracle à la fois, par cette même liste.
const DOCUMENTES = ['saisie', 'surcouche', 'declencheurs', 'panneau-tache', 'mobile', 'tokens', 'dtcg', 'liste-demande', 'exploitabilite', 'motion', 'images', 'slop'];
const SANS_LIGNE_DE_REGISTRE = ['dtcg', 'liste-demande'];
const racineForge = path.join(ici, '..');
function* documents(dossier) {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (['node_modules', 'output', 'input', 'dist', 'corpus', '.git'].includes(e.name)) continue;
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) yield* documents(p); else if (/\.md$/.test(e.name)) yield p;
  }
}
const numeroDe = r => Number(/(\d+)$/.exec(r)[1]);
// Les plages citées après « oracle-<nom> » dans un texte, leurs bornes (l'extension « , Xp » comprise) et les numéros qu'elles couvrent.
// TF-2585 (15/11/2026) — la plage peut aussi PRÉCÉDER le nom : « (M1–M8) | `oracle-mobile` », le tableau des critères de sortie la pose dans
// la cellule d'avant. Deux lectures, et deux seulement : le nom ouvre une cellule de tableau (la dernière plage de la cellule d'avant), ou la
// plage le touche (rien entre elle et lui que de la ponctuation). Une autre mention d'oracle sur la ligne coupe : la plage entre deux noms
// appartient à celui qui la précède, jamais aux deux.
function plagesCitees(texte, nom, regles) {
  const prefixe = /^(.*?)\d+$/.exec(regles[0])[1];
  const motif = `\\b${prefixe}(\\d+)–${prefixe}(\\d+)(?:,\\s+${prefixe}(\\d+)(?:–${prefixe}(\\d+))?)?`;
  const rx = new RegExp(motif);
  const rxToutes = new RegExp(motif, 'g');
  const trouvees = [];
  const ajouter = c => {
    const couvertes = new Set();
    for (let n = Number(c[1]); n <= Number(c[2]); n++) couvertes.add(n);
    if (c[3]) for (let n = Number(c[3]); n <= Number(c[4] || c[3]); n++) couvertes.add(n);
    trouvees.push({ citee: c[0], bas: Number(c[1]), haut: Number(c[4] || c[3] || c[2]), couvertes });
  };
  for (const m of texte.matchAll(new RegExp(`oracle-${nom}(?![\\w-])`, 'g'))) {
    const fenetre = texte.slice(m.index + m[0].length, m.index + m[0].length + 90).split('oracle-')[0];
    const c = rx.exec(fenetre);
    if (c) ajouter(c);
    const avant = texte.slice(Math.max(0, m.index - 90), m.index).split('\n').pop();
    if (avant.includes('oracle-')) continue;
    const ouvreUneCellule = /\|\s*[`*]*$/.test(avant);
    const zone = ouvreUneCellule ? avant.replace(/\|\s*[`*]*$/, '').split('|').pop() : avant;
    const derniere = [...zone.matchAll(rxToutes)].pop();
    if (derniere && (ouvreUneCellule || /^[\s)\]`*:;,.—–(-]*$/.test(zone.slice(derniere.index + derniere[0].length)))) ajouter(derniere);
  }
  return trouvees;
}
const plagesPerimees = (texte, nom, regles) => plagesCitees(texte, nom, regles).filter(c => c.haut !== Math.max(...regles.map(numeroDe))).map(c => c.citee);
// TF-2576 — un TROU : la plage finit à la bonne règle mais en saute une jouée au milieu (« M1–M8, M10–M11 » alors que M9 est jouée) ; la borne
// haute seule ne le voit pas. Une règle que l'oracle ne joue pas (X7 d'oracle-exploitabilite) n'est jamais un trou : seule la liste jouée compte.
const plagesTroueuses = (texte, nom, regles) => plagesCitees(texte, nom, regles)
  .filter(c => regles.map(numeroDe).some(n => n >= c.bas && n <= c.haut && !c.couvertes.has(n))).map(c => c.citee);
const ligneDeRegistre = (texte, nom) => texte.split('\n').find(l => l.startsWith('|') && l.includes(`oracles/oracle-${nom}.mjs`)) || '';
const reglesAbsentes = (texte, nom, regles) => { const l = ligneDeRegistre(texte, nom); return regles.filter(r => !new RegExp(`\\b${r}\\b`).test(l)); };
const documentsForge = [...documents(racineForge)];
for (const nom of DOCUMENTES) {
  const regles = reglesDeclarees(sourceDe(`oracle-${nom}.mjs`));
  const fautifs = documentsForge.flatMap(d => plagesPerimees(fs.readFileSync(d, 'utf8').replace(/\r\n/g, '\n'), nom, regles).map(c => `${path.relative(racineForge, d)} « ${c} »`));
  ligne(regles.length > 0 && fautifs.length === 0, `oracle-${nom} · aucun .md ne cite une plage qui s'arrête avant ${regles[regles.length - 1]} (${documentsForge.length} .md lus ; obtenu : ${fautifs.join(' ; ') || 'aucune citation périmée'})`);
  const troues = documentsForge.flatMap(d => plagesTroueuses(fs.readFileSync(d, 'utf8').replace(/\r\n/g, '\n'), nom, regles).map(c => `${path.relative(racineForge, d)} « ${c} »`));
  ligne(troues.length === 0, `oracle-${nom} · aucun .md ne cite une plage qui saute une règle jouée (TF-2576 ; obtenu : ${troues.join(' ; ') || 'aucun trou'})`);
  const registre = fs.readFileSync(path.join(ici, 'registre-entrees.md'), 'utf8');
  const absentes = reglesAbsentes(registre, nom, regles);
  // TF-2534 : oracle-dtcg et oracle-liste-demande n'ont jamais été remontés au registre des entrées (aucune ligne ne les nomme) : la
  // ligne de registre qui n'existe pas ne se juge pas. La liste est explicite — une ligne qui y paraît un jour est jugée comme les autres.
  if (SANS_LIGNE_DE_REGISTRE.includes(nom) && ligneDeRegistre(registre, nom) === '') {
    console.log(`  --   oracle-${nom} · aucune ligne au registre des entrées (oracle jamais remonté) : rien à comparer à ${regles.join(' ')}`);
    continue;
  }
  ligne(regles.length > 0 && ligneDeRegistre(registre, nom) !== '' && absentes.length === 0, `oracle-${nom} · sa ligne du registre des entrées nomme chaque règle jouée (${regles.join(' ')} ; absentes : ${absentes.join(' ') || 'aucune'})`);
}
{
  const regles = reglesDeclarees(sources['oracle-saisie.mjs']);
  ligne(plagesPerimees('Contrôles : `oracle-saisie` (SA1–SA7) et `oracle-panneau-tache`.', 'saisie', regles).join() === 'SA1–SA7',
    'sens rouge · TF-2293 · « oracle-saisie (SA1–SA7) » alors que SA8 est jouée : la citation périmée est vue');
  ligne(plagesPerimees('node oracles/oracle-saisie.mjs <page.html>   # SA1–SA7 : typé, proposé', 'saisie', regles).join() === 'SA1–SA7',
    'sens rouge · TF-2293 · la plage d\'une ligne de commande (« # SA1–SA7 : typé ») est vue de la même façon');
  ligne(plagesPerimees('`oracle-saisie` (SA1–SA7, SA8 en avertissement) : un champ', 'saisie', regles).length === 0
    && plagesPerimees('`oracle-saisie` SA1–SA7,\nSA8 en avertissement', 'saisie', regles).length === 0,
    'sens vert · TF-2293 · la plage qui nomme sa règle d\'avertissement (« SA1–SA7, SA8 en avertissement »), même coupée à la ligne, est à jour');
  ligne(plagesPerimees('`oracle-saisie` (SA1–SA8) ; `oracle-panneau-tache` (PA1–PA6)', 'saisie', regles).length === 0,
    'sens vert · TF-2293 · la plage de l\'oracle suivant (PA1–PA6) n\'est pas imputée à oracle-saisie');
  const ligneSans = '| Champs de saisie | `node c:/dev/digit-ai-forge-design/oracles/oracle-saisie.mjs <page.html>` — SA1 format, SA2 temporel, SA3 borne, SA4 aide, SA5 geste, SA6 clavier, SA7 pattern | cli | ✅ |';
  ligne(reglesAbsentes(ligneSans, 'saisie', regles).join() === 'SA8', 'sens rouge · TF-2293 · une ligne du registre sans SA8 est vue (absente : SA8)');
}
// TF-2534 — les huit oracles ajoutés et la seconde plage (« R1–R10, R11–R14 ») : chaque citation d'avant est vue, chaque citation à jour passe.
{
  const reglesDe = nom => reglesDeclarees(sourceDe(`oracle-${nom}.mjs`));
  const CAS_DOC = [
    ['panneau-tache', '`oracle-panneau-tache` PA1–PA6 : un choix exclusif', 'PA1–PA6', '`oracle-panneau-tache` PA1–PA7 : un choix exclusif'],
    ['mobile', 'node oracles/oracle-mobile.mjs <page.html>   # M1–M9, M10 (avertissements)', 'M1–M9, M10', 'node oracles/oracle-mobile.mjs <page.html>   # M1–M9, M10–M11 (avertissements)'],
    ['tokens', '| `oracle-tokens` | T1–T6 | traçabilité', 'T1–T6', '| `oracle-tokens` | T1–T8 | traçabilité'],
    ['dtcg', '`oracles/oracle-dtcg.mjs` (règles D1–D3) vérifie', 'D1–D3', '`oracles/oracle-dtcg.mjs` (règles D1–D4) vérifie'],
    ['liste-demande', '`oracle-liste-demande` (D1–D3) juge', 'D1–D3', '`oracle-liste-demande` (D1–D5) juge'],
    ['exploitabilite', '`oracle-exploitabilite` (X0–X6, X8) sur l\'instance', 'X0–X6, X8', '`oracle-exploitabilite` (X0–X6, X8–X9) sur l\'instance'],
    ['motion', 'node oracles/oracle-motion.mjs <page.html>   # R1–R10, R11–R13 (avertissements)', 'R1–R10, R11–R13', 'node oracles/oracle-motion.mjs <page.html>   # R1–R10, R11–R14 (avertissements)'],
    ['images', '`oracle-images` I1–I6 | SANS OBJET', 'I1–I6', '`oracle-images` I1–I8 | SANS OBJET'],
    ['slop', '| `oracle-slop` S1–S10 | **PASS** |', 'S1–S10', '| `oracle-slop` S1–S12 | **PASS** |'],
  ];
  for (const [nom, perime, citee, aJour] of CAS_DOC) {
    ligne(plagesPerimees(perime, nom, reglesDe(nom)).join() === citee && plagesPerimees(aJour, nom, reglesDe(nom)).length === 0,
      `TF-2534 · oracle-${nom} · sens rouge « ${citee} » vu comme périmé, sens vert « ${plageDeRegles(reglesDe(nom), '–')} » à jour (dernière règle ${reglesDe(nom).slice(-1)[0]})`);
  }
  // TF-2576 — un TROU : la plage cite la bonne dernière règle et en saute une jouée au milieu. La borne haute seule ne le voit pas.
  const m = reglesDe('mobile'), x = reglesDe('exploitabilite');
  const troue = 'node oracles/oracle-mobile.mjs <page.html>   # M1–M8, M10–M11 (avertissements)';
  ligne(plagesPerimees(troue, 'mobile', m).length === 0 && plagesTroueuses(troue, 'mobile', m).join() === 'M1–M8, M10–M11',
    'sens rouge · TF-2576 · « M1–M8, M10–M11 » (M9 sautée, dernière règle M11 citée) : la borne haute le laisse passer, le trou est vu');
  ligne(plagesTroueuses('`oracle-mobile` (M1–M9, M10–M11)', 'mobile', m).length === 0
      && plagesTroueuses('`oracle-mobile` (M1–M4, M6–M11)', 'mobile', m).join() === 'M1–M4, M6–M11',
    'sens rouge · TF-2576 · « M1–M4, M6–M11 » (M5 sautée au milieu de la première plage) est vue');
  ligne(plagesTroueuses('`oracle-exploitabilite` (X0–X3, X5–X9)', 'exploitabilite', x).join() === 'X0–X3, X5–X9',
    'sens rouge · TF-2576 · « X0–X3, X5–X9 » (X4 sautée) est vue même quand une autre règle citée (X7) n\'est pas jouée');
  ligne(plagesTroueuses(`\`oracle-mobile\` (${plageDeRegles(m)})`, 'mobile', m).length === 0
      && plagesTroueuses(`\`oracle-exploitabilite\` (${plageDeRegles(x)})`, 'exploitabilite', x).length === 0
      && plagesTroueuses('`oracle-mobile` (M1–M11)', 'mobile', m).length === 0,
    `sens vert · TF-2576 · la plage dérivée de la liste jouée (« ${plageDeRegles(m)} », « ${plageDeRegles(x)} ») n'est jamais un trou : X7, que l'oracle ne joue pas, n'est pas exigée`);
}
// TF-2595 — le repli « sans écart » d'oracle-barre-externe n'était pas atteignable : B1 à B4 posent chacune un constat avant tout appel de
// sortir(), donc `F.length ? F : [...]` ne rendait jamais son second membre. Il est retiré ; ce bloc tient les deux sens. Le sens vert lit la
// sortie réelle (une fixture verte : exactement un constat par règle jouée ; un fichier absent : B1 seul, FAIL), le sens rouge est la source
// d'avant, repli remis, que le contrôle de source voit.
{
  const f = 'oracle-barre-externe.mjs';
  const src = sources[f];
  const repli = s => /findings:\s*F\.length\s*\?\s*F\s*:\s*\[/.test(s);
  ligne(src && !repli(src), `${f} · sortir() rend F tel quel : aucun repli « F.length ? F : [...] » inatteignable (TF-2595)`);
  const avecRepli = src.replace(/findings:\s*F,[^\r\n]*/, 'findings: F.length ? F : [{ sev: "info", regle: "B1-B4", msg: "sans écart", where: cible }],');
  ligne(avecRepli !== src && repli(avecRepli), 'sens rouge · TF-2595 · le retour du repli « findings: F.length ? F : [...] » est vu par le contrôle de source');
  const lancer = cible => { const r = spawnSync(process.execPath, [path.join(ici, f), cible, '--json'], { encoding: 'utf8', timeout: 120000 }); let j = null; try { j = JSON.parse(r.stdout); } catch { /* illisible */ } return { code: r.status, json: j }; };
  const verte = lancer(fx('barre-externe-verte.md'));
  const parRegle = (verte.json?.findings || []).map(x => x.regle).join(' ');
  ligne(verte.code === 0 && verte.json?.verdict === 'PASS' && parRegle === reglesDeclarees(src).join(' '),
    `sens vert · TF-2595 · ${f} sur sa fixture verte : un constat par règle jouée, dans l'ordre (obtenu « ${parRegle} », exit ${verte.code})`);
  const absent = lancer(path.join(dossier, 'releve-absent.md'));
  ligne(absent.code === 1 && absent.json?.verdict === 'FAIL' && (absent.json?.findings || []).length === 1 && absent.json.findings[0].regle === 'B1',
    `sens rouge · TF-2595 · ${f} sur un relevé absent : FAIL, un constat B1, jamais une ligne « sans écart » (obtenu ${absent.json?.verdict}, ${(absent.json?.findings || []).map(x => x.regle).join(' ')})`);
}
// TF-2585 — la plage citée AVANT le nom : le tableau de criteres-sortie.md la pose dans la cellule d'avant (« (M1–M8) | `oracle-mobile` »).
{
  const reglesDe = nom => reglesDeclarees(sourceDe(`oracle-${nom}.mjs`));
  const ligneC = (critere, plage, nom) => `| C0 | ${critere} (${plage}) | \`oracle-${nom}\` — **si cible** | bloquant |`;
  for (const [nom, perimee, aJour] of [['mobile', 'M1–M8', 'M1–M11'], ['images', 'I1–I6', 'I1–I8'], ['slop', 'S1–S10', 'S1–S12']]) {
    const r = reglesDe(nom);
    ligne(plagesPerimees(ligneC('Contrat tenu', perimee, nom), nom, r).join() === perimee && plagesPerimees(ligneC('Contrat tenu', aJour, nom), nom, r).length === 0,
      `TF-2585 · oracle-${nom} · sens rouge « ${perimee} » avant le nom, dans la cellule d'avant, vu comme périmé · sens vert « ${aJour} » à jour`);
  }
  const s = reglesDe('saisie'), d = reglesDe('dtcg'), l = reglesDe('liste-demande');
  ligne(plagesPerimees(ligneC('Champs typés', 'SA1–SA7, SA8 en avertissement', 'saisie'), 'saisie', s).length === 0
      && plagesPerimees(ligneC('Champs typés', 'SA1–SA7', 'saisie'), 'saisie', s).join() === 'SA1–SA7',
    'TF-2585 · sens vert « SA1–SA7, SA8 en avertissement » avant le nom (la règle d\'avertissement prolonge la plage) · sens rouge « SA1–SA7 » seul');
  ligne(plagesPerimees('la plage M1–M8 `oracle-mobile` juge', 'mobile', reglesDe('mobile')).join() === 'M1–M8'
      && plagesPerimees('la plage M1–M8 de la grille, puis `oracle-mobile` juge', 'mobile', reglesDe('mobile')).length === 0,
    'TF-2585 · une plage qui touche le nom est la sienne (« M1–M8 `oracle-mobile` ») · sens vert : séparée de lui par des mots, elle n\'est pas imputée');
  ligne(plagesPerimees('`oracle-dtcg` (D1–D4), `oracle-liste-demande` (D1–D5)', 'liste-demande', l).length === 0
      && plagesPerimees('`oracle-dtcg` (D1–D3), `oracle-liste-demande` (D1–D5)', 'dtcg', d).join() === 'D1–D3',
    'TF-2585 · sens vert · la plage entre deux noms appartient à celui qui la précède (D1–D4 n\'est pas imputée à oracle-liste-demande) · sens rouge · D1–D3 reste vue pour oracle-dtcg');
  // oracle-slop est dans DOCUMENTES depuis TF-2595 (la note de partis pris cite S1–S12). Le tableau des critères de sortie est verrouillé
  // en plus pour les trois oracles du sujet.
  const criteres = fs.readFileSync(path.join(racineForge, 'skills', 'ameliore-le-design', 'references', 'criteres-sortie.md'), 'utf8').replace(/\r\n/g, '\n');
  for (const nom of ['mobile', 'images', 'slop']) {
    const r = reglesDe(nom);
    ligne(plagesCitees(criteres, nom, r).length > 0 && plagesPerimees(criteres, nom, r).length === 0 && plagesTroueuses(criteres, nom, r).length === 0,
      `TF-2585 · criteres-sortie.md cite pour oracle-${nom} la plage jouée « ${plageDeRegles(r)} » (citations lues : ${plagesCitees(criteres, nom, r).map(c => c.citee).join(' ; ') || 'aucune'})`);
  }
}

console.log('Le message « sans objet » — chaque oracle sur une page minimale, la plage dérive de sa liste (TF-2293)');
// [oracle, liste dont dérive la plage]. Une page minimale n'a ni déclencheur, ni image, ni champ, ni panneau, ni exigence, ni composant :
// chaque oracle dit au non_juge les règles sans objet. Une plage figée (DE1–DE3, SA1–SA7) ne dit plus la liste jouée (DE1–DE4, SA1–SA8).
const SANS_OBJET = [
  ['declencheurs', 'REGLES_JOUEES'], ['images', 'REGLES_SANS_OBJET_SANS_IMAGE'], ['saisie', 'REGLES_JOUEES'],
  ['panneau-tache', 'REGLES_SANS_OBJET_SANS_PANNEAU'], ['perceptibilite', 'REGLES_JOUEES'], ['surcouche', 'REGLES_JOUEES'],
];
for (const [nom, liste] of SANS_OBJET) {
  const f = `oracle-${nom}.mjs`;
  const regles = (liste === 'REGLES_JOUEES' ? reglesDeclarees(sources[f]) : sousListesSansObjet(sources[f])[liste]) || [];
  if (!regles.length) { ligne(false, `${f} · la liste ${liste} est absente ou vide : la plage « sans objet » n'en dérive pas`); continue; }
  const attendu = `${plageDeRegles(regles)} sans objet`;
  const json = jouer(nom, MINIMALE);
  const dit = (json?.non_juge || []).find(n => /sans objet/.test(n) && n.includes(plageDeRegles(regles).split(', ')[0])) || '';
  ligne(!!json && dit.includes(attendu), `${f} sur une page minimale · le non_juge cite « ${attendu} » (liste ${liste}) (obtenu « ${dit.slice(0, 160) || 'aucun message sans objet'} »)`);
}
// La sous-plage de surcouche, côté thème sombre sans composant : SC4 seule est jouée, les quatre autres sont sans objet.
{
  const f = 'oracle-surcouche.mjs';
  const sans = sousListesSansObjet(sources[f]).REGLES_SANS_OBJET_SANS_COMPOSANT || [];
  const seule = reglesDeclarees(sources[f]).filter(r => !sans.includes(r));
  const json = jouer('surcouche', fx('surcouche-sc4-sans-composant-verte.html'));
  const nj = (json?.non_juge || []).find(n => /sans objet/.test(n)) || '';
  ligne(sans.length > 0 && nj.includes(`${plageDeRegles(sans)} sans objet`) && nj.includes(`${plageDeRegles(seule)} évaluée seule`) && json.findings.some(x => x.msg === `${plageDeRegles(seule)} sans écart`),
    `${f} sans composant, thème sombre déclaré · le non_juge cite « ${plageDeRegles(sans)} sans objet » et « ${plageDeRegles(seule)} évaluée seule », la ligne rendue dit « ${plageDeRegles(seule)} sans écart »`);
}

console.log('oracle-declencheurs — la ligne « sans écart » malgré le registre DE0, rendu à chaque passage (TF-2293)');
// DE0 est toujours émise : la ligne « sans écart » dépendait d'un tableau de constats vide, qu'elle ne trouvait jamais.
{
  const f = 'oracle-declencheurs.mjs';
  const plage = plageDeRegles(reglesDeclarees(sources[f]));
  const verte = jouer('declencheurs', fx('declencheurs-verte.html'));
  const ligneVerte = (verte?.findings || []).filter(x => x.regle === '—');
  ligne(verte?.verdict === 'PASS' && ligneVerte.length === 1 && ligneVerte[0].msg === `${plage} sans écart` && verte.findings.some(x => x.regle === 'DE0'),
    `sens vert · une page de déclencheurs sans écart : le registre DE0 ET la ligne « ${plage} sans écart » sont rendus (obtenu ${verte?.verdict}, constats ${(verte?.findings || []).map(x => x.regle).join(' ')})`);
  const rouge = jouer('declencheurs', fx('declencheurs-rouge.html'));
  ligne(rouge?.verdict === 'FAIL' && !rouge.findings.some(x => x.regle === '—') && rouge.findings.some(x => x.regle === 'DE0'),
    `sens rouge · une page avec des écarts : la ligne « sans écart » n'est PAS rendue, le registre DE0 l'est (obtenu ${rouge?.verdict}, constats ${(rouge?.findings || []).map(x => x.regle).join(' ')})`);
  const de4 = jouer('declencheurs', fx('declencheurs-de4-rouge.html'));
  ligne(de4?.findings?.some(x => x.regle === 'DE4') && !de4.findings.some(x => x.regle === '—'),
    `sens rouge · un avertissement DE4 est un constat : la ligne « sans écart » n'est pas rendue à côté (obtenu constats ${(de4?.findings || []).map(x => x.regle).join(' ')})`);
}

console.log('Un constat d\'information n\'est pas un écart : il ne remplace pas la ligne « sans écart » (TF-2584)');
// Mesuré le 15/11/2026 par l'agent du lot de : panneau-tache-verte.html rendait PASS avec pour seul constat PA7 (info), slop-verte.html S1 (info) —
// le repli `F.length ? F : [ligne]` prenait ce constat pour un écart et la ligne disparaissait. Le modèle est celui d'oracle-declencheurs : un écart
// est un constat qui n'est pas info. Quatre oracles émettent un constat d'information qui n'est ni le résultat d'une règle ni un SKIP (PA7, S1 et S3,
// T4, M4) ; barre-externe, baseline, fluidite, caracteres-controle, faits-commerciaux et liste-demande rendent un info qui EST leur ligne de verdict.
{
  const CAS = [
    // [oracle, fixture verte (le constat d'information seul), règle du constat, message de la ligne rendue]
    ['panneau-tache', 'panneau-tache-verte.html', 'PA7', 'sans écart'],
    ['panneau-tache', 'panneau-tache-page-dediee-verte.html', 'PA7', 'sans écart'],
    ['slop', 'slop-verte.html', 'S1', 'déclenchée'],
    ['slop', 'socle-charte-verte.html', 'S3', 'déclenchée'],
    ['tokens', 'tokens-t5-declaree-verte.html', 'T4', 'sans écart'],
    ['mobile', 'mobile-m4-repli-sans-ecart-verte.html', 'M4', 'sans écart'],
  ];
  for (const [nom, fixture, regle, fin] of CAS) {
    const json = jouer(nom, fx(fixture));
    const plage = plageDeRegles(reglesDeclarees(sources[`oracle-${nom}.mjs`]));
    const attendu = fin === 'déclenchée' ? `aucune des règles ${plage} déclenchée` : `${plage} sans écart`;
    const lignes = (json?.findings || []).filter(x => x.regle === '—');
    ligne(json?.verdict === 'PASS' && json.findings.some(x => x.sev === 'info' && x.regle === regle) && lignes.length === 1 && lignes[0].msg === attendu,
      `sens vert · oracle-${nom} sur ${fixture} : le constat d'information ${regle} ET la ligne « ${attendu} » sont rendus (obtenu ${json?.verdict}, constats ${(json?.findings || []).map(x => `${x.sev}:${x.regle}`).join(' ')})`);
  }
  // Sens rouge : un constat qui n'est pas info est un écart, la ligne ne se rend pas à côté.
  const avert = jouer('mobile', fx('mobile-repli-socle-verte.html'));
  ligne(avert?.verdict === 'PASS' && avert.findings.some(x => x.sev === 'info' && x.regle === 'M4') && avert.findings.some(x => x.sev === 'avertissement') && !avert.findings.some(x => x.regle === '—'),
    `sens rouge · oracle-mobile : M4 en info à côté d'avertissements (M5, M11) — des écarts : la ligne « sans écart » n'est PAS rendue (obtenu ${(avert?.findings || []).map(x => `${x.sev}:${x.regle}`).join(' ')})`);
  for (const [nom, fixture] of [['panneau-tache', 'panneau-tache-rouge.html'], ['slop', 'slop-rouge.html'], ['tokens', 'tokens-rouge.html']]) {
    const json = jouer(nom, fx(fixture));
    ligne(json?.verdict === 'FAIL' && !(json.findings || []).some(x => x.regle === '—'),
      `sens rouge · oracle-${nom} sur ${fixture} : FAIL, la ligne « sans écart » n'est pas rendue (obtenu ${json?.verdict}, ${(json?.findings || []).length} constat(s))`);
  }
  // Le texte : le repli qui prend tout constat pour un écart (`F.length ? F : [ligne]`) ne revient pas dans les quatre oracles.
  const ANCIEN_REPLI = /F\.length(?: \|\| verdict === 'SKIP')? \? F : \[\{ sev: 'info', regle: '—', msg: [^\n]*(?:sans écart|déclenchée)/;
  const avecInfo = ['panneau-tache', 'slop', 'tokens', 'mobile'];
  const revenus = avecInfo.filter(n => ANCIEN_REPLI.test(sources[`oracle-${n}.mjs`]));
  ligne(revenus.length === 0, `aucun des oracles qui émettent un constat d'information (${avecInfo.join(', ')}) ne garde le repli « F.length ? F : [ligne] » (obtenu : ${revenus.join(', ') || 'aucun'})`);
  const rendu = sources['oracle-panneau-tache.mjs'].replace(/verdict, findings: sansEcart \? \[\.\.\.F, (\{[^\n]*\})\] : F,/, "verdict, findings: F.length || verdict === 'SKIP' ? F : [$1],");
  ligne(rendu !== sources['oracle-panneau-tache.mjs'] && ANCIEN_REPLI.test(rendu), 'sens rouge · le retour du repli « F.length || verdict === \'SKIP\' ? F : [ligne] » dans oracle-panneau-tache est vu');
}

console.log('Un SKIP ne rend jamais « sans écart » — chaque oracle joué sur un fichier absent, et oracle-saisie sur une page sans champ (TF-2535)');
// « sans écart » dit qu'un jugement a eu lieu et n'a rien trouvé. Un oracle qui rend SKIP n'a rien jugé : la ligne mentait (mesuré le
// 14/11/2026 par l'agent du lot de, sur une page minimale : declencheurs, perceptibilite et surcouche rendaient « <plage> sans écart » avec
// SKIP exit 2 ; la sonde du pilote en a compté dix-huit). Deux gardes : le texte (le repli `F.length ? F : [… sans écart` sans condition de
// SKIP ne revient pas) et le comportement (chaque oracle rendu SKIP sur un fichier absent n'a aucune ligne « sans écart »).
{
  const REPLI_SANS_GARDE = /findings: F\.length \? F : \[\{ sev: 'info', regle: '—', msg: [^\n]*sans écart/;
  const tous = oracles.concat('oracle-exploitabilite.mjs').sort();
  const texteDe = sourceDe;
  const nusDeGarde = tous.filter(f => REPLI_SANS_GARDE.test(texteDe(f)));
  ligne(nusDeGarde.length === 0, `aucun oracle ne garde le repli « sans écart » sans condition de SKIP (obtenu : ${nusDeGarde.join(', ') || 'aucun'} sur ${tous.length} oracles)`);
  const gardee = texteDe('oracle-saisie.mjs');
  const retourDuRepli = gardee.replace("F.length || verdict === 'SKIP' ? F :", 'F.length ? F :');
  ligne(retourDuRepli !== gardee && REPLI_SANS_GARDE.test(retourDuRepli),
    'sens rouge · le retour du repli sans garde de SKIP dans oracle-saisie est vu');

  const ABSENT = path.join(dossier, 'absent.html');
  const jouerCode = (nom, cible, ...plus) => {
    const r = spawnSync(process.execPath, [path.join(ici, `oracle-${nom}.mjs`), cible, ...plus, '--json-only'], { encoding: 'utf8', timeout: 120000 });
    let json = null; try { json = JSON.parse(r.stdout); } catch { /* illisible : la ligne le dira */ }
    return { code: r.status, json };
  };
  const skips = []; const menteurs = [];
  for (const f of tous) {
    const nom = f.replace(/^oracle-|\.mjs$/g, '');
    const { json } = jouerCode(nom, ABSENT);
    if (json?.verdict !== 'SKIP') continue;
    skips.push(nom);
    if ((json.findings || []).some(x => /sans écart/.test(String(x.msg)))) menteurs.push(nom);
  }
  ligne(skips.length >= 15 && menteurs.length === 0,
    `les oracles rendus SKIP sur un fichier absent (${skips.length} : ${skips.join(', ')}) ne rendent aucune ligne « sans écart » (obtenu : ${menteurs.join(', ') || 'aucune'})`);

  // oracle-saisie : une page sans champ rend SKIP motivé, jamais PASS ; une page à champ garde son PASS et sa ligne.
  const sansChamp = jouerCode('saisie', MINIMALE);
  ligne(sansChamp.code === 2 && sansChamp.json?.verdict === 'SKIP' && (sansChamp.json.findings || []).length === 0
      && (sansChamp.json.non_juge || []).some(n => /^aucun champ de saisie dans le document : SA1–SA8 sans objet ici/.test(n)),
    `sens rouge · oracle-saisie sur une page sans champ : SKIP exit 2 motivé au non_juge, aucun constat (obtenu ${sansChamp.json?.verdict}, exit ${sansChamp.code}, ${(sansChamp.json?.findings || []).length} constat(s))`);
  const avecChamp = jouerCode('saisie', fx('saisie-sa8-verte.html'));
  ligne(avecChamp.code === 0 && avecChamp.json?.verdict === 'PASS' && (avecChamp.json.findings || []).some(x => x.msg === 'SA1–SA8 sans écart'),
    `sens vert · oracle-saisie sur une page à champs sans écart : PASS exit 0 et la ligne « SA1–SA8 sans écart » (obtenu ${avecChamp.json?.verdict}, exit ${avecChamp.code})`);

  // Le point d'entrée : une page dont les seules <input> sont une case à cocher ne fait pas tomber l'agrégat en SKIP (SANS OBJET dit),
  // alors qu'oracle-saisie seul y rend SKIP ; une page à vrai champ garde son juge.
  const caseSeule = path.join(dossier, 'case-seule.html');
  const motionVerte = fs.readFileSync(fx('motion-verte.html'), 'utf8');
  const finCorps = motionVerte.lastIndexOf('</body>');
  fs.writeFileSync(caseSeule, `${motionVerte.slice(0, finCorps)}<label><input type="checkbox" name="cgu"> J'accepte les conditions</label>\n${motionVerte.slice(finCorps)}`);
  const entree = (cible) => {
    const r = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), cible, '--json-only'], { encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
    return { code: r.status, json, saisie: (json?.oracles || []).find(o => o.oracle === 'oracle-saisie') };
  };
  const seule = jouerCode('saisie', caseSeule);
  const parEntree = entree(caseSeule);
  ligne(seule.json?.verdict === 'SKIP' && seule.code === 2 && !parEntree.saisie && parEntree.json?.verdict === 'PASS' && parEntree.code === 0
      && (parEntree.json.non_juge || []).some(n => /^oracle-saisie : SANS OBJET — aucun champ de saisie à juger/.test(n)),
    `sens rouge · une case à cocher seule : oracle-saisie rend SKIP, le point d'entrée le dit SANS OBJET et reste PASS exit 0 (obtenu saisie ${seule.json?.verdict}, agrégat ${parEntree.json?.verdict} exit ${parEntree.code})`);
  const vraiChamp = entree(fx('saisie-sa8-verte.html'));
  ligne(vraiChamp.saisie?.verdict === 'PASS' && !(vraiChamp.json?.non_juge || []).some(n => /^oracle-saisie : SANS OBJET/.test(n)),
    `sens vert · une page à vrai champ : oracle-saisie est joué par le point d'entrée et PASS, sans SANS OBJET (obtenu ${vraiChamp.saisie?.verdict})`);
}

console.log('Une page sans l\'objet jugé rend SKIP motivé — images, panneau-tache et motion, jamais un PASS « sans écart » (TF-2576)');
// « jamais PASS par défaut sur un domaine absent » était écrit au non_juge de ces trois oracles, qui rendaient pourtant PASS exit 0 sur une
// page sans image, sans panneau de création, sans mouvement (« PA1–PA7 sans écart », « R1–R14 sans écart », « 0 image(s) ») : même classe que
// oracle-saisie (TF-2535). Chaque oracle rend SKIP exit 2, motivé au non_juge, aucun constat ; un objet partiel (un manifeste d'images, un
// bouton, un écran qui annonce une création) le garde en jugement ; et le point d'entrée dit le cas SANS OBJET, sans faire tomber l'agrégat.
{
  const jouerCode = (nom, cible) => {
    const r = spawnSync(process.execPath, [path.join(ici, `oracle-${nom}.mjs`), cible, '--json-only'], { encoding: 'utf8', timeout: 120000 });
    let json = null; try { json = JSON.parse(r.stdout); } catch { /* illisible : la ligne le dira */ }
    return { code: r.status, json };
  };
  const dit = o => `${o.json?.verdict} exit ${o.code}, ${(o.json?.findings || []).length} constat(s)`;
  const ecrire = (nom, contenu) => { const p = path.join(dossier, nom); fs.writeFileSync(p, contenu); return p; };
  const page = corps => `<!DOCTYPE html>\n<html lang="fr"><head><meta charset="utf-8"><title>Page</title></head><body><main><h1>Titre</h1>${corps}</main></body></html>\n`;
  const SANS_SON_OBJET = [
    ['images', /^aucune image dans le document : I1–I2, I5–I6 sans objet/, 'images-i8-verte.html'],
    ['panneau-tache', /^aucun panneau de création détecté .* PA1–PA6 sans objet ici/, 'panneau-tache-sans-annonce-verte.html'],
    ['motion', /^aucun mouvement dans le document .* R1–R14 sans objet ici/, 'motion-appui-verte.html'],
  ];
  for (const [nom, motif, verte] of SANS_SON_OBJET) {
    const vide = jouerCode(nom, MINIMALE);
    ligne(vide.code === 2 && vide.json?.verdict === 'SKIP' && (vide.json.findings || []).length === 0 && (vide.json.non_juge || []).some(n => motif.test(n)),
      `sens rouge · oracle-${nom} sur une page sans son objet : SKIP exit 2 motivé au non_juge, aucun constat (obtenu ${dit(vide)})`);
    const avecObjet = jouerCode(nom, fx(verte));
    ligne(avecObjet.code === 0 && avecObjet.json?.verdict === 'PASS' && !(avecObjet.json.non_juge || []).some(n => motif.test(n)),
      `sens vert · oracle-${nom} sur ${verte} : PASS exit 0, jugé (obtenu ${dit(avecObjet)})`);
  }
  // Un objet partiel garde le jugement : le manifeste d'images sans image (I6), un bouton sans CSS de mouvement (R14), un écran qui annonce une
  // création sans panneau (PA7) ; un bloc de révocation seul n'est pas du mouvement.
  const manifesteSeul = jouerCode('images', ecrire('manifeste-seul.html', page('<script type="application/json" id="manifeste-images">[{"id":"hero"}]</script>')));
  ligne(manifesteSeul.code === 1 && manifesteSeul.json?.verdict === 'FAIL' && (manifesteSeul.json.findings || []).some(x => x.regle === 'I6'),
    `sens vert · oracle-images sur une page sans image mais avec un manifeste incomplet : jugé, FAIL pour I6 (obtenu ${dit(manifesteSeul)})`);
  const boutonSeul = jouerCode('motion', ecrire('bouton-seul.html', page('<button type="button">Valider</button>')));
  ligne(boutonSeul.code === 0 && boutonSeul.json?.verdict === 'PASS' && (boutonSeul.json.findings || []).some(x => x.regle === 'R14'),
    `sens vert · oracle-motion sur une page sans mouvement mais avec un bouton : jugé, PASS avec l'avertissement R14 (obtenu ${dit(boutonSeul)})`);
  const revocationSeule = jouerCode('motion', ecrire('revocation-seule.html', page('<p>Texte.</p>').replace('</head>', '<style>@media (prefers-reduced-motion: reduce) { * { animation: none; transition: none; } }</style></head>')));
  ligne(revocationSeule.code === 2 && revocationSeule.json?.verdict === 'SKIP',
    `sens rouge · oracle-motion sur une page qui ne porte qu'un bloc de révocation : SKIP, une révocation n'est pas du mouvement (obtenu ${dit(revocationSeule)})`);
  const annonceSeule = jouerCode('panneau-tache', ecrire('annonce-seule.html', page('<section data-ecran="liste"><button type="button">Nouveau lot</button></section>')));
  ligne(annonceSeule.code === 1 && annonceSeule.json?.verdict === 'FAIL' && (annonceSeule.json.findings || []).some(x => x.regle === 'PA7'),
    `sens vert · oracle-panneau-tache sur un écran qui annonce une création sans panneau : jugé, FAIL pour PA7 (obtenu ${dit(annonceSeule)})`);

  // Le point d'entrée : les trois oracles rendus SKIP par une page sans leur objet sont dits SANS OBJET, l'agrégat ne tombe pas en SKIP.
  // La balise vue par le point d'entrée (un <img> et un data-branche dans un commentaire) lance l'oracle, qui rend SKIP : c'est ce SKIP-là qu'il lit.
  const entree = cible => {
    const r = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), cible, '--json-only'], { encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
    return { code: r.status, json };
  };
  const base = fs.readFileSync(fx('saisie-sa8-verte.html'), 'utf8');
  const finCorps = base.lastIndexOf('</body>');
  const commentee = ecrire('commentee.html', `${base.slice(0, finCorps)}<!-- <img src="a.png"> data-branche="x" -->\n${base.slice(finCorps)}`);
  const parEntree = entree(commentee);
  const lance = n => (parEntree.json?.oracles || []).some(o => o.oracle === `oracle-${n}`);
  const disSansObjet = re => (parEntree.json?.non_juge || []).some(n => re.test(n));
  ligne(parEntree.json?.verdict === 'PASS' && parEntree.code === 0 && !lance('images') && !lance('panneau-tache') && !lance('motion')
      && disSansObjet(/^oracle-images : SANS OBJET — aucune image dans le document \(aucun élément/)
      && disSansObjet(/^oracle-panneau-tache : SANS OBJET — aucun panneau de création ni écran qui annonce/)
      && disSansObjet(/^oracle-motion : SANS OBJET — aucun mouvement dans le document/),
    `sens rouge · une page dont les seules balises sont dans un commentaire : images, panneau-tache et motion rendent SKIP, le point d'entrée les dit SANS OBJET et reste PASS exit 0 (obtenu ${parEntree.json?.verdict} exit ${parEntree.code})`);
  const objets = entree(fx('motion-appui-verte.html'));
  ligne((objets.json?.oracles || []).some(o => o.oracle === 'oracle-motion' && o.verdict === 'PASS') && !(objets.json?.non_juge || []).some(n => /^oracle-motion : SANS OBJET/.test(n)),
    `sens vert · une page à mouvement : oracle-motion est joué par le point d'entrée et PASS, sans SANS OBJET (obtenu ${(objets.json?.oracles || []).find(o => o.oracle === 'oracle-motion')?.verdict})`);
}

fs.rmSync(dossier, { recursive: true, force: true });
console.log(echecs === 0 ? `\nTout vert — ${total} vérifications : les plages citées dérivent des listes jouées, deux sens.`
  : `\n${echecs} ÉCHEC(S) sur ${total}.`);
process.exit(echecs === 0 ? 0 : 1);
