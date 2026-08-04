# Forge Design

Forge spécialisée dans le design d'applications web, de sites web et d'applications
mobiles. Un corpus, quatre verbes, cinq oracles exécutés.

Elle s'arrête au design : ni spécification fonctionnelle, ni backlog, ni planning,
ni passation développeur. Conception complète : [conception-forge-design.md](conception-forge-design.md).

## Structure

```
corpus/            matière indexée, recherche BM25 hors ligne
oracles/           les juges exécutés + leurs fixtures + le self-test
skills/            les quatre verbes
dist/              les skills empaquetés, installables
demo/              run de validation : template, build, maquette, restitution
.env               clé Gemini pour la génération d'images au build
```

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
node oracles/self-test.mjs                                   # 6 cas, 38 règles verrouillées
node oracles/run-oracles-design.mjs <page.html> [--mobile]   # point d'entrée unique
```

Racine résolue par `FORGE_DESIGN_ROOT` (env, puis `.env`, puis dossier parent).
**Racine non résolue ⇒ exit 2 et verdict `SKIP`** : un contrôle qui ne trouve pas
ses oracles ne se tait jamais.

| Oracle | Règles | Domaine |
|---|---|---|
| `oracle-slop` | S1–S10 | marqueurs de design généré |
| `oracle-tokens` | T1–T6 | traçabilité des tokens, parité des thèmes, contraste |
| `oracle-mobile` | M1–M6 | viewport, cibles tactiles, safe areas, reflow, paysage |
| `oracle-images` | I1–I6 | alt, plafonds, zéro réseau, manifeste de génération |
| `oracle-corpus` | C1–C7 | colonnes, sources résolues, polices réflexes, monoculture inter-clients |

Ils lisent le DOM statique **et** les gabarits JS : le contrat impose un rendu
dynamique, et un oracle aveugle au runtime se tairait sur les tables, les cartes et
les images qu'il ne voit pas.

Node seul, aucune dépendance npm. Contrat commun : JSON sur stdout, exit 0/1/2,
`non_juge` déclaré. Entrées prêtes pour le registre global :
[oracles/registre-entrees.md](oracles/registre-entrees.md) — **non injectées**, la
décision appartient à l'utilisateur.

## Le corpus

123 entrées, toutes sourcées : 24 styles, 9 palettes OKLCH déclinées en deux thèmes
(18 lignes), 20 appariements typographiques hors liste réflexe, 26 patterns,
35 guidelines. C'est un corpus d'amorçage, pas un catalogue exhaustif — il grandit
par ajout sourcé, et `oracle-corpus` refuse toute entrée sans source résolue.

```bash
python corpus/recherche.py "spa bien-être réservation" --systeme-de-design
python corpus/recherche.py "dashboard SRE dense" --domaine style --top 3
python corpus/recherche.py "cabinet d'avocats" --systeme-de-design --persist DIRECTION.md
```

Déterministe : même requête, même sortie. Une requête sans résultat se **déclare**
au lieu de produire une entrée inventée.

## Règle qui traverse tout

**Réseau autorisé au build, interdit au runtime du livrable.** Corpus, génération
d'images Gemini, AI Kit Motion, consultation de références : tout est résolu avant
livraison et embarqué. Le fichier livré s'ouvre en double-clic, hors connexion,
sans CDN.

## Run de validation

```bash
node demo/build.mjs   # inline Motion vendoré, vérifie son empreinte, écrit la maquette
```

Une maquette réelle produite depuis un entrant « idée ». Elle a révélé trois faux
négatifs des oracles, tous corrigés et verrouillés par fixture — voir `TODO.md`.
Ce qui reste dû sur ce run est déclaré dans `demo/NOTE-partis-pris.md` : rendu réel
non mesuré, parcours C13 non exécutés.

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
