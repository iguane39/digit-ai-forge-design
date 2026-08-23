#!/usr/bin/env node
// oracle-liste-demande — Domaine « Traçabilité d'une demande client » (déterministe, TF-0494).
//
// LE FAIT FONDATEUR, 22/08/2026. Sur DIX-SEPT points de correction reçus en une fois, seize ont été
// traités. Le dix-septième — le formatage des documents embarqués — n'a été découvert que parce que
// le client l'a redemandé, avec un « Pourquoi ? ».
//
// Rien dans la chaîne ne rapprochait la demande du livrable. Le skill décrit la boucle de contrôle
// du LIVRABLE — lancer les oracles, lire les verdicts, citer les lignes — et jamais le suivi de ce
// qui a été DEMANDÉ. Ce sont deux choses différentes : un livrable peut passer tous ses oracles et
// rater un point sur dix-sept, parce qu'aucun oracle ne sait ce qui avait été demandé.
//
// Trois règles, et la deuxième est celle qui aurait attrapé le défaut :
//   D1 — une ligne sans preuve ET sans motif de non-traitement. Un point sans preuve est un point
//        non traité, et un point non traité qui ne le dit pas est un point perdu.
//   D2 — le COMPTE ANNONCÉ en titre doit égaler le nombre de lignes. C'est le défaut du 22/08 en
//        une règle : dix-sept annoncés, seize listés, et personne ne fait la soustraction. C'est
//        aussi le SEUL lien entre le tableau et la demande d'origine, qui vit dans un fil de
//        discussion que cet oracle ne peut pas lire.
//   D3 — une preuve qui n'en est pas une : « vérifié », « fait », « ok », « corrigé » tout seuls,
//        sans fichier, sans mesure, sans verdict d'oracle.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracles/oracle-liste-demande.mjs <REVUE.md> [--json]
import fs from "node:fs";

const DOM = "Traçabilité d'une demande client";
const NON_JUGE = [
  "la VÉRACITÉ d'une preuve : qu'une capture montre vraiment ce qu'elle prétend demande de regarder",
  "un point OUBLIÉ À LA SAISIE : cet oracle compare le tableau à son propre en-tête, jamais à la " +
  "demande d'origine, qui vit dans un fil de discussion. C'est pourquoi le compte annoncé (D2) est " +
  "une règle et non une commodité — il est le seul lien entre le tableau et ce qui a été demandé",
  "la PERTINENCE d'une correction : qu'elle réponde vraiment au point est un jugement de lecture",
  "l'ordre des points : une liste non triée reste lisible, et imposer un tri n'apporterait rien",
];

const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const cible = args.find((a) => !a.startsWith("--"));
const F = [];
const add = (sev, regle, msg, ou) => F.push({ sev, regle, msg, where: ou });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: "oracle-liste-demande", domaine: DOM, artefact: cible || null, verdict,
    findings: F.length ? F : [{ sev: "info", regle: "D1-D3", msg: "chaque point demandé porte sa correction et sa preuve", where: cible }],
    non_juge: NON_JUGE,
  }, null, jsonOnly ? 0 : 2) + "\n");
  process.exit(code);
}

if (!cible || !fs.existsSync(cible)) {
  add("bloquant", "D0", "artefact introuvable — usage : node oracles/oracle-liste-demande.mjs <REVUE.md>", String(cible));
  sortir("donnees_insuffisantes", 2);
}

const texte = fs.readFileSync(cible, "utf8");
const lignes = texte.split(/\r?\n/);

// Le titre de la section, et le compte qu'il annonce. Sans section, l'oracle est SANS OBJET : tous
// les livrables ne répondent pas à une demande à points, et en inventer une serait pire.
const iTitre = lignes.findIndex((l) => /^#{1,4}\s+.*liste de contr[ôo]le de la demande/i.test(l));
if (iTitre < 0) {
  add("info", "D0", "aucune section « Liste de contrôle de la demande » — SANS OBJET : ce livrable ne " +
    "répond pas à une demande à points, ou la liste n'a pas été tenue. L'oracle ne l'invente pas ; " +
    "c'est le skill qui l'exige quand la demande en compte plusieurs.", cible);
  sortir("sans_objet", 0);
}

const annonce = (lignes[iTitre].match(/(\d+)\s*points?/i) || [])[1];

// Les lignes de données du tableau qui suit : on s'arrête au titre suivant.
const corps = [];
for (let i = iTitre + 1; i < lignes.length; i++) {
  if (/^#{1,4}\s+\S/.test(lignes[i])) break;
  const l = lignes[i];
  if (!/^\s*\|/.test(l)) continue;
  if (/^\s*\|[\s|:-]+\|?\s*$/.test(l)) continue;                  // séparateur
  const cellules = l.split("|").slice(1, -1).map((c) => c.trim());
  if (!cellules.length) continue;
  if (/^#$/.test(cellules[0]) || /point demand/i.test(cellules[1] || "")) continue;   // en-tête
  corps.push({ n: i + 1, cellules });
}

if (!corps.length) {
  add("bloquant", "D1", "section présente mais AUCUNE ligne de point — une liste vide laisse croire " +
    "qu'il n'y avait rien à traiter", `${cible}:${iTitre + 1}`);
  sortir("FAIL", 1);
}

// D2 — le compte annoncé contre le compte réel. Le défaut du 22/08 en une soustraction.
if (annonce !== undefined && Number(annonce) !== corps.length) {
  add("bloquant", "D2", `le titre annonce ${annonce} point(s) et le tableau en porte ${corps.length} — ` +
    `${Math.abs(Number(annonce) - corps.length)} point(s) d'écart. C'est le défaut du 22/08 : dix-sept ` +
    "annoncés, seize listés, et le dix-septième découvert parce que le client l'a redemandé.",
    `${cible}:${iTitre + 1}`);
}
if (annonce === undefined) {
  add("majeur", "D2", "le titre n'annonce AUCUN compte de points — le compte est le seul lien entre le " +
    "tableau et la demande d'origine, que cet oracle ne peut pas lire. Écrire « — <N> points ».",
    `${cible}:${iTitre + 1}`);
}

// D1 et D3 — chaque ligne porte sa preuve, et la preuve en est une.
const MOTIF_NON_TRAITE = /\b(non trait[ée]|hors p[ée]rim[èe]tre|[ée]cart[ée]|refus[ée]|report[ée])\b/i;
const PREUVE_CREUSE = /^(v[ée]rifi[ée]?|fait|ok|corrig[ée]?|termin[ée]?|oui|done)\.?$/i;
const PREUVE_REELLE = /(`[^`]+`|\.(png|jpg|jpeg|html|md|json|mjs|py|txt)\b|\d+\s*(px|ms|s|%|\/)|PASS|FAIL|exit\s*\d|verdict)/i;

for (const { n, cellules } of corps) {
  const point = cellules[1] || cellules[0] || "";
  const preuve = (cellules[3] || cellules[cellules.length - 1] || "").trim();
  const etiquette = point.replace(/\s+/g, " ").slice(0, 60);
  if (!preuve) {
    add("bloquant", "D1", `point « ${etiquette} » SANS PREUVE et sans motif — un point sans preuve est ` +
      "un point non traité, et un point non traité qui ne le dit pas est un point perdu. Écrire la " +
      "preuve (capture, mesure, verdict) ou `NON TRAITÉ — <motif>`.", `${cible}:${n}`);
    continue;
  }
  if (MOTIF_NON_TRAITE.test(preuve)) continue;                    // reste honnête, déclaré
  if (PREUVE_CREUSE.test(preuve)) {
    add("bloquant", "D3", `point « ${etiquette} » : « ${preuve} » n'est pas une preuve, c'est une ` +
      "affirmation. Une preuve est une capture, une mesure ou un verdict d'oracle — pas un avis.",
      `${cible}:${n}`);
    continue;
  }
  if (!PREUVE_REELLE.test(preuve)) {
    add("majeur", "D3", `point « ${etiquette} » : preuve « ${preuve.slice(0, 60)} » sans ancrage — ` +
      "ni fichier, ni mesure chiffrée, ni verdict. Nommer ce qui se rejoue.", `${cible}:${n}`);
  }
}

const durs = F.filter((f) => f.sev === "bloquant" || f.sev === "majeur");
sortir(durs.length ? "FAIL" : "PASS", durs.length ? 1 : 0);
