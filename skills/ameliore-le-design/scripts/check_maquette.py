#!/usr/bin/env python3
"""Controle de parcours d'une maquette mono-fichier.

Juge ce qui est decidable sur le fichier lui-meme : poids, autonomie reseau,
bijection menu <-> ecrans, liens morts, bandeau de donnees de demonstration,
presence des deux themes, respect du mouvement reduit, feuille d'impression.

Ce qui exige un rendu reel (debordements, chevauchements, contraste, clavier)
est declare non_juge et delegue a render_page.py du skill digit-ai-page-html.

Contrat de sortie commun : JSON sur stdout, exit 0 = PASS, 1 = FAIL, 2 = erreur.
Usage : python check_maquette.py maquette.html [--max-mo 10] [--json-only]
"""

import argparse
import json
import os
import re
import sys

PLAFOND_MO_DEFAUT = 10.0

NON_JUGE = [
    "debordements et chevauchements (V1/V4) - deleguer a render_page.py",
    "contraste WCAG mesure (V2) - deleguer a render_page.py sur les deux themes",
    "navigation clavier reelle - parcours a executer",
    "atteignabilite des etats vide/chargement/erreur - parcours a executer",
    "qualite de la direction visuelle - jugement humain",
]


def lire(chemin):
    with open(chemin, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def ressources_externes(html):
    """URLs absolues chargees par le document (hors ancres et liens de contenu)."""
    trouvees = []
    for attr in ("src", "href"):
        for m in re.finditer(r'<(\w+)[^>]*\b%s\s*=\s*["\']([^"\']+)["\']' % attr, html, re.I):
            balise, url = m.group(1).lower(), m.group(2).strip()
            if attr == "href" and balise == "a":
                continue  # lien de contenu, pas un chargement
            if url.startswith(("http://", "https://", "//")):
                trouvees.append("%s[%s=%s]" % (balise, attr, url[:80]))
    return sorted(set(trouvees))


def routes_declarees(html):
    """Routes referencees par la navigation (href="#route")."""
    return sorted({
        m.group(1) for m in re.finditer(r'href\s*=\s*["\']#([A-Za-z0-9_\-/]+)["\']', html)
        if m.group(1).lower() not in ("", "top", "main", "contenu")
    })


def routes_implementees(html):
    """Routes que le code sait rendre : cles de table de routage ou id de section."""
    cles = set(re.findall(r'["\']#?([A-Za-z0-9_\-/]+)["\']\s*:\s*(?:function|\(|\w+\s*=>)', html))
    cles |= set(re.findall(r'\bcase\s+["\']#?([A-Za-z0-9_\-/]+)["\']', html))
    cles |= set(re.findall(r'\bid\s*=\s*["\']([A-Za-z0-9_\-/]+)["\']', html))
    cles |= set(re.findall(r'data-route\s*=\s*["\']#?([A-Za-z0-9_\-/]+)["\']', html))
    return cles


def controler(chemin, plafond_mo):
    findings = []
    html = lire(chemin)

    # C3a - poids
    taille_mo = os.path.getsize(chemin) / (1024 * 1024)
    if taille_mo > plafond_mo:
        findings.append({
            "critere": "C3", "gravite": "bloquant", "ou": chemin,
            "constat": "poids %.2f Mo > plafond %.1f Mo" % (taille_mo, plafond_mo),
        })

    # C3b - autonomie reseau
    externes = ressources_externes(html)
    if externes:
        findings.append({
            "critere": "C3", "gravite": "bloquant", "ou": chemin,
            "constat": "%d ressource(s) externe(s) : %s" % (len(externes), ", ".join(externes[:5])),
        })

    # C2 - bijection menu <-> ecrans
    declarees, implementees = routes_declarees(html), routes_implementees(html)
    orphelines = [r for r in declarees if r not in implementees]
    if orphelines:
        findings.append({
            "critere": "C2", "gravite": "bloquant", "ou": "navigation",
            "constat": "route(s) annoncee(s) sans ecran : %s" % ", ".join(orphelines[:10]),
        })
    if not declarees:
        findings.append({
            "critere": "C2", "gravite": "avertissement", "ou": "navigation",
            "constat": "aucune route hash detectee - parcours non verifiable par script",
        })

    # C6 - bandeau de donnees de demonstration
    if not re.search(r"d[ée]monstration|donn[ée]es fictives|non contractuel", html, re.I):
        findings.append({
            "critere": "C6", "gravite": "bloquant", "ou": chemin,
            "constat": "aucune mention de donnees de demonstration",
        })

    # Deux themes
    a_bascule = bool(re.search(r"data-theme|classList\.toggle\(\s*['\"]dark", html))
    a_sombre = bool(re.search(r"prefers-color-scheme\s*:\s*dark|\[data-theme=['\"]?dark", html))
    if not (a_bascule and a_sombre):
        findings.append({
            "critere": "C1", "gravite": "bloquant", "ou": "themes",
            "constat": "theme sombre incomplet (bascule=%s, styles=%s)" % (a_bascule, a_sombre),
        })

    # Plancher d'accessibilite decidable statiquement
    if not re.search(r"prefers-reduced-motion", html):
        findings.append({"critere": "C4", "gravite": "avertissement", "ou": "motion",
                         "constat": "prefers-reduced-motion absent"})
    if not re.search(r"@media\s+print", html):
        findings.append({"critere": "C1", "gravite": "avertissement", "ou": "print",
                         "constat": "feuille @media print absente"})
    if not re.search(r'<html[^>]*\blang\s*=', html, re.I):
        findings.append({"critere": "C4", "gravite": "avertissement", "ou": "<html>",
                         "constat": "attribut lang absent"})
    if not re.search(r'name\s*=\s*["\']viewport', html, re.I):
        findings.append({"critere": "C1", "gravite": "bloquant", "ou": "<head>",
                         "constat": "meta viewport absente - responsive impossible"})

    # Breakpoints couverts
    largeurs = {int(m) for m in re.findall(r"max-width\s*:\s*(\d+)px", html)}
    if len(largeurs) < 2:
        findings.append({"critere": "C1", "gravite": "avertissement", "ou": "css",
                         "constat": "moins de 2 breakpoints detectes"})

    bloquants = [f for f in findings if f["gravite"] == "bloquant"]
    return {
        "outil": "check_maquette",
        "fichier": os.path.basename(chemin),
        "verdict": "FAIL" if bloquants else "PASS",
        "mesures": {
            "poids_mo": round(taille_mo, 2),
            "plafond_mo": plafond_mo,
            "routes_declarees": len(declarees),
            "ressources_externes": len(externes),
            "breakpoints": sorted(largeurs),
        },
        "findings": findings,
        "non_juge": NON_JUGE,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("fichier")
    ap.add_argument("--max-mo", type=float, default=PLAFOND_MO_DEFAUT)
    ap.add_argument("--json-only", action="store_true")
    args = ap.parse_args()

    if not os.path.isfile(args.fichier):
        print(json.dumps({"verdict": "SKIP", "raison": "fichier introuvable: %s" % args.fichier}))
        return 2

    try:
        rapport = controler(args.fichier, args.max_mo)
    except Exception as exc:  # noqa: BLE001 - le contrat exige un exit 2 explicite
        print(json.dumps({"verdict": "SKIP", "raison": "erreur de controle: %s" % exc}))
        return 2

    print(json.dumps(rapport, ensure_ascii=False, indent=2))
    if not args.json_only:
        print("\n%s - %s : %d finding(s), poids %.2f Mo" % (
            rapport["verdict"], rapport["fichier"],
            len(rapport["findings"]), rapport["mesures"]["poids_mo"]), file=sys.stderr)
        for f in rapport["findings"]:
            print("  [%s] %s (%s) - %s" % (
                f["gravite"], f["critere"], f["ou"], f["constat"]), file=sys.stderr)
        print("  non juge : %d point(s) delegues" % len(NON_JUGE), file=sys.stderr)

    return 1 if rapport["verdict"] == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main())
