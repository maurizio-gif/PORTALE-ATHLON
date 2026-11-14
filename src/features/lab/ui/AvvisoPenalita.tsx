import type { PenalitaPrenotazioni } from '@/api/lab'
import { locale, t } from '@/lib/lingua'

import { Messaggio } from './kit'

// L'avviso della penalita' per le mancate disdette (14/11/2026): chi accumula 3 assenze in 30 giorni non ha piu' il blocco totale delle
// prenotazioni, ma per 72 ore quelle **in anticipo** sono bloccate, e una lezione si prenota solo da un'ora prima dell'inizio.
//
// **La regola e' del server** (`portale-lab-calendario`): cambia gia' `prenotabile_dal` di ogni lezione per chi e' in penalita', quindi le righe
// del Calendario dicono gia' «Prenotabile da …». Questo componente dice il perche', una volta, in cima. E' uno solo e sta in due posti: sopra i
// giorni del Calendario e in cima alla sezione Prenotazioni della Home.
//
// Senza penalita' (campo assente, null, scaduta) non disegna niente: il caso normale non cambia di un pixel. Se la penalita' scade mentre la
// schermata e' aperta l'avviso resta fino alla prossima lettura, e non serve aggiornarlo da soli.
//
// Tono «attenzione» (ambra), non errore: la persona non ha sbagliato niente adesso, e prenotare si puo' ancora, solo piu' tardi.

/** «martedì 17 novembre» e «14:30», all'ora di Roma. */
function quando(iso: string): { giorno: string; ora: string } {
  const d = new Date(iso)
  return {
    giorno: new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' }).format(d),
    ora: new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Rome' }).format(d),
  }
}

/** Quanto prima dell'inizio si apre la prenotazione: «un’ora» (il caso di oggi), «2 ore», «45 minuti». */
function anticipo(minuti: number): string {
  if (minuti === 60) return t('un’ora', 'one hour')
  if (minuti % 60 === 0) return t(`${minuti / 60} ore`, `${minuti / 60} hours`)
  return t(`${minuti} minuti`, `${minuti} minutes`)
}

/** Vero se la penalita' c'e' ed e' ancora in corso (la data di fine nel futuro, con l'ora del telefono). */
export function penalitaInCorso(penalita: PenalitaPrenotazioni | null | undefined): penalita is PenalitaPrenotazioni {
  return !!penalita && Date.parse(penalita.fino_a) > Date.now()
}

export function AvvisoPenalita({ penalita }: { penalita?: PenalitaPrenotazioni | null }) {
  if (!penalitaInCorso(penalita)) return null
  const fine = quando(penalita.fino_a)
  return (
    <Messaggio
      tono="attenzione"
      icona="orologio"
      titolo={t(`Prenotazioni in anticipo bloccate fino a ${fine.giorno} alle ${fine.ora}`, `Advance bookings are blocked until ${fine.giorno} at ${fine.ora}`)}
    >
      {t(
        `Puoi prenotare una lezione da ${anticipo(penalita.apre_minuti)} prima dell’inizio, solo se c’è un posto libero.`,
        `You can book a class from ${anticipo(penalita.apre_minuti)} before it starts, only if a place is free.`,
      )}
    </Messaggio>
  )
}
