// lib/png.mjs — décodeur PNG minimal, zéro dépendance (seul node:zlib, natif).
// Ne supporte que ce dont oracle-baseline a besoin : PNG non entrelacés, 8 bits
// par canal, couleur vraie (type 2, RGB) ou vraie + alpha (type 6, RGBA) — c'est
// exactement ce que produisent les captures Playwright de render_page.py. Tout
// le reste (palette, 16 bits, entrelacement Adam7) est refusé explicitement,
// jamais deviné.

import { inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CANAUX = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Décode un PNG en {width, height, canaux, pixels: Uint8Array}. Lève si non supporté. */
export function decoderPng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('signature PNG absente');

  let offset = 8;
  let ihdr = null;
  const idat = [];
  while (offset < buffer.length) {
    const longueur = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + longueur);
    if (type === 'IHDR') {
      ihdr = {
        largeur: data.readUInt32BE(0), hauteur: data.readUInt32BE(4),
        bitDepth: data[8], colorType: data[9], compression: data[10],
        filtre: data[11], entrelace: data[12],
      };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 8 + longueur + 4; // + CRC
  }
  if (!ihdr) throw new Error('chunk IHDR absent');
  if (ihdr.bitDepth !== 8) throw new Error(`bitDepth ${ihdr.bitDepth} non supporté (8 seul)`);
  if (ihdr.entrelace !== 0) throw new Error('PNG entrelacé (Adam7) non supporté');
  if (!(ihdr.colorType in CANAUX) || ihdr.colorType === 3)
    throw new Error(`colorType ${ihdr.colorType} non supporté (palette exclue)`);

  const canaux = CANAUX[ihdr.colorType];
  const brut = inflateSync(Buffer.concat(idat));
  const octetsParPixel = canaux; // bitDepth 8 ⇒ 1 octet par canal
  const octetsParLigne = ihdr.largeur * octetsParPixel;
  const pixels = new Uint8Array(ihdr.largeur * ihdr.hauteur * canaux);
  let src = 0;

  for (let y = 0; y < ihdr.hauteur; y++) {
    const typeFiltre = brut[src]; src += 1;
    const ligne = brut.subarray(src, src + octetsParLigne); src += octetsParLigne;
    const sortie = pixels.subarray(y * octetsParLigne, (y + 1) * octetsParLigne);
    const precedente = y > 0 ? pixels.subarray((y - 1) * octetsParLigne, y * octetsParLigne) : null;

    for (let x = 0; x < octetsParLigne; x++) {
      const a = x >= octetsParPixel ? sortie[x - octetsParPixel] : 0;
      const b = precedente ? precedente[x] : 0;
      const c = precedente && x >= octetsParPixel ? precedente[x - octetsParPixel] : 0;
      let v = ligne[x];
      switch (typeFiltre) {
        case 0: break;
        case 1: v = (v + a) & 0xff; break;
        case 2: v = (v + b) & 0xff; break;
        case 3: v = (v + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: v = (v + paeth(a, b, c)) & 0xff; break;
        default: throw new Error(`type de filtre PNG ${typeFiltre} inconnu à la ligne ${y}`);
      }
      sortie[x] = v;
    }
  }

  return { width: ihdr.largeur, height: ihdr.hauteur, canaux, pixels };
}

/**
 * Compare deux PNG décodés pixel à pixel. Renvoie null si dimensions ou canaux
 * divergent (comparaison impossible — pas un ratio à 100 %, un cas différent).
 * `tolerance` : écart de canal (0-255) toléré avant de compter un pixel comme divergent.
 */
export function comparerPng(a, b, tolerance = 24) {
  if (a.width !== b.width || a.height !== b.height) return null;
  const canaux = Math.min(a.canaux, b.canaux); // compare sur les canaux communs (RGB si l'un a l'alpha)
  const total = a.width * a.height;
  let divergents = 0;
  for (let i = 0; i < total; i++) {
    let ecart = 0;
    for (let c = 0; c < canaux; c++) {
      const d = Math.abs(a.pixels[i * a.canaux + c] - b.pixels[i * b.canaux + c]);
      if (d > ecart) ecart = d;
    }
    if (ecart > tolerance) divergents++;
  }
  return { divergents, total, ratio: divergents / total };
}
