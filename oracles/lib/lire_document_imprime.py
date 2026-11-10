#!/usr/bin/env python3
"""lire_document_imprime.py — la géométrie d'un PPTX ou d'un PDF, en points, pour oracle-document-imprime (TF-2386).

Les oracles de la forge design lisent du HTML. Un deck PPTX ou un PDF imprimé n'a ni CSS ni DOM : ce lecteur en tire ce
qu'un rendu pose réellement, des éléments rectangulaires (aplats, textes, images) dans l'ordre de superposition, et
l'oracle les juge. Il ne juge rien lui-même.

Usage : python lire_document_imprime.py <fichier.pdf|.pptx>
Sortie (stdout, JSON) :
  { "format": "pdf"|"pptx", "pages": [ { "n": 1, "largeur": pt, "hauteur": pt, "fond": "#RRGGBB"|null,
      "elements": [ { "type": "forme"|"texte"|"image", "x", "y", "w", "h",   # points, origine en haut à gauche
          forme : "fond": "#RRGGBB"|null, "opacite": 0..1, "indecidable": "dégradé"|"motif"|null
          texte : "spans": [ { "texte", "taille", "gras", "couleur": "#RRGGBB"|null, "herite": bool, "bbox": [x0,y0,x1,y1] } ]
      } ] } ], "non_juge": [ ... ] }
Ordre des éléments : PPTX, l'ordre de l'arbre des formes (arrière vers avant). PDF, tous les aplats dans l'ordre de
peinture, puis les textes et les images : l'ordre de peinture ENTRE texte et aplat n'est pas lu dans un PDF, le texte est
supposé au-dessus des aplats qui le contiennent (dit au non_juge).
Code de sortie : 0 lu, 2 illisible (motif sur stderr).
"""
import json
import os
import sys

NON_JUGE = []
MARGE = 400.0  # points ajoutés autour d'une page PDF, en mémoire, pour lire ce qui en sort


def hexa(r, g, b):
    return '#%02X%02X%02X' % (int(round(r)), int(round(g)), int(round(b)))


def hexa_flottants(t):
    return hexa(t[0] * 255, t[1] * 255, t[2] * 255)


# ── PDF ─────────────────────────────────────────────────────────────────────
def lire_pdf(chemin):
    import pymupdf
    doc = pymupdf.open(chemin)
    pages = []
    ordre_pdf = False
    for n, page in enumerate(doc, 1):
        r = page.rect
        elements = []
        for d in page.get_drawings():
            fill = d.get('fill')
            if fill is None:
                continue
            rc = d['rect']
            op = d.get('fill_opacity')
            elements.append({'type': 'forme', 'x': rc.x0, 'y': rc.y0, 'w': rc.width, 'h': rc.height,
                             'fond': hexa_flottants(fill), 'opacite': 1.0 if op is None else float(op), 'indecidable': None})
        # Un texte qui sort de la page doit être LU pour être jugé débordant : MuPDF écarte les glyphes hors de la boîte
        # de la page, même sans TEXT_MEDIABOX_CLIP. La boîte est donc élargie de MARGE pt de chaque côté, EN MÉMOIRE (le
        # fichier n'est jamais réécrit), et les coordonnées ramenées au repère de la page d'origine.
        boite = page.mediabox
        page.set_mediabox(pymupdf.Rect(boite.x0 - MARGE, boite.y0 - MARGE, boite.x1 + MARGE, boite.y1 + MARGE))
        blocs = page.get_text('dict', flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_MEDIABOX_CLIP)['blocks']
        for b in blocs:
            bx0, by0, bx1, by1 = [v - MARGE for v in b['bbox']]
            if b['type'] == 1:
                elements.append({'type': 'image', 'x': bx0, 'y': by0, 'w': bx1 - bx0, 'h': by1 - by0})
                continue
            spans = []
            for ligne in b.get('lines', []):
                for s in ligne.get('spans', []):
                    if not s['text'].strip():
                        continue
                    c = s['color']
                    spans.append({'texte': s['text'], 'taille': float(s['size']),
                                  'gras': bool(s['flags'] & 16) or 'bold' in s['font'].lower(),
                                  'couleur': hexa((c >> 16) & 255, (c >> 8) & 255, c & 255), 'herite': False,
                                  'bbox': [s['bbox'][0] - MARGE, s['bbox'][1] - MARGE, s['bbox'][2] - MARGE, s['bbox'][3] - MARGE]})
            if spans:
                elements.append({'type': 'texte', 'x': bx0, 'y': by0, 'w': bx1 - bx0, 'h': by1 - by0, 'spans': spans})
        pages.append({'n': n, 'largeur': r.width, 'hauteur': r.height, 'fond': '#FFFFFF', 'elements': elements})
        ordre_pdf = True
    if ordre_pdf:
        NON_JUGE.append("l'ordre de peinture entre un texte et un aplat n'est pas lu dans un PDF : le texte est supposé au-dessus des aplats qui le contiennent")
        NON_JUGE.append("le fond d'une page PDF est supposé blanc (le papier) ; un aplat de page entière dessiné par le document est lu comme n'importe quel aplat")
    return {'format': 'pdf', 'pages': pages}


# ── PPTX ────────────────────────────────────────────────────────────────────
NOMS_SCHEMA = {
    'TEXT_1': 'dk1', 'BACKGROUND_1': 'lt1', 'TEXT_2': 'dk2', 'BACKGROUND_2': 'lt2',
    'DARK_1': 'dk1', 'LIGHT_1': 'lt1', 'DARK_2': 'dk2', 'LIGHT_2': 'lt2',
    'ACCENT_1': 'accent1', 'ACCENT_2': 'accent2', 'ACCENT_3': 'accent3', 'ACCENT_4': 'accent4',
    'ACCENT_5': 'accent5', 'ACCENT_6': 'accent6', 'HYPERLINK': 'hlink', 'FOLLOWED_HYPERLINK': 'folHlink',
}
APPROX = {'brightness': 0}


def palette_du_theme(prs):
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    from lxml import etree
    try:
        part = prs.slide_masters[0].part.part_related_by(RT.THEME)
    except Exception:
        return {}
    racine = etree.fromstring(part.blob)
    ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
    palette = {}
    schema = racine.find('.//a:clrScheme', ns)
    if schema is None:
        return {}
    for enfant in schema:
        nom = etree.QName(enfant).localname
        for c in enfant:
            if etree.QName(c).localname == 'srgbClr':
                palette[nom] = '#' + c.get('val').upper()
            elif etree.QName(c).localname == 'sysClr':
                palette[nom] = '#' + (c.get('lastClr') or 'FFFFFF').upper()
    return palette


def eclaircir(h, brightness):
    """Teinte (brightness > 0) ou ombre (< 0) d'une couleur, comme le fait PowerPoint pour lumMod/lumOff."""
    r, g, b = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
    if brightness > 0:
        r, g, b = [c + (255 - c) * brightness for c in (r, g, b)]
    else:
        r, g, b = [c * (1 + brightness) for c in (r, g, b)]
    return hexa(r, g, b)


def couleur_pptx(cf, palette):
    """(hex|None, herite) d'un ColorFormat python-pptx. None = couleur non résolue."""
    from pptx.enum.dml import MSO_COLOR_TYPE
    try:
        t = cf.type
    except Exception:
        return None, True
    if t == MSO_COLOR_TYPE.RGB:
        return '#' + str(cf.rgb).upper(), False
    if t == MSO_COLOR_TYPE.SCHEME:
        nom = NOMS_SCHEMA.get(cf.theme_color.name if cf.theme_color is not None else '', None)
        base = palette.get(nom) if nom else None
        if base is None:
            return None, False
        try:
            br = float(cf.brightness or 0)
        except Exception:
            br = 0.0
        if br:
            APPROX['brightness'] += 1
            return eclaircir(base, br), False
        return base, False
    return None, True


def lire_pptx(chemin):
    from pptx import Presentation
    from pptx.enum.dml import MSO_FILL
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    prs = Presentation(chemin)
    palette = palette_du_theme(prs)
    ECHELLE = 1 / 12700.0  # EMU -> points
    largeur, hauteur = prs.slide_width * ECHELLE, prs.slide_height * ECHELLE
    sans_taille = {'n': 0}
    tableaux = {'n': 0}
    pages = []

    def fond_de_diapositive(slide):
        for source in (slide, slide.slide_layout, slide.slide_layout.slide_master):
            try:
                f = source.background.fill
                if f.type == MSO_FILL.SOLID:
                    c, _ = couleur_pptx(f.fore_color, palette)
                    if c:
                        return c
            except Exception:
                continue
        return palette.get('lt1', '#FFFFFF')

    def parcourir(formes, elements, dx=0.0, dy=0.0, ex=1.0, ey=1.0):
        for sh in formes:
            try:
                x = (dx + sh.left * ECHELLE * ex) if sh.left is not None else None
                y = (dy + sh.top * ECHELLE * ey) if sh.top is not None else None
                w = sh.width * ECHELLE * ex if sh.width is not None else None
                h = sh.height * ECHELLE * ey if sh.height is not None else None
            except Exception:
                continue
            if x is None or w is None:
                continue
            if sh.shape_type == MSO_SHAPE_TYPE.GROUP:
                try:
                    xfrm = sh._element.grpSpPr.xfrm
                    cx, cy = xfrm.chExt.cx or 1, xfrm.chExt.cy or 1
                    ox, oy = xfrm.chOff.x, xfrm.chOff.y
                    ex2, ey2 = (sh.width / cx) * ex, (sh.height / cy) * ey
                    parcourir(sh.shapes, elements, x - ox * ECHELLE * ex2, y - oy * ECHELLE * ey2, ex2, ey2)
                except Exception:
                    parcourir(sh.shapes, elements, x, y, ex, ey)
                continue
            if sh.shape_type == MSO_SHAPE_TYPE.PICTURE:
                elements.append({'type': 'image', 'x': x, 'y': y, 'w': w, 'h': h})
                continue
            if getattr(sh, 'has_table', False) and sh.has_table:
                tableaux['n'] += 1
                elements.append({'type': 'forme', 'x': x, 'y': y, 'w': w, 'h': h, 'fond': None, 'opacite': 1.0, 'indecidable': 'tableau'})
                continue
            # aplat
            try:
                f = sh.fill
                ft = f.type
            except Exception:
                f, ft = None, None
            if f is not None and ft == MSO_FILL.SOLID:
                c, _ = couleur_pptx(f.fore_color, palette)
                elements.append({'type': 'forme', 'x': x, 'y': y, 'w': w, 'h': h, 'fond': c, 'opacite': 1.0,
                                 'indecidable': None if c else 'couleur de thème non résolue'})
            elif f is not None and ft in (MSO_FILL.GRADIENT, MSO_FILL.PATTERNED, MSO_FILL.PICTURE):
                elements.append({'type': 'forme', 'x': x, 'y': y, 'w': w, 'h': h, 'fond': None, 'opacite': 1.0,
                                 'indecidable': {MSO_FILL.GRADIENT: 'dégradé', MSO_FILL.PATTERNED: 'motif', MSO_FILL.PICTURE: 'image'}[ft]})
            # texte
            if getattr(sh, 'has_text_frame', False) and sh.has_text_frame and sh.text_frame.text.strip():
                spans = []
                for p in sh.text_frame.paragraphs:
                    for r in p.runs:
                        if not r.text.strip():
                            continue
                        taille = r.font.size.pt if r.font.size is not None else (p.font.size.pt if p.font.size is not None else None)
                        if taille is None:
                            sans_taille['n'] += 1
                            taille = 18.0
                        c, herite = couleur_pptx(r.font.color, palette) if r.font.color is not None else (None, True)
                        if c is None and herite:
                            c = palette.get('dk1', '#000000')
                        gras = bool(r.font.bold) if r.font.bold is not None else bool(p.font.bold)
                        spans.append({'texte': r.text, 'taille': float(taille), 'gras': gras, 'couleur': c, 'herite': herite,
                                      'bbox': [x, y, x + w, y + h]})
                if spans:
                    tf = sh.text_frame
                    elements.append({'type': 'texte', 'x': x, 'y': y, 'w': w, 'h': h, 'spans': spans,
                                     'retour_auto': bool(tf.word_wrap) if tf.word_wrap is not None else True,
                                     'ajuste': str(tf.auto_size) if tf.auto_size is not None else None})

    for i, slide in enumerate(prs.slides, 1):
        elements = []
        parcourir(slide.shapes, elements)
        pages.append({'n': i, 'largeur': largeur, 'hauteur': hauteur, 'fond': fond_de_diapositive(slide), 'elements': elements})
    if sans_taille['n']:
        NON_JUGE.append(f"{sans_taille['n']} texte(s) sans taille de police explicite : 18 pt supposés (la taille héritée du masque n'est pas résolue)")
    if tableaux['n']:
        NON_JUGE.append(f"{tableaux['n']} tableau(x) PPTX : cellules non lues, rendu à mesurer sur l'export PDF")
    if APPROX['brightness']:
        NON_JUGE.append(f"{APPROX['brightness']} couleur(s) de thème à luminosité modifiée : teinte/ombre approchée, contraste à confirmer sur l'export PDF")
    NON_JUGE.append("couleur d'un texte non explicite : la couleur de texte 1 du thème est supposée (héritage du masque non résolu)")
    NON_JUGE.append("le fond d'un texte PPTX est lu au centre de sa boîte, pas sous chaque ligne : une boîte à cheval sur deux aplats est jugée sur celui de son centre")
    return {'format': 'pptx', 'pages': pages}


def main():
    if len(sys.argv) < 2 or not os.path.isfile(sys.argv[1]):
        sys.stderr.write('fichier absent\n')
        return 2
    chemin = sys.argv[1]
    ext = os.path.splitext(chemin)[1].lower()
    try:
        if ext == '.pdf':
            doc = lire_pdf(chemin)
        elif ext == '.pptx':
            doc = lire_pptx(chemin)
        else:
            sys.stderr.write('extension non prise en charge : %s (attendu .pdf ou .pptx)\n' % ext)
            return 2
    except ImportError as e:
        sys.stderr.write('module Python manquant : %s\n' % e)
        return 2
    except Exception as e:  # fichier illisible : dit, jamais deviné
        sys.stderr.write('fichier illisible : %s: %s\n' % (type(e).__name__, e))
        return 2
    doc['non_juge'] = NON_JUGE
    sys.stdout.write(json.dumps(doc, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
