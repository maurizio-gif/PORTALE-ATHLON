## Junior: il Direttore Tecnico, dalla scheda di un bambino iscritto (22/10/2026)

`junior/DirettoreTecnico.tsx`, API `slotDirettoreTecnico` / `prenotaDirettoreTecnico` in `src/api/junior.ts`, funzione `portale-lab-junior` (azioni `dt_slot` e `dt_prenota`, APP-ATHLON). Richiesta di Maurizio: sotto i corsi di un bambino **iscritto** (dove ci sono disdette e recuperi) c'è la spiegazione del ruolo del Direttore Tecnico e il calendario per fissargli una telefonata, **senza chiedere nessun dato**.

- **Compare solo per un minorenne con almeno un gruppo** (`persona.minorenne && persona.gruppi.length > 0`), sotto `CorsiPersona`. Spiega cosa fa (progressione, cambio gruppo o orario, segnalazioni, dubbi sul percorso) e che **non è la strada per iscriversi** né per un posto in un turno pieno: le stesse parole della scheda «Direzione Tecnica» del Wiki, da tenere in pari.
- **Gli orari si leggono solo quando si apre il calendario** («Fissa una telefonata»): giorno, orario, poi **di cosa vuoi parlare** (obbligatorio: lo legge il Direttore Tecnico prima di chiamare) e, **solo se PerfectGym non ha il cellulare del genitore**, il cellulare. Nient'altro: genitore e bambino li ricava la funzione.
- **Chi prenota lo decide il server**: il titolare è l'indirizzo della sessione, il bambino deve essere un minorenne del suo nucleo con un'iscrizione in corso. Poi la funzione chiama la stessa rotta del sito: stessa agenda, stesso tetto di due al giorno, stessa email di conferma e avviso a nuoto@; la riga nasce con `origine = 'app'`. Un orario preso nel frattempo rilegge gli orari e lo dice.
- **In vista cliente** si vede la spiegazione e non si prenota (`dt_prenota` risponde 403).
- **Non provato**: una prenotazione vera con una sessione vera, la schermata resa (390 e 1280 px), un telefono. `tsc` pulito sui file toccati. **Pubblicare in ordine**: migrazione `20261022e`, `portale-lab-junior`, CRM (merge), app.

