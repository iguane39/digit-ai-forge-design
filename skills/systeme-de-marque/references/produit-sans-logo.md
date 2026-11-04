# Produit sans logo — la branche du skill

Créé le 04/11/2026 (TF-2073, décision humaine D-156 (a) du 03/11/2026, essai). Jusqu'ici ce skill
partait d'un entrant de marque : une charte, un site, un logo, trois mots de ton. Un produit en
construction n'a souvent rien de tout cela, et rien ne disait quoi faire de ce vide. Cette branche dit
comment proposer un logo, ou plutôt trois, **jusqu'à l'arrêt devant un humain**. Elle ne livre jamais
un logo final : elle livre trois concepts jugés et la planche qui permet de choisir.

## D'où vient la méthode, et ce qui n'est pas repris

La méthode est celle du skill `logo-design-skill` (dépôt `kaankiziltug/logo-design-skill`, licence MIT,
version 1.4.5, consulté le 03/11/2026 pour l'essai de la décision D-156 (a)) : lister les clichés de
la catégorie, dessiner trois concepts d'idées différentes, tester leur familiarité, les poser sur
l'étagère de la catégorie, s'arrêter pour une revue humaine. Le texte ci-dessous est rédigé ici, à partir
de la note d'essai du 03/11/2026 ; aucune portion de son code ni de son texte n'est copiée. Si une
portion l'était un jour, la notice de licence MIT de ce dépôt devrait la suivre.

**Ce qui n'est PAS repris, et ne s'installe pas** : sa bibliothèque de 1 432 logos de marques
d'autrui. Son propre fichier `TRADEMARKS.md` les exclut de la licence MIT : ce sont des marques de
tiers. Les installer ferait entrer 1 432 marques d'autrui sur le poste pour un test qui se fait avec
cinq à dix références choisies. Le skill lui-même n'est pas installé non plus : son audit de fichier a
rendu 100/100 à trois SVG illisibles à 16 px (essai du 03/11/2026), ce qui est la raison d'être de
`oracle-logo-petit` dans cette forge.

## Quand la branche s'ouvre

À l'extraction (`references/extraction.md`) : l'entrant est « rien » ou « trois mots de ton », et
aucun logo n'existe, ni fichier, ni intention. Un produit qui a un logo suit le protocole « Logo seul ».
Un produit dont le logo est un brouillon sans valeur suit cette branche, et le dit.

## Les sept étapes

1. **Le sujet en une phrase.** Ce que le produit garantit, pas ce qu'il fait ni son nom : une phrase,
   avec un verbe. Exemple de l'essai : « ce qui est hors cadre n'existe pas » pour un outil d'essais
   d'intrusion borné par un périmètre signé. Sans cette phrase, un concept ne peut ni se dessiner ni se
   juger : il décore.
2. **La liste des clichés de la catégorie.** Avant tout dessin, écrire ce que presque tous les produits
   de la catégorie portent : formes (bouclier, cadenas, œil, globe), couleurs (rouge d'alerte, bleu
   corporate), effets (dégradé, néon). Source : le relevé `BARRE-EXTERNE.md` de l'étape 0 du skill, qui
   donne déjà au moins cinq références datées de la catégorie. Un cliché ne s'utilise que s'il est
   justifié par écrit, ce qui arrive rarement. Sur l'essai, la catégorie « sécurité » penchait vers le
   rouge, le bouclier et le dégradé.
3. **Trois concepts d'idées différentes.** Trois, ni deux ni cinq. Chacun tient en une phrase qui dit
   l'idée, et nomme son type : abstrait, lettre ou emblème. **Différentes veut dire que deux concepts ne
   peuvent pas se décrire par la même phrase** : trois variations de forme d'une même idée valent un seul
   concept. Chaque idée doit se rattacher à la phrase de l'étape 1. Sur l'essai : deux équerres qui
   bornent un carré (abstrait), trois carrés en chaîne dont le dernier est creux tant qu'un humain ne l'a
   pas signé (abstrait), un P dont le pied est coupé (lettre).
4. **Le test de familiarité, avant de dessiner.** Pour chaque concept, décrire sa forme en trois ou
   quatre mots (« anneau ouvert autour d'un point ») et chercher un logo existant qui porte la même forme
   avec la même idée : dans le relevé de l'étape 2, puis par une recherche d'images faite à la main ou par
   l'agent sur le web. Une forme et une idée déjà prises par une marque connue condamnent le concept :
   il est remplacé, pas retouché. Sur l'essai, un anneau ouvert autour d'un point a rencontré deux
   marques connues et a été écarté avant d'être dessiné. Le test porte sur la forme et l'idée ; il ne
   dit pas qu'un logo est libre de droits, ce qui reste une vérification juridique.
5. **Le tracé, puis la lecture en petit.** Chaque concept en SVG, sans texte vivant (tracés), d'abord
   en une seule couleur : si le logo ne tient pas sans la couleur, la couleur ne le sauvera pas. Puis
   `node oracles/oracle-logo-petit.mjs concept-*.svg --fond <#fond d'usage> --sortie <dossier>` : le
   verdict (LP1 à LP5) et les PNG rendus à 16 et 32 px. **Regarder les PNG.** L'oracle dit si la forme
   survit (traits plus fins qu'un pixel, détails fusionnés, contraste) ; il ne dit pas si le logo se lit
   encore comme ce qu'il veut dire. Sur l'essai, un maillon creux se réduisait à des points en diagonale à
   16 px et un P à pied coupé se lisait « P! » à 64 px, ce qu'aucun audit de fichier n'a vu.
6. **L'épreuve de l'étagère.** Une planche unique : les trois concepts posés au milieu de cinq à dix
   références de la catégorie (celles du relevé), toutes en une couleur, rendues à 16, 32 et 64 px. Deux
   questions : un concept se confond-il avec le groupe, et reste-t-il lisible quand ses voisins le sont ?
   Un concept qui se fond dans l'étagère est écarté, même s'il est joli. Les références servent de
   comparaison privée sur la planche, qui n'est pas publiée.
7. **L'arrêt pour revue humaine.** La planche est remise à l'humain, qui arbitre des **images**, jamais
   une description (même règle que l'étape 0 du skill). Les concepts écartés le sont avec leur motif. Le
   choix fait, la suite est le protocole « Logo seul » de l'extraction : couleurs, registre formel,
   puis tokens. Ni la planche ni le choix ne s'automatisent : un goût ne se décide pas par script.

## Ce que la branche livre

Dans le dossier de travail de l'appelant, jamais dans ce dépôt : trois SVG, la planche (PNG et SVG),
la liste des clichés, le tableau « concept, idée en une phrase, type, test de familiarité, verdict de
`oracle-logo-petit` », et ce qui a été supposé. Une ligne par concept écarté, avec son motif.

## Pièges

- **Trois variations d'une même idée.** C'est le piège de l'étape 3 : la planche montre trois logos,
  le choix humain porte sur un seul.
- **Le logo qui n'existe qu'en grand.** Il passe l'œil sur écran large et disparaît dans l'onglet. La
  lecture en petit (étape 5) se joue avant la planche, pas après le choix.
- **Les clichés repris « en mieux ».** Un bouclier plus sobre reste un bouclier : il est dans la liste.
- **Un audit de fichier lu comme un jugement de logo.** Il vérifie la propreté d'un SVG, pas sa
  qualité. Seuls les rendus, regardés, comptent.
- **La bibliothèque d'autrui installée « pour gagner du temps ».** Elle est exclue de la licence par son
  auteur lui-même.
