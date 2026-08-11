#!/usr/bin/env node
// generer-images.mjs — le PRODUCTEUR d'images de la forge design (TF-0019/TF-0020, GO du 11/08).
// Honore le manifeste `manifeste-images` d'une page : chaque entrée `genere:false` est
// générée via l'API Gemini, embarquée en data: URI dans son <img data-image-id>, et le
// manifeste est mis à jour (modèle réellement servi, date, genere:true) — le contrat exact
// que juge oracle-images (I1-I6).
//
// Sécurité (garde-fous pilot) : la clé vient de GEMINI_API_KEY (environnement) ou d'un
// fichier --env ; elle n'est JAMAIS affichée, journalisée ni écrite. Appels payants :
// uniquement les entrées demandées (--seulement) ou marquées genere:false — jamais de
// régénération silencieuse d'une image déjà générée.
//
// Usage : node scripts/generer-images.mjs <page.html> [--env <fichier>] [--modele <m>]
//         [--seulement id1,id2] [--max-ko 400]
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const page = args.find((a) => !a.startsWith("--"));
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
if (!page || !existsSync(page)) { console.error("usage : generer-images.mjs <page.html> [--env <fichier>] [--modele <m>] [--seulement ids] [--max-ko N]"); process.exit(2); }

let cle = process.env.GEMINI_API_KEY || "";
const envFichier = opt("--env");
if (!cle && envFichier && existsSync(envFichier)) {
  const m = readFileSync(envFichier, "utf8").match(/^GEMINI_API_KEY=(.+)$/m);
  if (m) cle = m[1].trim();
}
if (!cle) { console.error("clé absente : GEMINI_API_KEY (environnement) ou --env <fichier> — la clé n'est jamais demandée ailleurs"); process.exit(2); }

// Modèles image : le déclaré d'abord (fixture du 04/08), replis documentés ensuite —
// le manifeste consigne le modèle RÉELLEMENT servi, jamais le souhaité.
const MODELES = [opt("--modele"), "gemini-3.1-flash-image", "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview", "gemini-2.5-flash-image"].filter(Boolean);
const maxKo = +(opt("--max-ko") || 400);
const seulement = opt("--seulement") ? new Set(opt("--seulement").split(",").map((s) => s.trim())) : null;

let html = readFileSync(page, "utf8");
const mMan = html.match(/<script type="application\/json" id="manifeste-images">([\s\S]*?)<\/script>/);
if (!mMan) { console.error("manifeste-images absent de la page — rien à générer (le contrat I5 exige le manifeste)"); process.exit(2); }
const manifeste = JSON.parse(mMan[1]);

async function generer(prompt) {
  const motifs = [];
  for (const modele of MODELES) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    // 404 : modèle inconnu de ce compte · 429 : quota À ZÉRO POUR CE MODÈLE — les quotas
    // sont par palier, un modèle moins cher a souvent du quota là où le premium n'en a
    // plus. Dans les deux cas : repli déclaré, jamais silencieux.
    if (r.status === 404 || r.status === 429) {
      motifs.push(`${modele}: ${r.status === 404 ? "indisponible" : "quota épuisé (429)"}`);
      console.log(`  (${modele} — ${r.status === 404 ? "indisponible" : "quota épuisé"}, repli)`);
      continue;
    }
    if (!r.ok) throw new Error(`API ${r.status} sur ${modele} : ${(await r.text()).slice(0, 300)}`);
    const corps = await r.json();
    const parts = corps?.candidates?.[0]?.content?.parts || [];
    const img = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
    if (!img) { motifs.push(`${modele}: réponse sans image`); console.log(`  (${modele} : réponse sans image — repli)`); continue; }
    const d = img.inlineData || img.inline_data;
    return { modele, mime: d.mimeType || d.mime_type || "image/png", b64: d.data };
  }
  throw new Error("aucun modèle image utilisable — " + motifs.join(" · ") +
    " ; si tout est en quota épuisé : activer la facturation ou attendre la fenêtre de quota (la clé, elle, est valide)");
}

const aFaire = manifeste.filter((e) => (seulement ? seulement.has(e.id) : e.genere === false));
if (!aFaire.length) { console.log("rien à générer (aucune entrée genere:false" + (seulement ? " parmi --seulement" : "") + ")"); process.exit(0); }
console.log(`${aFaire.length} image(s) à générer : ${aFaire.map((e) => e.id).join(", ")}`);

try {
  const aujourdHui = new Date().toISOString().slice(0, 10);
  for (const entree of aFaire) {
    const { modele, mime, b64 } = await generer(entree.prompt);
    const ko = Math.round(Buffer.from(b64, "base64").length / 1024);
    if (ko > maxKo) console.log(`  ! ${entree.id} : ${ko} Ko > plafond ${maxKo} Ko (I2 la jugera majeure — resserrer le prompt ou le plafond)`);
    const re = new RegExp(`(<img[^>]*data-image-id="${entree.id}"[^>]*src=")[^"]*(")`);
    if (!re.test(html)) throw new Error(`aucun <img data-image-id="${entree.id}"> dans la page — le manifeste et la page divergent`);
    html = html.replace(re, `$1data:${mime};base64,${b64}$2`);
    entree.modele = modele;
    entree.date = aujourdHui;
    entree.genere = true;
    console.log(`  ✓ ${entree.id} : ${ko} Ko via ${modele}`);
  }

  html = html.replace(/<script type="application\/json" id="manifeste-images">[\s\S]*?<\/script>/,
    `<script type="application/json" id="manifeste-images">\n${JSON.stringify(manifeste, null, 2)}\n</script>`);
  writeFileSync(page, html);
  console.log(`page mise à jour : ${page} — manifeste consigné (modèle servi, date, genere:true)`);
} catch (e) {
  console.error("échec :", e.message); // jamais la clé, jamais le corps complet
  process.exit(1);
}
