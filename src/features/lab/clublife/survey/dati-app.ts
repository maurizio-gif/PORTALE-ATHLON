// La survey dell'app, **funzione per funzione** (08/11/2026, richiesta di Maurizio): una survey a capitoli che chiede, per ogni parte
// dell'app, quali funzioni la persona usa e come si trova. Sta nel menu delle survey di Club Life, accanto agli otto argomenti del
// club, ma non e' un nono argomento: e' un'altra forma, e questo file e' diverso da `dati.ts` per una ragione precisa.
//
// **Perche' a capitoli e non una survey sola.** `sito-valutazioni/sondaggio` tiene al massimo dodici voci per invio (`slice(0, 12)`),
// e le funzioni dell'app sono quasi settanta. Ogni capitolo e' quindi una riga a se' su `sondaggi_risposte`, con il suo slug `app-*`
// e al piu' dodici voci; una riga finale (`app-generale`) porta il giudizio sull'app nel suo insieme e l'NPS. Come bonus e' piu'
// leggibile: la pagina Survey del CRM, che raggruppa per slug, mostra gia' «come va, tema per tema» — qui, capitolo per capitolo.
//
// **Come si legge «cosa usi».** Il server conserva solo `{ id, voto }` con `voto` da 1 a 5 oppure `null`, e non ha un campo per l'uso.
// Il significato sta nella *presenza* della voce, ed e' uguale in tutta la survey:
//   - nella riga di un capitolo, una funzione c'e' **se la persona dice di usarla** (con il voto, o `null` se non ha voluto darlo);
//     se non la usa, la voce non c'e';
//   - nella riga finale, `non-usa-<capitolo>` c'e' **se la persona ha detto di non usare niente di quel capitolo** (per quei capitoli
//     non parte nessuna riga: il server rifiuta una riga senza nemmeno un giudizio, e qui non ce n'e' uno da dare).
// Non serve nessuna modifica al server, e il CRM mostra gli id ripuliti («Prenotare una lezione», «Non usa food recover»).
//
// I testi sono in italiano e in inglese (ogni testo dell'app lo e': `docs/glossario-inglese.md`) come coppie `{ it, en }` e non con
// `t()` al caricamento: la nota che arriva al CRM si scrive **sempre in italiano** (la legge il club), e le schermate scelgono la
// lingua a ogni disegno con `testoApp()`.

import { t } from '@/lib/lingua'

/** Un testo nelle due lingue. */
export type Doppio = { it: string; en: string }

const d = (it: string, en: string): Doppio => ({ it, en })

/** Il testo nella lingua di adesso. */
export function testoApp(x: Doppio): string {
  return t(x.it, x.en)
}

export type FunzioneApp = {
  /** Il nome della colonna dentro `risposte`: il CRM lo ripulisce e lo mostra («prenotare-una-lezione» → «Prenotare una lezione»). Non si rinomina. */
  id: string
  nome: Doppio
  /** Una riga che dice cosa e', per chi non la chiama per nome. */
  cosa: Doppio
}

export type CapitoloApp = {
  /** L'ultimo pezzo dell'indirizzo della schermata: `/club-life/survey/app/<id>`. */
  id: string
  /** Lo `sondaggio` della riga su Supabase. */
  slug: string
  titolo: Doppio
  eyebrow: Doppio
  intro: Doppio
  funzioni: FunzioneApp[]
}

/** Lo slug della riga finale. */
export const SLUG_FINALE = 'app-generale'

/** L'id dell'intera survey nell'indirizzo del menu: `/club-life/survey/app`. */
export const ID_SURVEY_APP = 'app'

/**
 * Quante voci tiene il server per invio (`slice(0, 12)` in `sito-valutazioni`). Un capitolo ha al piu' tante funzioni, e la riga finale
 * contiene le domande generali piu' un `non-usa-*` per capitolo: se i capitoli diventano nove, il server taglia in silenzio dalla coda,
 * cioe' proprio quelle voci. `scripts/prova-survey-app.ts` lo controlla.
 */
export const MAX_VOCI = 12

export const CAPITOLI_APP: CapitoloApp[] = [
  {
    id: 'home',
    slug: 'app-home',
    titolo: d('La Home e il tuo account', 'The Home and your account'),
    eyebrow: d('Il punto di partenza', 'Where you start'),
    intro: d('La prima schermata e tutto quello che riguarda te e il tuo account.', 'The first screen and everything about you and your account.'),
    funzioni: [
      { id: 'da-fare', nome: d('Da fare', 'To do'), cosa: d('Gli avvisi su cosa manca: un pagamento, il certificato, i tuoi dati.', 'Alerts about what’s missing: a payment, the certificate, your details.') },
      { id: 'i-tuoi-abbonamenti', nome: d('I tuoi abbonamenti', 'Your memberships'), cosa: d('L’elenco degli abbonamenti e il dettaglio di ognuno.', 'The list of your memberships and the detail of each one.') },
      { id: 'prodotti', nome: d('Prodotti', 'Products'), cosa: d('Ingressi, crediti e tutto quello che hai già acquistato.', 'Entries, credits and everything you’ve already bought.') },
      { id: 'documenti', nome: d('Documenti', 'Documents'), cosa: d('Contratti e ricevute da aprire o scaricare.', 'Contracts and receipts to open or download.') },
      { id: 'certificato-medico', nome: d('Certificato medico', 'Medical certificate'), cosa: d('La scadenza e il caricamento del certificato, con una foto o un PDF.', 'The expiry date and uploading the certificate, as a photo or a PDF.') },
      { id: 'profilo-e-dati-personali', nome: d('Profilo e dati personali', 'Profile and personal details'), cosa: d('Foto, contatti, indirizzo, lingua e tema chiaro o scuro.', 'Photo, contact details, address, language and light or dark theme.') },
      { id: 'badge-di-accesso', nome: d('Badge di accesso', 'Access badge'), cosa: d('La carta nel wallet del telefono con cui passi al tornello.', 'The card in your phone’s wallet that you use at the turnstile.') },
      { id: 'notifiche', nome: d('Notifiche', 'Notifications'), cosa: d('Il campanello con i messaggi del club e gli avvisi sul telefono.', 'The bell with the club’s messages, and alerts on your phone.') },
      { id: 'tesseramento', nome: d('Tesseramento', 'ASI card'), cosa: d('La tessera ASI del tuo nucleo, quando c’è.', 'The ASI membership card for your household, when there is one.') },
    ],
  },
  {
    id: 'prenotazioni',
    slug: 'app-prenotazioni',
    titolo: d('Prenotazioni', 'Bookings'),
    eyebrow: d('Il Calendario', 'The Calendar'),
    intro: d('Trovare una lezione, prenotarla, disdirla: tutto quello che si fa dalla scheda Prenotazioni.', 'Finding a class, booking it, canceling it: everything you do from the Bookings tab.'),
    funzioni: [
      { id: 'calendario-delle-lezioni', nome: d('Calendario delle lezioni', 'Class calendar'), cosa: d('Le lezioni del giorno, con i filtri per attività e i posti liberi.', 'The day’s classes, with filters by activity and free spots.') },
      { id: 'prenotare-una-lezione', nome: d('Prenotare una lezione', 'Booking a class'), cosa: d('Dalla scheda della lezione, con la conferma subito.', 'From the class card, with instant confirmation.') },
      { id: 'gym-floor', nome: d('Gym Floor', 'Gym Floor'), cosa: d('Prenotare la sala pesi, con o senza assistenza.', 'Booking the weights room, with or without assistance.') },
      { id: 'nuoto-libero', nome: d('Nuoto Libero', 'Open Swim'), cosa: d('Gli orari in vasca e la prenotazione.', 'The pool times and booking.') },
      { id: 'lista-d-attesa', nome: d('Lista d’attesa', 'Waiting list'), cosa: d('Quando una lezione è al completo.', 'When a class is full.') },
      { id: 'le-tue-prenotazioni', nome: d('Le tue prenotazioni', 'Your bookings'), cosa: d('L’elenco di quello che hai prenotato.', 'The list of what you’ve booked.') },
      { id: 'disdire-una-prenotazione', nome: d('Disdire una prenotazione', 'Canceling a booking'), cosa: d('L’annullamento, entro il termine.', 'Canceling, within the deadline.') },
      { id: 'personal-training', nome: d('Personal training', 'Personal training'), cosa: d('Gli orari liberi dei trainer e la prenotazione di una seduta.', 'The trainers’ free slots and booking a session.') },
      { id: 'stelle-alle-lezioni', nome: d('Le stelle alle lezioni', 'Class ratings'), cosa: d('Dopo una lezione, un tocco per dirci com’è andata.', 'After a class, one tap to tell us how it went.') },
    ],
  },
  {
    id: 'abbonamento',
    slug: 'app-abbonamento',
    titolo: d('Abbonamento e pagamenti', 'Membership and payments'),
    eyebrow: d('I soldi, in chiaro', 'Money, made clear'),
    intro: d('Attivare, cambiare, sospendere o disdire l’abbonamento, e pagare quello che c’è da pagare.', 'Starting, changing, suspending or canceling your membership, and paying what’s due.'),
    funzioni: [
      { id: 'attivare-un-abbonamento', nome: d('Attivare un abbonamento', 'Starting a membership'), cosa: d('Il listino nell’app, la scelta del piano e la firma.', 'The price list in the app, choosing a plan and signing.') },
      { id: 'sospendere-l-abbonamento', nome: d('Sospendere l’abbonamento', 'Suspending your membership'), cosa: d('Gestisci abbonamento → Sospendi.', 'Manage membership → Suspend.') },
      { id: 'disdire-l-abbonamento', nome: d('Disdire l’abbonamento', 'Canceling your membership'), cosa: d('Gestisci abbonamento → Disdici.', 'Manage membership → Cancel.') },
      { id: 'cambiare-abbonamento', nome: d('Cambiare abbonamento', 'Changing your membership'), cosa: d('Gestisci abbonamento → Cambia abbonamento, scegliendo la data.', 'Manage membership → Change membership, picking the date.') },
      { id: 'pagare-le-quote-da-saldare', nome: d('Pagare le quote da saldare', 'Paying what’s due'), cosa: d('Pagamenti → Da pagare.', 'Payments → To pay.') },
      { id: 'metodo-di-pagamento', nome: d('Metodo di pagamento', 'Payment method'), cosa: d('Aggiungere o cambiare la carta o l’IBAN degli addebiti.', 'Adding or changing the card or bank account for charges.') },
      { id: 'storico-dei-pagamenti', nome: d('Storico dei pagamenti', 'Payment history'), cosa: d('Cosa hai pagato, e quando.', 'What you’ve paid, and when.') },
    ],
  },
  {
    id: 'train',
    slug: 'app-train',
    titolo: d('Allenarsi: i piani', 'Training: your plans'),
    eyebrow: d('Athlon Health System · Train', 'Athlon Health System · Train'),
    intro: d('I piani di allenamento, gli allenamenti che registri e gli strumenti per seguirti nel tempo.', 'Training plans, the workouts you log and the tools that follow you over time.'),
    funzioni: [
      { id: 'i-tuoi-piani-di-allenamento', nome: d('I tuoi piani di allenamento', 'Your training plans'), cosa: d('Le schede giorno per giorno, con gli esercizi e i video.', 'Day-by-day plans, with the exercises and videos.') },
      { id: 'comporre-un-piano', nome: d('Comporre un piano insieme ad Athlon', 'Building a plan with Athlon'), cosa: d('Rispondi a poche domande e il piano si prepara.', 'Answer a few questions and the plan is put together.') },
      { id: 'importare-un-piano', nome: d('Importare un piano che hai già', 'Importing a plan you already have'), cosa: d('Porti nell’app la scheda che hai in foto o in un file.', 'You bring in the plan you have as a photo or a file.') },
      { id: 'registrare-un-allenamento', nome: d('Registrare un allenamento', 'Logging a workout'), cosa: d('Aggiungere a mano un allenamento fatto fuori dal club.', 'Adding by hand a workout done outside the club.') },
      { id: 'storico-e-analisi', nome: d('Storico e analisi dell’allenamento', 'Workout history and analysis'), cosa: d('Giorni attivi, calorie, com’è fatto il tuo allenamento.', 'Active days, calories, what your training looks like.') },
      { id: 'test-dei-massimali', nome: d('Il test dei massimali', 'The max-lift test'), cosa: d('Pochi esercizi per stimare i chili da usare.', 'A few exercises to estimate the weights to use.') },
      { id: 'misure-del-corpo', nome: d('Le misure del corpo', 'Body measurements'), cosa: d('Peso, altezza e misure, per seguire come cambi.', 'Weight, height and measurements, to follow how you change.') },
      { id: 'consigli-di-athlon', nome: d('Consigli di Athlon', 'Athlon suggestions'), cosa: d('Le lezioni che potrebbero interessarti, in base a come ti alleni.', 'Classes you might like, based on how you train.') },
      { id: 'percorso-athlon', nome: d('Il Percorso Athlon', 'The Athlon Path'), cosa: d('La settimana a tappe, composta dentro il palinsesto vero.', 'A week in stages, built inside the real timetable.') },
      { id: 'piano-di-nuoto', nome: d('Il piano di nuoto', 'The swim plan'), cosa: d('Cosa fare in vasca, da leggere a bordo vasca.', 'What to do in the pool, to read at the poolside.') },
    ],
  },
  {
    id: 'food-recover',
    slug: 'app-food-recover',
    titolo: d('Mangiare e recuperare', 'Eating and recovering'),
    eyebrow: d('Athlon Health System · Food e Recover', 'Athlon Health System · Food and Recover'),
    intro: d('Il diario dei pasti, la cultura alimentare, il sonno e le pause per recuperare.', 'The meal diary, food know-how, sleep and breaks to recover.'),
    funzioni: [
      { id: 'diario-dei-pasti', nome: d('Il diario dei pasti', 'The meal diary'), cosa: d('Scrivi quello che mangi e vedi il Balance.', 'Log what you eat and see your Balance.') },
      { id: 'foto-del-piatto', nome: d('Fotografare il piatto', 'Photographing your plate'), cosa: d('Una foto per aggiungere un pasto più in fretta.', 'A photo to add a meal faster.') },
      { id: 'consigli-sull-alimentazione', nome: d('I consigli sull’alimentazione', 'Eating tips'), cosa: d('Spunti pratici di educazione alimentare.', 'Practical food-education pointers.') },
      { id: 'capire-il-cibo', nome: d('Capire il cibo', 'Understanding food'), cosa: d('Le letture di cultura alimentare.', 'The readings on food culture.') },
      { id: 'il-sonno', nome: d('Il sonno', 'Sleep'), cosa: d('Scrivi quanto dormi e vedi come stai recuperando.', 'Log how much you sleep and see how you’re recovering.') },
      { id: 'sessioni-di-mobilita', nome: d('Le sessioni di mobilità', 'Mobility sessions'), cosa: d('Esercizi guidati per sciogliere le articolazioni.', 'Guided exercises to loosen your joints.') },
      { id: 'foam-roller', nome: d('Il foam roller', 'The foam roller'), cosa: d('La sessione di rilascio, con i video.', 'The release session, with videos.') },
      { id: 'respiro-guidato', nome: d('Il respiro guidato', 'Guided breathing'), cosa: d('Una pausa da uno a cinque minuti.', 'A break from one to five minutes.') },
    ],
  },
  {
    id: 'punteggio',
    slug: 'app-punteggio',
    titolo: d('Punteggio, abitudini e dispositivi', 'Score, habits and devices'),
    eyebrow: d('Come stai andando', 'How you’re doing'),
    intro: d('Il punteggio, i livelli, le abitudini e il collegamento con l’app Salute del telefono.', 'The score, the levels, the habits and the link with your phone’s Health app.'),
    funzioni: [
      { id: 'athlon-health-score', nome: d('Athlon Health Score', 'Athlon Health Score'), cosa: d('Il punteggio da 0 a 100 su allenamento, alimentazione e recupero.', 'The 0–100 score across training, food and recovery.') },
      { id: 'il-balance', nome: d('Il Balance', 'The Balance'), cosa: d('Le calorie consumate e quelle mangiate negli ultimi giorni.', 'Calories burned and eaten over the last few days.') },
      { id: 'i-livelli', nome: d('I livelli', 'The levels'), cosa: d('I livelli che sblocchi settimana dopo settimana.', 'The levels you unlock week after week.') },
      { id: 'classifica-mensile', nome: d('La classifica mensile', 'The monthly leaderboard'), cosa: d('La classifica del mese fra i soci che scelgono di partecipare.', 'The month’s leaderboard among members who choose to take part.') },
      { id: 'le-abitudini', nome: d('Le abitudini', 'Habits'), cosa: d('Quelle che scegli tu, da spuntare ogni giorno.', 'The ones you pick, to tick off every day.') },
      { id: 'sfida-di-30-giorni', nome: d('La sfida di 30 giorni', 'The 30-day challenge'), cosa: d('Un’abitudine da mantenere per trenta giorni.', 'A habit to keep up for thirty days.') },
      { id: 'apple-salute-e-health-connect', nome: d('Apple Salute e Health Connect', 'Apple Health and Health Connect'), cosa: d('Collegare l’app Salute del telefono per importare i tuoi dati.', 'Linking your phone’s Health app to import your data.') },
      { id: 'il-tuo-mese', nome: d('Il tuo mese da condividere', 'Your month, to share'), cosa: d('Il riepilogo del mese, per un post o una storia.', 'The month’s summary, for a post or a story.') },
      { id: 'la-tua-settimana', nome: d('La tua settimana in Athlon', 'Your week at Athlon'), cosa: d('Il riepilogo della settimana, da condividere.', 'The week’s summary, to share.') },
    ],
  },
  {
    id: 'famiglia-junior',
    slug: 'app-famiglia-junior',
    titolo: d('Famiglia e corsi dei bambini', 'Family and kids’ courses'),
    eyebrow: d('Per i genitori', 'For parents'),
    intro: d('Chi c’è nel tuo nucleo e la sezione Junior: corsi, recuperi, brevetti, gare.', 'Who’s in your household and the Junior section: courses, make-ups, badges, races.'),
    funzioni: [
      { id: 'famiglia', nome: d('Famiglia', 'Family'), cosa: d('I familiari iscritti al club e i loro dati.', 'The family members signed up to the club, and their details.') },
      { id: 'aggiungere-un-componente', nome: d('Aggiungere un componente', 'Adding a family member'), cosa: d('Registrare un figlio o un familiare dall’app.', 'Registering a child or a relative from the app.') },
      { id: 'delega-sui-figli', nome: d('La delega sui figli', 'Delegating your children'), cosa: d('Affidare la gestione dei figli a un altro adulto.', 'Handing your children’s management to another adult.') },
      { id: 'corsi-e-lezioni-del-bambino', nome: d('Corsi e lezioni del bambino', 'Your child’s courses and classes'), cosa: d('In Junior: corso, turno, lezioni e contratto.', 'In Junior: course, group, classes and contract.') },
      { id: 'recuperi', nome: d('I recuperi', 'Make-ups'), cosa: d('Prenotare la lezione persa.', 'Booking the class that was missed.') },
      { id: 'cambio-orario', nome: d('Il cambio orario', 'Changing the time'), cosa: d('Chiedere un altro turno.', 'Asking for another group.') },
      { id: 'brevetti', nome: d('I brevetti', 'Badges'), cosa: d('Il viaggio dei livelli e il diplomino da condividere.', 'The journey through the levels and the certificate to share.') },
      { id: 'gare', nome: d('Le gare', 'Races'), cosa: d('Il Trofeo Athlon: iscrizione e pagamento.', 'The Athlon Trophy: sign-up and payment.') },
      { id: 'direttore-tecnico', nome: d('Parlare col Direttore Tecnico', 'Talking to the Technical Director'), cosa: d('Fissare una telefonata dall’app.', 'Booking a phone call from the app.') },
      { id: 'pagamenti-dei-figli', nome: d('I pagamenti dei figli', 'Your children’s payments'), cosa: d('Quote e contratto dei bambini.', 'The children’s fees and contract.') },
    ],
  },
  {
    id: 'club',
    slug: 'app-club',
    titolo: d('Club Life, Shop e assistenza', 'Club Life, Shop and support'),
    eyebrow: d('Tutto il resto', 'Everything else'),
    intro: d('Le news e gli eventi, le risposte, lo Shop, la TV e le persone a cui chiedere aiuto.', 'News and events, answers, the Shop, TV and the people to ask for help.'),
    funzioni: [
      { id: 'le-news-del-club', nome: d('Le news del club', 'Club news'), cosa: d('Le novità del club, in Club Life.', 'The club’s news, in Club Life.') },
      { id: 'gli-eventi', nome: d('Gli eventi', 'Events'), cosa: d('Dettagli, prenotazione dal Calendario e condivisione.', 'Details, booking from the Calendar and sharing.') },
      { id: 'help-desk-e-guide-video', nome: d('Help Desk e guide video', 'Help Desk and video guides'), cosa: d('Le risposte scritte e i video di ogni sezione.', 'The written answers and the video for each section.') },
      { id: 'orari-del-club', nome: d('Gli orari del club', 'Club opening hours'), cosa: d('L’apertura di oggi e dei prossimi giorni.', 'Today’s opening hours and the next few days.') },
      { id: 'richiedi-assistenza', nome: d('Richiedi assistenza', 'Get support'), cosa: d('L’assistente virtuale, e poi scrivere al team.', 'The virtual assistant, and then writing to the team.') },
      { id: 'shop-e-ritiro-con-qr', nome: d('Lo Shop e il ritiro con il QR', 'The Shop and QR pickup'), cosa: d('Acquistare cuffie e merchandising e ritirarli in segreteria.', 'Buying caps and merchandise and collecting them at the front desk.') },
      { id: 'athlon-tv', nome: d('Athlon TV', 'Athlon TV'), cosa: d('I video di allenamento e delle lezioni.', 'Workout and class videos.') },
      { id: 'invita-i-tuoi-amici', nome: d('Invita i tuoi amici', 'Invite your friends'), cosa: d('Il tuo link personale per portare un amico in prova.', 'Your personal link to bring a friend for a trial.') },
    ],
  },
]

/** Le parole delle cinque stelle per giudicare una funzione («Come ti trovi?»). Una scala sola per tutte, così le medie si confrontano. */
export const STELLE_FUNZIONE: Doppio[] = [d('Male', 'Poorly'), d('Così così', 'So-so'), d('Abbastanza bene', 'Fairly well'), d('Bene', 'Well'), d('Benissimo', 'Very well')]

/** Da questo voto in giù compare «Cosa non ti convince?». Tre è «abbastanza bene»: c’è ancora qualcosa da sistemare. */
export const SOGLIA_PROBLEMI = 3

/** Cosa può non convincere. Le parole `breve` finiscono nella nota che legge il club, sempre in italiano. */
export type Problema = { id: string; testo: Doppio; breve: string }

export const PROBLEMI: Problema[] = [
  { id: 'trovarla', testo: d('Faccio fatica a trovarla', 'I struggle to find it'), breve: 'difficile da trovare' },
  { id: 'confusa', testo: d('È confusa', 'It’s confusing'), breve: 'confusa' },
  { id: 'lenta', testo: d('È lenta o si blocca', 'It’s slow or it freezes'), breve: 'lenta o si blocca' },
  { id: 'incompleta', testo: d('Mi manca qualcosa', 'Something’s missing'), breve: 'manca qualcosa' },
  { id: 'inutile', testo: d('Non mi serve', 'I don’t need it'), breve: 'non mi serve' },
]

export type DomandaGenerale = { id: string; testo: Doppio }

/**
 * Le domande a stelle della riga finale: sull'app nel suo insieme. Sono **quattro** perche' la riga ne contiene al piu' dodici
 * (`MAX_VOCI`) e ne servono otto per i capitoli senza uso. Le stelle sono quelle della survey del club (`survey().stelle`), perche'
 * qui si dice quanto si e' d'accordo con una frase.
 */
export const DOMANDE_GENERALI: DomandaGenerale[] = [
  { id: 'facile-da-usare', testo: d('Usare l’app è facile: trovi subito quello che cerchi', 'The app is easy to use: you quickly find what you’re looking for') },
  { id: 'veloce-e-affidabile', testo: d('L’app è veloce e non si blocca', 'The app is fast and doesn’t freeze') },
  { id: 'meno-segreteria', testo: d('Con l’app ti serve meno passare dalla segreteria o scrivere al club', 'With the app you need to visit the front desk or write to the club less') },
  { id: 'fiducia', testo: d('Quello che l’app mostra è giusto e aggiornato', 'What the app shows is correct and up to date') },
]

export const NPS_APP = {
  testo: d('Quanto è probabile che consigli l’app Athlon Club a un amico?', 'How likely are you to recommend the Athlon Club app to a friend?'),
  minimo: d('Per niente probabile', 'Not at all likely'),
  massimo: d('Estremamente probabile', 'Extremely likely'),
}

/** Quanti capitoli si possono indicare come «da migliorare per primi». */
export const MAX_PRIORITA = 2

export function capitoloApp(id: string | undefined): CapitoloApp | undefined {
  return CAPITOLI_APP.find((c) => c.id === id)
}

export function funzioniTotali(): number {
  return CAPITOLI_APP.reduce((n, c) => n + c.funzioni.length, 0)
}
