#!/usr/bin/env node
// oracle-coherence-promesse — la page dit-elle la MÊME CHOSE que l'offre ? (TF-0578, 25/08/2026)
//
// LE FAIT FONDATEUR, 24/08/2026. Une une promettait « votre produit, LIVRÉ avec ses preuves » — un
// visiteur en déduit une livraison. Les six services vendus, produits par le MÊME RUN, disaient
// tout autre chose : « nous évaluons VOTRE chaîne », « VOS ÉQUIPES apprennent à travailler sous
// oracles », « à la fin, VOS ÉQUIPES exécutent les oracles SANS NOUS ». Aucun des six ne disait
// « nous construisons votre produit ».
//
// POURQUOI AUCUN ORACLE NE L'A VU. Les oracles de design jugent la page ISOLÉMENT — la généricité
// de l'écriture, la discipline d'accent, le contrat tactile, les jetons, le mouvement. Aucun ne lit
// un SECOND artefact du même run pour vérifier que les deux racontent la même chose. La
// contradiction était lisible en trente secondes par un humain.
//
// CE QUI REND LA DÉTECTION POSSIBLE, et c'est l'item qui le dit : le SUJET GRAMMATICAL suffit à la
// révéler. « NOUS construisons votre produit » et « VOS ÉQUIPES exécutent sans nous » ne décrivent
// pas le même contrat — l'un dit que le fournisseur fait, l'autre que le client fait. Ce n'est pas
// une nuance de ton, c'est une divergence sur QUI TRAVAILLE.
//
// Trois règles :
//   P1 — un cadrage est fourni et porte une promesse ratifiée (sinon : rien à confronter, exit 2).
//   P2 — la page porte une promesse identifiable (titre principal ou hero).
//   P3 — les deux promesses désignent le MÊME ACTEUR. Divergence = constat localisant.
//
// CE QU'IL NE JUGE PAS, et c'est la moitié honnête de la règle : que les deux promesses disent la
// même chose SUR LE FOND. Deux phrases peuvent partager leur sujet et promettre des choses
// différentes. L'item l'assume : « automatisable en partie, jamais en totalité, et c'est
// acceptable — un contrôle partiel qui DIT sa limite vaut mieux qu'un vert muet ».
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracles/oracle-coherence-promesse.mjs <page.html> --cadrage <CONSTITUTION.md> [--json]
import fs from "node:fs";

const ORACLE = "oracle-coherence-promesse";
const DOMAINE = "Cohérence entre la promesse affichée et l'offre décrite";

/** Qui TRAVAILLE — le sujet du VERBE D'ACTION, jamais la simple présence d'un pronom.
 *
 * La distinction n'est pas une subtilité : « VOTRE produit, LIVRÉ avec ses preuves » contient
 * « votre », mais le client n'y fait rien — il POSSÈDE, et c'est le fournisseur qui livre.
 * Compter les pronoms rendait cette phrase « mixte » et l'exemptait, ce qui laissait passer
 * exactement le défaut du 24/08. On cherche donc des AGENTS : « nous construisons »,
 * « vos équipes exécutent », « sans nous ».
 */
export function acteur(phrase) {
  const t = " " + String(phrase).toLowerCase().replace(/[’']/g, "'") + " ";
  // « sans nous » dit que le client agit SEUL : c'est une marque d'agent CLIENT, pas fournisseur.
  const sansNous = /\bsans\s+nous\b/.test(t);
  // « nous » suivi d'un verbe conjugué à la 1re personne du pluriel.
  const agentFournisseur = (t.match(/\bnous\s+[a-zà-ÿ]+(?:ons|ions)\b/g) || []).length;
  // « vous » ou « vos <nom> » suivis d'un verbe conjugué.
  const agentClient = (t.match(/\bvous\s+[a-zà-ÿ]+(?:ez|iez)\b/g) || []).length
    + (t.match(/\bvos\s+[a-zà-ÿ]+s?\s+[a-zà-ÿ]+(?:ent|e|ont)\b/g) || []).length
    + (sansNous ? 1 : 0);
  if (agentFournisseur && agentClient) return "mixte";
  if (agentFournisseur) return "fournisseur";
  if (agentClient) return "client";
  // Aucun agent explicite : on retombe sur la possession, qui dit au moins de qui on parle.
  if (/\b(nous|notre|nos)\b/.test(t) && !/\b(vous|votre|vos)\b/.test(t)) return "fournisseur";
  if (/\b(vous|votre|vos)\b/.test(t) && !/\b(nous|notre|nos)\b/.test(t)) return "client";
  return "indetermine";
}

/** La promesse d'un cadrage : la section « Promesse » que R-49/C4 de forge-conception ratifie. */
export function promesseCadrage(texte) {
  const lignes = String(texte).split(/\r?\n/);
  const i = lignes.findIndex((l) => /^#{1,6}\s*Promesse\s*$/i.test(l));
  if (i === -1) return null;
  const suite = [];
  for (let k = i + 1; k < lignes.length; k++) {
    if (/^#{1,6}\s/.test(lignes[k])) break;
    suite.push(lignes[k]);
  }
  const t = suite.join(" ").replace(/\s+/g, " ").trim();
  return t || null;
}

/** La promesse d'une page : son titre principal, plus le premier paragraphe qui le suit. */
export function promessePage(html) {
  const sansBalise = (s) => s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!h1) return null;
  const apres = html.slice(h1.index + h1[0].length);
  const p = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(apres);
  const titre = sansBalise(h1[1]);
  const accroche = p ? sansBalise(p[1]) : "";
  return (titre + (accroche ? " " + accroche : "")).trim() || null;
}

export function juger(html, cadrage) {
  const findings = [];
  const pc = promesseCadrage(cadrage);
  if (!pc) {
    return { statut: "NON_JUGEABLE", findings: [{ regle: "P1", sev: "info",
      msg: "le cadrage ne porte pas de section « Promesse » — rien à confronter. C4 de forge-conception l'exige (TF-0577) ; sans elle, la page n'est opposable à rien" }] };
  }
  const pp = promessePage(html);
  if (!pp) {
    findings.push({ regle: "P2", sev: "bloquant",
      msg: "la page ne porte aucune promesse identifiable — pas de <h1>. Un visiteur ne sait pas ce qu'on lui promet, et aucun contrôle ne peut le confronter à l'offre" });
    return { statut: "FAIL", findings };
  }
  const ac = acteur(pc), ap = acteur(pp);
  if (ac !== "indetermine" && ap !== "indetermine" && ac !== ap && ac !== "mixte" && ap !== "mixte") {
    findings.push({ regle: "P3", sev: "bloquant",
      msg: `la page et le cadrage ne désignent pas le même acteur — page : « ${ap} » (« ${pp.slice(0, 80)}… »), `
        + `cadrage : « ${ac} » (« ${pc.slice(0, 80)}… »). Ce n'est pas une nuance de ton : l'un dit que le `
        + `fournisseur fait, l'autre que le client fait. Un visiteur qui lit les deux ne sait pas ce qu'il achète (TF-0578)` });
  }
  return { statut: findings.length ? "FAIL" : "PASS", findings, mesure: { acteur_page: ap, acteur_cadrage: ac } };
}

// ---- exécution ---------------------------------------------------------------------------------
// Garde d'entree : sans elle, un simple `import` de ce module DECLENCHE la CLI et rend un verdict
// « page introuvable ». Un oracle qui s'execute quand on le lit n'est pas testable unitairement.
const EST_POINT_D_ENTREE = process.argv[1] && process.argv[1].endsWith('oracle-coherence-promesse.mjs');
const args = EST_POINT_D_ENTREE ? process.argv.slice(2) : ['--module'];
if (args.includes("--self-test")) {
  let pass = 0, fail = 0;
  const check = (nom, fn) => { try { fn(); console.log(`  [PASS] ${nom}`); pass++; }
    catch (e) { console.error(`  [FAIL] ${nom} — ${e.message}`); fail++; } };
  const CADRAGE_CLIENT = "---\nprojet: x\n---\n\n## Promesse\n\nVos équipes exécutent les oracles et tiennent le ledger sans nous.\n\n## Principes non négociables\n\n1. x\n";
  const CADRAGE_FOURNISSEUR = "---\nprojet: x\n---\n\n## Promesse\n\nNous construisons votre produit et nous le livrons avec ses preuves.\n\n## Principes\n\n1. x\n";
  const PAGE_LIVRAISON = "<html><body><h1>Votre produit, livré avec ses preuves</h1><p>Nous construisons, nous mesurons, nous livrons.</p></body></html>";
  const PAGE_AUTONOMIE = "<html><body><h1>Vos équipes, autonomes sous oracles</h1><p>Vos équipes exécutent les contrôles sans nous.</p></body></html>";

  check("LE FAIT FONDATEUR — page « nous livrons » contre cadrage « vos équipes sans nous » : ÉCART", () => {
    const r = juger(PAGE_LIVRAISON, CADRAGE_CLIENT);
    if (r.statut !== "FAIL" || !r.findings.some((f) => f.regle === "P3")) throw new Error(`${r.statut} — la contradiction du 24/08 passerait encore`);
  });

  check("verte — page et cadrage désignent le même acteur (le client)", () => {
    const r = juger(PAGE_AUTONOMIE, CADRAGE_CLIENT);
    if (r.statut !== "PASS") throw new Error(`${r.statut} : ${JSON.stringify(r.findings)}`);
  });

  check("verte — même acteur, côté fournisseur cette fois", () => {
    const r = juger(PAGE_LIVRAISON, CADRAGE_FOURNISSEUR);
    if (r.statut !== "PASS") throw new Error(`${r.statut} : ${JSON.stringify(r.findings)}`);
  });

  check("« sans nous » compte pour le CLIENT, pas pour le fournisseur", () => {
    if (acteur("Vos équipes exécutent les oracles sans nous.") !== "client")
      throw new Error("« sans nous » lu comme une marque du fournisseur — il dit l'inverse : le client agit SEUL");
  });

  check("BORNE — cadrage sans promesse : NON_JUGEABLE, jamais un FAIL de page", () => {
    const r = juger(PAGE_LIVRAISON, "---\nprojet: x\n---\n\n## Principes\n\n1. x\n");
    if (r.statut !== "NON_JUGEABLE") throw new Error(`${r.statut} — sans cadrage, la page n'est opposable à rien et ne doit pas être accusée`);
  });

  check("BORNE — page sans <h1> : constat sur la PAGE, pas sur la cohérence", () => {
    const r = juger("<html><body><p>rien</p></body></html>", CADRAGE_CLIENT);
    if (!r.findings.some((f) => f.regle === "P2")) throw new Error("une page sans promesse identifiable passe");
  });

  check("BORNE — une promesse MIXTE n'est pas accusée d'incohérence", () => {
    // Le cas de test d'origine disait « nous construisons AVEC vos équipes » : il ne nommait qu'UN
    // agent — « vos équipes » y est un complément, pas un sujet. L'oracle avait raison de le classer
    // « fournisseur », et c'était le TEST qui était faux. Une vraie offre à deux agents en nomme deux :
    // « nous construisons, PUIS vos équipes reprennent ». Ce n'est pas une contradiction,
    // c'est un contrat partagé. L'accuser ferait crier l'oracle sur toute offre collaborative.
    const r = juger("<html><body><h1>Nous construisons, puis vos équipes reprennent la main</h1><p>x</p></body></html>", CADRAGE_CLIENT);
    if (r.statut !== "PASS") throw new Error(`${r.statut} — une offre collaborative est accusée à tort`);
  });

  console.log(`\nCohérence promesse (P1-P3) : ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

if (!EST_POINT_D_ENTREE) { /* importe comme module : rien a executer */ }
else {
const cible = args.find((a) => !a.startsWith("--"));
const iC = args.indexOf("--cadrage");
const cadragePath = iC > 0 ? args[iC + 1] : null;
if (!cible || !fs.existsSync(cible)) {
  console.log(JSON.stringify({ oracle: ORACLE, domaine: DOMAINE, verdict: "ERREUR", findings: [], non_juge: [], msg: "page introuvable" }));
  process.exit(2);
}
if (!cadragePath || !fs.existsSync(cadragePath)) {
  console.log(JSON.stringify({ oracle: ORACLE, domaine: DOMAINE, artefact: cible, verdict: "SKIP", findings: [],
    non_juge: ["aucun cadrage fourni (--cadrage <CONSTITUTION.md>) — la cohérence se juge ENTRE deux artefacts, jamais sur un seul"] }));
  process.exit(2);
}
const r = juger(fs.readFileSync(cible, "utf8"), fs.readFileSync(cadragePath, "utf8"));
console.log(JSON.stringify({
  oracle: ORACLE, domaine: DOMAINE, artefact: cible,
  verdict: r.statut === "NON_JUGEABLE" ? "SKIP" : r.statut,
  findings: r.findings, mesure: r.mesure ?? null,
  non_juge: [
    "que les deux promesses disent la même chose SUR LE FOND : deux phrases peuvent partager leur sujet et promettre des choses différentes. L'oracle compare QUI TRAVAILLE, pas ce qui est promis",
    "la liste des services vendus : elle vit dans le code du produit et n'est pas lue ici. Le troisième artefact du triangle reste à confronter à la main",
    "le TON et la qualité d'écriture de la promesse — c'est le domaine d'oracle-slop, et les deux se cumulent",
  ],
}, null, 1));
process.exit(r.statut === "FAIL" ? 1 : r.statut === "NON_JUGEABLE" ? 2 : 0);
}
