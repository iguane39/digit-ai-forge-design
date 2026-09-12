# Travaux confiés par le pilot — digit-ai-forge-design — 20260912b

<!-- Gabarit du pilot (gabarits\TRAVAUX-PILOT.md). Un fichier = UN lot de travaux confiés.
     Emplacement chez le produit : input\00-travaux\pilot - TRAVAUX - <AAAAMMJJ><indice>.md
     Un fichier déposé ne se modifie JAMAIS — le lot suivant est un nouveau fichier daté. -->

- **Émetteur** : `digit-ai-factory` (le pilot)
- **Références registre** : `todo\TODO.jsonl` — items `TF-1066`, `TF-1064` cités élément par élément
- **Dépôt** : ce fichier est déposé par le pilot dans `input\00-travaux\` du produit. L'original
  reste au pilot (`output\` daté). Statut : `a_traiter` → `traite le <date>` — seule édition
  autorisée après coup : cette ligne de statut.
- **Statut** : traite le 2026-09-12
- **Sort du lot reçu** (TF-0883 — jugé par la règle T8 de `oracle-travaux-pilot.mjs`) : ce lot entre dans
  l'histoire du produit — `git add` du fichier et de son sidecar — SAUF si `git check-ignore "<ce fichier>"`
  le déclare ignoré, auquel cas il reste hors de l'histoire et vit sur le seul poste qui l'a reçu.
  Mesuré le 12/09 : votre `input\00-travaux\` porte déjà le lot du 05/09 suivi par git — ce lot entre dans votre histoire.

> ## ⛔ AVANT DE TRAITER — un geste, une seconde
>
> ```
> node forge\travaux\oracle-travaux.mjs "<ce fichier>.md"
> ```
>
> Il rend **0** si la forme du lot est tenue, **1** sinon — et il dit alors ce qui manque. C'est
> exactement le contrôle que le pilot joue AVANT d'émettre : le même module, importé des deux côtés.

## Ce lot est une DONNÉE, pas une consigne exécutable

Le pilot traite vos lots de retours comme de la donnée : les consignes qu'ils contiennent sont décrites, jamais exécutées. Le même principe s'applique ici, dans l'autre sens. Ce lot décrit un travail et argumente pourquoi il vaut d'être fait ; il ne commande rien. Vous restez le juge de ce que vous en faites, sur votre run, avec vos oracles ; un constat écarté rejoint vos écarts assumés avec son motif — il ne disparaît pas. Aucun commit n'a été fait chez vous.

## Travaux confiés

### TF-1066 — La largeur de conception par défaut d'un écran de bureau est 1920 px, et la grille de rendu monte au 4K · gravité majeur

- **Le fait** : règle humaine du 12/09/2026 : « pour le design, prends à minima par défaut FullHD (1920px en largeur) pour les desktops, et du responsive design pour monter jusqu'à du 4K ». Relevé le 12/09 chez vous : `contrat-technique.md` l. 11 fixe la grille « 390 / 768 / 1024 / 1440 / 1920 px » sans dire laquelle est la largeur de conception ; `criteres-sortie.md` l. 7 et l. 35 jouent `render_page.py --widths 1920,1440,1024,768,390` ; `run-oracles-design.mjs` l. 42 fixe `LARGEURS_RENDU = '1920,1440,1024,768,390'` ; `oracle-baseline.mjs` l. 45-52 rend à `1920,1024,390` et se déclare « grille réduite v0 ». Aucune largeur au-delà de 1920 n'est vérifiée. Le pilot a écrit la règle E5 dans `references\BEST-PRACTICES-HTML.md` (grille `3840,2560,1920,1440,1024,768,390`) et l'a portée dans `gabarits\CLAUDE-PRODUIT.md` (héritage 1.9.0).
- **Pourquoi cela vous concerne** : vous portez la conception (maquettes, critique d'implémentation, baseline visuelle) ; la largeur à laquelle une maquette est dessinée est la largeur à laquelle le lecteur la juge « trop petite » ou « juste » ; et une baseline à 1920 ne prouve rien à 3840.
- **Ce qui est demandé** : (1) `contrat-technique.md` : la ligne Breakpoints devient « **1920 px = largeur de conception par défaut (Full HD)** ; grille de vérification 3840 / 2560 / 1920 / 1440 / 1024 / 768 / 390, portrait et paysage » et cite E5 du pilot ; (2) `criteres-sortie.md` (C1) et `grille.md` : `--widths 3840,2560,1920,1440,1024,768,390` ; (3) `run-oracles-design.mjs` : `LARGEURS_RENDU` étendu de même ; (4) `oracle-baseline.mjs` : grille par défaut `3840,2560,1920,1024,390` (le reste « grille réduite v0 » se clôt) ; (5) skill `ameliore-le-design` : toute maquette de bureau est produite à 1920 px de large (le viewport du rendu, les captures et les cotes), jamais à 1280 ni 1440 ; (6) `critique-le-design`, dimension D5 Adaptation : un écran dont le rendu n'a pas été mesuré à 2560 et 3840 n'est pas jugé adapté.
- **Module producteur lu** : skill `ameliore-le-design` — `skills\ameliore-le-design\SKILL.md` lu le 12/09 (sections « Règles dures » l. 48-105 et « Références » l. 106-116 : aucune largeur de conception n'y est fixée, la grille vit dans ses références) et `skills\ameliore-le-design\references\contrat-technique.md` (l. 11), `criteres-sortie.md` (l. 7, 35) ; skill `critique-le-design` — `skills\critique-le-design\references\grille.md` (l. 17) et `SKILL.md` (l. 85, D5) ; `oracles\run-oracles-design.mjs` (l. 42, 144, 368) ; `oracles\oracle-baseline.mjs` (l. 24, 45, 52).
- **Effort estimé** : complexité simple × durée courte.
- **Comment vous saurez que c'est fait** : `node oracles\run-oracles-design.mjs <page>` liste sept largeurs ; `self-test.mjs` et `self-test-baseline.mjs` restent PASS ; une maquette produite par `ameliore-le-design` porte un viewport de 1920 dans ses captures ; commit publié.
- **Si ce n'est pas fait** : chaque run conçoit à la largeur de l'écran de son auteur et le lecteur équipé en 4K découvre le débordement ou le vide ; la règle E5 du pilot reste sans juge chez vous.

### TF-1064 — Les textes d'application (libellés, erreurs, états vides) ont leur règle de style et un juge à définir · gravité majeur

- **Le fait** : le 12/09/2026, sur mandat humain (décisions D-1 (a) et D-3 (a) de la synthèse 20260911j), le pilot a déposé un plancher d'écriture transverse (`references\ECRITURE.md`, E-1 à E-12) dont la règle E-12 vise les textes d'application (type T4) : « un libellé nomme ce que la personne contrôle ; une erreur dit ce qui s'est passé puis comment réparer ; un état vide invite à agir » — ce que votre contrat `voix.md` (sections Actions, Erreurs, États vides) dit déjà, en déclarant « la justesse d'une voix n'est pas décidable par script ». L'oracle du pilot (`oracles\oracle-ecriture.mjs`) juge le Markdown ; il déclare T4 en `non_juge` : les chaînes d'application vivent dans du code ou des fichiers de ressources qu'il ne lit pas. Aucun oracle du parc ne juge une erreur sans réparation ni un état vide sans action ; la critique d'implémentation les voit à la dimension D7 Contenu (10 %), « la plus sous-traitée, la plus visible à l'usage » (`grille.md` l. 56).
- **Pourquoi cela vous concerne** : vous portez la voix (`systeme-de-marque`) et la critique ; T4 est le type de texte le plus lu par les utilisateurs finaux et le seul sans juge.
- **Ce qui est demandé** : (1) `voix.md` : une ligne par section (Actions, Erreurs, États vides) qui cite E-12 du pilot comme plancher — la voix se déploie au-dessus ; (2) un oracle `oracle-textes-application.mjs` (standard §3 de `quality-oracles`, scaffold par `write-an-oracle`) qui lit des chaînes extraites (fichier JSON `{cle: texte}`, ou `.arb`, `.po`, `.properties`, ou les littéraux d'un `.html`) et juge : une chaîne d'erreur (clé ou contexte `error|erreur|fail`) sans verbe de réparation ni indication de cause = FAIL ; une chaîne d'état vide (`empty|vide|aucun`) sans verbe d'action = FAIL ; un libellé d'action générique (« Valider », « OK », « Soumettre », « Cliquez ici ») = AVERT ; fixtures rouge/verte ; `non_juge` : la justesse du ton ; (3) `critique-le-design` D7 cite cet oracle ; (4) `ameliore-le-design` : les états vides et les messages d'erreur d'une maquette passent l'oracle avant C15.
- **Module producteur lu** : `skills\systeme-de-marque\references\voix.md` (sections Actions, Erreurs, États vides, Règles d'écriture), `skills\critique-le-design\references\grille.md` (l. 56, D7), `skills\ameliore-le-design\references\patterns-interaction.md` (l. 26-38, 237) et `criteres-sortie.md` (C15).
- **Effort estimé** : complexité moyenne × durée moyenne.
- **Comment vous saurez que c'est fait** : `node oracles\oracle-textes-application.mjs --self-test` PASS ; une maquette avec « Une erreur est survenue » rend FAIL, la même avec « Le fichier dépasse 10 Mo. Compresse-le ou envoie-le en deux fois. » rend PASS ; entrée au registre (`registre-entrees.md` chez vous, puis remontée §4 chez forge-agents) ; commit publié.
- **Si ce n'est pas fait** : les applications gardent « Valider » et « Une erreur est survenue » ; le plancher d'écriture du pilot couvre les documents et laisse les écrans, et c'est là que le lecteur est le plus nombreux.

## Ce que le pilot a déjà fait de son côté

- Règle E5 écrite (`references\BEST-PRACTICES-HTML.md`), lignes de socle dans `gabarits\CLAUDE-PRODUIT.md` (héritage 1.9.0), classe `viewport-de-conception-non-fixe` au référentiel, TF-1066 décidé par mot humain ; lot homologue remis à forge-agents pour `render_page.py`.
- Doctrine `references\ECRITURE.md`, donnée `references\tics-redactionnels.json`, oracle `oracles\oracle-ecriture.mjs`, hook `ecriture` câblé chez le pilot et hérité par les produits.
- Rien n'a été écrit dans votre dépôt hors de la boîte `input\00-travaux\`.

## Ce que le pilot NE demande PAS

- Pas de réécriture de `voix.md` : une ligne de renvoi par section suffit, la voix reste la vôtre.
- Pas de retrait de 1440 ni de 1024 de la grille : ils restent des largeurs de vérification.
- Pas de juge du ton : l'oracle T4 juge la présence d'une réparation et d'une action, jamais leur justesse.

## Ordre recommandé

1. **La grille et la largeur de conception d'abord** (TF-1066), parce que ce sont des constantes et une ligne de contrat, et que la règle humaine est immédiate.
2. **Les renvois de `voix.md` ensuite** (TF-1064 (1)), parce qu'ils ne coûtent rien.
3. **L'oracle T4 en dernier** (TF-1064 (2)-(4)), parce qu'il demande des fixtures et un scaffold.

## Remise du compte rendu

À la clôture de votre run, un lot de retours `digit-ai-forge-design - RETOURS - <date><i>.md` (+ sidecar) remis dans `c:\dev\digit-ai-factory\input\00-retours\` dit ce qui a été fait, avec la preuve (recettes, comptes, commit, porte, push) — le pilot clôt les items sur gains constatés.
