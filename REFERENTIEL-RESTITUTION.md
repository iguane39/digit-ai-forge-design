# Référentiel « restitution lisible » — la page se conçoit pour ses lecteurs

Campagne TF-0235 (pilot), mandat humain du 15/08/2026. Source d'instruction :
`<pilot>\output\01-revues-et-propositions\Digit-AI - Proposition Forge - Restitution
lisible - 20260815a.md` (étude d'opportunité 20260815a, verdict O2). Preuve
d'application : maquette SEO AuxPortesDeLaBaie (CONFORME, 13 PASS au profil digit-ai).

**Position** : l'étage au-dessus du socle `digit-ai-page-html`. Le socle juge
« la page est-elle bien construite ? » (L1-L12, V1-V7) ; ce référentiel juge
« la page fait-elle son travail auprès de son lecteur ? ». Il ne duplique rien :
chaque règle cite le contrôle existant quand il existe déjà.

## 1. Familles de livrables

Le mot « dashboard » recouvre trois objets aux expériences de lecture opposées.
Toute page de restitution déclare sa famille : `<body data-restitution="…">`.

| Famille | `data-restitution` | Usage | Expérience cible |
|---|---|---|---|
| Rapport d'audit ponctuel | `rapport` | état des lieux daté, verdicts et preuves, lu quelques fois | guidage narratif constat → impact → action, exploration à la demande |
| Dashboard de suivi récurrent | `suivi` | indicateurs revisités périodiquement | détection de dérive : état, tendance, écart au seuil, en un écran |
| Registre-outil | `registre` | base vivante consultée, filtrée, annotée | manipulation : retrouver, trier, décider, exporter |

## 2. Lecteurs types

Toute règle sert un lecteur nommé — une règle sans lecteur saute.

| Famille | Lecteur | Question d'entrée |
|---|---|---|
| rapport | commanditaire (novice du domaine) | quel est l'état, qu'est-ce que ça change, que dois-je décider ? |
| rapport | metteur en œuvre | que faire, dans quel ordre, avec quoi ? |
| rapport | expert du domaine | les verdicts tiennent-ils ? preuves et méthode ? |
| suivi | pilote | est-ce que ça dérive ? où, depuis quand, de combien ? |
| suivi | opérateur | qu'y a-t-il dans la file, que traiter d'abord ? |
| registre | mainteneur | où est l'entrée, comment la faire évoluer ? |
| registre | auditeur | qui a décidé quoi, quand, sur quelle preuve ? |

## 3. Règles RL et leurs contrôles

O = oracle mécanique · R = revue outillée (critique-le-design, dimension D8).

| Règle | Énoncé binaire | Lecteur servi | Contrôle |
|---|---|---|---|
| RL-1 | la vue d'ensemble tient en un écran : verdict, ≥ 3 KPI, navigation de vues | commanditaire, pilote | `oracle-restitution` RL-1 + `render_page` (ligne de flottaison) + R (test des 30 s) |
| RL-2 | une question par vue, déclarée en chapeau | tous | socle `check_html` L7 (`.ch-apprend` ≥ 40 car.) + R (pertinence) |
| RL-3 | un chiffre affiché porte valeur, définition, repère, action s'il en appelle une | commanditaire | `oracle-restitution` RL-3 (+ socle L3 pour la légende) |
| RL-4 | un graphique énonce la question à laquelle il répond ; pas de graphique sans question | commanditaire, pilote | `oracle-restitution` RL-4 + R (pertinence de la forme) |
| RL-5 | tout tableau ≥ 10 lignes : tri ; dimensions : filtres combinables ; > 50 lignes : recherche | metteur en œuvre, mainteneur | composant filtres-tableau G1-G6 (organization) + socle L4 |
| RL-6 | toute interaction a un effet matériel sur ce que le lecteur voit ou comprend (loi n° 1 étendue) | tous | rendu (delta de contenu visible) — R en attendant l'outillage |
| RL-7 | le texte s'ancre : constat (donnée) → impact → action ; le générique vit une fois, en vue Méthode | commanditaire | R (D8) |
| RL-8 | la hiérarchisation ne perd rien : iso-contenu source → cible, écart listé | expert, auditeur | contrôle de campagne (inventaire mécanique) |
| RL-9 | la vue d'ensemble propose « vous êtes X → commencez ici » par lecteur type | tous | `oracle-restitution` RL-9 |
| RL-10 | un écart aux règles se déclare dans la page (manifeste), jamais par omission | — | `oracle-restitution` RL-10 |

## 4. Contrat de marquage (consommé par l'oracle)

- `<body data-restitution="rapport|suivi|registre">` — déclare le périmètre ;
  sans déclaration l'oracle rend SKIP motivé.
- `.verdict` ou `[data-verdict]` — la conclusion de la vue d'ensemble.
- `.kpi` avec `.k-valeur`, `.kpi-d` (définition, ≥ 12 car. — classe du socle L3),
  `.k-repere` (≥ 20 car.).
- `[data-vue]` sur chaque entrée de navigation de vues (≥ 2).
- `figure` graphique avec `figcaption` interrogative (finale « ? »).
- `.chemins` (ou `[data-lecteurs]`) contenant ≥ 2 `.chemin`.
- `.ecarts` (ou `[data-ecarts]`) — manifeste d'écarts, y compris « aucun écart ».

Gabarit prêt à consommer : `gabarits\gabarit-restitution.html` (socle + contrat
ci-dessus, jugé conforme par les oracles de la forge et du profil digit-ai).

## 5. Application

- **Production** : les forges productrices (tests, seo, audit, data, observability…)
  génèrent dans le gabarit ; la conformité RL devient un effet de bord de la
  production — même mécanique que le socle pour la conformité HTML.
- **Contrôle** : `node oracles\oracle-restitution.mjs <page.html>` (exit 0/1/2) ;
  self-test : fixtures `restitution-verte.html` / `restitution-rouge.html`.
- **Revue** : dimension D8 « Lecture de données » de `critique-le-design`
  (`skills\critique-le-design\references\grille.md`).
- **Écarts** : une page hors périmètre ne déclare pas `data-restitution` (revue de
  campagne) ; une page dans le périmètre déclare ses écarts dans `.ecarts` (RL-10).
- **Migration** : par campagnes mandatées, une forge productrice à la fois (plan P4,
  journal `BOUCLE-AMELIORATION.md` du pilot).
