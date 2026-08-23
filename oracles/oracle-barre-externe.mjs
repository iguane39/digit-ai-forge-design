#!/usr/bin/env node
// oracle-barre-externe — Domaine « La barre est dehors, et l'arbitrage est humain » (TF-0483).
//
// LE FAIT FONDATEUR, ET IL COÛTE UN TOUR COMPLET. La première direction artistique d'un produit a
// passé TOUS les oracles de cette forge AU VERT, et a été REJETÉE EN BLOC par le commanditaire :
// « ça ne présente rien et ça ne donne pas du tout envie ». La sortie de crise a consisté
// exactement en l'entrant qui manquait — un relevé de dix sites reconnus du même domaine, trois
// directions neuves, puis un ARBITRAGE HUMAIN SUR CAPTURES. Un tour complet de conception+design
// perdu.
//
// POURQUOI AUCUN ORACLE NE POUVAIT LE VOIR, et c'est le cœur du sujet. Les oracles de cette forge
// jugent la DISCIPLINE INTERNE — tokens conformes, filets, accent, mouvement, bascule, mobile — et
// ils le font bien. Aucun ne peut dire « ce n'est pas désirable pour la cible ». Il n'existait dans
// toute la forge AUCUNE notion de barre externe, de référence du domaine, ni d'état de l'art.
//
// CE QUE CET ORACLE NE FAIT PAS, et ne fera jamais : juger le beau. La forge tient déjà la bonne
// doctrine ailleurs — « la justesse d'une voix n'est pas décidable par script ; ce qui EST
// vérifiable, c'est la constance ». Ici de même : on vérifie que l'ENTRANT EXISTE et que le GATE
// HUMAIN A EU LIEU. Présence et complétude, jamais la justesse.
//
//   B1 le relevé EXISTE et porte sa date — une barre externe non datée est une opinion
//   B2 au moins N références (défaut 5), chacune avec sa SOURCE (URL ou nom d'éditeur) et ce
//      qu'on en RETIENT — une liste de noms n'est pas un relevé
//   B3 ce qui est ÉCARTÉ est écrit, avec son motif — sans cela, le relevé n'a rien tranché
//   B4 le GATE HUMAIN est déclaré : qui a arbitré, quand, et SUR QUELLES CAPTURES. Le
//      commanditaire arbitre des IMAGES, pas une description : c'est la leçon exacte du tour perdu
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracles/oracle-barre-externe.mjs <BARRE-EXTERNE.md> [--minimum 5] [--json]
import fs from "node:fs";

const DOM = "Barre externe du domaine et arbitrage humain sur captures";
const NON_JUGE = [
  "la JUSTESSE du relevé : qu'une référence soit vraiment reconnue dans son domaine, et que ce " +
  "qu'on en retient soit pertinent, relève du jugement humain. Cet oracle ne juge JAMAIS le beau " +
  "— aucune mesure automatique ne remplace « ça ne donne pas envie »",
  "la REPRÉSENTATIVITÉ du panel : cinq références bien choisies valent mieux que quinze prises au " +
  "hasard, et aucun script ne sait faire la différence",
  "l'ATTEINTE de la barre : le relevé dit où est le niveau, il ne prouve pas que la direction " +
  "artistique s'y hisse. C'est ce que le gate humain sur captures tranche, et lui seul",
  "la SINCÉRITÉ du gate : une ligne d'arbitrage peut être écrite sans que personne n'ait regardé " +
  "les captures. La déclaration rend l'omission visible, elle ne rend pas le mensonge impossible",
];

const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const iMin = args.indexOf("--minimum");
const MINIMUM = iMin > -1 ? Number(args[iMin + 1]) || 5 : 5;
const cible = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
const F = [];
const add = (sev, regle, msg, ou) => F.push({ sev, regle, msg, where: ou });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: "oracle-barre-externe", domaine: DOM, artefact: cible || null, verdict,
    findings: F.length ? F : [{ sev: "info", regle: "B1-B4", msg: "relevé daté, sourcé, tranché, et arbitrage humain déclaré sur captures", where: cible }],
    non_juge: NON_JUGE,
  }, null, jsonOnly ? 0 : 2) + "\n");
  process.exit(code);
}

if (!cible || !fs.existsSync(cible)) {
  // L'ABSENCE EST LE DÉFAUT MESURÉ : c'est précisément parce que ce document n'existait pas que la
  // direction artistique est partie sans barre. Un SKIP silencieux reproduirait le tour perdu.
  add("bloquant", "B1", "relevé de barre externe INTROUVABLE — c'est le défaut qui a coûté un tour " +
    "complet de conception+design : une direction artistique au vert sur tous les oracles internes, " +
    "rejetée en bloc par le commanditaire. Le relevé se fait AVANT la proposition, jamais en " +
    "rattrapage. Usage : node oracles/oracle-barre-externe.mjs <BARRE-EXTERNE.md>", String(cible));
  sortir("FAIL", 1);
}

const texte = fs.readFileSync(cible, "utf8");
const lignes = texte.split(/\r?\n/);

// ---- B1 · daté -----------------------------------------------------------------------------
const DATE = /\b(20\d{2}-\d{2}-\d{2}|\d{2}\/\d{2}\/20\d{2})\b/;
const dateRelevee = (texte.match(DATE) || [])[0];
if (!dateRelevee) {
  add("bloquant", "B1", "aucune date dans le relevé — une barre externe non datée est une opinion : " +
    "les références d'un domaine bougent, et un relevé sans date ne se rejoue pas. Poser la date du " +
    "relevé (AAAA-MM-JJ)", cible);
} else {
  add("info", "B1", `relevé daté du ${dateRelevee}`, cible);
}

// ---- B2 · N références, chacune sourcée ET exploitée ---------------------------------------
// Une ligne de tableau ou de liste qui porte une source (URL, ou un nom entre guillemets/gras) ET
// une colonne de ce qu'on en retient. On compte les LIGNES DE DONNÉES d'un tableau, ou les puces.
const SOURCE = /(https?:\/\/[^\s|)]+|\bwww\.[^\s|)]+|«[^»]{2,}»|\*\*[^*]{2,}\*\*)/;
const lignesTableau = lignes.filter((l) => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l));
const enTete = lignesTableau.length ? lignesTableau[0] : "";
const donnees = lignesTableau.slice(1);
const puces = lignes.filter((l) => /^\s*[-*]\s+\S/.test(l));
const candidates = donnees.length ? donnees : puces;
const sourcees = candidates.filter((l) => SOURCE.test(l));
// « Ce qu'on en retient » : une seconde cellule non vide, ou une phrase après le nom.
const exploitees = sourcees.filter((l) => {
  const cellules = l.split("|").map((c) => c.trim()).filter(Boolean);
  return cellules.length >= 2 || l.replace(SOURCE, "").replace(/^\s*[-*]\s*/, "").trim().length > 20;
});
if (exploitees.length < MINIMUM) {
  add("bloquant", "B2", `${exploitees.length} référence(s) sourcée(s) ET exploitée(s) pour ${MINIMUM} ` +
    `attendue(s) (${candidates.length} ligne(s) lue(s), ${sourcees.length} portant une source). ` +
    "Une liste de noms n'est pas un relevé : chaque référence porte SA SOURCE (URL ou éditeur) et CE " +
    "QU'ON EN RETIENT. Sans le second, la barre reste invisible à qui lira le dossier dans six mois", cible);
} else {
  add("info", "B2", `${exploitees.length} référence(s) du domaine, chacune sourcée et exploitée ` +
    `(minimum ${MINIMUM})`, cible);
}

// ---- B3 · ce qui est ÉCARTÉ, avec son motif ------------------------------------------------
// Un relevé qui ne dit pas ce qu'il refuse n'a rien tranché : il a admiré.
// PIÈGE TROUVÉ PAR LA FIXTURE VERTE, et il valait la peine : `\b` de JavaScript est ASCII. Entre
// une espace et « É » il n'y a AUCUNE frontière de mot, donc `\b(écart…)` ne matche jamais un
// titre « Écarté ». La règle était MORTE sur un relevé conforme — sans la contre-épreuve, elle
// aurait accusé tous les relevés bien faits, et seulement ceux-là.
const ECARTE = /(^|\n)\s*#{2,}\s*[^\n]*(écart|ecart|refus|non retenu)/i;
// Le titre de la section est LUI-MÊME un séparateur : découper sans l'avoir consommé rendait un
// bloc vide, et la règle accusait un relevé qui portait pourtant cinq écarts motivés. Second
// piège de découpage payé sur la fixture verte — c'est exactement à cela qu'elle sert.
const bloc = ECARTE.test(texte)
  ? texte.slice(texte.search(ECARTE)).replace(/^\s*#{2,}[^\n]*\n/, "").split(/\r?\n#{2,}\s/)[0]
  : "";
const lignesEcart = bloc.split(/\r?\n/).filter((l) => /^\s*([-*]|\|)\s*\S/.test(l)
  && !/^\s*\|[\s:|-]+\|\s*$/.test(l));
const motives = lignesEcart.filter((l) => /\b(parce que|car|motif|trop|pas adapt|hors|cible)\b/i.test(l)
  || l.split("|").map((c) => c.trim()).filter(Boolean).length >= 2);
if (!bloc) {
  add("bloquant", "B3", "aucune section d'écarts — le relevé ne dit pas ce qu'il REFUSE, donc il n'a " +
    "rien tranché : il a admiré. Écrire « Écarté » avec, pour chaque référence ou parti pris, le " +
    "motif en une phrase opposable", cible);
} else if (!motives.length) {
  add("bloquant", "B3", `section d'écarts présente mais AUCUN motif lisible sur ${lignesEcart.length} ` +
    "ligne(s) : « écarté » sans motif se redécouvre au prochain run, et se rediscute", cible);
} else {
  add("info", "B3", `${motives.length} écart(s) motivé(s)`, cible);
}

// ---- B4 · le GATE HUMAIN, sur CAPTURES ----------------------------------------------------
// La leçon exacte du tour perdu : le commanditaire arbitre des IMAGES, pas une description.
// Même piège qu'à B3 : aucune frontière de mot autour d'un mot accentué.
const QUI = /(arbitr|valid[ée]|tranch|décid|decid)/i;
const CAPTURE = /(capture|\.png\b|\.jpe?g\b|maquette|vignette|screenshot)/i;
const ligneGate = lignes.filter((l) => QUI.test(l) && DATE.test(l));
const gateAvecImage = ligneGate.filter((l) => CAPTURE.test(l));
if (!ligneGate.length) {
  add("bloquant", "B4", "aucun ARBITRAGE HUMAIN déclaré (qui a tranché, et quand) — c'est le second " +
    "entrant manquant du tour perdu : l'arbitrage était un rattrapage, il doit être une ÉTAPE. Une " +
    "ligne suffit : qui, quand, sur quoi", cible);
} else if (!gateAvecImage.length) {
  add("bloquant", "B4", `arbitrage déclaré (${ligneGate.length} ligne(s)) mais SANS CAPTURE citée — ` +
    "le commanditaire arbitre des IMAGES, pas une description. C'est mot pour mot ce qui a manqué : " +
    "une direction artistique décrite au vert, refusée dès qu'elle a été vue. Citer les fichiers de " +
    "captures soumis", cible);
} else {
  add("info", "B4", `arbitrage humain déclaré sur captures (${gateAvecImage.length} ligne(s))`, cible);
}

const durs = F.filter((f) => f.sev === "bloquant").length;
sortir(durs ? "FAIL" : "PASS", durs ? 1 : 0);
