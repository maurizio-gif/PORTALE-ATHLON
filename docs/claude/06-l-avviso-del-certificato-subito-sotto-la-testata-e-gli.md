## L'avviso del certificato, subito sotto la testata, e gli abbonamenti a quota zero che contano

Richiesta del club (20/10/2026). Due cose che si tengono insieme, perché l'avviso guarda gli abbonamenti:

- **L'avviso** (`home/AvvisoCertificato.tsx`) sta **subito sotto la testata della Home**, prima del messaggio di benvenuto e di «Da fare»: bordo
  e velo rossi, il titolo («Certificato medico mancante» / «scaduto» / «rifiutato», o «Certificati medici da sistemare» se sono più persone del
  nucleo), chi e da quando, e il pulsante che apre la sezione Certificato (dove c'è la «i» di quale certificato serve e il caricamento). **Compare
  solo per chi ha un abbonamento in vigore** (`personeConAbbonamento`) **e il certificato scaduto o mancante** (`StatoCertificato.scadutoOMancante`).
  Vale **per persona**: il titolare senza abbonamento non è avvisato perché il figlio ha il corso. Non è un avviso: «in scadenza», «da consegnare entro
  i 6 anni», sotto i 6 anni, un certificato caricato e «in verifica» (la persona ha fatto la sua parte). Un certificato **rifiutato** su uno scaduto o
  mancante sì: la situazione di prima resta, e il motivo è nel dettaglio. Un abbonamento «in vigore» è come lo intende il resto della Home: in corso,
  non ancora iniziato o sospeso (i contratti dell'area sono tutti vivi). Il tasto è a tutta larghezza sul telefono e largo quanto il testo sul desktop;
  in vista cliente dello staff dice «Vedi il certificato», perché lì non si carica niente.
- **Chi ha l'avviso non ha la stessa voce in «Da fare»** (sarebbe due volte la stessa cosa uno sopra l'altra): `vociDaFare` salta le persone avvisate.
  Restano in «Da fare» il certificato in scadenza o da consegnare entro i 6 anni, **solo per chi ha un abbonamento in vigore**.
- **Chi non ha un abbonamento in vigore non legge niente del suo certificato in «Da fare»** (20/10/2026, richiesta di Maurizio): un ex socio, una prova
  (Guest Pass), un familiare senza corso, un abbonamento finito. Vale per persona, titolare compreso: `vociDaFare` salta chi non è in `personeConAbbonamento`,
  cioè chi non ha un contratto dell'area che sia un abbonamento (`eAbbonamento`) in corso, non ancora iniziato o sospeso (`vivo` = `Current`, `NotStarted`,
  `Freezed`). **La sezione Certificato** (che si apre dal riquadro) **non è cambiata**: chi la apre vede lo stato e può caricare, abbonamento o no.
- **Gli abbonamenti principali a quota zero sono abbonamenti** (`eAbbonamento` in `home/regolarita.ts`): gli omaggi e gli employee (`tipo = 'gratuito'`,
  non aggiuntivi: «Employee contract» e «Omaggio Club») contano nel riquadro Abbonamenti («1 attivo», prima «0
  attivi»), nell'elenco «In vigore» sotto di lui e nell'avviso. **Restano fuori il Guest Pass** (è una prova: ha lo stesso canone zero), **i contratti
  aggiuntivi a zero e i voucher Covid** (richiesta del club: per il database sono `gratuito` come gli omaggi, ma la funzione li manda con `tipo = 'voucher_covid'`). Il metodo di pagamento non si pretende dove non c'è un canone, e un pagamento in sospeso resta un pagamento in sospeso.
- **Il tipo viene dal database**: `portale_la_mia_area` porta su ogni contratto `tipo` e `aggiuntivo` (migrazione `20261020g` di APP-ATHLON), e `portale-abbonamento`
  (azione `contratti`) elenca anche i gratuiti principali. **Con la funzione non ancora aggiornata `tipo` non c'è e l'app fa come prima**: conta solo chi ha
  un canone, nessun avviso nuovo per un employee, niente si rompe. **Pubblicare prima migrazione e funzione, poi l'app**: un'app nuova con la
  funzione `contratti` vecchia dice «1 attivo» sopra e «Non troviamo abbonamenti in corso» sotto.
- **Il CRM non è allineato su un punto**: `certificati_stato` (la pagina Certificati e i promemoria) guarda `socio_stato.stato = 'abbonato'`, cioè un contratto vivo
  **a canone > 0**. Un employee o un omaggio con il certificato scaduto ha l'avviso nell'app ma non compare nelle liste Certificati del CRM né riceve il
  promemoria per email. Se il club vuole le due cose uguali, si cambia lì (`socio_stato` ha già lo stato `gratuito`).

Per verificare: `npx tsc --noEmit` pulito. **Provato in un browser vero** (Chromium, bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` locale, funzione simulata con
`page.route`; 390 px chiaro e scuro, 1280 px): employee con certificato mancante (avviso, nessun «Da fare» doppio, «1 attivo»), famiglia con uno scaduto e uno
mancante (titolo plurale, due righe), senza abbonamento (nessun avviso; allora la voce restava in «Da fare», ora non c’è più), Guest Pass (nessun avviso), funzione vecchia (come prima),
omaggio con certificato valido (nessun avviso), il pulsante che apre `?sezione=certificato`, nessuno scorrimento orizzontale, nessuna richiesta fuori dal computer.
La logica pura (`eAbbonamento`, `personeDaAvvisare`, `vociDaFare`, `riepilogoAbbonamenti`) con 35 prove su dati finti (voucher Covid compresi), e provata con mutazioni (togliendo la regola le
prove falliscono). **Non provato**: un telefono vero, e una sessione vera con la funzione del database aggiornata.

