# Contrat technique du fichier

| Contrainte | Valeur |
|---|---|
| Format | un seul `.html`, ouvrable en double-clic |
| Dépendances externes | **aucune** — zéro CDN, tout inline, fonctionne hors connexion |
| Budget de poids | **≤ 10 Mo** (repère : 837 Ko pour un seul écran de données dense) |
| Données | constante JS en tête de fichier, rendu dynamique |
| Thèmes | clair et sombre, bascule persistée, `prefers-color-scheme` respecté au premier chargement |
| Routage | hash-based, historique navigateur fonctionnel, deep-link vers chaque écran |
| Breakpoints | 390 / 768 / 1024 / 1440 / 1920 px, portrait et paysage |
| Remplissage | aucune colonne vide latérale, aucun vide vertical > 1 écran, largeur de ligne de texte ~70ch |
| Mobile / tables | reflow en cartes obligatoire sous 768 px |
| Motion | build UMD autonome de Motion (79 ko, v12.23.12) inliné depuis `oracles/vendor/` ; `transform` et `opacity` seulement ; ni rebond ni élastique |
| Mouvement — durées | tokens `--dur-*` du système de marque, consommés par `var()` ; jamais un littéral, jamais au-delà de `--dur-plafond` (300 ms) — `oracle-motion` R4, R8, R9 |
| Mouvement — révocation | bloc `@media (prefers-reduced-motion: reduce)` qui **neutralise vraiment** (durées à ~0, ou `transition`/`animation: none`) — **bloquant**, R10, repris en C4 par délégation |
| Images | embarquées en base64, ≤ `IMAGES_MAX_KO`, tracées au `manifeste-images` : générées au build (`genere: true` — prompt, modèle, date) ou relevées sur mandat (`genere: false` — source, date de relevé) |
| Cible mobile | châssis d'appareil, safe areas, cibles ≥ 44 px — voir `cadre-mobile.md` |
| Favicon | `<link rel="icon">` obligatoire, `href` en `data:` uniquement — jamais absent, jamais chargé depuis le réseau |
| Saisie de date | `<input type="date">` natif uniquement — aucun datepicker maison au MVP |
| Champs de saisie | **TYPÉ, PROPOSÉ, BORNÉ, ATTEIGNABLE** pour tout champ, tout format, tout contexte — `oracle-saisie` SA1–SA6, doctrine dans `patterns-interaction.md` |
| Geste d'ouverture | un champ temporel natif s'ouvre au clic **n'importe où** sur le champ (`showPicker()` délégué), garde `disabled`/`readOnly`, `try/catch`, clavier intact — `oracle-saisie` SA5/SA6 |
| Écrans de création | deux motifs légitimes : formulaire replié (création simple) ou panneau adressable (tâche à branches) — `oracle-panneau-tache` PA1–PA6 |
| Impression | `@media print` fonctionnelle |

## Favicon et saisie de date — promesses non négociables au MVP

Retour de production RD-5 : ni favicon ni datepicker n'étaient au contrat, alors
qu'aucun des deux n'était réellement optionnel — l'un se voit dans l'onglet dès le
premier chargement, l'autre se remarque à la première saisie.

- **Favicon** : `<link rel="icon" href="data:...">` inline, jamais un
  `favicon.ico` chargé depuis un serveur. Un `data:,` minimal est acceptable si
  l'identité graphique n'est pas encore tranchée — l'absence pure ne l'est jamais.
- **Saisie de date** : `<input type="date">` natif exclusivement, au MVP — aucun
  datepicker maison, aucune librairie de calendrier custom. Le natif est moins
  personnalisable, mais il est correct hors connexion, accessible au clavier par
  défaut, et gratuit sur le budget de poids ; un datepicker maison est un composant
  entier à spécifier, construire et rendre accessible pour un gain cosmétique que
  le MVP n'a pas à payer.

### Geste global d'ouverture — le snippet de référence

TF-0739 : sur un `input type="date"`, seul le clic sur l'icône de bord ouvre le
sélecteur ; le corps du champ — la quasi-totalité de sa surface — place un curseur
de saisie. Le correctif tient en huit lignes posées **une seule fois** dans le script
global, et vaut d'un coup pour tous les écrans porteurs de dates. Coût constaté chez
le produit : une demi-heure, un test. Le coût réel est dans la **redécouverte par
chaque produit** — d'où ce snippet, à recopier tel quel dans toute maquette.

```js
// Cible de geste : tout le champ, jamais la seule icône de vingt pixels.
document.addEventListener('click', function (ev) {
  var champ = ev.target.closest(
    'input[type="date"], input[type="time"], input[type="datetime-local"],' +
    ' input[type="month"], input[type="week"]');
  if (!champ) return;
  if (champ.disabled || champ.readOnly) return;   // un champ inactif n'ouvre rien
  try { champ.showPicker(); } catch (e) { /* navigateur qui refuse : silence */ }
});
```

Trois garanties que le snippet doit conserver, et que `oracle-saisie` vérifie :
la **garde** `disabled`/`readOnly` (SA5), le **silence** si le navigateur refuse le
geste — `try/catch`, jamais une erreur en console (SA5), et la **saisie clavier
entière** : Tab n'ouvre rien, Échap ferme, le champ reste éditable (SA6). Ne jamais
poser `readonly` sur un champ temporel pour forcer le sélecteur.

## Conséquences du zéro-CDN

Assumées, à annoncer dans la restitution plutôt qu'à masquer :

- **Cartographie** : SVG ou GeoJSON simplifié inline. Pas de tuiles, donc pas de
  zoom continu sur fond de carte réel.
- **Graphiques** : SVG maison. Suffisant pour barres, lignes, aires, donuts,
  jauges et sparklines ; à éviter pour les projections complexes.
- **3D** : rendu pré-calculé (séquence d'images ou SVG isométrique) piloté au
  glisser. Pas de moteur temps réel.
- **Polices** : système ou embarquées en base64 — arbitrer entre poids et
  identité, et le dire. Les appariements `dispo=fontshare` du corpus **exigent**
  l'embarquement : pas de CDN de fonderie.
- **Motion** : le CDN jsDelivr documenté par motion.dev est **interdit**. Le fichier
  est vendoré dans `oracles/vendor/motion-12.23.12.umd.js`, empreinte notée, licence
  jointe. Les « 2,3 ko » annoncés par la doc sont la taille **après tree-shaking par
  un bundler** : le build ESM mini n'est pas autonome, il importe `motion-dom` et
  `motion-utils` depuis le réseau. On inline donc l'UMD autonome — 79 ko, soit 0,8 %
  du plafond de 10 Mo. Détail de l'arbitrage : `oracles/vendor/README.md`.
- **Images** : aucune ne se charge depuis une URL. Génération au build via Gemini
  (`.env`), optimisation, puis base64. Le manifeste de génération part avec le
  livrable — sans lui, on ne saura plus dans six mois ce qui a été montré au client.

## Structure de fichier recommandée

```
<head>   tokens :root (clair + sombre), reset, composants, écrans, print
<body>   chrome (menu, barre, bandeau démo) + <main id="app">
<script> DATA (constantes)  |  ROUTES  |  render()  |  composants  |  init
```

Un seul point d'entrée `render(route)`. Les écrans sont des fonctions pures qui
retournent du HTML : c'est ce qui rend le parcours vérifiable par script.

## Performance

Au-delà de 500 lignes dans une table, virtualiser ou paginer. Le point de rupture
d'un fichier de cette taille est le temps de rendu initial, pas le poids : ne pas
peindre les 20 écrans au chargement, ne peindre que la route active.
