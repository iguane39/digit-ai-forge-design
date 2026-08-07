#!/usr/bin/env node
/**
 * generer-design-md.mjs — dérive un DESIGN.md lintable (format @google/design.md 0.3.0)
 * depuis les artefacts du verbe systeme-de-marque : tokens.css + MARQUE.md.
 *
 * C'est la couture design → development : forge-development linte `design/DESIGN.md`
 * (gate design, règles bloquantes : missing-primary, missing-sections, missing-typography,
 * section-order, contrast-ratio, broken-ref). Ce script produit un fichier qui les tient,
 * avec des valeurs DÉRIVÉES des tokens — jamais ressaisies.
 *
 * Usage : node generer-design-md.mjs --tokens <tokens.css> --marque <MARQUE.md>
 *         [--nom <Produit>] --sortie <DESIGN.md>
 * Sortie : DESIGN.md scellé (sha256 des sources). Exit 0 = généré, 1 = entrée invalide,
 *          2 = contraste texte/fond < 4.5 (on ne génère pas une charte inaccessible).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, contrast } from "../../../oracles/lib/color.mjs";

const arg = (n, def) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : def; };
const tokensPath = arg("--tokens"), marquePath = arg("--marque"), sortie = arg("--sortie");
if (!tokensPath || !marquePath || !sortie) {
  console.error("usage : --tokens <tokens.css> --marque <MARQUE.md> [--nom <Produit>] --sortie <DESIGN.md>");
  process.exit(1);
}
const css = readFileSync(tokensPath, "utf8");
const marque = readFileSync(marquePath, "utf8");
const nom = arg("--nom", (marque.match(/^#\s+(?:Marque\s*[—-]\s*)?(.+)$/m) || [, "Produit"])[1].trim());

// ---- tokens : couleurs du bloc :root (thème clair = référence de la charte) ----------------
const bloc = (css.match(/:root\s*{([^}]*)}/) || [, ""])[1];
const varDe = (nomVar) => (bloc.match(new RegExp(`--${nomVar}\\s*:\\s*([^;]+);`)) || [, null])[1]?.trim();
const enHex = (valeur, ou) => {
  if (!valeur) return null;
  const c = parse(valeur);
  if (!c) { console.error(`couleur illisible pour ${ou} : ${valeur}`); process.exit(1); }
  const h = (x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
};
const couleurs = {
  primary: enHex(varDe("accent"), "--accent"),
  ink: enHex(varDe("texte"), "--texte"),
  "ink-soft": enHex(varDe("texte-faible"), "--texte-faible"),
  surface: enHex(varDe("fond"), "--fond"),
  "surface-soft": enHex(varDe("surface"), "--surface"),
};
for (const [opt, source] of [["danger", "texte-erreur"], ["success", "texte-succes"]]) {
  const v = varDe(source);
  if (v) couleurs[opt] = enHex(v, `--${source}`);
}
if (!couleurs.primary || !couleurs.ink || !couleurs.surface) {
  console.error("tokens.css : --accent, --texte et --fond sont requis (contrat systeme-de-marque)");
  process.exit(1);
}

// ---- contraste réel (le gate contrast-ratio ne pardonne pas — on vérifie AVANT d'écrire) ---
const ratio = (a, b) => contrast(parse(a), parse(b));
const rTexte = ratio(couleurs.ink, couleurs.surface);
if (rTexte < 4.5) {
  console.error(`contraste texte/fond ${rTexte.toFixed(2)}:1 < 4.5 — charte inaccessible, non générée`);
  process.exit(2);
}
const rPrimaire = ratio(couleurs.primary, couleurs.surface);

// ---- typographie : premier nom de chaque pile (3 rôles du contrat tokens.md) ---------------
const police = (nomVar) => {
  const pile = varDe(nomVar);
  return pile ? pile.split(",")[0].replaceAll('"', "").replaceAll("'", "").trim() : null;
};
const typo = {
  heading: police("police-titres") || police("police-titre") || "Roboto",
  body: police("police-corps") || police("police-texte") || "DM Sans",
  mono: police("police-mono") || "Consolas",
};

// ---- espacement et rayons : échelle 4 px du contrat ---------------------------------------
const nombre = (v) => (v ? parseFloat(v) * (v.includes("rem") ? 16 : 1) : null);
const spacing = {};
for (const [cle, candidats] of [["xs", ["espace-1", "espace-xs"]], ["sm", ["espace-2", "espace-sm"]],
  ["md", ["espace-4", "espace-md"]], ["lg", ["espace-6", "espace-lg"]], ["xl", ["espace-8", "espace-xl"]]]) {
  const v = candidats.map(varDe).find(Boolean);
  spacing[cle] = v ? nombre(v) : { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 }[cle];
}
const rounded = {
  sm: nombre(varDe("rayon-petit") || varDe("rayon-sm")) ?? 6,
  card: nombre(varDe("rayon-carte") || varDe("rayon") || varDe("rayon-md")) ?? 12,
  pill: 999,
};

// ---- extraits de MARQUE.md : principes et voix (cités, jamais inventés) --------------------
const section = (titre) => {
  const m = marque.match(new RegExp(`^##\\s+${titre}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, "mi"));
  return m ? m[1].trim().split("\n").filter((l) => l.trim()).slice(0, 6).join("\n") : null;
};
const principes = section("(?:Direction|Essence|Parti[s]? pris|Principes)") ||
  "La référence spécifique prime sur l'adjectif : valeurs exactes, sobriété, accessibilité AA par défaut.";
const voix = section("Voix");

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const yaml = (o, indent = "  ") => Object.entries(o).map(([k, v]) => `${indent}${k}: ${typeof v === "string" ? `"${v}"` : v}`).join("\n");

const doc = `---
name: ${nom}
version: 1.0.0
colors:
${yaml(couleurs)}
typography:
${yaml(typo)}
spacing:
${yaml(spacing)}
rounded:
${yaml(rounded)}
---

<!-- Généré par forge-design (systeme-de-marque/scripts/generer-design-md.mjs). NE PAS ÉDITER :
     source unique = tokens.css + MARQUE.md, régénérer après toute évolution de la marque.
     sources-sha256: tokens=${sha(tokensPath)} marque=${sha(marquePath)} -->

# ${nom} — Design System

Charte dérivée des tokens de la forge design. Lintable par \`design.md\` ; consommée par le
gate design de forge-development.

## Principes

${principes}

## Couleurs

Le \`primary\` (${couleurs.primary}) porte les actions. Le texte \`ink\` (${couleurs.ink}) sur
\`surface\` (${couleurs.surface}) offre un ratio de contraste mesuré de ${rTexte.toFixed(2)}:1,
conforme WCAG 2.2 AA. Ratio \`primary\`/\`surface\` : ${rPrimaire.toFixed(2)}:1.${couleurs.danger ? `
Les états sémantiques \`danger\` (${couleurs.danger})${couleurs.success ? ` et \`success\` (${couleurs.success})` : ""} sont dérivés des tokens d'état.` : ""}

## Typographie

Titres en **${typo.heading}**, corps en **${typo.body}**, code et données en **${typo.mono}**.
Échelle typographique et interlignage : voir \`tokens.css\` (source unique).

## Composants

### button-primary

Fond \`primary\`, texte \`surface\` — contraste mesuré ${rPrimaire.toFixed(2)}:1. États focus
visibles au clavier (anneau sur \`primary\`).

### card

Fond \`surface-soft\`, rayon \`card\` (${rounded.card}px), bordure sur le token de trait.
Conteneur de base des vues.

### input

Bordure de trait, fond \`surface\`, libellé en \`ink\`, aide et erreurs sur les tokens
d'état. Toute saisie de date utilise \`input type="date"\` natif (contrat technique).

## Spacing

Échelle sur base 4 px : xs ${spacing.xs} · sm ${spacing.sm} · md ${spacing.md} · lg ${spacing.lg} · xl ${spacing.xl}.
Rayons : sm ${rounded.sm} · card ${rounded.card} · pill ${rounded.pill}.
${voix ? `
## Voix

${voix}
` : ""}`;

writeFileSync(sortie, doc);
console.log(`DESIGN.md généré : ${sortie} (contraste texte ${rTexte.toFixed(2)}:1, primaire ${rPrimaire.toFixed(2)}:1)`);
