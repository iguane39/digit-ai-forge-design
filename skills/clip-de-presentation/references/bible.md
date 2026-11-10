# Bible de style des clips de présentation

Ce document fixe ce qui est commun à tous les clips d'une série ; chaque storyboard dit ce qui lui
est propre. Un constructeur le lit en entier avant d'écrire une ligne. Il est versé le 10/11/2026
(TF-2405) depuis la bible d'une série de 28 clips rendus chez un produit les 09 et 10/11/2026. Les
storyboards de cette série, propres à leur produit, ne sont pas repris.

## Référence visée

Un clip de présentation est du motion design, pas une présentation animée. Le commanditaire de la
série l'a dit en refusant la première version : « Je ne demande pas des powerpoints animés, je demande
des animations ». Les deux références de la série sont les 10 styles de la vidéo « 10 animations you
can make with Claude » (YouTube `bFOVR4UTOZA`), et la méthode en 6 étapes du tutoriel « Claude Opus
5.5 fait le motion design à ta place » (YouTube `b0oRpP1eJAs`) : référence, bible, musique,
storyboard, contrôle, rendu. Ce qui fait la différence :

- l'image bouge en continu, sans bouton ni clic ; le spectateur regarde, il ne lit pas ;
- chaque plan porte une seule métaphore visuelle forte : blocs isométriques qui montent, vue éclatée
  de couches, essaim d'agents, scanner holographique, chemin lumineux, compteur ;
- le texte se limite à une légende par plan, aux budgets de `references/textes-recit-client.md`,
  plus des étiquettes à chasse fixe ;
- la caméra vit : léger zoom avant permanent, glissements entre plans, jamais d'image figée plus
  de 1,5 s ;
- les moments forts tombent sur les impacts de la musique.

## Format

- 1920 × 1080, 30 images par seconde. Le corps du clip dure `window.DUREE = 60` (59 à 62 s tolérées) ;
  `M.introduire` y ajoute 6 s d'introduction, et le MP4 dure donc 66 s.
- Un fichier HTML autoportant par clip, en Canvas 2D. Il charge `motion.js` par un chemin relatif :
  la copie de `scripts/motion.js` dans `<série>/outils/motion.js`, chargée par
  `<script src="../outils/motion.js">` depuis le sous-dossier du clip. Les polices de la marque se
  chargent avec `display=block`.
- La page déclare `<html lang="fr" data-theme="dark">`, charge le `tokens.css` du dossier de marque et
  porte la déclaration de marque (`references/entree-et-sortie.md`). Son fond est `var(--fond)`.
- `window.PRET = () => M.pret()` charge les polices et le logo avant la première image : un canvas ne
  déclenche pas seul le chargement des polices. Les 3 constructeurs des premiers essais l'ont relevé.
- Le contrat du rendu tient en deux noms : `window.DUREE`, un nombre, et `window.rendre(t)`, qui dessine
  l'image de l'instant t de façon **déterministe**. `rendre` n'appelle ni `Date.now`, ni
  `performance.now`, ni `Math.random`, ni `requestAnimationFrame`. L'aléa passe par `M.alea(graine)`,
  recréé à chaque appel ou précalculé une fois, et `rendre(t)` peut être appelé dans n'importe quel
  ordre. `oracle-clip` CL7 le vérifie dans la source.
- L'aperçu se lance par `M.apercu(window.rendre, window.DUREE, 'musique.wav')` en fin de script.

## Couleurs et typographie

Le clip prend le thème sombre de la marque, c'est-à-dire le bloc `:root[data-theme="dark"]` du
`tokens.css` de `systeme-de-marque`. `motion.js` l'expose par `M.C`, et convertit lui-même les jetons
OKLCH. Le tableau donne la correspondance ; une ligne est une clé de `M.C`.

| Clé de `M.C` | Jeton lu dans `tokens.css` | Usage dans la bibliothèque |
|---|---|---|
| `fond` | `--fond` | fond, voile de la carte de fin |
| `carte` | `--surface` | fond des étiquettes |
| `trait` | `--trait` | traits de décor |
| `encre` | `--texte` | titres, légendes |
| `faible` | `--texte-faible` | phrase d'introduction, sous-titre, nom de la marque |
| `accent` | `--accent` | trame du fond, étiquettes, lueur des titres |
| `accent2` | `--accent-2`, facultatif ; sinon `--accent` | chemins, particules, filets, mot accentué d'une légende, lien |
| `succes`, `alerte`, `erreur` | `--texte-succes`, `--texte-alerte`, `--texte-erreur`, facultatifs | coche, états de décor |
| `fond2`, `pale` | dérivés : mélanges de `fond` et `carte`, de `faible` et `fond` | centre du dégradé, texte pâle |

Aucune autre couleur en dur dans un clip. Les titres sont en police de titre graisse 800, les légendes
en police de titre graisse 700, les étiquettes en police à chasse fixe de **24 px au moins**. Les
polices viennent de `--police-titre`, `--police-corps` et `--police-mono`. La lueur (`shadowBlur`)
souligne ce qui compte dans le plan, jamais tout le plan.

Un clip écrit pour la bibliothèque de la série se porte par 5 renommages : `bleu` devient `accent`,
`teal` devient `accent2`, `vert` devient `succes`, `ambre` devient `alerte`, `rouge` devient `erreur`.
Les teintes de domaine d'un seul clip (bronze, argent, or) se déclarent dans ce clip, à partir des
jetons de la marque.

## Mouvement

- Les entrées passent par `M.sortie` (décélération forte), les sorties par `M.douce`, et ce qui « se
  pose » (un bloc, un tampon) par `M.rebond`.
- Les éléments d'un même groupe se décalent de 60 à 120 ms.
- On passe d'un plan à l'autre par un glissement de caméra ou un fondu enchaîné de 0,5 à 0,8 s :
  jamais de coupe sèche, jamais d'écran vide.
- Une boucle de fond tourne toujours : particules, trame qui dérive, pulsation.
- Un élément ne naît jamais d'une échelle 0 : un texte y passerait par toutes les tailles sous 24 px.
  C'est la règle R2 d'`oracle-motion` pour les interfaces, et le défaut 6 corrigé dans `M.introduction`.

## Musique

`scripts/musique.py` compose à 120 BPM, une mesure valant 2 s. Chaque storyboard donne ses impacts :
le plan qui commence sur un impact y pose son geste fort, un bloc qui tombe, un tampon, une explosion
de particules. La musique se génère avant l'animation. Elle se cale sur le temps du MP4 : `--duree 66`,
un impact à 2 s pour le titre de l'introduction, puis chaque impact du storyboard plus 6, et
`--intro`, `--montee`, `--outro` plus 6.

## Texte et vérité

- Le texte suit le `MARQUE.md` du produit : sa voix, son vocabulaire, ses anti-références. Aucun
  superlatif.
- Chaque affirmation montrée vient d'une preuve de la table du storyboard (`gabarits/STORYBOARD.md`),
  avec sa source `fichier:ligne`. Une preuve « partielle » se montre avec sa limite ; une capacité
  « absente » ne se montre pas.
- Un chiffre montré comme un fait se mesure le jour même par une commande notée au storyboard, et
  l'écran porte sa date (« comptés le 10/11/2026 »). Un chiffre de décor porte à l'écran l'étiquette
  « exemple ». `oracle-clip` CL5 refuse un chiffre qui n'est ni l'un ni l'autre.
- Aucun nom de client, de prospect ni de personne. Les fichiers, tables et chiffres de décor sont
  inventés et neutres (« commandes », « clients », « factures »).

## Introduction et carte de fin

`M.introduire` enveloppe le clip d'une introduction de 6 s, et `M.carteFin` pose la carte de fin sur
les 4 à 5 dernières secondes. Les deux prennent le logo, le nom et le lien dans la déclaration de
marque de la page. Positions, minutage et principes : `references/entree-et-sortie.md`.

## Contrôle avant rendu

C'est l'étape 5 de la méthode, et elle se fait avant le rendu complet.

1. `python scripts/rendre.py <clip>/clip.html --planche <clip>/planche-1.jpg --instants <liste>`, avec un
   instant au milieu de chaque plan et un au milieu de chaque transition : 16 instants au moins, en
   temps du MP4, introduction comprise. Trois planches au moins sur la vie du clip.
2. Lire chaque planche comme un spectateur : texte coupé, chevauchement, élément hors cadre, plan vide,
   contraste insuffisant, légende illisible, couleur hors marque, étiquette rendue sous 24 px par un
   zoom de caméra. Corriger, puis rejouer la planche.
3. Seulement ensuite, rendre la vidéo complète.

## Rendu

```bash
python scripts/musique.py --sortie <clip>/musique.wav --duree 66 --impacts 2,<impacts + 6> --intro <s + 6> --montee <s + 6> --outro <s + 6>
python scripts/rendre.py <clip>/clip.html --sortie "<chemin du MP4 chez le produit>" --musique <clip>/musique.wav
```

Le rendu prend environ 100 ms par image sur un poste Windows avec carte graphique (mesuré le
09/11/2026), soit 3 à 5 minutes pour 66 s. Le 10/11/2026, 3 rendus en parallèle ont pris de 169 à 315 s
par clip. Le MP4 et la musique restent chez le produit : aucune vidéo ni aucun `.wav` n'entre dans un
dépôt de forge.
