"""mesure_fluidite.py — pilote de rendu d'oracle-fluidite.mjs (D-108 (b), 29/10/2026).

Ne juge rien : ouvre la cible dans Chromium (Playwright), y pose le script de mesure AVANT tout script
de la page, laisse l'animation chauffer, ouvre une fenêtre de mesure, et rend les mesures brutes en JSON
sur stdout. Les seuils et le verdict vivent dans lib/fluidite.mjs, en un seul endroit.

Entrée (JSON sur stdin) :
  cible          : URL (file:// ou http(s)://)
  largeur, hauteur : fenêtre en px
  init           : source JavaScript posée avant les scripts de la page
  armer          : source d'une fonction (mode) => void
  demarrer       : source d'une fonction () => void   (ouvre la fenêtre de mesure)
  arreter        : source d'une fonction () => mesures brutes (ferme la fenêtre)
  echauffement_ms, fenetre_ms : durées en ms
  passes         : liste de modes, une session de navigateur NEUVE par passe (ex. ["bout_en_bout"])
Sortie : {"ok": true, "navigateur": "...", "passes": [{"mode", "brut", "tentatives"}]}
         ou {"ok": false, "erreur": "..."} si le navigateur ou la page ne démarre pas.

CONTEXTE PERDU, ET REJEU. Mesuré le 29/10/2026 sur le poste de rédaction (Windows, Chromium 145, sans
aucune instrumentation de ce dépôt : une page d'essai qui crée un contexte WebGL et attend 2,5 s) : le
contexte était PERDU ~40 ms après sa création dans 8 lancements sur 10 avec le moteur de rendu par
défaut (13 sur 15 lors d'une première série), et dans 0 lancement sur 14 avec le moteur logiciel demandé
explicitement (--use-angle=swiftshader --use-gl=angle). La cause du processus graphique qui tombe n'est
PAS établie (le poste était sous forte charge mémoire : 4 Go libres sur 64 Go). Une mesure prise sur un
contexte perdu ne dit rien : elle est REJOUÉE, dans une session neuve, avec le moteur par défaut d'abord
(c'est lui qui emploie une vraie carte quand le poste en a une), puis une dernière fois avec le moteur
logiciel forcé. Chaque tentative est rendue (`tentatives`) avec sa stratégie : le jugement dit laquelle
a fourni la mesure.
"""
import json
import sys

# Stratégies de lancement, dans l'ordre. `--enable-unsafe-swiftshader` n'impose rien : il autorise le repli
# logiciel quand le poste n'a pas de carte. La dernière FORCE le moteur logiciel.
STRATEGIES = [
    ("defaut", ["--enable-unsafe-swiftshader"]),
    ("defaut", ["--enable-unsafe-swiftshader"]),
    ("logiciel_force", ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--use-gl=angle"]),
]


def mesurer(p, entree, mode, args):
    navigateur = p.chromium.launch(args=args)
    try:
        version = navigateur.version
        contexte = navigateur.new_context(viewport={"width": entree["largeur"], "height": entree["hauteur"]})
        contexte.add_init_script(entree["init"])
        page = contexte.new_page()
        page.goto(entree["cible"], wait_until="load", timeout=60000)
        page.evaluate(entree["armer"], mode)
        page.wait_for_timeout(int(entree["echauffement_ms"]))
        # Contexte déjà perdu pendant l'échauffement : inutile d'ouvrir la fenêtre de mesure, on rejoue.
        brut = page.evaluate(entree["arreter"])
        if brut.get("contexte_perdu"):
            contexte.close()
            return version, brut
        page.evaluate(entree["demarrer"])
        page.wait_for_timeout(int(entree["fenetre_ms"]))
        brut = page.evaluate(entree["arreter"])
        contexte.close()
        return version, brut
    finally:
        navigateur.close()


def main():
    entree = json.loads(sys.stdin.read())
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:  # pragma: no cover - dépend du poste
        print(json.dumps({"ok": False, "erreur": f"playwright non importable : {e}"}))
        return 0

    sorties = []
    version = None
    with sync_playwright() as p:
        try:
            for mode in entree["passes"]:
                tentatives = []
                brut = None
                for strategie, args in STRATEGIES:
                    try:
                        version, brut = mesurer(p, entree, mode, args)
                    except Exception as e:
                        if not tentatives and not sorties:
                            # Première tentative de la première passe : le navigateur ou la page ne démarre pas.
                            print(json.dumps({"ok": False, "erreur": str(e).splitlines()[0][:300]}))
                            return 0
                        tentatives.append({"strategie": strategie, "erreur": str(e).splitlines()[0][:200]})
                        continue
                    perdu = bool(brut.get("contexte_perdu"))
                    tentatives.append({"strategie": strategie, "contexte_perdu": perdu})
                    if not perdu:
                        break
                if brut is None:
                    print(json.dumps({"ok": False, "erreur": "toutes les tentatives ont échoué : "
                                      + json.dumps(tentatives, ensure_ascii=False)}))
                    return 0
                sorties.append({"mode": mode, "brut": brut, "tentatives": tentatives})
        except Exception as e:
            print(json.dumps({"ok": False, "erreur": str(e).splitlines()[0][:300]}))
            return 0
    print(json.dumps({"ok": True, "navigateur": version, "passes": sorties}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
