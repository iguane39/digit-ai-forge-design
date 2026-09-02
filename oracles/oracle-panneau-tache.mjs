#!/usr/bin/env node
// oracle-panneau-tache — Domaine « Panneau de tâche : choix exclusif, branches, coexistence »
// (déterministe).
//
// TF-0707 + TF-0708 (lot Produit-12 du 16/08, inspection utilisateur en production).
// L'écran de connexion d'un stockage affichait SIMULTANÉMENT les champs des deux modes
// d'un même flux (clé d'application, secret, code d'autorisation ET jeton direct), derrière
// un encart replié toujours présent en bas de la page qui listait déjà les connexions.
// L'utilisateur en a déduit une alternative entre « clé d'application » et « OAuth » — alors
// que la clé d'application EST l'identifiant client du flux OAuth. Le formulaire demandait
// par ailleurs la même clé DEUX FOIS, et un seul libellé portait deux actions différentes.
//
// Doctrine tranchée par ces deux retours, et mécanisée ici :
//   « Un panneau de tâche ne coexiste pas avec la liste qu'il alimente, et ne rend que les
//     champs de la branche retenue. Un choix exclusif se pose AVANT les champs qu'il commande,
//     jamais au milieu d'un formulaire qui les affiche déjà tous. »
// TF-0708 en tire la seconde moitié : le motif « formulaire replié » (<details> toujours
// présent sous la liste) est BON pour une création simple, courte et sans branche — il devient
// nuisible dès que le formulaire porte des branches exclusives, car le repli MASQUE la
// contradiction au lieu de la résoudre. Deux motifs légitimes, donc, et un critère de choix :
// création simple → formulaire replié ; tâche à branches → panneau adressable (route dédiée).
//
// Convention de balisage (référence : skills/ameliore-le-design/references/patterns-interaction.md).
// Elle est le prix de la mécanisation : sans marquage, aucune lecture statique ne distingue
// deux groupes de champs exclusifs de deux sections d'un même formulaire.
//   - panneau de création          : [data-panneau-tache="<nom>"] (ou un <form> qui contient des branches)
//   - groupe de champs d'une branche : [data-branche="<valeur>"]
//   - sélecteur qui commande les branches : [data-commande-branches] (radios ou <select>)
//   - branche rendue                : [data-branche-active] sur le groupe retenu
//   - route du panneau adressable   : [data-route="#…?nouveau=…"] sur le panneau
//
// Six règles, décidables sur le fichier seul :
//   PA1  ≥ 2 branches dans un panneau sans aucun sélecteur qui les commande : le choix exclusif
//        n'est pas posé, l'utilisateur doit le deviner.
//   PA2  le sélecteur est placé APRÈS (ordre du DOM) la première branche qu'il commande : le
//        choix se pose au milieu des champs qu'il gouverne.
//   PA3  plusieurs branches rendues simultanément : aucune n'est masquée (ni [hidden], ni règle
//        CSS de masquage des branches inactives, ni bascule dans le JS inline).
//   PA4  le même champ demandé deux fois dans le même panneau (même name, hors radio/checkbox,
//        ou deux étiquettes visibles identiques).
//   PA5  mauvais motif : un panneau à branches rendu en « formulaire replié » (<details>) qui
//        coexiste, dans le même écran, avec la liste qu'il alimente. Le motif attendu pour une
//        tâche à branches est le panneau adressable.
//   PA6  panneau adressable déclaré ([data-route]) sans aucun déclencheur qui pointe cette route :
//        un panneau inatteignable est une affordance qui n'existe pas (loi transverse n° 1).
//
// Ce que cet oracle NE juge PAS (déclaré en non_juge, jamais supposé) :
//   - les branches non balisées : un formulaire qui n'annote pas ses branches n'est pas jugé
//     exclusif, et l'oracle le dit au lieu de le supposer ;
//   - la JUSTESSE du découpage en branches (deux moitiés d'un même flux prises pour une
//     alternative) : c'est le fond du retour Produit-12, il relève de la revue, pas d'un attribut ;
//   - la visibilité RÉELLE au rendu (une branche masquée par un style calculé au runtime) ;
//   - le libellé porteur de deux actions différentes : couvert par C15 de check_maquette.py ;
//   - les panneaux rendus par un script externe ou un framework.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-panneau-tache.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import { parse as parseHtml, elements, walk, css, cssRulesDeep, arbres } from './lib/html.mjs';

const DOM = 'Panneau de tâche : choix exclusif, branches, coexistence';
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');

const NON_JUGE = [
  'branches non balisées — un formulaire qui n\'annote pas ses groupes exclusifs par data-branche n\'est pas jugé exclusif : l\'oracle le déclare au lieu de le supposer',
  'justesse du découpage en branches (deux moitiés d\'un même flux prises pour une alternative) — relève de la revue de conception, pas d\'un attribut',
  'visibilité réelle au rendu : une branche masquée par un style calculé au runtime n\'est pas observable sur le fichier',
  'un même libellé portant deux actions différentes sur un écran — couvert par C15 de check_maquette.py, non dupliqué ici',
  'panneaux et branches rendus par un <script src="…"> externe ou un framework — analyse statique limitée au DOM et au JS inline',
];

const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-panneau-tache', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'PA1–PA6 sans écart', where: file }],
    non_juge: NON_JUGE,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) sortir('SKIP', 2);
if (!/\.html?$/i.test(file)) sortir('SKIP', 2);

const html = fs.readFileSync(file, 'utf8');
const root = parseHtml(html);

const at = (el, k) => (el.attrs && el.attrs[k] != null ? String(el.attrs[k]) : '');
const aAttr = (el, k) => !!el.attrs && Object.prototype.hasOwnProperty.call(el.attrs, k);
const texteDe = el => { let t = ''; walk(el, n => { if (n.tag === '#text') t += ' ' + n.text; }); return t.replace(/\s+/g, ' ').trim(); };
const descendants = el => { const out = []; walk(el, n => { if (!n.tag.startsWith('#') && n !== el) out.push(n); }); return out; };
const ancetres = el => { const out = []; let p = el.parent; while (p) { out.push(p); p = p.parent; } return out; };

const scriptsInline = [];
for (const s of elements(root, 'script')) {
  if (aAttr(s, 'src')) continue;
  for (const c of s.children) if (c.tag === '#raw') scriptsInline.push(c.text);
}
const JS = scriptsInline.join('\n');
if (elements(root, 'script').some(s => aAttr(s, 'src'))) {
  NON_JUGE.push('au moins un <script src="…"> détecté : son contenu n\'est pas analysé (bascule de branche éventuellement portée par lui)');
}

// Le contrat impose un rendu DYNAMIQUE : un panneau de création vit aussi bien dans
// un gabarit JS que dans le DOM statique. Un oracle aveugle au runtime se tairait sur
// le panneau qu'il devait juger — faux négatif déjà payé une fois par ce dépôt.
const TOUS_ARBRES = arbres(html, root);
const tous = TOUS_ARBRES.flatMap(t => elements(t));

// ── Repérage des panneaux ──────────────────────────────────────────────────
// Un panneau est déclaré ([data-panneau-tache]) ou déduit : le plus proche <form>,
// <details> ou <section> qui contient au moins un groupe [data-branche].
const branchesToutes = tous.filter(el => at(el, 'data-branche').trim() !== '');
const declares = tous.filter(el => aAttr(el, 'data-panneau-tache'));

function panneauPorteur(el) {
  for (const p of ancetres(el)) {
    if (aAttr(p, 'data-panneau-tache')) return p;
  }
  for (const p of ancetres(el)) {
    if (p.tag === 'form' || p.tag === 'details' || p.tag === 'section') return p;
  }
  return null;
}

const panneaux = new Set(declares);
for (const b of branchesToutes) { const p = panneauPorteur(b); if (p) panneaux.add(p); }

if (panneaux.size === 0) {
  NON_JUGE.push('aucun panneau de création détecté ([data-panneau-tache], ou conteneur portant des [data-branche]) : PA1–PA6 sans objet ici, jamais PASS par défaut sur un domaine absent');
}

// ── Écran porteur : le plus proche conteneur de route/écran, sinon la racine ──
const racines = new Set(TOUS_ARBRES);
function ecranDe(el) {
  let dernier = null;
  for (const p of ancetres(el)) {
    if (aAttr(p, 'data-ecran') || aAttr(p, 'data-route-ecran')) return p;
    if (p.tag === 'section' && at(p, 'id')) return p;
    dernier = p;
  }
  return dernier || el;
}
const nomEcran = e => racines.has(e) ? 'document' : (at(e, 'data-ecran') || at(e, 'id') || e.tag);

// ── CSS et JS : la branche inactive est-elle masquée quelque part ? ─────────
const cssTexte = css(html, root).replace(/\/\*[\s\S]*?\*\//g, ' ');
const reglesCss = cssRulesDeep(cssTexte);
const masquageCss = reglesCss.some(r =>
  /data-branche/i.test(r.selector) && /display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden/i.test(r.body));
const basculeJs = /data-branche|dataset\.branche|brancheActive|branche-active/i.test(JS)
  && /(hidden\s*=|classList\.(?:add|remove|toggle)|style\.display|setAttribute\(\s*['"]hidden|removeAttribute\(\s*['"]hidden|toggleAttribute\()/.test(JS);

// ── Parcours des panneaux ──────────────────────────────────────────────────
for (const panneau of panneaux) {
  const dedans = descendants(panneau);
  const nomPanneau = at(panneau, 'data-panneau-tache') || at(panneau, 'id') || panneau.tag;
  const branches = dedans.filter(el => at(el, 'data-branche').trim() !== '');
  const valeurs = [...new Set(branches.map(el => at(el, 'data-branche').trim()))];
  const selecteurs = dedans.filter(el => aAttr(el, 'data-commande-branches'));

  // ── PA1 · le choix exclusif n'est pas posé ───────────────────────────────
  if (valeurs.length >= 2 && selecteurs.length === 0) {
    add('bloquant', 'PA1',
      `panneau « ${nomPanneau} » : ${valeurs.length} branches exclusives (${valeurs.join(', ')}) et aucun sélecteur [data-commande-branches] — le choix exclusif n'est pas posé, l'utilisateur doit le deviner en lisant les champs`,
      `[data-panneau-tache=${nomPanneau}]`);
  }

  // ── PA2 · le choix se pose au milieu des champs qu'il commande ───────────
  if (valeurs.length >= 2 && selecteurs.length > 0) {
    const premiereBranche = Math.min(...branches.map(b => b.start));
    const premierSelecteur = Math.min(...selecteurs.map(s => {
      // Pour un groupe de radios, l'ancre est le conteneur porteur s'il existe, sinon le champ.
      return s.start;
    }));
    if (premierSelecteur > premiereBranche) {
      add('bloquant', 'PA2',
        `panneau « ${nomPanneau} » : le sélecteur de branche est placé APRÈS la première branche qu'il commande (offset ${premierSelecteur} > ${premiereBranche}) — un choix exclusif se pose AVANT les champs qu'il gouverne, jamais au milieu d'un formulaire qui les affiche déjà tous`,
        `[data-panneau-tache=${nomPanneau}]`);
    }
  }

  // ── PA3 · les branches coexistent, aucune n'est masquée ─────────────────
  if (valeurs.length >= 2) {
    const masqueesDom = branches.filter(b => aAttr(b, 'hidden') || /display\s*:\s*none/i.test(at(b, 'style')));
    const actives = branches.filter(b => aAttr(b, 'data-branche-active'));
    const uneSeuleRendue = masqueesDom.length >= branches.length - 1
      || (actives.length === 1 && (masquageCss || basculeJs))
      || (masquageCss && basculeJs);
    if (!uneSeuleRendue) {
      add('bloquant', 'PA3',
        `panneau « ${nomPanneau} » : les ${valeurs.length} branches sont rendues simultanément — aucune n'est masquée ([hidden] ou style), aucune règle CSS ne masque les branches inactives, aucune bascule dans le JS inline. Un panneau ne rend que les champs de la branche retenue`,
        `[data-panneau-tache=${nomPanneau}]`);
    }
  }

  // ── PA4 · le même champ demandé deux fois ───────────────────────────────
  const saisies = dedans.filter(el =>
    (el.tag === 'input' && !['hidden', 'submit', 'button', 'reset', 'image', 'radio', 'checkbox'].includes((at(el, 'type') || 'text').toLowerCase()))
    || el.tag === 'textarea' || el.tag === 'select');
  const parNom = new Map();
  for (const s of saisies) {
    const n = (at(s, 'name') || at(s, 'id')).trim();
    if (!n) continue;
    // Deux champs de même nom dans DEUX branches distinctes sont la même donnée,
    // demandée une fois par branche : ce n'est pas un doublon.
    const b = [panneau, ...ancetres(s)].find(x => at(x, 'data-branche').trim() !== '');
    const cle = n.toLowerCase();
    if (!parNom.has(cle)) parNom.set(cle, []);
    parNom.get(cle).push({ el: s, branche: b ? at(b, 'data-branche').trim() : '' });
  }
  for (const [nom, occ] of parNom) {
    if (occ.length < 2) continue;
    const branchesOcc = new Set(occ.map(o => o.branche));
    if (branchesOcc.size === occ.length && !branchesOcc.has('')) continue;
    add('bloquant', 'PA4',
      `panneau « ${nomPanneau} » : le champ « ${nom} » est demandé ${occ.length} fois dans le même panneau (branches : ${[...branchesOcc].map(b => b || '—').join(', ')}) — une donnée ne se saisit qu'une fois par branche`,
      `[name=${nom}]`);
  }

  // Doublon d'étiquette visible, même quand les name diffèrent (le cas Produit-12 :
  // « Clé d'application » demandée sous deux noms de champ).
  const libelles = new Map();
  for (const l of dedans.filter(el => el.tag === 'label')) {
    const t = texteDe(l).toLowerCase().replace(/[\s:*]+$/g, '');
    if (!t) continue;
    const b = [panneau, ...ancetres(l)].find(x => at(x, 'data-branche').trim() !== '');
    if (!libelles.has(t)) libelles.set(t, []);
    libelles.get(t).push(b ? at(b, 'data-branche').trim() : '');
  }
  for (const [texte, brs] of libelles) {
    if (brs.length < 2) continue;
    const distinctes = new Set(brs);
    if (distinctes.size === brs.length && !distinctes.has('')) continue;
    add('bloquant', 'PA4',
      `panneau « ${nomPanneau} » : l'étiquette « ${texte} » apparaît ${brs.length} fois dans le même panneau — le même renseignement est demandé deux fois à l'utilisateur`,
      `label:"${texte}"`);
  }

  // ── PA5 · mauvais motif : formulaire replié pour une tâche à branches ───
  if (valeurs.length >= 2) {
    const replie = panneau.tag === 'details' || ancetres(panneau).some(p => p.tag === 'details');
    const ecran = ecranDe(panneau);
    const listes = descendants(ecran).filter(el =>
      (el.tag === 'table' || aAttr(el, 'data-liste')) && !descendants(panneau).includes(el) && el !== panneau);
    if (replie && listes.length > 0) {
      add('bloquant', 'PA5',
        `panneau « ${nomPanneau} » : tâche à ${valeurs.length} branches rendue en « formulaire replié » (<details>) coexistant, dans l'écran « ${nomEcran(ecran)} », avec la liste qu'elle alimente. Le repli masque la contradiction au lieu de la résoudre : le motif attendu pour une tâche à branches est le panneau adressable (route dédiée), le formulaire replié restant réservé à la création simple, courte et sans branche`,
        `[data-panneau-tache=${nomPanneau}]`);
    }
  }

  // ── PA6 · panneau adressable inatteignable ──────────────────────────────
  const route = at(panneau, 'data-route').trim();
  if (route) {
    const cible = route.startsWith('#') ? route : '#' + route;
    const declencheurs = tous.filter(el => at(el, 'href').trim() === cible
      || at(el, 'data-route-cible').trim() === cible);
    if (declencheurs.length === 0) {
      add('bloquant', 'PA6',
        `panneau adressable « ${nomPanneau} » déclaré sur la route « ${route} » mais aucun déclencheur ne pointe cette route (aucun href ni data-route-cible correspondant) : un panneau inatteignable est une affordance qui n'existe pas — loi transverse n° 1`,
        `[data-route=${route}]`);
    }
  }
}

// ── Verdict ────────────────────────────────────────────────────────────────
const RANG = { bloquant: 0, majeur: 1, avertissement: 2, info: 3 };
F.sort((x, y) => RANG[x.sev] - RANG[y.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(durs.length ? `FAIL — ${durs.length} écart(s) dur(s)\n` : 'PASS — PA1–PA6 sans écart\n');
if (durs.length) sortir('FAIL', 1);
sortir('PASS', 0);
