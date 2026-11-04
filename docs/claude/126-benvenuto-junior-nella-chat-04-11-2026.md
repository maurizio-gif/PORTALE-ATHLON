## La chat nella sezione Junior comincia dal corso del bambino (04/11/2026)

Richiesta di Maurizio («testo fisso»). Aperta dalla sezione Junior (dal link del sito, che la apre da sola, o dal pulsante «Richiedi assistenza»), la chat non mostra i suggerimenti generici (prenotare, pagare, metodo di pagamento) ma `BenvenutoJunior`: un riquadro sul corso del bambino scelto, scritto da noi con le parole dell'Help Desk e del sito, e le domande che si fanno di solito.

- **Scuola Nuoto** (non iscritto): metodo, turni per età e gruppi per livello, istruttore dopo la prima settimana, turno fisso e recuperi, brevetti, e «qui sotto trovi i turni disponibili con i prezzi». **Baby Nuoto** (non iscritto): 40 minuti in acqua col genitore, due gruppi per età, lezioni prenotate una alla volta, mensile o singola. **Iscritto**: solo le domande (recuperi, brevetti, cambio orario; per il Baby prenotare, cosa portare, disdire).
- Il corso lo dice `Junior.tsx` (`impostaTemaJunior`, in `assistente/store.ts`): Baby se il bambino è in età (`eBaby`), Scuola Nuoto se l'anno la apre (`attivitaDiPersona`). Uscendo dalla sezione si toglie.
- **Se le pagine del corso cambiano** (età, durata, gruppi), il testo va cambiato anche qui.
- Lato server (più fonti e la regola 33): `CLAUDE.md` di APP-ATHLON, «L'assistente dell'app racconta i corsi dei bambini».
- **Provato**: `tsc` pulito. **Non guardato in un browser né su un telefono.**
