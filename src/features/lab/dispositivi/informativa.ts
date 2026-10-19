// L'informativa dei dispositivi (Oura, Polar) e del sonno scritto a mano, da accettare nell'app
// prima di collegarne uno o di scrivere una notte (19-20/10/2026): sonno, battito e allenamenti
// di un dispositivo sono dati sulla salute (art. 9 del GDPR), e la base e' il consenso esplicito.
//
// **La versione e' la stessa della funzione** (VERSIONE_INFORMATIVA in
// supabase/functions/_shared/dispositivi/tipi.ts, APP-ATHLON). Cambiando il testo si cambia
// la versione in tutti e due i posti: la sezione si richiude, la lettura dei dispositivi si
// ferma e il socio riaccetta.
//
// Il testo descrive quello che il codice fa davvero: se il codice cambia (un dato in piu',
// un fornitore in piu', un tempo di conservazione diverso), cambia anche questo. Va fatto
// rileggere dal consulente privacy del club prima di aprire la sezione a tutti.

// 2026-10-20: dice anche del sonno che si scrive a mano e dell'Athlon Health Score.
export const VERSIONE_INFORMATIVA = '2026-10-20'

export const CONSENSO =
  'Acconsento al trattamento dei miei dati relativi alla salute (il sonno che scrivo io, e sonno, recupero, battito e allenamenti del mio dispositivo) per mostrarli nell’app e calcolare il mio Athlon Health Score, come descritto nell’informativa.'

export const INFORMATIVA: { titolo: string; testo: string }[] = [
  {
    titolo: 'Che cos’è',
    testo:
      'Puoi scrivere ogni mattina quanto hai dormito, e collegare il tuo anello Oura o il tuo orologio Polar all’app del club. L’app mostra il tuo sonno, come ti sei ripreso e gli allenamenti che il dispositivo ha registrato, accanto a quelli fatti nel club. Sono valori indicativi: non sono un parere medico e non servono a fare diagnosi.',
  },
  {
    titolo: 'Quali dati leggiamo',
    testo:
      'Il sonno che scrivi tu: la notte, a che ora sei andato a dormire e a che ora ti sei svegliato. Dal dispositivo, per ogni giorno: il punteggio e la durata del sonno (con le fasi profonda e REM), il punteggio di recupero del dispositivo, il battito più basso della notte e la sua variabilità, i passi e le calorie dell’attività. Per ogni allenamento: lo sport, quando è iniziato, quanto è durato, le calorie e, se il dispositivo li dà, il battito medio e massimo. Non leggiamo la tua posizione né i tuoi percorsi, né la serie dei battiti (da quella della notte prendiamo solo il valore più basso e il resto lo scartiamo), né i dati del tuo profilo presso Oura o Polar come email, età o sesso.',
  },
  {
    titolo: 'Come funziona il collegamento',
    testo:
      'Dal pulsante «Collega» vai sul sito di Oura o di Polar, accedi con il tuo account e autorizzi il club a leggere quei dati: noi non vediamo mai la tua password. Il permesso si può togliere quando vuoi, da qui e anche dalle impostazioni del tuo account Oura o Polar. I dati si aggiornano da soli, circa ogni mezz’ora, quando il dispositivo ha sincronizzato col telefono. Oura e Polar trattano i tuoi dati anche per conto loro, secondo le loro informative.',
  },
  {
    titolo: 'Perché e su quale base',
    testo:
      'Per mostrarti i tuoi dati, metterli accanto al tuo allenamento e calcolare il tuo Athlon Health Score (il punteggio dell’Athlon Health System: il sonno è una delle sue tre parti), e per nient’altro: non li usiamo per decidere niente su di te né per comunicazioni commerciali. Sono dati relativi alla salute: li trattiamo solo con il tuo consenso esplicito (art. 9, par. 2, lett. a del GDPR), che dai qui sotto.',
  },
  {
    titolo: 'Chi li vede',
    testo:
      'Solo tu. Lo staff del club e i trainer non vedono i dati dei tuoi dispositivi né dall’app né dal gestionale, e non vanno su PerfectGym. Li conserviamo in un database protetto, e le chiavi di accesso al tuo dispositivo (i «token») le teniamo cifrate: nemmeno l’app le vede.',
  },
  {
    titolo: 'Per quanto e come toglierli',
    testo:
      'Teniamo il riassunto dei tuoi ultimi 90 giorni e gli allenamenti di quel periodo, e cancelliamo il resto. Se scolleghi un dispositivo cancelliamo subito i suoi dati. Se revochi il consenso, da questa stessa sezione, scolleghiamo tutti i dispositivi e cancelliamo tutto subito, comprese le notti che hai scritto tu: resta solo la registrazione di quando hai dato e revocato il consenso, come prova. Per gli altri diritti (accesso, rettifica, cancellazione, reclamo al Garante) vale l’informativa privacy del club.',
  },
  {
    titolo: 'Per chi non è',
    testo:
      'La sezione è riservata ai maggiorenni. Se un numero ti preoccupa o ti mette a disagio, non interpretarlo da solo: parlane con il tuo medico. L’app non dà consigli medici e non ti dice cosa fare in base ai tuoi valori.',
  },
]
