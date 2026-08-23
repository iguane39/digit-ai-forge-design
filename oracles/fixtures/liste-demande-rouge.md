# Revue de design — client — 20260822a

## Liste de contrôle de la demande — 22/08/2026, 4 points

| # | Point demandé | Correction apportée | Preuve |
|---|---|---|---|
| 1 | « les tableaux sont illisibles en mobile » | repli en cartes sous 640 px | `render_page.py --widths 390` : 0 débordement |
| 2 | « le titre passe à la ligne » | text-wrap balance | vérifié |
| 3 | « la colonne de texte est trop étroite » | largeur portée à 1424 px | |
