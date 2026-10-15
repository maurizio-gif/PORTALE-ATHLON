import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { tokenMetodoPagamento } from '@/api/lab'
import { chiamaLink } from '@/api/link'
import { GestioneNucleo } from '@/features/metodo-pagamento/GestioneNucleo'
import type { ContrattoNucleo } from '@/lib/metodoPagamento'

import { Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'

// Pagamenti -> Metodo di pagamento (16/10/2026): la procedura del link per
// email (GestioneNucleo: gli abbonamenti del nucleo, IBAN o carta, salvati su
// PerfectGym), dentro il laboratorio. Il socio e' gia' entrato: il token lo
// apre portale-lab-pagamenti, senza email. La carta torna a /r/<token>/fatto,
// come dal link.

function Cornice({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <Schermata sopratitolo="Pagamenti" titolo={titolo} indietro="/lab/pagamenti" barra={false}>
      {children}
    </Schermata>
  )
}

type Stato =
  | { fase: 'carica' }
  | { fase: 'errore'; errore: string }
  | { fase: 'pronto'; token: string; nome: string | null; nomeTitolare: string; contratti: ContrattoNucleo[] }

export function MetodoPagamento() {
  const [stato, setStato] = useState<Stato>({ fase: 'carica' })

  const apri = useCallback(async () => {
    setStato({ fase: 'carica' })
    const t = await tokenMetodoPagamento()
    if (!t.ok) return setStato({ fase: 'errore', errore: t.errore })
    const { ok, dati } = await chiamaLink(t.token, 'apri')
    if (!ok || dati.tipo !== 'metodo_pagamento') return setStato({ fase: 'errore', errore: 'Non riusciamo a leggere i tuoi abbonamenti adesso. Riprova fra qualche minuto.' })
    setStato({ fase: 'pronto', token: t.token, nome: dati.nome ?? null, nomeTitolare: dati.nomeTitolare ?? '', contratti: (dati.contratti ?? []) as ContrattoNucleo[] })
  }, [])

  useEffect(() => {
    apri()
  }, [apri])

  if (stato.fase === 'pronto') {
    return <GestioneNucleo Cornice={Cornice} token={stato.token} nome={stato.nome} nomeTitolare={stato.nomeTitolare} iniziali={stato.contratti} />
  }
  return (
    <Cornice titolo="Metodo di pagamento">
      {stato.fase === 'errore' ? (
        <>
          <Messaggio>{stato.errore}</Messaggio>
          <Pulsante testo="Riprova" icona="aggiorna" onPress={apri} />
        </>
      ) : (
        <SchedeInArrivo quante={2} />
      )}
    </Cornice>
  )
}
