// lib/color.mjs — ré-export de la source canonique, embarquée dans le skill
// systeme-de-marque (TF-0242). La synchronisation des skills copie le DOSSIER du
// skill sans suivre les imports qui en sortent : la lib doit donc vivre dans le
// skill, et les oracles la consomment d'ici sans changer leurs imports.
// Ne rien implémenter dans ce fichier — corriger la source canonique.
export * from "../../skills/systeme-de-marque/scripts/lib/color.mjs";
