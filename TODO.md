# Backlog — Forge Design

État au 04/08/2026, après la passe G → E → A. Neuf items restants, dont aucun
n'est bloquant pour utiliser la forge.

## Nouveau — découvert en fermant E

**N. `render_page.py` n'est pas dans le skill installé.**
Le registre global le déclare sous `{skillsroot}/digit-ai-page-html/scripts/`, mais
il n'y est pas. Sa seule copie sur la machine est
`c:/dev/digit-ai-forge-agents/.claude/skills/digit-ai-page-html/scripts/render_page.py`.
Le self-test de `quality-oracles` le signale déjà (« oracle absent : render_page.py »),
et toute la forge design délègue V1–V7 à ce script.
→ **Reco : copier le script dans le skill installé.** C'est un oracle ✅ au registre
qui n'existe pas là où le registre le cherche — la couverture affichée est fausse
tant que ce n'est pas corrigé. Hors périmètre de ce projet, mais ça le concerne.

**O. `data-quality-auditor` déclaré ✅ au registre, absent de l'environnement.**
Même nature, signalé par le même self-test. Ni installé, ni empaqueté.
→ **Reco : installer, ou passer son statut à ❌.** Un délégué déclaré présent et
introuvable est pire qu'un trou assumé.

## Bloqué sur ta décision

**B. Mettre à jour `impeccable` depuis l'amont** (3 modes sur 23, pas de détecteur)
→ **Reco : mettre à jour pour l'auteur seulement.** Les 20 verbes manquants sont
utiles ; `oracle-slop` reste maison dans la chaîne de qualité — il a maintenant
quatre corrections que l'amont n'a pas.

**C. Blanc pur de la charte Digit-AI.**
`--card` et `--surface` valent `#FFFFFF` → `oracle-slop` S4.
→ **Reco : accepter en exception déclarée** (comportement actuel). Le risque de
propagation est désormais contenu : à l'injection au registre, ces oracles ont été
câblés sur le **contenu** (bandeau « Données de démonstration ») et non sur
l'extension `.html`. Une page chartée Digit-AI ne les déclenche pas.

**D. Thème sombre Digit-AI.**
Extension de la forge, dérivée par recalcul de contraste, absente de toute charte.
→ **Reco : valider ou retirer, mais trancher.**

## Bloqué sur l'environnement

**F. Génération d'images Gemini jamais appelée.**
Clé en place, `oracle-images` écrit et testé sur fixtures, zéro appel réel.
`gemini-3.1-flash-image` n'est pas vérifié avec cette clé.
→ **Reco : un appel à une image suffit.** API payante, donc en attente de ton feu vert.

## Dette assumée, nommée

**H. Fixtures images à plafonds abaissés** (`--max-ko 1 --max-mo 0.001`).
→ **Reco : laisser.** La règle est testée, pas son seuil. Une fixture de 500 Ko pour
une comparaison arithmétique est un mauvais échange.

**I. Maquette de validation incomplète** — 6 routes au lieu des 9 écrans du socle.
→ **Reco : laisser.** Le but était de confronter les oracles. Un run client devra
couvrir l'inventaire complet, et `criteres-sortie.md` l'exige déjà.

**J. Polices non embarquées** dans la maquette de validation.
→ **Reco : corriger au premier run client.** Écart déclaré dans `NOTE-partis-pris.md`.

**K. `studio-de-direction` jamais exécuté en parallèle.**
→ **Reco : premier run en dégradé mono-agent, consigné comme tel.**
→ **Fait (TF-0102, 12/08/2026) : premier run réel en dégradé mono-agent** —
`demo/studio-de-direction/` (BRIEF.md, 3 directions tokens+écran signature,
DIRECTION.md). Test de divergence réelle 4/4, rubrique R1-R6 passée sur oracles
exécutés (`oracle-slop`, `oracle-tokens`, `render_page` 5×2, `oracle-a11y` —
tous PASS après un correctif de reflow mobile trouvé par l'exécution). Le
parallélisme réel (plusieurs agents, `forge-agents`) reste dû — non fait ici,
contrainte d'écriture de la campagne à un seul dépôt.

## Croissance

**L. Corpus mince sur le mobile** — 5 patterns sur 26, 9 hues.
→ **Reco : croissance par usage.** `oracle-corpus` C6 empêche déjà d'inventer.

**M. Faux positif sectoriel du corpus** (« patrimoine » immobilier vs culturel).
→ **Reco : ne rien faire.** Le contrat « le corpus propose, l'humain arbitre » a
fonctionné. Si le cas se répète, ajouter un champ de désambiguïsation.

---

## Fermé dans cette passe

Ce chapitre liste ce qui a été soldé, et avec quelle preuve exécutée — jamais une
intention. Il se lit ligne à ligne : la colonne « Item » renvoie à la lettre employée
plus haut dans ce fichier, la colonne « Preuve » nomme la commande jouée et son
résultat. Ce qui n'a pas de preuve exécutée n'entre pas dans ce tableau.

| # | Item | Preuve |
|---|---|---|
| **G** | Parcours C13 | `demo/executer-parcours.py` — Chromium réel, navigation clavier, focus contrôlé à chaque tabulation. **3/3 OK**, trace datée |
| **E** | Rendu réel et a11y | `render_page.py` V1–V7 sur **5 breakpoints × 2 thèmes** : 0 bloquant, 1 avertissement V7. `oracle-a11y` PASS |
| **A** | Registre global | v2.6.0 → **v2.7.0**, 34 → 39 oracles. Sauvegardes conservées. Self-test global : mes 5 entrées vues et présentes, les 5 échecs restants sont antérieurs (items N et O) |

### Ce que l'exécution a trouvé, que rien d'autre n'avait vu

**1. Un vrai défaut d'interface dans la maquette.** La feuille modale mobile
recouvrait son propre déclencheur : pas de voile, pas d'`aria-modal`, et une seule
action `data-action="feuille"` pour ouvrir et fermer. `check_maquette`,
`oracle-slop`, `oracle-tokens`, `oracle-mobile`, `render_page` et `oracle-a11y`
étaient **tous verts** dessus. Seul le parcours exécuté l'a fait tomber.
→ Corrigé : voile cliquable, `aria-modal="true"`, actions `feuille-ouvrir` /
`feuille-fermer` distinctes, token `--voile-fond` en parité clair/sombre.

**2. Un faux positif d'`oracle-tokens`, révélé par cette correction.** T5 traitait
un token semi-transparent comme une surface opaque et calculait un contraste de
1.00:1 sur le voile. L'oracle **déclarait déjà** cette limite en `non_juge` sans
l'implémenter.
→ Corrigé : les paires dont un membre a une alpha < 1 sont écartées, comptées, et
déclarées. Verrouillé par un token semi-transparent ajouté à `tokens-verte.html`.

Rappel des trois défauts trouvés à la passe précédente : OKLCH illisible par T5,
oracles aveugles au rendu dynamique, S7 aveugle aux boucles. **Cinq faux négatifs
au total, tous trouvés par l'exécution, aucun par la relecture.**

---

## Écarts assumés — passe du 05/09/2026 (lot pilot TF-0796 / TF-0797 / TF-0800)

**N. La maquette de démonstration construite est en retard sur son gabarit.**
`demo/maquette.template.html` porte désormais `color-scheme` par thème (TF-0796) ;
le fichier construit `demo/Digit-AI - Maquette Bailleur - Interventions - 20260804a.html`
et les captures de `demo/rendus/` datent du 19/08 et ne le portent pas — ils échouent
donc `oracle-surcouche` SC4. Reconstruire suppose de rejouer `demo/build.mjs`, qui
appelle un producteur d'images tiers, et de refaire les cinq captures par largeur.
→ **Reco : ne rien faire dans ce lot.** L'écart est de même nature que celui déjà
déclaré pour `dist/` : le gabarit mène, l'artefact construit suit à la prochaine
reconstruction mandatée. La règle, elle, est verrouillée par ses deux fixtures.
