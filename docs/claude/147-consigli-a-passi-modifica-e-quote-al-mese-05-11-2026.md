## I Consigli a passi, da modificare o rigenerare, e le quote al mese dell'AI (05/11/2026)

Richiesta di Maurizio (05/11/2026). Tre cose: il questionario dei Consigli **a passi, come quello del piano**; dopo la risposta i consigli
si possono **modificare**, **rigenerare** con le stesse risposte o si può **rifare il questionario**; e **limiti al mese applicati dal
server**, con l'app che dice quanti ne restano. Le regole del server (quote, «Rigenera», `consigli_modifica`): `CLAUDE.md` di APP-ATHLON,
stessa data. Il resto dei Consigli (carte, sedute, personal, prenotazione) è com'era: sezione «I consigli di Athlon».

- **Il questionario a passi** (`consigli/PassiConsigli.tsx`, regole pure in `consigli/passi.ts`). Una domanda per schermata, indietro a
  sinistra, l'anello in alto a destra (`AnelloPassi`), le carte di risposta del piano (`OpzioneCarta`, `Griglia` di `schede/PassiUI.tsx`).
  **Le domande sono quelle di prima, nello stesso ordine, e partono nella stessa forma** (`questionarioDa`): obiettivi (fino a tre), cosa c'è
  dietro, esperienza, quando hai smesso (solo chi ha smesso), cosa fai o facevi e com'è la tua forma (solo chi ha praticato), cosa ti piace
  (con «Sai nuotare stile libero e dorso?» nella stessa schermata, se sceglie «Nuotare»), intensità, quante volte, quando ti piacerebbe venire
  (giorni e fasce), fuori dal club, il personal trainer (le due domande insieme), che tipo di lezioni ti attraggono, dove, cosa evitare (generi
  e tipologie insieme), le lezioni non comprese (solo se si sa cosa comprende l'abbonamento), limitazioni; poi **«Ecco cosa abbiamo capito»**,
  dove ogni riga si tocca per cambiarla e si torna lì (passando prima da una domanda obbligatoria che la risposta ha aperto: chi passa a «ho
  smesso» deve dire la sua forma). Obbligatori come prima: un obiettivo, l'esperienza, la forma per chi ha praticato, la risposta sul nuoto
  per chi nuota; sulle facoltative c'è «FACOLTATIVO» e, senza risposta, «Salta» al posto di «Continua». Solo «Dammi i consigli» fa partire la
  richiesta. Il passo a cui si era arrivati resta in memoria (`consigli:passo`, mai sul disco); dopo una risposta riparte dalla prima domanda.
  «Riportato dalle tue risposte precedenti» resta sotto le risposte portate dal piano in sala. Dal primo passo, se ci sono già dei consigli,
  indietro torna a quelli.
- **Dopo la risposta**, in fondo (`AzioniRisposta` in `Consigli.tsx`):
  - **«Modifica i consigli»** (`consigli/Modifica.tsx`, gratis): per ogni lezione quante volte a settimana (1, 2, 3), **«Al suo posto»** una
    delle sue alternative (la lezione di prima diventa un'alternativa), **«Togli questa lezione»** (e «Rimetti» fra le tolte); la seduta in
    sala o in vasca e il personal si tolgono e si rimettono con un tocco. «Salva le modifiche» chiama `consigli_modifica`; la risposta torna
    come quella di `consigli_ultimi`, e la carta in cima dice «Li hai modificati giovedì 5 novembre». Deve restare almeno una lezione o una
    seduta. Modificare vuol dire scegliere fra quello che i consigli contengono già, non scrivere: nessuna AI.
  - **«Rigenera con le stesse risposte»**: chiede conferma in una carta («quelli di adesso, con le tue modifiche, vengono sostituiti», più la
    riga della quota), poi `rigeneraConsigli` (azione `consigli` con `rigenera: true`: la funzione usa le risposte salvate; le limitazioni
    partono solo se scritte in questa apertura).
  - **«Rifai il questionario»**: dalla prima domanda, con le risposte di prima già scelte.
- **Le quote al mese** (`features/lab/quota.ts`, testi in italiano e in inglese; mai un rimando alla segreteria). Il mese è quello del
  calendario e la funzione manda il primo del mese dopo (`rinnovo`):
  - **Consigli: la prima del mese e due rigenerazioni** (decisione di Maurizio). Contano il questionario rifatto e «Rigenera»; modificare no.
    Le righe: «Ogni mese puoi chiedere i consigli e poi rigenerarli fino a 2 volte. Modificarli non conta.», «Questo mese puoi rigenerarli
    ancora N volte.», e a quota finita «Questo mese hai già chiesto i consigli e li hai rigenerati 2 volte. Puoi ancora modificarli; ne potrai
    chiedere di nuovi dal 1° dicembre.» con «Rigenera» spento e «Dammi i consigli» spento nel riepilogo. Al posto della frase «una volta a
    settimana», che non vale più.
  - **Piani composti: tre al mese**, sala e vasca insieme. La carta «Componi il tuo piano» in Train dice «Questo mese puoi comporre ancora N
    piani, su 3» o, finiti, «Questo mese hai già composto 3 piani: potrai comporne altri dal 1° dicembre. Intanto puoi modificare i tuoi piani,
    o scriverne uno a mano.» e si spegne; la stessa riga sta sotto il riepilogo di sala e di vasca (`NotaQuotaPiani` in `PassiUI.tsx`), dove
    «Componi il mio piano» si spegne. Dopo un piano composto il conto in memoria sale di uno (`contaPianoComposto`).
  - Con una funzione di prima (quota in prova o settimanale) le righe non compaiono.
- **Da pubblicare**: prima le funzioni (`portale-lab-percorso`, `portale-lab-schede`), poi l'app. Con le funzioni di prima «Modifica» dice
  che non è ancora possibile e «Rigenera» non riesce. **Le funzioni sono pubblicate** (05/11/2026 sera, col via di Maurizio: `CLAUDE.md` di APP-ATHLON); l'app esce con il merge di questo ramo.

Per verificare: `tsc` con gli stessi 94 errori di `main` (nomi che differiscono solo per le maiuscole), nessuno nei file toccati. **Guardato in
un browser** (05/11/2026: bundle web esportato con `EXPO_PUBLIC_SUPABASE_URL` locale e un server finto al posto delle funzioni): a 390 px, tema
scuro, il questionario intero (obbligatorie con «Continua» spento, facoltative con «Salta», «Nuotare» con la domanda sullo stile), il riepilogo
con la riga della quota, la risposta con i tre comandi, «Modifica» con un'alternativa al posto, la sala tolta e salvata («Li hai modificati…»),
«Rigenera» con la conferma fino alla quota finita (comando spento e «dal 1° dicembre»); a 1280 px, tema chiaro, la risposta, «Rifai il
questionario» con le risposte già scelte, e la carta dei piani a quota finita. **Non provato**: le funzioni vere, un telefono, l'inglese a
schermo, il riepilogo del piano in vasca a quota finita.
