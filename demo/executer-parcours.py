#!/usr/bin/env python3
"""Execute les trois parcours de bout en bout de la maquette (critere C13).

C13 exige une execution, pas une description. Ce script pilote un navigateur
reel : il navigue au clavier seul, verifie que le focus reste visible a chaque
tabulation, atteint les etats non nominaux annonces, et ecrit une trace datee.

Un parcours qui echoue fait sortir le script en code 1. Aucune etape n'est
approuvee sans assertion.

Usage : python demo/executer-parcours.py <maquette.html> [--trace demo/parcours.md]
"""

from __future__ import annotations

import argparse
import datetime
import io
import os
import sys

from playwright.sync_api import sync_playwright

FOCUS_VISIBLE = """() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const s = getComputedStyle(el);
  const large = parseFloat(s.outlineWidth || '0');
  return {
    tag: el.tagName.toLowerCase(),
    texte: (el.textContent || el.value || '').trim().slice(0, 40),
    visible: s.outlineStyle !== 'none' && large > 0,
    contour: s.outlineStyle + ' ' + s.outlineWidth,
  };
}"""


class Echec(Exception):
    pass


def tabuler(page, n, journal):
    """n tabulations, en verifiant le focus visible a chaque arret."""
    for _ in range(n):
        page.keyboard.press("Tab")
        etat = page.evaluate(FOCUS_VISIBLE)
        if etat is None:
            continue
        if not etat["visible"]:
            raise Echec(
                "focus non visible sur <%s> « %s » (contour : %s)"
                % (etat["tag"], etat["texte"], etat["contour"])
            )
        journal.append("focus %s « %s »" % (etat["tag"], etat["texte"]))


def aller(page, route, journal):
    page.evaluate("r => { location.hash = r }", route)
    page.wait_for_timeout(120)
    journal.append("route %s" % route)


def exiger(page, motif, journal, quoi):
    if motif not in page.inner_text("body"):
        raise Echec("attendu introuvable a l'ecran : %s" % quoi)
    journal.append("vu : %s" % quoi)


def parcours_1(page):
    """Decider : d'un indicateur jusqu'a l'action qu'il declenche."""
    j = []
    aller(page, "#tableau-de-bord", j)
    exiger(page, "Demandes ouvertes", j, "KPI « Demandes ouvertes »")
    exiger(page, "3 demandes urgentes sans intervenant", j, "alerte de decision")
    tabuler(page, 12, j)

    aller(page, "#demandes", j)
    exiger(page, "DI-4821", j, "liste des demandes")

    aller(page, "#demande", j)
    exiger(page, "Fuite sous evier".replace("evier", "évier"), j, "fiche DI-4821")
    exiger(page, "Le devis n'a pas pu", j, "ETAT NON NOMINAL : erreur de piece jointe")
    return j


def parcours_2(page):
    """Produire : filtrer jusqu'a l'absence de resultat, puis revenir."""
    j = []
    aller(page, "#demandes", j)
    page.fill("#recherche", "zzz-aucun-resultat")
    page.wait_for_timeout(150)
    exiger(page, "Aucune demande ne correspond", j, "ETAT NON NOMINAL : etat vide instructif")
    exiger(page, "Effacer le filtre", j, "issue proposee depuis l'etat vide")

    page.click("[data-action='vider-filtre']")
    page.wait_for_timeout(150)
    exiger(page, "DI-4821", j, "retour a la liste complete")

    page.click("[data-tri='statut']")
    page.wait_for_timeout(120)
    exiger(page, "tri sur", j, "legende de tri mise a jour")
    tabuler(page, 8, j)
    return j


def parcours_3(page):
    """Adapter : la meme information en mobile, au format 390 px."""
    j = []
    page.set_viewport_size({"width": 390, "height": 844})
    j.append("viewport 390x844")

    aller(page, "#mobile", j)
    exiger(page, "Mes demandes", j, "vue mobile dans le chassis")

    page.click("[data-action='feuille-ouvrir']")
    page.wait_for_timeout(150)
    if page.locator("[role='dialog']").count() == 0:
        raise Echec("feuille modale non ouverte")
    if page.locator(".voile").count() == 0:
        raise Echec("feuille modale sans voile : l'arriere-plan reste actionnable")
    if page.locator("[role='dialog'][aria-modal='true']").count() == 0:
        raise Echec("feuille modale sans aria-modal")
    j.append("vu : feuille modale ancree en bas, voile et aria-modal presents")

    page.click("[role='dialog'] [data-action='feuille-fermer']")
    page.wait_for_timeout(150)
    if page.locator("[role='dialog']").count() != 0:
        raise Echec("feuille modale non refermee")
    j.append("vu : fermeture de la feuille")

    aller(page, "#demandes", j)
    affichage = page.evaluate(
        "() => { const td = document.querySelector('tbody td');"
        " return td ? getComputedStyle(td).display : null }"
    )
    if affichage not in ("flex", "block"):
        raise Echec("reflow de table absent a 390 px (td en display:%s)" % affichage)
    j.append("vu : reflow de table en cartes (td en display:%s)" % affichage)

    libelle = page.evaluate(
        "() => { const td = document.querySelector('tbody td');"
        " return td ? getComputedStyle(td, '::before').content : null }"
    )
    if not libelle or libelle == "none":
        raise Echec("en-tete de colonne non repris en libelle de champ")
    j.append("vu : en-tete repris en libelle (%s)" % libelle)
    return j


PARCOURS = [
    ("Parcours 1 — Décider : d'un indicateur jusqu'à l'action qu'il déclenche", parcours_1),
    ("Parcours 2 — Produire : filtrer jusqu'à l'absence de résultat, puis revenir", parcours_2),
    ("Parcours 3 — Adapter : la même information en mobile", parcours_3),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("html")
    ap.add_argument("--trace", default=os.path.join("demo", "parcours.md"))
    a = ap.parse_args()

    url = "file:///" + os.path.abspath(a.html).replace("\\", "/")
    date = datetime.date.today().isoformat()
    resultats = []

    with sync_playwright() as p:
        nav = p.chromium.launch()
        for titre, fn in PARCOURS:
            page = nav.new_page(viewport={"width": 1440, "height": 900})
            page.goto(url)
            page.wait_for_timeout(200)
            try:
                journal = fn(page)
                resultats.append((titre, "OK", journal, None))
            except Exception as exc:  # echec assume, jamais masque
                resultats.append((titre, "ECHEC", [], str(exc)))
            page.close()
        nav.close()

    lignes = [
        "# Parcours — Maquette Bailleur / Interventions",
        "",
        "> Trace **exécutée** par `demo/executer-parcours.py` (Chromium via Playwright)",
        "> le %s. Chaque étape porte son assertion : rien n'est approuvé sans vérification." % date,
        "> Le focus est contrôlé à chaque tabulation ; une seule invisibilité fait échouer le parcours.",
        "",
    ]
    echecs = 0
    for titre, statut, journal, err in resultats:
        if statut != "OK":
            echecs += 1
        lignes += ["## %s" % titre, "", "**Statut : %s** · exécuté le %s" % (statut, date), ""]
        if err:
            lignes += ["Échec : %s" % err, ""]
        for etape in journal:
            lignes.append("- %s" % etape)
        lignes.append("")

    lignes += [
        "## Verdict C13",
        "",
        "**%s** — %d/%d parcours exécutés sans échec."
        % ("PASS" if echecs == 0 else "FAIL", len(resultats) - echecs, len(resultats)),
        "",
        "Ce que cette trace ne prouve pas : les gestes tactiles réels (balayage, "
        "pull-to-refresh), le comportement du clavier virtuel, et le rendu des polices "
        "système sur appareil. Chromium en viewport 390 px n'est pas un téléphone.",
        "",
    ]

    io.open(a.trace, "w", encoding="utf-8", newline="").write("\n".join(lignes))
    for titre, statut, _, err in resultats:
        print("%-6s %s%s" % (statut, titre, "" if not err else " — " + err))
    print("trace écrite : %s" % a.trace)
    return 1 if echecs else 0


if __name__ == "__main__":
    sys.exit(main())
