#!/usr/bin/env node
/**
 * self-test.mjs — verrou de `generer-design-md.mjs` (TF-0335, reste déclaré de TF-0321).
 *
 * Ce générateur est la COUTURE design → development : forge-development linte le
 * `design/DESIGN.md` qu'il produit, avec des règles bloquantes (missing-primary,
 * missing-sections, missing-typography, section-order, contrast-ratio, broken-ref). Il
 * était le seul artefact exécutable de ce dépôt sans self-test — donc le seul dont une
 * régression ne se serait vue qu'en aval, chez une autre forge, sur un produit réel.
 *
 * Chaque cas est tenu dans les DEUX sens : la sortie attendue ET le refus attendu. Un
 * générateur qu'on ne teste que sur son cas vert prouve qu'il sait écrire, jamais qu'il
 * sait refuser.
 *
 * Usage : node skills/systeme-de-marque/scripts/self-test.mjs
 * Exit   : 0 tout vert · 1 au moins un cas rouge
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const GENERATEUR = join(ICI, "generer-design-md.mjs");

let verts = 0;
const rouges = [];

const ok = (titre, condition, detail = "") => {
  if (condition) {
    verts += 1;
    console.log(`  ok   ${titre}`);
  } else {
    rouges.push(`${titre}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ROUGE ${titre}${detail ? ` — ${detail}` : ""}`);
  }
};

// --- fixtures, écrites ici : le générateur lit des FICHIERS, on lui en donne de vrais ------
const TOKENS_COMPLET = `:root {
  --accent: #8a4b2a;
  --texte: #171a21;
  --texte-faible: #4a4f57;
  --fond: #f3f1ec;
  --surface: #e9e5dc;
  --texte-erreur: #8c1d18;
  --texte-succes: #1c5c3a;
  --police-titres: "Fraunces", Georgia, serif;
  --police-corps: "Inter", system-ui, sans-serif;
  --police-mono: "IBM Plex Mono", Consolas, monospace;
  --espace-1: 4px; --espace-2: 8px; --espace-4: 16px; --espace-6: 24px; --espace-8: 40px;
  --rayon-petit: 4px; --rayon-carte: 10px;
  --dur-etat: 120ms;
  --dur-local: 160ms;
  --dur-ancre: 200ms;
  --dur-surface: 260ms;
  --dur-plafond: 300ms;
  --ease-apparition: cubic-bezier(.16, 1, .3, 1);
  --ease-disparition: cubic-bezier(.4, 0, 1, 1);
  --ease-deplacement: cubic-bezier(.4, 0, .2, 1);
  --echelle-entree: 0.96;
}
`;

// Le même, amputé de TOUT mouvement : c'est le cas que TF-0321 a rendu visible.
const TOKENS_SANS_MOUVEMENT = TOKENS_COMPLET.split("\n")
  .filter((l) => !/--(dur|ease|echelle)-/.test(l))
  .join("\n");

// Contraste texte/fond volontairement sous 4.5:1 — gris moyen sur gris clair.
const TOKENS_CONTRASTE_FAIBLE = TOKENS_COMPLET.replace("--texte: #171a21;", "--texte: #9a9a9a;");

const TOKENS_SANS_ACCENT = TOKENS_COMPLET.replace(/\s*--accent: #8a4b2a;\n/, "\n");

const MARQUE = `# Marque — Atelier Ferrand

## Direction

La référence est un atelier de reliure : papier crème, encre profonde, un seul accent cuivre.
Aucun dégradé, aucune ombre portée décorative.

## Voix

Sobre, précise, jamais promotionnelle.
`;

const atelier = mkdtempSync(join(tmpdir(), "self-test-design-md-"));
const ecrire = (nom, contenu) => {
  const chemin = join(atelier, nom);
  writeFileSync(chemin, contenu, "utf8");
  return chemin;
};

const lancer = (args) =>
  spawnSync(process.execPath, [GENERATEUR, ...args], { encoding: "utf8" });

const marque = ecrire("MARQUE.md", MARQUE);

try {
  // --- 1 · le cas vert : dérivation complète -----------------------------------------------
  console.log("\ngenerer-design-md.mjs · cas vert");
  const tokens = ecrire("tokens.css", TOKENS_COMPLET);
  const sortie = join(atelier, "DESIGN.md");
  const r = lancer(["--tokens", tokens, "--marque", marque, "--sortie", sortie]);
  ok("exit 0", r.status === 0, `obtenu ${r.status} · ${r.stderr.trim()}`);
  ok("le fichier est écrit", existsSync(sortie));

  const doc = existsSync(sortie) ? readFileSync(sortie, "utf8") : "";
  for (const titre of ["Principes", "Couleurs", "Typographie", "Composants", "Spacing", "Mouvement"]) {
    ok(`section « ${titre} » présente`, new RegExp(`^## ${titre}\\s*$`, "m").test(doc));
  }
  ok("la couleur primaire est DÉRIVÉE du token, pas ressaisie", doc.includes("#8a4b2a"));
  ok("la police de titres vient de la pile de tokens", doc.includes("Fraunces"));
  ok("le document est SCELLÉ par le sha256 de ses deux sources", /sources-sha256: tokens=[0-9a-f]{64} marque=[0-9a-f]{64}/.test(doc));

  // --- 2 · le sceau SUIT la source : sinon ce n'est pas une dérivation, c'est une copie -----
  console.log("\nle sceau suit la source");
  const tokens2 = ecrire("tokens2.css", TOKENS_COMPLET.replace("--accent: #8a4b2a;", "--accent: #2a4b8a;"));
  const sortie2 = join(atelier, "DESIGN2.md");
  lancer(["--tokens", tokens2, "--marque", marque, "--sortie", sortie2]);
  const doc2 = readFileSync(sortie2, "utf8");
  const sceau = (t) => (t.match(/tokens=([0-9a-f]{64})/) || [, ""])[1];
  ok("un token modifié change le sceau", sceau(doc) !== sceau(doc2));
  ok("un token modifié change la valeur publiée", doc2.includes("#2a4b8a"));

  // --- 3 · le mouvement PRESCRIT, et son absence DITE (TF-0321) ------------------------------
  console.log("\nmouvement : prescrit, ou déclaré absent — jamais inventé");
  ok("les durées prescrites sont publiées", doc.includes("200ms") && doc.includes("260ms"));
  ok("les courbes prescrites sont publiées", doc.includes("cubic-bezier(.16, 1, .3, 1)"));

  const tokensSansMvt = ecrire("tokens-sans-mouvement.css", TOKENS_SANS_MOUVEMENT);
  const sortie3 = join(atelier, "DESIGN3.md");
  const r3 = lancer(["--tokens", tokensSansMvt, "--marque", marque, "--sortie", sortie3]);
  ok("exit 0 malgré l'absence de tokens de mouvement", r3.status === 0, `obtenu ${r3.status}`);
  const doc3 = readFileSync(sortie3, "utf8");
  ok("un token de mouvement absent est annoncé « non prescrit »", doc3.includes("non prescrit"));
  ok(
    "aucune durée n'est INVENTÉE à la place de la marque",
    !/`--dur-ancre` : `\d+ms`/.test(doc3),
    "le générateur a écrit une valeur que la marque n'a pas fixée",
  );

  // --- 4 · les refus. Un générateur se juge sur ce qu'il refuse d'écrire ---------------------
  console.log("\nles refus");
  const tokensFaibles = ecrire("tokens-contraste.css", TOKENS_CONTRASTE_FAIBLE);
  const sortieFaible = join(atelier, "DESIGN-inaccessible.md");
  const rc = lancer(["--tokens", tokensFaibles, "--marque", marque, "--sortie", sortieFaible]);
  ok("contraste < 4.5:1 → exit 2", rc.status === 2, `obtenu ${rc.status}`);
  ok("… et RIEN n'est écrit : une charte inaccessible ne se livre pas", !existsSync(sortieFaible));
  ok("… le motif nomme le ratio mesuré", /contraste texte\/fond \d+\.\d+:1/.test(rc.stderr));

  const tokensSansAccent = ecrire("tokens-sans-accent.css", TOKENS_SANS_ACCENT);
  const sortieSansAccent = join(atelier, "DESIGN-sans-accent.md");
  const ra = lancer(["--tokens", tokensSansAccent, "--marque", marque, "--sortie", sortieSansAccent]);
  ok("token --accent absent → exit 1", ra.status === 1, `obtenu ${ra.status}`);
  ok("… et RIEN n'est écrit", !existsSync(sortieSansAccent));
  ok("… le motif nomme les tokens requis", ra.stderr.includes("--accent"));

  const rm = lancer(["--tokens", tokens]);
  ok("argument obligatoire manquant → exit 1", rm.status === 1, `obtenu ${rm.status}`);
  ok("… avec l'usage sur stderr", rm.stderr.includes("usage :"));

  const ri = lancer(["--tokens", join(atelier, "absent.css"), "--marque", marque, "--sortie", join(atelier, "x.md")]);
  ok("fichier de tokens introuvable → sortie non nulle, jamais un document vide", ri.status !== 0);
} finally {
  rmSync(atelier, { recursive: true, force: true });
}

console.log("");
if (rouges.length) {
  console.log(`ROUGE — ${rouges.length} cas en échec sur ${verts + rouges.length} :`);
  for (const r of rouges) console.log(`  · ${r}`);
  process.exit(1);
}
console.log(`Tout vert — ${verts} cas verrouillés sur generer-design-md.mjs.`);
