# Liste de contrôle de demande — rapprocher ce qui a été DEMANDÉ de ce qui a été FAIT

*Fait fondateur, 22/08/2026.* Sur **dix-sept points de correction reçus en une fois**, seize ont été
traités. Le dix-septième — le formatage des documents embarqués — **n'a été découvert que parce que
le client l'a redemandé**, avec un « Pourquoi ? ».

Rien dans la chaîne ne rapprochait la demande du livrable. Le skill décrit la **boucle de contrôle
du livrable** — lancer les oracles, lire les verdicts, citer les lignes — et **jamais le suivi de ce
qui a été demandé**. Ce sont deux choses différentes, et la seconde manquait entièrement : un
livrable peut passer tous ses oracles et rater un point sur dix-sept, parce qu'aucun oracle ne sait
ce qui avait été demandé.

**Un point sans preuve est un point non traité.** C'est la seule règle de cette page, et elle est
mécanique : ce n'est pas « je crois l'avoir fait », c'est une capture, une mesure ou un contrôle.

## Le gabarit

Un tableau, dans `REVUE.md` ou à côté, **rempli avant remise** :

```markdown
## Liste de contrôle de la demande — <date de la demande>, <N> points

| # | Point demandé (mots du demandeur) | Correction apportée | Preuve |
|---|---|---|---|
| 1 | « les tableaux sont illisibles en mobile » | repli en cartes sous 640 px | `render_page.py --widths 390` : 0 débordement |
| 2 | « le titre passe à la ligne » | `text-wrap: balance` sur les titres | capture `titre-390.png` |
| 3 | « il faut pouvoir formater les MDs » | lecteur à deux vues, rendu paresseux | capture `lecteur-mis-en-forme.png` |
```

**Trois colonnes, et aucune n'est décorative.**

- **Le point demandé se cite dans les MOTS DU DEMANDEUR**, pas reformulé. Une reformulation est déjà
  une interprétation, et c'est en reformulant qu'on perd le point qu'on n'a pas compris. Si le
  demandeur a écrit « ça ne donne pas envie », c'est cela qui s'écrit — pas « améliorer l'attrait
  visuel ».
- **La correction dit ce qui a CHANGÉ**, pas l'intention. « Revu la mise en page » n'est pas une
  correction, c'est un résumé.
- **La preuve est une capture, une mesure ou un verdict d'oracle.** Pas un avis, pas un « vérifié ».

## Ce que la liste RÉVÈLE, et qui est le vrai gain

Un point peut légitimement ne pas être traité : hors périmètre, arbitrage contraire, coût
disproportionné. **La liste ne l'interdit pas — elle interdit qu'il disparaisse.** Une ligne dont la
colonne « Preuve » porte `NON TRAITÉ — <motif>` est une ligne honnête ; une ligne absente est un
point perdu, et c'est celui-là que le client redemande.

C'est la même doctrine que le bloc « non traité » d'une restitution : *un reste sans motif est un
silence*.

## Contrôle exécuté

`node oracles\oracle-liste-demande.mjs <REVUE.md>` — il refuse :

- une ligne sans preuve **et** sans motif de non-traitement (`D1`) ;
- un **compte annoncé** en titre qui ne correspond pas au nombre de lignes (`D2`) — c'est le défaut
  du 22/08 en une règle : dix-sept annoncés, seize listés, et personne ne fait la soustraction ;
- une preuve qui n'en est pas une (`D3`) : « vérifié », « fait », « ok », « corrigé » seuls, sans
  fichier, sans mesure, sans verdict.

**Ce qu'il ne juge pas** : la VÉRACITÉ d'une preuve — qu'une capture montre vraiment ce qu'elle
prétend demande de regarder. Et il ne sait pas si un point a été **oublié à la saisie** : il compare
le tableau à son propre en-tête, jamais à la demande d'origine, qui vit dans un fil de discussion.
C'est pourquoi le compte annoncé est une règle et non une commodité — il est le seul lien entre le
tableau et ce qui a vraiment été demandé.
