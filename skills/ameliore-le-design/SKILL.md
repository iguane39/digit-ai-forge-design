---
name: ameliore-le-design
description: Transforme une idée, une spécification, un design ou un produit web existant — URL, screenshot, fichier — en maquette navigable : redesign intégral et parcours d'écrans simulés (landing, connexion, tableau de bord, CRUD, catalogue, galerie, onboarding), cible web ou mobile, en un seul fichier HTML autonome, thèmes clair et sombre, zéro réseau. Deux fidélités, wireframe ou maquette. Use when / déclencher dès que l'utilisateur veut refondre, relooker, moderniser ou repenser le design d'un site ou d'une application, demande une maquette, un prototype cliquable ou une proposition visuelle à partir d'une URL, d'un screenshot ou d'un simple brief, ou veut montrer à un client ce que son produit pourrait devenir. Ne pas déclencher pour une page chartée Digit-AI (→ digit-ai-page-html), une fiche ou un schéma (→ digit-ai-fiches-html), poser les tokens (→ systeme-de-marque), arbitrer entre directions (→ studio-de-direction), ni auditer une appli en production (→ audite-et-corrige-l-appli).
version: 2.0.0
---

# Améliore le design

Produit une **maquette navigable en un fichier HTML unique** à partir d'un entrant
hétérogène — produit existant, design, spécification, ou simple idée. Livrable de
conviction : le commanditaire doit voir ce que son produit pourrait devenir, écran
par écran, en cliquant.

## Ce que ce skill apporte en propre

Direction artistique → `impeccable` · tokens de marque → `systeme-de-marque` ·
arbitrage entre directions → `studio-de-direction` · socle HTML et juge de rendu
`render_page.py` → `digit-ai-page-html` · itération → `la-boucle`.

Restent en propre, et c'est tout l'objet du skill : le protocole d'ingestion d'un
entrant hétérogène, l'inventaire canonique des écrans, le contrat du fichier
unique, les patterns d'interaction attendus, et l'orchestration du contrôle.

## Quick start

```
0. Cadrage         → cible (web|mobile) et fidélité (wireframe|maquette), déclarées
1. Ingestion       → references/ingestion.md
2. Direction       → systeme-de-marque si tokens absents, sinon impeccable craft ;
                     critique du plan avant tout code
3. Écrans          → references/inventaire-ecrans.md (tous produits, sans exception)
4. Build           → references/contrat-technique.md + references/patterns-interaction.md
                     cible mobile → references/cadre-mobile.md
5. Contrôle        → python scripts/check_maquette.py <fichier.html>
                     puis les 4 oracles de la forge (criteres-sortie.md §Critères)
6. Restitution     → references/criteres-sortie.md §Restitution
```

## Cible et fidélité — deux réglages, déclarés avant le premier écran

**Cible** : `web` (défaut) · `mobile` · `web+mobile`. Le mobile ajoute châssis
d'appareil et patterns natifs — `references/cadre-mobile.md`.
**Fidélité** : `maquette` (défaut) · `wireframe`. Le wireframe est un réglage, pas
un livrable distinct : une seule police, aucune couleur de marque, mais même contrat
technique, même inventaire d'écrans, mêmes oracles. Change ce qu'on montre — la
structure et le parcours — pas la peau.

## Règles dures

**La charte Digit-AI ne s'applique pas au design de la maquette.** Elle porte
l'identité du client de bout en bout : typographie, palette et thème selon le
secteur, pas selon le gabarit maison. Nommage du fichier et oracles restent
applicables — règles de livraison, pas de design.

**Zéro dépendance réseau au runtime du livrable.** Réseau autorisé **au build**
(corpus, images, docs), interdit dans le fichier rendu, qui s'ouvre en double-clic
hors connexion. Conséquences : cartographie SVG/GeoJSON inline, graphiques SVG
maison, 3D pré-calculée, polices en base64. Plafond : 10 Mo.

**Le mouvement passe par Motion vendoré.** Build UMD autonome (79 ko, v12.23.12)
inliné depuis `oracles/vendor/` — jamais `cdn.jsdelivr.net`. L'AI Kit sert à
l'auteur, pas au livrable. `prefers-reduced-motion` traité, `transform` et
`opacity` seulement.

**Aucune donnée inventée non signalée.** Données de démonstration cohérentes et
volumineuses, mais tout écran chiffré porte un bandeau permanent « Données de
démonstration — non contractuelles ». Aucun montant ni tarif inventé : placeholder.

**Aucun visuel généré non déclaré.** Images produites via Gemini au build, en
base64, plafonnées par `.env`, tracées dans un `<script id="manifeste-images">`
portant prompt, modèle et date. Aucun visage, lieu ou logo réel fabriqué et
présenté comme authentique.

**Secteur, cible et job de l'écran sont établis avant le premier choix visuel.**
S'ils ne se déduisent pas de l'entrant, ils sont demandés. Jamais supposés en
silence.

**Aucun ✓ sans exécution.** `check_maquette.py` et les oracles de la forge sont
lancés avant toute restitution, verdicts reportés tels quels — `SKIP` compris.

## Références

| Fichier | À lire quand |
|---|---|
| `references/ingestion.md` | au démarrage, pour tout entrant |
| `references/inventaire-ecrans.md` | avant de construire les écrans |
| `references/contrat-technique.md` | avant d'écrire la première ligne de code |
| `references/cadre-mobile.md` | dès que la cible inclut le mobile |
| `references/patterns-interaction.md` | pour les tables, composants et états |
| `references/criteres-sortie.md` | avant de rendre la main |

## Pièges connus

- **Tables larges en 390 px** : reflow en cartes obligatoire — l'écart de rendu le
  plus fréquemment non convergé sur les livrables HTML maison.
- **Thème sombre par inversion** : recalculer les contrastes, remplacer les ombres
  par des élévations, majorer le line-height du texte clair.
- **Menu annonçant un écran inexistant** : bijection stricte, vérifiée par script.
- **Direction générique** : crème + serif + terracotta, noir + accent acide,
  broadsheet à filets. Trois défauts, pas trois choix.
