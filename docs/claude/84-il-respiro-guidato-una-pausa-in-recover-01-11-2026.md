## Il respiro guidato: una pausa di 1–5 minuti in Recover, solo animazione (01/11/2026)

Richiesta di Maurizio («meditazione o mindfulness o qualcosa del genere» in Recover); scelte: **solo animazione, senza audio**, e **una carta sua** in Recover, accanto a mobilità e foam roller (non una carta unica «Sessioni
di recupero»). Cartella `src/features/lab/respiro/`, route `/allenamento/respiro`, carta «Respiro» in `fit/Relax.tsx`, icona `respiro`.

- **Tre pause** (`tecniche.ts`, pura, provata con `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-respiro.ts`, 11 gruppi): **respirazione lenta** (4 s dentro, 6 fuori, senza trattenere il fiato; 1, 3 o 5 minuti), **respirazione a scatola**
  (4-4-4-4, con le pause a fiato fermo; 1, 3 o 5 minuti) e **scansione del corpo** (8 frasi, dai piedi al viso, il tempo diviso in parti uguali, con un respiro lento sotto; 3 o 5 minuti).
- **Il cerchio** (`SessioneRespiro.tsx`): si allarga mentre si inspira e si restringe mentre si espira; con la parola della fase («Inspira», «Fermo», «Espira») e il conto da 1 a 6. Il punto del respiro è calcolato dal **tempo vero
  trascorso** (`statoRespiro`, con un seno agli estremi: il cerchio non scatta), non da un'animazione che parte e va per conto suo. Cronometro, pausa e «si ferma se si esce dalla schermata o dall'app» sono quelli della mobilità
  (`fit/mobilita.ts`). **Con «riduci movimento» il cerchio non si muove**: restano parole e conto.
- **Non è una terapia e non promette niente** su ansia o stress: «una pausa per rallentare». Avviso prima di cominciare: respirare in modo naturale e mai forzato, fermarsi se gira la testa o si sente formicolio, e
  **con la respirazione a scatola** (la sola che trattiene il fiato) l'avviso in più per gravidanza e problemi respiratori o di cuore, con l'invito a scegliere la lenta. In fondo: consigli di base che non sostituiscono il parere
  di un medico o di un professionista. **Le avvertenze vanno fatte rileggere a un medico prima di aprire la sezione a tutti.**
- **Non si registra niente e non conta nel punteggio**: nessun server, nessun dato sulla salute raccolto. L'abitudine «Mindfulness» (minuti letti da Apple Salute e Health Connect) resta com'è. Se un giorno si vuole contarla nel
  punteggio, il modo senza spingere è lo stesso della cura del corpo (sezione 83): stesso massimo, e un giorno vale con qualunque sessione; le pause brevi di respirazione non arrivano ai 10 minuti di un giorno di cura.
- **Audio con la voce del club**: non c'è; se il trainer vuole registrare le guide si aggiungono (come i video del foam roller), senza cambiare il resto.
- **Verifica**: `tsc` pulito; guardato nel browser a 390 px (scelta, respirazione a scatola con l'avviso in più, cerchio a 1 e a 4 secondi, pausa, fine, scansione del corpo); **non guardato su un telefono** né con «riduci movimento».
