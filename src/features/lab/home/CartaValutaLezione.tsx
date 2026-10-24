import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { lezioniDaValutare, valutaLezione, type LezioneDaValutare } from '@/api/lab'
import { spazio } from '@/theme'
import { locale, t } from '@/lib/lingua'

import { Carta, Entra } from '../ui/kit'
import { F, FUOCO, usePalette } from '../ui/tema'
import { colpetto, Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'

// Le stelle alle lezioni (24/10/2026, richiesta di Maurizio): sotto «Da fare», una carta chiede «com'e' andata?» per la
// lezione piu' recente a cui la reception ha segnato la presenza, negli ultimi 7 giorni e senza ancora un voto. Un tocco su
// una stella da 1 a 5 salva (niente «Invia»: un passaggio in piu' e' un voto in meno) e la carta passa alla lezione dopo, se ce
// n'e'. Solo le stelle: nessun testo libero. «Non ora» la nasconde per questa apertura dell'app, senza segnare niente.
//
// Quali lezioni, e se il voto vale, lo decide la funzione (`portale-lab-calendario`, azioni `da_valutare` e `valuta`): qui si
// mostra quello che torna. Se la funzione e' di prima, o non risponde, la carta non compare. In vista cliente non c'e' e
// non si chiama niente: chi guarda l'app di un socio non vota al suo posto.

/** Le lezioni che la persona ha scelto di rimandare, per questa apertura dell'app (solo in memoria). */
const rimandate = new Set<number>()

const STELLA = 'M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z'

function Stella({ piena, size, colore, vuota }: { piena: boolean; size: number; colore: string; vuota: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STELLA} fill={piena ? colore : 'none'} stroke={piena ? colore : vuota} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  )
}

/** «oggi alle 18:30», «ieri alle 18:30», «martedì alle 18:30»: il giorno e' quello di Roma. */
export function quandoLezione(inizio: string, adesso: Date = new Date()): string {
  const roma = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
  const d = new Date(inizio)
  const ora = d.toLocaleTimeString(locale(), { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' })
  const giorno = roma(d)
  if (giorno === roma(adesso)) return t(`oggi alle ${ora}`, `today at ${ora}`)
  if (giorno === roma(new Date(adesso.getTime() - 86_400_000))) return t(`ieri alle ${ora}`, `yesterday at ${ora}`)
  const nome = d.toLocaleDateString(locale(), { timeZone: 'Europe/Rome', weekday: 'long' })
  return t(`${nome} alle ${ora}`, `${nome} at ${ora}`)
}

const ETICHETTE_IT = ['Per niente', 'Poco', 'Così così', 'Bene', 'Ottima']
const ETICHETTE_EN = ['Not at all', 'Not much', 'So-so', 'Good', 'Great']

export function CartaValutaLezione() {
  const p = usePalette()
  const [lezioni, setLezioni] = useState<LezioneDaValutare[] | null>(null)
  const [scelta, setScelta] = useState<number | null>(null)
  const [ringrazia, setRingrazia] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const vivo = useRef(true)

  useEffect(() => {
    vivo.current = true
    if (!vistaCorrente()) {
      lezioniDaValutare().then((r) => {
        if (vivo.current && r) setLezioni(r.filter((x) => !rimandate.has(x.class_id)))
      })
    }
    return () => {
      vivo.current = false
    }
  }, [])

  const corrente = lezioni?.[0]
  if (!corrente) return null

  const vota = async (stelle: number) => {
    if (inCorso) return
    setScelta(stelle)
    setErrore(null)
    setInCorso(true)
    const r = await valutaLezione(corrente.class_id, stelle)
    if (!vivo.current) return
    setInCorso(false)
    if (!r.ok) {
      setScelta(null)
      setErrore(r.errore)
      colpetto('errore')
      return
    }
    colpetto('ok')
    setRingrazia(true)
    // Il grazie resta un attimo, poi la lezione dopo (se c'e') o niente.
    setTimeout(() => {
      if (!vivo.current) return
      setLezioni((prima) => (prima ?? []).filter((x) => x.class_id !== corrente.class_id))
      setScelta(null)
      setRingrazia(false)
    }, 1400)
  }

  const rimanda = () => {
    rimandate.add(corrente.class_id)
    setLezioni((prima) => (prima ?? []).filter((x) => x.class_id !== corrente.class_id))
    setScelta(null)
    setErrore(null)
  }

  const etichette = t(ETICHETTE_IT.join('|'), ETICHETTE_EN.join('|')).split('|')
  const quando = quandoLezione(corrente.inizio)

  return (
    <Entra indice={2}>
      <Carta>
        {ringrazia ? (
          <View style={stili.grazie} accessibilityLiveRegion="polite">
            <Text style={[stili.titolo, { color: p.testo }]}>{t('Grazie del voto!', 'Thanks for your rating!')}</Text>
            <Text style={[stili.sotto, { color: p.testoSecondario }]}>{t('Ci aiuta a far crescere le lezioni.', 'It helps us make the classes better.')}</Text>
          </View>
        ) : (
          <View style={stili.corpo}>
            <View style={stili.testi}>
              <Text style={[stili.occhiello, { color: FUOCO[0] }]}>{t('COM’È ANDATA?', 'HOW WAS IT?')}</Text>
              <Text style={[stili.titolo, { color: p.testo }]}>{corrente.nome}</Text>
              <Text style={[stili.sotto, { color: p.testoSecondario }]}>
                {quando}
                {corrente.istruttore ? ` · ${corrente.istruttore}` : ''}
              </Text>
            </View>
            <View style={stili.stelle} accessibilityRole="radiogroup" accessibilityLabel={t('Da 1 a 5 stelle', 'From 1 to 5 stars')}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Tocco
                  key={n}
                  onPress={() => vota(n)}
                  spento={inCorso}
                  scala={0.9}
                  vibra="scelta"
                  ruolo="radio"
                  etichetta={t(`${n} ${n === 1 ? 'stella' : 'stelle'}: ${etichette[n - 1]}`, `${n} ${n === 1 ? 'star' : 'stars'}: ${etichette[n - 1]}`)}
                  stato={{ selected: scelta !== null && n <= scelta, disabled: inCorso }}
                  style={stili.bersaglio}
                >
                  <Stella piena={scelta !== null && n <= scelta} size={34} colore={FUOCO[0]} vuota={p.testoTerzo} />
                </Tocco>
              ))}
            </View>
            {errore ? <Text style={[stili.errore, { color: p.errore }]}>{errore}</Text> : null}
            <Tocco onPress={rimanda} ruolo="button" etichetta={t('Non ora', 'Not now')} style={stili.rimanda}>
              <Text style={[stili.rimandaTesto, { color: p.testoTerzo }]}>{t('Non ora', 'Not now')}</Text>
            </Tocco>
          </View>
        )}
      </Carta>
    </Entra>
  )
}

const stili = StyleSheet.create({
  corpo: { gap: spazio.tre },
  testi: { gap: 3 },
  occhiello: { fontFamily: F.extra, fontSize: 12, letterSpacing: 1.2 },
  titolo: { fontFamily: F.extra, fontSize: 20, lineHeight: 24, letterSpacing: -0.5 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  stelle: { flexDirection: 'row', gap: 4 },
  bersaglio: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  errore: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
  rimanda: { alignSelf: 'flex-start', paddingVertical: 4 },
  rimandaTesto: { fontFamily: F.medio, fontSize: 13.5 },
  grazie: { gap: 4, paddingVertical: spazio.due },
})
