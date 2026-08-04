---
name: studio-de-direction
description: Fait converger plusieurs directions artistiques concurrentes vers une seule, retenue et argumentée : produit trois directions divergentes par construction sur un axe nommé, les juge sur une rubrique figée avant la première génération, et livre un DIRECTION.md portant la gagnante, les écartées avec leur raison, et le relevé de jugement. Use when / déclencher dès que l'utilisateur hésite entre plusieurs partis pris visuels, demande des variantes, des pistes, des propositions ou des directions à comparer, veut explorer avant de trancher, ou dit ne pas savoir quelle direction prendre pour un design. Ne pas déclencher pour figer les tokens d'une identité déjà arrêtée (→ systeme-de-marque), construire la maquette une fois la direction choisie (→ ameliore-le-design), juger un design déjà produit (→ critique-le-design), ni pour une boucle mono-candidat sans divergence (→ la-boucle).
version: 1.0.0
---

# Studio de direction

Trois directions, un juge, une gagnante. Le livrable n'est pas la direction retenue
seule : ce sont les **trois**, dont deux écartées avec leur raison. C'est ce qui
permet au commanditaire de voir ce qu'il achète et ce qu'il refuse.

## Ce que ce skill apporte en propre

Règles de couleur, typo, espace → `impeccable`.
Matière — styles, palettes, appariements → `corpus/recherche.py`.
Orchestration parallèle et ledger → `forge-agents`.
Itération mono-candidat → `la-boucle`.

Reste en propre : la garantie de divergence réelle, la rubrique de jugement figée,
et la borne de coût.

## Quick start

```
1. Axe            → references/axes-de-divergence.md — nommer l'axe AVANT de générer
2. Rubrique       → references/rubrique.md — figée, validée en un tour
3. Génération     → 3 directions, en parallèle si possible : references/run.md
4. Filtre         → node oracles/oracle-slop.mjs sur chaque direction
5. Jugement       → rubrique appliquée, puis oracle-judge en AVIS OUTILLÉ
6. Restitution    → DIRECTION.md : la gagnante, les 2 écartées, le relevé
```

## Ce qu'est une direction — et ce qu'elle n'est pas

Une direction, c'est **un tokens.css + un écran signature**. Ce n'est pas une
maquette complète : produire trois maquettes de vingt écrans pour en jeter deux est
un gâchis qui pousse à choisir avant d'avoir vu.

L'écran signature est celui qui porte la thèse du produit. Il est le même pour les
trois directions — sinon on ne compare rien.

## Règles dures

**L'axe de divergence est nommé avant la première génération.** Sans axe, on
produit trois variantes timides de la même idée et le jugement ne discrimine rien.
L'axe est un choix, il part dans la restitution.

**La rubrique est figée et validée avant le premier candidat.** Jamais réajustée
pour épouser une direction déjà produite. C'est le seul garde-fou contre le juge
qui découvre ses critères après coup.

**Arbitrage à charge.** Pour chaque critère, chercher d'abord à faire échouer la
direction. Un ✓ n'est accordé qu'avec sa preuve citable — une valeur, une ligne, un
verdict d'oracle. Pas de preuve ⇒ ✗.

**Une direction qui déclenche une règle dure d'`oracle-slop` ne concourt pas.**
Elle est écartée avant le jugement, avec son relevé. On ne met pas en compétition
une proposition qui porte déjà un marqueur de design généré.

**Borne de coût : 3 directions, 1 passe de jugement, 1 approfondissement.** Au-delà,
escalader. Une compétition qui s'étire indéfiniment est un aveu que la rubrique ne
discrimine pas.

**Les deux écartées ne sont jamais jetées en silence.** Chacune part avec la raison
de son élimination. Un commanditaire qui ne voit qu'une proposition n'a rien choisi.

## Références

| Fichier | À lire quand |
|---|---|
| `references/axes-de-divergence.md` | avant de générer quoi que ce soit |
| `references/rubrique.md` | pour poser le juge, avant le premier candidat |
| `references/run.md` | pour le mode d'exécution, parallèle ou dégradé |

## Pièges connus

- **Trois variantes de la même idée.** Le symptôme : les trois partagent la même
  hue et la même famille typographique. Revenir à l'axe.
- **La rubrique qui s'ajuste.** Si un critère est reformulé après avoir vu les
  candidats, la compétition est morte. Recommencer ou assumer.
- **Le juge complaisant.** Trois directions notées 4/5, 4/5 et 4/5 signifient que la
  rubrique ne teste rien de binaire.
- **La gagnante par défaut.** Si une direction gagne parce que les deux autres ont
  été bâclées, ce n'est pas un choix : c'est un candidat unique déguisé.
