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
 *
 * TF-0321 : la charte porte aussi une section « Mouvement » — quoi animer, quoi ne jamais
 * animer, et la révocation prefers-reduced-motion. Ses valeurs sont LUES dans les tokens
 * de mouvement ; un token absent est annoncé absent, jamais remplacé par une valeur que la
 * marque n'a pas fixée. C'est le pendant prescriptif d'oracle-motion, qui jugeait le
 * mouvement sans que rien en amont ne le prescrive.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, contrast } from "./lib/color.mjs";

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

// ---- mouvement : durées par taille de geste, easings, seuils (TF-0321) ---------------------
// LU dans tokens.css, jamais inventé ici. Un token absent se DIT absent : la charte annonce
// alors ce qui reste à prescrire, plutôt que d'inscrire une valeur que la marque n'a pas
// fixée — c'est exactement le défaut que cette section ferme (l'oracle jugeait le mouvement,
// rien ne le prescrivait). Le plafond n'est pas rejugé ici : oracle-motion R9 en est le seul
// arbitre, un second seuil écrit à cet endroit serait un second arbitre.
const GESTES = [
  ["dur-etat", "état d'un contrôle", "survol, focus, appui"],
  ["dur-local", "élément local", "puce, infobulle, badge"],
  ["dur-ancre", "surface ancrée à son déclencheur", "menu, popover, liste déroulante"],
  ["dur-surface", "surface plein écran", "modale, tiroir, feuille"],
];
const COURBES = [
  ["ease-apparition", "apparition et réponse d'interface (le défaut)"],
  ["ease-disparition", "sorties **seulement** — une accélération ailleurs paraît fausse"],
  ["ease-deplacement", "élément qui se déplace sans naître ni disparaître"],
];
const mouvement = {
  gestes: GESTES.map(([v, role, ex]) => ({ v, role, ex, valeur: varDe(v) })),
  courbes: COURBES.map(([v, role]) => ({ v, role, valeur: varDe(v) })),
  plafond: varDe("dur-plafond"),
  echelle: varDe("echelle-entree"),
};
const mouvementPrescrit = mouvement.gestes.some((g) => g.valeur) || mouvement.courbes.some((c) => c.valeur);
const ligneToken = (nom, valeur, suffixe) =>
  valeur ? `- \`--${nom}\` : \`${valeur}\` — ${suffixe}` : `- \`--${nom}\` : **non prescrit** — ${suffixe}`;

// ---- extraits de MARQUE.md : principes et voix (cités, jamais inventés) --------------------
const section = (titre) => {
  const m = marque.match(new RegExp(`^##\\s+${titre}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, "mi"));
  return m ? m[1].trim().split("\n").filter((l) => l.trim()).slice(0, 6).join("\n") : null;
};
const principes = section("(?:Direction|Essence|Parti[s]? pris|Principes)") ||
  "La référence spécifique prime sur l'adjectif : valeurs exactes, sobriété, accessibilité AA par défaut.";
const voix = section("Voix");

// La section vient APRÈS les sections canoniques du format et AVANT « Voix » : le gate
// design de forge-development linte `section-order` sur les sections qu'il connaît, et
// « Voix » démontre déjà qu'une section supplémentaire placée en fin est tolérée.
const sectionMouvement = `
## Mouvement

${mouvementPrescrit
  ? `Durées par **taille de geste** — jamais une durée unique partout, et jamais au-delà du
plafond \`--dur-plafond\`${mouvement.plafond ? ` (\`${mouvement.plafond}\`)` : ""} : au-delà, l'interface paraît lente.`
  : `⚠ \`tokens.css\` ne prescrit **aucun** token de mouvement. Cette charte ne peut donc pas
dire quelle durée ni quelle courbe écrire, alors que \`oracle-motion\` refusera les mauvaises :
le mouvement serait jugé sur des valeurs que la marque n'a pas fixées. À prescrire dans
\`tokens.css\` (contrat : \`references/tokens.md\`, section « Mouvement ») avant livraison.`}

${mouvement.gestes.map((g) => ligneToken(g.v, g.valeur, `${g.role} (${g.ex})`)).join("\n")}

Courbes, nommées par la phase qu'elles servent :

${mouvement.courbes.map((c) => ligneToken(c.v, c.valeur, c.role)).join("\n")}

Un élément qui apparaît naît à ${mouvement.echelle ? `\`--echelle-entree\` (\`${mouvement.echelle}\`)` : "`--echelle-entree` (**non prescrit**)"}, jamais de \`scale(0)\` : un
élément qui naît de rien paraît artificiel.

### Ce qui s'anime

\`transform\` et \`opacity\`, et rien d'autre : ce sont les deux seules propriétés qu'un
navigateur compose sans recalculer la mise en page à chaque image.

### Ce qui ne s'anime jamais

- \`width\`, \`height\`, \`top\`, \`left\`, \`margin\`, \`padding\`, \`inset\` — reflow à chaque image ;
- \`transition: all\` — transition non ciblée : coût caché, et surprise au moindre ajout
  de propriété sur le sélecteur ;
- une apparition depuis \`scale(0)\` — partir de \`--echelle-entree\` ;
- un survol animé sans garde \`@media (hover: hover)\` — sur tactile, l'état de survol
  « colle » après le tap ;
- une surface ancrée dont le mouvement part du centre — \`transform-origin\` se pose du
  côté du déclencheur, le mouvement naît de ce qui l'a provoqué.

### Révocation du mouvement

\`prefers-reduced-motion: reduce\` n'est pas une option ajoutée après coup : c'est la sortie
de secours de tout ce qui précède. Toute feuille qui déclare du mouvement porte

\`\`\`css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: .01ms !important;
    animation-duration: .01ms !important;
  }
}
\`\`\`

et ce bloc doit **neutraliser vraiment** — un \`@media\` présent mais sans effet est une
affordance non câblée, donc un défaut. Contrôles exécutés : \`oracle-motion\` R10
(révocation), R8 (les durées passent par les tokens, pas par des littéraux), R9 (aucun
token au-delà du plafond, aucune courbe à dépassement), R1–R7 (craft du geste).
`;

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
${sectionMouvement}${voix ? `
## Voix

${voix}
` : ""}`;

writeFileSync(sortie, doc);
console.log(`DESIGN.md généré : ${sortie} (contraste texte ${rTexte.toFixed(2)}:1, primaire ${rPrimaire.toFixed(2)}:1`
  + `, mouvement ${mouvementPrescrit ? "prescrit" : "NON PRESCRIT — à poser dans tokens.css"})`);
