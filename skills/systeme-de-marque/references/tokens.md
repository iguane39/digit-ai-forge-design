# Contrat de tokens.css

## Structure imposée

```css
:root {
  /* Schéma natif — le navigateur peint SES composants (dialog et popover en
     top-layer, contrôles de formulaire, barres de défilement, ::backdrop) dans
     le schéma déclaré ici. Clair STRICT par défaut ; sombre déclaré dans le
     bloc sombre, jamais laissé au réglage de l'OS (TF-0796). */
  color-scheme: light;

  /* Couleurs — OKLCH, jamais HSL. Perceptuellement uniforme. */
  --fond: oklch(0.97 0.008 45);
  --surface: oklch(0.94 0.012 45);
  --trait: oklch(0.86 0.015 45);
  --texte: oklch(0.22 0.020 45);
  --texte-faible: oklch(0.45 0.020 45);
  --accent: oklch(0.52 0.140 45);
  --accent-contraste: oklch(0.98 0.004 45); /* texte posé SUR --accent — ≥ 4.5:1 contre lui */

  /* Focus — un anneau, sa couleur et son écart. Prescrit parce qu'il est jugé :
     RGAA 10.7 / WCAG 2.4.7 (focus visible), 1.4.11 (contraste non textuel). */
  --focus-anneau: oklch(0.52 0.140 45);   /* ≥ 3:1 contre --fond ET contre --surface */
  --focus-decalage: 2px;                  /* écart élément ↔ anneau — ≥ 2px, jamais 0 */

  /* Typographie — deux rôles minimum, trois si des données sont affichées */
  --police-titre: "…", ui-sans-serif, sans-serif;
  --police-corps: "…", ui-serif, serif;
  --police-mono: "…", ui-monospace, monospace;

  /* Échelle typographique — rapport >= 1.25 entre deux pas */
  --texte-xs: 0.75rem; --texte-sm: 1rem; --texte-md: 1.25rem;
  --texte-lg: 1.625rem; --texte-xl: 2.125rem; --texte-2xl: 2.75rem;

  /* Espacement — pas de 4px, noms sémantiques et non pixellisés */
  --espace-xs: 4px; --espace-sm: 8px; --espace-md: 16px;
  --espace-lg: 24px; --espace-xl: 32px; --espace-2xl: 48px;

  /* Rayons — variés, jamais une valeur unique partout */
  --rayon-sm: 2px; --rayon-md: 6px; --rayon-lg: 12px;

  /* Mouvement — une durée par TAILLE DE GESTE, jamais une durée unique.
     Le mouvement ne dépend pas du thème : un seul jeu, pas de jumeau sombre. */
  --dur-etat: 120ms;      /* état d'un contrôle : survol, focus, appui */
  --dur-local: 160ms;     /* élément local : puce, infobulle, badge */
  --dur-ancre: 200ms;     /* surface ancrée à son déclencheur : menu, popover */
  --dur-surface: 280ms;   /* surface plein écran : modale, tiroir, feuille */
  --dur-plafond: 300ms;   /* seuil, pas un geste — au-delà, l'UI paraît lente */

  --ease-apparition: cubic-bezier(0.16, 1, 0.3, 1);  /* décélère : le défaut */
  --ease-disparition: cubic-bezier(0.4, 0, 1, 1);    /* accélère : sorties SEULEMENT */
  --ease-deplacement: cubic-bezier(0.4, 0, 0.2, 1);  /* symétrique : se déplace sans naître */

  --echelle-entree: 0.96; /* d'où naît un élément — jamais scale(0) */
}

@media (prefers-color-scheme: dark) { :root { /* mêmes noms, autres valeurs */ } }
:root[data-theme="dark"]  { /* bascule explicite, doit gagner sur la préférence */ }
:root[data-theme="light"] { /* idem, dans l'autre sens */ }
```

## Règles de composition

Ce chapitre dit à quel seuil chaque choix de `tokens.css` est refusé, et par quel
contrôle. Il se lit ligne à ligne : la colonne « Seuil » porte la valeur mesurée,
la colonne « Vérifié par » nomme la règle d'oracle qui la mesure — une ligne sans
règle nommée serait une intention, pas un seuil. Rien n'y est trié par gravité :
l'ordre suit la structure du bloc `:root` ci-dessus. Sont exclus de ce tableau les
jugements humains (adéquation à la marque, goût), déclarés plus bas.

| Règle | Seuil | Vérifié par |
|---|---|---|
| Contraste du texte courant sur sa surface | ≥ 4.5:1, sur les **deux** thèmes | `oracle-tokens` T5 |
| Contraste du texte posé sur l'accent (`--accent-contraste` sur `--accent`) | ≥ 4.5:1, sur les **deux** thèmes | T5 (paire posée par le gabarit) |
| Contraste non textuel des paires d'interface posées (accent sur fond) | ≥ 3:1, sur les **deux** thèmes | T7 |
| Anneau de focus prescrit, et contrasté contre `--fond` | tokens présents · ≥ 3:1 | T8 |
| Écart de l'anneau de focus (`--focus-decalage`) | ≥ 2px | T8 |
| Chroma aux extrêmes de luminosité | ≤ 0.10 si L ≥ 0.85 ou L ≤ 0.15 | T6 |
| Parité des thèmes | tout token de couleur existe des deux côtés | T4 |
| Échelle d'espacement | multiples de 4 | T3 |
| Tracking optique | ~-0.02em sur le display, ~0 sur le corps | corpus GL49 (apple-design) |
| Aucune valeur en dur hors `:root` | 0 couleur, 0 police littérale | T1, T2 |
| `color-scheme` déclaré par thème | `light` au bloc clair · `dark` au bloc sombre | `oracle-dtcg` D3 (dérivé) · `oracle-surcouche` SC4 (page) |
| Durée de transition | ≤ `--dur-plafond` (300 ms) — pour le token **et** pour la feuille | `oracle-motion` R9, R4 |
| Durée consommée | par `var(--dur-*)`, jamais un littéral | R8 |
| Courbe d'easing | aucun dépassement (y hors [0,1] = rebond déguisé) | R9, `oracle-slop` S8 |
| Révocation du mouvement | bloc `prefers-reduced-motion: reduce` qui neutralise vraiment | R10 |

## Nommage — c'est une précondition, pas une préférence

`oracle-tokens` résout les paires de contraste par le **nom** : un token de texte
contient `texte`, `text`, `fg`, `encre` ou `ink` ; un token de surface contient
`fond`, `bg`, `surface`, `papier` ou `canvas`. Hors convention, l'oracle ne peut
plus tester T5 et le déclare `non_juge` — le contraste retombe alors sur
`render_page.py` V2, plus lent et plus tardif. Suivre la convention n'est pas une
coquetterie : c'est ce qui permet au contrôle de tourner tôt.

## Tokens d'état sémantique — convention optionnelle

La structure imposée ne prévoit aucun token d'état (erreur, succès). Quand la
page témoin doit démontrer un état d'erreur (voir « Page témoin » ci-dessous),
ajouter les tokens nécessaires en suivant cette convention — elle n'est **pas
obligatoire**, mais évite d'improviser une couleur en dur qui violerait T1 :

```css
:root {
  /* ... */
  --texte-erreur: oklch(0.50 0.18 25);
  --fond-erreur: oklch(0.95 0.03 25);
  --texte-succes: oklch(0.45 0.14 145);
  --fond-succes: oklch(0.95 0.03 145);
}
@media (prefers-color-scheme: dark) {
  :root {
    --texte-erreur: oklch(0.75 0.15 25);  --fond-erreur: oklch(0.28 0.05 25);
    --texte-succes: oklch(0.72 0.13 145); --fond-succes: oklch(0.26 0.04 145);
  }
}
```

Dérivées de la palette de marque (même hue de base que `--accent`, pas un
rouge/vert générique importé sans lien avec le reste des tokens), contraste
≥ 4.5:1 sur les deux thèmes — même seuil que T5.

Préfixer par `texte-` / `fond-` plutôt que nommer juste `--erreur` fait entrer
la paire dans la convention T5 (voir « Nommage » ci-dessus) : `oracle-tokens`
mesure alors son contraste automatiquement au lieu de le laisser à la charge
d'un contrôle manuel. Cette convention ne s'oppose à aucune des règles T1–T6 :
déclarée dans le bloc `:root` (T1 satisfait, pas de couleur en dur ailleurs),
sans police (T2 sans objet), sans espacement (T3 sans objet), définie des deux
côtés clair/sombre si utilisée (T4), chroma à modérer aux luminosités extrêmes
comme tout token de couleur (T6).

## Mouvement — prescrire ce que l'oracle juge déjà

Les neuf tokens de mouvement ne sont pas un choix de goût : chacun est la **face
prescriptive** d'une règle que `oracle-motion` sait déjà refuser. La forge jugeait le
mouvement sans jamais le prescrire — une maquette était donc notée sur des valeurs que la
marque n'avait pas fixées (TF-0321).

| Token | Règle qui le juge | Ce que la règle refuse |
|---|---|---|
| `--dur-*`, plafonnés par `--dur-plafond` | R4, R9 | une transition au-delà de 300 ms |
| `--ease-apparition` (défaut) | R3 | `ease-in` seul : l'UI doit répondre vite puis se poser |
| `--ease-disparition` | R3 | l'accélération employée ailleurs qu'en sortie |
| `--echelle-entree: 0.96` | R2 | `scale(0)` : un élément qui naît de rien |

Trois conséquences pour l'auteur du `tokens.css` :

1. **Une durée par taille de geste, pas une durée unique.** Un survol à 280 ms est mou, un
   tiroir à 120 ms est un saut. Une valeur unique partout est le même défaut qu'un rayon
   unique partout (S9).
2. **La feuille consomme les tokens.** `transition: opacity var(--dur-ancre)
   var(--ease-apparition)` — un littéral `200ms` alors que les tokens existent est un
   contournement de la prescription, et R8 le dit.
3. **La courbe canonique est déjà dans la forge.** `cubic-bezier(0.16, 1, 0.3, 1)` est celle
   qu'`oracles/vendor/README.md` documente pour `Motion`. Elle n'est pas rejouée ici : un
   troisième jeu de valeurs serait un troisième arbitre.

Ce que ces tokens ne couvrent pas, et qui reste dû : la **finalité** de chaque animation
(pourquoi ce geste bouge) et sa cohésion avec la personnalité du composant restent des
jugements, déclarés `non_juge` par `oracle-motion`. Un token ne dispense pas de la question
« ce mouvement sert à quoi ».

## Focus et contraste non textuel — prescrire ce que le gabarit consomme déjà

Même défaut que pour le mouvement, un cran plus grave parce qu'il porte sur l'accessibilité :
le gabarit `demo/maquette.template.html` posait déjà `outline: 3px solid var(--accent)`,
`outline-offset: 2px` et un `--accent-contraste` **que ce contrat ne nommait pas** ; le
`DESIGN.md` généré affirmait « États focus visibles au clavier » sans qu'aucun token ne le
fixe ni qu'aucune règle ne le vérifie. Une affordance consommée sans être prescrite est une
valeur improvisée par chaque auteur — et un texte de charte qui affirme plus que ce que la
marque a fixé (TF-0409, option O4 de l'étude RGAA).

Les trois tokens ci-dessus sont la **face prescriptive** de règles qui refusent :

| Token | Règle qui le juge | Ce que la règle refuse |
|---|---|---|
| `--focus-anneau` | T8 · RGAA 10.7, WCAG 2.4.7 | l'absence de tout token de focus : le focus visible jugé sans être prescrit |
| `--focus-anneau` contre `--fond` | T8 · WCAG 1.4.11 (AA) | un anneau sous 3:1 — visible pour l'auteur, invisible pour l'utilisateur |
| `--focus-decalage` | T8 · WCAG 2.4.13 (forme) | un anneau collé au contrôle, indiscernable de sa bordure (≥ 2px) |
| `--accent`, `--trait` posés en interface | T7 · WCAG 1.4.11, corpus GL03 | un élément d'interface sous 3:1 contre sa surface |
| `--accent-contraste` sur `--accent` | T5 (paire posée) | du blanc sur un accent clair — le cas que T5 a déjà su refuser |

Trois conséquences pour l'auteur du `tokens.css` :

1. **Jumeau sombre exigé pour `--focus-anneau` et `--accent-contraste`.** Ce sont des tokens
   de couleur : T4 les réclame des deux côtés, et T8 mesure l'anneau **par thème**. Un anneau
   qui tient 4:1 en clair peut tomber à 1.6:1 sur un fond sombre.
2. **`--focus-decalage` n'a pas de jumeau** — c'est une dimension, pas une couleur, comme les
   tokens de mouvement.
3. **La feuille consomme les tokens** : `outline: 3px solid var(--focus-anneau)` et
   `outline-offset: var(--focus-decalage)`. Un `outline-offset: 2px` littéral alors que le
   token existe est le même contournement que le `200ms` en dur que R8 refuse.

Ce que ces tokens ne couvrent pas, et qui reste dû : T7 mesure les paires d'interface, il ne
sait pas **quel rôle** joue un trait — un séparateur décoratif n'est pas soumis à 3:1, une
bordure qui identifie à elle seule un champ de saisie l'est (WCAG 1.4.11 exempte le
décoratif). Cette distinction se lit sur le rendu, pas dans la feuille : T7 mesure ces paires
et les signale en avertissement, en le déclarant `non_juge` plutôt qu'en refusant à tort.
De même, un anneau *rendu* peut être masqué par un en-tête collant (WCAG 2.4.11) : c'est
`render_page.py` V2 et la revue humaine qui le voient, pas un token.

## Schéma natif — ce que le navigateur peint, et que les jetons ne touchent pas

Un socle de jetons habille ce que la page dessine. Il ne dit rien de ce que le
**navigateur** dessine tout seul : la boîte d'un `dialog`, le voile `::backdrop`
qui l'accompagne, les contrôles de formulaire natifs, les barres de défilement,
l'autofill. Ces surfaces-là suivent `color-scheme`, et `color-scheme` seul.

Le fait qui l'impose (TF-0796, 01/09/2026) : une fenêtre `dialog` de choix de
dossier, stylée aux jetons et verte à sa campagne de tests, s'est affichée en
boîte sombre aux boutons natifs sur le poste d'un utilisateur — mode sombre au
niveau du système, composant rendu en top-layer, `color-scheme` absent du socle.
Mots de l'utilisateur : « des trucs moches sortis de nulle part ». La page
obéissait à `data-theme`, le navigateur au réglage du système : deux autorités
sur un même écran, et le rendu qui en sort n'a été validé par personne.

D'où la règle, sans exception :

1. **`color-scheme: light` au bloc `:root`** — clair strict par défaut, comme la
   doctrine du socle `digit-ai-page-html`. Une page qui ne déclare rien laisse le
   système décider à sa place.
2. **`color-scheme: dark` dans chaque bloc de thème sombre** — le bloc
   `@media (prefers-color-scheme: dark)` **et** `:root[data-theme="dark"]`, parce
   que la bascule manuelle doit gagner sur la préférence système jusque sur les
   composants natifs.
3. **`<meta name="color-scheme">` ne suffit pas.** Il annonce ce que la page
   supporte, il ne suit pas la bascule : un `content="light dark"` laisse les
   widgets natifs en sombre quand l'utilisateur a choisi le thème clair.

Le générateur `scripts/generer-tokens-css.mjs` émet ces trois déclarations ; un
`tokens.css` écrit à la main les porte de la même façon. La vérification, elle,
se fait des deux côtés : `oracle-dtcg` D3 refuse un dérivé qui aurait perdu la
déclaration, et `oracle-surcouche` SC4 refuse une page qui rend un composant en
sur-couche sans schéma déclaré par thème.

## Teinter les neutres

Un chroma de 0.005 à 0.01 vers la hue de marque suffit à créer la cohésion entre la
couleur d'accent et les surfaces. La hue vient de **cette** marque, pas d'une
formule « chaud = accueillant, froid = technique ».

## Source DTCG (optionnel, recommandé)

`tokens.css` peut être **dérivé** d'une source `.tokens.json` au format W3C DTCG
(stable 2025.10) plutôt qu'écrit à la main — c'est le pattern du mode `digit-ai`
depuis TF-0102 : voir `corpus/tokens-digit-ai.tokens.json` pour un exemple complet
(groupes `couleur.clair` / `couleur.sombre`, `typographie`, `rayon`, `espacement`,
`alias`) et `scripts/generer-tokens-css.mjs` pour la transformation (zéro
dépendance npm — pas de Style Dictionary, juste ce qu'il faut pour ce contrat).
Intérêt : un seul endroit à éditer, et l'ouverture vers Figma Variables / autres
plateformes sans ressaisie. `oracles/oracle-dtcg.mjs` (règles D1–D3) vérifie que
le `tokens.css` livré est bien la régénération exacte de sa source — un tokens.css
retouché à la main après génération est détecté, jamais silencieux.

Pour un livrable `client`, ce pattern reste **optionnel** en V0 : écrire directement
`tokens.css` selon la structure ci-dessus est toujours conforme. Migrer un client
vers la source DTCG est un reste consigné, pas une obligation de ce skill.

## Page témoin

`tokens.css` s'accompagne d'une page témoin qui consomme chaque token au moins une
fois : titres, corps, texte faible, surface, trait, accent, état de focus, état
d'erreur, table, formulaire, **et au moins une transition par taille de geste**.
C'est elle qu'on passe aux oracles.

```bash
node oracles/oracle-tokens.mjs temoin.html --tokens tokens.css
node oracles/oracle-motion.mjs temoin.html
```

Sans page témoin, `tokens.css` n'est pas vérifiable : un token jamais consommé peut
être faux sans que rien ne le révèle.
