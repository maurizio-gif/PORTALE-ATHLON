import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { apriGuestPassDallApp } from '@/api/guestPass'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { t } from '@/lib/lingua'
import { useColori } from '@/theme'

// «Attiva la prova» da dentro l'app (29/10/2026, richiesta di Maurizio): chi ha gia' un accesso non scrive l'email e non aspetta una
// posta per continuare. Qui non c'e' niente da compilare: si apre la richiesta dalla sessione (`guest-pass`, azione `app_apri`, che
// riprende quella in corso se c'e') e si passa subito a `/r/<codice>`, la stessa procedura del link (per chi, dati, giorno d'inizio,
// pagamento, conferma), che resta dentro l'app. Se il Guest Pass non si puo' avere si dice il perche' (un abbonamento in corso, un
// Guest Pass gia' fatto) e si torna alla Home; se la rete cade si riprova da qui.
//
// Lo mostra `RichiestaGuestPass` a chi ha una sessione (fuori dalla vista cliente): cosi' vale per il pulsante della Home, per il
// link dell'invito di un amico e per un vecchio link a /richiesta/guest-pass.

export function ProvaDallApp({ invito }: { invito?: string | null }) {
  const c = useColori()
  const [giro, setGiro] = useState(0)
  const [errore, setErrore] = useState<{ testo: string; riprovabile: boolean } | null>(null)

  useEffect(() => {
    let vivo = true
    setErrore(null)
    apriGuestPassDallApp(invito).then((r) => {
      if (!vivo) return
      if (r.ok) router.replace(`/r/${r.token}`)
      else setErrore({ testo: r.errore, riprovabile: r.riprovabile })
    })
    return () => {
      vivo = false
    }
  }, [invito, giro])

  if (errore) {
    return (
      <Pagina titolo="Guest Pass">
        <Avviso tono="attenzione">{errore.testo}</Avviso>
        {errore.riprovabile ? <Bottone testo={t('Riprova', 'Try again')} onPress={() => setGiro((g) => g + 1)} /> : null}
        <Bottone testo={t('Torna alla Home', 'Back to Home')} variante={errore.riprovabile ? 'contorno' : 'pieno'} onPress={() => router.replace('/')} />
      </Pagina>
    )
  }
  return (
    <Pagina titolo={t('Apriamo il tuo Guest Pass', 'Opening your Guest Pass')} indietro={false}>
      <View style={{ alignItems: 'flex-start' }}>
        <ActivityIndicator color={c.accento} />
      </View>
      <Testo variante="attenuato">{t('Un attimo: sei già dentro l’app, non serve nessuna email.', 'Just a moment: you’re already in the app, no email needed.')}</Testo>
    </Pagina>
  )
}
