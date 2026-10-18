import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'

import { leggiSettimana, type DatiLezione, type Settimana } from '@/api/percorso'

import { inMemoria, prendi, ricorda } from '../memoria'
import { chiaveSettimana } from './comune'
import { ricordaSettimana } from './usePercorso'

// La settimana vera del Percorso Athlon: ogni tappa trasformata nella lezione di quel giorno, con i posti, la
// prenotazione del socio (letta da PerfectGym, non dal mirror: dopo un clic il mirror e' indietro), quando si
// apre e se il limite delle prenotazioni la blocca. Dalla memoria del laboratorio: si apre subito con l'ultima
// settimana letta e intanto si rilegge, a ogni ritorno.

type Letta = { ok: true; settimana: Settimana }

/** Dopo un clic la riga si aggiorna subito con quello che ha detto PerfectGym, senza rileggere la settimana. */
function ritocca(d: DatiLezione, classId: number, prenotazione: DatiLezione['prenotazione'], delta: number, deltaAttesa: number): DatiLezione {
  if (d.class_id !== classId) return d
  return { ...d, prenotazione, liberi: Math.max(0, d.liberi - delta), in_attesa: Math.max(0, d.in_attesa + deltaAttesa) }
}

/** Le chiavi del calendario (`giorno:<data>:<socio>`) di un giorno: dopo una prenotazione dal Percorso la sua memoria non vale piu'. */
export function dimenticaGiornoCalendario(data: string, memberId: number) {
  ricorda(`giorno:${data}:${memberId}`, undefined)
  ricorda(`giorno:${data}:`, undefined)
  ricorda('giorno::', undefined)
}

export function useSettimana(lunedi: string, attivo: boolean) {
  const chiave = chiaveSettimana(lunedi)
  const [dati, setDati] = useState<Settimana | null>(() => inMemoria<Letta>(chiave)?.settimana ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  // Cambiando settimana si parte da quella che c'e' in memoria (o da niente), non da quella di prima.
  const [chiaveVista, setChiaveVista] = useState(chiave)
  if (chiaveVista !== chiave) {
    setChiaveVista(chiave)
    setDati(inMemoria<Letta>(chiave)?.settimana ?? null)
    setErrore(null)
  }
  // Una risposta che arriva dopo che si e' cambiata settimana non e' di questa schermata.
  const corrente = useRef(chiave)
  corrente.current = chiave

  const ricarica = useCallback(async () => {
    ricordaSettimana(chiave)
    const r = await prendi(chiave, () => leggiSettimana(lunedi))
    if (corrente.current !== chiave) return
    if (r.ok) {
      setDati(r.settimana)
      setErrore(null)
    } else setErrore(r.errore)
  }, [chiave, lunedi])

  useFocusEffect(
    useCallback(() => {
      if (!attivo) return
      ricarica()
    }, [attivo, ricarica]),
  )

  /** Cambia la prenotazione di una lezione (o di una delle sue alternative, o di uno slot di sala) senza rileggere. */
  const prenotazione = useCallback(
    (classId: number, nuova: DatiLezione['prenotazione'], delta: number, deltaAttesa = 0) => {
      setDati((s) => {
        if (!s) return s
        const nuovo: Settimana = {
          ...s,
          tappe: s.tappe.map((t) => ({
            ...t,
            lezione_vera: t.lezione_vera ? ritocca(t.lezione_vera, classId, nuova, delta, deltaAttesa) : t.lezione_vera,
            alternative: t.alternative?.map((a) => ritocca(a, classId, nuova, delta, deltaAttesa)),
            sala_slot: t.sala_slot?.map((a) => ({ ...ritocca(a, classId, nuova, delta, deltaAttesa), fascia: a.fascia })),
          })),
        }
        ricorda(chiave, { ok: true, settimana: nuovo })
        return nuovo
      })
    },
    [chiave],
  )

  return { settimana: dati, errore, ricarica, prenotazione }
}
