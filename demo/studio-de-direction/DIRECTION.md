# Direction retenue — Meunier Industries (cas synthétique, TF-0102)

## Axe de divergence
Température (`references/axes-de-divergence.md`), choisi parce que le brief ne
tranche pas entre le sérieux d'un centre opérationnel et la réassurance d'un
service qui protège des gens : « rassurant sans être anesthésiant ».

## Mode d'exécution
Dégradé mono-agent — un seul agent de campagne (contrainte TF-0102 : écrire
uniquement dans ce dépôt, un seul contexte). Conséquence assumée : les trois
directions ont été produites en séquence par le même contexte, avec un vrai
risque de contamination. Le test de divergence réelle ci-dessous a donc été
passé au chiffre avant tout jugement, comme `axes-de-divergence.md` le demande
pour ce mode dégradé.

## Test de divergence réelle — passé avant jugement

| Affirmation | Mesure | Vrai ? |
|---|---|---|
| Hues d'accent séparées ≥ 60° | A 235° · B 40° · C 175° — écarts 165°, 60°, 135° | ✓ |
| 3 classes typographiques de display distinctes | A grotesque (Archivo Expanded) · B serif (Bitter) · C mono (JetBrains Mono) | ✓ |
| Densités différant d'au moins un cran | A compact (échelle ×1.25, espacements xs/sm) · B aéré (échelle ×1.333, espacements lg/xl) · C confortable (échelle ×1.25, sidebar) | ✓ |
| Organisation de page différente | A grille 3 colonnes + tableau pleine largeur · B colonne unique cartes · C sidebar asymétrique | ✓ |

4/4 — largement au-dessus du plancher de 2/4. Ce ne sont pas trois nuances
d'une même idée.

## Preuve exécutée (arbitrage à charge)

Chaque direction est un `tokens-{a|b|c}.css` + un écran signature commun
(`signature-{a|b|c}.html` — même score, mêmes incidents, mêmes CVE), passés
dans les oracles réels de ce dépôt :

| Direction | oracle-slop | oracle-tokens (T5 mesuré) | render_page V1/V2/V4 (5 largeurs × 2 thèmes) | oracle-a11y |
|---|---|---|---|---|
| A Sentinelle | PASS, 0 écart | PASS | **FAIL initial** (V1, débordement table à 390px) → PASS après correctif de reflow — *non*, voir note | PASS |
| B Vigie | PASS, 0 écart | PASS | FAIL initial (V1, débordement table à 390px) → **PASS** après reflow en cartes sous 480px | PASS |
| C Bastion | PASS, 0 écart | PASS | FAIL initial (V1, débordement table à 390px + grille sidebar) → PASS après reflow | PASS |

Note honnête : **seule A n'a jamais échoué** — sa densité intrinsèque (police
plus petite, espacements serrés) tenait déjà le plancher de 390px sans
correctif. B et C ont nécessité le même correctif (reflow en cartes,
`thead` masqué accessible, micro-libellés `data-label`) pour passer V1. C'est
un écart réel entre les trois, trouvé par l'exécution — pas par la relecture —
et il compte dans le jugement ci-dessous (R5).

## Relevé — rubrique à six critères

| # | Critère | A Sentinelle | B Vigie | C Bastion |
|---|---|---|---|---|
| R1 Ancrée dans le sujet | ✓ CVE + bouclier | ✓ CVE + bouclier | ✓ CVE + bouclier |
| R2 Non générique | ✓ oracle-slop PASS, 0 écart | ✓ oracle-slop PASS, 0 écart | ✓ oracle-slop PASS, 0 écart |
| R3 Signature identifiable | ✓ *« la grille dense, jalonnée d'identifiants mono bleu-froid — l'écran d'un centre opérationnel »* | ✓ *« les cartes largement respirées en ambre chaud sur un slab serif — la sécurité racontée comme un service humain »* | ✓ *« le bandeau latéral et le titre en mono display — un cabinet qui documente plutôt qu'il n'alarme »* |
| R4 Plancher tenu | ✓ contraste mesuré ≥ 4.5:1 (T5) + render_page PASS (5×2) + a11y PASS | ✓ idem | ✓ idem |
| R5 Tient à l'échelle | ✓ **sans correctif** (densité intrinsèque) | ✓ avec correctif (déclaré) | ✓ avec correctif (déclaré) |
| R6 Exécutable dans le contrat | ✓ Archivo Expanded/Public Sans/JetBrains Mono — Google Fonts, aucun effet réseau au runtime | ✓ Bitter/Karla/Fira Code — idem | ✓ JetBrains Mono/Source Sans 3 — idem |

**6/6 pour les trois directions.** Aucun critère éliminatoire (R2, R4) en ✗
nulle part — les trois sont recevables. Sur R5 seul, A tient un avantage
mesuré et non retouché ; B et C sont à égalité stricte.

## Départage

R1–R4 et R6 sont à égalité parfaite (6/6, preuves équivalentes). R5 donne à A
un avantage technique réel mais mineur (un correctif de reflow, appliqué et
vérifié, n'est pas un défaut résiduel — c'est un plancher tenu comme les deux
autres). La procédure de `rubrique.md` prévoit ce cas exactement : « à
égalité : escalader. Deux directions équivalentes, c'est un choix de
commanditaire, pas un choix de juge. »

**Escalade tranchée sur le brief, pas sur la rubrique** : le brief nomme
explicitement ce qu'il faut éviter — *« un scanner froid qui recrache des CVE
qu'il ne comprend pas »*. C'est une description quasi littérale de Sentinelle
(A) : titres condensés, densité de centre opérationnel, aucune once de
chaleur. Bastion (C) est plus tempéré que A mais reste dans le registre
« cabinet qui documente », pas « service qui protège des gens ». Vigie (B) est
la seule des trois à traiter l'incident comme un événement compris par un
humain non technique (« Ce qui s'est passé récemment », cartes respirées,
slab serif) tout en gardant les preuves techniques visibles (CVE, hôtes,
horodatage en mono) — donc sans tomber dans l'anesthésiant que le brief refuse
aussi.

## Retenue : Vigie (B)

`tokens-b.css` · `signature-b.html`
Ce qu'on se rappellera : les cartes KPI largement respirées en ambre chaud sur
un slab serif rassurant, avec les identifiants techniques (CVE, hôtes)
toujours visibles en mono — la sécurité racontée comme un service humain, pas
un scanner.
Relevé : R1 ✓ CVE+bouclier · R2 ✓ oracle-slop PASS · R3 ✓ (signature citée
ci-dessus) · R4 ✓ T5 mesuré + render_page 5×2 PASS + a11y PASS · R5 ✓ (avec
correctif déclaré) · R6 ✓ polices Google Fonts embarquables — **score 6/6**,
retenue sur escalade commanditaire (température du brief), pas sur un
tie-break mécanique de la rubrique.

## Écartée : Bastion (C)

Pôle : froid neutre, registre éditorial/cabinet · Score : 6/6 (aucun critère
en ✗)
Éliminée sur : l'arbitrage de brief-fit (hors rubrique, déclaré ci-dessus) —
le registre « cabinet qui documente » reste le plus détaché des trois vis-à-vis
d'un dirigeant qui veut se sentir protégé, pas audité. Techniquement recevable
(6/6), elle n'a pas non plus l'avantage R5 de A pour compenser.
Ce qu'elle avait de bon : le sidebar fixe offre une meilleure orientation pour
un usage récurrent (le dashboard est consulté chaque semaine, pas découvert
une fois) — pattern à garder en tête si le produit grandit au-delà d'un seul
écran. Le motif de reflow en cartes sous 480px (thead masqué accessible,
micro-libellés `data-label`) a été développé sur B puis repris à l'identique
ici — c'est donc B qui a informé C sur ce point précis, pas l'inverse ; il n'y
a pas de greffe C→B à prétendre au-delà de cette parenté honnête.

## Écartée : Sentinelle (A)

Pôle : froid technique, registre centre opérationnel · Score : 6/6 (aucun
critère en ✗, seule direction avec un R5 sans correctif)
Éliminée sur : l'arbitrage de brief-fit (hors rubrique) — c'est la description
quasi littérale de ce que le brief demande d'éviter (« scanner froid »).
Techniquement, c'est la plus solide des trois : sa densité intrinsèque (police
plus petite, espacements serrés) est la seule à avoir tenu le plancher V1 à
390px sans aucun correctif.
Ce qu'elle avait de bon, et qui a été greffé sur la retenue : comprendre
*pourquoi* A n'avait pas besoin de correctif (taille de police et paddings
réduits en dessous d'un certain seuil) a directement informé le point de
bascule (480px) et l'ampleur du reflow choisis pour corriger B — la retenue
n'aurait pas atteint son R5 ✓ aussi vite sans ce diagnostic fait sur A d'abord.

## Ce que la rubrique n'a pas jugé

Le goût du commanditaire fictif (aucun commanditaire réel n'a vu ces trois
directions — l'arbitrage de brief-fit ci-dessus est une simulation, pas une
décision humaine réelle). La cohérence avec une marque Meunier Industries non
figée (le cas est entièrement synthétique). Le coût de construction réel d'un
produit complet au-delà de cet unique écran signature.

## Restes (hors V0)

- **Un seul écran testé.** R5 (« tient à l'échelle ») ne peut pas prouver la
  tenue sur *l'écran le plus dense du produit* puisqu'aucun inventaire complet
  n'existe pour ce cas synthétique — la preuve citée se limite à l'écran
  signature lui-même, déclaré comme tel plutôt que gonflé.
- **Mode dégradé, pas parallèle.** Un run avec trois agents réellement
  indépendants (`forge-agents`, ledger append-only) reste à exercer — la
  contamination inter-directions est un risque assumé ici, atténué par le test
  de divergence chiffré mais pas éliminé.
- **oracle-judge (avis LLM outillé) non lancé** — la rubrique a suffi à
  départager sans lui dans ce cas ; à exercer sur un futur cas où R1-R6 et le
  brief-fit ne suffiraient pas à trancher.
