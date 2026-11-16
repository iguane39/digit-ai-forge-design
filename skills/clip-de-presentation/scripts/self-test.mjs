#!/usr/bin/env node
/**
 * self-test.mjs — verrou de la bibliothèque motion.js et des scripts du skill clip-de-presentation (TF-2405).
 *
 * Les six défauts connus du pipeline versé le 10/11/2026, plus la lecture des jetons du socle HTML (D7, TF-2602),
 * sont tenus aux DEUX sens, sur des fonctions
 * pures jouées dans un bac à sable Node, avec un canvas factice qui journalise chaque texte dessiné
 * (police, taille, échelle de la transformation courante) :
 *   vert  : la bibliothèque du skill tient la propriété ;
 *   rouge : la même bibliothèque, la ligne fautive d'origine remise à sa place, la perd. Le test
 *           prouve qu'il sait voir le défaut, et il le prouvera à chaque rejeu.
 * `--motion <fichier>` joue les sept propriétés sur une autre bibliothèque, par exemple celle d'origine :
 * c'est la mesure « rouge sur l'ancien code ».
 *
 * S'y ajoutent : la marque lue dans la page (nom, logo, lien, jetons), aucune marque codée en dur dans
 * la bibliothèque, chaque chemin cité par SKILL.md présent, le gabarit câblé, musique.py déterministe
 * (Python et numpy requis, sinon saut dit), rendre.py et musique.py lisibles par Python (ast.parse,
 * aucun fichier écrit dans le dépôt).
 *
 * Usage : node skills/clip-de-presentation/scripts/self-test.mjs [--motion <motion.js>]
 * Exit  : 0 tout vert · 1 au moins un rouge
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ICI = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(ICI, "..");
const lireTexte = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const MOTION = join(ICI, "motion.js");

let verts = 0;
const rouges = [];
const ok = (titre, condition, detail = "") => {
  if (condition) { verts += 1; console.log(`  ok   ${titre}`); }
  else { rouges.push(`${titre}${detail ? ` — ${detail}` : ""}`); console.log(`  ROUGE ${titre}${detail ? ` — ${detail}` : ""}`); }
};

// ---------------------------------------------------------------------------------------- bac à sable
const taillePx = (police) => { const m = /(\d+(?:\.\d+)?)px/.exec(String(police)); return m ? parseFloat(m[1]) : NaN; };
const produit = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3],
  A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];

/** Contexte 2D factice : il journalise chaque texte avec sa taille et l'échelle de la transformation. */
function contexte(journal = [], images = []) {
  let m = [1, 0, 0, 1, 0, 0];
  const pile = [];
  const ctx = {
    canvas: { width: 1920, height: 1080 }, font: "10px sans-serif", globalAlpha: 1, letterSpacing: "0px",
    save() { pile.push({ m: [...m], font: ctx.font, alpha: ctx.globalAlpha, ls: ctx.letterSpacing }); },
    restore() { const s = pile.pop(); if (s) { m = s.m; ctx.font = s.font; ctx.globalAlpha = s.alpha; ctx.letterSpacing = s.ls; } },
    translate(x, y) { m = produit(m, [1, 0, 0, 1, x, y]); },
    scale(x, y) { m = produit(m, [x, 0, 0, y, 0, 0]); },
    rotate(a) { const c = Math.cos(a), s = Math.sin(a); m = produit(m, [c, s, -s, c, 0, 0]); },
    transform(a, b, c, d, e, f) { m = produit(m, [a, b, c, d, e, f]); },
    setTransform(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) { m = [a, b, c, d, e, f]; },
    measureText(txt) { const px = taillePx(ctx.font); return { width: [...String(txt)].length * px * (/mono/i.test(ctx.font) ? 0.6 : 0.55) }; },
    fillText(txt, x, y) {
      journal.push({ txt: String(txt), police: ctx.font, px: taillePx(ctx.font), echelle: Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])), x, y });
    },
    drawImage(im, x, y, w, h) { images.push({ im, x, y, w, h, alpha: ctx.globalAlpha }); },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    getImageData() { return { data: [0, 0, 0, 255] }; },
  };
  for (const f of ["beginPath", "moveTo", "lineTo", "arc", "ellipse", "closePath", "fill", "stroke", "fillRect",
    "strokeRect", "clearRect", "roundRect", "setLineDash"]) ctx[f] = () => {};
  return ctx;
}

/** Charge une bibliothèque dans un bac à sable ; `marque` et `jetons` simulent ce que la page déclare
 *  (`marque` en objet, ou en texte brut pour une déclaration illisible). */
function charger(source, { marque = null, jetons = {} } = {}) {
  const texteMarque = marque == null ? null : (typeof marque === "string" ? marque : JSON.stringify(marque));
  const doc = {
    documentElement: { dataset: { theme: "dark" } },
    getElementById: (id) => (id === "marque" && texteMarque != null ? { textContent: texteMarque } : null),
    createElement: () => ({ width: 0, height: 0, getContext: () => contexte() }),
    fonts: { load: () => Promise.resolve([]), check: () => true },
  };
  class Image { constructor() { this.complete = true; this.naturalWidth = 600; this.naturalHeight = 160; } decode() { return Promise.resolve(); } }
  const bac = {
    window: {}, document: doc, location: { search: "?rendu=1" }, console, Promise, Image, Audio: class {},
    getComputedStyle: () => ({ getPropertyValue: (nom) => jetons[nom] || "" }),
    performance: { now: () => 0 }, requestAnimationFrame: () => 0, addEventListener() {},
  };
  vm.createContext(bac);
  vm.runInContext(source, bac, { filename: "motion.js" });
  return bac.window.M;
}

// ------------------------------------------------------------------------------- les six propriétés
const ETAPES = ["Exigences", "Design", "Code", "Tests", "Mise en service"];
const ETAPES_LONGUES = ["Seize caractères", "Seize caractères", "Seize caractères", "Seize caractères", "Seize caractères", "Seize caractères"];
const minimumEtapes = (M, etapes) => {
  let min = Infinity;
  for (let t = 3.1; t <= 3.1 + etapes.length * 0.26 + 0.5; t += 0.005) {
    const j = [];
    M.introduction(contexte(j), t, { titre: "Un titre", phrase: "Une phrase vraie.", etapes, duree: 6, graine: 11 });
    for (const e of j) if (etapes.includes(e.txt)) min = Math.min(min, e.px * e.echelle);
  }
  return min;
};
const PROPRIETES = [
  ["D1", "les légendes tombent par défaut en graisse 700, celle de la bible", (M) => {
    const j = []; M.legende(contexte(j), 2, "Votre équipe reçoit un besoin flou.", 0, 5, {});
    const graisses = [...new Set(j.map((e) => e.police.split(" ")[0]))];
    return [j.length > 0 && graisses.length === 1 && graisses[0] === "700", `graisses dessinées : ${graisses.join(", ") || "aucune"}`];
  }],
  ["D2", "une étiquette sans taille fait 24 px, le plancher", (M) => {
    const j = []; M.puce(contexte(j), "exemple", 100, 100, {});
    return [j.length === 1 && j[0].px >= 24, `taille dessinée : ${j[0] ? j[0].px : "aucune"} px`];
  }],
  ["D3", "le titre de la carte de fin tient dans la largeur utile de 1 700 px", (M) => {
    const titre = "Une ligne de titre bien trop longue pour tenir dans la largeur utile de la carte";
    const j = []; M.carteFin(contexte(j), 10, 0, titre, "Un sous-titre.");
    const e = j.find((x) => x.txt === titre);
    const largeur = e ? [...titre].length * e.px * 0.55 * e.echelle : Infinity;
    return [!!e && largeur <= 1700, `largeur dessinée : ${Math.round(largeur)} px à ${e ? e.px : "?"} px`];
  }],
  ["D4", "M.surChemin(pts, 1) rend le dernier point du chemin", (M) => {
    const pts = [[0, 0], [100, 0], [100, 50]];
    const fin = M.surChemin(pts, 1), milieu = M.surChemin(pts, 0.5), boucle = M.surChemin(pts, 1.2);
    const egal = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    return [egal(fin, [100, 50]) && egal(milieu, [75, 0]) && egal(boucle, [30, 0]),
      `u = 1 → [${fin}] ; u = 0,5 → [${milieu}] ; u = 1,2 → [${boucle}]`];
  }],
  ["D5", "M.sortie(1) vaut 1 et M.rebond(0) vaut 0, exactement", (M) => {
    const v = [M.sortie(0), M.sortie(1), M.rebond(0), M.rebond(1)];
    return [v[0] === 0 && v[1] === 1 && v[2] === 0 && v[3] === 1, `sortie(0), sortie(1), rebond(0), rebond(1) = ${v.join(", ")}`];
  }],
  ["D6", "les étapes de l'introduction ne passent jamais sous 24 px pendant leur entrée", (M) => {
    const a = minimumEtapes(M, ETAPES), b = minimumEtapes(M, ETAPES_LONGUES);
    return [a >= 24 - 1e-9 && b >= 24 - 1e-9, `plus petite taille rendue : ${a.toFixed(2)} px (5 étapes), ${b.toFixed(2)} px (6 étapes de 16 caractères)`];
  }],
  ["D7", "les noms du socle HTML sont lus en repli : avec les jetons du dossier de marque Digit-AI, 9 clés de M.C sur 10 au moins quittent le repli neutre", (M, src) => {
    // Les jetons du thème sombre du socle HTML (boilerplate de digit-ai-page-html), tels que le dossier de marque Digit-AI les porte :
    // ni --fond, ni --texte, ni --accent-2, ni --texte-succes n'y figurent sous ce nom (TF-2602, retour RA-21 du 12/11/2026).
    const socle = { "--bg": "#0B1220", "--surface": "#121B2E", "--ink": "#EEF2F8", "--muted": "#A9B4C4", "--line": "#263248", "--blue": "#7DA2F5",
      "--teal": "#5FE6D6", "--green": "#7BE0A0", "--amber": "#FBBF6D", "--red": "#F5A3A3" };
    const CLES = ["fond", "carte", "trait", "encre", "faible", "accent", "accent2", "succes", "alerte", "erreur"];
    const neutre = charger(src).C, lues = charger(src, { jetons: socle }).C;
    const quittes = CLES.filter((k) => lues[k] !== neutre[k]);
    // Le nom de systeme-de-marque garde la priorité : posé avec celui du socle, il l'emporte.
    const mixte = charger(src, { jetons: { "--fond": "#123456", "--bg": "#654321" } }).C;
    return [quittes.length >= 9 && mixte.fond === "#123456",
      `${quittes.length} clés sur 10 quittent le repli neutre (au repli : ${CLES.filter((k) => !quittes.includes(k)).join(", ") || "aucune"}) ; avec --fond et --bg posés, fond = ${mixte.fond}`];
  }],
];

// Chaque défaut remis à sa place : [propriété, ligne corrigée, ligne d'origine]. La ligne corrigée doit exister
// UNE fois : si motion.js change de forme, la mutation ne s'applique plus et le verrou le DIT au lieu de passer.
const MUTATIONS = [
  ["D1", "ctx.save(); ctx.font = o.police || M.F.titre(taille, 700);", "ctx.save(); ctx.font = o.police || M.F.titre(taille);"],
  ["D2", "const taille = o.taille ?? M.PLANCHER_ETIQUETTE;", "const taille = o.taille || 20;"],
  ["D3", "const taille = Math.min(tailleMax, Math.floor(tailleMax * utile / w));", "const taille = tailleMax;"],
  ["D4", "let r = L * (u >= 0 && u <= 1 ? u : ((u % 1) + 1) % 1);", "let r = L * (((u % 1) + 1) % 1);"],
  ["D5", "M.sortie = p => { p = M.clamp(p); return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); };", "M.sortie = p => 1 - Math.pow(2, -10 * M.clamp(p));"],
  ["D5", "M.rebond = p => { p = M.clamp(p); if (p <= 0) return 0; const c", "M.rebond = p => { p = M.clamp(p); const c"],
  ["D6", "const s = M.lerp(s0, 1, p) * k;", "const s = p * k;"],
  ["D7", "for (const nom of noms) { const v = M.couleur(lire(nom)); if (v) { M.C[cle] = v; lus[cle] = true; break; } }",
    "for (const nom of noms.slice(0, 1)) { const v = M.couleur(lire(nom)); if (v) { M.C[cle] = v; lus[cle] = true; break; } }"],
];

const jouer = (M, src) => PROPRIETES.map(([id, titre, f]) => { try { const [v, d] = f(M, src); return { id, titre, v, d }; } catch (e) { return { id, titre, v: false, d: `exception : ${e.message}` }; } });

const iAutre = process.argv.indexOf("--motion");
if (iAutre > 0) {
  const autre = resolve(process.argv[iAutre + 1] || "");
  console.log(`\nles sept propriétés, jouées sur ${autre}`);
  if (!existsSync(autre)) { console.log(`  ROUGE fichier introuvable : ${autre}`); process.exit(1); }
  const texteAutre = lireTexte(autre);
  for (const r of jouer(charger(texteAutre), texteAutre)) ok(`${r.id} · ${r.titre}`, r.v, r.d);
  console.log(rouges.length ? `\nROUGE — ${rouges.length} propriété(s) sur 7 ne tiennent pas dans ${autre}.` : `\nTout vert — les 7 propriétés tiennent dans ${autre}.`);
  process.exit(rouges.length ? 1 : 0);
}

const source = lireTexte(MOTION);
console.log("\nmotion.js du skill · sens vert : les six défauts corrigés et les jetons du socle lus");
for (const r of jouer(charger(source), source)) ok(`${r.id} · ${r.titre}`, r.v, r.d);

console.log("\nmotion.js · sens rouge : chaque ligne d'origine remise à sa place est vue");
for (const [id, corrigee, origine] of MUTATIONS) {
  const n = source.split(corrigee).length - 1;
  if (n !== 1) { ok(`${id} · la ligne corrigée « ${corrigee.slice(0, 60)} » existe une fois`, false, `trouvée ${n} fois : la mutation ne s'applique plus`); continue; }
  const muteeSource = source.replace(corrigee, origine);
  const r = jouer(charger(muteeSource), muteeSource).find((x) => x.id === id);
  ok(`${id} · « ${origine.slice(0, 70)} » remis : la propriété tombe`, r && !r.v, r ? r.d : "propriété introuvable");
}

// ------------------------------------------------------------------------- la marque est un paramètre
console.log("\nla marque est un paramètre de la page, jamais une constante de la bibliothèque");
{
  const marque = { nom: "Atelier Ferrand", logo: "marque/logo-sombre.svg", lien: "atelier-ferrand.example" };
  const M = charger(source, { marque, jetons: { "--fond": "#123456", "--surface": "#1a2b3c", "--texte": "#fafafa", "--accent": "#c08040" } });
  ok("le nom, le logo et le lien sont lus dans la déclaration de la page", M.marque.nom === marque.nom && M.marque.logo === marque.logo && M.marque.lien === marque.lien);
  ok("les couleurs sont lues dans les jetons de systeme-de-marque (--fond, --surface, --texte, --accent)",
    M.C.fond === "#123456" && M.C.carte === "#1a2b3c" && M.C.encre === "#fafafa" && M.C.accent === "#c08040");
  ok("une marque à un seul accent : le second accent est le même, jamais une teinte étrangère", M.C.accent2 === "#c08040");
  const j = [], im = [];
  M.carteFin(contexte(j, im), 10, 0, { titre: ["Première ligne", "seconde ligne."], sousTitre: "Un sous-titre." });
  ok("la carte de fin pose le logo déclaré dans la boîte de 330 × 150 px centrée à y = 290",
    im.length === 1 && im[0].w <= 330 + 1e-9 && im[0].h <= 150 + 1e-9 && Math.abs(im[0].y + im[0].h / 2 - 290) < 1e-9, JSON.stringify(im.map((x) => [x.w, x.h, x.y])));
  ok("la carte de fin pose le lien déclaré", j.some((e) => e.txt === marque.lien));
  const l1 = j.find((e) => e.txt === "Première ligne"), l2 = j.find((e) => e.txt === "seconde ligne.");
  ok("deux lignes de titre à y = 430 puis 430 + taille + 16", !!l1 && !!l2 && Math.abs(l1.y - 430) < 1e-9 && Math.abs(l2.y - (430 + l1.px + 16)) < 1e-9,
    l1 && l2 ? `y = ${l1.y}, ${l2.y} à ${l1.px} px` : "lignes absentes");
  const ji = [], imi = [];
  M.introduction(contexte(ji, imi), 2, { titre: "Un titre", phrase: "Une phrase vraie.", etapes: ETAPES, duree: 6, graine: 11 });
  ok("l'introduction pose le nom déclaré en surtitre et le logo dans la boîte de 300 × 190 px centrée à y = 205",
    ji.some((e) => e.txt === "ATELIER FERRAND") && imi.length === 1 && Math.abs(imi[0].y + imi[0].h / 2 - 205) < 1e-9);
}
{
  const M = charger(source);
  const j = [], im = [];
  M.carteFin(contexte(j, im), 10, 0, "Un titre", "Un sous-titre.");
  M.introduction(contexte(j, im), 2, { titre: "Un titre", phrase: "Une phrase.", etapes: ETAPES, duree: 6, graine: 11 });
  const attendus = new Set(["Un titre", "Un sous-titre.", "Une phrase.", ...ETAPES]);
  const intrus = j.filter((e) => !attendus.has(e.txt)).map((e) => e.txt);
  ok("sans déclaration de marque, rien n'est dessiné à la place du logo, du nom ni du lien", im.length === 0 && intrus.length === 0, `intrus : ${intrus.join(" | ")}`);
  const pret = await M.chargerMarque();
  ok("sans déclaration de marque, M.chargerMarque rend vrai : un produit sans logo se rend", pret === true, `obtenu ${pret}`);
  const avecLogo = await charger(source, { marque: { nom: "N", logo: "logo.svg" } }).chargerMarque();
  ok("avec un logo déclaré et décodé, M.chargerMarque rend vrai", avecLogo === true, `obtenu ${avecLogo}`);
  const illisible = charger(source, { marque: "{ nom: pas du JSON" });
  const refus = await illisible.chargerMarque();
  ok("une déclaration de marque illisible rend M.chargerMarque faux : window.PRET refuse, rendre.py ne rend rien",
    refus === false && illisible.marque.illisible !== "", `obtenu ${refus}`);
}
{
  const sansCommentaires = source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
  const litteraux = [...sansCommentaires.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)].map((m) => m[1] ?? m[2]);
  const domaines = litteraux.filter((s) => /^(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?$/i.test(s) && !/\.(?:js|mjs|css|html?|json|png|jpe?g|svg|webp|wav|mp4)$/i.test(s));
  ok("la bibliothèque ne code aucun lien en dur", domaines.length === 0, domaines.join(", "));
  ok("la bibliothèque ne code aucun logo en dur (littéral d'image)", !litteraux.some((s) => /\.(?:png|jpe?g|svg|webp|gif)$/i.test(s)));
  ok("la bibliothèque ne nomme aucune marque (ni « Digit-AI » ni « Factory »)", !/digit-?ai|factory/i.test(source));
}

// ------------------------------------------------------------------------- SKILL.md, gabarits, Python
console.log("\nSKILL.md et gabarits");
{
  const skillMd = lireTexte(join(SKILL, "SKILL.md"));
  const fm = /^---\n([\s\S]*?)\n---/.exec(skillMd);
  const champ = (n) => (fm ? (new RegExp(`^${n}:\\s*(.*)$`, "m").exec(fm[1]) || [])[1] : undefined);
  const desc = champ("description") || "";
  ok("frontmatter : name clip-de-presentation, version 1.2.0", champ("name") === "clip-de-presentation" && champ("version") === "1.2.0");
  ok(`description de 1 024 caractères au plus (${desc.length}), avec « Use when » et « Ne pas déclencher »`,
    desc.length > 0 && desc.length <= 1024 && /Use when/.test(desc) && /Ne pas déclencher/.test(desc));
  ok("la description renvoie vers regarde-une-video, digit-ai-pptx et ameliore-le-design",
    ["regarde-une-video", "digit-ai-pptx", "ameliore-le-design"].every((s) => desc.includes(s)));
  const cites = [...new Set([...skillMd.matchAll(/(?<![\w/.-])((?:references|scripts|gabarits)\/[\w./-]+\.[A-Za-z0-9]+)/g)].map((m) => m[1]))];
  const absents = cites.filter((c) => !existsSync(join(SKILL, c)));
  ok(`chaque chemin cité par SKILL.md existe (${cites.length} cités)`, cites.length >= 8 && absents.length === 0, `absents : ${absents.join(", ")}`);
  const gabarit = lireTexte(join(SKILL, "gabarits", "clip.html"));
  ok("le gabarit déclare la marque, charge tokens.css et motion.js, enveloppe par M.introduire, pose M.carteFin et window.PRET",
    /<script type="application\/json" id="marque">/.test(gabarit) && /tokens\.css/.test(gabarit) && /motion\.js/.test(gabarit)
    && /M\.introduire\(/.test(gabarit) && /M\.carteFin\(/.test(gabarit) && /window\.PRET\s*=/.test(gabarit));
  ok("le gabarit ne charge aucune image en dur", !/\.(?:png|jpe?g|webp|gif)['"]/i.test(gabarit.replace(/<script type="application\/json" id="marque">[\s\S]*?<\/script>/, "")));
  const storyboard = lireTexte(join(SKILL, "gabarits", "STORYBOARD.md"));
  ok("le gabarit de storyboard porte la table de preuves (id | capacité | source | statut)", /\|\s*id\s*\|\s*capacité\s*\|[^\n]*source[^\n]*\|\s*statut/i.test(storyboard));
}

console.log("\nscripts Python");
const python = ["python", "python3"].find((c) => { const r = spawnSync(c, ["--version"], { encoding: "utf8" }); return !r.error && r.status === 0; });
if (!python) {
  console.log("  SAUT  aucun interpréteur Python (python, python3) : rendre.py et musique.py non lus");
} else {
  const env = { ...process.env, PYTHONUTF8: "1" };
  const lecture = spawnSync(python, ["-I", "-c", "import ast, sys\nfor p in sys.argv[1:]:\n    ast.parse(open(p, encoding='utf-8').read(), p)",
    join(ICI, "rendre.py"), join(ICI, "musique.py")], { encoding: "utf8", env });
  ok("rendre.py et musique.py se lisent (ast.parse)", lecture.status === 0, (lecture.stderr || "").slice(0, 200));
  const numpy = spawnSync(python, ["-I", "-c", "import numpy"], { encoding: "utf8", env });
  if (numpy.status !== 0) {
    console.log("  SAUT  numpy absent : le déterminisme de musique.py n'est pas rejoué");
  } else {
    const atelier = mkdtempSync(join(tmpdir(), "clip-musique-"));
    try {
      const args = (n) => [join(ICI, "musique.py"), "--sortie", join(atelier, n), "--duree", "3", "--impacts", "2", "--intro", "0.5", "--montee", "1", "--outro", "2.5"];
      const a = spawnSync(python, args("a.wav"), { encoding: "utf8", env }), b = spawnSync(python, args("b.wav"), { encoding: "utf8", env });
      const wa = existsSync(join(atelier, "a.wav")) ? readFileSync(join(atelier, "a.wav")) : Buffer.alloc(0);
      const wb = existsSync(join(atelier, "b.wav")) ? readFileSync(join(atelier, "b.wav")) : Buffer.alloc(0);
      ok("musique.py écrit un WAV stéréo 16 bits à 48 kHz de la durée demandée", a.status === 0 && wa.length === 44 + 3 * 48000 * 4
        && wa.toString("latin1", 0, 4) === "RIFF" && wa.readUInt16LE(22) === 2 && wa.readUInt32LE(24) === 48000, `exit ${a.status}, ${wa.length} octets ${(a.stderr || "").slice(0, 160)}`);
      ok("musique.py est déterministe : mêmes arguments, mêmes octets", b.status === 0 && wa.length > 44 && wa.equals(wb));
      ok("musique.py écrit sa sortie console en UTF-8 lisible", /musique écrite/.test(a.stdout || ""), (a.stdout || "").slice(0, 120));
    } finally { rmSync(atelier, { recursive: true, force: true }); }
  }
}

// ---------------------------------------------------------------- rendre.py --plein (TF-2603)
// Une planche réduit chaque vignette à 480 px, le quart de 1920 : une étiquette de 24 px n'y fait plus que 6 px et le plancher que le skill
// prescrit ne s'y lit pas (retour RA-22 du 12/11/2026 : deux défauts vus seulement sur des images pleine taille écrites hors du skill).
// `--plein <dossier>` écrit chaque instant à la taille du rendu. Sens vert : quatre instants, quatre PNG de 1920 x 1080 mesurés dans l'en-tête du
// fichier. Sens rouge : la même commande dont l'écriture redevient une vignette de 480 px est refusée par la garde de taille de rendre.py.
console.log("\nrendre.py --plein : des images à la taille du rendu, à côté des planches");
{
  const outils = python ? spawnSync(python, ["-I", "-c", "import playwright, static_ffmpeg"], { encoding: "utf8" }) : { status: 1 };
  const lire = (f) => lireTexte(join(SKILL, f));
  const dit = (texte) => /--plein/.test(texte) && /4 images pleine taille|quatre images pleine taille/.test(texte);
  const bible = lire("references/bible.md"), skillMd = lire("SKILL.md"), consigne = lire("references/consigne-agents.md");
  ok("la bible, SKILL.md et la consigne des agents prescrivent --plein et au moins 4 images pleine taille à côté des 3 planches",
    dit(bible) && dit(skillMd) && dit(consigne), `bible ${dit(bible)}, SKILL.md ${dit(skillMd)}, consigne ${dit(consigne)}`);
  ok("sens rouge · la bible sans --plein ne dit plus la prescription", !dit(bible.replace(/--plein/g, "")));
  if (!python || outils.status !== 0) {
    console.log("  SAUT  python, playwright ou static_ffmpeg absent : rendre.py --plein n'est pas rejoué");
  } else {
    const atelier = mkdtempSync(join(tmpdir(), "clip-plein-"));
    try {
      const page = join(atelier, "clip.html");
      writeFileSync(page, "<!doctype html><meta charset=\"utf-8\"><style>html,body{margin:0;background:#101317}canvas{display:block}</style><canvas id=\"c\" width=\"1920\" height=\"1080\"></canvas>"
        + "<script>window.DUREE=2;window.rendre=function(t){var x=document.getElementById('c').getContext('2d');x.fillStyle='#101317';x.fillRect(0,0,1920,1080);"
        + "x.fillStyle='#ffffff';x.font='700 24px sans-serif';x.fillText('étiquette de 24 px à t='+t.toFixed(1),100,100);};</script>\n", "utf8");
      const env = { ...process.env, PYTHONUTF8: "1" };
      const taille = (f) => { const b = readFileSync(f); return b.toString("latin1", 1, 4) === "PNG" ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
      const sortie = join(atelier, "pleines");
      const r = spawnSync(python, [join(ICI, "rendre.py"), page, "--plein", sortie, "--instants", "0.5,1,1.5,1.9"], { encoding: "utf8", env, timeout: 240000 });
      const fichiers = existsSync(sortie) ? readdirSync(sortie).filter((f) => /^plein-.*\.png$/.test(f)).sort() : [];
      const tailles = fichiers.map((f) => taille(join(sortie, f)));
      ok("rendre.py --plein écrit un PNG par instant, chacun de 1920 x 1080", r.status === 0 && fichiers.length === 4 && tailles.every((t) => t && t[0] === 1920 && t[1] === 1080),
        `exit ${r.status}, ${fichiers.length} fichiers, tailles ${JSON.stringify(tailles)} ${(r.stderr || "").slice(-200)}`);
      ok("rendre.py --plein dit ce qu'il a écrit, en UTF-8 lisible", /images pleine taille écrites/.test(r.stdout || ""), (r.stdout || "").slice(0, 120));
      // Sens rouge : l'écriture redevient une vignette de 480 px ; la garde de taille de rendre.py la refuse, sans rien laisser passer.
      const source = lireTexte(join(ICI, "rendre.py"));
      const sain = 'fichier.write_bytes(page.screenshot(type="png"))';
      const muet = source.split(sain).length - 1;
      ok("la ligne d'écriture de --plein existe une fois dans rendre.py (la mutation s'applique)", muet === 1, `trouvée ${muet} fois`);
      if (muet === 1) {
        const mutant = join(atelier, "rendre-vignette.py");
        writeFileSync(mutant, source.replace(sain, 'fichier.write_bytes(page.screenshot(type="png", clip={"x": 0, "y": 0, "width": 480, "height": 270}))'), "utf8");
        const m = spawnSync(python, [mutant, page, "--plein", join(atelier, "vignettes"), "--instants", "0.5"], { encoding: "utf8", env, timeout: 240000 });
        ok("sens rouge · une écriture à 480 px (la vignette d'une planche) est refusée : exit non nul et la taille nommée",
          m.status !== 0 && /480 x 270 au lieu de 1920 x 1080/.test(m.stderr || ""), `exit ${m.status} ${(m.stderr || "").slice(-200)}`);
      }
    } finally { rmSync(atelier, { recursive: true, force: true }); }
  }
}

console.log("");
if (rouges.length) {
  console.log(`ROUGE — ${rouges.length} cas en échec sur ${verts + rouges.length} :`);
  for (const r of rouges) console.log(`  · ${r}`);
  process.exit(1);
}
console.log(`Tout vert — ${verts} cas verrouillés sur le skill clip-de-presentation.`);
