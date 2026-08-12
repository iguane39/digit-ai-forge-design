# Contrat de tokens.css

## Structure imposée

```css
:root {
  /* Couleurs — OKLCH, jamais HSL. Perceptuellement uniforme. */
  --fond: oklch(0.97 0.008 45);
  --surface: oklch(0.94 0.012 45);
  --trait: oklch(0.86 0.015 45);
  --texte: oklch(0.22 0.020 45);
  --texte-faible: oklch(0.45 0.020 45);
  --accent: oklch(0.52 0.140 45);

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
}

@media (prefers-color-scheme: dark) { :root { /* mêmes noms, autres valeurs */ } }
:root[data-theme="dark"]  { /* bascule explicite, doit gagner sur la préférence */ }
:root[data-theme="light"] { /* idem, dans l'autre sens */ }
```

## Règles de composition

| Règle | Seuil | Vérifié par |
|---|---|---|
| Contraste du texte courant sur sa surface | ≥ 4.5:1, sur les **deux** thèmes | `oracle-tokens` T5 |
| Chroma aux extrêmes de luminosité | ≤ 0.10 si L ≥ 0.85 ou L ≤ 0.15 | T6 |
| Parité des thèmes | tout token de couleur existe des deux côtés | T4 |
| Échelle d'espacement | multiples de 4 | T3 |
| Tracking optique | ~-0.02em sur le display, ~0 sur le corps | corpus GL49 (apple-design) |
| Aucune valeur en dur hors `:root` | 0 couleur, 0 police littérale | T1, T2 |

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
d'erreur, table, formulaire. C'est elle qu'on passe à l'oracle.

```bash
node oracles/oracle-tokens.mjs temoin.html --tokens tokens.css
```

Sans page témoin, `tokens.css` n'est pas vérifiable : un token jamais consommé peut
être faux sans que rien ne le révèle.
