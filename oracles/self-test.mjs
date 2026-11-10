#!/usr/bin/env node
// self-test — verrou de non-régression des oracles de la forge design.
// Chaque oracle est rejoué sur sa fixture verte (doit PASS, exit 0) et sa
// fixture rouge (doit FAIL, exit 1, et déclencher TOUTES ses règles).
// À rejouer après toute modification d'un oracle ou de lib/.
//
// Usage : node self-test.mjs   ·   exit 0 = tout vert, 1 = régression.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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
    // TF-1940 (21/10/2026) — LA PROMESSE CITE LA DEMANDE, ET UN MODELE DESIGNE SE JOUE. Demande, mot
    // pour mot : « Un selecteur de calendrier, comme pour la reservation, regle par defaut sur les 3
    // prochaines semaines, qui peut etre modifie pour selectionner une semaine en particulier ». La
    // reservation choisit une arrivee puis un depart ; la refonte a selectionne la semaine entiere du
    // jour clique. La promesse resumait (« semaine au choix ») et l'a jugee tenue. La rouge est ce cas
    // reel : une ligne resumee sans citation (D4) et une ligne citee dont le « comme pour la
    // reservation » ne nomme aucun critere de comparaison (D5). La verte joue le remede que les
    // messages prescrivent (citation + critere comparant le meme geste sur le modele et le livrable)
    // et declare un AJOUT, que D4 n'exige pas de citer.
    oracle: 'oracle-liste-demande.mjs',
    regles: ['D4', 'D5'],
    verte: [fx('liste-demande-modele-verte.md')],
    rouge: [fx('liste-demande-modele-rouge.md')],
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
    // TF-1123 (mesuré le 14/09/2026 sur Produit-62, RD-18) — T1 cherchait des couleurs
    // littérales dans la valeur ENTIÈRE d'une déclaration sans écarter l'intérieur d'un
    // var() : le REPLI d'un var(--jeton, <repli>) comptait comme une couleur en dur, alors
    // qu'il n'est jamais la couleur appliquée. Un bloquant tombait sur la forme même que la
    // règle réclame (« passer par var(--token) ») ; le seul geste qui l'éteignait était de
    // SUPPRIMER le repli. Les deux fixtures ne diffèrent QUE par la présence du var()
    // autour des mêmes couleurs : la verte passe, la rouge (couleurs nues, hors var()) reste
    // bloquante — la règle n'est pas désarmée.
    oracle: 'oracle-tokens.mjs',
    regles: ['T1'],
    verte: [fx('tokens-t1-repli-verte.html')],
    rouge: [fx('tokens-t1-repli-rouge.html')],
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
    // TF-1057 (mesuré le 11/09 sur Produit-62, RD-16) : un bloc @media print redéclarant
    // `:root, :root[data-theme="dark"] { --bg:#FFFFFF; }` était lu comme le fond du thème
    // SOMBRE (le sélecteur porte « dark »), et confrontait l'encre sombre réelle à ce blanc
    // d'impression — 1.39:1 et 1.22:1 mesurés, faux positifs sur toute page correctement
    // contrastée. Les deux fixtures portent le MÊME bloc print ; seule la rouge porte, en
    // plus, un vrai défaut de thème sombre (--c-blue-fg à 2.17:1), pour prouver que le bloc
    // print n'est pas un prétexte pour taire un défaut réel.
    oracle: 'oracle-tokens.mjs',
    regles: ['T5'],
    verte: [fx('tokens-print-verte.html')],
    rouge: [fx('tokens-print-rouge.html')],
  },
  {
    // TF-1058 (mesuré le 11/09 sur Produit-62, RD-17) : EST_SURFACE confond toute surface
    // nommée -bg avec une surface SUSCEPTIBLE DE PORTER UN FOCUS, remplissage de badge de
    // statut compris (20px de haut, jamais focusable) — un simple RENOMMAGE du jeton faisait
    // disparaître les 12 constats sans qu'une couleur change. Les deux fixtures ne diffèrent
    // QUE par la présence de --surfaces-hors-focus : la rouge ne la déclare pas et reste jugée
    // PAR DÉFAUT (1.45:1 mesuré) ; la verte la déclare et PASSE — l'exemption est la
    // déclaration, jamais le nom du jeton.
    oracle: 'oracle-tokens.mjs',
    regles: ['T8'],
    verte: [fx('tokens-t8-badge-verte.html')],
    rouge: [fx('tokens-t8-badge-rouge.html')],
  },
  {
    // TF-1662 (retour du 13/10/2026) — T8 confrontait l'anneau à des surfaces qu'aucun élément
    // focalisable ne peut occuper : celles d'une infobulle en pointer-events: none. Aucune couleur
    // ne tenait 3:1 sur ces fonds sombres ET sur les fonds pastel, la règle était irréparable sans
    // changer la charte. Les deux fixtures ne diffèrent QUE par « pointer-events: none » : la verte
    // écarte --tt-bg et --tt-code-bg par la structure du CSS, la rouge, surface interactive, les juge.
    oracle: 'oracle-tokens.mjs',
    regles: ['T8'],
    verte: [fx('tokens-t8-infobulle-verte.html')],
    rouge: [fx('tokens-t8-infobulle-rouge.html')],
  },
  {
    // TF-1662, seconde moitié — T5 présumait un texte hérité sur le fond d'un ::before à content
    // vide : une pastille, aucune lettre rendue. Les deux fixtures ne diffèrent QUE par la valeur
    // de content : vide (verte, PASS), un mot (rouge, T5 majeur — le texte y est bien rendu).
    oracle: 'oracle-tokens.mjs',
    regles: ['T5'],
    verte: [fx('tokens-t5-pseudo-verte.html')],
    rouge: [fx('tokens-t5-pseudo-rouge.html')],
  },
  {
    // TF-2380 (retour du 16/09/2026, RV-200) — LA CASCADE DU THÈME SOMBRE. « .passer » pose --solid-ink sur
    // --blue, puis « :root[data-theme="dark"] .passer » REMPLACE cette pose en sombre. T5 jugeait quand même la
    // paire de base contre les jetons sombres (2.54:1, majeur) alors que render_page.py rendait PASS sur la même
    // page. Les deux fixtures portent la même page ; elles ne diffèrent que par la paire redéfinie en sombre :
    // lisible (verte, PASS) ou illisible (rouge, FAIL : la cascade n'aveugle pas T5, elle déplace sa cible).
    oracle: 'oracle-tokens.mjs',
    regles: ['T5'],
    verte: [fx('tokens-t5-sombre-cascade-verte.html')],
    rouge: [fx('tokens-t5-sombre-cascade-rouge.html')],
  },
  {
    // TF-2381 (retour du 24/09/2026, RV-201) — LA DÉCLARATION LÈVE LA PRÉSOMPTION. Le message d'une paire
    // PRÉSUMÉE prescrit « déclarer la paire réelle par --paires-contraste » ; la déclaration jugeait la paire
    // réelle mais laissait les paires présumées du même texte (4 avertissements avant et après, page de garde du
    // livret du 24/09). La verte est le remède joué : texte clair déclaré sur --bande, plus aucun avertissement.
    // La rouge borne la porte : la paire déclarée reste jugée (majeur) et un texte NON déclaré garde sa présomption.
    oracle: 'oracle-tokens.mjs',
    regles: ['T5'],
    verte: [fx('tokens-t5-declaree-verte.html')],
    rouge: [fx('tokens-t5-declaree-rouge.html')],
  },
  {
    // TF-1106 (14/09/2026) — oracle-tokens ne résolvait pas les alias var() avant de parser
    // une couleur : --focus-anneau: var(--blue), la forme que le contrat de tokens.css de
    // cette forge prescrit et que scripts/generer-tokens-css.mjs émet, publiait « semi-
    // transparent ou illisible » au lieu d'être mesuré (même classe que TF-1035, résolue par
    // la MÊME fonction partagée, lib/color.mjs::resoudreVar). La verte reprend tokens-t8-verte
    // avec --focus-anneau en alias de --blue (mêmes ratios, mêmes seuils tenus) ; la rouge
    // porte un vrai défaut mesuré à travers le même alias (1.70:1, 1.50:1 < 3:1 en clair).
    oracle: 'oracle-tokens.mjs',
    regles: ['T8'],
    verte: [fx('tokens-t8-alias-verte.html')],
    rouge: [fx('tokens-t8-alias-rouge.html')],
  },
  {
    // TF-1108 (14/09/2026) — le boilerplate du socle prescrit --focus-anneau au format
    // RACCOURCI complet (« 2px solid var(--blue) »), pas seulement la couleur. Après
    // TF-1106 (résolution des alias), la valeur restait illisible : rien n'extrayait la
    // composante couleur d'un raccourci border/outline avant de la passer à resoudreVar.
    // La verte couvre les deux formes (couleur = alias en clair, couleur = littéral et
    // style différent en sombre) ; la rouge porte le même raccourci avec un vrai défaut
    // de contraste (1.70:1, 1.50:1 en clair).
    oracle: 'oracle-tokens.mjs',
    regles: ['T8'],
    verte: [fx('tokens-t8-shorthand-verte.html')],
    rouge: [fx('tokens-t8-shorthand-rouge.html')],
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
    // TF-0875 (lot Produit-61, 06/09) : M7 ajoutée. Le panier d'un produit rendu se vidait
    // après « Aide » puis « La carte » — 2 → 0 au navigateur sur qualif — alors que C13 était
    // 3/3 sur la maquette mono-fichier, où la navigation ne recharge JAMAIS le document. Les
    // deux fixtures portent la même saisie et la même barre basse qui navigue vers d'autres
    // documents ; elles ne diffèrent que par le support de survie — la verte confie la
    // quantité à sessionStorage, la rouge s'en remet à un <form action> qui ne prouve rien.
    // TF-0846 (lot Produit-61, 05/09) : M8 ajoutée. DIX-HUIT pages réelles en FAIL V4 à quatre
    // largeurs pour un seul motif — la barre basse hors flux recouvrait le bas du contenu —
    // quand la maquette mono-fichier passait V4 par le vide que sa mise en page laissait par
    // hasard. La verte pose la coquille défilante (écran borné, contenu à overflow-y: auto) ;
    // la rouge garde la même barre fixe sans coquille ni réserve de place.
    oracle: 'oracle-mobile.mjs',
    regles: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'],
    verte: [fx('mobile-verte.html')],
    rouge: [fx('mobile-rouge.html')],
  },
  {
    // TF-1355 — M9 ajoutée. Un bandeau sticky mesuré sur un livrable réel : 717px de hauteur
    // sur 844px disponibles à 390px de large (85 % de l'écran) — WCAG 2.2 2.4.11 (AA) en jeu,
    // M1-M8 rendaient PASS. Les deux fixtures portent le MÊME bandeau collé en haut (sticky,
    // top:0) ; elles ne diffèrent que par le nombre d'onglets qu'il porte — 14, qui se replient
    // sur plusieurs rangs à largeur de téléphone (390/360/414px) et dépassent le seuil de 25 %
    // de la hauteur de viewport, contre 3, qui tiennent sur une seule rangée.
    oracle: 'oracle-mobile.mjs',
    regles: ['M9'],
    verte: [fx('mobile-m9-verte.html')],
    rouge: [fx('mobile-m9-rouge.html')],
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
    // TF-1074 (16/09) — L'INVERSE DE LA PARITE. oracle-parite-assets (TF-0784) garde
    // qu'une COPIE declaree reste identique a sa source ; personne ne gardait l'invariant
    // inverse. Le 25/08, `logo-white.svg` a recu le contenu de `logo.svg` : logo bleu
    // fonce sur bandeau fonce, vu en production par l'exploitant (lot Produit-02
    // 20260825b RT-28, defaut E-06 du banc des defauts echappes).
    // La rouge porte les DEUX sens : la paire octet pour octet, et — c'est la le
    // sujet — la paire dont les EMPREINTES DIFFERENT et dont l'encre est la meme.
    // Un controle d'empreinte seule declarerait la seconde conforme.
    oracle: 'oracle-images.mjs',
    regles: ['I7'],
    verte: [fx('images-variantes-verte.html')],
    rouge: [fx('images-variantes-rouge.html')],
  },
  {
    // TF-2382 (retours des 25 et 28/09/2026, RV-202) — UNE RÉPÉTITION N'EST PAS UNE PAIRE DE VARIANTES. Un logo
    // posé en tête de chaque feuille donnait autant d'occurrences d'un même actif, appariées entre elles par la
    // convention de nommage : 2 bloquants « l'une des deux variantes n'a jamais été produite » sur tout document
    // à plusieurs feuilles. La verte répète trois variantes distinctes sur trois feuilles (PASS) ; la rouge répète
    // le même en-tête mais « logo-white » est la copie de « logo » : le défaut réel survit à la répétition.
    oracle: 'oracle-images.mjs',
    regles: ['I7'],
    verte: [fx('images-repetition-verte.html')],
    rouge: [fx('images-repetition-rouge.html')],
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
    // TF-1035 (constat en passant, lot marque Digit-AI, 11/09/2026) — D3 compare le dérivé à
    // l'octet près, EN-TÊTE COMPRIS : dtcg-verte.tokens.json ne vit pas au chemin par défaut
    // historique (« corpus/tokens-digit-ai.tokens.json »), donc cette fixture retombe en FAIL si
    // l'en-tête du CSS dérivé redevient un chemin figé au lieu de la source réellement lue.
    oracle: 'oracle-dtcg.mjs',
    regles: ['D1', 'D2', 'D3'],
    verte: [fx('dtcg-verte.tokens.json'), fx('dtcg-verte.css')],
    rouge: [fx('dtcg-rouge.tokens.json'), fx('dtcg-rouge.css')],
  },
  {
    // TF-1034 (constat en passant, lot marque Digit-AI, 11/09/2026) — D4 : une source qui
    // DÉCLARE $fraicheur (empreinte datée d'un bloc externe qu'elle reprend telle quelle,
    // ex. un socle de rendu) est mise en échec si ce bloc a changé depuis. Les deux fixtures
    // ne diffèrent QUE par l'empreinte enregistrée : la verte est à jour, la rouge est
    // volontairement périmée face au même bouchon de socle (dtcg-fraicheur-socle.html).
    oracle: 'oracle-dtcg.mjs',
    regles: ['D4'],
    verte: [fx('dtcg-fraicheur-verte.tokens.json'), fx('dtcg-fraicheur-verte.css')],
    rouge: [fx('dtcg-fraicheur-rouge.tokens.json'), fx('dtcg-fraicheur-rouge.css')],
  },
  {
    // TF-0863 (lot L6, 07/09/2026) — un rapport Power BI « personnalisé » livré au thème par
    // défaut est un défaut de loi n° 6. La verte est la régénération exacte du corpus de tokens
    // (scripts/generer-theme-powerbi.mjs) ; la rouge est le thème par défaut du produit : palette
    // d'usine (TP3) et, forcément, désynchronisée de toute source DTCG (TP2).
    oracle: 'oracle-theme-powerbi.mjs',
    regles: ['TP2', 'TP3'],
    verte: [path.join(ici, '..', 'corpus', 'tokens-digit-ai.tokens.json'), fx('theme-powerbi-verte.json')],
    rouge: [path.join(ici, '..', 'corpus', 'tokens-digit-ai.tokens.json'), fx('theme-powerbi-rouge.json')],
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
    // TF-0800 (lot pilot du 05/09) : LE MOTIF DÉLÉGUÉ, dans les deux sens. B-T2 et B-T3 ne
    // voyaient que le câblage écrit à un seul endroit — écouteur attaché après sélection du
    // bouton, clé localStorage en littéral. Un produit dont la bascule fonctionnait depuis sa
    // v0.1.0, câblée par délégation (closest) avec sa clé en constante, a été jugé « bascule
    // morte » ; la session du 01/09 a réécrit son app.js pour obtenir le PASS. Les deux
    // fixtures ne diffèrent QUE par le sélecteur du closest() : la verte vise le bouton de
    // bascule, la rouge vise un autre déclencheur, et aucun clic n'atteint jamais le
    // gestionnaire. Reconnaître la délégation n'est pas faire confiance à toute délégation.
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T2'],
    verte: [fx('bascule-deleguee-verte.html')],
    rouge: [fx('bascule-deleguee-morte-rouge.html')],
  },
  {
    // TF-1906 (retour Produit-79 du 18/10/2026) : CHAQUE DÉCLARATEUR D'UN VAR MULTIPLE. Le cas
    // réel — `var racine = document.documentElement, bouton = document.getElementById('theme')`
    // puis `bouton.addEventListener('click', …)` — rendait B-T2 bloquant alors que la bascule
    // marchait (Chromium 13/13) : seul le premier déclarateur d'une déclaration était lu. La verte
    // est ce cas (alias du bouton en 2e position, clé de thème en 2e position d'une autre
    // déclaration) ; la rouge ne diffère que par l'alias câblé, qui vise un autre élément.
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T2'],
    verte: [fx('bascule-declaration-multiple-verte.html')],
    rouge: [fx('bascule-declaration-multiple-rouge.html')],
  },
  {
    // TF-2383 (retour du 24/09/2026, RV-203) — LA FORME LITTÉRALE DU RETOUR. « var racine =
    // document.documentElement, bouton = document.querySelector('.bascule'); » puis
    // bouton.addEventListener('click', …) : B-T2 déclarait « bascule morte » parce que l'alias n'était reconnu
    // qu'immédiatement après var/let/const. Le défaut est corrigé depuis le 21/10 (TF-1906, ed747c1) : le retour
    // lui est antérieur, et la fixture de TF-1906 ne jouait que le sélecteur par identifiant. Celle-ci joue la
    // forme du retour — sélecteur de CLASSE, second déclarateur, const multi-lignes ; la rouge ne diffère que
    // par l'alias câblé, qui vise un autre élément.
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T2'],
    verte: [fx('bascule-declaration-groupee-classe-verte.html')],
    rouge: [fx('bascule-declaration-groupee-classe-rouge.html')],
  },
  {
    // TF-1661 (retour du 13/10/2026) : LE RENDU FIGÉ. Une page claire seule, sans bouton ni
    // palette sombre ni script de thème, sortait B-T1, B-T3 et B-T4 en bloquant alors que
    // oracle-tokens T4 la déclare conforme et que check_html.py G1 n'en fait qu'un avertissement.
    // Les deux fixtures ne diffèrent QUE par le bloc :root[data-theme="dark"] : la verte, figée,
    // passe avec B-T1 en avertissement (vérifié à part en fin de recette) ; la rouge déclare une
    // palette sombre que le lecteur ne peut ni choisir ni retrouver — B-T1 et B-T3 restent durs.
    oracle: 'oracle-bascule.mjs',
    regles: ['B-T1', 'B-T3'],
    verte: [fx('bascule-figee-verte.html')],
    rouge: [fx('bascule-figee-rouge.html')],
  },
  {
    // TF-1980 (29/10/2026) — deux `content` CSS d'une page livrée portaient 0x15 et 0x00 (« \25F7 » lu
    // en octal par un script Python), et les contrôles de livraison rendaient PASS. La rouge porte ces
    // deux octets dans la feuille de style locale liée ; la verte, la même feuille avec l'échappement
    // CSS intact.
    // Œil critique du pilot, 29/10/2026 : la même feuille liée par un href racine (« /…css ») doit être
    // jugée ; un href au « % » mal formé ne doit pas faire planter l'oracle.
    oracle: 'oracle-caracteres-controle.mjs',
    regles: ['CC-P1'],
    verte: [fx('caracteres-controle-verte.html'), fx('caracteres-controle-href-malforme-verte.html')],
    rouge: [fx('caracteres-controle-rouge.html'), fx('caracteres-controle-racine-rouge.html')],
  },
  {
    // TF-2043 (02/11/2026) — un produit affichait « v1.06 » sous l'étiquette « v1.8.0 » : aucun oracle ne
    // comparait une valeur affichée à sa source, tous jugent la page isolément. Le produit déclare ses
    // valeurs dérivées (version, environnement, date) et la commande qui donne chacune ; l'oracle relit la
    // page et rejoue la commande. La verte déclare 3 valeurs (sélecteur à 2 occurrences, motif sur le texte,
    // comparaison « contient » avec une commande en tableau) qui égalent leur source. La rouge réunit les 4
    // refus : une occurrence « v1.06 » face à 1.8.0 (VA1), un motif sans correspondance (VA2), une commande
    // qui échoue (VA3), une entrée sans commande (VA4). Le SKIP sans déclaration est joué dans le bloc
    // dédié en fin de recette.
    oracle: 'oracle-valeur-affichee.mjs',
    regles: ['VA1', 'VA2', 'VA3', 'VA4'],
    verte: [fx('valeur-affichee/verte.html'), '--declaration', fx('valeur-affichee/verte.json')],
    rouge: [fx('valeur-affichee/rouge.html'), '--declaration', fx('valeur-affichee/rouge.json')],
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
    // TF-1343, mesuré le 23/09/2026 sur un champ « Suffixe du coffre » : le motif
    // [A-Za-z0-9]+(\-[A-Za-z0-9]+)* échappe un tiret HORS d'une classe de caractères — refusé
    // par new RegExp(p, 'v') (SyntaxError). Rejoué dans Chromium 148 : « --!!-- » et « a b »
    // rendent validity.valid vrai et patternMismatch faux ; oracle-saisie rendait PASS avant
    // SA7 — la contrainte déclarée n'existait pas pour aucun référentiel. Les deux fixtures ne
    // diffèrent QUE par le tiret : échappé (rouge, ne compile pas) ou nu (verte, compile).
    oracle: 'oracle-saisie.mjs',
    regles: ['SA7'],
    verte: [fx('saisie-sa7-verte.html')],
    rouge: [fx('saisie-sa7-rouge.html')],
  },
  {
    // RT-123 (Produit-02, D-55 (a) du 03/10) : faux positif SA1 sur un champ de recherche plein
    // texte (type=search, name=q-t-resa) dont le placeholder « ex. mobile, réservation » cite
    // l'appareil des visiteurs. Le placeholder n'est qu'un exemple de contenu : il ne suffit
    // plus seul à inférer un format (indices forts : name, id, libellé, autocomplete). La rouge
    // garde le vrai positif : name="telephone" rendu en type=text.
    oracle: 'oracle-saisie.mjs',
    regles: ['SA1'],
    verte: [fx('saisie-placeholder-verte.html')],
    rouge: [fx('saisie-placeholder-rouge.html')],
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
    // TF-0925 (08/09) : le TROISIÈME motif de création. Le pan interface de forge-tests admet
    // depuis le 08/09 la PAGE DÉDIÉE — la page EST le formulaire, rien à replier, rien à
    // adresser. Tant que cet oracle-ci n'admettait que deux motifs, un produit à page dédiée
    // était refusé par l'une ou par l'autre des deux forges quoi qu'il fasse, et l'action
    // restait insoldable chez le développeur : l'impasse se refermait de l'autre côté.
    // La verte EST une page dédiée : l'affordance qui annonce la création (« Creer mon
    // compte ») soumet le formulaire de la page. La rouge est le piège exact qui empêche la
    // règle d'être vide — une page de LISTE qui porte bien un <form>, mais c'est la barre de
    // recherche, et le « Nouveau lot » est DEHORS : il n'envoie rien, l'écran n'a donc aucun
    // des trois motifs. Sans ce sens rouge, admettre la page dédiée reviendrait à admettre
    // tout écran de liste portant un formulaire quelconque.
    oracle: 'oracle-panneau-tache.mjs',
    regles: ['PA7'],
    verte: [fx('panneau-tache-page-dediee-verte.html')],
    rouge: [fx('panneau-tache-page-dediee-rouge.html')],
  },
  {
    // TF-0797 (lot pilot du 05/09, faits des 31/08 et 01/09) : le point d'entrée UNIQUE d'une
    // fenêtre d'arborescence était un bouton fantôme, lu comme un lien ou comme du texte.
    // Premier retour : « je ne vois pas de changement » — la fonctionnalité était pourtant
    // livrée. Second, le lendemain : « mets-le sous forme de bouton, pas de lien — le lien a
    // une signification particulière, tout comme le bouton a la sienne ». Deux tours de retour
    // pour un bouton. Les deux fixtures sont la même page, avant et après : la rouge porte une
    // action sur un lien (DE1), une navigation sur un bouton (DE2) et deux fonctionnalités dont
    // l'unique accès n'a pas la forme de ce qu'il fait (DE3) — dont une produite par un gabarit
    // JS. La verte garde le bouton fantôme, mais en SECOND accès : la règle ne condamne pas le
    // fantôme, elle refuse qu'il soit seul.
    oracle: 'oracle-declencheurs.mjs',
    regles: ['DE1', 'DE2', 'DE3'],
    verte: [fx('declencheurs-verte.html')],
    rouge: [fx('declencheurs-rouge.html')],
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
    // TF-1219 — loi n°1 du pilot (« toute affordance est câblée ou n'existe pas ») sans aucun
    // contrôle de PERCEPTIBILITÉ : un bouton « Panier » câblé (une ancre fonctionnelle), sans
    // contraste ni taille ni position suffisants, a été déclaré « inactif » par un humain. Les
    // deux fixtures portent la MÊME action nommée par une exigence (data-exigence="EX-PANIER-42"
    // — convention posée par ce chantier faute d'existant côté EXIGENCES.json/fiche de cadrage) ;
    // la rouge la pose hors-flux (position absolute, -9999px), à 2x2px, sans contraste ni retour
    // visuel ; la verte la pose en flux normal, à 180x44px, contraste blanc sur bleu nuit, et un
    // double retour visuel (anneau de focus clavier + mutation de classe câblée au clic).
    oracle: 'oracle-perceptibilite.mjs',
    regles: ['PC1', 'PC2', 'PC3', 'PC4'],
    verte: [fx('perceptibilite-verte.html')],
    rouge: [fx('perceptibilite-rouge.html')],
  },
  {
    // TF-0830 (lot Produit-12, 06/09) : TROIS pages neuves et conformes — check_html PASS sur
    // 36 règles, render_page PASS aux quatre largeurs — sortaient de l'agrégateur en FAIL avec
    // 19 à 20 écarts durs CHACUNE. Les vingt étaient portés par le seul `table-filters.css` du
    // socle, embarqué scellé dans la page et NON MODIFIABLE localement (parité d'asset) : le
    // juge refusait ce que l'auteur n'avait pas le droit de changer. Les deux fixtures sont la
    // même page et le même bloc du socle ; elles ne diffèrent QUE par un caractère du sceau.
    // La verte, sceau juste, sort à PASS avec ses 20 constats rendus dans `socle_exempte` ;
    // la rouge, sceau faux, les reprend tous à son compte — deux commentaires n'exemptent rien.
    // RECTIFICATION du 22/09/2026 (TF-1241) : depuis le 15/09 (51a783f), la verte embarque le
    // composant NETTOYÉ du socle réel — elle passe avec ZÉRO constat au compte du socle et ne
    // différencie plus rien ; la rouge garde l'ancien composant. Ce cas prouve donc encore qu'un
    // sceau faux n'exempte de rien, mais PLUS que la passe exempte un sceau juste : c'est le bloc
    // « socle d'essai » en fin de recette qui le prouve désormais, sur un composant sale scellé juste.
    socle: 'digit-ai-page-html/assets/table-filters.css',
    oracle: 'run-oracles-design.mjs',
    regles: ['T1', 'T3', 'T8', 'S4'],
    contrat: CONTRAT_AGREGATEUR,
    findingsDe: j => (j.oracles || []).flatMap(o => o.findings || []),
    verte: [fx('socle-embarque-verte.html')],
    rouge: [fx('socle-embarque-rouge.html')],
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
    // TF-0857 (constat du 04/09, arbitré le 08/09) : S3 bannissait « DM Sans » que la charte du
    // socle digit-ai EXIGE en police de corps et que le propre contrôle du socle vérifie. Un
    // oracle qui refuse ce que le socle qu'il juge prescrit rend « Refondre » par construction :
    // le verdict cesse d'être un défaut du produit pour devenir un désaccord entre juges, et il
    // n'est corrigible par personne. L'exemption se MÉRITE à une déclaration de la page (les deux
    // jetons --head → Roboto et --sans → DM Sans), et la rouge prouve qu'elle n'est pas une porte
    // de sortie : la MÊME déclaration, mais « Inter » en plus, et l'écart tombe.
    oracle: 'oracle-slop.mjs',
    regles: ['S3'],
    verte: [fx('socle-charte-verte.html')],
    rouge: [fx('socle-charte-rouge.html')],
  },
  {
    // TF-0857, seconde moitié : M4 lisait « colonnes masquées » sur le thead masqué par le REPLI
    // EN CARTES prescrit par le socle (composants.md §6) — alors que rien n'est amputé, l'en-tête
    // change de place (td::before { content: attr(data-label) }). Règle AMENDÉE, pas exemptée :
    // ce qui rend le repli légitime est la RESTITUTION des étiquettes, pas la provenance du
    // gabarit. La rouge porte le repli ET une vraie amputation (une colonne entière masquée sans
    // restitution) : l'amendement ne se laisse pas acheter par la seule présence du repli.
    oracle: 'oracle-mobile.mjs',
    regles: ['M4'],
    verte: [fx('socle-charte-verte.html')],
    rouge: [fx('socle-charte-rouge.html')],
  },
  {
    // TF-1129 (mesuré le 13/09/2026 sur Produit-64) — M4 cherchait un reflow sous un
    // max-width ≤ 768, alors que le sens correct est ≥ 768 : un `@media (max-width: Npx)`
    // couvre la largeur 768 dès que N ≥ 768, jamais le contraire. Le seuil réel du
    // boilerplate du socle (900px, TF-0900) échouait le test, ET un seuil manifestement
    // insuffisant (600px, mobile-rouge.html) l'aurait satisfait. La verte porte le seuil du
    // socle tel quel (900px) — plus de bloquant, et le même message « info » de restitution
    // que l'oracle rendait déjà dans la même exécution (la contradiction avec le bloquant a
    // disparu). La rouge (mobile-rouge.html, 600px, table sans repli à 768px) reste un vrai
    // défaut mobile, confirmé par ailleurs par render_page.py (débordement V1) — elle n'est
    // pas dupliquée ici.
    oracle: 'oracle-mobile.mjs',
    regles: ['M4'],
    verte: [fx('mobile-repli-socle-verte.html')],
    rouge: [fx('mobile-rouge.html')],
  },
  {
    // TF-1064 (lot pilot du 12/09/2026) — LE TEXTE QUE LE PLUS DE MONDE LIT N'AVAIT PAS DE JUGE.
    // Le plancher d'écriture du pilot (references\ECRITURE.md) porte en E-12 la règle des textes
    // d'application (type T4) : « un libellé nomme ce que la personne contrôle ; une erreur dit ce
    // qui s'est passé puis comment réparer ; un état vide invite à agir ». L'oracle d'écriture du
    // pilot juge le Markdown et déclare T4 en non_juge — les chaînes d'application vivent dans des
    // fichiers de ressources qu'il ne lit pas. Aucun oracle du parc ne voyait donc « Une erreur est
    // survenue » ni « Aucune donnée ». Les deux fixtures sont le MÊME écran de ressources, avant et
    // après le passage au plancher. La rouge porte les quatre règles ; la verte garde volontairement
    // une erreur qui dit sa cause ET sa réparation, pour prouver que le vert n'est pas un silence
    // de l'oracle mais un texte qui tient. Rule ids en T4-* (et non TA-*) : TA1–TA4 sont déjà pris
    // par oracle-taste dans cette forge, et deux sens pour un identifiant est un défaut.
    oracle: 'oracle-textes-application.mjs',
    regles: ['T4-1', 'T4-2', 'T4-3', 'T4-4'],
    verte: [fx('textes-application-verte.json')],
    rouge: [fx('textes-application-rouge.json')],
  },
  {
    // TF-1910 (retour Produit-79 du 18/10/2026, récidive de TF-1773) : L'INFOBULLE DE DÉFINITION D'UN
    // EN-TÊTE. Les <th> « Code » et « Résultat » d'un tableau portaient leur définition en `title`
    // (convention du socle : dictionnaire de colonnes, G9) ; elle disait « refus » parce que les
    // décisions peuvent en être, et T4-1 la prenait pour un message d'erreur — 11 constats durs sur
    // une page sans une erreur. La verte est ce tableau (th à data-definition + title, th à title
    // seul, span à data-definition) ; la rouge garde le même texte en title d'une cellule de donnée
    // et d'un bouton : là, le mot d'erreur annonce bien un incident, T4-1 reste bloquant.
    oracle: 'oracle-textes-application.mjs',
    regles: ['T4-1'],
    verte: [fx('textes-application-definition-verte.html')],
    rouge: [fx('textes-application-definition-rouge.html')],
  },
  {
    // TF-2102 (retour Produit-86 du 03/11/2026) : UN LEXIQUE FERMÉ NE FAIT PAS AUTORITÉ SUR LA LANGUE. Sur un
    // portail francophone, « périmé », « absente », « Rechargez », « Ouvrez », « Revenez » manquaient aux listes
    // de l'oracle : 3 bloquants faux sur 4. La verte est ce portail, textes corrects ; la rouge garde les vrais
    // défauts qu'une règle trop large (tout mot en « -ez » vaudrait réparation) ferait passer — « chez » et
    // « avez » ne sont pas des impératifs, un constat nu reste un constat nu.
    oracle: 'oracle-textes-application.mjs',
    regles: ['T4-1', 'T4-2'],
    verte: [fx('textes-application-lexique-verte.json')],
    rouge: [fx('textes-application-lexique-rouge.json')],
  },
  {
    // TF-2102 : un libellé <option> est un CHOIX, pas un état vide. « Aucun » et « Aucune sélection » y sont des
    // valeurs à choisir. La rouge garde, dans la même page, un vrai état vide (div.empty) : il reste refusé.
    oracle: 'oracle-textes-application.mjs',
    regles: ['T4-2'],
    verte: [fx('textes-application-option-verte.html')],
    rouge: [fx('textes-application-option-rouge.html')],
  },
  {
    // TF-2162 (retour Produit-86 du 04/11/2026, rattaché à TF-1762) : une CARTE DE CHOIX n'est pas un état vide.
    // « Aucun système réel n'est touché », description d'une carte « Simulation », se lisait comme un état vide
    // sans invitation (2 constats bloquants). La verte porte trois cartes en négation (label, bouton, rôle radio)
    // et un état vide qui invite à agir ; la rouge garde les mêmes cartes et un vrai état vide « Aucune donnée » :
    // l'exemption ne désarme pas la règle.
    oracle: 'oracle-textes-application.mjs',
    regles: ['T4-2'],
    verte: [fx('textes-application-carte-choix-verte.html')],
    rouge: [fx('textes-application-carte-choix-rouge.html')],
  },
  {
    // TF-2276 (retour Produit-86 du 06/11/2026, RP-49, rattaché à TF-1910) : le GLOSSAIRE EN INFOBULLE n'est pas un
    // message d'erreur. La fiche de mission servie déclarait son lexique (X9 d'oracle-exploitabilite) et posait la
    // définition de chaque terme en title, avec une aide en role="tooltip" : ces définitions disent « refus », « échec »,
    // « invalide », et T4-1 en rendait 12 constats (1 bloquant) sur une page sans erreur. La verte est ce glossaire dans
    // la forme que la forge recommande ; la rouge garde le même glossaire et y ajoute les vrais messages (alerte, .error,
    // title d'une cellule de donnée et d'un bouton qui ne sont pas des termes) : l'exemption ne désarme pas T4-1.
    oracle: 'oracle-textes-application.mjs',
    regles: ['T4-1'],
    verte: [fx('textes-application-glossaire-verte.html')],
    rouge: [fx('textes-application-glossaire-rouge.html')],
  },
  {
    rendu: true,
    oracle: 'rendu-comparatif.mjs',
    regles: ['RC-1'],
    contrat: ['outil', 'avant', 'apres', 'zone', 'verdict', 'findings', 'non_juge'],
    verte: ['--avant', fx('comparatif-apres.html'), '--apres', fx('comparatif-avant.html')],
    rouge: ['--avant', fx('comparatif-avant.html'), '--apres', fx('comparatif-apres.html')],
  },
  {
    // TF-1654 (retour du 12/10/2026) — les écrans d'une application avaient passé critique,
    // render_page et 3 000 tests sur le jeu de démonstration ; alimentés, la fiche mesurait 5 220 px
    // en colonnes déséquilibrées et des énumérations s'affichaient brutes. Les deux fixtures sont le
    // MÊME écran : la verte à faible volume et aux libellés traduits, la rouge au volume réel, qui
    // porte les cinq défauts mesurés. Dépend de l'outillage de rendu — saut motivé s'il manque.
    rendu: true,
    oracle: 'oracle-exploitabilite.mjs',
    regles: ['X1', 'X2', 'X3', 'X4', 'X5'],
    verte: [fx('exploitabilite-verte.html')],
    rouge: [fx('exploitabilite-rouge.html')],
  },
  {
    // TF-1916 (retour Produit-02 du 18/10/2026) — cinq onglets de gîte sous le bandeau, au-dessus d'un
    // calendrier, étaient de simples liens vers cinq pages : chaque clic rechargeait et ramenait en haut.
    // Les 13 oracles de la forge et render_page avaient passé, aucun ne cliquait un onglet après avoir
    // défilé. Les deux fixtures sont la MÊME page (bandeau de plus d'un écran, onglets sous lui, calendrier
    // en dessous) : la verte intercepte les liens, échange le contenu sur place et met l'adresse à jour par
    // history.pushState ; la rouge garde de simples liens vers une page sœur. Mesure : défilement avant /
    // après le clic, tolérance 2 px. Dépend de l'outillage de rendu — saut motivé s'il manque.
    rendu: true,
    oracle: 'oracle-exploitabilite.mjs',
    regles: ['X6'],
    verte: [fx('onglets-milieu-verte.html')],
    rouge: [fx('onglets-milieu-rouge.html')],
  },
  {
    // TF-2158 (retour Produit-86 du 04/11/2026) — « ni visite guidée ni infobulle de terme », vus d'emblée par le porteur
    // après une critique PASS et des filtres PASS. X8 : l'application offre une visite guidée CÂBLÉE. La verte est l'écran
    // d'exploitabilité de TF-1654 muni d'un bouton « Visite guidée » qui ouvre une étape ; la rouge est le même écran sans
    // l'entrée, les autres règles restant tenues. Dépend de l'outillage de rendu (un clic est joué).
    rendu: true,
    oracle: 'oracle-exploitabilite.mjs',
    regles: ['X8'],
    verte: [fx('exploitabilite-verte.html')],
    rouge: [fx('exploitabilite-visite-rouge.html')],
  },
  {
    // TF-2158 — X9 : chaque terme du lexique déclaré porte son infobulle là où l'écran l'affiche. La rouge est la verte dont
    // les deux termes (« registre », « lot ») s'affichent sans infobulle ; la visite guidée y reste câblée.
    rendu: true,
    oracle: 'oracle-exploitabilite.mjs',
    regles: ['X9'],
    verte: [fx('exploitabilite-verte.html')],
    rouge: [fx('exploitabilite-lexique-rouge.html')],
  },
  {
    // TF-2172 (demande du porteur, lot Produit-86 du 05/11/2026) — une saisie refusée s'affichait en bandeau en tête de page,
    // loin du formulaire, avec un code technique en titre (« Refusé : CIBLE_INVALIDE »), sans champ désigné, seulement à
    // l'envoi. Aucun des 15 juges de run-oracles-design n'envoie une valeur fausse ni ne regarde où tombe l'erreur. La verte
    // est le formulaire bâti avec le composant corpus/composants/saisie-erreurs.js (erreur sous le champ, aria-invalid,
    // aria-describedby, résumé à liens, envoi retenu) ; la rouge est le défaut du porteur : le bandeau en tête de page.
    // Dépend de l'outillage de rendu (une valeur est saisie, un envoi est tenté).
    rendu: true,
    oracle: 'oracle-erreurs-formulaire.mjs',
    regles: ['EF1'],
    contrat: [...CONTRAT_MJS, 'champs_eprouves', 'mesures'],
    verte: [fx('erreurs-formulaire-verte.html')],
    rouge: [fx('erreurs-formulaire-rouge.html')],
  },
  {
    // TF-2074 (essai logo-design-skill du 03/11/2026) — un audit tiers avait rendu 100/100 à trois SVG qui se
    // réduisaient à des points à 16 px. La rouge est la verte dessinée en FILET de 3 unités sur 256 (0,19 px à 16 px) :
    // aussi propre qu'un SVG peut l'être, invisible dans un onglet. Elle déclenche LP1 (trait plus fin qu'un pixel)
    // et LP4 (rien à 16 px) ; LP2 se déclenche par contrecoup, la topologie disparaissant avec l'encre. La verte est
    // faite de gros traits (48 et 32 unités) et de séparations de 2 px. Dépend de l'outillage de rendu.
    rendu: true,
    oracle: 'oracle-logo-petit.mjs',
    regles: ['LP1', 'LP4'],
    contrat: [...CONTRAT_MJS, 'mesures'],
    verte: [fx('logo-petit-verte.svg')],
    rouge: [fx('logo-petit-rouge-trait-fin.svg')],
  },
  {
    // TF-2074 — des formes épaisses, mais deux barres séparées de 0,25 px et un trou de 0,5 px à 16 px : ils existent
    // à 128 px et fusionnent à 16 px. LP2 seule (LP1 se tait : rien n'est fin), dans un bloc dédié plus bas.
    rendu: true,
    oracle: 'oracle-logo-petit.mjs',
    regles: ['LP2'],
    contrat: [...CONTRAT_MJS, 'mesures'],
    verte: [fx('logo-petit-verte.svg')],
    rouge: [fx('logo-petit-rouge-fusion.svg')],
  },
  {
    // TF-2074 — la même géométrie que la verte, en gris très clair (#E8E8E8) : sur fond blanc, 1,2:1. La verte (#14202B)
    // passe sur le même fond. LP3 ne se joue que sur un fond déclaré (--fond).
    rendu: true,
    oracle: 'oracle-logo-petit.mjs',
    regles: ['LP3'],
    contrat: [...CONTRAT_MJS, 'mesures'],
    verte: [fx('logo-petit-verte.svg'), '--fond', '#FFFFFF'],
    rouge: [fx('logo-petit-rouge-contraste.svg'), '--fond', '#FFFFFF'],
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

  // TF-0830 : le sceau d'un composant embarqué se vérifie CONTRE LA SOURCE du socle. Sans
  // le socle installé, la vérification ne peut pas avoir lieu — et un poste qui ne peut pas
  // la faire ne doit pas non plus faire échouer une garantie que rien de son ressort n'a
  // cassé. Le saut se dit, comme pour l'outillage de rendu et pour Python.
  if (cas.socle && !fs.existsSync(path.join(os.homedir(), '.claude', 'skills', ...cas.socle.split('/')))) {
    console.log(`  SKIP  source du socle absente : ~/.claude/skills/${cas.socle}`);
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

// TF-0921 — la bibliothèque de sélecteurs, aux DEUX sens et à l'unité. Elle est partagée par
// `oracle-declencheurs` et `oracle-surcouche` : la juger seulement à travers eux laisserait sa
// branche décisive invisible. Le fait : le 05/09, l'appariement par jeton lisait toute une page
// en boutons fantômes ; le 08/09, la même mécanique dormait intacte dans l'oracle de sur-couche,
// où un élément héritait d'une bordure d'un sélecteur COMPOSÉ dont il ne portait qu'un jeton —
// et le contrôle passait POUR LA MAUVAISE RAISON, le seul verdict qui ne se signale pas.
{
  console.log(String.fromCharCode(10) + 'lib/selecteurs.mjs (TF-0921) — appariement au dernier compound, deux sens');
  const { declarationsPour, correspond } = await import('./lib/selecteurs.mjs');
  const regles = [{ selector: '.choix-dossier.compacte', body: 'border: 1px solid var(--trait); background: var(--fond-eleve)', atRules: [] },
                  { selector: '.choix-dossier', body: 'padding: 24px', atRules: [] }];
  const unSeulJeton = { tag: 'dialog', attrs: { class: 'choix-dossier' } };
  const lesDeux = { tag: 'dialog', attrs: { class: 'choix-dossier compacte' } };
  // Sens ROUGE — celui qui a coûté : un jeton ne suffit pas.
  ligne(!declarationsPour(unSeulJeton, regles).has('border'),
    'sens rouge · un élément ne portant qu\'UN jeton d\'un sélecteur composé n\'hérite pas de ses déclarations');
  // Sens VERT — et la règle s'applique bel et bien quand toutes ses conditions sont tenues :
  // un appariement qui ne trouverait plus rien serait l'excès inverse, tout aussi faux.
  ligne(declarationsPour(lesDeux, regles).get('border') === '1px solid var(--trait)',
    'sens vert · l\'élément qui porte TOUTES les conditions du compound hérite bien de la règle');
  ligne(declarationsPour(unSeulJeton, regles).get('padding') === '24px',
    'sens vert · la règle simple qui le désigne s\'applique toujours — la correction resserre, elle n\'aveugle pas');
  // L'ancêtre n'est pas remonté : c'est l'approximation LARGE déclarée au non_juge des deux
  // oracles. Elle est verrouillée ici pour qu'un durcissement futur soit un choix, pas une dérive.
  ligne(correspond({ tag: 'button', attrs: { class: 'cd-btn' } }, '.modale .cd-btn'),
    'approximation déclarée · l\'ancêtre d\'un sélecteur descendant n\'est pas remonté (non_juge des deux oracles)');
  // Les attributs sont des conditions de compound comme les autres — c'est ce qui a permis de
  // supprimer la liste de jetons `popover` / `role` de l'oracle de sur-couche sans rien perdre.
  ligne(correspond({ tag: 'div', attrs: { role: 'dialog' } }, '[role="dialog"]')
     && !correspond({ tag: 'div', attrs: { role: 'alertdialog' } }, '[role="dialog"]'),
    'attributs · [role="dialog"] est une condition du compound, jugée par la règle générale');
}

// TF-1074 — I7 mesure-t-elle l'INVARIANT, ou seulement une grandeur qui lui est corrélée ?
// La question n'est pas « la règle se déclenche-t-elle », mais « se déclenche-t-elle là où
// l'empreinte se tait, et se tait-elle là où l'empreinte crierait ». Les deux cas vivent
// dans les fixtures ; ce bloc les nomme un par un, sinon le compte de règles déclenchées
// laisserait passer une I7 qui ne saurait faire que de l'empreinte.
{
  console.log(String.fromCharCode(10) + 'oracle-images I7 (TF-1074) — la corrélation rompue, aux deux sens');
  const lire = f => {
    const r = spawnSync(process.execPath, [path.join(ici, 'oracle-images.mjs'), fx(f), '--json-only'], { encoding: 'utf8' });
    return { code: r.status, json: JSON.parse(r.stdout.trim()) };
  };
  const rouge = lire('images-variantes-rouge.html');
  const i7 = rouge.json.findings.filter(f => f.regle === 'I7');
  // Sens 1 — le cas littéral du 25/08 : deux variantes, un seul fichier.
  ligne(i7.some(f => f.sev === 'bloquant' && /octet pour octet/.test(f.msg)),
    'sens 1 · empreintes identiques entre deux variantes déclarées — refusé');
  // Sens 2 — CELUI QUI COMPTE : les empreintes diffèrent, un contrôle d'empreinte
  // rendrait PASS, et les deux variantes posent pourtant la même encre.
  ligne(i7.some(f => f.sev === 'bloquant' && /empreintes DIFFÉRENTES et posent la même encre/.test(f.msg)),
    'sens 2 · empreintes DIFFÉRENTES et encre identique — refusé là où l\'empreinte se tait');
  // Sens 3 — la fixture verte rompt la corrélation dans l'autre sens : onze octets
  // d'écart sur 235, même longueur, mêmes identifiants, même géométrie. Une règle qui
  // jugerait la DISTANCE entre les deux fichiers refuserait une variante légitime.
  const verte = lire('images-variantes-verte.html');
  ligne(verte.code === 0 && !verte.json.findings.some(f => f.regle === 'I7' && f.sev !== 'info'),
    'sens 3 · variante légitime à onze octets d\'écart (mêmes ids, même géométrie, seules les couleurs changent) — acceptée');
  // Et la limite se dit : une paire matricielle n'est jugée que sur son empreinte.
  ligne(verte.json.non_juge.some(n => /variantes matricielles/.test(n)),
    'limite déclarée · l\'encre d\'une paire matricielle est portée au non_juge, jamais devinée');
}

// TF-1066 — LA GRILLE EST UNE DONNÉE, ET ELLE NE DOIT PLUS DÉRIVER. Le 12/09/2026, la
// largeur de conception est passée à 1920 px et la grille de vérification au 4K dans
// run-oracles-design.mjs et oracle-baseline.mjs ; rendu-comparatif.mjs, dans le même
// dossier, est resté à `1920,1440,1024,768,390`. Quatre jours durant, un correctif comparé
// avant/après ne voyait rien de ce qui se passe à 2560 et à 3840 — et rien ne le disait.
// La grille vit désormais dans corpus/grille-viewports.json, datée et sourcée. Ce bloc
// verrouille les trois choses qui peuvent la faire mentir : un consommateur qui la recopie,
// une donnée absente que l'on devine, une donnée incohérente que l'on moyenne.
{
  console.log(String.fromCharCode(10) + 'lib/grille.mjs (TF-1066) — la grille de largeurs, lue au corpus et jamais devinée');
  const { lireGrille, FICHIER_GRILLE } = await import('./lib/grille.mjs');

  // Sens VERT — la donnée du corpus arrive telle quelle, triée du plus large au plus étroit.
  const g = lireGrille();
  const corpus = JSON.parse(fs.readFileSync(FICHIER_GRILLE, 'utf8'));
  ligne(g.rendus === [...corpus.rendu].sort((a, b) => b - a).join(',')
     && g.baselines === [...corpus.baseline].sort((a, b) => b - a).join(',')
     && g.largeurConception === corpus.largeur_conception,
    `sens vert · les grilles viennent du corpus — conception ${g.largeurConception} px, rendu ${g.rendus}, baseline ${g.baselines}`);
  ligne(Boolean(g.source) && Boolean(g.date),
    `donnée datée et sourcée · date ${g.date}, source déclarée (${(g.source || '').slice(0, 48)}…)`);

  // Sens ROUGE 1 — donnée absente : on LÈVE. Un repli silencieux rendrait un verdict vrai
  // sur une grille que personne n'a choisie, et c'est le seul verdict qui ne se signale pas.
  const leve = f => { try { lireGrille(fx(f)); return null; } catch (e) { return e.message; } };
  const sansRendu = leve('grille-viewports-rouge-sans-rendu.json');
  ligne(Boolean(sansRendu) && /rendu/.test(sansRendu),
    'sens rouge · grille sans liste de rendu — lève, aucun repli sur une grille devinée');

  // Sens ROUGE 2 — donnée incohérente : vérifier partout SAUF à la largeur où l'écran a été
  // dessiné est exactement le défaut que TF-1066 corrige. Il se refuse, il ne s'arbitre pas.
  const horsGrille = leve('grille-viewports-rouge-conception-hors-grille.json');
  ligne(Boolean(horsGrille) && /largeur de conception/.test(horsGrille),
    'sens rouge · largeur de conception absente de la grille de rendu — lève');

  // ANTI-DÉRIVE — aucun des trois consommateurs ne garde sa propre copie de la grille.
  // C'est le verrou qui manquait le 12/09 : la règle avait été écrite, pas propagée.
  for (const consommateur of ['run-oracles-design.mjs', 'oracle-baseline.mjs', 'rendu-comparatif.mjs']) {
    const code = fs.readFileSync(path.join(ici, consommateur), 'utf8');
    const listesEnDur = code.split(String.fromCharCode(10))
      .filter(l => !l.trim().startsWith('//'))
      .filter(l => /['"`]\s*\d{3,4}(?:\s*,\s*\d{3,4}){2,}\s*['"`]/.test(l));
    ligne(listesEnDur.length === 0 && /lib\/grille\.mjs/.test(code),
      `anti-dérive · ${consommateur} lit la grille au corpus et n'en garde aucune copie${listesEnDur.length ? ' — copie trouvée : ' + listesEnDur[0].trim().slice(0, 70) : ''}`);
  }

  // CONCORDANCE DE LA PROSE — les documents qui ÉNONCENT la grille aux producteurs disent
  // la même chose que la donnée. Un contrat qui prescrit 1440 pendant que l'oracle rend à
  // 3840 fait travailler le concepteur contre son juge.
  const MEMES = [
    'skills/ameliore-le-design/references/contrat-technique.md',
    'skills/ameliore-le-design/references/criteres-sortie.md',
    'skills/ameliore-le-design/SKILL.md',
    'skills/critique-le-design/references/grille.md',
  ];
  for (const doc of MEMES) {
    const texte = fs.readFileSync(path.join(ici, '..', doc), 'utf8');
    const suites = [...texte.matchAll(/\b\d{3,4}\b(?:\s*[,/]\s*\d{3,4}\b)+/g)]
      .map(m => m[0].split(/[,/]/).map(s => Number(s.trim())).join(','));
    ligne(suites.includes(g.rendus),
      `concordance · ${doc} énonce la grille du corpus (${g.rendus})`);
  }
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

// TF-1241 (22/09/2026) — LA PASSE D'IMPUTATION AU SOCLE, PROUVÉE SUR UN SOCLE D'ESSAI.
//
// POURQUOI UN SOCLE D'ESSAI. Depuis le 15/09 (51a783f), la fixture verte de TF-0830 embarque le
// composant NETTOYÉ du socle réel : elle passe sans la moindre imputation, et elle ne prouve plus
// rien de ce que son commentaire annonce (« ses 20 constats rendus dans socle_exempte » — il y en a
// zéro). Tant que le socle réel est propre, AUCUNE fixture ne peut porter à la fois un sceau vérifié
// et des constats : la passe n'était plus exercée par personne. D'où un socle posé pour la recette
// (FORGE_SKILLS_INSTALLES, que lib/socle.mjs honore désormais), dont le composant est volontairement
// SALE et scellé JUSTE.
//
// CE QUI EST PROUVÉ, DANS CET ORDRE : (1) l'oracle DIRECT échoue sur la page — c'est ce que le lanceur
// général de quality-oracles jouait avant TF-1241 ; (2) le point d'entrée en mode `--oracle <juge>
// --contrat-runner` passe, rend la forme d'entrée du lanceur, et met les constats au compte du socle
// sans les effacer ; (3) le même bloc au sceau altéré d'un caractère échoue — deux commentaires
// n'exemptent de rien.
{
  console.log(String.fromCharCode(10) + 'run-oracles-design.mjs --oracle <juge> --contrat-runner (TF-1241, socle d\'essai)');
  const { createHash } = await import('node:crypto');
  const racineEssai = fs.mkdtempSync(path.join(os.tmpdir(), 'socle-essai-'));
  try {
    const dossierSocle = path.join(racineEssai, 'digit-ai-page-html', 'assets');
    fs.mkdirSync(dossierSocle, { recursive: true });
    const sale = '.tf-btn.tf-on { background: #2563EB; color: #fff; padding: 7px 13px; }\n'
      + '.tf-opts label:hover { background: #f6f8fc; }\n';
    fs.writeFileSync(path.join(dossierSocle, 'table-filters.css'), sale, 'utf8');
    const sceau = createHash('sha256').update(sale, 'utf8').digest('hex');
    const bloc = (empreinte) => '<!-- COMPOSANT-EMBARQUE:DEBUT table-filters.css socle=digit-ai-page-html/assets -->\n'
      + `<style data-composant="table-filters.css" data-empreinte="sha256:${empreinte}">\n${sale.replace(/\n+$/, '')}\n</style>\n`
      + '<!-- COMPOSANT-EMBARQUE:FIN table-filters.css -->';
    // La page hôte est la fixture verte de TF-0830, dont SEUL le bloc embarqué est remplacé : tout
    // le reste de la page est donc déjà jugé propre par les cas ci-dessus.
    const hote = fs.readFileSync(fx('socle-embarque-verte.html'), 'utf8');
    const motif = /<!--\s*COMPOSANT-EMBARQUE:DEBUT table-filters\.css[\s\S]*?<!--\s*COMPOSANT-EMBARQUE:FIN table-filters\.css\s*-->/;
    const juste = path.join(racineEssai, 'page-sceau-juste.html');
    const altere = path.join(racineEssai, 'page-sceau-altere.html');
    fs.writeFileSync(juste, hote.replace(motif, bloc(sceau)), 'utf8');
    fs.writeFileSync(altere, hote.replace(motif, bloc((sceau[0] === 'a' ? 'b' : 'a') + sceau.slice(1))), 'utf8');
    const env = { ...process.env, FORGE_SKILLS_INSTALLES: racineEssai };
    const jouer = (args) => {
      const r = spawnSync(process.execPath, args, { encoding: 'utf8', env });
      let json = null; try { json = JSON.parse((r.stdout || '').trim()); } catch { /* sortie illisible, jugée ci-dessous */ }
      return { code: r.status, json };
    };
    for (const juge of ['tokens', 'slop']) {
      const direct = jouer([path.join(ici, `oracle-${juge}.mjs`), juste, '--json-only']);
      ligne(direct.json?.verdict === 'FAIL', `${juge} · direct sur le composant sale scellé juste : FAIL (obtenu ${direct.json?.verdict}) — ce que le lanceur général jouait`);
      const runner = jouer([path.join(ici, 'run-oracles-design.mjs'), juste, '--oracle', juge, '--contrat-runner', '--json-only']);
      const cles = ['oracle', 'domaine', 'artefact', 'verdict', 'findings', 'non_juge'].filter(k => !(k in (runner.json || {})));
      ligne(runner.code === 0 && runner.json?.verdict === 'PASS', `${juge} · mode lanceur, sceau juste : PASS exit 0 (obtenu ${runner.json?.verdict}, exit ${runner.code})`);
      ligne((runner.json?.socle_exempte?.findings || []).length > 0, `${juge} · les constats du socle sont RENDUS dans socle_exempte, pas effacés (${(runner.json?.socle_exempte?.findings || []).length})`);
      ligne(cles.length === 0, `${juge} · forme d'entrée du lanceur complète${cles.length ? ' — absents : ' + cles.join(', ') : ''}`);
      const faux = jouer([path.join(ici, 'run-oracles-design.mjs'), altere, '--oracle', juge, '--contrat-runner', '--json-only']);
      ligne(faux.code === 1 && faux.json?.verdict === 'FAIL', `${juge} · mode lanceur, sceau altéré d'un caractère : FAIL exit 1 (obtenu ${faux.json?.verdict}, exit ${faux.code})`);
    }
    // LE SENS QUI MANQUAIT : UNE FAUTE DE L'AUTEUR, PLACÉE APRÈS UN BLOC DU SOCLE, RESTE À L'AUTEUR
    // (22/09/2026, trouvé en jugeant une page d'étude du pilot). Le neutraliseur vide le bloc du socle
    // en gardant les lignes du HTML, mais la balise <style> disparaît avec lui : les lignes du CSS,
    // que l'oracle des jetons cite dans chaque constat (« ligne ~N du CSS »), se DÉCALENT pour tout ce
    // qui suit. Le même constat changeait alors d'identité entre les deux passes, et une couleur en
    // dur écrite par l'auteur passait au compte du socle — effacée du verdict. Une passe
    // d'imputation qui efface une faute de l'auteur est pire que pas de passe du tout.
    const fauteAuteur = hote.replace(motif, bloc(sceau)).replace('</head>', '<style>.faute-auteur{color:#123456}</style></head>');
    const pageFaute = path.join(racineEssai, 'page-faute-auteur.html');
    fs.writeFileSync(pageFaute, fauteAuteur, 'utf8');
    const fa = jouer([path.join(ici, 'run-oracles-design.mjs'), pageFaute, '--oracle', 'tokens', '--contrat-runner', '--json-only']);
    const aLAuteur = (fa.json?.findings || []).some(f => f.regle === 'T1' && /123456/i.test(f.msg || ''));
    const auSocle = (fa.json?.socle_exempte?.findings || []).some(f => /123456/i.test(f.msg || ''));
    ligne(fa.json?.verdict === 'FAIL' && aLAuteur && !auSocle,
      `tokens · une couleur en dur de l'AUTEUR placée après le bloc du socle reste à l'auteur : FAIL, T1 sur « .faute-auteur », rien au compte du socle (obtenu ${fa.json?.verdict}, à l'auteur ${aLAuteur}, au socle ${auSocle})`);
  } finally {
    fs.rmSync(racineEssai, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1876 (lot Produit-84 du 16/10/2026, option (a) par R-58 le 19/10) — LA FEUILLE DU GABARIT POSÉE PAR
// LE POSEUR EST UNE FEUILLE DU SOCLE. `embarquer-composants.mjs --poser … --composants boilerplate.css`
// scelle la feuille du gabarit, source SYNTHÉTIQUE extraite du premier <style> de boilerplate.html ;
// lib/socle.mjs cherchait un fichier boilerplate.css, ne le trouvait pas et jugeait la feuille comme
// celle de l'auteur (mesuré sur une page minimale : FAIL, 2 écarts durs bascule, 13 avertissements). Même
// socle d'essai que TF-1241, dont le gabarit porte une feuille volontairement SALE, scellée JUSTE. Les sens
// rouges bornent l'exemption : sceau altéré, copie éditée sur place, gabarit absent, et la même feuille
// écrite par l'auteur hors du bloc restent jugés.
{
  console.log(String.fromCharCode(10) + 'lib/socle.mjs (TF-1876) — la feuille boilerplate.css posée par le poseur est reconnue comme feuille du socle');
  const { createHash } = await import('node:crypto');
  const racineEssai = fs.mkdtempSync(path.join(os.tmpdir(), 'socle-feuille-'));
  try {
    const dossierSocle = path.join(racineEssai, 'digit-ai-page-html', 'assets');
    fs.mkdirSync(dossierSocle, { recursive: true });
    const sale = '.tf-btn.tf-on { background: #2563EB; color: #fff; padding: 7px 13px; }\n'
      + '.tf-opts label:hover { background: #f6f8fc; }';
    // Un second <style> au gabarit : seul le PREMIER est la feuille, comme chez le poseur.
    fs.writeFileSync(path.join(dossierSocle, 'boilerplate.html'),
      `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>g</title><style>\n${sale}\n</style><style>.autre{color:#654321}</style></head><body></body></html>`, 'utf8');
    const sceau = createHash('sha256').update(sale, 'utf8').digest('hex');
    const bloc = (empreinte, corps = sale) => '<!-- COMPOSANT-EMBARQUE:DEBUT boilerplate.css — copie du socle digit-ai-page-html/assets/boilerplate.css -->\n'
      + `<style data-composant="boilerplate.css" data-empreinte="sha256:${empreinte}">\n${corps}\n</style>\n`
      + '<!-- COMPOSANT-EMBARQUE:FIN boilerplate.css -->';
    const hote = fs.readFileSync(fx('socle-embarque-verte.html'), 'utf8');
    const motif = /<!--\s*COMPOSANT-EMBARQUE:DEBUT table-filters\.css[\s\S]*?<!--\s*COMPOSANT-EMBARQUE:FIN table-filters\.css\s*-->/;
    const ecrire = (nom, contenu) => { const f = path.join(racineEssai, nom); fs.writeFileSync(f, contenu, 'utf8'); return f; };
    const juste = ecrire('feuille-juste.html', hote.replace(motif, bloc(sceau)));
    const altere = ecrire('feuille-sceau-altere.html', hote.replace(motif, bloc((sceau[0] === 'a' ? 'b' : 'a') + sceau.slice(1))));
    const editee = ecrire('feuille-editee.html', hote.replace(motif, bloc(sceau, sale + '\n.ajout-auteur { color: #123456; }')));
    const auteur = ecrire('feuille-auteur.html', hote.replace(motif, `<style>\n${sale}\n</style>`));
    const jouer = (args, racine = racineEssai) => {
      const r = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, FORGE_SKILLS_INSTALLES: racine } });
      let json = null; try { json = JSON.parse((r.stdout || '').trim()); } catch { /* sortie illisible, jugée ci-dessous */ }
      return { code: r.status, json };
    };
    const runner = (f, racine) => jouer([path.join(ici, 'run-oracles-design.mjs'), f, '--oracle', 'tokens', '--contrat-runner', '--json-only'], racine);
    const direct = jouer([path.join(ici, 'oracle-tokens.mjs'), juste, '--json-only']);
    ligne(direct.json?.verdict === 'FAIL', `sens témoin · direct sur la feuille sale : FAIL (obtenu ${direct.json?.verdict}) — ce que la critique imputait à l'auteur`);
    const v = runner(juste);
    const exemptee = v.json?.socle_exempte;
    ligne(v.code === 0 && v.json?.verdict === 'PASS' && (exemptee?.verifies || []).some(b => b.nom === 'boilerplate.css') && (exemptee?.declares || []).length === 0,
      `sens vert · feuille boilerplate.css scellée juste : reconnue vérifiée, aucun bloc déclaré non vérifiable, PASS exit 0 (obtenu ${v.json?.verdict}, exit ${v.code}, vérifiés ${(exemptee?.verifies || []).length}, déclarés ${(exemptee?.declares || []).length})`);
    ligne((exemptee?.findings || []).length > 0, `sens vert · ses constats sont RENDUS dans socle_exempte, pas effacés (${(exemptee?.findings || []).length})`);
    const a = runner(altere);
    ligne(a.code === 1 && a.json?.verdict === 'FAIL' && (a.json?.socle_exempte?.declares || []).some(b => b.nom === 'boilerplate.css' && /empreinte déclarée ≠/.test(b.raison)),
      `sens rouge · sceau altéré d'un caractère : FAIL exit 1, bloc déclaré non vérifiable pour « empreinte ≠ source » (obtenu ${a.json?.verdict}, exit ${a.code})`);
    const e = runner(editee);
    ligne(e.code === 1 && e.json?.verdict === 'FAIL' && (e.json?.socle_exempte?.declares || []).some(b => b.nom === 'boilerplate.css' && /copie éditée sur place/.test(b.raison)),
      `sens rouge · feuille éditée sur place sous un sceau juste : FAIL exit 1, « copie éditée sur place » (obtenu ${e.json?.verdict}, exit ${e.code})`);
    const au = runner(auteur);
    ligne(au.code === 1 && au.json?.verdict === 'FAIL' && (au.json?.socle_exempte?.verifies || []).length === 0,
      `sens rouge · la même feuille écrite par l'auteur, hors de tout bloc : FAIL exit 1, rien d'exempté (obtenu ${au.json?.verdict}, exit ${au.code})`);
    const sg = runner(juste, path.join(racineEssai, 'vide'));
    ligne(sg.code === 1 && sg.json?.verdict === 'FAIL' && (sg.json?.socle_exempte?.declares || []).some(b => b.nom === 'boilerplate.css' && /source du socle introuvable/.test(b.raison)),
      `sens rouge · gabarit absent du socle installé : le sceau ne se confronte à rien, FAIL, « source du socle introuvable » (obtenu ${sg.json?.verdict}, exit ${sg.code})`);
  } finally {
    fs.rmSync(racineEssai, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1322 (D-13 (a) du 23/09/2026) — UNE PORTÉE, DEUX JUGES. Le lanceur général de quality-oracles
// jouait oracle-mobile sur toute page HTML, là où ce point d'entrée le réserve aux cibles mobiles :
// une page conforme du socle y échouait par les barres collées du gabarit lui-même. La règle vit
// désormais dans lib/cible-mobile.mjs ; oracle-mobile la consulte sous `--si-cible-mobile`, l'option
// que le registre de quality-oracles lui passe. Les sens tenus, chacun sur une page écrite ici :
{
  console.log(String.fromCharCode(10) + 'lib/cible-mobile.mjs (TF-1322) — le contrat tactile ne juge que les cibles mobiles, aux deux lanceurs');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'cible-mobile-'));
  try {
    const page = (tete) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">${tete}<title>t</title>`
      + '<style>header.colle{position:sticky;top:0}</style></head><body><header class="colle">en-tete</header>'
      + '<main><p>corps</p></main></body></html>';
    const bureau = path.join(dossier, 'bureau.html');
    const mobile = path.join(dossier, 'mobile.html');
    fs.writeFileSync(bureau, page('<meta name="viewport" content="width=device-width, initial-scale=1.0">'), 'utf8');
    fs.writeFileSync(mobile, page('<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">'), 'utf8');
    const jouerMobile = (...a) => {
      const r = spawnSync(process.execPath, [path.join(ici, 'oracle-mobile.mjs'), ...a, '--json-only'], { encoding: 'utf8' });
      let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
      return { code: r.status, json };
    };
    const a = jouerMobile(bureau, '--si-cible-mobile');
    ligne(a.code === 2 && a.json?.verdict === 'SKIP' && (a.json?.findings || []).some(f => /SANS OBJET/.test(f.msg || '')),
      `sens rouge · page de bureau sous --si-cible-mobile : SKIP exit 2, motif « sans objet » écrit (obtenu ${a.json?.verdict}, exit ${a.code})`);
    const b = jouerMobile(bureau);
    ligne(b.json && b.json.verdict !== 'SKIP',
      `sens vert · la même page SANS l'option est jugée comme avant — le point d'entrée a déjà décidé pour l'oracle (obtenu ${b.json?.verdict})`);
    const c = jouerMobile(mobile, '--si-cible-mobile');
    ligne(c.json && c.json.verdict !== 'SKIP',
      `sens vert · page qui déclare son encoche (viewport-fit=cover) sous --si-cible-mobile : jugée (obtenu ${c.json?.verdict})`);
    const d = jouerMobile(bureau, '--si-cible-mobile', '--mobile');
    ligne(d.json && d.json.verdict !== 'SKIP',
      `sens vert · --mobile force la cible, comme au point d'entrée (obtenu ${d.json?.verdict})`);
    // ANTI-DÉRIVE — le motif n'a qu'un domicile. Un lanceur qui garderait sa copie dériverait au
    // premier marqueur ajouté, en silence (la leçon de TF-1207).
    for (const consommateur of ['run-oracles-design.mjs', 'oracle-mobile.mjs']) {
      const code = fs.readFileSync(path.join(ici, consommateur), 'utf8');
      ligne(/from '\.\/lib\/cible-mobile\.mjs'/.test(code) && !/viewport-fit\\s\*=\\s\*cover\|safe-area-inset/.test(code),
        `anti-dérive · ${consommateur} importe lib/cible-mobile.mjs et ne recopie pas le motif`);
    }
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1023 (D-11 (a) du 23/09/2026) — LA PAIRE DE POLICES DE LA CHARTE SE LIT DANS LE SOCLE INSTALLÉ.
// oracle-slop exemptait de S3 une paire écrite en dur (Roboto, DM Sans) ; le socle a pris les polices
// de la charte des présentations. Chaque sens est joué contre un socle D'ESSAI posé ici et désigné par
// FORGE_SKILLS_INSTALLES — le socle réel du poste n'entre pas dans la preuve.
{
  console.log(String.fromCharCode(10) + 'oracle-slop S3 (TF-1023) — la charte de police est celle du socle installé, plus la paire antérieure datée');
  const racineEssai = fs.mkdtempSync(path.join(os.tmpdir(), 'charte-socle-'));
  try {
    const assets = path.join(racineEssai, 'digit-ai-page-html', 'assets');
    fs.mkdirSync(assets, { recursive: true });
    fs.writeFileSync(path.join(assets, 'boilerplate.html'), '<style>:root{--head: "Montserrat", "Roboto", system-ui, sans-serif;\n'
      + '--sans: "Inter", "DM Sans", system-ui, sans-serif;}</style>', 'utf8');
    // S3 lit les déclarations `font-family` LITTÉRALES : sur une page réelle, ce sont les replis écrits
    // par les composants du socle (`var(--sans, "…", system-ui)`, infobulle.css) qui la déclenchent.
    // La page d'essai en porte donc un, construit sur la même pile que ses jetons.
    const page = (head, sans) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>t</title><style>:root{--head: ${head};--sans: ${sans};}`
      + `h1{font-family:var(--head)}body{font-family:var(--sans)}.bulle{font-family:var(--sans, ${sans})}</style></head>`
      + '<body><main><h1>Titre</h1><p class="bulle">corps</p></main></body></html>';
    const juger = (nom, contenu, racine) => {
      const f = path.join(racineEssai, nom);
      fs.writeFileSync(f, contenu, 'utf8');
      const r = spawnSync(process.execPath, [path.join(ici, 'oracle-slop.mjs'), f, '--json-only'],
        { encoding: 'utf8', env: { ...process.env, FORGE_SKILLS_INSTALLES: racine } });
      let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible */ }
      return (json?.findings || []).filter((x) => x.regle === 'S3');
    };
    const courante = juger('courante.html', page('"Montserrat", "Roboto", system-ui, sans-serif', '"Inter", "DM Sans", system-ui, sans-serif'), racineEssai);
    ligne(courante.length > 0 && courante.every((x) => x.sev === 'info'),
      `sens vert · page à la charte du socle installé (Montserrat / Inter) : S3 rendu en info seulement (${courante.map((x) => x.sev).join(', ') || 'aucun constat'})`);
    const hors = juger('hors-charte.html', page('"Poppins", system-ui, sans-serif', '"Inter", system-ui, sans-serif'), racineEssai);
    ligne(hors.some((x) => x.sev === 'majeur' && /inter/i.test(x.msg)),
      `sens rouge · Inter employé SANS déclarer la paire du socle : S3 majeur (${hors.map((x) => x.sev).join(', ') || 'aucun constat'})`);
    const anterieure = juger('anterieure.html', page('"Roboto", system-ui, sans-serif', '"DM Sans", system-ui, sans-serif'), racineEssai);
    ligne(anterieure.length > 0 && anterieure.every((x) => x.sev === 'info'),
      `sens vert · page livrée à la charte antérieure (Roboto / DM Sans) : toujours exemptée (${anterieure.map((x) => x.sev).join(', ') || 'aucun constat'})`);
    const sansSocle = juger('sans-socle.html', page('"Montserrat", "Roboto", system-ui, sans-serif', '"Inter", "DM Sans", system-ui, sans-serif'), path.join(racineEssai, 'vide'));
    ligne(sansSocle.some((x) => x.sev === 'majeur'),
      `limite déclarée · sans socle installé, la charte courante n'est pas reconnue et S3 juge la page (${sansSocle.map((x) => x.sev).join(', ') || 'aucun constat'})`);
  } finally {
    fs.rmSync(racineEssai, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1629 (retour Produit-79 du 07/10, décidé le 13/10/2026) — LA POLICE DE MARQUE SE DÉCLARE.
// S3 jugeait « réflexe » une police de titre prescrite par la charte de marque d'un produit, sans voie
// de déclaration. La page la déclare par data-police-de-marque ; l'exemption ne couvre que les familles
// listées. Pages inline, socle d'essai vide : le socle réel du poste n'entre pas dans la preuve.
{
  console.log(String.fromCharCode(10) + 'oracle-slop S3 (TF-1629) — la police de marque se déclare sur la page, et seulement elle');
  const racineEssai = fs.mkdtempSync(path.join(os.tmpdir(), 'marque-s3-'));
  try {
    const page = (attr, extra) => `<!DOCTYPE html><html lang="fr"${attr}><head><meta charset="UTF-8"><title>t</title><style>`
      + 'h1{font-family:"Cormorant Garamond", Georgia, serif}body{font-family:Georgia, serif}' + extra
      + '</style></head><body><main><h1>Titre</h1><p class="a">corps</p></main></body></html>';
    const juger = (nom, contenu) => {
      const f = path.join(racineEssai, nom);
      fs.writeFileSync(f, contenu, 'utf8');
      const r = spawnSync(process.execPath, [path.join(ici, 'oracle-slop.mjs'), f, '--json-only'],
        { encoding: 'utf8', env: { ...process.env, FORGE_SKILLS_INSTALLES: path.join(racineEssai, 'vide') } });
      let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible */ }
      return (json?.findings || []).filter((x) => x.regle === 'S3');
    };
    const declaree = juger('declaree.html', page(' data-police-de-marque="Cormorant Garamond"', ''));
    ligne(declaree.length > 0 && declaree.every((x) => x.sev === 'info'),
      `sens vert · police de titre déclarée par data-police-de-marque : S3 rendu en info seulement (${declaree.map((x) => x.sev).join(', ') || 'aucun constat'})`);
    const muette = juger('muette.html', page('', ''));
    ligne(muette.some((x) => x.sev === 'majeur' && /cormorant/i.test(x.msg)),
      `sens rouge · même police SANS déclaration : S3 majeur (${muette.map((x) => x.sev).join(', ') || 'aucun constat'})`);
    const debord = juger('debord.html', page(' data-police-de-marque="Cormorant Garamond"', '.a{font-family:Inter, sans-serif}'));
    ligne(debord.some((x) => x.sev === 'majeur' && /inter/i.test(x.msg)) && debord.some((x) => x.sev === 'info' && /cormorant/i.test(x.msg)),
      `sens rouge · la déclaration ne couvre pas une autre famille réflexe (Inter reste majeur, Cormorant en info) : ${debord.map((x) => x.sev).join(', ') || 'aucun constat'}`);
  } finally {
    fs.rmSync(racineEssai, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1860 (retour Produit-79 RD-2, décidé le 18/10/2026) — LE REFUS NOMME LA VOIE. L'exemption de
// TF-1629 existait ; le FAIL ne la nommait pas, et le produit a conclu qu'il n'y en avait aucune. Trois
// preuves : le message dit l'attribut, où le poser et un exemple ; la sortie de run-oracles-design le
// transmet (JSON et lecture humaine) ; le remède COPIÉ du message, joué sur la page, la fait passer
// (TF-1013). Deux sens rouges : une police non déclarée reste majeure, et un tokens.css qui porte la
// famille n'exempte rien (seconde voie du produit refusée, motif au non_juge).
{
  console.log(String.fromCharCode(10) + 'oracle-slop S3 (TF-1860) — le refus nomme la déclaration, le remède joué passe, la police non déclarée reste rouge');
  const racineEssai = fs.mkdtempSync(path.join(os.tmpdir(), 'voie-s3-'));
  try {
    const env = { ...process.env, FORGE_SKILLS_INSTALLES: path.join(racineEssai, 'vide') };
    const page = (attr, extra = '') => `<!DOCTYPE html><html lang="fr"${attr}><head><meta charset="UTF-8"><title>t</title><style>`
      + 'h1{font-family:"Cormorant Garamond", Georgia, serif}body{font-family:Georgia, serif}' + extra
      + '</style></head><body><main><h1>Titre</h1><p class="a">corps</p></main></body></html>';
    const ecrire = (nom, contenu) => { const f = path.join(racineEssai, nom); fs.writeFileSync(f, contenu, 'utf8'); return f; };
    const slop = (f) => {
      const r = spawnSync(process.execPath, [path.join(ici, 'oracle-slop.mjs'), f, '--json-only'], { encoding: 'utf8', env });
      let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible */ }
      return { findings: (j?.findings || []).filter((x) => x.regle === 'S3'), non_juge: j?.non_juge || [] };
    };
    const muette = slop(ecrire('muette.html', page('')));
    const refus = muette.findings.find((x) => x.sev === 'majeur' && /cormorant/i.test(x.msg));
    ligne(Boolean(refus) && /data-police-de-marque="Cormorant Garamond"/.test(refus.msg) && /<html[^>]*data-police-de-marque/.test(refus.msg) && /sur <html>/.test(refus.msg),
      'sens vert · le refus de S3 nomme l\'attribut data-police-de-marque, où le poser (<html>) et un exemple à la famille refusée');
    ligne(Boolean(refus?.voie) && refus.msg.includes(refus.voie),
      'sens vert · le constat porte la voie en champ structuré (`voie`), identique à celle du message');
    // Le remède se joue : l'exemple lu DANS le message est posé sur la page, et S3 passe en info.
    const exemple = refus ? /data-police-de-marque="[^"]+"/.exec(refus.voie)?.[0] : null;
    const appliquee = exemple ? slop(ecrire('remede.html', page(' ' + exemple))) : { findings: [] };
    ligne(Boolean(exemple) && appliquee.findings.length > 0 && appliquee.findings.every((x) => x.sev === 'info'),
      `sens vert · le remède copié du message, posé sur la page : S3 en info seulement (${appliquee.findings.map((x) => x.sev).join(', ') || 'aucun constat'})`);
    ligne(muette.findings.some((x) => x.sev === 'majeur'),
      'sens rouge · la même police SANS déclaration reste majeure (le message qui nomme la voie ne l\'exempte pas)');
    const autre = slop(ecrire('autre.html', page(' data-police-de-marque="Fraunces"')));
    ligne(autre.findings.some((x) => x.sev === 'majeur' && /cormorant/i.test(x.msg)),
      'sens rouge · déclarer une AUTRE famille (Fraunces) n\'exempte pas Cormorant Garamond');
    // Seconde voie du produit (tokens.css / dossier de marque) : refusée, et la limite est dite.
    const tokens = ecrire('tokens.css', ':root{--font-titre: "Cormorant Garamond", Georgia, serif;}');
    const cible = ecrire('avec-tokens.html', page(''));
    const run = (args) => spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), cible, '--tokens', tokens, ...args], { encoding: 'utf8', env });
    const j = (() => { try { return JSON.parse(run(['--json-only']).stdout.trim()); } catch { return null; } })();
    const sl = (j?.oracles || []).find((o) => o.oracle === 'oracle-slop');
    const s3 = (sl?.findings || []).filter((x) => x.regle === 'S3');
    ligne(s3.some((x) => x.sev === 'majeur' && /cormorant/i.test(x.msg)),
      'sens rouge · la famille portée par le tokens.css du produit n\'exempte rien : S3 reste majeur (seconde voie refusée)');
    ligne((j?.non_juge || []).some((n) => /ni le tokens\.css du produit ni son dossier de marque/.test(n)),
      'limite déclarée · le non_juge dit que ni tokens.css ni MARQUE.md ne sont lus, et pourquoi');
    // La sortie de run-oracles-design TRANSMET la voie : champ JSON conservé, et lecture humaine (stderr).
    ligne(s3.some((x) => x.voie && /data-police-de-marque="Cormorant Garamond"/.test(x.voie) && x.msg.includes(x.voie)),
      'sens vert · run-oracles-design transmet le constat avec sa voie (JSON : message et champ `voie`)');
    const humaine = run([]).stderr;
    ligne(/↳ S3 : si « Cormorant Garamond » est la police de MARQUE[^\n]*data-police-de-marque="Cormorant Garamond"/.test(humaine),
      'sens vert · la lecture humaine de run-oracles-design affiche la voie sous l\'oracle en échec');
    const ok = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), ecrire('declaree-run.html', page(' data-police-de-marque="Cormorant Garamond"'))],
      { encoding: 'utf8', env });
    ligne(!/↳ S3/.test(ok.stderr),
      'sens vert · page déclarée : aucune voie affichée (le remède n\'est rappelé qu\'au refus)');
  } finally {
    fs.rmSync(racineEssai, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1661 (retour du 13/10/2026) — LE VERT DU RENDU FIGÉ N'EST PAS UN SILENCE. Le cas du harnais
// prouve PASS sur la verte ; ce bloc prouve qu'elle passe POUR LA BONNE RAISON : l'absence de
// bascule y est dite en avertissement, et les trois règles non jugées le sont au non_juge.
{
  console.log(String.fromCharCode(10) + 'oracle-bascule (TF-1661) — rendu figé : avertissement dit, règles non jugées déclarées');
  const r = spawnSync(process.execPath, [path.join(ici, 'oracle-bascule.mjs'), fx('bascule-figee-verte.html'), '--json-only'], { encoding: 'utf8' });
  let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : les lignes le diront */ }
  ligne((j?.findings || []).some(f => f.regle === 'B-T1' && f.sev === 'avertissement'),
    'sens vert · page figée : B-T1 rendu en avertissement, comme check_html.py G1');
  ligne((j?.non_juge || []).some(n => /B-T2, B-T3, B-T4 non jugées : rendu figé/.test(n)),
    'limite déclarée · B-T2 à B-T4 portées au non_juge, jamais approuvées en silence');
}

// TF-1674 (retour du 12/10/2026) — LE PYTHON D'UN ENVIRONNEMENT uv EST UN PYTHON. `--rendu`
// rendait SKIP chez un produit dont playwright vit dans son environnement uv. La décision est
// jouée sur sondes injectées : la preuve ne dépend pas de ce que le poste a installé.
{
  console.log(String.fromCharCode(10) + 'lib/rendu.mjs choisirInterpreteur (TF-1674) — uv en second recours, deux sens');
  const { choisirInterpreteur } = await import('./lib/rendu.mjs');
  const sansPlaywright = () => ({ present: true, playwright: false });
  let sondeUv = 0;
  const a = choisirInterpreteur({ python: () => ({ present: true, playwright: true }), uv: () => { sondeUv++; return { present: true, executable: 'X' }; } });
  ligne(a.python === 'python' && a.via === 'PATH' && a.manques.length === 0 && sondeUv === 0,
    `sens vert · Python du PATH avec playwright : retenu, uv jamais sondé (obtenu ${a.python} via ${a.via}, ${sondeUv} sonde uv)`);
  const b = choisirInterpreteur({ python: sansPlaywright, uv: () => ({ present: true, executable: 'C:/produit/.venv/Scripts/python.exe' }) });
  ligne(b.python === 'C:/produit/.venv/Scripts/python.exe' && b.via === 'uv' && b.manques.length === 0,
    `sens vert · playwright seulement dans l'environnement uv du produit : son interpréteur est retenu (obtenu ${b.python} via ${b.via})`);
  const c = choisirInterpreteur({ python: sansPlaywright, uv: () => ({ present: false, executable: null }) });
  ligne(c.manques.length === 1 && /playwright non importable/.test(c.manques[0]) && /uv` absent/.test(c.manques[0]),
    `sens rouge · ni le PATH ni uv ne portent playwright : manque motivé, uv nommé (${c.manques[0]?.slice(0, 60)}…)`);
  const d = choisirInterpreteur({ python: () => ({ present: false, playwright: false }), uv: () => ({ present: true, executable: null }) });
  ligne(d.python === null && /introuvable/.test(d.manques[0]) && /n'importe pas playwright/.test(d.manques[0]),
    'sens rouge · aucun Python et uv sans playwright : SKIP motivé, jamais un interpréteur deviné');
}

// TF-1674 + TF-1654 — UNE APPLICATION SERVIE DERRIÈRE UNE CONNEXION. Une instance d'essai est
// servie ici : l'écran au volume réel (la fixture rouge) n'est rendu qu'à une session ouverte, toute
// autre visite est redirigée vers une page de connexion. Sans état de connexion, l'oracle mesure la
// page de connexion — la redirection doit être DITE, sinon son PASS se lirait « écran exploitable ».
// Avec l'état (storageState Playwright), c'est l'écran lui-même qui est jugé, et il échoue.
{
  console.log(String.fromCharCode(10) + 'oracle-exploitabilite (TF-1674) — instance servie derrière une connexion, deux sens');
  if (!OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
  } else {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'instance-connectee-'));
    const code = `const http=require('http');const fs=require('fs');const ecran=fs.readFileSync(${JSON.stringify(fx('exploitabilite-rouge.html'))},'utf8');`
      + `const s=http.createServer((q,r)=>{if(q.url==='/connexion'){r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});`
      + `return r.end('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Connexion</title></head><body><main><h1>Connexion</h1><button>Se connecter</button></main></body></html>');}`
      + `if(/session=ouverte/.test(q.headers.cookie||'')){r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return r.end(ecran);}`
      + `r.writeHead(302,{Location:'/connexion'});r.end();});s.listen(0,'127.0.0.1',()=>console.log(s.address().port));`;
    const serveur = spawn(process.execPath, ['-e', code], { stdio: ['ignore', 'pipe', 'ignore'] });
    try {
      const port = await new Promise((ok, ko) => {
        serveur.stdout.once('data', d => ok(Number(String(d).trim())));
        serveur.once('exit', () => ko(new Error('serveur d\'essai arrêté')));
      });
      const etat = path.join(dossier, 'etat.json');
      fs.writeFileSync(etat, JSON.stringify({ cookies: [{ name: 'session', value: 'ouverte', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }], origins: [] }), 'utf8');
      const jouer = (...a) => {
        const r = spawnSync(process.execPath, [path.join(ici, 'oracle-exploitabilite.mjs'), `http://127.0.0.1:${port}/ecran`, ...a, '--json-only'],
          { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
        let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        return { code: r.status, json };
      };
      const sans = jouer();
      ligne(sans.code === 2 && sans.json?.verdict === 'SKIP' && (sans.json?.findings || []).some(f => f.regle === 'X0' && /redirigé vers .*\/connexion/.test(f.msg)),
        `sens rouge · sans état de connexion, la redirection est dite (X0) et l'écran non jugé : SKIP exit 2, jamais un PASS sur la page de connexion (obtenu ${sans.json?.verdict}, exit ${sans.code})`);
      const avec = jouer('--etat-connexion', etat);
      const regles = new Set((avec.json?.findings || []).map(f => f.regle));
      ligne(avec.code === 1 && !regles.has('X0') && ['X1', 'X2', 'X3', 'X4', 'X5'].every(x => regles.has(x)),
        `sens vert · avec l'état de connexion, l'écran servi est jugé lui-même : X1 à X5, aucune redirection (obtenu ${avec.json?.verdict}, ${[...regles].join(' ')})`);
      const sombre = jouer('--etat-connexion', etat, '--theme', 'dark');
      ligne(sombre.json?.theme === 'dark' && sombre.code === 1 && (sombre.json?.non_juge || []).some(n => /thème sombre forcé/.test(n)),
        `--theme dark · mesuré sur l'instance elle-même, limite dite au non_juge (obtenu ${sombre.json?.verdict}, thème ${sombre.json?.theme})`);
      const perime = jouer('--etat-connexion', path.join(dossier, 'absent.json'));
      ligne(perime.code === 2 && perime.json?.verdict === 'SKIP',
        `sens rouge · état de connexion introuvable : SKIP exit 2, jamais un jugement de la page de connexion (obtenu ${perime.json?.verdict}, exit ${perime.code})`);
    } finally {
      serveur.kill();
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// TF-1687 — UN ORACLE QUI N'EST SUR AUCUN CHEMIN N'EST JAMAIS JOUÉ. oracle-exploitabilite est
// enrôlé dans le point d'entrée en OPT-IN : il ne juge que l'instance alimentée qu'on lui fournit
// (--instance). La même page, toute verte par ailleurs (motion-verte.html), sert aux trois sens :
// sans instance, l'oracle est dit SANS OBJET et le verdict reste PASS ; avec l'écran au volume réel
// (la fixture rouge), c'est lui SEUL qui fait tomber le verdict ; avec l'écran léger, il passe.
// L'état de connexion est transmis tel quel : un état introuvable rend SKIP, jamais PASS.
{
  console.log(String.fromCharCode(10) + 'run-oracles-design --instance (TF-1687) — exploitabilité en opt-in, deux sens');
  const jouer = (...a) => {
    const r = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), fx('motion-verte.html'), ...a, '--json-only'],
      { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
    let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
    return { code: r.status, json, explo: (json?.oracles || []).find(o => o.oracle === 'oracle-exploitabilite') };
  };
  const sans = jouer();
  ligne(sans.code === 0 && sans.json?.verdict === 'PASS' && !sans.explo
    && (sans.json?.non_juge || []).some(n => /^oracle-exploitabilite : SANS OBJET — aucune instance alimentée/.test(n)),
    `sans instance · oracle-exploitabilite SANS OBJET dit au non_juge, non lancé, verdict PASS exit 0 — jamais un FAIL sur un projet sans instance (obtenu ${sans.json?.verdict}, exit ${sans.code})`);
  const perime = jouer('--instance', fx('exploitabilite-verte.html'), '--etat-connexion', path.join(os.tmpdir(), 'etat-absent-tf1687.json'));
  ligne(perime.code === 2 && perime.json?.verdict === 'SKIP' && perime.explo?.verdict === 'SKIP',
    `--etat-connexion transmis · état introuvable : l'oracle rend SKIP et le point d'entrée INDÉTERMINÉ exit 2, jamais PASS (obtenu ${perime.json?.verdict}, exit ${perime.code})`);
  if (!OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  instance jugée : outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
  } else {
    const rouge = jouer('--instance', fx('exploitabilite-rouge.html'));
    const regles = new Set((rouge.explo?.findings || []).map(f => f.regle));
    const autresEnEchec = (rouge.json?.oracles || []).filter(o => o.verdict === 'FAIL' && o.oracle !== 'oracle-exploitabilite');
    ligne(rouge.code === 1 && rouge.json?.verdict === 'FAIL' && rouge.explo?.verdict === 'FAIL' && autresEnEchec.length === 0
      && ['X1', 'X2', 'X3', 'X4', 'X5'].every(x => regles.has(x)),
      `sens rouge · instance au volume réel : oracle-exploitabilite FAIL (X1 à X5), seul en échec, verdict FAIL exit 1 (obtenu ${rouge.json?.verdict}, exit ${rouge.code}, ${[...regles].join(' ')})`);
    const verte = jouer('--instance', fx('exploitabilite-verte.html'));
    ligne(verte.code === 0 && verte.json?.verdict === 'PASS' && verte.explo?.verdict === 'PASS',
      `sens vert · instance légère : oracle-exploitabilite lancé et PASS, verdict PASS exit 0 (obtenu ${verte.json?.verdict}, exit ${verte.code})`);
  }
}

// TF-2121 (lot Produit-86 du 03/11/2026) — UNE PAGE D'APPLICATION SANS INSTANCE SERVIE N'EST PAS UN PASS. Dix pages
// d'application avaient passé la critique : le point d'entrée disait « SANS OBJET » au non_juge et rendait PASS,
// pendant que l'instance, jouée ensuite, donnait deux défauts. La page de base (motion-verte.html) est verte pour
// tous les juges ; seule la déclaration « application » la distingue de la page éditoriale. Trois remèdes que le
// message prescrit sont JOUÉS et doivent passer : l'instance, la déclaration de maquette, la déclaration éditoriale.
{
  console.log(String.fromCharCode(10) + 'run-oracles-design · page d\'application sans instance (TF-2121) — FAIL X7, trois remèdes joués');
  const { typerPage } = await import('./lib/type-page.mjs');
  const base = fs.readFileSync(fx('motion-verte.html'), 'utf8');
  const meta = '<meta name="forge-type-page" content="application">';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'type-page-'));
  try {
    const appli = path.join(dossier, 'application.html');
    fs.writeFileSync(appli, base.replace('</head>', `${meta}\n</head>`), 'utf8');
    const jouer = (...a) => {
      const r = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), ...a, '--json-only'],
        { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
      let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
      return { code: r.status, json, explo: (json?.oracles || []).find(o => o.oracle === 'oracle-exploitabilite') };
    };
    const editoriale = jouer(fx('motion-verte.html'));
    ligne(editoriale.code === 0 && editoriale.json?.verdict === 'PASS' && !editoriale.explo,
      `témoin · la même page SANS déclaration reste éditoriale : SANS OBJET, PASS exit 0 (obtenu ${editoriale.json?.verdict}, exit ${editoriale.code})`);
    const rouge = jouer(appli);
    const autres = (rouge.json?.oracles || []).filter(o => o.verdict === 'FAIL' && o.oracle !== 'oracle-exploitabilite');
    ligne(rouge.code === 1 && rouge.json?.verdict === 'FAIL' && rouge.explo?.verdict === 'FAIL' && autres.length === 0
      && (rouge.explo?.findings || []).some(f => f.regle === 'X7' && f.sev === 'bloquant' && /sans instance servie/.test(f.msg) && /--instance/.test(f.voie) && /--maquette/.test(f.voie)),
      `sens rouge · page déclarée application, sans instance : X7 bloquant, oracle-exploitabilite seul en échec, FAIL exit 1, remèdes dits (obtenu ${rouge.json?.verdict}, exit ${rouge.code}, autres en échec ${autres.length})`);
    ligne(!(rouge.json?.non_juge || []).some(n => /^oracle-exploitabilite : SANS OBJET/.test(n)),
      'sens rouge · le FAIL remplace la ligne « SANS OBJET » : le même contrôle n\'est pas dit à la fois échoué et sans objet');
    const maquette = jouer(appli, '--maquette');
    ligne(maquette.code === 0 && maquette.json?.verdict === 'PASS' && !maquette.explo
      && (maquette.json?.non_juge || []).some(n => /^oracle-exploitabilite : SANS OBJET — page d'application déclarée MAQUETTE/.test(n) && /Ce n'est pas un PASS de l'exploitabilité/.test(n)),
      `sens vert · remède --maquette : PASS exit 0, l'exemption est écrite au non_juge et dit que ce n'est pas un PASS de l'exploitabilité (obtenu ${maquette.json?.verdict}, exit ${maquette.code})`);
    const edito = jouer(appli, '--type-page', 'editoriale');
    ligne(edito.code === 0 && edito.json?.verdict === 'PASS' && !edito.explo
      && (edito.json?.non_juge || []).some(n => /^oracle-exploitabilite : SANS OBJET.*déclarée éditoriale \(appel/.test(n)),
      `sens vert · remède --type-page editoriale : l'appel l'emporte sur la déclaration de la page, PASS exit 0 (obtenu ${edito.json?.verdict}, exit ${edito.code})`);
    const inconnu = jouer(appli, '--type-page', 'brochure');
    ligne(inconnu.code === 2 && inconnu.json?.verdict === 'SKIP' && (inconnu.json?.non_juge || []).some(n => /« brochure » inconnu/.test(n)),
      `sens rouge · --type-page inconnu : SKIP exit 2, jamais ignoré en silence (obtenu ${inconnu.json?.verdict}, exit ${inconnu.code})`);
    const seul = jouer(appli, '--oracle', 'slop');
    ligne(seul.code === 0 && seul.json?.verdict === 'PASS' && !seul.explo,
      `--oracle slop · un juge seul ne porte pas X7, il n'a pas été demandé (obtenu ${seul.json?.verdict}, exit ${seul.code})`);
    if (!OUTILLAGE_RENDU.ok) {
      console.log(`  SKIP  remède --instance : outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
    } else {
      const instance = jouer(appli, '--instance', fx('exploitabilite-verte.html'));
      ligne(instance.code === 0 && instance.json?.verdict === 'PASS' && instance.explo?.verdict === 'PASS'
        && !(instance.explo?.findings || []).some(f => f.regle === 'X7'),
        `sens vert · remède --instance : oracle-exploitabilite joué et PASS, aucun X7, exit 0 (obtenu ${instance.json?.verdict}, exit ${instance.code})`);
      const instanceRouge = jouer(appli, '--instance', fx('exploitabilite-rouge.html'));
      ligne(instanceRouge.code === 1 && instanceRouge.explo?.verdict === 'FAIL' && !(instanceRouge.explo?.findings || []).some(f => f.regle === 'X7'),
        `sens rouge · instance au volume réel : l'échec vient de X1 à X5, pas de X7 (obtenu ${instanceRouge.explo?.verdict})`);
    }
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
  // La classification, source par source : l'appel, la déclaration, la structure, puis l'absence de tout cela.
  const cas = (html, args = []) => typerPage(html, args);
  ligne(cas('<html><head>' + meta + '</head></html>').type === 'application' && cas('<html><head>' + meta + '</head></html>').source === 'déclaration de la page',
    'classement · <meta name="forge-type-page" content="application"> classe application');
  ligne(cas('<body data-type-page="application"></body>').type === 'application', 'classement · data-type-page="application" sur un élément classe application');
  ligne(cas('<body data-type-page="editoriale" data-exigence="X"></body>').type === 'editoriale',
    'classement · la déclaration éditoriale de la page l\'emporte sur un marqueur de structure');
  ligne(cas('<body data-type-page="editoriale"></body>', ['--type-page', 'application']).type === 'application',
    'classement · l\'appel l\'emporte sur la déclaration de la page');
  for (const marqueur of ['data-panneau-tache', 'data-branche="a"', 'data-exigence="EX-1"']) {
    ligne(cas(`<main><section ${marqueur}></section></main>`).type === 'application' && /structure/.test(cas(`<main><section ${marqueur}></section></main>`).source),
      `classement · le marqueur de structure « ${marqueur} » classe application`);
  }
  ligne(cas('<!-- <meta name="forge-type-page" content="application"> data-exigence="X" --><main></main>').type === 'non_classee',
    'classement · un marqueur cité dans un commentaire HTML ne classe rien');
  const filtrable = '<main><input type="search"><table data-filterable><tr><td>a</td></tr></table></main>';
  ligne(cas(filtrable).type === 'non_classee' && !cas(filtrable).probable,
    'classement · un tableau filtrable et une recherche (page d\'étude du pilot) ne classent PAS application, et ne sont pas « probables »');
  ligne(cas('<main><input type="text"><table><tr><td>a</td></tr></table></main>').probable === true,
    'classement · un champ de saisie ET un tableau, sans déclaration : « application probable », dite au non_juge, jamais échouée');
  ligne(cas('<html></html>', ['--type-page', 'x']).valeur_inconnue === 'x', 'classement · une valeur de --type-page inconnue est rapportée');
}

// TF-2122 (lot Produit-86 du 03/11/2026) — UNE INSTANCE LOCALE EN TLS AUTO-SIGNÉ. Le même commit servi en HTTP local
// passait ; en https avec le certificat du serveur de développement, rien n'était jugé. L'option
// --accepter-certificat-local accepte le certificat POUR LES HÔTES DE BOUCLE LOCALE SEULEMENT. Un vrai serveur https
// à certificat auto-signé est monté ici (certificat jetable, hors dépôt) : sans l'option l'oracle échoue et le dit,
// avec elle il juge l'écran, un hôte distant est refusé avant toute connexion, et une redirection vers un hôte
// distant est bloquée.
{
  console.log(String.fromCharCode(10) + 'oracle-exploitabilite · certificat auto-signé d\'une instance locale (TF-2122) — hôte local accepté, hôte distant refusé');
  const jouerOracle = (...a) => {
    const r = spawnSync(process.execPath, [path.join(ici, 'oracle-exploitabilite.mjs'), ...a, '--json-only'],
      { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
    let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
    return { code: r.status, json };
  };
  // Hôte distant : refusé avant toute connexion, donc sans réseau ni navigateur.
  for (const [cible, pourquoi] of [
    ['https://exemple.invalid/ecran', 'un hôte distant'],
    ['https://127.0.0.1.exemple.invalid/ecran', 'un nom qui COMMENCE par une adresse locale'],
    ['https://localhost.exemple.invalid/ecran', 'un sous-domaine de localhost'],
    ['https://127.0.0.1@exemple.invalid/ecran', 'une adresse locale placée en identifiant de l\'URL'],
  ]) {
    const ref = jouerOracle(cible, '--accepter-certificat-local');
    ligne(ref.code === 2 && ref.json?.verdict === 'SKIP' && (ref.json?.non_juge || []).some(n => /--accepter-certificat-local REFUSÉ pour .*bornée aux hôtes de boucle locale/.test(n)),
      `sens rouge · ${pourquoi} avec l'option : refusé, SKIP exit 2, rien jugé (obtenu ${ref.json?.verdict}, exit ${ref.code})`);
  }
  if (!OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  instance https locale jugée : outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
  } else {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tls-local-'));
    const cle = path.join(dossier, 'cle.pem'); const cert = path.join(dossier, 'cert.pem');
    const gen = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', cle, '-out', cert, '-days', '2',
      '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1'], { encoding: 'utf8' });
    if (gen.error || gen.status !== 0 || !fs.existsSync(cert)) {
      console.log(`  SKIP  instance https locale jugée : openssl indisponible pour fabriquer le certificat jetable (${gen.error?.message || (gen.stderr || '').trim().split(/\r?\n/).pop()})`);
    } else {
      const code = `const https=require('https');const fs=require('fs');const ecran=fs.readFileSync(${JSON.stringify(fx('exploitabilite-verte.html'))},'utf8');`
        + `const s=https.createServer({key:fs.readFileSync(${JSON.stringify(cle)}),cert:fs.readFileSync(${JSON.stringify(cert)})},(q,r)=>{`
        + `if(q.url==='/sortie'){r.writeHead(302,{Location:'https://exemple.invalid/x'});return r.end();}`
        + `if(q.url==='/vers-ecran'){r.writeHead(302,{Location:'/ecran'});return r.end();}`
        + `r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(ecran);});`
        + `s.listen(0,'127.0.0.1',()=>console.log(s.address().port));`;
      const serveur = spawn(process.execPath, ['-e', code], { stdio: ['ignore', 'pipe', 'ignore'] });
      try {
        const port = await new Promise((ok, ko) => {
          serveur.stdout.once('data', d => ok(Number(String(d).trim())));
          serveur.once('exit', () => ko(new Error('serveur https d\'essai arrêté')));
        });
        const base = `https://127.0.0.1:${port}`;
        const sans = jouerOracle(`${base}/ecran`);
        ligne(sans.code === 2 && sans.json?.verdict === 'SKIP' && (sans.json?.non_juge || []).some(n => /ERR_CERT/.test(n) && /--accepter-certificat-local/.test(n)),
          `sens rouge · sans l'option, le certificat auto-signé échoue et le remède est nommé : SKIP exit 2, jamais PASS (obtenu ${sans.json?.verdict}, exit ${sans.code})`);
        const avec = jouerOracle(`${base}/ecran`, '--accepter-certificat-local');
        ligne(avec.code === 0 && avec.json?.verdict === 'PASS' && !(avec.json?.non_juge || []).includes('aucun écran jugé')
          && (avec.json?.non_juge || []).some(n => /^certificat auto-signé accepté pour les hôtes de boucle locale seulement/.test(n)),
          `sens vert · avec l'option, l'écran servi en https local est jugé, la limite est dite au non_juge : PASS exit 0 (obtenu ${avec.json?.verdict}, exit ${avec.code})`);
        const localeRedirigee = jouerOracle(`${base}/vers-ecran`, '--accepter-certificat-local');
        ligne(localeRedirigee.code === 2 && (localeRedirigee.json?.findings || []).some(f => f.regle === 'X0' && /redirigé vers https:\/\/127\.0\.0\.1:\d+\/ecran/.test(f.msg))
          && !(localeRedirigee.json?.non_juge || []).some(n => /BLOQUÉE/.test(n)),
          `sens vert · une redirection vers une autre page LOCALE reste suivie, puis dite par X0 comme avant (écran non jugé), jamais bloquée (obtenu ${localeRedirigee.json?.verdict}, exit ${localeRedirigee.code})`);
        const sortie = jouerOracle(`${base}/sortie`, '--accepter-certificat-local');
        ligne(sortie.code === 2 && sortie.json?.verdict === 'SKIP' && (sortie.json?.non_juge || []).some(n => /BLOQUÉE\(S\).*exemple\.invalid/.test(n)),
          `sens rouge · une redirection vers un hôte distant est bloquée et nommée, rien n'est jugé : SKIP exit 2 (obtenu ${sortie.json?.verdict}, exit ${sortie.code})`);
        // Le point d'entrée transmet l'option à l'oracle.
        const agregat = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), fx('motion-verte.html'), '--instance', `${base}/ecran`, '--accepter-certificat-local', '--json-only'],
          { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
        let jAgregat = null; try { jAgregat = JSON.parse(agregat.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        const exploAgregat = (jAgregat?.oracles || []).find(o => o.oracle === 'oracle-exploitabilite');
        ligne(exploAgregat?.verdict === 'PASS' && (exploAgregat?.non_juge || []).some(n => /^certificat auto-signé accepté/.test(n)),
          `run-oracles-design · --accepter-certificat-local transmis à oracle-exploitabilite : joué et PASS (obtenu ${exploAgregat?.verdict})`);
        // Les deux autres juges qui LISENT l'instance par le réseau reçoivent l'option, sinon l'agrégat tombait en INDÉTERMINÉ.
        const lusParInstance = (jAgregat?.oracles || []).filter(o => o.oracle === 'oracle-faits-commerciaux');
        ligne(agregat.status === 0 && jAgregat?.verdict === 'PASS' && lusParInstance.length === 2 && lusParInstance.every(o => o.verdict === 'PASS'),
          `run-oracles-design · l'instance https locale est LUE par oracle-faits-commerciaux aussi : l'agrégat est PASS exit 0, pas INDÉTERMINÉ (obtenu ${jAgregat?.verdict}, exit ${agregat.status}, ${lusParInstance.map(o => o.verdict).join('/')})`);
        const sansOption = spawnSync(process.execPath, [path.join(ici, 'oracle-faits-commerciaux.mjs'), `${base}/ecran`, '--json-only'], { encoding: 'utf8' });
        let jSans = null; try { jSans = JSON.parse(sansOption.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        ligne(sansOption.status === 2 && jSans?.verdict === 'SKIP', `sens rouge · oracle-faits-commerciaux sans l'option : le certificat auto-signé reste refusé, SKIP exit 2 (obtenu ${jSans?.verdict})`);
        const distant = spawnSync(process.execPath, [path.join(ici, 'oracle-faits-commerciaux.mjs'), 'https://exemple.invalid/ecran', '--accepter-certificat-local', '--json-only'], { encoding: 'utf8' });
        let jDistant = null; try { jDistant = JSON.parse(distant.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        ligne(distant.status === 2 && jDistant?.verdict === 'SKIP' && JSON.stringify(jDistant).includes('CERTIFICAT_LOCAL_HOTE_NON_LOCAL'),
          `sens rouge · oracle-faits-commerciaux, hôte distant avec l'option : refusé (CERTIFICAT_LOCAL_HOTE_NON_LOCAL), SKIP exit 2 (obtenu ${jDistant?.verdict})`);
      } finally {
        serveur.kill();
        fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
      }
    }
  }
}

// TF-2111 (03/11/2026, calendrier du fournisseur croisé par TF-2109) — LA LISTE DES MODÈLES D'IMAGE EST UNE DONNÉE.
// scripts/generer-images.mjs portait un modèle déprécié en tête et deux modèles de repli ARRÊTÉS depuis le 25/06/2026.
// La liste se compose maintenant depuis references/MODELES-TIERS.json du pilot (loi n° 4), avec une liste en dur datée
// pour le cas où il est injoignable. Aucun appel à l'API n'est joué ici : `--lister-modeles` s'arrête avant la clé.
{
  console.log(String.fromCharCode(10) + 'scripts/generer-images.mjs (TF-2111) — modèles d\'image lus au calendrier, arrêtés refusés, aucun appel');
  const { composerListe, lireReferentiel, cheminReferentiel, PREFERES, REPLI } = await import('../scripts/lib/modeles-image.mjs');
  const referentielFx = fx('modeles-tiers-image.json');
  const ref = lireReferentiel(referentielFx);
  const ARRETES_FX = ['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'];
  const liste = composerListe({ referentiel: ref, aujourdhui: '2026-11-04' });
  ligne(ref.ok && JSON.stringify(liste.modeles) === JSON.stringify(['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image', 'gemini-3-pro-image']) && liste.avertissements.length === 0,
    `sens vert · référentiel lu : les seuls modèles d'image « courants », le remplaçant courant d'abord (obtenu ${liste.modeles.join(', ')})`);
  ligne(!liste.modeles.some(m => ARRETES_FX.includes(m)) && !liste.modeles.includes('gemini-3.1-flash-image') && !liste.modeles.includes('gemini-2.5-flash-image') && !liste.modeles.includes('gemini-3.8-flash'),
    'sens vert · ni arrêté, ni déprécié, ni modèle de texte dans la liste');
  const refuse = composerListe({ explicite: 'gemini-3.1-flash-image-preview', referentiel: ref, aujourdhui: '2026-11-04' });
  ligne(/ARRÊTÉ depuis le 2026-06-25/.test(refuse.refus || '') && /gemini-nano-banana-2\.1/.test(refuse.refus || '') && /aucun appel/.test(refuse.refus || ''),
    'sens rouge · --modele arrêté : refusé avec sa date d\'arrêt et son remplaçant, avant tout appel');
  const deprecie = composerListe({ explicite: 'gemini-3.1-flash-image', referentiel: ref, aujourdhui: '2026-11-04' });
  ligne(!deprecie.refus && deprecie.modeles[0] === 'gemini-3.1-flash-image' && deprecie.avertissements.some(a => /déprécié.*remplaçant « gemini-nano-banana-2\.1 »/.test(a)),
    'sens vert · --modele déprécié : admis, premier de la liste, avertissement avec son remplaçant');
  const inconnu = composerListe({ explicite: 'gemini-futur-image', referentiel: ref, aujourdhui: '2026-11-04' });
  ligne(!inconnu.refus && inconnu.avertissements.some(a => /absent du calendrier lu/.test(a)), 'sens vert · --modele absent du calendrier : admis, avertissement « non vérifié »');
  const absent = composerListe({ referentiel: lireReferentiel(path.join(os.tmpdir(), 'modeles-tiers-absent-tf2111.json')), aujourdhui: '2026-11-04' });
  ligne(JSON.stringify(absent.modeles) === JSON.stringify(REPLI.modeles) && /liste en dur du 2026-11-03/.test(absent.source) && absent.avertissements.some(a => /introuvable.*liste en dur datée du 2026-11-03/.test(a)),
    'sens vert · référentiel injoignable : liste en dur datée et sourcée, et le repli est dit');
  ligne(REPLI.source.includes('deprecations.md.txt') && /^\d{4}-\d{2}-\d{2}$/.test(REPLI.lu_le), 'sens vert · la liste en dur porte sa date et sa source');
  const perimee = composerListe({ referentiel: ref, aujourdhui: '2026-12-10' });
  ligne(perimee.avertissements.some(a => /la liste date du 2026-11-03 \(37 jours\)/.test(a)), 'sens rouge · une liste de plus de 30 jours est dite périmée (même seuil que MT4 du pilot)');
  const sansImage = composerListe({ referentiel: { ok: true, date: '2026-11-03', chemin: 'x', modeles: [{ id: 'gemini-3.8-flash', famille: 'texte', etat: 'courant' }] }, aujourdhui: '2026-11-04' });
  ligne(JSON.stringify(sansImage.modeles) === JSON.stringify(REPLI.modeles) && sansImage.avertissements.some(a => /aucun modèle d'image/.test(a)),
    'sens vert · un référentiel sans modèle d\'image courant ne vide pas la liste : repli dit');
  // Le script de bout en bout, SANS clé dans l'environnement : la liste s'imprime, aucun appel n'est possible.
  const envSansCle = { ...process.env, GEMINI_API_KEY: '' };
  const cli = (...a) => spawnSync(process.execPath, [path.join(ici, '..', 'scripts', 'generer-images.mjs'), ...a], { encoding: 'utf8', env: envSansCle });
  const dry = cli('--lister-modeles', '--referentiel', referentielFx);
  let jDry = null; try { jDry = JSON.parse(dry.stdout); } catch { /* illisible : la ligne le dira */ }
  ligne(dry.status === 0 && jDry?.modeles?.[0] === 'gemini-nano-banana-2.1' && jDry.modeles.length === 3,
    `script · --lister-modeles : liste imprimée exit 0 sans clé ni page, donc sans appel possible (obtenu exit ${dry.status}, ${jDry?.modeles?.length} modèles)`);
  const refCli = cli('--lister-modeles', '--modele', 'gemini-3-pro-image-preview', '--referentiel', referentielFx);
  ligne(refCli.status === 2 && /refus : le modèle « gemini-3-pro-image-preview » est ARRÊTÉ/.test(refCli.stderr), `script · --modele arrêté : exit 2 et motif, rien n'est appelé (obtenu exit ${refCli.status})`);
  const horsLigne = cli('--lister-modeles', '--referentiel', path.join(os.tmpdir(), 'modeles-tiers-absent-tf2111.json'));
  ligne(horsLigne.status === 0 && /liste en dur du 2026-11-03/.test(horsLigne.stdout) && /introuvable/.test(horsLigne.stderr), 'script · référentiel absent : liste en dur imprimée exit 0, repli dit sur stderr');
  // Le garde-fou : aucun identifiant arrêté ou déprécié dans le code, le modèle d'exemple ou la liste en dur — contre le VRAI calendrier du pilot.
  const sourcesModeles = ['scripts/generer-images.mjs', 'scripts/lib/modeles-image.mjs', '.env.example'];
  const arretesDe = (referentiel, texte) => referentiel.modeles.filter(m => m.famille === 'image' && (m.etat === 'arrete') && texte.includes(m.id)).map(m => m.id);
  const rouge = arretesDe(ref, 'const MODELES = ["gemini-3.1-flash-image", "gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview"];');
  ligne(rouge.length === 2 && ARRETES_FX.every(m => rouge.includes(m)), 'sens rouge · l\'ancienne liste en dur est reconnue : ses deux modèles arrêtés sont dénoncés par le garde-fou');
  const vrai = lireReferentiel(cheminReferentiel());
  if (!vrai.ok) {
    console.log(`  SKIP  garde-fou contre le calendrier du pilot : ${vrai.raison}`);
  } else {
    for (const f of sourcesModeles) {
      const trouves = arretesDe(vrai, fs.readFileSync(path.join(ici, '..', f), 'utf8'));
      ligne(trouves.length === 0, `sens vert · ${f} ne cite aucun modèle d'image arrêté au calendrier du pilot (${vrai.date}) (obtenu ${trouves.join(', ') || 'aucun'})`);
    }
    const mauvais = PREFERES.concat(REPLI.modeles).filter(id => { const m = vrai.modeles.find(x => x.id === id); return m && m.etat !== 'courant'; });
    ligne(mauvais.length === 0, `sens vert · les modèles préférés et la liste en dur sont « courants » au calendrier du pilot (${vrai.date}) (obtenu hors courant : ${mauvais.join(', ') || 'aucun'})`);
  }
}

// TF-2074 — CHAQUE RÈGLE DE LISIBILITÉ À 16 PX SE DÉCLENCHE POUR SA RAISON, ET LE REMÈDE QU'ELLE PRESCRIT PASSE. Le banc
// des CAS exige que toutes les règles d'une rouge se déclenchent ; il ne dit pas qu'une rouge ne déclenche QUE la sienne.
// Ici : la fusion ne déclenche pas LP1 (rien n'est fin), le contraste ne déclenche ni LP1 ni LP2 ; le remède de LP3 (un fond
// sur lequel le gris clair contraste) et celui de LP1 (épaissir le filet) sont joués et passent ; LP4 « marge » et LP5 sont
// des avertissements, jamais un échec.
{
  console.log(String.fromCharCode(10) + 'oracle-logo-petit (TF-2074) — une règle par raison, remèdes joués');
  if (!OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
  } else {
    const jouer = (fichier, ...a) => {
      const r = spawnSync(process.execPath, [path.join(ici, 'oracle-logo-petit.mjs'), fichier, ...a, '--json-only'],
        { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
      let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
      return { code: r.status, json, regles: new Set((json?.findings || []).filter(f => f.sev === 'bloquant' || f.sev === 'majeur').map(f => f.regle)) };
    };
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-petit-'));
    try {
      const verte = fs.readFileSync(fx('logo-petit-verte.svg'), 'utf8');
      const fusion = jouer(fx('logo-petit-rouge-fusion.svg'));
      ligne(fusion.code === 1 && fusion.regles.has('LP2') && !fusion.regles.has('LP1') && !fusion.regles.has('LP4'),
        `fusion · LP2 seule en dur : deux barres soudées et un trou rebouché, rien n'est fin, rien ne disparaît (obtenu ${[...fusion.regles].join(' ')})`);
      const contraste = jouer(fx('logo-petit-rouge-contraste.svg'), '--fond', '#FFFFFF');
      ligne(contraste.code === 1 && contraste.regles.has('LP3') && !contraste.regles.has('LP1') && !contraste.regles.has('LP2'),
        `contraste · LP3 seule en dur : la géométrie est celle de la verte (obtenu ${[...contraste.regles].join(' ')})`);
      const remedeFond = jouer(fx('logo-petit-rouge-contraste.svg'), '--fond', '#0B0F14');
      ligne(remedeFond.code === 0 && remedeFond.json?.verdict === 'PASS',
        `remède LP3 · le même gris clair sur un fond sombre (#0B0F14) : PASS exit 0 (obtenu ${remedeFond.json?.verdict}, exit ${remedeFond.code})`);
      const sansFond = jouer(fx('logo-petit-rouge-contraste.svg'));
      ligne(sansFond.code === 0 && (sansFond.json?.non_juge || []).some(n => /^LP3 .* non jouée : aucun --fond fourni/.test(n)),
        'sans --fond · LP3 n\'est pas jouée et le non_juge le dit, jamais un PASS de contraste muet');
      // Remède de LP1 : le même tracé en filet de 3 unités (0,19 px à 16 px) est refusé, épaissi à 40 unités (2,5 px) il passe.
      const trace = ep => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M40 224 L128 40 L216 224" fill="none" stroke="#14202B" stroke-width="${ep}" stroke-linejoin="miter" stroke-linecap="butt"/></svg>`;
      const fin = path.join(dossier, 'fin.svg'); const epais = path.join(dossier, 'epais.svg');
      fs.writeFileSync(fin, trace(3), 'utf8'); fs.writeFileSync(epais, trace(40), 'utf8');
      const avantRemede = jouer(fin);
      ligne(avantRemede.code === 1 && avantRemede.regles.has('LP1'), `remède LP1 · avant : le tracé en filet de 3 unités est refusé (obtenu ${avantRemede.json?.verdict}, ${[...avantRemede.regles].join(' ')})`);
      const remedeTrait = jouer(epais);
      ligne(remedeTrait.code === 0 && remedeTrait.json?.verdict === 'PASS' && !remedeTrait.regles.has('LP1') && !remedeTrait.regles.has('LP4'),
        `remède LP1 · après : le même tracé épaissi à 40 unités (2,5 px à 16 px) passe (obtenu ${remedeTrait.json?.verdict}, ${[...remedeTrait.regles].join(' ') || 'aucune dure'})`);
      // LP5 : du texte vivant se dit, sans faire échouer.
      const texte = path.join(dossier, 'texte.svg');
      fs.writeFileSync(texte, verte.replace('</svg>', '<text x="0" y="0" font-size="1">.</text></svg>'), 'utf8');
      const t = jouer(texte);
      ligne(t.code === 0 && (t.json?.findings || []).some(f => f.regle === 'LP5' && f.sev === 'avertissement'),
        `LP5 · un <text> est un avertissement, le verdict reste PASS (obtenu ${t.json?.verdict})`);
      // LP4 marge : le même logo dans un viewBox cinq fois plus grand ne tient que sur ~3 px.
      const marge = path.join(dossier, 'marge.svg');
      fs.writeFileSync(marge, verte.replace('viewBox="0 0 256 256"', 'viewBox="-512 -512 1280 1280"'), 'utf8');
      const m = jouer(marge);
      ligne((m.json?.findings || []).some(f => f.regle === 'LP4' && f.sev === 'avertissement' && /marge excessive/.test(f.msg)),
        'LP4 · un logo noyé dans la marge de son viewBox est signalé (avertissement)');
      // LP2 limite : un trou d'un seul pixel à 16 px survit, mais à la limite — avertissement, jamais un échec (cas du concept B de l'essai).
      const limite = path.join(dossier, 'limite.svg');
      fs.writeFileSync(limite, verte.replace('M112 112 V144 H144 V112 Z', 'M112 112 V128 H128 V112 Z'), 'utf8');
      const l = jouer(limite);
      ligne(l.code === 0 && (l.json?.findings || []).some(f => f.regle === 'LP2' && f.sev === 'avertissement' && /un trou ne survit que sur 1 pixel/.test(f.msg)),
        `LP2 limite · un trou de 1 px à 16 px est signalé en avertissement, le verdict reste PASS (obtenu ${l.json?.verdict})`);
      ligne(!(jouer(fx('logo-petit-verte.svg')).json?.findings || []).some(f => f.regle === 'LP2'), 'LP2 limite · la verte (trou de 2 px) ne porte aucun avertissement de trou');
      // Entrées refusées : pas de .svg, fichier absent, fond illisible — SKIP exit 2, jamais PASS.
      const html = jouer(fx('motion-verte.html'));
      ligne(html.code === 2 && html.json?.verdict === 'SKIP', `entrée · un fichier qui n'est pas un .svg : SKIP exit 2 (obtenu ${html.json?.verdict}, exit ${html.code})`);
      const fondIllisible = jouer(fx('logo-petit-verte.svg'), '--fond', 'rouge-ish');
      ligne(fondIllisible.code === 2 && fondIllisible.json?.verdict === 'SKIP', `entrée · --fond illisible : SKIP exit 2 (obtenu ${fondIllisible.json?.verdict}, exit ${fondIllisible.code})`);
      // --sortie écrit les PNG que l'œil regardera.
      const sortieDossier = path.join(dossier, 'png');
      const avecSortie = jouer(fx('logo-petit-verte.svg'), '--sortie', sortieDossier);
      ligne(avecSortie.code === 0 && fs.existsSync(path.join(sortieDossier, 'logo-petit-verte-16.png')) && fs.existsSync(path.join(sortieDossier, 'logo-petit-verte-32.png')),
        '--sortie · les rendus à 16 et 32 px sont écrits en PNG pour être regardés');
    } finally {
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// TF-2073 (décision D-156 (a) du 03/11/2026, essai) — RIEN NE GUIDAIT UN PRODUIT QUI N'A PAS ENCORE DE LOGO. La branche « produit
// sans logo » de systeme-de-marque reprend la MÉTHODE de logo-design-skill (MIT), sans sa bibliothèque de 1 432 logos d'autrui.
// C'est de la doctrine écrite, pas une règle d'oracle : sans verrou, le prochain remaniement l'efface sans que rien ne rougisse.
// Chaque point est lu dans les deux sens — le texte réel le porte, le même texte amputé du point est refusé.
{
  console.log(String.fromCharCode(10) + 'skill systeme-de-marque (TF-2073) — branche « produit sans logo », méthode reprise, bibliothèque non installée');
  const plat = t => t.replace(/\s+/g, ' ');
  const dossierSkill = path.join(ici, '..', 'skills', 'systeme-de-marque');
  const branche = plat(fs.readFileSync(path.join(dossierSkill, 'references', 'produit-sans-logo.md'), 'utf8'));
  const skill = plat(fs.readFileSync(path.join(dossierSkill, 'SKILL.md'), 'utf8'));
  const POINTS = {
    cliches: /liste des clichés de la catégorie/i,
    troisConcepts: /trois concepts d'idées différentes[\s\S]{0,400}ne\s+peuvent pas se décrire par la même phrase/i,
    familiarite: /test de familiarité, avant de dessiner[\s\S]{0,700}est remplacé, pas retouché/i,
    etagere: /épreuve de l'étagère[\s\S]{0,500}se fond dans l'étagère est écarté/i,
    revueHumaine: /arrêt pour revue humaine[\s\S]{0,300}arbitre des \*{0,2}images/i,
    lectureEnPetit: /oracle-logo-petit\.mjs[\s\S]{0,300}Regarder les PNG/i,
    attributionMit: /logo-design-skill[^.]{0,120}licence MIT[^.]{0,120}version 1\.4\.5/i,
    bibliothequeNonInstallee: /ne s'installe pas[\s\S]{0,200}bibliothèque de 1 432 logos[\s\S]{0,400}TRADEMARKS\.md/i,
  };
  const AMPUTE = {
    cliches: t => t.replace(/clichés de la catégorie/gi, 'habitudes'),
    troisConcepts: t => t.replace(/ne peuvent pas se décrire par la même phrase/gi, 'peuvent se ressembler'),
    familiarite: t => t.replace(/est remplacé, pas retouché/gi, 'est retouché'),
    etagere: t => t.replace(/se fond dans l'étagère est écarté/gi, 'se fond dans l\'étagère est gardé'),
    revueHumaine: t => t.replace(/arbitre des \*{0,2}images\*{0,2}/gi, 'lit la description'),
    lectureEnPetit: t => t.replace(/Regarder les PNG/gi, 'Lire le verdict'),
    attributionMit: t => t.replace(/licence MIT/gi, 'licence libre'),
    bibliothequeNonInstallee: t => t.replace(/ne s'installe pas/gi, 's\'installe'),
  };
  for (const [nom, motif] of Object.entries(POINTS)) {
    ligne(motif.test(branche), `sens vert · references/produit-sans-logo.md écrit le point « ${nom} »`);
    ligne(!motif.test(AMPUTE[nom](branche)), `sens rouge · references/produit-sans-logo.md amputé du point « ${nom} » est refusé`);
  }
  // Le SKILL.md aiguille vers la branche, et le fichier existe : une affordance câblée ou inexistante (loi n° 1).
  const renvoi = t => /produit-sans-logo\.md/.test(t) && /Sans logo/i.test(t);
  ligne(renvoi(skill), 'sens vert · SKILL.md aiguille vers references/produit-sans-logo.md (quick start et table des références)');
  ligne(!renvoi(skill.replace(/produit-sans-logo\.md/g, 'autre.md')), 'sens rouge · SKILL.md dont le renvoi pointe ailleurs est refusé');
  const frontmatter = /^---\s*([\s\S]*?)---/.exec(fs.readFileSync(path.join(dossierSkill, 'SKILL.md'), 'utf8'))?.[1] || '';
  const description = /^description:\s*(.*)$/m.exec(frontmatter)?.[1] || '';
  ligne(description.length > 0 && description.length <= 1024 && /sans logo/i.test(description),
    `sens vert · la description du skill (${description.length} caractères, limite 1 024) annonce le cas « sans logo »`);
}

// TF-1662 — L'ÉCART PAR STRUCTURE SE PERD DÈS QUE LE SOUS-ARBRE EST RÉACTIVÉ. Une infobulle en
// pointer-events: none dont un descendant repasse en pointer-events: auto peut porter un lien
// focalisable : ses surfaces redeviennent des fonds d'anneau. Page écrite ici, dérivée de la verte.
{
  console.log(String.fromCharCode(10) + 'oracle-tokens T8 (TF-1662) — un sous-arbre inerte réactivé redevient jugé');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 't8-reactive-'));
  try {
    const page = path.join(dossier, 'reactive.html');
    fs.writeFileSync(page, fs.readFileSync(fx('tokens-t8-infobulle-verte.html'), 'utf8')
      .replace('</style>', '  .infobulle code a { pointer-events: auto; }\n</style>'), 'utf8');
    const r = spawnSync(process.execPath, [path.join(ici, 'oracle-tokens.mjs'), page, '--json-only'], { encoding: 'utf8' });
    let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
    ligne(r.status === 1 && (j?.findings || []).some(f => f.regle === 'T8' && f.sev === 'majeur' && /--tt-code-bg/.test(f.msg)),
      `sens rouge · descendant réactivé (pointer-events: auto) : --tt-code-bg de nouveau confronté à l'anneau, T8 majeur (obtenu ${j?.verdict}, exit ${r.status})`);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1772 (lot Produit-83 du 15/10) — UN COMMENTAIRE N'EST PAS UN COMPOSANT. Le mot « ::backdrop »
// cité dans un commentaire de tokens.css faisait lancer oracle-surcouche sur une page sans aucune
// sur-couche : SKIP, et le verdict agrégé tombait en SKIP exit 2. Deux sens : le commentaire ne
// déclenche rien, la règle CSS réelle déclenche toujours.
{
  console.log(String.fromCharCode(10) + 'run-oracles-design.mjs (TF-1772) — la détection de sur-couche ignore les commentaires');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'surcouche-commentaire-'));
  try {
    const base = fs.readFileSync(fx('tokens-verte.html'), 'utf8');
    const commente = path.join(dossier, 'commente.html');
    const reel = path.join(dossier, 'reel.html');
    fs.writeFileSync(commente, base.replace('</style>', '  /* le voile ::backdrop des dialogues hérite de --fond ; <dialog> à venir */\n</style>'), 'utf8');
    fs.writeFileSync(reel, base.replace('</style>', '  dialog::backdrop { background: rgba(0, 0, 0, .5); }\n</style>'), 'utf8');
    const jouer = page => {
      const r = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), page, '--json-only'], { encoding: 'utf8' });
      let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
      return (j?.oracles || []).map(o => o.oracle);
    };
    const c = jouer(commente);
    ligne(c.length > 0 && !c.includes('oracle-surcouche'), `sens vert · ::backdrop cité en commentaire : oracle-surcouche non lancé (lancés : ${c.join(' ')})`);
    const r = jouer(reel);
    ligne(r.includes('oracle-surcouche'), `sens rouge · règle dialog::backdrop réelle : oracle-surcouche lancé (lancés : ${r.join(' ')})`);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-2092 (lot Produit-86 du 03/11) — UN SCRIPT QUI CITE « DIALOG » N'EST PAS UNE SUR-COUCHE. Récidive de
// TF-1772 par une autre voie : le lanceur cherchait `showModal(`, `role="dialog"`, `<dialog` dans le TEXTE
// de la page, script compris. Une mire de connexion ou une 404 anonyme sans aucun <dialog>, dont le script
// cite ces mots dans une chaîne ou un test de capacité, lançait oracle-surcouche : SKIP (rien à juger), et
// l'agrégat tombait en SKIP exit 2. La sur-couche se décide sur l'ARBRE : élément <dialog>, attribut
// popover, role="dialog" ou "alertdialog", y compris dans un gabarit de script (que l'oracle juge), ou
// règle ::backdrop d'une feuille de style. Deux sens : le texte d'un script ne lance rien, l'arbre lance toujours.
{
  console.log(String.fromCharCode(10) + 'run-oracles-design.mjs (TF-2092) — la sur-couche se décide sur l\'arbre DOM, pas sur le texte d\'un script');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'surcouche-script-'));
  try {
    const base = fs.readFileSync(fx('tokens-verte.html'), 'utf8');
    const avecScript = js => base.replace('</body>', `<script>${js}</script></body>`);
    const avecCorps = (corps, js = '') => base.replace('</body>', `${corps}${js ? `<script>${js}</script>` : ''}</body>`);
    const jouer = (nom, contenu) => {
      const page = path.join(dossier, nom + '.html');
      fs.writeFileSync(page, contenu, 'utf8');
      const r = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), page, '--json-only'], { encoding: 'utf8' });
      let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
      const sc = (j?.oracles || []).find(o => o.oracle === 'oracle-surcouche');
      return { lances: (j?.oracles || []).map(o => o.oracle), surcouche: sc?.verdict, verdict: j?.verdict, code: r.status };
    };
    const sansSurcouche = {
      'chaîne role="dialog" dans un script': avecScript('const sel = \'[role="dialog"]\'; document.querySelector(sel);'),
      'appel showModal( dans un script': avecScript('function ouvrir(d) { d.showModal(); }'),
      'chaîne <dialog> dans un script': avecScript('const html = \'<dialog open>x</dialog>\';'),
      'chaîne dialog::backdrop dans un script': avecScript('const regle = "dialog::backdrop { background: red }";'),
      'mot popover> dans un script': avecScript('const t = "un popover> ici";'),
      'balise <dialog> dans un commentaire HTML': avecCorps('<!-- <dialog>à venir</dialog> -->'),
    };
    for (const [nom, page] of Object.entries(sansSurcouche)) {
      const r = jouer('sans-' + Object.keys(sansSurcouche).indexOf(nom), page);
      ligne(!r.lances.includes('oracle-surcouche') && r.surcouche !== 'SKIP',
        `sens vert · ${nom}, aucun élément de sur-couche : oracle-surcouche non lancé, pas de SKIP (lancés : ${r.lances.join(' ')})`);
    }
    const avecSurcouche = {
      '<dialog> dans le DOM, script qui le cite': avecCorps('<dialog id="d">x</dialog>', 'document.getElementById("d").showModal();'),
      '[popover] dans le DOM': avecCorps('<div popover id="p">x</div>'),
      'role="dialog" dans le DOM': avecCorps('<div role="dialog" aria-label="x">x</div>'),
      'role="alertdialog" dans le DOM': avecCorps('<div role="alertdialog" aria-label="x">x</div>'),
      '<dialog> dans un gabarit de script': avecScript('const vue = () => `<dialog id="d"><p>x</p></dialog>`;'),
    };
    for (const [nom, page] of Object.entries(avecSurcouche)) {
      const r = jouer('avec-' + Object.keys(avecSurcouche).indexOf(nom), page);
      ligne(r.lances.includes('oracle-surcouche'), `sens rouge · ${nom} : oracle-surcouche lancé (lancés : ${r.lances.join(' ')})`);
    }
    // La mire de connexion du retour : page sans sur-couche, script qui cite le mot, aucun autre échec.
    // Base : une page dont tous les autres juges passent, pour que l'agrégat ne puisse tomber QUE sur ce SKIP.
    const propre = fs.readFileSync(fx('declencheurs-verte.html'), 'utf8');
    const mire = jouer('mire', propre.replace('</body>', '<script>if (typeof HTMLDialogElement === "undefined") { document.body.dataset.dialog = "absent"; }\n'
      + 'const roleDialog = \'role="dialog"\'; window.fermer = d => d.showModal();</script></body>'));
    ligne(mire.verdict === 'PASS' && mire.code === 0 && !mire.lances.includes('oracle-surcouche'),
      `sens vert · mire de connexion (script qui cite dialog, aucun <dialog>) : agrégat PASS exit 0, sans SKIP (obtenu ${mire.verdict}, exit ${mire.code})`);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-2102 — LES CAS PROPRES DE L'ORACLE DE TEXTES NE PROTÈGENT RIEN TANT QU'ILS NE SONT PAS JOUÉS. oracle-textes-application porte ses
// propres cas (`--self-test` : 52 dont les bornes de TF-1762, TF-1773, TF-1910 et TF-2102), que cette recette
// ne rejouait pas : un cas pouvait passer au rouge sans que rien ne le dise. Elle les rejoue maintenant.
{
  console.log(String.fromCharCode(10) + 'oracle-textes-application.mjs — ses cas propres (--self-test) sont rejoués par la recette');
  const r = spawnSync(process.execPath, [path.join(ici, 'oracle-textes-application.mjs'), '--self-test'], { encoding: 'utf8' });
  const m = /: (\d+) PASS, (\d+) FAIL/.exec(r.stdout || '');
  ligne(r.status === 0 && m && Number(m[2]) === 0 && Number(m[1]) >= 52,
    `cas propres de l'oracle : ${m ? m[1] + ' PASS, ' + m[2] + ' FAIL' : 'sortie illisible'} (exit ${r.status})`);
}

// RECETTE ROUGE DEPUIS oracles/ (constat du 29/10/2026, cause trouvée le 02/11/2026) — l'en-tête du
// dérivé se comparait au chemin vu du dossier courant et le socle de D4 s'y cherchait : 5 faux
// échecs, dont un D4 non jugé. Trois dossiers de lancement, un seul verdict ; et la correction
// n'ouvre pas la porte que TF-1035 a fermée : un en-tête figé sur un autre fichier reste refusé.
{
  console.log(String.fromCharCode(10) + 'oracle-dtcg.mjs — le verdict ne dépend pas du dossier de lancement');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'dtcg-dossier-'));
  try {
    const jouer = (source, derive, cwd) => {
      const r = spawnSync(process.execPath, [path.join(ici, 'oracle-dtcg.mjs'), source, derive, '--json-only'], { encoding: 'utf8', cwd });
      let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
      return { verdict: j?.verdict, regles: (j?.findings || []).map(f => f.regle) };
    };
    const paire = f => [fx(f + '.tokens.json'), fx(f + '.css')];
    for (const [nom, cwd] of [['la racine de la forge', path.dirname(ici)], ['oracles/', ici], ['hors du dépôt', dossier]]) {
      ligne(jouer(...paire('dtcg-verte'), cwd).verdict === 'PASS', `depuis ${nom} · dérivé à jour : PASS`);
      ligne(jouer(...paire('dtcg-fraicheur-verte'), cwd).verdict === 'PASS', `depuis ${nom} · socle inchangé : PASS`);
      ligne(jouer(...paire('dtcg-fraicheur-rouge'), cwd).regles.includes('D4'), `depuis ${nom} · socle changé : D4 jugé et déclenché`);
    }
    const sous = path.join(dossier, 'corpus');
    fs.mkdirSync(sous);
    fs.copyFileSync(fx('dtcg-verte.tokens.json'), path.join(sous, 'x.tokens.json'));
    spawnSync(process.execPath, [path.join(ici, '..', 'scripts', 'generer-tokens-css.mjs'), 'corpus/x.tokens.json', '--sortie', 'corpus/x.css'], { encoding: 'utf8', cwd: dossier });
    const [source, derive] = [path.join(sous, 'x.tokens.json'), path.join(sous, 'x.css')];
    ligne(jouer(source, derive, ici).verdict === 'PASS', 'dérivé régénéré ailleurs, juste : PASS');
    fs.writeFileSync(derive, fs.readFileSync(derive, 'utf8').replaceAll('corpus/x.tokens.json', 'corpus/tokens-digit-ai.tokens.json'), 'utf8');
    const fige = jouer(source, derive, dossier);
    ligne(fige.verdict === 'FAIL' && fige.regles.includes('D3'), `sens rouge · en-tête figé sur un autre fichier : D3 (obtenu ${fige.verdict})`);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1774 (lot Produit-83 du 15/10) — LA CASCADE DÉCIDE, PAS L'ORDRE DU FICHIER. PC3 et PC2 lisaient
// la couleur d'un `a.btn` hors du pied de page dans la règle `.pied a` (ancêtre non vérifié, ordre
// source seul) : 1,22:1 à tort. Les pages sont écrites ici ; trois sens : ancêtre absent, règle moins
// spécifique placée après, et la vraie faute (`.pied a.btn` sur un bouton DANS le pied) qui échoue.
{
  console.log(String.fromCharCode(10) + 'oracle-perceptibilite PC2/PC3 (TF-1774) — ancêtres et spécificité appliqués');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'perceptibilite-cascade-'));
  try {
    const page = (css, corps) => '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>cascade</title><style>'
      + 'body { background: #ffffff; color: #111111; }\n'
      + 'a.btn { color: #ffffff; background: #1d4ed8; min-width: 44px; min-height: 44px; }\n'
      + 'a.btn:hover { background: #1e40af; }\n' + css + '</style></head><body>' + corps + '</body></html>';
    const bouton = '<a class="btn" href="#commande" data-exigence="E-001">Commander</a>';
    const cas = {
      ancetre: page('.pied { background: #1e293b; }\n.pied a { color: #26303f; min-height: 16px; }\n',
        `<main>${bouton}</main><footer class="pied"><a href="#mentions">Mentions</a></footer>`),
      specificite: page('a { color: #1e3a8a; }\n', `<main>${bouton}</main>`),
      faute: page('.pied a.btn { color: #26303f; }\n', `<footer class="pied">${bouton}</footer>`),
    };
    const jouer = nom => {
      const f = path.join(dossier, nom + '.html');
      fs.writeFileSync(f, cas[nom], 'utf8');
      const r = spawnSync(process.execPath, [path.join(ici, 'oracle-perceptibilite.mjs'), f, '--json-only'], { encoding: 'utf8' });
      let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
      return { code: r.status, regles: (j?.findings || []).filter(x => x.sev === 'bloquant').map(x => x.regle) };
    };
    const a = jouer('ancetre');
    ligne(a.code === 0 && !a.regles.includes('PC3') && !a.regles.includes('PC2'),
      `sens vert · .pied a ne s'applique pas à un a.btn hors du pied : ni PC3 ni PC2 (exit ${a.code}, ${a.regles.join(' ') || 'aucun'})`);
    const s = jouer('specificite');
    ligne(s.code === 0 && !s.regles.includes('PC3'),
      `sens vert · « a » placé après « a.btn » perd à la spécificité : pas de PC3 (exit ${s.code}, ${s.regles.join(' ') || 'aucun'})`);
    const f = jouer('faute');
    ligne(f.code === 1 && f.regles.includes('PC3'),
      `sens rouge · .pied a.btn sur un bouton DANS le pied : PC3 bloquant (exit ${f.code}, ${f.regles.join(' ') || 'aucun'})`);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1771 (lot Produit-83 du 15/10) — DEUX RÈGLES DU SOCLE INCONCILIABLES. generer-tokens-css.mjs
// émettait `@media (prefers-color-scheme: dark)`, que check_html G1 refuse en bloquant au nom de
// R-30 (clair par défaut STRICT, amendement TF-0158 du 13/08) : tout tokens.css généré par la forge
// faisait échouer la page qui l'embarque. C'est le générateur qui cède, la règle est décidée. Deux
// sens : le dérivé ne pilote plus le thème par l'OS (et G1 ne le refuse plus, si le socle est là),
// et la bascule manuelle garde sa palette sombre.
{
  console.log(String.fromCharCode(10) + 'scripts/generer-tokens-css.mjs (TF-1771) — clair strict, sombre par la bascule seule');
  const { genererCss } = await import('../scripts/generer-tokens-css.mjs');
  const source = fx('dtcg-verte.tokens.json');
  const derive = genererCss(JSON.parse(fs.readFileSync(source, 'utf8')), source, fx('dtcg-verte.css'));
  const actif = derive.replace(/\/\*[\s\S]*?\*\//g, ' ');
  ligne(!/prefers-color-scheme/i.test(actif), 'sens vert · le dérivé ne contient aucun prefers-color-scheme actif (R-30, TF-0158)');
  ligne(/:root\[data-theme="dark"\]\s*\{[^}]*color-scheme:\s*dark/.test(actif), 'sens rouge gardé · la palette sombre vit sous :root[data-theme="dark"], color-scheme: dark compris');
  const checkHtml = path.join(os.homedir(), '.claude', 'skills', 'digit-ai-page-html', 'scripts', 'check_html.py');
  if (!PYTHON || !fs.existsSync(checkHtml)) {
    console.log('  SKIP  check_html.py G1 : socle digit-ai-page-html ou python absent');
  } else {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-g1-'));
    try {
      const page = path.join(dossier, 'page.html');
      fs.writeFileSync(page, '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Jetons</title><style>\n'
        + derive + '\n</style></head><body><main><h1>Jetons</h1><p>Texte.</p></main></body></html>', 'utf8');
      const r = spawnSync(PYTHON, [checkHtml, page, '--output', 'json', '--regles', 'charte'], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
      const auto = /G1 auto-sombre/.test(r.stdout || '');
      ligne(!auto, `sens vert · check_html G1 ne refuse plus la page qui embarque le dérivé (auto-sombre ${auto ? 'refusé' : 'absent'})`);
    } finally {
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// TF-1776 (lot Produit-83 du 15/10) — UNE MAQUETTE D'APPLICATION JUGÉE COMME UNE PAGE. check_html
// refusait en bloquant (L25, h1 unique) une maquette multi-écrans écrite au contrat de cette forge,
// qui ne disait pas l'issue que le socle prévoit (barre d'onglets role="tablist", TF-1626). C16 de
// check_maquette l'annonce en avertissement, avant le socle. Deux sens, sur la même page hôte.
{
  console.log(String.fromCharCode(10) + 'check_maquette.py C16 (TF-1776) — structure multi-écrans au socle');
  if (!PYTHON) {
    console.log('  SKIP  interpréteur python introuvable dans le PATH (python / python3)');
  } else {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'maquette-c16-'));
    try {
      const hote = fs.readFileSync(fx('maquette-vendor-verte.html'), 'utf8');
      const ecrans = ['tableau', 'dossiers', 'factures', 'clients'];
      const sections = h => ecrans.map(e => `<section id="ecran-${e}" role="tabpanel"><${h}>Écran ${e}</${h}></section>`).join('');
      const menu = ecrans.map(e => `<a href="#ecran-${e}" data-action="ouvrir">${e}</a>`).join('');
      const onglets = ecrans.map(e => `<a role="tab" href="#ecran-${e}" aria-controls="ecran-${e}" aria-label="Ouvrir l'écran ${e}">${e}</a>`).join('');
      const pages = {
        rouge: hote.replace('</body>', `<nav aria-label="Menu">${menu}</nav>${sections('h1')}</body>`),
        verte: hote.replace('</body>', `<nav role="tablist" aria-label="Écrans">${onglets}</nav>${sections('h2')}</body>`),
      };
      const c16 = nom => {
        const f = path.join(dossier, nom + '.html');
        fs.writeFileSync(f, pages[nom], 'utf8');
        const r = spawnSync(PYTHON, [skill('check_maquette.py'), f, '--json-only'], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
        let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        return (j?.findings || []).filter(x => x.critere === 'C16');
      };
      const r = c16('rouge');
      ligne(r.length === 2 && r.every(x => x.gravite === 'avertissement'),
        `sens rouge · menu de liens et un h1 par écran : C16 ×2 en avertissement (obtenu ×${r.length})`);
      const v = c16('verte');
      ligne(v.length === 0, `sens vert · barre d'onglets role="tablist" et h2 par écran : C16 muet (obtenu ×${v.length})`);
    } finally {
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// TF-1775 (lot Produit-83 du 15/10) — LE THÈME SOMBRE DEMANDÉ ÉTAIT NEUTRALISÉ PAR LA PAGE. La copie
// « sombre » des passes de rendu posait data-theme="dark" sur <html> ; le script d'initialisation
// d'une page au pattern S-G1 (R-30 : clair par défaut, choix lu en localStorage) le réécrivait en
// "light" au chargement, et la passe dite sombre mesurait le clair. Oracle : render_page.py lui-même,
// qui publie « THEME DEMANDE NON RENDU » quand la page a réécrit le thème (TF-1718). Deux sens.
{
  console.log(String.fromCharCode(10) + 'lib/rendu.mjs injecterThemeSombre (TF-1775) — le sombre tient face au script de la page');
  if (!OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
  } else {
    const { injecterThemeSombre } = await import('./lib/rendu.mjs');
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-force-'));
    try {
      const page = '<!doctype html><html lang="fr" data-theme="light"><head><meta charset="utf-8"><title>Thème</title>'
        + '<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme-x") || "light");</script>'
        + '<style>:root{--fond:#ffffff;--texte:#111111}:root[data-theme="dark"]{--fond:#0b1220;--texte:#eef2f8}'
        + 'body{background:var(--fond);color:var(--texte)}</style></head><body><main><h1>Thème</h1><p>Texte.</p></main></body></html>';
      const jouer = (nom, html) => {
        const f = path.join(dossier, nom + '.html');
        fs.writeFileSync(f, html, 'utf8');
        const r = spawnSync(OUTILLAGE_RENDU.python, [OUTILLAGE_RENDU.renderPage, f, '--widths', '600', '--output', 'json', '--theme', 'sombre', '--out', dossier],
          { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
        let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        return (j?.non_juge || []).some(l => /THEME TENU CONTRE LA PAGE/.test(l));
      };
      // TF-1862 (rouge depuis le 18/10/2026). Depuis le socle 1.31.0 (forge-agents 4e77ee8, TF-1775),
      // render_page contre lui-même la réécriture : sous --theme sombre il remet data-theme à chaque fois et publie
      // « THEME TENU CONTRE LA PAGE » au lieu de « THEME DEMANDE NON RENDU » (réservé au thème qu'il n'a pas pu tenir).
      // Le message ne distingue plus la copie de la forge de la page brute (les deux le portent, mesuré le 19/10) :
      // la garde de injecterThemeSombre se prouve donc sur le fait, le data-theme que la page porte une fois ses
      // scripts joués, sans --theme (qui tiendrait le thème à sa place).
      const themeFinal = (nom, html) => {
        const f = path.join(dossier, nom + '.html');
        fs.writeFileSync(f, html, 'utf8');
        const code = 'import sys,pathlib\nfrom playwright.sync_api import sync_playwright\n'
          + 'with sync_playwright() as p:\n b=p.chromium.launch()\n pg=b.new_context(color_scheme="dark").new_page()\n'
          + ' pg.goto(pathlib.Path(sys.argv[1]).resolve().as_uri())\n pg.wait_for_timeout(300)\n'
          + ' print(pg.evaluate("() => document.documentElement.getAttribute(\'data-theme\')"))\n b.close()\n';
        const r = spawnSync(OUTILLAGE_RENDU.python, ['-c', code, f], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
        return (r.stdout || '').trim();
      };
      ligne(jouer('brute', page), 'sens rouge · page brute : son script réécrit le thème, render_page le signale et le tient (témoin de la mesure)');
      const brut = themeFinal('brut-final', page);
      ligne(brut === 'light', `sens rouge · page brute : sans garde, le thème final est le clair que son script pose (obtenu « ${brut} »)`);
      const garde = themeFinal('copie-finale', injecterThemeSombre(page));
      ligne(garde === 'dark', `sens vert · copie sombre de la forge : le thème sombre tient après le script de la page (obtenu « ${garde} »)`);
    } finally {
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// TF-2199 (lot Produit-86 du 05/11/2026) — LA VISITE GUIDÉE N'EST PAS JUGÉE PAR LE RENDU STATIQUE. Une application qui ouvre sa
// visite au premier affichage montre sa bulle dans la copie rendue : elle recouvre la page et fabrique des écarts (V1…) que le
// produit n'a pas. `lancerRendu` masque `[data-visite-etape]` dans ses copies (neutraliserVisite), et le dit au non_juge.
// La page est l'écran vert de TF-0278 plus une bulle fixe de 360 px, qui déborde d'un viewport de 390 px.
{
  console.log(String.fromCharCode(10) + 'lib/rendu.mjs neutraliserVisite (TF-2199) — la bulle de la visite guidée ne fabrique pas d\'écarts au rendu statique');
  if (!OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
  } else {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'visite-statique-'));
    try {
      const base = fs.readFileSync(fx('rendu-l2-verte.html'), 'utf8');
      const bulle = marqueur => '<div ' + marqueur + ' role="dialog" aria-label="Visite guidée" style="position:fixed;top:40px;left:40px;width:360px;padding:16px;'
        + 'background:#fff;color:#000;border:1px solid #000;z-index:99"><p>Étape 1 sur 5 : voici le tableau des demandes. Cliquez sur Suivant pour continuer la visite guidée.</p>'
        + '<button type="button">Suivant</button></div>';
      const poser = (nom, html) => { const f = path.join(dossier, nom + '.html'); fs.writeFileSync(f, html, 'utf8'); return f; };
      const rendu = f => {
        const r = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), f, '--rendu', '--json-only'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
        let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        const rp = (j?.oracles || []).filter(o => /^render_page/.test(o.oracle));
        return { rp, tous: rp.length === 2 && rp.every(o => o.verdict === 'PASS'), dit: rp.length > 0 && rp.every(o => (o.non_juge || []).some(n => /visite guidée masquée/.test(n))) };
      };
      const avecMarqueur = poser('bulle-marquee', base.replace('</body>', bulle('data-visite-etape') + '</body>'));
      const sansMarqueur = poser('bulle-nue', base.replace('</body>', bulle('data-sans-convention') + '</body>'));
      // Témoin : la page brute, rendue sans la neutralisation, est refusée (la bulle déborde à 390 px).
      const brut = spawnSync(OUTILLAGE_RENDU.python, [OUTILLAGE_RENDU.renderPage, avecMarqueur, '--widths', '390', '--output', 'json', '--out', dossier], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
      let jb = null; try { jb = JSON.parse(brut.stdout.trim()); } catch { /* illisible */ }
      ligne(jb?.verdict === 'FAIL', `sens rouge · page brute avec sa bulle rendue par render_page.py sans neutralisation : FAIL (témoin ; obtenu ${jb?.verdict})`);
      const marquee = rendu(avecMarqueur);
      ligne(marquee.tous, `sens vert · --rendu : la bulle [data-visite-etape] est masquée dans les copies claire et sombre, render_page(clair) et (sombre) PASS (obtenu ${marquee.rp.map(o => o.verdict).join('/')})`);
      ligne(marquee.dit, 'sens vert · --rendu : le masquage est DIT au non_juge de chaque passe de rendu');
      const nue = rendu(sansMarqueur);
      ligne(!nue.tous, `sens rouge · une bulle qui ne porte pas [data-visite-etape] n'est pas masquée : la convention fait la règle (obtenu ${nue.rp.map(o => o.verdict).join('/')})`);
      const sans = rendu(fx('rendu-l2-verte.html'));
      ligne(sans.tous && !sans.dit, 'sens vert · une page sans visite guidée : rendu inchangé et aucune ligne de masquage au non_juge');
    } finally {
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// TF-2219, TF-2199 — le verrou dédié d'oracle-exploitabilite (X2 volume minimal, X9 lexique) est rejoué par la recette d'ensemble.
// Il a son propre fichier (comme self-test-baseline et self-test-decouverte) ; sans outillage de rendu il sort 0 avec un SKIP motivé.
{
  console.log(String.fromCharCode(10) + 'self-test-exploitabilite.mjs (TF-2219, TF-2199) — X2 et X9 de oracle-exploitabilite, deux sens');
  const r = spawnSync(process.execPath, [path.join(ici, 'self-test-exploitabilite.mjs')], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const dernier = (r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() || '';
  ligne(r.status === 0, `verrou dédié · exit 0 (obtenu ${r.status}) — ${dernier.slice(0, 120)}`);
}

// TF-2287 — le verrou dédié des plages de règles citées à la sortie des oracles est rejoué par la recette d'ensemble.
// Il a son propre fichier (comme self-test-exploitabilite) ; il ne demande aucun outillage de rendu.
{
  console.log(String.fromCharCode(10) + 'self-test-regles-jouees.mjs (TF-2287) — la plage citée par un oracle dérive de sa liste jouée, deux sens');
  const r = spawnSync(process.execPath, [path.join(ici, 'self-test-regles-jouees.mjs')], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const dernier = (r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() || '';
  ligne(r.status === 0, `verrou dédié · exit 0 (obtenu ${r.status}) — ${dernier.slice(0, 120)}`);
}

// TF-1797 (lot Produit-83 du 15/10) — UNE INSTANCE SERVIE SE JUGE AUSSI. oracle-taste ne lisait qu'un
// fichier : sur une URL, « fichier introuvable », SKIP. Il lit désormais une URL LOCALE telle que le
// serveur la sert, et refuse une origine distante en nommant le geste. Trois sens sur les fixtures.
{
  console.log(String.fromCharCode(10) + 'oracle-taste.mjs (TF-1797) — une URL locale servie est lue');
  const { spawn } = await import('node:child_process');
  const port = 19000 + Math.floor(Math.random() * 900);
  const code = 'const h=require("http"),f=require("fs"),p=require("path");'
    + 'h.createServer((q,r)=>{const c=p.join(process.argv[1],p.basename(decodeURIComponent(q.url)));'
    + 'f.readFile(c,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{"content-type":"text/html; charset=utf-8"});r.end(d);});})'
    + '.listen(Number(process.argv[2]),"127.0.0.1");';
  const serveur = spawn(process.execPath, ['-e', code, path.join(ici, 'fixtures'), String(port)], { stdio: 'ignore' });
  try {
    let pret = false;
    for (let i = 0; i < 40 && !pret; i++) {
      const s = spawnSync(process.execPath, ['-e', 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))', `http://127.0.0.1:${port}/taste-verte.html`]);
      pret = s.status === 0;
    }
    const jouer = cible => {
      const r = spawnSync(process.execPath, [path.join(ici, 'oracle-taste.mjs'), cible, '--json-only'], { encoding: 'utf8' });
      let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
      return { code: r.status, verdict: j?.verdict, findings: j?.findings || [] };
    };
    if (!pret) {
      ligne(false, 'serveur local de recette indisponible');
    } else {
      const v = jouer(`http://127.0.0.1:${port}/taste-verte.html`);
      ligne(v.code === 0 && v.verdict === 'PASS', `sens vert · URL locale de la fixture verte : PASS (obtenu ${v.verdict}, exit ${v.code})`);
      const r = jouer(`http://127.0.0.1:${port}/taste-rouge.html`);
      ligne(r.code === 1 && r.verdict === 'FAIL', `sens rouge · URL locale de la fixture rouge : FAIL (obtenu ${r.verdict}, exit ${r.code})`);
    }
    const d = jouer('https://exemple.invalid/page.html');
    ligne(d.code === 2 && d.findings.some(f => /non locale/.test(f.msg || '')), `origine distante · SKIP qui nomme le geste (exit ${d.code})`);
  } finally {
    serveur.kill();
  }
}

// Seconde vague du 15/10 (suite de TF-1771) — check_maquette C1 acceptait un thème sombre porté par
// le seul @media (prefers-color-scheme: dark), que R-30 retire et que check_html G1 refuse. Le sombre
// se déclare sous :root[data-theme="dark"] ; l'auto-sombre est en plus signalé. Deux sens.
{
  console.log(String.fromCharCode(10) + 'check_maquette.py C1 — le sombre se déclare par data-theme, jamais par l\'OS (R-30)');
  if (!PYTHON) {
    console.log('  SKIP  interpréteur python introuvable dans le PATH (python / python3)');
  } else {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'maquette-c1-'));
    try {
      const hote = fs.readFileSync(fx('maquette-vendor-verte.html'), 'utf8');
      const bloc = '[data-theme="dark"] { --fond: #101010; --texte: #f2f2f2; }';
      const c1 = html => {
        const f = path.join(dossier, 'p.html');
        fs.writeFileSync(f, html, 'utf8');
        const r = spawnSync(PYTHON, [skill('check_maquette.py'), f, '--json-only'], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
        let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        return (j?.findings || []).filter(x => x.critere === 'C1' && x.ou === 'themes');
      };
      ligne(hote.includes(bloc) && c1(hote).length === 0, 'sens vert · palette sombre sous [data-theme="dark"] : C1 thèmes muet');
      const r = c1(hote.replace(bloc, '@media (prefers-color-scheme: dark) { :root { --fond: #101010; --texte: #f2f2f2; } }'));
      ligne(r.some(x => x.gravite === 'bloquant') && r.some(x => /prefers-color-scheme/.test(x.constat)),
        `sens rouge · sombre porté par prefers-color-scheme seul : C1 bloquant et auto-sombre signalé (obtenu ${r.map(x => x.gravite).join(' ') || 'rien'})`);
    } finally {
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// Troisième vague du 15/10 (suite de TF-1771) — oracle-tokens, oracle-bascule et oracle-surcouche
// lisaient un bloc @media (prefers-color-scheme: dark) comme le thème sombre, contre R-30 (clair par
// défaut strict) que check_html G1 joue. Le sombre se déclare sous [data-theme="dark"] ; la forme
// auto-sombre ne compte plus comme thème et se signale en AVERTISSEMENT. Pages écrites ici, deux sens.
{
  console.log(String.fromCharCode(10) + 'oracle-tokens / oracle-bascule / oracle-surcouche — le sombre par data-theme seul (R-30)');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-sombre-'));
  try {
    const SOMBRE = ':root[data-theme="dark"] { color-scheme: dark; --bg: #0b1220; --ink: #eef2f8; }';
    const AUTO = '@media (prefers-color-scheme: dark) { :root { color-scheme: dark; --bg: #0b1220; --ink: #eef2f8; } }';
    const page = (bloc, { dialogue = false, init = "s || 'light'" } = {}) => '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Thème</title>'
      + `<script>(function(){var s=localStorage.getItem('digitai-theme');document.documentElement.setAttribute('data-theme', ${init});})();</script>`
      + '<style>:root { color-scheme: light; --bg: #ffffff; --ink: #111111; }\n' + bloc + '\nbody { background: var(--bg); color: var(--ink); }</style></head><body>'
      + '<header><button class="theme-toggle" id="bascule" type="button" aria-label="Basculer le thème">Thème</button></header>'
      + (dialogue ? '<dialog id="d"><p>Dialogue</p></dialog>' : '') + '<main><h1>Thème</h1><p>Texte.</p></main>'
      + '<script>document.getElementById("bascule").addEventListener("click", function () { var d = document.documentElement;'
      + ' var n = d.getAttribute("data-theme") === "dark" ? "light" : "dark"; d.setAttribute("data-theme", n); localStorage.setItem("digitai-theme", n); });</script></body></html>';
    const jouer = (oracle, nom, html) => {
      const f = path.join(dossier, nom + '.html');
      fs.writeFileSync(f, html, 'utf8');
      const r = spawnSync(process.execPath, [path.join(ici, oracle), f, '--json-only'], { encoding: 'utf8' });
      let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
      const fs_ = j?.findings || [];
      return { code: r.status, auto: fs_.filter(x => x.sev === 'avertissement' && /prefers-color-scheme/.test(x.msg || '')), durs: fs_.filter(x => x.sev === 'bloquant' || x.sev === 'majeur') };
    };
    const tv = jouer('oracle-tokens.mjs', 'tokens-vert', page(SOMBRE));
    const tr = jouer('oracle-tokens.mjs', 'tokens-rouge', page(AUTO));
    ligne(tv.auto.length === 0 && tr.auto.some(x => x.regle === 'T4'),
      `oracle-tokens · data-theme muet, auto-sombre signalé en T4 avertissement (vert ×${tv.auto.length}, rouge ×${tr.auto.length})`);
    const bv = jouer('oracle-bascule.mjs', 'bascule-vert', page(SOMBRE));
    const br = jouer('oracle-bascule.mjs', 'bascule-rouge', page(AUTO));
    const bj = jouer('oracle-bascule.mjs', 'bascule-js', page(SOMBRE, { init: "s || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')" }));
    ligne(bv.code === 0 && bv.auto.length === 0, `oracle-bascule · sens vert : palette sous data-theme, PASS sans avertissement (exit ${bv.code})`);
    ligne(br.durs.some(x => x.regle === 'B-T4') && br.auto.length > 0,
      `oracle-bascule · sens rouge : palette sous @media seul, B-T4 dur et auto-sombre signalé (exit ${br.code})`);
    ligne(bj.code === 0 && bj.auto.length > 0, `oracle-bascule · init par matchMedia : avertissement auto-sombre, sans bloquer (exit ${bj.code})`);
    const sv = jouer('oracle-surcouche.mjs', 'surcouche-vert', page(SOMBRE, { dialogue: true }));
    const sr = jouer('oracle-surcouche.mjs', 'surcouche-rouge', page(AUTO, { dialogue: true }));
    ligne(sv.auto.length === 0 && !sv.durs.some(x => x.regle === 'SC4') && sr.auto.some(x => x.regle === 'SC4'),
      `oracle-surcouche · SC4 : data-theme muet, auto-sombre signalé (vert ×${sv.auto.length}, rouge ×${sr.auto.length})`);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1906 — variantes d'écriture d'une déclaration multiple (en plus de la paire de fixtures) : racine
// et bouton déclarés en 2e et 3e position sur plusieurs lignes, virgules et apostrophes dans une chaîne
// et un commentaire, instructions sans point-virgule. Pages écrites ici ; un alias vers un autre
// élément reste refusé en B-T2.
{
  console.log(String.fromCharCode(10) + 'oracle-bascule (TF-1906) — déclarations multiples, variantes d\'écriture');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'bascule-multiple-'));
  try {
    const page = js => '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Thème</title><style>'
      + ':root { color-scheme: light; --bg: #ffffff; --ink: #111111; }\n:root[data-theme="dark"] { color-scheme: dark; --bg: #0b1220; --ink: #eef2f8; }\n'
      + 'body { background: var(--bg); color: var(--ink); }</style></head><body><header><button class="theme-toggle" id="theme" type="button">Thème</button></header>'
      + '<aside id="autre">Autre</aside><main><h1>Thème</h1></main><script>' + js + '</script></body></html>';
    const jouer = (nom, js) => {
      const f = path.join(dossier, nom + '.html');
      fs.writeFileSync(f, page(js), 'utf8');
      const r = spawnSync(process.execPath, [path.join(ici, 'oracle-bascule.mjs'), f, '--json-only'], { encoding: 'utf8' });
      let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
      return { code: r.status, durs: (j?.findings || []).filter(x => x.sev === 'bloquant' || x.sev === 'majeur') };
    };
    const ECOUTE = "bouton.addEventListener('click', function () { racine.setAttribute('data-theme', 'dark'); localStorage.setItem(CLE, 'dark'); }); localStorage.getItem(CLE);";
    const multiLignes = jouer('multi-lignes',
      "var n = f(1, 2),\n  racine = document.documentElement,\n  bouton = document.getElementById('theme'),\n  CLE = 'produit.theme';\n" + ECOUTE);
    const sansPointVirgule = jouer('sans-point-virgule',
      "// l'écouteur, ici\nlet etat = { a: 1, b: [1, 2] }, texte = \"x,y\", bouton = document.querySelector('#theme')\nconst racine = document.documentElement\nconst CLE = 'theme'\n" + ECOUTE);
    const autreElement = jouer('autre-element',
      "var racine = document.documentElement, bouton = document.getElementById('autre'), CLE = 'produit.theme';\n" + ECOUTE);
    ligne(multiLignes.code === 0 && multiLignes.durs.length === 0, `var multiple sur plusieurs lignes, racine et bouton en 2e/3e position : PASS (exit ${multiLignes.code}, ${multiLignes.durs.length} écart dur)`);
    ligne(sansPointVirgule.code === 0 && sansPointVirgule.durs.length === 0, `déclarations sans point-virgule, virgules et apostrophes en chaîne et commentaire : PASS (exit ${sansPointVirgule.code}, ${sansPointVirgule.durs.length} écart dur)`);
    ligne(autreElement.code === 1 && autreElement.durs.some(x => x.regle === 'B-T2'), `alias d'un var multiple vers un autre élément : B-T2 dur (exit ${autreElement.code})`);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1916 — X6 hors des deux fixtures : le vert doit avoir été JOUÉ (un vert sans clic n'est pas un vert),
// le repli par ancre (rechargement qui retombe sur le groupe d'onglets) est un avertissement qui ne rougit
// pas, et un écran sans groupe d'onglets sous le premier écran dit que X6 n'a pas été joué.
{
  console.log(String.fromCharCode(10) + 'oracle-exploitabilite X6 (TF-1916) — onglets sous le premier écran, repli par ancre et contrôle joué');
  if (!OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
  } else {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'onglets-x6-'));
    try {
      const jouer = f => {
        const r = spawnSync(process.execPath, [path.join(ici, 'oracle-exploitabilite.mjs'), f, '--json-only'],
          { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
        let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        return { code: r.status, json: j, x6: (j?.findings || []).filter(x => x.regle === 'X6') };
      };
      const verte = jouer(fx('onglets-milieu-verte.html'));
      ligne(verte.code === 0 && verte.json?.onglets_joues === 1 && verte.x6.length === 0,
        `sens vert · échange sur place : le clic a été joué (onglets_joues ${verte.json?.onglets_joues}) et X6 se tait, PASS exit 0 (obtenu ${verte.json?.verdict}, exit ${verte.code})`);
      const rouge = jouer(fx('onglets-milieu-rouge.html'));
      ligne(rouge.code === 1 && rouge.x6.length === 1 && rouge.x6[0].sev === 'majeur' && /page rechargée/.test(rouge.x6[0].msg),
        `sens rouge · simples liens vers une page sœur : X6 majeur, page rechargée, FAIL exit 1 (obtenu ${rouge.json?.verdict}, exit ${rouge.code}, ×${rouge.x6.length})`);
      // Repli par ancre : la page sœur recharge, mais retombe sur le groupe (id="onglets") : position conservée.
      const page = (courant, autre) => '<!doctype html><html lang="fr" data-sans-visite-guidee="page de la règle X6 (repli par ancre)" data-sans-lexique="page de la règle X6 (repli par ancre)"><head><meta charset="utf-8"><title>Gîte ' + courant + '</title>'
        + '<style>body { margin: 0; } .bandeau { height: 1400px; } .onglets { display: flex; gap: 8px; padding: 12px 32px; } .calendrier { min-height: 1600px; }</style></head><body>'
        + '<header class="bandeau"><h1>Réservation</h1></header>'
        + '<nav class="onglets" id="onglets" role="tablist"><a role="tab" href="gite-' + courant + '.html#onglets" aria-selected="true">Gîte ' + courant + '</a>'
        + '<a role="tab" href="gite-' + autre + '.html#onglets" aria-selected="false">Gîte ' + autre + '</a></nav>'
        + '<main class="calendrier"><h2>Calendrier du gîte ' + courant + '</h2></main></body></html>';
      fs.writeFileSync(path.join(dossier, 'gite-a.html'), page('a', 'b'), 'utf8');
      fs.writeFileSync(path.join(dossier, 'gite-b.html'), page('b', 'a'), 'utf8');
      const ancre = jouer(path.join(dossier, 'gite-a.html'));
      ligne(ancre.code === 0 && ancre.x6.length === 1 && ancre.x6[0].sev === 'avertissement' && /position conservée par ancre/.test(ancre.x6[0].msg),
        `repli par ancre · rechargement qui retombe sur le groupe : X6 en avertissement, PASS exit 0 (obtenu ${ancre.json?.verdict}, exit ${ancre.code}, ${ancre.x6.map(x => x.sev).join(',')})`);
      // Sans groupe d'onglets sous le premier écran : dit au non_juge, jamais un silence.
      const sans = jouer(fx('exploitabilite-verte.html'));
      ligne(sans.json?.onglets_joues === 0 && (sans.json?.non_juge || []).some(n => /^X6 non joué : aucun groupe/.test(n)),
        `écran sans onglets sous le premier écran · X6 dit non joué au non_juge (onglets_joues ${sans.json?.onglets_joues})`);
    } finally {
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// TF-2158 — X8 et X9 hors des fixtures de la matrice : le câblage de la visite (un clic sans étape est refusé), une entrée
// reconnue à son NOM seul, l'absence de lexique, un terme sans définition, l'écart motivé (admis) et l'écart sans motif
// (refusé), la page déclarée éditoriale (non due, et dite). Chaque variante est l'écran vert modifié d'UNE seule chose.
{
  console.log(String.fromCharCode(10) + "oracle-exploitabilite X8 et X9 (TF-2158) — visite guidée et lexique, variantes de l'écran vert");
  if (!OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
  } else {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'visite-x8-'));
    try {
      const base = fs.readFileSync(fx('exploitabilite-verte.html'), 'utf8');
      const SANS_LEXIQUE = /<dl data-lexique>[\s\S]*?<\/dl>/;
      const SANS_VISITE = /  <p><button type="button" id="visite"[\s\S]*?<\/dialog>/;
      const variante = (nom, transformer) => {
        const brut = transformer(base);
        if (brut === base) throw new Error('variante ' + nom + " : la transformation n'a rien changé");
        const f = path.join(dossier, nom + '.html');
        fs.writeFileSync(f, brut, 'utf8');
        return f;
      };
      const jouer = f => {
        const r = spawnSync(process.execPath, [path.join(ici, 'oracle-exploitabilite.mjs'), f, '--json-only'],
          { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
        let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        const f8 = (j?.findings || []).filter(x => x.regle === 'X8');
        const f9 = (j?.findings || []).filter(x => x.regle === 'X9');
        return { code: r.status, json: j, f8, f9, nj: j?.non_juge || [] };
      };
      // La verte elle-même : le clic a été joué (un vert sans clic n'est pas un vert).
      const verte = jouer(fx('exploitabilite-verte.html'));
      ligne(verte.code === 0 && verte.f8.length === 0 && verte.f9.length === 0 && verte.nj.some(n => /^X9 : 2 terme\(s\) du lexique retrouvé\(s\) à l'écran sur 2/.test(n)),
        `sens vert · visite câblée et lexique tenu : X8 et X9 se taisent, deux termes retrouvés à l'écran, PASS exit 0 (obtenu ${verte.json?.verdict}, exit ${verte.code})`);
      // Rouge de câblage : le bouton existe, il ne fait rien.
      const mort = jouer(variante('visite-morte', b => b.replace(/<script>[\s\S]*?<\/script>/, '')));
      ligne(mort.code === 1 && mort.f8.length === 1 && mort.f8[0].sev === 'majeur' && /aucune étape ne s'affiche/.test(mort.f8[0].msg) && mort.f9.length === 0,
        `sens rouge · bouton « Visite guidée » sans étape : X8 majeur « aucune étape », X9 se tait, FAIL exit 1 (obtenu ${mort.json?.verdict}, exit ${mort.code}, ×${mort.f8.length})`);
      // Entrée reconnue à son nom seul (sans data-visite-guidee) : le remède joué.
      const parNom = jouer(variante('visite-par-nom', b => b.replace(' data-visite-guidee>', '>')));
      ligne(parNom.code === 0 && parNom.f8.length === 0,
        `remède · entrée reconnue à son nom (« Visite guidée », sans data-visite-guidee) : X8 se tait, PASS exit 0 (obtenu ${parNom.json?.verdict}, exit ${parNom.code})`);
      // Aucun lexique déclaré.
      const sansLexique = jouer(variante('sans-lexique', b => b.replace(SANS_LEXIQUE, '')));
      ligne(sansLexique.code === 1 && sansLexique.f9.length === 1 && /aucun lexique déclaré/.test(sansLexique.f9[0].msg) && sansLexique.f8.length === 0,
        `sens rouge · aucun lexique déclaré : X9 majeur, X8 se tait, FAIL exit 1 (obtenu ${sansLexique.json?.verdict}, exit ${sansLexique.code})`);
      // Un terme sans définition.
      const sansDef = jouer(variante('terme-sans-definition', b => b.replace('<dd>Groupe de demandes traitées ensemble.</dd>', '<dd></dd>')));
      ligne(sansDef.code === 1 && sansDef.f9.some(x => /« lot » du lexique n'a pas de définition/.test(x.msg)),
        `sens rouge · terme « lot » sans définition au lexique : X9 majeur, FAIL exit 1 (obtenu ${sansDef.json?.verdict}, exit ${sansDef.code})`);
      // Écart motivé (admis, dit au non_juge) et écart sans motif (refusé).
      const ecart = jouer(variante('ecart-motive', b => b
        .replace('<html lang="fr">', '<html lang="fr" data-sans-visite-guidee="écran de connexion, sans visite" data-sans-lexique="aucun terme métier à ce stade">')
        .replace(SANS_LEXIQUE, '').replace(SANS_VISITE, '')));
      ligne(ecart.code === 0 && ecart.f8.length === 0 && ecart.f9.length === 0
        && ecart.nj.some(n => /visite guidée écartée, motif déclaré « écran de connexion, sans visite »/.test(n))
        && ecart.nj.some(n => /lexique écarté, motif déclaré « aucun terme métier à ce stade »/.test(n)),
        `remède · écarts explicites MOTIVÉS : X8 et X9 se taisent et le motif est dit au non_juge, PASS exit 0 (obtenu ${ecart.json?.verdict}, exit ${ecart.code})`);
      const sansMotif = jouer(variante('ecart-sans-motif', b => b
        .replace('<html lang="fr">', '<html lang="fr" data-sans-visite-guidee data-sans-lexique>')
        .replace(SANS_LEXIQUE, '').replace(SANS_VISITE, '')));
      ligne(sansMotif.code === 1 && sansMotif.f8.length === 1 && sansMotif.f9.length === 1 && /sans motif/.test(sansMotif.f8[0].msg) && /sans motif/.test(sansMotif.f9[0].msg),
        `sens rouge · écarts posés SANS motif : X8 et X9 majeurs « sans motif », FAIL exit 1 (obtenu ${sansMotif.json?.verdict}, exit ${sansMotif.code})`);
      // Page déclarée éditoriale : le contrôle n'est pas dû, et le dit.
      const edito = jouer(variante('editoriale', b => b
        .replace('<html lang="fr">', '<html lang="fr" data-type-page="editoriale">')
        .replace(SANS_LEXIQUE, '').replace(SANS_VISITE, '')));
      ligne(edito.code === 0 && edito.f8.length === 0 && edito.f9.length === 0 && edito.nj.some(n => /^X8 et X9 non dues : écran déclaré éditorial/.test(n)),
        `page déclarée éditoriale · X8 et X9 non dues, dites au non_juge, PASS exit 0 (obtenu ${edito.json?.verdict}, exit ${edito.code})`);
    } finally {
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// TF-2172 — oracle-erreurs-formulaire hors de la paire de la matrice : chaque règle a sa rouge, dans un formulaire
// jetable à UN champ dont le script ne se trompe que d'UNE chose (où le message tombe, ce qu'il dit, si l'envoi part,
// quand il apparaît). Le composant, lui, est prouvé par la verte : erreur à la sortie du champ, résumé à liens qui vise
// le champ, aucune requête d'écriture partie. Les requêtes d'écriture sont interceptées par l'oracle : rien n'est créé.
{
  console.log(String.fromCharCode(10) + 'oracle-erreurs-formulaire (TF-2172) — le composant et une rouge par règle');
  if (!OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
  } else {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'erreurs-ef-'));
    try {
      // Un formulaire à un champ (domaine, valeur fausse « costcontrol »). `o` règle le seul écart voulu.
      const BON = '« costcontrol » n\'est pas un domaine complet. Forme attendue : costcontrol.client.fr.';
      const page = o => {
        const message = o.message ?? BON;
        const zone = '<p id="e" class="e" hidden></p>';
        return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Formulaire jetable</title>'
          + '<style>body{margin:0;font:16px/24px sans-serif}main{padding:24px;max-width:640px}.espace{height:480px}'
          + 'input{box-sizing:border-box;width:100%;padding:8px;font:inherit}.e{color:#b00020;margin:4px 0 0}</style></head><body><main>'
          + (o.loin ? zone + '<div class="espace"></div>' : '')
          + '<form id="f" action="http://127.0.0.1:9/clients" method="post" novalidate>'
          + '<label for="d">Domaine du client</label>'
          + '<input id="d" name="domaine" type="text" required pattern="[a-z0-9]+(\\.[a-z0-9]+)+" data-valeur-fausse="costcontrol" aria-describedby="e">'
          + (o.loin ? '' : zone)
          + '<button type="submit">Enregistrer</button></form></main>'
          + '<script>(function(){var f=document.getElementById("f"),d=document.getElementById("d"),e=document.getElementById("e");'
          + 'function dire(){e.textContent=' + JSON.stringify(message) + ';e.hidden=false;' + (o.invalideOmis ? '' : 'd.setAttribute("aria-invalid","true");') + '}'
          + (o.tardif ? '' : 'd.addEventListener("blur",dire);')
          + 'f.addEventListener("submit",function(ev){ev.preventDefault();'
          + (o.envoiPart ? 'fetch("http://127.0.0.1:9/clients",{method:"POST"}).catch(function(){});' : '') + 'dire();});'
          + '})();</script></body></html>';
      };
      const ecrire = (nom, o) => { const f = path.join(dossier, nom + '.html'); fs.writeFileSync(f, page(o), 'utf8'); return f; };
      const jouer = f => {
        const r = spawnSync(process.execPath, [path.join(ici, 'oracle-erreurs-formulaire.mjs'), f, '--json-only'],
          { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
        let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        const par = rg => (j?.findings || []).filter(x => x.regle === rg);
        return { code: r.status, json: j, par, regles: new Set((j?.findings || []).map(x => x.regle)) };
      };
      const seule = (x, rg) => x.regles.has(rg) && [...x.regles].filter(y => y !== rg).length === 0;

      // Le composant : la verte, jouée en détail.
      const verte = jouer(fx('erreurs-formulaire-verte.html'));
      const mv = verte.json?.mesures || [];
      ligne(verte.code === 0 && verte.json?.champs_eprouves === 2 && mv.length === 2 && mv.every(m => m.apres_sortie && m.invalide && m.requetes_ecriture === 0 && !m.navigation),
        `sens vert · composant saisie-erreurs : 2 champs éprouvés, l'erreur paraît dès la SORTIE du champ, le champ est invalide, aucune requête d'écriture ne part, PASS exit 0 (obtenu ${verte.json?.verdict}, exit ${verte.code})`);
      ligne(mv.length === 2 && mv.every(m => m.resume_liens >= 1 && m.resume_vise_le_champ),
        `sens vert · résumé d'erreurs à liens : posé à l'envoi fautif, ses liens visent le champ (liens ${mv.map(m => m.resume_liens).join('/')})`);
      ligne(mv.length === 2 && /« costcontrol »/.test(mv[0].message || '') && /costcontrol\.client\.fr/.test(mv[0].message || '') && mv[0].distance_px <= 40,
        `sens vert · le message reprend la saisie « costcontrol », donne la forme « costcontrol.client.fr » et tombe à ${mv[0]?.distance_px} px du champ`);

      // Le défaut du porteur : le bandeau en tête de page (fixture rouge de la matrice) — le texte du bandeau est cité.
      const bandeau = jouer(fx('erreurs-formulaire-rouge.html'));
      ligne(bandeau.code === 1 && bandeau.par('EF1').length === 2 && bandeau.par('EF1').every(x => x.sev === 'bloquant' && /Refusé : CIBLE_INVALIDE/.test(x.msg) && /ailleurs/.test(x.msg)),
        `sens rouge · bandeau « Refusé : CIBLE_INVALIDE » en tête de page : EF1 bloquant sur chaque champ, le bandeau cité, FAIL exit 1 (obtenu ${bandeau.json?.verdict}, ×${bandeau.par('EF1').length})`);

      // Une rouge par règle, sur un formulaire jetable ; le témoin (message correct, près, à la sortie, envoi retenu) passe.
      const temoin = jouer(ecrire('temoin', {}));
      ligne(temoin.code === 0 && temoin.json?.champs_eprouves === 1 && [...temoin.regles].join() === '—',
        `témoin · formulaire jetable au message correct, près du champ, à la sortie, envoi retenu : aucun constat, PASS exit 0 (obtenu ${temoin.json?.verdict}, ${[...temoin.regles].join(',')})`);
      const loin = jouer(ecrire('loin', { loin: true }));
      ligne(loin.code === 1 && seule(loin, 'EF2') && loin.par('EF2')[0].sev === 'majeur',
        `sens rouge · message relié mais à plus de 120 px du champ : EF2 majeur seul, FAIL exit 1 (obtenu ${loin.json?.verdict}, ${[...loin.regles].join(',')})`);
      const generique = jouer(ecrire('generique', { message: 'Valeur invalide' }));
      ligne(generique.code === 1 && seule(generique, 'EF3') && generique.par('EF3')[0].sev === 'majeur',
        `sens rouge · message « Valeur invalide » (ni la saisie ni la forme) : EF3 majeur seul, FAIL exit 1 (obtenu ${generique.json?.verdict}, ${[...generique.regles].join(',')})`);
      const sansInvalide = jouer(ecrire('sans-invalide', { invalideOmis: true }));
      ligne(sansInvalide.code === 1 && seule(sansInvalide, 'EF1') && sansInvalide.par('EF1')[0].sev === 'majeur' && /aria-invalid/.test(sansInvalide.par('EF1')[0].msg),
        `sens rouge · message relié mais champ sans aria-invalid : EF1 majeur seul, FAIL exit 1 (obtenu ${sansInvalide.json?.verdict}, ${[...sansInvalide.regles].join(',')})`);
      const part = jouer(ecrire('part', { envoiPart: true }));
      ligne(part.code === 1 && seule(part, 'EF4') && part.par('EF4')[0].sev === 'bloquant',
        `sens rouge · l'envoi part malgré la valeur fausse : EF4 bloquant seul (requête interceptée), FAIL exit 1 (obtenu ${part.json?.verdict}, ${[...part.regles].join(',')})`);
      const tardif = jouer(ecrire('tardif', { tardif: true }));
      ligne(tardif.code === 0 && seule(tardif, 'EF5') && tardif.par('EF5')[0].sev === 'avertissement',
        `sens rouge · le message n'apparaît qu'à l'envoi : EF5 en avertissement, qui ne rougit pas, PASS exit 0 (obtenu ${tardif.json?.verdict}, ${[...tardif.regles].join(',')})`);
      // Sans champ éprouvable : SKIP dit, jamais PASS (un vert sans objet n'est pas un vert).
      const vide = path.join(dossier, 'sans-champ.html');
      fs.writeFileSync(vide, '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Sans formulaire</title></head><body><main><h1>Rien à saisir</h1></main></body></html>', 'utf8');
      const sans = jouer(vide);
      ligne(sans.code === 2 && sans.json?.verdict === 'SKIP' && (sans.json?.findings || []).some(x => x.regle === 'EF0' && x.sans_objet),
        `sans champ éprouvable · SKIP exit 2 marqué sans_objet, jamais PASS (obtenu ${sans.json?.verdict}, exit ${sans.code})`);
      // Sur le chemin de run-oracles-design --instance (un oracle qui n'est sur aucun chemin n'est jamais joué, TF-1687).
      const agreger = (...a) => {
        const r = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), fx('motion-verte.html'), ...a, '--json-only'],
          { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
        let json = null; try { json = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
        return { code: r.status, json, ef: (json?.oracles || []).find(o => o.oracle === 'oracle-erreurs-formulaire') };
      };
      const aRouge = agreger('--instance', fx('erreurs-formulaire-rouge.html'));
      ligne(aRouge.ef?.verdict === 'FAIL' && aRouge.ef.findings.some(x => x.regle === 'EF1') && aRouge.json?.verdict === 'FAIL' && aRouge.code === 1,
        `run-oracles-design --instance · le bandeau en tête de page est vu : oracle-erreurs-formulaire FAIL EF1, verdict FAIL exit 1 (obtenu ${aRouge.ef?.verdict}, ${aRouge.json?.verdict}, exit ${aRouge.code})`);
      const aVerte = agreger('--instance', fx('erreurs-formulaire-verte.html'));
      ligne(aVerte.ef?.verdict === 'PASS' && aVerte.ef.ecarts_durs === 0,
        `run-oracles-design --instance · le formulaire du composant est joué et passe : oracle-erreurs-formulaire PASS (obtenu ${aVerte.ef?.verdict})`);
      const aSans = agreger('--instance', fx('exploitabilite-verte.html'));
      ligne(!aSans.ef && aSans.json?.verdict === 'PASS' && aSans.code === 0 && (aSans.json?.non_juge || []).some(n => /^oracle-erreurs-formulaire : SANS OBJET — aucun champ éprouvable/.test(n)),
        `run-oracles-design --instance · écran sans champ éprouvable : SANS OBJET dit au non_juge, jamais un SKIP qui rend l'agrégat INDÉTERMINÉ (obtenu ${aSans.json?.verdict}, exit ${aSans.code})`);
    } finally {
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// TF-2307 (lot Produit-81 du 09/11/2026) — LA VÉRIFICATION AU CHAMP SE LAISSE PASSER, LE RESTE RESTE INTERCEPTÉ. Toute
// requête POST était refusée pendant l'épreuve, dont la vérification qu'un formulaire demande au serveur à la sortie du
// champ et qui n'écrit rien : le champ ne recevait jamais la réponse, et un formulaire conforme rendait EF1 et EF4.
// La recette sert les pages depuis 127.0.0.1 (lib/serveur-recette-verification.mjs) et relit son JOURNAL de POST : c'est
// la preuve qu'une écriture interceptée n'arrive jamais jusqu'au serveur, et qu'une vérification déclarée y arrive.
// Sens vert : la fixture qui déclare data-verifier, et la convention du dernier segment /verifier sans déclaration.
// Sens rouge, chacun avec un journal VIDE : une écriture non déclarée, une déclaration qui ne couvre pas le chemin
// appelé, un envoi natif du formulaire dont l'action est en /verifier, un envoi par fetch vers cette action, une
// vérification vers une autre origine.
{
  console.log(String.fromCharCode(10) + 'oracle-erreurs-formulaire (TF-2307) — la vérification au champ déclarée passe, le reste reste intercepté');
  if (!OUTILLAGE_RENDU.ok) {
    console.log(`  SKIP  outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
  } else {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'erreurs-ver-'));
    const journal = path.join(dossier, 'journal.txt');
    const port = 19400 + Math.floor(Math.random() * 500);
    const BON = '« costcontrol » n\'est pas un domaine complet. Forme attendue : costcontrol.client.fr.';
    // Un formulaire à un champ. `o.verifie` : adresse que la sortie du champ interroge en POST (sinon le message est local) ;
    // `o.declare` : valeur de data-verifier ; `o.action` : action du formulaire ; `o.natif` : aucun script d'envoi, le
    // navigateur envoie ; `o.envoiFetch` : l'envoi se fait par fetch vers form.action, valeur fausse ou non.
    const page = o => '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Vérification jetable</title>'
      + '<style>body{margin:0;font:16px/24px sans-serif}main{padding:24px;max-width:640px}input{box-sizing:border-box;width:100%;padding:8px;font:inherit}.e{color:#b00020;margin:4px 0 0}</style></head><body><main>'
      + '<form id="f" action="' + (o.action ?? '/mandat') + '" method="post"' + (o.declare ? ' data-verifier="' + o.declare + '"' : '') + ' novalidate>'
      + '<label for="d">Domaine du client</label>'
      + '<input id="d" name="domaine" type="text" required pattern="[a-z0-9]+([.][a-z0-9]+)+" data-valeur-fausse="costcontrol" aria-describedby="e">'
      + '<p id="e" class="e" hidden></p><button type="submit">Ouvrir</button></form></main>'
      + '<script>(function(){var f=document.getElementById("f"),d=document.getElementById("d"),e=document.getElementById("e");'
      + 'function dire(t){e.textContent=t;e.hidden=false;d.setAttribute("aria-invalid","true");}'
      + (o.verifie
        ? 'd.addEventListener("blur",function(){fetch(' + JSON.stringify(o.verifie) + ',{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({valeur:d.value})})'
          + '.then(function(r){return r.json();}).then(function(j){if(!j.ok)dire(j.message);}).catch(function(){});});'
        : 'd.addEventListener("blur",function(){dire(' + JSON.stringify(BON) + ');});')
      + (o.natif ? '' : 'f.addEventListener("submit",function(ev){ev.preventDefault();'
        + (o.envoiFetch ? 'fetch(f.action,{method:"POST"}).catch(function(){});'
          : 'if(d.getAttribute("aria-invalid")==="true")return;fetch("/mandat",{method:"POST"}).catch(function(){});') + '});')
      + '})();</script></body></html>';
    const serveur = spawn(process.execPath, [path.join(ici, 'lib', 'serveur-recette-verification.mjs'), dossier, String(port), journal], { stdio: 'ignore' });
    try {
      fs.copyFileSync(fx('erreurs-formulaire-verifier-verte.html'), path.join(dossier, 'erreurs-formulaire-verifier-verte.html'));
      let pret = false;
      for (let i = 0; i < 40 && !pret; i++) {
        const s = spawnSync(process.execPath, ['-e', 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))', `http://127.0.0.1:${port}/erreurs-formulaire-verifier-verte.html`]);
        pret = s.status === 0;
      }
      if (!pret) {
        ligne(false, 'serveur local de recette indisponible');
      } else {
        const jouerHttp = nom => {
          fs.writeFileSync(journal, '');
          const r = spawnSync(process.execPath, [path.join(ici, 'oracle-erreurs-formulaire.mjs'), `http://127.0.0.1:${port}/${nom}`, '--json-only'],
            { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
          let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
          const regles = new Set((j?.findings || []).map(x => x.regle));
          const posts = fs.readFileSync(journal, 'utf8').split(/\r?\n/).filter(Boolean);
          return { code: r.status, json: j, regles, posts, m: (j?.mesures || [])[0] || {} };
        };
        const ecrire = (nom, o) => { fs.writeFileSync(path.join(dossier, nom + '.html'), page(o), 'utf8'); return nom + '.html'; };
        const seule = (x, rg) => x.regles.has(rg) && [...x.regles].filter(y => y !== rg).length === 0;

        // Sens vert : la déclaration data-verifier (fixture), puis la convention du dernier segment sans déclaration.
        const verte = jouerHttp('erreurs-formulaire-verifier-verte.html');
        ligne(verte.code === 0 && verte.json?.champs_eprouves === 1 && verte.m.invalide && verte.m.apres_sortie && verte.m.requetes_ecriture === 0 && verte.m.verifications_passees === 1,
          `sens vert · data-verifier : la réponse du serveur est dite sous le champ à la sortie, aria-invalid, 1 vérification passée, 0 écriture interceptée, PASS exit 0 (obtenu ${verte.json?.verdict}, exit ${verte.code}, passées ${verte.m.verifications_passees}, écritures ${verte.m.requetes_ecriture})`);
        ligne(verte.posts.join() === 'POST /mandat/verifier' && /« costcontrol » n'est pas un domaine connu/.test(verte.m.message || ''),
          `sens vert · le serveur a reçu la seule vérification déclarée (journal « ${verte.posts.join(' ; ')} ») et le message reprend la saisie`);
        ligne((verte.json?.non_juge || []).some(n => /^1 requête\(s\) de vérification au champ DÉCLARÉE\(S\) sans effet/.test(n)),
          'sens vert · l\'absence d\'effet n\'est pas prouvée : la promesse du produit et le compte des requêtes passées sont dits au non_juge');
        const conv = jouerHttp(ecrire('convention', { verifie: '/clients/verifier' }));
        ligne(conv.code === 0 && conv.m.verifications_passees === 1 && conv.posts.join() === 'POST /clients/verifier',
          `sens vert · dernier segment /verifier sans data-verifier : la vérification passe (journal « ${conv.posts.join(' ; ')} »), PASS exit 0 (obtenu ${conv.json?.verdict}, exit ${conv.code})`);

        // Sens rouge : le journal du serveur reste VIDE, preuve que rien d'autre n'arrive jusqu'à lui.
        const nonDeclare = jouerHttp(ecrire('non-declare', { verifie: '/mandat/enregistrer' }));
        ligne(nonDeclare.code === 1 && nonDeclare.regles.has('EF4') && nonDeclare.m.verifications_passees === 0 && nonDeclare.posts.length === 0,
          `sens rouge · écriture non déclarée (POST /mandat/enregistrer à la sortie du champ) : interceptée, EF4, journal vide (obtenu ${nonDeclare.json?.verdict}, journal « ${nonDeclare.posts.join(' ; ')} »)`);
        const autreChemin = jouerHttp(ecrire('autre-chemin', { declare: '/mandat/verifier', verifie: '/mandat/creer' }));
        ligne(autreChemin.code === 1 && autreChemin.regles.has('EF4') && autreChemin.m.verifications_passees === 0 && autreChemin.posts.length === 0,
          `sens rouge · data-verifier ne couvre que son chemin (POST /mandat/creer appelé) : interceptée, EF4, journal vide (obtenu ${autreChemin.json?.verdict}, journal « ${autreChemin.posts.join(' ; ')} »)`);
        const natif = jouerHttp(ecrire('envoi-natif', { action: '/mandat/verifier', declare: '/mandat/verifier', natif: true }));
        ligne(natif.code === 1 && seule(natif, 'EF4') && natif.m.verifications_passees === 0 && natif.posts.length === 0,
          `sens rouge · l'envoi natif du formulaire dont l'action est /mandat/verifier reste intercepté : EF4 seul, journal vide (obtenu ${natif.json?.verdict}, ${[...natif.regles].join(',')}, journal « ${natif.posts.join(' ; ')} »)`);
        const parFetch = jouerHttp(ecrire('envoi-fetch', { action: '/mandat/verifier', declare: '/mandat/verifier', envoiFetch: true }));
        ligne(parFetch.code === 1 && seule(parFetch, 'EF4') && parFetch.m.verifications_passees === 0 && parFetch.posts.length === 0,
          `sens rouge · l'envoi par fetch vers l'action en /verifier reste intercepté : EF4 seul, journal vide (obtenu ${parFetch.json?.verdict}, ${[...parFetch.regles].join(',')}, journal « ${parFetch.posts.join(' ; ')} »)`);
        const autreOrigine = `http://localhost:${port}/mandat/verifier`;
        const ailleurs = jouerHttp(ecrire('autre-origine', { declare: autreOrigine, verifie: autreOrigine }));
        ligne(ailleurs.code === 1 && ailleurs.regles.has('EF4') && ailleurs.m.verifications_passees === 0 && ailleurs.posts.length === 0,
          `sens rouge · vérification déclarée vers une autre origine que la page : interceptée, EF4, journal vide (obtenu ${ailleurs.json?.verdict}, journal « ${ailleurs.posts.join(' ; ')} »)`);
      }
    } finally {
      serveur.kill();
      fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
    }
  }
}

// TF-2309 (lot Produit-81 du 09/11/2026) — UNE PAGE CAPTURÉE D'UNE INSTANCE SERVIE SE REND AUTONOME AVANT LES ORACLES.
// Ses feuilles de style et ses scripts restaient des ressources externes (/assets/app.css), introuvables à côté du fichier :
// les oracles statiques jugeaient une page sans CSS (oracle-tokens FAIL sur une page conforme) et render_page.py une copie aux
// liens cassés (un débordement factice à 390 px). run-oracles-design --origine lit ces ressources à l'origine servie, de la
// boucle locale seulement, et les intègre à une copie temporaire. Deux étages : la lib sans réseau (lecture injectée, la
// borne du tiers se prouve par ce que la lecture N'A PAS reçu), puis de bout en bout contre le serveur de recette.
{
  console.log(String.fromCharCode(10) + 'run-oracles-design --origine (TF-2309) — une page capturée est rendue autonome avant les oracles');
  const { rendreAutonome } = await import('./lib/rendre-autonome.mjs');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'autonome-'));
  try {
    const O = 'http://127.0.0.1:1';
    const espion = (reponse = () => 'p { color: #111; }') => { const appels = []; return { appels, lire: async u => { appels.push(u); return reponse(u); } }; };
    const entete = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Capture</title>';
    const fin = '</head><body><main><h1>Capture</h1></main></body></html>';

    // Lib — le sens vert : la feuille et le script liés à l'origine sont intégrés, le script ne ferme pas sa balise.
    const e1 = espion(u => (u.endsWith('.js') ? 'var f = "</script>";' : 'a { background: url(img/x.png); }'));
    const r1 = await rendreAutonome(entete + '<link rel="stylesheet" href="/assets/app.css" media="print">'
      + '<script type="module" src="/assets/app.js" integrity="sha384-x" crossorigin="anonymous"></script>' + fin, { dossier, origine: O, lire: e1.lire });
    ligne(r1.declenche && r1.integrees.length === 2 && e1.appels.join() === `${O}/assets/app.css,${O}/assets/app.js`
      && /<style data-origine="\/assets\/app\.css" media="print">/.test(r1.html) && !/<link rel="stylesheet"/.test(r1.html),
      `lib · sens vert : une feuille liée à l'origine est intégrée en <style data-origine> (media gardé), lue à ${e1.appels[0]} (obtenu ${r1.integrees.length} intégrées)`);
    ligne(/<script data-origine="\/assets\/app\.js" type="module">/.test(r1.html) && !/integrity|crossorigin|src=/.test(r1.html.split('<script')[1] || '') && r1.html.includes('var f = "<\\/script>";') && (r1.html.match(/<\/script>/g) || []).length === 1,
      'lib · sens vert : le script lié est intégré (type gardé, src, integrity et crossorigin retirés) et la balise fermante citée dans son texte est protégée');
    ligne(r1.html.includes(`url(${O}/assets/img/x.png)`),
      'lib · sens vert : un url() relatif de la feuille devient absolu contre la feuille (la police ou l\'image la suit hors de son dossier)');

    // Lib — la borne : rien n'est lu chez un tiers, et ce qui reste lié est dit.
    const e2 = espion();
    const r2 = await rendreAutonome(entete + '<link rel="stylesheet" href="/assets/app.css"><link rel="stylesheet" href="http://exemple.invalid/tiers.css">'
      + '<script src="https://cdn.exemple.invalid/x.js"></script>' + fin, { dossier, origine: O, lire: e2.lire });
    ligne(e2.appels.length === 1 && e2.appels[0] === `${O}/assets/app.css` && r2.non_integrees.length === 2 && r2.non_integrees.every(x => /tiers/.test(x.raison))
      && r2.html.includes('href="http://exemple.invalid/tiers.css"') && r2.html.includes('src="https://cdn.exemple.invalid/x.js"'),
      `lib · sens rouge : une ressource d'un hôte tiers n'est JAMAIS lue (la lecture a reçu ${e2.appels.length} adresse : ${e2.appels.join(' ')}), elle reste liée et est listée non intégrée`);

    // Lib — sans origine à lire, la page repart octet pour octet (comportement d'avant), et ce qui manque est dit avec son remède.
    const autonome = entete + '<style>p{color:#111}</style>' + fin;
    const e3 = espion();
    const r3 = await rendreAutonome(autonome, { dossier, origine: O, lire: e3.lire });
    ligne(!r3.declenche && r3.html === autonome && e3.appels.length === 0 && r3.non_integrees.length === 0,
      'lib · page déjà autonome : repart octet pour octet, aucune lecture');
    fs.writeFileSync(path.join(dossier, 'voisine.css'), 'p { color: #222; }');
    const relatif = entete + '<link rel="stylesheet" href="voisine.css">' + fin;
    const r4 = await rendreAutonome(relatif, { dossier, origine: O, lire: e3.lire });
    ligne(!r4.declenche && r4.html === relatif && e3.appels.length === 0,
      'lib · lien relatif qui se résout à côté de la page : rien à aller chercher, la page repart telle quelle, aucune lecture');
    const r5 = await rendreAutonome(entete + '<link rel="stylesheet" href="/assets/app.css">' + fin, { dossier });
    ligne(!r5.declenche && r5.non_integrees.length === 1 && /--origine/.test(r5.non_integrees[0].raison),
      'lib · sens rouge : ressource introuvable et aucune origine : rien de lu, dite non intégrée avec le remède (--origine)');

    // Lib — l'origine fait foi pour une adresse « racine du site », une ressource illisible n'arrête rien, un commentaire n'agit pas.
    fs.mkdirSync(path.join(dossier, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(dossier, 'assets', 'app.css'), '.local { color: red; }');
    const e6 = espion(() => '.servi { color: blue; }');
    const r6 = await rendreAutonome(entete + '<link rel="stylesheet" href="/assets/app.css">' + fin, { dossier, origine: O, lire: e6.lire });
    ligne(r6.html.includes('.servi') && !r6.html.includes('.local'),
      'lib · /assets/app.css avec une origine : le servi fait foi, pas un fichier de même chemin trouvé en remontant l\'arborescence');
    const e7 = { appels: [] };
    const r7 = await rendreAutonome(entete + '<!-- <link rel="stylesheet" href="/assets/mort.css"> --><link rel="stylesheet" href="/assets/ok.css"><link rel="stylesheet" href="/assets/absent.css">' + fin,
      { dossier, origine: O, lire: async u => { e7.appels.push(u); if (/absent/.test(u)) throw new Error('HTTP 404'); return 'b{color:#000}'; } });
    ligne(e7.appels.length === 2 && !e7.appels.some(u => /mort/.test(u)) && r7.integrees.length === 1 && r7.non_integrees.length === 1 && /HTTP 404/.test(r7.non_integrees[0].raison) && r7.html.includes('href="/assets/absent.css"'),
      'lib · une ressource en HTTP 404 reste liée et dite, les autres sont intégrées ; une balise en commentaire n\'est pas lue');
    const e8 = espion();
    const r8 = await rendreAutonome(entete + `<link rel="stylesheet" href="${O}/a.css">` + fin, { dossier, lire: e8.lire });
    ligne(r8.declenche && e8.appels.join() === `${O}/a.css`,
      'lib · adresse absolue de la boucle locale dans la capture : lue sans --origine');

    // De bout en bout — la capture seule dans un dossier, ses ressources servies par la recette. Le faux « /assets » des
    // essais de lib est retiré : une adresse racine se cherche aussi en remontant, et la capture doit être SEULE.
    fs.rmSync(path.join(dossier, 'assets'), { recursive: true, force: true });
    const journal = path.join(dossier, 'journal.txt');
    const port = 19900 + Math.floor(Math.random() * 90);
    const capt = path.join(dossier, 'capture');
    fs.mkdirSync(capt);
    fs.copyFileSync(fx('capture-externe/capture.html'), path.join(capt, 'capture.html'));
    fs.copyFileSync(fx('capture-externe/capture-rendu.html'), path.join(capt, 'capture-rendu.html'));
    const serveur = spawn(process.execPath, [path.join(ici, 'lib', 'serveur-recette-verification.mjs'), fx('capture-externe'), String(port), journal], { stdio: 'ignore' });
    try {
      let pret = false;
      for (let i = 0; i < 40 && !pret; i++) {
        const s = spawnSync(process.execPath, ['-e', 'fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))', `http://127.0.0.1:${port}/assets/app.css`]);
        pret = s.status === 0;
      }
      if (!pret) {
        ligne(false, 'serveur local de recette indisponible');
      } else {
        const lancer = (cible, ...a) => {
          const r = spawnSync(process.execPath, [path.join(ici, 'run-oracles-design.mjs'), cible, ...a, '--json-only'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: { ...process.env, PYTHONUTF8: '1' } });
          let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
          const verdicts = Object.fromEntries((j?.oracles || []).map(o => [o.oracle, o.verdict]));
          return { code: r.status, json: j, verdicts, nj: j?.non_juge || [] };
        };
        const origine = `http://127.0.0.1:${port}`;
        const reference = lancer(fx('motion-verte.html'));
        const sans = lancer(path.join(capt, 'capture.html'));
        ligne(sans.code === 1 && sans.verdicts['oracle-tokens'] === 'FAIL' && sans.nj.some(n => /NON intégrée\(s\)/.test(n) && /\/assets\/app\.css/.test(n) && /--origine/.test(n)),
          `capture · sans --origine : la page est jugée sans CSS, oracle-tokens FAIL, et le non_juge nomme /assets/app.css et le remède --origine (obtenu ${sans.verdicts['oracle-tokens']}, exit ${sans.code})`);
        const avec = lancer(path.join(capt, 'capture.html'), '--origine', origine);
        ligne(avec.code === 0 && avec.json?.verdict === 'PASS' && JSON.stringify(avec.verdicts) === JSON.stringify(reference.verdicts) && reference.code === 0,
          `capture · avec --origine : rendue autonome, PASS exit 0 et le même verdict par oracle que la page autonome d'origine (obtenu ${avec.json?.verdict}, exit ${avec.code} ; référence ${reference.json?.verdict})`);
        ligne(avec.nj.some(n => /rendue AUTONOME avant les oracles \(TF-2309\) : 1 feuille\(s\) de style et 1 script\(s\) intégrés/.test(n)) && (avec.json?.page_rendue_autonome?.integrees || []).length === 2,
          'capture · avec --origine : le non_juge dit ce qui a été intégré (1 feuille, 1 script) et le JSON porte page_rendue_autonome.integrees');
        ligne(!JSON.stringify(avec.json).includes('forge-design-autonome') && fs.readdirSync(capt).sort().join() === 'capture-rendu.html,capture.html',
          'capture · les constats citent la capture, jamais la copie temporaire, et rien n\'est écrit à côté de la cible');
        const tiers = lancer(path.join(capt, 'capture.html'), '--origine', 'https://exemple.invalid');
        ligne(tiers.code === 2 && tiers.json?.verdict === 'SKIP' && tiers.nj.some(n => /^--origine REFUSÉ pour https:\/\/exemple\.invalid/.test(n)),
          `capture · sens rouge · --origine d'un hôte tiers : REFUSÉ, SKIP exit 2, rien n'est jugé (obtenu ${tiers.json?.verdict}, exit ${tiers.code})`);
        if (!OUTILLAGE_RENDU.ok) {
          console.log(`  SKIP  rendu des captures : outillage de rendu indisponible : ${OUTILLAGE_RENDU.manques.join(' ; ')}`);
        } else {
          // Le symptôme du lot : sans la feuille, un tableau déborde à 390 px (551 px) ; avec elle lue à l'origine, aucun débordement.
          const rendus = j => (j.json?.oracles || []).filter(o => /^render_page/.test(o.oracle));
          const rs = lancer(path.join(capt, 'capture-rendu.html'), '--rendu');
          ligne(rendus(rs).length === 2 && rendus(rs).every(o => o.verdict === 'FAIL' && o.findings.some(f => f.regle === 'V1' && /scrollWidth \d+px > viewport 390px/.test(f.msg))),
            `rendu · sans --origine : render_page voit le débordement factice du document sans feuille (V1, FAIL clair et sombre) (obtenu ${rendus(rs).map(o => o.verdict).join('/')})`);
          const ra = lancer(path.join(capt, 'capture-rendu.html'), '--origine', origine, '--rendu');
          ligne(rendus(ra).length === 2 && rendus(ra).every(o => o.verdict === 'PASS' && o.ecarts_durs === 0),
            `rendu · avec --origine : la feuille intégrée met la page en forme, render_page PASS en clair et en sombre, 0 écart dur (obtenu ${rendus(ra).map(o => `${o.verdict}/${o.ecarts_durs}`).join(' ')})`);
        }
      }
    } finally {
      serveur.kill();
    }
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1904 (étude 20261019i, mesuré le 19/10/2026) — une page jetable de 9 lignes portant une
// boucle infinie de 40 s, une animation JavaScript de 1,2 s et une révocation reduced-motion qui
// ne couvre qu'un des deux éléments animés rendait PASS, exit 0, sans une alerte. R11, R12 et
// R13 sont des AVERTISSEMENTS : elles ne rougissent aucun livrable existant. Les trois paires de
// fixtures ne passent donc pas par CAS (la rouge y doit FAIL, exit 1) : ici la rouge doit rester
// PASS, exit 0, avec UN avertissement de SA règle et aucune des deux autres.
{
  console.log(String.fromCharCode(10) + 'oracle-motion R11–R13 (TF-1904) — avertissements, deux sens, aucun livrable rougi');
  const NEUVES = ['R11', 'R12', 'R13'];
  const jouer = f => {
    const r = spawnSync(process.execPath, [path.join(ici, 'oracle-motion.mjs'), f, '--json-only'], { encoding: 'utf8' });
    let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
    return { code: r.status, verdict: j?.verdict, f: j?.findings || [] };
  };
  const paires = [
    ['R11', 'motion-boucle-verte.html', 'motion-boucle-rouge.html'],
    ['R12', 'motion-js-verte.html', 'motion-js-rouge.html'],
    ['R13', 'motion-couverture-verte.html', 'motion-couverture-rouge.html'],
  ];
  for (const [regle, verte, rouge] of paires) {
    const v = jouer(fx(verte)), r = jouer(fx(rouge));
    ligne(v.code === 0 && v.verdict === 'PASS' && !v.f.some(x => NEUVES.includes(x.regle)),
      `${regle} · sens vert : ${verte} sans aucun avertissement R11–R13 (exit ${v.code}, ${v.verdict})`);
    const siennes = r.f.filter(x => x.regle === regle);
    ligne(r.code === 0 && r.verdict === 'PASS' && siennes.length > 0 && siennes.every(x => x.sev === 'avertissement'),
      `${regle} · sens rouge : ${rouge} lève ${regle} en avertissement SANS rougir la page (exit ${r.code}, ${r.verdict}, ×${siennes.length})`);
    const autres = r.f.filter(x => NEUVES.includes(x.regle) && x.regle !== regle);
    ligne(autres.length === 0, `${regle} · sens rouge : pour la bonne raison, aucune des deux autres règles neuves (obtenu ×${autres.length})`);
  }
  // Le cas mesuré par l'étude, tel quel : les trois défauts sur UNE page, aucun refus, trois avertissements.
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-r11-r13-'));
  try {
    const page = path.join(dossier, 'mesure-etude.html');
    fs.writeFileSync(page, '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Mesure</title><style>'
      + '@keyframes t { to { transform: rotate(360deg); } } @keyframes d { to { transform: translateX(-9px); } }'
      + '.tourniquet { animation: t 2s linear infinite; } .derive { animation: d 40s linear infinite; }'
      + '@media (prefers-reduced-motion: reduce) { .tourniquet { animation: none; } }'
      + '</style></head><body><h1>Mesure</h1><div class="tourniquet">a</div><div class="derive">b</div>'
      + '<script>Motion.animate(".derive", { opacity: [0, 1] }, { duration: 1.2 });</script></body></html>', 'utf8');
    const m = jouer(page);
    const vues = new Set(m.f.filter(x => x.sev === 'avertissement').map(x => x.regle));
    ligne(m.code === 0 && m.verdict === 'PASS' && NEUVES.every(x => vues.has(x)),
      `mesure de l'étude 20261019i · boucle de 40 s + animate(1,2 s) + révocation partielle : PASS exit 0, R11 R12 R13 signalées (exit ${m.code}, ${[...vues].filter(x => NEUVES.includes(x)).join(' ')})`);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-1911 (étude 20261019e, mesuré le 19/10/2026) — sur une page témoin à 14 défauts tirés de cinq
// skills de design tiers, 12 passaient tous les oracles de la forge sans alerte. Sept règles
// statiques en sont extraites (voie taste-skill : attribution `regles-importees-vercel-emil.md`),
// en AVERTISSEMENT, chacune dans l'oracle qui juge déjà son domaine. Comme R11–R13, elles ne
// passent pas par CAS (la rouge y doit FAIL) : la verte doit rester sans la règle, la rouge doit
// rester PASS, exit 0, avec un avertissement de SA règle et aucune des autres règles neuves du
// même oracle (la bonne raison).
{
  console.log(String.fromCharCode(10) + 'sept règles extraites de skills tiers (TF-1911) — avertissements, deux sens, aucun livrable rougi');
  const NEUVES_PAR_ORACLE = {
    'oracle-declencheurs.mjs': ['DE4'], 'oracle-saisie.mjs': ['SA8'], 'oracle-mobile.mjs': ['M10', 'M11'],
    'oracle-surcouche.mjs': ['SC5'], 'oracle-images.mjs': ['I8'], 'oracle-motion.mjs': ['R11', 'R12', 'R13', 'R14'],
  };
  const jouer = (oracle, f) => {
    const r = spawnSync(process.execPath, [path.join(ici, oracle), f, '--json-only'], { encoding: 'utf8' });
    let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
    return { code: r.status, verdict: j?.verdict, f: j?.findings || [] };
  };
  const regles = [
    ['DE4', 'oracle-declencheurs.mjs', 'declencheurs-de4'],
    ['SA8', 'oracle-saisie.mjs', 'saisie-sa8'],
    ['M10', 'oracle-mobile.mjs', 'mobile-m10'],
    ['M11', 'oracle-mobile.mjs', 'mobile-m11'],
    ['SC5', 'oracle-surcouche.mjs', 'surcouche-sc5'],
    ['I8', 'oracle-images.mjs', 'images-i8'],
    ['R14', 'oracle-motion.mjs', 'motion-appui'],
  ];
  for (const [regle, oracle, base] of regles) {
    const neuves = NEUVES_PAR_ORACLE[oracle];
    const v = jouer(oracle, fx(`${base}-verte.html`)), r = jouer(oracle, fx(`${base}-rouge.html`));
    ligne(v.code === 0 && v.verdict === 'PASS' && !v.f.some(x => neuves.includes(x.regle)),
      `${regle} · sens vert : ${base}-verte.html sans aucun avertissement de ${neuves.join('/')} (exit ${v.code}, ${v.verdict})`);
    const siennes = r.f.filter(x => x.regle === regle);
    ligne(r.code === 0 && r.verdict === 'PASS' && siennes.length > 0 && siennes.every(x => x.sev === 'avertissement'),
      `${regle} · sens rouge : ${base}-rouge.html lève ${regle} en avertissement SANS rougir la page (exit ${r.code}, ${r.verdict}, ×${siennes.length})`);
    const autres = r.f.filter(x => neuves.includes(x.regle) && x.regle !== regle);
    ligne(autres.length === 0, `${regle} · sens rouge : pour la bonne raison, aucune autre règle neuve de ${oracle} (obtenu ×${autres.length})`);
  }
}

// Essai unslop du 09/11/2026 — deux signes de « unslop » (Damir Sokolovsky, CC BY 4.0, attribution
// `regles-importees-unslop.md`) entrent dans oracle-slop en AVERTISSEMENT : S11 halo coloré, S12 forme
// floue. Même contrat que le bloc TF-1911 : la verte reste sans S11 ni S12, la rouge reste PASS, exit 0,
// avec un avertissement de SA règle seulement.
{
  console.log(String.fromCharCode(10) + 'oracle-slop S11 et S12 (essai unslop du 09/11/2026) — avertissements, deux sens, aucun livrable rougi');
  const NEUVES = ['S11', 'S12'];
  const jouer = (f) => {
    const r = spawnSync(process.execPath, [path.join(ici, 'oracle-slop.mjs'), f, '--json-only'], { encoding: 'utf8' });
    let j = null; try { j = JSON.parse(r.stdout.trim()); } catch { /* illisible : la ligne le dira */ }
    return { code: r.status, verdict: j?.verdict, f: j?.findings || [] };
  };
  for (const [regle, base, attendus] of [['S11', 'slop-s11', 4], ['S12', 'slop-s12', 2]]) {
    const v = jouer(fx(`${base}-verte.html`)), r = jouer(fx(`${base}-rouge.html`));
    ligne(v.code === 0 && v.verdict === 'PASS' && !v.f.some(x => NEUVES.includes(x.regle)),
      `${regle} · sens vert : ${base}-verte.html sans S11 ni S12 (ombre décalée, anneau de focus, inset, gris, variable ; backdrop-filter, flou léger) (exit ${v.code}, ${v.verdict})`);
    const siennes = r.f.filter(x => x.regle === regle);
    ligne(r.code === 0 && r.verdict === 'PASS' && siennes.length === attendus && siennes.every(x => x.sev === 'avertissement'),
      `${regle} · sens rouge : ${base}-rouge.html lève ${attendus} ${regle} en avertissement SANS rougir la page (exit ${r.code}, ${r.verdict}, ×${siennes.length})`);
    const autres = r.f.filter(x => NEUVES.includes(x.regle) && x.regle !== regle);
    ligne(autres.length === 0, `${regle} · sens rouge : pour la bonne raison, aucune autre règle neuve (obtenu ×${autres.length})`);
  }
}

// TF-2043 (02/11/2026) — LA VALEUR AFFICHÉE ÉGALE SA SOURCE, ET SANS DÉCLARATION L'ORACLE SE TAIT EN LE DISANT.
// Le cas de la table ci-dessus joue la verte et la rouge. Ce bloc joue ce que la table ne sait pas dire :
// la déclaration absente ou vide rend SKIP exit 2 (jamais PASS), la déclaration voisine de la page est
// trouvée sans option, la page SERVIE par http est relue (verte PASS, rouge FAIL), une page injoignable ou
// en 404 est SKIP, la source qui change sans que la page suive est refusée (l'oracle rejoue la commande, il
// ne lit pas le code de la page), et le point d'entrée enrôle l'oracle sur la déclaration seulement.
{
  console.log('\noracle-valeur-affichee (TF-2043) — déclaration absente, page servie, source qui change, point d\'entrée');
  const http = await import('node:http');
  const dossierFx = fx('valeur-affichee');
  const jouer = argv => new Promise(resolve => {
    const p = spawn(process.execPath, [...argv, '--json-only'], { env: process.env });
    let sortie = '';
    p.stdout.on('data', d => { sortie += d; });
    p.on('close', code => { let json = null; try { json = JSON.parse(sortie.trim()); } catch { /* illisible : la ligne le dira */ } resolve({ code, json }); });
  });
  const oracle = path.join(ici, 'oracle-valeur-affichee.mjs');
  const agregat = path.join(ici, 'run-oracles-design.mjs');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'va-'));
  const prepare = (nom, page, declaration) => {
    const d = path.join(dossier, nom);
    fs.mkdirSync(d);
    for (const f of ['package.json', 'environnement.txt', 'date.txt']) fs.copyFileSync(path.join(dossierFx, f), path.join(d, f));
    fs.writeFileSync(path.join(d, 'page.html'), page, 'utf8');
    if (declaration !== null) fs.writeFileSync(path.join(d, 'valeurs-derivees.json'), declaration, 'utf8');
    return d;
  };
  const verteHtml = fs.readFileSync(path.join(dossierFx, 'verte.html'), 'utf8');
  const verteJson = fs.readFileSync(path.join(dossierFx, 'verte.json'), 'utf8');
  const rougeJson = fs.readFileSync(path.join(dossierFx, 'rouge.json'), 'utf8');
  const serveur = http.createServer((req, res) => {
    const fichier = { '/verte': 'verte.html', '/rouge': 'rouge.html' }[req.url];
    if (!fichier) { res.writeHead(404); res.end('absent'); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(dossierFx, fichier)));
  });
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const port = serveur.address().port;
  try {
    const sans = await jouer([oracle, path.join(prepare('sans', verteHtml, null), 'page.html')]);
    ligne(sans.code === 2 && sans.json?.verdict === 'SKIP' && (sans.json?.findings || []).some(f => f.regle === 'VA0'),
      `déclaration absente · SKIP exit 2, dit par VA0, jamais PASS (obtenu ${sans.json?.verdict}, exit ${sans.code})`);
    const vide = await jouer([oracle, path.join(prepare('vide', verteHtml, '{"schema":"digit-ai/valeurs-derivees@1","valeurs":[]}'), 'page.html')]);
    ligne(vide.code === 2 && vide.json?.verdict === 'SKIP',
      `déclaration sans valeur · SKIP exit 2, rien à comparer n'est pas une page conforme (obtenu ${vide.json?.verdict}, exit ${vide.code})`);
    const illisible = await jouer([oracle, path.join(prepare('illisible', verteHtml, '{ pas du json'), 'page.html')]);
    ligne(illisible.code === 1 && (illisible.json?.findings || []).some(f => f.regle === 'VA4' && f.sev === 'bloquant'),
      `déclaration illisible · FAIL VA4 : un fichier présent et cassé n'est pas une déclaration absente (obtenu ${illisible.json?.verdict}, exit ${illisible.code})`);

    const voisine = prepare('voisine', verteHtml, verteJson);
    const trouvee = await jouer([oracle, path.join(voisine, 'page.html')]);
    ligne(trouvee.code === 0 && trouvee.json?.verdict === 'PASS' && trouvee.json?.valeurs_comparees === 3,
      `déclaration voisine de la page · trouvée sans option, 3 valeurs comparées, PASS (obtenu ${trouvee.json?.verdict}, ×${trouvee.json?.valeurs_comparees})`);

    // La source change, la page non : l'oracle rejoue la commande, il ne lit pas le code qui écrit la page.
    fs.writeFileSync(path.join(voisine, 'package.json'), '{ "version": "1.8.1" }\n', 'utf8');
    const derive = await jouer([oracle, path.join(voisine, 'page.html')]);
    ligne(derive.code === 1 && (derive.json?.findings || []).some(f => f.regle === 'VA1' && f.sev === 'bloquant' && /1\.8\.1/.test(f.msg)),
      `source qui change · la page garde v1.8.0, la commande rend 1.8.1 : FAIL VA1 (obtenu ${derive.json?.verdict}, exit ${derive.code})`);

    const servieVerte = await jouer([oracle, `http://127.0.0.1:${port}/verte`, '--declaration', path.join(dossierFx, 'verte.json')]);
    ligne(servieVerte.code === 0 && servieVerte.json?.verdict === 'PASS',
      `page servie par http · verte relue sur le réseau : PASS (obtenu ${servieVerte.json?.verdict}, exit ${servieVerte.code})`);
    const servieRouge = await jouer([oracle, `http://127.0.0.1:${port}/rouge`, '--declaration', path.join(dossierFx, 'rouge.json')]);
    ligne(servieRouge.code === 1 && (servieRouge.json?.findings || []).some(f => f.regle === 'VA1' && /v1\.06/.test(f.msg)),
      `page servie par http · rouge relue sur le réseau : FAIL VA1 sur « v1.06 » (obtenu ${servieRouge.json?.verdict}, exit ${servieRouge.code})`);
    const absente = await jouer([oracle, `http://127.0.0.1:${port}/absente`, '--declaration', path.join(dossierFx, 'verte.json')]);
    ligne(absente.code === 2 && absente.json?.verdict === 'SKIP',
      `page en 404 · SKIP exit 2, une page non servie ne se juge pas (obtenu ${absente.json?.verdict}, exit ${absente.code})`);

    // Le point d'entrée : la même page verte par ailleurs (motion-verte) reçoit un pied qui affiche les valeurs.
    const piedAffiche = fs.readFileSync(fx('motion-verte.html'), 'utf8').replace('</body>',
      '  <footer><span class="version">v1.8.0</span> · <span>Environnement : recette</span> · <time class="maj">Mis à jour le 02/11/2026</time></footer>\n</body>');
    const juste = prepare('agregat-juste', piedAffiche, verteJson);
    const faux = prepare('agregat-faux', piedAffiche, rougeJson);
    const sansDecl = prepare('agregat-sans', piedAffiche, null);
    const trouve = r => (r.json?.oracles || []).find(o => o.oracle === 'oracle-valeur-affichee');
    const aJuste = await jouer([agregat, path.join(juste, 'page.html')]);
    ligne(aJuste.code === 0 && aJuste.json?.verdict === 'PASS' && trouve(aJuste)?.verdict === 'PASS',
      `point d'entrée · déclaration voisine : oracle-valeur-affichee lancé et PASS, verdict PASS exit 0 (obtenu ${aJuste.json?.verdict}, exit ${aJuste.code})`);
    const aFaux = await jouer([agregat, path.join(faux, 'page.html')]);
    const autres = (aFaux.json?.oracles || []).filter(o => o.verdict === 'FAIL' && o.oracle !== 'oracle-valeur-affichee');
    ligne(aFaux.code === 1 && aFaux.json?.verdict === 'FAIL' && trouve(aFaux)?.verdict === 'FAIL' && autres.length === 0,
      `point d'entrée · déclaration rouge : oracle-valeur-affichee seul en échec, verdict FAIL exit 1 (obtenu ${aFaux.json?.verdict}, exit ${aFaux.code}, autres en échec ×${autres.length})`);
    const aSans = await jouer([agregat, path.join(sansDecl, 'page.html')]);
    ligne(aSans.code === 0 && aSans.json?.verdict === 'PASS' && !trouve(aSans)
      && (aSans.json?.non_juge || []).some(n => /^oracle-valeur-affichee : SANS OBJET — aucune déclaration de valeurs dérivées/.test(n)),
      `point d'entrée · sans déclaration : SANS OBJET dit au non_juge, non lancé, l'agrégat ne tombe pas en INDÉTERMINÉ (obtenu ${aSans.json?.verdict}, exit ${aSans.code})`);
    const aSeul = await jouer([agregat, path.join(faux, 'page.html'), '--oracle', 'valeur-affichee', '--contrat-runner']);
    ligne(aSeul.code === 1 && aSeul.json?.oracle === 'oracle-valeur-affichee' && aSeul.json?.verdict === 'FAIL',
      `point d'entrée · --oracle valeur-affichee --contrat-runner : verdict FAIL exit 1 hors passe du socle (obtenu ${aSeul.json?.verdict}, exit ${aSeul.code})`);
  } finally {
    await new Promise(r => serveur.close(r));
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-2050 (02/11/2026, décision D-132 (a)) — LES FAITS COMMERCIAUX SONT LISTÉS, JAMAIS REFUSÉS, ET LA LISTE REMONTE.
// L'oracle ne passe pas par CAS : sa rouge doit rester PASS, exit 0, avec des avertissements « à faire
// confirmer ». Ce bloc joue les deux sens (rouge pleine de formes, verte sans aucune), la verte piégeuse qui
// mesure le faux positif, l'échec réservé à l'anomalie de l'oracle (table de motifs défaillante, FC9) avec le
// remède joué, le SKIP d'une page non lue, la table comme DONNÉE (un motif ajouté se trouve), la page servie
// par http, et surtout la REMONTÉE : l'avertissement doit arriver intact au rapport du lanceur.
{
  console.log('\noracle-faits-commerciaux (TF-2050) — avertissant jamais bloquant, faux positif mesuré, remontée au lanceur');
  const http = await import('node:http');
  const dossierFx = fx('faits-commerciaux');
  const oracle = path.join(ici, 'oracle-faits-commerciaux.mjs');
  const agregat = path.join(ici, 'run-oracles-design.mjs');
  const jouerBrut = argv => new Promise(resolve => {
    const p = spawn(process.execPath, argv, { env: process.env });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('close', code => { let json = null; try { json = JSON.parse(out.trim()); } catch { /* illisible : la ligne le dira */ } resolve({ code, json, err }); });
  });
  const jouer = argv => jouerBrut([...argv, '--json-only']);
  const avert = j => (j?.findings || []).filter(f => f.sev === 'avertissement');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-'));
  const tableReelle = fs.readFileSync(path.join(ici, '..', 'corpus', 'faits-commerciaux.json'), 'utf8');
  const ecrire = (nom, contenu) => { const f = path.join(dossier, nom); fs.writeFileSync(f, contenu, 'utf8'); return f; };
  const serveur = http.createServer((req, res) => {
    const fichier = { '/rouge': 'rouge.html', '/verte': 'verte.html' }[req.url];
    if (!fichier) { res.writeHead(404); res.end('absent'); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(dossierFx, fichier)));
  });
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const port = serveur.address().port;
  try {
    // ── sens rouge : sept familles, en avertissement seulement ──
    const rouge = await jouer([oracle, path.join(dossierFx, 'rouge.html')]);
    const av = avert(rouge.json);
    const parFamille = f => av.filter(x => x.regle === f).length;
    ligne(rouge.code === 0 && rouge.json?.verdict === 'PASS' && !(rouge.json?.findings || []).some(f => f.sev === 'bloquant' || f.sev === 'majeur'),
      `sens rouge · la page pleine de formes reste PASS exit 0 : un fait trouvé n'échoue jamais (obtenu ${rouge.json?.verdict}, exit ${rouge.code})`);
    ligne(['FC1', 'FC2', 'FC3', 'FC4', 'FC5', 'FC6', 'FC7'].every(f => parFamille(f) > 0),
      `sens rouge · les sept familles FC1 à FC7 sont signalées (FC1 ×${parFamille('FC1')}, FC2 ×${parFamille('FC2')}, FC3 ×${parFamille('FC3')}, FC4 ×${parFamille('FC4')}, FC5 ×${parFamille('FC5')}, FC6 ×${parFamille('FC6')}, FC7 ×${parFamille('FC7')})`);
    ligne(av.length > 0 && av.every(f => /à faire confirmer/.test(f.msg) && f.a_confirmer === true && Number.isInteger(f.ligne) && f.ligne > 0 && typeof f.texte === 'string' && f.texte.length > 0 && /^ligne \d+/.test(f.where)),
      `sens rouge · chaque constat porte sa ligne, son texte exact, « à faire confirmer » et a_confirmer (${av.length} constats)`);
    ligne(rouge.json?.a_faire_confirmer === av.length && (rouge.json?.findings || [])[0]?.regle === 'FC0' && /à faire confirmer/.test(rouge.json.findings[0].msg),
      `sens rouge · le premier constat (FC0, info) résume le compte et le champ a_faire_confirmer le redit (${rouge.json?.a_faire_confirmer})`);
    ligne(parFamille('FC4') >= 5 && ['<s>', '<del>', 'style en ligne', 'règle CSS', 'ancien prix annoncé'].every(m => av.some(f => f.regle === 'FC4' && f.msg.includes(m))),
      `sens rouge · FC4 : les cinq techniques d'un prix barré sont vues (<s>, <del>, style en ligne, règle CSS d'une classe, « au lieu de ») — ×${parFamille('FC4')}`);
    ligne(parFamille('FC1') >= 3 && av.some(f => f.regle === 'FC1' && /JSON-LD/.test(f.msg)) && av.some(f => f.regle === 'FC1' && /microdonnées/.test(f.msg)),
      `sens rouge · FC1 : JSON-LD (aggregateRating, Review) et microdonnées lus (×${parFamille('FC1')})`);
    ligne(['4,8/5', '1 240 avis', 'Plus de 10 000 clients nous font confiance'].every(t => av.some(f => f.texte === t)),
      'sens rouge · le texte exact est celui de la page (« 4,8/5 », « 1 240 avis », « Plus de 10 000 clients nous font confiance »)');
    ligne(av.some(f => f.regle === 'FC7' && /cliniquement prouvé/i.test(f.texte)) && av.some(f => f.regle === 'FC7' && /clinically proven/i.test(f.texte)),
      'sens rouge · FC7 : une allégation en français et une en anglais, lues dans la table');

    // ── sens vert, et la verte piégeuse qui mesure le faux positif ──
    const verte = await jouer([oracle, path.join(dossierFx, 'verte.html')]);
    ligne(verte.code === 0 && verte.json?.verdict === 'PASS' && avert(verte.json).length === 0 && verte.json?.a_faire_confirmer === 0,
      `sens vert · une page sans aucun fait commercial : PASS, 0 constat (obtenu ${verte.json?.verdict}, ×${avert(verte.json).length})`);
    const piegeuse = await jouer([oracle, path.join(dossierFx, 'piegeuse.html')]);
    ligne(piegeuse.code === 0 && piegeuse.json?.verdict === 'PASS' && avert(piegeuse.json).length === 0,
      `verte piégeuse · prix non barré, « avis » en phrase ordinaire, « étape 3/5 », citation sans attribution, <del> sans montant, « expire le » d'un jeton, « déjà » sans vente : 0 faux positif sur ${piegeuse.json?.lu?.segments} segments de texte lus (obtenu ×${avert(piegeuse.json).length}${avert(piegeuse.json).length ? ' : ' + avert(piegeuse.json).map(f => f.texte).join(' | ') : ''})`);

    // ── l'échec est réservé à l'anomalie de l'oracle : la table de motifs ──
    const casse = JSON.parse(tableReelle);
    casse.motifs[0].exemple = 'rien à voir avec le motif';
    const fCasse = ecrire('table-casse.json', JSON.stringify(casse));
    const rCasse = await jouer([oracle, path.join(dossierFx, 'verte.html'), '--motifs', fCasse]);
    ligne(rCasse.code === 1 && rCasse.json?.verdict === 'FAIL' && (rCasse.json?.findings || []).some(f => f.regle === 'FC9' && f.sev === 'bloquant' && f.msg.includes(casse.motifs[0].id)),
      `anomalie de l'oracle · un motif qui ne reconnaît pas son exemple : FAIL exit 1, FC9 nomme le motif ${casse.motifs[0].id} (obtenu ${rCasse.json?.verdict}, exit ${rCasse.code})`);
    const corrige = JSON.parse(tableReelle);
    const rCorrige = await jouer([oracle, path.join(dossierFx, 'verte.html'), '--motifs', ecrire('table-corrigee.json', JSON.stringify(corrige))]);
    ligne(rCorrige.code === 0 && rCorrige.json?.verdict === 'PASS',
      `anomalie de l'oracle · le remède joué (l'exemple rétabli) : PASS exit 0 (obtenu ${rCorrige.json?.verdict}, exit ${rCorrige.code})`);
    const invalide = JSON.parse(tableReelle);
    invalide.motifs[1].motif = '(';
    const rInvalide = await jouer([oracle, path.join(dossierFx, 'verte.html'), '--motifs', ecrire('table-invalide.json', JSON.stringify(invalide))]);
    ligne(rInvalide.code === 1 && (rInvalide.json?.findings || []).some(f => f.regle === 'FC9' && /expression invalide/.test(f.msg)),
      `anomalie de l'oracle · une expression invalide : FAIL exit 1, FC9 (obtenu ${rInvalide.json?.verdict}, exit ${rInvalide.code})`);
    const rIllisible = await jouer([oracle, path.join(dossierFx, 'verte.html'), '--motifs', ecrire('table-illisible.json', '{ pas du json')]);
    ligne(rIllisible.code === 1 && (rIllisible.json?.findings || []).some(f => f.regle === 'FC9' && /illisible/.test(f.msg)),
      `anomalie de l'oracle · une table illisible : FAIL exit 1, FC9 (obtenu ${rIllisible.json?.verdict}, exit ${rIllisible.code})`);
    const rAbsente = await jouer([oracle, path.join(dossierFx, 'verte.html'), '--motifs', path.join(dossier, 'inexistante.json')]);
    ligne(rAbsente.code === 1 && (rAbsente.json?.findings || []).some(f => f.regle === 'FC9' && /introuvable/.test(f.msg)),
      `anomalie de l'oracle · une table absente : FAIL exit 1, jamais un repli sur une liste devinée (obtenu ${rAbsente.json?.verdict}, exit ${rAbsente.code})`);
    const contre = JSON.parse(tableReelle);
    contre.motifs[0].contre_exemple = contre.motifs[0].exemple;
    const rContre = await jouer([oracle, path.join(dossierFx, 'verte.html'), '--motifs', ecrire('table-contre.json', JSON.stringify(contre))]);
    ligne(rContre.code === 1 && (rContre.json?.findings || []).some(f => f.regle === 'FC9' && /contre-exemple/.test(f.msg)),
      `anomalie de l'oracle · un motif qui reconnaît son contre-exemple : FAIL exit 1, FC9 (obtenu ${rContre.json?.verdict}, exit ${rContre.code})`);

    // ── la table est une DONNÉE : un motif ajouté se trouve, sans toucher au code ──
    const etendue = JSON.parse(tableReelle);
    etendue.motifs.push({ id: 'FC6-test', famille: 'FC6', langue: 'fr', libelle: 'motif ajouté pour la recette', motif: 'zorglub certifié', exemple: 'zorglub certifié' });
    const fEtendue = ecrire('table-etendue.json', JSON.stringify(etendue));
    const fPage = ecrire('zorglub.html', '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Zorglub</title></head><body><main><p>Un atelier zorglub certifié depuis longtemps.</p></main></body></html>');
    const sansMotif = await jouer([oracle, fPage]);
    const avecMotif = await jouer([oracle, fPage, '--motifs', fEtendue]);
    ligne(avert(sansMotif.json).length === 0 && avert(avecMotif.json).some(f => f.regle === 'FC6' && f.texte === 'zorglub certifié'),
      `donnée éditable · le motif ajouté à la table est trouvé (×${avert(avecMotif.json).length}), absent de la table réelle (×${avert(sansMotif.json).length}) : aucun code touché`);

    // ── SKIP : une page qu'on n'a pas lue n'est pas une page sans fait commercial ──
    const sans = await jouer([oracle]);
    ligne(sans.code === 2 && sans.json?.verdict === 'SKIP' && (sans.json?.findings || []).some(f => f.regle === 'FC0'),
      `SKIP · aucune page fournie : exit 2 dit par FC0, jamais PASS (obtenu ${sans.json?.verdict}, exit ${sans.code})`);
    const introuvable = await jouer([oracle, path.join(dossier, 'absente.html')]);
    ligne(introuvable.code === 2 && introuvable.json?.verdict === 'SKIP', `SKIP · fichier introuvable : exit 2 (obtenu ${introuvable.json?.verdict}, exit ${introuvable.code})`);
    const texte = await jouer([oracle, ecrire('texte.txt', 'bonjour, ceci est un texte sans balise')]);
    ligne(texte.code === 2 && texte.json?.verdict === 'SKIP', `SKIP · contenu qui ne se lit pas comme du HTML : exit 2 (obtenu ${texte.json?.verdict}, exit ${texte.code})`);
    const absente404 = await jouer([oracle, `http://127.0.0.1:${port}/absente`]);
    ligne(absente404.code === 2 && absente404.json?.verdict === 'SKIP', `SKIP · page en 404 : exit 2 (obtenu ${absente404.json?.verdict}, exit ${absente404.code})`);
    const portFerme = await new Promise(resolve => { const s = http.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
    const injoignable = await jouer([oracle, `http://127.0.0.1:${portFerme}/page`]);
    ligne(injoignable.code === 2 && injoignable.json?.verdict === 'SKIP', `SKIP · page injoignable : exit 2 (obtenu ${injoignable.json?.verdict}, exit ${injoignable.code})`);

    // ── la page SERVIE, relue sur le réseau ──
    const servieRouge = await jouer([oracle, `http://127.0.0.1:${port}/rouge`]);
    ligne(servieRouge.code === 0 && servieRouge.json?.verdict === 'PASS' && avert(servieRouge.json).length === av.length,
      `page servie par http · la rouge relue sur le réseau : mêmes ${av.length} constats que le fichier (obtenu ×${avert(servieRouge.json).length})`);
    const servieVerte = await jouer([oracle, `http://127.0.0.1:${port}/verte`]);
    ligne(servieVerte.code === 0 && avert(servieVerte.json).length === 0, `page servie par http · la verte relue sur le réseau : 0 constat (obtenu ×${avert(servieVerte.json).length})`);

    // ── LA REMONTÉE AU RAPPORT DU LANCEUR : c'est tout l'objet ──
    const injectee = fs.readFileSync(fx('motion-verte.html'), 'utf8').replace('</body>',
      '  <section><p>Noté 4,8/5 sur 1 240 avis.</p><p><s>129 €</s> 79 €</p></section>\n</body>');
    const pageLanceur = ecrire('lanceur.html', injectee);
    const lanceur = await jouerBrut([agregat, pageLanceur]);
    const entree = (lanceur.json?.oracles || []).find(o => o.oracle === 'oracle-faits-commerciaux');
    const autresEnEchec = (lanceur.json?.oracles || []).filter(o => o.verdict === 'FAIL' && o.oracle !== 'oracle-faits-commerciaux');
    ligne(lanceur.code === 0 && lanceur.json?.verdict === 'PASS' && entree?.verdict === 'PASS' && autresEnEchec.length === 0,
      `lanceur · une page à faits commerciaux reste PASS exit 0, l'oracle y est lancé sans déclaration (obtenu ${lanceur.json?.verdict}, exit ${lanceur.code}, autres en échec ×${autresEnEchec.length})`);
    ligne(entree && entree.avertissements >= 3 && entree.a_confirmer === entree.avertissements && (entree.findings || []).filter(f => f.a_confirmer && /^ligne \d+/.test(f.where) && f.texte).length === entree.a_confirmer,
      `lanceur · les avertissements ARRIVENT dans oracles[].findings avec ligne et texte exact (×${entree?.a_confirmer}), rien n'est perdu au passage`);
    ligne(lanceur.json?.a_faire_confirmer === entree?.a_confirmer && entree?.a_confirmer > 0,
      `lanceur · l'agrégat porte le total a_faire_confirmer (${lanceur.json?.a_faire_confirmer})`);
    ligne(/\? FC2 · ligne \d+/.test(lanceur.err) && /\? FC4 · ligne \d+/.test(lanceur.err) && /fait\(s\) commercial\(aux\) à FAIRE CONFIRMER/.test(lanceur.err),
      'lanceur · le rapport lisible (stderr) écrit les lignes « ? FC2 · ligne N… » et le total à confirmer, sous un PASS');
    const contrat = await jouer([agregat, path.join(dossierFx, 'rouge.html'), '--oracle', 'faits-commerciaux', '--contrat-runner']);
    ligne(contrat.code === 0 && contrat.json?.oracle === 'oracle-faits-commerciaux' && contrat.json?.verdict === 'PASS' && avert(contrat.json).length === av.length,
      `lanceur · --oracle faits-commerciaux --contrat-runner (forme d'entrée du lanceur général) : PASS exit 0 et les ${av.length} avertissements rendus (obtenu ×${avert(contrat.json).length})`);
    const instance = await jouer([agregat, path.join(dossierFx, 'verte.html'), '--oracle', 'faits-commerciaux', '--instance', `http://127.0.0.1:${port}/rouge`]);
    const parInstance = (instance.json?.oracles || []).filter(o => o.oracle === 'oracle-faits-commerciaux');
    ligne(instance.code === 0 && parInstance.length === 2 && parInstance[0].a_confirmer === 0 && parInstance[1].a_confirmer === av.length,
      `lanceur · --instance : la page servie est lue en plus de la cible (cible ×${parInstance[0]?.a_confirmer}, instance ×${parInstance[1]?.a_confirmer}), verdict PASS exit ${instance.code}`);
    const instanceMorte = await jouer([agregat, path.join(dossierFx, 'verte.html'), '--oracle', 'faits-commerciaux', '--instance', `http://127.0.0.1:${port}/absente`]);
    ligne(instanceMorte.code === 2 && (instanceMorte.json?.oracles || []).some(o => o.oracle === 'oracle-faits-commerciaux' && o.verdict === 'SKIP'),
      `lanceur · une instance injoignable est dite SKIP, l'agrégat devient INDÉTERMINÉ exit 2 (obtenu ${instanceMorte.json?.verdict}, exit ${instanceMorte.code})`);
  } finally {
    await new Promise(r => serveur.close(r));
    fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5 });
  }
}

// TF-2051 (02/11/2026, décision D-133 (a)) — « RIEN À CHANGER » EST UNE SORTIE VALIDE, UNE PASSE DE PLUS SE COMPARE
// À LA PRÉCÉDENTE, ET LA LOI N° 3 RESTE ENTIÈRE. Ces trois points sont de la doctrine écrite dans les deux skills
// de la forge, pas une règle d'oracle : sans verrou, le prochain remaniement les efface sans qu'aucun contrôle
// ne rougisse. Chaque document est lu dans les deux sens — le texte réel porte les trois points, le même texte
// amputé de l'un d'eux est refusé.
{
  console.log(String.fromCharCode(10) + 'skills ameliore-le-design et critique-le-design (TF-2051) — rien à changer, comparaison de deux passes, loi n° 3');
  const plat = t => t.replace(/\s+/g, ' ');
  const POINTS = {
    'skills/ameliore-le-design/references/criteres-sortie.md': {
      rien: /rien à changer » est une sortie valide[\s\S]{0,400}porte sa preuve/i,
      compare: /compar\w+ la version précédente et la candidate, et écrivent ce que l'ajout apporte/i,
      loi3: /loi n° 3 du pilot[^.]*surface implicite[^.]*une fois[^.]*jamais par omission[\s\S]{0,80}n'est pas re-proposée/i,
    },
    'skills/ameliore-le-design/SKILL.md': {
      rien: /« rien à changer » est une sortie valide[\s\S]{0,400}avec sa preuve/i,
      compare: /compare la version précédente et la candidate, et dit ce que l'ajout apporte/i,
      loi3: /loi n° 3 reste entière[^.]*se propose une fois, jamais par omission/i,
    },
    'skills/critique-le-design/references/grille.md': {
      rien: /« rien à changer » est une sortie valide[\s\S]*« Rien à changer » et porte sa preuve/i,
      compare: /la passe suivante lit l'écart entre l'ancienne version et la nouvelle[^.]*écrit ce que le changement apporte/i,
      loi3: /loi n° 3 du pilot reste entière[\s\S]*se propose une fois[^.]*jamais par omission[^.]*n'est pas re-proposé/i,
    },
    'skills/critique-le-design/references/restitution.md': {
      rien: /dit « Rien à changer » et porte sa preuve/i,
      compare: /Écart avec la passe précédente[\s\S]*Ce que l'ajout apporte/i,
      loi3: /loi n° 3 du pilot s'applique encore[^.]*surface implicite absente se propose une fois/i,
    },
  };
  // L'amputation qui doit rougir : on retire le point lui-même, pas sa ponctuation.
  const AMPUTE = {
    rien: t => t.replace(/rien à changer/gi, 'tout va bien'),
    compare: t => t.replace(/version précédente|passe précédente|ancienne version/gi, 'version'),
    loi3: t => t.replace(/loi n° 3/gi, 'loi'),
  };
  for (const [doc, points] of Object.entries(POINTS)) {
    const texte = plat(fs.readFileSync(path.join(ici, '..', doc), 'utf8'));
    for (const [nom, motif] of Object.entries(points)) {
      ligne(motif.test(texte), `sens vert · ${doc} écrit le point « ${nom} »`);
      ligne(!motif.test(AMPUTE[nom](texte)), `sens rouge · ${doc} amputé du point « ${nom} » est refusé`);
    }
  }
}

// TF-2180 (05/11/2026) — LES BLOCS JSON DU REGISTRE D'ENTRÉES SE LISENT, ET LA CRITIQUE D'IMPLÉMENTATION NE COMPTE PAS
// LES RÈGLES D'UN ORACLE EN DUR. Aucun oracle ne lisait `oracles/registre-entrees.md` : un bloc ```json y est resté
// invalide (« references\ECRITURE.md », un \E que JSON refuse) sur 13 blocs, sans qu'aucun contrôle ne rougisse.
// Et `critique-implementation.md` citait « X0–X6 » quand `oracle-exploitabilite` porte aussi X7, X8 et X9. Chaque
// contrôle est joué dans les deux sens : le texte réel passe, le même défaut posé à la main est refusé.
{
  console.log(String.fromCharCode(10) + 'registre-entrees.md et critique-implementation.md (TF-2180) — blocs JSON lisibles, règles non comptées en dur');
  const FENCE = String.fromCharCode(96).repeat(3);
  const blocsJson = t => [...t.replace(/\r\n/g, '\n').matchAll(new RegExp(FENCE + 'json\\n([\\s\\S]*?)\\n' + FENCE, 'g'))].map(m => m[1]);
  const invalides = t => blocsJson(t).map((b, i) => { try { JSON.parse(b); return null; } catch (e) { return `bloc ${i + 1} : ${e.message}`; } }).filter(Boolean);
  const registre = fs.readFileSync(path.join(ici, 'registre-entrees.md'), 'utf8');
  const blocs = blocsJson(registre).length;
  ligne(blocs > 0 && invalides(registre).length === 0,
    `sens vert · les ${blocs} blocs JSON de registre-entrees.md se lisent${invalides(registre).length ? ' — ' + invalides(registre).join(' ; ') : ''}`);
  // Le défaut réel du 12/09 : un antislash de chemin Windows non échappé dans une chaîne JSON.
  const BS = String.fromCharCode(92);
  const bloc = chemin => FENCE + 'json\n[\n  { "amont": "plancher (' + chemin + ', 12/09/2026)" }\n]\n' + FENCE + '\n';
  const rouge = bloc('references' + BS + 'ECRITURE.md');
  ligne(blocsJson(rouge).length === 1 && invalides(rouge).length === 1,
    'sens rouge · un bloc au chemin « references\\ECRITURE.md » non échappé est refusé (le défaut du 12/09)');
  // Le remède que le message prescrit (antislash doublé) se joue lui aussi : il doit PASSER.
  const remede = bloc('references' + BS + BS + 'ECRITURE.md');
  ligne(blocsJson(remede).length === 1 && invalides(remede).length === 0 && JSON.parse(blocsJson(remede)[0])[0].amont.includes('references' + BS + 'ECRITURE.md'),
    'sens vert · le même chemin à l\'antislash doublé se lit et redonne le chemin d\'origine');
  ligne(blocsJson('aucun bloc ici').length === 0, 'sens rouge · un texte sans bloc JSON n\'en compte aucun (le contrôle réel exige au moins un bloc)');

  const critique = fs.readFileSync(path.join(ici, '..', 'skills', 'critique-le-design', 'references', 'critique-implementation.md'), 'utf8').replace(/\s+/g, ' ');
  const citePlage = t => /X0\s*[–-]\s*X\d/.test(t);
  const renvoie = t => /oracle-exploitabilite[^.]{0,200}README/.test(t);
  ligne(!citePlage(critique) && renvoie(critique),
    'sens vert · critique-implementation.md ne cite plus de plage « X0–Xn » et renvoie au README pour les règles d\'oracle-exploitabilite');
  ligne(citePlage('Oracle : `oracle-exploitabilite` (X0–X6 : hauteur, densité)') && !renvoie('Oracle : `oracle-exploitabilite` (X0–X6 : hauteur, densité)'),
    'sens rouge · l\'ancienne phrase « (X0–X6 : hauteur… » est refusée (plage en dur, aucun renvoi)');
  // TF-2183 (06/11/2026) : le même compte en dur restait dans l'agrégat, dont un message affiché à l'utilisateur.
  const agregat = fs.readFileSync(path.join(ici, 'run-oracles-design.mjs'), 'utf8');
  ligne(!citePlage(agregat), 'sens vert · run-oracles-design.mjs ne cite plus de plage « X0–Xn » (TF-2183)');
  ligne(citePlage('l\'exploitabilité au volume réel (X0–X6) n\'a pas été jouée'), 'sens rouge · l\'ancien message « (X0–X6) n\'a pas été jouée » est refusé (TF-2183)');
}

// TF-2380 et TF-2381 (campagne du 10/11/2026) — T5 AU DÉTAIL, aux deux sens. Les deux CAS ci-dessus disent
// « PASS » et « FAIL » ; ce bloc dit POURQUOI, sinon une rouge qui échouerait pour une autre raison passerait.
{
  console.log(String.fromCharCode(10) + 'oracle-tokens T5 (TF-2380, TF-2381) — cascade du thème sombre et paire déclarée, aux deux sens');
  const dossierT5 = fs.mkdtempSync(path.join(os.tmpdir(), 'tokens-t5-'));
  try {
    const jouerT5 = (nom, contenu) => {
      const chemin = path.join(dossierT5, nom);
      fs.writeFileSync(chemin, contenu, 'utf8');
      const r = spawnSync(process.execPath, [path.join(ici, 'oracle-tokens.mjs'), chemin, '--json-only'], { encoding: 'utf8' });
      return JSON.parse(r.stdout.trim());
    };
    const t5 = j => j.findings.filter(f => f.regle === 'T5' && f.sev !== 'info');
    const texteDe = f => fs.readFileSync(fx(f), 'utf8');

    // TF-2380
    const cascadeVerte = jouerT5('cascade-verte.html', texteDe('tokens-t5-sombre-cascade-verte.html'));
    ligne(cascadeVerte.verdict === 'PASS' && t5(cascadeVerte).length === 0,
      'TF-2380 sens vert · la pose de base remplacée en sombre n\'est plus jugée contre les jetons sombres (aucun constat T5)');
    const cascadeRouge = jouerT5('cascade-rouge.html', texteDe('tokens-t5-sombre-cascade-rouge.html'));
    ligne(t5(cascadeRouge).length === 1 && /--passer-encre.*sur --passer-fond.*thème sombre/.test(t5(cascadeRouge)[0].msg),
      'TF-2380 sens rouge · la paire réellement posée par la règle sombre reste jugée, et elle seule (un constat, thème sombre)');
    // La cascade ne vaut QUE pour le thème sombre : un défaut de la base claire reste refusé.
    const baseClaireFautive = texteDe('tokens-t5-sombre-cascade-verte.html').replace('--blue: #1D4ED8;', '--blue: #93C5FD;');
    const claireRouge = jouerT5('cascade-claire-rouge.html', baseClaireFautive);
    ligne(claireRouge.verdict === 'FAIL' && t5(claireRouge).some(f => /--solid-ink.*sur --blue.*thème clair/.test(f.msg)) && !t5(claireRouge).some(f => /thème sombre/.test(f.msg)),
      'TF-2380 sens rouge · la base claire fautive reste refusée en thème clair, la règle sombre ne la couvre pas');
    // Sans règle sombre pour la remplacer, la paire de base reste jugée contre le thème sombre.
    const sansRemplacement = texteDe('tokens-t5-sombre-cascade-verte.html').replace(/\n\s*:root\[data-theme="dark"\] \.passer \{[^}]*\}/, '');
    const nue = jouerT5('cascade-sans-remplacement.html', sansRemplacement);
    ligne(sansRemplacement !== texteDe('tokens-t5-sombre-cascade-verte.html') && nue.verdict === 'FAIL' && t5(nue).some(f => /--solid-ink.*sur --blue.*thème sombre/.test(f.msg)),
      'TF-2380 sens rouge · sans règle sombre qui la remplace, la paire de base reste jugée en thème sombre (la correction resserre, elle n\'aveugle pas)');

    // TF-2381
    const declareeVerte = jouerT5('declaree-verte.html', texteDe('tokens-t5-declaree-verte.html'));
    ligne(t5(declareeVerte).length === 0 && declareeVerte.non_juge.some(n => /PRÉSUMÉE\(S\) retirée\(s\)/.test(n) && /--texte-clair/.test(n)),
      'TF-2381 sens vert · la paire déclarée lève les paires présumées de son texte, et le non_juge dit lesquelles');
    const sansDeclaration = jouerT5('declaree-absente.html', texteDe('tokens-t5-declaree-verte.html')
      .replace(/\n\s*--paires-contraste:[^\n]*/, ''));
    ligne(t5(sansDeclaration).filter(f => f.sev === 'avertissement' && /PRÉSUMÉE/.test(f.msg)).length >= 2,
      'TF-2381 sens rouge · la même page SANS déclaration garde ses avertissements présumés (c\'est la déclaration qui les lève)');
    const declareeRouge = jouerT5('declaree-rouge.html', texteDe('tokens-t5-declaree-rouge.html'));
    ligne(t5(declareeRouge).some(f => f.sev === 'majeur' && /--texte-doux.*sur --bande.*déclarée par --paires-contraste/.test(f.msg)),
      'TF-2381 sens rouge · la paire DÉCLARÉE reste jugée en majeur quand elle est illisible');
    ligne(t5(declareeRouge).some(f => f.sev === 'avertissement' && /--texte-pale.*sur --fond.*PRÉSUMÉE/.test(f.msg)),
      'TF-2381 sens rouge · un texte que la déclaration ne couvre pas garde sa paire présumée en avertissement');
    // Une paire déclarée identique à une paire présumée devient la paire déclarée : jugée en majeur.
    const memePaire = jouerT5('declaree-meme-paire.html', texteDe('tokens-t5-declaree-verte.html')
      .replace('--texte-clair sur --bande,', '--texte-clair sur --bande, --texte-clair sur --fond,'));
    ligne(t5(memePaire).some(f => f.sev === 'majeur' && /--texte-clair.*sur --fond.*déclarée par --paires-contraste/.test(f.msg)),
      'TF-2381 sens rouge · la paire déclarée qui coïncide avec une présumée est jugée comme déclarée (majeur), pas comme présumée');
  } finally { fs.rmSync(dossierT5, { recursive: true, force: true }); }
}

// TF-2382 (campagne du 10/11/2026) — I7 AU DÉTAIL : la répétition retire les paires fabriquées, pas la paire réelle.
{
  console.log(String.fromCharCode(10) + 'oracle-images I7 (TF-2382) — une répétition n\'est pas une paire de variantes, aux deux sens');
  const lireI7 = f => {
    const r = spawnSync(process.execPath, [path.join(ici, 'oracle-images.mjs'), fx(f), '--json-only', '--env', path.join(os.tmpdir(), 'env-inexistant')], { encoding: 'utf8' });
    return JSON.parse(r.stdout.trim());
  };
  const verte = lireI7('images-repetition-verte.html');
  ligne(verte.verdict === 'PASS' && !verte.findings.some(f => f.regle === 'I7' && f.sev !== 'info'),
    'sens vert · neuf occurrences de trois variantes distinctes, répétées sur trois feuilles — aucun bloquant I7');
  ligne(verte.non_juge.some(n => /6 occurrence\(s\) répétée\(s\)/.test(n)),
    'sens vert · le non_juge dit combien d\'occurrences répétées ont été comptées une fois (6 sur 9), jamais un silence');
  const rouge = lireI7('images-repetition-rouge.html');
  const i7 = rouge.findings.filter(f => f.regle === 'I7' && f.sev === 'bloquant');
  ligne(i7.length === 1 && /« logo-white » et « logo »/.test(i7[0].msg) && /octet pour octet/.test(i7[0].msg),
    'sens rouge · la variante vide cachée derrière la répétition reste refusée : UN bloquant, sur la paire réelle « logo-white » / « logo »');
  ligne(!rouge.findings.some(f => /« (\S+) » et « \1 »/.test(f.msg || '')),
    'sens rouge · aucune paire d\'un actif avec lui-même n\'est plus fabriquée');
}

const joues = CAS.filter(c => !(c.python && !PYTHON) && !(c.rendu && !OUTILLAGE_RENDU.ok));
console.log(echecs === 0
  ? `\nTout vert — ${joues.length} oracles, ${joues.reduce((n, c) => n + c.regles.length, 0)} règles verrouillées.`
    + (sautes.length ? ` ${sautes.length} saut(s) motivé(s) : ${sautes.join(', ')}.` : '')
  : `\n${echecs} vérification(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
