## «Foam roller»: la sessione di rilascio in Recover, con i video del club (01/11/2026; i video dal 10/11/2026)

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
- **I video ci sono dal 10/11/2026** (Maurizio ha passato la cartella Drive «foam roller»: 8 clip girate al club, una per esercizio, nell'ordine dell'elenco: «Polpaccio» e «foam roller 2…8» → polpacci,
  dietro la coscia, davanti della coscia, interno coscia, glutei, dorsale alta, fianco e dorsale, apertura del petto, abbinati guardando i fotogrammi, non dal nome del file). Gli originali erano
  HEVC 1920x1080 con una traccia audio muta e duravano 4–7 secondi (non i 15–20 previsti: in loop vanno bene); sono stati ricompressi come quelli di MoveKit (H.264 main, 960x540, CRF 26,
  senza audio né metadati, `faststart`: 85–240 kB l'uno, 1,5 MB in tutto) perché l'HEVC non parte su tutti i browser, e per ciascuno si è tirato fuori un poster JPEG dal fotogramma di mezzo.
  Stanno nel bucket pubblico `esercizi`, in **`rilascio/<id>.mp4` e `rilascio/<id>.jpg`** (`<id>` è l'`id` dell'esercizio in `esercizi.ts`: `polpacci`, `dietro-coscia`, `davanti-coscia`,
  `interno-coscia`, `glutei`, `dorsale-alta`, `grande-dorsale`, `apertura-petto`); in `esercizi.ts` `video` e `immagini` hanno il percorso e `urlEsercizio` lo risolve da solo.
  **Un esercizio nuovo, senza `video` e senza `immagini`, mostra ancora il segnaposto «Video in arrivo»** (`SegnapostoVideo`). Per cambiare un video: si rifà lo stesso comando ffmpeg e si ricarica
  sullo stesso percorso (la cache del bucket è lunga: meglio un nome nuovo, per esempio `rilascio/polpacci-2.mp4`, che sovrascrivere).
  **Testo e video non sono controllati riga per riga**: nell'«Apertura del petto» il video ha il rullo nel senso della lunghezza, come dice il testo, ma la persona tiene le mani dietro la testa mentre il testo dice
  «apri le braccia ai lati con i palmi verso l'alto»; da far guardare al Direttore Tecnico insieme alle avvertenze.
- **Cosa dice e cosa no**: il rullo può dare la sensazione di muscoli più sciolti e un movimento migliore subito dopo; **non cura contratture,
  dolori o «aderenze»**, e non si parla di «trigger point» come di una terapia (prove deboli, meccanismo discusso). Nessuna cifra medica.
  Nessun esercizio carica zona lombare, collo, articolazioni o ossa.
- **Avvertenze con spunta** («Ho letto le avvertenze», non si conserva) prima di cominciare: fastidio sì e dolore acuto no, mai su articolazioni,
  ossa, zona lombare e collo, rotolare piano e respirare, e chi ha trombosi o varici importanti, prende anticoagulanti, ha osteoporosi, è in
  gravidanza o ha una condizione medica chiede prima al medico. In fondo: «consigli di base che non sostituiscono il parere di un medico o di un
  fisioterapista». **Le avvertenze vanno fatte rileggere a un medico o a un fisioterapista prima di aprire la sezione a tutti.**
- **Non somma i minuti a nessuna abitudine** (l'abitudine «Mobilità» è del server e il rilascio è un'altra cosa), ma **dal 02/11/2026 i minuti vanno al punteggio di
  Recover** a fine sessione (`fit/RegistraRecupero.tsx`, sezione 83). Dopo la sessione un tasto porta a «Ora un po' di mobilità».
- **Verifica**: `tsc` pulito sui file toccati; guardato nel browser a 390 px (scelta, filtri, avvertenze che sbloccano «Comincia», corsa col
  segnaposto, fine, tema chiaro e scuro; **i video del 10/11/2026 non sono stati guardati in un browser né su un telefono**: caricati e verificati solo come file, `206 video/mp4` all'indirizzo pubblico); **non guardato su un telefono**, **non provato con una sessione vera né con l'icona `rullo` su iOS**
  (SF Symbol `figure.cooldown`: sul web e su Android è `physical_therapy`).
