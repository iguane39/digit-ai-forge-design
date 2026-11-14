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
| Design généré : marqueurs de slop | `oracles/oracle-slop.mjs <page.html>` — S1 bandeau latéral > 1px, S2 texte en dégradé, S3 polices réflexes, S4 noir/blanc purs, S5 palette IA (violet→bleu, néon sur sombre), S6 emojis en production, S7 grille de cartes clonée, S8 easing à dépassement, S9 rayon uniforme + ombre non teintée, S10 sparkline décoratif, S11 halo coloré (avertissement), S12 forme floue (avertissement) | cli | ✅ |
| Système de marque : traçabilité des tokens | `oracles/oracle-tokens.mjs <page.html> [--tokens tokens.css]` — T1 couleur en dur, T2 police en dur, T3 échelle 4pt, T4 parité clair/sombre, T5 contraste ≥ 4.5:1 sur paires résolvables, T6 chroma aux extrêmes (OKLCH), T7 contraste non textuel ≥ 3:1, T8 focus prescrit et contrasté | cli | ✅ |
| Cible mobile : contrat d'usage tactile | `oracles/oracle-mobile.mjs <page.html>` — M1 viewport et zoom, M2 cibles ≥ 44 px, M3 safe-area-inset, M4 reflow des tables sous 768 px, M5 orientation paysage, M6 prefers-reduced-motion, M7 état saisi qui survit à la navigation, M8 barre basse hors flux dans une coquille défilante, M9 bandeau collé en haut d'écran sous le quart de l'écran, M10 délai de tap et M11 `theme-color` (avertissements) | cli | ✅ |
| Visuels générés : traçabilité et budget | `oracles/oracle-images.mjs <page.html> [--env .env]` — I1 alt utile, I2 plafond unitaire, I3 plafond global 10 Mo, I4 zéro image réseau, I5 manifeste de génération, I6 complétude prompt/modèle/date, I7 deux actifs déclarés variantes rendent différemment (empreintes identiques, ou encres identiques à empreintes différentes), I8 `width` et `height` posés (avertissement) | cli | ✅ |
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
    "regles": 12
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
| Mouvement : craft de l'animation, PRESCRIT et jugé | `node c:/dev/digit-ai-forge-design/oracles/oracle-motion.mjs <page.html>` — R1 `transition: all`, R2 entrée en `scale(0)`, R3 `ease-in` sur de l'UI, R4 durée > 300 ms sans justification déclarée, R5 `transform-origin: center` sur élément ancré, R6 propriété de layout animée, R7 survol animé sans `@media (hover: hover) and (pointer: fine)`, **R8 durée en dur alors que la feuille prescrit des tokens**, **R9 token de mouvement hors barème (plafond 300 ms)**, **R10 révocation `prefers-reduced-motion: reduce` absente ou sans effet (WCAG 2.2 SC 2.3.3)** ; avertissements : R11 animation `infinite` de plus de 5 s sans pause, R12 durée littérale d'`animate()` au-delà de 300 ms, R13 révocation qui ne couvre pas chaque sélecteur animé, R14 contrôle pressable sans règle `:active` ; dérivé de `review-animations` (Emil Kowalski, MIT) | cli | ✅ |

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
| Champs de saisie : typé, proposé, borné, atteignable | `node c:/dev/digit-ai-forge-design/oracles/oracle-saisie.mjs <page.html>` — SA1 format connu non typé natif, SA2 champ temporel sans valeur proposée, SA3 champ temporel ou numérique sans borne, SA4 promesse d'aide (valeur ou borne) non câblée dans le champ, SA5 cible de geste réduite à l'icône native (aucun `showPicker()` global), SA6 saisie clavier confisquée (`readonly` posé pour forcer le sélecteur, ou `preventDefault` sur `keydown`), SA7 attribut `pattern` qui ne compile pas sous le drapeau `v` (celui que le navigateur applique réellement — un motif cassé est ignoré en silence, `validity.valid` reste vrai), SA8 (avertissement) champ textuel (text, email, tel, url, number, password) sans `autocomplete` ni `inputmode` | cli | ✅ |
| Écran de création : choix exclusif, branches, coexistence | `node c:/dev/digit-ai-forge-design/oracles/oracle-panneau-tache.mjs <page.html>` — PA1 branches exclusives sans sélecteur qui les commande, PA2 sélecteur placé après les champs qu'il gouverne, PA3 plusieurs branches rendues simultanément, PA4 même renseignement demandé deux fois, PA5 tâche à branches en formulaire replié coexistant avec sa liste, PA6 panneau adressable dont la route n'est pointée par rien, PA7 écran qui annonce une création sans aucun des trois motifs légitimes (formulaire replié, panneau adressable, page dédiée) | cli | ✅ |

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

Déclenchement **par contenu**, jamais par extension, et décidé sur **l'arbre** (TF-2092,
`lib/surcouche.mjs`) : un élément `<dialog>`, un attribut `popover`, un `role="dialog"`/`"alertdialog"`
dans le DOM ou dans un gabarit de script, ou une règle `::backdrop` d'une feuille de style. Le texte
d'un script ou d'un commentaire qui cite ces mots (`showModal(`, `role="dialog"`) n'en est pas un.
Hors de ces marqueurs, `run-oracles-design.mjs` le déclare `SANS OBJET` avec sa raison, et
l'oracle lancé seul rend `SKIP` motivé — jamais un `PASS` par défaut.

Comme pour `oracle-motion` et les deux oracles de TF-0736, l'injection dans
`~/.claude/skills/quality-oracles/references/registre-oracles.{md,json}` reste **un geste de
poste**, à faire par un humain ou par un mandat qui le nomme. La ligne ci-dessous est prête.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Composant dynamique et sur-couche : habillage explicite depuis les jetons | `node c:/dev/digit-ai-forge-design/oracles/oracle-surcouche.mjs <page.html> [--tokens tokens.css]` — SC1 surface de la sur-couche sans fond, sans contour, et sans couleur de texte si le composant est natif, SC2 contrôle de la sur-couche sans fond ni couleur (« boutons natifs »), SC3 voile `::backdrop` d'un modal natif non habillé, SC4 `color-scheme` non déclaré par thème (`light` au bloc de base, `dark` au bloc sombre), SC5 (avertissement) modale ou tiroir qui ne contient pas son défilement (`overscroll-behavior: contain` ou `none` absent) | cli | ✅ |

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
| Déclencheurs : nature du point d'entrée d'une fonctionnalité | `node c:/dev/digit-ai-forge-design/oracles/oracle-declencheurs.mjs <page.html> [--tokens tokens.css]` — DE1 action portée par un lien sans destination réelle, DE2 navigation portée par un bouton (`location`, `window.open`, `href` sur un `<button>`), DE3 fonctionnalité déclarée par `data-fonctionnalite` dont tous les points d'entrée sont fantômes, du texte nu ou des liens sans destination, DE4 (avertissement) `<div>` ou `<span>` rendu cliquable par `onclick` sans `role` ni `tabindex` | cli | ✅ |

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
      "amont": "plancher d'écriture E-12 du pilot (references\\ECRITURE.md, 12/09/2026), lot pilot - TRAVAUX - 20260912b"
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

**Deux évolutions du 04/11/2026 (lot Produit-86 du 03/11).** TF-2121 : pour une page
d'**application** (déclarée par `<meta name="forge-type-page" content="application">` ou
`--type-page application`, ou portant `data-panneau-tache`, `data-branche` ou
`data-exigence`), l'absence d'instance n'est plus « sans objet » : le point d'entrée rend
FAIL, règle X7, tant que `--instance` manque ; `--maquette` exempte une maquette et le dit au
`non_juge`. Dix pages d'application avaient été rendues PASS sur cette seule ligne de
`non_juge`, deux défauts apparaissant à l'instance jouée. Une page éditoriale garde le
comportement d'avant. TF-2122 : `--accepter-certificat-local` accepte le certificat
auto-signé d'une instance servie en https, pour les seuls hôtes `localhost`, `127.0.0.1` et
`::1` ; il est transmis aux trois juges qui lisent l'instance (exploitabilité, faits
commerciaux, valeur affichée).

**Évolution du 05/11/2026 (TF-2158, lot Produit-86 du 04/11).** Le porteur a relevé d'emblée, sur la préproduction,
« ni visite guidée ni infobulle de terme » (jeton d'agent, job de lab, OBSERVED sans explication), après une critique PASS
et des filtres PASS. Deux règles entrent, dues à une application (une page déclarée éditoriale ne les doit pas) :
**X8** l'application offre une visite guidée CÂBLÉE — l'entrée (`[data-visite-guidee]`, ou un lien ou bouton nommé
« visite guidée ») est cliquée et une étape neuve s'affiche ; **X9** l'écran déclare son lexique (`[data-lexique]`, un `<dl>`)
et chaque occurrence visible d'un terme du lexique porte une infobulle (`title`, `data-definition` ou `aria-describedby`).
Écarts explicites et motivés : `data-sans-visite-guidee="<raison>"`, `data-sans-lexique="<raison>"` (sans motif, ils sont
eux-mêmes refusés). Les fixtures d'onglets (X6) les posent, l'écran vert de TF-1654 porte une visite et un lexique.
Numérotation : X7 est déjà la règle du point d'entrée (page d'application sans instance, TF-2121) ; les deux règles neuves
prennent X8 et X9.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Écran d'application : exploitabilité au volume réel des données | `node c:/dev/digit-ai-forge-design/oracles/oracle-exploitabilite.mjs <page.html\|url>… [--largeur N] [--hauteur-ecran N] [--etat-connexion etat.json] [--theme dark]` — X0 cible jugeable (HTTP < 400 ; redirection signalée, écran non jugé, SKIP si aucun écran jugé), X1 hauteur ≤ 4 fenêtres hors tableaux filtrables, X2 ligne médiane de tableau ≤ 80 px, X3 aucune valeur machine visible (snake_case, objet sérialisé), X4 colonnes côte à côte sans écart de plus de 3 fois au-delà de 1 500 px, X5 libellé de ligne ≤ 3 lignes, X6 onglets sous le premier écran (TF-1916), X8 visite guidée câblée (TF-2158), X9 lexique déclaré et infobulles de ses termes (TF-2158) ; enrôlé en opt-in par `run-oracles-design.mjs <page.html> --instance <url\|page> [--etat-connexion etat.json]` | cli | ✅ |

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
      "mandat": "TF-1654, TF-1674, TF-1687, TF-2158",
      "amont": "juge d'exploitabilité écrit par un produit (X1 à X5, seuils mesurés chez lui), rendu générique"
    },
    "regles": 8
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
verrouillées par le bloc de `self-test.mjs` consacré à R11–R13 (TF-1904). La rouge doit
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

## Entrée du 29/10/2026 — oracle-fluidite, et la capture manquante qui échoue (D-108 (b))

**Statut d'usage de la forge : `ok` depuis le 29/10/2026 (décision humaine D-108 (b)).** Écrit, exécuté et
verrouillé au banc local (`self-test.mjs` : le jugement branche par branche sans navigateur, la paire de
fixtures dans Chromium, l'enrôlement dans le point d'entrée). Son inscription au registre de
`quality-oracles` relève du pilot : ce fichier ne dit pas qu'elle est faite.

Le domaine que rien ne couvrait : **la fluidité d'une page animée, mesurée de bout en bout**. Le 27/10/2026,
chez un produit (visite 3D animée), un oracle de fluidité a rendu PASS à « 60 images par seconde » ; la mesure
réelle du 28/10 donnait 3,3. Il comptait les rappels de `requestAnimationFrame` sans attendre le travail du
processeur graphique. `oracle-fluidite` ferme chaque image par la lecture d'un pixel du canevas WebGL
(`readPixels`) : la durée d'image est celle de la page ET de la carte. `gl.finish()` seul ne suffit pas
(mesuré sur Chromium 145 : retour en 0 ms avec 256 passes de dessin en file). Mesure impossible — pas de
navigateur, pas de contexte WebGL, pas d'animation, synchronisation en échec, contexte perdu — ⇒ `SKIP`
motivé, jamais PASS. Il est enrôlé dans `run-oracles-design.mjs` : lancé tout seul sur une page à canevas
WebGL animé, `SANS OBJET` dit sinon, forçable par `--fluidite`.

**Même décision, second volet : une capture manquante à une largeur de la grille est un échec.** Une capture à
390 px exigée n'avait pas pu être faite, et le rendu a été jugé PASS : `render_page.py` déclare la capture
manquée et rend son verdict sur le DOM, et les consommateurs de cette forge ne lisaient pas ce champ.
`run-oracles-design.mjs --rendu` rend désormais `CAP-1` (bloquant, la largeur nommée, le motif de
`render_page.py` repris) et `rendu-comparatif.mjs` rend `RC-3` (côté « avant » ou « après »). Mesuré avant
correctif sur un faux `render_page.py` : PASS dans les quatre cas, zéro mot sur 390 px.
`oracle-baseline.mjs` le faisait déjà (B0).

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Page animée en WebGL : durée d'image de bout en bout | `node c:/dev/digit-ai-forge-design/oracles/oracle-fluidite.mjs <page.html\|url> [--largeur N] [--hauteur N] [--echauffement ms] [--fenetre ms] [--temoin-naif]` — F1 cadence de bout en bout sous 30 i/s (bloquant), F2 95e centile de la durée d'image au-delà de 50 ms (avertissement), F3 entre 30 et 55 i/s (avertissement), F0 la mesure ou le motif du SKIP ; enrôlé par `run-oracles-design.mjs <page.html> [--fluidite]` | cli | ✅ |

```json
[
  {
    "domaine": "Page animée en WebGL : durée d'image de bout en bout",
    "oracle": "oracles/oracle-fluidite.mjs",
    "type": "cli",
    "statut": "ok",
    "extensions": [".html"],
    "fixtures": {
      "verte": "oracles/fixtures/fluidite-verte.html",
      "rouge": "oracles/fixtures/fluidite-rouge.html"
    },
    "provenance": {
      "chantier": "forge-design",
      "date": "2026-10-29",
      "mandat": "D-108 (b)",
      "amont": "oracle de fluidité écrit par un produit (visite 3D animée), qui comptait les rappels d'animation sans attendre la carte ; mesure réelle 3,3 i/s pour 60 annoncées"
    },
    "regles": 3
  }
]
```

### Ce que cet oracle ne juge PAS

- La **présentation à l'écran** (compositeur, synchronisation verticale) : la durée d'image s'arrête quand le
  travail graphique de la page est terminé, pas quand l'image est affichée.
- Les canevas **hors de la page principale** (iframe, OffscreenCanvas piloté par un worker), les canevas 2D et
  les animations CSS.
- L'animation **sous geste** (rotation, défilement, changement de scène) : seule l'animation au repos est mesurée.
- La **machine de l'utilisateur** : la durée est celle de ce poste et de ce moteur de rendu, nommé dans la
  mesure. Sur un rendu LOGICIEL (SwiftShader, llvmpipe — poste sans processeur graphique), elle majore celle
  d'une vraie carte : un FAIL y est gardé mais son message le dit, et il se confirme sur une machine à
  processeur graphique avant de refondre le rendu.
- Les **seuils** (30 i/s au plancher, 55 visés, 50 ms au 95e centile) : un choix de la forge, rendu dans
  `mesures.seuils`, pas une norme.

## Entrée du 02/11/2026 — oracle-valeur-affichee (TF-2043)

**Remontée §4 à forge-agents : FAITE le 02/11/2026** (registre de `quality-oracles` 2.50.0). Cette
entrée est écrite, exécutée et verrouillée au banc local (`self-test.mjs` : 4 règles et un bloc dédié
de 12 vérifications) et enrôlée dans `run-oracles-design.mjs` sur déclaration du produit.

Le domaine que rien ne couvrait : **une valeur dérivée affichée égale sa source**. Un produit
affichait « v1.06 » sous l'étiquette « v1.8.0 » : la version vit dans `package.json`, l'affichage
dans la page, et tous les oracles du parc jugent la page isolément. Le produit déclare ses valeurs
dérivées (version, environnement, date) dans `valeurs-derivees.json` : pour chacune, où la page
l'affiche (un sélecteur à un seul compound, ou un motif sur le texte visible) et la commande qui
donne la source. L'oracle relit la page servie (URL http ou fichier), rejoue la commande et compare ;
il ne lit jamais le code qui écrit la valeur dans la page.

**Déclaration absente : SKIP exit 2, dit par VA0, jamais PASS.** Une déclaration sans valeur est
traitée de la même façon. Dans `run-oracles-design.mjs`, l'oracle est en opt-in par la déclaration
(`valeurs-derivees.json` voisin de la page, ou `--valeurs-derivees <fichier>`) ; la page jugée est
chaque `--instance` fournie, sinon la cible. Sans déclaration il est dit SANS OBJET au `non_juge` et
l'agrégat ne tombe pas en INDÉTERMINÉ : un SKIP sur tout projet qui n'a rien déclaré rendrait
inutilisable le point d'entrée.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Valeur affichée ↔ source (version, environnement, date) | `node c:/dev/digit-ai-forge-design/oracles/oracle-valeur-affichee.mjs <page.html\|http(s)://…> [--declaration valeurs-derivees.json]` — VA0 SKIP sans déclaration, VA1 la page affiche autre chose que la source (bloquant), VA2 valeur introuvable ou vide dans la page servie (bloquant), VA3 commande en échec, trop lente ou muette (bloquant), VA4 déclaration illisible ou entrée incomplète (bloquant) | cli | candidat (remontée §4 à faire) |

### Ce que cet oracle ne juge PAS

- Une valeur dérivée affichée que le produit **n'a pas déclarée** : il ne juge que le déclaré.
- Une valeur écrite par un script **après le chargement**, ou une page derrière une connexion :
  il lit la page telle que le serveur la rend ; VA2 dit alors la valeur absente.
- Une commande **circulaire** (elle relit la page, ou la même constante que l'affichage) : l'égalité
  serait vide de sens, et rien ne le détecte.
- La **pertinence** du choix des valeurs déclarées.

La commande de la déclaration est celle du produit, jouée telle quelle (30 s au plus) : l'oracle ne
se joue que sur un produit dont on accepte d'exécuter les commandes déclarées.

```json
[
  {
    "domaine": "Valeur affichée ↔ source (version, environnement, date)",
    "oracle": "oracles/oracle-valeur-affichee.mjs",
    "type": "cli",
    "statut": "candidat",
    "extensions": [".html"],
    "fixtures": {
      "verte": "oracles/fixtures/valeur-affichee/verte.html",
      "rouge": "oracles/fixtures/valeur-affichee/rouge.html",
      "declaration_verte": "oracles/fixtures/valeur-affichee/verte.json",
      "declaration_rouge": "oracles/fixtures/valeur-affichee/rouge.json"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-11-02", "mandat": "TF-2043", "amont": "retour d'un produit : v1.06 affichée sous l'étiquette v1.8.0" },
    "regles": 4
  }
]
```

## Entrée du 02/11/2026 — oracle-faits-commerciaux (TF-2050)

**Remontée §4 à forge-agents : FAITE le 02/11/2026** (registre de `quality-oracles` 2.51.0). Cette entrée est écrite, exécutée et verrouillée au banc local (`self-test.mjs` : un bloc
dédié de 31 vérifications, rouge et verte, verte piégeuse, remontée au lanceur) et enrôlée dans
`run-oracles-design.mjs` pour toute page, sans déclaration du produit.

Le domaine que rien ne couvrait : **les faits commerciaux qu'une page affiche et que seul le produit peut
attester**. Une note de « 4,8/5 », des données d'avis en JSON-LD, un prix barré, un « plus que 3 en stock »,
« 10 000 clients », une allégation de santé : tous les oracles du parc jugent la forme de la page, aucun ne
dit qu'elle porte un fait à faire confirmer. Décision humaine D-132 (a) du 02/11/2026 : un contrôle
**avertissant**, sans déclaration du produit, qui repère les formes sur la page servie et les liste au
rapport ; **aucune obligation nouvelle** pour le produit.

**Une forme trouvée n'échoue jamais.** Chaque forme donne un constat de sévérité `avertissement`, avec sa
ligne, son sélecteur, le texte exact trouvé et la mention « à faire confirmer » : verdict PASS, exit 0.
FAIL, exit 1, est réservé à une anomalie de l'oracle lui-même (FC9, bloquant) : la table de motifs
`corpus/faits-commerciaux.json` est absente, illisible, ou se contredit (un motif qui ne reconnaît pas son
propre exemple, ou qui reconnaît son contre-exemple). Page non fournie, introuvable, en 404, injoignable ou
qui ne se lit pas comme du HTML : SKIP, exit 2, dit par FC0, jamais PASS. Le premier constat (FC0, `info`)
résume le compte, pour qu'un lanceur qui n'affiche que les premières lignes dise déjà qu'il y a à confirmer.

La table des motifs est une **donnée** (loi n° 4) : datée (02/11/2026), relecture posée (02/02/2027),
sourcée, éditable ; ses références juridiques sont citées de mémoire et marquées non relues à la source.

Voisin : `oracle-faits-sources` de make-it-better (`digit-ai-forge-agents`, b29590c) juge UN DOCUMENT
d'une version contre son origine et refuse (FAIL) tout nombre, nom ou citation absent de l'origine ;
celui-ci juge UNE PAGE SERVIE sans origine ni source connues et ne refuse rien, il reconnaît la forme d'un
fait commercial. Ils ne se recoupent pas.

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Faits commerciaux affichés (avis, prix barré, rareté, volume, santé) — à faire confirmer | `node c:/dev/digit-ai-forge-design/oracles/oracle-faits-commerciaux.mjs <page.html\|http(s)://…> [--motifs table.json]` — FC1 données d'avis structurées, FC2 note ou nombre d'avis, FC3 citation de client ou section témoignage, FC4 prix barré, FC5 rareté et urgence, FC6 volume de ventes ou de clients, FC7 allégation de santé (tous en avertissement « à faire confirmer », PASS exit 0) ; FC9 table de motifs défaillante (bloquant, anomalie de l'oracle) ; FC0 SKIP page non lue | cli | candidat (remontée §4 à faire) |

### Ce que cet oracle ne juge PAS

- La **véracité** des faits : il ne sait pas si la note, le prix de référence, le stock ou le nombre de
  clients est vrai ; une forme trouvée est à faire confirmer par le produit, jamais un défaut.
- Le contenu **écrit par JavaScript** après le chargement (avis chargés par un widget, JSON-LD injecté,
  compte à rebours animé) quand seule la page statique est lue ; une page derrière une connexion.
- Les **images** (une note ou un badge dessinés dans une image) et les attributs `alt`, `title`, `aria-label`.
- Les formes absentes de la table, et les langues autres que le français et l'anglais ; une **note entière
  nue** (« 5/5 »), confondue avec un score d'audit ou un numéro d'étape.
- Faux positifs connus, mesurés le 02/11/2026 sur 1 353 pages du poste : un score d'audit (« 2,4/5 »), un
  « 0 avis » de sécurité, un « last chance » d'horaire de course. Une citation littéraire attribuée est
  signalée comme une citation de client, d'où le « à faire confirmer ».

```json
[
  {
    "domaine": "Faits commerciaux affichés (avis, prix barré, rareté, volume, santé) — à faire confirmer",
    "oracle": "oracles/oracle-faits-commerciaux.mjs",
    "type": "cli",
    "statut": "candidat",
    "extensions": [".html"],
    "fixtures": {
      "verte": "oracles/fixtures/faits-commerciaux/verte.html",
      "rouge": "oracles/fixtures/faits-commerciaux/rouge.html",
      "verte_piegeuse": "oracles/fixtures/faits-commerciaux/piegeuse.html"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-11-02", "mandat": "TF-2050", "amont": "décision D-132 (a) du 02/11/2026 ; voisin oracle-faits-sources de make-it-better (b29590c)" },
    "regles": 8
  }
]
```


## Entrée du 04/11/2026 — oracle-logo-petit (TF-2074)

**Statut d'usage de la forge : `candidat`.** Écrit et verrouillé au banc local (`self-test.mjs` : trois
paires de fixtures, un bloc d'isolation des règles et de remèdes joués). Son inscription au registre de
`quality-oracles` relève de la part forge-agents : ce fichier ne dit pas qu'elle est faite.

Le domaine que rien ne couvrait : **un logo SVG tient-il à la taille d'un onglet ?** Le 03/11/2026, l'essai
du skill logo-design-skill sur un produit en construction a vu son audit rendre 100/100 à trois SVG qui,
rendus à 16 px, se réduisaient à des points en diagonale. Cet audit juge la propreté du fichier ; `oracle-images`
juge alt, poids, réseau et variantes. Celui-ci rend le SVG dans Chromium à 16 et 32 px (fond transparent) et à
128 px (référence), et mesure sur les pixels. Critères et seuils figés dans l'en-tête de l'oracle :

| Règle | Critère mesurable | Sévérité |
|---|---|---|
| LP1 | part de l'encre plus fine qu'un pixel de la taille jugée (ouverture de la référence par un disque d'un pixel) : plus de 20 % | majeur à 16 px, avertissement à 32 px (de 5 à 20 % : avertissement à 16 px) |
| LP2 | nombre de pièces d'encre ou de trous différent de la référence ; un trou d'un seul pixel à 16 px | majeur à 16 px, avertissement à 32 px et pour le trou d'un pixel |
| LP3 | avec `--fond <#hex>` : part de l'encre à 16 px sous 3:1 de contraste WCAG avec ce fond : plus de 20 % | majeur |
| LP4 | aucun pixel d'opacité 25 % ou plus à 16 px ; pictogramme sur moins de la moitié de la boîte | majeur ; avertissement |
| LP5 | texte vivant `<text>` dans le SVG | avertissement |

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Logo : lisibilité d'un pictogramme SVG à 16 et 32 px | `node c:/dev/digit-ai-forge-design/oracles/oracle-logo-petit.mjs <logo.svg>… [--fond '#FFFFFF']… [--sortie <dossier>]` — LP1 trait plus fin qu'un pixel, LP2 détail fusionné ou perdu, LP3 contraste sur le fond déclaré, LP4 présence à 16 px, LP5 texte vivant | cli | candidat |

```json
[
  {
    "domaine": "Logo : lisibilité d'un pictogramme SVG à 16 et 32 px",
    "oracle": "oracles/oracle-logo-petit.mjs",
    "type": "cli",
    "statut": "candidat",
    "extensions": [".svg"],
    "fixtures": {
      "verte": "oracles/fixtures/logo-petit-verte.svg",
      "rouge": "oracles/fixtures/logo-petit-rouge-trait-fin.svg",
      "rouge_fusion": "oracles/fixtures/logo-petit-rouge-fusion.svg",
      "rouge_contraste": "oracles/fixtures/logo-petit-rouge-contraste.svg"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-11-04", "mandat": "TF-2074", "amont": "essai du skill logo-design-skill du 03/11/2026 (note 20261103b), décision D-156 (a)" },
    "regles": 5
  }
]
```

### Ce que cet oracle ne juge PAS

- Le **goût**, la distinction et la ressemblance avec une marque existante : un logo peut tenir à 16 px et
  être mauvais. Il juge si la forme survit, pas si elle est bonne ; `--sortie` écrit les PNG pour l'œil.
- La **lisibilité sémantique** : une lettre qui garde sa topologie peut se lire autre chose (« P! »).
- Les autres moteurs de rendu (Safari, Firefox, un favicon .ico) et les tailles autres que 16, 32 et 128 px.
- Mesure sur les trois logos de l'essai tels qu'ils sont dans le dossier de l'essai (état final, après l'épaississement
  du second tour d'après la note) : PASS pour A et C, avertissement LP2 pour B (trou d'un seul pixel), ce qui rejoint
  le « B reste faible à 16 px » de la note. Les fichiers du premier tour, ceux de l'audit à 100/100, n'ont pas été
  retrouvés : le refus de l'oracle sur eux n'est pas mesuré, seul l'est celui des fixtures.

## Entrée du 05/11/2026 — oracle-erreurs-formulaire et composant saisie-erreurs (TF-2172)

**Statut d'usage de la forge : `candidat`.** Écrit et verrouillé au banc local (`self-test.mjs` : une paire de
fixtures dans la matrice, un bloc de six rouges isolées et de remèdes joués). Il est enrôlé dans
`run-oracles-design.mjs` sur le chemin de `--instance`, comme `oracle-exploitabilite`. Son inscription au registre de
`quality-oracles` relève de la part forge-agents : ce fichier ne dit pas qu'elle est faite. La **version est minimale
et prouvée**, comme la décision du 05/11/2026 le pose.

Le domaine que rien ne couvrait : **où et comment une saisie refusée se dit**. Le 05/11/2026, à la demande du porteur,
une saisie refusée s'affichait en bandeau en tête de page, loin du formulaire, avec un code technique en titre
(« Refusé : CIBLE_INVALIDE »), sans désigner le champ ni la ligne fautive, avec un exemple générique, et seulement à
l'envoi. Le champ n'avait ni `aria-invalid` ni message relié. Les quinze juges de `run-oracles-design` avaient rendu PASS
sur ces écrans le 04/11 : aucun n'envoie une valeur fausse, aucun ne regarde où tombe l'erreur. L'oracle rend l'écran,
saisit une valeur fausse par champ (déclarée par `data-valeur-fausse`, ou dérivée de `pattern`, `type`, `min`, `max`,
`minlength`, `required`), quitte le champ, tente l'envoi, et mesure.

| Règle | Critère mesurable | Sévérité |
|---|---|---|
| EF0 | cible jugeable (HTTP < 400, pas de redirection) et au moins un champ éprouvable ; sinon SKIP, marqué `sans_objet` | SKIP exit 2 |
| EF1 | le champ porte `aria-invalid="true"` ET un message neuf visible relié par `aria-describedby` ou `aria-errormessage` ; un refus affiché ailleurs est cité | bloquant ; majeur si le message est relié sans `aria-invalid` |
| EF2 | message à 120 px au plus du champ (`--proximite`) et dans la fenêtre | majeur |
| EF3 | le message reprend la saisie ou donne la forme attendue (exemple, format, citation) | majeur si court ; avertissement si long et non reconnu |
| EF4 | aucune requête d'écriture ni navigation ne part avec la valeur fausse (les écritures sont interceptées et refusées) | bloquant |
| EF5 | le message paraît à la sortie du champ, pas seulement à l'envoi | avertissement |

Le composant qui fait passer l'oracle vit à `corpus/composants/saisie-erreurs.js` et `saisie-erreurs.css` : erreur sous
le champ, `aria-invalid`, `aria-describedby`, résumé d'erreurs à liens, vérification à la sortie du champ, effacement
dès la correction, envoi retenu tant qu'un champ est invalide, et `SaisieErreurs.refuser` pour un refus du serveur. Il
n'est **pas encore** au socle `digit-ai-page-html` (dépôt de forge-agents, hors du périmètre d'écriture de ce chantier) :
sa pose au socle et son sceau `COMPOSANT-EMBARQUE` restent à faire.

```json
[
  {
    "domaine": "Formulaire : une saisie refusée se dit sous son champ",
    "oracle": "oracles/oracle-erreurs-formulaire.mjs",
    "type": "cli",
    "statut": "candidat",
    "extensions": [".html"],
    "fixtures": {
      "verte": "oracles/fixtures/erreurs-formulaire-verte.html",
      "rouge": "oracles/fixtures/erreurs-formulaire-rouge.html"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-11-05", "mandat": "TF-2172", "amont": "demande du porteur du 05/11/2026, lot Produit-86 20261105a RP-12, décision « en version minimale prouvée »" },
    "regles": 6
  }
]
```

### Ce que cet oracle ne juge PAS

- Un refus **venu du serveur** : les requêtes d'écriture sont interceptées pour ne rien créer chez l'instance, donc la
  réponse d'un serveur n'est jamais observée. Le composant offre `SaisieErreurs.refuser` ; sa tenue se juge à la main.
- La **justesse** de l'exemple, la clarté de la cause, le ton : EF3 lit la présence d'une reprise ou d'une forme, par des
  formulations françaises reconnues (liste ouverte).
- Les **combinaisons** de champs, les erreurs croisées, les listes déroulantes, cases, boutons radio, dates et fichiers :
  une valeur fausse par champ, un champ à la fois, douze champs par écran au plus.
- Le **résumé d'erreurs** : rapporté (`mesures[].resume_liens`), non jugé.
- La règle d'écriture « un message d'erreur reprend la saisie et donne la forme corrigée » de `ECRITURE.md` du pilot : EF3
  la mesure sur l'écran rendu, mais son texte vit au pilot.

## Entrée du 09/11/2026 — oracle-erreurs-formulaire, la vérification au champ déclarée passe (TF-2307)

Le fait (lot Produit-81 du 09/11/2026). Un formulaire conforme demandait au serveur, à la sortie du champ, si la valeur
était acceptable (`POST /mandat/verifier`, qui n'écrit rien). L'oracle refusait toute requête POST pendant l'épreuve : le
champ ne recevait jamais la réponse, et la page rendait EF1 (champ non désigné) puis EF4 (l'envoi part, puisque le champ
n'était jamais invalide). Mesuré avant correction sur la fixture `erreurs-formulaire-verifier-verte.html` servie en
local : FAIL, EF1 et EF4 bloquants, 2 écritures interceptées. Après : PASS, 1 vérification passée, 0 écriture.

La règle, étroite. Une requête d'écriture passe si TOUT est vrai : POST ; émise par fetch ou XHR (donc jamais l'envoi natif
du formulaire, qui est une navigation) ; vers l'origine de la page ; sur un chemin qui n'est l'`action` d'aucun formulaire
de la page (un envoi par fetch vers une action en `/verifier` reste intercepté) ; et soit le chemin que déclare un
formulaire par `data-verifier="/chemin"`, soit un chemin dont le dernier segment est `verifier`. Tout le reste reste
intercepté et compte pour EF4. Les requêtes passées sont comptées à part (`mesures[].verifications_passees`) et dites au
non_juge : l'absence d'effet est la promesse du produit, l'oracle ne la prouve pas.

Ce que la forge prescrit, relu le 09/11/2026. Aucun document de forge-design ne prescrit la vérification au champ par une
requête sans effet : le composant `corpus/composants/saisie-erreurs.js` écrit au contraire qu'une règle qui n'existe que
côté serveur ne se vérifie qu'à l'envoi (`SaisieErreurs.refuser`). La forme décrite par le lot est donc une pratique de
produit que l'oracle accepte, pas une prescription de la forge ; le composant n'en est pas modifié.

La preuve vit dans `self-test.mjs`, bloc « oracle-erreurs-formulaire (TF-2307) » : deux sens verts (déclaration, convention du
dernier segment) et cinq rouges, chacune relue au JOURNAL des POST que le serveur de recette
(`oracles/lib/serveur-recette-verification.mjs`, 127.0.0.1) tient : vide pour une écriture non déclarée, un chemin que la
déclaration ne couvre pas, un envoi natif ou par fetch vers une action en `/verifier`, une vérification vers une autre
origine.

## Entrée du 09/11/2026 — run-oracles-design --origine, une page capturée est rendue autonome (TF-2309)

Le fait (lot Produit-81 du 09/11/2026). Une page capturée d'une instance servie garde ses feuilles de style et ses scripts en
ressources externes (`/assets/app.css`), introuvables à côté du fichier. Les oracles statiques jugeaient une page sans CSS ni
script, et `render_page.py` une copie aux liens cassés (un débordement factice de 737 px à 390 px). Le produit contournait par
un script d'intégration écrit chez lui, avant chaque passe.

Le remède vit dans `run-oracles-design`, pas dans un capteur à part : `--origine <url>` lit chaque ressource liée qui ne se
retrouve pas à côté du fichier et l'intègre à une copie temporaire (`lib/rendre-autonome.mjs`), avant la première passe ; les
oracles statiques et `--rendu` jugent cette copie, les constats citent la capture, rien n'est écrit à côté de la cible. La
borne est la boucle locale (`localhost`, `127.0.0.1`, `::1`) : une `--origine` d'un autre hôte est refusée (SKIP exit 2), une
ressource d'un hôte tiers n'est jamais lue, une redirection n'est pas suivie. Avec une origine, une adresse « racine du site »
se lit à l'origine (le servi fait foi) et non dans un fichier de même chemin trouvé en remontant l'arborescence. Une page déjà
autonome, ou dont les liens se résolvent sur le disque, repart octet pour octet : le comportement d'avant ne change pas.

Mesuré avant et après sur la fixture `fixtures/capture-externe/capture.html`, la page `motion-verte.html` dont le style est sorti
en feuille liée et à laquelle un script lié est ajouté : sans l'option (ou sur l'état de départ), `oracle-tokens` FAIL, verdict
FAIL ; avec `--origine` servie par la recette, PASS, avec le même verdict par oracle que la page autonome d'origine. Sur
`capture-rendu.html`, `render_page` rend sans la feuille un débordement (V1, `scrollWidth 551px > viewport 390px`, clair et
sombre) et, avec la feuille lue à l'origine, PASS sans écart dur.

Ce que l'intégration ne fait PAS, dit au non_juge de chaque passe : les images, les polices, les `@import` et les imports
relatifs d'un module ne sont pas intégrés ; une ressource derrière une connexion n'est pas lue (aucun état de connexion
n'est transmis, elle reste liée et dite) ; la page n'est pas capturée par la forge, elle est fournie. Le capteur qui produirait
la page depuis une URL et un état de connexion n'est pas écrit : la décision du 09/11/2026 place le remède dans l'oracle.
La preuve vit dans `self-test.mjs`, bloc « run-oracles-design --origine (TF-2309) » : dix cas de lib sans réseau (lecture
injectée, la borne du tiers se prouve par ce que la lecture n'a PAS reçu) et, de bout en bout contre le serveur de recette
(`oracles/lib/serveur-recette-verification.mjs`), cinq cas de capture et deux de rendu.

## Entrée du 09/11/2026 — oracle-slop S11 et S12, deux signes du skill tiers « unslop »

Voie taste-skill, sans rien installer. Essai court choisi par le porteur le 09/11/2026, suite du tri des favoris TikTok du pilot. Sur les 9 signes que nomme la description d’unslop, 4 étaient couverts par S2, S5 et S6 ; 2 entrent en **avertissement** dans `oracle-slop`, et 3 sont écartés. Attribution CC BY 4.0, table de disposition, mesure et signes écartés : [regles-importees-unslop.md](regles-importees-unslop.md).

| Règle | Oracle | Défaut visé |
|---|---|---|
| S11 | `oracle-slop` | halo coloré : ombre sans décalage, flou de 12px au moins, couleur saturée (CSS, `drop-shadow`, classe Tailwind `shadow-[0_0_…]`) |
| S12 | `oracle-slop` | forme floue : `filter: blur()` de 20px au moins, ou classes `blur-xl` à `blur-3xl` |

Bruit mesuré le 09/11/2026 sur 2 799 pages uniques de `C:dev`, avant l’inscription : S11 0 constat, S12 13 constats, tous vrais à la lecture. Aucun verdict ne change : les deux règles avertissent. Preuves : 2 paires de fixtures, verrouillées par le bloc « oracle-slop S11 et S12 (essai unslop du 09/11/2026) » de `self-test.mjs`.

## Entrée du 10/11/2026 — oracle-document-imprime, les supports sans CSS : PPTX et PDF (TF-2386, TF-2385)

**Statut d'usage de la forge : `candidat`.** Écrit et verrouillé au banc local (`self-test.mjs` : trois CAS de fixtures
vertes et rouges, un bloc de 25 vérifications d'isolation des règles, de seuils, d'exemptions et de portes). Son inscription
au registre de `quality-oracles` relève de la part forge-agents : ce fichier ne dit pas qu'elle est faite.

Le domaine que rien ne couvrait : **un deck PPTX ou un PDF imprimé tient-il les contrôles de la critique d'implémentation ?**
Le 29/09/2026, le relecteur du deck d'une propale a mesuré à la main sur la géométrie du PPTX le motif S1 d'`oracle-slop`
(une forme de moins de 0,1 po accolée à un bloc) et écrit ses propres scripts de contraste et de débordement : tous les
oracles de la forge lisent du HTML (TF-2386). Le 28/09/2026, la page 1 d'un dossier de compétences imprimé laissait 19,8 mm
de vide sous les cartes (5,3 mm sur la version du 25/09), vu par la seule sonde de la critique, qui note aussi que
l'émulation d'impression de Playwright place les cartes 2,2 mm plus haut que l'impression Chrome (TF-2385).

L'oracle lit la géométrie du rendu en points (`lib/lire_document_imprime.py` : PyMuPDF pour un PDF, python-pptx pour un
PPTX) et juge cinq règles. Une page HTML est d'abord imprimée en PDF par Chromium (`lib/imprimer_page.py`). Les seuils de
DP1 à DP3 sont ceux de la norme ou de la règle S1 ; celui de DP4 et DP5 est un réglage de la forge (10 mm, `--seuil-mm`),
posé entre les deux mesures du retour.

| Règle | Critère mesurable | Sévérité |
|---|---|---|
| DP1 | forme pleine de 1,5 pt (2 px) à moins de 0,1 po de large, plus haute que large, dont un bord touche (à 3 pt) le bord gauche ou droit d'un bloc sur 60 % de sa hauteur : le bandeau latéral du motif S1 | bloquant |
| DP2 | contraste d'un texte contre l'aplat qui le porte sous 4.5:1, ou 3:1 pour un grand texte (18 pt, ou 14 pt gras) | majeur |
| DP3 | texte ou image qui sort de la page ; texte PDF qui dépasse du bloc qui le porte ; texte PPTX dont la hauteur estimée dépasse sa boîte | majeur ; avertissement pour l'estimation |
| DP4 | PDF : les pieds de deux colonnes côte à côte diffèrent de plus du seuil | majeur |
| DP5 | PDF : une page suivie d'une autre s'arrête plus haut que la page la plus pleine, de plus du seuil | majeur |

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Support imprimé ou projeté : PPTX et PDF | `node c:/dev/digit-ai-forge-design/oracles/oracle-document-imprime.mjs <fichier.pptx\|.pdf\|.html> [--seuil-mm 10] [--pages-libres 1,4]` — DP1 forme accolée à un bloc, DP2 contraste, DP3 débordement, DP4 équilibre des colonnes, DP5 vide sous le contenu | cli | candidat |

```json
[
  {
    "domaine": "Support imprimé ou projeté : PPTX et PDF",
    "oracle": "oracles/oracle-document-imprime.mjs",
    "type": "cli",
    "statut": "candidat",
    "extensions": [".pptx", ".pdf"],
    "fixtures": {
      "verte": "oracles/fixtures/document-imprime/deck-verte.pptx",
      "rouge": "oracles/fixtures/document-imprime/deck-rouge.pptx",
      "verte_pdf": "oracles/fixtures/document-imprime/livret-verte.pdf",
      "rouge_pdf": "oracles/fixtures/document-imprime/livret-rouge.pdf",
      "verte_filet": "oracles/fixtures/document-imprime/filet-verte.pdf",
      "verte_colonnes": "oracles/fixtures/document-imprime/colonnes-verte.pdf",
      "rouge_colonnes": "oracles/fixtures/document-imprime/colonnes-rouge.pdf"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-11-10", "mandat": "TF-2386, TF-2385", "amont": "retours du 28 et 29/09/2026 (RV-205, RV-206), campagne du 10/11/2026" },
    "regles": 5
  }
]
```

### Ce que cet oracle ne juge PAS

- Le **rendu réel d'un PPTX** : polices de remplacement, retours à la ligne, ordre de superposition exact. La hauteur d'un
  texte PPTX est ESTIMÉE (largeur moyenne des signes) et dite telle ; l'export PDF depuis le logiciel de présentation, rejoué
  ici, est la mesure.
- Un PDF dont l'**ordre de peinture** entre texte et aplat n'est pas lu : le texte est supposé au-dessus des aplats qui le
  contiennent ; un texte sur une image, un dégradé ou un aplat translucide n'a pas de fond mesurable et est compté à part.
- Un **vide voulu** : un saut de page par section produit le vide de DP5. Seule la déclaration `--pages-libres` l'exempte,
  jamais la forme de la page. Le seuil de 10 mm est un réglage de la forge, à réviser sur les retours des produits.
- L'**impression du navigateur du lecteur** : le PDF produit pour une page HTML est celui de Chromium, qui n'est pas l'impression
  Chrome (2,2 mm d'écart mesurés le 28/09/2026 entre l'émulation d'impression de Playwright et elle). Pour un pied de page
  au millimètre, fournir le PDF imprimé depuis le navigateur.
- La **lisibilité sémantique** : ordre de lecture, balisage PDF/UA, texte alternatif, langue.
- Les **tableaux PPTX**, dont les cellules ne sont pas lues, et les couleurs de thème à luminosité modifiée, approchées.

## Entrée du 10/11/2026 — oracle-clip, le clip de présentation (TF-2405)

**Statut d'usage de la forge : `candidat`.** Écrit et verrouillé au banc local (`self-test.mjs` : un CAS de fixtures verte et
rouge, et un bloc de 36 vérifications d'isolation des règles, de portes, de SKIP sans ffprobe et de remèdes joués ;
`self-test-regles-jouees.mjs` : sa ligne « sans écart » dérivée de sa liste). Son inscription au registre de `quality-oracles`
relève de la part forge-agents : ce fichier ne dit pas qu'elle est faite.

Le domaine que rien ne couvrait : **un clip de présentation tient-il son format, ses preuves et sa marque ?** `oracle-motion`
juge les transitions d'une interface, pas une vidéo. Les 28 clips de motion design rendus chez un produit les 09 et 10/11/2026
n'avaient pour contrôles que `ffprobe` lancé à la main, la lecture des planches et `run-oracles-design` sur la page, qui ne lit
ni le canvas ni le MP4 ; leurs étiquettes de 17 à 19 px et les 6 défauts de la bibliothèque ont été trouvés par les agents de
la série. L'oracle juge le dossier d'un clip du skill `clip-de-presentation` : la source `clip.html` par un tokeniseur
JavaScript (chaînes, gabarits, commentaires et expressions régulières séparés), `STORYBOARD.md`, les planches, et le MP4 par
`ffprobe` (`lib/ffprobe.mjs` : `--ffprobe`, variable `FFPROBE`, PATH, puis `python -c "import static_ffmpeg"`).

| Règle | Critère mesurable | Sévérité |
|---|---|---|
| CL1 | MP4 lu par ffprobe : durée égale à `window.DUREE` plus l'introduction déclarée (6 s par défaut) à 0,25 s près ; 1920 × 1080 ; 30 i/s ; H.264 `yuv420p` ; une piste AAC. Sans ffprobe : SKIP motivé de la règle, verdict jamais PASS | majeur |
| CL2 | `STORYBOARD.md` présent ; planches `planche*.jpg` ou `.png` lisibles ; table de preuves à colonne « statut » ; 3 planches au moins | majeur ; avertissement pour la table et pour moins de 3 planches |
| CL3 | budgets de caractères : titre de l'introduction 30, phrase 90, étape 16 et 6 étapes au plus, légende 61, ligne du titre de fin 40 et 2 lignes au plus | majeur |
| CL4 | étiquette à chasse fixe sous 24 px : taille écrite d'un `M.puce`, défaut de `M.puce` dans la bibliothèque chargée, `F.mono(n)`, police littérale à chasse fixe ; un texte d'une autre police sous 24 px | majeur ; avertissement pour l'autre police |
| CL5 | nombre écrit dans un texte du script, qu'aucune ligne datée de la table de preuves (statut « attestée » ou « partielle ») n'atteste, sans l'étiquette « exemple » dans la source | majeur |
| CL6 | littéral d'image de logo, adresse ou nom de la marque déclarée, dans le script du clip ou dans sa bibliothèque ; déclaration de marque illisible ; logo déclaré introuvable ; aucune déclaration | majeur ; avertissement sans déclaration |
| CL7 | `Math.random`, `Date.now`, `performance.now` ou `new Date` dans le script du clip | majeur |

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Clip de présentation : format, preuves et marque | `node c:/dev/digit-ai-forge-design/oracles/oracle-clip.mjs <dossier du clip> [--mp4 <clip.mp4>] [--ffprobe <chemin>]` — CL1 MP4 par ffprobe, CL2 pièces de contrôle, CL3 budgets des textes, CL4 étiquettes de 24 px, CL5 chiffres de décor, CL6 marque en paramètre, CL7 rendu déterministe | cli | candidat |

```json
[
  {
    "domaine": "Clip de présentation : format, preuves et marque",
    "oracle": "oracles/oracle-clip.mjs",
    "type": "cli",
    "statut": "candidat",
    "extensions": [".html", ".mp4"],
    "fixtures": {
      "verte": "oracles/fixtures/clip/verte",
      "rouge": "oracles/fixtures/clip/rouge"
    },
    "provenance": { "chantier": "forge-design", "date": "2026-11-10", "mandat": "TF-2405", "amont": "étude 20261110c, verdict O1 ; décision D-203 (a) du 10/11/2026" },
    "regles": 7
  }
]
```

Mesure sur le clip « ingénierie logicielle en récit client » du produit qui a commandé la série, joué en lecture seule le
10/11/2026 avec son MP4 : FAIL, 29 constats. CL4 : 21 majeurs (11 étiquettes `M.puce` de 17 à 20 px, 10 textes `F.mono` de
14 à 19 px) et 1 avertissement ; CL5 : 3 chiffres de décor sans « exemple » (« 10 000 lignes < 5 s », « réponse < 1 s »,
« 360 px, 0 débordement ») ; CL6 : le logo codé en dur dans le clip et l'adresse codée en dur dans l'ancienne bibliothèque,
plus l'absence de déclaration ; CL2 : storyboard sans table de preuves. CL1, CL3 et CL7 sans écart : 66,000 s pour 60 + 6
annoncées, 1920 × 1080, 30 i/s, H.264 `yuv420p`, AAC.

### Ce que cet oracle ne juge PAS

- La **qualité de l'image** : mouvement, rythme, lisibilité, chevauchements, contraste et métaphore de chaque plan. Elle se lit
  sur les planches, par un humain ou par `critique-le-design`.
- La **taille rendue** d'une étiquette : CL4 lit la taille écrite, et une étiquette de 24 px sous un zoom de caméra de 0,4 n'en
  fait plus que 10 ; une taille calculée n'est pas résolue.
- Un **nombre calculé** à l'exécution, un littéral fait de chiffres seuls, une date, un numéro d'ordre ; ni la co-présence à
  l'écran du chiffre et de son étiquette « exemple », ni la vérité d'une preuve attestée.
- Un **texte construit** à l'exécution, ou écrit dans un format autre que ceux du skill et de la série d'origine.
- Le **contenu du MP4** : images, synchronisation avec les impacts de la musique, niveau sonore.
- La **fraîcheur** des planches par rapport au clip, et leur lecture.

## Entrée du 12/11/2026 — un composant du socle servi est imputé au socle, comme le bloc scellé (TF-2430)

Le fait (lot Produit-82 du 10/11/2026). Sur une page capturée d'une application servie, `run-oracles-design --origine` disait « fantômes » sept boutons que le composant `table-filters.css` du socle habille : la règle `.tf-actions button { background: none; border: none }` s'apparie à tout bouton, l'appariement ne remontant pas les ancêtres. La contre-épreuve sans cette feuille rendait PASS. La même feuille posée en bloc `COMPOSANT-EMBARQUE` scellé était imputée au socle (TF-0830) : seul le bloc scellé était reconnu, et `--origine` (TF-2309) rend la feuille liée en `<style data-origine="…">`, sans marqueur ni sceau.

Le remède vit dans `oracles/lib/socle.mjs`, fonction `blocsServis`. Un bloc intégré à l'origine est confronté à la source du socle installée qui porte le même nom de fichier (`/assets/table-filters.css` donne `table-filters.css`). Faute de sceau, la preuve est le contenu : identique, `url(…)` mis à part (l'intégration les rend absolus), le bloc sort du verdict comme un bloc scellé juste, ses constats restent rendus dans `socle_exempte.findings`, et `socle_exempte.verifies[]` porte `origine` et `reconnu_par: "contenu"`. Le nom seul n'exempte rien : un homonyme édité ou périmé est **déclaré** (`socle_exempte.declares[]`, ligne au `non_juge`) et reste jugé comme le CSS de l'auteur ; un fichier dont le nom n'est pas celui d'un composant du socle reste à l'auteur sans être déclaré. Le script lié (`table-filters.js`) suit la même règle. Aucun `createHash` neuf : la comparaison réutilise `sha` de `lib/socle.mjs`, déjà déclaré.

Mesuré le 12/11/2026 sur `fixtures/capture-socle/capture.html` (un bouton à fonctionnalité déclarée, la feuille et le script du socle servis par la recette) : avant, la page servie rendait FAIL exit 1 (DE3 à l'auteur) et la même page à bloc scellé PASS exit 0 (DE3 mis au compte du socle) ; après, la page servie rend PASS exit 0, DE3 est dans `socle_exempte.findings`, deux composants reconnus au contenu. La preuve vit dans `self-test.mjs`, bloc « run-oracles-design --origine (TF-2430) » : un témoin (socle introuvable, FAIL), un sens vert à trois lignes, trois sens rouges (composants édités sous le même nom, même règle dans une feuille de l'auteur sous un autre nom, bouton fantôme de l'auteur sur une page dont le composant est reconnu).

Ce que le remède ne fait PAS : une version du composant plus ancienne que le socle installé n'est pas reconnue (elle est déclarée « différent de la source », le produit resynchronise sa copie) ; un composant renommé par le produit n'est pas reconnu ; une feuille servie qui n'est pas intégrée (`--origine` absent, ressource d'un hôte tiers) reste liée et jugée sans elle.

## Entrée du 12/11/2026 — run-oracles-design ne lit plus le .env du dossier courant (TF-2431)

Le fait (lot Produit-82 du 10/11/2026). La racine de forge se cherchait aussi dans le `.env` du dossier courant : le même fichier et la même commande rendaient SKIP exit 2 ou PASS exit 0 selon le dossier de lancement. Mesuré le 12/11/2026 sur `fixtures/motion-verte.html`, sans `FORGE_DESIGN_ROOT` dans l'environnement : exit 2 depuis un dossier dont le `.env` nomme une autre racine (racine lue : ce dossier), exit 0 depuis un dossier neutre.

Le remède : `racineDeForge()` lit `--racine`, puis `$FORGE_DESIGN_ROOT`, puis le `.env` de la forge elle-même (dossier parent du script, lieu fixe de l'installation que le README et les skills documentent), puis le dossier parent du script. Le `.env` du dossier courant n'est plus lu. La preuve vit dans `self-test.mjs`, bloc « run-oracles-design · racine de forge (TF-2431) » : le même appel depuis un dossier neutre et depuis un dossier au `.env` hostile rend le même verdict, la même racine et le même exit ; `--racine` et `$FORGE_DESIGN_ROOT` restent honorés depuis ce dossier ; un verrou refuse tout `process.cwd()` dans le lanceur.

Reste hors de portée de la décision : le choix de l'interpréteur de `--rendu` retombe sur l'environnement `uv` du dossier courant quand le Python du PATH n'a pas playwright (`lib/rendu.mjs`, TF-1674). C'est le geste voulu de TF-1674, il est dit au `non_juge` (« rendu par l'interpréteur de l'environnement uv du dossier courant »), et le retirer casserait les produits qui lancent la critique depuis leur dossier. Retiré depuis par TF-2461 (entrée du 12/11/2026 ci-dessous) : `$FORGE_DESIGN_PYTHON` remplace ce repli, et le `non_juge` cité ici n'existe plus.

## Entrée du 12/11/2026 — --statut-attendu, un écran d'état voulu est jugé (TF-2432)

Le fait (lot Produit-82 du 10/11/2026). L'écran « Page introuvable » d'une application, servi avec son 404, rendait SKIP exit 2 (X0 : réponse HTTP 404, écran non jugé). Tout juge qui lit une instance refuse une réponse en 400 ou plus, et aucune critique d'implémentation ne jugeait donc les écrans d'état.

Le remède : `run-oracles-design --instance <url> --statut-attendu <code>` annonce que l'instance est un écran d'état voulu. Servie avec ce code, elle est jugée comme un écran par les quatre juges qui lisent l'instance (`oracle-exploitabilite`, `oracle-erreurs-formulaire`, `oracle-faits-commerciaux`, `oracle-valeur-affichee`, qui prennent la même option) ; servie avec un autre code, y compris 200, elle reste refusée (X0, EF0, SKIP exit 2). Sans l'option, toute réponse en 400 ou plus reste refusée comme avant. La valeur est un code de trois chiffres, refusée sinon (SKIP exit 2) ; sans `--instance`, l'option est dite sans effet au `non_juge`. Le code vit dans `oracles/lib/statut-attendu.mjs`. Un écran d'état jugé répond aux règles d'un écran d'application : X8 et X9 lui sont dues sauf s'il se déclare éditorial ou pose leur écart motivé.

Mesuré le 12/11/2026 sur un serveur de recette qui rend une page « Page introuvable » en 404 : sans l'option, SKIP exit 2 (X0) ; avec `--statut-attendu 404`, PASS exit 0 sans juge en SKIP ; la même page avec une valeur machine brute rend FAIL exit 1 (X3) ; annoncée 410, ou servie en 200 alors qu'on annonce 404, elle reste refusée (SKIP exit 2). La preuve vit dans `self-test.mjs`, bloc « run-oracles-design --statut-attendu (TF-2432) » : huit lignes, un témoin, trois sens verts, quatre sens rouges.

Ce que l'option ne fait PAS : une seule valeur par appel (des écrans de codes différents se jouent en appels séparés) ; elle ne juge pas que le code est le bon pour l'écran, c'est l'appelant qui l'annonce ; les 404 d'une cible fichier ne sont pas concernés (l'option vaut pour `--instance`).

## Entrée du 12/11/2026 — l'interpréteur du rendu ne se devine plus dans le dossier courant (TF-2461)

Le fait. TF-1674 avait ouvert `--rendu` aux produits dont playwright vit dans un environnement `uv` en interrogeant `uv run python` DANS LE DOSSIER COURANT : le même fichier et la même commande se rendaient avec un autre interpréteur, ou en SKIP, selon le dossier de lancement, comme TF-2431 l'avait montré pour la racine. L'entrée de TF-2431 ci-dessus laissait ce repli hors de portée ; TF-2461 le retire.

Le remède : `detecterOutillageRendu()` (`lib/rendu.mjs`) cherche l'interpréteur dans cet ordre, sans jamais lire le dossier courant ni lancer `uv`. 1) `$FORGE_DESIGN_PYTHON`, choix explicite : posée sur un interpréteur sans playwright ou sur un chemin absent, elle donne un manque motivé, jamais un autre interpréteur à sa place. 2) `python` puis `python3` du PATH avec playwright. 3) `.venv` sous la racine de la forge. Un produit dont playwright vit dans un environnement `uv` pose la variable sur son interpréteur ; le message du manque le dit. Les six consommateurs (`run-oracles-design --rendu`, `oracle-baseline`, `oracle-erreurs-formulaire`, `oracle-exploitabilite`, `oracle-logo-petit`, `rendu-comparatif`) écrivent au `non_juge` « rendu joué par l'interpréteur <chemin> (<d'où il vient>) » à chaque rendu, plus seulement pour uv.

Mesuré le 12/11/2026. Avant : avec un PATH sans playwright, la même détection rendait `C:/produit-A/.venv/Scripts/python.exe via uv` depuis un dossier et `python via PATH` plus un manque depuis l'autre (sondes injectées, rejouées sur le code de `main` avant correction). Après, de bout en bout sur le poste, PATH vidé : depuis un dossier neutre et depuis un dossier portant un faux environnement uv, la détection rend le même JSON, SKIP motivé sans variable, `via variable` avec elle ; `run-oracles-design --rendu` nomme l'interpréteur une seule fois au `non_juge`. La preuve vit dans `self-test.mjs`, blocs « lib/rendu.mjs choisirInterpreteur (TF-2461) » (3 sens verts, 4 sens rouges, 3 lignes de forme dont un verrou) et « lib/rendu.mjs detecterOutillageRendu (TF-2461) » (2 sens rouges, 1 sens vert, 2 lignes de rapport).

Ce que le remède ne fait PAS : un produit qui lançait la critique depuis son dossier avec playwright seulement dans son environnement uv rend SKIP tant qu'il n'a pas posé `$FORGE_DESIGN_PYTHON` ; `.venv` sous la racine de la forge n'est cherché que là, jamais sous le dossier du produit. Le chemin de l'interpréteur au `non_juge` peut porter le nom de l'utilisateur du poste : il se lit au rapport, il ne s'écrit pas dans un dépôt public.

## Entrée du 13/11/2026 — trois oracles reçoivent leur appelant : barre externe, liste de la demande, textes d'application (TF-2466)

Le fait (relevé du 12/11/2026 par la barrière de TF-2452). Sur les douze oracles publiés du parc qu'aucun fichier exécutable n'appelait, quatre sont de cette forge. Trois étaient pourtant prescrits par un skill : `oracle-barre-externe` (étape 0 de `systeme-de-marque`), `oracle-liste-demande` (la revue de `critique-le-design`) et `oracle-textes-application` (C14 de `ameliore-le-design`, joué avant C15, et D7 de `critique-le-design`). Une doctrine qui prescrit un contrôle n'est pas un appel : `relever-appelants` du pilot ne leur en trouvait aucun, et passé à `run-oracles-design.mjs`, un `.md` partait aux juges HTML et rendait un verdict sur du bruit.

Le remède : `run-oracles-design.mjs` est l'appelant, comme il l'est déjà des juges de page de la forge. `--barre-externe <BARRE-EXTERNE.md> [--minimum N]` et `--liste-demande <REVUE.md>` sont deux modes de document, sur le modèle de `--corpus` et `--dtcg` : le seul oracle du document est joué, son verdict est rendu avec son exit. Un verdict qui n'est ni PASS ni FAIL (`sans_objet` : la revue n'a pas de section « Liste de contrôle de la demande » ; `donnees_insuffisantes`) se rend SKIP exit 2 et le dit. `oracle-textes-application` entre dans la passe de toute page classée application (déclaration, marqueur de structure ou `--type-page`, comme pour X7) ; sur une page éditoriale ou non classée, et sur une page d'application dont aucune chaîne n'est extractible, il est dit SANS OBJET au `non_juge` avec son remède et ne fait pas tomber l'agrégat en SKIP.

Mesuré le 13/11/2026. Avant : `relever-appelants --racine .` rendait 6 contrôles sans appelant, dont ces trois ; la page d'application `textes-application-carte-choix-rouge.html` (état vide « Aucune donnée ») passait la passe sans que T4 soit joué ; `--barre-externe` n'existait pas et le relevé rouge passé en cible recevait les juges HTML. Après : T4-2 FAIL exit 1 sur la même page, PASS sur sa jumelle verte, `--barre-externe` rend B2, B3, B4 sur le relevé rouge et PASS sur le vert, `--liste-demande` rend D1, D2, D3 puis D4, D5 sur les deux revues rouges. La preuve vit dans `self-test.mjs`, bloc « run-oracles-design --barre-externe, --liste-demande et textes-application (TF-2466) » : quatorze lignes, six sens verts, huit sens rouges.

Ce que le remède ne fait PAS : `oracle-coherence-promesse` n'a ici aucun consommateur (aucun skill, aucun document de la forge ou du pilot ne prescrit de confronter une page à `CONSTITUTION.md`) ; il n'est donc pas câblé, et reste un outil manuel. Les skills gardent leur commande directe (`node oracles/oracle-….mjs`) : elle reste valable, le point d'entrée est une seconde voie. Les chaînes qu'un script rend ou qu'une API sert ne sont toujours pas jugées par T4.
