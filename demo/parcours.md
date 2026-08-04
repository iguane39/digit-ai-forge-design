# Parcours — Maquette Bailleur / Interventions

> Trace **exécutée** par `demo/executer-parcours.py` (Chromium via Playwright)
> le 2026-08-04. Chaque étape porte son assertion : rien n'est approuvé sans vérification.
> Le focus est contrôlé à chaque tabulation ; une seule invisibilité fait échouer le parcours.

## Parcours 1 — Décider : d'un indicateur jusqu'à l'action qu'il déclenche

**Statut : OK** · exécuté le 2026-08-04

- route #tableau-de-bord
- vu : KPI « Demandes ouvertes »
- vu : alerte de decision
- focus a « Aller au contenu »
- focus a « Tableau de bord »
- focus a « Demandes »
- focus a « Fiche demande »
- focus a « Bibliothèque »
- focus a « États système »
- focus a « Vue mobile »
- focus button « Densité : confortable »
- focus button « Thème : auto »
- focus a « Ouvrir la liste filtrée sur les urgentes »
- focus a « Aller au contenu »
- route #demandes
- vu : liste des demandes
- route #demande
- vu : fiche DI-4821
- vu : ETAT NON NOMINAL : erreur de piece jointe

## Parcours 2 — Produire : filtrer jusqu'à l'absence de résultat, puis revenir

**Statut : OK** · exécuté le 2026-08-04

- route #demandes
- vu : ETAT NON NOMINAL : etat vide instructif
- vu : issue proposee depuis l'etat vide
- vu : retour a la liste complete
- vu : legende de tri mise a jour
- focus input «  »
- focus button « Densité : confortable »
- focus button « Référence »
- focus button « Logement »
- focus button « Objet »
- focus button « Statut ▲ »
- focus a « DI-4824 »
- focus a « DI-4821 »

## Parcours 3 — Adapter : la même information en mobile

**Statut : OK** · exécuté le 2026-08-04

- viewport 390x844
- route #mobile
- vu : vue mobile dans le chassis
- vu : feuille modale ancree en bas, voile et aria-modal presents
- vu : fermeture de la feuille
- route #demandes
- vu : reflow de table en cartes (td en display:flex)
- vu : en-tete repris en libelle ("Référence")

## Verdict C13

**PASS** — 3/3 parcours exécutés sans échec.

Ce que cette trace ne prouve pas : les gestes tactiles réels (balayage, pull-to-refresh), le comportement du clavier virtuel, et le rendu des polices système sur appareil. Chromium en viewport 390 px n'est pas un téléphone.
