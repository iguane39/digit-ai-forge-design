#!/usr/bin/env node
// oracle-clip — Domaine « Clip de présentation : format, preuves et marque » (TF-2405, 10/11/2026).
// Juge le dossier d'un clip du skill clip-de-presentation : clip.html, STORYBOARD.md, planches, MP4.
// Le domaine que rien ne couvrait : oracle-motion juge les transitions d'une interface, aucun oracle ne jugeait
// une vidéo. La série de 28 clips qui a fondé le skill n'avait pour contrôles que ffprobe lancé à la main, la
// lecture des planches et run-oracles-design sur la page, qui ne lit ni le canvas ni le MP4.
//
//   CL1 le MP4, lu par ffprobe : durée = window.DUREE + l'introduction (6 s par défaut) à 0,25 s près, 1920 × 1080,
//       30 images par seconde, H.264 en yuv420p, une piste AAC. ffprobe introuvable : SKIP motivé de la règle, et le
//       verdict ne peut pas être PASS. Aucun MP4 (ni dans le dossier, ni par --mp4) : règle non jouée, dite au non_juge.
//   CL2 les pièces de contrôle : STORYBOARD.md présent (majeur) et porteur d'une table de preuves, à colonne
//       « statut » (avertissement) ; des planches `planche*.jpg|png` lisibles : aucune (majeur), moins de 3 (avertissement).
//   CL3 les budgets de caractères de skills/clip-de-presentation/references/textes-recit-client.md, lus dans la source :
//       titre de l'introduction, phrase, étapes et leur nombre, légendes, lignes du titre de fin et leur nombre.
//   CL4 les étiquettes à chasse fixe font 24 px au moins : taille écrite d'un appel M.puce, ou défaut de M.puce dans la
//       bibliothèque que la page charge ; F.mono(n) et M.F.mono(n) ; police littérale à chasse fixe. Un texte d'une autre
//       police sous 24 px est un avertissement.
//   CL5 un nombre écrit dans un texte du script, que la table de preuves du storyboard n'atteste pas (ligne datée, statut
//       « attestée » ou « partielle »), est un chiffre de décor : la source doit afficher l'étiquette « exemple ».
//   CL6 la marque est un paramètre : aucun littéral d'image de logo, aucune adresse, aucun nom de la marque déclarée dans le
//       script du clip ni dans sa bibliothèque ; la déclaration <script type="application/json" id="marque"> se lit, et le
//       logo qu'elle déclare existe. Sans déclaration : avertissement.
//   CL7 le rendu est déterministe : ni Math.random, ni Date.now, ni performance.now, ni new Date dans le script du clip.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[],mesures} · exit 0/1/2.
// Usage : node oracle-clip.mjs <dossier du clip | clip.html> [--mp4 <fichier.mp4>] [--ffprobe <chemin>] [--json-only]

import fs from 'node:fs';
import path from 'node:path';
import { plageDeRegles } from './lib/regles-jouees.mjs';
import { trouverFfprobe, sonder } from './lib/ffprobe.mjs';
// TF-2287 — les règles que l'oracle JOUE, déclarées UNE fois ; la plage citée à la sortie en dérive, jamais écrite en dur.
const REGLES_JOUEES = ['CL1', 'CL2', 'CL3', 'CL4', 'CL5', 'CL6', 'CL7'];
const PLAGE_JOUEE = plageDeRegles(REGLES_JOUEES);

const DOM = 'Clip de présentation : format, preuves et marque';
// Les budgets, en un seul endroit ; ce sont ceux de references/textes-recit-client.md du skill.
const BUDGETS = { titre: 30, phrase: 90, etape: 16, etapes: 6, legende: 61, ligneFin: 40, lignesFin: 2 };
const PLANCHER_PX = 24;
const FORMAT = { largeur: 1920, hauteur: 1080, ips: 30, pixels: 'yuv420p', video: 'h264', audio: 'aac', intro: 6, tolerance: 0.25 };

const NON_JUGE = [
  'la qualité de l\'image : mouvement, rythme, lisibilité, chevauchements, contraste et métaphore de chaque plan se lisent sur les planches, par un humain ou par critique-le-design',
  'CL4 lit les tailles ÉCRITES dans la source : la taille rendue après un zoom de caméra ou un ctx.scale (une étiquette de 24 px sous un zoom de 0,4) ne se voit que sur la planche ; une taille calculée n\'est pas résolue',
  'CL5 ne lit que les nombres écrits dans les littéraux du script : un nombre calculé (compteur, concaténation) ou un littéral fait de chiffres seuls (« 189 », « 0 ») n\'est pas lu, ni une date, ni un numéro d\'ordre après étape, plan, partie, phase, niveau, chapitre, acte, scène, lot ou version ; la co-présence à l\'écran du chiffre et de l\'étiquette « exemple » n\'est pas jugée, ni la vérité d\'une preuve attestée',
  'CL3 lit les formats du skill et de la série d\'origine : M.introduire({ intro: {…} }) ou Object.assign, M.legende(ctx, t, \'…\'), tableaux LEG / LEGENDES, M.carteFin(…, titre | { titre }), constantes TITRE_FIN ; un texte construit à l\'exécution n\'est pas lu',
  'CL6 reconnaît un logo à son littéral d\'image qui contient « logo » ou au fichier déclaré, et le nom de la marque à l\'égalité avec le nom déclaré : une image de décor n\'est pas jugée',
  'CL1 juge le format du fichier, pas son contenu : images, synchronisation avec les impacts de la musique et niveau sonore ne sont pas mesurés',
  'CL2 dit que les planches existent et se lisent ; leur fraîcheur par rapport au clip et leur lecture par un spectateur ne sont pas jugées',
  'CL7 cherche l\'horloge et le hasard dans le script du clip ; l\'indépendance de rendre(t) à l\'ordre des appels n\'est pas exécutée',
];

const args = process.argv.slice(2);
const AVEC_VALEUR = ['--mp4', '--ffprobe'];
const valeur = (nom) => { const i = args.indexOf(nom); return i >= 0 ? args[i + 1] : null; };
const cible = args.find((a, i) => !a.startsWith('--') && !AVEC_VALEUR.includes(args[i - 1]));
const jsonOnly = args.includes('--json-only');
const mesures = {};

function sortir(verdict, findings, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-clip', domaine: DOM, artefact: cible || null,
    verdict, findings, non_juge: NON_JUGE, mesures,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

// ── Porte : le dossier et sa page ─────────────────────────────────────────
if (!cible || !fs.existsSync(cible)) sortir('SKIP', [{ sev: 'info', msg: 'dossier de clip introuvable', where: String(cible) }], 2);
const estFichier = fs.statSync(cible).isFile();
const DOSSIER = estFichier ? path.dirname(path.resolve(cible)) : path.resolve(cible);
const PAGE = estFichier ? path.resolve(cible) : path.join(DOSSIER, 'clip.html');
if (!/\.html?$/i.test(PAGE) || !fs.existsSync(PAGE)) sortir('SKIP', [{ sev: 'info', msg: 'clip.html absent du dossier : rien à juger', where: PAGE }], 2);
const NOM_PAGE = path.basename(PAGE);
const html = fs.readFileSync(PAGE, 'utf8').replace(/\r\n/g, '\n');

const F = [];
const add = (sev, regle, msg, where) => F.push({ sev, regle, msg, where });

// ── Lecture du JavaScript : un tokeniseur minimal (chaînes, gabarits, commentaires, expressions régulières) ──
function echappement(code, i) {
  const c = code[i + 1];
  const simples = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
  if (c in simples) return [simples[c], 2];
  if (c === 'x') return [String.fromCharCode(parseInt(code.slice(i + 2, i + 4), 16)), 4];
  if (c === 'u' && code[i + 2] === '{') { const f = code.indexOf('}', i); return [String.fromCodePoint(parseInt(code.slice(i + 3, f), 16)), f - i + 1]; }
  if (c === 'u') return [String.fromCharCode(parseInt(code.slice(i + 2, i + 6), 16)), 6];
  if (c === '\n') return ['', 2];
  return [c, 2];
}
function finExpression(code, i) {          // i : juste après « ${ » ; rend l'indice après l'accolade fermante
  let prof = 1;
  while (i < code.length && prof > 0) {
    const c = code[i];
    if (c === '"' || c === '\'' || c === '`') {
      const q = c; i++;
      while (i < code.length && code[i] !== q) { if (code[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '{') prof++; else if (c === '}') prof--;
    i++;
  }
  return i;
}
const MOTS_AVANT_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
function jetons(code, ligne0 = 1) {
  const T = []; let i = 0, l = ligne0; const n = code.length;
  const regexPossible = () => {
    const d = T[T.length - 1];
    if (!d) return true;
    if (d.t === 'num' || d.t === 'str' || d.t === 'tpl' || d.t === 're') return false;
    if (d.t === 'id') return MOTS_AVANT_REGEX.has(d.v);
    return d.v !== ')' && d.v !== ']';
  };
  while (i < n) {
    const c = code[i];
    if (c === '\n') { l++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v' || c === ' ' || c === '﻿') { i++; continue; }
    if (c === '/' && code[i + 1] === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && code[i + 1] === '*') {
      const f = code.indexOf('*/', i + 2), fin = f < 0 ? n : f + 2;
      l += (code.slice(i, fin).match(/\n/g) || []).length; i = fin; continue;
    }
    if (c === '"' || c === '\'') {
      const debut = l; let v = ''; i++;
      while (i < n && code[i] !== c && code[i] !== '\n') {
        if (code[i] === '\\') { const [ch, k] = echappement(code, i); if (code[i + 1] === '\n') l++; v += ch; i += k; } else { v += code[i]; i++; }
      }
      i++; T.push({ t: 'str', v, l: debut }); continue;
    }
    if (c === '`') {
      const debut = l; let v = '', dyn = false; i++;
      while (i < n && code[i] !== '`') {
        if (code[i] === '\\') { const [ch, k] = echappement(code, i); v += ch; i += k; continue; }
        if (code[i] === '$' && code[i + 1] === '{') {
          const f = finExpression(code, i + 2); l += (code.slice(i, f).match(/\n/g) || []).length;
          dyn = true; v += ' '; i = f; continue;
        }
        if (code[i] === '\n') l++;
        v += code[i]; i++;
      }
      i++; T.push({ t: dyn ? 'tpl' : 'str', v, l: debut }); continue;
    }
    if (c === '/' && regexPossible()) {
      let j = i + 1, classe = false;
      while (j < n && code[j] !== '\n') {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === '[') classe = true; else if (code[j] === ']') classe = false; else if (code[j] === '/' && !classe) break;
        j++;
      }
      j++; while (j < n && /[a-z]/i.test(code[j])) j++;
      T.push({ t: 're', v: code.slice(i, j), l }); i = j; continue;
    }
    const id = /^[A-Za-z_$À-￿][\w$À-￿]*/.exec(code.slice(i, i + 80));
    if (id) { T.push({ t: 'id', v: id[0], l }); i += id[0].length; continue; }
    const nb = /^(?:0[xX][\da-fA-F]+|\d*\.?\d+(?:[eE][+-]?\d+)?)/.exec(code.slice(i, i + 40));
    if (nb && nb[0]) { T.push({ t: 'num', v: Number(nb[0]), l }); i += nb[0].length; continue; }
    T.push({ t: 'p', v: c, l }); i++;
  }
  return T;
}
const OUVRANTES = { '(': ')', '[': ']', '{': '}' };
function apparier(T, k) {
  let prof = 0;
  for (let i = k; i < T.length; i++) {
    if (T[i].t !== 'p') continue;
    if (T[i].v in OUVRANTES) prof++;
    else if (T[i].v === ')' || T[i].v === ']' || T[i].v === '}') { prof--; if (prof === 0) return i; }
  }
  return T.length - 1;
}
function decouper(T, a, b) {                // éléments séparés par une virgule de premier niveau, dans [a, b)
  const parts = []; let prof = 0, debut = a;
  for (let i = a; i < b; i++) {
    const v = T[i].t === 'p' ? T[i].v : null;
    if (v in OUVRANTES) prof++;
    else if (v === ')' || v === ']' || v === '}') prof--;
    else if (v === ',' && prof === 0) { parts.push(T.slice(debut, i)); debut = i + 1; }
  }
  if (debut < b) parts.push(T.slice(debut, b));
  return parts.filter(p => p.length);
}
const estP = (j, v) => j && j.t === 'p' && j.v === v;
const estId = (j, v) => j && j.t === 'id' && j.v === v;
/** Les appels d'une fonction nommée par l'un des chemins (['M', 'puce'], ['F', 'mono']…). */
function appels(T, chemins) {
  const res = [];
  for (let i = 0; i < T.length; i++) {
    if (i > 0 && estP(T[i - 1], '.')) continue;
    for (const chemin of chemins) {
      let k = i, ok = true;
      for (let j = 0; j < chemin.length && ok; j++) {
        if (j > 0) { if (!estP(T[k], '.')) ok = false; k++; }
        if (ok && !estId(T[k], chemin[j])) ok = false;
        k++;
      }
      if (!ok || !estP(T[k], '(')) continue;
      const fin = apparier(T, k);
      res.push({ l: T[i].l, args: decouper(T, k + 1, fin) });
      break;
    }
  }
  return res;
}
/** Valeur littérale d'une suite de jetons : nombre, chaîne, tableau, objet ({ clé: jetons }), ou null. */
function litteral(J) {
  if (!J || !J.length) return null;
  if (J.length === 1 && (J[0].t === 'num' || J[0].t === 'str')) return J[0].v;
  if (J.length === 2 && estP(J[0], '-') && J[1].t === 'num') return -J[1].v;
  if (estP(J[0], '[') && estP(J[J.length - 1], ']')) return decouper(J, 1, J.length - 1).map(litteral);
  if (estP(J[0], '{') && estP(J[J.length - 1], '}')) return objet(J);
  if (estId(J[0], 'Object') && estP(J[1], '.') && estId(J[2], 'assign') && estP(J[3], '(')) {
    const fus = {};
    for (const a of decouper(J, 4, J.length - 1)) { const o = litteral(a); if (o && o.__objet) Object.assign(fus, o); }
    return Object.assign(fus, { __objet: true });
  }
  return null;
}
function objet(J) {
  const o = { __objet: true };
  for (const p of decouper(J, 1, J.length - 1)) {
    if ((p[0].t === 'id' || p[0].t === 'str') && estP(p[1], ':')) o[p[0].v] = p.slice(2);
    else if (p.length === 1 && p[0].t === 'id') o[p[0].v] = p;
  }
  return o;
}
const cle = (o, nom) => (o && o.__objet && o[nom] ? o[nom] : null);
/** Les déclarations `const|let|var NOM = …` dont le nom répond au motif : [{ nom, jetons, l }]. */
function declarations(T, motif) {
  const res = [];
  for (let i = 0; i < T.length; i++) {
    if (!(T[i].t === 'id' && ['const', 'let', 'var'].includes(T[i].v))) continue;
    let fin = i + 1, prof = 0;
    for (; fin < T.length; fin++) {
      const v = T[fin].t === 'p' ? T[fin].v : null;
      if (v in OUVRANTES) prof++; else if (v === ')' || v === ']' || v === '}') { if (--prof < 0) break; } else if (v === ';' && prof === 0) break;
    }
    for (const part of decouper(T, i + 1, fin)) {
      if (part[0].t === 'id' && estP(part[1], '=') && !estP(part[2], '=') && motif.test(part[0].v)) res.push({ nom: part[0].v, jetons: part.slice(2), l: part[0].l });
    }
  }
  return res;
}

// ── Les scripts de la page et la bibliothèque qu'elle charge ──────────────
const scripts = [];
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attrs = m[1], debut = m.index + m[0].indexOf('>') + 1;
  const attr = (nom) => (new RegExp(`\\b${nom}\\s*=\\s*["']([^"']*)["']`, 'i').exec(attrs) || [])[1] || '';
  scripts.push({ type: attr('type').toLowerCase(), id: attr('id'), src: attr('src'), contenu: m[2], ligne: html.slice(0, debut).split('\n').length });
}
const enLigne = scripts.filter(s => !s.src && (!s.type || /javascript|module/.test(s.type)));
const J = enLigne.flatMap(s => jetons(s.contenu, s.ligne));
const ou = (l) => `${NOM_PAGE}:${l}`;
const bibliotheques = scripts.filter(s => s.src && !/^[a-z]+:\/\//i.test(s.src)).map(s => {
  const chemin = path.resolve(DOSSIER, s.src);
  const present = fs.existsSync(chemin) && fs.statSync(chemin).isFile();
  return { src: s.src, chemin, present, code: present ? fs.readFileSync(chemin, 'utf8').replace(/\r\n/g, '\n') : '' };
});
// La bibliothèque se reconnaît à ce qu'elle définit (M.puce), puis à son nom : une copie renommée reste lue.
const motion = bibliotheques.find(b => /\bM\.puce\s*=/.test(b.code)) || bibliotheques.find(b => /motion[^/\\]*\.js$/i.test(b.src));
const JB = motion && motion.present ? jetons(motion.code) : [];
const ouBib = (l) => `${motion ? path.basename(motion.chemin) : 'motion.js'}:${l}`;
if (!motion) NON_JUGE.push('aucune bibliothèque motion.js chargée par la page : le défaut de M.puce (CL4) et la marque de la bibliothèque (CL6) ne sont pas lus');
else if (!motion.present) NON_JUGE.push(`bibliothèque chargée introuvable (${motion.src}) : le défaut de M.puce (CL4) et la marque de la bibliothèque (CL6) ne sont pas lus`);

// ── Les textes du clip (CL3) ──────────────────────────────────────────────
const textes = { titre: [], phrase: [], etapes: [], legendes: [], fin: [] };
let dureeIntro = null, introduite = false;
for (const a of appels(J, [['M', 'introduire']])) {
  introduite = true;
  const o = litteral(a.args[0]);
  const intro = litteral(cle(o, 'intro'));
  if (!intro) continue;
  const v = (k) => litteral(cle(intro, k));
  if (typeof v('titre') === 'string') textes.titre.push({ txt: v('titre'), l: a.l });
  if (typeof v('phrase') === 'string') textes.phrase.push({ txt: v('phrase'), l: a.l });
  if (Array.isArray(v('etapes'))) textes.etapes.push({ liste: v('etapes').filter(e => typeof e === 'string'), l: a.l });
  if (typeof v('duree') === 'number') dureeIntro = v('duree');
}
const premiereChaine = (Jx) => Jx.find(j => j.t === 'str');
for (const a of appels(J, [['M', 'legende']])) { const t = a.args[2]; if (t && t.length === 1 && t[0].t === 'str') textes.legendes.push({ txt: t[0].v, l: t[0].l }); }
for (const d of declarations(J, /^LEG(?:ENDES?)?(?:_\w+)?$/)) {
  if (!estP(d.jetons[0], '[')) continue;
  for (const ligne of decouper(d.jetons, 1, d.jetons.length - 1)) { const s = premiereChaine(ligne); if (s) textes.legendes.push({ txt: s.v, l: s.l }); }
}
const lignesDe = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter(x => typeof x === 'string') : null);
for (const a of appels(J, [['M', 'carteFin']])) {
  const v = litteral(a.args[3]);
  const lignes = v && v.__objet ? lignesDe(litteral(cle(v, 'titre'))) : lignesDe(v);
  if (lignes) textes.fin.push({ lignes, l: a.l });
}
for (const d of declarations(J, /^TITRE_FIN(?:_\w+)?$/)) { const lignes = lignesDe(litteral(d.jetons)); if (lignes) textes.fin.push({ lignes, l: d.l }); }

const nb = (s) => [...s].length;
const budget = (sev, quoi, txt, max, l) => { if (nb(txt) > max) add(sev, 'CL3', `${quoi} de ${nb(txt)} caractères pour un budget de ${max} : « ${txt.slice(0, 80)} »`, ou(l)); };
textes.titre.forEach(x => budget('majeur', 'titre de l\'introduction', x.txt, BUDGETS.titre, x.l));
textes.phrase.forEach(x => budget('majeur', 'phrase de l\'introduction', x.txt, BUDGETS.phrase, x.l));
for (const x of textes.etapes) {
  if (x.liste.length > BUDGETS.etapes) add('majeur', 'CL3', `${x.liste.length} étapes d'introduction pour ${BUDGETS.etapes} au plus : au-delà, elles tombent sous 24 px sur une ligne`, ou(x.l));
  x.liste.forEach(e => budget('majeur', 'étape de l\'introduction', e, BUDGETS.etape, x.l));
}
textes.legendes.forEach(x => budget('majeur', 'légende', x.txt, BUDGETS.legende, x.l));
for (const x of textes.fin) {
  if (x.lignes.length > BUDGETS.lignesFin) add('majeur', 'CL3', `titre de fin sur ${x.lignes.length} lignes pour ${BUDGETS.lignesFin} au plus : la troisième descendrait jusqu'au filet`, ou(x.l));
  x.lignes.forEach(t => budget('majeur', 'ligne du titre de fin', t, BUDGETS.ligneFin, x.l));
}
mesures.textes = { titre: textes.titre.length, phrase: textes.phrase.length, etapes: textes.etapes.reduce((s, x) => s + x.liste.length, 0), legendes: textes.legendes.length, lignes_fin: textes.fin.reduce((s, x) => s + x.lignes.length, 0) };
for (const [k, libelle] of [['titre', 'titre de l\'introduction'], ['phrase', 'phrase de l\'introduction'], ['etapes', 'étapes de l\'introduction'], ['legendes', 'légendes'], ['fin', 'titre de fin']]) {
  if (!textes[k].length) NON_JUGE.push(`CL3 : ${libelle} non repéré(es) dans la source, dans les formats lus : leur budget n'est pas jugé`);
}

// ── CL4 · étiquettes à chasse fixe de 24 px au moins ──────────────────────
let calculees = 0;
const tailleDe = (Jx) => { const v = litteral(Jx); return typeof v === 'number' ? v : null; };
let defautPuce = null, ligneDefaut = null;
for (let i = 0; i < JB.length; i++) {        // M.puce = … ; dans son corps : o.taille || 20, ou o.taille ?? M.NOM
  if (!(estId(JB[i], 'M') && estP(JB[i + 1], '.') && estId(JB[i + 2], 'puce') && estP(JB[i + 3], '=') && !estP(JB[i + 4], '='))) continue;
  for (let k = i + 4; k < Math.min(JB.length, i + 160); k++) {
    if (!(estId(JB[k], 'o') && estP(JB[k + 1], '.') && estId(JB[k + 2], 'taille'))) continue;
    const op = JB[k + 3] && JB[k + 4] && JB[k + 3].v === JB[k + 4].v && ['|', '?'].includes(JB[k + 3].v);
    if (!op) continue;
    const suite = JB[k + 5];
    if (suite && suite.t === 'num') { defautPuce = suite.v; ligneDefaut = suite.l; }
    else if (estId(suite, 'M') && estP(JB[k + 6], '.') && JB[k + 7]?.t === 'id') {
      const nom = JB[k + 7].v;
      for (let q = 0; q < JB.length; q++) if (estId(JB[q], 'M') && estP(JB[q + 1], '.') && estId(JB[q + 2], nom) && estP(JB[q + 3], '=') && JB[q + 4]?.t === 'num') { defautPuce = JB[q + 4].v; ligneDefaut = JB[q + 4].l; }
    }
    break;
  }
  break;
}
mesures.defaut_puce_px = defautPuce;
for (const a of appels(J, [['M', 'puce']])) {
  const o = litteral(a.args[4]);
  if (a.args[4] && !(o && o.__objet)) { calculees++; continue; }
  const jt = cle(o, 'taille');
  if (jt) {
    const n = tailleDe(jt);
    if (n == null) calculees++;
    else if (n < PLANCHER_PX) add('majeur', 'CL4', `étiquette M.puce de ${n} px, sous le plancher de ${PLANCHER_PX} px`, ou(a.l));
  } else if (defautPuce == null) {
    calculees++;
  } else if (defautPuce < PLANCHER_PX) {
    add('majeur', 'CL4', `étiquette M.puce sans taille : la bibliothèque chargée la dessine à ${defautPuce} px (${ouBib(ligneDefaut)}), sous le plancher de ${PLANCHER_PX} px — la bibliothèque du skill dessine 24 px par défaut`, ou(a.l));
  }
}
for (const a of appels(J, [['F', 'mono'], ['M', 'F', 'mono']])) {
  const n = tailleDe(a.args[0]);
  if (n == null) calculees++;
  else if (n < PLANCHER_PX) add('majeur', 'CL4', `texte à chasse fixe de ${n} px (F.mono), sous le plancher de ${PLANCHER_PX} px des étiquettes`, ou(a.l));
}
for (const a of appels(J, [['F', 'titre'], ['M', 'F', 'titre'], ['F', 'corps'], ['M', 'F', 'corps']])) {
  const n = tailleDe(a.args[0]);
  if (n != null && n < PLANCHER_PX) add('avertissement', 'CL4', `texte de ${n} px, sous ${PLANCHER_PX} px : illisible sur un écran de téléphone`, ou(a.l));
}
for (const a of appels(J, [['M', 'texte'], ['M', 'legende']])) {
  const o = litteral(a.args[a.args.length - 1]);
  const n = tailleDe(cle(o, 'taille'));
  if (n != null && n < PLANCHER_PX) add('avertissement', 'CL4', `texte de ${n} px, sous ${PLANCHER_PX} px : illisible sur un écran de téléphone`, ou(a.l));
}
for (const j of J) {
  if (j.t !== 'str') continue;
  const m = /^(?:(?:italic|normal|oblique|bold|bolder|lighter|\d{3})\s+)*(\d+(?:\.\d+)?)px(?:\/[\d.]+)?\s+(.+)$/i.exec(j.v);
  if (!m || Number(m[1]) >= PLANCHER_PX) continue;
  if (/mono/i.test(m[2])) add('majeur', 'CL4', `police à chasse fixe de ${m[1]} px écrite en dur (« ${j.v} »), sous le plancher de ${PLANCHER_PX} px`, ou(j.l));
  else add('avertissement', 'CL4', `police de ${m[1]} px écrite en dur (« ${j.v} »), sous ${PLANCHER_PX} px`, ou(j.l));
}
if (calculees) NON_JUGE.push(`CL4 : ${calculees} taille(s) d'étiquette ou de texte calculée(s) à l'exécution, non résolue(s)`);

// ── CL5 · chiffres de décor ───────────────────────────────────────────────
// Une date n'est pas un chiffre montré, ni un numéro d'ordre (« Étape 1 », « Plan 2 »), qui est une étiquette.
const ORDINAUX = /(?<![\p{L}])(?:étapes?|plans?|parties?|phases?|niveaux?|chapitres?|actes?|scènes?|lots?|versions?)\s+\d{1,2}(?![\p{N}])/giu;
const SANS_DATES = (s) => s.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, ' ').replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ').replace(ORDINAUX, ' ');
const RX_NOMBRE = /(?<![\p{L}\p{N}_.\-/#])\d+(?:[   ]\d{3})*(?:[.,]\d+)?(?![\p{L}\p{N}_]|[.,]\p{N})/gu;
const normaliser = (n) => n.replace(/[   ]/g, '').replace(',', '.');
const nombres = (s) => [...SANS_DATES(s).matchAll(RX_NOMBRE)].map(m => normaliser(m[0]));
const technique = (s) => !/[\p{L}%]/u.test(s)
  || /^(?:(?:italic|normal|oblique|bold|bolder|lighter|\d{3})\s+)*\d+(?:\.\d+)?px(?:\/[\d.]+)?\s+\S/i.test(s)
  || /^#[0-9a-f]{3,8}$/i.test(s) || /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i.test(s)
  || /^(?:[a-z-]+\([^()]*\)\s*)+$/i.test(s)                       // filtre ou transformation CSS : blur(2.5px), drop-shadow(…)
  || /^-?\d*\.?\d+(?:px|ms|s|em|rem|deg|vw|vh)$/i.test(s)
  || /^\S*[/\\]\S*$/.test(s)
  || /^[\w.-]+\.(?:png|jpe?g|svg|webp|gif|wav|mp3|mp4|js|mjs|css|html?|json|txt|md)$/i.test(s);
const affiches = J.filter(j => (j.t === 'str' || j.t === 'tpl') && !technique(j.v));
const etiquetteExemple = J.some(j => (j.t === 'str' || j.t === 'tpl') && /\bexemples?\b/i.test(j.v));

// La table de preuves du storyboard : les nombres des lignes datées, de statut « attestée » ou « partielle »
const SB = fs.readdirSync(DOSSIER).find(f => /^storyboard\.md$/i.test(f));
const storyboard = SB ? fs.readFileSync(path.join(DOSSIER, SB), 'utf8').replace(/\r\n/g, '\n') : null;
const sansAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const cellules = (ligne) => ligne.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim());
const tablesPreuves = [];
if (storyboard) {
  const L = storyboard.split('\n');
  for (let i = 0; i + 1 < L.length; i++) {
    if (!/^\s*\|/.test(L[i]) || !/^\s*\|\s*:?-{3,}/.test(L[i + 1])) continue;
    const entete = cellules(L[i]).map(sansAccents);
    const lignes = [];
    for (let k = i + 2; k < L.length && /^\s*\|/.test(L[k]); k++) lignes.push(cellules(L[k]));
    if (entete.some(c => /statut/.test(c))) tablesPreuves.push({ entete, lignes });
  }
}
const attestes = new Set();
for (const t of tablesPreuves) {
  const iStatut = t.entete.findIndex(c => /statut/.test(c));
  const sources = new Set(t.entete.map((c, k) => (/source/.test(c) ? k : -1)).filter(k => k >= 0));
  for (const cells of t.lignes) {
    const statut = sansAccents(cells[iStatut] || '');
    const date = /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/.test(cells.join(' '));
    if (!date || !/attest|partiel/.test(statut)) continue;
    cells.forEach((c, k) => { if (!sources.has(k)) nombres(c).forEach(n => attestes.add(n)); });
  }
}
mesures.chiffres = { attestes: [...attestes], etiquette_exemple: etiquetteExemple };
const nus = affiches.map(j => ({ j, n: nombres(j.v).filter(n => !attestes.has(n)) })).filter(x => x.n.length);
if (nus.length && !etiquetteExemple) {
  for (const { j, n } of nus) {
    add('majeur', 'CL5', `chiffre de décor sans l'étiquette « exemple » : « ${j.v.slice(0, 70)} » montre ${n.join(', ')}, qu'aucune ligne datée de la table de preuves `
      + 'n\'atteste — afficher « exemple » à côté, ou le mesurer le jour même et l\'attester au storyboard', ou(j.l));
  }
}

// ── CL6 · la marque est un paramètre ──────────────────────────────────────
const bloc = scripts.find(s => s.type === 'application/json' && s.id === 'marque');
let marque = null;
if (!bloc) {
  add('avertissement', 'CL6', 'aucune déclaration de marque <script type="application/json" id="marque"> : l\'introduction et la carte de fin ne portent ni logo, ni nom, ni lien de la marque', NOM_PAGE);
} else {
  try { marque = JSON.parse(bloc.contenu); } catch (e) {
    add('majeur', 'CL6', `déclaration de marque illisible (${String(e.message).slice(0, 80)}) : M.pret() refusera de rendre`, ou(bloc.ligne));
  }
  if (marque && marque.logo && !/^[a-z]+:\/\//i.test(marque.logo) && !fs.existsSync(path.resolve(DOSSIER, marque.logo))) {
    add('majeur', 'CL6', `logo déclaré introuvable (${marque.logo}) : l'entrée et la sortie se rendraient sans lui, et M.pret() refusera de rendre`, ou(bloc.ligne));
  }
}
const logoDeclare = marque && marque.logo ? path.basename(marque.logo).toLowerCase() : null;
const nomDeclare = marque && marque.nom ? marque.nom.trim().replace(/\s+/g, ' ').toLowerCase() : null;
const RX_ADRESSE = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/\S*)?$/i;
const RX_FICHIER = /\.(?:png|jpe?g|svg|webp|gif|wav|mp3|mp4|js|mjs|css|html?|json|txt|md)$/i;
const RX_IMAGE = /\.(?:png|jpe?g|svg|webp|gif)(?:[?#].*)?$/i;
for (const [jeux, ouX, lieu] of [[J, ou, 'le script du clip'], [JB, ouBib, 'la bibliothèque']]) {
  for (const j of jeux) {
    if (j.t !== 'str' && j.t !== 'tpl') continue;
    const v = j.v.trim();
    if (RX_IMAGE.test(v) && (/logo/i.test(v) || (logoDeclare && path.basename(v).toLowerCase() === logoDeclare))) {
      add('majeur', 'CL6', `logo codé en dur dans ${lieu} (« ${v} ») : le logo vient de la déclaration de marque de la page, et M.introduction / M.carteFin le posent`, ouX(j.l));
    } else if (RX_ADRESSE.test(v) && !RX_FICHIER.test(v)) {
      add('majeur', 'CL6', `adresse codée en dur dans ${lieu} (« ${v} ») : le lien vient de la déclaration de marque (« lien »), et M.carteFin le pose`, ouX(j.l));
    } else if (nomDeclare && v.replace(/\s+/g, ' ').toLowerCase() === nomDeclare) {
      add('majeur', 'CL6', `nom de la marque codé en dur dans ${lieu} (« ${v} ») : il vient de la déclaration (M.marque.nom)`, ouX(j.l));
    }
  }
}
const horsScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, (s) => s.replace(/[^\n]/g, ' '));
for (const m of horsScripts.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
  const v = m[1] || m[2];
  if (/logo/i.test(v) || (logoDeclare && path.basename(v).toLowerCase() === logoDeclare)) {
    add('majeur', 'CL6', `logo posé dans la page hors de la déclaration de marque (« ${v} »)`, ou(html.slice(0, m.index).split('\n').length));
  }
}

// ── CL7 · rendu déterministe ──────────────────────────────────────────────
for (let i = 0; i < J.length; i++) {
  const suite = (a, b) => estId(J[i], a) && estP(J[i + 1], '.') && estId(J[i + 2], b) && !(i > 0 && estP(J[i - 1], '.'));
  let quoi = null;
  if (suite('Math', 'random')) quoi = 'Math.random';
  else if (suite('Date', 'now')) quoi = 'Date.now';
  else if (suite('performance', 'now')) quoi = 'performance.now';
  else if (estId(J[i], 'new') && estId(J[i + 1], 'Date')) quoi = 'new Date';
  if (quoi) add('majeur', 'CL7', `${quoi} dans le script du clip : le rendu image par image et la planche ne montreraient pas la même image au même instant — l'aléa passe par M.alea(graine)`, ou(J[i].l));
}

// ── CL2 · pièces de contrôle ──────────────────────────────────────────────
const ICI_DOSSIER = `${path.basename(DOSSIER)}/`;
if (!storyboard) add('majeur', 'CL2', 'STORYBOARD.md absent : ni plans, ni preuves, ni textes, ni contrôles consignés', ICI_DOSSIER);
else if (!tablesPreuves.length) add('avertissement', 'CL2', 'STORYBOARD.md sans table de preuves (id | capacité | source fichier:ligne | statut) : aucun chiffre ne peut y être attesté', SB);
const SIGNATURES = [[0xff, 0xd8, 0xff], [0x89, 0x50, 0x4e, 0x47]];
const planches = fs.readdirSync(DOSSIER).filter(f => /^planche[^/\\]*\.(?:jpe?g|png)$/i.test(f));
const lisibles = planches.filter(f => {
  const b = fs.readFileSync(path.join(DOSSIER, f));
  return SIGNATURES.some(s => s.every((x, k) => b[k] === x));
});
mesures.planches = lisibles;
for (const f of planches.filter(f => !lisibles.includes(f))) add('majeur', 'CL2', `planche illisible (ni JPEG ni PNG) : ${f}`, f);
if (!lisibles.length) add('majeur', 'CL2', 'aucune planche de contrôle (planche-*.jpg) : le clip n\'a pas été relu avant le rendu', ICI_DOSSIER);
else if (lisibles.length < 3) add('avertissement', 'CL2', `${lisibles.length} planche(s) de contrôle pour 3 au moins : introduction, plans et carte de fin`, ICI_DOSSIER);

// ── CL1 · le MP4, lu par ffprobe ──────────────────────────────────────────
let cl1Saute = false;
const mp4Arg = valeur('--mp4');
const mp4s = mp4Arg ? [path.resolve(mp4Arg)] : fs.readdirSync(DOSSIER).filter(f => /\.mp4$/i.test(f)).map(f => path.join(DOSSIER, f));
let duree = null;
for (let i = 0; i < J.length; i++) {
  if (estId(J[i], 'window') && estP(J[i + 1], '.') && estId(J[i + 2], 'DUREE') && estP(J[i + 3], '=') && !estP(J[i + 4], '=') && J[i + 4]?.t === 'num') { duree = J[i + 4].v; break; }
}
const attendue = duree == null ? null : duree + (introduite ? (dureeIntro ?? FORMAT.intro) : 0);
mesures.duree = { corps: duree, introduction: introduite ? (dureeIntro ?? FORMAT.intro) : 0, attendue };
if (!mp4s.length) {
  NON_JUGE.push('CL1 non jouée : aucun MP4 dans le dossier du clip, ni passé par --mp4 — le format de la vidéo n\'est pas jugé');
} else {
  const outil = trouverFfprobe({ explicite: valeur('--ffprobe') });
  mesures.ffprobe = outil.ok ? `${outil.voie} : ${outil.chemin}` : null;
  if (!outil.ok) {
    cl1Saute = true;
    for (const f of mp4s) add('info', 'CL1', `SKIP — ${outil.manque} : le MP4 n'est pas jugé, et le verdict ne peut pas être PASS`, path.basename(f));
  } else {
    mesures.mp4 = [];
    for (const f of mp4s) {
      const nomF = path.basename(f);
      if (!fs.existsSync(f)) { add('majeur', 'CL1', `MP4 introuvable : ${f}`, nomF); continue; }
      const s = sonder(outil.chemin, f);
      if (s.erreur) { add('majeur', 'CL1', `MP4 illisible par ffprobe : ${s.erreur}`, nomF); continue; }
      const v = (s.streams || []).find(x => x.codec_type === 'video'), a = (s.streams || []).find(x => x.codec_type === 'audio');
      const d = Number(s.format?.duration);
      const [num, den] = String(v?.r_frame_rate || '0/1').split('/').map(Number);
      const ips = den ? num / den : 0;
      mesures.mp4.push({ fichier: nomF, duree_s: d, largeur: v?.width, hauteur: v?.height, ips: Math.round(ips * 1000) / 1000, video: v?.codec_name, pixels: v?.pix_fmt, audio: a?.codec_name || null });
      if (!v) { add('majeur', 'CL1', 'aucune piste vidéo', nomF); continue; }
      if (v.width !== FORMAT.largeur || v.height !== FORMAT.hauteur) add('majeur', 'CL1', `${v.width} × ${v.height} au lieu de ${FORMAT.largeur} × ${FORMAT.hauteur}`, nomF);
      if (Math.abs(ips - FORMAT.ips) > 0.01) add('majeur', 'CL1', `${Math.round(ips * 100) / 100} images par seconde au lieu de ${FORMAT.ips}`, nomF);
      if (v.codec_name !== FORMAT.video) add('majeur', 'CL1', `vidéo en ${v.codec_name} au lieu de H.264`, nomF);
      if (v.pix_fmt !== FORMAT.pixels) add('majeur', 'CL1', `format de pixel ${v.pix_fmt} au lieu de ${FORMAT.pixels} : des lecteurs ne le liront pas`, nomF);
      if (!a) add('majeur', 'CL1', 'aucune piste son : la musique n\'a pas été mixée', nomF);
      else if (a.codec_name !== FORMAT.audio) add('majeur', 'CL1', `son en ${a.codec_name} au lieu d'AAC`, nomF);
      if (attendue == null) NON_JUGE.push('CL1 : window.DUREE n\'est pas un nombre écrit dans la source — la durée du MP4 n\'est pas comparée');
      else if (!(Math.abs(d - attendue) <= FORMAT.tolerance)) add('majeur', 'CL1', `durée de ${Number.isFinite(d) ? d.toFixed(2) : '?'} s pour ${attendue} s annoncées (window.DUREE ${duree} + introduction ${attendue - duree}), à ${FORMAT.tolerance} s près`, nomF);
    }
  }
}
if (!introduite) NON_JUGE.push('aucun appel M.introduire : le clip n\'a pas d\'introduction, et la durée attendue du MP4 est window.DUREE seule');

F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (durs.length) sortir('FAIL', F, 1);
if (cl1Saute) sortir('SKIP', F, 2);
const jouees = mp4s.length ? PLAGE_JOUEE : `${plageDeRegles(REGLES_JOUEES.filter(r => r !== 'CL1'))} sans écart ; CL1 non jouée, aucun MP4`;
sortir('PASS', F.length ? F : [{ sev: 'info', regle: '—', msg: mp4s.length ? `${jouees} sans écart` : jouees, where: NOM_PAGE }], 0);
