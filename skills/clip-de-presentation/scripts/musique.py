"""Musique de clip composée en code (numpy), sans service ni banque de sons.

Usage :
  python musique.py --sortie musique.wav --duree 66 --bpm 120 --cle 0 \
      --impacts 2,12,20,28,40,50,60 --intro 12 --montee 20 --outro 60

Structure : une mesure dure 4 temps (2 s à 120 BPM). Intro = nappe seule ; montée = basse et
charleston ; corps = grosse caisse, basse, arpège ; outro = nappe et basse. Chaque impact est
précédé d'une montée de bruit de 2 s : le clip cale ses moments forts sur ces instants.
Déterministe : même arguments, même fichier.

Les instants sont en temps du MP4. Un clip enveloppé par M.introduire démarre 6 s plus tard :
un impact à 2 s pour le titre de l'introduction, puis chaque impact du storyboard plus 6, et
--intro, --montee, --outro plus 6 (l'exemple ci-dessus : storyboard 6,14,22,34,44,54).
"""
import argparse
import sys
import wave

import numpy as np

SR = 48000

# Même raison que rendre.py : sous Windows, une sortie redirigée garde ses accents lisibles.
for flux in (sys.stdout, sys.stderr):
    if hasattr(flux, "reconfigure"):
        flux.reconfigure(encoding="utf-8")


def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def enveloppe(n, attaque, decroissance):
    t = np.arange(n) / SR
    a = np.clip(t / max(attaque, 1e-4), 0, 1)
    return a * np.exp(-t / max(decroissance, 1e-4))


def voix_douce(freq, n, harmoniques=6, desaccord=0.0):
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k in range(1, harmoniques + 1):
        s += np.sin(2 * np.pi * freq * k * (1 + desaccord) * t) / k ** 1.6
    return s


def ajouter(piste, debut_s, son):
    i = int(debut_s * SR)
    if i >= len(piste):
        return
    j = min(len(piste), i + len(son))
    piste[i:j] += son[: j - i]


def composer(duree, bpm, cle, impacts, intro, montee, outro, graine=7):
    rng = np.random.default_rng(graine)
    n = int(duree * SR)
    temps = 60.0 / bpm
    mesure = 4 * temps
    g = np.zeros(n)  # gauche
    d = np.zeros(n)  # droite
    # Progression la mineur : Am F C G (racines), transposée de `cle` demi-tons.
    accords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    racines = [45, 41, 48, 43]
    nb_mesures = int(np.ceil(duree / mesure))

    for m in range(nb_mesures):
        t0 = m * mesure
        idx = (m // 2) % 4  # un accord toutes les 2 mesures
        acc = [x + cle for x in accords[idx]]
        rac = racines[idx] + cle
        nn = int(mesure * SR)
        # Nappe : toujours présente, plus discrète au corps
        niveau_nappe = 0.20 if (t0 < montee or t0 >= outro) else 0.13
        env = np.minimum(1, np.arange(nn) / (0.4 * SR)) * np.minimum(1, (nn - np.arange(nn)) / (0.3 * SR))
        nappe = sum(voix_douce(note(x), nn, 5, 0.002) + voix_douce(note(x), nn, 5, -0.002) for x in acc)
        ajouter(g, t0, niveau_nappe * env * nappe / 3)
        ajouter(d, t0 + 0.012, niveau_nappe * env * nappe / 3)

        for b in range(8):  # croches
            tb = t0 + b * temps / 2
            if tb >= duree:
                break
            corps = montee <= tb < outro
            # Basse : croches dès la montée
            if tb >= intro:
                nb = int(0.24 * SR)
                f = note(rac - 12 + (12 if b % 4 == 3 else 0))
                basse = (np.sin(2 * np.pi * f * np.arange(nb) / SR) + 0.35 * np.sin(4 * np.pi * f * np.arange(nb) / SR))
                basse = np.tanh(1.6 * basse) * enveloppe(nb, 0.004, 0.11)
                ajouter(g, tb, 0.22 * basse)
                ajouter(d, tb, 0.22 * basse)
            # Charleston sur les contretemps
            if tb >= intro and b % 2 == 1 and tb < outro:
                nh = int(0.06 * SR)
                bruit = np.diff(rng.standard_normal(nh + 1)) * enveloppe(nh, 0.001, 0.018)
                ajouter(g, tb, 0.05 * bruit)
                ajouter(d, tb, 0.06 * bruit)
            # Grosse caisse sur les temps, au corps
            if corps and b % 2 == 0:
                nk = int(0.35 * SR)
                tt = np.arange(nk) / SR
                freq = 45 + 75 * np.exp(-tt / 0.03)
                kick = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-tt / 0.16)
                ajouter(g, tb, 0.55 * kick)
                ajouter(d, tb, 0.55 * kick)
            # Arpège en doubles croches, au corps
            if corps:
                for s in range(2):
                    ts = tb + s * temps / 4
                    na = int(0.12 * SR)
                    hauteur = acc[(b * 2 + s) % 3] + 12
                    arp = voix_douce(note(hauteur), na, 3) * enveloppe(na, 0.002, 0.05)
                    pan = 0.5 + 0.35 * np.sin(ts * 1.7)
                    ajouter(g, ts, 0.07 * (1 - pan) * arp)
                    ajouter(d, ts, 0.07 * pan * arp)

    for ti in impacts:
        # Montée de bruit de 2 s qui finit sur l'impact
        nr = int(2.0 * SR)
        bruit = rng.standard_normal(nr)
        rampe = (np.arange(nr) / nr) ** 2.2
        clair = np.diff(np.concatenate([[0], bruit])) * rampe + 0.3 * bruit * rampe
        ajouter(g, ti - 2.0, 0.07 * clair)
        ajouter(d, ti - 2.0, 0.07 * clair)
        # Impact : boum grave et souffle court
        ni = int(1.6 * SR)
        tt = np.arange(ni) / SR
        boum = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt / 0.05)) / SR) * np.exp(-tt / 0.45)
        souffle = rng.standard_normal(ni) * np.exp(-tt / 0.08)
        ajouter(g, ti, 0.6 * boum + 0.12 * souffle)
        ajouter(d, ti, 0.6 * boum + 0.12 * souffle)

    stereo = np.stack([g, d], axis=1)
    # Fondu d'entrée et de sortie
    fi = int(0.4 * SR)
    fo = int(2.5 * SR)
    stereo[:fi] *= np.linspace(0, 1, fi)[:, None]
    stereo[-fo:] *= np.linspace(1, 0, fo)[:, None]
    stereo = np.tanh(1.2 * stereo)
    stereo /= max(1e-9, np.max(np.abs(stereo))) / 0.89
    return stereo


def ecrire_wav(chemin, stereo):
    data = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(chemin, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--sortie", required=True)
    p.add_argument("--duree", type=float, default=60)
    p.add_argument("--bpm", type=float, default=120)
    p.add_argument("--cle", type=int, default=0)
    p.add_argument("--impacts", default="")
    p.add_argument("--intro", type=float, default=6)
    p.add_argument("--montee", type=float, default=14)
    p.add_argument("--outro", type=float, default=54)
    p.add_argument("--graine", type=int, default=7)
    a = p.parse_args()
    impacts = [float(x) for x in a.impacts.split(",") if x.strip()]
    s = composer(a.duree, a.bpm, a.cle, impacts, a.intro, a.montee, a.outro, a.graine)
    ecrire_wav(a.sortie, s)
    print(f"musique écrite : {a.sortie} ({a.duree:.1f} s, {a.bpm:.0f} BPM, impacts {impacts})")


if __name__ == "__main__":
    main()
