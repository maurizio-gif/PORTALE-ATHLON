## «Foam roller»: la sessione di rilascio in Recover, con i video ancora da girare (01/11/2026)

Richiesta di Maurizio («rilascio miofasciale, trigger point: al club ho il foam roller»): una seconda sessione a richiesta in Recover, accanto
a quella di mobilità. Cartella `src/features/lab/rilascio/`, route `/allenamento/rilascio`, carta «Foam roller» in `fit/Relax.tsx`, icona `rullo`.

- **Gli esercizi stanno nell'app** (`rilascio/esercizi.ts`), **non nella libreria del server**: MoveKit non ha esercizi di rilascio (solo
  «Estensione toracica sul foam roller», che è mobilità). Sono 8, dal basso verso l'alto: polpacci, dietro la coscia, davanti della coscia,
  interno coscia, glutei, dorsale alta, fianco e dorsale, apertura del petto. **Nessuna chiamata alla funzione**: la sessione si compone
  nell'app (`componiSessione`, pura, provata con `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-rilascio.ts`, 11 gruppi).
- **Come si compone**: zona (tutto il corpo, gambe e glutei, schiena e spalle), 5, 10 o 15 minuti, e i fastidi facoltativi (gli stessi di
  `fit/mobilita.ts`, `vociZone`) che tolgono gli esercizi che li caricano (`evita` di ogni esercizio). Un esercizio al minuto; con pochi
  esercizi ciascuno si allunga fino a 90 secondi, **sempre a multipli di 10** (così il mezzo tempo per lato è tondo), e i minuti veri possono
  scostarsi da quelli chiesti (la schermata dice «circa N minuti»). «Un'altra sessione» fa girare quali esercizi entrano (`variante`).
- **Si fa con la `Corsa` della mobilità** (`fit/SessioneMobilita.tsx`, ora esportata e con tre agganci facoltativi: `etichetta`, `media`,
  `dettagli`; **senza agganci è quella di prima**): stesso cronometro puro, stesse pause, si ferma se si esce dalla schermata o dall'app.
- **I video NON ci sono ancora: al loro posto un segnaposto «Video in arrivo»** (`SegnapostoVideo`, riquadro 16:9 sfumato con «ANTEPRIMA»),
  esercizio per esercizio. **Per sostituirlo**: il tecnico gira i video (16:9, muti, in loop, 15–20 secondi, come quelli di MoveKit), si caricano
  nel bucket pubblico `esercizi` (dal CRM o dalla console) e in `esercizi.ts` si scrive il percorso, per esempio `video: 'rilascio/polpacci.mp4'`
  (`urlEsercizio` lo risolve da solo); il poster, facoltativo, va in `immagini`. Dove `video` o `immagini` hanno qualcosa il segnaposto sparisce.
- **Cosa dice e cosa no**: il rullo può dare la sensazione di muscoli più sciolti e un movimento migliore subito dopo; **non cura contratture,
  dolori o «aderenze»**, e non si parla di «trigger point» come di una terapia (prove deboli, meccanismo discusso). Nessuna cifra medica.
  Nessun esercizio carica zona lombare, collo, articolazioni o ossa.
- **Avvertenze con spunta** («Ho letto le avvertenze», non si conserva) prima di cominciare: fastidio sì e dolore acuto no, mai su articolazioni,
  ossa, zona lombare e collo, rotolare piano e respirare, e chi ha trombosi o varici importanti, prende anticoagulanti, ha osteoporosi, è in
  gravidanza o ha una condizione medica chiede prima al medico. In fondo: «consigli di base che non sostituiscono il parere di un medico o di un
  fisioterapista». **Le avvertenze vanno fatte rileggere a un medico o a un fisioterapista prima di aprire la sezione a tutti.**
- **Non somma i minuti a nessuna abitudine**: l'abitudine «Mobilità» è del server (catalogo di APP-ATHLON) e il rilascio è un'altra cosa. Se il
  club vuole contarlo, si aggiunge una voce lì (e la categoria degli esercizi resta separata da «mobilità»: altrimenti le sessioni di mobilità
  del server comincerebbero a proporli). Dopo la sessione un tasto porta a «Ora un po' di mobilità».
- **Verifica**: `tsc` pulito sui file toccati; guardato nel browser a 390 px (scelta, filtri, avvertenze che sbloccano «Comincia», corsa col
  segnaposto, fine, tema chiaro e scuro); **non guardato su un telefono**, **non provato con una sessione vera né con l'icona `rullo` su iOS**
  (SF Symbol `figure.cooldown`: sul web e su Android è `physical_therapy`).
