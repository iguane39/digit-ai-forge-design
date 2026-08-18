# Dépendances vendorées

Le contrat de la forge interdit toute requête réseau **au runtime du livrable**.
Ce qui est chargé au build est donc figé ici, version épinglée et empreinte notée.

## motion-12.23.12.umd.js

| | |
|---|---|
| Source | `https://cdn.jsdelivr.net/npm/motion@12.23.12/dist/motion.js` |
| Version | 12.23.12, épinglée — jamais `@latest` |
| Taille | 79 ko, **autonome** (zéro `import`, exposé en global `Motion`) |
| Empreinte | `sha256:cbaccc5c5809cdaa2777ded956e475a404f0596048cb9645c8c80da85c6e8174` |
| Licence | MIT — voir `motion-LICENSE.txt` |
| Récupéré le | 2026-08-04 |

### Pourquoi la version UMD et pas les 2,3 ko annoncés

La documentation de motion.dev annonce un `animate()` mini à 2,3 ko. Ce chiffre
est la taille **après tree-shaking par un bundler** : le build ESM correspondant
(`framer-motion/dom/mini`) n'est pas autonome — il importe `motion-dom` et
`motion-utils` depuis le CDN. L'inliner tel quel réintroduirait exactement les
requêtes réseau que le contrat interdit.

Trois voies étaient possibles :

1. **UMD autonome, 79 ko** — retenue. Zéro dépendance, un seul fichier, vérifiable.
2. Aplatir la chaîne ESM à la main — fragile, à refaire à chaque montée de version.
3. Introduire npm + un bundler dans la forge — un `node_modules` et une étape de
   build pour économiser 77 ko sur un plafond de 10 Mo.

79 ko représentent **0,8 %** du budget de poids du livrable. L'arbitrage est fait ;
la mention « 2,3 ko » a été corrigée dans le contrat technique, où elle était fausse.

### Usage

```html
<script>/* contenu de motion-12.23.12.umd.js, inliné */</script>
<script>
  const { animate, scroll, inView } = Motion;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animate('.carte', { opacity: [0, 1], transform: ['translateY(8px)', 'none'] },
            { duration: 0.24, easing: [0.16, 1, 0.3, 1] });
  }
</script>
```

Jamais de `<script src="https://cdn.jsdelivr.net/...">` dans le livrable :
`check_maquette.py` refuse toute URL absolue chargée.

**La durée de l'exemple tient sous le plafond de la forge — 300 ms** (`PLAFOND_MS` de
`oracles/oracle-motion.mjs`, la même valeur que `--dur-plafond` de `systeme-de-marque`).
L'exemple portait `duration: 0.4` : 400 ms, au-dessus du plafond que R4 et R9 opposent à
toute feuille de style. Et il y échappait doublement — `oracle-motion` ne juge que le CSS,
les durées passées à `animate()` sont déclarées non jugées. Un exemple non jugé qui enseigne
exactement ce que l'oracle refuse est pire qu'une règle absente : il fabrique la dérive avec
l'autorité de la documentation. **Ce que la forge ne peut pas mesurer, elle doit au moins
l'écrire juste.** (TF-0335, 18/08/2026)

### Vérifier l'empreinte

```bash
sha256sum oracles/vendor/motion-12.23.12.umd.js
# doit donner cbaccc5c5809cdaa2777ded956e475a404f0596048cb9645c8c80da85c6e8174
```
