## L'icona dell'app: il logo arancio su fondo nero, senza scritte (04/11/2026)

Scelta di Maurizio fra quattro proposte (con «APP» bianco, arancio, in una pillola, o solo il logo): **solo il logo**, arancio sfumato
(lo stesso gradiente del logo animato del sito, `Header.astro`) su fondo quasi nero `#0A0A0B`. Prima l'icona era il logo bianco su
arancio, a 512 px: Apple la ingrandiva a 1024 per lo Store e si vedeva sgranata.

- **`scripts/icona-app.py`** disegna tutte le icone dal tracciato vettoriale del logo, nitide a ogni misura: `assets/images/icon.png`
  (1024, iPhone e App Store, senza trasparenza), le tre di Android (`android-icon-background/foreground/monochrome.png`) e quelle del
  web (`favicon.png`, `public/logo*.png`, `public/maskable*.png`, `public/apple-touch-icon.png`). Si rilancia con
  `python3 scripts/icona-app.py` (serve Pillow).
- **Android aveva ancora le icone di prova di Expo** (la «^» blu): ora fondo nero, il logo nella zona sicura dell'icona adattiva
  (46% del lato, dentro il 66% che il sistema mostra) e la monocromatica bianca per le icone a tema di Android 13+. In `app.json`
  `adaptiveIcon.backgroundColor` passa da `#FF5701` a `#0A0A0B`.
- **Lo splash resta arancio** col logo bianco: non era nella richiesta.
- **L'icona sta dentro l'app**: arriva solo con una build nuova (non con un OTA), e su App Store Connect si vede dalla build
  selezionata nella versione. La prima con l'icona nuova è la build 9 della 3.0.0.
