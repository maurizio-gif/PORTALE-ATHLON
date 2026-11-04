# L'icona dell'app (04/11/2026, scelta di Maurizio: la «D», il logo arancio sfumato su fondo nero, senza scritte).
# Disegna tutte le icone dal tracciato vettoriale del logo (lo stesso di Header.astro del sito), quindi nitide a ogni misura:
#   assets/images/icon.png                     1024, iPhone e App Store (Apple la vuole quadrata e senza trasparenza)
#   assets/images/android-icon-*.png           1024, Android adattiva: fondo nero, logo nella zona sicura, monocromatica bianca
#   assets/images/favicon.png, public/*.png    il portale web (favicon, PWA, apple-touch-icon, maskable)
# Si rilancia con: python3 scripts/icona-app.py  (serve Pillow). Poi una build nativa: l'icona sta dentro l'app.
from PIL import Image, ImageDraw

DX = [(166.5,0),(164.3,2.5),(142,50.5),(141.5,52.5),(143.5,55.5),(170.5,55.8),(197.5,44.8),(254.5,44.8),(257,46.5),(257,49.5),(194.1,183.5),(194,187.5),(195.5,189),(274.5,188.9),(279.5,177.5),(271,159.5),(270,154.5),(315.8,56.5),(313.7,49.5),(291.7,2.5),(288.5,0)]
SX = [(62.5,67),(0.3,198.5),(0.2,201.5),(2.3,206.5),(23.3,251.5),(26.5,256),(149.5,256),(173.9,205.5),(174.5,203.5),(172.5,200.5),(144.5,200.3),(118.5,211.2),(61.5,211.2),(59,209.5),(59,206.5),(64,195.5),(122.5,70.5),(120.5,67)]
NERO = (10, 10, 11)
TAPPE = [(0, (0xff, 0x7a, 0x1a)), (0.55, (0xff, 0x57, 0x01)), (1, (0xe8, 0x43, 0x00))]
K = 4  # sovracampionamento, poi si riduce: bordi lisci


def gradiente(w, h):
    g = Image.new('RGB', (w, h))
    px = g.load()
    for y in range(h):
        for x in range(w):
            t = x / w * 0.552 + y / h * 0.448
            for (a, ca), (b, cb) in zip(TAPPE, TAPPE[1:]):
                if t <= b:
                    u = (t - a) / (b - a)
                    px[x, y] = tuple(int(ca[j] + (cb[j] - ca[j]) * u) for j in range(3))
                    break
    return g


def disegna(lato, quota, fondo, colore='gradiente'):
    """`quota`: la larghezza del logo rispetto al lato. `fondo`: un colore o None (trasparente)."""
    n = lato * K
    s = quota * n / 316
    w, h = int(316 * s), int(256 * s)
    x0, y0 = (n - w) // 2, (n - h) // 2
    maschera = Image.new('L', (n, n), 0)
    d = ImageDraw.Draw(maschera)
    for p in (DX, SX):
        d.polygon([(x0 + x * s, y0 + y * s) for x, y in p], fill=255)
    if colore == 'gradiente':
        tinta = Image.new('RGB', (n, n))
        tinta.paste(gradiente(max(w // 8, 1), max(h // 8, 1)).resize((w, h), Image.BILINEAR), (x0, y0))
    else:
        tinta = Image.new('RGB', (n, n), colore)
    if fondo is None:
        im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
        im.paste(tinta, (0, 0), maschera)
    else:
        im = Image.new('RGB', (n, n), fondo)
        im.paste(tinta, (0, 0), maschera)
    return im.resize((lato, lato), Image.LANCZOS)


disegna(1024, 0.625, NERO).save('assets/images/icon.png')
# Android: il sistema ritaglia il cerchio (o la forma del produttore) al centro, la zona sicura e' il 66%: il logo sta dentro.
disegna(1024, 0.46, None).save('assets/images/android-icon-foreground.png')
Image.new('RGB', (1024, 1024), NERO).save('assets/images/android-icon-background.png')
disegna(1024, 0.46, None, (255, 255, 255)).save('assets/images/android-icon-monochrome.png')
# Web
disegna(96, 0.86, None).save('assets/images/favicon.png')
disegna(180, 0.625, NERO).save('public/apple-touch-icon.png')
disegna(192, 0.625, NERO).save('public/logo192.png')
disegna(512, 0.625, NERO).save('public/logo512.png')
disegna(192, 0.5, NERO).save('public/maskable192.png')
disegna(512, 0.5, NERO).save('public/maskable512.png')
print('icone scritte')
