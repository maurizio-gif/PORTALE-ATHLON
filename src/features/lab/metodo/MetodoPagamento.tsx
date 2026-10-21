import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { tokenMetodoPagamento } from '@/api/lab'
import { chiamaLink } from '@/api/link'
import { t } from '@/lib/lingua'
import { GestioneNucleo } from '@/features/metodo-pagamento/GestioneNucleo'
import type { ContrattoNucleo } from '@/lib/metodoPagamento'

import { hrefSezione } from '../home/sezioni'
import { Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'

// Pagamenti -> Metodo di pagamento (16/10/2026): la procedura del link per
// email (GestioneNucleo: gli abbonamenti del nucleo, IBAN o carta, salvati su
// PerfectGym), dentro il laboratorio. Il socio e' gia' entrato: il token lo
// apre portale-lab-pagamenti, senza email. Dalla carta si torna nell'app:
// /metodo-pagamento/fatto/<token> (portale-link, richieste con origine 'app': lo manda
// ancora come /lab/metodo-pagamento/fatto/<token>, e vercel.json lo reindirizza).

/** La cornice del laboratorio per le schermate del metodo di pagamento (anche il ritorno dalla carta). */
export function CorniceLab({ titolo, children }: { titolo: string; children: ReactNode; indietro?: boolean }) {
  return (
    <Schermata sopratitolo={t('Pagamenti', 'Payments')} titolo={titolo} indietro={hrefSezione('pagamenti')} barra={false}>
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
    const tok = await tokenMetodoPagamento()
    if (!tok.ok) return setStato({ fase: 'errore', errore: tok.errore })
    const { ok, dati } = await chiamaLink(tok.token, 'apri')
    if (!ok || dati.tipo !== 'metodo_pagamento') return setStato({ fase: 'errore', errore: t('Non riusciamo a leggere i tuoi abbonamenti adesso. Riprova fra qualche minuto.', 'We can’t read your memberships right now. Try again in a few minutes.') })
    setStato({ fase: 'pronto', token: tok.token, nome: dati.nome ?? null, nomeTitolare: dati.nomeTitolare ?? '', contratti: (dati.contratti ?? []) as ContrattoNucleo[] })
  }, [])

  useEffect(() => {
    apri()
  }, [apri])

  if (stato.fase === 'pronto') {
    return <GestioneNucleo Cornice={CorniceLab} token={stato.token} nome={stato.nome} nomeTitolare={stato.nomeTitolare} iniziali={stato.contratti} />
  }
  return (
    <CorniceLab titolo={t('Metodo di pagamento', 'Payment method')}>
      {stato.fase === 'errore' ? (
        <>
          <Messaggio>{stato.errore}</Messaggio>
          <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={apri} />
        </>
      ) : (
        <SchedeInArrivo quante={2} />
      )}
    </CorniceLab>
  )
}
