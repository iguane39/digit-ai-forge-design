# Cadre mobile

À lire dès que la cible inclut `mobile`. Ce qui suit s'ajoute au contrat technique,
ne le remplace pas.

## Décision de fond

Le mobile est **simulé dans le fichier HTML unique**, jamais produit en natif
(React Native, Flutter, Swift, Kotlin). Deux raisons, toutes deux structurelles :

1. Une sortie native fait tomber le contrat « double-clic, hors connexion » qui est
   la valeur du livrable.
2. Elle ferait entrer le skill dans la construction de produit, explicitement hors
   du périmètre de la forge.

Ce qu'on perd : le rendu exact du système, les gestes natifs réels, la performance
mesurée sur l'appareil. **Ces trois limites sont dites dans la restitution**, pas
masquées derrière un châssis réaliste.

## Châssis d'appareil

Un cadre dessiné, pas une image : bordure d'écran, encoche ou îlot dynamique, barre
d'état (heure, réseau, batterie), indicateur de home. Deux gabarits suffisent — un
iOS, un Android — au format 390 × 844 et 412 × 915.

Le châssis est **décoratif** : il porte `aria-hidden="true"`, il ne piège pas le
focus, et le contenu réel reste atteignable au clavier depuis l'extérieur du cadre.

## Zones de sécurité

```css
.chrome-bas {
  position: fixed; inset-inline: 0; bottom: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

`viewport-fit=cover` est obligatoire dans la balise viewport, sinon les insets
valent 0 et la règle ne sert à rien. Vérifié par `oracle-mobile` M3.

## Patterns attendus, au moins trois en fonctionnement

| Pattern | Ce qu'il doit démontrer |
|---|---|
| Barre d'onglets basse | 3 à 5 destinations, état actif visible, atteignable au pouce |
| Feuille modale ancrée en bas | poignée, points d'arrêt, fermeture au balayage et à Échap |
| Balayage pour action | action révélée, seuil de validation, **annulation possible** si destructive |
| Pull-to-refresh | seuil, retour visuel, état de chargement distinct |
| Reflow de table en cartes | sous 768 px, en-tête repris en libellé de champ |

Une capture morte ne démontre rien. Chaque pattern est cliquable.

## Cibles tactiles

44 × 44 px minimum, 8 px d'espacement entre deux cibles voisines. C'est le plancher
d'Apple HIG ; WCAG 2.2 descend à 24 × 24, on ne s'y aligne pas — le pouce n'est pas
un curseur. Vérifié par `oracle-mobile` M2, dont la limite est déclarée : il juge
les tailles **déclarées**, pas la taille effective après cascade.

## Orientation

Le paysage est rendu, pas seulement toléré. `100vh` est proscrit au profit de
`100dvh`, et une règle `@media (orientation: landscape) and (max-height: 480px)`
libère la hauteur : chrome allégé, barre basse remise dans le flux.

## Un état saisi survit à la navigation

Sur mobile, la barre d'onglets basse est le geste le plus fréquent : l'utilisateur en
sort et y revient sans y penser. **Tout ce qu'il a saisi doit être là au retour.**

Dans une maquette mono-fichier, la question ne se pose pas — la navigation est une
ancre ou un routeur JS, le document ne recharge jamais. Dans le produit rendu, elle se
pose à chaque onglet, et un formulaire rendu par le serveur ne suffit pas : le 06/09,
un panier est passé de 2 à 0 après « Aide » puis « La carte ».

L'état saisi est donc confié à un support qui survit à un rechargement :

| Support | Ce qu'il faut écrire | Quand |
|---|---|---|
| `sessionStorage` | relecture à l'ouverture, écriture à chaque `input` | état de travail, panier, filtres |
| `localStorage` | idem, persistant entre sessions | préférences, brouillons longs |
| Session serveur / cookie | `data-etat-persiste="<support>"` sur le formulaire | quand le serveur détient déjà l'état |

Vérifié par `oracle-mobile` M7, dont la limite est déclarée : il juge le support
**déclaré**, pas la survie effective. Celle-ci se mesure par un parcours C13 **rejoué
sur le produit rendu** (`criteres-sortie.md`, « Ce que la maquette mono-fichier ne peut
pas prouver »).

## Ce qui reste non jugeable par script

Gestes réels, inertie du défilement, comportement du clavier virtuel, rendu des
polices système. Tout cela est déclaré `non_juge` par `oracle-mobile` et relève
d'un parcours exécuté, ou d'un arbitrage assumé dans la note de partis pris.
