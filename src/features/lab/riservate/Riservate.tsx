import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Platform, StyleSheet, Text, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native'

import { accessoRiservate } from '@/api/abbonamento'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { SchermataInArrivo } from '../ui/Attesa'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Carta, Pulsante } from '../ui/kit'
import { F, FUOCO, usePalette, velo } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { apriRiservata, chiudiRiservata, impostaAccesso, leggiRiservate, sezioniChiuse, useStatoRiservate, type SezioneRiservata } from './store'

// Le sezioni riservate (05/11/2026, richiesta di Maurizio). Athlon Health System e Athlon TV sono di chi ha un **abbonamento principale attivo**
// (suo: standard, omaggio, Employee anche a quota zero, Guest Pass in corso; non un aggiuntivo, non un corso Junior). Chi non ce l'ha
// **le vede lo stesso**, nella barra e con tutto il contenuto in vista (l'anteprima), e **al primo tocco su qualcosa** legge il modal: con il
// Guest Pass se puo' attivarlo (prezzo dal server), «Attiva un abbonamento» se no. Il server rifiuta comunque le azioni riservate
// (`_shared/riservate.ts` di APP-ATHLON): il modal non e' l'unica porta chiusa.
//
//   - `useSezioniChiuse`: legge lo stato (`accesso` di portale-abbonamento) all'apertura della schermata, con un minuto di freschezza;
//   - `Anteprima`: avvolge il contenuto; se le sezioni sono chiuse prende per se' ogni tocco (lo scorrimento resta) e apre il modal;
//   - `AvvisoAnteprima`: la carta in cima che dice che e' un'anteprima;
//   - `Cancello`: per gli indirizzi interni (`/allenamento/agente`, un video di Athlon TV): il modal e indietro alla sezione;
//   - `ModalRiservata`: il foglio, montato una volta nel layout.

const FRESCHEZZA_MS = 60_000
let inVolo: Promise<void> | null = null

function rileggi() {
  if (inVolo || Date.now() - leggiRiservate().lettoIl < FRESCHEZZA_MS) return
  inVolo = accessoRiservate()
    .then(impostaAccesso)
    .catch(() => undefined)
    .finally(() => {
      inVolo = null
    })
}

/** Le due sezioni sono chiuse per chi e' dentro? Falso finche' il server non l'ha detto (e con una funzione di prima): si apre come prima. */
export function useSezioniChiuse(): boolean {
  const s = useStatoRiservate()
  // A ogni ritorno sulla schermata: chi ha appena attivato il Guest Pass o un abbonamento non deve restare davanti all'anteprima.
  useFocusEffect(useCallback(() => rileggi(), []))
  return sezioniChiuse(s)
}

/** Un tocco e non uno scorrimento: il dito si e' mosso poco. */
const SOGLIA_TOCCO = 10
/** Solo sul web (React Native non lo tipizza sulle viste). */
const SENZA_SELEZIONE = (Platform.OS === 'web' ? { userSelect: 'none' } : {}) as ViewStyle

/**
 * Il contenuto di una sezione riservata. Con le sezioni aperte non fa niente. Chiuse, **prende per se' ogni tocco** prima dei pulsanti che
 * avvolge (`onStartShouldSetResponderCapture`): nessuno parte, e al rilascio si apre il modal. Lo scorrimento no: quando la lista scorre il
 * sistema toglie il tocco a questa vista (sul telefono lo scorrimento e' nativo, sul web React Native Web chiude il tocco allo `scroll`), e
 * il modal non si apre. `style` e' quello del contenitore che prende il posto (lo spazio fra le carte). Si usa per parti della schermata, cosi' quello che resta fuori (le schede Train, Food, Recover) si tocca come sempre.
 */
export function Anteprima({ sezione, style, children }: { sezione: SezioneRiservata; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const chiuse = useSezioniChiuse()
  const inizio = useRef<{ x: number; y: number } | null>(null)
  // La stessa vista nei due casi (con lo stesso `style`, cioe' lo spazio fra le carte che avvolge): cambia solo chi prende il tocco.
  if (!chiuse) return <View style={style}>{children}</View>
  const punto = (e: GestureResponderEvent) => ({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })
  return (
    <View
      onStartShouldSetResponderCapture={() => true}
      onResponderGrant={(e) => {
        inizio.current = punto(e)
      }}
      onResponderRelease={(e) => {
        const a = inizio.current
        const b = punto(e)
        inizio.current = null
        if (a && Math.abs(a.x - b.x) < SOGLIA_TOCCO && Math.abs(a.y - b.y) < SOGLIA_TOCCO) apriRiservata(sezione)
      }}
      onResponderTerminate={() => {
        inizio.current = null
      }}
      onResponderTerminationRequest={() => true}
      // Sul web un tocco sul testo seleziona e React Native Web chiude il tocco senza rilascio: niente modal. In anteprima il testo non si seleziona.
      style={[style, SENZA_SELEZIONE]}
    >
      {children}
    </View>
  )
}

/** In cima alla sezione chiusa: e' un'anteprima, e come si entra. Niente con le sezioni aperte. */
export function AvvisoAnteprima({ sezione }: { sezione: SezioneRiservata }) {
  const p = usePalette()
  const chiuse = useSezioniChiuse()
  if (!chiuse) return null
  return (
    <Carta piatta style={[stili.avviso, { backgroundColor: velo(p, 'accento', 0.1), borderColor: velo(p, 'accento', 0.35) }]}>
      <View style={stili.testata}>
        <Icona nome="lucchetto" size={18} colore={p.accento} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.titoloAvviso, { color: p.testo }]}>{t('Stai guardando un’anteprima', 'You’re looking at a preview')}</Text>
          <Text style={[stili.sotto, { color: p.testoSecondario }]}>
            {sezione === 'tv'
              ? t('Athlon TV è riservata a chi ha un abbonamento attivo.', 'Athlon TV is for members with an active membership.')
              : t('Athlon Health System è riservato a chi ha un abbonamento attivo.', 'Athlon Health System is for members with an active membership.')}
          </Text>
        </View>
      </View>
      <Pulsante testo={t('Come accedere', 'How to get access')} variante="contorno" piccolo pieno={false} onPress={() => apriRiservata(sezione)} />
    </Carta>
  )
}

/**
 * Un indirizzo interno di una sezione riservata (un piano, il diario, un video), aperto da un link, dall'assistente, dal messaggio della
 * Home o a freddo: con le sezioni chiuse non si disegna. Si apre il modal e si torna indietro, o alla sezione se non c'e' un indietro.
 */
export function Cancello({ sezione, children }: { sezione: SezioneRiservata; children: ReactNode }) {
  const chiuse = useSezioniChiuse()
  useEffect(() => {
    if (!chiuse) return
    apriRiservata(sezione)
    if (router.canGoBack()) router.back()
    else router.replace(sezione === 'tv' ? '/tv' : '/allenamento')
  }, [chiuse, sezione])
  if (chiuse) return <SchermataInArrivo />
  return <>{children}</>
}

/** La sezione di un indirizzo del portale (il nome della rotta nel gruppo `(portale)`), se e' una pagina interna riservata. */
export function sezioneDiRotta(nome: string): SezioneRiservata | null {
  if (nome.startsWith('allenamento/') && nome !== 'allenamento/index') return 'salute'
  if (nome === 'tv/[raccolta]/[video]') return 'tv'
  return null
}

const prezzoDi = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','))

/** Il modal: montato una volta nel layout, si apre da `apriRiservata`. */
export function ModalRiservata() {
  const p = usePalette()
  const s = useStatoRiservate()
  const sezione = s.modal
  const gp = s.accesso?.guest_pass ?? null
  const inVista = Boolean(vistaCorrente())
  const vai = (dove: '/richiesta/guest-pass' | '/abbonamento') => {
    chiudiRiservata()
    router.push(dove)
  }
  return (
    <Foglio
      aperto={sezione !== null}
      titolo={t('Riservato a chi ha un abbonamento attivo', 'For members with an active membership')}
      onChiudi={chiudiRiservata}
    >
      <View style={stili.corpo}>
        <View style={[stili.bollo, { backgroundColor: velo(p, 'accento', 0.14) }]}>
          <Icona nome="lucchetto" size={22} colore={p.accento} />
        </View>
        <Text style={[stili.testo, { color: p.testoSecondario }]}>
          {sezione === 'tv'
            ? t('I video di Athlon TV sono compresi nell’abbonamento al club, come Athlon Health System.', 'Athlon TV videos are included in the club membership, like Athlon Health System.')
            : t('Athlon Health System, con i piani, Food e Recover, è compreso nell’abbonamento al club, come Athlon TV.', 'Athlon Health System, with plans, Food and Recover, is included in the club membership, like Athlon TV.')}
        </Text>
        {inVista ? (
          <Text style={[stili.testo, { color: p.testoSecondario }]}>
            {gp
              ? t('Il cliente può attivare un Guest Pass o un abbonamento dalla sua app.', 'The client can activate a Guest Pass or a membership from their app.')
              : t('Il cliente può attivare un abbonamento dalla sua app.', 'The client can activate a membership from their app.')}
          </Text>
        ) : gp ? (
          <>
            <View style={[stili.prova, { backgroundColor: p.carbone }]}>
              <Text style={stili.provaTitolo}>{t(`Guest Pass di 7 giorni a ${prezzoDi(gp.prezzo)} €`, `7-day Guest Pass for €${prezzoDi(gp.prezzo)}`)}</Text>
              <Text style={stili.provaTesto}>
                {t(
                  'Prova tutto il club per una settimana: sala, corsi, vasche, Athlon Health System e Athlon TV. Una volta sola, senza rinnovo.',
                  'Try the whole club for a week: gym, classes, pools, Athlon Health System and Athlon TV. One-off, no renewal.',
                )}
              </Text>
            </View>
            <Pulsante testo={t('Attiva il Guest Pass', 'Activate the Guest Pass')} icona="avanti" onPress={() => vai('/richiesta/guest-pass')} />
            <Pulsante testo={t('Iscriviti ora', 'Join now')} variante="secondario" onPress={() => vai('/abbonamento')} />
          </>
        ) : (
          <Pulsante testo={t('Attiva un abbonamento', 'Get a membership')} icona="avanti" onPress={() => vai('/abbonamento')} />
        )}
      </View>
    </Foglio>
  )
}

const stili = StyleSheet.create({
  avviso: { gap: spazio.tre, borderWidth: 1 },
  testata: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre - 2 },
  titoloAvviso: { fontFamily: F.extra, fontSize: 15.5, lineHeight: 20, letterSpacing: -0.2 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  corpo: { gap: spazio.tre },
  bollo: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  testo: { fontFamily: F.medio, fontSize: 15, lineHeight: 21 },
  prova: { borderRadius: 20, padding: spazio.quattro - 4, gap: 6 },
  provaTitolo: { fontFamily: F.extra, fontSize: 19, lineHeight: 24, letterSpacing: -0.4, color: FUOCO[0] },
  provaTesto: { fontFamily: F.medio, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.82)' },
})
