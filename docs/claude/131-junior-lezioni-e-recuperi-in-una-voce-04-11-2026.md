## Junior: lezioni e recuperi in una voce sola, «Recuperi» (04/11/2026)

Richiesta di Maurizio. Per un bambino con un abbonamento attivo, il menu della sezione Junior aveva due voci, «Lezioni» (le prossime lezioni prenotate, con «Disdici») e «Recuperi» (il saldo e la prenotazione del recupero). Ora sono una voce sola, **«Recuperi»**, che si legge dall'alto in basso come la procedura:

1. **Le tue prossime lezioni**, con in testa il riquadro «Come si recupera una lezione»: se non potete venire si disdice la prenotazione (fino a un'ora prima). Nel momento in cui la si disdice viene assegnato il recupero. Sotto, le lezioni con «Disdici».
2. **Il saldo dei recuperi**: disdette, recuperate, da recuperare, con la scadenza e «Come funzionano i recuperi».
3. **Prenota un recupero**: il calendario dei recuperi della sua fascia.

- Un corso senza recuperi (`recuperabile` falso) ha la voce **«Lezioni»**, con le sole prossime lezioni. `?voce=recuperi` apre la voce come prima.
- Il codice: `parte === "recuperi"` in `CorsiPersona` mostra anche le lezioni (`mostraLezioni` in `Corsi.tsx`), e le voci del menu stanno in `AreaIscritto` (`Junior.tsx`). Nessun cambio lato server.
- Provato con Playwright sull'export web, con le risposte delle funzioni simulate: nel menu non c'è più «Lezioni», e le quattro parti stanno nell'ordine detto. Non provato su un telefono.
