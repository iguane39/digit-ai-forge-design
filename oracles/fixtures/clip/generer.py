#!/usr/bin/env python3
"""generer.py — fabrique les binaires des fixtures d'oracle-clip (TF-2405).

Les MP4 et les planches sont des binaires : cette fabrique est LEUR SOURCE, versionnée avec eux. Rejouer :
    python oracles/fixtures/clip/generer.py
Dépendances : static_ffmpeg (FFmpeg), Pillow. Les vidéos sont synthétiques et minuscules, aucune n'est rendue
depuis un clip : oracle-clip juge leur format, pas leur image.

  verte/clip.mp4                  12 s = window.DUREE 6 + introduction 6 ; 1920 × 1080, 30 i/s, H.264 yuv420p, AAC
  rouge/clip.mp4                  2 s, 320 × 180, 25 i/s, yuv444p, sans son : CL1 refuse chaque écart
  verte/planche-1.jpg à -3.jpg    trois planches de contrôle de 48 × 27 px, JPEG lisibles (CL2)
"""
import os
import subprocess

import static_ffmpeg
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
static_ffmpeg.add_paths()


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def main():
    verte, rouge = os.path.join(ICI, "verte"), os.path.join(ICI, "rouge")
    ffmpeg("-f", "lavfi", "-i", "color=c=black:s=1920x1080:r=30:d=12",
           "-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", "12",
           "-c:v", "libx264", "-preset", "veryslow", "-crf", "51", "-pix_fmt", "yuv420p", "-g", "600",
           "-c:a", "aac", "-b:a", "8k", "-shortest", "-map_metadata", "-1", "-movflags", "+faststart",
           os.path.join(verte, "clip.mp4"))
    ffmpeg("-f", "lavfi", "-i", "color=c=gray:s=320x180:r=25:d=2",
           "-c:v", "libx264", "-preset", "veryslow", "-crf", "51", "-pix_fmt", "yuv444p", "-an",
           "-map_metadata", "-1", os.path.join(rouge, "clip.mp4"))
    for k, gris in enumerate((40, 80, 120), start=1):
        Image.new("RGB", (48, 27), (gris, gris, gris)).save(os.path.join(verte, f"planche-{k}.jpg"), quality=60)
    for nom in ("verte/clip.mp4", "rouge/clip.mp4", "verte/planche-1.jpg", "verte/planche-2.jpg", "verte/planche-3.jpg"):
        print(f"{nom} : {os.path.getsize(os.path.join(ICI, nom))} octets")


if __name__ == "__main__":
    main()
