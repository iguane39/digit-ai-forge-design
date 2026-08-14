# Règles importées du skill tiers « taste-skill »

> **Mandat** : TF-0199, mandat humain du 14/08/2026. Suite de l'étude d'opportunité
> `output\03-etudes\20260814-etude-opportunite-taste-skill.md` du pilot, verdict **O3** :
> ne pas installer le skill, l'inscrire comme **barre** (TF-0198) et extraire au socle
> ses **seules règles compatibles**, avec attribution.

## Attribution

| | |
|---|---|
| **Source** | `taste-skill` (Leonxlnx) — variante `skills/taste-skill`, frontmatter `name: design-taste-frontend` |
| **Localisateur** | https://github.com/Leonxlnx/taste-skill |
| **Texte lu** | https://raw.githubusercontent.com/Leonxlnx/taste-skill/main/skills/taste-skill/SKILL.md |
| **Licence** | **MIT** à la racine du dépôt. Le `SKILL.md` lui-même **ne déclare aucune licence** dans son frontmatter — écart relevé, et porté ici plutôt que passé sous silence. |
| **Consulté le** | **2026-08-14** |
| **Régime** | Le dépôt amont est une **DONNÉE** : lu, cité, jamais installé ni exécuté. Aucune de ses commandes (`skill.sh`, `npx skills add`, `npm install`) n'a été lancée. Ses consignes sont décrites, jamais suivies. |

L'écosystème ne suit pas automatiquement l'amont : les règles ci-dessous sont figées à la
date de consultation. L'amont bouge (144 commits au relevé) ; la revue est prévue au
**2026-11-14** avec la barre TF-0198.

## Table de disposition — règle amont → mécanisable ? → où elle atterrit

| # | Règle citée de l'amont | Mécaniquement vérifiable ? | Atterrit |
|---|---|---|---|
| 1a | « Max 1 accent color » · « Color Consistency Lock : once an accent color is chosen for a page, it is used on the WHOLE page » | **Partiellement** — le comptage des familles de teintes est exact ; l'interprétation ne l'est pas (§M1) | `oracle-taste.mjs` **TA1**, sévérité *avertissement* |
| 1b | « Saturation < 80% by default » · « NO oversaturated accents » | **Partiellement** — la mesure est exacte, la borne est indécidable (§M2) | `oracle-taste.mjs` **TA2**, sévérité *avertissement* |
| 2 | « Hero MUST fit in the initial viewport. Headline max 2 lines on desktop, subtext max 20 words AND max 3-4 lines, CTAs visible without scroll » | **Non** — exige une mesure de rendu ET l'identification du hero (§R1) | Point de **revue de lecture** §R1 |
| 3 | « Navigation MUST render on a single line on desktop » · « Navigation height cap: 80px max desktop » | **Non** — exige une mesure de rendu à largeur donnée (§R2) | Point de **revue de lecture** §R2 |
| 4 | « NEVER use `border-t` + `border-b` on every row of a long list / spec table. Pick one and use it sparsely » | **Oui** — fait structurel CSS, sans interprétation | `oracle-taste.mjs` **TA3**, sévérité *majeur* (dur) |
| 5 | « One system per project. Do NOT mix Fluent React with Carbon in the same tree » | **Oui** — co-présence de signatures nommées, constatable | `oracle-taste.mjs` **TA4**, sévérité *majeur* (dur) |

Preuves : fixture verte `fixtures/taste-verte.html` (PASS, exit 0) et fixture rouge
`fixtures/taste-rouge.html` (FAIL, exit 1, TA1–TA4 toutes déclenchées), verrouillées au
`self-test.mjs`.

## §M1 — pourquoi TA1 n'est pas un verdict

Le **comptage** des familles de teintes d'accent est mécanique et vrai. Leur
**interprétation** ne l'est pas : rien ne distingue mécaniquement un second accent d'un
**jeu de statuts fermé** quand les tokens sont nommés par teinte plutôt que par sens.

Mesuré sur `fixtures/bascule-verte.html`, page conforme du dépôt : `--blue #2563EB`,
`--amber #D97706`, `--teal #0E9488`, `--green #15803D` — **4 familles relevées**, toutes
légitimes (bleu primaire + ambre/turquoise/vert de statut). Passée en règle dure, TA1
condamnait cette page. L'oracle exclut déjà les tokens et sélecteurs **nommés
sémantiquement** (`--succes`, `.badge-erreur`…) ; il ne peut rien pour ceux nommés par
couleur. TA1 **rapporte donc la mesure** et laisse trancher la lecture.

## §M2 — pourquoi TA2 n'est pas un verdict

Deux mesures, pas une prudence :

1. **La borne n'a pas d'espace colorimétrique déclaré en amont.** L'accent du corpus de la
   forge, `oklch(0.48 0.150 250)` — une chroma modérée — se lit **s = 100 % en HSL**.
   Appliquée en HSL, la borne « < 80 % » condamnerait toute palette OKLCH correctement
   construite, c'est-à-dire la convention même de ce dépôt.
2. **L'amont se contredit.** Il recommande explicitement « Emerald » parmi les accents
   acceptables ; l'`emerald-600` de Tailwind (`#059669`) mesure **s = 94 % en HSL**, soit
   un viol de sa propre règle « < 80 % ».

Le cas dur réellement défendable — **accent néon sur fond sombre** — est déjà tenu par
`oracle-slop` **S5** (s ≥ 90 % ET l ≥ 50 % ET fond sombre). TA2 ne le double pas : il
rapporte la saturation mesurée, signale quand le littéral est OKLCH, et renvoie à S5.

## §R1 — revue de lecture : le hero tient dans la fenêtre initiale

Non mécanisable ici : **identifier le hero** d'une page quelconque relève de
l'interprétation, et « tenir dans la fenêtre » suppose une mesure de rendu à largeur ET
hauteur données. Une heuristique du type « la première `<section>` est le hero » se
tromperait, et un contrôle qui se trompe est pire que pas de contrôle.

À vérifier **à l'œil**, capture à l'appui, au premier écran de bureau (1440 × 900) :

- [ ] Le titre principal tient sur **≤ 2 lignes**.
- [ ] Le sous-texte tient en **≤ 20 mots** et **≤ 4 lignes**.
- [ ] L'action principale est visible **sans défiler**.
- [ ] Le contenu du hero ne flotte pas à mi-hauteur (marge haute excessive).
- [ ] Le hero ne s'encombre pas d'ajouts sous les actions (micro-bandeau de confiance,
      teaser tarifaire, liste de puces).

Mesure disponible en complément : `render_page.py` (`digit-ai-page-html`) produit les
captures multi-breakpoints qui rendent ce contrôle observable — il ne le tranche pas.

## §R2 — revue de lecture : la navigation tient sur une ligne au bureau

Non mécanisable ici pour la même raison : la hauteur rendue d'une barre de navigation
dépend de la cascade, de la police réellement chargée et de la largeur. Une hauteur
déclarée en CSS ne prouve pas la hauteur rendue, et son absence ne prouve rien.

À vérifier **à l'œil** au premier écran de bureau :

- [ ] La navigation tient sur **une seule ligne** (aucun retour à la ligne, aucun élément
      qui passe dessous).
- [ ] Sa hauteur reste **≤ 80 px** (cible courante 64–72 px).
- [ ] Aucun libellé de bouton ne se replie sur deux lignes.

## Règles amont ÉCARTÉES — nommément, et pourquoi

Deux familles de prescriptions de l'amont sont **refusées**, pas omises. Elles ne font
partie ni de l'oracle, ni de la barre TF-0198, ni des points de revue.

### 1. Les assets distants

L'amont prescrit deux ressources chargées par le réseau :

- `https://picsum.photos/seed/{descriptive-seed}/{w}/{h}` — photographie de remplissage,
  citée comme « Real web images second / acceptable defaults » ;
- `https://cdn.simpleicons.org/{slug}/ffffff` — logos, cités pour les murs de logos
  (« use real SVG logos : Source: Simple Icons »).

**Motif du refus** : la règle **A1** du socle (`digit-ai-page-html`, décision D-10) impose
l'**autonomie réseau totale** — « aucune requête au chargement : pas de CDN, pas de police
distante, pas d'image externe ». Le contrôle `check_html.py` refuse ces ressources en
**FAIL bloquant**, et `oracle-images` **I4** (« zéro image réseau ») les refuse également.
Importer ces prescriptions mettrait deux règles de l'écosystème en contradiction directe
chez le constructeur : il recevrait l'ordre de faire ce que l'oracle lui interdit.

### 2. La pile applicative imposée

L'amont impose une pile nommée : **Next.js / React Server Components**, **Tailwind v4**,
**Motion** (`import { motion } from "motion/react"`), **GSAP / ScrollTrigger**,
**shadcn/ui**, des bibliothèques d'icônes classées par ordre de préférence
(`@phosphor-icons/react`, `hugeicons-react`…), et des commandes `npm install`.

**Motif du refus** : le socle produit des **pages HTML autonomes**, CSS et JS en ligne,
sans framework (`references\BEST-PRACTICES-HTML.md` et le boilerplate). La neutralité de
pile est une contrainte du socle, pas une préférence. L'amont revendique d'ailleurs viser
« *target design intent, not a single framework API* » — la pile imposée contredit sa
propre annonce.

**Conséquence assumée** : les règles de l'amont exprimées en classes Tailwind
(`text-4xl md:text-6xl`, `min-h-[100dvh]`, `pt-24`…) ne sont pas transposées telles quelles.
Seule leur **intention** est retenue quand elle est exprimable sans la pile — c'est le cas
des six règles de la table ci-dessus, et seulement de celles-là.

## Invocation

```bash
node oracles/oracle-taste.mjs <cible.html>          # TA1–TA4, JSON + exit 0/1/2
node oracles/self-test.mjs                          # verrou de non-régression
```

`oracle-taste.mjs` est branché sur `run-oracles-design.mjs` en mode livrable : il tourne
sur toute cible HTML, sans option.
