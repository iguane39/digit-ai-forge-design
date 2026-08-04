# Modes d'exécution

## Le critère « mérite un agent »

Selon `forge-agents`, une étape devient un agent si au moins une condition tient :
outils distincts, arbitre distinct, ou parallélisable sans dépendance d'entrée.

La génération d'une direction en vérifie **deux** : parallélisable (les trois ne
dépendent pas les unes des autres) et arbitre distinct (chaque direction est jugée
indépendamment sur la rubrique). Le studio est donc légitimement multi-agents — ce
n'est pas de la spécialisation décorative.

Le **jugement**, lui, n'en vérifie aucune : il a besoin des trois directions
ensemble. Il reste dans l'orchestrateur.

## Mode parallèle — sous Claude Code

Trois agents générateurs, un axe, un écran signature commun, aucun contact entre
eux. Chacun reçoit le brief, la fiche de marque si elle existe, son pôle sur l'axe,
et rend deux artefacts : `tokens-{a|b|c}.css` et `signature-{a|b|c}.html`.

Contraintes héritées de `forge-agents` :

- Tout ce qui traverse une frontière entre agents est un **artefact nommé** avec
  en-tête de provenance. Jamais un état conversationnel implicite.
- Un ✗ traverse, jamais masqué.
- **Ledger append-only** persisté dans le dossier du projet, vérifié avant
  restitution.
- Les agents générateurs ne voient pas la rubrique. Un générateur qui connaît le
  barème optimise le barème, pas le design.

## Mode dégradé — mono-agent

Quand le parallélisme n'est pas disponible, `la-boucle` en **largeur** couvre le
besoin : 2-3 candidats distincts par construction, l'arbitre les classe, on
approfondit le meilleur.

Ce que le mode dégradé perd, et qu'il faut consigner : les trois directions sont
produites en séquence par le même contexte, donc **elles se contaminent**. La
deuxième sait ce qu'a fait la première. Le test de divergence réelle
(`axes-de-divergence.md`) devient d'autant plus important — c'est lui qui rattrape
la contamination, et il échouera plus souvent.

Le mode utilisé est **déclaré dans `DIRECTION.md`**. Prétendre à un run parallèle
hors du substrat qui le permet est un mensonge de restitution.

## Structure de DIRECTION.md

```markdown
# Direction retenue — {Client}

## Axe de divergence
{l'axe}, choisi parce que {la tension non tranchée du brief}

## Mode d'exécution
parallèle (3 agents) | dégradé mono-agent — conséquences assumées : {…}

## Retenue : {nom}
{tokens.css} · {écran signature}
Ce qu'on se rappellera : {la signature, en une phrase}
Relevé : R1 ✓ {preuve} · R2 ✓ {verdict oracle} · … · score {n}/6

## Écartée : {nom}
Pôle : {…} · Score : {n}/6
Éliminée sur : {le critère}, {la preuve}
Ce qu'elle avait de bon, et qui a été greffé sur la retenue : {…}

## Écartée : {nom}
{idem}

## Ce que la rubrique n'a pas jugé
Goût du commanditaire · cohérence avec une marque non figée · coût de construction
```

La ligne « ce qu'elle avait de bon, et qui a été greffé » n'est pas de la politesse :
une compétition dont on ne retient rien des perdantes a mal divergé.
