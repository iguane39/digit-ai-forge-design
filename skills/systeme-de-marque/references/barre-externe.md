# Étape 0 — relever la barre AVANT de proposer

Ce document dit comment produire `BARRE-EXTERNE.md` : ce qu'on regarde, ce qu'on en écrit, et ce
qu'on soumet au commanditaire. Il ne dit pas ce qui est beau — aucun document ne peut le dire.

## Pourquoi cette étape existe

Une première direction artistique a passé **tous** les oracles de cette forge **au vert** et a été
**rejetée en bloc** : « ça ne présente rien et ça ne donne pas du tout envie ». Un tour complet
conception+design perdu, et la sortie de crise a consisté exactement en ce qui manquait : un relevé
de dix sites reconnus du même domaine, trois directions neuves, un arbitrage humain sur captures.

Les oracles de la forge jugent la **discipline interne** : tokens conformes, contrastes tenus,
mouvement sobre, bascule câblée, mobile. Ils le font bien, et ils ne peuvent pas faire autre chose.
**Aucun ne sait où est le niveau du domaine.** Une direction irréprochable en discipline peut être
en dessous de tout ce que la cible voit ailleurs — et c'est le seul jugement qui décide de
l'acceptation.

## Ce qu'on regarde, et combien

**Cinq références au minimum, dix c'est mieux**, dans le **domaine du produit** — pas dans le
design en général. Une plateforme vidéo se compare à des plateformes vidéo, pas à des portfolios
d'agence primés : ce sont deux barres différentes, et se tromper de barre coûte le même tour.

Les trois questions à se poser devant chaque référence :

1. **Qu'est-ce qui donne envie de cliquer ?** — la première impression, avant toute analyse.
2. **Qu'est-ce qui est tenu partout ?** — ce qui ne saute jamais : une grille, un ratio, une
   palette. La constance se voit plus que l'audace.
3. **Qu'est-ce que je NE reprends pas, et pourquoi ?** — la question la plus utile des trois.

## Ce qu'on écrit

Quatre sections, et chacune répond à un contrôle : le tableau ci-dessous dit quoi écrire, et ce qui
le vérifie.

| Section | Contenu | Contrôlé par |
|---|---|---|
| Date du relevé | `AAAA-MM-JJ` | B1 — un relevé non daté est une opinion : les références d'un domaine bougent |
| Ce qui est retenu | une ligne par référence : nom, **source** (URL ou éditeur), **ce qu'on en retient** | B2 — une liste de noms n'est pas un relevé |
| Écarté | ce qu'on refuse, avec son **motif** en une phrase opposable | B3 — un relevé qui ne refuse rien n'a rien tranché : il a admiré |
| Arbitrage humain | **qui** a tranché, **quand**, et **sur quelles captures** | B4 — le commanditaire arbitre des IMAGES, pas une description |

## Le gate humain, et pourquoi il est sur captures

C'est la leçon la plus dure du tour perdu : la direction rejetée avait été **décrite**, pas
**montrée**. Une description obtient un accord de principe ; une image obtient une décision. On
soumet donc **au moins deux directions en captures côte à côte**, à la même taille, sur le même
écran de référence — et on note la décision avec les mots du commanditaire. Ces mots-là serviront
au prochain arbitrage.

**Ce gate est une ÉTAPE, pas un rattrapage.** Il a lieu avant de développer la direction retenue :
après, ce n'est plus un arbitrage, c'est une renégociation.

## Ce que le contrôle ne fera jamais

`node oracles\oracle-barre-externe.mjs BARRE-EXTERNE.md` vérifie la **présence** et la
**complétude** — jamais la justesse. Sont déclarés hors jugement, dans le `non_juge` de l'oracle :
la pertinence du panel (cinq références bien choisies valent mieux que quinze au hasard, et aucun
script ne sait faire la différence), l'atteinte de la barre (le relevé dit où est le niveau, il ne
prouve pas qu'on s'y hisse), et la sincérité du gate (une ligne d'arbitrage peut être écrite sans
que personne n'ait regardé les captures).

C'est la même doctrine que pour la voix, et elle est déjà écrite dans ce skill : *la justesse d'une
voix n'est pas décidable par script ; ce qui EST vérifiable, c'est la constance.*
