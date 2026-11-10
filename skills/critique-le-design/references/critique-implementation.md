# Critique d'implémentation — mode aval (produit implémenté vs promesse design)

Créé le 2026-08-06 sur retour du premier produit réel : une maquette validée par 46 règles en
amont, des gates fonctionnels en aval — et des écarts visuels trouvés par l'utilisateur en
production. Personne ne regardait le **rendu réel de l'implémentation** avec l'œil du design.
Ce mode ferme ce trou.

## Ce que ce mode est, et n'est pas

- Il **compare l'implémentation à la promesse design du run** : la critique classique juge un
  design dans l'absolu ; ce mode juge un produit contre SES artefacts de référence.
- Il produit des **retours consommables par le développement**, jamais de correctif code —
  la frontière de la forge (« elle s'arrête au design ») reste intacte.
- **Frontière avec forge-tests** (à ne pas dupliquer) : le pan `interface` de forge-tests juge
  *« câblé ou pas »* (la fonction) ; ce mode juge *« conforme à la promesse visuelle ou pas »*
  (la forme). Un bouton câblé mais introuvable, hors tokens ou sans état d'erreur rendu relève
  d'ici ; un bouton joli mais inerte relève de forge-tests.

## Entrées (doubles — c'est la nouveauté)

Ce mode compare toujours DEUX choses : ce qui avait été promis et ce qui a été construit. Le
tableau ci-dessous dit, pour chaque nature d'entrée, où lire la promesse et où lire le constat —
sans les deux colonnes, il n'y a pas d'écart à relever, seulement une opinion.

| Référence (la promesse) | Implémentation (le constat) |
|---|---|
| `forge\etapes\design\tokens.css` du run | le CSS réellement servi par le produit |
| la maquette validée (écrans, états, CTA) | l'instance servie (URL) ou les gabarits/HTML du produit |
| `MARQUE.md` (ton, voix, vocabulaire) | les libellés réels de l'UI |

Sans artefacts de référence (produit hors forge), le mode dégrade en critique classique et le
déclare — jamais de conformité jugée sans référentiel.

## Méthode (8 contrôles, chacun avec preuve)

1. **Tokens** : diff entre le `tokens.css` de référence et le CSS servi — toute divergence de
   valeur est nommée (token, valeur attendue, valeur constatée). Un token absent ou une couleur
   en dur dans l'implémentation = écart. Oracle : `oracle-tokens` sur le CSS servi.
2. **Écrans et états** : chaque écran de la maquette existe dans le produit ; chaque état
   maquetté (vide, erreur, chargement) est atteignable et rendu. Un écran maquetté absent ou un
   état non rendu = écart nommé.
3. **CTA et affordances** : chaque CTA de la maquette existe dans l'implémentation avec sa cible
   (pattern « un CTA = une cible » — la convention `data-action`/`href` de la maquette permet le
   mapping mécanique). Un CTA maquetté disparu, dupliqué ou re-libellé = écart.
   (Le câblage effectif, lui, est jugé par le pan `interface` de forge-tests.)
   **Nature du déclencheur** (TF-0797) : chaque point d'entrée est confronté au registre —
   action = bouton, navigation = lien, fantôme = action secondaire jamais unique. Oracle :
   `oracle-declencheurs` (DE1–DE3), dont le champ `registre` rend la liste des points
   d'entrée de la page avec la nature de chacun. Cette liste est jointe au rapport telle
   quelle : c'est la même mesure qu'en maquette, donc un écart maquette → produit se lit
   d'une colonne à l'autre au lieu de se plaider.
4. **Rendu réel** : `run-oracles-design.mjs <page> --rendu --tokens <tokens-reference>` sur les
   pages clés du produit (ou `render_page.py` contre l'instance servie), **deux thèmes**, tous
   breakpoints — V1 débordements, V2 contraste, V4 chevauchements, a11y.
5. **États, pas seulement le repos** (TF-0493) : `render_page.py <page> --matrice-etats` sur
   toute page portant un composant interactif. Cinq états mesurés ET capturés : tout déplié,
   filtre ouvert sur la **première** puis la **dernière** colonne, filtre ne laissant aucune
   ligne, recherche sans correspondance. *Mesure qui l'impose* : deux défauts trouvés par un
   client sur un seul livrable — un panneau qui crée un ascenseur horizontal à l'ouverture, et un
   bouton « Aucun » qui détruit l'affichage sans un mot — tous deux reproductibles en deux clics,
   tous deux absents du rendu au repos. Un état vide qui ne se déclare pas est **bloquant**
   (`etat_muet`) ; un état dont le déclencheur est absent est **NON JOUÉ**, jamais vert.
6. **Voix** : libellés, messages d'erreur et états vides confrontés à `MARQUE.md` (registre,
   vocabulaire, anti-références). Dérive de ton = écart mineur nommé.
7. **Livré à l'écran** (TF-0796) : tout composant chargé dynamiquement ou rendu en sur-couche
   porte son habillage complet depuis les jetons — voir le volet ci-dessous. Oracle :
   `oracle-surcouche` (SC1–SC4), lancé d'office par `run-oracles-design.mjs` dès qu'un
   `<dialog>`, un `[popover]` ou un `role="dialog"` est détecté dans la page ou ses gabarits,
   **ou dès que la page déclare un thème sombre** (bloc `[data-theme="dark"]`, règle
   `prefers-color-scheme`, y compris dans le fichier `--tokens`) : SC4 juge le thème, pas un
   composant, et s'évalue seule quand aucun composant n'existe (TF-2384).
8. **Exploitabilité au volume réel** (TF-1654, TF-1687) : chaque écran clé se rejoue sur une
   instance **alimentée au volume réel**, jamais sur le seul jeu de démonstration —
   `run-oracles-design.mjs <page> --instance <url|page rendue> [--etat-connexion etat.json]`,
   ou `oracle-exploitabilite.mjs <url>…` en direct. Oracle : `oracle-exploitabilite`, dont les règles (hauteur, densité des lignes, valeurs machine,
   colonnes déséquilibrées, libellés, onglets sous le premier écran, instance, visite guidée, lexique) se lisent
   au README de la forge design, section « Les oracles » (onglets : `patterns-interaction.md`). Une
   application derrière une connexion se juge avec l'état Playwright (storageState) produit
   par son script de connexion (`--etat-connexion`) : sans lui, l'oracle mesure la page de
   connexion, le dit (X0) et ne juge pas l'écran. *Mesure qui l'impose* : des écrans passés
   à la critique, à `render_page.py` et à 3 000 tests sur le jeu de démonstration mesuraient,
   alimentés, 5 220 px en colonnes déséquilibrées. Sans instance alimentée, le contrôle est
   **NON JOUÉ** et se déclare au rapport, jamais vert ; il se rejoue après la première
   alimentation réelle.
   **Une page d'application sans instance échoue (TF-2121).** Le point d'entrée ne la dit plus « SANS
   OBJET » : il rend FAIL (X7, `oracle-exploitabilite`) tant que `--instance` manque, parce qu'une ligne
   « sans objet » au `non_juge` laissait lire un PASS. *Mesure qui l'impose* : dix pages d'application du
   lot Produit-86 (03/11/2026) rendues PASS à la critique, sans aide de champ ni filtre, deux défauts
   trouvés dès l'instance jouée. La critique d'implémentation **déclare la nature de la page** :
   `--type-page application` (ou `<meta name="forge-type-page" content="application">` dans la page ; la
   structure `data-panneau-tache`, `data-branche`, `data-exigence` la classe d'elle-même). `--maquette`
   exempte une maquette, qui n'a pas d'instance par nature, et ne s'emploie jamais ici. Une instance
   locale en https à certificat auto-signé se joint avec `--accepter-certificat-local`, réservé aux hôtes
   `localhost`, `127.0.0.1` et `::1` (TF-2122).
   **Un volume minimal pour juger un écran de données (TF-2199).** La critique d'un écran à tableau se joue
   sur au moins 5 lignes visibles par tableau (le seuil de la règle X2) ; en deçà, la densité n'est pas
   mesurée et `oracle-exploitabilite` le dit en avertissement « X2 NON JOUÉ » (jamais en vert muet). Le
   rapport déclare ce contrôle NON JOUÉ tant que l'instance n'a pas ce volume, et le rejoue après
   l'alimentation. *Mesure qui l'impose* : une file d'approbation rendue PASS à la critique le 04/11/2026
   rendait, au volume réel, 13 contrôles sur 15 avec 25 demandes, les mêmes écarts sur HEAD et sur la
   branche corrigée. Règle jouée par `node oracles\self-test-exploitabilite.mjs` (tableau de 3 lignes
   contre l'écran vert de 12). **La visite guidée ne se juge pas au rendu statique.** Une application qui ouvre sa
   visite au premier affichage en montre la bulle sur la page rendue, qui recouvre l'écran et fabrique des écarts
   (V1, V7, V25) que le produit n'a pas. `run-oracles-design.mjs --rendu` masque les éléments
   `[data-visite-etape]` dans ses copies de rendu (`neutraliserVisite`, `lib/rendu.mjs`) et le dit au `non_juge` ;
   le câblage de la visite est jugé par X8, sur l'instance. Une bulle qui ne porte pas ce marqueur n'est pas masquée.

## La promesse cite la demande, et un modèle désigné se joue (TF-1940, 21/10/2026)

Quand le run répond à une demande humaine, la promesse que la critique pose pour un point de
cette demande n'est pas un résumé : c'est la demande elle-même. Trois règles, écrites dans la
section « Liste de contrôle de la demande » de `revue-implementation.md`
(`references/liste-de-controle-demande.md`) :

1. **La promesse cite la demande entre guillemets, mot pour mot.** « Semaine au choix » n'est
   pas la demande, c'est son interprétation ; c'est en la résumant qu'on perd ce qui la contraint.
   Un résumé peut s'ajouter à la citation, jamais la remplacer.
2. **« Comme pour X », « comme sur X », « pareil que X » devient un critère nommé** : le même
   geste joué sur X et sur le livrable, puis comparé. La ligne écrit le geste (ce qu'on clique,
   dans quel ordre, ce qui reste libre), les deux preuves côte à côte (capture ou parcours rejoué
   des deux côtés) et le verdict de la comparaison. Un modèle qu'on ne rejoue pas est lu comme
   une inspiration, et le livrable en prend à son aise.
3. **Tout contrôle d'interface que le livrable ajoute et que la demande ne porte pas est déclaré
   « ajout »** : une ligne `AJOUT — <contrôle>` dans la même liste, avec sa capture. Elle n'a rien
   à citer ; elle est posée à l'humain, qui garde ou retire. Un ajout non déclaré est un point
   que personne n'a demandé et que personne n'a vu passer.

*Le fait* (18-19/10/2026, un produit). Demande, mot pour mot : « Un sélecteur de calendrier, comme
pour la réservation, réglé par défaut sur les 3 prochaines semaines, qui peut être modifié pour
sélectionner une semaine en particulier ». Le calendrier de réservation choisit une arrivée puis un
départ ; la refonte de l'agenda a sélectionné la semaine entière du jour cliqué, sans début ni fin
libres. La promesse résumait la demande (« semaine au choix »), sans la citer, et l'a jugée tenue ;
un bouton « Voir les N évènements », non demandé, est passé de même. Retour humain : « ça n'a
jamais été demandé ».

Contrôle exécuté : `node oracles\oracle-liste-demande.mjs <revue-implementation.md>` — **D4**
refuse une ligne dont le point demandé n'est pas cité entre guillemets (hors ligne `AJOUT`) ;
**D5** refuse une demande citée qui désigne un modèle sans que la ligne nomme un critère de
comparaison et ce modèle. Il ne lit ni la demande d'origine ni le livrable : il ne sait pas que la
citation est exacte, ni qu'un ajout a été oublié (c'est la relecture, contre le fil de la demande),
et sans section « Liste de contrôle de la demande » il rend SANS OBJET.

## Volet « livré à l'écran » — ce que la page ne dessine pas elle-même

Les contrôles 1 à 6 et 8 jugent ce que le produit dessine. Il reste une part de l'écran
que **le navigateur** dessine à sa place, et que personne ne regardait : la boîte d'un
`dialog` en top-layer, son voile `::backdrop`, les contrôles de formulaire natifs, les barres
de défilement, l'autofill. Cette part suit `color-scheme`, et `color-scheme` seul.

Le fait qui l'impose (01/09/2026, produit 02) : une fenêtre `dialog` de choix de dossier,
stylée aux jetons et **PASS** à sa campagne (api 483/483, suite 989/989), s'est affichée en
boîte sombre aux boutons natifs sur le poste de l'utilisateur — mode sombre au niveau du
système, composant en top-layer, `color-scheme` absent du socle. Mots de l'utilisateur :
« des trucs moches sortis de nulle part ». La grille jugeait le rendu au repos ; le composant
n'existait qu'après un clic, et son habillage n'était complet que sur le poste de l'auteur.

Ce volet se lit règle par règle : la colonne « Exigé » porte ce qui doit être écrit dans le
CSS livré, la colonne « Refusé par » nomme la règle d'oracle qui le mesure. Rien n'y est
laissé à l'appréciation — une facette absente est le rendu par défaut du navigateur, jamais
un choix de design.

| Exigé sur le produit livré | Refusé par |
|---|---|
| la surface du composant porte fond, contour, et couleur de texte s'il est natif | `oracle-surcouche` SC1 |
| chaque bouton ou champ de la sur-couche porte fond (ou `appearance`) et couleur | SC2 |
| le voile d'un modal natif est habillé (`::backdrop`) depuis les jetons | SC3 |
| `color-scheme: light` au bloc de base, `color-scheme: dark` au bloc sombre | SC4 |
| l'anneau de focus est prescrit par un jeton et contrasté | `oracle-tokens` T8 (non dupliqué) |

Trois conséquences pour la revue :

1. **Le composant se juge ouvert, pas au repos.** La matrice d'états du contrôle 5 est le
   seul endroit où un `dialog` est mesuré à l'écran ; un composant dont le déclencheur est
   absent est **NON JOUÉ**, jamais vert.
2. **Le thème système fait partie du cas de test.** Un rendu vert sur un poste en clair ne
   dit rien du même écran sur un poste en sombre : `run-oracles-design.mjs --rendu` mesure
   déjà les deux thèmes, et SC4 ferme la porte que ce passage laissait ouverte.
3. **`<meta name="color-scheme">` ne vaut pas déclaration.** Il annonce ce que la page
   supporte ; il ne suit pas la bascule. SC4 le dit dans son message plutôt que de laisser
   l'auteur croire qu'il a fait le nécessaire.

## Variante pour les supports sans CSS — deck PPTX et PDF imprimé (TF-2386, TF-2385)

Le produit livré n'est pas toujours une page : une propale, un livret, un dossier se rendent en
deck PPTX ou en PDF. Les huit contrôles ci-dessus lisent du HTML ; sur ces supports, la critique
joue `node oracles\oracle-document-imprime.mjs <fichier.pptx|.pdf> [--seuil-mm 10] [--pages-libres 1,4]`,
qui lit la géométrie du rendu (PyMuPDF, python-pptx) et rend le contrat commun des oracles :

| Contrôle de la critique | Règle de la variante |
|---|---|
| forme étroite accolée à un bloc (le motif S1 d'`oracle-slop`) | DP1, une forme pleine de moins de 0,1 po de large contre le bord d'un bloc |
| contraste (V2 de `render_page.py`) | DP2, un texte contre l'aplat qui le porte (4.5:1, 3:1 en grand texte) |
| débordement (V1) | DP3, un texte ou une image hors de la page, un texte hors de son bloc |
| équilibre des colonnes, vide sous le contenu | DP4 et DP5, **sur le PDF imprimé** |

*Une sonde d'impression lit le PDF* (TF-2385). Le 28/09/2026, la page 1 d'un dossier de compétences
laissait 19,8 mm de vide sous les cartes (5,3 mm sur la version du 25/09), vu par la seule sonde de la
critique ; l'émulation d'impression de Playwright place les cartes 2,2 mm plus haut que l'impression
Chrome. Une page HTML dont la mise en page imprimée compte se passe donc à l'oracle, qui l'imprime en
PDF par Chromium d'abord ; pour un pied de page au millimètre, on fournit le PDF imprimé depuis le
navigateur. Le seuil de 10 mm de DP4 et DP5 est un réglage de la forge, posé entre 19,8 mm (refusé) et
5,3 mm (accepté). Une page dont le vide est voulu (un saut de page par section) se déclare par
`--pages-libres` : c'est la déclaration qui exempte, jamais la forme de la page.

Un PPTX n'est pas paginé par le moteur d'impression : DP4 et DP5 y sont dites non jouées, et l'export
PDF du deck se rejoue. L'oracle sans outillage (Python avec pymupdf et python-pptx) rend SKIP exit 2 avec
son motif : la revue le déclare, jamais un PASS.

## Restitution — des retours, pas une revue

Sortie : `revue-implementation.md` — même squelette que `restitution.md` (verdict
Livrer / Renforcer / Refondre, relevé d'oracles, « ce qui n'a pas été jugé ») **plus** une
section « Liste de contrôle de la demande » dès que le run répond à une demande humaine (règles
ci-dessus : citée, modèle joué, ajouts déclarés) **plus** une section « Écarts à la promesse »
où chaque écart est un retour prêt à consigner :

```
- ecart: <tokens|ecran|cta|rendu|voix|exploitabilite>
  ancrage: <écran, sélecteur/ligne, breakpoint, thème>
  attendu: <ce que la référence promet, avec sa source>
  constate: <ce que le produit montre, avec sa preuve>
  gravite: bloquant | majeur | mineur
  correction: <proposition actionnable côté development>
```

Ces écarts sont versés par l'orchestrateur au ledger du run (`type: retour`,
`source: produit`, destinataire development) — c'est l'entrant du delta development, puis du
run de version. Verdict Refondre ou ≥ 1 bloquant → retour à l'étape development (boucle bornée
à 3, partagée avec l'étape tests).

## Place dans le workflow (contrat pilot)

Après les gates de development, **en parallèle de l'étape tests** — regards indépendants
(la fonction pour tests, la forme pour ici). Le verdict entre au dossier de MEP.

## Ce que ce mode ne juge pas (déclaré)

- Le câblage fonctionnel des affordances (→ forge-tests, pan `interface`).
- Les supports sans CSS, **deck PPTX et PDF** : les huit contrôles ci-dessus lisent du HTML (page,
  maquette, instance servie). Leur variante est `oracle-document-imprime` (section précédente) ; ce
  qu'elle ne juge pas (rendu réel d'un PPTX, texte posé sur une image, lisibilité sémantique d'un PDF)
  reste au `non_juge` de sa sortie, et la revue dit si le reste de la grille a été appliqué à la main.
- La pertinence produit des écrans (→ conception).
- Les écarts *voulus* entre maquette et produit : un écart assumé se consigne en hypothèse du
  run avec sa raison — le mode le lit et le classe « écart accepté », pas défaut.
