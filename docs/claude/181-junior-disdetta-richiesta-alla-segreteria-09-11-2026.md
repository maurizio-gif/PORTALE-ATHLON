## Junior: «Disdici l'abbonamento» invia una richiesta alla segreteria (09/11/2026)

PerfectGym rifiutava sempre la disdetta dei corsi bambini fatta dall'app: questi contratti nascono con una data di disdetta già segnata
alla firma. Maurizio ha scelto di tenere il comando ma farne una **richiesta alla segreteria**, fino al passaggio dei corsi bambini al
nostro motore. Lato server: `CLAUDE.md` di APP-ATHLON, sezione 192.

- **I tre passi restano** (`DisdiciCorso.tsx`).
  - Il primo dice «Chiedi la disdetta: la segreteria la registra e ti conferma per email». La nota dei 10 giorni aggiunge che conta il
    giorno in cui la si chiede, non quello in cui la segreteria la registra.
  - Il terzo si chiama «Conferma la richiesta», e il pulsante «Invia la richiesta di disdetta».
- **Dopo l'invio**, e finché la richiesta è aperta, al posto del comando c'è «Richiesta di disdetta inviata»: la segreteria la registra e
  conferma per email, l'abbonamento finisce il … e non si rinnova. Quando la segreteria l'ha fatta e il mirror non ha ancora la fine nuova,
  si legge «Disdetta registrata».
- **`ContrattoJunior.disdetta_richiesta`** (`{ fine, il, stato }`) arriva con i corsi, e `Corsi.tsx` lo passa al componente.
  **`disdiciCorso`** (`src/api/junior.ts`) restituisce `richiesta`, `giaChiesta` e `stato`. Con la funzione di prima, che scriveva su
  PerfectGym, la risposta non ha `richiesta` e vale come disdetta fatta.
- **Provato**: `tsc --noEmit`, nessun errore in `src/`. **Non provato** su un telefono.
