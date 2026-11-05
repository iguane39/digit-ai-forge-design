/* saisie-erreurs.js — composant de saisie : une valeur refusée se dit SOUS son champ (TF-2172, lot Produit-86 du 05/11/2026).

   LE FAIT. Une saisie refusée s'affichait en bandeau en tête de page, loin du formulaire, avec un code technique
   en titre (« Refusé : CIBLE_INVALIDE »), sans désigner le champ ni la ligne fautive, avec un exemple générique,
   et seulement à l'envoi. Le champ n'avait ni `aria-invalid` ni message relié. Aucun des 15 juges de
   run-oracles-design ne l'a vu : aucun n'envoie une valeur fausse, aucun ne regarde où tombe l'erreur.
   Le juge est oracle-erreurs-formulaire.mjs ; ce composant est la forme qui le fait passer.

   LE CHOIX. Une seule voie pour dire un refus, la même pour la règle du navigateur (required, type, pattern, min,
   max, minlength, maxlength), pour une règle du produit (SaisieErreurs.regle) et pour un refus du serveur
   (SaisieErreurs.refuser) : le message est posé sous le champ, relié par aria-describedby, le champ est marqué
   aria-invalid, et un résumé à liens se pose en tête du formulaire. La vérification a lieu à la SORTIE du champ
   (« punir tard »), l'erreur s'efface dès que la valeur est corrigée (« récompenser tôt »), et l'envoi est RETENU
   tant qu'un champ est invalide.

   CONTRAT HTML (le composant ne demande que ce que le formulaire dit déjà) :
     <form data-saisie novalidate>
       <div class="champ">
         <label for="domaine">Domaine du client</label>
         <input id="domaine" name="domaine" required pattern="[a-z0-9-]+(\.[a-z0-9-]+)+"
                data-exemple="costcontrol.domaine-du-client.fr">
         <p class="champ-erreur" id="domaine-erreur" hidden></p>   <!-- facultatif : créé s'il manque -->
       </div>
       <div data-resume-erreurs hidden></div>                          <!-- facultatif : créé en tête s'il manque -->
       <button type="submit">Enregistrer</button>
     </form>

   RÈGLES DU PRODUIT : `SaisieErreurs.regle('domaine', function (valeur, champ) { return null | 'message'; })`, puis
   `data-regle="domaine"` sur le champ (plusieurs noms séparés par une espace). Le message REPREND la saisie et DONNE
   la forme attendue : « « costcontrol » n'est pas un domaine complet. Écris-le avec son extension : costcontrol.domaine-du-client.fr. »
   REFUS DU SERVEUR : `SaisieErreurs.refuser(form, { domaine: 'message', … })` pose chaque message sous son champ,
   par `name`, et le résumé ; un nom inconnu est ajouté au résumé seul, jamais perdu.

   Sans `data-exemple`, le message natif donne une forme déduite du type (courriel, URL) ou, à défaut, l'attribut `title`
   du champ (la convention HTML de l'aide d'un pattern). Un champ sans aucune forme à donner reçoit un message qui
   reprend la saisie seule : le juge le signale en avertissement, il ne fabrique pas d'exemple.

   LIMITES DITES : une règle qui n'existe que côté serveur ne se vérifie qu'à l'envoi (SaisieErreurs.refuser) ; le
   composant ne remplace pas la garde serveur. L'annonce vocale d'une erreur à la sortie du champ passe par la région
   aria-live du message ; le résumé reçoit le focus à l'envoi fautif et ses liens ramènent au champ. */
(function (racine) {
  'use strict';

  var regles = {};
  var compteur = 0;

  function identifiant(champ) {
    if (!champ.id) { compteur += 1; champ.id = 'saisie-' + compteur; }
    return champ.id;
  }

  function libelle(champ) {
    var etiquette = champ.id ? document.querySelector('label[for="' + champ.id + '"]') : null;
    var texte = (etiquette && etiquette.textContent) || champ.getAttribute('aria-label') || champ.name || 'ce champ';
    return texte.replace(/\s+/g, ' ').replace(/\s*[:*]\s*$/, '').trim();
  }

  function forme(champ) {
    var exemple = champ.getAttribute('data-exemple');
    if (exemple) return exemple;
    if (champ.type === 'email') return 'nom@domaine.fr';
    if (champ.type === 'url') return 'https://exemple.fr';
    return champ.getAttribute('title') || '';
  }

  function avecForme(message, champ) {
    var f = forme(champ);
    return f ? message + ' Forme attendue : ' + f + '.' : message;
  }

  /* Le message du navigateur, refait en français : il reprend la saisie et donne la forme attendue. */
  function messageNatif(champ) {
    var v = champ.validity;
    var nom = '« ' + libelle(champ) + ' »';
    var saisie = champ.value;
    if (v.valueMissing) return avecForme(nom + ' est obligatoire : renseigne une valeur.', champ);
    if (v.typeMismatch) return avecForme('« ' + saisie + ' » n\'est pas une valeur valide pour ' + nom + '.', champ);
    if (v.patternMismatch) return avecForme('« ' + saisie + ' » ne respecte pas la forme demandée pour ' + nom + '.', champ);
    if (v.tooShort) return '« ' + saisie + ' » est trop court pour ' + nom + ' : ' + champ.minLength + ' caractères au moins.';
    if (v.tooLong) return '« ' + saisie + ' » est trop long pour ' + nom + ' : ' + champ.maxLength + ' caractères au plus.';
    if (v.rangeUnderflow) return '« ' + saisie + ' » est trop petit pour ' + nom + ' : ' + champ.min + ' au moins.';
    if (v.rangeOverflow) return '« ' + saisie + ' » est trop grand pour ' + nom + ' : ' + champ.max + ' au plus.';
    if (v.stepMismatch) return '« ' + saisie + ' » n\'est pas un pas permis pour ' + nom + '.';
    if (v.badInput) return '« ' + saisie + ' » ne se lit pas comme une valeur pour ' + nom + '.';
    return '';
  }

  function message(champ) {
    var noms = (champ.getAttribute('data-regle') || '').split(/\s+/).filter(Boolean);
    for (var i = 0; i < noms.length; i++) {
      var regle = regles[noms[i]];
      if (!regle) continue;
      var texte = regle(champ.value, champ);
      if (texte) return String(texte);
    }
    if (champ.validity && !champ.validity.valid) return messageNatif(champ);
    return '';
  }

  function zoneErreur(champ) {
    var id = identifiant(champ) + '-erreur';
    var zone = document.getElementById(id);
    if (zone) return zone;
    zone = document.createElement('p');
    zone.id = id;
    zone.className = 'champ-erreur';
    zone.hidden = true;
    zone.setAttribute('aria-live', 'polite');
    champ.insertAdjacentElement('afterend', zone);
    return zone;
  }

  function relier(champ, id, oui) {
    var liste = (champ.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    var present = liste.indexOf(id) !== -1;
    if (oui && !present) liste.push(id);
    if (!oui && present) liste.splice(liste.indexOf(id), 1);
    if (liste.length) champ.setAttribute('aria-describedby', liste.join(' '));
    else champ.removeAttribute('aria-describedby');
  }

  function afficher(champ, texte) {
    var zone = zoneErreur(champ);
    if (texte) {
      zone.textContent = texte;
      zone.hidden = false;
      champ.setAttribute('aria-invalid', 'true');
      relier(champ, zone.id, true);
    } else {
      zone.textContent = '';
      zone.hidden = true;
      champ.removeAttribute('aria-invalid');
      relier(champ, zone.id, false);
    }
  }

  function champsDe(form) {
    return Array.prototype.filter.call(form.elements, function (c) {
      return c.name && !c.disabled && !/^(hidden|submit|button|reset|image|file)$/.test(c.type);
    });
  }

  function resume(form) {
    var zone = form.querySelector('[data-resume-erreurs]');
    if (zone) return zone;
    zone = document.createElement('div');
    zone.setAttribute('data-resume-erreurs', '');
    zone.className = 'resume-erreurs';
    zone.hidden = true;
    form.insertBefore(zone, form.firstChild);
    return zone;
  }

  function composerResume(form, entrees) {
    var zone = resume(form);
    zone.setAttribute('tabindex', '-1');
    zone.setAttribute('role', 'alert');
    zone.textContent = '';
    if (!entrees.length) { zone.hidden = true; return zone; }
    var titre = document.createElement('p');
    titre.className = 'resume-erreurs-titre';
    titre.textContent = entrees.length === 1 ? '1 champ à corriger' : entrees.length + ' champs à corriger';
    var liste = document.createElement('ul');
    entrees.forEach(function (e) {
      var item = document.createElement('li');
      if (e.champ) {
        var lien = document.createElement('a');
        lien.href = '#' + e.champ.id;
        lien.textContent = e.texte;
        lien.addEventListener('click', function (ev) { ev.preventDefault(); e.champ.focus(); });
        item.appendChild(lien);
      } else {
        item.textContent = e.texte;
      }
      liste.appendChild(item);
    });
    zone.appendChild(titre);
    zone.appendChild(liste);
    zone.hidden = false;
    return zone;
  }

  function verifier(champ) { var t = message(champ); afficher(champ, t); return t; }

  function verifierTout(form) {
    var entrees = [];
    champsDe(form).forEach(function (c) { var t = verifier(c); if (t) entrees.push({ champ: c, texte: t }); });
    return entrees;
  }

  function init(form) {
    if (form.__saisieErreurs) return;
    form.__saisieErreurs = true;
    form.setAttribute('novalidate', '');
    form.addEventListener('focusout', function (e) {
      if (e.target && form.contains(e.target) && champsDe(form).indexOf(e.target) !== -1) verifier(e.target);
    });
    form.addEventListener('input', function (e) {
      var c = e.target;
      if (c && c.getAttribute && c.getAttribute('aria-invalid') === 'true') verifier(c);
    });
    form.addEventListener('submit', function (e) {
      var entrees = verifierTout(form);
      if (!entrees.length) { composerResume(form, []); return; }
      e.preventDefault();
      e.stopImmediatePropagation();
      composerResume(form, entrees).focus();
    }, true);
  }

  function refuser(form, parChamp) {
    var entrees = [];
    var champs = champsDe(form);
    Object.keys(parChamp || {}).forEach(function (nom) {
      var c = champs.filter(function (x) { return x.name === nom; })[0];
      if (c) { afficher(c, parChamp[nom]); entrees.push({ champ: c, texte: parChamp[nom] }); }
      else entrees.push({ champ: null, texte: parChamp[nom] });
    });
    if (entrees.length) composerResume(form, entrees).focus();
  }

  var API = {
    regle: function (nom, fonction) { regles[nom] = fonction; },
    init: init,
    verifier: verifier,
    refuser: refuser,
  };
  racine.SaisieErreurs = API;

  function demarrer() {
    Array.prototype.forEach.call(document.querySelectorAll('form[data-saisie]'), init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})(window);
