#!/usr/bin/env python3
"""Fabrique toutes les déclinaisons du logo à partir de assets/logo.png.

Le logo est la seule source : ce script en tire l'image de l'en-tête,
l'icône d'onglet et d'iPhone, et les icônes d'application Android.
Remplacez assets/logo.png (PNG détouré, fond transparent) puis relancez :

    python3 tools/icones.py
"""
import os
from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOIR = (7, 7, 10)                 # --noir, le fond du site

logo = Image.open(os.path.join(RACINE, 'assets', 'logo.png')).convert('RGBA')
logo = logo.crop(logo.getbbox())  # au cas où la source porterait une marge


def pose(cote, part):
    """Le logo centré sur un carré noir, occupant `part` du côté."""
    fond = Image.new('RGBA', (cote, cote), NOIR + (255,))
    large = int(round(cote * part))
    haut = max(1, int(round(large * logo.height / logo.width)))
    if haut > large:              # logo plus haut que large : on ajuste
        haut, large = large, max(1, int(round(large * logo.width / logo.height)))
    petit = logo.resize((large, haut), Image.LANCZOS)
    fond.alpha_composite(petit, ((cote - large) // 2, (cote - haut) // 2))
    return fond.convert('RGB')


def ecrire(im, nom):
    chemin = os.path.join(RACINE, 'assets', nom)
    im.save(chemin, optimize=True)
    print('%-24s %s  %d octets' % (nom, '%dx%d' % im.size, os.path.getsize(chemin)))


# En-tête : transparent, à trois fois la taille d'affichage (96 px) pour
# rester net sur un téléphone. Ramené à 128 couleurs, ce qui divise le
# poids par quatre sans différence visible sur un dégradé doré — et cette
# image-là se charge en haut de page, avant tout le reste.
entete = logo.resize((288, max(1, round(288 * logo.height / logo.width))), Image.LANCZOS)
ecrire(entete.quantize(colors=128, method=Image.FASTOCTREE), 'logo-header.png')

# Onglet et écran d'accueil iPhone : iOS ne gère pas la transparence, fond noir.
ecrire(pose(180, 0.80), 'favicon.png')

# Icônes d'application Android déclarées dans le manifeste.
ecrire(pose(192, 0.80), 'icon-192.png')
ecrire(pose(512, 0.80), 'icon-512.png')
# « maskable » : Android y découpe un cercle, il faut rester dans les 80 %.
ecrire(pose(512, 0.62), 'icon-maskable-512.png')
