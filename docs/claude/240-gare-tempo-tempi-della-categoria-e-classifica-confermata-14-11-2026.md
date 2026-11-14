## Le gare del bambino: il tempo appena inserito, i tempi della categoria senza nomi, posizione e punti a classifica confermata (14/11/2026)

Richiesta di Maurizio. In `src/features/lab/junior/Gare.tsx`, `Risultato` (carta della gara, iscrizione confermata):

- **Il tempo** compare appena il club lo scrive nei Tempi del CRM, grande («IL TEMPO DI SARA»); assente e squalificato come prima.
- **Posizione e punti** solo quando `classifica_confermata` (il CRM preme «Conferma la classifica» della categoria): «3° posto · 50 punti per il Trofeo». Prima: «Posizione e punti arrivano quando il club conferma la classifica della categoria».
- **I tempi della categoria** (`categoria` di `gare_di`), in ordine: il bambino evidenziato col nome, gli altri come «Atleta», senza nomi (il server non li manda). A classifica confermata diventa «Classifica della categoria», con posizione e punti.
- Tipi in `src/api/gare.ts` (`TempoCategoria`, `classifica_confermata`, `categoria`, facoltativi: con una funzione di prima l'app resta com'era). Il lato server è nella sezione 300 del `docs/claude` di APP-ATHLON (migrazione `20261114v`, applicata).
- `tsc` pulito su `src/`. **Non guardato in un browser né su un telefono**; l'app nativa la riceve solo con un'OTA.
