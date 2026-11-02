#!/usr/bin/env node
// oracle-faits-commerciaux — les formes d'un FAIT COMMERCIAL que la page affiche, listées au rapport
// pour être confirmées (TF-2050, décision D-132 (a) du 02/11/2026).
//
// LE FAIT. Une page de produit peut montrer une note de « 4,8/5 », un prix barré, un « plus que 3 en
// stock », « 10 000 clients » ou une citation de client. Chacun est un fait que seul le produit peut
// attester, et que ni le design ni l'oracle ne peuvent vérifier. Rien ne les listait : ils n'étaient vus
// que par hasard, en relecture. L'humain a tranché une voie AVERTISSANTE, sans déclaration du produit :
// l'oracle repère les formes sur la page servie et les met au rapport, « à faire confirmer ». Aucune
// obligation nouvelle pour le produit.
//
// LE CONTRAT.
//   · Une forme trouvée donne un constat de sévérité `avertissement`, jamais un échec : verdict PASS,
//     exit 0. Chaque constat porte sa ligne et son sélecteur, le texte EXACT trouvé, et la mention
//     « à faire confirmer ». Le premier constat (FC0, `info`) résume le compte, pour qu'un lanceur qui ne
//     montre que les premières lignes dise déjà qu'il y a quelque chose à confirmer.
//   · SKIP, exit 2 : aucune page fournie, page introuvable, non servie (404), injoignable, ou qui ne se lit
//     pas comme du HTML. Une page qu'on n'a pas lue n'est pas une page sans fait commercial.
//   · FAIL, exit 1 : réservé à une ANOMALIE DE L'ORACLE LUI-MÊME (FC9, bloquant) — la table de motifs
//     (corpus/faits-commerciaux.json) est absente, illisible, ou se contredit (un motif qui ne reconnaît pas
//     son propre exemple). Ce n'est jamais un verdict sur la page.
//
// LES FORMES (la table des motifs est une DONNÉE : corpus/faits-commerciaux.json, datée, sourcée).
//   FC1 données d'avis structurées : JSON-LD (aggregateRating, Review, ratingValue, reviewCount…) et microdonnées
//   FC2 note ou nombre d'avis affichés (« 4,8/5 », « 1 240 avis »)
//   FC3 citation de client (blockquote avec attribution) ou section témoignage
//   FC4 prix barré (<s>, <del>, line-through en ligne, en classe usuelle ou en règle CSS) à côté d'un montant ; « au lieu de 129 € »
//   FC5 rareté et urgence (« plus que 3 », « stock limité », « offre expire », compte à rebours)
//   FC6 volume de ventes ou de clients (« 10 000 clients », « déjà vendus »)
//   FC7 allégation de santé (liste courte et datée, en donnée)
//
// VOISIN : `oracle-faits-sources` de make-it-better (digit-ai-forge-agents, b29590c) — il ne se recoupe pas.
//   · Lui juge UN DOCUMENT D'UNE VERSION contre son origine et son dossier sources/ : tout nombre, nom ou
//     citation de la version absent de l'origine est un fait INVENTÉ, refusé (FAIL, exit 1). Il lit du texte
//     (Markdown, Word, PDF) et sait de quoi la version est dérivée.
//   · Celui-ci juge UNE PAGE SERVIE, sans origine ni source connue, et ne refuse rien : il sait seulement
//     reconnaître la FORME d'un fait commercial (avis, prix barré, rareté…) et la signaler. Il lit le HTML
//     rendu par le serveur, y compris ses données structurées, que l'autre ne connaît pas.
//   Les deux se complètent : le premier dit « ce fait n'a pas de source », le second dit « cette page
//     affiche un fait de ce genre, quelqu'un doit en répondre ».
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0 PASS / 1 FAIL / 2 SKIP.
// Usage : node oracles/oracle-faits-commerciaux.mjs <page.html|http(s)://…> [--motifs table.json] [--json-only]

import fs from 'node:fs';
import { parse, elements, css, cssRules, lineOf } from './lib/html.mjs';
import { correspond, decouper, classesDe, ETAT } from './lib/selecteurs.mjs';
import { lireMotifs, FICHIER_MOTIFS } from './lib/faits-commerciaux.mjs';

const DOM = 'Faits commerciaux affichés (avis, prix barré, rareté, volume, santé) — à faire confirmer';
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const iMotifs = args.indexOf('--motifs');
const motifsArg = iMotifs >= 0 ? args[iMotifs + 1] : null;
const page = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--motifs');

const NON_JUGE = [
  'la VÉRACITÉ des faits : l\'oracle ne sait pas si la note, le prix de référence, le stock, le nombre de clients ou l\'allégation est vrai ; une forme trouvée est un fait à faire confirmer par le produit, jamais un défaut',
  'le contenu injecté par JavaScript après le chargement quand seule la page statique est lue (avis chargés par un widget, JSON-LD écrit par un script, compte à rebours animé) ; une page derrière une connexion n\'est pas atteinte',
  'les images : une note, un prix barré ou un badge « stock limité » dessinés dans une image ne sont pas lus, pas plus que les attributs alt, title et aria-label',
  'les formes absentes de la table des motifs (corpus/faits-commerciaux.json) et les langues autres que le français et l\'anglais',
  'une note entière nue (« 5/5 ») : elle se confond avec un score d\'audit ou un numéro d\'étape et n\'est pas cherchée ; une note décimale (« 4,8/5 »), une note nommée (« note : 4 sur 5 ») ou des étoiles le sont',
  'l\'attribution d\'une citation : une citation littéraire ou institutionnelle attribuée est signalée comme une citation de client (faux positif connu, c\'est pourquoi elle est « à faire confirmer »)',
  'le texte masqué par une règle CSS (display:none, hors écran) est lu comme visible ; seul l\'attribut hidden l\'écarte. Une règle CSS à ancêtres (« .carte .prix ») est appariée sur son dernier compound seulement',
];

const F = [];
const vus = new Set();
const FORMES = {};
const LIBELLE_FAMILLE = {};

function sortir(verdict, code, extra = {}) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-faits-commerciaux', domaine: DOM, artefact: page || null, verdict,
    findings: F, non_juge: NON_JUGE, ...extra,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

// SKIP : l'oracle n'a rien lu, et le dit — jamais un PASS par défaut.
function sauter(motif, extra = {}) {
  F.push({ sev: 'info', regle: 'FC0', msg: `SKIP — ${motif} : aucune page n'a été lue, ce n'est pas un PASS`, where: page || null });
  NON_JUGE.unshift(motif);
  sortir('SKIP', 2, { motif, ...extra });
}

// ── La table des motifs : une anomalie ici est celle de l'oracle, pas celle de la page ──
const lecture = lireMotifs(motifsArg ? motifsArg : FICHIER_MOTIFS);
if (lecture.erreurs.length) {
  for (const e of lecture.erreurs) F.push({ sev: 'bloquant', regle: 'FC9', msg: `table des motifs défaillante : ${e}`, where: lecture.fichier });
  NON_JUGE.unshift('toute la page : la table des motifs de l\'oracle est défaillante (FC9), rien n\'a été cherché — c\'est une anomalie de l\'oracle, pas un verdict sur la page');
  sortir('FAIL', 1, { table: { fichier: lecture.fichier } });
}
const S = lecture.structure;
for (const [id, f] of Object.entries(lecture.table.familles)) LIBELLE_FAMILLE[id] = f.libelle;
const echeance = lecture.table.$range_le;
if (echeance && Date.parse(echeance) < Date.now()) {
  NON_JUGE.push(`la table des motifs est échue depuis le ${echeance} (date de relecture posée dans corpus/faits-commerciaux.json) : les formes cherchées peuvent avoir vieilli`);
}

if (!page) sauter('aucune page fournie (fichier .html ou URL http/https)');

// ── La page servie ─────────────────────────────────────────────────────────
let html;
if (/^https?:\/\//i.test(page)) {
  try {
    const rep = await fetch(page, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
    if (!rep.ok) sauter(`page non servie : ${page} répond ${rep.status}`);
    html = await rep.text();
  } catch (e) {
    sauter(`page injoignable : ${page} (${String(e.cause?.code || e.message).slice(0, 80)})`);
  }
} else {
  if (!fs.existsSync(page)) sauter(`page introuvable : ${page}`);
  try { html = fs.readFileSync(page, 'utf8'); } catch (e) { sauter(`page illisible : ${String(e.message).slice(0, 80)}`); }
}
if (!html || !/<[a-z!][^>]*>/i.test(html) || html.includes('\u0000')) sauter('contenu illisible comme HTML (vide, binaire ou sans balise)');

const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', euro: '€', hellip: '…', laquo: '«', raquo: '»', ndash: '–', mdash: '—' };
const decoder = s => s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, d, h, n) =>
  d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : (ENTITES[n.toLowerCase()] ?? m));
const nettoyer = s => decoder(s).replace(/\s+/g, ' ').trim();
const court = (s, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const BLOC = new Set(['html', 'body', 'head', 'main', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'div', 'p', 'ul', 'ol',
  'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
  'figure', 'figcaption', 'form', 'fieldset', 'legend', 'details', 'summary', 'pre', 'address', 'hr', 'br', 'title', 'option', 'select']);
const IGNORES = new Set(['script', 'style', 'template']);

// Le texte d'un élément : ses noeuds texte descendants, hors script et style.
function texteDe(el) {
  const out = [];
  const rec = n => {
    for (const c of n.children || []) {
      if (c.tag === '#text') out.push(c.text);
      else if (c.tag.startsWith('#') || IGNORES.has(c.tag)) continue;
      else rec(c);
    }
  };
  rec(el);
  return nettoyer(out.join(' '));
}

// « section#avis > p.note » — le sélecteur d'un élément, avec ses deux ancêtres au plus.
function unSelecteur(el) {
  const un = e => `${e.tag}${e.attrs?.id ? `#${e.attrs.id}` : ''}${classesDe(e).slice(0, 2).map(c => `.${c}`).join('')}`;
  const chaine = [];
  for (let e = el; e && e.tag && !e.tag.startsWith('#') && chaine.length < 3; e = e.parent) chaine.unshift(un(e));
  return chaine.join(' > ');
}

/** Le constat d'une forme. Dédoublonné sur règle, ligne et texte exact. */
function signaler(regle, el, start, texte, detail) {
  const ligne = lineOf(html, start ?? el.start ?? 0);
  const t = nettoyer(String(texte));
  const cle = `${regle}|${ligne}|${t}`;
  if (vus.has(cle)) return;
  vus.add(cle);
  FORMES[regle] = (FORMES[regle] || 0) + 1;
  const selecteur = el ? unSelecteur(el) : null;
  F.push({
    sev: 'avertissement', regle,
    msg: `${regle} — ${detail} : « ${court(t, 140)} » — à faire confirmer`,
    where: `ligne ${ligne}${selecteur ? ` · ${selecteur}` : ''}`,
    ligne, selecteur, texte: t, a_confirmer: true,
  });
}

const racine = parse(html);
const tous = elements(racine);
const ancetre = (el, ensemble) => { for (let e = el.parent; e; e = e.parent) if (ensemble.has(e)) return true; return false; };
const cache = el => el.attrs && Object.prototype.hasOwnProperty.call(el.attrs, 'hidden');
const dansCache = el => { for (let e = el; e; e = e.parent) if (e.attrs && cache(e)) return true; return false; };

// ── FC1 · données d'avis structurées ───────────────────────────────────────
let blocsJsonld = 0, blocsIllisibles = 0;
for (const sc of elements(racine, 'script')) {
  if (!/ld\+json/i.test(sc.attrs.type || '')) continue;
  blocsJsonld++;
  const brut = sc.children.filter(c => c.tag === '#raw').map(c => c.text).join('');
  let doc = null;
  try { doc = JSON.parse(brut); } catch { blocsIllisibles++; }
  const ou = `JSON-LD n° ${blocsJsonld}`;
  if (doc === null) {
    // Un bloc qu'on ne sait pas parser reste cherché comme du texte : il ne devient pas muet.
    for (const cle of [...S.jsonldClesNoeud, ...S.jsonldClesValeur]) {
      const m = new RegExp(`"${cle}"\\s*:\\s*("[^"]{0,60}|[^,}\\]\\s]{1,30})`, 'i').exec(brut);
      if (m) signaler('FC1', sc, sc.start, `${cle}: ${m[1].replace(/^"/, '')}`, `donnée d'avis dans un bloc JSON-LD illisible (${ou})`);
    }
    continue;
  }
  const signalerNoeud = (noeud, chemin) => {
    const pieces = [];
    for (const cle of S.jsonldClesValeur) {
      const v = noeud[cle];
      if (v !== undefined && typeof v !== 'object') pieces.push(`${cle}: ${v}`);
    }
    const auteur = noeud.author && (noeud.author.name || (typeof noeud.author === 'string' ? noeud.author : null));
    if (auteur) pieces.push(`author: ${auteur}`);
    const type = [].concat(noeud['@type'] || []).join('/');
    signaler('FC1', sc, sc.start, `${type || chemin.split('.').pop()} ${pieces.join(' · ')}`.trim(), `donnée d'avis structurée (${ou} › ${chemin})`);
  };
  const marcher = (noeud, chemin, signale, cleParent) => {
    if (Array.isArray(noeud)) { noeud.forEach((x, i) => marcher(x, `${chemin}[${i}]`, signale, cleParent)); return; }
    if (!noeud || typeof noeud !== 'object') return;
    const types = [].concat(noeud['@type'] || []).map(t => String(t).toLowerCase());
    const interessant = types.some(t => S.jsonldTypes.includes(t)) || S.jsonldClesNoeud.includes(cleParent);
    let porte = signale;
    if (interessant && !signale) { signalerNoeud(noeud, chemin); porte = true; }
    for (const [cle, v] of Object.entries(noeud)) {
      if (!porte && S.jsonldClesValeur.includes(cle) && v !== null && typeof v !== 'object') {
        signaler('FC1', sc, sc.start, `${cle}: ${v}`, `donnée d'avis structurée (${ou} › ${chemin}.${cle})`);
      }
      marcher(v, `${chemin}.${cle}`, porte, cle);
    }
  };
  marcher(doc, '$', false, null);
}

// Microdonnées (itemtype, itemprop) ; une propriété RDFa nommée par `property` est lue aussi, un type RDFa non.
const typesSignales = new Set();
for (const el of tous) {
  if (dansCache(el)) continue;
  const type = el.attrs.itemtype || '';
  if (type && S.microdonneesTypes.test(type) && !ancetre(el, typesSignales)) {
    typesSignales.add(el);
    signaler('FC1', el, el.start, `${type.replace(/^https?:\/\/(?:www\.)?schema\.org\//i, '')} ${court(texteDe(el), 80)}`.trim(), 'donnée d\'avis en microdonnées');
  }
}
for (const el of tous) {
  if (dansCache(el) || ancetre(el, typesSignales)) continue;
  const prop = String(el.attrs.itemprop || el.attrs.property || '').toLowerCase();
  if (!prop || !prop.split(/\s+/).some(p => S.microdonneesProps.includes(p))) continue;
  signaler('FC1', el, el.start, `${prop} ${el.attrs.content ?? court(texteDe(el), 80)}`.trim(), 'donnée d\'avis en microdonnées');
}

// ── FC3 · section témoignage, puis citation de client ──────────────────────
const sections = new Set();
const jetonsDe = el => [el.attrs.class, el.attrs.id, el.attrs['aria-label'], el.attrs['data-section'], el.attrs['data-component']].filter(Boolean).join(' ');
for (const el of tous) {
  if (dansCache(el) || ancetre(el, sections)) continue;
  const jetons = jetonsDe(el);
  if (jetons && S.classesTemoignage.test(jetons)) {
    sections.add(el);
    const titre = elements(el, ['h1', 'h2', 'h3', 'h4']).map(texteDe).find(Boolean);
    signaler('FC3', el, el.start, titre || court(texteDe(el), 100) || jetons, 'section de témoignages');
  }
}
for (const el of elements(racine, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])) {
  if (dansCache(el) || ancetre(el, sections)) continue;
  const t = texteDe(el);
  if (t && S.titresTemoignage.test(t)) signaler('FC3', el, el.start, t, 'titre de section de témoignages');
}

function attributionDe(bq) {
  for (const tag of ['cite', 'footer', 'figcaption']) {
    const t = elements(bq, tag).map(texteDe).find(Boolean);
    if (t) return t;
  }
  const p = bq.parent;
  if (p && p.tag === 'figure') {
    const t = elements(p, 'figcaption').map(texteDe).find(Boolean);
    if (t) return t;
  }
  // « — Camille D., responsable » : dernière ligne du bloc, ou élément qui suit immédiatement.
  const enLigne = [...(bq.children || []).filter(c => c.tag && !c.tag.startsWith('#')).map(texteDe).reverse(), texteDe(bq).split(/\s(?=[—–]\s?\p{Lu})/u).pop()]
    .find(t => t && S.attribution.test(t));
  if (enLigne) return enLigne;
  const freres = (p?.children || []).filter(c => c.tag && !c.tag.startsWith('#'));
  const suivant = freres[freres.indexOf(bq) + 1];
  if (suivant && ['p', 'footer', 'cite', 'div', 'span', 'figcaption'].includes(suivant.tag)) {
    const t = texteDe(suivant);
    if (S.attribution.test(t)) return t;
  }
  return null;
}
for (const bq of elements(racine, 'blockquote')) {
  if (dansCache(bq) || ancetre(bq, sections)) continue;
  const attribution = attributionDe(bq);
  if (!attribution) continue;
  signaler('FC3', bq, bq.start, `${court(attribution, 70)} · « ${court(texteDe(bq).replace(attribution, '').trim(), 70)} »`, 'citation attribuée (client ?)');
}

// ── FC4 · prix barré ───────────────────────────────────────────────────────
const aUnMontant = t => { S.montant.lastIndex = 0; return S.montant.test(t); };
const barres = new Map(); // élément → ce qui le raye
const raye = (el, raison) => { if (!barres.has(el)) barres.set(el, raison); };
const regleBarree = new RegExp(S.decorationBarree.source, 'iu');
for (const el of tous) {
  if (dansCache(el)) continue;
  if (S.tagsPrixBarre.includes(el.tag)) raye(el, `<${el.tag}>`);
  if (el.attrs.style && regleBarree.test(el.attrs.style)) raye(el, 'style en ligne line-through');
  const classes = classesDe(el).find(c => S.classesPrixBarre.test(c));
  if (classes) raye(el, `classe « ${classes} »`);
}
for (const r of cssRules(css(html, racine).replace(/\/\*[\s\S]*?\*\//g, ' '))) {
  if (!regleBarree.test(r.body)) continue;
  for (const sel of r.selector.split(',').map(s => s.trim()).filter(Boolean)) {
    if (sel === 'inline' || ETAT.test(sel) || sel.startsWith('@') || !decouper(sel).compounds.length) continue;
    for (const el of tous) if (!dansCache(el) && correspond(el, sel)) raye(el, `règle CSS « ${sel} » (line-through)`);
  }
}
for (const [el, raison] of barres) {
  const propre = texteDe(el);
  const freres = (el.parent?.children || []).filter(c => c !== el && c.tag && !c.tag.startsWith('#'));
  // « à côté d'un montant » : le montant est dans l'élément rayé, ou dans un élément voisin du même parent.
  const montant = aUnMontant(propre) ? propre : freres.map(texteDe).find(aUnMontant);
  if (!montant) continue;
  signaler('FC4', el, el.start, propre || montant, `prix barré (${raison}) à côté d'un montant`);
}

// ── FC5 · compte à rebours (la structure) ──────────────────────────────────
for (const el of tous) {
  if (dansCache(el)) continue;
  const jetons = [el.attrs.class, el.attrs.id].filter(Boolean).join(' ');
  const attribut = Object.keys(el.attrs).find(a => S.attributsCompteARebours.includes(a));
  if (!(jetons && S.classesCompteARebours.test(jetons)) && !attribut) continue;
  signaler('FC5', el, el.start, texteDe(el) || (attribut ? `${attribut}="${el.attrs[attribut]}"` : jetons), 'compte à rebours ou minuteur');
}

// ── FC2 · FC4 · FC5 · FC6 · FC7 · le texte visible, par segment de bloc ────
// Un segment est le texte continu d'un bloc, ses éléments en ligne traversés : « <b>1 240</b> avis » est
// UN texte. Un bloc imbriqué ferme le segment en cours, et la ligne citée est celle de son premier mot.
const segments = [];
function flux(bloc) {
  let tampon = [];
  const vider = () => {
    if (tampon.length) segments.push({ bloc, texte: nettoyer(tampon.map(c => c.text).join(' ')), debut: tampon[0].start });
    tampon = [];
  };
  const rec = n => {
    for (const c of n.children || []) {
      if (c.tag === '#text') tampon.push(c);
      else if (c.tag.startsWith('#') || IGNORES.has(c.tag) || cache(c)) continue;
      else if (BLOC.has(c.tag)) { vider(); flux(c); }
      else rec(c);
    }
  };
  rec(bloc);
  vider();
}
flux(racine);

const DETAIL = {};
for (const m of lecture.motifs) DETAIL[m.id] = m.libelle;
const tousMotifs = [
  ...lecture.motifs.map(m => ({ famille: m.famille, re: m.re, detail: m.libelle })),
  ...lecture.sante.map(t => ({ famille: 'FC7', re: t.re, detail: `allégation de santé « ${t.terme} »` })),
];
for (const seg of segments) {
  if (!seg.texte) continue;
  const trouves = [];
  for (const m of tousMotifs) {
    m.re.lastIndex = 0;
    for (const x of seg.texte.matchAll(m.re)) trouves.push({ famille: m.famille, debut: x.index, fin: x.index + x[0].length, texte: x[0], detail: m.detail });
  }
  // Deux motifs d'une même famille qui disent la même chose (« 10 000 clients » et « nous font
  // confiance ») ne font qu'un constat : le plus long l'emporte.
  trouves.sort((a, b) => (b.fin - b.debut) - (a.fin - a.debut));
  const gardes = [];
  for (const t of trouves) if (!gardes.some(g => g.famille === t.famille && t.debut < g.fin && g.debut < t.fin)) gardes.push(t);
  for (const t of gardes) signaler(t.famille, seg.bloc, seg.debut, t.texte, t.detail);
}

// ── Le résultat ────────────────────────────────────────────────────────────
const avertissements = F.filter(f => f.sev === 'avertissement');
avertissements.sort((a, b) => (a.ligne - b.ligne) || a.regle.localeCompare(b.regle));
F.length = 0;
if (avertissements.length) {
  const parFamille = Object.entries(FORMES).sort(([a], [b]) => a.localeCompare(b)).map(([k, n]) => `${k} ×${n}`).join(', ');
  F.push({
    sev: 'info', regle: 'FC0',
    msg: `${avertissements.length} forme(s) de fait commercial repérée(s) (${parFamille}) — à faire confirmer par le produit ; la véracité n'est pas jugée`,
    where: page,
  });
}
F.push(...avertissements);
if (!avertissements.length) {
  F.push({ sev: 'info', regle: 'FC0', msg: 'aucune forme de fait commercial repérée dans la page lue (la véracité de ce qu\'elle affiche n\'est pas jugée)', where: page });
}
if (blocsIllisibles) NON_JUGE.push(`${blocsIllisibles} bloc(s) JSON-LD illisible(s) : cherchés comme du texte seulement, sans lire leur structure`);

sortir('PASS', 0, {
  a_faire_confirmer: avertissements.length,
  formes: FORMES,
  lu: { segments: segments.length, blocs_jsonld: blocsJsonld, elements: tous.length },
  table: { fichier: lecture.fichier, date: lecture.table.$date, relecture: echeance, motifs: lecture.motifs.length, termes_sante: lecture.sante.length },
});
