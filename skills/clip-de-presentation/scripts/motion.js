/* motion.js — bibliothèque des clips de présentation (skill clip-de-presentation de forge-design).
 * Canvas 2D, 1920 × 1080, rendu déterministe : tout dépend de t (secondes), jamais de l'horloge.
 *
 * Versée le 10/11/2026 (TF-2405) depuis le pipeline qui a produit 28 clips de motion design chez un
 * produit, et corrigée de ses 6 défauts connus. Chaque correction est verrouillée, aux deux sens, par
 * scripts/self-test.mjs : légende en graisse 700, étiquette de 24 px par défaut, titre de fin réglé
 * sur la largeur utile, dernier point d'un chemin, bornes exactes des courbes, étapes d'introduction
 * qui naissent à 24 px au moins.
 *
 * La marque est un PARAMÈTRE de la page, jamais une constante de ce fichier :
 *  - couleurs et polices : les jetons de tokens.css que la page charge (contrat de systeme-de-marque :
 *    --fond, --surface, --trait, --texte, --texte-faible, --accent, --police-titre, --police-corps,
 *    --police-mono ; facultatifs : --accent-2, --texte-succes, --texte-alerte, --texte-erreur). Le repli
 *    neutre ci-dessous ne sert que si la page n'en charge aucun ;
 *  - nom, logo et lien : la déclaration <script type="application/json" id="marque"> de la page,
 *    { "nom": "…", "logo": "<chemin du logo pour fond sombre>", "lien": "<adresse publique>" }.
 */
(function () {
  const M = {};
  M.L = 1920; M.H = 1080;
  // Plancher des étiquettes à chasse fixe : les essais de 17 à 19 px ont été jugés illisibles (10/11/2026).
  M.PLANCHER_ETIQUETTE = 24;
  // Marge de chaque côté du titre de la carte de fin : largeur utile 1 700 px, celle de la série.
  M.MARGE_TITRE = 110;

  // --- Temps et courbes
  M.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  M.lerp = (a, b, p) => a + (b - a) * p;
  M.prog = (t, a, b) => M.clamp((t - a) / (b - a));           // 0 avant a, 1 après b
  // Apparition (décélération forte). Borne exacte à 1 : l'ancienne forme rendait 0,999 (1 − 2^−10).
  M.sortie = p => { p = M.clamp(p); return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); };
  M.douce = p => { p = M.clamp(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  // Ce qui « se pose », avec un léger dépassement. Borne exacte à 0 : l'ancienne forme rendait 2,2e-16.
  M.rebond = p => { p = M.clamp(p); if (p <= 0) return 0; const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  M.entreSort = (t, a, b, f = 0.5) => M.sortie(M.prog(t, a, a + f)) * (1 - M.douce(M.prog(t, b - f, b)));
  M.alea = graine => () => { graine |= 0; graine = graine + 0x6D2B79F5 | 0; let x = Math.imul(graine ^ graine >>> 15, 1 | graine); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  M.rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  M.melange = (a, b, p) => {
    const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    return '#' + [16, 8, 0].map(s => Math.round(M.lerp(x >> s & 255, y >> s & 255, p)).toString(16).padStart(2, '0')).join('');
  };

  // --- Couleurs : repli neutre, remplacé par les jetons de la marque quand la page charge tokens.css
  M.C = {
    fond: '#101317', fond2: '#151A21', carte: '#1B2129', trait: '#2C343F',
    encre: '#F1F3F6', faible: '#A9B1BC', pale: '#7E8794',
    accent: '#8DB0F7', accent2: '#6FDDD0', succes: '#86DBA6', alerte: '#F2C374', erreur: '#F2A7A7'
  };
  const style = getComputedStyle(document.documentElement);
  const lire = nom => style.getPropertyValue(nom).trim();
  // Toute couleur CSS (hex, rgb, oklch…) ramenée à #rrggbb par un canvas d'un pixel : les jetons de
  // systeme-de-marque sont en OKLCH, que M.rgba ne sait pas lire.
  const sonde = document.createElement('canvas'); sonde.width = sonde.height = 1;
  const sc = sonde.getContext('2d', { willReadFrequently: true });
  M.couleur = v => {
    if (!v) return null;
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (!sc) return null;
    sc.fillStyle = '#010203'; sc.fillStyle = v;                 // une valeur illisible laisse la sentinelle
    if (String(sc.fillStyle).toLowerCase() === '#010203') return null;
    sc.clearRect(0, 0, 1, 1); sc.fillRect(0, 0, 1, 1);
    const d = sc.getImageData(0, 0, 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map(x => x.toString(16).padStart(2, '0')).join('');
  };
  const JETONS = { fond: '--fond', carte: '--surface', trait: '--trait', encre: '--texte', faible: '--texte-faible',
    accent: '--accent', accent2: '--accent-2', succes: '--texte-succes', alerte: '--texte-alerte', erreur: '--texte-erreur' };
  const lus = {};
  for (const [cle, nom] of Object.entries(JETONS)) { const v = M.couleur(lire(nom)); if (v) { M.C[cle] = v; lus[cle] = true; } }
  if (Object.keys(lus).length) {
    // Une marque à un seul accent : le second accent est le même, jamais une teinte étrangère à la marque.
    if (!lus.accent2) M.C.accent2 = M.C.accent;
    M.C.fond2 = M.melange(M.C.fond, M.C.carte, 0.5);
    M.C.pale = M.melange(M.C.faible, M.C.fond, 0.35);
  }
  const pile = (nom, repli) => lire(nom) || repli;
  const POLICES = {
    titre: pile('--police-titre', 'system-ui, sans-serif'),
    corps: pile('--police-corps', 'system-ui, sans-serif'),
    mono: pile('--police-mono', 'ui-monospace, Consolas, monospace')
  };
  M.F = {
    titre: (px, g = 800) => `${g} ${px}px ${POLICES.titre}`,
    corps: (px, g = 500) => `${g} ${px}px ${POLICES.corps}`,
    mono: (px, g = 500) => `${g} ${px}px ${POLICES.mono}`
  };

  // --- Marque : nom, logo et lien déclarés par la page
  const bloc = document.getElementById('marque');
  let declaree = {};
  if (bloc) { try { declaree = JSON.parse(bloc.textContent || '{}'); } catch (e) { declaree = { illisible: String((e && e.message) || e) }; } }
  M.marque = { nom: declaree.nom || '', logo: declaree.logo || '', lien: declaree.lien || '', illisible: declaree.illisible || '' };
  M.logoImage = null;
  if (M.marque.logo) { M.logoImage = new Image(); M.logoImage.src = M.marque.logo; }
  // Vrai quand la marque est prête : déclaration lisible, et logo décodé s'il est déclaré.
  M.chargerMarque = () => {
    if (M.marque.illisible) return Promise.resolve(false);
    if (!M.logoImage) return Promise.resolve(true);
    return M.logoImage.decode().then(() => true, () => false);
  };
  // À poser en window.PRET : polices de la marque et logo chargés avant la première image.
  M.pret = (o = {}) => {
    const specs = o.polices || [M.F.titre(40, 800), M.F.titre(40, 700), M.F.corps(40, 500), M.F.corps(40, 400), M.F.mono(40, 500)];
    return Promise.all(specs.map(f => document.fonts.load(f)).concat([M.chargerMarque()]))
      .then(r => r[r.length - 1] === true && specs.every(f => document.fonts.check(f)));
  };
  // Logo inscrit dans une boîte wMax × hMax centrée en (cx, cy), hors de toute transformation.
  // Rend faux quand il n'y a rien à dessiner : l'appelant pose alors le nom de la marque.
  M.dessinerLogo = (ctx, cx, cy, wMax, hMax, alpha = 1) => {
    const im = M.logoImage;
    if (!im || !im.complete || !im.naturalWidth || !im.naturalHeight || alpha <= 0) return false;
    const k = Math.min(wMax / im.naturalWidth, hMax / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.filter = 'none'; ctx.shadowBlur = 0;
    ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h); ctx.restore();
    return true;
  };

  // --- Fond : dégradé, trame de points qui dérive, vignette
  M.fond = (ctx, t, o = {}) => {
    const g = ctx.createRadialGradient(M.L * .5, M.H * .42, 80, M.L * .5, M.H * .5, M.L * .75);
    g.addColorStop(0, o.centre || M.C.fond2); g.addColorStop(1, M.C.fond);
    ctx.fillStyle = g; ctx.fillRect(0, 0, M.L, M.H);
    const pas = 48, dx = (t * 6) % pas;
    ctx.fillStyle = M.rgba(M.C.accent, o.trame ?? 0.07);
    for (let x = -pas; x < M.L + pas; x += pas) for (let y = 0; y < M.H; y += pas) ctx.fillRect(x + dx, y, 2, 2);
    const v = ctx.createRadialGradient(M.L / 2, M.H / 2, M.H * .45, M.L / 2, M.H / 2, M.L * .7);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, M.L, M.H);
  };

  // --- Caméra : zoom et déplacement autour du centre
  M.camera = (ctx, c, dessin) => {
    ctx.save(); ctx.translate(M.L / 2, M.H / 2); ctx.scale(c.zoom || 1, c.zoom || 1);
    ctx.rotate(c.rot || 0); ctx.translate(-M.L / 2 + (c.x || 0), -M.H / 2 + (c.y || 0));
    dessin(); ctx.restore();
  };

  // --- Isométrie : (x, y) au sol, z en hauteur, origine écran (ox, oy)
  M.iso = (x, y, z = 0, ox = M.L / 2, oy = M.H / 2) => [ox + (x - y) * 0.866, oy + (x + y) * 0.5 - z];
  M.boiteIso = (ctx, x, y, z, l, p, h, o = {}) => {
    const P = (a, b, c) => M.iso(a, b, c, o.ox, o.oy);
    const coul = o.couleur || M.C.accent;
    const faces = [
      { pts: [P(x, y + p, z), P(x + l, y + p, z), P(x + l, y + p, z + h), P(x, y + p, z + h)], c: o.gauche || M.rgba(coul, .35) },
      { pts: [P(x + l, y, z), P(x + l, y + p, z), P(x + l, y + p, z + h), P(x + l, y, z + h)], c: o.droite || M.rgba(coul, .22) },
      { pts: [P(x, y, z + h), P(x + l, y, z + h), P(x + l, y + p, z + h), P(x, y + p, z + h)], c: o.haut || M.rgba(coul, .55) }
    ];
    ctx.save();
    if (o.lueur) { ctx.shadowColor = coul; ctx.shadowBlur = o.lueur; }
    for (const f of faces) {
      ctx.beginPath(); f.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
      ctx.fillStyle = f.c; ctx.fill();
      ctx.strokeStyle = o.contour || M.rgba(coul, .9); ctx.lineWidth = o.epaisseur || 1.5; ctx.stroke();
    }
    ctx.restore();
    return P(x + l / 2, y + p / 2, z + h); // centre du dessus, pour poser une étiquette
  };

  // --- Texte
  M.texte = (ctx, txt, x, y, o = {}) => {
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.font = o.police || M.F.titre(o.taille || 64);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    if (o.lueur) { ctx.shadowColor = o.couleurLueur || o.couleur || M.C.accent; ctx.shadowBlur = o.lueur; }
    ctx.fillStyle = o.couleur || M.C.encre;
    if (o.espacement) ctx.letterSpacing = o.espacement + 'px';
    ctx.fillText(txt, x, y);
    ctx.restore();
  };
  // Légende cinétique : les mots montent l'un après l'autre, puis la ligne s'efface.
  // Police de titre en graisse 700 par défaut, celle de la bible (l'ancienne forme tombait en 800).
  M.legende = (ctx, t, txt, a, b, o = {}) => {
    if (t < a || t > b) return;
    const mots = txt.split(' '), taille = o.taille || 58;
    ctx.save(); ctx.font = o.police || M.F.titre(taille, 700);
    const espace = ctx.measureText(' ').width;
    const largeurs = mots.map(m => ctx.measureText(m).width);
    const total = largeurs.reduce((s, w) => s + w, 0) + espace * (mots.length - 1);
    let x = (o.x ?? M.L / 2) - total / 2; const y = o.y ?? M.H - 150;
    const sortie = 1 - M.douce(M.prog(t, b - .45, b));
    mots.forEach((m, i) => {
      const p = M.sortie(M.prog(t, a + i * .07, a + i * .07 + .55));
      ctx.globalAlpha = p * sortie;
      ctx.fillStyle = (o.accent && o.accent.includes(i)) ? (o.couleurAccent || M.C.accent2) : (o.couleur || M.C.encre);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(m, x, y + (1 - p) * 34);
      x += largeurs[i] + espace;
    });
    ctx.restore();
  };
  // Étiquette à chasse fixe, sur fond de carte ; 24 px par défaut, le plancher (l'ancienne forme : 20 px)
  M.puce = (ctx, txt, x, y, o = {}) => {
    const taille = o.taille ?? M.PLANCHER_ETIQUETTE;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = M.F.mono(taille);
    const w = ctx.measureText(txt).width + 28, h = taille + 18;
    const x0 = o.align === 'left' ? x : x - w / 2;
    ctx.fillStyle = o.fond || M.rgba(M.C.carte, .92); ctx.strokeStyle = o.bord || M.rgba(o.couleur || M.C.accent, .6);
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.couleur || M.C.accent; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x0 + 14, y + 1); ctx.restore();
    return w;
  };

  // --- Tracés : chemin qui se dessine, particules qui le parcourent, coche animée
  M.chemin = (ctx, pts, p, o = {}) => {
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let reste = L * M.clamp(p);
    ctx.save(); ctx.strokeStyle = o.couleur || M.C.accent2; ctx.lineWidth = o.epaisseur || 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.lueur !== 0) { ctx.shadowColor = o.couleur || M.C.accent2; ctx.shadowBlur = o.lueur || 14; }
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && reste > 0; i++) {
      const k = Math.min(1, reste / seg[i - 1]);
      ctx.lineTo(M.lerp(pts[i - 1][0], pts[i][0], k), M.lerp(pts[i - 1][1], pts[i][1], k)); reste -= seg[i - 1];
    }
    ctx.stroke(); ctx.restore();
  };
  // Point à la fraction u du chemin. u = 1 rend le dernier point (l'ancienne forme rendait le premier) ;
  // hors de [0, 1], la position boucle, pour les particules.
  M.surChemin = (pts, u) => {
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let r = L * (u >= 0 && u <= 1 ? u : ((u % 1) + 1) % 1);
    for (let i = 1; i < pts.length; i++) { if (r <= seg[i - 1]) { const k = r / seg[i - 1]; return [M.lerp(pts[i - 1][0], pts[i][0], k), M.lerp(pts[i - 1][1], pts[i][1], k)]; } r -= seg[i - 1]; }
    return pts[pts.length - 1];
  };
  M.particules = (ctx, pts, t, o = {}) => {
    const n = o.n || 14; ctx.save(); ctx.fillStyle = o.couleur || M.C.accent2;
    ctx.shadowColor = o.couleur || M.C.accent2; ctx.shadowBlur = 12; ctx.globalAlpha *= o.alpha ?? 1;
    for (let i = 0; i < n; i++) { const q = M.surChemin(pts, t * (o.vitesse || .25) + i / n); ctx.beginPath(); ctx.arc(q[0], q[1], o.taille || 4, 0, 7); ctx.fill(); }
    ctx.restore();
  };
  M.coche = (ctx, x, y, taille, p, couleur = M.C.succes) => {
    const pts = [[x - taille * .45, y], [x - taille * .1, y + taille * .35], [x + taille * .5, y - taille * .4]];
    M.chemin(ctx, pts, p, { couleur, epaisseur: taille * .14, lueur: 18 });
  };

  // --- Lien de la marque, posé sur la carte de fin ; a = instant d'apparition dans le temps du clip
  M.lien = (ctx, t, a, texte = M.marque.lien) => {
    const p = M.sortie(M.prog(t, a, a + 0.8));
    if (!texte || p <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.translate(M.L / 2, 800 + (1 - p) * 20);
    ctx.shadowColor = M.C.accent2; ctx.shadowBlur = 10 + 8 * Math.sin(t * 3);
    M.puce(ctx, texte, 0, 0, { taille: 36, couleur: M.C.accent2, alpha: p });
    ctx.restore();
  };

  // --- Carte de fin : voile, logo de la marque (ou son nom), titre sur une ou deux lignes dont la taille
  // se règle sur la largeur utile, filet, sous-titre, puis le lien de la marque 1,2 s après le début.
  // Deux formes : (ctx, t, a, titre, sousTitre), celle de la série, ou (ctx, t, a, { titre, sousTitre, taille }),
  // où titre est une chaîne ou un tableau de lignes.
  M.carteFin = (ctx, t, a, titre, sousTitre) => {
    const o = (titre && typeof titre === 'object' && !Array.isArray(titre)) ? titre : { titre, sousTitre };
    const lignes = [].concat(o.titre || []).map(String);
    const p = M.sortie(M.prog(t, a, a + 1.2));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = p;
    ctx.fillStyle = M.rgba(M.C.fond, .82 * p); ctx.fillRect(0, 0, M.L, M.H);
    ctx.restore();
    if (!M.dessinerLogo(ctx, M.L / 2, 290, 330, 150, p) && M.marque.nom) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = p;
      M.texte(ctx, M.marque.nom, M.L / 2, 290, { police: M.F.titre(44, 700), couleur: M.C.faible, espacement: 6 });
      ctx.restore();
    }
    const tailleMax = o.taille || 88, utile = M.L - 2 * M.MARGE_TITRE;
    ctx.save(); ctx.font = M.F.titre(tailleMax);
    const w = Math.max(1, ...lignes.map(l => ctx.measureText(l).width)); ctx.restore();
    const taille = Math.min(tailleMax, Math.floor(tailleMax * utile / w));
    const pas = taille + 16, y0 = 482 - (lignes.length - 1) * pas / 2;   // deux lignes : 430, puis 430 + pas
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = p;
    lignes.forEach((l, i) => M.texte(ctx, l, M.L / 2, y0 + i * pas + (1 - p) * 30, { taille, lueur: 30, couleurLueur: M.C.accent }));
    const pl = M.sortie(M.prog(t, a + .5, a + 1.6));
    ctx.fillStyle = M.C.accent2; ctx.fillRect(M.L / 2 - 220 * pl, 602, 440 * pl, 3);
    if (o.sousTitre) M.texte(ctx, o.sousTitre, M.L / 2, 668, { police: M.F.corps(40), couleur: M.C.faible, alpha: M.sortie(M.prog(t, a + .8, a + 1.8)) });
    ctx.restore();
    M.lien(ctx, t, a + 1.2);
  };

  // --- Introduction : logo et nom de la marque, titre qui tombe sur l'impact de 2 s, phrase, étapes.
  // o = { titre, phrase, etapes: [..], duree: 6, graine, surtitre }
  M.introduction = (ctx, t, o) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    M.fond(ctx, t, { trame: 0.09 });
    const D = (o.duree || 6) + 0.7, cx = M.L / 2, cy = M.H / 2, dy = 46;
    ctx.save();
    const z = 1 + 0.035 * t / D + 0.06 * M.douce(M.prog(t, D - 1.4, D));
    ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
    // essaim de points qui converge vers le titre, en boucle
    const r = M.alea(o.graine || 11);
    for (let i = 0; i < 110; i++) {
      const a = r() * Math.PI * 2, d0 = 500 + r() * 900, v = 0.22 + r() * 0.45, ph = (t * v + r()) % 1;
      const d = d0 * (1 - M.douce(ph));
      ctx.fillStyle = M.rgba(i % 3 ? M.C.accent : M.C.accent2, 0.8 * Math.sin(Math.PI * ph));
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.55, 2.6, 0, 7); ctx.fill();
    }
    // nom de la marque, sous son logo
    const pm = M.sortie(M.prog(t, 0.2, 1.1));
    const surtitre = o.surtitre ?? (M.marque.nom ? M.marque.nom.toLocaleUpperCase('fr-FR') : '');
    if (surtitre) M.texte(ctx, surtitre, cx, 292 + dy + (1 - pm) * 24, { police: M.F.titre(40, 700), couleur: M.C.faible, espacement: 12, alpha: pm });
    const pl = M.sortie(M.prog(t, 0.6, 1.6));
    ctx.fillStyle = M.C.accent2; ctx.fillRect(cx - 260 * pl, 336 + dy, 520 * pl, 3);
    // titre qui tombe sur l'impact de 2 s, avec onde de choc
    const pa = M.sortie(M.prog(t, 1.7, 2.0)), pr = M.rebond(M.prog(t, 1.72, 2.35));
    ctx.save(); ctx.font = M.F.titre(132); const w = ctx.measureText(o.titre).width; ctx.restore();
    const taille = Math.min(132, Math.floor(132 * (M.L - 260) / w));
    if (pa > 0) {
      ctx.save(); ctx.translate(cx, 468 + dy); const s = M.lerp(1.55, 1, pr); ctx.scale(s, s);
      M.texte(ctx, o.titre, 0, 0, { taille, lueur: 34, couleurLueur: M.C.accent, alpha: pa });
      ctx.restore();
    }
    const po = M.prog(t, 2.0, 3.1);
    if (po > 0 && po < 1) {
      ctx.save(); ctx.strokeStyle = M.rgba(M.C.accent2, 0.5 * (1 - po)); ctx.lineWidth = 4 * (1 - po) + 1;
      ctx.beginPath(); ctx.ellipse(cx, 468 + dy, 120 + 1000 * M.sortie(po), 60 + 420 * M.sortie(po), 0, 0, 7); ctx.stroke(); ctx.restore();
    }
    // phrase d'introduction
    const pp = M.sortie(M.prog(t, 2.5, 3.3));
    ctx.save(); ctx.font = M.F.corps(42); const wp = ctx.measureText(o.phrase).width; ctx.restore();
    M.texte(ctx, o.phrase, cx, 600 + dy + (1 - pp) * 26, { police: M.F.corps(Math.min(42, Math.floor(42 * (M.L - 260) / wp))), couleur: M.C.faible, alpha: pp });
    // étapes : des puces qui se posent une à une sur un fil parcouru par des particules
    const et = o.etapes || [];
    if (et.length) {
      ctx.save(); ctx.font = M.F.mono(34); const lg = et.map(e => ctx.measureText(e).width + 28); ctx.restore();
      const gap = 54, tot = lg.reduce((s, x) => s + x, 0) + gap * (et.length - 1);
      const k = Math.min(1, (M.L - 200) / tot);
      let x = cx - tot * k / 2; const y = 760 + dy, centres = [];
      lg.forEach(l => { centres.push(x + l * k / 2); x += (l + gap) * k; });
      const fil = [[centres[0], y], [centres[centres.length - 1], y]];
      const t0 = 3.1, pas = 0.26;
      M.chemin(ctx, fil, M.prog(t, t0, t0 + pas * et.length), { couleur: M.rgba(M.C.accent2, 0.7), epaisseur: 2, lueur: 8 });
      if (t > t0 + pas * et.length) M.particules(ctx, fil, t, { n: 6, vitesse: 0.35, taille: 3, alpha: 0.8 });
      const actif = Math.floor((t - (t0 + pas * et.length)) / 0.35);
      // Une étape naît à 24 px au moins (le plancher), jamais d'une échelle 0 : l'ancienne forme passait
      // par toutes les tailles sous 24 px pendant son entrée.
      const s0 = Math.min(1, M.PLANCHER_ETIQUETTE / (34 * k));
      et.forEach((e, i) => {
        const p = M.rebond(M.prog(t, t0 + i * pas, t0 + i * pas + 0.45));
        if (p <= 0) return;
        const s = M.lerp(s0, 1, p) * k;
        ctx.save(); ctx.translate(centres[i], y); ctx.scale(s, s);
        M.puce(ctx, e, 0, 0, { taille: 34, couleur: i === actif % et.length && actif >= 0 ? M.C.accent2 : M.C.accent, alpha: M.clamp(p) });
        ctx.restore();
      });
    }
    ctx.restore();
    // logo de la marque, hors du zoom : il paraît avec le nom et part sous le fondu de M.introduire
    M.dessinerLogo(ctx, cx, 205, 300, 190, pm);
  };
  // Enveloppe un clip : introduction de o.intro.duree secondes (6 par défaut), fondu de 0,7 s vers
  // l'image 0 du clip, puis le clip décalé. o.finCarte (temps du clip) ne sert qu'à une carte de fin
  // maison, qui ne pose pas le lien elle-même : M.carteFin le pose déjà.
  M.introduire = o => {
    const D = o.intro.duree || 6, base = o.rendre, ctx = o.ctx, F = 0.7; // le clip démarre à D, sous un fondu de F
    const tampon = document.createElement('canvas'); tampon.width = M.L; tampon.height = M.H;
    const tc = tampon.getContext('2d');
    window.DUREE = o.duree + D;
    window.DUREE_INTRO = D;
    const lien = t => { if (o.finCarte != null) M.lien(ctx, t - D, o.finCarte + 1.2); };
    window.rendre = t => {
      if (t < D) { M.introduction(ctx, t, o.intro); return; }
      if (t < D + F) {
        base(t - D);
        tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalAlpha = 1; tc.clearRect(0, 0, M.L, M.H); tc.drawImage(ctx.canvas, 0, 0);
        M.introduction(ctx, t, o.intro);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = M.douce(M.prog(t, D, D + F)); ctx.drawImage(tampon, 0, 0); ctx.restore();
        lien(t);
        return;
      }
      base(t - D);
      lien(t);
    };
  };

  // --- Aperçu dans un navigateur : lecture en boucle, musique au clic (le rendu passe ?rendu=1)
  M.apercu = (rendre, duree, musique) => {
    if (location.search.includes('rendu')) return;
    let debut = performance.now(), audio = null;
    if (musique) { audio = new Audio(musique); audio.loop = true; addEventListener('click', () => { debut = performance.now(); audio.currentTime = 0; audio.play(); }); }
    const boucle = () => { rendre(((performance.now() - debut) / 1000) % duree); requestAnimationFrame(boucle); };
    requestAnimationFrame(boucle);
  };

  window.M = M;
})();
