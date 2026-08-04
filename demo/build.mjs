#!/usr/bin/env node
// build.mjs — assemble la maquette mono-fichier depuis le template.
//
// Le réseau est autorisé au build, interdit au runtime du livrable : c'est ici
// que Motion est inliné depuis oracles/vendor/, empreinte vérifiée. Le fichier
// produit ne charge plus rien.
//
// Usage : node demo/build.mjs

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');

const EMPREINTE_ATTENDUE = 'cbaccc5c5809cdaa2777ded956e475a404f0596048cb9645c8c80da85c6e8174';
const VENDOR = path.join(racine, 'oracles', 'vendor', 'motion-12.23.12.umd.js');
const SORTIE = path.join(ici, "Digit-AI - Maquette Bailleur - Interventions - 20260804a.html");

const motion = fs.readFileSync(VENDOR, 'utf8');
const empreinte = crypto.createHash('sha256').update(fs.readFileSync(VENDOR)).digest('hex');
if (empreinte !== EMPREINTE_ATTENDUE) {
  console.error(`ARRET — empreinte de Motion inattendue.\n  attendue : ${EMPREINTE_ATTENDUE}\n  obtenue  : ${empreinte}`);
  process.exit(1);
}
if (/\bimport\s*[{*"']|\bfrom\s*["']https?:/.test(motion)) {
  console.error('ARRET — le bundle vendoré contient un import : il ne serait pas autonome.');
  process.exit(1);
}

const template = fs.readFileSync(path.join(ici, 'maquette.template.html'), 'utf8');
if (!template.includes('/*MOTION_VENDORE*/')) {
  console.error('ARRET — placeholder /*MOTION_VENDORE*/ absent du template.');
  process.exit(1);
}

// La balise fermante ne doit jamais apparaître dans le JS inliné.
const sur = motion.replace(/<\/script/gi, '<\\/script');
const html = template.replace('/*MOTION_VENDORE*/', () =>
  `/* Motion 12.23.12 — MIT — vendoré, sha256:${empreinte.slice(0, 16)}… */\n${sur}`);

fs.writeFileSync(SORTIE, html, 'utf8');

const ko = Math.round(fs.statSync(SORTIE).size / 1024);
console.log(`écrit : ${path.basename(SORTIE)} — ${ko} Ko`);
console.log(`Motion inliné : ${Math.round(motion.length / 1024)} Ko, empreinte vérifiée`);
