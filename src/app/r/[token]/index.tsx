import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'

import { chiamaLink } from '@/api/link'
import { Guasto, InCaricamento, LinkScaduto } from '@/features/link/Stati'
import { GestioneNucleo } from '@/features/metodo-pagamento/GestioneNucleo'
import type { ContrattoNucleo } from '@/lib/metodoPagamento'

// L'arrivo di ogni link via email: `https://app.athlonroma.it/r/<token>`. Un
// solo prefisso, cosi' i deep link dell'app si registrano una volta (app.json).
// Che operazione sia lo dice `portale-link` leggendo la richiesta, non l'URL.

type Stato =
  | { fase: 'carica' }
  | { fase: 'scaduto' }
  | { fase: 'guasto' }
  | { fase: 'metodo_pagamento'; nome: string | null; nomeTitolare: string; evidenziato: number | null; contratti: ContrattoNucleo[] }

export default function ArrivoDaLink() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const [stato, setStato] = useState<Stato>({ fase: 'carica' })

  const apri = useCallback(async () => {
    setStato({ fase: 'carica' })
    const { ok, stato: http, dati } = await chiamaLink(String(token ?? ''), 'apri')
    if (http === 404 || dati.scaduto) return setStato({ fase: 'scaduto' })
    if (!ok) return setStato({ fase: 'guasto' })
    if (dati.tipo === 'metodo_pagamento') {
      return setStato({
        fase: 'metodo_pagamento',
        nome: dati.nome ?? null,
        nomeTitolare: dati.nomeTitolare ?? '',
        evidenziato: dati.evidenziato ?? null,
        contratti: (dati.contratti ?? []) as ContrattoNucleo[],
      })
    }
    setStato({ fase: 'guasto' })
  }, [token])

  useEffect(() => {
    apri()
  }, [apri])

  switch (stato.fase) {
    case 'carica':
      return <InCaricamento />
    case 'scaduto':
      return <LinkScaduto />
    case 'guasto':
      return (
        <Guasto
          titolo="Non riusciamo a leggere i tuoi abbonamenti"
          testo="Riprova fra qualche minuto. Se continua, scrivici a desk@athlonroma.it."
          onRiprova={apri}
        />
      )
    case 'metodo_pagamento':
      return (
        <GestioneNucleo
          token={String(token)}
          nome={stato.nome}
          nomeTitolare={stato.nomeTitolare}
          iniziali={stato.contratti}
          evidenziato={stato.evidenziato}
        />
      )
  }
}
