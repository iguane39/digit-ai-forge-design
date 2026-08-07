---
name: systeme-de-marque
description: Verrouille l'identité visuelle et verbale d'une marque en artefacts exécutables — un tokens.css (couleurs OKLCH, échelle typographique, espacement 4pt, thèmes clair et sombre) et un MARQUE.md (voix, ton, vocabulaire, anti-références) — réutilisés ensuite par tous les livrables produits pour ce client. Use when / déclencher dès que l'utilisateur veut poser, extraire, figer ou documenter la charte d'un client, demande des tokens de design, une palette, un choix de polices ou une ligne éditoriale à partir d'un logo, d'un site, d'une charte PDF ou de trois mots de ton, ou veut que plusieurs livrables partagent la même identité. Ne pas déclencher pour appliquer la charte Digit-AI maison (→ digit-ai-page-html, digit-ai-pptx), pour arbitrer entre plusieurs directions artistiques concurrentes (→ studio-de-direction), ni pour construire une maquette (→ ameliore-le-design).
version: 1.2.0
---

# Système de marque

Produit trois artefacts et rien d'autre : `tokens.css` (exécutable, vérifiable),
`MARQUE.md` (la voix) et `DESIGN.md` (la charte consolidée, **dérivée** des deux premiers).
Tout le reste de la forge les consomme.

## Ce que ce skill apporte en propre

Règles de couleur, typographie et espacement → `impeccable`.
Matière — styles, palettes, appariements → `corpus/recherche.py`.
Arbitrage entre directions concurrentes → `studio-de-direction`.

Reste en propre : le protocole d'extraction depuis un entrant de marque, le contrat
des deux artefacts, et le fait que la sortie soit **jugée par oracle**, pas relue.

## Quick start

```
1. Mode          → client (défaut) ou digit-ai
2. Extraction    → references/extraction.md
3. Proposition   → python corpus/recherche.py "<secteur> <cible> <ton>" --systeme-de-design
4. Artefacts     → references/tokens.md + references/voix.md
5. Contrôle      → node oracles/oracle-tokens.mjs <page-témoin.html> --tokens tokens.css
6. DESIGN.md     → node scripts/generer-design-md.mjs --tokens tokens.css --marque MARQUE.md
                   [--nom <Produit>] --sortie DESIGN.md
7. Restitution   → les trois fichiers + ce qui a été supposé
```

`DESIGN.md` est une **vue dérivée** (scellée sha256, jamais éditée à la main — régénérer après
toute évolution des tokens ou de la voix) au format `@google/design.md` : toutes les
informations du site en un fichier — couleurs hex et contrastes **mesurés**, typographie,
composants, espacement, rayons, principes, voix. C'est la couture vers forge-development :
son gate design le linte (`conductor.gates.design_gate` → PASS vérifié). Le script refuse de
générer une charte dont le contraste texte/fond est < 4.5:1 (exit 2).

## Deux modes, jamais mélangés

| Mode | Quand | Ce qui est produit |
|---|---|---|
| `client` (défaut) | livrable destiné à un client ou prospect | l'identité **du client** : la charte Digit-AI ne s'applique pas au design |
| `digit-ai` | livrable maison | `corpus/tokens-digit-ai.css`, valeurs canoniques de `digit-ai-page-html` |

Le mode est déclaré avant le premier choix visuel. Un livrable client habillé en
charte maison est un défaut, pas un raccourci.

Le mode `digit-ai` porte **deux conflits connus** avec les oracles, documentés en
tête de `corpus/tokens-digit-ai.css` : le blanc pur de la charte déclenche
`oracle-slop` S4, et la charte n'ayant pas de thème sombre officiel, le bloc sombre
fourni est une extension de la forge. Les deux se déclarent en restitution ; aucun
des deux ne se corrige en silence.

## Règles dures

**Trois mots de ton concrets, jamais « moderne » ni « élégant ».** Ce sont des
catégories mortes : elles ne discriminent rien et produisent la même palette pour
tout le monde. « Chaleureux, mécanique, entêté » discrimine.

**Aucun token sans son jumeau sombre.** Tout token de couleur défini en clair
existe en sombre, et réciproquement. Le thème sombre n'est pas une inversion : les
contrastes se recalculent, les ombres deviennent des élévations de surface,
l'interligne du texte clair se majore.

**Le chroma se réduit aux extrêmes de luminosité.** Au-delà de L = 0.85 ou en
dessous de L = 0.15, un chroma supérieur à 0.10 rend criard. Vérifié par
`oracle-tokens` T6.

**Aucune police de la liste réflexe.** Les 22 familles bannies par `impeccable`
sont refusées à l'entrée, y compris si le client les demande — auquel cas on le dit
et on propose l'équivalent le plus proche hors liste, sans trancher à sa place.

**Aucun ✓ sans exécution.** `oracle-tokens` tourne sur une page témoin avant toute
restitution, et son verdict est reporté tel quel, `non_juge` compris.

## Références

| Fichier | À lire quand |
|---|---|
| `references/extraction.md` | au démarrage, pour tout entrant de marque |
| `references/tokens.md` | avant d'écrire la première ligne de CSS |
| `references/voix.md` | pour la partie verbale, souvent bâclée |

## Pièges connus

- **La palette du logo n'est pas la palette de l'interface.** Un logo tient sur
  deux couleurs saturées ; une interface a besoin de surfaces, de traits, de
  neutres teintés et d'un accent rare.
- **Le contraste du thème sombre approuvé à l'œil.** Toujours mesuré, jamais lu.
- **La voix écrite après les couleurs, en dix minutes.** C'est elle qui survit à la
  refonte suivante, pas la palette.
- **Les tokens sans page témoin.** Un `tokens.css` que rien ne consomme n'est pas
  vérifiable : produire la page témoin en même temps.
