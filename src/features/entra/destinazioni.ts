import type { Href } from 'expo-router'

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

/** I nomi delle categorie del Calendario (`perfectgym.class_categories`): il filtro del Calendario confronta la stringa. */
export const CATEGORIE = ['Corsi Fitness', 'Aqua Fitness', 'Nuoto Libero', 'Gym Floor', 'Scuola Nuoto Adulti', 'Group Reformer'] as const

export type Arrivo = {
  /** Dove si va, dopo l'accesso. */
  href: Href
  titolo: string
  testo: string
  bottone: string
}

/** La destinazione chiesta dal link, o `null` se non e' una di quelle (il link e' stato scritto a mano o e' di un'altra versione). */
export function arrivoDa(d: string | undefined, a?: string | null): Arrivo | null {
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
    default:
      return null
  }
}
