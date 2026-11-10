"""Rendu image par image d'un clip HTML en MP4, et planches de contrôle.

Le clip expose `window.DUREE` (secondes) et `window.rendre(t)`, qui dessine l'image de
l'instant t sans dépendre de l'horloge. Ce script appelle rendre(i / fps) pour chaque image,
photographie la page et pousse l'image dans FFmpeg, puis ajoute la musique.

Usage :
  python rendre.py clip.html --sortie clip.mp4 --musique musique.wav [--fps 30]
  python rendre.py clip.html --planche planche.jpg --instants 1,4.5,9,15   (contrôle, sans vidéo)
  python rendre.py clip.html --sortie essai.mp4 --debut 10 --fin 16        (extrait)

Les instants d'une planche sont en temps du MP4 : introduction comprise, donc temps du code + 6 s
quand le clip est enveloppé par M.introduire.
"""
import argparse
import io
import pathlib
import subprocess
import sys
import time

import static_ffmpeg
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

static_ffmpeg.add_paths()

# Les messages portent des accents : sous Windows, une sortie redirigée vers un fichier prend sinon le
# code de page du poste, et le journal de rendu n'est plus de l'UTF-8 lisible (constaté le 10/11/2026).
for flux in (sys.stdout, sys.stderr):
    if hasattr(flux, "reconfigure"):
        flux.reconfigure(encoding="utf-8")


def ouvrir(p, html, largeur, hauteur):
    # Rendu par la carte graphique : 100 ms par image en JPEG, contre 1 067 ms en PNG logiciel
    # (mesuré le 09/11/2026 sur un poste Windows).
    navigateur = p.chromium.launch(args=["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"])
    page = navigateur.new_page(viewport={"width": largeur, "height": hauteur}, device_scale_factor=1)
    page.goto(pathlib.Path(html).resolve().as_uri() + "?rendu=1")
    page.wait_for_function("typeof window.rendre === 'function' && typeof window.DUREE === 'number'", timeout=30000)
    page.evaluate("document.fonts.ready.then(() => true)")
    page.wait_for_timeout(300)
    if page.evaluate("window.PRET ? window.PRET() : Promise.resolve(true)") is False:
        sys.exit("le clip déclare ne pas être prêt")
    return navigateur, page


def image(page, t):
    page.evaluate("t => window.rendre(t)", t)
    return page.screenshot(type="jpeg", quality=95)


def planche(page, instants, sortie, colonnes=4):
    vignettes = []
    for t in instants:
        im = Image.open(io.BytesIO(image(page, t))).convert("RGB")
        im = im.resize((480, int(480 * im.height / im.width)))
        ImageDraw.Draw(im).rectangle([0, 0, 92, 26], fill=(0, 0, 0))
        ImageDraw.Draw(im).text((6, 6), f"t={t:.2f}s", fill=(255, 255, 0))
        vignettes.append(im)
    h = vignettes[0].height
    lignes = (len(vignettes) + colonnes - 1) // colonnes
    feuille = Image.new("RGB", (colonnes * 480, lignes * h), (40, 40, 40))
    for k, v in enumerate(vignettes):
        feuille.paste(v, ((k % colonnes) * 480, (k // colonnes) * h))
    feuille.save(sortie, quality=90)
    print(f"planche écrite : {sortie} ({len(instants)} instants)")


def video(page, duree, fps, sortie, musique, debut, fin):
    fin = duree if fin is None else min(fin, duree)
    n = int(round((fin - debut) * fps))
    muet = str(sortie) + ".muet.mp4"
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(fps), "-vcodec", "mjpeg", "-i", "-",
         "-vf", "scale=in_range=full:out_range=tv", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
         # plage vidéo explicite : sinon FFmpeg garde la plage JPEG (yuvj420p)
         "-pix_fmt", "yuv420p", "-color_range", "tv", "-movflags", "+faststart", muet],
        stdin=subprocess.PIPE)
    t0 = time.time()
    for i in range(n):
        ff.stdin.write(image(page, debut + i / fps))
        if i % (fps * 5) == 0:
            print(f"  image {i}/{n} ({time.time() - t0:.0f} s)", flush=True)
    ff.stdin.close()
    if ff.wait() != 0:
        sys.exit("FFmpeg a échoué à l'encodage")
    if musique:
        r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", muet, "-ss", str(debut), "-i", musique,
                            "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                            "-movflags", "+faststart", str(sortie)])
        if r.returncode != 0:
            sys.exit("FFmpeg a échoué au mixage de la musique")
        pathlib.Path(muet).unlink()
    else:
        pathlib.Path(muet).replace(sortie)
    print(f"vidéo écrite : {sortie} ({n} images, {fin - debut:.1f} s, {time.time() - t0:.0f} s de rendu)")


def main():
    a = argparse.ArgumentParser()
    a.add_argument("html")
    a.add_argument("--sortie")
    a.add_argument("--musique")
    a.add_argument("--fps", type=int, default=30)
    a.add_argument("--largeur", type=int, default=1920)
    a.add_argument("--hauteur", type=int, default=1080)
    a.add_argument("--debut", type=float, default=0)
    a.add_argument("--fin", type=float)
    a.add_argument("--planche")
    a.add_argument("--instants", default="")
    o = a.parse_args()
    with sync_playwright() as p:
        nav, page = ouvrir(p, o.html, o.largeur, o.hauteur)
        duree = page.evaluate("window.DUREE")
        if o.planche:
            instants = [float(x) for x in o.instants.split(",") if x.strip()] or [duree * k / 16 for k in range(16)]
            planche(page, instants, o.planche)
        if o.sortie:
            video(page, duree, o.fps, o.sortie, o.musique, o.debut, o.fin)
        nav.close()


if __name__ == "__main__":
    main()
