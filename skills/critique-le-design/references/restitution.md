# Restitution

## Structure du rapport

```markdown
# Critique de design — {cible} — {AAAA-MM-JJ}

## Verdict : Livrer | Renforcer | Refondre
Score pondéré : {n}/5 · Red flags : {n} · Dimensions non jugées : {n}

Trois lignes de diagnostic. Ce qui tient, ce qui casse, ce qui décide du verdict.

## Relevé d'oracles
| Oracle | Verdict | Écarts durs | non_jugé |
|---|---|---|---|
| oracle-slop | FAIL | S1×2, S4 | généricité de la direction |
…
Les sorties JSON complètes sont jointes.

## Notation
| # | Dimension | Note | Constat principal (preuve citée) |
|---|---|---|---|
| D1 | Intention | 4/5 | direction ancrée (matériau + vernaculaire cités), zéro règle slop dure |
…

## Red flags
Aucun · ou la liste, chacun avec sa preuve et sa conséquence.

## Écart avec la passe précédente — seulement si le design a déjà été audité
Mesuré : écarts durs avant → après, note par dimension, lignes ou poids du fichier.
Ce que l'ajout apporte : la dimension qui progresse, ou « rien : aucune dimension ne progresse ».

## Top 5 des corrections — impact × effort
| # | Correction | Impact | Effort | Dimension |
|---|---|---|---|---|
| 1 | … | fort | faible | D4 |

Pour chacune, l'avant et l'après :

**1. {titre}**
Avant : `border-left: 4px solid var(--warning)`  (ligne 212)
Après : fond teinté `--surface-alerte` + icône en tête de ligne
Pourquoi : S1 est un ban absolu ; le bandeau latéral ne se rattrape par aucune couleur.

## Ce qui n'a pas été jugé
Goût du commanditaire · justesse stratégique · coût de construction · performance
sous charge · {toute dimension non_jugée, avec la raison technique}
```

## Règles de rédaction

**Un constat cite sa preuve.** « Contraste 3.1:1 sur `--texte-faible` en thème
sombre, ligne 214 » est un constat. « Le contraste semble faible » n'en est pas un.

**Impact et effort sont estimés séparément.** Une correction à fort impact et fort
effort n'est pas prioritaire sur une correction à fort impact et faible effort.
Sans les deux axes, le top 5 est un classement arbitraire.

**Le top 5 est un top 5.** Pas sept, pas douze. Au-delà, on ne priorise plus, on
liste — et une liste ne se traite pas. Au verdict Livrer, sans aucune correction à
nommer, la section dit « Rien à changer » et porte sa preuve (oracles lancés, constats
lus, comparaison avec la passe précédente) : cinq lignes remplies pour la forme sont
pires qu'une section qui dit rien. La loi n° 3 du pilot s'applique encore : la surface
implicite absente se propose une fois, dans cette section ou dans « Ce qui n'a pas été jugé ».

**Les avant/après sont copiables.** Une correction formulée en principe (« améliorer
la hiérarchie ») ne se met pas en œuvre. Une correction formulée en code ou en
valeur, si.

**Ce qui n'a pas été jugé est une section, pas une note de bas de page.** Un rapport
qui masque ses angles morts se lit comme un audit complet. C'est le défaut le plus
coûteux, parce qu'il est invisible.

## Mode express

Score pondéré, verdict, red flags nommés, top 3. Les oracles ont tourné, leurs
verdicts sont cités en une ligne chacun. Ce qui saute : le détail des sept
dimensions et les avant/après complets. Ce qui ne saute jamais : l'exécution des
oracles et la liste de ce qui n'a pas été jugé.
