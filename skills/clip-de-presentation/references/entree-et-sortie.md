# Principes d'entrée et de sortie : l'introduction et la carte de fin

Chaque clip s'ouvre sur une introduction de 6 s et se ferme sur une carte de fin. Les deux portent la
marque du produit : son logo, son nom, son lien. Dans la série d'origine, le logo a été injecté après
coup dans 14 clips par deux scripts qui réécrivaient chaque page ; l'un d'eux devait reconnaître
4 formats de légendes et 3 formes de carte de fin. Ici, `M.introduction` et `M.carteFin` posent la
marque elles-mêmes, depuis la déclaration de la page : un clip neuf n'a rien à injecter.

## La déclaration de marque

La page déclare sa marque une fois, dans son en-tête, à côté du `tokens.css` du dossier de marque
produit par `systeme-de-marque` :

```html
<link rel="stylesheet" href="../marque/tokens.css">
<script type="application/json" id="marque">
{ "nom": "Nom du produit", "logo": "../marque/logo-sombre.svg", "lien": "adresse-publique.example" }
</script>
```

| Champ | Ce qu'il porte | Si le champ manque |
|---|---|---|
| `nom` | le nom du produit, tel que `MARQUE.md` l'écrit | rien n'est écrit au-dessus du titre de l'introduction |
| `logo` | le logo pour fond sombre, chemin relatif à la page | le nom remplace le logo sur la carte de fin |
| `lien` | l'adresse publique du produit | la carte de fin n'a pas de lien |

`motion.js` lit cette déclaration au chargement et l'expose par `M.marque`. `window.PRET = () =>
M.pret()` attend le décodage du logo : un logo introuvable ou une déclaration illisible rend `PRET`
faux, et `scripts/rendre.py` refuse alors de rendre, au lieu de livrer un clip sans logo. Un SVG de logo
déclare `width` et `height` : sans eux, le navigateur ne connaît pas sa taille propre.

Rien de la marque ne s'écrit ailleurs. Un littéral d'image de logo, un nom de marque ou une adresse
écrits dans le script du clip, ou dans la bibliothèque, sont refusés par `oracle-clip` CL6.

## L'introduction : `M.introduire` et `M.introduction`

```js
M.introduire({ ctx, rendre: window.rendre, duree: window.DUREE,
  intro: { duree: 6, titre: '…', phrase: '…', etapes: ['…', '…', '…', '…'], graine: 11 } });
```

`M.introduire` porte `window.DUREE` à la durée du corps plus 6 s, joue l'introduction, puis passe au
clip par un fondu de 0,7 s, de 6,0 à 6,7 s. Le tableau donne les mesures de la série, reprises telles
quelles. Une ligne est un élément de l'image ; les temps sont ceux du MP4.

| Élément | Position | Apparition | Sortie |
|---|---|---|---|
| Logo | boîte de 300 × 190 px centrée à x = 960, y = 205, hors du zoom de l'introduction | de 0,2 à 1,1 s, alpha `M.sortie(M.prog(t, 0.2, 1.1))` | sous le fondu, de 6,0 à 6,7 s : `1 − M.douce(M.prog(t, 6.0, 6.7))` |
| Nom de la marque, en capitales espacées | y = 338, police de titre 40 px graisse 700 | avec le logo | sous le fondu |
| Filet | y = 382, 520 px de large | de 0,6 à 1,6 s | sous le fondu |
| Titre | y = 514, 132 px, réduit à la largeur utile de 1 660 px | tombe sur l'impact de 2 s | sous le fondu |
| Phrase | y = 646, police de corps 42 px, réduite à la même largeur | de 2,5 à 3,3 s | sous le fondu |
| Étapes, en étiquettes de 34 px | y = 806, sur un fil parcouru de particules | une toutes les 0,26 s dès 3,1 s ; chacune naît à 24 px au moins | sous le fondu |

La série posait un logo horizontal de 300 px de large. La boîte de 300 × 190 px garde ce cas tel quel,
et elle borne la hauteur d'un logo carré pour qu'il ne couvre pas le nom placé dessous. Cette borne
est un choix du versement du 10/11/2026, sans mesure de la série sur un logo carré.

## La carte de fin : `M.carteFin`

```js
if (t >= FIN) M.carteFin(ctx, t, FIN, { titre: ['Première ligne', 'seconde ligne.'], sousTitre: '…' });
```

`FIN` est le début de la carte en temps du clip, 4 à 5 s avant la fin. Le titre est une chaîne ou un
tableau de 2 lignes au plus. Sa taille part de 88 px et se réduit jusqu'à ce que la plus longue ligne
tienne dans la largeur utile de 1 700 px (110 px de marge de chaque côté). La carte de fin de la série
n'avait pas ce contrôle. Mesures de la série, minutage compté depuis `FIN` :

| Élément | Position | Apparition |
|---|---|---|
| Voile | toute l'image, `M.C.fond` à 82 % | de 0 à 1,2 s |
| Logo, ou le nom en police de titre 44 px si aucun logo n'est déclaré | boîte de 330 × 150 px centrée à y = 290 | de 0 à 1,2 s |
| Titre | deux lignes à y = 430 puis 430 + taille + 16 ; une ligne seule à y = 482 | de 0 à 1,2 s, en montant de 30 px |
| Filet | y = 602, 440 px de large | de 0,5 à 1,6 s |
| Sous-titre | y = 668, police de corps 40 px | de 0,8 à 1,8 s |
| Lien de la marque, en étiquette de 36 px | y = 800 ; la zone y = 770 à 830 reste libre | de 1,2 à 2,0 s |

L'ancienne forme `M.carteFin(ctx, t, a, titre, sousTitre)` reste acceptée. Une carte de fin maison
garde le lien de la marque en passant `finCarte: <début de la carte>` à `M.introduire`, ou en appelant
`M.lien(ctx, t, FIN + 1.2)` ; elle vérifie elle-même la largeur de son titre.

## Ce qui se contrôle sur la planche, pas dans le code

Le placement exact se lit sur une planche qui couvre l'introduction (0,6 s, 1,5 s, 3,5 s, 5,5 s) et la
carte de fin (FIN + 6 + 0,4 s, puis + 2,5 s). On y vérifie le logo net et entier, le nom lisible sous
lui, le titre sans coupure et le lien hors de toute légende.
