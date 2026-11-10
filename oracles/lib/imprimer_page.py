#!/usr/bin/env python3
"""imprimer_page.py — imprime une page HTML en PDF par Chromium, pour oracle-document-imprime (TF-2385).

Un contrôle d'impression se lit sur le PDF, pas sur l'émulation d'impression de l'écran (2,2 mm d'écart mesuré le 28/09/2026).
La page est ouverte depuis le disque, imprimée avec ses fonds et la taille de page de son @page, et jamais réécrite.

Usage : python imprimer_page.py <page.html> <sortie.pdf>     Code de sortie : 0 écrit, 2 impossible (motif sur stderr).
"""
import os
import sys
from pathlib import Path


def main():
    if len(sys.argv) != 3 or not os.path.isfile(sys.argv[1]):
        sys.stderr.write('usage : imprimer_page.py <page.html> <sortie.pdf> (page absente ?)\n')
        return 2
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:
        sys.stderr.write('module Python manquant : %s\n' % e)
        return 2
    try:
        with sync_playwright() as p:
            navigateur = p.chromium.launch()
            page = navigateur.new_page()
            page.goto(Path(sys.argv[1]).resolve().as_uri())
            page.pdf(path=sys.argv[2], prefer_css_page_size=True, print_background=True)
            navigateur.close()
    except Exception as e:
        sys.stderr.write('impression impossible : %s: %s\n' % (type(e).__name__, str(e)[:200]))
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
