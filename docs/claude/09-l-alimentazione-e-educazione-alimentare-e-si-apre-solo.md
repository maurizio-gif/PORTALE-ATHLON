## L'alimentazione è educazione alimentare, e si apre solo col consenso

`/allenamento/alimentazione` (cartella `src/features/lab/alimentazione/`, area Food dell'Athlon Health System): il diario
dei pasti, la foto del piatto che diventa una stima delle calorie, il bilancio con quello che si consuma e i consigli
(richiesta del club, 19/10/2026). Il club **non ha un nutrizionista**: niente diete, niente obiettivi di calorie da
raggiungere, nessuna frase che dica a una persona quanto deve mangiare.

- **Bloccata finché il socio non accetta l'informativa nell'app** (`Vetrina.tsx`, testo in `informativa.ts`). Diario,
  questionario e foto sono dati sulla salute (art. 9 GDPR): la funzione `portale-lab-alimentazione` rifiuta ogni azione
  senza un consenso vivo alla versione corrente. **Cambiando il testo si cambia `VERSIONE_INFORMATIVA` qui e nella
  funzione**: la sezione si richiude e il socio la riaccetta. La revoca, in fondo alla sezione, cancella tutto subito.
  L'informativa va fatta rileggere al consulente privacy del club prima di aprire la sezione a tutti.
- **Solo il socio la vede.** Nella vista cliente dello staff non si apre (la funzione non ha azioni fra le LETTURE), e
  il CRM non legge le sue tabelle. Solo per i maggiorenni.
- **I numeri li calcola il server**: dal catalogo (`alimenti`, 147 alimenti, valori medi per 100 g) per i grammi scelti.
  La foto passa dal workflow n8n `athlon-foto-piatto` (Claude via OpenRouter, con l'elenco del catalogo): riconosce gli
  alimenti e stima i grammi con una forbice, e **niente entra nel diario senza conferma** (`FotoPiatto.tsx`). La foto non
  si salva: né l'app, né la funzione, né n8n (il workflow non conserva le esecuzioni).
- **Il consumo è quello del contatore** (`consumoDelGiorno` in `conti.ts`): riposo × 1,2 più l'attività contata, al netto
  del riposo in quei minuti. I nutrienti si confrontano coi riferimenti LARN 2014 (carboidrati 45–60%, grassi 20–35%,
  proteine 0,9 g/kg; 1,2–2 per chi si allena, ACSM 2016), mostrati come riferimenti e non come traguardi.
- **I consigli li sceglie l'app da un elenco scritto** (`consigli.ts`), non un modello: questionario, attività del
  contatore e media dei giorni scritti. Con un sì a gravidanza o a una condizione medica resta solo l'invito al medico;
  chi dice che contare lo mette a disagio ha calorie e grammi nascosti (si riaccendono). I numeri delle fonti (CREA 2018,
  LARN 2014, ACSM 2016, OMS) sono ricordati, non riletti alla fonte: vanno ricontrollati.
- **La foto si sceglie con `expo-document-picker`** (`src/lib/fotoPiatto.ts`), che sul telefono dal browser offre anche la
  fotocamera; sul web si porta a 1280 px in JPEG prima dell'invio.

