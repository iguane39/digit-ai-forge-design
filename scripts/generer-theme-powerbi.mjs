#!/usr/bin/env node
// generer-theme-powerbi — dérive un THÈME POWER BI (fichier JSON de thème de rapport :
// dataColors, background/foreground, classes de texte, styles par défaut des visuels) depuis la
// même source de tokens W3C DTCG que tokens.css. TF-0863, lot L6 de l'étude d'opportunité du
// pilot du 07/09/2026 : un rapport « personnalisé » livré au thème par défaut de Power BI est
// un défaut de loi transverse n° 6 (un rendu générique est un défaut, pas un goût), visible du
// client. Le thème est une SORTIE dérivée, jamais éditée à la main — exactement le statut de
// tokens.css (cat-des-07, source → dérivé).
//
// Zéro dépendance npm. oracle-theme-powerbi.mjs importe `genererTheme` pour vérifier qu'un
// thème livré est bien la régénération de sa source (même fonction des deux côtés, même
// doctrine que oracle-dtcg D3).
//
// Correspondances (contrat de groupes du corpus : couleur.clair, typographie, rayon) :
//   dataColors      ← couleur.clair.{blue, green, amber, teal, ink, muted, faint, green-line}
//                     (huit couleurs de série, l'accent d'abord — jamais la palette par défaut)
//   background      ← couleur.clair.bg · foreground ← couleur.clair.ink · tableAccent ← blue
//   good / neutral  ← green / amber (pas de rouge au corpus : « bad » n'est pas inventé)
//   textClasses     ← typographie.head (titres, en-têtes, callout) et typographie.sans (labels)
//   visualStyles.*  ← card (fond des visuels), line (bordure, rayon ← rayon.r), muted (en-tête)
// Le format de thème est celui documenté par Microsoft (« Use report themes » — JSON de thème,
// clés dataColors / background / foreground / tableAccent / textClasses / visualStyles).
//
// Usage CLI : node generer-theme-powerbi.mjs <source.tokens.json> --sortie <theme.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { resoudreChemin, estAlias } from './generer-tokens-css.mjs';

function valeur(racine, chemin) {
  let noeud = resoudreChemin(racine, chemin);
  let garde = 0;
  while (estAlias(noeud) && garde++ < 10) noeud = resoudreChemin(racine, noeud.$value.trim().slice(1, -1));
  if (!noeud || typeof noeud !== 'object' || !('$value' in noeud)) throw new Error(`token « ${chemin} » introuvable dans la source DTCG`);
  return noeud.$value;
}
function couleur(racine, nom) {
  const v = String(valeur(racine, `couleur.clair.${nom}`)).trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) throw new Error(`couleur.clair.${nom} n'est pas un hexadécimal à six chiffres (${v})`);
  return v.toUpperCase();
}
function police(racine, nom) {
  const v = valeur(racine, `typographie.${nom}`);
  const premiere = Array.isArray(v) ? v[0] : String(v).split(',')[0];
  return String(premiere).replace(/["']/g, '').trim();
}
function rayonPx(racine) {
  const v = String(valeur(racine, 'rayon.r')).trim();
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) throw new Error(`rayon.r n'est pas une dimension lisible (${v})`);
  return Math.round(n);
}

/** Transforme un document DTCG (déjà parsé) en objet de thème Power BI. Déterministe. */
export function genererTheme(dtcg) {
  const c = nom => couleur(dtcg, nom);
  const head = police(dtcg, 'head');
  const sans = police(dtcg, 'sans');
  const serie = ['blue', 'green', 'amber', 'teal', 'ink', 'muted', 'faint', 'green-line'].map(c);
  const classe = (fontFace, fontSize, color) => ({ fontFace, fontSize, color });
  return {
    name: 'Digit-AI — thème dérivé de la source DTCG (généré, ne pas éditer)',
    dataColors: serie,
    background: c('bg'),
    foreground: c('ink'),
    tableAccent: c('blue'),
    good: c('green'),
    neutral: c('amber'),
    textClasses: {
      callout: classe(head, 28, c('ink')),
      title: classe(head, 14, c('ink')),
      header: classe(head, 12, c('ink')),
      label: classe(sans, 10, c('ink')),
    },
    visualStyles: {
      '*': {
        '*': {
          background: [{ show: true, color: { solid: { color: c('card') } }, transparency: 0 }],
          border: [{ show: true, color: { solid: { color: c('line') } }, radius: rayonPx(dtcg) }],
          visualHeader: [{ foreground: { solid: { color: c('muted') } }, background: { solid: { color: c('card') } } }],
          title: [{ fontFamily: head, fontSize: 12, fontColor: { solid: { color: c('ink') } } }],
        },
      },
    },
  };
}

/** Sérialisation canonique du thème — la même des deux côtés (générateur et oracle). */
export function serialiserTheme(theme) {
  return JSON.stringify(theme, null, 2) + '\n';
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('generer-theme-powerbi.mjs')) {
  const args = process.argv.slice(2);
  const source = args.find(a => !a.startsWith('--'));
  const i = args.indexOf('--sortie');
  const sortie = i !== -1 ? args[i + 1] : null;
  if (!source || !sortie) { console.error('usage : node generer-theme-powerbi.mjs <source.tokens.json> --sortie <theme.json>'); process.exit(2); }
  const dtcg = JSON.parse(readFileSync(source, 'utf8'));
  writeFileSync(sortie, serialiserTheme(genererTheme(dtcg)));
  console.log(`[ok] thème Power BI dérivé → ${sortie}`);
}
