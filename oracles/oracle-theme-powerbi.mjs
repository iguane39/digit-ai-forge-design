#!/usr/bin/env node
// oracle-theme-powerbi — Domaine « Thème Power BI dérivé de la marque : forme, synchronisation
// avec la source DTCG, absence de généricité ». TF-0863, lot L6 de l'étude d'opportunité du
// pilot du 07/09/2026 (loi transverse n° 6 : un rendu générique est un défaut, pas un goût).
//
// Règles TP1-TP3 :
//   TP1  forme : `name`, `dataColors` (≥ 4 couleurs hexadécimales distinctes), `background`,
//        `foreground`, `textClasses.title.fontFace` présents — un thème sans série de couleurs
//        ni police ne personnalise rien ;
//   TP2  le thème livré est EXACTEMENT la régénération de sa source DTCG (même fonction que
//        scripts/generer-theme-powerbi.mjs — doctrine D3 de oracle-dtcg : on ne compare pas
//        « à l'œil », on régénère et on diffe) ;
//   TP3  aucune généricité : aucune couleur de la palette par défaut de Power BI dans
//        `dataColors`, et la police de titre n'est pas la police par défaut du produit — un
//        thème « personnalisé » qui reprend les valeurs d'usine est le défaut que la loi n° 6
//        nomme.
// non_juge : adéquation des valeurs à la charte (arbitrage commanditaire) ; rendu réel dans
// Power BI Desktop (application graphique, hors de portée d'un agent — le thème s'applique au
// projet PBIP et se vérifie à la revue d'implémentation) ; contraste des couleurs de série entre
// elles (oracle-tokens et le socle jugent les pages, pas les visuels de rapport).
// Usage : node oracle-theme-powerbi.mjs <source.tokens.json> <theme.json> [--json-only]
import fs from 'node:fs';
import { genererTheme, serialiserTheme } from '../scripts/generer-theme-powerbi.mjs';

const DOM = 'Thème Power BI dérivé de la marque : forme, synchronisation DTCG, absence de généricité (TP1-TP3)';
const NJ = [
  "adéquation des valeurs à la charte (palette, voix) — arbitrage commanditaire, hors oracle",
  "rendu réel du thème dans Power BI Desktop — application graphique, revue d'implémentation (forge-design, mode aval)",
  "contraste des couleurs de série entre elles sur un visuel donné",
];
// Palette par défaut de Power BI (thème « Default »), telle que documentée et observée : la
// reprendre dans un thème « personnalisé » est la généricité même.
const PALETTE_DEFAUT = ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550', '#01B8AA', '#374649', '#FD625E', '#F2C80F'];
const POLICES_DEFAUT = ['segoe ui', 'din', 'segoe (bold)'];

const args = process.argv.slice(2);
const fichiers = args.filter(a => !a.startsWith('--'));
const [source, theme] = fichiers;
const jsonOnly = args.includes('--json-only');
const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });
function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({ oracle: 'oracle-theme-powerbi', domaine: DOM, artefact: theme || null,
    verdict, findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'TP1–TP3 sans écart', where: theme }],
    non_juge: NJ }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}
if (!source || !theme || !fs.existsSync(source) || !fs.existsSync(theme)) { add('info', 'TP1', 'source DTCG ou thème introuvable', `${source} / ${theme}`); sortir('SKIP', 2); }
let dtcg, t;
try { dtcg = JSON.parse(fs.readFileSync(source, 'utf8')); } catch (e) { add('bloquant', 'TP2', `source DTCG illisible : ${e.message}`, source); sortir('FAIL', 1); }
try { t = JSON.parse(fs.readFileSync(theme, 'utf8')); } catch (e) { add('bloquant', 'TP1', `thème illisible : ${e.message}`, theme); sortir('FAIL', 1); }

// ── TP1 · forme ──────────────────────────────────────────────────────────────
const HEX = /^#[0-9a-fA-F]{6}$/;
if (!t.name) add('bloquant', 'TP1', 'thème sans `name`', theme);
const dc = Array.isArray(t.dataColors) ? t.dataColors : [];
const distinctes = new Set(dc.map(x => String(x).toUpperCase()));
if (dc.length < 4 || distinctes.size < 4 || !dc.every(x => HEX.test(String(x)))) add('bloquant', 'TP1', `dataColors : ${dc.length} couleur(s), ${distinctes.size} distincte(s) — il en faut au moins quatre, hexadécimales`, theme);
if (!HEX.test(String(t.background || ''))) add('bloquant', 'TP1', 'background absent ou non hexadécimal', theme);
if (!HEX.test(String(t.foreground || ''))) add('bloquant', 'TP1', 'foreground absent ou non hexadécimal', theme);
const fontTitre = t.textClasses && t.textClasses.title && t.textClasses.title.fontFace;
if (!fontTitre) add('bloquant', 'TP1', 'textClasses.title.fontFace absent — sans police de titre le thème ne porte pas la marque', theme);

// ── TP2 · synchronisation source → dérivé ────────────────────────────────────
{
  let attendu;
  try { attendu = serialiserTheme(genererTheme(dtcg)); }
  catch (e) { add('bloquant', 'TP2', `synchronisation non vérifiable : la source ne régénère plus (${e.message})`, source); }
  if (attendu !== undefined) {
    const normalise = s => s.replace(/\r\n/g, '\n').trimEnd();
    const obtenu = fs.readFileSync(theme, 'utf8');
    if (normalise(attendu) !== normalise(obtenu)) {
      const A = normalise(attendu).split('\n'), B = normalise(obtenu).split('\n');
      let i = 0; while (i < A.length && i < B.length && A[i] === B[i]) i++;
      add('bloquant', 'TP2', `thème désynchronisé de sa source DTCG : première différence ligne ${i + 1} — attendu « ${(A[i] ?? '(fin)').slice(0, 70)} », obtenu « ${(B[i] ?? '(fin)').slice(0, 70)} ». Régénérer : node scripts/generer-theme-powerbi.mjs ${source} --sortie ${theme}`, theme);
    }
  }
}

// ── TP3 · généricité ─────────────────────────────────────────────────────────
const defauts = dc.map(x => String(x).toUpperCase()).filter(x => PALETTE_DEFAUT.includes(x));
if (defauts.length) add('bloquant', 'TP3', `dataColors reprend ${defauts.length} couleur(s) de la palette par défaut de Power BI (${defauts.join(', ')}) — un thème personnalisé ne recopie pas les valeurs d'usine (loi n° 6)`, theme);
if (fontTitre && POLICES_DEFAUT.includes(String(fontTitre).trim().toLowerCase())) add('bloquant', 'TP3', `police de titre « ${fontTitre} » = police par défaut du produit — la marque a une police, le thème la porte`, theme);

F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const dur = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
sortir(dur.length ? 'FAIL' : 'PASS', dur.length ? 1 : 0);
