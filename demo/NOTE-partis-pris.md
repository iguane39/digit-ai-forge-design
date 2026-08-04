# Note de partis pris — Maquette Bailleur / Interventions

> **Run de validation de la forge, pas un livrable client.** Son objet était de
> confronter les oracles à un fichier réel pour révéler leurs faux négatifs. Il en a
> révélé trois. Ne pas envoyer en l'état : voir « Ce que la maquette ne fait pas ».

Fichier : `Digit-AI - Maquette Bailleur - Interventions - 20260804a.html` · 108 Ko
Produit le 04/08/2026 par `node demo/build.mjs`.

## Entrant et cadrage

| | |
|---|---|
| Entrant | idée, sans produit existant — le type d'entrant ajouté au pivot en v2.0.0 |
| Secteur | logement social, gestion de patrimoine |
| Cible | gestionnaires de secteur et gardiens, en poste, souvent sur mobile |
| Job principal | suivre une demande d'intervention de son signalement à sa clôture |
| Ton | institutionnel, direct, sans esbroufe |
| Cible technique | web + mobile · Fidélité : maquette |

## Direction retenue, et pourquoi elle n'est pas celle du corpus

`corpus/recherche.py` a proposé **Art déco géométrique** (ST10) et l'appariement
**Gambetta / Supreme**. Proposition écartée : BM25 a matché sur l'homonymie de
« patrimoine » — patrimoine *immobilier* d'un bailleur social contre patrimoine
*culturel* du secteur luxe/hôtellerie. C'est un faux positif du corpus, pas une
direction.

Retenu à la place, par arbitrage explicite :

- **Style ST13 — Tableau de bord dense.** Tension : information contre respiration.
  C'est le bon compromis pour un back-office consulté en continu par des
  professionnels. Piège associé, traité : deux densités sont proposées.
- **Palette PA05 — Bleu institutionnel**, hue 250, en OKLCH, deux thèmes.
- **Typographie : polices système.** Georgia en titre, `ui-sans-serif` en corps,
  `ui-monospace` en utilitaire. **Écart assumé** : le contrat impose l'embarquement
  en base64 des polices choisies ; ce run ne l'a pas fait, pour rester léger. Un
  livrable client devra embarquer un appariement du corpus.
- **Signature** : la colonne « Échéance » exprimée en délai restant plutôt qu'en
  date. C'est la seule information que le gestionnaire regarde en premier.

## Mouvement

Motion 12.23.12, build UMD **vendoré et inliné** (79 Ko), empreinte SHA-256
vérifiée au build par `demo/build.mjs` — le build échoue si elle diverge. Aucune
requête réseau dans le fichier. `prefers-reduced-motion` coupe l'animation, et
`transform`/`opacity` sont les seules propriétés animées.

## Visuels

**Aucun visuel généré.** L'appel à l'API Gemini est payant : il n'a pas été passé
sans autorisation explicite. Le graphique est un SVG maison, légendé et
`role="img"`. `oracle-images` est donc reporté **SANS OBJET**, pas PASS.

## Conséquences assumées du zéro-réseau

Graphique en SVG maison — suffisant pour une courbe, à éviter pour une projection.
Polices système — voir l'écart ci-dessus. Aucune cartographie dans ce run.

## Relevé des contrôles exécutés

| Contrôle | Verdict | Détail |
|---|---|---|
| `check_maquette.py` | **PASS** | 0 finding · 0,11 Mo · 7 routes · 0 ressource externe · breakpoints 480/768/1024 |
| `oracle-slop` S1–S10 | **PASS** | 0 écart dur, 0 avertissement |
| `oracle-tokens` T1–T6 | **PASS** | 33 tokens clairs, 14 sombres, **20 paires de contraste mesurées** |
| `oracle-mobile` M1–M6 | **PASS** | contrôle négatif effectué : M4 passe bien en FAIL quand on retire le reflow |
| `oracle-images` I1–I6 | **SANS OBJET** | aucune image dans le document |
| `render_page.py` V1–V7 | **NON LANCÉ** | Playwright non vérifié sur cette machine — contraste mesuré et débordements restent dus |
| `oracle-a11y.py` | **NON LANCÉ** | idem |
| Parcours C13 | **✗ ÉCHEC** | tracés depuis le code, **jamais cliqués dans un navigateur**. Voir `parcours.md` |

## Ce que la maquette ne fait pas

- **Elle n'a pas été ouverte dans un navigateur.** Rien de ce qui exige un rendu
  réel n'est validé : contraste mesuré, débordements, navigation clavier effective,
  comportement du clavier virtuel. Trois oracles sur huit contrôles restent dus.
- **Elle ne couvre pas l'inventaire d'écrans complet.** Six routes au lieu des neuf
  écrans du socle : ni connexion, ni catalogue, ni galerie, ni onboarding. Un
  livrable client serait non conforme sur ce point.
- **Le mobile est simulé** dans un châssis. Le rendu système, les gestes natifs et
  la performance sur appareil ne sont pas reproduits.
- **Les données sont fictives** et le bandeau le dit sur tous les écrans. Aucun
  montant, aucun locataire, aucune résidence réels.
- **Ce n'est pas un socle technique.** Aucun code de production n'en sort.

## Support de refonte

Les trois artefacts prévus au contrat — `tokens.css`, inventaire des composants,
carte des écrans — **n'ont pas été extraits** : hors périmètre de ce run de
validation. Les tokens sont lisibles dans le `:root` du fichier.
