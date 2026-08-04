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
  --texte-xs: 0.75rem; --texte-sm: 0.875rem; --texte-md: 1rem;
  --texte-lg: 1.375rem; --texte-xl: 1.875rem; --texte-2xl: 2.5rem;

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
| Aucune valeur en dur hors `:root` | 0 couleur, 0 police littérale | T1, T2 |

## Nommage — c'est une précondition, pas une préférence

`oracle-tokens` résout les paires de contraste par le **nom** : un token de texte
contient `texte`, `text`, `fg`, `encre` ou `ink` ; un token de surface contient
`fond`, `bg`, `surface`, `papier` ou `canvas`. Hors convention, l'oracle ne peut
plus tester T5 et le déclare `non_juge` — le contraste retombe alors sur
`render_page.py` V2, plus lent et plus tardif. Suivre la convention n'est pas une
coquetterie : c'est ce qui permet au contrôle de tourner tôt.

## Teinter les neutres

Un chroma de 0.005 à 0.01 vers la hue de marque suffit à créer la cohésion entre la
couleur d'accent et les surfaces. La hue vient de **cette** marque, pas d'une
formule « chaud = accueillant, froid = technique ».

## Page témoin

`tokens.css` s'accompagne d'une page témoin qui consomme chaque token au moins une
fois : titres, corps, texte faible, surface, trait, accent, état de focus, état
d'erreur, table, formulaire. C'est elle qu'on passe à l'oracle.

```bash
node oracles/oracle-tokens.mjs temoin.html --tokens tokens.css
```

Sans page témoin, `tokens.css` n'est pas vérifiable : un token jamais consommé peut
être faux sans que rien ne le révèle.
