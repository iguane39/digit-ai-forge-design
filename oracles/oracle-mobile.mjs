#!/usr/bin/env node
// oracle-mobile — Domaine « Cible mobile : contrat d'usage tactile » (déterministe).
//
// Règles M1–M6, décidables sur le fichier :
//   M1  viewport déclaré, zoom non bridé
//   M2  cibles tactiles déclarées ≥ 44 px sur les éléments interactifs
//   M3  safe-area-inset utilisé dès qu'une barre fixe borde l'écran
//   M4  reflow des tables sous 768 px dès qu'une table existe
//   M5  orientation paysage traitée
//   M6  prefers-reduced-motion respecté dès qu'il y a du mouvement
//
// Ce qui exige un rendu réel (taille effective après cascade, gestes, débordements
// au breakpoint) est déclaré non jugé et délégué à render_page.py.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage : node oracle-mobile.mjs <fichier.html> [--json-only]

import fs from 'node:fs';
import { parse as parseHtml, arbres, elements, css, cssRulesDeep, lineOf } from './lib/html.mjs';

const DOM = 'Cible mobile : contrat d\'usage tactile';
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const jsonOnly = args.includes('--json-only');

const NJ = [
  'taille tactile effective après cascade et héritage — déléguer à render_page.py au breakpoint 390 px',
  'gestes réels (swipe, pull-to-refresh, retour geste) — parcours à exécuter',
  'débordements et chevauchements aux breakpoints — render_page.py V1/V4',
  'pertinence des patterns natifs choisis (bottom sheet vs modale) — jugement produit',
];
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-mobile', domaine: DOM, artefact: file || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'M1–M6 sans écart', where: file }],
    non_juge: NJ,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!file || !fs.existsSync(file)) { NJ.push('fichier absent'); sortir('SKIP', 2); }

const html = fs.readFileSync(file, 'utf8');
const root = parseHtml(html);
const cssText = css(html, root).replace(/\/\*[\s\S]*?\*\//g, ' ');
const regles = cssRulesDeep(cssText);

// ── M1 · viewport ──────────────────────────────────────────────────────────
{
  const meta = elements(root, 'meta').find(m => (m.attrs.name || '').toLowerCase() === 'viewport');
  if (!meta) {
    add('bloquant', 'M1', 'aucune balise <meta name="viewport"> : la page sera rendue en largeur desktop puis dézoomée', 'head');
  } else {
    const c = (meta.attrs.content || '').toLowerCase();
    if (!/width\s*=\s*device-width/.test(c)) add('bloquant', 'M1', `viewport sans width=device-width : « ${c} »`, 'ligne ' + lineOf(html, meta.start));
    if (/user-scalable\s*=\s*(no|0)/.test(c)) add('bloquant', 'M1', 'user-scalable=no : zoom bridé, exclusion des usages malvoyants', 'ligne ' + lineOf(html, meta.start));
    if (/maximum-scale\s*=\s*1(\.0)?\b/.test(c)) add('majeur', 'M1', 'maximum-scale=1 : zoom bridé de fait', 'ligne ' + lineOf(html, meta.start));
  }
}

// ── M2 · cibles tactiles déclarées ─────────────────────────────────────────
{
  const INTERACTIF = /(^|[\s,>+~])(a|button|input|select|summary)\b|\[role\s*=\s*["']?button|\.(btn|bouton|lien|chip|tab|onglet|icone|icon-btn)\b/i;
  for (const r of regles) {
    if (!INTERACTIF.test(r.selector)) continue;
    for (const m of r.body.matchAll(/(?:^|[;{\s])(min-height|height|min-width|width)\s*:\s*([\d.]+)px/g)) {
      const v = parseFloat(m[2]);
      if (v > 0 && v < 44) {
        add('majeur', 'M2', `${m[1]}: ${m[2]}px < 44px sur un élément interactif`,
          `sélecteur « ${r.selector.slice(0, 60)} »`);
      }
    }
  }
}

// ── M3 · safe areas ────────────────────────────────────────────────────────
{
  const barreFixe = regles.some(r =>
    // Garde de chiffre (TF-0438, 21/08) : `: 0` nu matchait AUSSI « bottom: 0.5rem » — une
    // barre qui ne colle pas au bord était comptée comme collée, et M3 réclamait une safe-area
    // sans motif. `\b` n'aurait pas suffi (frontière entre « 0 » et « . ») : il faut la garde.
    /position\s*:\s*(fixed|sticky)/.test(r.body) && /(^|[;{\s])(bottom|top)\s*:\s*0(?![0-9.])/.test(r.body));
  const safe = /env\(\s*safe-area-inset-/.test(cssText);
  const viewportFit = elements(root, 'meta').some(m =>
    (m.attrs.name || '').toLowerCase() === 'viewport' && /viewport-fit\s*=\s*cover/i.test(m.attrs.content || ''));
  if (barreFixe && !safe) {
    add('majeur', 'M3', 'barre fixe collée à un bord sans env(safe-area-inset-*) : passage sous l\'encoche ou l\'indicateur de home', 'feuille de style');
  }
  if (safe && !viewportFit) {
    add('majeur', 'M3', 'env(safe-area-inset-*) utilisé sans viewport-fit=cover : les insets vaudront 0', 'meta viewport');
  }
}

// ── M4 · reflow des tables ─────────────────────────────────────────────────
{
  // Les tables d'une maquette sont rendues à l'exécution : les chercher aussi
  // dans les gabarits JS, sinon M4 se tait sur une table qu'il croit absente.
  const ARBRES = arbres(html, root);
  const tables = ARBRES.flatMap(r => elements(r, 'table'));
  if (tables.length) {
    const reflow = regles.some(r => {
      const sousMobile = r.atRules.some(a => {
        const m = /max-width\s*:\s*(\d+)px/.exec(a);
        return m && parseInt(m[1], 10) <= 768;
      });
      // Un display:none sur une cellule n'est pas un reflow : c'est une amputation.
      // Seul un passage en flux bloc/grille/flex vaut reflow en cartes.
      return sousMobile && /(^|[\s,>])(table|thead|tbody|tr|td|th)\b/i.test(r.selector)
        && /display\s*:\s*(block|grid|flex|inline-block)/i.test(r.body);
    });
    if (!reflow) {
      add('bloquant', 'M4', `${tables.length} table(s) sans reflow en cartes sous 768 px : défilement horizontal forcé`,
        'feuille de style');
    }
    const cache = regles.some(r => r.atRules.some(a => /max-width\s*:\s*(\d|[1-7]\d\d)px/.test(a))
      && /(^|[\s,>])(table|td|th)\b/i.test(r.selector) && /display\s*:\s*none/.test(r.body));
    if (cache) add('majeur', 'M4', 'colonnes masquées en mobile : adapter l\'interface, ne pas l\'amputer', 'feuille de style');
  }
}

// ── M5 · orientation paysage ───────────────────────────────────────────────
{
  const paysage = regles.some(r => r.atRules.some(a => /orientation\s*:\s*landscape/i.test(a)))
    || /orientation\s*:\s*landscape/i.test(cssText);
  const hauteurFixe = regles.some(r => /(^|[;{\s])height\s*:\s*100vh\b/.test(r.body));
  if (!paysage && hauteurFixe) {
    add('majeur', 'M5', 'height: 100vh sans traitement du paysage : contenu coupé en orientation paysage sur mobile', 'feuille de style');
  } else if (!paysage) {
    add('avertissement', 'M5', 'aucune règle @media (orientation: landscape) : le rendu paysage n\'est pas traité explicitement', 'feuille de style');
  }
}

// ── M6 · mouvement réduit ──────────────────────────────────────────────────
{
  const mouvement = /(^|[;{\s])(transition|animation)\s*:/.test(cssText) || /@keyframes/.test(cssText);
  const respecte = regles.some(r => r.atRules.some(a => /prefers-reduced-motion/i.test(a)))
    || /prefers-reduced-motion/i.test(cssText);
  if (mouvement && !respecte) {
    add('bloquant', 'M6', 'transitions ou animations sans @media (prefers-reduced-motion: reduce)', 'feuille de style');
  }
}

// ── Verdict ────────────────────────────────────────────────────────────────
F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(dur.length ? `FAIL — ${dur.length} écart(s) dur(s)\n` : 'PASS — M1–M6 sans écart dur\n');
if (dur.length) sortir('FAIL', 1);
sortir('PASS', 0);
