// lib/fluidite.mjs — la mesure de fluidité d'une page animée, et son jugement (D-108 (b), 29/10/2026).
//
// LE FAIT. Chez un produit (visite 3D animée), l'oracle de fluidité a rendu PASS à « 60 images par
// seconde » le 27/10 ; la mesure réelle du 28/10 donnait 3,3 images par seconde. Il comptait les
// rappels de `requestAnimationFrame` sans attendre le travail du processeur graphique : le navigateur
// rappelle l'animation à la cadence de l'écran même quand la carte, derrière, met 300 ms à peindre
// une image. Mesuré à la rédaction de ce fichier, sur une page à shader coûteux : 241 rappels en
// 4 s (60,0 i/s) pour 29 images réellement terminées (7,2 i/s), puis 7 images (1,7 i/s) avec un
// shader quatre fois plus lourd. Un compteur de rappels mesure la boucle JavaScript, jamais la carte.
// (Ce piège n'est pas déterministe : le 29/10/2026 sur le même poste, le compteur de rappels a annoncé 60 i/s
// à cinq reprises en début de séance, puis 4,7 à 6,6 i/s à quatre reprises plus tard — le navigateur freine
// parfois les rappels quand la carte est en retard, selon le moteur et l'état du poste. Un compteur qui ne
// se trompe que certains jours est une raison de plus de ne pas s'y fier : la mesure de bout en bout, elle,
// donne ~6,5 i/s à chaque passage.)
//
// LA DOCTRINE, tenue ici en trois lieux :
//   1. la MESURE attend la fin du travail graphique de CHAQUE image : après le rappel de la page, la
//      lecture d'un pixel du canevas (`readPixels`, lecture synchronisante). La durée d'une image est
//      donc celle du travail de la page ET de la carte, de bout en bout. `gl.finish()` SEUL NE SUFFIT
//      PAS : mesuré sur Chromium 145, il rend la main en 0 ms alors que 256 passes de dessin sont encore
//      en file (le navigateur le traite comme un simple envoi) — seule la lecture oblige à attendre ;
//   2. le JUGEMENT refuse de rendre PASS sur une mesure qui n'a pas attendu : sans synchronisation,
//      sans contexte WebGL, sans image, c'est SKIP motivé — jamais PASS ;
//   3. le SEUIL est dit avec la mesure : le verdict cite l'image par seconde mesurée et le moteur de
//      rendu qui l'a produite (un rendu logiciel majore la durée d'un vrai processeur graphique).
//
// Ce module est pur : il ne lance aucun navigateur. `oracle-fluidite.mjs` l'emploie avec le pilote
// `lib/mesure_fluidite.py` ; la recette (`self-test.mjs`) le joue sur des mesures brutes écrites à la
// main, sans navigateur, pour fixer chaque branche du jugement.

// Seuils. CHOIX DE CETTE FORGE, non rapportés à une norme citée : 60 i/s est la cadence d'un écran
// courant, 30 i/s le plancher retenu ici (le cas mesuré chez le produit : 3,3 i/s, dix fois sous le
// plancher). 30 i/s est ce qui rend FAIL, 60 la cible : entre les deux, la cadence est dite sans
// rougir la page — une page plafonnée à 30 i/s n'est pas un défaut bloquant. Les seuils sont
// rendus dans la sortie de l'oracle (`mesures.seuils`) ; les changer est une décision humaine.
export const SEUILS = {
  fpsMin: 30,             // en dessous : F1, bloquant
  fpsCible: 55,           // en dessous (et au-dessus de fpsMin) : F3, avertissement
  p95PeriodeMaxMs: 50,    // 5 % des images plus lentes que 20 i/s : F2, avertissement (saccades)
  fenetreMinMs: 1000,     // en dessous de cette fenêtre de mesure, aucun verdict de cadence
  echauffementMs: 1500,   // compilation des shaders, première peinture : écartés de la mesure
  fenetreMs: 4000,        // durée de la mesure proprement dite
};

// Moteurs de rendu logiciels : la durée mesurée est celle du processeur central du poste.
export const RENDU_LOGICIEL = /swiftshader|llvmpipe|softpipe|software|basic render|warp/i;

// Script posé AVANT tout script de la page (Playwright `add_init_script`). Il ne modifie pas le
// livrable : il vit dans la session de mesure seulement. Il capte les contextes WebGL à leur création
// et enveloppe `requestAnimationFrame` pour fermer chaque image par une synchronisation.
//   mode `bout_en_bout` : la fin de l'image attend le travail graphique (lecture d'un pixel, readPixels) ;
//   mode `naif`         : AUCUNE attente — c'est l'ancienne mesure, gardée seulement comme TÉMOIN de la
//                         recette (`--temoin-naif`) pour montrer ce qu'elle aurait annoncé. Elle ne
//                         fonde jamais un verdict : `jugerFluidite` la refuse.
export const SCRIPT_MESURE = String.raw`(() => {
  if (window.__forgeFluidite) return;
  const contextes = new Set();
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    const ctx = getContext.apply(this, arguments);
    if (ctx && /webgl/i.test(String(type))) contextes.add(ctx);
    return ctx;
  };
  const raf = window.requestAnimationFrame.bind(window);
  const pixel = new Uint8Array(4);
  const etat = window.__forgeFluidite = { mode: 'bout_en_bout', actif: false, images: [], erreursSync: 0 };
  window.requestAnimationFrame = function (rappel) {
    return raf(function (horodatage) {
      const debut = performance.now();
      try { rappel(horodatage); }
      finally {
        let synchronise = 0;
        if (etat.mode === 'bout_en_bout') {
          for (const gl of contextes) {
            try { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); synchronise = 1; } catch (e) { etat.erreursSync++; }
          }
        }
        if (etat.actif) etat.images.push([debut, performance.now(), synchronise]);
      }
    });
  };
  etat.armer = (mode) => { etat.mode = mode; };
  etat.demarrer = () => { etat.images = []; etat.erreursSync = 0; etat.actif = true; };
  etat.arreter = () => {
    etat.actif = false;
    const premier = contextes.values().next().value || null;
    let rendu = null;
    if (premier) {
      try {
        const ext = premier.getExtension('WEBGL_debug_renderer_info');
        rendu = String(ext ? premier.getParameter(ext.UNMASKED_RENDERER_WEBGL) : premier.getParameter(premier.RENDERER));
      } catch (e) { rendu = null; }
    }
    return {
      mode: etat.mode, contextes: contextes.size, images: etat.images, erreurs_sync: etat.erreursSync,
      contexte_perdu: [...contextes].some((gl) => { try { return gl.isContextLost(); } catch (e) { return true; } }),
      rendu_gl: rendu,
    };
  };
})();`;

const mediane = (t) => { const s = [...t].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const percentile = (t, p) => { const s = [...t].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const arrondi = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

/**
 * Juge une mesure brute (la forme rendue par `etat.arreter()` du script ci-dessus, plus `erreur` si le
 * pilote a échoué). Rend { verdict: 'PASS'|'FAIL'|'SKIP', findings[], motif (si SKIP), mesures }.
 *
 * Toute branche qui n'a pas une durée d'image MESURÉE de bout en bout rend SKIP. PASS n'a qu'une
 * porte : des images toutes synchronisées, sur une fenêtre assez longue, au-dessus du plancher.
 */
export function jugerFluidite(brut, seuils = SEUILS) {
  const findings = [];
  const skip = (motif, mesures = {}) => ({
    verdict: 'SKIP', motif, mesures,
    findings: [{ sev: 'info', regle: 'F0', msg: `SKIP — ${motif}` }],
  });

  if (!brut) return skip('aucune mesure reçue du pilote de rendu');
  if (brut.erreur) return skip(`mesure impossible : ${brut.erreur}`);
  if (!brut.contextes) {
    return skip('aucun contexte WebGL créé par la page : le travail graphique ne peut pas être attendu, '
      + 'et un compte de rappels d\'animation ne vaut pas une durée d\'image (ancienne mesure, D-108 (b))');
  }
  if (brut.contexte_perdu) {
    return skip('contexte WebGL perdu pendant la mesure (travail graphique trop long pour le pilote, ou carte '
      + 'réinitialisée) : la durée mesurée n\'est pas fiable — à rejouer, un contexte perdu n\'est pas un PASS');
  }
  const images = Array.isArray(brut.images) ? brut.images : [];
  if (brut.mode !== 'bout_en_bout') {
    return skip(`mesure prise en mode « ${brut.mode} » : la fin de chaque image n'a pas attendu le travail `
      + 'graphique — c\'est l\'ancienne mesure (compte de rappels), qui annonçait 60 i/s pour 3,3 i/s réelles. '
      + 'Elle ne peut pas fonder un verdict');
  }
  if (images.length === 0) {
    return skip('aucune image animée dans la fenêtre de mesure (requestAnimationFrame jamais rappelé) : '
      + 'rien à mesurer, scène fixe ou animation déclenchée par un geste que cet oracle ne joue pas');
  }
  if (images.length === 1) {
    return skip('une seule image dans la fenêtre de mesure : pas d\'animation continue, aucune durée entre deux images');
  }
  const nonSync = images.filter((i) => !i[2]).length;
  if (nonSync > 0) {
    return skip(`${nonSync} image(s) sur ${images.length} sans synchronisation sur le travail graphique `
      + `(${brut.erreurs_sync || 0} erreur(s) de lecture du canevas) : la durée ne serait pas de bout en bout`);
  }

  const debuts = images.map((i) => i[0]);
  const periodes = debuts.slice(1).map((d, k) => d - debuts[k]);
  const fenetre = debuts[debuts.length - 1] - debuts[0];
  const mesures = {
    images: images.length, fenetre_ms: arrondi(fenetre, 0),
    fps: arrondi(((images.length - 1) / fenetre) * 1000),
    periode_mediane_ms: arrondi(mediane(periodes)), periode_p95_ms: arrondi(percentile(periodes, 0.95)),
    periode_max_ms: arrondi(Math.max(...periodes)),
    travail_median_ms: arrondi(mediane(images.map((i) => i[1] - i[0]))),
    rendu_gl: brut.rendu_gl || null,
    rendu_logiciel: RENDU_LOGICIEL.test(brut.rendu_gl || ''),
    seuils: { fps_min: seuils.fpsMin, fps_cible: seuils.fpsCible, p95_periode_max_ms: seuils.p95PeriodeMaxMs },
  };
  if (fenetre < seuils.fenetreMinMs) {
    return skip(`fenêtre de mesure de ${mesures.fenetre_ms} ms pour ${seuils.fenetreMinMs} ms au moins : `
      + 'trop courte pour fonder une cadence', mesures);
  }

  const moteur = mesures.rendu_gl ? ` — moteur de rendu : ${mesures.rendu_gl}` : '';
  const logiciel = mesures.rendu_logiciel
    ? ' ATTENTION : rendu LOGICIEL (pas de processeur graphique sur ce poste) — la durée majore celle d\'une vraie carte ; '
      + 'à confirmer sur une machine à processeur graphique avant de refondre le rendu'
    : '';
  const detail = `${mesures.fps} i/s sur ${mesures.images} images en ${mesures.fenetre_ms} ms, durée d'image médiane `
    + `${mesures.periode_mediane_ms} ms, 95e centile ${mesures.periode_p95_ms} ms, pire ${mesures.periode_max_ms} ms `
    + '(chaque image attend la fin du travail graphique : lecture d\'un pixel du canevas)';

  if (mesures.fps < seuils.fpsMin) {
    findings.push({
      sev: 'bloquant', regle: 'F1',
      msg: `animation saccadée : ${detail}, pour ${seuils.fpsMin} i/s au moins${moteur}.${logiciel} `
        + 'Alléger le travail par image (coût du shader, résolution du canevas, nombre de passes, ombres, post-traitement), '
        + 'puis rejouer — un compte de rappels d\'animation ne prouve pas la fluidité',
      where: 'canevas WebGL',
    });
  } else {
    findings.push({ sev: 'info', regle: 'F0', msg: `cadence mesurée de bout en bout : ${detail}${moteur}`, where: 'canevas WebGL' });
    if (mesures.fps < seuils.fpsCible) {
      findings.push({
        sev: 'avertissement', regle: 'F3',
        msg: `${mesures.fps} i/s : au-dessus du plancher de ${seuils.fpsMin} i/s mais sous la cadence d'écran (${seuils.fpsCible} i/s visés)${logiciel}`,
        where: 'canevas WebGL',
      });
    }
    if (mesures.periode_p95_ms > seuils.p95PeriodeMaxMs) {
      findings.push({
        sev: 'avertissement', regle: 'F2',
        msg: `saccades : 5 % des images durent plus de ${mesures.periode_p95_ms} ms (limite ${seuils.p95PeriodeMaxMs} ms, soit 20 i/s) alors que la cadence moyenne est de ${mesures.fps} i/s`,
        where: 'canevas WebGL',
      });
    }
  }
  const dur = findings.some((f) => f.sev === 'bloquant');
  return { verdict: dur ? 'FAIL' : 'PASS', findings, mesures };
}
