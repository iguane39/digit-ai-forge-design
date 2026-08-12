# baseline/ — captures approuvées de régression visuelle

Mécanisme TF-0102 (2/3). Chaque sous-dossier `baseline/<slug>/` porte les captures
**approuvées** d'une page, versionnées comme n'importe quel autre fichier du dépôt :

```
baseline/<slug>/
  w<largeur>.png       une capture PNG par largeur de la grille
  PROVENANCE.json       date, page source, largeurs, tolérance, seuil de l'approbation
  historique.jsonl      journal append-only des approbations et jugements
```

## Utilisation

```bash
# Juger le rendu courant d'une page contre sa baseline approuvée
node oracles/oracle-baseline.mjs <page.html> --slug <nom>

# Entériner une nouvelle baseline (hors boucle de jugement, jamais automatique)
node oracles/oracle-baseline.mjs <page.html> --slug <nom> --approuver
```

Nécessite le même outillage que `--rendu` de `run-oracles-design.mjs` : Python,
`playwright` (`pip install playwright && playwright install chromium`) et
`render_page.py` de `digit-ai-page-html` au chemin canonique
`~/.claude/skills/digit-ai-page-html/scripts/render_page.py`. Outillage absent ⇒
`SKIP` motivé, jamais une erreur ni un `PASS` par défaut.

Diff pixel en Node pur (`oracles/lib/png.mjs`, seul `node:zlib` natif — aucune
dépendance supplémentaire à `--rendu`, qui a déjà besoin de Python/Playwright pour
la capture elle-même).

## Gouvernance (anti-gaming)

- Une baseline absente ne se crée **jamais** pendant un jugement : `SKIP` motivé,
  `--approuver` explicite requis.
- `--approuver` est **refusé** si le dernier jugement journalisé pour ce slug est
  un `FAIL` non encore corrigé (règle B3) — on ne fige pas une régression au lieu
  de la corriger.
- Toute approbation est journalisée dans `historique.jsonl` (append-only).

## Règles

| Règle | Condition |
|---|---|
| B1 | dimensions du rendu courant ≠ dimensions de la baseline |
| B2 | ratio de pixels divergents (tolérance de canal, défaut 24/255) > seuil (défaut 0,1 %) |
| B3 | `--approuver` demandé alors que le dernier jugement journalisé est un `FAIL` |

Vérifié par `oracles/self-test-baseline.mjs` (séparé de `oracles/self-test.mjs` :
dépend de l'outillage externe, `SKIP` motivé si absent — jamais un échec du
verrou principal pour une cause hors de son ressort).

## `maquette-bailleur/` — v0 exigible

Première baseline réelle du dépôt : la maquette de validation
(`demo/Digit-AI - Maquette Bailleur - Interventions - 20260804a.html`), approuvée
à 3 largeurs (1920, 1024, 390 — grille réduite v0, voir « Restes » ci-dessous).

## Restes (hors V0)

- **Grille réduite** (3 largeurs au lieu des 5 de `--rendu`) — étendre est un
  simple changement de `--widths`, pas une limite structurelle.
- **Pas de masques de zones dynamiques.** `oracle-visual-diff.py` de
  `quality-oracles` (lu, non modifié — hors dépôt cible) a ce mécanisme
  (`.masques.json`) ; le porter ici si une page à horodatage ou contenu aléatoire
  en a besoin.
- **Un seul slug approuvé** (`maquette-bailleur`). Étendre la couverture aux
  autres livrables de `demo/` est un usage, pas un développement.
- **Pas de CI qui appelle `oracle-baseline` automatiquement** — invocation
  manuelle ou via un futur hook, à décider hors de cette campagne.
