"""rendre_logo.py — pilote de rendu d'oracle-logo-petit.mjs (TF-2074).

Ne juge rien : rend chaque SVG en PNG RGBA à fond transparent, aux tailles demandées (16 et 32 px
pour le jugement, 128 px pour la référence), dans Chromium (Playwright). Les mesures et le verdict
vivent dans l'oracle, en un seul endroit.

Le SVG est chargé comme IMAGE (balise <img>, data: URI), jamais comme document : comme sur une page,
dans un onglet ou en favicon, il est donc rendu sans script ni ressource externe. Le facteur
d'échelle de l'appareil est 1 : un pixel de la sortie est un pixel de la taille demandée.

Entrée (JSON sur stdin) :
  fichiers : liste de chemins de fichiers SVG
  tailles  : liste de côtés en pixels (la boîte est carrée, le SVG y est inscrit, proportions gardées)
Sortie : {"ok": true, "resultats": [{fichier, rendus: {"16": <base64 PNG>, ...}} | {fichier, erreur}]}
         ou {"ok": false, "erreur": "..."} si le navigateur ne démarre pas.
"""
import base64
import json
import sys


def main():
    entree = json.loads(sys.stdin.read())
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:  # pragma: no cover - dépend du poste
        print(json.dumps({"ok": False, "erreur": f"playwright non importable : {e}"}))
        return 0

    resultats = []
    with sync_playwright() as p:
        try:
            navigateur = p.chromium.launch()
        except Exception as e:
            print(json.dumps({"ok": False, "erreur": f"navigateur indisponible : {e}"}))
            return 0
        contexte = navigateur.new_context(device_scale_factor=1)
        page = contexte.new_page()
        for fichier in entree["fichiers"]:
            r = {"fichier": fichier}
            try:
                with open(fichier, "rb") as f:
                    brut = f.read()
                uri = "data:image/svg+xml;base64," + base64.b64encode(brut).decode("ascii")
                rendus = {}
                for taille in entree["tailles"]:
                    page.set_viewport_size({"width": taille, "height": taille})
                    page.set_content(
                        "<!DOCTYPE html><html><head><style>"
                        "html,body{margin:0;padding:0;background:transparent}"
                        f"img{{display:block;width:{taille}px;height:{taille}px;object-fit:contain}}"
                        "</style></head><body><img id=\"logo\" alt=\"\"></body></html>"
                    )
                    charge = page.evaluate(
                        "(uri) => new Promise((ok) => { const i = document.getElementById('logo');"
                        " i.onload = () => ok(i.naturalWidth > 0); i.onerror = () => ok(false); i.src = uri; })",
                        uri,
                    )
                    if not charge:
                        raise ValueError("le navigateur ne rend pas ce fichier comme image SVG")
                    png = page.screenshot(clip={"x": 0, "y": 0, "width": taille, "height": taille}, omit_background=True)
                    rendus[str(taille)] = base64.b64encode(png).decode("ascii")
                r["rendus"] = rendus
            except Exception as e:
                r["erreur"] = str(e).splitlines()[0][:300] if str(e) else e.__class__.__name__
            resultats.append(r)
        navigateur.close()
    print(json.dumps({"ok": True, "resultats": resultats}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
