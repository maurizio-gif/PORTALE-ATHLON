import { t } from '@/lib/lingua'

import type { ChiaveGuida } from './guide'

// Le parole della finestra delle guide. In una funzione e non in costanti di modulo: `t()` legge la lingua scelta, e sul nativo
// il `localStorage` lo installa expo-sqlite dopo il caricamento dei moduli (vedi `lib/lingua.ts`).
//
// I video sono parlati in italiano, e le schede sono in italiano anche per chi usa l'app in inglese: la frase lo dice, invece di
// lasciare che lo scopra a meta' video.

export function testiGuida(guida: ChiaveGuida): { titolo: string; testo: string } {
  const inItaliano = t('', ' The video and the article are in Italian.')
  switch (guida) {
    case 'home':
      return {
        titolo: t('La tua Home', 'Your Home'),
        testo: t(
          'Un video di 2 minuti per vedere dove sta tutto: abbonamenti, pagamenti, documenti, famiglia e profilo.',
          'A 2-minute video showing where everything is: memberships, payments, documents, family and profile.',
        ) + inItaliano,
      }
    case 'prenotazioni':
      return {
        titolo: t('Prenotazioni', 'Bookings'),
        testo: t(
          'Un minuto per capire come si prenota e si disdice, con la lista d’attesa e la Gym Floor.',
          'One minute on how to book and cancel, with the waiting list and the Gym Floor.',
        ) + inItaliano,
      }
    case 'junior':
      return {
        titolo: t('La sezione Junior', 'The Junior section'),
        testo: t(
          'Un minuto per vedere come funzionano turni, recuperi, cambio orario e Direttore Tecnico.',
          'One minute on how groups, make-up classes, schedule changes and the Technical Director work.',
        ) + inItaliano,
      }
    case 'certificato':
      return {
        titolo: t('Il certificato medico', 'The medical certificate'),
        testo: t(
          'Un minuto per vedere come si carica dall’app e cosa succede dopo.',
          'One minute on how to upload it in the app and what happens next.',
        ) + inItaliano,
      }
    case 'invita':
      return {
        titolo: t('Invita i tuoi amici', 'Invite your friends'),
        testo: t(
          'Un minuto per vedere come funzionano l’invito, la settimana di prova e il voucher.',
          'One minute on how the invitation, the trial week and the voucher work.',
        ) + inItaliano,
      }
    case 'ahs':
      return {
        titolo: 'Athlon Health System',
        testo: t(
          'Due minuti per capire come funzionano Train, Food e Recover e il tuo punteggio.',
          'Two minutes to understand how Train, Food and Recover and your score work.',
        ) + inItaliano,
      }
  }
}

export const PAROLE_GUIDA = {
  sopra: () => t('GUIDA CON VIDEO', 'VIDEO GUIDE'),
  guarda: () => t('Guarda la guida', 'Watch the guide'),
  nonOra: () => t('Non ora', 'Not now'),
}
