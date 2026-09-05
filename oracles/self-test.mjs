#!/usr/bin/env node
// self-test — verrou de non-régression des oracles de la forge design.
// Chaque oracle est rejoué sur sa fixture verte (doit PASS, exit 0) et sa
// fixture rouge (doit FAIL, exit 1, et déclencher TOUTES ses règles).
// À rejouer après toute modification d'un oracle ou de lib/.
//
// Usage : node self-test.mjs   ·   exit 0 = tout vert, 1 = régression.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detecterOutillageRendu } from './lib/rendu.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const fx = f => path.join(ici, 'fixtures', f);
const skill = f => path.join(ici, '..', 'skills', 'ameliore-le-design', 'scripts', f);

// Contrat JSON par défaut : celui des oracles .mjs de la forge.
const CONTRAT_MJS = ['oracle', 'domaine', 'artefact', 'verdict', 'findings', 'non_juge'];
// check_maquette.py est un contrôle de parcours, pas un oracle de domaine : son
// contrat de sortie nomme l'outil et le fichier, et ses findings portent un
// « critere » là où les oracles portent une « regle ».
const CONTRAT_PY = ['outil', 'fichier', 'verdict', 'findings', 'non_juge'];
// run-oracles-design agrège : ses constats vivent dans oracles[].findings.
const CONTRAT_AGREGATEUR = ['orchestrateur', 'racine', 'artefact', 'verdict', 'oracles', 'non_juge'];

function pythonDisponible() {
  for (const candidat of ['python', 'python3']) {
    const r = spawnSync(candidat, ['--version'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return candidat;
  }
  return null;
}
const PYTHON = pythonDisponible();

const CAS = [
  {
    // TF-0494 (22/08) — sur DIX-SEPT points de correction recus en une fois, seize ont ete traites ;
    // le dix-septieme n'a ete decouvert que parce que le client l'a redemande. Le skill decrivait la
    // boucle de controle du LIVRABLE, jamais le suivi de ce qui avait ete DEMANDE. La rouge porte les
    // trois defauts a la fois : un compte annonce qui ne colle pas (D2, le defaut du 22/08 en une
    // soustraction), une preuve creuse (D3), une ligne sans preuve (D1). La verte porte en plus un
    // point NON TRAITE et declare — un reste honnete n'est pas un defaut, un reste muet en est un.
    oracle: 'oracle-liste-demande.mjs',
    regles: ['D1', 'D2', 'D3'],
    verte: [fx('liste-demande-verte.md')],
    rouge: [fx('liste-demande-rouge.md')],
  },
  {
    // TF-0578 (25/08) — LA PAGE DIT-ELLE LA MEME CHOSE QUE L'OFFRE ? Une une promettait « votre
    // produit, LIVRE avec ses preuves » quand les six services du MEME RUN disaient « vos equipes
    // executent les oracles SANS NOUS ». Aucun oracle ne l'a vu : tous jugent la page ISOLEMENT.
    // Celui-ci lit un SECOND artefact et compare QUI TRAVAILLE — le sujet du verbe d'action, pas
    // la simple presence d'un pronom. « Votre produit, LIVRE » contient « votre » et pourtant le
    // client n'y fait rien : il possede, c'est le fournisseur qui livre.
    oracle: 'oracle-coherence-promesse.mjs',
    // P3 SEULE au harnais, et le motif compte : P1 (cadrage sans promesse) et P2 (page sans
    // titre) sont des CONDITIONS D'ENTREE, pas des defauts cumulables — P1 empeche meme P3
    // d'etre evaluee. Une rouge qui les declencherait toutes n'existe pas. Elles sont jouees
    // par le `--self-test` de l'oracle, qui porte 7 cas dont ces deux bornes.
    regles: ['P3'],
    verte: [fx('promesse-page-verte.html'), '--cadrage', fx('promesse-cadrage.md')],
    rouge: [fx('promesse-page-rouge.html'), '--cadrage', fx('promesse-cadrage.md')],
  },
  {
    // TF-0483 (23/08) — LA BARRE EST DEHORS. Une direction artistique a passé TOUS les oracles de
    // cette forge au vert et a été rejetée EN BLOC par le commanditaire : « ça ne présente rien et
    // ça ne donne pas du tout envie ». Un tour complet conception+design perdu. Les oracles jugent
    // la discipline INTERNE ; aucun ne peut dire « ce n'est pas désirable pour la cible ». Cet
    // oracle ne juge pas le beau non plus : il exige que l'ENTRANT EXISTE (relevé daté, sourcé,
    // tranché) et que le GATE HUMAIN ait eu lieu SUR CAPTURES — le commanditaire arbitre des
    // images, pas une description. La rouge est le relevé tel qu'il se fait sans exigence : trois
    // noms sans ce qu'on en retient, rien d'écarté, un arbitrage décrit au lieu d'être soumis.
    oracle: 'oracle-barre-externe.mjs',
    regles: ['B2', 'B3', 'B4'],
    verte: [fx('barre-externe-verte.md')],
    rouge: [fx('barre-externe-rouge.md')],
  },
  {
    oracle: 'oracle-slop.mjs',
    regles: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'],
    verte: [fx('slop-verte.html')],
    rouge: [fx('slop-rouge.html')],
  },
  {
    // Verrou du trou decouvert au run bout-en-bout : tout le slop est porte par
    // des gabarits JS. Un oracle aveugle au rendu dynamique renverrait PASS.
    oracle: 'oracle-slop.mjs',
    regles: ['S6', 'S7', 'S10'],
    verte: [fx('slop-verte.html')],
    rouge: [fx('slop-runtime-rouge.html')],
  },
  {
    oracle: 'oracle-tokens.mjs',
    regles: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    verte: [fx('tokens-verte.html')],
    rouge: [fx('tokens-rouge.html')],
  },
  {
    // TF-0276 : preuve dédiée du PÉRIMÈTRE de T5. Le produit cartésien
    // texte-* × fond-* sortait --texte-sur-accent en FAIL 1.0:1 sur --fond —
    // une paire qu'aucune règle ne pose — tout en restant AVEUGLE à la vraie
    // paire (--texte-sur-accent sur --accent). Les deux fixtures ne diffèrent
    // que par la valeur de --accent : la verte le garde sombre (le blanc y
    // tient), la rouge le passe en teinte claire (1.54:1). Le seuil de 4.5:1
    // est intact ; seul l'appariement a changé.
    oracle: 'oracle-tokens.mjs',
    regles: ['T5'],
    verte: [fx('tokens-t5-verte.html')],
    rouge: [fx('tokens-t5-rouge.html')],
  },
  {
    // TF-0427 (lot Produit-05, 21/08) : une paire dont le texte est HÉRITÉ DE L'AMBIANCE (barre de
    // répartition sur --accent, sans texte) est un AVERTISSEMENT, plus un majeur — la vérité
    // est au rendu (V2). La verte porte cette paire présumée (1.9:1) et doit PASSER ; la rouge
    // reste celle de TF-0276 : une paire POSÉE par la même règle sous 4.5:1 échoue toujours.
    oracle: 'oracle-tokens.mjs',
    regles: ['T5'],
    verte: [fx('tokens-t5-herite.html')],
    rouge: [fx('tokens-t5-rouge.html')],
  },
  {
    // TF-0409, O4 : T7 mesure le contraste NON TEXTUEL (WCAG 1.4.11, seuil 3:1). Un trait
    // sous 3:1 est mesuré et signalé ; il ne devient un écart DUR que si l'auteur DÉCLARE la
    // frontière nécessaire par --paires-interface — WCAG n'exige 3:1 que des frontières qui
    // identifient un composant ou son état, et aucune lecture de CSS ne distingue une bordure
    // décorative d'une frontière nécessaire. Les deux fixtures ne diffèrent que par la valeur
    // de --trait-champ (5.92:1 → 1.20:1), la déclaration étant identique.
    oracle: 'oracle-tokens.mjs',
    regles: ['T7'],
    verte: [fx('tokens-t7-verte.html')],
    rouge: [fx('tokens-t7-rouge.html')],
  },
  {
    // TF-0409, O4 : T8 refuse DEUX choses — poser un focus sans le prescrire, et prescrire un
    // anneau qu'on ne voit pas. La rouge porte les trois branches : focus improvisé (un token
    // qui n'est pas un token de focus), anneau sous 3:1 sur chaque surface du thème, et
    // --focus-decalage nul. Ce qu'elle NE fait pas : réclamer des tokens de focus à un fichier
    // qui n'en pose aucun — mettre en échec tout l'existant ferait désactiver la règle.
    oracle: 'oracle-tokens.mjs',
    regles: ['T8'],
    verte: [fx('tokens-t8-verte.html')],
    rouge: [fx('tokens-t8-rouge.html')],
  },
  {
    oracle: 'oracle-mobile.mjs',
    regles: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
    verte: [fx('mobile-verte.html')],
    rouge: [fx('mobile-rouge.html')],
  },
  {
    oracle: 'oracle-images.mjs',
    regles: ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'],
    verte: [fx('images-verte.html')],
    // Plafonds abaissés : I2 et I3 sont des seuils, la fixture reste légère.
    rouge: [fx('images-rouge.html'), '--max-ko', '1', '--max-mo', '0.001'],
  },
  {
    // TF-0277 : I5/I6 supposaient toute image générée. Pour des photos réelles
    // reprises sur mandat, prompt et modèle n'ont pas d'objet — le manifeste du
    // run digit-desk.fr a été rempli de 18 « aucun », ce qui détruit
    // l'information au lieu de la tracer. « genere »: false dispense de prompt
    // et modèle AU PROFIT de source + date de relevé. La fixture rouge prouve
    // que ce n'est pas une porte de sortie : relevée sans source, relevée sans
    // date, source vide, générée sans prompt, et drapeau mal typé (chaîne
    // "false") qui ne dispense de rien.
    oracle: 'oracle-images.mjs',
    regles: ['I6'],
    verte: [fx('images-relevees-verte.html')],
    rouge: [fx('images-relevees-rouge.html')],
  },
  {
    oracle: 'oracle-corpus.mjs',
    regles: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
    verte: [fx('corpus-verte')],
    rouge: [fx('corpus-rouge')],
  },
  {
    // La fixture verte ne se contente plus d'éviter les sept refus : elle CONSOMME
    // les tokens de mouvement du systeme-de-marque (TF-0321), donc elle prouve aussi
    // que R4 sait résoudre var(--dur-…) — sans quoi prescrire proprement suffisait à
    // rendre la règle aveugle. La rouge n'a aucune révocation : R10 s'y ajoute, et R8
    // y prouve sa SECONDE branche — aucun token de mouvement déclaré, donc la feuille
    // est signalée comme non prescrite au lieu d'être refusée (durcir ici aurait
    // requalifié tout l'existant au lieu de le faire progresser).
    oracle: 'oracle-motion.mjs',
    regles: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R10'],
    verte: [fx('motion-verte.html')],
    rouge: [fx('motion-rouge.html')],
  },
  {
    // TF-0321 : preuve dédiée du CÂBLAGE prescription ↔ jugement. La forge jugeait le
    // mouvement (R1-R7, sept règles négatives) sans jamais le prescrire — la maquette
    // était notée sur des valeurs que la marque n'avait pas fixées. Le craft du geste
    // est irréprochable dans cette fixture ; seule la prescription est fautive :
    // R9 sur un token à 500 ms et sur une courbe à dépassement, R8 sur une durée en
    // dur alors que les tokens existent, R4 sur la durée résolue depuis le token.
    oracle: 'oracle-motion.mjs',
    regles: ['R4', 'R8', 'R9'],
    verte: [fx('motion-verte.html')],
    rouge: [fx('motion-prescription-rouge.html')],
  },
  {
    // TF-0321 : preuve dédiée de la SECONDE branche de R10 — le bloc de révocation
    // existe (un grep le trouve, et c'est exactement ce que check_maquette C4 faisait
    // en avertissement) mais il ne neutralise aucun mouvement. Une révocation non
    // câblée n'existe pas (loi n° 1).
    oracle: 'oracle-motion.mjs',
    regles: ['R10'],
    verte: [fx('motion-verte.html')],
    rouge: [fx('motion-revocation-rouge.html')],
  },
  {
    oracle: 'oracle-dtcg.mjs',
    regles: ['D1', 'D2', 'D3'],
    verte: [fx('dtcg-verte.tokens.json'), fx('dtcg-verte.css')],
    rouge: [fx('dtcg-rouge.tokens.json'), fx('dtcg-rouge.css')],
  },
  {
    // TF-0133 (aval R-30) : bouton présent mais aucun écouteur de clic attaché —
    // bascule morte (loi n° 1). Seule B-T2 est délibérément cassée dans cette
    // fixture ; B-T1, B-T3, B-T4 y restent verts (voir le commentaire en tête de
    // bascule-rouge.html — c'est la fixture demandée par le mandat TF-0133).
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T2'],
    verte: [fx('bascule-verte.html')],
    rouge: [fx('bascule-rouge.html')],
  },
  {
    // Preuve dédiée B-T1 (loi du gabarit : une règle sans fixture rouge n'est pas
    // prouvée) : bouton de bascule absent du DOM, tout le reste conforme.
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T1'],
    verte: [fx('bascule-verte.html')],
    rouge: [fx('bascule-rouge-bt1.html')],
  },
  {
    // Preuve dédiée B-T3 : câblage et palette conformes, aucune trace de
    // localStorage nulle part — persistance jamais déclarée.
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T3'],
    verte: [fx('bascule-verte.html')],
    rouge: [fx('bascule-rouge-bt3.html')],
  },
  {
    // Preuve dédiée B-T4 : bouton câblé et persisté, mais aucun bloc
    // [data-theme="dark"] — la bascule ne change jamais rien visuellement.
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T4'],
    verte: [fx('bascule-verte.html')],
    rouge: [fx('bascule-rouge-bt4.html')],
  },
  {
    // TF-0235 (campagne pilot du 15/08) : restitution lisible — une page déclarée
    // data-restitution porte verdict, KPIs complets, questions de graphiques,
    // chemins de lecteurs et manifeste d'écarts. RL-2/5/6/7/8 déclarées non jugées
    // (socle L7, composant filtres G1-G6, rendu, revue D8, iso-contenu de campagne).
    oracle: 'oracle-restitution.mjs',
    regles: ['RL-1', 'RL-3', 'RL-4', 'RL-9', 'RL-10'],
    verte: [fx('restitution-verte.html')],
    rouge: [fx('restitution-rouge.html')],
  },
  {
    // TF-0199 : règles extraites du skill tiers taste-skill (MIT, consulté le
    // 14/08/2026) — seules celles qui sont mécaniquement vérifiables. Les deux
    // prescriptions de rendu (hero dans la fenêtre, nav sur une ligne) restent
    // des points de revue de lecture, jamais des contrôles qui mentiraient.
    oracle: 'oracle-taste.mjs',
    regles: ['TA1', 'TA2', 'TA3', 'TA4'],
    verte: [fx('taste-verte.html')],
    rouge: [fx('taste-rouge.html')],
  },
  {
    // TF-0275 : le scan de balisage de check_maquette lisait le JS inline. Une
    // bibliothèque minifiée vendorée (Motion) porte « e<a||void 0!==l&&e> », lu
    // comme une ancre ouvrante qui avale le document — C15 se déclenchait et C2
    // voyait des routes fantômes sur une page saine. La fixture verte embarque
    // cette source minifiée ET un gabarit JS écrit à la main (qui, lui, reste
    // jugé) ; la rouge porte la même source et deux vrais CTA sans cible plus
    // une route orpheline — la règle sait toujours refuser.
    python: true,
    oracle: 'check_maquette.py',
    script: skill('check_maquette.py'),
    regles: ['C2', 'C15'],
    cleRegle: 'critere',
    contrat: CONTRAT_PY,
    verte: [fx('maquette-vendor-verte.html')],
    rouge: [fx('maquette-cta-rouge.html')],
  },
  {
    // TF-0736 + TF-0739 (lots Produit-12, 31/08 et 01/09) : DEUX retours utilisateur en deux
    // jours sur LE MÊME composant d'un écran livré ET audité — la campagne v0.4.0 le mesurait
    // câblé (interface 233/235), et il l'était : le défaut n'était mesurable par AUCUN
    // référentiel. Il manquait la VALEUR (deux champs date rendus vides alors que le système
    // connaissait la dernière position de lecture), la BORNE (« Jusqu'au » acceptait une date
    // future), la PROMESSE (« la période part de la … » jamais câblée) et la CIBLE DE GESTE
    // (seule l'icône de vingt pixels ouvrait le sélecteur : « personne ne pense à cliquer tout
    // à droite »). Les deux fixtures sont le MÊME écran, avant et après le correctif produit.
    // La verte garde volontairement un avertissement SA3 (borne d'un seul côté) : il prouve que
    // le palier non bloquant existe sans faire rougir une page saine.
    oracle: 'oracle-saisie.mjs',
    regles: ['SA1', 'SA2', 'SA3', 'SA4', 'SA5', 'SA6'],
    verte: [fx('saisie-verte.html')],
    rouge: [fx('saisie-rouge.html')],
  },
  {
    // Verrou du faux négatif que ce dépôt a DÉJÀ payé une fois (slop-runtime-rouge) : le
    // contrat technique impose un rendu dynamique, donc le formulaire d'une maquette vit
    // dans un gabarit JS, pas dans le DOM statique. Un oracle aveugle au runtime rendrait
    // PASS sur l'écran même qu'il doit juger. Le DOM statique de la rouge est vide de tout
    // champ : SA1, SA2 et SA3 ne peuvent se déclencher que dans le gabarit.
    oracle: 'oracle-saisie.mjs',
    regles: ['SA1', 'SA2', 'SA3'],
    verte: [fx('saisie-verte.html')],
    rouge: [fx('saisie-runtime-rouge.html')],
  },
  {
    // TF-0707 + TF-0708 (lot Produit-12, 16/08, inspection utilisateur en production) : un écran
    // affichait SIMULTANÉMENT les champs des deux modes d'un même flux, derrière un encart replié
    // toujours présent sous la liste qu'il alimentait. L'utilisateur en a déduit une alternative
    // INEXISTANTE entre deux moitiés du même flux, et la même clé lui était demandée deux fois.
    // TF-0708 en tire la seconde moitié : le formulaire replié reste bon pour une création simple,
    // et devient nuisible sur une tâche à branches — d'où DEUX motifs légitimes, pas un imposé
    // partout. La verte porte les deux motifs côte à côte, chacun à sa place ; la rouge porte
    // l'écran tel qu'il a été livré, plus un second panneau dont le sélecteur arrive après les
    // champs qu'il commande (PA2) et dont la route n'est pointée par rien (PA6).
    oracle: 'oracle-panneau-tache.mjs',
    regles: ['PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6'],
    verte: [fx('panneau-tache-verte.html')],
    rouge: [fx('panneau-tache-rouge.html')],
  },
  {
    // Même verrou côté panneau : la liste ET l'encart replié à deux branches sont produits
    // par render(). Le DOM statique ne porte aucun panneau — PA1, PA3 et PA5 ne peuvent se
    // déclencher que si l'oracle lit les gabarits JS autant que le DOM.
    oracle: 'oracle-panneau-tache.mjs',
    regles: ['PA1', 'PA3', 'PA5'],
    verte: [fx('panneau-tache-verte.html')],
    rouge: [fx('panneau-tache-runtime-rouge.html')],
  },
  {
    // TF-0796 (lot pilot du 05/09, fait du 01/09) : une fenêtre `dialog` de choix de dossier,
    // stylée aux jetons et VERTE à sa campagne (api 483/483, suite 989/989), s'est affichée en
    // boîte sombre aux boutons natifs sur le poste de l'utilisateur — mode sombre OS, rendu en
    // top-layer, `color-scheme` absent. Aucun référentiel ne pouvait le voir : tous jugent ce
    // que la PAGE dessine, aucun ne jugeait ce que le NAVIGATEUR dessine à sa place. Les deux
    // fixtures sont la même page, avant et après habillage ; la rouge porte en plus le piège
    // nommé par le message de SC4 — un <meta name="color-scheme"> qui annonce sans jamais
    // suivre la bascule — et fait vivre le composant dans un GABARIT JS, comme le contrat
    // technique de la forge l'impose.
    oracle: 'oracle-surcouche.mjs',
    regles: ['SC1', 'SC2', 'SC3', 'SC4'],
    verte: [fx('surcouche-verte.html')],
    rouge: [fx('surcouche-rouge.html')],
  },
  {
    // TF-0278 : l'agrégateur perdait les issues[] de render_page. Sa table de
    // sévérités ignorait l2_width et l2_gouttiere, pourtant comptés dans le
    // « blocking » de render_page.py — un FAIL sur « L2 accroche bridée 0.47 »
    // remontait avec un findings[] VIDE, et le détail n'était visible qu'en
    // relançant render_page.py à la main. Les deux fixtures ne diffèrent que par
    // un max-width : la rouge bride le corps à 260px sur 1856px disponibles.
    // Dépend de l'outillage de rendu externe — saut motivé s'il manque.
    rendu: true,
    oracle: 'run-oracles-design.mjs',
    regles: ['L2'],
    contrat: CONTRAT_AGREGATEUR,
    findingsDe: j => (j.oracles || []).flatMap(o => o.findings || []),
    verte: [fx('rendu-l2-verte.html'), '--rendu'],
    rouge: [fx('rendu-l2-rouge.html'), '--rendu'],
  },
  {
    // TF-0286 : le geste « avant / après » d'un correctif ad hoc. Les deux
    // fixtures ne diffèrent que par la taille du titre du bandeau (24 → 34px) :
    // à 390px il repasse à la ligne et le rendu s'allonge de 174px. Sens
    // « avant → après » : RC-1 refuse. Sens inverse : PASS — ce qui est réparé
    // ne pèse jamais au débit, sinon l'outil punirait les corrections.
    rendu: true,
    oracle: 'rendu-comparatif.mjs',
    regles: ['RC-1'],
    contrat: ['outil', 'avant', 'apres', 'zone', 'verdict', 'findings', 'non_juge'],
    verte: ['--avant', fx('comparatif-apres.html'), '--apres', fx('comparatif-avant.html')],
    rouge: ['--avant', fx('comparatif-avant.html'), '--apres', fx('comparatif-apres.html')],
  },
];

const OUTILLAGE_RENDU = detecterOutillageRendu();

function lancer(cas, argv) {
  const bin = cas.python ? PYTHON : process.execPath;
  const script = cas.script || path.join(ici, cas.oracle);
  const r = spawnSync(bin, [script, ...argv, '--json-only'], {
    encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' },
  });
  let json = null;
  try { json = JSON.parse(r.stdout.trim()); } catch { /* sortie illisible */ }
  return { code: r.status, json, brut: r.stdout };
}

let echecs = 0;
const ligne = (ok, txt) => { console.log(`${ok ? '  ok  ' : ' ÉCHEC'} ${txt}`); if (!ok) echecs++; };

const sautes = [];

for (const cas of CAS) {
  console.log(`\n${cas.oracle}`);

  if (cas.rendu && !OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
    sautes.push(cas.oracle);
    continue;
  }

  if (cas.python && !PYTHON) {
    // Même doctrine que self-test-baseline : un poste sans Python ne fait pas
    // échouer une garantie que rien de son ressort n'a cassé — mais le saut se dit.
    console.log('  SKIP  interpréteur python introuvable dans le PATH (python / python3)');
    sautes.push(cas.oracle);
    continue;
  }

  const v = lancer(cas, cas.verte);
  ligne(v.code === 0, `verte · exit 0 (obtenu ${v.code})`);
  ligne(v.json?.verdict === 'PASS', `verte · verdict PASS (obtenu ${v.json?.verdict})`);

  const r = lancer(cas, cas.rouge);
  ligne(r.code === 1, `rouge · exit 1 (obtenu ${r.code})`);
  ligne(r.json?.verdict === 'FAIL', `rouge · verdict FAIL (obtenu ${r.json?.verdict})`);

  const cleRegle = cas.cleRegle || 'regle';
  const findings = cas.findingsDe ? cas.findingsDe(r.json || {}) : (r.json?.findings || []);
  const vues = new Set(findings.map(f => f[cleRegle]));
  const manquantes = cas.regles.filter(x => !vues.has(x));
  ligne(manquantes.length === 0, `rouge · ${cas.regles.length} règles déclenchées${manquantes.length ? ' — manquantes : ' + manquantes.join(', ') : ''}`);

  const contrat = cas.contrat || CONTRAT_MJS;
  const absents = contrat.filter(k => !(k in (r.json || {})));
  ligne(absents.length === 0, `contrat JSON complet${absents.length ? ' — champs absents : ' + absents.join(', ') : ''}`);
  ligne(Array.isArray(r.json?.non_juge) && r.json.non_juge.length > 0, 'non_juge déclaré et non vide');
}

// TF-0335 — le générateur de DESIGN.md n'est pas un oracle (il ne rend pas de verdict), mais
// c'est un exécutable de ce dépôt, et le seul qui n'avait aucun verrou. Sa régression ne se
// serait vue qu'en AVAL, chez forge-development, sur un produit réel. Il est donc joué ici :
// un contrôle que rien ne lance n'est pas un garde-fou.
{
  console.log(String.fromCharCode(10) + 'skills/systeme-de-marque/scripts/generer-design-md.mjs');
  const r = spawnSync(process.execPath,
    [path.join(ici, '..', 'skills', 'systeme-de-marque', 'scripts', 'self-test.mjs')],
    { encoding: 'utf8' });
  const derniere = ((r.stdout || '').trim().split(String.fromCharCode(10)).pop() || '').trim();
  ligne(r.status === 0, `self-test du générateur · exit 0 (obtenu ${r.status}) — ${derniere}`);
}

const joues = CAS.filter(c => !(c.python && !PYTHON) && !(c.rendu && !OUTILLAGE_RENDU.ok));
console.log(echecs === 0
  ? `\nTout vert — ${joues.length} oracles, ${joues.reduce((n, c) => n + c.regles.length, 0)} règles verrouillées.`
    + (sautes.length ? ` ${sautes.length} saut(s) motivé(s) : ${sautes.join(', ')}.` : '')
  : `\n${echecs} vérification(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
