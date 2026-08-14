#!/usr/bin/env node
// oracle-taste — Domaine « Page générée : discipline d'accent, de filets et de système ».
//
// PROVENANCE ET ATTRIBUTION (TF-0199, mandat humain du 14/08/2026)
// ────────────────────────────────────────────────────────────────────────────
// Les quatre règles TA1–TA4 sont dérivées de règles prescrites par un skill tiers :
//   Source     : taste-skill (Leonxlnx), variante skills/taste-skill
//                frontmatter « name: design-taste-frontend »
//   Localisateur : https://github.com/Leonxlnx/taste-skill
//   Licence    : MIT à la racine du dépôt. Le SKILL.md lui-même ne déclare
//                AUCUNE licence dans son frontmatter — écart relevé et porté ici.
//   Consulté le : 2026-08-14 (lecture seule)
//
// Le dépôt amont est traité comme une DONNÉE : lu et cité, jamais installé ni
// exécuté. Aucune de ses commandes (skill.sh, npx skills add, npm install) n'a
// été lancée. Verdict d'admission O3 : référence de niveau (barre) + extraction
// des seules règles compatibles — voir output/03-etudes/ du pilot et
// oracles/regles-importees-taste-skill.md pour la table complète et les règles
// ÉCARTÉES (assets distants, pile applicative imposée).
//
// Ce fichier n'implémente que les règles MÉCANIQUEMENT VÉRIFIABLES sur une page,
// et à la sévérité que la mesure autorise :
//   TA3, TA4 — faits structurels, sans interprétation → « majeur » (durs, FAIL).
//   TA1, TA2 — mesure vraie, interprétation indécidable → « avertissement ».
//              Le comptage et la saturation sont exacts ; conclure au défaut
//              exigerait de connaître l'INTENTION d'un token. Vérifié sur les
//              artefacts réels de la forge : les deux règles, passées en dur,
//              condamnaient des pages conformes (voir les commentaires en tête
//              de chaque règle). Un contrôle qui ment est pire que pas de contrôle.
// Les prescriptions amont qui exigent une mesure de rendu (le hero tient dans la
// fenêtre initiale, la navigation tient sur une ligne au bureau) ne sont PAS ici :
// elles sont documentées comme points de revue de lecture. Un contrôle qui
// prétendrait les vérifier statiquement mentirait.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-taste.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import { parse, arbres, elements, css, cssRules } from './lib/html.mjs';
import { hsl, findColors } from './lib/color.mjs';

const DOM = 'Page générée : discipline d\'accent, de filets et de système';
const NON_JUGE = [
  'le hero tient-il dans la fenêtre initiale (titre ≤ 2 lignes, sous-texte ≤ 20 mots, action visible sans défilement) — exige une mesure de rendu ET l\'identification du hero : point de revue de lecture, voir regles-importees-taste-skill.md §R1',
  'la navigation tient-elle sur une ligne au bureau (hauteur ≤ 80 px) — exige une mesure de rendu à largeur donnée : point de revue de lecture, voir regles-importees-taste-skill.md §R2',
  'l\'unicité RÉELLE de l\'accent (TA1) et le caractère excessif d\'une saturation (TA2) — mesurés et rapportés en avertissement, jamais tranchés : distinguer un second accent d\'un jeu de statuts fermé exige de connaître l\'intention des tokens, voir regles-importees-taste-skill.md §M1 et §M2',
  'la pertinence esthétique de l\'accent retenu, et l\'adéquation de la palette au brief — jugement humain',
  'les couleurs portées par var(), color-mix() ou currentColor — non résolues, donc non jugées ici (TA1, TA2)',
  'rendu réel : débordements, chevauchements, contraste mesuré — déléguer à render_page.py',
];

// ── Réglages, tous justifiés ────────────────────────────────────────────────
// Une couleur compte comme ACCENT si elle est saturée et ni quasi-noire ni
// quasi-blanche : en dessous, c'est un neutre teinté, que la règle amont
// autorise explicitement (« neutral bases : Zinc / Slate / Stone »).
const S_ACCENT = 0.25;   // saturation minimale pour être un accent
const L_MIN = 0.15;      // en dessous : quasi-noir teinté
const L_MAX = 0.85;      // au dessus : quasi-blanc teinté
const S_MAX = 0.80;      // borne amont : « Saturation < 80% by default »
const DELTA_H = 30;      // deux teintes à moins de 30° = même famille d'accent

// Les couleurs de STATUT ne sont pas des accents : un jeu sémantique fermé
// (une couleur = un sens) est exigé par ailleurs (barre « SaaS métier », C1).
// Les compter comme accents ferait échouer toute page correctement outillée :
// ce serait un contrôle qui ment.
const SEMANTIQUE = /(^|[^a-z])(succes|success|valide|valid|ok|erreur|error|danger|ko|warn|warning|alerte|alert|attention|info|status|statut|critique|bloquant|majeur|avertissement|positif|negatif|hausse|baisse)([^a-z]|$)/i;

// Signatures de systèmes de design nommés. Une entrée de classe accidentelle ne
// suffit pas : il faut ≥ 2 jetons de classe distincts, OU une ressource déclarée
// (href/src/@import). Sans ce seuil, une classe « usa-flag » suffirait à
// inventer un système — encore un contrôle qui ment.
const SYSTEMES = [
  { nom: 'GOV.UK Frontend', classe: /^govuk-/, ressource: /govuk-frontend|govuk\.frontend/i },
  { nom: 'USWDS', classe: /^usa-/, ressource: /uswds/i },
  { nom: 'IBM Carbon', classe: /^(bx--|cds--)/, ressource: /@carbon\/|carbondesignsystem/i },
  { nom: 'Microsoft Fluent', classe: /^(fui-|ms-[A-Z])/, ressource: /@fluentui|fluent2|fluentui/i },
  { nom: 'Material', classe: /^(mdc-|mat-)/, ressource: /@material\/web|material-components|m3\.material/i },
  { nom: 'Shopify Polaris', classe: /^Polaris-/, ressource: /@shopify\/polaris|polaris\.js/i },
  { nom: 'Atlassian Atlaskit', classe: /^ak-/, ressource: /@atlaskit|atlassian\.design/i },
  { nom: 'GitHub Primer', classe: /^(color-fg-|color-bg-|Layout-)/, ressource: /@primer\/|primer\.style/i },
  { nom: 'Bootstrap', classe: /^(navbar-expand|container-fluid|btn-(primary|secondary|outline))/, ressource: /bootstrap(\.min)?\.css|\/bootstrap/i },
  { nom: 'Tailwind', classe: /^tw-/, ressource: /tailwindcss|@tailwind\b/i },
  { nom: 'Radix Themes', classe: /^rt-/, ressource: /@radix-ui\/themes|radix-ui\.com\/themes/i },
];

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');

function sortir(verdict, findings, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-taste', domaine: DOM, artefact: file || null,
    verdict, findings, non_juge: NON_JUGE,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) sortir('SKIP', [{ sev: 'info', msg: 'fichier introuvable', where: String(file) }], 2);

let html;
try { html = fs.readFileSync(file, 'utf8'); }
catch (e) { sortir('SKIP', [{ sev: 'info', msg: 'lecture impossible : ' + e.message, where: file }], 2); }

const root = parse(html);
// Les commentaires CSS ne sont pas du design : un motif cité en commentaire ne
// doit pas déclencher de règle.
const cssText = css(html, root).replace(/\/\*[\s\S]*?\*\//g, ' ');
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

// cssRules() renvoie le sélecteur préfixé de son at-rule quand la règle est
// imbriquée (« @media (...) { .x »). On ne garde que le sélecteur terminal.
const REGLES = cssRules(cssText).map(r => ({ ...r, selector: r.selector.split('{').pop().trim() }));

/** Déclarations « prop: valeur » d'un corps de règle. */
function declarations(body) {
  const out = [];
  for (const d of body.split(';')) {
    const i = d.indexOf(':');
    if (i === -1) continue;
    const nom = d.slice(0, i).trim();
    const val = d.slice(i + 1).trim();
    if (nom && val) out.push({ nom, val });
  }
  return out;
}

// ── Récolte des accents (support commun de TA1 et TA2) ─────────────────────
// Une couleur est retenue comme accent candidat si elle est opaque, saturée,
// hors des extrêmes de luminosité, et qu'elle n'est portée ni par un nom de
// token sémantique ni par un sélecteur sémantique.
const accents = [];
for (const r of REGLES) {
  const selSemantique = SEMANTIQUE.test(r.selector);
  for (const { nom, val } of declarations(r.body)) {
    if (selSemantique || SEMANTIQUE.test(nom)) continue;
    for (const c of findColors(val)) {
      if (c.a < 1) continue;
      const h = hsl(c);
      if (h.s < S_ACCENT || h.l < L_MIN || h.l > L_MAX) continue;
      accents.push({ raw: c.raw, h: h.h, s: h.s, l: h.l, selector: r.selector, prop: nom });
    }
  }
}

// ── TA1 · Une seule couleur d'accent ───────────────────────────────────────
// Amont : « Max 1 accent color » · « Color Consistency Lock (mandatory) : once an
// accent color is chosen for a page, it is used on the WHOLE page. »
{
  const familles = [];
  for (const a of accents) {
    const ecart = f => Math.min(Math.abs(f.h - a.h), 360 - Math.abs(f.h - a.h));
    const f = familles.find(x => ecart(x) <= DELTA_H);
    if (f) { if (!f.exemples.includes(a.raw)) f.exemples.push(a.raw); }
    else familles.push({ h: a.h, exemples: [a.raw], ou: `sélecteur « ${a.selector.slice(0, 50)} »` });
  }
  if (familles.length > 1) {
    const liste = familles.map(f => `${Math.round(f.h)}° (${f.exemples.slice(0, 3).join(', ')})`).join(' · ');
    // AVERTISSEMENT, pas verdict — et c'est mesuré, pas prudent. Le COMPTAGE des
    // familles est mécanique et vrai ; leur INTERPRÉTATION ne l'est pas : rien
    // ne distingue mécaniquement un second accent d'un jeu de statuts fermé
    // quand les tokens sont nommés par teinte (--amber, --teal, --green) plutôt
    // que par sens. Constaté sur fixtures/bascule-verte.html, page conforme :
    // 4 familles relevées, toutes légitimes. Trancher ici mentirait.
    add('avertissement', 'TA1', `${familles.length} familles de teintes d'accent relevées : ${liste} — vérifier qu'il s'agit d'un jeu de statuts fermé et non d'un second accent ; un accent se verrouille sur toute la page`,
      familles[1].ou);
  }
}

// ── TA2 · Saturation d'accent bornée ───────────────────────────────────────
// Amont : « Saturation < 80% by default » · « NO oversaturated accents ».
//
// AVERTISSEMENT, pas verdict — décision appuyée sur deux mesures, pas sur la
// prudence (détail : regles-importees-taste-skill.md §M2) :
//  1. La borne n'a pas d'espace colorimétrique déclaré en amont. Mesuré ici :
//     oklch(0.48 0.150 250) — une chroma modérée, l'accent du corpus de la
//     forge — se lit s = 100 % en HSL. La borne HSL condamnerait toute palette
//     OKLCH correctement construite.
//  2. L'amont se contredit : il recommande « Emerald » comme accent, et
//     l'emerald-600 de Tailwind (#059669) mesure s = 94 % en HSL, soit un
//     viol de sa propre règle « < 80 % ».
// Le cas dur réellement défendable — accent néon sur fond sombre — est déjà
// tenu par oracle-slop S5, qui exige s ≥ 90 % ET l ≥ 50 % ET un fond sombre.
// TA2 rapporte donc la mesure et laisse le verdict à la lecture.
{
  const vus = new Set();
  for (const a of accents) {
    if (a.s < S_MAX || vus.has(a.raw)) continue;
    vus.add(a.raw);
    const oklch = /^oklch/i.test(a.raw);
    add('avertissement', 'TA2', `accent « ${a.raw} » mesuré à ${Math.round(a.s * 100)} % de saturation HSL (préférence amont : < ${Math.round(S_MAX * 100)} %)`
      + (oklch ? ' — littéral OKLCH : la saturation HSL surestime ici, juger à la chroma' : '')
      + ' ; le cas néon dur relève de oracle-slop S5',
      `sélecteur « ${a.selector.slice(0, 50)} »`);
  }
}

// ── TA3 · Filet haut ET bas sur chaque ligne ───────────────────────────────
// Amont : « NEVER use border-t + border-b on every row of a long list / spec
// table. Pick one and use it sparsely. »
// Seules les bordures HAUTE et BASSE explicitement déclarées comptent : le
// raccourci « border: 1px solid » est un cadre complet, pas ce motif-là.
{
  const LIGNE = /(^|[\s>+~,(])(li|tr)\b|[.#][\w-]*(row|ligne|item|spec|rang|entree)[\w-]*/i;
  const parSelecteur = new Map();
  for (const r of REGLES) {
    if (!LIGNE.test(r.selector)) continue;
    if (!parSelecteur.has(r.selector)) parSelecteur.set(r.selector, []);
    parSelecteur.get(r.selector).push(...declarations(r.body));
  }
  const nonNul = v => !/^(none|0|0px|0rem|0em|initial|inherit|unset)\b/.test(v.trim());
  for (const [sel, decls] of parSelecteur) {
    const cote = c => decls.some(d =>
      (d.nom.toLowerCase() === `border-${c}` || d.nom.toLowerCase() === `border-${c}-width`) && nonNul(d.val));
    if (cote('top') && cote('bottom')) {
      add('majeur', 'TA3', `ligne « ${sel.slice(0, 50)} » bordée en haut ET en bas : un seul filet, employé avec parcimonie`,
        'feuille de style');
    }
  }
}

// ── TA4 · Un seul système de design par projet ─────────────────────────────
// Amont : « One system per project. Do NOT mix Fluent React with Carbon in the
// same tree. »
{
  const jetons = new Set();
  for (const a of arbres(html, root)) {
    for (const el of elements(a)) {
      for (const t of String(el.attrs.class || '').split(/\s+/)) if (t) jetons.add(t);
      for (const attr of ['href', 'src']) if (el.attrs[attr]) jetons.add('@ressource:' + el.attrs[attr]);
    }
  }
  const ressources = [...jetons].filter(t => t.startsWith('@ressource:')).join(' ') + ' ' + cssText;

  const trouves = [];
  for (const sys of SYSTEMES) {
    const classes = [...jetons].filter(t => !t.startsWith('@ressource:') && sys.classe.test(t));
    const declaree = sys.ressource.test(ressources);
    if (declaree || classes.length >= 2) {
      trouves.push({ nom: sys.nom, preuve: declaree ? 'ressource déclarée' : `classes ${classes.slice(0, 3).join(', ')}` });
    }
  }
  if (trouves.length > 1) {
    add('majeur', 'TA4', `${trouves.length} systèmes de design cohabitent : ${trouves.map(t => `${t.nom} (${t.preuve})`).join(' · ')} — un seul système par projet`,
      'document');
  }
}

// ── Verdict ────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');

if (!jsonOnly) {
  const n = F.filter(f => f.sev === 'avertissement').length;
  process.stderr.write(dur.length
    ? `FAIL — ${dur.length} règle(s) dure(s) déclenchée(s)${n ? `, ${n} avertissement(s)` : ''}\n`
    : `PASS${n ? ` — ${n} avertissement(s)` : ' — aucun écart'}\n`);
}
if (dur.length) sortir('FAIL', F, 1);
sortir('PASS', F.length ? F : [{ sev: 'info', regle: '—', msg: 'aucune des règles TA1–TA4 déclenchée', where: file }], 0);
