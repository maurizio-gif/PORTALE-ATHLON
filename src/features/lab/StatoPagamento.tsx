import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { configurazioneAdyen, esitoPagamento, STATI_IN_CORSO, statoPagamento, type StatoDelPagamento } from '@/api/lab'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Testo } from '@/components/Testo'
import { useColori } from '@/theme'

import { riprendiDopoRedirect } from './adyen'
import { euro, quando } from './etichettePagamenti'

// La pagina di stato di un pagamento: l'indirizzo porta il riferimento e si
// riapre anche dopo aver chiuso il browser. Ci si arriva dal Drop-in (con
// `sessionId` e `sessionResult`) o dalla 3D Secure (con `sessionId` e
// `redirectResult`, da consegnare ad Adyen).
//
// **Non si fida del browser**: chiede l'esito ad Adyen dal server (azione
// `esito`) e poi segue la riga nel nostro database, aggiornata dal webhook.

type Parametri = { riferimento: string; sessionId?: string; sessionResult?: string; redirectResult?: string }

const TITOLO: Record<string, { titolo: string; testo: string }> = {
  autorizzato: { titolo: 'Pagamento confermato', testo: 'Adyen ha autorizzato il pagamento: la carta è salvata e le prossime rate partono da sole.' },
  rifiutato: { titolo: 'Pagamento rifiutato', testo: 'La banca non ha autorizzato il pagamento. Non è stato addebitato nulla.' },
  scaduto: {
    titolo: 'Ancora in verifica',
    testo: 'La banca non ha ancora risposto. Non è un rifiuto: se il pagamento va a buon fine l’abbonamento si attiva da solo.',
  },
  abbandonato: { titolo: 'Pagamento non completato', testo: 'Il pagamento non è stato completato. Se risultasse addebitato qualcosa, questa pagina si aggiorna da sola.' },
  annullato: { titolo: 'Pagamento annullato', testo: 'Il pagamento è stato annullato.' },
  errore: { titolo: 'Errore tecnico', testo: 'C’è stato un errore tecnico nel pagamento: non risulta addebitato.' },
}

/** Una volta sola per risultato: un ricaricamento non lo consegna due volte. */
function primaVolta(chiave: string): boolean {
  try {
    if (globalThis.sessionStorage?.getItem(chiave)) return false
    globalThis.sessionStorage?.setItem(chiave, '1')
  } catch {
    // senza sessionStorage si prova comunque
  }
  return true
}

export function StatoPagamento() {
  const c = useColori()
  const router = useRouter()
  const { riferimento, sessionId, sessionResult, redirectResult } = useLocalSearchParams<Parametri>()
  const [p, setP] = useState<StatoDelPagamento | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [adyen, setAdyen] = useState<string | null>(null)
  const [nota, setNota] = useState<string | null>(null)
  const avviato = useRef(false)

  const leggi = useCallback(async () => {
    const r = await statoPagamento(riferimento)
    if (r.ok) {
      setP(r.pagamento)
      setErrore(null)
    } else setErrore(r.errore)
  }, [riferimento])

  // Il ritorno: prima l'esito da Adyen (dal server), poi via i parametri
  // dall'indirizzo, cosi' resta quello stabile del riferimento.
  useEffect(() => {
    if (avviato.current) return
    avviato.current = true
    ;(async () => {
      if (sessionId && (sessionResult || redirectResult)) {
        let risultato = sessionResult ?? null
        if (!risultato && redirectResult && primaVolta(`lab-redirect-${redirectResult.slice(0, 40)}`)) {
          try {
            const cfg = await configurazioneAdyen()
            if (!cfg.ok) throw new Error(cfg.errore)
            risultato = await riprendiDopoRedirect({ clientKey: cfg.clientKey, environment: cfg.environment, sessionId, redirectResult })
          } catch (e) {
            setNota(`Non siamo riusciti a riprendere il pagamento dal browser (${e instanceof Error ? e.message : String(e)}). Lo stato qui sotto segue comunque quello che dice Adyen.`)
          }
        }
        if (risultato && primaVolta(`lab-esito-${risultato.slice(0, 40)}`)) {
          const r = await esitoPagamento(riferimento, sessionId, risultato)
          if (r.ok) setAdyen(r.adyen_status)
        }
        router.replace({ pathname: '/lab/pagamenti/[riferimento]', params: { riferimento } })
      }
      await leggi()
    })()
  }, [riferimento, sessionId, sessionResult, redirectResult, router, leggi])

  // Finche' l'esito non e' definitivo si rilegge ogni 5 secondi, per dieci minuti.
  const inCorso = p ? STATI_IN_CORSO.includes(p.stato) : false
  useEffect(() => {
    if (!inCorso) return
    let giri = 0
    const t = setInterval(() => {
      if (++giri > 120) return clearInterval(t)
      leggi()
    }, 5000)
    return () => clearInterval(t)
  }, [inCorso, leggi])

  const indietro = (
    <Link href="/lab/pagamenti" style={{ color: c.accento, fontWeight: '600' }}>
      ‹ Pagamenti
    </Link>
  )

  if (errore && !p) {
    return (
      <Pagina titolo="Pagamento" sottotitolo={errore}>
        <Bottone testo="Riprova" onPress={leggi} />
        {indietro}
      </Pagina>
    )
  }
  if (!p) {
    return (
      <Pagina titolo="Verifichiamo il pagamento…">
        <View style={{ alignItems: 'flex-start' }}>
          <ActivityIndicator color={c.accento} />
        </View>
      </Pagina>
    )
  }

  const tit = inCorso
    ? {
        titolo: 'Verifichiamo il pagamento…',
        testo:
          adyen === 'completed'
            ? 'Adyen dice che il pagamento è andato a buon fine: aspettiamo la conferma ufficiale.'
            : 'La pagina si aggiorna da sola. Puoi anche chiuderla e riaprire questo indirizzo più tardi.',
      }
    : TITOLO[p.stato]
  const tono = p.stato === 'autorizzato' ? 'ok' : inCorso || p.stato === 'scaduto' ? 'attenzione' : 'errore'

  return (
    <Pagina titolo={tit.titolo}>
      <Avviso tono={tono}>{tit.testo}</Avviso>
      {inCorso ? (
        <View style={{ alignItems: 'flex-start' }}>
          <ActivityIndicator color={c.accento} />
        </View>
      ) : null}
      {p.stato === 'rifiutato' && p.motivo ? <Testo variante="attenuato">{`Motivo indicato dalla banca: ${p.motivo}.`}</Testo> : null}
      {nota ? <Testo variante="piccolo">{nota}</Testo> : null}
      <Testo variante="piccolo">
        {[
          p.piano,
          `rata ${p.numero_rata} di ${p.rate_totali}, ${euro(p.importo_cent)}`,
          p.ultime_quattro ? `carta •••• ${p.ultime_quattro}` : null,
          p.stato === 'autorizzato' && p.prossima_il ? `prossima rata ${quando(p.prossima_il)}` : null,
          `riferimento ${p.riferimento}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Testo>
      {indietro}
    </Pagina>
  )
}
