## Il certificato: la conferma della persona prima di inviarlo, e «Vedi e scarica» quello approvato (12/11/2026)

Due richieste di Maurizio. **Prima**: «succede spesso che il genitore carichi il certificato sulla propria anagrafica invece che su quella del figlio». **Poi**: il certificato approvato si deve poter vedere e scaricare dall'app, dove ci sono le date; e nel CRM scaricare, non solo vedere.

### La conferma della persona (`FoglioCertificato`, `CaricaCertificato.tsx`)

- **«Invia il certificato» non c'è più**: scelto il file, il pulsante è «Continua» e apre il passo «Per chi è il certificato?». Dice «Stai caricando il certificato medico per:» e mostra in un riquadro **nome e cognome, «nato/a il gg/mm/aaaa»** (come nella sezione Famiglia: il sesso di PerfectGym non è affidabile) e, se è il titolare, «Sei tu, il titolare dell'account». Sotto: «Controlla che nome e data di nascita siano quelli scritti sul certificato».
- **«Sì, carica per <nome>»** invia (è lì che compare l'errore del server, se c'è). **Le altre persone del nucleo** sono pulsanti sotto («È il certificato di un familiare? Sceglilo qui:» se si stava caricando per il titolare): toccarne una cambia la persona **senza scegliere di nuovo il file**, e il passo resta aperto sulla nuova. «Indietro» torna al file.
- Il nucleo arriva al foglio con la prop `nucleo` (`area.persone`) dalla sezione Certificato e dall'avviso in cima alla Home. Il sottotitolo del foglio dice sempre il nome («Per te, Mario Rossi» / «Per Luca Rossi»). Alla chiusura il foglio torna al primo passo e alla persona da cui si era aperto.
- **La pagina del link dell'email (`/r/<token>`) non cambia**: il link vale per una persona sola, già scritta in testa («Per …»), e non c'è una scelta da sbagliare.

### «Vedi e scarica» il certificato approvato (app pronta, server da fare)

- Sulla riga della sezione Certificato (`RigaCertificato`), **se il server dice che c'è il file** (`certificati[].file` di `portale_area_per_email`) **e c'è la scadenza**, compare «Vedi e scarica». Al tocco chiede il link a `portale-lab-certificati`, azione `apri` (`apriCertificato` in `src/api/certificati.ts`) e apre lo stesso foglio dei documenti (`useApriPdf`): Invia, Apri, Salva sul dispositivo (sul web). Il file si chiama «Certificato medico <nome>.<ext>».
- **`useApriPdf` accetta anche le foto**: `tipo` (senza, è un PDF come prima) cambia le parole («Apri il file») e il tipo dato al sistema; `urlScarica` è l'indirizzo con `download=` che fa scaricare il file a Storage (l'attributo `download` di un link non vale fra domini). Per i documenti di prima non cambia niente.
- **Il server è pubblicato** (12/11/2026, APP-ATHLON nota 246): migrazione `20261112j` applicata (`certificato_file_in_vigore` e `certificati[].file` in `portale_area_per_email`, il file dell'ultimo caricamento approvato con la scadenza in vigore) e `portale-lab-certificati` v26 con l'azione `apri` (link firmati di 5 minuti, `apri` fra le letture della vista cliente). Nel CRM, nel visore del certificato, c'è anche «Scarica». Un certificato consegnato su carta non ha file: niente pulsante.

### Provato e non provato

- `tsc` pulito su `src/`. **Non guardato in un browser né su un telefono**: il passo di conferma (riquadro, pulsanti delle altre persone), «Vedi e scarica» (che comunque non compare finché il server non manda `file`).
- È solo JavaScript: arriva con un'OTA.
