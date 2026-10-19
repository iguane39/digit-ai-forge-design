# Entrées à remonter au registre des oracles

> Règle §4 de `quality-oracles` : tout domaine sans oracle reçoit un oracle, **remonté**
> au registre. Ces quatre entrées sont prêtes à injecter dans
> `~/.claude/skills/quality-oracles/references/registre-oracles.md` et son pendant JSON.
>
> **INJECTÉES le 04/08/2026**, sur décision explicite. Registre global passé en
> v2.7.0 : 34 → 39 oracles. Sauvegardes conservées à côté des originaux
> (`registre-oracles.{json,md}.avant-forge-design`).
>
> Deux choix faits à l'injection, à connaître :
> 1. **Chemins absolus** vers `c:/dev/digit-ai-forge-design/oracles/` — ces oracles
>    ne sont pas empaquetés dans un skill, la convention `{skilldir}` ne s'applique
>    pas. Déplacer le dépôt casse l'invocation.
> 2. **Déclenchement par contenu, pas par extension.** `ext` est vide,
>    `content_patterns` exige le bandeau « Données de démonstration ». Sans ce
>    garde-fou, `oracle-slop` S4 ferait échouer **chaque page chartée Digit-AI**,
>    dont le boilerplate utilise `#FFFFFF`.

## Lignes du tableau (vue humaine)

Ce chapitre donne les cinq entrées du 04/08/2026 dans la forme lisible du registre
global — la même information que les entrées JSON qui suivent, sans la syntaxe. Il se
lit ligne à ligne : la colonne « Oracle » porte l'invocation exacte et l'énoncé de
chaque règle, la colonne « Statut » dit si l'entrée est injectée. Les oracles nés
après cette date vivent dans les chapitres datés du bas de ce fichier, pas ici.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Design généré : marqueurs de slop | `oracles/oracle-slop.mjs <page.html>` — S1 bandeau latéral > 1px, S2 texte en dégradé, S3 polices réflexes, S4 noir/blanc purs, S5 palette IA (violet→bleu, néon sur sombre), S6 emojis en production, S7 grille de cartes clonée, S8 easing à dépassement, S9 rayon uniforme + ombre non teintée, S10 sparkline décoratif | cli | ✅ |
| Système de marque : traçabilité des tokens | `oracles/oracle-tokens.mjs <page.html> [--tokens tokens.css]` — T1 couleur en dur, T2 police en dur, T3 échelle 4pt, T4 parité clair/sombre, T5 contraste ≥ 4.5:1 sur paires résolvables, T6 chroma aux extrêmes (OKLCH) | cli | ✅ |
| Cible mobile : contrat d'usage tactile | `oracles/oracle-mobile.mjs <page.html>` — M1 viewport et zoom, M2 cibles ≥ 44 px, M3 safe-area-inset, M4 reflow des tables sous 768 px, M5 orientation paysage, M6 prefers-reduced-motion | cli | ✅ |
| Visuels générés : traçabilité et budget | `oracles/oracle-images.mjs <page.html> [--env .env]` — I1 alt utile, I2 plafond unitaire, I3 plafond global 10 Mo, I4 zéro image réseau, I5 manifeste de génération, I6 complétude prompt/modèle/date, I7 deux actifs déclarés variantes rendent différemment (empreintes identiques, ou encres identiques à empreintes différentes) | cli | ✅ |
| Page générée : discipline d'accent, de filets et de système | `oracles/oracle-taste.mjs <page.html>` — TA1 familles d'accent (avertissement), TA2 saturation d'accent (avertissement), TA3 filet haut ET bas sur chaque ligne, TA4 systèmes de design cohabitants | cli | ✅ |

## Entrées JSON

```json
[
  {
    "domaine": "Design généré : marqueurs de slop",
    "oracle": "oracles/oracle-slop.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": { "verte": "oracles/fixtures/slop-verte.html", "rouge": "oracles/fixtures/slop-rouge.html" },
    "provenance": { "chantier": "forge-design", "date": "2026-08-04" },
    "regles": 10
  },
  {
    "domaine": "Système de marque : traçabilité des tokens",
    "oracle": "oracles/oracle-tokens.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html", ".css"],
    "fixtures": { "verte": "oracles/fixtures/tokens-verte.html", "rouge": "oracles/fixtures/tokens-rouge.html" },
    "provenance": { "chantier": "forge-design", "date": "2026-08-04" },
    "regles": 6
  },
  {
    "domaine": "Cible mobile : contrat d'usage tactile",
    "oracle": "oracles/oracle-mobile.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": { "verte": "oracles/fixtures/mobile-verte.html", "rouge": "oracles/fixtures/mobile-rouge.html" },
    "provenance": { "chantier": "forge-design", "date": "2026-08-04" },
    "regles": 6
  },
  {
    "domaine": "Visuels générés : traçabilité et budget",
    "oracle": "oracles/oracle-images.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": { "verte": "oracles/fixtures/images-verte.html", "rouge": "oracles/fixtures/images-rouge.html" },
    "provenance": { "chantier": "forge-design", "date": "2026-08-04", "mandat": "TF-1074, 2026-09-16 : I7 ajoutée, fixtures images-variantes-{verte,rouge}.html" },
    "regles": 7
  },
  {
    "domaine": "Page générée : discipline d'accent, de filets et de système",
    "oracle": "oracles/oracle-taste.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": { "verte": "oracles/fixtures/taste-verte.html", "rouge": "oracles/fixtures/taste-rouge.html" },
    "provenance": {
      "chantier": "forge-design",
      "date": "2026-08-14",
      "mandat": "TF-0199",
      "amont": "taste-skill (Leonxlnx) — https://github.com/Leonxlnx/taste-skill — licence MIT à la racine du dépôt, aucune licence déclarée dans le SKILL.md — consulté le 2026-08-14",
      "note": "règles extraites et attribuées ; assets distants et pile imposée ÉCARTÉS — voir oracles/regles-importees-taste-skill.md"
    },
    "regles": 4
  }
]
```

## Justification des oracles maison (règle R3 — standards avant maison)

Le détecteur amont `npx impeccable detect` (59 règles) couvre une partie du domaine S.
Il n'est **pas** retenu comme oracle de la forge pour trois raisons :

1. **Pas de contrat de sortie exploitable** — il ne produit ni JSON normalisé, ni exit
   0/1/2, ni déclaration de `non_juge`. Le standard §3 de `quality-oracles` l'exige.
2. **Pas de fixtures maison** — un oracle sans fixture rouge versionnée n'est pas
   vérifiable en non-régression.
3. **Dépendance npm dans la chaîne de qualité** — les oracles de la forge tournent avec
   Node seul, comme `oracle-secrets.mjs`.

Il reste **utile en complément** à l'auteur, et son absence n'est pas signalée comme un
manque : les règles S1–S10 sont autoportantes.

## Ce que ces oracles ne jugent PAS

- **Rendu réel** : débordements, chevauchements, contraste mesuré après cascade,
  navigation clavier → `render_page.py` V1–V7 (`digit-ai-page-html`), sur les deux thèmes.
- **Généricité de la direction artistique** — les trois looks IA (crème + serif +
  terracotta · noir + accent acide · broadsheet à filets) sont détectables par indices,
  jamais par certitude. Jugement humain, déclaré en `non_juge` par `oracle-slop`.
- **Ce que montre une image** — ressemblance à une personne, un lieu ou une marque
  réelle. Revue humaine obligatoire, déclarée par `oracle-images`.
- **Gestes tactiles réels** et **taille effective après cascade** — parcours à exécuter,
  déclarés par `oracle-mobile`.

## Entrée du 15/08/2026 — oracle-restitution (TF-0235)

**INJECTÉE le 15/08/2026** (mandat « committe et implémente tout »), registre global
v2.10.0 → v2.11.0, sauvegardes `registre-oracles.{json,md}.avant-restitution`.
Déclenchement par contenu : `content_patterns = ["data-restitution"]` — et l'oracle
lui-même rend SKIP motivé sans cette déclaration, jamais un verdict par défaut.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Restitution lisible : la page se conçoit pour ses lecteurs | `oracles/oracle-restitution.mjs <page.html>` — RL-1 vue d'ensemble, RL-3 KPI complets, RL-4 question des graphiques, RL-9 chemins de lecteurs, RL-10 manifeste d'écarts (référentiel : `REFERENTIEL-RESTITUTION.md`) | cli | ✅ |
## Entrée du 18/08/2026 — oracle-motion (TF-0321, reste soldé par TF-0335)

**Ce fichier ne la portait pas.** `oracle-motion.mjs` vit dans ce dépôt depuis le 16/08,
il est joué par `self-test.mjs` et par `run-oracles-design.mjs`, et il est bien présent au
registre global installé — mais le registre du DÉPÔT, celui qui survit à un poste, l'ignorait.
C'est la maladie de TF-0290 exactement : l'objet n'existait que dans sa copie installée.

**Écart à corriger à la prochaine injection** : le registre global installé décrit
« R1 … R7 » pour cet oracle. Il en porte **dix** depuis TF-0321 — R8, R9 et R10 sont nées de
la campagne du 16/08 et l'entrée installée n'a pas suivi. La ligne ci-dessous est la ligne à
jour ; l'injection dans `~/.claude/skills/quality-oracles/references/registre-oracles.{md,json}`
reste un geste de poste, à faire par un humain ou par un mandat qui le nomme — écrire dans une
copie installée depuis ici recréerait la divergence qu'on solde.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Mouvement : craft de l'animation, PRESCRIT et jugé | `node c:/dev/digit-ai-forge-design/oracles/oracle-motion.mjs <page.html>` — R1 `transition: all`, R2 entrée en `scale(0)`, R3 `ease-in` sur de l'UI, R4 durée > 300 ms sans justification déclarée, R5 `transform-origin: center` sur élément ancré, R6 propriété de layout animée, R7 survol animé sans `@media (hover: hover) and (pointer: fine)`, **R8 durée en dur alors que la feuille prescrit des tokens**, **R9 token de mouvement hors barème (plafond 300 ms)**, **R10 révocation `prefers-reduced-motion: reduce` absente ou sans effet (WCAG 2.2 SC 2.3.3)** ; dérivé de `review-animations` (Emil Kowalski, MIT) | cli | ✅ |

```json
  {
    "domaine": "Mouvement : craft de l'animation, PRESCRIT et jugé",
    "oracle": "oracles/oracle-motion.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html", ".css"],
    "fixtures": {
      "verte": "oracles/fixtures/motion-verte.html",
      "rouge": "oracles/fixtures/motion-rouge.html",
      "rouge_revocation": "oracles/fixtures/motion-revocation-rouge.html"
    },
    "provenance": {
      "chantier": "forge-design",
      "date": "2026-08-16",
      "mandat": "TF-0321",
      "amont": "review-animations (Emil Kowalski) — licence MIT"
    },
    "regles": 10
  }
```

### L'arbitrage d'autorité, formalisé (le reste que TF-0335 nommait)

Deux oracles de mouvement ont existé en intention : celui-ci, et un `oracle-motion` M1-M8
**proposé côté socle** le 16/08. Une même règle jugée par deux autorités est une garantie de
divergence — c'est le patron de défaut que le pilot solde partout ailleurs (double source).

**L'arbitrage est rendu, et il est adossé à un fait, pas à une préférence : depuis TF-0321,
forge-design PRESCRIT le mouvement autant qu'elle le juge.** Les tokens `--dur-*` / `--ease-*`
naissent de `systeme-de-marque`, le plafond de 300 ms vit en un seul endroit
(`PLAFOND_MS` d'`oracle-motion.mjs`, valeur de `--dur-plafond`), `DESIGN.md` porte sa section
Mouvement, et R8/R9 confrontent la feuille à ce que la marque a prescrit. Juger le mouvement
depuis le socle reviendrait à opposer une règle à une prescription qu'il ne connaît pas.

> **Le mouvement — prescription ET jugement — appartient à forge-design.**
> Le second `oracle-motion` M1-M8 proposé côté socle **n'a plus d'objet** : ses règles sont
> couvertes par R1-R10, à l'exception de ce que R4/R9 rendent inutile (un barème sans
> prescription). Aucun oracle de mouvement ne se crée ailleurs sans retirer celui-ci d'abord.

## Entrée du 02/09/2026 — oracle-saisie et oracle-panneau-tache (TF-0736, TF-0739, TF-0707, TF-0708)

Deux domaines qui n'existaient nulle part, révélés par trois retours utilisateur en deux
semaines sur des écrans **livrés et audités** (lots Produit-12). La campagne de tests les
mesurait câblés — interface 233/235 — et ils l'étaient : l'affordance existait. Ce qui
manquait n'était mesuré par aucun oracle du registre — la **valeur** proposée, la **borne**,
la **surface utile** du geste, et l'**ordre** dans lequel un choix exclusif est posé.

Déclenchement **par contenu**, jamais par extension : `oracle-saisie` sur la présence de
`<input>`, `<textarea>` ou `<select>` ; `oracle-panneau-tache` sur `data-panneau-tache` ou
`data-branche`. Hors de ces marqueurs, `run-oracles-design.mjs` les déclare `SANS OBJET` avec
leur raison — jamais un `PASS` par défaut.

Comme pour `oracle-motion` (TF-0321), l'injection dans
`~/.claude/skills/quality-oracles/references/registre-oracles.{md,json}` reste **un geste de
poste**, à faire par un humain ou par un mandat qui le nomme : écrire ici dans une copie
installée recréerait la divergence que TF-0290 a soldée. Les lignes ci-dessous sont prêtes.

**Ajout du 24/09/2026 — SA7 (TF-1343).** `oracle-saisie` jugeait la présence d'un `pattern`
(aucune règle ne l'exigeait), jamais sa compilation. Mesuré le 23/09/2026 sur un champ
« Suffixe du coffre » d'une page livrée : `pattern="[A-Za-z0-9]+(\-[A-Za-z0-9]+)*"` — le `\-`
hors d'une classe de caractères est refusé par la grammaire du drapeau `v`, celui que le
navigateur applique réellement pour juger `validity.valid`. Dans Chromium, la console signale
la `SyntaxError` mais `validity.valid` reste vrai : le champ accepte tout, silencieusement.
SA7 compile chaque `pattern` par `new RegExp('^(?:'+p+')$', 'v')`, sans échappatoire — un motif
cassé n'est jamais une intention. Dépend du support du drapeau `v` par le Node du poste
(≥ 20, ECMAScript 2024) : mesuré au lancement de l'oracle, jamais supposé ; sur un poste plus
ancien, SA7 se déclare `non_juge` au lieu de rendre un faux verdict.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Champs de saisie : typé, proposé, borné, atteignable | `node c:/dev/digit-ai-forge-design/oracles/oracle-saisie.mjs <page.html>` — SA1 format connu non typé natif, SA2 champ temporel sans valeur proposée, SA3 champ temporel ou numérique sans borne, SA4 promesse d'aide (valeur ou borne) non câblée dans le champ, SA5 cible de geste réduite à l'icône native (aucun `showPicker()` global), SA6 saisie clavier confisquée (`readonly` posé pour forcer le sélecteur, ou `preventDefault` sur `keydown`), SA7 attribut `pattern` qui ne compile pas sous le drapeau `v` (celui que le navigateur applique réellement — un motif cassé est ignoré en silence, `validity.valid` reste vrai) | cli | ✅ |
| Écran de création : choix exclusif, branches, coexistence | `node c:/dev/digit-ai-forge-design/oracles/oracle-panneau-tache.mjs <page.html>` — PA1 branches exclusives sans sélecteur qui les commande, PA2 sélecteur placé après les champs qu'il gouverne, PA3 plusieurs branches rendues simultanément, PA4 même renseignement demandé deux fois, PA5 tâche à branches en formulaire replié coexistant avec sa liste, PA6 panneau adressable dont la route n'est pointée par rien | cli | ✅ |

```json
[
  {
    "domaine": "Champs de saisie : typé, proposé, borné, atteignable",
    "oracle": "oracles/oracle-saisie.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "content_patterns": ["<input", "<textarea", "<select"],
    "fixtures": {
      "verte": "oracles/fixtures/saisie-verte.html",
      "rouge": "oracles/fixtures/saisie-rouge.html",
      "verte_sa7": "oracles/fixtures/saisie-sa7-verte.html",
      "rouge_sa7": "oracles/fixtures/saisie-sa7-rouge.html"
    },
    "provenance": {
      "chantier": "forge-design",
      "date": "2026-09-02",
      "mandat": "TF-0736 + TF-0739 ; TF-1343, 2026-09-24 : SA7 ajoutée (pattern non compilable sous le drapeau v), fixtures saisie-sa7-{verte,rouge}.html",
      "amont": "retours utilisateur Produit-12 des 2026-08-31 et 2026-09-01, captures à l'appui ; SA7 mesurée le 2026-09-23 sur un champ « Suffixe du coffre » d'une page livrée"
    },
    "regles": 7
  },
  {
    "domaine": "Écran de création : choix exclusif, branches, coexistence",
    "oracle": "oracles/oracle-panneau-tache.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "content_patterns": ["data-panneau-tache", "data-branche"],
    "fixtures": {
      "verte": "oracles/fixtures/panneau-tache-verte.html",
      "rouge": "oracles/fixtures/panneau-tache-rouge.html"
    },
    "provenance": {
      "chantier": "forge-design",
      "date": "2026-09-02",
      "mandat": "TF-0707 + TF-0708",
      "amont": "inspection utilisateur en production, lot Produit-12 du 2026-08-16"
    },
    "regles": 6
  }
]
```

### Ce que ces deux oracles ne jugent PAS

- La **justesse** de la valeur proposée (fin de période = aujourd'hui, début = dernière
  position connue sinon profondeur métier 1/3/6 mois) : leur présence est décidable sur le
  fichier, leur pertinence métier non.
- La **surface de geste réelle en pixels** : mesurable au rendu seulement (`render_page.py`).
  Ces oracles jugent le câblage du geste, pas sa géométrie rendue.
- La **garde serveur symétrique** des bornes : hors périmètre d'un fichier HTML autonome,
  à exiger au contrat du produit.
- La **justesse du découpage en branches** — deux moitiés d'un même flux prises pour une
  alternative, le fond du retour TF-0707 : cela relève de la revue de conception, pas d'un
  attribut. Ce qui est mécanisé, c'est l'ordre du choix et la coexistence, pas le sens.
- Les branches **non balisées** : un formulaire qui n'annote pas ses groupes exclusifs par
  `data-branche` n'est pas jugé exclusif, et l'oracle le déclare au lieu de le supposer.
- La **pertinence métier** d'un `pattern` qui compile sous `v` : un motif trop permissif ou
  trop strict n'est pas un défaut de compilation. SA7 (`oracle-saisie`) ne juge que la
  compilation, jamais l'intention.

## Entrée du 05/09/2026 — oracle-surcouche (TF-0796)

Un domaine que rien ne couvrait : **ce que le navigateur dessine à la place de la page**.
Une fenêtre `dialog` de choix de dossier, stylée aux jetons et **PASS** à sa campagne
(api 483/483, suite 989/989), s'est affichée en boîte sombre aux boutons natifs sur le poste
de l'utilisateur le 01/09/2026 — mode sombre au niveau du système, composant rendu en
top-layer, `color-scheme` absent du socle. Tous les oracles du registre jugent ce que la page
dessine ; la boîte d'un `dialog`, son voile `::backdrop`, les contrôles natifs et les barres
de défilement suivent `color-scheme`, et rien ne le vérifiait.

Déclenchement **par contenu**, jamais par extension : présence de `<dialog`, d'un attribut
`popover`, d'un `role="dialog"`/`"alertdialog"`, d'un `::backdrop` ou d'un `showModal(`.
Hors de ces marqueurs, `run-oracles-design.mjs` le déclare `SANS OBJET` avec sa raison, et
l'oracle lancé seul rend `SKIP` motivé — jamais un `PASS` par défaut.

Comme pour `oracle-motion` et les deux oracles de TF-0736, l'injection dans
`~/.claude/skills/quality-oracles/references/registre-oracles.{md,json}` reste **un geste de
poste**, à faire par un humain ou par un mandat qui le nomme. La ligne ci-dessous est prête.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Composant dynamique et sur-couche : habillage explicite depuis les jetons | `node c:/dev/digit-ai-forge-design/oracles/oracle-surcouche.mjs <page.html> [--tokens tokens.css]` — SC1 surface de la sur-couche sans fond, sans contour, et sans couleur de texte si le composant est natif, SC2 contrôle de la sur-couche sans fond ni couleur (« boutons natifs »), SC3 voile `::backdrop` d'un modal natif non habillé, SC4 `color-scheme` non déclaré par thème (`light` au bloc de base, `dark` au bloc sombre) | cli | ✅ |

```json
[
  {
    "domaine": "Composant dynamique et sur-couche : habillage explicite depuis les jetons",
    "oracle": "oracles/oracle-surcouche.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "content_patterns": ["<dialog", "popover", "role=\"dialog\"", "::backdrop", "showModal("],
    "fixtures": {
      "verte": "oracles/fixtures/surcouche-verte.html",
      "rouge": "oracles/fixtures/surcouche-rouge.html"
    },
    "provenance": {
      "chantier": "forge-design",
      "date": "2026-09-05",
      "mandat": "TF-0796",
      "amont": "retour utilisateur du 2026-09-01, capture à l'appui (produit 02, campagne v0.4.0 verte)"
    },
    "regles": 4
  }
]
```

### Ce que cet oracle ne juge PAS

- La **prescription et le contraste de l'anneau de focus** : `oracle-tokens` T8 les porte
  déjà, et une règle dupliquée est une règle qui divergera.
- Le **rendu réel du composant ouvert** — empilement du top-layer, voile composé,
  contraste après cascade : `render_page.py` et la matrice d'états de la critique
  d'implémentation.
- L'**ouverture effective** du composant (`showModal()`, `popovertarget`, piège de focus) :
  pan `interface` de forge-tests, qui juge le câblage.
- Un habillage porté par une **feuille externe** ou un framework : la lecture se limite au
  CSS du document et au fichier passé par `--tokens`, et le saut est déclaré.
- Un composant construit **sans littéral de gabarit** (`document.createElement` en série) :
  l'analyse statique ne le voit pas, et elle le dit.

## Entrée du 05/09/2026 — oracle-declencheurs (TF-0797)

Un second domaine que rien ne couvrait : **la nature du point d'entrée d'une
fonctionnalité**. Le 31/08/2026, sur une fonctionnalité livrée et câblée, l'utilisateur
écrit « je ne vois pas de changement » ; le lendemain, une fois le bouton montré du doigt :
« mets-le sous forme de bouton, pas de lien — le lien a une signification particulière,
tout comme le bouton a la sienne ». Le point d'entrée unique d'une fenêtre d'arborescence
était un bouton fantôme, sans fond ni bordure, lu comme du texte. Deux tours de retour pour
un bouton, parce qu'aucun référentiel ne mesurait qu'une fonctionnalité a au moins un point
d'entrée qui A L'AIR de ce qu'il fait.

Déclenchement **par contenu** : présence d'un `<button`, d'un `<a`, d'un `<summary`, d'un
`data-action`, d'un `onclick` ou d'un `role="button"`/`"link"`. Hors de ces marqueurs,
`run-oracles-design.mjs` le déclare `SANS OBJET`, et l'oracle lancé seul rend `SKIP` motivé.

Cet oracle rend un champ de plus que le contrat commun : `registre`, la liste des points
d'entrée de la page avec la nature mesurée de chacun. C'est le critère que la grille cite en
maquette comme à l'implémentation — une nature se lit, elle ne se plaide pas.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Déclencheurs : nature du point d'entrée d'une fonctionnalité | `node c:/dev/digit-ai-forge-design/oracles/oracle-declencheurs.mjs <page.html> [--tokens tokens.css]` — DE1 action portée par un lien sans destination réelle, DE2 navigation portée par un bouton (`location`, `window.open`, `href` sur un `<button>`), DE3 fonctionnalité déclarée par `data-fonctionnalite` dont tous les points d'entrée sont fantômes, du texte nu ou des liens sans destination | cli | ✅ |

```json
[
  {
    "domaine": "Déclencheurs : nature du point d'entrée d'une fonctionnalité",
    "oracle": "oracles/oracle-declencheurs.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "content_patterns": ["<button", "<a ", "data-action", "onclick", "role=\"button\""],
    "fixtures": {
      "verte": "oracles/fixtures/declencheurs-verte.html",
      "rouge": "oracles/fixtures/declencheurs-rouge.html"
    },
    "provenance": {
      "chantier": "forge-design",
      "date": "2026-09-05",
      "mandat": "TF-0797",
      "amont": "retours utilisateur des 2026-08-31 et 2026-09-01 sur une même fonctionnalité livrée"
    },
    "regles": 3
  }
]
```

### Ce que cet oracle ne juge PAS

- Que le déclencheur ait une **cible nommée** et qu'un même libellé pointe la même cible :
  `check_maquette` C15 le fait déjà, et une règle dupliquée divergera.
- Le **câblage effectif** du déclencheur : pan `interface` de forge-tests.
- La **taille rendue** de la cible de geste : `oracle-saisie` SA5 pour le câblage,
  `render_page.py` pour la géométrie.
- La **navigation portée par un routeur applicatif** — un `data-action` interprété par un
  aiguillage JS : indécidable statiquement, déclarée plutôt que devinée. DE2 ne juge que
  la navigation ÉCRITE sur le bouton.
- La **justesse du découpage** en fonctionnalités et la pertinence des libellés : c'est de
  la conception, pas un attribut. Sans `data-fonctionnalite`, la couverture n'est pas jugée
  et l'oracle le dit — il ne regroupe jamais des déclencheurs par ressemblance de libellé.

## Entrée du 12/09/2026 — oracle-textes-application (TF-1064)

**Remontée §4 à forge-agents : À FAIRE.** Cette entrée est écrite, exécutée et verrouillée
au banc local (`self-test.mjs`, 4 règles), mais elle n'est **pas encore injectée** dans
`~/.claude/skills/quality-oracles/references/registre-oracles.md` ni dans son pendant JSON :
aucune écriture hors de ce dépôt n'a eu lieu pendant ce run. L'injection est un geste
mandaté, à demander au pilot. Tant qu'elle n'a pas eu lieu, le statut global reste
`candidat` — c'est écrit ici pour que personne ne le lise comme injecté.

Le domaine que rien ne couvrait : **les textes d'application** (type T4 de
`references\ECRITURE.md` du pilot) — libellés, messages d'erreur, états vides. Le
12/09/2026, le pilot a déposé un plancher d'écriture transverse dont la règle **E-12**
dit, pour T4 : « un libellé nomme ce que la personne contrôle ; une erreur dit ce qui
s'est passé puis comment réparer ; un état vide invite à agir ». Son propre oracle
(`oracle-ecriture.mjs`) juge le Markdown et déclare T4 en `non_juge` : les chaînes
d'application vivent dans du code ou des fichiers de ressources qu'il ne lit pas. Aucun
oracle du parc ne voyait donc « Une erreur est survenue », « Aucune donnée » ni
« Valider » — alors que c'est le texte que le plus grand nombre de personnes lit, et que
la critique d'implémentation le regarde en D7 Contenu, « la plus sous-traitée, la plus
visible à l'usage ».

**Identifiants de règles en `T4-*`, pas en `TA*`.** Le lot du pilot les nommait TA1–TA4 ;
ces quatre identifiants sont déjà pris dans cette forge par `oracle-taste` et cités sous ce
sens par `grille.md` (D1). Deux sens pour un même identifiant dans un même rapport est un
défaut de cohérence, pas une nuance. `T4` est le code de typologie de `ECRITURE.md` : le
préfixe dit ce qu'il juge. Écart consigné au lot de retours du 12/09.

**Déclenchement par extension**, et c'est volontaire : `.json`, `.arb`, `.po`,
`.properties`, `.html`. Sur un `.html`, l'oracle extrait les littéraux de `placeholder`,
`title`, `aria-label`, `alt`, le texte des `<button>`, `<label>`, `<option>` et celui des
éléments `role="alert"`, `.error`, `.empty`, `[data-etat="vide"]` — il n'est donc **pas**
enrôlé dans `run-oracles-design.mjs`, qui juge la page, mais appelé nommément par le
critère **C14** de `criteres-sortie.md`, avant C15.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Textes d'application (T4) : libellés, erreurs, états vides | `node c:/dev/digit-ai-forge-design/oracles/oracle-textes-application.mjs <chaines.json\|.arb\|.po\|.properties\|.html>` — T4-1 chaîne d'erreur sans indication de cause ni verbe de réparation (bloquant ; une seule des deux moitiés = avertissement), T4-2 état vide sans verbe d'action, T4-3 libellé d'action générique (« Valider », « OK », « Soumettre », « Cliquez ici », « Envoyer » seul, « Submit », « Click here ») — avertissement, T4-4 erreur qui s'excuse (« désolé », « oups », « sorry », « oops ») — avertissement | cli | candidat (remontée §4 à faire) |

```json
[
  {
    "domaine": "Textes d'application (T4) : libellés, erreurs, états vides",
    "oracle": "oracles/oracle-textes-application.mjs",
    "type": "cli",
    "statut": "candidat",
    "extensions": [".json", ".arb", ".po", ".properties", ".html"],
    "fixtures": {
      "verte": "oracles/fixtures/textes-application-verte.json",
      "rouge": "oracles/fixtures/textes-application-rouge.json"
    },
    "provenance": {
      "chantier": "forge-design",
      "date": "2026-09-12",
      "mandat": "TF-1064",
      "amont": "plancher d'écriture E-12 du pilot (references\ECRITURE.md, 12/09/2026), lot pilot - TRAVAUX - 20260912b"
    },
    "regles": 4
  }
]
```

### Ce que cet oracle ne juge PAS

- La **justesse du ton** et la fidélité à la voix de marque : `voix.md` le dit depuis
  toujours — « la justesse d'une voix n'est pas décidable par script ». Cet oracle juge la
  **présence** d'une cause, d'une réparation, d'une action ; jamais leur pertinence ni leur
  élégance. Un plancher franchi n'est pas une voix trouvée.
- Les **chaînes non extraites** : texte construit par concaténation ou interpolation,
  libellés restés dans le code applicatif, contenu rendu par un `<script src="…">` ou un
  framework, libellés venus d'une API. Ce qui n'est pas dans le fichier lu n'est pas jugé,
  et l'absence de constat ne vaut pas conformité du produit. Le compte des chaînes
  effectivement lues est remonté dans `non_juge`, à chaque exécution.
- La **langue** : les listes de verbes et d'indices sont françaises. Sur un fichier en
  anglais, l'oracle ne verrait ni réparation ni action et le dirait à tort — le déclarer
  non jugé plutôt que le croire.
- La **constance** d'un libellé d'un écran à l'autre (même geste, même mot) : elle reste au
  contrat de voix et à la relecture, comme avant.
- Les formes **ICU** (pluriels, genres, variables) : la variante rendue à l'utilisateur
  dépend de la donnée, pas du fichier.

## Entrée du 14/10/2026 — oracle-exploitabilite (TF-1654, TF-1674)

**Statut d'usage de la forge : `ok` depuis le 14/10/2026 (TF-1687, décision humaine
« Traite A1 »).** Écrite, exécutée et verrouillée au banc local (`self-test.mjs` : 5 règles,
un bloc d'instance servie derrière une connexion, un bloc d'enrôlement en opt-in), elle est
sur le chemin du producteur : `run-oracles-design.mjs --instance` et le contrôle 8 de la
méthode aval de `critique-le-design`. Son inscription au registre de `quality-oracles`
relève de la part forge-agents du même item : ce fichier ne dit pas qu'elle est faite.

Le domaine que rien ne couvrait : **l'exploitabilité d'un écran d'application au volume
réel de ses données**. Le 12/10/2026, les écrans d'une application avaient passé la
critique d'implémentation, `render_page.py` aux 7 largeurs et 3 000 tests, tous sur le jeu
de démonstration. À la première alimentation réelle, la fiche mesurait 5 220 px en quatre
colonnes déséquilibrées, la complétude 20 630 px, et des énumérations s'affichaient
brutes. Le produit a écrit son propre juge, lié à ses écrans et à sa connexion ; celui-ci
en est la forme générique. Il se joue sur l'écran **rendu**, de préférence contre
l'instance servie et alimentée, et la critique d'implémentation se rejoue avec lui après la
première alimentation réelle. Il est enrôlé dans `run-oracles-design.mjs` **en opt-in**
(TF-1687) : `--instance <url|page rendue au volume réel>`, répétable, avec
`--etat-connexion etat.json` transmis tel quel. Sans instance fournie, il est déclaré
`SANS OBJET` au `non_juge` et ne pèse pas sur le verdict : un projet sans instance n'échoue
jamais par lui. Une instance fournie mais injugeable (outillage de rendu absent, état de
connexion introuvable, redirection) rend le point d'entrée indéterminé, jamais PASS.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Écran d'application : exploitabilité au volume réel des données | `node c:/dev/digit-ai-forge-design/oracles/oracle-exploitabilite.mjs <page.html\|url>… [--largeur N] [--hauteur-ecran N] [--etat-connexion etat.json] [--theme dark]` — X0 cible jugeable (HTTP < 400 ; redirection signalée, écran non jugé, SKIP si aucun écran jugé), X1 hauteur ≤ 4 fenêtres hors tableaux filtrables, X2 ligne médiane de tableau ≤ 80 px, X3 aucune valeur machine visible (snake_case, objet sérialisé), X4 colonnes côte à côte sans écart de plus de 3 fois au-delà de 1 500 px, X5 libellé de ligne ≤ 3 lignes ; enrôlé en opt-in par `run-oracles-design.mjs <page.html> --instance <url\|page> [--etat-connexion etat.json]` | cli | ✅ |

```json
[
  {
    "domaine": "Écran d'application : exploitabilité au volume réel des données",
    "oracle": "oracles/oracle-exploitabilite.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": {
      "verte": "oracles/fixtures/exploitabilite-verte.html",
      "rouge": "oracles/fixtures/exploitabilite-rouge.html"
    },
    "provenance": {
      "chantier": "forge-design",
      "date": "2026-10-14",
      "mandat": "TF-1654, TF-1674, TF-1687",
      "amont": "juge d'exploitabilité écrit par un produit (X1 à X5, seuils mesurés chez lui), rendu générique"
    },
    "regles": 6
  }
]
```

### Ce que cet oracle ne juge PAS

- Le **volume** lui-même : il mesure l'écran qu'il reçoit. Joué sur un jeu de
  démonstration, il ne prouve rien de l'écran alimenté.
- La **pertinence** du contenu : un écran court et vide passe X1.
- Le **jugement esthétique** : critique d'implémentation et `render_page.py`.
- Une valeur machine d'une autre forme que le snake_case ou la sérialisation
  « clé : valeur ; » (camelCase, identifiant opaque).
- La **validité** d'un état de connexion au-delà du constat X0 : une session périmée qui
  redirige est dite, une session périmée qui sert une page vide ne l'est pas.

## Entrée du 19/10/2026 — oracle-motion, règles R11 à R13 (TF-1904)

L'entrée du 18/08/2026 (R1 à R10) reste vraie ; elle compte **treize** règles depuis ce jour.
Le trou, mesuré par l'étude d'opportunité 20261019i sur une page jetable de 9 lignes : une
animation CSS `infinite` de 40 s, un `animate(…, { duration: 1.2 })` et une révocation
`prefers-reduced-motion` qui ne coupe que l'un des deux éléments animés rendaient **PASS,
exit 0, sans une alerte**. Les trois règles sont des **avertissements** (comme la seconde
branche de R8) : elles ne requalifient aucun livrable existant, et la page reste PASS.
L'arbitrage d'autorité ci-dessus tient : elles entrent dans `oracle-motion`, aucun oracle neuf.

- **R11** — animation `infinite` dont le cycle dépasse 5 s, sans mécanisme de pause
  (WCAG 2.2 SC 2.2.2, niveau A). Pause reconnue : `animation-play-state` déclaré hors du bloc de
  révocation, ou `.pause()` / `playState` dans un script de la page.
- **R12** — durée **littérale** passée à `animate()` au-delà de 300 ms, le même plafond que R4
  (`PLAFOND_MS`). L'unité se lit sur l'appelant : secondes pour Motion, millisecondes pour
  `element.animate()` (Web Animations). Un script de plus de 20 000 caractères (bibliothèque
  vendorée) n'est pas lu.
- **R13** — révocation `prefers-reduced-motion: reduce` qui neutralise quelque chose (R10
  passe) mais ne nomme pas chaque sélecteur portant une `animation`, sauf règle universelle `*`.

Preuves : trois paires de fixtures (`motion-boucle-*`, `motion-js-*`, `motion-couverture-*`),
verrouillées par le bloc « oracle-motion R11–R13 (TF-1904) » de `self-test.mjs`. La rouge doit
rester PASS (exit 0) avec un avertissement de SA règle et aucune des deux autres : elle ne passe
donc pas par la boucle `CAS`, où une rouge doit FAIL. Le bloc rejoue aussi la page de l'étude.

Bruit mesuré le 19/10/2026 avant l'inscription : sur les 108 HTML et CSS suivis de la forge,
aucun verdict ne change ; R11 et R13 ne lèvent rien ; R12 lève 4 avertissements, tous justes (les
4 maquettes de `demo/` passent `duration: 0.32`, soit 320 ms). Sur 1 405 HTML suivis des autres
dépôts de `C:\dev`, R11, R12 et R13 ne lèvent rien.

Ce que R11 à R13 ne jugent pas : une boucle de 5 s ou moins (loader), une durée portée par une
variable, une boucle JavaScript (`repeat: Infinity`), les transitions pour R13, la cascade réelle
(rendu : `render_page.py`).

```json
[
  {
    "domaine": "Mouvement : craft de l'animation, PRESCRIT et jugé",
    "oracle": "oracles/oracle-motion.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html", ".css"],
    "fixtures": {
      "verte": "oracles/fixtures/motion-verte.html",
      "rouge": "oracles/fixtures/motion-rouge.html",
      "rouge_revocation": "oracles/fixtures/motion-revocation-rouge.html",
      "verte_boucle": "oracles/fixtures/motion-boucle-verte.html",
      "rouge_boucle": "oracles/fixtures/motion-boucle-rouge.html",
      "verte_js": "oracles/fixtures/motion-js-verte.html",
      "rouge_js": "oracles/fixtures/motion-js-rouge.html",
      "verte_couverture": "oracles/fixtures/motion-couverture-verte.html",
      "rouge_couverture": "oracles/fixtures/motion-couverture-rouge.html"
    },
    "provenance": {
      "chantier": "forge-design",
      "date": "2026-10-19",
      "mandat": "TF-1904",
      "amont": "WCAG 2.2 SC 2.2.2 et 2.3.3 ; étude 20261019i (animation et finition des interfaces)"
    },
    "regles": 13
  }
]
```

## Entrée du 19/10/2026 — sept règles extraites de skills tiers (TF-1911)

Voie taste-skill (TF-0199), appliquée aux Web Interface Guidelines de Vercel et aux skills
d'Emil Kowalski, **sans rien installer**. Le trou, mesuré par l'étude d'opportunité 20261019e :
sur une page témoin à 14 défauts tirés de cinq skills de design tiers, 12 passaient tous les
oracles du lanceur sans alerte. Sept règles statiques, vérifiables sur le fichier seul et citées
par deux sources au moins (ou un texte normatif), entrent en **avertissement** dans l'oracle qui
juge déjà leur domaine. Attribution, citations, écarts à la lettre et règles écartées :
[regles-importees-vercel-emil.md](regles-importees-vercel-emil.md).

| Règle | Oracle | Défaut visé |
|---|---|---|
| DE4 | `oracle-declencheurs` | `div` ou `span` avec `onclick`, sans `role` ni `tabindex` |
| SA8 | `oracle-saisie` | champ textuel sans `autocomplete` ni `inputmode` |
| M10 | `oracle-mobile` | contrôles sans `touch-action: manipulation` ni `-webkit-tap-highlight-color` |
| M11 | `oracle-mobile` | `<meta name="theme-color">` absent |
| SC5 | `oracle-surcouche` | modale ou tiroir sans `overscroll-behavior: contain` |
| I8 | `oracle-images` | `<img>` sans `width` ni `height` |
| R14 | `oracle-motion` | contrôle pressable qu'aucune règle `:active` n'atteint |

Preuves : sept paires de fixtures, verrouillées par le bloc « sept règles extraites de skills
tiers (TF-1911) » de `self-test.mjs` (rouge PASS exit 0 avec sa règle seule, verte sans la règle).
`oracle-motion` reste le seul lieu du mouvement : R14 s'ajoute à R11 à R13, sans doublon (aucune
de ces trois règles ne porte un retour d'appui).

Bruit mesuré le 19/10/2026 avant l'inscription. Aucun verdict ne change nulle part. Sur les 108
HTML et CSS suivis de la forge (dont 92 fixtures minimales) : DE4 0 constat, SA8 44 constats sur
26 fichiers, M10 70 fichiers, M11 99 fichiers, SC5 6 fichiers, I8 7 fichiers, R14 63 fichiers.
Sur 1 405 HTML suivis des autres dépôts de `C:\dev` : DE4 2 constats sur 1 fichier, SA8 183
constats sur 49 fichiers, M10 1 010 fichiers, M11 609 fichiers, SC5 519 fichiers (sur 523 constats),
I8 530 fichiers, R14 894 fichiers. M10, M11 et R14 sont donc bavardes : l'avertissement le dit, et
la revue du 2026-11-16 retire toute règle dont la moitié des avertissements n'est pas confirmée
à la lecture.

```json
[
  {
    "domaine": "Déclencheurs : nature du point d'entrée d'une fonctionnalité",
    "oracle": "oracles/oracle-declencheurs.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": {
      "verte": "oracles/fixtures/declencheurs-verte.html",
      "rouge": "oracles/fixtures/declencheurs-rouge.html",
      "verte_de4": "oracles/fixtures/declencheurs-de4-verte.html",
      "rouge_de4": "oracles/fixtures/declencheurs-de4-rouge.html"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-10-19", "mandat": "TF-1911", "amont": "Vercel Web Interface Guidelines (MIT) ; WCAG 2.1.1" },
    "regles": 4
  },
  {
    "domaine": "Champs de saisie : typé, proposé, borné, atteignable",
    "oracle": "oracles/oracle-saisie.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": {
      "verte_sa8": "oracles/fixtures/saisie-sa8-verte.html",
      "rouge_sa8": "oracles/fixtures/saisie-sa8-rouge.html"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-10-19", "mandat": "TF-1911", "amont": "Vercel Web Interface Guidelines (MIT) ; mobile-native d'Emil Kowalski (MIT)" },
    "regles": 8
  },
  {
    "domaine": "Cible mobile : contrat d'usage tactile",
    "oracle": "oracles/oracle-mobile.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": {
      "verte_m10": "oracles/fixtures/mobile-m10-verte.html",
      "rouge_m10": "oracles/fixtures/mobile-m10-rouge.html",
      "verte_m11": "oracles/fixtures/mobile-m11-verte.html",
      "rouge_m11": "oracles/fixtures/mobile-m11-rouge.html"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-10-19", "mandat": "TF-1911", "amont": "Vercel Web Interface Guidelines (MIT) ; mobile-native d'Emil Kowalski (MIT)" },
    "regles": 11
  },
  {
    "domaine": "Composant dynamique et sur-couche : habillage explicite depuis les jetons",
    "oracle": "oracles/oracle-surcouche.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": {
      "verte_sc5": "oracles/fixtures/surcouche-sc5-verte.html",
      "rouge_sc5": "oracles/fixtures/surcouche-sc5-rouge.html"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-10-19", "mandat": "TF-1911", "amont": "Vercel Web Interface Guidelines (MIT) ; mobile-native d'Emil Kowalski (MIT)" },
    "regles": 5
  },
  {
    "domaine": "Visuels générés : traçabilité et budget",
    "oracle": "oracles/oracle-images.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": {
      "verte_i8": "oracles/fixtures/images-i8-verte.html",
      "rouge_i8": "oracles/fixtures/images-i8-rouge.html"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-10-19", "mandat": "TF-1911", "amont": "Vercel Web Interface Guidelines (MIT)" },
    "regles": 8
  },
  {
    "domaine": "Mouvement : craft de l'animation, PRESCRIT et jugé",
    "oracle": "oracles/oracle-motion.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html", ".css"],
    "fixtures": {
      "verte_appui": "oracles/fixtures/motion-appui-verte.html",
      "rouge_appui": "oracles/fixtures/motion-appui-rouge.html"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-10-19", "mandat": "TF-1911", "amont": "review-animations d'Emil Kowalski (MIT), STANDARDS l.59" },
    "regles": 14
  }
]
```
