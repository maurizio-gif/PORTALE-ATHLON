import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { esitoSessioneAcquisto, sessioneAcquistoLezione, type SessioneAdyen } from '@/api/lab'
import { InfoAdyen } from '@/components/InfoAdyen'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { DropIn } from './adyen'
import { Messaggio, Pulsante, SchedeInArrivo } from './ui/kit'
import { F, usePalette } from './ui/tema'
import { passaDalTotem } from './totem/passaggio'

// Il pagamento della lezione singola del Baby Nuoto col modulo di Adyen (12/11/2026, richiesta di Maurizio: «non voglio il link: nel web l'embed di Adyen, in app la finestrella
// che si apre»). Come la carta della gara (`CassaGara` in `junior/Gare.tsx`) e lo shop: il server prepara la sessione (`sessione_acquisto`, stesso riferimento `BABY-<n>` del
// link, carta salvata sempre), il modulo sta nella pagina sul web e si apre come finestra nativa nell'app (`DropIn` di `./adyen`), e finito si chiede l'esito al server.
//
// **Non conferma niente**: la conferma e' del webhook, che crea il credito e prenota la lezione. Finito il pagamento si va a `/calendario?acquisto=<id>`, dove la schermata che
// c'era gia' per il link e per la carta salvata aspetta la prenotazione e dice com'e' andata. Il link resta per le build senza l'SDK (`pagamentoDisponibile` falso).

/** Dove si va a pagamento finito: la stessa schermata del ritorno dal link e dalla carta salvata. */
function vaiAlRitorno(acquistoId: string) {
  if (Platform.OS === 'web') window.location.assign(`/calendario?acquisto=${acquistoId}`)
  else router.replace({ pathname: '/calendario', params: { acquisto: acquistoId } })
}

type Esito = { tono: 'errore' | 'attenzione'; titolo: string; testo: string }

export function CassaLezione({ acquistoId, onChiudi }: { acquistoId: string; onChiudi: () => void }) {
  const p = usePalette()
  const [sessione, setSessione] = useState<SessioneAdyen | null>(null)
  const [salva, setSalva] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [esito, setEsito] = useState<Esito | null>(null)
  const [giro, setGiro] = useState(0) // cambia per chiedere una sessione nuova

  useEffect(() => {
    let vivo = true
    setSessione(null)
    setErrore(null)
    setEsito(null)
    ;(async () => {
      // Sul totem ogni pagamento passa dalle tre strade (QR, email, operatore): annullato, non si apre nessun modulo.
      if (!(await passaDalTotem({ cosa: 'carta', percorso: '/calendario' }))) {
        if (vivo) onChiudi()
        return
      }
      const r = await sessioneAcquistoLezione(acquistoId)
      if (!vivo) return
      if (!r.ok) return setErrore(r.errore)
      if ('giaPagata' in r) return vaiAlRitorno(acquistoId)
      setSalva(r.salva)
      setSessione(r)
    })()
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acquistoId, giro])

  // Il modulo di Adyen: finito, qualunque sia l'esito, si chiede al server com'e' andata.
  const fine = useCallback(
    async (risultato: string | null) => {
      const id = sessione?.sessione.id
      let stato: string | null = null
      if (id && risultato) {
        const e = await esitoSessioneAcquisto(acquistoId, id, risultato)
        if (e.ok) stato = e.adyen_status
      }
      if (stato === 'refused') {
        setSessione(null) // il modulo si chiude
        return setEsito({ tono: 'errore', titolo: t('Pagamento rifiutato', 'Payment declined'), testo: t('La banca non ha autorizzato il pagamento. Non è stato addebitato nulla: puoi riprovare con un’altra carta.', 'Your bank didn’t authorize the payment. Nothing was charged: you can try another card.') })
      }
      if (stato === 'canceled' || stato === 'expired') {
        setSessione(null)
        return setEsito({ tono: 'attenzione', titolo: t('Pagamento non completato', 'Payment not completed'), testo: t('Il pagamento non è stato completato. Non è stato addebitato nulla.', 'The payment wasn’t completed. Nothing was charged.') })
      }
      // Ricevuto, in verifica o esito non leggibile: la conferma e' del webhook, e la schermata del ritorno la aspetta.
      vaiAlRitorno(acquistoId)
    },
    [sessione, acquistoId],
  )

  return (
    <View style={{ gap: spazio.tre }}>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {esito ? (
        <Messaggio tono={esito.tono} titolo={esito.titolo}>
          {esito.testo}
        </Messaggio>
      ) : null}
      {sessione ? <DropIn sessione={sessione} onFine={fine} onErrore={setErrore} /> : !errore && !esito ? <SchedeInArrivo quante={1} /> : null}
      {sessione && salva ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t('Pagando, la carta viene salvata in modo sicuro su Adyen: la prossima volta la ritrovi già pronta, senza riscrivere i dati.', 'When you pay, the card is saved securely with Adyen: next time it’s ready, without typing the details again.')}
        </Text>
      ) : null}
      {errore || esito ? <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" onPress={() => setGiro((g) => g + 1)} /> : null}
      <Pulsante testo={t('Indietro', 'Back')} variante="fantasma" piccolo pieno={false} onPress={onChiudi} />
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t('I dati della carta li scrivi nel modulo sicuro di ', 'You enter your card details in the secure form of ')}
        <InfoAdyen />
        {t(': non passano da noi.', ': they don’t pass through us.')}
      </Text>
    </View>
  )
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 20 },
})
