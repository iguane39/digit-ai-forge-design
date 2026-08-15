---
name: critique-le-design
description: Audit exécuté d'un design produit — page, maquette, écran, capture ou URL — sur une grille en huit dimensions notées, adossée à des oracles lancés et non à une lecture de code : verdict en trois niveaux (Livrer, Renforcer, Refondre), constats à preuve typée, et top cinq des corrections en impact fois effort avec réécritures avant/après. Use when / déclencher dès que l'utilisateur demande de relire, critiquer, auditer, noter, challenger ou renforcer un design, demande ce qui cloche visuellement, si c'est prêt à montrer au client, si ça fait généré par IA, ou comment améliorer une interface existante. Ne pas déclencher pour produire ou refondre la maquette elle-même (→ ameliore-le-design), figer des tokens (→ systeme-de-marque), arbitrer entre directions concurrentes (→ studio-de-direction), auditer un skill (→ ameliore-un-skill), ni challenger la pertinence d'une solution (→ contre-expertise).
version: 1.2.0
---

# Critique le design

Juge un design **déjà produit**. Ne le corrige pas : il produit le relevé et les
corrections priorisées, le commanditaire décide.

## Ce que ce skill apporte en propre

Loi de qualité et registre → `quality-oracles`.
Règles de design → `impeccable`.
Détection déterministe → `oracle-slop`, `oracle-tokens`, `oracle-mobile`, `oracle-images`, `oracle-restitution`.
Rendu réel → `render_page.py` (`digit-ai-page-html`).

Reste en propre : la grille en huit dimensions, la règle de verdict, et la grammaire
de restitution — score, red flags, top 5 en avant/après.

## Quick start

```
1. Cadrage      → cible (web|mobile), thèmes disponibles, tokens fournis ou non
2. Oracles      → references/grille.md §Enchaînement — TOUS lancés avant toute lecture
3. Notation     → references/grille.md, 8 dimensions /5 (D8 seulement si restitution)
4. Red flags    → un seul suffit à plafonner le verdict
5. Restitution  → references/restitution.md
```

## Règle cardinale

**Aucun constat sans preuve exécutée.** Un design ne se juge pas en lisant son
code : on lance les oracles, on lit les verdicts, on cite les lignes. Une dimension
dont l'oracle n'a pas pu tourner est notée `non_juge` — jamais estimée, jamais
approuvée par défaut.

C'est la différence entre cet audit et une relecture : la relecture produit un avis,
l'audit produit un relevé opposable.

## Deux modes

| Mode | Sortie | Quand |
|---|---|---|
| `complet` (défaut) | rapport Markdown + relevé JSON des oracles | avant envoi client, revue de fin de lot |
| `express` | score et top 3 en conversation | vérification rapide en cours de travail |

Le mode `express` lance **les mêmes oracles**. Il raccourcit la restitution, jamais
le contrôle.

## Les sept dimensions

| # | Dimension | Ce qu'elle mesure | Adossée à |
|---|---|---|---|
| D1 | Intention | direction lisible, ancrée dans le sujet, non générique | `oracle-slop` + lecture |
| D2 | Système | tokens tracés, parité des thèmes, échelle tenue | `oracle-tokens` |
| D3 | Hiérarchie | typographie, densité, rythme d'espacement | `render_page.py` + lecture |
| D4 | Accessibilité | contraste, focus, clavier, sémantique | `oracle-a11y` + `render_page.py` V2 |
| D5 | Adaptation | breakpoints, tactile, orientation | `oracle-mobile` + `render_page.py` |
| D6 | Interaction | états des composants, retours, erreurs, vides | parcours exécuté |
| D7 | Contenu | libellés, erreurs, états vides, constance du vocabulaire | lecture |

Détail des barèmes, red flags et règle de verdict : `references/grille.md`.

## Références

| Fichier | À lire quand |
|---|---|
| `references/grille.md` | avant de noter quoi que ce soit |
| `references/restitution.md` | pour produire le rapport |

## Pièges connus

- **Noter avant d'exécuter.** Le symptôme : une note en D4 sans verdict d'oracle
  joint. C'est un avis déguisé en audit.
- **Le 3/5 de confort.** Une dimension notée 3 sans constat précis signifie qu'elle
  n'a pas été instruite.
- **Confondre goût et défaut.** « Je n'aime pas cette couleur » n'est pas un
  constat. « Contraste 3.1:1 en thème sombre, ligne 214 » en est un.
- **Top 5 sans effort estimé.** Une liste de corrections sans coût n'est pas
  priorisée : c'est une liste de courses.

## Troisième mode — critique d'implémentation (aval)

Après l'étape development d'un run forge : comparer le produit implémenté à SA promesse design
(tokens, écrans, états, CTA, voix du run) et produire des **retours consommables par le
développement**. Entrées doubles (artefacts design du run + instance servie ou gabarits du
produit), cinq contrôles avec preuve, restitution en écarts ancrés prêts pour le ledger — tout
est dans `references/critique-implementation.md`. Frontière : le câblage fonctionnel des
affordances reste à forge-tests (pan `interface`) ; ici on juge la forme contre la promesse.
Sans artefacts de référence, le mode dégrade en critique classique et le déclare.
