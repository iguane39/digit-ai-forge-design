---
name: clip-de-presentation
description: Produit un clip de présentation en motion design d'environ 60 s — Canvas 2D animé en continu, musique composée en code, rendu image par image en MP4 1920×1080 à 30 i/s — à partir d'un sujet, de sources et du dossier de marque du produit. Introduction et carte de fin portent le logo, le nom et le lien de la marque ; les légendes suivent un récit client à budgets de caractères ; chaque affirmation est sourcée, chaque chiffre de décor étiqueté « exemple » ; le clip est jugé par oracle-clip (ffprobe, planches, budgets, étiquettes de 24 px, marque en paramètre). Use when / déclencher dès que l'utilisateur demande une vidéo de présentation, un clip, une animation ou une vidéo de lancement d'un produit, du motion design, une série de clips au même style, ou la reprise des textes d'un clip en récit client. Ne pas déclencher pour analyser ou résumer une vidéo existante (→ regarde-une-video), pour des diapositives, même animées (→ digit-ai-pptx), ni pour une maquette d'interface navigable (→ ameliore-le-design).
version: 1.0.0
---

# Clip de présentation

Produit un clip de motion design d'environ 60 s, plus 6 s d'introduction, qui présente un produit à
un décideur : `clip.html` (le code de l'animation), `STORYBOARD.md` (plans, preuves, textes),
des planches de contrôle et le MP4. Ce pipeline a rendu 28 clips chez un produit les 09 et
10/11/2026 ; ce skill en verse le code, la méthode et les contrôles (TF-2405). Les vidéos restent
chez le produit qui les commande, jamais dans un dépôt de forge.

## Ce que ce skill apporte en propre

Identité de la marque, jetons et logo → `systeme-de-marque` : le clip consomme son dossier, il ne le crée pas.
Lecture d'une vidéo existante → `regarde-une-video`.
Message, ordre et dosage d'une prise de parole → `digit-ai-communication`.

Reste en propre : la bibliothèque d'animation déterministe (`scripts/motion.js`), le rendu MP4 et les
planches (`scripts/rendre.py`), la musique en code (`scripts/musique.py`), la bible, la méthode des
textes en récit client, et le jugement par `oracle-clip`.

## Quick start

```
0. Marque     → dossier de systeme-de-marque du produit : tokens.css (thème sombre) et logo pour fond sombre
                sans dossier de marque, rendre la main : un clip sans marque n'a rien à présenter
1. Lire       → references/bible.md en entier ; references/consigne-agents.md si des agents construisent
2. Preuves    → table de preuves de gabarits/STORYBOARD.md : chaque affirmation sourcée, chaque chiffre daté
3. Textes     → references/textes-recit-client.md : récit client, budgets de caractères
4. Storyboard → gabarits/STORYBOARD.md : un plan, une métaphore ; les impacts de la musique
5. Musique    → python scripts/musique.py --sortie <clip>/musique.wav --duree 66 --impacts 2,<impacts + 6> …
6. Construire → scripts/motion.js copié en <série>/outils/motion.js ; gabarits/clip.html copié en <clip>/clip.html
                entrée et sortie : references/entree-et-sortie.md
7. Contrôler  → python scripts/rendre.py <clip>/clip.html --planche <clip>/planche-1.jpg --instants <16 instants ou plus>
                trois planches au moins, lues comme un spectateur, introduction comprise
8. Rendre     → python scripts/rendre.py <clip>/clip.html --sortie <MP4 chez le produit> --musique <clip>/musique.wav
9. Juger      → node oracles/oracle-clip.mjs <clip> --mp4 <MP4>, depuis la racine de forge-design
10. Restituer → le MP4, le storyboard, les planches, le verdict d'oracle-clip tel quel, non_juge compris
```

Dépendances : Node, Python avec Playwright (Chromium installé), `static_ffmpeg`, Pillow et numpy.
Aucune API payante. Le rendu prend environ 100 ms par image sur un poste avec carte graphique, soit 3 à
5 minutes pour 66 s.

## Règles dures

**La marque est un paramètre, jamais une constante.** Le logo, le nom et le lien viennent de la
déclaration `<script type="application/json" id="marque">` de la page ; les couleurs et les polices,
des jetons de `tokens.css`. `M.introduction` et `M.carteFin` les posent. Un logo, un nom ou une adresse
écrits dans le script sont refusés par `oracle-clip` CL6.

**Une étiquette fait 24 px au moins.** C'est le défaut de `M.puce`. Une taille plus petite écrite dans
la source est refusée par CL4. Un zoom de caméra qui rapetisse une étiquette ne se lit que sur la planche.

**Aucune affirmation sans preuve, aucun chiffre nu.** Un chiffre montré comme fait se mesure le jour
même et s'affiche avec sa date ; un chiffre de décor porte l'étiquette « exemple ». CL5 refuse un
chiffre de la source qui n'est ni attesté par la table de preuves, ni accompagné de cette étiquette.

**Les textes tiennent leurs budgets.** Titre de l'introduction 30 caractères, phrase 90, étape 16
(6 étapes au plus), légende 61, ligne du titre de fin 40 sur 2 lignes au plus. CL3 les relit.

**Le rendu est déterministe.** `window.rendre(t)` ne lit ni l'horloge ni le hasard ; l'aléa passe par
`M.alea(graine)`. CL7 le vérifie, parce qu'un rendu image par image et sa planche doivent montrer la
même image au même instant.

**Aucun ✓ sans exécution.** `oracle-clip` tourne sur le dossier du clip et son MP4 avant toute
restitution. Sans `ffprobe`, la règle du MP4 rend SKIP motivé et le verdict ne peut pas être PASS.

## Références

| Fichier | À lire quand |
|---|---|
| `references/bible.md` | avant la première ligne : format, contrat de rendu, couleurs, mouvement, musique, vérité |
| `references/consigne-agents.md` | quand des agents construisent les clips d'une série |
| `references/entree-et-sortie.md` | pour l'introduction, la carte de fin et la déclaration de marque |
| `references/textes-recit-client.md` | pour écrire ou reprendre les textes, et tenir leurs budgets |
| `gabarits/STORYBOARD.md` | au début de chaque clip : plans, preuves, chiffres montrés, textes, contrôles |
| `gabarits/clip.html` | pour construire la page du clip |
| `scripts/motion.js` | la bibliothèque `M.*`, copiée dans la série |
| `scripts/rendre.py` | pour les planches et le MP4 |
| `scripts/musique.py` | pour la musique, avant l'animation |
| `scripts/self-test.mjs` | après toute modification de la bibliothèque ou des scripts |

## Pièges connus

- **La diapositive animée.** Un texte qui apparaît sur un fond fixe n'est pas un clip : l'image bouge
  en continu et chaque plan porte une métaphore. C'est le refus qui a fondé la série.
- **Les polices que le canvas ne charge pas.** Sans `window.PRET`, la première image part en police de
  repli. `M.pret()` charge les polices de la marque et le logo.
- **La musique décalée.** L'introduction ajoute 6 s : chaque impact du storyboard se compose plus 6 s,
  et un impact à 2 s porte le titre de l'introduction.
- **La planche lue comme un fichier.** Elle se lit comme un spectateur : texte coupé, chevauchement,
  plan vide, étiquette devenue minuscule sous le zoom.
- **Le chiffre de décor pris pour un fait.** « 10 000 lignes en moins de 5 s » sur une face de bloc est
  lu comme une promesse : l'étiquette « exemple » doit être à l'écran.
