"""faux-render-page.py — banc de la capture manquante (D-108 (b), 29/10/2026).

Joue le rôle de render_page.py (digit-ai-page-html) pour la recette de run-oracles-design.mjs et de
rendu-comparatif.mjs, SANS navigateur : il rend la forme réelle de sa sortie JSON (`breakpoints`,
`captures_manquees`, `capture.faite`, `png`), en faisant manquer à volonté la capture de certaines
largeurs — le cas du 27/10, où une capture à 390 px exigée n'avait pas pu être faite.

  FAUX_RENDU_MANQUE         largeurs sans capture, pour tout rendu            (ex. « 390 »)
  FAUX_RENDU_MANQUE_AVANT   idem, seulement pour le rendu dont le fichier s'appelle avant-*.html
  FAUX_RENDU_MANQUE_APRES   idem, seulement pour le rendu dont le fichier s'appelle apres-*.html

Il ne juge rien : aucun constat, verdict PASS. Il n'est installé que dans un faux dossier personnel de
recette (la recette y copie ce fichier sous .claude/skills/digit-ai-page-html/scripts/render_page.py).
"""
import json
import os
import sys
from pathlib import Path


def largeurs_de(nom):
    return {int(x) for x in os.environ.get(nom, "").split(",") if x.strip()}


def main():
    a = sys.argv[1:]
    if "--familles" in a:
        print(json.dumps({"schema": "digit-ai/familles-mesure@1", "familles": {
            "v1_overflow": {"severite": "bloquant", "libelle": "V1 débordement horizontal"}}}))
        return 0
    page = Path(a[0])
    widths = [int(x) for x in a[a.index("--widths") + 1].split(",")]
    sortie = Path(a[a.index("--out") + 1]) if "--out" in a else page.parent
    manque = largeurs_de("FAUX_RENDU_MANQUE")
    if page.stem.startswith("avant"):
        manque |= largeurs_de("FAUX_RENDU_MANQUE_AVANT")
    if page.stem.startswith("apres"):
        manque |= largeurs_de("FAUX_RENDU_MANQUE_APRES")
    rapport = {"verdict": "PASS", "breakpoints": {}, "captures_manquees": [], "non_juge": []}
    for w in widths:
        if w in manque:
            rapport["breakpoints"][str(w)] = {
                "png": None,
                "capture": {"faite": False, "motif": "capture impossible a %d px : TimeoutError — la page n'a pas rendu "
                            "dans le delai" % w},
                "issues": {}, "blocking": 0}
            rapport["captures_manquees"].append(w)
        else:
            png = sortie / ("%s-w%d.png" % (page.stem, w))
            png.write_bytes(b"\x89PNG\r\n\x1a\n")
            rapport["breakpoints"][str(w)] = {"png": str(png), "capture": {"faite": True}, "issues": {}, "blocking": 0}
    print(json.dumps(rapport))
    return 0


if __name__ == "__main__":
    sys.exit(main())
