# Méthode des textes en récit client, et leurs budgets de caractères

Un clip montre peu de texte : un titre, une phrase et des étapes à l'introduction, une légende par
plan, un titre et un sous-titre de fin. Ces quelques textes racontent ce qui change pour le client.
La méthode est versée le 10/11/2026 (TF-2405) depuis deux propositions qui ont réécrit en récit les
textes d'une série de 14 clips. Elle s'applique à un clip neuf comme à la réécriture d'un clip existant.

## 1. Relever les textes du clip

Le relevé suit l'ordre d'apparition à l'écran. Une ligne est un texte, ou une famille d'étiquettes
affichées ensemble, séparées par « · ».

| N° | Moment (s) | Emplacement | Texte exact | Source | À préciser |
|---|---|---|---|---|---|
| 1 | 1,7 | Introduction, titre | … | `clip.html:<ligne>` | |
| 2 | 6,5 à 11,7 | Légende 1 | … | `clip.html:<ligne>` | chiffre de décor sans l'étiquette « exemple » |

Le moment se compte depuis le début du MP4, introduction de 6 s comprise. La source donne la ligne du
code qui dessine le texte. La dernière colonne signale ce qu'il faut nuancer avant de reprendre le
texte : un terme d'outil sans explication, un sigle non développé, une capacité simulée présentée comme
vécue, un chiffre de décor qui n'est pas étiqueté.

## 2. Écrire la version en récit

Le récit suit le client, pas l'outil. Il dit au lecteur ce qu'est le produit, ce qui change pour ses
équipes, ce que l'humain garde, et le but visé. Il tient en un arc de trois temps :

- **situation** : ce que le client vit au départ, avec sa contrainte, par exemple un besoin flou et une
  échéance ;
- **tension** : ce qui pourrait mal tourner, et que le produit arrête, par exemple un test qui échoue
  avant d'atteindre les utilisateurs ;
- **résolution** : ce que le produit fait, et ce que le client décide.

Les règles d'écriture :

- le lecteur est nommé avant d'écrire : un responsable du domaine, ou un décideur qui n'en a que les
  bases ; on lui dit « vous » et « vos équipes » ;
- les termes d'outil se traduisent : « accord » pour « GO », « contrôle » pour « oracle », « règle de
  design » pour « jeton », « failles connues » pour « CVE » ;
- le vocabulaire est celui du `MARQUE.md` du produit, ses anti-références comprises ;
- ce que l'humain garde se dit dans le texte, au moins une fois, souvent au sous-titre de fin ;
- aucun gain chiffré qui ne soit mesuré : les seuls chiffres gardés sont ceux que le clip mesure
  déjà, avec leur date ;
- une formulation imposée par le commanditaire se reprend mot pour mot, et le storyboard le dit,
  même quand elle dépasse le budget qu'on lui proposait ;
- les étiquettes de décor des animations ne changent pas avec le récit.

## 3. Tenir les budgets de caractères

Chaque texte tient dans sa place. Les budgets sont ceux que la série a mesurés par script ; les
caractères se comptent un à un, espaces et ponctuation compris, une apostrophe typographique valant un
caractère. `oracle-clip` CL3 les relit dans la source du clip.

| Emplacement | Budget | Ce qui le fonde |
|---|---|---|
| Titre de l'introduction | 30 caractères | la place de l'emplacement, mesurée par script dans la série ; au-delà, `M.introduction` réduit le titre |
| Phrase de l'introduction | 90 caractères | la même mesure ; la phrase tient sur une ligne, réduite au besoin à la largeur utile |
| Étape de l'introduction | 16 caractères, et 4 à 6 étapes | 6 étapes de 16 caractères tiennent à 24,4 px sur une ligne (calcul ci-dessous) |
| Légende d'un plan | 61 caractères | la plus longue légende imposée de la série, qui tenait à environ 140 px de chaque bord |
| Ligne du titre de fin | 40 caractères, 2 lignes au plus | la mesure de la série ; une troisième ligne de 88 px descendrait jusqu'au filet à y = 602 |

Le calcul des étapes : une étiquette de 34 px en chasse fixe compte environ 20,4 px par caractère,
plus 28 px de marge, et deux étiquettes sont séparées de 54 px. Six étapes de 16 caractères demandent
6 × (16 × 20,4 + 28) + 5 × 54 = 2 396 px, pour 1 720 px disponibles. L'ensemble se réduit donc d'un
facteur 0,718, et les étiquettes tombent à 34 × 0,718 = 24,4 px, juste au-dessus du plancher de 24 px.
Une septième étape, ou une étape plus longue, passerait dessous. La première proposition de la série
fixait la légende à 40 caractères ; une légende imposée de 61 caractères tenait dans l'image, et le
budget a été porté à 61.

## 4. Remettre les textes dans le clip

La remise se fait dans un tableau trié par ordre d'apparition, une ligne par emplacement qui change :
« Emplacement | Avant | Après ». Le tableau sépare les 2 lignes du titre de fin par « / » et les
étapes de l'introduction par « · ». Il n'inclut que les textes qui changent, et le storyboard du clip
le reprend dans sa section « Textes ».
