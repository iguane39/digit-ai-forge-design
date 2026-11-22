#!/usr/bin/env node
// fabriquer-etat-connexion — fabrique l'état de connexion (storageState Playwright) d'une application servie
// derrière une connexion, celui que `--etat-connexion` attend (TF-2781).
//
// LE FAIT. La critique d'une page servie derrière une connexion rend SKIP en X0 (redirection vers la page de
// connexion) tant que `--etat-connexion` manque, et rien dans la forge ne fabriquait cet état : deux passages de
// critique perdus chez Produit-12 (22/11/2026). Le message de X0 et le hook de restitution du pilot citaient
// l'option sans dire comment obtenir son fichier. Ce script le fabrique, en une commande, sur la voie automatique.
//
// Ce que le script ne fait JAMAIS :
//   - lire un fichier d'environnement (.env) : les valeurs viennent de variables d'ENVIRONNEMENT que l'appelant a
//     posées dans sa session, désignées par leur NOM (--identifiant-env, --secret-env) ; jamais d'une valeur en
//     argument, qui finirait dans l'historique et dans la liste des processus ;
//   - imprimer l'identifiant, le secret ou un cookie : la sortie ne porte que des compteurs et l'adresse atteinte ;
//   - écrire l'état dans un dépôt git : un état de session est un secret, son fichier vit hors de tout dépôt ;
//   - rendre un état quand la connexion n'est pas établie : champ du secret encore affiché, ou adresse attendue
//     non atteinte, exit 1 et aucun fichier écrit.
//
// Usage : node fabriquer-etat-connexion.mjs --url <page de connexion> --sortie <etat.json>
//           --identifiant-env <NOM_VARIABLE> --secret-env <NOM_VARIABLE>
//           [--champ-identifiant <sélecteur>] [--champ-secret <sélecteur>] [--bouton <sélecteur>]
//           [--attendre-url <motif>] [--attente <ms>] [--accepter-certificat-local] [--json-only]
// Puis : node run-oracles-design.mjs <page> --instance <url de l'écran> --etat-connexion <etat.json>
// Exit : 0 état écrit · 1 connexion refusée ou non établie · 2 prérequis absent (option, variable, outillage, chemin).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { detecterOutillageRendu } from '../oracles/lib/rendu.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const AVEC_VALEUR = ['--url', '--sortie', '--identifiant-env', '--secret-env', '--champ-identifiant', '--champ-secret', '--bouton', '--attendre-url', '--attente'];
const opt = (nom) => { const i = args.indexOf(nom); return i >= 0 && !args[i + 1]?.startsWith('--') ? args[i + 1] : null; };

function sortir(code, ok, message, extra = {}) {
  process.stdout.write(JSON.stringify({ outil: 'fabriquer-etat-connexion', ok, message, ...extra }) + '\n');
  process.exit(code);
}

for (const a of args) {
  if (!a.startsWith('--')) continue;
  if (![...AVEC_VALEUR, '--accepter-certificat-local', '--json-only'].includes(a)) sortir(2, false, `option inconnue : ${a.slice(0, 40)}`);
}
for (const nom of AVEC_VALEUR.slice(0, 4)) if (!opt(nom)) sortir(2, false, `option obligatoire absente : ${nom}`);

const url = opt('--url');
try {
  const u = new URL(url);
  if (!['http:', 'https:'].includes(u.protocol)) sortir(2, false, `--url doit être http(s) : « ${u.protocol} » refusé`);
} catch { sortir(2, false, '--url illisible : une adresse http(s) complète est attendue'); }

// Un état de session est un secret : jamais dans un dépôt git, jamais sous un chemin que git suivrait.
const sortie = path.resolve(opt('--sortie'));
for (let d = path.dirname(sortie); ; d = path.dirname(d)) {
  if (fs.existsSync(path.join(d, '.git'))) sortir(2, false, `--sortie refusée : ${sortie} est sous un dépôt git (${d}) ; poser l'état hors de tout dépôt, par exemple dans le dossier temporaire du poste`);
  if (path.dirname(d) === d) break;
}

// Les valeurs viennent de l'environnement de la session, jamais d'un fichier .env ni de la ligne de commande.
const nomIdentifiant = opt('--identifiant-env'), nomSecret = opt('--secret-env');
for (const nom of [nomIdentifiant, nomSecret]) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(nom)) sortir(2, false, 'un nom de variable d\'environnement est attendu (lettres, chiffres, souligné), pas une valeur');
  if (!process.env[nom]) sortir(2, false, `la variable d'environnement ${nom} est absente ou vide dans cette session : la poser avant de relancer (sa valeur n'est jamais lue d'un fichier .env)`);
}

const outillage = detecterOutillageRendu();
if (!outillage.python) sortir(2, false, `outillage indisponible : ${outillage.manques.join(' ; ')}`);

const entree = {
  url,
  identifiant: process.env[nomIdentifiant],
  secret: process.env[nomSecret],
  champ_identifiant: opt('--champ-identifiant') || 'input[type=email], input[name=email], input[name=username], input[name=identifiant], input[autocomplete=username], input[type=text]',
  champ_secret: opt('--champ-secret') || 'input[type=password]',
  bouton: opt('--bouton') || 'button[type=submit], input[type=submit], form button',
  attendre_url: opt('--attendre-url'),
  attente: Number(opt('--attente') || 15000),
  certificat_local: args.includes('--accepter-certificat-local'),
  sortie,
};
fs.mkdirSync(path.dirname(sortie), { recursive: true });
const r = spawnSync(outillage.python, [path.join(ici, '..', 'oracles', 'lib', 'fabriquer_etat_connexion.py')], {
  input: JSON.stringify(entree), encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' },
});
let j = null;
try { j = JSON.parse((r.stdout || '').trim().split(/\r?\n/).pop()); } catch { /* illisible : dit ci-dessous */ }
if (!j) sortir(2, false, `le pilote de connexion n'a rien rendu de lisible (exit ${r.status})`);
if (!j.ok) sortir(j.code === 2 ? 2 : 1, false, j.erreur);
try { fs.chmodSync(sortie, 0o600); } catch { /* sans effet sous Windows */ }
sortir(0, true, `état de connexion écrit : ${sortie}`, { url_finale: j.url_finale, cookies: j.cookies, origines: j.origines,
  suite: `node <forge-design>/oracles/run-oracles-design.mjs <page> --instance <url de l'écran> --etat-connexion ${sortie}` });
