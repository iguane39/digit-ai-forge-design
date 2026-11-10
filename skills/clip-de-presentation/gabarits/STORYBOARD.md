# Storyboard — « À REMPLACER : sujet du clip » (jj/mm/aaaa)

Gabarit du skill clip-de-presentation. Copier en `<dossier du clip>/STORYBOARD.md`, remplacer chaque
« À REMPLACER », supprimer les lignes d'exemple. `oracle-clip` lit ce fichier : la table de preuves
y atteste les chiffres montrés comme des faits (CL5), et la section « Contrôles » y garde les verdicts.

- **Décideur visé** : À REMPLACER, par exemple un responsable du domaine, ou un décideur qui n'en a que
  les bases.
- **Fil visuel** : À REMPLACER, la métaphore qui porte tout le clip, en une phrase.
- **Marque** : dossier `À REMPLACER : ../marque/` (`tokens.css`, logo pour fond sombre), déclaré dans
  l'en-tête de `clip.html`.
- **Impacts musicaux**, en temps du clip : À REMPLACER, par exemple `6,14,22,34,44,54` ;
  `--intro 6 --montee 14 --outro 54`. La musique se génère en temps du MP4, chaque valeur plus 6 :
  `python scripts/musique.py --sortie musique.wav --duree 66 --impacts 2,12,20,28,40,50,60 --intro 12 --montee 20 --outro 60 --cle 0 --graine 7`.

## Introduction

| Élément | Texte | Caractères | Budget |
|---|---|---|---|
| Titre | À REMPLACER | | 30 |
| Phrase | À REMPLACER : une phrase vraie | | 90 |
| Étapes | À REMPLACER · … · … · … | | 16 chacune, 4 à 6 étapes |

## Plans

Une ligne est un plan, en temps du clip. Chaque plan porte une seule métaphore visuelle forte ; la
colonne « Preuve » renvoie à la table de preuves, ou porte « — » quand le plan n'affirme rien.

| Temps | Ce qu'on voit bouger | Légende | Preuve |
|---|---|---|---|
| 0–6 | À REMPLACER : la situation de départ, en mouvement continu | À REMPLACER (61 caractères au plus) | — |
| 6–14 | À REMPLACER : le geste fort posé sur l'impact de 6 s | À REMPLACER | P-01 |
| 54–60 | La caméra recule, puis la carte de fin à 55,5 | Carte : « À REMPLACER : ligne 1 / ligne 2 » / « À REMPLACER : sous-titre » | — |

## Preuves

Une ligne est une capacité montrée. Les statuts sont ceux de la bible : **attestée** (une source et un
outillage), **partielle** (montrée avec sa limite), **absente** (jamais montrée). Un chiffre montré comme
un fait porte, dans la colonne « mesure du jour », la commande qui l'a compté et sa date ; il s'affiche
avec cette date à l'écran.

| id | capacité | source fichier:ligne | statut | mesure du jour |
|---|---|---|---|---|
| P-01 | À REMPLACER : ce que le plan affirme | `À REMPLACER:12` | attestée | — |
| P-02 | À REMPLACER : un chiffre montré comme fait, par exemple 189 contrôles | `À REMPLACER:40` | attestée | `À REMPLACER : commande de comptage`, 10/11/2026 |

## Chiffres montrés

Une ligne est un chiffre visible à l'écran. Un chiffre est un **fait**, attesté par une ligne de preuves
datée, ou un **décor**, et l'écran porte alors l'étiquette « exemple » à côté de lui.

| Chiffre | Plan | Nature | Preuve ou étiquette |
|---|---|---|---|
| À REMPLACER : 42 tâches | 6–14 | décor | étiquette « exemple » |

## Textes

Le relevé et la version en récit suivent `references/textes-recit-client.md`. Une ligne est un
emplacement, dans l'ordre d'apparition ; le moment se compte en temps du MP4.

| Moment (s) | Emplacement | Texte | Caractères | Budget |
|---|---|---|---|---|
| 6,5 | Légende 1 | À REMPLACER | | 61 |
| 61,5 | Titre de la carte de fin, ligne 1 | À REMPLACER | | 40 |

## Contrôles

- Planches de 16 instants ou plus, introduction comprise, relues comme un spectateur : `planche-1.jpg`,
  `planche-2.jpg`, `planche-3.jpg`, avec la date et ce que chaque lecture a corrigé.
- `node oracles/oracle-clip.mjs <ce dossier> --mp4 <MP4>`, depuis la racine de forge-design : verdict
  daté, constats et `non_juge` reportés tels quels.
- `ffprobe` du MP4 livré : durée, 1920 × 1080, 30 i/s, H.264 `yuv420p`, son AAC.
