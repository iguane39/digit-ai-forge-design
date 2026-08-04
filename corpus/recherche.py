#!/usr/bin/env python3
"""Recherche deterministe dans le corpus design de la forge.

Aucune dependance, aucun reseau : BM25 sur les CSV du dossier. Meme requete,
meme sortie, a l'octet pres — c'est ce qui la rend rejouable en oracle.

Usage :
  python recherche.py "spa bien-etre"                    # tous domaines, top 5
  python recherche.py "dashboard SRE dense" --domaine style --top 3
  python recherche.py "cabinet d'avocats" --systeme-de-design
  python recherche.py "librairie independante" --systeme-de-design --json
  python recherche.py "assurance sante" --systeme-de-design --persist DIRECTION.md
"""

import argparse
import csv
import json
import math
import os
import re
import sys
import unicodedata

ICI = os.path.dirname(os.path.abspath(__file__))

# Le corpus est accentue : forcer UTF-8 en sortie, sinon la console Windows
# (cp1252) mange les accents et la sortie cesse d'etre rejouable.
for flux in (sys.stdout, sys.stderr):
    try:
        flux.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

DOMAINES = {
    "style": ("styles.csv", ["nom", "famille", "tension", "quand", "anti_pattern"]),
    "palette": ("palettes.csv", ["nom", "theme", "secteurs"]),
    "typo": ("pairings-typo.csv", ["display", "corps", "utilitaire", "ton", "secteurs"]),
    "pattern": ("patterns.csv", ["nom", "surface", "job", "quand", "anti_pattern"]),
    "guideline": ("guidelines.csv", ["regle", "domaine", "seuil"]),
}

K1, B = 1.5, 0.75


def normaliser(texte):
    """Minuscules, sans accents : « bien-etre » doit matcher « bien-être »."""
    t = unicodedata.normalize("NFD", texte.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9]+", t)


def charger(domaine):
    fichier, champs = DOMAINES[domaine]
    chemin = os.path.join(ICI, fichier)
    if not os.path.exists(chemin):
        return []
    with open(chemin, encoding="utf-8", newline="") as f:
        lignes = list(csv.DictReader(f, delimiter=";"))
    for i, l in enumerate(lignes):
        l["_domaine"] = domaine
        l["_rang_source"] = i  # depart d'egalite stable
        l["_tokens"] = normaliser(" ".join((l.get(c) or "") for c in champs))
    return lignes


def bm25(requete, documents):
    """Score BM25 classique. Documents sans occurrence : score 0, ecartes."""
    q = normaliser(requete)
    if not q or not documents:
        return []
    N = len(documents)
    avgdl = sum(len(d["_tokens"]) for d in documents) / N
    df = {}
    for terme in set(q):
        df[terme] = sum(1 for d in documents if terme in d["_tokens"])

    scores = []
    for d in documents:
        s = 0.0
        dl = len(d["_tokens"]) or 1
        for terme in q:
            n = df.get(terme, 0)
            if n == 0:
                continue
            f = d["_tokens"].count(terme)
            if f == 0:
                continue
            idf = math.log(1 + (N - n + 0.5) / (n + 0.5))
            s += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * dl / avgdl))
        if s > 0:
            scores.append((round(s, 6), d))
    scores.sort(key=lambda x: (-x[0], x[1]["_domaine"], x[1]["_rang_source"]))
    return scores


def nettoyer(ligne):
    return {k: v for k, v in ligne.items() if not k.startswith("_")}


def systeme_de_design(requete):
    """Compose une recommandation : ce que la forge propose, pas ce qu'elle impose."""
    style = bm25(requete, charger("style"))
    typo = bm25(requete, charger("typo"))
    palettes = charger("palette")
    pal = bm25(requete, palettes)
    patterns = bm25(requete, charger("pattern"))

    reco = {
        "requete": requete,
        "style": nettoyer(style[0][1]) if style else None,
        "typographie": nettoyer(typo[0][1]) if typo else None,
        "palette": {},
        "patterns": [nettoyer(d) for _, d in patterns[:3]],
        "guidelines_socle": [nettoyer(g) for g in charger("guideline")
                             if g["id"] in ("GL01", "GL04", "GL06", "GL14", "GL21", "GL22", "GL26", "GL35")],
        "a_trancher": [],
    }

    pid = pal[0][1]["id"] if pal else (palettes[0]["id"] if palettes else None)
    for l in palettes:
        if l["id"] == pid:
            reco["palette"][l["theme"]] = nettoyer(l)

    if not style:
        reco["a_trancher"].append("aucun style ne matche la requete : direction a poser a la main")
    if not typo:
        reco["a_trancher"].append("aucun appariement typographique ne matche : choisir hors corpus")
    if not pal:
        reco["a_trancher"].append("palette retenue par defaut, non par pertinence sectorielle")
    if not reco["patterns"]:
        reco["a_trancher"].append(
            "aucun pattern ne matche la requete : le corpus ne couvre pas cette surface, "
            "choisir hors corpus plutot qu'inventer une entree")
    elif len(reco["patterns"]) < 3:
        reco["a_trancher"].append(
            f"{len(reco['patterns'])} pattern(s) seulement au lieu de 3 : couverture partielle du corpus")
    if reco["typographie"] and reco["typographie"].get("dispo") == "fontshare":
        reco["a_trancher"].append(
            "polices Fontshare : a embarquer en base64 pour tenir le contrat zero-reseau")
    return reco


def rendre_markdown(reco):
    s = reco["style"] or {}
    t = reco["typographie"] or {}
    lignes = [
        "# Direction proposee — brouillon",
        "",
        f"> Genere par corpus/recherche.py sur la requete « {reco['requete']} ».",
        "> Proposition, pas decision : le choix final est arbitre par l'humain.",
        "",
        "## Style",
        f"**{s.get('nom', '—')}** ({s.get('famille', '—')}) — tension : {s.get('tension', '—')}",
        f"Quand : {s.get('quand', '—')}",
        f"Piege : {s.get('anti_pattern', '—')}",
        "",
        "## Typographie",
        f"Display **{t.get('display', '—')}** · corps **{t.get('corps', '—')}** · utilitaire **{t.get('utilitaire', '—')}**",
        f"Ton : {t.get('ton', '—')} · disponibilite : {t.get('dispo', '—')}",
        "",
        "## Palette (tokens OKLCH)",
        "",
        "```css",
        ":root {",
    ]
    clair = reco["palette"].get("clair", {})
    sombre = reco["palette"].get("sombre", {})
    for cle in ("fond", "surface", "texte", "texte_faible", "trait", "accent"):
        if clair.get(cle):
            lignes.append(f"  --{cle.replace('_', '-')}: {clair[cle]};")
    lignes += ["}", "", "@media (prefers-color-scheme: dark) {", "  :root {"]
    for cle in ("fond", "surface", "texte", "texte_faible", "trait", "accent"):
        if sombre.get(cle):
            lignes.append(f"    --{cle.replace('_', '-')}: {sombre[cle]};")
    lignes += ["  }", "}", "```", "", "## Patterns retenus", ""]
    for p in reco["patterns"]:
        lignes.append(f"- **{p['nom']}** ({p['surface']}) — {p['job']}. Piege : {p['anti_pattern']}")
    lignes += ["", "## Socle non negociable", ""]
    for g in reco["guidelines_socle"]:
        lignes.append(f"- {g['regle']} : {g['seuil']} — {g['source']}")
    if reco["a_trancher"]:
        lignes += ["", "## A trancher", ""]
        for a in reco["a_trancher"]:
            lignes.append(f"- {a}")
    return "\n".join(lignes) + "\n"


def main():
    ap = argparse.ArgumentParser(description="Recherche deterministe dans le corpus design.")
    ap.add_argument("requete")
    ap.add_argument("--domaine", choices=sorted(DOMAINES), help="restreindre a un domaine")
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--systeme-de-design", action="store_true", dest="systeme")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--persist", metavar="FICHIER", help="ecrire la direction proposee en markdown")
    a = ap.parse_args()

    if a.systeme:
        reco = systeme_de_design(a.requete)
        if a.persist:
            with open(a.persist, "w", encoding="utf-8") as f:
                f.write(rendre_markdown(reco))
            print(f"ecrit : {a.persist}")
        if a.json:
            print(json.dumps(reco, ensure_ascii=False, indent=2))
        elif not a.persist:
            print(rendre_markdown(reco))
        return 0

    domaines = [a.domaine] if a.domaine else sorted(DOMAINES)
    documents = []
    for d in domaines:
        documents += charger(d)
    resultats = bm25(a.requete, documents)[: a.top]

    if a.json:
        print(json.dumps([{"score": s, **nettoyer(d)} for s, d in resultats],
                         ensure_ascii=False, indent=2))
        return 0

    if not resultats:
        print("aucun resultat — le corpus ne couvre pas cette requete, ne pas inventer")
        return 0
    for s, d in resultats:
        etiquette = d.get("nom") or d.get("regle") or d.get("display") or d["id"]
        print(f"{s:7.3f}  [{d['_domaine']:9}] {d['id']}  {etiquette}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
