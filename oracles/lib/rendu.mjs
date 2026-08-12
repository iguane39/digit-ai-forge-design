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

  let python = null;
  for (const candidat of ['python', 'python3']) {
    const r = spawnSync(candidat, ['--version'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) { python = candidat; break; }
  }
  if (!python) manques.push('interpréteur python introuvable dans le PATH (python / python3)');

  let playwrightOk = false;
  if (python) {
    const r = spawnSync(python, ['-c', 'import playwright'], { encoding: 'utf8' });
    playwrightOk = !r.error && r.status === 0;
    if (!playwrightOk) manques.push('module playwright non importable en Python (pip install playwright && playwright install chromium)');
  }

  return { ok: manques.length === 0, manques, python, renderPage, oracleA11y };
}
