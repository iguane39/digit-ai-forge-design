#!/usr/bin/env node
// oracle-erreurs-formulaire — Domaine « Formulaire : une saisie refusée se dit sous son champ » (rendu, TF-2172).
//
// LE FAIT (lot Produit-86 du 05/11/2026, demande du porteur). Une saisie refusée s'affichait en bandeau en tête de
// page, loin du formulaire, avec un code technique en titre (« Refusé : CIBLE_INVALIDE »), sans désigner le champ ni la
// ligne fautive, avec un exemple générique, et seulement à l'envoi. Le champ n'avait ni `aria-invalid` ni message
// relié. Les 15 juges de `run-oracles-design` avaient rendu PASS sur ces écrans le 04/11 : aucun n'envoie une valeur
// fausse, aucun ne regarde où tombe l'erreur. Cet oracle le fait, sur l'écran RENDU (de préférence l'instance servie).
//
// CE QU'IL FAIT. Pour chaque champ éprouvable d'un formulaire visible, sur un chargement neuf : il saisit une valeur
// FAUSSE, quitte le champ, puis tente l'envoi, et mesure où et comment le refus se dit.
//   EF0  cible jugeable : réponse HTTP < 400, pas de redirection (connexion), au moins un champ éprouvable ;
//        sans champ éprouvable ou sans écran jugé ⇒ SKIP, jamais PASS (un vert sans objet n'est pas un vert)
//   EF1  champ DÉSIGNÉ — après la valeur fausse, le champ porte `aria-invalid="true"` ET un message neuf, visible, relié par
//        `aria-describedby` ou `aria-errormessage`. Un refus affiché ailleurs (bandeau, alerte) sans champ désigné est
//        BLOQUANT ; le texte du bandeau est cité. Message relié sans `aria-invalid` : majeur
//   EF2  message PRÈS du champ et dans la fenêtre — à 120 px au plus du champ (`--proximite`), dans la fenêtre : majeur
//   EF3  message qui REPREND la saisie ou DONNE la forme attendue — « « costcontrol » n'est pas un domaine complet.
//        Écris-le ainsi : costcontrol.domaine-du-client.fr ». Un message court qui ne fait ni l'un ni l'autre est majeur ;
//        un message long dont aucune formulation n'est reconnue est un avertissement (la classe des formulations est ouverte)
//   EF4  envoi RETENU — une requête d'écriture (POST, PUT, PATCH, DELETE) ou une navigation part malgré la valeur
//        fausse : bloquant. Les requêtes d'écriture sont interceptées et refusées : rien n'est créé chez l'instance
//   EF5  vérification à la SORTIE du champ — le message n'apparaît qu'à l'envoi, pas à la sortie du champ : avertissement
//
// LA VALEUR FAUSSE vient du champ lui-même, jamais devinée au hasard : `data-valeur-fausse="…"` (déclarée par le produit,
// y compris vide), sinon dérivée des contraintes natives — `pattern` (une valeur qui ne le satisfait pas), `type=email` /
// `url`, `min` / `max`, `minlength`, `required` (vide). Un champ sans contrainte ni déclaration n'est pas éprouvé, et le
// non_juge le liste. Sont éprouvés les champs de texte, nombre, courriel, URL, téléphone, mot de passe, recherche et
// les zones de texte, 12 par écran au plus (la borne se dit).
//
// LE COMPOSANT QUI LE FAIT PASSER : `corpus/composants/saisie-erreurs.js` et `.css` (TF-2172) — erreur sous le champ,
// aria-invalid, aria-describedby, résumé d'erreurs à liens, vérification à la sortie du champ, envoi retenu.
//
// Contrat : JSON {oracle,domaine,artefact,verdict,findings[],non_juge[],champs_eprouves,mesures[]} · exit 0/1/2.
// Usage : node oracle-erreurs-formulaire.mjs <fichier.html|url> [<autre cible>…] [--largeur N] [--hauteur-ecran N]
//           [--etat-connexion etat.json] [--proximite px] [--attente ms] [--accepter-certificat-local] [--json-only]

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { detecterOutillageRendu } from './lib/rendu.mjs';
import { lireGrille } from './lib/grille.mjs';

const DOM = 'Formulaire : une saisie refusée se dit sous son champ';
const ici = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json-only');
const AVEC_VALEUR = ['--largeur', '--hauteur-ecran', '--etat-connexion', '--proximite', '--attente'];
const opt = n => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const cibles = args.filter((a, i) => !a.startsWith('--') && !AVEC_VALEUR.includes(args[i - 1]));

const LARGEUR = Number(opt('--largeur')) || lireGrille().largeurConception;
const HAUTEUR = Number(opt('--hauteur-ecran')) || 1080;
const ETAT = opt('--etat-connexion');
const CERT_LOCAL = args.includes('--accepter-certificat-local');
const HOTES_LOCAUX = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const ATTENTE = Number(opt('--attente')) || 600;
const PROXIMITE = Number(opt('--proximite')) || 120;
const MAX_CHAMPS = 12;

const NJ = [
  'la valeur FAUSSE est dérivée des contraintes natives du champ (pattern, type, min, max, minlength, required) ou déclarée par data-valeur-fausse : un champ sans contrainte ni déclaration n\'est pas éprouvé (liste au non_juge), et une règle qui n\'existe que côté serveur n\'est pas jouée',
  'les requêtes d\'ÉCRITURE (POST, PUT, PATCH, DELETE) sont interceptées et refusées pendant l\'épreuve : aucune donnée n\'est créée chez l\'instance, mais un refus venu du serveur n\'est donc jamais observé — le message d\'un refus serveur se juge à la main ou par le composant (SaisieErreurs.refuser)',
  'EF3 lit la PRÉSENCE de la saisie reprise ou d\'une forme attendue (formulations françaises reconnues, liste ouverte) : elle ne juge ni la justesse de l\'exemple, ni la clarté de la cause, ni le ton — voix de marque et lisibilité restent à l\'arbitrage (voix.md)',
  `UNE valeur fausse par champ, un champ à la fois, ${MAX_CHAMPS} champs par écran au plus : les combinaisons de champs, les erreurs croisées entre champs, les listes déroulantes, cases, boutons radio, dates et fichiers ne sont pas éprouvés`,
  'le résumé d\'erreurs à liens est rapporté (mesures[].resume_liens) mais non jugé : il n\'est dû qu\'au-delà d\'un champ fautif, et l\'oracle n\'en fautifie qu\'un à la fois',
];
const F = [];
const add = (sev, regle, msg, where, extra) => F.push({ sev, regle, msg, where, ...(extra || {}) });
const MESURES = [];
let eprouves = 0;

function sortir(verdict, code) {
  process.stdout.write(JSON.stringify({
    oracle: 'oracle-erreurs-formulaire', domaine: DOM, artefact: cibles.join(' ') || null,
    verdict, largeur: LARGEUR, hauteur_ecran: HAUTEUR, proximite_px: PROXIMITE, champs_eprouves: eprouves,
    findings: F.length ? F : [{ sev: 'info', regle: '—', msg: 'EF0–EF5 sans écart', where: cibles.join(' ') }],
    non_juge: NJ, mesures: MESURES,
  }, null, jsonOnly ? 0 : 2));
  process.exit(code);
}

if (!cibles.length) { NJ.push('aucune cible fournie (fichier HTML ou URL http(s))'); sortir('SKIP', 2); }
if (ETAT && !fs.existsSync(ETAT)) { NJ.push(`état de connexion introuvable : ${ETAT}`); sortir('SKIP', 2); }

const urls = [];
for (const c of cibles) {
  if (CERT_LOCAL && /^https:\/\//i.test(c)) {
    let hote = null; try { hote = new URL(c).hostname.toLowerCase(); } catch { /* URL illisible : refusée ci-dessous */ }
    if (!HOTES_LOCAUX.has(hote)) {
      NJ.push(`--accepter-certificat-local REFUSÉ pour ${c} : l'acceptation d'un certificat auto-signé est bornée aux hôtes de boucle locale (localhost, 127.0.0.1, ::1) ; `
        + `hôte « ${hote ?? 'illisible'} » — rien n'a été jugé`);
      sortir('SKIP', 2);
    }
  }
  if (/^https?:\/\//i.test(c)) { urls.push(c); continue; }
  if (!fs.existsSync(c)) { NJ.push(`cible introuvable : ${c}`); sortir('SKIP', 2); }
  urls.push(pathToFileURL(path.resolve(c)).href);
}

const outillage = detecterOutillageRendu();
if (!outillage.python || outillage.manques.some(m => /playwright|python/i.test(m))) {
  NJ.push(`outillage de rendu indisponible : ${outillage.manques.join(' ; ')}`);
  sortir('SKIP', 2);
}

// ── Mesures exécutées DANS la page rendue (sources passées telles quelles au pilote Python) ──
// PLAN : repère les formulaires visibles, leurs champs éprouvables, marque chaque champ (data-forge-champ), et dit la valeur
// fausse retenue. Ne juge rien.
const PLAN = String.raw`(maxChamps) => {
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const TYPES = /^(text|search|email|url|tel|password|number)$/;
  const libelle = (c) => {
    const e = c.id ? document.querySelector('label[for="' + c.id + '"]') : null;
    const parent = c.closest('label');
    const t = (e && e.textContent) || (parent && parent.textContent) || c.getAttribute('aria-label') || c.getAttribute('placeholder') || c.name || '';
    return t.replace(/\s+/g, ' ').replace(/\s*[:*]\s*$/, '').trim().slice(0, 80);
  };
  const compile = (p) => { try { return new RegExp('^(?:' + p + ')$', 'v'); } catch (e) { return null; } };
  const fausse = (c) => {
    if (c.hasAttribute('data-valeur-fausse')) return { v: c.getAttribute('data-valeur-fausse'), source: 'déclarée (data-valeur-fausse)' };
    const pat = c.getAttribute('pattern');
    if (pat) {
      const rx = compile(pat);
      if (rx) {
        for (const cand of ['!', 'x', '?', '0', '@@', 'aaa bbb']) {
          if (!rx.test(cand) && !(c.maxLength > 0 && cand.length > c.maxLength)) return { v: cand, source: 'dérivée (pattern)' };
        }
      }
    }
    if (c.type === 'email') return { v: 'pas-un-courriel', source: 'dérivée (type=email)' };
    if (c.type === 'url') return { v: 'pas-une-url', source: 'dérivée (type=url)' };
    if (c.type === 'number') {
      if (c.min !== '' && !isNaN(Number(c.min))) return { v: String(Number(c.min) - 1), source: 'dérivée (min)' };
      if (c.max !== '' && !isNaN(Number(c.max))) return { v: String(Number(c.max) + 1), source: 'dérivée (max)' };
    }
    if (c.minLength > 1) return { v: 'a', source: 'dérivée (minlength)' };
    if (c.required) return { v: '', source: 'dérivée (required, champ vide)' };
    return null;
  };
  const formulaires = [];
  const nonEprouves = [];
  let n = 0;
  [...document.querySelectorAll('form')].filter(visible).forEach((form, fi) => {
    for (const c of form.elements) {
      if (!c.tagName || !/^(INPUT|TEXTAREA)$/.test(c.tagName)) continue;
      if (c.tagName === 'INPUT' && !TYPES.test(c.type)) continue;
      if (c.disabled || c.readOnly || !visible(c)) continue;
      const f = fausse(c);
      const nom = c.name || c.id || '(sans nom)';
      if (!f) { nonEprouves.push(nom + ' (aucune contrainte ni data-valeur-fausse)'); continue; }
      if (n >= maxChamps) { nonEprouves.push(nom + ' (au-delà de la borne de ' + maxChamps + ' champs)'); continue; }
      const cle = fi + '-' + n;
      c.setAttribute('data-forge-champ', cle);
      formulaires.push({ cle, nom, libelle: libelle(c), type: c.type || 'textarea', valeur: f.v, source: f.source, exemple: c.getAttribute('data-exemple') || '' });
      n++;
    }
  });
  return { champs: formulaires, non_eprouves: nonEprouves };
}`;

// ÉTAT : ce que l'écran dit du champ `cle` — messages reliés, aria-invalid, refus affichés ailleurs, résumé.
// `base` (états avant l'épreuve) distingue un message NEUF d'une aide permanente reliée au même champ.
const ETAT_CHAMP = String.raw`(arg) => {
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const texte = (el) => el.textContent.replace(/\s+/g, ' ').trim();
  const champ = document.querySelector('[data-forge-champ="' + arg.cle + '"]');
  if (!champ) return { absent: true };
  const rc = champ.getBoundingClientRect();
  const ids = ((champ.getAttribute('aria-describedby') || '') + ' ' + (champ.getAttribute('aria-errormessage') || '')).split(/\s+/).filter(Boolean);
  const reliees = [...new Set(ids)].map((id) => document.getElementById(id)).filter(Boolean).map((el) => {
    const r = el.getBoundingClientRect();
    const dy = Math.max(0, r.top - rc.bottom, rc.top - r.bottom);
    const dx = Math.max(0, r.left - rc.right, rc.left - r.right);
    return { id: el.id, texte: texte(el), visible: visible(el), distance: Math.round(Math.hypot(dx, dy)),
      dansFenetre: r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth };
  });
  const base = arg.base || { reliees: {}, orphelines: [] };
  const neuves = reliees.filter((l) => l.visible && l.texte && l.texte !== (base.reliees[l.id] || ''));
  const idsReliees = new Set(ids);
  const orphelines = [...document.querySelectorAll('[role="alert"], [aria-live="assertive"], .error, .erreur, .alert, .alerte, .banner, .bandeau, .toast, [data-erreur]')]
    .filter((el) => !idsReliees.has(el.id) && !el.hasAttribute('data-resume-erreurs') && !el.closest('[data-resume-erreurs]') && visible(el) && texte(el))
    .map((el) => ({ texte: texte(el).slice(0, 140), distance: Math.round(Math.hypot(0, Math.max(0, el.getBoundingClientRect().top - rc.bottom, rc.top - el.getBoundingClientRect().bottom))) }))
    .filter((o) => !base.orphelines.includes(o.texte));
  const resume = document.querySelector('[data-resume-erreurs]');
  const liens = resume && visible(resume) ? [...resume.querySelectorAll('a[href^="#"]')] : [];
  return {
    invalide: champ.getAttribute('aria-invalid') === 'true',
    valeur: champ.value,
    reliees: reliees.map((l) => ({ id: l.id, texte: l.texte })),
    neuves, orphelines,
    resume: { visible: !!(resume && visible(resume)), liens: liens.length, cible_le_champ: liens.some((a) => a.getAttribute('href') === '#' + champ.id) },
    base_reliees: Object.fromEntries(reliees.map((l) => [l.id, l.texte])),
    base_orphelines: orphelines.map((o) => o.texte),
  };
}`;

const r = spawnSync(outillage.python, [path.join(ici, 'lib', 'jouer_erreurs_formulaire.py')], {
  input: JSON.stringify({ cibles: urls, largeur: LARGEUR, hauteur: HAUTEUR, etat: ETAT ? path.resolve(ETAT) : null,
    certificat_local: CERT_LOCAL, attente: ATTENTE, plan: PLAN, etat_champ: ETAT_CHAMP, max_champs: MAX_CHAMPS }),
  encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' }, maxBuffer: 16 * 1024 * 1024, timeout: 600000,
});
let sortie = null;
try { sortie = JSON.parse((r.stdout || '').trim().split(/\r?\n/).pop()); } catch { /* illisible, dit ci-dessous */ }
if (!sortie || !sortie.ok) {
  NJ.push(`rendu impossible : ${(sortie && sortie.erreur) || (r.stderr || '').trim().split(/\r?\n/).pop() || 'sortie du pilote illisible'}`);
  sortir('SKIP', 2);
}

// ── Jugement ───────────────────────────────────────────────────────────────
const sansSlashFinal = u => { try { const x = new URL(u); return x.origin + x.pathname.replace(/\/+$/, ''); } catch { return u; } };
// EF3 — formulations qui donnent une forme attendue (classe OUVERTE : un message long qui n'en reconnaît aucune n'est pas refusé).
const RX_FORME_MOTS = /(par exemple|exemple|ex\.|forme attendue|forme demand[ée]e|format|doit (?:être|contenir|commencer|ressembler|se terminer)|attendu|ressemble|comme |ainsi|de la forme|au lieu de|plut[oô]t)/i;
// Une citation entre guillemets compte si elle porte une minuscule, un point ou un @ : « CIBLE_INVALIDE » est un code, pas une forme.
const RX_FORME_CITATION = /[«"“][^»"”]*[a-z.@][^»"”]*[»"”]/;
const normaliser = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const mots = s => String(s).trim().split(/\s+/).filter(Boolean).length;
let jugees = 0;

for (const res of sortie.resultats) {
  const ou = res.cible.startsWith('file:') ? cibles[urls.indexOf(res.cible)] : res.cible;
  if (res.erreur) {
    const indice = !CERT_LOCAL && /ERR_CERT|SSL|certificate/i.test(res.erreur)
      ? ' — certificat non reconnu : pour une instance LOCALE en TLS auto-signé, --accepter-certificat-local (hôtes de boucle locale seulement)' : '';
    NJ.push(`${ou} : non jugé, chargement en échec (${res.erreur})${indice}`);
    continue;
  }
  if (res.statut && res.statut >= 400) { add('avertissement', 'EF0', `réponse HTTP ${res.statut} : écran non jugé`, ou); continue; }
  if (sansSlashFinal(res.url_finale) !== sansSlashFinal(res.cible)) {
    add('avertissement', 'EF0', `redirigé vers ${res.url_finale} : écran non jugé, la page d'arrivée n'est pas celle demandée (connexion ?) — fournir --etat-connexion`, ou);
    continue;
  }
  const champs = res.champs || [];
  for (const n of res.non_eprouves || []) NJ.push(`${ou} : champ non éprouvé — ${n}`);
  if (!champs.length) { NJ.push(`${ou} : aucun champ éprouvable (aucun formulaire visible, ou aucun champ à contrainte ni à data-valeur-fausse)`); continue; }
  jugees++;
  for (const c of champs) {
    if (c.erreur) { NJ.push(`${ou} : champ « ${c.nom} » non éprouvé (${c.erreur})`); continue; }
    eprouves++;
    const qui = `champ « ${c.libelle || c.nom} »`;
    const saisie = c.valeur === '' ? '(vide)' : `« ${c.valeur} »`;
    const s1 = c.apres_sortie || {}; const s2 = c.apres_envoi || {};
    const neuves1 = s1.neuves || []; const neuves2 = s2.neuves || [];
    const final = neuves1.length ? s1 : s2;
    const msgs = final.neuves || [];
    const invalide = !!(s1.invalide || s2.invalide);
    const orph = [...(s2.orphelines || []), ...(s1.orphelines || [])];
    MESURES.push({ cible: ou, champ: c.nom, valeur_fausse: c.valeur, source: c.source, apres_sortie: neuves1.length > 0, apres_envoi: neuves2.length > 0,
      invalide, message: msgs[0] ? msgs[0].texte : null, distance_px: msgs[0] ? msgs[0].distance : null,
      resume_liens: (s2.resume || {}).liens || 0, resume_vise_le_champ: !!(s2.resume || {}).cible_le_champ,
      requetes_ecriture: c.requetes_ecriture || 0, navigation: !!c.navigation, orphelines: orph.map(o => o.texte).slice(0, 3) });

    // EF1 — champ désigné.
    if (!msgs.length && !invalide) {
      const ailleurs = orph[0]
        ? ` Le refus s'affiche ailleurs : « ${orph[0].texte} », à ${orph[0].distance} px du champ — sans champ désigné ni ligne fautive.`
        : ' Aucun message visible n\'est relié au champ.';
      add('bloquant', 'EF1', `${qui}, valeur fausse ${saisie} (${c.source}) : le champ n'est pas désigné — ni aria-invalid="true", ni message neuf relié par aria-describedby ou aria-errormessage.${ailleurs}`
        + ' Une saisie refusée se dit sous son champ (composant corpus/composants/saisie-erreurs.js)', ou);
    } else if (!msgs.length && invalide) {
      add('bloquant', 'EF1', `${qui}, valeur fausse ${saisie} : le champ est marqué aria-invalid mais aucun message neuf visible ne lui est relié (aria-describedby / aria-errormessage) — la personne ne sait pas pourquoi`, ou);
    } else if (msgs.length && !invalide) {
      add('majeur', 'EF1', `${qui}, valeur fausse ${saisie} : un message est relié au champ mais le champ n'est pas marqué aria-invalid="true" — un lecteur d'écran ne sait pas qu'il est invalide`, ou);
    }

    if (msgs.length) {
      const m = msgs[0];
      // EF2 — près du champ, dans la fenêtre.
      if (m.distance > PROXIMITE || !m.dansFenetre) {
        add('majeur', 'EF2', `${qui} : le message « ${m.texte.slice(0, 90)} » est à ${m.distance} px du champ${m.dansFenetre ? '' : ' et hors de la fenêtre'} pour ${PROXIMITE} px admis — l'erreur se dit près du champ, visible sans défiler`, ou);
      }
      // EF3 — reprend la saisie ou donne la forme attendue.
      const t = normaliser(m.texte);
      const reprend = c.valeur === ''
        ? normaliser(c.libelle || c.nom).split(/[^a-z0-9]+/).filter(x => x.length >= 4).some(x => t.includes(x))
        : (c.valeur.length >= 2 && t.includes(normaliser(c.valeur)));
      const exemple = c.exemple && t.includes(normaliser(c.exemple));
      const forme = RX_FORME_MOTS.test(m.texte) || RX_FORME_CITATION.test(m.texte) || exemple;
      if (!reprend && !forme) {
        if (mots(m.texte) >= 7) {
          add('avertissement', 'EF3', `${qui} : le message « ${m.texte.slice(0, 90)} » ne reprend pas la saisie ${saisie} et aucune formulation de forme attendue n'est reconnue — à relire (la classe des formulations est ouverte)`, ou);
        } else {
          add('majeur', 'EF3', `${qui} : le message « ${m.texte.slice(0, 90)} » ne reprend pas la saisie ${saisie} et ne donne pas la forme attendue (exemple, format) — `
            + 'un refus qui ne dit pas quoi corriger laisse la personne deviner', ou);
        }
      }
    }
    // EF4 — l'envoi est retenu.
    if ((c.requetes_ecriture || 0) > 0 || c.navigation) {
      add('bloquant', 'EF4', `${qui}, valeur fausse ${saisie} : l'envoi PART malgré tout (${c.requetes_ecriture || 0} requête(s) d'écriture${c.navigation ? ', navigation' : ''}, interceptée(s) et refusée(s) par l'oracle) — `
        + 'tant qu\'un champ est invalide, l\'envoi est retenu', ou);
    }
    // EF5 — vérification à la sortie du champ.
    if (!neuves1.length && neuves2.length) {
      add('avertissement', 'EF5', `${qui} : le message n'apparaît qu'à l'envoi, pas à la sortie du champ — vérifier à la sortie (punir tard) et effacer dès la correction (récompenser tôt)`, ou);
    }
  }
}

if (!jugees) { NJ.push('aucun écran jugé avec un champ éprouvable'); F.push({ sev: 'info', regle: 'EF0', msg: 'aucun champ éprouvable : rien n\'a été joué', where: cibles.join(' '), sans_objet: true }); sortir('SKIP', 2); }
if (CERT_LOCAL) {
  const bloques = [...new Set(sortie.resultats.flatMap(x => x.bloques || []))];
  NJ.push('certificat auto-signé accepté pour les hôtes de boucle locale seulement (--accepter-certificat-local)'
    + (bloques.length ? ` ; requête(s) https vers un hôte non local BLOQUÉE(S) : ${bloques.join(', ')}` : ''));
}
if (outillage.via === 'uv') NJ.push(`rendu par l'interpréteur de l'environnement uv du dossier courant (${outillage.python})`);
if (ETAT) NJ.push(`état de connexion chargé : ${ETAT} — l'oracle ne vérifie pas qu'il est encore valide au-delà du constat EF0 de redirection`);

F.sort((a, b) => ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[a.sev] - ({ bloquant: 0, majeur: 1, avertissement: 2, info: 3 })[b.sev]);
const durs = F.filter(f => f.sev === 'bloquant' || f.sev === 'majeur');
if (!jsonOnly) process.stderr.write(durs.length ? `FAIL — ${durs.length} écart(s) dur(s) sur ${eprouves} champ(s) éprouvé(s)\n` : `PASS — ${eprouves} champ(s) éprouvé(s)\n`);
if (durs.length) sortir('FAIL', 1);
sortir('PASS', 0);
