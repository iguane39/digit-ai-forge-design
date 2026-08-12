# Forge Design

Forge spécialisée dans le design d'applications web, de sites web et d'applications
mobiles. Un corpus, quatre verbes, cinq oracles exécutés.

Elle s'arrête au design : ni spécification fonctionnelle, ni backlog, ni planning,
ni passation développeur. Conception complète : [conception-forge-design.md](conception-forge-design.md).

## Catalogue de services

> Section proposée par la campagne « catalogues » du pilot (2026-08-12) — générée depuis
> la source unique `catalogues/catalogue.jsonl` du pilot (v1.5.0, challengée état de
> l'art le 12/08/2026). **prouvé** = preuve exécutée ; *déclaré* = méthode documentée seulement.

| Service | Intention (« je veux… ») | Point d'entrée | Statut |
|---|---|---|---|
| **Système de marque** | doter mon produit d'une identité et de tokens exploitables | `skills\systeme-de-marque (méthode, mode degrade)` | prouvé (experimental) |
| **Studio de direction** | explorer et trancher une direction artistique | `skills\studio-de-direction (méthode, mode degrade)` | prouvé (experimental) |
| **Améliorer le design (maquette)** | obtenir une maquette HTML autonome de mon interface | `skills\ameliore-le-design (méthode, mode degrade)` | prouvé (experimental) |
| **Critiquer le design (amont et aval)** | faire critiquer une maquette ou juger le produit rendu contre sa promesse design | `skills\critique-le-design (méthode) ; mode aval : revue graphique d'implémentation (ETAPES-RUN §5 bis)` | déclaré (experimental) |
| **Valider le design (oracles)** | vérifier mécaniquement charte, tokens, mobile, images et corpus | `node oracles\run-oracles-design.mjs <html> [--mobile] [--tokens t.css] [--json-only]` | prouvé (production) |
| **Générer les visuels** | produire les images et visuels réels de mes maquettes | `producteur d'images (Gemini) — spécifié chez design, exercé via le pilot` | prouvé (experimental) |
| **Tokens DTCG (source → dérivé)** | faire des tokens une source W3C interopérable, jamais éditée en CSS | `node scripts\generer-tokens-css.mjs · node oracles\oracle-dtcg.mjs <tokens.json> <css>` | prouvé (experimental) |
| **Baseline de régression visuelle** | détecter toute régression visuelle contre une référence approuvée versionnée | `node oracles\oracle-baseline.mjs [approuver|juger]` | prouvé (experimental) |

Le catalogue consolidé des dix forges vit chez le pilot :
[digit-ai-forge-pilot/catalogues/CATALOGUES.md](https://github.com/iguane39/digit-ai-forge-pilot/blob/main/catalogues/CATALOGUES.md).

## Structure

```
corpus/            matière indexée, recherche BM25 hors ligne
oracles/           les juges exécutés + leurs fixtures + le self-test
baseline/          captures approuvées de régression visuelle, versionnées (TF-0102)
skills/            les quatre verbes
dist/              les skills empaquetés, installables
demo/              run de validation : template, build, maquette, restitution
.env               clé Gemini pour la génération d'images au build
```

`dist/` peut être **en retard** sur `skills/` + `oracles/` : l'empaquetage n'est
pas automatisé (pas de hook de build), donc un correctif appliqué dans `skills/`
ou `oracles/` sans reconstruction manuelle du `.skill` correspondant ne se
propage pas à l'installé. Dette connue, non résolue par ce README.

## Sorties, quand la forge est invoquée par un orchestrateur

Les livrables (`tokens.css`, maquette HTML, `revue.md`, `MARQUE.md`, `DIRECTION.md`…)
vont dans le dossier de travail de l'appelant, **jamais** dans ce dépôt. Ce dépôt
ne contient que la forge elle-même (skills, oracles, corpus) — pas ses productions.

## Les quatre verbes

| Skill | Entrée | Sortie |
|---|---|---|
| [systeme-de-marque](skills/systeme-de-marque/) | logo, site, charte PDF, 3 mots de ton | `tokens.css` + `MARQUE.md` |
| [studio-de-direction](skills/studio-de-direction/) | brief + marque | `DIRECTION.md` : 1 retenue, 2 écartées avec leur raison |
| [ameliore-le-design](skills/ameliore-le-design/) | idée, design, spécification, produit existant | maquette navigable, un fichier HTML |
| [critique-le-design](skills/critique-le-design/) | page, maquette, capture, URL | `revue.md` : verdict + top 5 corrections |

Ils sont **indépendants**. On peut critiquer sans marque, maquetter sans studio.
Aucune séquence n'est imposée : c'est ce qui distingue une forge d'un pipeline.

## Les oracles

```bash
node oracles/self-test.mjs                                   # non-régression, toutes fixtures vertes/rouges

node oracles/run-oracles-design.mjs <page.html> \
  [--mobile] [--tokens tokens.css] [--json-only] [--racine <chemin>]   # point d'entrée unique

node oracles/run-oracles-design.mjs --corpus <dossier-corpus>          # mode corpus (oracle-corpus seul)

node oracles/run-oracles-design.mjs --dtcg <source.tokens.json> <tokens.css>  # sync DTCG → CSS

node oracles/oracle-baseline.mjs <page.html> --slug <nom> [--approuver]       # régression visuelle
node oracles/self-test-baseline.mjs                           # verrou dédié (SKIP motivé si outillage absent)
```

Options de `run-oracles-design.mjs` :

| Option | Effet |
|---|---|
| `--mobile` | force `oracle-mobile` même sans marqueur de châssis détecté dans le HTML |
| `--tokens <fichier.css>` | fait lire les tokens depuis un `.css` externe en plus de ceux du HTML, passé à `oracle-tokens` |
| `--json-only` | sortie JSON compacte sur stdout, sans les lignes de statut sur stderr |
| `--racine <chemin>` | force la racine de forge, prioritaire sur `$FORGE_DESIGN_ROOT` et sur le `.env` |
| `--corpus <dossier>` | bascule en mode corpus : lance uniquement `oracle-corpus` sur le dossier donné |
| `--dtcg <source.tokens.json> <tokens.css>` | bascule en mode pipeline de tokens : lance uniquement `oracle-dtcg`, qui régénère le CSS depuis la source DTCG et le compare au fichier livré |
| `--rendu` | si l'outillage est détecté (Python, `playwright`, `render_page.py` et `oracle-a11y.py` aux chemins canoniques `~/.claude/skills/...`), lance `render_page.py` sur le fichier fourni ET sur une copie générée avec `data-theme="dark"`, puis `oracle-a11y.py`, et agrège leurs verdicts dans `oracles`. Outillage manquant ⇒ `SKIP` motivé sur cette seule entrée, jamais une erreur. Sans l'option, comportement inchangé |

Racine résolue dans l'ordre `--racine` → `$FORGE_DESIGN_ROOT` (env) → `FORGE_DESIGN_ROOT`
du `.env` voisin → dossier parent du script.
**Racine non résolue ⇒ exit 2 et verdict `SKIP`** : un contrôle qui ne trouve pas
ses oracles ne se tait jamais.

Contrat de sortie : **exit 0** = `PASS` (tous les oracles applicables verts) ·
**exit 1** = `FAIL` (au moins un oracle en échec) · **exit 2** = indéterminé —
`SKIP` (racine ou cible non résolue) ou un oracle non exécutable. Le JSON sur
stdout porte toujours `verdict`, le détail par oracle, et `non_juge` : ce que
l'orchestrateur ne couvre pas (rendu réel V1–V7 et `oracle-a11y.py` sans `--rendu`,
parcours C13 dans tous les cas
— voir [criteres-sortie.md](skills/ameliore-le-design/references/criteres-sortie.md)).

| Oracle | Règles | Domaine |
|---|---|---|
| `oracle-slop` | S1–S10 | marqueurs de design généré |
| `oracle-tokens` | T1–T6 | traçabilité des tokens, parité des thèmes, contraste |
| `oracle-mobile` | M1–M7 | viewport, cibles tactiles, safe areas, reflow, paysage, transparence réduite |
| `oracle-images` | I1–I6 | alt, plafonds, zéro réseau, manifeste de génération |
| `oracle-corpus` | C1–C7 | colonnes, sources résolues, polices réflexes, monoculture inter-clients |
| `oracle-dtcg` | D1–D3 | pipeline de tokens : forme DTCG minimale, alias résolus, tokens.css synchronisé avec sa source |

Ils lisent le DOM statique **et** les gabarits JS : le contrat impose un rendu
dynamique, et un oracle aveugle au runtime se tairait sur les tables, les cartes et
les images qu'il ne voit pas.

Node seul, aucune dépendance npm. Contrat commun : JSON sur stdout, exit 0/1/2,
`non_juge` déclaré. **Injectés au registre global** le 04/08/2026 (v2.7.0, 39 oracles),
déclenchés par contenu et non par extension — détail et sauvegardes :
[oracles/registre-entrees.md](oracles/registre-entrees.md).

## Le corpus

144 entrées, toutes sourcées : 24 styles, 9 palettes OKLCH déclinées en deux thèmes
(18 lignes), 20 appariements typographiques hors liste réflexe, 31 patterns,
51 guidelines. Sources : WCAG 2.2, ARIA APG, Material 3, Apple HIG, NN/g,
Google Fonts, Fontshare, `impeccable`, et **apple-design** d'Emil Kowalski (MIT) —
valeurs de ressorts, projection d'inertie, rubber-banding, tracking optique.

C'est un corpus d'amorçage, pas un catalogue exhaustif : il grandit par ajout sourcé,
et `oracle-corpus` refuse toute entrée sans source résolue.

```bash
python corpus/recherche.py "spa bien-être réservation" --systeme-de-design
python corpus/recherche.py "dashboard SRE dense" --domaine style --top 3
python corpus/recherche.py "cabinet d'avocats" --systeme-de-design --persist DIRECTION.md
```

Déterministe : même requête, même sortie. Une requête sans résultat se **déclare**
au lieu de produire une entrée inventée.

## Skills tiers installés pour la forge

| Skill | Rôle | Licence |
|---|---|---|
| `apple-design` | mouvement, gestes, matières — ses seuils sont dans le corpus (GL36–GL51, PT27–PT31) | MIT, Emil Kowalski |
| `review-animations` | revue de code d'animation, adossée à `critique-le-design` D6. `disable-model-invocation` : invocation explicite | MIT, Emil Kowalski |
| `digit-ai-page-html` + `render_page.py` | juge de rendu réel V1–V7. **Le script a été installé le 04/08/2026** : le registre le déclarait sans qu'il existe | maison |

## Règle qui traverse tout

**Réseau autorisé au build, interdit au runtime du livrable.** Corpus, génération
d'images Gemini, AI Kit Motion, consultation de références : tout est résolu avant
livraison et embarqué. Le fichier livré s'ouvre en double-clic, hors connexion,
sans CDN.

## Run de validation

```bash
node demo/build.mjs   # inline Motion vendoré, vérifie son empreinte, écrit la maquette
```

```bash
python demo/executer-parcours.py "demo/Digit-AI - Maquette Bailleur - Interventions - 20260804a.html"
```

Une maquette réelle produite depuis un entrant « idée ». Elle a révélé **cinq faux
négatifs** des oracles, tous corrigés et verrouillés par fixture — voir `TODO.md`.
Rendu réel mesuré (`render_page.py` V1–V7, 5 breakpoints × 2 thèmes, 0 bloquant),
accessibilité structurelle PASS, et **les trois parcours sont exécutés dans un
navigateur réel**, pas décrits. Ce qui reste dû est déclaré dans
`demo/NOTE-partis-pris.md`.

## Reste à faire

`TODO.md` — ce qui attend une décision, ce qui attend un environnement, et la dette
assumée.

## Installation

```bash
cp dist/*.skill ~/.claude/skills/      # ou installer via l'interface
```

Les skills appellent les oracles via `$FORGE_DESIGN_ROOT`. Après installation hors
de ce dépôt, poser la variable — dans l'environnement, ou dans le `.env` de la
forge :

```bash
export FORGE_DESIGN_ROOT=c:/dev/digit-ai-forge-design
```

Sans elle, `run-oracles-design.mjs` sort en code 2 avec le verdict `SKIP` et dit ce
qui manque. Il ne rend jamais un PASS sans avoir trouvé ses oracles.
