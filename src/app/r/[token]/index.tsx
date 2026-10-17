import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'

import { eTokenAppuntamento, leggiAppuntamento, type Appuntamento, type Calendario, type GiornoPrenotabile } from '@/api/appuntamenti'
import type { PaginaCertificato } from '@/api/certificati'
import { chiamaLink } from '@/api/link'
import { GestioneAppuntamento } from '@/features/appuntamento/GestioneAppuntamento'
import { CaricaCertificatoDaLink } from '@/features/certificato/CaricaDaLink'
import { PrenotaEvento } from '@/features/evento/PrenotaEvento'
import { AttivaGuestPass } from '@/features/guest-pass/AttivaGuestPass'
import { AppuntamentoNonTrovato, GuestPassScaduto, Guasto, InCaricamento, LinkScaduto } from '@/features/link/Stati'
import { GestioneNucleo } from '@/features/metodo-pagamento/GestioneNucleo'
import type { PaginaEvento } from '@/lib/eventi'
import type { PaginaGuestPass } from '@/lib/guestPass'
import type { ContrattoNucleo } from '@/lib/metodoPagamento'

// L'arrivo di ogni link via email: `https://app.athlonroma.it/r/<token>`. Un
// solo prefisso, cosi' i deep link dell'app si registrano una volta (app.json).
//
//   <uuid>.<firma>  ->  appuntamento col desk o col Direttore Tecnico (rotte del CRM)
//   altrimenti      ->  `portale-link` dice di che si tratta: metodo di pagamento, evento, Guest Pass,
//                       certificato medico da caricare

type Stato =
  | { fase: 'carica' }
  | { fase: 'scaduto' }
  | { fase: 'guest-pass-scaduto' }
  | { fase: 'appuntamento-scaduto' }
  | { fase: 'guasto' }
  | { fase: 'metodo_pagamento'; nome: string | null; nomeTitolare: string; evidenziato: number | null; contratti: ContrattoNucleo[] }
  | { fase: 'evento'; nome: string | null; pagina: PaginaEvento }
  | { fase: 'guest_pass'; nome: string | null; pagina: PaginaGuestPass }
  | { fase: 'certificato'; pagina: PaginaCertificato }
  | { fase: 'appuntamento'; calendario: Calendario; appuntamento: Appuntamento; giorni: GiornoPrenotabile[] }

export default function ArrivoDaLink() {
  const { token: grezzo } = useLocalSearchParams<{ token: string }>()
  const token = String(grezzo ?? '')
  const [stato, setStato] = useState<Stato>({ fase: 'carica' })

  const apri = useCallback(async () => {
    setStato({ fase: 'carica' })
    if (eTokenAppuntamento(token)) {
      const letto = await leggiAppuntamento(token)
      if (letto.ok) return setStato({ fase: 'appuntamento', calendario: letto.calendario, appuntamento: letto.appuntamento, giorni: letto.giorni })
      return setStato({ fase: letto.scaduto ? 'appuntamento-scaduto' : 'guasto' })
    }
    const { ok, stato: http, dati } = await chiamaLink(token, 'apri')
    if (http === 404 || dati.scaduto) return setStato({ fase: dati.tipo === 'guest_pass' ? 'guest-pass-scaduto' : 'scaduto' })
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
    if (dati.tipo === 'evento') {
      const { ok: _ok, tipo: _tipo, nome, ...pagina } = dati
      return setStato({ fase: 'evento', nome: nome ?? null, pagina: pagina as unknown as PaginaEvento })
    }
    if (dati.tipo === 'guest_pass') {
      const { ok: _ok, tipo: _tipo, nome, ...pagina } = dati
      return setStato({ fase: 'guest_pass', nome: nome ?? null, pagina: pagina as unknown as PaginaGuestPass })
    }
    if (dati.tipo === 'certificato') {
      const { ok: _ok, tipo: _tipo, ...pagina } = dati
      return setStato({ fase: 'certificato', pagina: pagina as unknown as PaginaCertificato })
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
    case 'guest-pass-scaduto':
      return <GuestPassScaduto />
    case 'appuntamento-scaduto':
      return <AppuntamentoNonTrovato />
    case 'guasto':
      return <Guasto titolo="Non riusciamo ad aprire la pagina adesso" testo="Riprova fra qualche minuto. Se continua, scrivici a desk@athlonroma.it." onRiprova={apri} />
    case 'metodo_pagamento':
      return (
        <GestioneNucleo token={token} nome={stato.nome} nomeTitolare={stato.nomeTitolare} iniziali={stato.contratti} evidenziato={stato.evidenziato} />
      )
    case 'evento':
      return <PrenotaEvento token={token} nome={stato.nome} iniziale={stato.pagina} />
    case 'guest_pass':
      return <AttivaGuestPass token={token} nome={stato.nome} iniziale={stato.pagina} />
    case 'certificato':
      return <CaricaCertificatoDaLink token={token} iniziale={stato.pagina} />
    case 'appuntamento':
      return <GestioneAppuntamento token={token} calendario={stato.calendario} iniziale={stato.appuntamento} giorni={stato.giorni} />
  }
}
