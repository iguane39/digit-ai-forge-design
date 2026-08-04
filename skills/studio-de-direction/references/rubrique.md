# Rubrique de jugement

Figée et validée **avant** la première génération. Jamais réajustée après avoir vu
les candidats — c'est la seule protection contre un juge qui découvre ses critères
en même temps que les réponses.

## Les six critères

| # | Critère | Binaire | Preuve exigée |
|---|---|---|---|
| R1 | Ancrée dans le sujet | la direction cite au moins deux éléments du monde du sujet (matériau, instrument, vernaculaire, artefact) | les deux éléments, nommés |
| R2 | Non générique | zéro règle dure d'`oracle-slop` ; direction hors des trois looks IA | verdict JSON de l'oracle |
| R3 | Signature identifiable | un élément unique dont on se souviendra, décrit en une phrase | la phrase |
| R4 | Plancher tenu | contraste AA sur les deux thèmes, focus visible, cibles conformes | verdict `oracle-tokens` T5 + `oracle-mobile` M2 si mobile |
| R5 | Tient à l'échelle | la direction survit à l'écran le plus dense du produit, pas seulement au hero | l'écran dense, produit |
| R6 | Exécutable dans le contrat | polices embarquables, effets tenables sans réseau, poids compatible | l'arbitrage, écrit |

Six critères binaires, pas de note sur 5. Une direction qui score 4/6 avec R2 en ✗
perd contre une direction 4/6 avec R2 en ✓ : **R2 et R4 sont éliminatoires**.

## Arbitrage à charge

Pour chaque critère, chercher d'abord à le faire **échouer**. Le ✓ ne s'accorde
qu'avec sa preuve citable : une valeur mesurée, une ligne de code, un verdict
d'oracle, une phrase du brief. Une impression n'est pas une preuve. Pas de preuve
citable ⇒ ✗.

C'est le point où une compétition auto-arbitrée se perd : trois directions notées
généreusement finissent toutes à 5/6 et le choix retombe sur le goût.

## Départage

1. Éliminatoires d'abord : toute direction avec R2 ou R4 en ✗ est hors course.
2. Score sur les six critères.
3. À égalité : la direction qui tient le mieux R5 gagne. Un design qui ne survit
   pas à l'écran dense ne survivra pas au produit.
4. Toujours à égalité : **escalader**. Deux directions équivalentes, c'est un choix
   de commanditaire, pas un choix de juge.

## oracle-judge — avis, jamais verdict

`oracle-judge` (rubrique figée 5 axes, CLI claude) peut être lancé en complément.
Sa sortie est un **AVIS OUTILLÉ** : elle s'ajoute au relevé, elle ne remplace aucun
✓ ni aucun ✗. Un LLM-juge n'est pas un oracle déterministe, et le registre maison
le classe explicitement comme tel.

## Ce que la rubrique ne juge pas

Le goût du commanditaire. La cohérence avec une marque non encore figée. Le coût de
construction réel du produit final. Ces trois-là sont déclarés en tête de
`DIRECTION.md`, pas dissimulés dans un score.
