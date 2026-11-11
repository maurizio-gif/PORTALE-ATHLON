import type { Href } from 'expo-router'

import { giornoEsteso } from '@/lib/eventi'
import { t } from '@/lib/lingua'

// Dove porta un link che arriva dal sito (04/11/2026): `https://app.athlonroma.it/entra?d=prenota&a=Group%20Reformer#th=<token>`.
// Lo manda `sito-accesso-link` (APP-ATHLON, `_shared/accesso-sito.ts`), dopo che chi stava guardando il sito ha scritto la sua email.
//
// **E' una lista chiusa, ed e' la stessa del server.** `d` e `a` stanno in un indirizzo che chiunque puo' scrivere a mano: qui si
// riconoscono solo le destinazioni di questo elenco e le categorie del Calendario, e il resto non e' una destinazione. Niente
// percorsi liberi: un `?vai=/qualunque-cosa` sarebbe un reindirizzamento aperto dietro un accesso.
//
// Per aggiungere una destinazione (la prossima funzione «diretta dal sito»): un `case` qui, la stessa riga in `DESTINAZIONI` del server
// e il sito mette `data-accesso="<chiave>"` sul comando. Modulo puro (niente React): si prova da solo (`scripts/prova-entra.ts`).
//
// Le destinazioni sono sei: `prenota` (il Calendario, gia' sulla categoria), `personal`, `gare` (Junior, voce Gare: l'iscrizione al
// Trofeo Athlon), `evento` (il Calendario sul giorno di un evento e sulla sua categoria) e `junior` (la sezione Junior con l'assistente aperto).
// `gare` ed `evento` sono del 04/11/2026: sono la regola di ogni pagina evento del sito, il cui pulsante chiede l'email e manda questo link
// invece di mandare al portale di PerfectGym. `junior` (04/11/2026) arriva al genitore dopo la registrazione del figlio dal sito.
// `iscrizione` (07/11/2026) la prepara un operatore dalla scheda del CRM, non il sito: il genitore riceve il link per email o per SMS e firma e paga
// l'iscrizione di un figlio a un turno (`f`: il bambino, `t`: il turno, l'id del gruppo) o al Baby Nuoto (`b=1`): apre `/iscrizione`, la schermata
// che il genitore trova dalla sezione Junior. Se il bambino non e' del nucleo di chi entra, la schermata non lo trova e lo dice (e il server non firma).
// `abbonamento` (04/11/2026) e' il pulsante «Iscriviti» del listino del sito: apre «Attiva un abbonamento» con il piano gia' scelto (`p`,
// l'id del piano su PerfectGym, che e' anche il `piano_id` dell'app); un piano che non c'e' nel listino lascia la scelta alla persona.
// `certificato` (07/11/2026) e' il modulo della scheda «Certificato Medico» del sito: apre la Home sulla sezione Certificato.

/** I nomi delle categorie del Calendario (`perfectgym.class_categories`): il filtro del Calendario confronta la stringa. */
export const CATEGORIE = ['Corsi Fitness', 'Aqua Fitness', 'Nuoto Libero', 'Gym Floor', 'Scuola Nuoto Adulti', 'Group Reformer'] as const

/** Le categorie degli eventi su PerfectGym (`class_categories` 37 e 39): quelle che `sito-eventi` manda per un evento del CRM. */
export const CATEGORIE_EVENTO = ['Eventi Gratuiti', 'Master Class'] as const

/** L'id di un piano (`piano_id`, cioe' il `PaymentPlanId` di PerfectGym), o `null`: come sul server, solo cifre. */
export function pianoValido(p: string | null | undefined): string | null {
  return p && /^\d{1,6}$/.test(p) ? p : null
}

/** L'id di una scheda (il bambino da aprire in Junior), o `null`: solo cifre, come sul server. */
export function idValido(f: string | null | undefined): string | null {
  return f && /^\d{1,10}$/.test(f) ? f : null
}

/** Una data `AAAA-MM-GG` che esiste davvero (non il 31 novembre), o `null`: finisce in un indirizzo che chiunque puo' scrivere a mano. */
export function giornoValido(g: string | null | undefined): string | null {
  if (!g || !/^\d{4}-\d{2}-\d{2}$/.test(g)) return null
  const [a, m, d] = g.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d))
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? g : null
}

/** Il Calendario delle Prenotazioni mostra oggi e i 14 giorni dopo (come la scheda di un evento nell'app: `clublife/Dettaglio.tsx`). */
const GIORNI_CALENDARIO = 14
const MS_GIORNO = 86_400_000

/** Oggi a Roma, «2026-11-04». */
const GIORNO_ROMA = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' })

export type Arrivo = {
  /** Dove si va, dopo l'accesso. */
  href: Href
  titolo: string
  testo: string
  bottone: string
}

/** La destinazione chiesta dal link, o `null` se non e' una di quelle (il link e' stato scritto a mano o e' di un'altra versione). */
export function arrivoDa(
  d: string | undefined,
  a?: string | null,
  g?: string | null,
  oggi: string = GIORNO_ROMA.format(new Date()),
  p?: string | null,
  f?: string | null,
  turno?: string | null,
  baby?: string | null,
): Arrivo | null {
  const attivita = a && (CATEGORIE as readonly string[]).includes(a) ? a : null
  switch (d) {
    case 'prenota':
      return {
        href: attivita ? { pathname: '/calendario', params: { attivita } } : '/calendario',
        titolo: attivita ? t(`Prenota ${attivita}`, `Book ${attivita}`) : t('Prenota una lezione', 'Book a class'),
        testo: t('Ti apriamo direttamente le prenotazioni, senza password.', 'We’ll open the bookings for you directly, no password needed.'),
        bottone: t('Apri le prenotazioni', 'Open bookings'),
      }
    case 'personal':
      return {
        href: '/personal',
        titolo: t('Prenota una seduta di personal training', 'Book a personal training session'),
        testo: t('Ti apriamo direttamente il personal training, senza password.', 'We’ll open personal training for you directly, no password needed.'),
        bottone: t('Apri il personal training', 'Open personal training'),
      }
    case 'gare':
      return {
        href: { pathname: '/junior', params: { voce: 'gare' } },
        titolo: t('Iscrivi tuo figlio alla gara', 'Enter your child in the race'),
        testo: t('Ti apriamo direttamente le gare nella sezione Junior, senza password.', 'We’ll open the races in the Junior section for you directly, no password needed.'),
        bottone: t('Apri le gare', 'Open the races'),
      }
    case 'junior':
      // Il genitore che ha appena registrato il figlio dalla chat o da «Contattaci» del sito (Scuola Nuoto Bambini, Baby Nuoto): la
      // sezione Junior, con l'assistente dell'app aperto (`assistenza=1`, letto da `junior/Junior.tsx`), che prende il posto della
      // chat del sito.
      // `f` (04/11/2026) e' il bambino appena registrato: la sezione si apre gia' su di lui, con i suoi turni (o le lezioni del
      // Baby Nuoto). Solo cifre; se non e' nel nucleo di chi entra, la sezione lo ignora e apre il primo figlio come sempre.
      const figlio = idValido(f)
      return {
        href: { pathname: '/junior', params: figlio ? { assistenza: '1', figlio } : { assistenza: '1' } },
        titolo: t('Iscrivi tuo figlio', 'Enrol your child'),
        testo: t(
          'Ti apriamo direttamente la sezione Junior, senza password: trovi i turni ancora disponibili per la sua età, con i prezzi (o le lezioni del Baby Nuoto da prenotare).',
          'We’ll open the Junior section for you directly, no password needed: you’ll find the slots still available for their age, with prices (or the Baby Nuoto classes to book).',
        ),
        bottone: t('Apri la sezione Junior', 'Open the Junior section'),
      }
    case 'iscrizione': {
      // L'iscrizione di un figlio preparata dal CRM (07/11/2026). Senza il bambino, o senza turno e senza Baby Nuoto, il link non sa dove andare:
      // si apre la sezione Junior, dove il genitore sceglie.
      const bambino = idValido(f)
      const gruppo = idValido(turno)
      const href: Href =
        bambino && baby === '1'
          ? { pathname: '/iscrizione', params: { baby: '1', membro: bambino } }
          : bambino && gruppo
            ? { pathname: '/iscrizione', params: { group: gruppo, membro: bambino } }
            : '/junior'
      return {
        href,
        titolo: t('Completa l’iscrizione', 'Complete the enrolment'),
        testo: t(
          'Ti apriamo direttamente l’iscrizione preparata con la segreteria, senza password: leggi il contratto, lo firmi e scegli come pagare.',
          'We’ll open the enrolment you prepared with the club desk for you directly, no password needed: read the contract, sign it and choose how to pay.',
        ),
        bottone: t('Apri l’iscrizione', 'Open the enrolment'),
      }
    }
    case 'assistenza':
      // Chi e' gia' iscritto e apre la chat del sito (05/11/2026, decisione di Maurizio): la chat non risponde li', manda questo link.
      // Si entra nella Home con l'assistente dell'app aperto (`assistenza=1`, letto da `AreaRiservata.tsx`), che conosce gli
      // abbonamenti, i pagamenti e le prenotazioni della persona e porta nella sezione giusta.
      return {
        href: { pathname: '/', params: { assistenza: '1' } },
        titolo: t('La tua area riservata', 'Your personal area'),
        testo: t(
          'Ti apriamo direttamente la tua area, senza password, con l’assistente pronto: lì conosco i tuoi abbonamenti, i pagamenti e le prenotazioni.',
          'We’ll open your area for you directly, no password needed, with the assistant ready: there I know your memberships, payments and bookings.',
        ),
        bottone: t('Entra e scrivimi', 'Sign in and chat'),
      }
    case 'consensi':
      // Il genitore a cui il figlio da 13 a 17 anni ha chiesto di aprire un'area sulla salute (11/11/2026): l'email di
      // `portale-lab-consensi-minori` (azione `chiedi`) porta qui, sulla pagina «Consensi per i tuoi figli». Nessun parametro: chi sono i
      // figli lo dice la sessione di chi entra.
      return {
        href: '/consensi-minori',
        titolo: t('I consensi per i tuoi figli', 'Consents for your children'),
        testo: t(
          'Ti apriamo direttamente la pagina dei consensi, senza password: leggi l’informativa e scegli per quali aree dare il consenso.',
          'We’ll open the consents page for you directly, no password needed: read the notice and choose which areas to consent to.',
        ),
        bottone: t('Apri i consensi', 'Open the consents'),
      }
    case 'certificato':
      // La scheda «Certificato Medico» dell'Help Desk del sito (07/11/2026): chiede l'email e manda questo link. La Home sulla sezione
      // Certificato (`/?sezione=certificato`, letta da `AreaRiservata.tsx`, sempre visibile), dove si sceglie per chi e si invia la foto o il PDF.
      // Nessun parametro in piu': nemmeno un bambino, «per chi» si sceglie dentro la sezione.
      return {
        href: { pathname: '/', params: { sezione: 'certificato' } },
        titolo: t('Carica il certificato medico', 'Upload your medical certificate'),
        testo: t(
          'Ti apriamo direttamente la sezione Certificato, senza password: scegli per chi lo carichi e invia una foto o un PDF.',
          'We’ll open the Certificate section for you directly, no password needed: choose who you’re uploading it for and send a photo or a PDF.',
        ),
        bottone: t('Apri il certificato', 'Open the certificate'),
      }
    case 'abbonamento': {
      // Dal listino del sito: «Attiva un abbonamento» (`lab/Abbonamento.tsx`), con il piano gia' scelto se l'app lo trova fra i suoi.
      const piano = pianoValido(p)
      return {
        href: piano ? { pathname: '/abbonamento', params: { piano } } : '/abbonamento',
        titolo: t('Attiva il tuo abbonamento', 'Activate your membership'),
        testo: t(
          'Ti apriamo direttamente il listino, senza password: scegli la formula e la data di inizio, firmi il contratto e scegli come pagare.',
          'We’ll open the price list for you directly, no password needed: choose the plan and start date, sign the contract and choose how to pay.',
        ),
        bottone: t('Scegli il tuo abbonamento', 'Choose your membership'),
      }
    }
    case 'evento': {
      // Le categorie degli eventi sono una lista a parte: una categoria dei corsi non entra qui, e viceversa (come sul server).
      const categoria = a && (CATEGORIE_EVENTO as readonly string[]).includes(a) ? a : null
      const giorno = giornoValido(g)
      // Un evento piu' lontano di quello che il Calendario mostra: un `giorno` fuori dai quindici lo riporta a oggi, con la categoria
      // applicata, cioe' (di solito) una schermata vuota. Si dice quando si aprono le prenotazioni e si apre il Calendario com'e'.
      if (giorno && Math.round((Date.parse(giorno) - Date.parse(oggi)) / MS_GIORNO) > GIORNI_CALENDARIO) {
        const apre = new Date(Date.parse(giorno) - GIORNI_CALENDARIO * MS_GIORNO).toISOString().slice(0, 10)
        return {
          href: '/calendario',
          titolo: t('Le prenotazioni non sono ancora aperte', 'Bookings are not open yet'),
          testo: t(
            `Si prenota dal calendario dell’app a partire da ${giornoEsteso(apre)}. Intanto ti apriamo il calendario, senza password.`,
            `You can book from the app calendar starting ${giornoEsteso(apre)}. For now we’ll open the calendar for you, no password needed.`,
          ),
          bottone: t('Apri il calendario', 'Open the calendar'),
        }
      }
      const params: Record<string, string> = {}
      if (giorno) params.giorno = giorno
      if (categoria) params.attivita = categoria
      return {
        href: Object.keys(params).length ? { pathname: '/calendario', params } : '/calendario',
        titolo: t('Prenota il tuo posto', 'Book your spot'),
        testo: t('Ti apriamo direttamente il calendario sul giorno dell’evento, senza password.', 'We’ll open the calendar on the day of the event for you directly, no password needed.'),
        bottone: t('Apri il calendario', 'Open the calendar'),
      }
    }
    default:
      return null
  }
}
