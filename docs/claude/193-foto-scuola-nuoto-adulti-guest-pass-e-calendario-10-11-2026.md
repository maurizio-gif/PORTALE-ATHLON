## La foto della Scuola Nuoto Adulti: nel Guest Pass e come copertina delle lezioni del Calendario (10/11/2026)

Richiesta di Maurizio: una foto di una persona che nuota a stile libero, «per le presentazioni di scuola nuoto adulti», da mettere nel portale. Poi uno screenshot del Calendario con le
lezioni della Scuola Nuoto Adulti e il messaggio «Qui»: quelle carte avevano come sfondo la sagoma da sala pesi. **La foto è in due posti**; solo app, nessun cambio lato server.

- **Il file e dove sta**: `assets/images/attivita/scuola-nuoto-adulti.webp`, WebP 1280×853, 98 KB (l'originale era un JPEG da 1,36 MB, 2576×1717). **Il profilo colore dell'originale era Adobe RGB**:
  è stato convertito in sRGB e i metadati sono stati tolti, altrimenti l'azzurro dell'acqua si vede spento fuori dai programmi che leggono i profili. È una foto del club, tenuta nel repository
  come `invita/amici-in-sala.webp` (non un file del sito come le foto della sezione Junior, vedi la sezione 87). **La sorgente è in un posto solo, `lib/fotoAttivita.ts`**
  (`FOTO_SCUOLA_NUOTO_ADULTI`): se si sostituisce il file si tiene lo stesso nome, lo stesso formato e la stessa larghezza, e cambia in tutti e due i posti.
- **1. Il Calendario: la copertina della lezione** (`Copertina` in `features/lab/Calendario.tsx`). La copertina mostra la foto del sito della lezione (`scheda.foto`); senza, ripiega su un fondo scuro con la
  sagoma da sala pesi al 7%. **La Scuola Nuoto Adulti sul sito non ha una scheda** (lo dice già `CalorieLezione.tsx`), quindi **tutte** le sue lezioni finivano sul ripiego. Ora, **se la lezione non ha
  una foto dal sito e la categoria è «Scuola Nuoto Adulti»**, la copertina è la foto del club, con la stessa sfumatura nera di tutte le altre copertine (il nome, la sala e l'istruttore restano bianchi e
  leggibili). L'inquadratura è `contentPosition: { top: '70%' }`: il nuotatore sta nella metà alta, sopra il titolo anche quando il nome va su due righe («Nuoto Adulti – Intermedio»).
  **Non cambia**: le altre categorie senza foto (Group Reformer, ecc.) hanno il fondo scuro con la sagoma di prima; una foto del sito, dove c'è, vince sempre; la tessera del filtro «Scuola Nuoto Adulti», i
  bollini (posti, «Prenotata», «Completa · N in attesa»), il resto della carta e le altre schermate.
- **2. Il Guest Pass: la scheda «Scuola Nuoto Adulti» di «Cosa comprende»** (`features/guest-pass/ProvaTuttoIlClub.tsx`, sezione 29). Aprendo la voce, sopra il testo compare la foto, larga quanto il riquadro
  aperto, in 16:9 con gli angoli arrotondati e un po' di spazio dalla riga (`contentPosition: { top: '35%' }`). Mappa `FOTO` per `chiave`, come `ICONE`: solo chi ce l'ha la mostra, le altre attività sono
  com'erano, e `lib/guestPass.ts` resta fatto di soli dati. L'etichetta accessibile è `accessibilityLabel` (con `alt` di `expo-image` sul web restava vuota).
- **Provato**: `tsc --noEmit` senza errori in `src/`. **Guest Pass**: esportazione web in Chromium (390 px chiaro e scuro, 1280 px, `portale-link` simulato con dati inventati): la foto si carica, è 16:9, nessuno
  scorrimento orizzontale, aprendo un'altra attività sparisce, nessun errore in console. **Calendario**: una pagina di prova temporanea (poi tolta, non è nel repository) che disegna `Copertina` a 390 px in tema chiaro e
  scuro con cinque casi (Scuola Nuoto Adulti normale, prenotata e completa; Group Reformer senza foto; Scuola Nuoto Adulti con una foto del sito): le prime tre usano la foto del club a 1280 px, la quarta resta sul
  fondo scuro, la quinta usa la foto del sito. Guardati a occhio in tema scuro; nessun errore in console.
  **Non provato**: il Calendario vero con una sessione e la risposta vera di `portale-lab-calendario` (la carta è stata provata da sola), un telefono vero, l'app nativa (`contentPosition` in percentuale e la
  dissolvenza dell'immagine), la lingua inglese.
