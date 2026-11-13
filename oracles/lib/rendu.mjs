// lib/rendu.mjs — détection de l'outillage de rendu réel externe (digit-ai-page-html
// + quality-oracles), chemins canoniques sous ~/.claude/skills/.
//
// Extrait de run-oracles-design.mjs (option --rendu) pour être réutilisé tel quel
// par oracle-baseline.mjs (TF-0102) : même détection, même comportement SKIP motivé
// si l'outillage manque — jamais d'erreur brute, jamais deux implémentations qui
// pourraient diverger sur ce qui est « disponible ».

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ICI = path.dirname(fileURLToPath(import.meta.url));

/**
 * Interpréteurs candidats SOUS la racine de la forge (TF-2461) : l'environnement virtuel de la forge elle-même, lieu fixe
 * de l'installation. Jamais un dossier qui dépend d'où la commande est lancée.
 */
export function interpreteursSousRacine(racine, plateforme = process.platform) {
  return plateforme === 'win32'
    ? [path.join(racine, '.venv', 'Scripts', 'python.exe')]
    : [path.join(racine, '.venv', 'bin', 'python')];
}

export function detecterOutillageRendu({ env = process.env, racine = env.FORGE_DESIGN_ROOT || path.resolve(ICI, '..', '..') } = {}) {
  const home = os.homedir();
  const renderPage = path.join(home, '.claude', 'skills', 'digit-ai-page-html', 'scripts', 'render_page.py');
  const oracleA11y = path.join(home, '.claude', 'skills', 'quality-oracles', 'scripts', 'oracle-a11y.py');
  const manques = [];
  if (!fs.existsSync(renderPage)) manques.push(`render_page.py introuvable (${renderPage})`);
  if (!fs.existsSync(oracleA11y)) manques.push(`oracle-a11y.py introuvable (${oracleA11y})`);

  const choix = choisirInterpreteur({
    python: (candidat) => {
      const v = spawnSync(candidat, ['--version'], { encoding: 'utf8' });
      if (v.error || v.status !== 0) return { present: false, playwright: false, executable: null };
      // sys.executable : le chemin de l'interpréteur qui a réellement joué, celui que le non_juge nomme.
      const r = spawnSync(candidat, ['-c', 'import sys, playwright; print(sys.executable)'], { encoding: 'utf8' });
      const exe = (r.stdout || '').trim().split(/\r?\n/).pop();
      return { present: true, playwright: !r.error && r.status === 0, executable: !r.error && r.status === 0 && exe ? exe : candidat };
    },
  }, {
    variable: (env.FORGE_DESIGN_PYTHON || '').trim() || null,
    racine: interpreteursSousRacine(racine).filter(c => fs.existsSync(c)),
    racineForge: racine,
  });
  manques.push(...choix.manques);
  return { ok: manques.length === 0, manques, python: choix.python, executable: choix.executable || choix.python, via: choix.via, renderPage, oracleA11y };
}

/**
 * La ligne du non_juge qui nomme l'interpréteur qui a joué le rendu (TF-2461). Un même fichier jugé par deux postes, ou de
 * deux dossiers, doit pouvoir être rapproché : le verdict d'un rendu dépend de l'interpréteur (version de playwright,
 * navigateur installé), et le rapport ne le taisait que pour l'environnement uv.
 */
export function direInterpreteur(outillage) {
  if (!outillage || !outillage.python) return null;
  const lieu = { variable: 'désigné par $FORGE_DESIGN_PYTHON', PATH: 'trouvé dans le PATH', racine: 'trouvé sous la racine de la forge (.venv)' }[outillage.via] || outillage.via;
  return `rendu joué par l'interpréteur ${outillage.executable || outillage.python} (${lieu})`;
}

/**
 * TF-2461 (décision du 12/11/2026, après TF-1674) — LE CHOIX DE L'INTERPRÈTE NE DÉPEND PAS DU DOSSIER D'OÙ L'ON LANCE.
 * TF-1674 avait ouvert `--rendu` aux produits dont playwright vit dans un environnement `uv` en demandant à `uv run python`,
 * DANS LE DOSSIER COURANT, quel interpréteur il désigne : le même fichier et la même commande se rendaient avec un autre
 * interpréteur, ou en SKIP, selon l'endroit du lancement (même défaut que TF-2431 pour la racine). Ordre de recherche :
 *   1. `$FORGE_DESIGN_PYTHON`, choix explicite : s'il est posé et que son interpréteur n'importe pas playwright, c'est un
 *      manque motivé, jamais un autre interpréteur essayé à sa place ;
 *   2. `python` puis `python3` du PATH avec playwright ;
 *   3. l'interpréteur de `.venv` sous la racine de la forge.
 * Un produit dont playwright vit dans un environnement uv pose `FORGE_DESIGN_PYTHON` sur son interpréteur : il le dit, au
 * lieu que la forge le devine. Décision pure, sondes injectées : la recette la joue sans dépendre de ce qui est installé.
 *   sondes.python(chemin|nom) → { present, playwright, executable } ;
 *   lieux = { variable: chemin|null, racine: [chemins existants sous la racine], racineForge }
 */
export function choisirInterpreteur(sondes, lieux = {}) {
  if (lieux.variable) {
    const s = sondes.python(lieux.variable);
    if (s.present && s.playwright) return { python: lieux.variable, executable: s.executable || lieux.variable, via: 'variable', manques: [] };
    return { python: null, executable: null, via: null, manques: [
      `$FORGE_DESIGN_PYTHON désigne ${lieux.variable}, ${s.present ? 'qui n\'importe pas playwright (pip install playwright && playwright install chromium)' : 'interpréteur introuvable'} ; `
      + 'la variable est un choix explicite, aucun autre interpréteur n\'est essayé à sa place'] };
  }
  let present = null;
  for (const candidat of ['python', 'python3']) {
    const s = sondes.python(candidat);
    if (s.present && s.playwright) return { python: candidat, executable: s.executable || candidat, via: 'PATH', manques: [] };
    if (s.present && !present) present = candidat;
  }
  for (const candidat of lieux.racine || []) {
    const s = sondes.python(candidat);
    if (s.present && s.playwright) return { python: candidat, executable: s.executable || candidat, via: 'racine', manques: [] };
  }
  const suite = `ni $FORGE_DESIGN_PYTHON (non posé) ni .venv sous la racine de la forge${lieux.racineForge ? ` (${lieux.racineForge})` : ''} ne portent playwright ; `
    + 'un environnement uv du produit se désigne en posant $FORGE_DESIGN_PYTHON sur son interpréteur, il n\'est plus cherché dans le dossier courant ; '
    + 'depuis le dossier du produit, `uv run python -c "import sys; print(sys.executable)"` donne ce chemin, que `$env:FORGE_DESIGN_PYTHON = \'<chemin>\'` (PowerShell) '
    + 'ou `export FORGE_DESIGN_PYTHON=<chemin>` (sh) pose avant de relancer';
  if (!present) {
    return { python: null, executable: null, via: null, manques: [`interpréteur python introuvable dans le PATH (python / python3) ; ${suite}`] };
  }
  return { python: present, executable: present, via: 'PATH', manques: [
    `module playwright non importable en Python (pip install playwright && playwright install chromium) ; ${suite}`] };
}

/**
 * Copie du HTML sans la visite guidée à l'écran (TF-2199, 06/11/2026). Une application qui ouvre sa visite au premier
 * affichage montre sa bulle dans le rendu statique : elle recouvre la page et fabrique des écarts (V1, V7, V25) que le
 * produit n'a pas — la critique d'implémentation d'une file d'approbation en a rendu 25 sur HEAD comme sur la branche
 * corrigée. Le style masque les éléments `[data-visite-etape]` (la convention d'oracle-exploitabilite X8), y compris
 * ceux que le script de la page crée après le chargement. Le câblage de la visite est jugé par X8, sur l'instance,
 * jamais par ce rendu. Une copie de rendu seulement : le livrable n'est pas modifié.
 */
export function neutraliserVisite(html) {
  const style = '<style data-forge-visite-neutralisee>[data-visite-etape]{display:none !important}</style>';
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, m => m + style);
  if (/<html\b[^>]*>/i.test(html)) return html.replace(/<html\b[^>]*>/i, m => m + style);
  return style + html;
}

/**
 * Copie du HTML forcée en thème sombre — `data-theme="dark"` sur <html>, posé ou
 * réécrit. Mutualisée ici (TF-0286) : run-oracles-design et rendu-comparatif
 * doivent capturer le sombre exactement de la même façon, sinon deux rendus
 * « sombres » différents finiraient par se contredire.
 */
export function injecterThemeSombre(html) {
  let copie;
  if (/<html\b[^>]*\bdata-theme\s*=\s*"[^"]*"/i.test(html)) {
    copie = html.replace(/(<html\b[^>]*\bdata-theme\s*=\s*")[^"]*(")/i, '$1dark$2');
  } else if (/<html\b[^>]*>/i.test(html)) {
    copie = html.replace(/<html\b([^>]*)>/i, (m, attrs) => `<html${attrs} data-theme="dark">`);
  } else {
    return html; // pas de <html> détecté — copie renvoyée telle quelle
  }
  // TF-1775 (lot Produit-83 du 15/10/2026) — LE SOMBRE DEMANDÉ TIENT FACE AU SCRIPT DE LA PAGE.
  // Une page au pattern S-G1 (R-30 : clair par défaut, choix lu en localStorage) réécrit
  // data-theme au chargement : la copie « sombre » se rendait en clair, et la passe dite sombre
  // mesurait le clair (render_page le publie depuis TF-1718 : « THEME DEMANDE NON RENDU »). Un
  // observateur posé AVANT tout script de la page remet data-theme="dark" à chaque réécriture.
  // Il ne vit que dans cette copie de rendu, jamais dans le livrable.
  const garde = '<script data-forge-theme-force>(function(){var d=document.documentElement;'
    + 'd.setAttribute("data-theme","dark");new MutationObserver(function(){'
    + 'if(d.getAttribute("data-theme")!=="dark")d.setAttribute("data-theme","dark");})'
    + '.observe(d,{attributes:true,attributeFilter:["data-theme"]});})();</script>';
  if (/<head\b[^>]*>/i.test(copie)) return copie.replace(/<head\b[^>]*>/i, m => m + garde);
  return copie.replace(/<html\b[^>]*>/i, m => m + garde);
}
