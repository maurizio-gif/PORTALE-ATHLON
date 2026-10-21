import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'

import { leggiInvito } from '@/api/referral'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { RichiestaGuestPass, type Invito } from '@/features/guest-pass/RichiestaGuestPass'

// La pagina pubblica dell'invito di un amico (21/10/2026): `https://app.athlonroma.it/invito/<codice>`, il link che un
// socio manda dall'app (Invita un amico). Senza accesso e senza la cornice dell'app, come /richiesta/guest-pass: e' la
// stessa procedura, con in cima chi ha invitato. Un codice che non vale piu' non ferma niente: la pagina lo dice e si
// puo' chiedere il Guest Pass lo stesso, senza invito.
export default function PaginaInvito() {
  const { codice } = useLocalSearchParams<{ codice: string }>()
  const c = String(codice ?? '').trim().toLowerCase()
  const [invito, setInvito] = useState<Invito | null | undefined>(undefined)

  useEffect(() => {
    let vivo = true
    leggiInvito(c).then((r) => {
      if (vivo) setInvito(r.valido ? { codice: c, nome: r.nome, prezzo: r.prezzo, prezzoPieno: r.prezzoPieno } : null)
    })
    return () => {
      vivo = false
    }
  }, [c])

  if (invito === undefined) {
    return (
      <Pagina titolo="Un attimo…">
        <Testo variante="attenuato">Stiamo aprendo il tuo invito.</Testo>
      </Pagina>
    )
  }
  if (invito === null) {
    return <RichiestaGuestPass avviso="Questo invito non è più valido, ma puoi chiedere lo stesso il Guest Pass: una settimana al club a 19 €." />
  }
  return <RichiestaGuestPass invito={invito} />
}
