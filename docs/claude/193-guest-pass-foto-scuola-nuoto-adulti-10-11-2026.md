## Guest Pass: la foto della Scuola Nuoto Adulti nell'elenco «Cosa comprende» (10/11/2026)

Richiesta di Maurizio: una foto di una persona che nuota a stile libero, «per le presentazioni di scuola nuoto adulti», e poi «nel portale la devi mettere». Nel portale l'unica
presentazione della Scuola Nuoto Adulti con un testo suo è la scheda a fisarmonica «Cosa comprende» della pagina di attivazione del Guest Pass (`/r/<codice>`,
`features/guest-pass/ProvaTuttoIlClub.tsx`, voci in `ATTIVITA_PROVA`, vedi la sezione 29): per questo la foto è andata lì. **Solo app, nessun cambio lato server.**

- **Cosa si vede**: aprendo «Scuola Nuoto Adulti», sopra il testo compare la foto, larga quanto il riquadro aperto, in 16:9 con gli angoli arrotondati e un po' di spazio dalla riga
  (inquadratura leggermente in alto, `contentPosition: { top: '35%' }`: il nuotatore resta dentro). Il testo e il «Scopri di più sul sito» sono quelli di prima. Chiusa la scheda, o
  aperta un'altra attività, la foto non c'è (una aperta alla volta, come sempre).
- **Il file**: `assets/images/attivita/scuola-nuoto-adulti.webp`, WebP 1280×853, 98 KB (l'originale era un JPEG da 1,36 MB, 2576×1717). **Il profilo colore dell'originale era Adobe RGB**: è stato
  convertito in sRGB e i metadati sono stati tolti, altrimenti l'azzurro dell'acqua si vede spento fuori dai programmi che leggono i profili. È una foto del club, tenuta nel repository come
  `invita/amici-in-sala.webp` (non un file del sito come le foto della sezione Junior, vedi la sezione 87): se la si sostituisce, si tiene lo stesso formato e la stessa larghezza.
- **Dove sta nel codice**: la mappa `FOTO` in `ProvaTuttoIlClub.tsx`, per `chiave` come `ICONE`. **Non in `lib/guestPass.ts`**, che resta fatto di soli dati. Un'altra attività con una foto
  si aggiunge con una voce nella mappa e un file in `assets/images/attivita/`; oggi ce l'ha solo la Scuola Nuoto Adulti, le altre sono com'erano.
- **Accessibilità**: l'etichetta è nel testo dell'immagine (`accessibilityLabel`, come nel resto del progetto); con `alt` di `expo-image` sul web restava vuota.
- **Provato**: `tsc --noEmit` senza errori nel file toccato; nell'esportazione web in Chromium (390 px in tema chiaro e scuro, 1280 px chiaro, italiano; `portale-link` simulato con dati
  inventati): la foto si carica (1280 px), è 16:9 (324×182 sul telefono, 686×386 sul computer), non c'è scorrimento orizzontale, aprendo un'altra attività sparisce, nessun errore in console.
  **Non provato**: un telefono vero, l'app nativa (iOS e Android: `contentPosition` in percentuale e la dissolvenza dell'immagine), la lingua inglese, e la pagina con una sessione vera.
