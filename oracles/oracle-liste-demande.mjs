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
// Cinq règles (D4 et D5 : TF-1940, 21/10/2026, voir plus bas). Les trois premières, dont la
// deuxième est celle qui aurait attrapé le défaut :
//   D1 — une ligne sans preuve ET sans motif de non-traitement. Un point sans preuve est un point
//        non traité, et un point non traité qui ne le dit pas est un point perdu.
//   D2 — le COMPTE ANNONCÉ en titre doit égaler le nombre de lignes. C'est le défaut du 22/08 en
//        une règle : dix-sept annoncés, seize listés, et personne ne fait la soustraction. C'est
//        aussi le SEUL lien entre le tableau et la demande d'origine, qui vit dans un fil de
//        discussion que cet oracle ne peut pas lire.
//   D3 — une preuve qui n'en est pas une : « vérifié », « fait », « ok », « corrigé » tout seuls,
//        sans fichier, sans mesure, sans verdict d'oracle.
//   D4 — le point demandé se CITE entre guillemets, mot pour mot : un résumé (« semaine au choix »)
//        n'en tient pas lieu. Exemption : une ligne qui commence par « AJOUT » déclare un contrôle
//        que le livrable ajoute et que la demande ne porte pas — il n'y a rien à citer.
//   D5 — la demande citée désigne un modèle (« comme pour X », « comme sur X », « pareil que X ») :
//        la ligne doit nommer un critère de comparaison — le même geste joué sur X et sur le
//        livrable, comparé. Sans lui, le modèle est lu comme une inspiration et le livrable en
//        prend à son aise.
//
// LE FAIT DE D4/D5, 18-19/10/2026, chez un produit. Demande, mot pour mot : « Un sélecteur de
// calendrier, comme pour la réservation, réglé par défaut sur les 3 prochaines semaines, qui peut
// être modifié pour sélectionner une semaine en particulier ». La réservation choisit une arrivée
// puis un départ ; la refonte de l'agenda a sélectionné la semaine entière du jour cliqué. La
// promesse de la critique résumait la demande (« semaine au choix »), sans la citer, et l'a jugée
// tenue. Un bouton « Voir les N évènements » que personne n'avait demandé est passé aussi. Retour
// humain : « ça n'a jamais été demandé ».
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
  "que la citation soit MOT POUR MOT : D4 voit des guillemets, jamais la demande d'origine, qui vit " +
  "hors du fichier. Un résumé mis entre guillemets passe ; c'est à la relecture de comparer",
  "qu'un contrôle d'interface ajouté par le livrable soit DÉCLARÉ « AJOUT » : l'oracle ne lit ni le " +
  "livrable ni la demande, il ne voit que les lignes écrites. Un ajout qui n'a pas sa ligne reste invisible",
  "que le critère de comparaison soit BON (D5) : il vérifie que la ligne nomme le modèle et un geste " +
  "comparé, pas que le geste joué sur le modèle est celui de la demande",
];

const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const cible = args.find((a) => !a.startsWith("--"));
const F = [];
const add = (sev, regle, msg, ou) => F.push({ sev, regle, msg, where: ou });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: "oracle-liste-demande", domaine: DOM, artefact: cible || null, verdict,
    findings: F.length ? F : [{ sev: "info", regle: "D1-D5", msg: "chaque point demandé est cité, porte sa correction et sa preuve, et son modèle désigné son critère de comparaison", where: cible }],
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

// D4/D5 (TF-1940). Citation : « … », "…" ou “…” portant au moins trois caractères.
const CITATION = /«[^»]{3,}»|"[^"]{3,}"|“[^”]{3,}”/;
const AJOUT = /^\s*\**\s*ajout\b/i;
// Une référence explicite à un modèle ; le groupe 2 est le nom qui le désigne.
const MODELE = /\b(?:comme\s+(?:pour|sur|dans)|pareil\s+(?:que|à)|identique\s+(?:à|au|aux)|même\s+chose\s+que|sur\s+le\s+modèle\s+d[eu]s?|à\s+l['’]image\s+d[eu]s?)\s+((?:(?:la|le|les|l['’]|un|une|des|du|de\s+la|d['’]|de|ce|cette|ces|mon|ma|nos|notre)\s*)*)([\p{L}-]+)/giu;
const CRITERE = /(crit[èe]re|compar[ée]|comparaison|m[êe]me\s+geste)/i;

for (const { n, cellules } of corps) {
  const point = cellules[1] || cellules[0] || "";
  const preuve = (cellules[3] || cellules[cellules.length - 1] || "").trim();
  const etiquette = point.replace(/\s+/g, " ").slice(0, 60);
  const ajout = AJOUT.test(point);
  if (!ajout && !CITATION.test(point)) {
    add("bloquant", "D4", `point « ${etiquette} » : la demande ne se cite pas entre guillemets, mot pour mot — ` +
      "un résumé n'en tient pas lieu (« semaine au choix » pour « un sélecteur… comme pour la " +
      "réservation… » a fait juger tenue une promesse que le livrable ne tenait pas). Citer la demande " +
      "entre « », ou, si le livrable ajoute ce contrôle sans que la demande le porte, écrire `AJOUT — <contrôle>`.",
      `${cible}:${n}`);
  }
  if (!ajout && CITATION.test(point)) {
    const reste = cellules.filter((_, i) => i > 1).join(" ");
    for (const m of point.matchAll(MODELE)) {
      const modele = m[2].toLowerCase();
      const racine = modele.slice(0, 5);
      if (CRITERE.test(reste) && reste.toLowerCase().includes(racine)) continue;
      add("majeur", "D5", `point « ${etiquette} » : la demande désigne un modèle (« ${m[0].trim()} ») et la ligne ne nomme ` +
        "pas de critère de comparaison — écrire, dans la correction ou la preuve, le critère : le même geste " +
        `joué sur « ${modele} » et sur le livrable, comparé (le mot « critère » ou « comparé », et le nom du modèle).`,
        `${cible}:${n}`);
    }
  }
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
