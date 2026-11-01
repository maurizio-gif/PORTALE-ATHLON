## «Scrivi al team»: l'assistente passa a una persona, e la persona decide (31/10/2026)

Richiesta di Maurizio: l'assistente fa una prima assistenza e, se non basta, apre un ticket per il team. Regole, funzione, tabella, compito in Agenda ed email al desk: `CLAUDE.md` di APP-ATHLON,
«L'assistente fa la prima assistenza e poi apre un ticket per il team». Qui cosa fa l'app (`assistente/teamDaChat.ts`, `ScriviAlTeam.tsx`, `scriviAlTeam` in `api/assistente.ts`, `FoglioAssistente.tsx`).

- **L'assistente propone, la persona decide.** La funzione manda il pulsante come `{ destinazione: 'scrivi-team', parametri: {}, etichetta: 'Scrivi al team' }`: **non e' una destinazione** (non sta in
  `DESTINAZIONI_ASSISTENTE`, l'elenco chiuso uguale a quello della funzione) ma apre una carta nella chat, come `prenota-lezione` e `paga-quote`. Compare quando la persona e' arrabbiata, insiste dopo un
  «non e' possibile» o ha un caso suo, e **una volta per conversazione**.
- **La carta dice cosa arriva al team** prima di mandarlo: la conversazione con l'assistente e, se la persona vuole, due righe sue (fino a 1000 caratteri), e che il team **risponde via email**. Dice anche di
  non scrivere dati sulla salute (li leggono persone del club). **Niente parte da solo**: la conversazione va al team solo con «Invia al team». Dopo l'invio: «Fatto: il team ha ricevuto la conversazione e ti
  risponde via email». Nessuna promessa sui tempi.
- **Chi e' lo sa la sessione**: nome ed email non si chiedono (a differenza dell'assistente del sito). La conversazione la rilegge il server dal suo registro: dall'app parte solo l'id. Con la funzione non ancora
  aggiornata («Azione sconosciuta.») la carta dice che il team non e' raggiungibile da qui e lascia riprovare. Tre al giorno: oltre, il messaggio della funzione.
- **In vista cliente non c'e'** (l'assistente non c'e' e la funzione non e' fra le letture).
- **Provato**: `npx tsx scripts/prova-assistente.ts` (5 gruppi, con la parte pura di `teamDaChat`) e `npx tsc --noEmit` (restano due errori che non sono di questa modifica, in `abbonamento.ts` e `Gestisci.tsx`,
  piu' quelli di `docs/classifica-server`). **Non guardata renderizzata** (390 e 1280 px, chiaro e scuro, italiano e inglese), **non provata su un telefono** e **non provata con la funzione vera**.
- **Da pubblicare dopo la funzione** (APP-ATHLON: migrazione `20261031a`, poi `portale-lab-assistente`): senza, il pulsante non compare mai.
- **L'allegato** (31/10/2026, Maurizio: «come nell'altra chat del sito»; serve per esempio per il certificato medico della sospensione per inabilita'). Sotto il campo di testo della carta, **«Allega una foto o un PDF»**: **un file solo**, JPG/PNG/WebP o PDF, fino a 5 MB, con le stesse funzioni degli allegati del feedback (`scegliAllegati`, `preparaAllegato`: sul web una foto grande si porta a 1800 px, l'app nativa manda il file com'e'). Il file scelto si vede con la sua miniatura e un cestino per toglierlo; **parte solo con «Invia al team»**, e la carta dice che arriva al team nella pagina del ticket e **non per email**, e che un certificato lo leggono persone del club. `scriviAlTeam(conversazioneId, messaggio, allegato?)` manda `allegato: { nome, base64 }`. **Serve la funzione aggiornata** (APP-ATHLON, migrazione `20261031c`): una funzione vecchia ignora il campo senza dirlo, quindi **si pubblica prima il server**. `tsc` pulito; **non guardato renderizzato** (390 e 1280 px, chiaro e scuro) e non provato con un file vero.


