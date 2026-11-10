// ffprobe — où le trouver, et le dire quand on ne le trouve pas (TF-2405, oracle-clip CL1).
//
// Quatre voies, dans l'ordre : le chemin passé explicitement (--ffprobe), la variable FFPROBE, `ffprobe` sur le
// PATH, puis le paquet Python `static_ffmpeg`, celui qu'utilise scripts/rendre.py du skill clip-de-presentation :
// `python -c "import static_ffmpeg; static_ffmpeg.add_paths()"` ajoute ffmpeg et ffprobe au PATH du seul processus
// Python, qui rend ici le chemin trouvé. Aucune voie n'aboutit : { ok: false, manque } porte les voies essayées,
// et l'appelant rend un SKIP motivé, jamais un PASS.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const repond = (chemin) => {
  const r = spawnSync(chemin, ['-version'], { encoding: 'utf8', timeout: 30000 });
  return !r.error && r.status === 0 && /ffprobe/i.test(r.stdout || '');
};

export function trouverFfprobe({ explicite = null } = {}) {
  const essais = [];
  if (explicite) {
    if (existsSync(explicite) && repond(explicite)) return { ok: true, chemin: explicite, voie: '--ffprobe' };
    return { ok: false, manque: `ffprobe introuvable au chemin passé par --ffprobe (${explicite})` };
  }
  if (process.env.FFPROBE) {
    if (existsSync(process.env.FFPROBE) && repond(process.env.FFPROBE)) return { ok: true, chemin: process.env.FFPROBE, voie: 'variable FFPROBE' };
    essais.push(`variable FFPROBE (${process.env.FFPROBE}) sans ffprobe exécutable`);
  }
  if (repond('ffprobe')) return { ok: true, chemin: 'ffprobe', voie: 'PATH' };
  essais.push('ffprobe absent du PATH');
  for (const python of ['python', 'python3']) {
    const r = spawnSync(python, ['-I', '-c', "import shutil, static_ffmpeg\nstatic_ffmpeg.add_paths()\nprint(shutil.which('ffprobe') or '')"],
      { encoding: 'utf8', timeout: 180000, env: { ...process.env, PYTHONUTF8: '1' } });
    if (r.error) { essais.push(`${python} introuvable`); continue; }
    const chemin = (r.stdout || '').trim().split(/\r?\n/).pop();
    if (r.status === 0 && chemin && existsSync(chemin) && repond(chemin)) return { ok: true, chemin, voie: `${python} static_ffmpeg` };
    essais.push(`${python} n'importe pas static_ffmpeg ou n'y trouve pas ffprobe`);
    break;
  }
  return { ok: false, manque: `ffprobe introuvable : ${essais.join(' ; ')}` };
}

/** Les flux et la durée d'un fichier vidéo, lus par ffprobe ; { erreur } si ffprobe ne le lit pas. */
export function sonder(ffprobe, fichier) {
  const r = spawnSync(ffprobe, ['-v', 'error', '-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,avg_frame_rate',
    '-of', 'json', fichier], { encoding: 'utf8', timeout: 60000 });
  if (r.error || r.status !== 0) return { erreur: (r.stderr || String(r.error || '')).trim().slice(0, 200) || `exit ${r.status}` };
  try { return JSON.parse(r.stdout); } catch { return { erreur: 'sortie de ffprobe illisible' }; }
}
