#!/usr/bin/env python3
"""generer.py — fabrique les fixtures de oracle-document-imprime (TF-2386, TF-2385).

Les PPTX et les PDF sont des binaires : cette fabrique est LEUR SOURCE, versionnée avec eux. Rejouer :
    python oracles/fixtures/document-imprime/generer.py
Chaque paire est la même page avant et après le défaut. Dépendances : python-pptx, reportlab.

  deck-verte.pptx / deck-rouge.pptx          DP1 forme accolée, DP2 contraste, DP3 débordement (PPTX)
  livret-verte.pdf / livret-rouge.pdf        DP1, DP2, DP3 (PDF imprimé)
  colonnes-verte.pdf / colonnes-rouge.pdf    DP4 pieds de colonnes inégaux, DP5 vide sous le contenu (PDF, 3 pages)
  filet-verte.pdf                            DP1 : un filet de 1 pt accolé à un bloc n'est pas un bandeau (seuil 2 px)
  programme-une-colonne-verte.pdf            DP4 (TF-2892) : une colonne de texte et deux tableaux, aucune colonne de page
  colonnes-tableau-rouge.pdf                 DP4 (TF-2892) : un tableau ET deux vraies colonnes inégales, DP4 reste rouge
  programme-sans-trait-verte.pdf             DP4 (TF-2892, 2e passe) : un tableau SANS trait ni aplat de cellule
  colonnes-texte-rouge.pdf                   DP4 (TF-2892, 2e passe) : deux colonnes de texte non alignées, DP4 reste rouge
  programme-lignes-fusionnees-verte.pdf      DP4 (TF-2892, 3e passe) : un tableau sans trait dont les lignes sont fusionnées en blocs
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


def tableau(c, x, y, lignes, largeurs, traits=True):
    """Pose un tableau à traits et à en-tête teinté, comme l'export d'un tableau Word : le haut du tableau à y (depuis le haut).
    `traits=False` : le même tableau SANS trait ni aplat de cellule (TF-2892, 2e passe), que `find_tables` ne reconnaît pas."""
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph, Table, TableStyle
    style = ParagraphStyle('cellule', fontName='Helvetica', fontSize=10, leading=13)
    paragraphes = [[Paragraph(t, style) for t in ligne_] for ligne_ in lignes]
    hauteurs = [[p.wrap(w - 12, 1000)[1] for p, w in zip(ligne_, largeurs)] for ligne_ in paragraphes]
    lignes_h = [max(ligne_) + 8 for ligne_ in hauteurs]
    # Le quadrillage et l'en-tête teinté d'abord, cellules vides : ce sont les traits du tableau.
    t = Table([[''] * len(largeurs) for _ in lignes], colWidths=largeurs, rowHeights=lignes_h)
    t.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, hexc('#9CA3AF')),
        ('BACKGROUND', (0, 0), (-1, 0), hexc('#E5E7EB')),
    ]))
    if traits:
        t.wrapOn(c, sum(largeurs), 800)
        t.drawOn(c, x, haut(y) - sum(lignes_h))
    # Puis le texte COLONNE PAR COLONNE : l'ordre d'écriture fait lire à MuPDF un bloc par colonne de cellules, comme dans les PDF
    # exportés par Word dont le retour RD-16 vient (« la colonne de gauche (x=12.7 mm) », « celle de droite (x=144.0 mm) »).
    for k, w in enumerate(largeurs):
        haut_ligne = y
        for r, p in enumerate(paragraphes):
            p[k].drawOn(c, x + sum(largeurs[:k]) + 6, haut(haut_ligne) - 4 - hauteurs[r][k])
            haut_ligne += lignes_h[r]
    return y + sum(lignes_h)


def programme():
    """Un document Word à UNE colonne de texte qui porte des tableaux (TF-2892, retour RD-16 du 25/11/2026) : un tableau « Module /
    Contenu / Durée » de 3 colonnes à 9 lignes, un tableau « Rubrique / Détail » de 2 colonnes à 9 lignes. Les cellules d'une même
    colonne de tableau finissent à des hauteurs très différentes (une cellule de 6 lignes, ses voisines d'une ligne) : lues comme des
    colonnes de page, elles font rendre DP4 (écarts de plus de 10 mm). Aucune colonne de page : PASS attendu."""
    def dessiner(c):
        ligne(c, 36, 60, 'Programme de formation — session 2', 18, '#111827', True)
        ligne(c, 36, 84, 'Un parcours de deux jours, à une seule colonne de texte, avec deux tableaux.', 10, '#374151')
        y = tableau(c, 36, 100, [['Module', 'Contenu', 'Durée']] + [
            ['Module %d' % i, 'Notions et cas pratiques', ('Mise en situation, restitution en groupe et évaluation des acquis ; ' * (6 if i == 9 else 1)).strip()]
            for i in range(1, 10)], [174, 174, 175])
        tableau(c, 36, y + 24, [['Rubrique', 'Détail']] + [
            ['Rubrique %d' % i, ('Public concerné, prérequis, modalités d\'évaluation et d\'accès ; ' * (5 if i == 9 else 1)).strip()]
            for i in range(1, 10)], [120, 300])
        c.showPage()
    pdf('programme-une-colonne-verte.pdf', dessiner)


def programme_sans_trait():
    """Le motif des pages 5 et 6 d'un programme Word réel (TF-2892, 2e passe) : une colonne de texte, un tableau « Objectif / Évaluation
    associée » SANS trait ni aplat de cellule, dont la colonne de droite s'arrête bien plus haut que des paragraphes étroits qui suivent
    le tableau à gauche. `find_tables` ne le reconnaît pas ; seul l'alignement de ses lignes (chaque cellule de droite commence à la
    même ordonnée qu'une cellule de gauche) le désigne. La forme, pas le contenu du programme réel. PASS attendu."""
    def dessiner(c):
        ligne(c, 36, 60, 'Programme — objectifs', 18, '#111827', True)
        lignes_ = [['Objectif', 'Évaluation associée']] + [
            ['Objectif %d : savoir mener une activité de mise en pratique sur un cas réel' % i, 'Grille de validation, cas %d' % i]
            for i in range(1, 8)]
        y = tableau(c, 36, 80, lignes_, [250, 270], traits=False)
        # La suite du document : des paragraphes étroits à gauche, sous le tableau.
        for i in range(4):
            ligne(c, 36, y + 30 + i * 40, 'Critère de réussite %d : le stagiaire produit un livrable conforme.' % (i + 1), 10, '#374151')
        c.showPage()
    pdf('programme-sans-trait-verte.pdf', dessiner)


def programme_lignes_fusionnees():
    """Le motif de la page 4 d'un 2e programme Word réel (TF-2892, 3e passe) : un tableau sans trait dont MuPDF FUSIONNE la plupart des
    lignes en blocs qui traversent la gouttière (cellule de gauche et cellule de droite dans le même bloc, plus larges que 60 % de la page),
    et ne laisse séparés que 2 blocs de la colonne de droite. Aucun alignement de blocs n'y atteint 3 ; seuls les blocs qui traversent la
    gouttière désignent les lignes du tableau. Écrit ligne à ligne, les cellules de droite des lignes 1 et 3 en dernier : la forme, pas le
    contenu. PASS attendu ; la colonne de droite finit bien plus haut que la suite du texte à gauche."""
    def dessiner(c):
        ligne(c, 36, 60, 'Programme — objectifs', 18, '#111827', True)
        pas, y0 = 34, 100
        for r in range(5):
            y = y0 + r * pas
            ligne(c, 36, y, 'Objectif O%d : conduire une activité de mise en pratique' % (r + 1) if r else 'Objectif', 10, '#111827', r == 0)
            if r % 2 == 0:  # lignes 0, 2, 4 : la cellule de droite s'écrit entre les deux lignes de celle de gauche, d'où un bloc qui traverse la gouttière
                ligne(c, 322, y, 'Évaluation associée' if r == 0 else 'Grille de validation, cas %d' % (r + 1), 10, '#111827', r == 0)
            if r:
                ligne(c, 36, y + 13, 'et la restituer à l\'oral devant le groupe.', 10, '#111827')
        for r in (1, 3):  # lignes 1 et 3 : la cellule de droite écrite à part, donc un bloc à elle
            ligne(c, 322, y0 + r * pas, 'Productions %d et %d : mise en situation' % (r, r + 1), 10, '#111827')
        # La suite du document : des paragraphes étroits à gauche, sous le tableau.
        for i in range(4):
            ligne(c, 36, y0 + 5 * pas + 50 + i * 40, 'Critère de réussite %d : le stagiaire produit un livrable conforme.' % (i + 1), 10, '#374151')
        c.showPage()
    pdf('programme-lignes-fusionnees-verte.pdf', dessiner)


def colonnes_texte():
    """Le sens rouge de la 2e passe : deux vraies colonnes de TEXTE (aucun aplat), inégales, dont les blocs ne commencent pas aux mêmes
    ordonnées. L'alignement ligne à ligne ne les prend pas pour un tableau : DP4 reste rouge."""
    def dessiner(c):
        ligne(c, 40, 56, 'Notes de séance', 16, '#111827', True)
        for x0, nb, pas, decalage in ((40, 7, 80, 0), (310, 3, 97, 23)):
            for i in range(nb):
                yc = 100 + decalage + i * pas
                ligne(c, x0, yc, 'Note %d' % (i + 1), 12, '#111827', True)
                ligne(c, x0, yc + 16, 'Le texte de la note tient sur une ligne.', 10, '#374151')
        c.showPage()
    pdf('colonnes-texte-rouge.pdf', dessiner)


def colonnes_tableau():
    """Le sens rouge de TF-2892 : une page qui porte un tableau ET deux vraies colonnes de cartes inégales (6 et 3 cartes). Écarter le
    tableau de la lecture des colonnes ne doit pas masquer les colonnes de page : DP4 reste rouge, sur les cartes seules."""
    def dessiner(c):
        ligne(c, 40, 56, 'Dossier de compétences', 16, '#111827', True)
        y = tableau(c, 40, 74, [['Module', 'Contenu', 'Durée']] + [['Module %d' % i, 'Notions et cas pratiques', '2 h'] for i in range(1, 4)], [120, 280, 100])
        for x0, nb in ((40, 6), (310, 3)):
            for i in range(nb):
                yc = y + 30 + i * 72
                aplat(c, x0, yc, 240, 60, '#F1F5F9')
                ligne(c, x0 + 12, yc + 28, 'Compétence %d' % (i + 1), 12, '#111827')
        c.showPage()
    pdf('colonnes-tableau-rouge.pdf', dessiner)


if __name__ == '__main__':
    for r in (False, True):
        deck(r)
        livret(r)
        colonnes(r)
    filet()
    programme()
    colonnes_tableau()
    programme_sans_trait()
    programme_lignes_fusionnees()
    colonnes_texte()
    print('fixtures document-imprime fabriquées dans', ICI)
