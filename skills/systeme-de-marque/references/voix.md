# Contrat de MARQUE.md

La partie verbale survit à la refonte suivante, la palette non. Elle mérite autant
de soin, et elle en reçoit rarement.

## Structure imposée

```markdown
# Marque — {Client}

## Ton
Trois mots concrets. Ni « moderne », ni « élégant », ni « professionnel ».

## Registre
Tutoiement ou vouvoiement, et pourquoi. Niveau de langue. Longueur de phrase type.
Ce qu'on ne dit jamais.

## Vocabulaire
| On dit | On ne dit pas | Pourquoi |
|---|---|---|
| dossier | ticket | c'est le mot des utilisateurs, pas celui du système |

## Actions
Un libellé, un seul, d'un bout à l'autre du parcours.
« Publier » produit « Publié » — jamais « Envoyer » puis « Soumis ».

## Erreurs
Ce qui s'est passé, puis comment le réparer. Jamais d'excuse, jamais de vague.
Exemple type : « Le fichier dépasse 10 Mo. Compresse-le ou envoie-le en deux fois. »

## États vides
Une invitation à agir, jamais un constat de vide.
Exemple type : « Aucun dossier pour l'instant. Crée le premier. »

## Anti-références
Ce à quoi la voix ne doit surtout pas ressembler, et pourquoi.
```

## Règles d'écriture

**Nommer par ce que la personne contrôle**, jamais par la façon dont le système est
construit. On gère des notifications, pas une configuration de webhook.

**Voix active par défaut.** Un bouton dit ce qui se passe quand on l'actionne :
« Enregistrer les modifications », pas « Valider ».

**Être précis plutôt que malin.** Un libellé exact bat une formule.

**Chaque élément fait un seul travail.** Un label étiquette, un exemple démontre.
Rien ne fait discrètement les deux.

## Ce que l'oracle ne juge pas

`oracle-tokens` ne lit pas `MARQUE.md` : la justesse d'une voix n'est pas
décidable par script. Elle est déclarée `non_juge` et relève de l'arbitrage du
commanditaire. Ce qui **est** vérifiable — et doit l'être à la relecture — c'est la
constance : un libellé d'action qui change entre deux écrans est un défaut
localisable, pas une nuance.
