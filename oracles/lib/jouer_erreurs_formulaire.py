"""jouer_erreurs_formulaire.py — pilote de rendu d'oracle-erreurs-formulaire.mjs (TF-2172).

Ne juge rien : ouvre chaque cible dans Chromium (Playwright), repère les champs éprouvables, puis pour CHAQUE champ,
sur un chargement neuf, y saisit une valeur fausse, quitte le champ, tente l'envoi, et rend les mesures brutes en JSON
sur stdout. Les seuils et le verdict vivent dans l'oracle, en un seul endroit.

Garde-fou : toute requête d'ÉCRITURE (POST, PUT, PATCH, DELETE) est interceptée et refusée. Une instance servie et
alimentée ne reçoit jamais la valeur fausse : rien n'est créé chez elle. La requête tentée est comptée (EF4).
Une seule exception, étroite (TF-2307) : la requête de VÉRIFICATION AU CHAMP que la page déclare sans effet. Elle passe
si TOUT ceci est vrai : POST, émise par fetch ou XHR (jamais une navigation, donc jamais l'envoi natif du formulaire),
vers l'origine de la page, sur un chemin qui n'est l'`action` d'aucun formulaire de la page, et qui est soit celui que
déclare un formulaire par `data-verifier="/chemin"`, soit un chemin dont le dernier segment est `verifier`. Toute autre
requête d'écriture reste interceptée. Les requêtes passées sont comptées à part (`verifications_passees`) : l'absence
d'effet est la promesse du produit, l'oracle ne la prouve pas.

Entrée (JSON sur stdin) :
  cibles, largeur, hauteur, etat, certificat_local, attente : comme mesure_exploitabilite.py (TF-2122 : le certificat
             auto-signé n'est accepté que pour les hôtes de boucle locale ; toute requête https vers un autre hôte est
             bloquée et listée — logique recopiée de mesure_exploitabilite.py, à factoriser)
  plan     : source JavaScript d'une fonction (maxChamps) => {champs[], non_eprouves[]} qui marque les champs
  etat_champ : source JavaScript d'une fonction ({cle, base}) => état du champ (messages reliés, aria-invalid…)
  max_champs : nombre de champs éprouvés au plus par écran
  statut_attendu : code HTTP d'un écran d'état voulu (TF-2432), ou null ; l'écran n'est joué que servi avec ce code
Sortie : {"ok": true, "resultats": [{cible, url_finale, statut, champs[], non_eprouves[] | erreur}]}
         ou {"ok": false, "erreur": "..."} si le navigateur ne démarre pas.
"""
import json
import sys
from urllib.parse import urljoin, urlsplit

HOTES_LOCAUX = {"localhost", "127.0.0.1", "::1"}  # urlsplit().hostname retire les crochets de [::1]
METHODES_LECTURE = {"GET", "HEAD", "OPTIONS"}

# Écoute d'envoi : en capture sur window, avant tout script de la page ; l'état d'annulation se lit APRÈS la
# distribution de l'événement (setTimeout), car le composant peut stopper la propagation.
ECOUTE = """() => {
  window.__ef = { soumis: [] };
  window.addEventListener('submit', (e) => {
    setTimeout(() => window.__ef.soumis.push({ empeche: e.defaultPrevented }), 0);
  }, true);
}"""

# Marque le contrôle d'envoi du formulaire du champ ; sans bouton, l'envoi se demande par requestSubmit.
ENVOI = """(cle) => {
  const champ = document.querySelector('[data-forge-champ="' + cle + '"]');
  const form = champ && champ.form;
  if (!form) return { bouton: false, formulaire: false };
  const bouton = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
  if (bouton) { bouton.setAttribute('data-forge-envoi', '1'); return { bouton: true, formulaire: true }; }
  return { bouton: false, formulaire: true };
}"""


# Ce que la page déclare : l'action de chaque formulaire (résolue contre l'adresse du document ; vide = le document
# lui-même) et le chemin de vérification que déclare `data-verifier` (vide = la convention du dernier segment).
DECLARATIONS = """() => {
  const absolu = (u) => { try { return new URL(u, document.baseURI).href; } catch (e) { return ''; } };
  const formulaires = [...document.querySelectorAll('form')];
  return {
    actions: formulaires.map((f) => absolu(f.getAttribute('action') || '')),
    verifiers: formulaires.filter((f) => f.hasAttribute('data-verifier'))
      .map((f) => (f.getAttribute('data-verifier') || '').trim()).map((v) => (v ? absolu(v) : '')),
  };
}"""


def nom_court(e):
    return str(e).splitlines()[0][:200]


def origine(url):
    cadre = urlsplit(url)
    return (cadre.scheme, cadre.netloc.lower())


def chemin(url):
    return urlsplit(url).path.rstrip("/")


def verification_declaree(requete, decl):
    """Vrai si la requête d'écriture est la vérification au champ que la page déclare sans effet (TF-2307).
    Étroit par construction : POST, fetch ou XHR, jamais une navigation, même origine que la page, jamais l'action d'un
    formulaire, et soit le chemin déclaré par data-verifier, soit un dernier segment « verifier »."""
    try:
        if requete.method != "POST" or requete.resource_type not in ("fetch", "xhr") or requete.is_navigation_request():
            return False
        if not decl.get("page") or origine(requete.url) != origine(decl["page"]):
            return False
        c = chemin(requete.url)
        if c in {chemin(a) for a in decl.get("actions", []) if a and origine(a) == origine(decl["page"])}:
            return False  # c'est l'envoi du formulaire, quel que soit son chemin
        declares = {chemin(v) for v in decl.get("verifiers", []) if v and origine(v) == origine(decl["page"])}
        return c in declares or c.rsplit("/", 1)[-1] == "verifier"
    except ValueError:
        return False


def declarer(page, decl, cible):
    """Relit les déclarations de la page chargée : la décision de laisser passer se prend sur la page rendue."""
    lues = page.evaluate(DECLARATIONS)
    decl.update({"page": cible, "actions": lues["actions"], "verifiers": lues["verifiers"]})


def eprouver(page, entree, cible, champ, requetes, verifs, decl):
    """Un champ : chargement neuf, base, valeur fausse, sortie du champ, envoi. Rend les mesures brutes."""
    attente = int(entree.get("attente", 600))
    cle = champ["cle"]
    page.goto(cible, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(attente)
    page.evaluate(entree["plan"], entree["max_champs"])  # remarque les champs après le rechargement
    declarer(page, decl, cible)
    base0 = page.evaluate(entree["etat_champ"], {"cle": cle, "base": None})
    if base0.get("absent"):
        return {"erreur": "champ introuvable après rechargement"}
    base = {"reliees": base0["base_reliees"], "orphelines": base0["base_orphelines"]}
    page.evaluate(ECOUTE)
    del requetes[:]
    del verifs[:]
    sel = '[data-forge-champ="%s"]' % cle
    loc = page.locator(sel)
    loc.scroll_into_view_if_needed(timeout=5000)
    loc.fill(champ["valeur"], timeout=5000)
    loc.blur(timeout=5000)
    page.wait_for_timeout(attente // 2)
    apres_sortie = page.evaluate(entree["etat_champ"], {"cle": cle, "base": base})
    envoi = page.evaluate(ENVOI, cle)
    url_avant = page.url
    navigation = False
    try:
        if envoi.get("bouton"):
            page.locator("[data-forge-envoi]").first.click(timeout=5000)
        elif envoi.get("formulaire"):
            page.evaluate("(cle) => document.querySelector('[data-forge-champ=\"' + cle + '\"]').form.requestSubmit()", cle)
        page.wait_for_timeout(attente)
        navigation = page.url.split("#")[0] != url_avant.split("#")[0]
        apres_envoi = page.evaluate(entree["etat_champ"], {"cle": cle, "base": base})
        soumis = page.evaluate("() => (window.__ef || { soumis: [] }).soumis")
    except Exception as e:
        # Une navigation a détruit le contexte : l'envoi est PARTI, c'est la mesure.
        navigation = True
        apres_envoi = {}
        soumis = []
        champ_erreur = nom_court(e)
        return {"apres_sortie": apres_sortie, "apres_envoi": apres_envoi, "soumis": soumis,
                "requetes_ecriture": len(requetes), "verifications_passees": len(verifs), "navigation": navigation, "detail": champ_erreur}
    return {"apres_sortie": apres_sortie, "apres_envoi": apres_envoi, "soumis": soumis,
            "requetes_ecriture": len(requetes), "verifications_passees": len(verifs), "navigation": navigation}


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
            arguments = ["--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost , EXCLUDE 127.0.0.1"] if entree.get("certificat_local") else []
            navigateur = p.chromium.launch(args=arguments)
        except Exception as e:
            print(json.dumps({"ok": False, "erreur": f"navigateur indisponible : {e}"}))
            return 0
        options = {"viewport": {"width": entree["largeur"], "height": entree["hauteur"]}}
        if entree.get("etat"):
            options["storage_state"] = entree["etat"]
        bloques = []
        requetes = []
        verifs = []
        decl = {}
        if entree.get("certificat_local"):
            options["ignore_https_errors"] = True
        contexte = navigateur.new_context(**options)

        def hote_non_local(url):
            try:
                cadre = urlsplit(url)
                return cadre.scheme == "https" and (cadre.hostname or "").lower() not in HOTES_LOCAUX, (cadre.hostname or url)[:80]
            except ValueError:
                return True, url[:80]

        def garder(route):
            requete = route.request
            if requete.method not in METHODES_LECTURE:
                if verification_declaree(requete, decl):
                    verifs.append(requete.method + " " + requete.url[:120])  # passe : la suite contrôle l'hôte comme pour une lecture
                else:
                    requetes.append(requete.method + " " + requete.url[:120])
                    route.abort()
                    return
            if entree.get("certificat_local"):
                refuse, hote = hote_non_local(requete.url)
                if refuse:
                    bloques.append(hote)
                    route.abort()
                    return
                if requete.resource_type == "document":
                    reponse = route.fetch(max_redirects=0)
                    destination = reponse.headers.get("location")
                    if 300 <= reponse.status < 400 and destination:
                        refuse, hote = hote_non_local(urljoin(requete.url, destination))
                        if refuse:
                            bloques.append(hote)
                            route.abort()
                            return
                    route.fulfill(response=reponse)
                    return
            route.continue_()

        contexte.route("**/*", garder)
        page = contexte.new_page()
        for cible in entree["cibles"]:
            r = {"cible": cible}
            try:
                reponse = page.goto(cible, wait_until="networkidle", timeout=60000)
                page.wait_for_timeout(int(entree.get("attente", 600)))
                r["statut"] = reponse.status if reponse is not None else None
                r["url_finale"] = page.url
                # TF-2432 : un écran d'état voulu (--statut-attendu) est joué quand il est servi avec le code annoncé.
                statut_attendu = entree.get("statut_attendu")
                statut_jouable = (r["statut"] == statut_attendu) if statut_attendu is not None else (r["statut"] or 0) < 400
                if statut_jouable and page.url.split("#")[0].rstrip("/") == cible.split("#")[0].rstrip("/"):
                    plan = page.evaluate(entree["plan"], entree["max_champs"])
                    r["non_eprouves"] = plan["non_eprouves"]
                    champs = []
                    for c in plan["champs"]:
                        fiche = dict(c)
                        try:
                            fiche.update(eprouver(page, entree, cible, c, requetes, verifs, decl))
                        except Exception as e:
                            fiche["erreur"] = nom_court(e)
                        champs.append(fiche)
                    r["champs"] = champs
            except Exception as e:
                r["erreur"] = str(e).splitlines()[0][:300]
            r["bloques"] = sorted(set(bloques))
            resultats.append(r)
        navigateur.close()
    print(json.dumps({"ok": True, "resultats": resultats}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
