# Percorso Athlon

Decisioni del 20/10/2026, prese col club prima di scrivere il codice. Il Percorso è una funzione nuova dell'area Train di
Athlon Health System: **un tutor tecnico che compone la settimana** di un socio mettendo insieme sala, cardio, lezioni di gruppo
e acqua, e che dice cosa fa quella settimana, non solo quante calorie costa.

## Che cosa è, e che cosa non è

| | Piano di allenamento | Percorso Athlon |
| --- | --- | --- |
| Cos'è | Gli esercizi di un allenamento in sala: serie, ripetizioni, carichi | La settimana intera: sala, cardio, lezioni, acqua |
| Dove nasce | Scritto dal socio, importato, dall'agente AI o dal club | Il tutor lo compone usando i piani del socio come tappe di sala |
| Nel codice | `scheda` | `percorso` |
| Parola nei testi per il socio | «piano» | «percorso» (mai «piano», mai «scheda») |

La carta in Train dice una riga per ciascuno, e la schermata del Percorso le ripete prima di tutto il resto (`PianoOPercorso`).

## Scelte prese

- **Settimana tipo che si ripete.** Si conferma il modello (giorno, ora, tipo di lezione); ogni settimana l'app lo trasforma
  nelle lezioni vere. Si rigenera quando si vuole.
- **Le lezioni fuori abbonamento** sono escluse di default, con un interruttore «includi anche le non comprese» (segnate
  «Da acquistare»: si prenotano come lezione singola).
- **Prenotazione per tappa**, più «Prenota la settimana» con un riepilogo e **una conferma sola**. Niente parte da solo.
- **Lo staff legge il percorso** dal CRM, in sola lettura; il questionario non si conserva e non si vede.
- **Quali lezioni spettano a un piano** è una tabella curata (`piani_categorie`), partita dalle prenotazioni reali degli ultimi
  60 giorni e rivista dal club. È una stima, e la prenotazione vera resta il controllo.
- **Sala: si mostrano i due turni** (con l'assistente di sala e di allenamento libero) e sceglie il socio, come nel calendario.
- **Effetti**: la prima versione è senza i testi «cosa aspettarsi» per obiettivo: arrivano quando il Direttore Tecnico li ha validati.

## Il principio: il modello propone dentro un catalogo, il codice garantisce e calcola

Il tutor riceve il catalogo scritto (le lezioni che ricorrono nel palinsesto, i piani del socio, le macchine cardio) e risponde
con le sue scelte. **Non scrive mai un numero e non conosce i file degli esercizi.** Il codice scarta ciò che non esiste, ciò che si
sovrappone, ciò che sfora i tetti, e **riduce invece di inventare**. Il percorso arriva all'app come **bozza**; il socio la rivede, la
cambia e la conferma, e alla conferma la funzione ricontrolla tutto con le stesse regole.

## Gli effetti, calcolati dai dati

| Riquadro | Come si calcola | Da cosa |
| --- | --- | --- |
| La settimana in minuti | Minuti per giorno, divisi in sala, lezioni, cardio | Le tappe |
| Il profilo delle lezioni | Media delle quattro barre pesata sui minuti, **con la quota dei minuti su cui è calcolata**; «dato non disponibile» dove manca | Le barre di ogni lezione sul sito |
| Il lavoro in sala | Sedute, minuti, muscoli primari per gruppo, gruppi principali mai lavorati | Gli esercizi dei piani |
| I riferimenti dell'OMS | Minuti moderati e intensi (intenso = doppio) e giorni di rinforzo | MET di `stimaCorso.ts`, sala come rinforzo |
| Carico e recupero | Giorni attivi e di riposo, giorni di fila, lo stesso gruppo forte in due giorni di fila | La struttura della settimana |
| L'obiettivo | Regole fisse per obiettivo: cosa ha la settimana e cosa le manca | `righeObiettivo` in `effetti.ts` |
| Le ultime quattro settimane | Minuti e attività medi a settimana, senza cardio | Il contatore delle calorie |
| Le calorie | Una riga fra le altre, con la forbice | `stimaLezione` e la stima del piano |

Regole di onestà: la sala non entra nel radar (non ha barre); le lezioni non entrano nella mappa dei muscoli (le barre non dicono quali
muscoli lavorano); dove manca un dato lo si dice; **nessun chilo, nessuna promessa estetica**. I riferimenti dell'OMS e le soglie di
«cosa copre l'obiettivo» sono numeri ricordati e nostri: vanno ricontrollati e fatti validare.

## Cosa serve al club

1. **Barre per il Nuoto Libero e la Scuola Nuoto Adulti**, e la flessibilità delle lezioni in acqua (`planning-lessons.json`, sul sito):
   senza, il profilo delle lezioni è calcolato su meno minuti e lo dice.
2. **Rivedere `piani_categorie`**: i piani Short e Open hanno limiti d'orario? Il Reformer ai piani Club?
3. **I testi «cosa aspettarsi»** per ogni obiettivo, validati dal Direttore Tecnico.
4. **L'informativa privacy**: il questionario (limitazioni comprese) va a un servizio esterno e non si conserva.
5. **Pubblicare il workflow del tutor e mettere la chiave** (vedi `CLAUDE.md` di APP-ATHLON): finché non c'è, il Percorso risponde «non è ancora attivo».

## Fuori da questa versione

- **Nessun promemoria**: l'app non ha notifiche. Se il club li vuole, si decide come.
- **Il pagamento di una lezione non compresa** passa per il Calendario e ritorna lì (`/calendario?acquisto=`): il Percorso si rilegge da sé al ritorno.
- **Un'altra persona del nucleo**: il Percorso è del titolare maggiorenne, come le calorie.
