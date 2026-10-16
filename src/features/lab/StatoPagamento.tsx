import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from 'react-native-reanimated'

import { configurazioneAdyen, esitoPagamento, STATI_IN_CORSO, statoPagamento, type StatoDelPagamento } from '@/api/lab'
import { spazio } from '@/theme'

import { riprendiDopoRedirect } from './adyen'
import { euro, quando } from './etichettePagamenti'
import { hrefSezione } from './home/sezioni'
import { Icona, type NomeIcona } from './ui/Icona'
import { Carta, Messaggio, Numero, Pulsante, Riga, SchedeInArrivo } from './ui/kit'
import { Schermata } from './ui/Schermata'
import { F, usePalette } from './ui/tema'
import { colpetto } from './ui/Tocco'

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

/** Il cerchio grande dell'esito; finche' si aspetta, un'onda gli pulsa attorno. */
function Esito({ tono, icona, inCorso }: { tono: 'ok' | 'attenzione' | 'errore'; icona: NomeIcona; inCorso: boolean }) {
  const p = usePalette()
  const onda = useSharedValue(0)
  useEffect(() => {
    onda.value = inCorso ? withRepeat(withTiming(1, { duration: 1600 }), -1, false) : 0
  }, [inCorso, onda])
  const stileOnda = useAnimatedStyle(() => ({ opacity: inCorso ? 0.45 * (1 - onda.value) : 0, transform: [{ scale: 1 + onda.value * 0.6 }] }))
  const colori = tono === 'ok' ? (['#34C46A', '#16803C'] as const) : tono === 'errore' ? (['#FF6B5E', '#B3261E'] as const) : (['#F5B33B', '#C27800'] as const)
  return (
    <View style={stili.esito}>
      <Animated.View style={[stili.onda, { backgroundColor: p[tono] }, stileOnda]} />
      <Animated.View entering={ZoomIn.springify().damping(12)}>
        <LinearGradient colors={colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[stili.cerchio, { boxShadow: `0 16px 40px ${colori[1]}55` }]}>
          <Icona nome={icona} size={52} colore="#fff" />
        </LinearGradient>
      </Animated.View>
    </View>
  )
}

export function StatoPagamento() {
  const p = usePalette()
  const router = useRouter()
  const { riferimento, sessionId, sessionResult, redirectResult } = useLocalSearchParams<Parametri>()
  const [pag, setP] = useState<StatoDelPagamento | null>(null)
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
  const inCorso = pag ? STATI_IN_CORSO.includes(pag.stato) : false
  useEffect(() => {
    if (!inCorso) return
    let giri = 0
    const t = setInterval(() => {
      if (++giri > 120) return clearInterval(t)
      leggi()
    }, 5000)
    return () => clearInterval(t)
  }, [inCorso, leggi])

  // Il colpetto quando l'esito arriva: buono o cattivo.
  const stato = pag?.stato
  useEffect(() => {
    if (stato === 'autorizzato') colpetto('ok')
    else if (stato === 'rifiutato' || stato === 'errore') colpetto('errore')
  }, [stato])

  if (errore && !pag) {
    return (
      <Schermata titolo="Pagamento" indietro={hrefSezione('pagamenti')} barra={false}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo="Riprova" icona="aggiorna" onPress={leggi} />
      </Schermata>
    )
  }
  if (!pag) {
    return (
      <Schermata titolo="Verifichiamo il pagamento…" indietro={hrefSezione('pagamenti')} barra={false}>
        <SchedeInArrivo quante={1} />
      </Schermata>
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
    : TITOLO[pag.stato]
  const tono = pag.stato === 'autorizzato' ? 'ok' : inCorso || pag.stato === 'scaduto' ? 'attenzione' : 'errore'
  const icona: NomeIcona = pag.stato === 'autorizzato' ? 'spunta' : tono === 'attenzione' ? 'clessidra' : 'chiudi'
  const righe: { icona: NomeIcona; titolo: string; valore: string }[] = [
    { icona: 'ricevuta', titolo: 'Piano', valore: pag.piano },
    { icona: 'calendario', titolo: 'Rata', valore: `${pag.numero_rata} di ${pag.rate_totali}${pag.tentativo > 1 ? ` · tentativo ${pag.tentativo}` : ''}` },
    ...(pag.ultime_quattro ? [{ icona: 'carta' as const, titolo: 'Carta', valore: `${pag.metodo ? pag.metodo.toUpperCase() + ' ' : ''}•••• ${pag.ultime_quattro}` }] : []),
    ...(pag.stato === 'autorizzato' && pag.prossima_il ? [{ icona: 'rinnovo' as const, titolo: 'Prossima rata', valore: quando(pag.prossima_il) }] : []),
    { icona: 'documento', titolo: 'Riferimento', valore: pag.riferimento },
  ]

  return (
    <Schermata titolo={tit.titolo} nascondiTitolo indietro={hrefSezione('pagamenti')} barra={false}>
      <View style={{ alignItems: 'center', gap: spazio.tre, paddingTop: spazio.tre }}>
        <Esito tono={tono} icona={icona} inCorso={inCorso} />
        <Numero valore={euro(pag.importo_cent).replace(' €', '')} unita="€" size={52} />
        <Text style={[stili.titolo, { color: p.testo }]} accessibilityRole="header">
          {tit.titolo}
        </Text>
        <Text style={[stili.testo, { color: p.testoSecondario }]}>{tit.testo}</Text>
      </View>
      {pag.stato === 'rifiutato' && pag.motivo ? <Messaggio tono="errore" titolo="Motivo indicato dalla banca">{pag.motivo}</Messaggio> : null}
      {nota ? <Messaggio tono="attenzione">{nota}</Messaggio> : null}
      <Carta style={{ paddingVertical: spazio.due }}>
        {righe.map((r, i) => (
          <Riga
            key={r.titolo}
            prima={i === 0}
            icona={r.icona}
            tono="neutro"
            titolo={r.titolo}
            stileTitolo={{ fontSize: 12, fontFamily: F.bold, color: p.testoSecondario }}
            sotto={<Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 15 }}>{r.valore}</Text>}
          />
        ))}
      </Carta>
      <Pulsante testo="Torna ai pagamenti" variante="scuro" icona="avanti" onPress={() => router.replace(hrefSezione('pagamenti'))} />
    </Schermata>
  )
}

const stili = StyleSheet.create({
  esito: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  onda: { position: 'absolute', width: 116, height: 116, borderRadius: 58 },
  cerchio: { width: 116, height: 116, borderRadius: 58, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 26, letterSpacing: -0.8, textAlign: 'center' },
  testo: { fontFamily: F.medio, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 420 },
})
