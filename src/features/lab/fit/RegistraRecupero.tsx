import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { aggiungiRecupero } from '@/api/dispositivi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import type { Dispositivi } from '../dispositivi/useDispositivi'
import { Messaggio, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// La registrazione di una sessione di mobilita' o di foam roller (02/11/2026, richiesta di Maurizio): a fine sessione i minuti fatti vanno al server, che li
// somma al giorno e li da' al punteggio di Recover (`calcoloPunteggio.ts`, `quotaRecover`). **Una volta sola per sessione** (la vista nasce a fine sessione e
// l'effetto parte una volta). **Serve il consenso a Recover** (sono dati sulla salute: stesso consenso del sonno); senza, non si registra niente e non si
// mostra niente. **Indipendente dalle abitudini**: non serve seguire «Mobilita'». Se la registrazione non riesce, un messaggio e «Riprova»: la sessione e'
// fatta lo stesso, e non c'e' un obbligo di contarla. Non dice quanti punti da': nessuno spinge a farne di piu'.

export function RegistraRecupero({ tipo, minuti, disp }: { tipo: 'mobilita' | 'rilascio'; minuti: number; disp: Dispositivi }) {
  const p = usePalette()
  const consenso = !!(disp.stato?.ok && disp.stato.consenso)
  const attivo = consenso && !disp.vista && minuti >= 1
  const [esito, setEsito] = useState<'invio' | 'ok' | 'errore' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const fatto = useRef(false)
  const { imposta } = disp

  const registra = useCallback(async () => {
    setEsito('invio')
    setErrore(null)
    const r = await aggiungiRecupero(tipo, minuti)
    if (!r.ok) {
      setErrore(r.errore)
      setEsito('errore')
      return
    }
    imposta(r)
    setEsito('ok')
  }, [tipo, minuti, imposta])

  useEffect(() => {
    if (!attivo || fatto.current) return
    fatto.current = true
    void registra()
  }, [attivo, registra])

  if (!attivo) return null
  if (esito === 'errore')
    return (
      <View style={{ gap: spazio.due }}>
        <Messaggio tono="attenzione">{errore}</Messaggio>
        <Pulsante testo={t('Riprova a registrarla', 'Try logging it again')} variante="secondario" piccolo onPress={() => void registra()} />
      </View>
    )
  if (esito === 'ok') return <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t('Sessione registrata in Recover.', 'Session logged in Recover.')}</Text>
  return null
}

const stili = StyleSheet.create({
  piccola: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
})
