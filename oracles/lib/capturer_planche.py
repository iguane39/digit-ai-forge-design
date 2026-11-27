#!/usr/bin/env python3
"""capturer_planche.py — les deux gestes de navigateur de planche-mosaique.mjs (TF-2909) : capturer des pages, photographier la planche.

Usage : python capturer_planche.py <spec.json>
  spec capturer      : {"mode": "capturer", "largeur": 1920, "hauteur": 1080, "pleine_page": false, "hauteur_max": 4000,
                        "captures": [{"source": "<file:// ou http://127.0.0.1…>", "sortie": "<fichier.png>"}]}
  spec photographier : {"mode": "photographier", "page": "<file://planche.html>", "sortie": "<planche.png>", "largeur": 3000}
Sortie (stdout) : {"resultats": [{"sortie": …, "ok": true, "largeur": N, "hauteur": N} | {"sortie": …, "ok": false, "motif": "…"}]}
Code de sortie : 0 fait (chaque capture dit son propre résultat), 2 impossible (module ou navigateur absent, spec illisible : motif sur stderr).

Le mouvement est réduit à sa fin (prefers-reduced-motion: reduce) : deux captures d'une même page rendent les mêmes pixels.
Une capture qui échoue est RENDUE avec son motif, jamais omise : la planche en fait une vignette « capture manquante ».
"""
import json
import sys


def main():
    if len(sys.argv) != 2:
        sys.stderr.write('usage : capturer_planche.py <spec.json>\n')
        return 2
    try:
        with open(sys.argv[1], encoding='utf-8') as f:
            spec = json.load(f)
    except Exception as e:
        sys.stderr.write('spec illisible : %s\n' % e)
        return 2
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:
        sys.stderr.write('module Python manquant : %s\n' % e)
        return 2
    resultats = []
    try:
        with sync_playwright() as p:
            navigateur = p.chromium.launch()
            if spec.get('mode') == 'photographier':
                page = navigateur.new_page(viewport={'width': int(spec['largeur']), 'height': 800})
                try:
                    page.goto(spec['page'], wait_until='load', timeout=60000)
                    page.screenshot(path=spec['sortie'], full_page=True)
                    taille = page.evaluate('() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]')
                    resultats.append({'sortie': spec['sortie'], 'ok': True, 'largeur': taille[0], 'hauteur': taille[1]})
                except Exception as e:
                    resultats.append({'sortie': spec['sortie'], 'ok': False, 'motif': '%s: %s' % (type(e).__name__, str(e)[:200])})
            else:
                largeur, hauteur = int(spec['largeur']), int(spec['hauteur'])
                for c in spec['captures']:
                    contexte = navigateur.new_context(viewport={'width': largeur, 'height': hauteur}, reduced_motion='reduce')
                    page = contexte.new_page()
                    try:
                        reponse = page.goto(c['source'], wait_until='load', timeout=30000)
                        if reponse is not None and reponse.status >= 400:
                            raise RuntimeError('HTTP %d' % reponse.status)
                        page.evaluate('() => document.fonts && document.fonts.ready')
                        page.wait_for_timeout(300)
                        if spec.get('pleine_page'):
                            haut = min(int(page.evaluate('() => document.documentElement.scrollHeight')), int(spec['hauteur_max']))
                            page.screenshot(path=c['sortie'], full_page=True, clip={'x': 0, 'y': 0, 'width': largeur, 'height': haut})
                        else:
                            page.screenshot(path=c['sortie'])
                        taille = page.evaluate('() => [window.innerWidth, window.innerHeight]')
                        resultats.append({'sortie': c['sortie'], 'ok': True, 'largeur': taille[0],
                                          'hauteur': haut if spec.get('pleine_page') else taille[1]})
                    except Exception as e:
                        resultats.append({'sortie': c['sortie'], 'ok': False, 'motif': '%s: %s' % (type(e).__name__, str(e)[:200])})
                    finally:
                        contexte.close()
            navigateur.close()
    except Exception as e:
        sys.stderr.write('navigateur impossible : %s: %s\n' % (type(e).__name__, str(e)[:200]))
        return 2
    sys.stdout.write(json.dumps({'resultats': resultats}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
