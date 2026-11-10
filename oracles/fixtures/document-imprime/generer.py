#!/usr/bin/env python3
"""generer.py — fabrique les fixtures de oracle-document-imprime (TF-2386, TF-2385).

Les PPTX et les PDF sont des binaires : cette fabrique est LEUR SOURCE, versionnée avec eux. Rejouer :
    python oracles/fixtures/document-imprime/generer.py
Chaque paire est la même page avant et après le défaut. Dépendances : python-pptx, reportlab.

  deck-verte.pptx / deck-rouge.pptx          DP1 forme accolée, DP2 contraste, DP3 débordement (PPTX)
  livret-verte.pdf / livret-rouge.pdf        DP1, DP2, DP3 (PDF imprimé)
  colonnes-verte.pdf / colonnes-rouge.pdf    DP4 pieds de colonnes inégaux, DP5 vide sous le contenu (PDF, 3 pages)
  filet-verte.pdf                            DP1 : un filet de 1 pt accolé à un bloc n'est pas un bandeau (seuil 2 px)
"""
import os

ICI = os.path.dirname(os.path.abspath(__file__))
MM = 72 / 25.4


def hexc(h):
    from reportlab.lib.colors import HexColor
    return HexColor(h)


# ── PPTX ────────────────────────────────────────────────────────────────────
def deck(rouge):
    from pptx import Presentation
    from pptx.dml.color import RGBColor
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.util import Pt

    prs = Presentation()
    prs.slide_width, prs.slide_height = Pt(960), Pt(540)
    s = prs.slides.add_slide(prs.slide_layouts[6])  # vierge

    def rect(x, y, w, h, fond):
        r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Pt(x), Pt(y), Pt(w), Pt(h))
        r.fill.solid()
        r.fill.fore_color.rgb = RGBColor.from_string(fond[1:])
        r.line.fill.background()
        return r

    def texte(x, y, w, h, contenu, taille, couleur, gras=False):
        t = s.shapes.add_textbox(Pt(x), Pt(y), Pt(w), Pt(h))
        t.text_frame.word_wrap = True
        run = t.text_frame.paragraphs[0].add_run()
        run.text = contenu
        run.font.size = Pt(taille)
        run.font.bold = gras
        run.font.color.rgb = RGBColor.from_string(couleur[1:])
        return t

    texte(48, 30, 700, 50, 'Bilan du trimestre', 32, '#111827', True)
    # la carte et la barre qui l'accompagne
    rect(48, 110, 420, 120, '#F1F5F9')
    texte(60, 120, 396, 100, 'Trois chantiers livrés, deux en cours.', 20, '#111827')
    # verte : la barre à 0,15 po du bloc ; rouge : la barre ACCOLÉE au bord gauche du bloc (4,3 pt de large)
    rect(48 - 4.32 if rouge else 48 - 4.32 - 10.8, 110, 4.32, 120, '#1D4ED8')
    # le bandeau sombre et son texte
    rect(48, 270, 420, 80, '#0B1F3A')
    texte(60, 285, 396, 50, 'Prochaine étape : la recette', 20, '#3B4A63' if rouge else '#F9FAFB')
    if rouge:
        texte(820, 400, 300, 40, 'Annexe : voir le détail', 18, '#111827')  # 820 + 300 > 960
    else:
        texte(500, 400, 300, 40, 'Annexe : voir le détail', 18, '#111827')
    prs.save(os.path.join(ICI, 'deck-rouge.pptx' if rouge else 'deck-verte.pptx'))


# ── PDF ─────────────────────────────────────────────────────────────────────
def pdf(nom, dessiner):
    from reportlab.pdfgen import canvas
    c = canvas.Canvas(os.path.join(ICI, nom), pagesize=(595.276, 841.89), invariant=1)
    dessiner(c)
    c.save()


def haut(y):  # y mesuré depuis le haut de la page -> repère reportlab (origine en bas)
    return 841.89 - y


def aplat(c, x, y, w, h, fond):
    c.setFillColor(hexc(fond))
    c.rect(x, haut(y) - h, w, h, stroke=0, fill=1)


def ligne(c, x, y, contenu, taille, couleur, gras=False):
    c.setFillColor(hexc(couleur))
    c.setFont('Helvetica-Bold' if gras else 'Helvetica', taille)
    c.drawString(x, haut(y), contenu)


def livret(rouge):
    def dessiner(c):
        ligne(c, 40, 60, 'Livret de compétences', 24, '#111827', True)
        aplat(c, 40, 100, 300, 90, '#F1F5F9')
        ligne(c, 56, 130, 'Trois chantiers livrés', 14, '#111827')
        ligne(c, 56, 152, 'deux en cours', 14, '#111827')
        # verte : la barre à 12 pt du bloc ; rouge : ACCOLÉE à son bord gauche (4 pt de large)
        aplat(c, 40 - 4 if rouge else 40 - 4 - 12, 100, 4, 90, '#1D4ED8')
        aplat(c, 40, 230, 300, 60, '#0B1F3A')
        ligne(c, 56, 265, 'Prochaine étape : la recette', 14, '#3B4A63' if rouge else '#F9FAFB')
        # rouge : une ligne qui sort de la page par la droite
        ligne(c, 520 if rouge else 300, 400, 'Annexe : voir le détail complet', 14, '#111827')
        c.showPage()
    pdf('livret-rouge.pdf' if rouge else 'livret-verte.pdf', dessiner)


def colonnes(rouge):
    def page(c, n, gauche, droite, hauteur_carte):
        ligne(c, 40, 56, 'Dossier de compétences — page %d' % n, 16, '#111827', True)
        for x0, nb in ((40, gauche), (310, droite)):
            for i in range(nb):
                y = 90 + i * (hauteur_carte + 12)
                aplat(c, x0, y, 240, hauteur_carte, '#F1F5F9')
                ligne(c, x0 + 12, y + 28, 'Compétence %d.%d' % (n, i + 1), 12, '#111827')
        ligne(c, 280, 820, '%d / 3' % n, 9, '#4B5563')  # pied de page courant, hors contenu
        c.showPage()

    def dessiner(c):
        if rouge:
            page(c, 1, 7, 5, 88)   # DP4 : la colonne de droite finit 200 pt (70 mm) plus haut que celle de gauche
            page(c, 2, 7, 7, 80)   # DP5 : les deux colonnes finissent à 722 pt, la page la plus pleine à 778 : 19,8 mm de vide
            page(c, 3, 2, 2, 80)   # dernière page : exemptée de DP5
        else:
            page(c, 1, 7, 7, 86)   # pieds égaux (764 pt), 4,9 mm sous la page la plus pleine
            page(c, 2, 7, 7, 88)   # la page la plus pleine (778 pt)
            page(c, 3, 2, 2, 80)
    pdf('colonnes-rouge.pdf' if rouge else 'colonnes-verte.pdf', dessiner)


def filet():
    def dessiner(c):
        ligne(c, 40, 60, 'Livret de compétences', 24, '#111827', True)
        aplat(c, 40, 100, 300, 90, '#F1F5F9')
        ligne(c, 56, 130, 'Trois chantiers livrés', 14, '#111827')
        aplat(c, 40 - 1.0, 100, 1.0, 90, '#1D4ED8')  # 1 pt (1,3 px) : le filet du bloc, pas un bandeau
        c.showPage()
    pdf('filet-verte.pdf', dessiner)


if __name__ == '__main__':
    for r in (False, True):
        deck(r)
        livret(r)
        colonnes(r)
    filet()
    print('fixtures document-imprime fabriquées dans', ICI)
