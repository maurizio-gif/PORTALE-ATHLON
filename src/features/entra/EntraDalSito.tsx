import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'

import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { entraConToken, leggiEToglieToken } from '@/features/lab/accessoDalCrm'
import { InCaricamento } from '@/features/link/Stati'
import { supabase } from '@/lib/supabase'
import { t } from '@/lib/lingua'

import { arrivoDa } from './destinazioni'

// L'arrivo da «Prenota» sul sito (04/11/2026): il link dell'email porta qui, con la destinazione nell'indirizzo (`?d=…&a=…`) e l'accesso nel
// frammento (`#th=<token>`). **La pagina non entra da sola**: dice dove sta per portare e chiede un tocco. I programmi che aprono i link delle
// email per controllarli non toccano i bottoni, e l'accesso e' monouso: bruciato da un controllo, la persona troverebbe «link non valido».
//
// Il token si legge e si toglie dall'indirizzo subito (la cronologia non lo tiene) e si usa solo dopo il tocco. **Qui non si usa `useSessione`**:
// quel gancio consuma da solo un `#th=` che trova (e' l'accesso dal CRM), cioe' bruciava il token prima del tocco. Per sapere se c'e' gia' una
// sessione si chiede a Supabase direttamente.
//
// Casi, nell'ordine:
//   - il link ha un token         ->  il tocco lo consuma (sostituisce l'eventuale sessione: il link e' dell'indirizzo a cui e' arrivato) e porta alla destinazione;
//   - nessun token, ma sessione   ->  si va dritti alla destinazione (ricaricata la pagina, o link gia' usato da chi e' ancora dentro);
//   - nessun token, nessuna sessione, o token che non vale piu'  ->  «link non valido» e la strada per entrare con l'email.
// Una destinazione che non e' in lista (`destinazioni.ts`) porta alla Home. I nuovi, dopo l'accesso, passano da «Completa il profilo» del layout.

export function EntraDalSito({ d, attivita, giorno, piano, figlio }: { d: string; attivita?: string; giorno?: string; piano?: string; figlio?: string }) {
  const arrivo = arrivoDa(d, attivita, giorno, undefined, piano, figlio)
  const token = useRef<string | null | undefined>(undefined)
  const [fase, setFase] = useState<'carica' | 'tocco' | 'scaduto'>('carica')
  const [attesa, setAttesa] = useState(false)

  useEffect(() => {
    // Una volta sola, anche con il doppio montaggio dello sviluppo: la seconda lettura non troverebbe piu' niente.
    if (token.current === undefined) token.current = leggiEToglieToken()
    let vivo = true
    ;(async () => {
      if (token.current) return vivo && setFase('tocco')
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      if (!vivo) return
      if (data.session) router.replace(arrivo?.href ?? '/')
      else setFase('scaduto')
    })()
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function apri() {
    if (!token.current) return setFase('scaduto')
    setAttesa(true)
    const dentro = await entraConToken(token.current)
    token.current = null
    if (dentro) return router.replace(arrivo?.href ?? '/')
    setAttesa(false)
    setFase('scaduto')
  }

  if (fase === 'carica') return <InCaricamento testo={t('Un attimo…', 'Just a moment…')} />

  if (fase === 'scaduto') {
    return (
      <Pagina titolo={t('Questo link non è più valido', 'This link is no longer valid')} indietro={false}>
        <Testo>
          {t(
            'Il link vale un’ora e si usa una volta sola. Per entrare basta la tua email: ti mandiamo un codice, senza password.',
            'The link is valid for one hour and works once. To sign in all you need is your email: we’ll send you a code, no password needed.',
          )}
        </Testo>
        <Bottone testo={t('Entra con la tua email', 'Sign in with your email')} onPress={() => router.replace('/')} />
      </Pagina>
    )
  }

  return (
    <Pagina titolo={arrivo?.titolo ?? t('Entra in Athlon Club', 'Sign in to Athlon Club')} sottotitolo={arrivo?.testo ?? t('Ti portiamo nell’app, senza password.', 'We’ll take you to the app, no password needed.')} indietro={false}>
      <Bottone testo={arrivo?.bottone ?? t('Entra nell’app', 'Open the app')} onPress={apri} inCorso={attesa} />
      <Testo variante="attenuato">
        {t(
          'Il link si usa una volta sola. Se non sei stato tu a chiederlo, chiudi la pagina: senza il tocco non succede niente.',
          'The link can only be used once. If you didn’t request it, just close this page: nothing happens without your tap.',
        )}
      </Testo>
    </Pagina>
  )
}
