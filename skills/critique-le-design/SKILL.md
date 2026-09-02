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
Détection déterministe → `oracle-slop`, `oracle-tokens`, `oracle-mobile`, `oracle-images`, `oracle-restitution`, `oracle-saisie`, `oracle-panneau-tache`.
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

## Règle cardinale, second volet — ce qui a été DEMANDÉ (TF-0494, 22/08/2026)

**Aucun constat sans preuve** dit comment juger le livrable. Il ne dit rien de ce qui avait été
demandé, et ce sont deux choses différentes : *un livrable peut passer tous ses oracles et rater
un point sur dix-sept*, parce qu'aucun oracle ne sait ce qui avait été demandé.

*Fait fondateur.* Sur **dix-sept points de correction reçus en une fois**, seize ont été traités.
Le dix-septième n'a été découvert que parce que **le client l'a redemandé**, avec un « Pourquoi ? ».

**Dès que la demande compte plus d'un point, la revue porte sa liste de contrôle** — un tableau
*point demandé / correction apportée / preuve*, rempli **avant remise**. Le point se cite dans les
**mots du demandeur**, jamais reformulé : une reformulation est déjà une interprétation, et c'est
en reformulant qu'on perd le point qu'on n'a pas compris.

**Un point sans preuve est un point non traité.** Un point légitimement écarté n'est pas interdit —
ce qui est interdit, c'est qu'il DISPARAISSE : il porte `NON TRAITÉ — <motif>`. Même doctrine que
le bloc « non traité » d'une restitution : *un reste sans motif est un silence*.

Gabarit et bornes : `references/liste-de-controle-demande.md`. **Contrôle exécuté** :
`node oracles\oracle-liste-demande.mjs <REVUE.md>` — D1 une ligne sans preuve ni motif · D2 le
compte annoncé ne colle pas au nombre de lignes (*le défaut du 22/08 en une soustraction*) ·
D3 une preuve qui n'en est pas une (« vérifié », « fait », « ok » seuls). Sans section, l'oracle
rend **SANS OBJET** : tous les livrables ne répondent pas à une demande à points, et en inventer
une serait pire.

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
| D6 | Interaction | états des composants, retours, erreurs, vides, **champs typés/proposés/bornés/atteignables**, **choix exclusif posé avant ses champs** | `oracle-saisie` SA1–SA6 + `oracle-panneau-tache` PA1–PA6 + parcours exécuté |
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
