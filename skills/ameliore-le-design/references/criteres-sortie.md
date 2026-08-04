# Critères de sortie et restitution

## Critères binaires, figés avant la première génération

| # | Critère | Moyen de preuve | Verdict |
|---|---|---|---|
| C1 | Zéro débordement, zéro chevauchement, contraste conforme | `render_page.py` (V1–V7), 5 breakpoints × 2 thèmes | bloquant |
| C2 | Bijection menu ↔ écrans, aucun lien mort | `check_maquette.py` | bloquant |
| C3 | Poids ≤ 10 Mo, aucune requête réseau | `check_maquette.py` | bloquant |
| C4 | Navigation clavier de bout en bout | parcours scripté ou manuel tracé | bloquant |
| C5 | États vide / chargement / erreur atteignables | parcours | bloquant |
| C6 | Aucune donnée chiffrée non marquée | `check_maquette.py` + `~/.claude/skills/quality-oracles/scripts/oracle-claims.mjs` | bloquant |
| C7 | Nommage du fichier conforme | `~/.claude/skills/quality-oracles/scripts/oracle-nommage.mjs` | bloquant |
| C8 | Direction visuelle non générique | jugement argumenté ou arbitrage commanditaire | avertissement |
| C9 | Aucun marqueur de design généré (S1–S10) | `oracle-slop` | bloquant |
| C10 | Couleurs et polices tracées aux tokens, parité clair/sombre (T1–T6) | `oracle-tokens` | bloquant |
| C11 | Contrat d'usage tactile tenu (M1–M6) | `oracle-mobile` — **si cible mobile** | bloquant |
| C12 | Visuels générés tracés et plafonnés (I1–I6) | `oracle-images` — **si images générées** | bloquant |
| C13 | Les 3 parcours de bout en bout sont cliquables, trace jointe | parcours exécuté | bloquant |

`check_maquette.py` juge ce qui est décidable sur le fichier. Ce qui exige un
rendu réel est délégué à `render_page.py` (V1–V7), **installé le 04/08/2026** dans
`~/.claude/skills/digit-ai-page-html/scripts/` — il n'y était pas, alors que le
registre global le déclarait déjà. `check_html.py`, qui l'accompagne, est un
contrôle statique de charte, d'accessibilité structurelle et d'impression : il ne
rend pas la page et ne mesure ni débordement, ni chevauchement, ni contraste rendu.

Si `render_page.py` ou Playwright venaient à manquer, C1 se déclare `non_juge` avec
la raison — **jamais approuvé par lecture du code**.

```bash
python ~/.claude/skills/digit-ai-page-html/scripts/render_page.py <fichier.html>        --widths 1920,1440,1024,768,390 --output json
```

Le thème sombre se mesure sur une copie dont `data-theme` vaut `dark` : sans ça,
seul le thème clair est rendu et V2 ne dit rien du second.

C11 et C12 sont **conditionnels** : hors cible mobile ou sans visuel généré, ils
sont reportés `SANS OBJET` avec leur raison — jamais `PASS` par défaut.

## Enchaînement de contrôle

Un seul point d'entrée. Il détecte les oracles applicables, les lance, et déclare
en `SANS OBJET` ceux qui ne s'appliquent pas :

```bash
python scripts/check_maquette.py <fichier.html>
node "$FORGE_DESIGN_ROOT/oracles/run-oracles-design.mjs" <fichier.html> [--mobile] [--tokens tokens.css]
```

`FORGE_DESIGN_ROOT` est lu dans l'environnement, puis dans le `.env` de la forge,
puis déduit du dossier parent du script. **Racine non résolue ⇒ exit 2 et verdict
`SKIP`** : un contrôle qui ne trouve pas ses oracles ne se tait jamais.

Ce que l'orchestrateur ne lance pas, et qui reste dû : `render_page.py` (V1–V7) et
`oracle-a11y.py`. Il les déclare en `non_juge` — c'est au parcours de contrôle de
les lancer, sur les **deux** thèmes.

Un oracle indisponible — runtime absent, Playwright manquant, quota épuisé — se
déclare en `non_juge`. Il ne se contourne pas par une approbation sur lecture de code.

## Trace des parcours (C13)

Un fichier `parcours.md` accompagne la maquette. Trois sections, une par parcours,
chacune au format :

```markdown
## Parcours 2 — Produire : créer un dossier jusqu'à sa validation
Routes traversées : #dossiers → #dossier-nouveau → #dossier-1042 → #dossier-1042/valider
État non nominal rencontré : erreur de validation sur pièce jointe manquante (#dossier-1042, état « erreur »)
Clavier : parcouru en Tab seul, focus visible à chaque étape
Exécuté le : 2026-08-04
```

Trois exigences, sans lesquelles la trace ne vaut rien : les routes sont **celles du
fichier** (vérifiables contre la table de routage par `check_maquette.py`), chaque
parcours traverse **au moins un état non nominal**, et la trace dit qu'elle a été
exécutée, pas décrite. Un parcours qui ne montre que le chemin heureux ne démontre
rien.

## Boucle

Itération via `la-boucle`, bornée à 3 passes. Si un critère bloquant reste rouge
au terme des 3 passes, escalader avec le relevé — ne pas requalifier le critère
pour le faire passer.

## Restitution

1. **Le fichier**, nommé selon la convention :
   `Digit-AI - Maquette {Client} - {Scope} - {AAAAMMJJ}{a,b,c…}.html`
2. **La note de partis pris** : direction artistique retenue et pourquoi, 3 mots de
   ton concrets, choix de navigation justifié, écrans produits sur modèle générique
   faute de matière, hypothèses posées faute d'accès, conséquences assumées du
   zéro-réseau, et **liste des visuels générés** avec leur modèle.
3. **Le relevé des contrôles** : verdicts exécutés, y compris les `SKIP` et les
   `SANS OBJET`, avec leur raison. Un `SKIP` reporté honnêtement vaut mieux qu'un
   `PASS` supposé.
4. **Ce que la maquette ne fait pas** : section obligatoire et non vide. Elle dit
   l'écart entre ce qui est montré et ce qui resterait à construire. Sans elle, une
   maquette qui « marche partout » se lit comme un produit déjà fait aux trois quarts.

## Support de refonte — bornes dures

La maquette part avec **trois artefacts, pas un de plus** : `tokens.css`,
l'inventaire des composants, la carte des écrans.

Ne sont **jamais** produits : spécification fonctionnelle, backlog, découpage en
lots, planning, guide de passation développeur, code de production. La forge
s'arrête au design ; au-delà, c'est de la construction de produit, hors périmètre.

## Ce qui n'est jamais fait

Juger le rendu depuis le code. Approuver un thème sombre sans l'avoir mesuré.
Annoncer un poids sans l'avoir pesé. Livrer sans avoir ouvert le fichier.
Cocher un critère dont l'oracle n'a pas été lancé.
