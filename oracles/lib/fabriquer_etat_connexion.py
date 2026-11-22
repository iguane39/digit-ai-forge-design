"""fabriquer_etat_connexion.py — pilote de connexion de scripts/fabriquer-etat-connexion.mjs (TF-2781).

Ouvre la page de connexion d'une application dans Chromium (Playwright), saisit l'identifiant et le secret,
envoie le formulaire, vérifie que la connexion est établie, puis écrit l'état de session (storageState
Playwright) que `--etat-connexion` de run-oracles-design, d'oracle-exploitabilite, d'oracle-erreurs-formulaire
et d'oracle-baseline attend. Ne juge rien et n'imprime jamais ni l'identifiant, ni le secret, ni un cookie.

Entrée (JSON sur stdin — les valeurs ne passent jamais par la ligne de commande) :
  url               : page de connexion (http:// ou https://)
  identifiant, secret : valeurs saisies (lues des variables d'environnement par l'enveloppe Node)
  champ_identifiant, champ_secret, bouton : sélecteurs CSS
  attendre_url      : (optionnel) motif d'expression régulière que l'adresse doit atteindre après l'envoi
  attente           : délai maximal en ms pour que la connexion s'établisse
  certificat_local  : true ⇒ un certificat https non reconnu est accepté POUR LES HÔTES DE BOUCLE LOCALE SEULEMENT
  sortie            : chemin du fichier d'état à écrire
Sortie : {"ok": true, "url_finale": "...", "cookies": N, "origines": N}
         ou {"ok": false, "erreur": "...", "code": 1|2} — 1 : connexion refusée ou non établie, 2 : outillage absent.
"""
import json
import re
import sys
from urllib.parse import urlsplit

HOTES_LOCAUX = {"localhost", "127.0.0.1", "::1"}


def sortir(objet):
    print(json.dumps(objet, ensure_ascii=False))
    return 0


def main():
    entree = json.loads(sys.stdin.read())
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:  # pragma: no cover - dépend du poste
        return sortir({"ok": False, "code": 2, "erreur": f"playwright non importable : {e}"})

    hote = (urlsplit(entree["url"]).hostname or "").lower()
    if entree.get("certificat_local") and hote not in HOTES_LOCAUX:
        return sortir({"ok": False, "code": 2, "erreur": f"--accepter-certificat-local refusé : l'hôte « {hote[:80]} » n'est pas de la boucle locale"})

    delai = int(entree.get("attente", 15000))
    with sync_playwright() as p:
        try:
            navigateur = p.chromium.launch()
        except Exception as e:
            return sortir({"ok": False, "code": 2, "erreur": f"navigateur indisponible : {e}"})
        try:
            contexte = navigateur.new_context(ignore_https_errors=bool(entree.get("certificat_local")))
            page = contexte.new_page()
            page.set_default_timeout(delai)
            reponse = page.goto(entree["url"], wait_until="load")
            if reponse is not None and reponse.status >= 400:
                return sortir({"ok": False, "code": 1, "erreur": f"la page de connexion répond {reponse.status}"})
            try:
                page.locator(entree["champ_identifiant"]).first.fill(entree["identifiant"])
                page.locator(entree["champ_secret"]).first.fill(entree["secret"])
            except Exception as e:
                return sortir({"ok": False, "code": 1, "erreur": "champ de saisie introuvable sur la page de connexion : "
                               + str(e).splitlines()[0][:160] + " — nommer les champs avec --champ-identifiant et --champ-secret"})
            try:
                with page.expect_navigation(wait_until="load", timeout=delai):
                    page.locator(entree["bouton"]).first.click()
            except Exception:
                # Une application à page unique ne navigue pas : le contrôle ci-dessous tranche.
                page.wait_for_timeout(1000)

            url_finale = page.url
            if entree.get("attendre_url"):
                try:
                    page.wait_for_url(re.compile(entree["attendre_url"]), timeout=delai)
                except Exception:
                    return sortir({"ok": False, "code": 1, "erreur": f"l'adresse {urlsplit(page.url).path[:80]} n'atteint pas le motif attendu après l'envoi : connexion non établie"})
                url_finale = page.url
            elif page.locator(entree["champ_secret"]).first.is_visible():
                # Le champ du secret est encore là : le formulaire a été refusé ou rendu à nouveau.
                return sortir({"ok": False, "code": 1, "erreur": "le champ du secret est encore affiché après l'envoi : identifiant ou secret refusé, aucun état écrit"})

            etat = contexte.storage_state(path=entree["sortie"])
            return sortir({"ok": True, "url_finale": url_finale, "cookies": len(etat.get("cookies", [])), "origines": len(etat.get("origins", []))})
        finally:
            navigateur.close()


if __name__ == "__main__":
    sys.exit(main())
