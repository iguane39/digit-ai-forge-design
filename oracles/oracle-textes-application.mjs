#!/usr/bin/env node
// oracle-textes-application — Domaine « Textes d'application (T4) : libellés, erreurs,
// états vides » (déterministe). TF-1064, lot pilot du 12/09/2026.
//
// LE FAIT. Le 12/09/2026, le pilot a déposé un plancher d'écriture transverse
// (`references\ECRITURE.md`, E-1 à E-12) dont la règle E-12 vise le type T4 — les textes
// d'application : « un libellé nomme ce que la personne contrôle ; une erreur dit ce qui
// s'est passé puis comment réparer ; un état vide invite à agir ». L'oracle d'écriture du
// pilot juge le Markdown et déclare T4 en `non_juge` : les chaînes d'application vivent
// dans du code ou des fichiers de ressources qu'il ne lit pas. Aucun oracle du parc ne
// voyait donc une erreur sans réparation ni un état vide sans action — et c'est le type de
// texte le plus lu par les utilisateurs finaux. La critique d'implémentation les regarde en
// D7 Contenu (10 %), « la plus sous-traitée, la plus visible à l'usage ».
//
// CE QU'IL JUGE — la PRÉSENCE de ce que E-12 exige, jamais la justesse du ton :
//   T4-1  ERREUR sans réparation ni cause — une chaîne d'erreur qui ne dit ni ce qui s'est
//         passé (« dépasse », « manque », « n'existe pas », « déjà », « trop »…) ni comment
//         réparer (« réessaye », « corrige », « vérifie », « compresse », « contacte »…)
//         est bloquante. Elle n'en dit qu'UNE des deux : avertissement — E-12 demande la
//         cause PUIS la réparation, et une seule moitié laisse la personne à mi-chemin.
//   T4-2  ÉTAT VIDE sans action — un état vide qui constate le vide sans inviter à agir
//         (« crée », « ajoute », « importe », « commence », « invite »…) est bloquant.
//   T4-3  LIBELLÉ GÉNÉRIQUE — « Valider », « OK », « Soumettre », « Cliquez ici »,
//         « Envoyer » seul, « Submit », « Click here » : avertissement. Un libellé nomme ce
//         que la personne contrôle (« Enregistrer les modifications »), pas le geste du
//         système.
//   T4-4  ERREUR QUI S'EXCUSE — « désolé », « oups », « sorry », « oops » : avertissement.
//         L'excuse occupe la place de la cause et de la réparation.
//
// POURQUOI T4-1…T4-4 ET NON TA1…TA4. Le lot du pilot nomme ces règles TA1 à TA4 ; ces
// quatre identifiants sont DÉJÀ pris dans cette forge par `oracle-taste` (TA1 familles
// d'accent, TA2 saturation, TA3 filets, TA4 systèmes cohabitants), et `grille.md` les cite
// sous ce sens à la dimension D1. Deux sens pour un même identifiant dans un même rapport
// est un défaut de cohérence, pas une nuance. Le préfixe retenu — T4 — est le code de
// typologie de `references\ECRITURE.md` (« T4 : textes d'application »), donc il dit ce
// qu'il juge. L'écart est consigné au lot de retours.
//
// ENTRÉE — un fichier de chaînes extraites, format déduit de l'extension (ou `--format`) :
//   .json         plat `{cle: texte}` ou imbriqué (les clés sont aplaties en `a.b.c`)
//   .arb          idem, `@@…` ignorés, `@cle.description` servant de contexte
//   .po           blocs msgctxt / msgid / msgstr (msgstr s'il est rempli, sinon msgid)
//   .properties   `cle=valeur`, continuations `\` et échappements `\n` `\uXXXX`
//   .html         littéraux de `placeholder`, `title`, `aria-label`, `alt` ; texte des
//                 `<button>`, `<label>`, `<option>` ; texte des éléments `role="alert"`,
//                 `.error`, `.empty`, `[data-etat="vide"]`
//
// CE QU'IL NE JUGE PAS — déclaré en non_juge, jamais supposé : la justesse du ton, la voix
// de marque (`voix.md` : elle n'est pas décidable par script et reste à l'arbitrage du
// commanditaire), et toute chaîne NON EXTRAITE — un plancher franchi n'est pas une voix
// trouvée, et un fichier de ressources incomplet ne prouve rien sur le produit.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[]} · exit 0/1/2.
// Usage :
//   node oracle-textes-application.mjs <chaines.json|.arb|.po|.properties|.html> [--format <f>] [--json-only]
//   node oracle-textes-application.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseHtml, elements, walk } from './lib/html.mjs';

const DOM = "Textes d'application (T4) : libellés, erreurs, états vides";

// ── Constantes de langue, volontairement EXTENSIBLES ────────────────────────
// Une donnée périssable est une donnée, pas du code : ces listes se complètent par
// ajout, jamais par réécriture de la mécanique. Elles sont comparées sur un texte
// NORMALISÉ (minuscules, accents retirés, apostrophes redressées), à la frontière
// de mot — « compresse-le » compte pour « compresse ».

export const VERBES_REPARATION = [
  'reessaye', 'reessayer', 'reessayez', 'reessayons', 'ressaye', 'ressayer',
  'corrige', 'corriger', 'corrigez', 'corrigeons',
  'verifie', 'verifier', 'verifiez', 'verifions',
  'choisis', 'choisir', 'choisissez',
  'selectionne', 'selectionner', 'selectionnez',
  'compresse', 'compresser', 'compressez',
  'contacte', 'contacter', 'contactez',
  'reduis', 'reduire', 'reduisez',
  'renseigne', 'renseigner', 'renseignez',
  'complete', 'completer', 'completez',
  'supprime', 'supprimer', 'supprimez',
  'reconnecte', 'reconnecter', 'reconnectez',
  'recommence', 'recommencer', 'recommencez',
  'actualise', 'actualiser', 'actualisez',
  'rafraichis', 'rafraichir', 'rafraichissez',
  'patiente', 'patienter', 'patientez',
  'renomme', 'renommer', 'renommez',
  'convertis', 'convertir', 'convertissez',
  'envoie', 'envoyer', 'envoyez',
  'reprends', 'reprendre', 'reprenez',
  'attends', 'attendre', 'attendez',
  'modifie', 'modifier', 'modifiez',
  'ajuste', 'ajuster', 'ajustez',
];

export const INDICES_CAUSE = [
  'depasse', 'depassent', 'depassement',
  'manque', 'manquent', 'manquant', 'manquante',
  "n'existe pas", 'nexiste pas', "n'existent pas",
  'deja', 'trop',
  'introuvable', 'introuvables',
  'expire', 'expiree', 'expirees',
  'incorrect', 'incorrecte', 'incorrects', 'incorrectes',
  'invalide', 'invalides',
  'requis', 'requise', 'obligatoire', 'obligatoires',
  'indisponible', 'indisponibles',
  'inconnu', 'inconnue',
  'illisible', 'illisibles',
  'non pris en charge', 'pas pris en charge', 'non supporte',
  'refuse', 'refusee', 'verrouille', 'verrouillee',
  'hors ligne', 'interrompue', 'interrompu',
];

export const VERBES_ACTION = [
  'cree', 'creer', 'creez', 'creons',
  'ajoute', 'ajouter', 'ajoutez',
  'importe', 'importer', 'importez',
  'commence', 'commencer', 'commencez',
  'invite', 'inviter', 'invitez',
  'demarre', 'demarrer', 'demarrez',
  'lance', 'lancer', 'lancez',
  'configure', 'configurer', 'configurez',
  'connecte', 'connecter', 'connectez',
  'depose', 'deposer', 'deposez',
  'publie', 'publier', 'publiez',
  'televerse', 'televerser', 'televersez',
  'telecharge', 'telecharger', 'telechargez',
  'parcours', 'parcourir', 'parcourez',
  'explore', 'explorer', 'explorez',
  'essaye', 'essayer', 'essayez',
  'redige', 'rediger', 'redigez',
  'planifie', 'planifier', 'planifiez',
  'choisis', 'choisir', 'choisissez',
  'selectionne', 'selectionner', 'selectionnez',
  'enregistre', 'enregistrer', 'enregistrez',
];

// Comparés à la chaîne ENTIÈRE normalisée (ponctuation finale retirée), jamais en
// sous-chaîne : « Valider » est générique, « Valider la commande » ne l'est pas.
export const LIBELLES_GENERIQUES = [
  'valider', 'validez', 'validation',
  'ok', "c'est ok", 'okay',
  'soumettre', 'soumettez',
  'cliquez ici', 'cliquer ici', 'clique ici',
  'click here', 'submit', 'send',
  'envoyer', 'envoyez',
  'continuer', 'go', 'lire la suite',
];

export const MARQUES_EXCUSE = ['desole', 'desolee', 'desoles', 'desolees', 'oups', 'sorry', 'oops', 'navre', 'navres', 'navree'];

// Classification — clé, contexte ET texte servent de signal. Le texte est indispensable :
// la fixture fondatrice « Une erreur est survenue » peut vivre sous n'importe quelle clé,
// et c'est justement la chaîne qu'il faut voir.
const RX_ERREUR = /(^|[^a-z0-9])(error|errors|erreur|erreurs|fail|failed|failure|echec|echecs|invalid|invalide|invalides|refus|refuse|refusee)([^a-z0-9]|$)/;
const RX_VIDE = /(^|[^a-z0-9])(empty|vide|vides|aucun|aucune|aucuns|aucunes|no[_ -]?results?|nothing|pas encore|rien a afficher)([^a-z0-9]|$)/;

export const normaliser = s => String(s)
  .replace(/[\u2018\u2019\u02bc]/g, "'")
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const motif = liste => new RegExp('(^|[^a-z0-9])(' + liste.map(echapper).join('|') + ')([^a-z0-9]|$)');
const RX_REPARATION = motif(VERBES_REPARATION);
const RX_CAUSE = motif(INDICES_CAUSE);
const RX_ACTION = motif(VERBES_ACTION);
const RX_EXCUSE = motif(MARQUES_EXCUSE);

// ── Jugement — fonction pure, testable sans fichier ─────────────────────────
/**
 * @param {{cle:string, texte:string, contexte?:string, ou?:string}[]} entrees
 * @returns {{findings:Array, compte:{total:number, erreurs:number, vides:number}}}
 */
export function juger(entrees) {
  const findings = [];
  const add = (sev, regle, msg, where) => findings.push({ sev, regle, msg, where });
  let erreurs = 0, vides = 0;

  for (const e of entrees) {
    const texte = String(e.texte || '');
    if (!texte.trim()) continue;
    const nTexte = normaliser(texte);
    // Une chaîne sans lettre (« — », « 12 », « % ») n'est pas un texte d'application.
    if (!/[a-z]/.test(nTexte)) continue;
    const signal = normaliser([e.cle || '', e.contexte || '', texte].join(' '));
    const ou = e.ou || e.cle || '(sans clé)';
    const extrait = texte.length > 90 ? texte.slice(0, 90) + '…' : texte;

    const estErreur = RX_ERREUR.test(signal);
    // Précédence assumée : une chaîne qui porte les deux marques est jugée comme une
    // ERREUR. « Aucune erreur » relève du message d'erreur, pas de l'état vide, et un
    // état vide accusé de ne pas réparer serait un faux positif bruyant.
    const estVide = !estErreur && RX_VIDE.test(signal);

    if (estErreur) {
      erreurs++;
      const aReparation = RX_REPARATION.test(nTexte);
      const aCause = RX_CAUSE.test(nTexte);
      if (!aReparation && !aCause) {
        add('bloquant', 'T4-1', `erreur sans cause ni réparation : « ${extrait} ». E-12 : une erreur dit ce qui `
          + "s'est passé PUIS comment réparer. Ici la personne apprend qu'il y a un problème et rien d'autre", ou);
      } else if (!aReparation) {
        add('avertissement', 'T4-1', `erreur qui dit la cause mais pas la réparation : « ${extrait} ». `
          + 'E-12 demande les deux — la moitié laisse la personne devant un constat', ou);
      } else if (!aCause) {
        add('avertissement', 'T4-1', `erreur qui dit la réparation mais pas la cause : « ${extrait} ». `
          + "E-12 demande les deux — réparer sans savoir quoi est une devinette", ou);
      }
      if (RX_EXCUSE.test(nTexte)) {
        add('avertissement', 'T4-4', `erreur qui s'excuse : « ${extrait} ». L'excuse occupe la place de la cause `
          + "et de la réparation ; le contrat de voix la refuse (« jamais d'excuse, jamais de vague »)", ou);
      }
    }

    if (estVide) {
      vides++;
      if (!RX_ACTION.test(nTexte)) {
        add('bloquant', 'T4-2', `état vide sans invitation à agir : « ${extrait} ». E-12 : un état vide invite à `
          + "agir. Un constat de vide laisse l'écran sans issue", ou);
      }
    }

    const nu = nTexte.replace(/[.!?…:;]+$/, '').trim();
    if (LIBELLES_GENERIQUES.includes(nu)) {
      add('avertissement', 'T4-3', `libellé générique : « ${texte.trim()} ». E-12 : un libellé nomme ce que la `
        + 'personne contrôle (« Enregistrer les modifications »), pas le geste du système', ou);
    }
  }

  return { findings, compte: { total: entrees.length, erreurs, vides } };
}

// ── Extraction — un format, une fonction, toutes rendant la même forme ──────

const ligneDe = (brut, aiguille) => {
  if (!aiguille) return null;
  const i = brut.indexOf(aiguille);
  return i === -1 ? null : brut.slice(0, i).split('\n').length;
};

export function aplatir(valeur, prefixe = '', out = []) {
  if (Array.isArray(valeur)) {
    valeur.forEach((v, i) => aplatir(v, `${prefixe}[${i}]`, out));
  } else if (valeur && typeof valeur === 'object') {
    for (const [k, v] of Object.entries(valeur)) aplatir(v, prefixe ? `${prefixe}.${k}` : k, out);
  } else if (typeof valeur === 'string') {
    out.push({ cle: prefixe, texte: valeur });
  }
  return out;
}

export function extraireJson(brut) {
  return aplatir(JSON.parse(brut));
}

export function extraireArb(brut) {
  const j = JSON.parse(brut);
  const descriptions = {};
  for (const [k, v] of Object.entries(j)) {
    if (k.startsWith('@@') || !k.startsWith('@')) continue;
    if (v && typeof v === 'object' && typeof v.description === 'string') descriptions[k.slice(1)] = v.description;
  }
  const out = [];
  for (const [k, v] of Object.entries(j)) {
    if (k.startsWith('@')) continue;
    if (typeof v === 'string') out.push({ cle: k, texte: v, contexte: descriptions[k] || '' });
  }
  return out;
}

export function extrairePo(brut) {
  const out = [];
  const deguillemeter = l => {
    const m = /^\s*(?:msgid|msgstr|msgctxt)?\s*"((?:\\.|[^"\\])*)"\s*$/.exec(l);
    if (!m) return null;
    return m[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  };
  let bloc = { commentaires: [], ctxt: '', id: '', str: '' };
  let champ = null;
  const vider = () => {
    const texte = bloc.str || bloc.id;
    if (texte) out.push({ cle: bloc.ctxt || bloc.id, texte, contexte: bloc.commentaires.join(' ') });
    bloc = { commentaires: [], ctxt: '', id: '', str: '' };
    champ = null;
  };
  for (const ligne of brut.split(/\r?\n/)) {
    if (!ligne.trim()) { vider(); continue; }
    if (ligne.startsWith('#')) { if (ligne.startsWith('#.') || ligne.startsWith('#:')) bloc.commentaires.push(ligne.slice(2).trim()); continue; }
    let cible = null;
    if (/^msgctxt\s/.test(ligne)) cible = 'ctxt';
    else if (/^msgid\s/.test(ligne)) cible = 'id';
    else if (/^msgstr(\[\d+\])?\s/.test(ligne)) cible = 'str';
    if (cible) champ = cible;
    const v = deguillemeter(ligne.replace(/^(msgctxt|msgid|msgstr(\[\d+\])?)\s+/, ''));
    if (v != null && champ) bloc[champ] += v;
  }
  vider();
  return out;
}

export function extraireProperties(brut) {
  const out = [];
  const lignes = brut.split(/\r?\n/);
  let tampon = '';
  for (const l of lignes) {
    const brute = tampon ? tampon + l.replace(/^\s+/, '') : l;
    tampon = '';
    const t = brute.trim();
    if (!t || t.startsWith('#') || t.startsWith('!')) continue;
    if (/\\$/.test(t) && !/\\\\$/.test(t)) { tampon = t.slice(0, -1); continue; }
    const m = /^([^=:]+?)\s*[=:]\s*([\s\S]*)$/.exec(t);
    if (!m) continue;
    const texte = m[2]
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\([:=#! \\])/g, '$1');
    out.push({ cle: m[1].trim().replace(/\\([:=])/g, '$1'), texte });
  }
  return out;
}

const ATTRS_TEXTE = ['placeholder', 'title', 'aria-label', 'alt'];
const BALISES_TEXTE = ['button', 'label', 'option'];

export function extraireHtml(brut) {
  const racine = parseHtml(brut);
  const out = [];
  const at = (el, k) => (el.attrs && el.attrs[k] != null ? String(el.attrs[k]) : '');
  const texteDe = el => {
    let t = '';
    walk(el, n => { if (n.tag === '#text') t += ' ' + n.text; });
    return t.replace(/\s+/g, ' ').trim();
  };
  const marqueurs = el => [el.tag, at(el, 'class'), at(el, 'role'), at(el, 'id'), at(el, 'data-etat'), at(el, 'name')]
    .filter(Boolean).join(' ');

  for (const el of elements(racine)) {
    if (el.tag === 'script' || el.tag === 'style') continue;
    for (const a of ATTRS_TEXTE) {
      const v = at(el, a);
      if (v.trim()) out.push({ cle: `${el.tag}[${a}]`, texte: v, contexte: marqueurs(el) });
    }
    const classe = normaliser(at(el, 'class'));
    const estEtat = at(el, 'role') === 'alert'
      || /(^| )(error|erreur|empty|vide)([ -]|$)/.test(classe)
      || normaliser(at(el, 'data-etat')) === 'vide';
    if (BALISES_TEXTE.includes(el.tag) || estEtat) {
      const t = texteDe(el);
      if (t) out.push({ cle: `<${el.tag}${at(el, 'class') ? ' class="' + at(el, 'class') + '"' : ''}>`, texte: t, contexte: marqueurs(el) });
    }
  }
  return out;
}

export function extraire(brut, format) {
  switch (format) {
    case 'json': return extraireJson(brut);
    case 'arb': return extraireArb(brut);
    case 'po': return extrairePo(brut);
    case 'properties': return extraireProperties(brut);
    case 'html': return extraireHtml(brut);
    default: throw new Error(`format non pris en charge : ${format}`);
  }
}

const FORMAT_PAR_EXTENSION = {
  '.json': 'json', '.arb': 'arb', '.po': 'po', '.pot': 'po',
  '.properties': 'properties', '.html': 'html', '.htm': 'html',
};

// ── Point d'entrée ──────────────────────────────────────────────────────────
// Garde d'entrée : importé comme module, ce fichier n'exécute rien — sinon il ne serait
// pas testable unitairement (même doctrine qu'oracle-coherence-promesse).
const EST_POINT_D_ENTREE = process.argv[1] && path.basename(process.argv[1]) === 'oracle-textes-application.mjs';
const args = EST_POINT_D_ENTREE ? process.argv.slice(2) : ['--module'];

if (args.includes('--self-test')) {
  let pass = 0, fail = 0;
  const check = (nom, fn) => {
    try { fn(); console.log(`  [PASS] ${nom}`); pass++; }
    catch (e) { console.error(`  [FAIL] ${nom} — ${e.message}`); fail++; }
  };
  const regles = r => new Set(r.findings.map(f => f.regle));
  const durs = r => r.findings.filter(f => f.sev === 'bloquant');
  const un = (cle, texte) => juger([{ cle, texte }]);

  // ── Les trois chaînes ROUGES du mandat, une par une ───────────────────────
  check('ROUGE — « Une erreur est survenue » : T4-1 bloquant (ni cause, ni réparation)', () => {
    const r = un('erreur.generique', 'Une erreur est survenue');
    if (!durs(r).some(f => f.regle === 'T4-1')) throw new Error(JSON.stringify(r.findings));
  });
  check('ROUGE — « Aucune donnée » : T4-2 bloquant (aucun verbe d\'action)', () => {
    const r = un('liste.message', 'Aucune donnée');
    if (!durs(r).some(f => f.regle === 'T4-2')) throw new Error(JSON.stringify(r.findings));
  });
  check('ROUGE — « Valider » : T4-3 avertissement, jamais bloquant', () => {
    const r = un('form.submit', 'Valider');
    if (!regles(r).has('T4-3')) throw new Error('libellé générique non vu');
    if (durs(r).length) throw new Error('T4-3 remonté en bloquant — le mandat en fait un avertissement');
  });
  check("ROUGE — « Oups, une erreur est survenue » : T4-4 en plus de T4-1", () => {
    const r = un('erreur.envoi', 'Oups, une erreur est survenue.');
    if (!regles(r).has('T4-4')) throw new Error('excuse non vue');
  });

  // ── Les trois chaînes VERTES du mandat ────────────────────────────────────
  check('VERTE — « Le fichier dépasse 10 Mo. Compresse-le ou envoie-le en deux fois. » : muet', () => {
    const r = un('erreur.taille_fichier', 'Le fichier dépasse 10 Mo. Compresse-le ou envoie-le en deux fois.');
    if (r.findings.length) throw new Error(JSON.stringify(r.findings));
  });
  check('VERTE — « Aucun dossier pour l\'instant. Crée le premier. » : muet', () => {
    const r = un('dossiers.vide', "Aucun dossier pour l'instant. Crée le premier.");
    if (r.findings.length) throw new Error(JSON.stringify(r.findings));
  });
  check('VERTE — « Enregistrer les modifications » : muet', () => {
    const r = un('form.enregistrer', 'Enregistrer les modifications');
    if (r.findings.length) throw new Error(JSON.stringify(r.findings));
  });

  // ── Bornes — ce qui distingue une règle d'un grep ─────────────────────────
  check('BORNE T4-1 — la cause SEULE est un avertissement, pas un bloquant', () => {
    const r = un('erreur.taille', 'Le fichier dépasse 10 Mo.');
    if (durs(r).length) throw new Error('bloquant alors que la cause est dite');
    if (!regles(r).has('T4-1')) throw new Error('la moitié manquante passe en silence');
  });
  check('BORNE T4-1 — la réparation SEULE est un avertissement, pas un bloquant', () => {
    const r = un('erreur.reseau', 'Réessaye dans un instant.');
    if (durs(r).length) throw new Error('bloquant alors que la réparation est dite');
  });
  check('BORNE T4-3 — « Valider la commande » n\'est PAS générique (comparaison sur la chaîne entière)', () => {
    const r = un('commande.cta', 'Valider la commande');
    if (regles(r).has('T4-3')) throw new Error('sous-chaîne prise pour un libellé nu');
  });
  check('BORNE — une chaîne ordinaire ne déclenche rien (l\'oracle ne crie pas sur tout)', () => {
    const r = un('titre.tableau_de_bord', 'Tableau de bord');
    if (r.findings.length) throw new Error(JSON.stringify(r.findings));
  });
  check('BORNE — précédence : « Aucune erreur détectée » est jugée ERREUR, pas état vide', () => {
    const r = un('controles.resume', 'Aucune erreur détectée');
    if (regles(r).has('T4-2')) throw new Error('un résumé de contrôles accusé de ne pas inviter à agir');
  });
  check('BORNE — la clé seule suffit à classer : clé « error_upload », texte sans le mot', () => {
    const r = un('error_upload', 'Impossible de continuer');
    if (!durs(r).some(f => f.regle === 'T4-1')) throw new Error('la clé n\'a pas servi de signal');
  });
  check('BORNE — « compresse-le » compte : le trait d\'union est une frontière de mot', () => {
    if (!RX_REPARATION.test(normaliser('Compresse-le ou recommence'))) throw new Error('frontière de mot mal posée');
  });
  check('BORNE — une chaîne sans lettre (« — », « 42 ») est ignorée', () => {
    const r = juger([{ cle: 'sep', texte: '—' }, { cle: 'compteur', texte: '42' }]);
    if (r.findings.length) throw new Error(JSON.stringify(r.findings));
  });

  // ── Extraction : un format, un cas, aucune supposition ────────────────────
  check('EXTRACTION json imbriqué — les clés sont aplaties en a.b.c', () => {
    const e = extraireJson('{"ecran":{"liste":{"vide":"Aucune donnée"}}}');
    if (e.length !== 1 || e[0].cle !== 'ecran.liste.vide') throw new Error(JSON.stringify(e));
    if (!juger(e).findings.some(f => f.regle === 'T4-2')) throw new Error('chaîne imbriquée non jugée');
  });
  check('EXTRACTION arb — @@locale ignoré, @cle.description servant de contexte', () => {
    const e = extraireArb('{"@@locale":"fr","vide":"Rien pour le moment","@vide":{"description":"empty state de la liste"}}');
    if (e.length !== 1 || e[0].contexte !== 'empty state de la liste') throw new Error(JSON.stringify(e));
    if (!juger(e).findings.some(f => f.regle === 'T4-2')) throw new Error('le contexte @description n\'a pas servi de signal');
  });
  check('EXTRACTION po — msgstr prime sur msgid, msgctxt sert de clé', () => {
    const e = extrairePo('#. bouton principal\nmsgctxt "form.submit"\nmsgid "Submit"\nmsgstr "Valider"\n');
    if (e.length !== 1 || e[0].texte !== 'Valider' || e[0].cle !== 'form.submit') throw new Error(JSON.stringify(e));
  });
  check('EXTRACTION po — msgstr vide : on juge le msgid, jamais rien', () => {
    const e = extrairePo('msgid "Une erreur est survenue"\nmsgstr ""\n');
    if (e.length !== 1 || e[0].texte !== 'Une erreur est survenue') throw new Error(JSON.stringify(e));
  });
  check('EXTRACTION properties — commentaires, échappements et continuations', () => {
    const e = extraireProperties('# commentaire\nerreur.generique=Une erreur \\\nest survenue\nvide.liste : Aucune donn\\u00e9e\n');
    const par = Object.fromEntries(e.map(x => [x.cle, x.texte]));
    if (par['erreur.generique'] !== 'Une erreur est survenue') throw new Error(JSON.stringify(e));
    if (par['vide.liste'] !== 'Aucune donnée') throw new Error(JSON.stringify(e));
  });
  check('EXTRACTION html — attributs, <button>, role="alert", .empty, [data-etat="vide"]', () => {
    const e = extraireHtml('<div><input placeholder="Nom"><button>Valider</button>'
      + '<p role="alert">Une erreur est survenue</p><div class="empty">Aucune donnée</div>'
      + '<section data-etat="vide">Rien ici</section></div>');
    const textes = e.map(x => x.texte);
    for (const attendu of ['Nom', 'Valider', 'Une erreur est survenue', 'Aucune donnée', 'Rien ici'])
      if (!textes.includes(attendu)) throw new Error(`« ${attendu} » non extrait : ${JSON.stringify(textes)}`);
    const r = juger(e);
    for (const regle of ['T4-1', 'T4-2', 'T4-3'])
      if (!regles(r).has(regle)) throw new Error(`${regle} muet sur un HTML qui le porte`);
  });
  check('EXTRACTION html — le contenu d\'un <script> n\'est pas pris pour un texte d\'application', () => {
    const e = extraireHtml('<script>const erreur = "Une erreur est survenue";</script><p>ok</p>');
    if (e.some(x => /erreur/i.test(x.texte))) throw new Error(JSON.stringify(e));
  });

  // ── Les deux fixtures de dépôt, aux deux sens ─────────────────────────────
  const fx = n => path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', n);
  check('FIXTURE rouge — les quatre règles se déclenchent, verdict FAIL', () => {
    const e = extraireJson(fs.readFileSync(fx('textes-application-rouge.json'), 'utf8'));
    const r = juger(e);
    const vues = regles(r);
    const manquantes = ['T4-1', 'T4-2', 'T4-3', 'T4-4'].filter(x => !vues.has(x));
    if (manquantes.length) throw new Error('règles muettes : ' + manquantes.join(', '));
    if (!durs(r).length) throw new Error('aucune règle bloquante — la rouge ne sait pas échouer');
  });
  check('FIXTURE verte — aucun constat, verdict PASS', () => {
    const e = extraireJson(fs.readFileSync(fx('textes-application-verte.json'), 'utf8'));
    const r = juger(e);
    if (r.findings.length) throw new Error(JSON.stringify(r.findings));
  });

  console.log(`\nTextes d'application (T4-1…T4-4) : ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}

if (EST_POINT_D_ENTREE) {
  const jsonOnly = args.includes('--json-only');
  const opt = n => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
  const file = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--format');

  const NON_JUGE = [
    "la JUSTESSE du ton et la fidélité à la voix de marque — non décidable par script (voix.md) : cet oracle juge la PRÉSENCE d'une cause, d'une réparation et d'une action, jamais leur pertinence ni leur élégance. Un plancher franchi n'est pas une voix trouvée",
    "les chaînes NON EXTRAITES — texte construit par concaténation ou interpolation, chaînes restées dans le code applicatif, contenu rendu par un <script src=\"…\"> ou un framework, libellés venus d'une API : ce qui n'est pas dans le fichier lu n'est pas jugé, et l'absence de constat ne vaut pas conformité du produit",
    "la LANGUE du fichier — les listes de verbes et d'indices sont françaises ; sur un fichier en anglais ou dans une autre langue, l'oracle ne voit ni réparation ni action et le dirait à tort : le classer en non_juge plutôt que le croire",
    'la CONSTANCE des libellés entre écrans (même geste, même mot) — elle se vérifie à la relecture et reste au contrat de voix',
    "les formes ICU (pluriels, genres, variables) : la variante rendue à l'utilisateur dépend de la donnée, pas du fichier",
  ];

  const sortir = (verdict, findings, code) => {
    process.stdout.write(JSON.stringify({
      oracle: 'oracle-textes-application', domaine: DOM, artefact: file || null,
      verdict,
      findings: findings && findings.length ? findings
        : [{ sev: 'info', regle: '—', msg: 'T4-1…T4-4 sans écart', where: file || null }],
      non_juge: NON_JUGE,
    }, null, jsonOnly ? 0 : 2));
    process.exit(code);
  };

  if (!file || !fs.existsSync(file)) {
    NON_JUGE.push(`fichier de chaînes absent ou non fourni${file ? ` : ${file}` : ''} — rien n'a été lu, donc rien n'est jugé`);
    sortir('SKIP', [], 2);
  }

  const format = opt('--format') || FORMAT_PAR_EXTENSION[path.extname(file).toLowerCase()];
  if (!format) {
    NON_JUGE.push(`extension « ${path.extname(file) || '(aucune)'} » non reconnue — formats lus : .json, .arb, .po, .properties, .html ; forcer avec --format`);
    sortir('SKIP', [], 2);
  }

  const brut = fs.readFileSync(file, 'utf8');
  let entrees;
  try {
    entrees = extraire(brut, format);
  } catch (e) {
    NON_JUGE.push(`fichier illisible au format « ${format} » : ${e.message}`);
    sortir('SKIP', [], 2);
  }

  if (!entrees.length) {
    NON_JUGE.push(`aucune chaîne extraite de ${path.basename(file)} au format « ${format} » — un fichier muet ne prouve rien`);
    sortir('SKIP', [], 2);
  }

  // Localisation : la clé, et la ligne quand le texte se retrouve tel quel dans le brut.
  for (const e of entrees) {
    const l = ligneDe(brut, e.texte);
    e.ou = `${file}${l ? ':' + l : ''} · ${e.cle}`;
  }

  const { findings, compte } = juger(entrees);
  NON_JUGE.push(`périmètre effectivement lu : ${compte.total} chaîne(s), dont ${compte.erreurs} classée(s) « erreur » `
    + `et ${compte.vides} « état vide » — les autres ne sont jugées que par T4-3 (libellé générique)`);

  if (!jsonOnly) {
    for (const f of findings) process.stderr.write(`  ${f.sev === 'bloquant' ? 'DUR ' : 'AVERT'} ${f.regle} — ${f.msg} [${f.where}]\n`);
    process.stderr.write(`  ${compte.total} chaîne(s) lue(s) · ${findings.filter(f => f.sev === 'bloquant').length} bloquant(s), `
      + `${findings.filter(f => f.sev === 'avertissement').length} avertissement(s)\n`);
  }

  const durs = findings.filter(f => f.sev === 'bloquant').length;
  sortir(durs ? 'FAIL' : 'PASS', findings, durs ? 1 : 0);
}
