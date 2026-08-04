# Grille de notation

## Enchaînement d'oracles — avant toute lecture

```bash
node oracles/oracle-slop.mjs    <cible.html>
node oracles/oracle-tokens.mjs  <cible.html> [--tokens tokens.css]
node oracles/oracle-mobile.mjs  <cible.html>          # si cible mobile
node oracles/oracle-images.mjs  <cible.html>          # si visuels générés
python ~/.claude/skills/quality-oracles/scripts/oracle-a11y.py <cible.html>
python <…>/render_page.py <cible.html>                # V1–V7, 5 breakpoints × 2 thèmes
```

Chaque verdict JSON est conservé et joint au rapport. Un oracle qui n'a pas pu
tourner — Playwright absent, fichier non ouvrable, quota — donne `non_juge` sur sa
dimension, avec la raison. **Jamais un score estimé.**

## Barème par dimension

Chaque dimension est notée /5 selon le même barème :

| Note | Signification |
|---|---|
| 5 | aucun écart, et un choix remarquable qui sert le brief |
| 4 | aucun écart dur, écarts mineurs localisés |
| 3 | un écart dur, corrigeable sans toucher la structure |
| 2 | plusieurs écarts durs, ou un écart structurel |
| 1 | la dimension n'est pas traitée |
| — | `non_juge` : l'oracle n'a pas pu s'exécuter, raison citée |

Une note ne s'attribue qu'avec **au moins un constat cité** : verdict d'oracle,
ligne, valeur mesurée. Une dimension sans constat est `non_juge`, pas 3/5.

## Pondération

| Dimension | Poids | Pourquoi |
|---|---|---|
| D1 Intention | 20 % | c'est ce qui distingue un design d'un gabarit |
| D2 Système | 15 % | sans tokens, rien ne survit à la deuxième page |
| D3 Hiérarchie | 15 % | le premier défaut perçu par un utilisateur |
| D4 Accessibilité | 20 % | plancher légal et éthique, non négociable |
| D5 Adaptation | 10 % | pondération réduite hors cible mobile |
| D6 Interaction | 10 % | ce qu'une capture ne montre jamais |
| D7 Contenu | 10 % | le plus sous-traité, le plus visible à l'usage |

Hors cible mobile, D5 est neutralisé et son poids est réparti sur D1 et D4.

## Red flags — bloquants, indépendants du score

Un seul suffit à plafonner le verdict à **Refondre**, quel que soit le total :

| # | Red flag | Détection |
|---|---|---|
| RF1 | Contraste sous 4.5:1 sur du texte courant, un thème ou l'autre | `oracle-tokens` T5 / `render_page.py` V2 |
| RF2 | Focus supprimé sans remplacement | `oracle-a11y` |
| RF3 | Règle dure d'`oracle-slop` déclenchée (S1 ou S2) | `oracle-slop` |
| RF4 | Zoom bridé (`user-scalable=no`) | `oracle-mobile` M1 |
| RF5 | Image chargée depuis le réseau dans un livrable annoncé autonome | `oracle-images` I4 |
| RF6 | Donnée chiffrée non marquée dans une maquette de démonstration | `oracle-claims` |
| RF7 | Visuel généré présenté comme photographie authentique | revue humaine |

Un red flag se **nomme**, il ne s'absorbe pas dans une moyenne.

## Règle de verdict

| Verdict | Condition |
|---|---|
| **Livrer** | ≥ 4/5 pondéré · zéro red flag · zéro dimension à 1 ou 2 |
| **Renforcer** | ≥ 3/5 pondéré · zéro red flag |
| **Refondre** | < 3/5 pondéré **ou** au moins un red flag |

Le verdict est calculé, pas ressenti. Si le calcul donne Refondre et que
l'impression dit Livrer, c'est le calcul qui gagne — ou la grille est fausse, et
c'est elle qu'il faut corriger, pas le verdict.

## Ce que la grille ne juge pas

L'adéquation au goût du commanditaire. La justesse stratégique du produit. Le coût
de construction. La performance réelle sous charge. Ces quatre-là sont déclarés en
tête du rapport, jamais dissimulés dans une note.
