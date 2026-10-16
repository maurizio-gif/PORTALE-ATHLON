import { useEffect, useState } from 'react'

import { laMiaArea, type EsitoArea } from '@/api/lab'

import { inMemoria, prendi } from '../../memoria'
import { vistaCorrente } from '../../vista'

// Chi scrive un modulo di Club Life: la persona e' gia' dentro l'app, quindi
// email, nome e cellulare non si chiedono, si precompilano — dalla scheda del
// titolare, la stessa che ha letto la Home. Restano modificabili: il modulo e'
// suo, e un numero cambiato da poco lo corregge lei.
//
// I figli servono al modulo del Direttore Tecnico, che parla di un bambino.
//
// **In vista cliente niente si invia.** Chi guarda dal CRM e' un operatore che
// sfoglia l'app in sola lettura: un modulo mandato da li' partirebbe a nome del
// cliente. `inVista()` lo dice, e i moduli si fermano.

export type Figlio = { nome: string; cognome: string }

export type Identita = {
  email: string
  nome: string
  cognome: string
  telefono: string
  numero: string | null
  figli: Figlio[]
}

export const inVista = () => vistaCorrente() !== null

function daArea(esito: EsitoArea | undefined, emailAccesso?: string | null): Identita {
  const area = esito?.ok ? esito.area : null
  const vuota: Identita = { email: (area?.email || emailAccesso || '').trim().toLowerCase(), nome: '', cognome: '', telefono: '', numero: null, figli: [] }
  if (!area?.trovato) return vuota
  const titolare = area.persone.find((p) => p.member_id === area.titolare) ?? area.persone.find((p) => p.titolare)
  return {
    email: (titolare?.email || area.email || emailAccesso || '').trim().toLowerCase(),
    nome: titolare?.nome ?? '',
    cognome: titolare?.cognome ?? '',
    telefono: titolare?.telefono ?? '',
    numero: titolare?.numero ?? null,
    figli: area.persone.filter((p) => !p.titolare && (p.nome || p.cognome)).map((p) => ({ nome: p.nome ?? '', cognome: p.cognome ?? '' })),
  }
}

/**
 * Chi e', o `null` finche' non si sa. Quasi sempre e' gia' pronto: l'area l'ha
 * letta la Home. Se non lo e', la chiede (una richiesta sola, condivisa), e anche
 * un errore finisce con una risposta: il modulo si apre lo stesso, con l'email
 * dell'accesso e il resto da scrivere.
 */
export function useIdentita(emailAccesso?: string | null): Identita | null {
  const [identita, setIdentita] = useState<Identita | null>(() => {
    const gia = inMemoria<EsitoArea>('area')
    return gia ? daArea(gia, emailAccesso) : null
  })
  useEffect(() => {
    if (identita) return
    let vivo = true
    prendi('area', laMiaArea)
      .then((e) => e, () => undefined)
      .then((e) => vivo && setIdentita(daArea(e, emailAccesso)))
    return () => {
      vivo = false
    }
  }, [identita, emailAccesso])
  return identita
}
