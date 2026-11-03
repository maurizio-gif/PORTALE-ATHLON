## La carta Junior in Home è blu, come la testata della sezione (04/11/2026)

Richiesta di Maurizio (04/11/2026, dallo screenshot della Home accanto a quello della sezione): «la sezione Junior nella Home colorata di blu come dentro la sezione». La carta `home/CartaJunior.tsx` era una carta bianca con il bollino azzurro; ora è un riquadro pieno dello **stesso blu acqua della testata di Junior** (`MARE[1]`, `junior/Presentazione.tsx`), come il riquadro Abbonamenti della Home è arancio. **Cambia solo l'aspetto**: testo, destinazione (`/junior`, con l'anno del figlio se c'è) e precarico dei gruppi sono quelli di prima.

- **Fondo e bordo** `MARE[1]`, **le stesse due onde** della testata (cerchi di `MARE[2]` e `MARE[0]`, ritagliati dal bordo arrotondato, `pointerEvents="none"` perché non rubino il tocco), **titolo, frase e freccia bianchi** (la frase al 90%), **bollino bianco traslucido** con la goccia bianca (come quello della testata).
- **Lo stesso blu nei due temi**, come nella testata: non segue la palette chiara/scura, quindi nel tema scuro la carta resta blu pieno.
- Resta fuori dal resto: le altre carte della Home (Shop, Invita, Feedback) non cambiano.
- File: `home/CartaJunior.tsx`. Le costanti delle onde sono ripetute da `Presentazione.tsx` (due blocchi di stile di 4 righe): se si vogliono tre posti, conviene estrarle in un componente comune.
- **Provato**: `tsc` pulito sul `src/`. **Non guardato in un browser né su un telefono**: la Home richiede l'accesso. Da guardare: le onde dentro il bordo arrotondato (che non spuntino), la frase bianca su due o tre righe (con e senza figlio), il contrasto del testo sul blu, il tema scuro, e che il tocco apra ancora Junior.
