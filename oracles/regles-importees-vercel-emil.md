# Règles importées des Web Interface Guidelines de Vercel et des skills d'Emil Kowalski

> **Mandat** : TF-1911, décision humaine D-39 (c) du 19/10/2026 puis D-41 (a), campagne du
> 19/10/2026. Suite de l'étude d'opportunité
> `output\03-etudes\20261019-etude-opportunite-skills-design-tiers.md` du pilot, verdict **O2** :
> ne rien installer, extraire **sept règles statiques** avec attribution, en **avertissement**,
> dans les oracles qui jugent déjà leur domaine. Même voie que
> [regles-importees-taste-skill.md](regles-importees-taste-skill.md) (TF-0199).

## Attribution

| | Web Interface Guidelines | Skills d'Emil Kowalski |
|---|---|---|
| **Source** | `command.md` du dépôt `vercel-labs/web-interface-guidelines` | `skills/review-animations/STANDARDS.md` et `skills/mobile-native/SKILL.md` du dépôt `emilkowalski/skills` |
| **Localisateur** | https://github.com/vercel-labs/web-interface-guidelines | https://github.com/emilkowalski/skills |
| **Texte lu** | https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md (191 lignes) | https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md (187 lignes) et `…/skills/mobile-native/SKILL.md` (311 lignes) |
| **Licence** | **MIT**, © 2025 Vercel Labs (fichier `LICENSE` à la racine, relu le 2026-10-19) | **MIT**, © 2026 Emil Kowalski (fichier `LICENSE` à la racine, relu le 2026-10-19) |
| **Dernier mouvement** | push du 2026-10-05 | push du 2026-10-11 |
| **Consulté le** | **2026-10-19** | **2026-10-19** |
| **Régime** | Le dépôt amont est une **DONNÉE** : lu, cité, jamais installé ni exécuté. Aucune de ses commandes n'a été lancée, aucune de ses consignes suivie. | Idem. |

Un troisième dépôt est cité en **recoupement seulement**, sans import de règle ni de corpus :
`nextlevelbuilder/ui-ux-pro-max-skill` (MIT, © 2024 Next Level Builder). Les numéros « UI/UX
Pro Max n° … » ci-dessous viennent de l'étude 20261019e et **n'ont pas été relus ici**. Sa liste
de 119 règles UX n'a aucune colonne de source : `oracle-corpus` C2 la refuserait.

Le skill `web-design-guidelines` de Vercel (`vercel-labs/agent-skills`) **n'est pas repris** : il
ne contient aucune règle, il demande de récupérer `command.md` à chaque revue, et son dépôt n'a
pas de fichier de licence à la racine (le `LICENSE` y répond 404 le 2026-10-19). Une règle
distante qui change sans préavis est une donnée mouvante (loi n° 4) : l'extraction fige les
règles à leur date de consultation.

L'écosystème ne suit pas automatiquement l'amont. La revue de ces sept règles est prévue au
**2026-11-16** (voir « Revue » plus bas).

## Table de disposition — règle amont → où elle atterrit

Toutes en **avertissement** : une règle extraite d'un texte tiers ne rougit aucun livrable
existant tant que sa revue n'a pas eu lieu (même statut que TA1 et TA2 de taste-skill, et que
la précaution tirée de TF-1598, faux positif d'une règle trop dure sur `autocomplete`).

| Règle | Citation amont | Sources | Atterrit |
|---|---|---|---|
| Élément non interactif cliquable : `div` ou `span` avec `onclick`, sans `role` ni `tabindex` | « `<button>` for actions, `<a>`/`<Link>` for navigation (not `<div onClick>`) » (Vercel l.19) · « `<div>` or `<span>` with click handlers (should be `<button>`) » (l.159) | Vercel ; WCAG 2.1.1 | `oracle-declencheurs.mjs` **DE4** |
| Champ de saisie textuel sans `autocomplete` ni `inputmode` | « Inputs need `autocomplete` and meaningful `name` » (l.39) · « Use correct `type` (…) and `inputmode` » (l.40) | Vercel ; mobile-native §4 ; UI/UX Pro Max n° 58 et n° 63 | `oracle-saisie.mjs` **SA8** |
| Contrôles sans `touch-action: manipulation` ni `-webkit-tap-highlight-color` posé | « `touch-action: manipulation` (prevents double-tap zoom delay) » (l.104) · « `-webkit-tap-highlight-color` set intentionally » (l.105) | Vercel ; mobile-native §2 et §5 ; UI/UX Pro Max n° 25 | `oracle-mobile.mjs` **M10** |
| `<meta name="theme-color">` absent | « `<meta name="theme-color">` matches page background » (l.121) · « `theme-color` per color scheme » (tableau des symptômes de mobile-native, §10) | Vercel ; mobile-native | `oracle-mobile.mjs` **M11** |
| Modale ou tiroir sans `overscroll-behavior: contain` | « `overscroll-behavior: contain` in modals/drawers/sheets » (l.106) | Vercel ; mobile-native §6 | `oracle-surcouche.mjs` **SC5** |
| `<img>` sans `width` ni `height` | « `<img>` needs explicit `width` and `height` (prevents CLS) » (l.80) | Vercel ; UI/UX Pro Max n° 19 | `oracle-images.mjs` **I8** |
| Contrôle pressable sans retour d'appui `:active` | « Button press feedback. `transform: scale(0.97)` on `:active` … Applies to any pressable element. » (STANDARDS l.59) · « Style `:active` » (mobile-native §5) | Emil Kowalski ; UI/UX Pro Max n° 30 | `oracle-motion.mjs` **R14** |

Preuves : sept paires de fixtures (`declencheurs-de4-*`, `saisie-sa8-*`, `mobile-m10-*`,
`mobile-m11-*`, `surcouche-sc5-*`, `images-i8-*`, `motion-appui-*`, chacune en `-verte.html` et
`-rouge.html`), verrouillées par le bloc « sept règles extraites de skills tiers (TF-1911) » de
`self-test.mjs`. La rouge doit rester **PASS, exit 0**, lever sa règle en avertissement et
aucune autre règle neuve du même oracle : elle ne passe donc pas par la boucle `CAS`, où une
rouge doit FAIL.

## Écarts de la règle livrée à la lettre de la source

Une règle extraite n'est jamais la phrase de l'amont ; ce qui s'en écarte est dit ici.

- **SA8** ne vise que les champs `text`, `email`, `tel`, `url`, `number` et `password`. Les
  champs à sélecteur natif (date, couleur, curseur), les listes et les zones de texte sont
  hors règle : `autocomplete` ou `inputmode` n'y a pas de sens à poser. `autocomplete="off"`
  compte comme posé.
- **M10** lève l'avertissement quand **aucun** des deux réglages n'est posé, et cherche
  `touch-action` avec sa valeur `manipulation` : un `touch-action: pan-y` de carrousel ne
  supprime pas le délai de tap. Elle cherche dans toute la feuille, sans résoudre la cascade
  jusqu'au contrôle.
- **SC5** accepte `overscroll-behavior: none` en plus de `contain` : `none` contient aussi le
  défilement, et supprime en plus le rebond. Elle cherche la propriété sur le composant et sur
  ses descendants. Un `[popover]` seul, qui ne défile pas, n'est pas visé.
- **R14** juge qu'une règle `:active` atteint chaque pressable, sans juger ce qu'elle fait :
  la valeur `scale(0.97)` de STANDARDS est un exemple de l'amont, pas un seuil.
- **DE4** ne lève l'avertissement que si le `div` ou le `span` n'a **ni** `role` **ni**
  `tabindex`, comme l'écrit l'étude. Un `role` seul ou un `tabindex` seul le fait taire sans
  prouver que l'élément soit complet (clavier et rôle annoncé) ; l'oracle ne le juge pas.
- **I8** compte une image comme fautive dès qu'il lui manque `width` **ou** `height`, et rend
  un seul constat par page.

**Sur la racine de la page, les deux sources divergent** : Vercel limite
`overscroll-behavior: none` aux pointeurs précis (l.107), mobile-native le pose sur
`html, body` (§6). Le lot ne retient que `contain` sur la sur-couche, où elles s'accordent.

## Règles amont ÉCARTÉES — nommément, et pourquoi

- **Pile** : classes Tailwind, `<Link>`, `onKeyDown`, hydratation React, virtualisation de
  listes, raccourcis Framer Motion. Le socle produit des pages HTML autonomes sans framework.
- **Réseau** : `preconnect` vers un CDN, préchargement de police distante, URL Google Fonts
  et extraits GSAP d'UI/UX Pro Max. Ils contredisent la règle A1 du socle (autonomie réseau).
- **Langue** : Title Case, `&` pour « et », guillemets anglais. Ils contredisent
  `references\ECRITURE.md` et l'usage français.
- **Provenance** : les 119 règles UX d'UI/UX Pro Max, sans colonne de source. Ses 192 règles de
  raisonnement par secteur fixent un style par type de produit, là où la loi n° 6 dérive la
  DA de l'expérience client.
- **Subjectivité** : le « Style DNA » de Brandkit (« premium », « visually expensive »),
  qu'aucun oracle ne mesure.
- **Source unique, en attente d'une seconde** : champ de saisie à 16 px minimum (mobile-native
  §4), étagement de 30 à 80 ms (STANDARDS l.151), flou sous 20 px (STANDARDS l.147),
  `tabular-nums` (Vercel l.68), formats `Intl` (Vercel l.126), points de suspension `…`
  (Vercel l.64). `text-wrap` est déjà tenu à la relecture par
  `critique-le-design\references\liste-de-controle-demande.md`.

## Pas de doublon avec TF-1904

La règle d'appui `:active` est la seule du lot qui touche le mouvement. Les règles R11, R12 et
R13 de TF-1904 (boucle infinie sans pause, durée littérale d'`animate()`, couverture de la
révocation `prefers-reduced-motion`) ne portent aucun retour d'appui : le recouvrement redouté
par le registre n'existe pas, et R14 s'ajoute à leur suite dans `oracle-motion`, seul lieu du
mouvement (`registre-entrees.md`, arbitrage d'autorité).

## Revue

Prévue le **2026-11-16**, critères écrits d'avance (étude 20261019e) :

- les sept paires de fixtures tiennent au self-test ;
- rejouées sur au moins cinq pages produites par la forge, les règles voient la moitié au moins
  de leurs avertissements confirmés à la lecture, sinon la règle est retirée ;
- le delta amont de Vercel et d'Emil Kowalski est relu.

Mesure d'entrée, faite le 2026-10-19 avant l'inscription : voir l'entrée du 19/10/2026 de
`registre-entrees.md`, qui chiffre le bruit sur les fixtures et les démos de la forge et sur
1 405 pages suivies des autres dépôts du poste.

## Invocation

```bash
node oracles/oracle-declencheurs.mjs <page.html>   # DE1–DE3, DE4 (avertissement)
node oracles/oracle-saisie.mjs <page.html>         # SA1–SA7, SA8 (avertissement)
node oracles/oracle-mobile.mjs <page.html>         # M1–M9, M10–M11 (avertissements)
node oracles/oracle-surcouche.mjs <page.html>      # SC1–SC4, SC5 (avertissement)
node oracles/oracle-images.mjs <page.html>         # I1–I7, I8 (avertissement)
node oracles/oracle-motion.mjs <page.html>         # R1–R10, R11–R14 (avertissements)
```
