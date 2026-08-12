# Brief synthétique — TF-0102 (3/3)

Cas synthétique construit pour exercer réellement `studio-de-direction`, jusque-là
« déclaré, jamais exercé » (item K de `TODO.md`, 04/08/2026). Aucun client réel :
le brief est fictif, construit pour porter une tension non tranchée exploitable.

## Commanditaire fictif

Meunier Industries — cabinet de conseil en cybersécurité pour PME industrielles
(50 à 300 salariés). Le produit : un tableau de bord de posture de sécurité que
le dirigeant (pas le RSSI) consulte chaque semaine.

## Le brief, tel que donné

> « On veut que le dirigeant sente qu'on le protège vraiment — pas un scanner
> froid qui recrache des CVE qu'il ne comprend pas, mais pas non plus un truc
> lisse qui ferait oublier que c'est un vrai sujet de sécurité. Rassurant sans
> être anesthésiant. »

## Tension non tranchée → axe

« Rassurant mais pas anesthésiant » ne tranche pas entre le registre **technique
froid** (le sérieux d'un centre opérationnel) et le registre **humain chaud**
(la réassurance d'un service qui protège des gens, pas des serveurs). C'est
l'axe **Température** de `references/axes-de-divergence.md`, pris tel quel dans
sa case d'usage documentée (« santé, social, service vs infra, finance » — ici
un service de sécurité vendu à des dirigeants non techniques, pas à des RSSI).

## Écran signature — commun aux trois directions

Un tableau de bord de posture : score global, incidents actifs, temps de
réponse moyen, liste des derniers incidents. Contenu réel identique dans les
trois directions (même score, mêmes incidents, mêmes CVE) — seuls tokens et
composition divergent, conformément à la règle du socle qui ne diverge pas.

Deux éléments du monde du sujet, cités et exploités dans les trois directions
(R1 de la rubrique) :
1. **Le vernaculaire des opérations de sécurité** — identifiants techniques en
   police mono (CVE-2026-xxxx, adresses d'hôte), format d'un journal
   d'incidents plutôt que d'un tableau marketing.
2. **L'artefact universel de la protection** — un pictogramme de bouclier dans
   l'en-tête, jamais un logo abstrait.

## Mode d'exécution

**Dégradé mono-agent** — un seul agent de campagne, pas de sous-agents
parallèles (contrainte de la campagne TF-0102 : n'écrire que dans ce dépôt,
un seul contexte). Conséquence assumée et déclarée par le skill lui-même
(`references/run.md`) : les trois directions sont produites en séquence par le
même contexte, donc un risque de contamination existe — c'est pourquoi le test
de divergence réelle ci-dessous est passé au chiffre, pas à l'impression, avant
tout jugement.
