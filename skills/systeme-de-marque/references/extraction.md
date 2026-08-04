# Extraction de l'identité

## Protocole par entrant

| Entrant | Extractible | Hors de portée |
|---|---|---|
| Charte PDF ou guideline | palette nommée, polices sous licence, règles d'usage, interdits | l'usage réel en interface |
| Site en ligne | tokens CSS effectifs, polices chargées, densité, vocabulaire | l'intention derrière les choix |
| Logo seul | 2 à 3 couleurs, un registre formel, parfois une police | tout le système : surfaces, neutres, états |
| Screenshot | direction, contrastes apparents, hiérarchie | valeurs exactes, thème alternatif |
| Trois mots de ton | la direction verbale, le registre | tout le visuel — à proposer, pas à déduire |

**Le niveau de confiance est déclaré.** Une charte PDF sous licence ne donne pas le
même socle que trois mots lâchés en réunion. La restitution le dit.

## Fiche de marque à remplir avant tout choix

```
Mode                 : client | digit-ai
Secteur              : ...
Cible (qui, contexte): ...
Ton                  : 3 mots concrets, ni « moderne » ni « élégant »
Anti-références      : ce à quoi ça ne doit surtout pas ressembler, et pourquoi
Contraintes reprises : ce qui doit survivre (couleur de marque, police sous licence, jargon)
Thème par défaut     : clair | sombre — dérivé du contexte d'usage réel, pas du goût
Hypothèses           : ce qui est supposé faute d'accès
```

Les anti-références valent souvent plus que les références : elles bornent l'espace
quand le client ne sait pas dire ce qu'il veut, mais sait dire ce qu'il déteste.

## Choix du thème par défaut

Dérivé du contexte d'usage, jamais d'un réflexe. Une application de supervision
consultée de nuit en salle sombre veut du sombre. Un portail patient consulté sur
téléphone dans une salle d'attente veut du clair. Ni « sombre pour faire moderne »,
ni « clair par prudence » : les deux sont des retraits, pas des décisions.

## De la matière, pas une décision

```
python corpus/recherche.py "<secteur> <cible> <ton>" --systeme-de-design
```

Le corpus **propose** un style, un appariement typographique, une palette et des
patterns, chacun sourcé. Rien n'oblige à le suivre. Deux règles :

1. Ce qui est retenu est retenu **pour ce brief**, pas parce que c'était en tête de
   liste. La justification tient en une phrase et part dans la restitution.
2. Une requête sans résultat se déclare — « le corpus ne couvre pas cette
   surface » — et le choix se fait hors corpus. On n'invente pas une entrée pour
   remplir un trou.

## Ce qui n'est jamais fait

Reprendre le logo, les photos ou les contenus d'un tiers sans que la refonte soit
commanditée par leur propriétaire. Déduire une palette complète d'un logo sans le
dire. Accepter une police de la liste réflexe parce que « le client y tient » sans
avoir proposé l'alternative.
