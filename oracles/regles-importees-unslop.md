# Règles importées du skill tiers « unslop »

> **Mandat** : essai court choisi par le porteur le 09/11/2026, suite du tri des favoris TikTok du
> pilot (`output\03-etudes\Digit-AI - Étude - Tri des sujets Claude et IA des favoris TikTok - 20261109a.md`,
> ligne `unslop`, verdict « Essai court »). Voie taste-skill : rien n'est installé, seules les règles
> statiques sans fausse alerte mesurée entrent, en avertissement, avec attribution.

## Attribution

| | |
|---|---|
| **Œuvre** | « unslop », skill de Damir Sokolovsky (@heydamir) |
| **Localisateur** | https://github.com/heydamir/unslop |
| **Texte lu** | `skills/unslop/SKILL.md` et `skills/unslop/references/signs.md`, commit `97daa3e` du 08/11/2026 |
| **Licence** | **CC BY 4.0**, https://creativecommons.org/licenses/by/4.0/ ; l'amont demande de garder le crédit dans toute copie ou adaptation |
| **Consulté le** | **2026-11-09** |
| **Adaptation** | Deux signes de la section « Surfaces and color » de `signs.md` sont réécrits en règles statiques ; les seuils (flou de 12px et de 20px, saturation de 45 %) sont posés par la forge, pas par l'amont |
| **Régime** | Le dépôt amont est une **DONNÉE** : lu et cité, jamais installé ni exécuté. Ses scripts (`snapshot.mjs`, `story.mjs`) n'ont pas été lancés |

Les règles sont figées à la date de consultation ; l'amont n'est pas suivi automatiquement.

## Table de disposition

La description du skill nomme 9 signes. 4 étaient déjà couverts au 09/11/2026, 2 entrent, 3 sont écartés.

| Signe amont | Couvert ou mécanisable ? | Atterrit |
|---|---|---|
| « purple gradients » | déjà couvert | `oracle-slop` **S5** |
| « gradient text » | déjà couvert | `oracle-slop` **S2** |
| « emoji labels » | déjà couvert | `oracle-slop` **S6** |
| « "New ✨" badges » | déjà couvert par l'emoji | `oracle-slop` **S6** |
| « Colored glows, like `shadow-[0_0_20px_rgba(139,92,246,0.5)]`, `drop-shadow` on emoji or glowing pills » | **oui** : ombre sans décalage, flou de 12px au moins, couleur saturée | `oracle-slop` **S11**, *avertissement* |
| « Radial color washes or blurred blobs behind content » | **en partie** : la forme floutée par `filter: blur()` de 20px au moins ou `blur-xl` à `blur-3xl` ; le lavis radial n'est pas mécanisé | `oracle-slop` **S12**, *avertissement* |
| « Uppercase labels with wide tracking » | écarté | voir ci-dessous |
| « `animate-pulse`, `animate-ping` or breathing glows on things that are not live » | écarté | voir ci-dessous |
| « Arbitrary values, like `mt-[13px]` » | déjà couvert pour le CSS | `oracle-tokens` **T3**, échelle 4pt |

Preuves : fixtures `fixtures/slop-s11-rouge.html` et `slop-s11-verte.html`, `slop-s12-rouge.html` et
`slop-s12-verte.html`, verrouillées par le bloc « oracle-slop S11 et S12 (essai unslop du 09/11/2026) »
de `self-test.mjs` : chaque rouge reste PASS avec sa seule règle en avertissement, chaque verte est muette.

## Mesure sur le parc, le 09/11/2026

Corpus : 3 379 fichiers HTML de `C:\dev`, hors dépendances, fixtures, copies de travail, sauvegardes et
canal confidentiel ; 2 799 pages après retrait des doublons exacts. Lecture seule.

| Règle | Constats | Lecture |
|---|---|---|
| S11 halo coloré | 0 | aucune ombre sans décalage et colorée dans le parc ; 7 ombres de ce gabarit, toutes noires. Règle préventive |
| S12 forme floue | 13 | tous vrais : 1 fond de section à `blur(64px)` dans une page tierce reçue en entrée, et 12 pages compilées d'un même produit, où deux cercles colorés en position absolue portent `blur-3xl` |

## Signes écartés

**Capitales espacées.** Le détecteur candidat (`text-transform: uppercase` et `letter-spacing` de 0,05em
ou 1px au moins) accuse 925 pages de 42 projets. Le socle `digit-ai-page-html` prescrit lui-même un
sur-titre en capitales (`.eyebrow`, `letter-spacing: .04em`, `assets/boilerplate.html`). Une règle qui
contredit le socle qu'elle juge rejoue le cas de S3 avec DM Sans : elle ne se corrige par personne.
Trancher entre la charte et ce signe relève de `systeme-de-marque`, pas d'un oracle.

**Pulsation.** Le détecteur candidat (animation infinie dont les images clés font varier l'opacité ou
l'échelle) accuse 266 pages, et les 7 motifs distincts sont légitimes : squelettes de chargement
(256 pages), indicateurs de chargement (6), voyant « en direct » (2), curseur clignotant (2). L'amont
vise les éléments « that are not live » ; qu'un élément soit vivant ne se lit pas sur le fichier.

**Valeurs arbitraires.** `oracle-tokens` T3 exige déjà des espacements multiples de 4px ; un doublon dans
`oracle-slop` ferait deux constats pour un défaut. Les classes Tailwind à valeur entre crochets restent
hors de T3, sans mesure à ce jour.
