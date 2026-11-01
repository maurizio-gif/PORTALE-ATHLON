## La sezione Junior: i gruppi dei corsi per bambini e ragazzi, per anno di nascita, con i posti liberi (21/10/2026)

Richiesta di Maurizio. Cartella `src/features/lab/junior/` (`Junior.tsx`, `comune.ts` puro), rotta `(portale)/junior.tsx`, API `src/api/junior.ts`, carta `home/CartaJunior.tsx` (in Home dopo lo Shop). Dati: funzione
`portale-lab-junior` di APP-ATHLON, che legge `public.gruppi_junior()` dal mirror (anni di nascita dal nome del gruppo, posti da PerfectGym): `CLAUDE.md` di APP-ATHLON.

- **Si legge e basta**: tessere degli anni di nascita (dal piu' giovane; un anno senza posti e' piu' chiaro), «Solo i gruppi con posti liberi», poi i gruppi divisi per corso (Scuola Nuoto mono, bi, poi gli altri) in
  ordine di settimana e di ora, con «N posti liberi» / «Ultimo posto» / «Completo». Un gruppo di piu' anni («(2015-14-13)») compare sotto ognuno. **Da qui non ci si iscrive** (primo passo).
- **L'anno si apre sul figlio**: la carta in Home, se nel nucleo c'e' un figlio fra i 3 e i 17 anni, apre `/junior?anno=<il suo anno>` e lo nomina; altrimenti il piu' giovane. In vista cliente si vede (nessun dato di persona).
- **Filtro per giorno della settimana** (21/10/2026): sotto gli anni, pillole «Tutti · Lun … Dom» a selezione multipla (`giorniDelAnno`, `giorniDelGruppo` in `comune.ts`): si offrono solo i giorni che l'anno scelto ha davvero, e un gruppo passa se ha **almeno uno** dei giorni scelti (un bisettimanale «Lunedì, Giovedì» compare sotto Lun e sotto Gio). Si combina con l'anno e con «Solo i gruppi con posti liberi». I gruppi **senza giorni** nel nome (4 su 146 il 21/10) escono appena un giorno è scelto e tornano con «Tutti». `tsc` pulito e logica provata con `npx tsx`; **non guardato renderizzato né su un telefono**.
- La nota in fondo dice che i posti sono quelli del gestionale e che la conferma e' della segreteria.
- **In cima, «La tua famiglia»** (stesso giorno, seconda richiesta): chi del nucleo puo' fare le attivita' junior, con «Classe 2015» e i gruppi a cui e' iscritto (o «nessun gruppo per ora»); i minorenni non ancora
  idonei (un neonato sotto i 3 mesi) si vedono con il perche' e «Non ancora», gli adulti no. Chi e' idoneo lo dice il database (`nucleo` di `portale-lab-junior`: dai 3 mesi ai nati nell'anno piu' vecchio dei gruppi
  del Nuoto Agonistico). Toccando una persona si apre il suo anno, e senza `?anno=` la schermata parte dall'anno del piu' giovane idoneo (`annoDalNucleo`). Con una funzione che non da' `nucleo` il blocco non c'e'.
- **«Aggiungi un componente»** (`FoglioComponente`, mai in vista cliente): nome, cognome, data di nascita, codice fiscale, tutti obbligatori, e la casella «Dichiaro di esserne il genitore o il tutore legale». L'app
  ferma prima il codice fiscale non valido o non coerente (`problemaCodiceFiscale`, lo stesso del Guest Pass) e il maggiorenne; il resto lo controlla la funzione, compreso che la persona **non ci sia gia'** (nel nucleo:
  «è già nel tuo nucleo familiare»; al club: «ha già una scheda… passa in segreteria», senza dire di chi). A scheda creata il nucleo si aggiorna dalla risposta e la memoria dell'area della Home si butta (`scorda('area')`).
  `CampoData` sta dentro una `View` perche' ha `flex: 1` e in una colonna che scorre si schiacciava sul campo dopo (visto nel browser).

Per verificare: `npx tsc --noEmit` pulito; `comune.ts` con `npx tsx`. **Guardato in Chromium** (bundle web esportato, funzione simulata con `page.route`, 390 px chiaro e scuro, 1280 px): tessere degli anni, filtro, gruppi
di piu' anni, «Ultimo posto» e «Completo», il nucleo (l'anno del figlio aperto da solo, «Non ancora» per il neonato), il foglio (pulsante spento senza la dichiarazione, quello che parte: azione, nome, cognome, data
`AAAA-MM-GG`, codice maiuscolo, `tutore: true`), il nucleo aggiornato dopo l'aggiunta, l'errore «già al club» nel foglio, nessuno scorrimento orizzontale, nessun errore di pagina. **Non provato**: la funzione vera con una
sessione vera (e quindi la creazione su PerfectGym), un telefono, la carta in Home renderizzata.

**Stato (21/10/2026): in produzione**, su richiesta di Maurizio: migrazione `20261021d` e `portale-lab-junior` (v1) pubblicate prima, poi questa app su `main` (vedi APP-ATHLON).

