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

## Méthode (7 contrôles, chacun avec preuve)

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
   `<dialog>`, un `[popover]` ou un `role="dialog"` est détecté dans la page ou ses gabarits.

## Volet « livré à l'écran » — ce que la page ne dessine pas elle-même

Les six contrôles ci-dessus jugent ce que le produit dessine. Il reste une part de l'écran
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

## Restitution — des retours, pas une revue

Sortie : `revue-implementation.md` — même squelette que `restitution.md` (verdict
Livrer / Renforcer / Refondre, relevé d'oracles, « ce qui n'a pas été jugé ») **plus** une
section « Écarts à la promesse » où chaque écart est un retour prêt à consigner :

```
- ecart: <tokens|ecran|cta|rendu|voix>
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
- La pertinence produit des écrans (→ conception).
- Les écarts *voulus* entre maquette et produit : un écart assumé se consigne en hypothèse du
  run avec sa raison — le mode le lit et le classe « écart accepté », pas défaut.
