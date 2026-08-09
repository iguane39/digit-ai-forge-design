# Critique d'implémentation — mode aval (produit implémenté vs promesse design)

Créé le 2026-08-06 sur retour du premier produit réel : une maquette validée par 46 règles en
amont, des gates fonctionnels en aval — et des écarts visuels trouvés par l'utilisateur en
production. Personne ne regardait le **rendu réel de l'implémentation** avec l'œil du design.
Ce mode ferme ce trou.

## Ce que ce mode est, et n'est pas

- Il **compare l'implémentation à la promesse design du run** : la critique classique juge un
  design dans l'absolu ; ce mode juge un produit contre SES artefacts de référence.
- Il produit des **retours consommables par le développement**, jamais de correctif code —
  la frontière de la forge (« elle s'arrête au design ») reste intacte.
- **Frontière avec forge-tests** (à ne pas dupliquer) : le pan `interface` de forge-tests juge
  *« câblé ou pas »* (la fonction) ; ce mode juge *« conforme à la promesse visuelle ou pas »*
  (la forme). Un bouton câblé mais introuvable, hors tokens ou sans état d'erreur rendu relève
  d'ici ; un bouton joli mais inerte relève de forge-tests.

## Entrées (doubles — c'est la nouveauté)

| Référence (la promesse) | Implémentation (le constat) |
|---|---|
| `forge\etapes\design\tokens.css` du run | le CSS réellement servi par le produit |
| la maquette validée (écrans, états, CTA) | l'instance servie (URL) ou les gabarits/HTML du produit |
| `MARQUE.md` (ton, voix, vocabulaire) | les libellés réels de l'UI |

Sans artefacts de référence (produit hors forge), le mode dégrade en critique classique et le
déclare — jamais de conformité jugée sans référentiel.

## Méthode (5 contrôles, chacun avec preuve)

1. **Tokens** : diff entre le `tokens.css` de référence et le CSS servi — toute divergence de
   valeur est nommée (token, valeur attendue, valeur constatée). Un token absent ou une couleur
   en dur dans l'implémentation = écart. Oracle : `oracle-tokens` sur le CSS servi.
2. **Écrans et états** : chaque écran de la maquette existe dans le produit ; chaque état
   maquetté (vide, erreur, chargement) est atteignable et rendu. Un écran maquetté absent ou un
   état non rendu = écart nommé.
3. **CTA et affordances** : chaque CTA de la maquette existe dans l'implémentation avec sa cible
   (pattern « un CTA = une cible » — la convention `data-action`/`href` de la maquette permet le
   mapping mécanique). Un CTA maquetté disparu, dupliqué ou re-libellé = écart.
   (Le câblage effectif, lui, est jugé par le pan `interface` de forge-tests.)
4. **Rendu réel** : `run-oracles-design.mjs <page> --rendu --tokens <tokens-reference>` sur les
   pages clés du produit (ou `render_page.py` contre l'instance servie), **deux thèmes**, tous
   breakpoints — V1 débordements, V2 contraste, V4 chevauchements, a11y.
5. **Voix** : libellés, messages d'erreur et états vides confrontés à `MARQUE.md` (registre,
   vocabulaire, anti-références). Dérive de ton = écart mineur nommé.

## Restitution — des retours, pas une revue

Sortie : `revue-implementation.md` — même squelette que `restitution.md` (verdict
Livrer / Renforcer / Refondre, relevé d'oracles, « ce qui n'a pas été jugé ») **plus** une
section « Écarts à la promesse » où chaque écart est un retour prêt à consigner :

```
- ecart: <tokens|ecran|cta|rendu|voix>
  ancrage: <écran, sélecteur/ligne, breakpoint, thème>
  attendu: <ce que la référence promet, avec sa source>
  constate: <ce que le produit montre, avec sa preuve>
  gravite: bloquant | majeur | mineur
  correction: <proposition actionnable côté development>
```

Ces écarts sont versés par l'orchestrateur au ledger du run (`type: retour`,
`source: produit`, destinataire development) — c'est l'entrant du delta development, puis du
run de version. Verdict Refondre ou ≥ 1 bloquant → retour à l'étape development (boucle bornée
à 3, partagée avec l'étape tests).

## Place dans le workflow (contrat pilot)

Après les gates de development, **en parallèle de l'étape tests** — regards indépendants
(la fonction pour tests, la forme pour ici). Le verdict entre au dossier de MEP.

## Ce que ce mode ne juge pas (déclaré)

- Le câblage fonctionnel des affordances (→ forge-tests, pan `interface`).
- La pertinence produit des écrans (→ conception).
- Les écarts *voulus* entre maquette et produit : un écart assumé se consigne en hypothèse du
  run avec sa raison — le mode le lit et le classe « écart accepté », pas défaut.
