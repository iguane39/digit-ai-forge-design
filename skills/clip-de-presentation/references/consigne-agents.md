# Consigne commune des agents qui construisent un clip

Cette consigne vaut pour chaque agent qui construit un clip d'une série, quand l'orchestrateur en
lance plusieurs à la fois. Elle complète la bible (`references/bible.md`, à lire en entier), elle ne la
remplace pas. Elle est versée le 10/11/2026 (TF-2405) depuis la consigne commune d'une série, écrite
après la validation du style de ses 3 premiers clips et suivie par les agents qui ont construit les
suivants.

## Ce que tu reçois

Un sujet, un dossier de clip, un nom de MP4, le dossier de marque du produit et une liste de sources.
Rien d'autre n'est figé : le storyboard est à toi.

## Ce que tu fais, dans l'ordre

1. **Lire** `references/bible.md`, puis un clip complet de la série comme exemple de facture, puis
   `motion.js`, dont `M.introduire` et `M.carteFin`.
2. **Relever les preuves.** Ouvre chaque source citée dans ta consigne et note dans
   `<dossier>/STORYBOARD.md` la table `id | capacité | source fichier:ligne | statut | mesure du jour`
   du gabarit `gabarits/STORYBOARD.md`. Les statuts sont ceux de la bible : attestée (une source et un
   outillage), partielle (montrée avec sa limite), absente (jamais montrée). Un chiffre montré comme
   fait se mesure le jour même par une commande que tu notes, avec la date (« comptés le
   10/11/2026 »). Un chiffre de décor porte à l'écran l'étiquette « exemple ».
3. **Écrire le storyboard** dans `<dossier>/STORYBOARD.md`, au format du gabarit : décideur visé, fil
   visuel, impacts, une table `Temps | Ce qu'on voit bouger | Légende | Preuve` sur 60 s, et une ligne
   « Introduction » avec le titre, la phrase et les étapes. Chaque plan porte une métaphore visuelle
   forte, distincte de celles des clips déjà faits dans la série ; réutilise-en une seulement si le
   sujet l'exige.
4. **Écrire les textes** selon `references/textes-recit-client.md`, dans leurs budgets de caractères.
5. **Musique** : `python scripts/musique.py --sortie <dossier>/musique.wav --duree 66 --impacts 2,<tes impacts + 6> --intro <+6> --montee <+6> --outro <+6> --cle <ta clé> --graine <ta graine>`.
6. **Construire** `<dossier>/clip.html` depuis `gabarits/clip.html` : même en-tête (thème sombre,
   `tokens.css` du dossier de marque, déclaration de marque, polices de la marque), `window.DUREE = 60`,
   `window.rendre(t)` déterministe, `M.introduire({...})` puis `window.PRET`, puis `M.apercu`. Les
   étiquettes à chasse fixe font 24 px au moins ; les premiers essais en avaient de 17 à 19 px, jugées
   trop petites. La carte de fin passe par `M.carteFin`, qui règle la taille du titre sur la largeur
   utile, ou par une carte maison qui la vérifie aussi. Le lien de la marque est posé par `M.carteFin` :
   ne le redessine pas, et laisse libre la zone y = 770 à 830.
7. **Contrôler** : trois planches au moins (`scripts/rendre.py --planche`), de 16 instants ou plus,
   introduction comprise, lues comme un spectateur, corrigées et rejouées.
8. **Rendre** le MP4 au nom donné, dans le dossier de sortie du produit, puis vérifier par `ffprobe` :
   1920 × 1080, 30 i/s, 65 à 67 s, H.264 `yuv420p`, son AAC.
9. **Juger** : depuis la racine de forge-design, `node oracles/oracle-clip.mjs <dossier> --mp4 <MP4>` ;
   puis la page elle-même, `node oracles/run-oracles-design.mjs <dossier>/clip.html --rendu --type-page editoriale --tokens <dossier de marque>/tokens.css --json-only`.
   Corrige les écarts durs, rejoue après ta dernière écriture, garde les verdicts datés.
10. **Planche du MP4** : tire une image toutes les 3 s du MP4 livré et relis-la.

## Ce que tu ne fais pas

- Pas de commit ni de `git add` quand plusieurs agents écrivent dans le même dépôt : l'orchestrateur
  enregistre tout à la fin par `git commit --only`. C'est une dérogation au contrat d'agent de
  campagne, que la consigne de lancement déclare.
- Tu n'écris que dans ton dossier et ton MP4. Tu ne touches ni la bible, ni `outils/`, ni les autres
  dossiers. Un défaut de `motion.js` se contourne dans ton clip et se signale au rapport.
- Aucun nom de client, de prospect ni de personne ; aucune capacité absente montrée ; aucun
  superlatif.
- Aucune marque codée en dur : le logo, le nom et le lien viennent de la déclaration de marque.
- Rien de publié, aucun service payant, aucun `.env` lu.

## Rapport final, ton dernier message

1. Le chemin du MP4 et la sortie `ffprobe` : durée, taille, codec, format de pixel, son.
2. Le storyboard résumé en une ligne par plan, et la phrase d'introduction.
3. Les preuves : les capacités montrées et leur statut, ce que tu as écarté et pourquoi.
4. Les verdicts datés d'`oracle-clip` et de `run-oracles-design`, constats compris.
5. Ce qui reste faible, franchement, et les défauts de `motion.js` rencontrés.
