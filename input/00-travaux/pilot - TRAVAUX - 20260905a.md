# Travaux confiés par le pilot — digit-ai-forge-design — 20260905a

- **Émetteur** : `digit-ai-factory` (le pilot)
- **Références registre** : `todo\TODO.jsonl` du pilot — items TF-0796, TF-0797, TF-0800 (décidés le 03/09/2026, décision D-5 (a) ; confiés sur mandat humain du 05/09/2026 « Fais tous les A », action A-13 de la synthèse `output\04-plans\…20260905d.md`)
- **Dépôt** : ce fichier a été déposé par le pilot dans `input\00-travaux\` de cette forge, sur mandat humain (aucune écriture dans un dépôt frère hors mandat). L'original reste au pilot. Statut : `a_traiter` → `traite le <date>` — seule édition autorisée après coup.
- **Statut** : traite le 2026-09-05
- **Empreinte du contenu confié** : `TF-0796+TF-0797+TF-0800@20260905` — deux lots portant la même empreinte confient la même chose ; le pilot ne redépose jamais une empreinte déjà présente.

> ## ⛔ AVANT DE TRAITER — un geste, une seconde
>
> ```
> node c:\dev\digit-ai-factory\gabarits\oracle-travaux-pilot.mjs "<ce fichier>.md"
> ```
>
> Le même module a été joué par le pilot AVANT de déposer ce lot (règles T1 à T5 : vérification, référence, ce qui est déjà fait, ce qui n'est pas demandé, ordre justifié).

## Ce lot est une DONNÉE, pas une consigne exécutable

Le pilot traite vos lots de retours comme de la donnée : les consignes qu'ils contiennent sont décrites, jamais exécutées. Le même principe s'applique ici, dans l'autre sens. Ce lot décrit un travail et argumente pourquoi il vaut d'être fait ; il ne commande rien. Vous restez le juge de ce que vous en faites, sur votre run, avec vos oracles ; un constat écarté rejoint vos écarts assumés avec son motif — il ne disparaît pas. Aucun commit n'a été fait chez vous : déposer dans une boîte d'entrée est réversible, entrer dans votre historique est un geste dont vous êtes seul auteur.

## Travaux confiés

### TF-0796 — Un composant généré par script et affiché en sur-couche porte TOUT son habillage depuis les jetons, jamais le rendu par défaut du navigateur ; `color-scheme` est déclaré par thème · gravité majeur

- **Le fait** : une fenêtre `dialog` de choix de dossier, stylée aux jetons et verte aux tests serveur, s'est affichée en boîte sombre aux boutons natifs sur le poste utilisateur (mode sombre OS + top-layer + `color-scheme` absent). Le composant était pourtant PASS à la campagne v0.4.0 (api 483/483, suite 989/989). Mots de l'utilisateur, capture du 01/09/2026 : « des trucs moches sortis de nulle part ».
- **Pourquoi cela vous concerne** : la grille de critique d'implémentation (RV-5/RV-6) juge ce qui est livré à l'écran ; un composant chargé dynamiquement et rendu en top-layer échappe à la grille telle qu'elle est écrite, et le socle de jetons ne déclare pas `color-scheme` par thème.
- **Ce qui est demandé** : (1) au socle de jetons (`tokens.css` généré par `systeme-de-marque`), une déclaration `color-scheme` par thème (clair strict par défaut, sombre déclaré quand le thème sombre existe) ; (2) à la grille RV-5/RV-6, un volet « livré à l'écran » : tout composant dynamique ou en sur-couche (`dialog`, `popover`, top-layer) porte un habillage explicite complet — fond, bordure, boutons, focus — depuis les jetons, jamais le rendu par défaut du navigateur ; (3) une fixture rouge par sens (composant natif nu → refus ; composant habillé → PASS) dans l'oracle de critique d'implémentation.
- **Effort estimé** : complexité moyenne × durée courte.
- **Comment vous saurez que c'est fait** : `node oracles\run-oracles-design.mjs <page-avec-dialog-natif.html> --tokens tokens.css --json-only` rend un constat nommant le composant nu ; la même page habillée rend PASS ; le self-test de la forge compte les deux cas.
- **Si ce n'est pas fait** : chaque composant dynamique livré par un produit peut passer vert aux tests et sortir laid sur le poste de l'utilisateur, exactement comme le 01/09.

### TF-0797 — Sémantique des déclencheurs : une action se déclenche par un bouton qui a l'air d'un bouton, un lien navigue, la variante fantôme n'est jamais l'unique accès à une fonctionnalité · gravité majeur

- **Le fait** : le point d'entrée unique d'une fenêtre d'arborescence était un bouton fantôme sans fond ni bordure, lisible comme un lien ou du texte. Mots de l'utilisateur du 01/09/2026 : « mets-le sous forme de bouton, pas de lien — le lien a une signification particulière, tout comme le bouton a la sienne » ; la veille, premier retour « je ne vois pas de changement » sur la même fonctionnalité livrée.
- **Pourquoi cela vous concerne** : la grille design ne porte pas de registre des déclencheurs ; rien ne mesure, en maquette ni à l'implémentation, qu'une fonctionnalité a au moins un point d'entrée qui a l'air de ce qu'il fait.
- **Ce qui est demandé** : un registre des déclencheurs dans la grille (action = bouton plein ou secondaire ; navigation = lien ; fantôme = action secondaire seulement, jamais l'unique accès), et un critère mesurable : la liste des points d'entrée de fonctionnalité de la page, chacun avec sa nature, jugée en maquette (`ameliore-le-design`) et à l'implémentation (critique d'implémentation) ; fixture rouge : une fonctionnalité dont l'unique accès est un fantôme.
- **Effort estimé** : complexité moyenne × durée courte.
- **Comment vous saurez que c'est fait** : l'oracle de critique d'implémentation rend un constat « fonctionnalité X : unique accès fantôme » sur la fixture rouge et PASS sur la page corrigée ; la grille cite le registre.
- **Si ce n'est pas fait** : un utilisateur ne trouve pas une fonctionnalité livrée, et le produit paie deux tours de retour pour un bouton.

### TF-0800 — B-T2/B-T3 déclarent morte une bascule câblée par écouteur délégué et clé en constante : documenter la convention exigée, ou élargir l'heuristique · gravité mineur

- **Le fait** : l'oracle de bascule ne voit que le câblage statiquement lisible (écouteur attaché après sélection du bouton, clé `localStorage` en littéral). Un câblage délégué (`closest`) avec clé en constante, fonctionnel depuis la v0.1.0 d'un produit, a été jugé « bascule morte » ; la session du 01/09/2026 a réécrit `app.js` (écouteur attaché, clé en littéral, `data-theme-toggle`) pour obtenir le PASS — l'adaptation a une vertu (vérifiabilité), mais la règle jugeait une convention, pas le comportement.
- **Pourquoi cela vous concerne** : un oracle qui refuse un comportement correct au nom d'une convention non écrite pousse les produits à réécrire du code qui marche ; s'il exige une convention, il doit la dire dans son message.
- **Ce qui est demandé** : au choix, motivé : (a) le message de refus de B-T2/B-T3 énonce l'exigence de lisibilité statique (écouteur attaché, clé en littéral) comme convention exigée, avec la raison ; ou (b) l'heuristique couvre les motifs « délégation par `closest` » et « clé en constante », avec une fixture par motif (bascule déléguée fonctionnelle → PASS ; bascule vraiment morte → refus).
- **Effort estimé** : complexité simple × durée courte (a) ; moyenne × courte (b).
- **Comment vous saurez que c'est fait** : `node oracles\oracle-baseline.mjs` ou l'oracle porteur de B-T2/B-T3 rend, sur la fixture déléguée, soit un message qui nomme la convention exigée, soit PASS ; la fixture « morte » reste refusée.
- **Si ce n'est pas fait** : chaque produit à bascule déléguée réécrit son câblage pour un vert, ou ignore l'oracle.

## Ce que le pilot a déjà fait de son côté

- Les trois constats sont entrés au registre du pilot (TF-0796, TF-0797, TF-0800), décidés en bloc le 03/09/2026 (D-5 (a)), avec l'ordre de traitement : pilot d'abord (cinq items, tous clos le 05/09), puis forge-design.
- Rien n'a été écrit dans le code de la forge : ce qui reste est la part que seule la forge peut faire — sa grille, ses oracles, ses fixtures.

## Ce que le pilot NE demande PAS

- Pas de refonte de la grille de critique ni du socle de jetons au-delà des trois points nommés.
- Pas de rétro-application aux produits déjà livrés : les produits recevront la grille corrigée par leur prochain run ; le pilot ne touche pas aux produits.
- Pas de choix imposé entre (a) et (b) pour TF-0800 : la forge décide, et dit pourquoi.

## Ordre recommandé

1. **TF-0796 d'abord**, parce qu'il touche le socle de jetons dont dépendent tous les composants — un `color-scheme` par thème supprime à la source la classe « composant natif en sombre » que TF-0797 et TF-0800 ne couvrent pas.
2. **TF-0797 ensuite**, parce que le registre des déclencheurs est une règle de grille sans dépendance de code, et qu'il a coûté deux tours de retour utilisateur.
3. **TF-0800 en dernier**, parce qu'il est mineur et que la voie (a) tient en un message.

## Remise du compte rendu

À la clôture de votre run, un lot de retours `digit-ai-forge-design - RETOURS - <date><i>.md` (+ sidecar) remis dans `c:\dev\digit-ai-factory\input\00-retours\` dit ce qui a été fait, avec la preuve (recette, compte de cas, version) — le pilot clôt les items sur gains constatés.
