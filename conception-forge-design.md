# Conception — Forge Design

> Forge spécialisée dans le design d'applications web, de sites web et d'applications
> mobiles. Conception seule : aucun `SKILL.md` n'est écrit à ce stade.
> Date : 04/08/2026 · Pivot existant : `ameliore-le-design` v1.0.0

---

## 1. Ce que la forge est, et ce qu'elle n'est pas

**Est** : une famille de capacités de **design** — direction artistique, système de marque,
maquette navigable, critique exécutée — dans l'idiome maison (skill + oracle exécuté +
fixtures + registre).

**N'est pas** : un workflow de gestion de projet ni de construction de produit. Pas de
spécification fonctionnelle, pas de backlog, pas de découpage en lots, pas de handoff
développeur, pas de pipeline brief → production. La forge s'arrête au livrable de design.

Cette frontière est un **critère de recette**, pas une intention : toute brique qui la
franchit est refusée en revue.

---

## 2. La matière

| Source | Ce qu'elle apporte à la forge | Ce qui est refusé |
|---|---|---|
| `ameliore-le-design` (pivot) | Contrat de sortie maison : fichier unique, zéro réseau, bijection menu↔écrans, `check_maquette.py`, restitution honnête avec les `SKIP` | — |
| `impeccable` v2.1.1 (local) | Corpus de règles : 7 références (typo, couleur OKLCH, spatial, motion, interaction, responsive, ux-writing), bans absolus, AI Slop Test | Les 3 seuls modes `craft`/`teach`/`extract` — insuffisants |
| `pbakaus/impeccable` (amont) | **Le modèle d'architecture** : un dispatcher, des verbes atomiques, un **détecteur déterministe de 59 règles sans LLM**, un hook d'édition | Les 23 verbes tels quels — trop granulaires, à fondre en 4 |
| `frontend-design` (Anthropic) | Doctrine : hero = thèse, structure = information, les 3 looks IA à fuir, deux passes plan → critique → build | — |
| `ui-ux-pro-max-skill` | **Le corpus indexé** : 84 styles, 192 palettes, 74 pairings typo, 34 patterns de landing, 98 guidelines, 25 types de graphiques, recherche BM25 **hors ligne** sur CSV, `--persist` vers un `MASTER.md` | Les « 161 règles sectorielles » à reprendre en bloc — à filtrer, pas à copier |
| `motion.dev` — AI Kit | MCP hébergé : recherche docs et exemples d'animation, **génération de courbes spring CSS**, éditeur de transitions. Installé par `npx motion-ai` | MotionScore (Motion+, payant) → `non_juge`. Le CDN jsDelivr → interdit |
| `motion` (lib) | `animate()` mini **2,3 ko** → vendorable inline, version épinglée | `import ... from "https://cdn.jsdelivr.net/..."` — viole le zéro-réseau |
| `21st.dev` | Registre de 12 000+ composants React/Tailwind/shadcn — **source d'inspiration consultée en amont** | Dépendance de build : payant, quota 2 copies/jour, aucune API ni MCP documentée |
| Gemini (Nano Banana) | Génération d'images **au build**, embarquées en base64 dans le livrable | Appel réseau au runtime du livrable |
| `dataviz` (intégré) | Heuristique de forme + formule couleur avec validateur exécutable | — |
| `digit-ai-page-html` | `render_page.py` V1–V7, seul juge de rendu réel | — |
| `write-a-skill`, `write-an-oracle`, `quality-oracles`, `la-boucle`, `ameliore-un-skill`, `forge-agents` | La façon maison de construire, juger, itérer | — |

**Règle dérivée, non négociable.** Réseau autorisé **au build**, interdit **au runtime du
livrable**. Motion, images Gemini, corpus, MCP : tout est résolu avant livraison et
embarqué. Le fichier livré s'ouvre en double-clic, hors connexion, comme aujourd'hui.

---

## 3. Arbitrage des 5 briques du transcript

| # | Brique annoncée | Verdict | Raison |
|---|---|---|---|
| 1 | Multi-agent design studio | **Retenue** → `studio-de-direction` | Passe le critère `forge-agents` : parallélisable sans dépendance d'entrée **et** arbitre distinct. Bornée à 3 directions |
| 2 | Wireframe + prototype | **Fondue** dans `ameliore-le-design` | Contrat technique identique à 95 %. Devient un **niveau de fidélité** (`wireframe` / `maquette`) et un **type d'entrant** (brief sans produit existant) |
| 3 | Brand system | **Retenue** → `systeme-de-marque` | Trou réel : la charte Digit-AI est en dur par skill, la marque **client** n'existe nulle part |
| 4 | Anti-AI-slop | **Retenue, mais comme oracle** → `oracle-slop` | Doctrine `quality-oracles` : « aucun ✓ sans exécution ». Un scan de slop est déterministe, donc c'est un oracle, pas un skill |
| 5 | Open design (259 skills, 142 systems) | **Dégonflée** → `corpus-design` | Les chiffres sont du marketing. La version réelle : un corpus **résolu par test d'existence** (méthode `experts-forge`), indexé hors ligne. Le « un prompt → prototype / deck / images » est un **routeur**, pas un skill |

**Routeur, brique 5 — dispatch réel** : prototype → `ameliore-le-design` · deck →
`digit-ai-pptx` · images → génération Gemini au build. Aucune capacité maison n'est
inventée pour combler un trou : ce qui n'existe pas est déclaré.

---

## 4. Architecture

Modèle `impeccable` : **un corpus, quatre verbes, des oracles.** Pas un pipeline.

```
corpus-design/                    matière, pas skill
   ├── styles.csv  palettes.csv  pairings-typo.csv
   ├── patterns.csv  guidelines.csv
   └── recherche.py               BM25 hors ligne, déterministe

systeme-de-marque      →  MARQUE.md + tokens.css        [oracle-tokens]
studio-de-direction    →  DIRECTION.md (3 → 1)          [oracle-slop, oracle-judge]
ameliore-le-design     →  maquette.html                 [check_maquette, render_page,
   (existant, étendu)                                    oracle-slop, oracle-tokens,
                                                         oracle-mobile, oracle-a11y]
critique-le-design     →  revue.md (verdict + top 5)    [tous les oracles, exécutés]
```

Les quatre verbes sont **indépendants**. On peut critiquer sans avoir de marque, faire une
maquette sans studio. Rien n'impose de séquence — c'est ce qui distingue une forge d'un
pipeline projet.

---

## 5. Fiches de brique

### 5.1 `corpus-design` — matière partagée

| | |
|---|---|
| **Nature** | Ressource, pas skill. Aucune description de déclenchement |
| **Entrée** | Requête libre (« spa bien-être », « dashboard SRE dense ») |
| **Sortie** | Styles, palettes, pairings, patterns classés, avec leur source |
| **Frontière** | Ne décide rien. Propose de la matière ; le choix appartient aux verbes |
| **Oracle** | `oracle-corpus` — chaque entrée a une source résolue (test d'existence, statut `ok`/`todo`, méthode `experts-forge`). Une entrée `todo` ne peut pas être servie |
| **`non_juge`** | La pertinence sectorielle d'un style — jugement humain |
| **Zéro réseau** | CSV embarqués. `21st.dev` figure comme **référence consultable**, jamais comme fetch |

### 5.2 `systeme-de-marque`

| | |
|---|---|
| **Entrée** | Logo, site existant, charte PDF, ou 3 mots de ton — au moins un |
| **Sortie** | `MARQUE.md` (voix, ton, vocabulaire, anti-références) + `tokens.css` (OKLCH, échelle typo modulaire, échelle 4pt, thèmes clair et sombre) |
| **Frontière vs `digit-ai-page-html`** | Celui-ci porte la charte **Digit-AI**, en dur. Celui-là produit la charte d'un **client**, à la demande. Deux modes explicites : `client` (défaut) et `digit-ai` |
| **Frontière vs `impeccable teach`** | `teach` écrit du contexte en prose dans `.impeccable.md`. Ici on produit des **tokens exécutables**, vérifiables par script |
| **Oracle** | `oracle-tokens` — contraste AA sur les deux thèmes, aucune couleur ni police hors tokens dans les livrables aval, échelle 4pt respectée, chroma réduit aux extrêmes de luminosité |
| **`non_juge`** | L'adéquation de la voix à la marque — arbitrage commanditaire |

### 5.3 `studio-de-direction`

| | |
|---|---|
| **Entrée** | Brief + `MARQUE.md` si disponible |
| **Sortie** | `DIRECTION.md` : la direction gagnante, les 2 écartées **avec leur raison**, le relevé de rubrique |
| **Mécanique** | 3 directions **divergentes par construction** — divergence sur un axe nommé (matériau, densité, registre typographique), pas 3 variantes timides. Rubrique figée avant génération |
| **Justification `forge-agents`** | Parallélisable ✓ · arbitre distinct ✓. Deux conditions sur trois |
| **Mode dégradé** | Mono-agent via `la-boucle` en largeur (2-3 candidats, l'arbitre classe). Assumé et consigné, pas masqué |
| **Borne de coût** | 3 directions, 1 passe de jugement, 1 approfondissement. Au-delà : escalade |
| **Oracle** | `oracle-slop` sur chaque direction avant jugement (une direction slop ne concourt pas) + `oracle-judge` en **AVIS OUTILLÉ**, jamais promu en verdict |
| **`non_juge`** | Le choix final entre deux directions ex æquo — humain |

### 5.4 `ameliore-le-design` — existant, étendu

Trois extensions, aucune réécriture du noyau.

**a. Nouveau type d'entrant.** La table `references/ingestion.md` gagne une ligne :

| Entrant | Protocole | Extractible | Hors de portée |
|---|---|---|---|
| Brief sans produit existant | fiche de cadrage seule | secteur, cible, job, ton | l'existant — il n'y en a pas |

La fiche de cadrage devient alors **obligatoire et demandée**, puisque rien ne se déduit.

**b. Niveau de fidélité.** `wireframe` (structure, hiérarchie, contenu réel, zéro couleur de
marque, une seule police) ou `maquette` (défaut, actuel). Même contrat technique, même
inventaire d'écrans, même oracle. Le wireframe est un **réglage**, pas un livrable distinct.

**c. Cible mobile.** Le contrat technique gagne :

| Contrainte | Valeur |
|---|---|
| Cadre d'appareil | châssis iOS et Android, encoche, barre d'état, indicateur de home, safe areas |
| Patterns natifs | bottom sheet, tab bar, pull-to-refresh, swipe actions, retour geste |
| Cibles tactiles | ≥ 44 × 44 px, espacement ≥ 8 px |
| Orientation | portrait et paysage, les deux rendus |

**Décision assumée** : le mobile est **simulé dans le HTML mono-fichier**, pas produit en
React Native ou Flutter. Une sortie native ferait tomber le contrat « double-clic, zéro
réseau » qui est la valeur du pivot, et ferait entrer la forge dans la construction de
produit — exclue au §1.

**d. Motion et images.** Deux ajouts au contrat technique :

- **Motion** : `animate()` mini (2,3 ko) **vendoré inline**, version épinglée. L'AI Kit
  (`npx motion-ai`) sert à l'**auteur** — recherche de docs, génération de courbes spring —
  jamais au livrable. Aucun `cdn.jsdelivr.net` dans le fichier rendu : contrôlé par
  `check_maquette.py`, qui interdit déjà toute URL absolue chargée.
- **Images** : générées au build via Gemini (`.env`), optimisées, embarquées en base64.
  Plafond par image et par run dans `.env`, dérivés du plafond de 10 Mo du fichier.

### 5.5 `critique-le-design`

| | |
|---|---|
| **Entrée** | Un livrable de design : HTML, capture, URL, ou maquette produite par la forge |
| **Sortie** | `revue.md` — verdict en trois niveaux (Livrer / Renforcer / Refondre), constats à preuve typée, **top 5 corrections avant/après en impact × effort** |
| **Mécanique** | Tous les oracles **exécutés**, puis lecture des relevés. Jamais un jugement sur lecture de code |
| **Frontière vs `contre-expertise`** | Celui-ci challenge la **pertinence d'une solution**. Celui-là juge la **qualité d'exécution d'un design**. Corpus et grille différents |
| **Frontière vs `quality-oracles`** | Celui-ci est la **loi** et le registre. Celui-là est le **verbe métier** qui l'applique au design et produit la grammaire de restitution |
| **Frontière vs `ameliore-un-skill`** | Même grammaire de restitution (grille notée, red flags, verdict 3 niveaux, top 5). Objet différent : un design, pas un skill |
| **`non_juge`** | La généricité de la direction — `oracle-slop` attrape les motifs, pas l'ennui |

---

## 6. Les oracles neufs

Trois à créer, au standard §3 de `quality-oracles` : déterministe, checklist versionnée,
artefact réel, PASS/FAIL localisant, `non_juge` déclaré, sortie JSON, exit 0/1/2. Chacun
avec fixture verte et fixture rouge, et entrée au `registre-oracles`.

### `oracle-slop.mjs`
Détection déterministe des marqueurs de design généré. Base : les 59 règles amont
d'`impeccable`, filtrées et complétées des bans maison.

| # | Règle | Détection |
|---|---|---|
| S1 | Bandeau latéral coloré | `border-left`/`border-right` > 1px sur carte, alerte, encart |
| S2 | Texte en dégradé | `background-clip: text` + `linear/radial/conic-gradient` |
| S3 | Polices réflexes | les 22 familles de `reflex_fonts_to_reject` d'`impeccable` |
| S4 | Noir et blanc purs | `#000`, `#fff`, `rgb(0,0,0)`, `rgb(255,255,255)` |
| S5 | Palette IA | dégradé violet→bleu, cyan sur fond sombre, néon sur noir |
| S6 | Emojis en production | emoji dans le HTML rendu hors contenu utilisateur |
| S7 | Grille de cartes clonée | ≥ 3 cartes de structure identique icône + titre + texte |
| S8 | Easing daté | `bounce`, `elastic`, `cubic-bezier` à dépassement |
| S9 | Rayon uniforme + ombre générique | même `border-radius` partout + `box-shadow` non tinté |
| S10 | Sparkline décoratif | mini-graphique sans axe, sans légende, sans donnée réelle |

`non_juge` : la généricité de la **direction** (les 3 looks IA de `frontend-design` : crème
+ serif + terracotta · noir + accent acide · broadsheet à filets). Détectable par indices,
jamais par certitude → **avertissement**, jamais verdict bloquant.

### `oracle-tokens.mjs`
Toute couleur, police, espacement et rayon du livrable est **tracé à un token déclaré** de
`tokens.css`. Contraste AA mesuré sur les deux thèmes. Échelle 4pt. Chroma réduit aux
extrêmes de luminosité. Une valeur en dur non tracée = FAIL localisant.

### `oracle-mobile.mjs`
Cibles tactiles ≥ 44 px · `safe-area-inset` utilisé · `viewport` correct, sans
`user-scalable=no` · reflow des tables en cartes sous 768 px · orientation paysage rendue ·
`prefers-reduced-motion` respecté. Complète `render_page.py` sur les breakpoints mobiles.

### `oracle-images.mjs` — quatrième, induit par Gemini
Chaque image générée porte un `alt` non vide · poids ≤ `IMAGES_MAX_KO` · aucune image
présentée comme photographie réelle sans mention · le total respecte le plafond de 10 Mo ·
le manifeste de génération (prompt, modèle, date) existe et est joint à la restitution.

**Règle dure induite.** La règle « aucune donnée inventée non signalée » du pivot s'étend
aux visuels : toute image générée est déclarée comme telle dans la note de partis pris.
Aucun visage, lieu ou logo réel n'est fabriqué et présenté comme authentique.

---

## 7. Couverture des quatre cibles

| Cible | Couverte par | Ce qui change |
|---|---|---|
| Application web | pivot, actuel | rien |
| Site web | pivot + `corpus-design` (34 patterns de landing) | inventaire d'écrans allégé : landing, contenu, contact, légal |
| Application mobile | pivot + cadre d'appareil + `oracle-mobile` | châssis, patterns natifs, cibles tactiles, deux orientations |
| Site mobile | pivot, breakpoint 390 px | déjà au contrat technique ; `oracle-mobile` le rend exécuté au lieu de déclaré |

---

## 8. Ce que la forge ne fait pas

Frontières dures, vérifiées en recette :

- Pas de spécification fonctionnelle, de backlog, de découpage en lots, de planning.
- Pas de guide de passation développeur ni de correspondance composant → brique technique.
  *(À retirer de `references/criteres-sortie.md` du pivot, §Restitution point 4 — c'est le
  seul endroit où le pivot déborde sur la construction de produit.)*
- Pas de code de production : la maquette est un livrable de conviction, pas un socle.
- Pas de génération d'images au runtime du livrable.
- Pas de dépendance à un service payant ou à quota pour produire un livrable.

---

## 9. Plan de construction, ordonné par dépendance

| # | Étape | Dépend de | Critère de fin |
|---|---|---|---|
| 1 | `oracle-slop` + fixtures verte/rouge | — | Fixture rouge FAIL sur les 10 règles, verte PASS. Entrée au registre |
| 2 | `oracle-tokens`, `oracle-mobile`, `oracle-images` + fixtures | 1 (gabarit) | Idem, chacun |
| 3 | `corpus-design` : CSV + `recherche.py` | — | Toute entrée a une source résolue ; `oracle-corpus` PASS |
| 4 | `systeme-de-marque` | 2, 3 | Runner `write-a-skill` 6/6 ; produit `tokens.css` qui passe `oracle-tokens` |
| 5 | Extension du pivot (entrant brief, fidélité, mobile, motion, images) | 2, 4 | Non-régression : les fixtures actuelles du pivot passent toujours |
| 6 | `studio-de-direction` | 3, 4 | 3 directions distinctes sur un axe nommé ; rubrique figée antérieure |
| 7 | `critique-le-design` | 1, 2 | Verdict reproductible sur une fixture connue |
| 8 | Passage `ameliore-un-skill` sur les 4 skills | 4-7 | Aucun red flag bloquant |

Les étapes 1-3 sont **parallélisables**. L'ordre 4 → 5 → 6 → 7 est contraint.

---

## 10. Relevé d'arbitre

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| 1 | Les 5 briques du transcript tranchées avec raison | ✓ | §3, table d'arbitrage : 3 retenues, 1 fondue, 1 dégonflée |
| 2 | Frontière écrite par brique vs l'existant | ✓ | §5, ligne « Frontière vs … » sur chaque fiche |
| 3 | Oracle exécutable nommé + `non_juge` déclaré | ✓ | §5 et §6 ; 4 oracles neufs spécifiés règle par règle |
| 4 | Parcours et artefacts nommés aux frontières | ✓ | §4 : `MARQUE.md`, `tokens.css`, `DIRECTION.md`, `maquette.html`, `revue.md` |
| 5 | Les 4 cibles couvertes | ✓ | §7 |
| 6 | Aucun débordement sur la gestion de projet | ✓ | §8, dont le retrait du guide de passation du pivot |
| 7 | Descriptions au standard `write-a-skill` | ✓ | **Clos le 04/08/2026** — les 4 skills passent `skill_audit_baseline.py` : description, structure, checklist 6/6, intégrité des liens. Verdict PASS sur chacun |
| 8 | Plan ordonné par dépendance, critère de fin par étape | ✓ | §9 |
| 9 | Aucune dépendance réseau au runtime du livrable | ✓ | §2 règle dérivée · §5.4d Motion vendoré · §6 images en base64 · `21st.dev` écarté du build |

**9 critères sur 9.** Le ✗ du critère 7, structurel au moment de la conception, a été
clos par l'exécution du plan §9 : les quatre skills existent, packagés dans `dist/`.

---

## 11. Risques et points ouverts

1. **`impeccable` local amputé.** La version installée (v2.1.1) n'a que 3 modes sur les 23
   du dépôt amont, et pas le détecteur 59 règles. Deux options : mettre à jour depuis
   l'amont et n'écrire `oracle-slop` que pour le delta maison, ou l'écrire entièrement et
   assumer la redondance. **À trancher avant l'étape 1.**
2. **Chevauchement `critique-le-design` / `impeccable audit`+`critique`.** Si l'amont est
   installé, la frontière se réduit à la grammaire de restitution maison. Défendable, mais
   plus mince que présentée ici.
3. **Coût du studio.** 3 directions × maquette complète est lourd. Le studio doit diverger
   sur la **direction** (tokens + un écran signature), pas sur la maquette entière.
4. **AI Kit Motion.** MCP hébergé, connexion requise, MotionScore réservé à Motion+.
   Utile à l'auteur, jamais opposable en oracle → `non_juge`.
5. **Modèles Gemini.** `gemini-3.1-flash-image` au 04/08/2026 ; les modèles Imagen s'arrêtent
   le **17/08/2026**. Le modèle est en variable d'environnement, pas en dur, précisément
   pour absorber ces rotations.
