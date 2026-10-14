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
import { spawnSync } from 'node:child_process';

export function detecterOutillageRendu() {
  const home = os.homedir();
  const renderPage = path.join(home, '.claude', 'skills', 'digit-ai-page-html', 'scripts', 'render_page.py');
  const oracleA11y = path.join(home, '.claude', 'skills', 'quality-oracles', 'scripts', 'oracle-a11y.py');
  const manques = [];
  if (!fs.existsSync(renderPage)) manques.push(`render_page.py introuvable (${renderPage})`);
  if (!fs.existsSync(oracleA11y)) manques.push(`oracle-a11y.py introuvable (${oracleA11y})`);

  const choix = choisirInterpreteur({
    python: (candidat) => {
      const v = spawnSync(candidat, ['--version'], { encoding: 'utf8' });
      if (v.error || v.status !== 0) return { present: false, playwright: false };
      const r = spawnSync(candidat, ['-c', 'import playwright'], { encoding: 'utf8' });
      return { present: true, playwright: !r.error && r.status === 0 };
    },
    uv: () => {
      const v = spawnSync('uv', ['--version'], { encoding: 'utf8' });
      if (v.error || v.status !== 0) return { present: false, executable: null };
      // L'interpréteur de l'environnement uv du dossier courant (celui du produit), s'il porte
      // playwright. Son chemin absolu se lance ensuite SANS `uv run` : les consommateurs gardent
      // leur `spawnSync(outillage.python, …)` inchangé.
      const r = spawnSync('uv', ['run', '--quiet', 'python', '-c', 'import sys, playwright; print(sys.executable)'],
        { encoding: 'utf8', timeout: 120000 });
      const exe = (r.stdout || '').trim().split(/\r?\n/).pop();
      return { present: true, executable: !r.error && r.status === 0 && exe && fs.existsSync(exe) ? exe : null };
    },
  });
  manques.push(...choix.manques);
  return { ok: manques.length === 0, manques, python: choix.python, via: choix.via, renderPage, oracleA11y };
}

/**
 * TF-1674 (retour du 12/10/2026) — LE PYTHON DU PRODUIT EST AUSSI UN PYTHON. Un produit dont
 * l'outillage Python vit dans un environnement `uv` (playwright installé là, pas dans le Python
 * du PATH) voyait `--rendu` rendre SKIP : « playwright non importable hors uv run ». La critique
 * d'implémentation perdait tout son rendu réel alors que l'outillage était sur le poste. Ordre de
 * recherche : `python` puis `python3` du PATH avec playwright ; à défaut, l'interpréteur que
 * `uv run python` désigne dans le dossier courant, s'il importe playwright. Décision pure, sondes
 * injectées : la recette la joue sans dépendre de ce qui est installé sur le poste.
 *   sondes.python(nom) → { present, playwright } ; sondes.uv() → { present, executable|null }
 */
export function choisirInterpreteur(sondes) {
  let present = null;
  for (const candidat of ['python', 'python3']) {
    const s = sondes.python(candidat);
    if (s.present && s.playwright) return { python: candidat, via: 'PATH', manques: [] };
    if (s.present && !present) present = candidat;
  }
  const uv = sondes.uv();
  if (uv.executable) return { python: uv.executable, via: 'uv', manques: [] };
  const suiteUv = uv.present
    ? '`uv` est présent mais `uv run python` n\'importe pas playwright depuis le dossier courant'
    : '`uv` absent du PATH';
  if (!present) {
    return { python: null, via: null, manques: [`interpréteur python introuvable dans le PATH (python / python3) ; ${suiteUv}`] };
  }
  return { python: present, via: 'PATH', manques: [
    `module playwright non importable en Python (pip install playwright && playwright install chromium) ; ${suiteUv}`] };
}

/**
 * Copie du HTML forcée en thème sombre — `data-theme="dark"` sur <html>, posé ou
 * réécrit. Mutualisée ici (TF-0286) : run-oracles-design et rendu-comparatif
 * doivent capturer le sombre exactement de la même façon, sinon deux rendus
 * « sombres » différents finiraient par se contredire.
 */
export function injecterThemeSombre(html) {
  if (/<html\b[^>]*\bdata-theme\s*=\s*"[^"]*"/i.test(html)) {
    return html.replace(/(<html\b[^>]*\bdata-theme\s*=\s*")[^"]*(")/i, '$1dark$2');
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b([^>]*)>/i, (m, attrs) => `<html${attrs} data-theme="dark">`);
  }
  return html; // pas de <html> détecté — copie renvoyée telle quelle
}
