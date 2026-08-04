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
| Motion | build UMD autonome de Motion (79 ko, v12.23.12) inliné depuis `oracles/vendor/` ; `transform` et `opacity` seulement ; `prefers-reduced-motion` respecté ; ni rebond ni élastique |
| Images | générées au build, embarquées en base64, ≤ `IMAGES_MAX_KO`, tracées au `manifeste-images` |
| Cible mobile | châssis d'appareil, safe areas, cibles ≥ 44 px — voir `cadre-mobile.md` |
| Impression | `@media print` fonctionnelle |

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
