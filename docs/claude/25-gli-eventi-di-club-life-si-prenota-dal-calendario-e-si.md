## Gli eventi di Club Life: si prenota dal calendario e si condividono con un amico

Pagina dell'evento (`EventoDettaglio` in `src/features/lab/clublife/Dettaglio.tsx`, 21/10/2026, richiesta di Maurizio):

- **Gli eventi che si prenotano dal sito (`prenotaSulSito`) non mandano più il link per email**: il pulsante «Prenota nel calendario» porta alle Prenotazioni
  (`/calendario?giorno=AAAA-MM-GG&attivita=<categoria>`) già sul giorno dell'evento e sulla sua categoria su PerfectGym («Eventi Gratuiti», «Master Class»). La categoria
  arriva da `categoria` dell'evento nel `club-life.json` del sito (che la prende da `sito-eventi`); finché non c'è, si apre il giorno e basta. Il `Calendario` legge i due
  valori dall'indirizzo (`giorno` solo se ha la forma di una data, `attivita` solo insieme al giorno, al massimo 60 caratteri) e riparte da lì; il filtro si toglie dalle
  tessere come sempre. **Il calendario mostra oggi e i 14 giorni dopo**, ed è anche quando si aprono le prenotazioni di un evento: se l'evento è più lontano, al posto del
  pulsante c'è «Le prenotazioni non sono ancora aperte … a partire da <giorno>». Chi guarda in vista cliente arriva alle Prenotazioni come tutti: lì i comandi sono già chiusi.
  Il modulo per email dell'app (`richiediLinkEvento`, `api/moduli.ts`) non è più chiamato da qui; il link per email esiste ancora dal sito.
- **«Condividi con un amico»** (`condividi.ts`): il foglio di condivisione del telefono (Web Share sul web, `Share` sul nativo) con testo e link alla **pagina pubblica dell'evento
  sul sito**; sul computer il link si copia. Non porta nessun dato di chi condivide. Lo stesso pulsante c'è nella pagina dell'evento del sito.

