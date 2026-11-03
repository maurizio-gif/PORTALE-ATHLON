import { t } from '@/lib/lingua'

// Le survey del club, **scritte qui**: il portale ne e' il proprietario e non dipende dal sito (decisione di Maurizio, 03/11/2026: «le survey
// vanno ricostruite sul portale, non linkate dal sito»). Niente feed, niente `club-life.json`: se il sito non risponde, le survey ci sono lo stesso.
//
// **Quello che deve restare uguale al sito sono gli `slug` dei temi e gli `id` delle domande.** Sono il nome con cui la risposta finisce su
// `sondaggi_risposte` e nella pagina Survey del CRM: la stessa domanda posta sul sito e nell'app deve finire nella stessa colonna, o la serie storica
// si spezza in due senza che niente dia errore. Anche le parole italiane sono quelle del sito (`src/data/surveys.ts` di SITO-ATHLON), per la
// stessa ragione: due formulazioni diverse della stessa domanda non sono confrontabili. `scripts/prova-survey.ts` con `SITO_SURVEYS_TS` lo controlla.
// Chi ritocca una domanda la ritocca nei due posti — oppure ne scrive una nuova con un `id` nuovo.
//
// Le domande sono in italiano e in inglese (ogni testo dell'app lo e': `docs/glossario-inglese.md`), e **si compongono a ogni chiamata**, non una volta
// al caricamento del modulo: cambiando lingua sul nativo la schermata si ridisegna e deve trovare i testi della lingua nuova.

export type DomandaSurvey = { id: string; testo: string }

export type TemaSurvey = {
  /** L'ultimo pezzo dell'indirizzo del sito, `/surveys/<slug>/`: lo stesso di `sondaggi_risposte.sondaggio`. */
  slug: string
  titolo: string
  eyebrow: string
  intro: string
  domande: DomandaSurvey[]
}

/** Le tre forme della domanda aperta: neutra finche' non c'e' un giudizio, poi sotto o sopra soglia. */
export type FormaNota = { titolo: string; aiuto: string }

export type SurveyClub = {
  temi: TemaSurvey[]
  nps: { testo: string; minimo: string; massimo: string }
  /** Le cinque parole delle stelle, da «Per niente» a «Moltissimo». */
  stelle: string[]
  soglia: { nps: number; media: number }
  nota: { neutra: FormaNota; sotto: FormaNota; sopra: FormaNota }
  /** Il riquadro della recensione su Google, con il Place ID della scheda del club. */
  recensione: string
}

/**
 * Le due soglie che aprono la richiesta di recensione, in OR: NPS ≥ 9 e' il promotore per definizione, la media ≥ 4,5 su 5 copre chi non ha
 * risposto all'NPS. Sono quelle del sito (`SOGLIA` in `src/data/surveys.ts`). Si sbaglia nel verso di non chiederla: una recensione non chiesta
 * a chi l'avrebbe scritta costa una recensione, chiederla a chi ha appena detto che gli spogliatoi sono sporchi la scrive.
 */
export const SOGLIA = { nps: 9, media: 4.5 } as const

/** La scheda del club su Google, nella forma `writereview`: apre il riquadro della recensione gia' pronto. */
export const RECENSIONE_GOOGLE = 'https://search.google.com/local/writereview?placeid=ChIJxwtVpgxkLxMRdzofCeJVsYU'

/** Gli slug dei temi, nell'ordine del menu: servono ai link `/surveys/<slug>/` che si aprono nell'app, senza comporre i testi. */
export const SLUG_SURVEY = ['assistenza', 'lezioni', 'pulizia', 'manutenzione', 'piscina', 'prenotazioni', 'junior', 'generale'] as const

/** Le survey, nella lingua di adesso. Gli otto temi del menu del sito; `iscrizione` non c'e': la manda il CRM a una persona precisa. */
export function survey(): SurveyClub {
  return {
    temi: [
      {
        slug: 'assistenza',
        titolo: t('Informazioni e assistenza', 'Information and support'),
        eyebrow: t('Trovare risposte', 'Finding answers'),
        intro: t('Le tre strade per avere una risposta: le pagine del sito, l’assistente virtuale e le persone del club.', 'The three ways to get an answer: the website, the virtual assistant and the club staff.'),
        domande: [
          { id: 'sito', testo: t('Sul sito trovi le informazioni che cerchi, senza doverle chiedere', 'On the website you find the information you’re looking for, without having to ask') },
          { id: 'assistente', testo: t('L’assistente virtuale in chat ti ha dato una risposta utile', 'The virtual assistant in the chat gave you a useful answer') },
          { id: 'cortesia', testo: t('Le persone del club sono state cortesi e disponibili', 'The club staff were courteous and helpful') },
          { id: 'tempi', testo: t('Quando hai scritto al club, la risposta è arrivata entro poche ore', 'When you wrote to the club, the answer came within a few hours') },
          { id: 'risolto', testo: t('La tua richiesta è stata risolta, non solo presa in carico', 'Your request was resolved, not just acknowledged') },
          { id: 'coerenza', testo: t('Sito, chat e persone del club ti dicono la stessa cosa', 'The website, the chat and the club staff all tell you the same thing') },
        ],
      },
      {
        slug: 'lezioni',
        titolo: t('Lezioni e istruttori', 'Classes and instructors'),
        eyebrow: t('In sala e in acqua', 'In the gym and in the pool'),
        intro: t('Le lezioni che segui: chi le tiene, come sono fatte, se sono al tuo livello.', 'The classes you take: who teaches them, how they’re run, whether they suit your level.'),
        domande: [
          { id: 'istruttori', testo: t('Gli istruttori sono preparati e ti seguono durante la lezione', 'The instructors are well prepared and keep an eye on you during class') },
          { id: 'livello', testo: t('Le lezioni sono adatte al tuo livello', 'The classes suit your level') },
          { id: 'palinsesto', testo: t('Negli orari che ti servono trovi le lezioni che cerchi', 'At the times you need, you find the classes you’re looking for') },
          { id: 'puntualita', testo: t('Le lezioni cominciano e finiscono all’orario dichiarato', 'Classes start and end at the stated time') },
          { id: 'gruppo', testo: t('Il numero di persone in sala ti permette di allenarti bene', 'The number of people in the room lets you train well') },
          { id: 'app-aggiornata', testo: t('Quando una lezione cambia, sull’app lo trovi già aggiornato', 'When a class changes, you find it already updated in the app') },
          { id: 'attrezzature', testo: t('Le attrezzature della lezione sono idonee a quello che si fa', 'The equipment for the class is suited to what you do') },
        ],
      },
      {
        slug: 'pulizia',
        titolo: t('Pulizia e spogliatoi', 'Cleanliness and locker rooms'),
        eyebrow: t('Gli ambienti', 'The facilities'),
        intro: t('Spogliatoi, docce, sale: come li hai trovati l’ultima volta che sei venuto.', 'Locker rooms, showers, rooms: how you found them the last time you came.'),
        domande: [
          { id: 'spogliatoi', testo: t('Spogliatoi e docce li hai trovati puliti', 'You found the locker rooms and showers clean') },
          { id: 'acqua', testo: t('Nelle docce c’era acqua calda e la pressione era buona', 'The showers had hot water and good pressure') },
          { id: 'armadietti', testo: t('Hai trovato un armadietto libero quando ti serviva', 'You found a free locker when you needed one') },
          { id: 'phon', testo: t('Le postazioni phon erano funzionanti e sufficienti', 'The hairdryer stations were working and there were enough of them') },
          { id: 'sale', testo: t('Le sale e gli attrezzi erano in ordine', 'The rooms and the equipment were tidy') },
          { id: 'ricambi', testo: t('Aria, temperatura e ricambi erano confortevoli', 'Air quality, temperature and ventilation were comfortable') },
          { id: 'bagni', testo: t('Bagni e materiali di consumo erano riforniti', 'Restrooms and supplies were stocked') },
        ],
      },
      {
        slug: 'manutenzione',
        titolo: t('Attrezzature e manutenzione', 'Equipment and maintenance'),
        eyebrow: t('Le macchine', 'The machines'),
        intro: t('Gli attrezzi della sala e tutto quello che si usa allenandosi.', 'The equipment in the gym and everything you use while training.'),
        domande: [
          { id: 'funzionanti', testo: t('Gli attrezzi che ti servivano erano funzionanti', 'The equipment you needed was working') },
          { id: 'riparazioni', testo: t('La tua segnalazione è stata presa in carico e risolta', 'Your report was picked up and resolved') },
          { id: 'quantita', testo: t('Ce n’è abbastanza anche negli orari di punta', 'There’s enough of it even at peak times') },
          { id: 'app', testo: t('I macchinari collegati all’app registrano davvero i tuoi allenamenti', 'The machines connected to the app really record your workouts') },
          { id: 'ordine', testo: t('Manubri e dischi si trovano al loro posto', 'Dumbbells and weight plates are where they belong') },
        ],
      },
      {
        slug: 'piscina',
        titolo: t('Piscina e acqua', 'Pool and water'),
        eyebrow: t('Le vasche', 'The pools'),
        intro: t('L’acqua, le corsie, e come si sta in vasca negli orari in cui vieni.', 'The water, the lanes, and what it’s like in the pool at the times you come.'),
        domande: [
          { id: 'temperatura', testo: t('L’acqua era alla temperatura giusta', 'The water was at the right temperature') },
          { id: 'pulizia-acqua', testo: t('L’acqua era limpida e l’ambiente in ordine', 'The water was clear and the area was tidy') },
          { id: 'corsie', testo: t('Le corsie erano abbastanza libere per allenarti', 'The lanes were free enough for you to train') },
          { id: 'ritmo', testo: t('La divisione delle corsie per ritmo funziona', 'Dividing the lanes by pace works') },
          { id: 'bagnino', testo: t('L’assistente bagnino era presente e attento', 'The lifeguard was present and attentive') },
          { id: 'turno', testo: t('Il turno che avevi prenotato era disponibile come previsto', 'The slot you booked was available as expected') },
          { id: 'bordo', testo: t('Bordo vasca e spogliatoio della piscina erano in ordine', 'The pool deck and the pool locker room were tidy') },
        ],
      },
      {
        slug: 'prenotazioni',
        titolo: t('Prenotazioni e app', 'Bookings and app'),
        eyebrow: t('Il portale', 'The portal'),
        intro: t('Prenotare una lezione, guardare gli orari, gestire il tuo abbonamento.', 'Booking a class, checking the timetable, managing your membership.'),
        domande: [
          { id: 'facilita', testo: t('Prenotare una lezione è semplice', 'Booking a class is easy') },
          { id: 'finestra', testo: t('La finestra dei tre giorni ti basta per organizzarti', 'The three-day window is enough for you to plan ahead') },
          { id: 'posti', testo: t('Trovi posto nelle lezioni che vuoi fare', 'You find a spot in the classes you want to take') },
          { id: 'disdetta', testo: t('Disdire una prenotazione è altrettanto semplice', 'Canceling a booking is just as easy') },
          { id: 'informazioni', testo: t('Nel portale trovi chiare le informazioni sul tuo abbonamento e sulle scadenze', 'In the portal you find clear information about your membership and due dates') },
          { id: 'app-aggiornata', testo: t('Quando una lezione cambia o salta, sull’app lo trovi già aggiornato', 'When a class changes or is canceled, you find it already updated in the app') },
          { id: 'affidabilita', testo: t('L’app funziona senza doverci tornare due volte', 'The app works without having to try twice') },
        ],
      },
      {
        slug: 'junior',
        titolo: t('Corsi bambini', 'Kids’ courses'),
        eyebrow: t('Per i genitori', 'For parents'),
        intro: t('Scuola Nuoto, Baby Nuoto, agonistico: com’è per tuo figlio e per te.', 'Scuola Nuoto, Baby Nuoto, competitive swimming: how it is for your child and for you.'),
        domande: [
          { id: 'istruttori', testo: t('Gli istruttori seguono i bambini con attenzione', 'The instructors look after the children attentively') },
          { id: 'progressi', testo: t('Vedi progressi in tuo figlio, lezione dopo lezione', 'You see progress in your child, class after class') },
          { id: 'brevetti', testo: t('I brevetti nel tuo account sono aggiornati e li capisci', 'The badges in your account are up to date and you understand them') },
          { id: 'gruppo', testo: t('Tuo figlio è nel gruppo giusto per il suo livello', 'Your child is in the right group for their level') },
          { id: 'organizzazione', testo: t('Turni, cambi e comunicazioni sono chiari', 'Groups, changes and communications are clear') },
          { id: 'recuperi', testo: t('Recuperare una lezione persa è semplice', 'Making up a missed class is easy') },
          { id: 'direttore-tecnico', testo: t('Se hai parlato con il Direttore Tecnico, ti ha saputo aiutare', 'If you spoke with the Technical Director, they were able to help you') },
        ],
      },
      {
        slug: 'generale',
        titolo: t('La tua esperienza in generale', 'Your overall experience'),
        eyebrow: t('Tutto il club', 'The whole club'),
        intro: t('Una domanda su tutto: quanto ti trovi bene ad Athlon.', 'One question about it all: how happy you are at Athlon.'),
        domande: [
          { id: 'aspettative', testo: t('Athlon è all’altezza di quello che ti aspettavi', 'Athlon lives up to what you expected') },
          { id: 'accoglienza', testo: t('Ti senti accolto e a tuo agio nel club', 'You feel welcome and at ease in the club') },
          { id: 'perimetro', testo: t('Il tuo abbonamento comprende quello che pensavi comprendesse', 'Your membership includes what you thought it included') },
          { id: 'trasparenza', testo: t('Costi, scadenze e condizioni ti sono stati detti con chiarezza', 'Costs, due dates and terms were explained to you clearly') },
          { id: 'orari', testo: t('Gli orari di apertura ti permettono di allenarti quando puoi', 'The opening hours let you train when you can') },
          { id: 'valore', testo: t('Quello che ricevi vale quello che paghi', 'What you get is worth what you pay') },
        ],
      },
    ],
    nps: {
      testo: t('Quanto è probabile che consigli Athlon a un amico o a un collega?', 'How likely are you to recommend Athlon to a friend or colleague?'),
      minimo: t('Per niente probabile', 'Not at all likely'),
      massimo: t('Estremamente probabile', 'Extremely likely'),
    },
    stelle: [t('Per niente', 'Not at all'), t('Poco', 'Not much'), t('Abbastanza', 'Fairly'), t('Molto', 'Very much'), t('Moltissimo', 'Absolutely')],
    soglia: { nps: SOGLIA.nps, media: SOGLIA.media },
    nota: {
      neutra: {
        titolo: t('Vuoi aggiungere qualcosa?', 'Anything to add?'),
        aiuto: t(
          'Facoltativo, ed è la parte che ci serve di più: un suggerimento, una cosa che cambieresti, una che ti è piaciuta. Più è preciso — quando, quale lezione, chi c’era — più possiamo farci qualcosa.',
          'Optional, and it’s the part we need most: a suggestion, something you’d change, something you liked. The more specific — when, which class, who was there — the more we can do about it.',
        ),
      },
      sotto: {
        titolo: t('Cosa potevamo fare meglio?', 'What could we do better?'),
        aiuto: t(
          'Facoltativo, ed è la parte che ci serve davvero: più è preciso — quando, quale lezione, chi c’era — più possiamo farci qualcosa.',
          'Optional, and it’s the part we really need: the more specific — when, which class, who was there — the more we can do about it.',
        ),
      },
      sopra: {
        titolo: t('C’è qualcosa che ti piacerebbe trovare?', 'Is there anything you’d like to find here?'),
        aiuto: t(
          'Facoltativo: un suggerimento, un corso o un orario che ti manca, una cosa che secondo te possiamo fare meglio anche così.',
          'Optional: a suggestion, a course or a time you’re missing, something you think we could do even better.',
        ),
      },
    },
    recensione: RECENSIONE_GOOGLE,
  }
}
