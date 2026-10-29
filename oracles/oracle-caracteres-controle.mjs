#!/usr/bin/env node
// oracle-caracteres-controle — une page livrée et ses feuilles de style locales ne portent aucun octet
// de contrôle (TF-1980, 29/10/2026).
//
// LE FAIT. Chez un produit, deux propriétés `content` d'une feuille de style ont reçu les octets 0x15 et
// 0x00 : l'échappement CSS « \25F7 » écrit par un script Python a été lu comme une séquence octale. Quatre
// pastilles affichaient un caractère parasite, et les trois contrôles de livraison (run-oracles-design,
// render_page, check_html) rendaient PASS : l'octet est invisible à la lecture et à la capture d'écran
// d'une page où il tombe dans un pseudo-élément.
//
// CC-P1 (bloquant) : un caractère de contrôle C0 (0x00 à 0x1F hors tabulation, fin de ligne et retour
// chariot) ou DEL (0x7F) dans la page HTML ou dans une feuille de style locale qu'elle lie
// (`<link rel="stylesheet" href="…">` relatif). Le constat nomme le fichier, la ligne, la colonne, le
// code du caractère et ce qui l'entoure. Même règle que oracle-caracteres-controle.mjs du pilot (CC1,
// TF-0922), qui balaie les fichiers suivis d'un dépôt ; celui-ci juge une page et ce qu'elle charge.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-caracteres-controle.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import path from 'node:path';

const DOM = 'Caractères de contrôle dans la page et ses feuilles de style locales';
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');

const NON_JUGE = [
  'feuilles de style distantes (http, https, //) et scripts : seuls la page et ses feuilles de style locales liées sont lus',
  'caractères de contrôle C1 (0x80 à 0x9F) et caractères invisibles Unicode (espace de largeur nulle, marque de direction) : hors de cette règle',
  'le rendu du caractère : l\'oracle juge l\'octet présent dans le fichier, pas ce que le navigateur en affiche',
];

const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-caracteres-controle', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: 'CC-P1', msg: 'aucun caractère de contrôle dans la page ni dans ses feuilles de style locales', where: file }],
    non_juge: NON_JUGE,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) sortir('SKIP', 2);
if (!/\.html?$/i.test(file)) sortir('SKIP', 2);

const CONTROLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const NOM = (c) => `0x${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`;

function juger(chemin, texte) {
  const lignes = texte.split('\n');
  lignes.forEach((l, i) => {
    for (const m of l.matchAll(CONTROLE)) {
      const avant = l.slice(Math.max(0, m.index - 20), m.index).replace(CONTROLE, '·');
      const apres = l.slice(m.index + 1, m.index + 21).replace(CONTROLE, '·');
      add('bloquant', 'CC-P1', `octet de contrôle ${NOM(m[0])} ligne ${i + 1}, colonne ${m.index + 1} : « ${avant}⟨${NOM(m[0])}⟩${apres} » — `
        + 'souvent un échappement (« \\25F7 », « \\v », « \\0 ») réinterprété par le script qui a écrit le fichier ; réécrire le caractère voulu', `${chemin}:${i + 1}`);
    }
  });
}

const html = fs.readFileSync(file, 'utf8');
juger(file, html);
const dossier = path.dirname(file);
let feuilles = 0;
for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
  const balise = m[0];
  if (!/\brel\s*=\s*["']?[^"'>]*stylesheet/i.test(balise)) continue;
  const href = (balise.match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1];
  if (!href || /^(?:[a-z]+:)?\/\//i.test(href) || /^data:/i.test(href)) continue;
  // Œil critique du pilot, 29/10/2026 : un href « /s.css » (racine du site) se résolvait contre la racine
  // du disque, la feuille était sautée sans bruit et la page rendait PASS ; un « % » mal formé faisait
  // planter l'oracle sans verdict. La racine du site est cherchée en remontant depuis le dossier de la page.
  let chemin = href.split(/[?#]/)[0];
  try { chemin = decodeURIComponent(chemin); } catch { /* « % » mal formé : le chemin brut est cherché tel quel */ }
  let cible = path.resolve(dossier, chemin);
  if (chemin.startsWith('/')) {
    for (let d = dossier; ; d = path.dirname(d)) {
      const c = path.join(d, chemin);
      if (fs.existsSync(c)) { cible = c; break; }
      if (path.dirname(d) === d) break;
    }
  }
  if (!fs.existsSync(cible)) continue;
  feuilles++;
  juger(path.relative(process.cwd(), cible) || cible, fs.readFileSync(cible, 'utf8'));
}

if (F.some(f => f.sev === 'bloquant')) sortir('FAIL', 1);
F.push({ sev: 'info', regle: 'CC-P1', msg: `aucun caractère de contrôle dans la page ni dans ${feuilles} feuille(s) de style locale(s)`, where: file });
sortir('PASS', 0);
