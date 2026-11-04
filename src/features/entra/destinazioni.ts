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
// Le destinazioni sono cinque: `prenota` (il Calendario, gia' sulla categoria), `personal`, `gare` (Junior, voce Gare: l'iscrizione al
// Trofeo Athlon), `evento` (il Calendario sul giorno di un evento e sulla sua categoria) e `junior` (la sezione Junior con l'assistente aperto).
// `gare` ed `evento` sono del 04/11/2026: sono la regola di ogni pagina evento del sito, il cui pulsante chiede l'email e manda questo link
// invece di mandare al portale di PerfectGym. `junior` (04/11/2026) arriva al genitore dopo la registrazione del figlio dal sito.

/** I nomi delle categorie del Calendario (`perfectgym.class_categories`): il filtro del Calendario confronta la stringa. */
export const CATEGORIE = ['Corsi Fitness', 'Aqua Fitness', 'Nuoto Libero', 'Gym Floor', 'Scuola Nuoto Adulti', 'Group Reformer'] as const

/** Le categorie degli eventi su PerfectGym (`class_categories` 37 e 39): quelle che `sito-eventi` manda per un evento del CRM. */
export const CATEGORIE_EVENTO = ['Eventi Gratuiti', 'Master Class'] as const

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
export function arrivoDa(d: string | undefined, a?: string | null, g?: string | null, oggi: string = GIORNO_ROMA.format(new Date())): Arrivo | null {
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
      return {
        href: { pathname: '/junior', params: { assistenza: '1' } },
        titolo: t('Iscrivi tuo figlio', 'Enrol your child'),
        testo: t(
          'Ti apriamo direttamente la sezione Junior, senza password: trovi i corsi per la sua età e i turni con posti liberi.',
          'We’ll open the Junior section for you directly, no password needed: you’ll find the courses for their age and the slots with places left.',
        ),
        bottone: t('Apri la sezione Junior', 'Open the Junior section'),
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
