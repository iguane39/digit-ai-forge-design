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

| Domaine | Oracle (invocation) | Type | Statut |
|---|---|---|---|
| Design généré : marqueurs de slop | `oracles/oracle-slop.mjs <page.html>` — S1 bandeau latéral > 1px, S2 texte en dégradé, S3 polices réflexes, S4 noir/blanc purs, S5 palette IA (violet→bleu, néon sur sombre), S6 emojis en production, S7 grille de cartes clonée, S8 easing à dépassement, S9 rayon uniforme + ombre non teintée, S10 sparkline décoratif | cli | ✅ |
| Système de marque : traçabilité des tokens | `oracles/oracle-tokens.mjs <page.html> [--tokens tokens.css]` — T1 couleur en dur, T2 police en dur, T3 échelle 4pt, T4 parité clair/sombre, T5 contraste ≥ 4.5:1 sur paires résolvables, T6 chroma aux extrêmes (OKLCH) | cli | ✅ |
| Cible mobile : contrat d'usage tactile | `oracles/oracle-mobile.mjs <page.html>` — M1 viewport et zoom, M2 cibles ≥ 44 px, M3 safe-area-inset, M4 reflow des tables sous 768 px, M5 orientation paysage, M6 prefers-reduced-motion | cli | ✅ |
| Visuels générés : traçabilité et budget | `oracles/oracle-images.mjs <page.html> [--env .env]` — I1 alt utile, I2 plafond unitaire, I3 plafond global 10 Mo, I4 zéro image réseau, I5 manifeste de génération, I6 complétude prompt/modèle/date | cli | ✅ |
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
    "provenance": { "chantier": "forge-design", "date": "2026-08-04" },
    "regles": 6
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