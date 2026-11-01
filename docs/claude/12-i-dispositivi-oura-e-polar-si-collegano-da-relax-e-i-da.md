## I dispositivi: Oura e Polar si collegano da Relax, e i dati restano del socio

L'area **Relax** di Athlon Health System (`fit/Relax.tsx`) mostra il recupero con quello che dicono l'anello Oura e gli orologi Polar del socio, e
la schermata `/allenamento/dispositivi` (`dispositivi/Dispositivi.tsx`) li collega e li scollega (19/10/2026). Funzione, tabelle, sicurezza e
lista di cosa controllare con i fornitori: `CLAUDE.md` di APP-ATHLON.

- **Relax c'è per tutti i maggiorenni** (`relaxAperto` in `useDispositivi.ts`, dal 20/10/2026: prima compariva solo dove un fornitore era
  disponibile o c'era un consenso). Il sonno si scrive anche a mano (`fit/CheckInSonno.tsx`, vedi l'Athlon Health Score sotto), quindi la scheda
  non dipende dal possedere un anello; **i dispositivi sono un modo in più di riempirla**, e la carta «Hai un anello o un orologio?» compare solo se
  almeno un fornitore è disponibile (`dispositiviCollegabili`). Nella vista cliente dello staff non si apre e **non si chiama la funzione**.
- **Consenso prima di tutto** (`Vetrina.tsx`, testo in `informativa.ts`): senza, niente si collega. **Cambiando il testo si cambia
  `VERSIONE_INFORMATIVA` qui e nella funzione**: la sezione si richiude e il socio riaccetta. La revoca (in fondo a `Dispositivi.tsx`) scollega
  tutto e cancella i dati (**comprese le notti scritte a mano**). Solo maggiorenni. L'informativa va fatta rileggere al consulente privacy prima di aprire a tutti.
  Dal 20/10/2026 (`VERSIONE_INFORMATIVA = '2026-10-20'`, qui e nella funzione) il testo dice anche del sonno scritto a mano e dell'Athlon Health Score.
- **Il ritorno dal fornitore arriva su `/allenamento/dispositivi?code=…&state=…`** (è il redirect URI registrato presso Oura e Polar): la
  schermata manda codice e state a `completa` con la sessione del socio e **toglie subito i parametri con `router.setParams`, non con
  `replace`** (un replace rifà la schermata da capo e l'avviso «Oura collegato» andrebbe perso: si è visto nel browser). Se il socio annulla
  il fornitore rimanda `error`: nessuna chiamata, solo un avviso. La pagina aspetta la sessione (`useSessione`) prima di leggere l'indirizzo.
- **Sul web si lascia l'app per il sito del fornitore e si torna** (`window.location.assign`, come per i pagamenti). Nell'app nativa si apre il
  browser (`Linking.openURL`) e il ritorno si completa nel browser, **dove la sessione potrebbe non esserci**: da provare su una build nativa
  prima di offrirlo lì.
- **Descrive, non consiglia.** Niente frasi su cosa fare in base ai numeri, niente obiettivi (gli anelli e le colonne del sonno sono in scala
  0-10 ore, non c'è un «8 ore» da riempire; **il solo posto dove «7 ore» pesa è l'Athlon Health Score**, dove una notte da 7 ore in su vale il massimo:
  è una soglia del punteggio, non una frase rivolta al socio, e l'ha chiesta il club), parole morbide per il recupero (`recupero()` in `comune.ts`: ottimo, buono, discreto, «da
  ricaricare»; mai un allarme) con il numero del fornitore sempre accanto («88 su 100», «4 su 6»), e la nota «valori indicativi del tuo
  dispositivo, non un parere medico». I dati del dispositivo **non entrano nel contatore delle calorie né nel Balance**: un allenamento fatto
  in app e uno registrato dall'orologio rischiano di contare due volte la stessa ora; se il club lo vuole, si decide come evitarlo prima.
- **I dati li legge `useDispositivi`** (memoria `dispositivi:stato` e `dispositivi:dati`, rilettura a ogni ritorno su Fit). Dopo una
  scrittura la schermata si aggiorna dalla risposta (`imposta`), dopo un consenso o una revoca rilegge tutto (`rileggi`, con una lettura
  esplicita: non ci si affida al rinfresco del focus, che qui non ripartiva).

