import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { gruppiJunior, type EsitoGruppi } from '@/api/junior'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Bollino, Carta, Etichetta, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { Tocco } from '../ui/Tocco'
import { F, usePalette, velo } from '../ui/tema'
import { annateGruppo, annoIniziale, anniDisponibili, conPosto, gruppiDellAnno, statoPosti, titoloGruppo } from './comune'

// La sezione Junior (21/10/2026, richiesta di Maurizio): tutti i gruppi dei corsi per bambini e ragazzi attivi adesso
// (Scuola Nuoto mono e bisettimanale, Nuoto Agonistico e Propaganda, Pallanuoto), divisi per anno di nascita, con i
// posti che restano. Un gruppo che accoglie piu' anni («(2015-14-13)») compare sotto ognuno.
//
// Si legge e basta: per ora da qui non ci si iscrive. I numeri sono quelli del mirror di PerfectGym (si aggiornano ogni
// pochi minuti), e l'ultima parola sui posti e' della segreteria al momento dell'iscrizione: la schermata lo dice.

export const CHIAVE_GRUPPI_JUNIOR = 'junior:gruppi'

export function Junior() {
  const p = usePalette()
  const { anno: chiesto } = useLocalSearchParams<{ anno?: string }>()
  const [esito, setEsito] = useState<EsitoGruppi | undefined>(() => inMemoria<EsitoGruppi>(CHIAVE_GRUPPI_JUNIOR))
  const [anno, setAnno] = useState<number | null>(null)
  const [soloLiberi, setSoloLiberi] = useState(false)

  const carica = useCallback(async () => {
    setEsito(await prendi(CHIAVE_GRUPPI_JUNIOR, gruppiJunior))
  }, [])
  useEffect(() => {
    carica()
  }, [carica])

  const gruppi = esito?.ok ? esito.gruppi : []
  const anni = useMemo(() => anniDisponibili(gruppi), [gruppi])
  const scelto = anno != null && anni.includes(anno) ? anno : annoIniziale(anni, chiesto)
  const blocchi = useMemo(() => (scelto == null ? [] : gruppiDellAnno(gruppi, scelto, soloLiberi)), [gruppi, scelto, soloLiberi])

  const intestazione = {
    titolo: 'Junior',
    sopratitolo: 'Corsi per bambini e ragazzi',
    indietro: '/' as const,
    barra: false,
  }

  if (!esito) {
    return (
      <Schermata {...intestazione}>
        <SchedeInArrivo quante={3} />
      </Schermata>
    )
  }

  if (!esito.ok) {
    return (
      <Schermata {...intestazione}>
        <Messaggio>{esito.errore}</Messaggio>
        <Pulsante testo="Riprova" icona="aggiorna" variante="secondario" onPress={carica} />
      </Schermata>
    )
  }

  if (!anni.length) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo="Nessun gruppo attivo">
          In questo momento non ci sono gruppi dei corsi junior aperti.
        </Messaggio>
      </Schermata>
    )
  }

  return (
    <Schermata {...intestazione} sottotitolo="I gruppi attivi e i posti ancora liberi. Scegli l’anno di nascita.">
      <View style={{ gap: spazio.due }}>
        <Text style={[stili.filtriTitolo, { color: p.testoSecondario }]} accessibilityRole="header">
          Anno di nascita
        </Text>
        <View style={stili.tessere}>
          {anni.map((a) => {
            const attivo = a === scelto
            const n = conPosto(gruppi, a)
            return (
              <Tocco
                key={a}
                vibra="scelta"
                stato={{ selected: attivo }}
                onPress={() => setAnno(a)}
                etichetta={`Nati nel ${a}, ${n} ${n === 1 ? 'gruppo' : 'gruppi'} con posti liberi`}
                style={[
                  stili.tessera,
                  {
                    backgroundColor: attivo ? velo(p, 'accento', p.scuro ? 0.16 : 0.1) : p.carta,
                    borderColor: attivo ? p.accento : p.linea,
                    borderWidth: attivo ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[stili.anno, { color: n ? p.testo : p.testoTerzo, fontFamily: attivo ? F.extra : F.bold }]}>{a}</Text>
              </Tocco>
            )
          })}
        </View>
        <Tocco
          vibra="scelta"
          stato={{ selected: soloLiberi }}
          onPress={() => setSoloLiberi((v) => !v)}
          etichetta="Mostra solo i gruppi con posti liberi"
          style={[
            stili.interruttore,
            { backgroundColor: soloLiberi ? velo(p, 'accento', p.scuro ? 0.16 : 0.1) : p.carta, borderColor: soloLiberi ? p.accento : p.linea },
          ]}
        >
          <View style={[stili.casella, { borderColor: soloLiberi ? p.accento : p.testoTerzo, backgroundColor: soloLiberi ? p.accento : 'transparent' }]}>
            {soloLiberi ? <Text style={stili.spunta}>✓</Text> : null}
          </View>
          <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 14 }}>Solo i gruppi con posti liberi</Text>
        </Tocco>
      </View>

      {blocchi.length ? (
        blocchi.map((b) => (
          <Sezione key={b.corso} titolo={b.corso}>
            <Carta>
              {b.gruppi.map((g, i) => {
                const s = statoPosti(g)
                return (
                  <Riga
                    key={g.id}
                    prima={i === 0}
                    testa={<Bollino icona="goccia" tono={s.tono === 'neutro' ? 'neutro' : 'blu'} size={40} />}
                    titolo={titoloGruppo(g)}
                    sotto={g.posti != null ? `${annateGruppo(g)} · ${g.iscritti} su ${g.posti} iscritti` : annateGruppo(g)}
                    coda={<Etichetta testo={s.testo} tono={s.tono} />}
                  />
                )
              })}
            </Carta>
          </Sezione>
        ))
      ) : (
        <Messaggio tono="attenzione" titolo={`Nessun posto libero per i nati nel ${scelto}`}>
          Tutti i gruppi di quest’anno sono al completo. Togli il filtro per vederli, o chiedi in segreteria.
        </Messaggio>
      )}

      <Text style={[stili.nota, { color: p.testoTerzo }]}>
        I posti sono quelli del gestionale del club e si aggiornano ogni pochi minuti: al momento dell’iscrizione la segreteria ti
        conferma quello che c’è davvero.
      </Text>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  filtriTitolo: { fontSize: 13, fontFamily: F.extra, letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: 2 },
  tessere: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio.due },
  // Sedici anni in poche righe su un telefono: tessere piccole col solo anno. Un anno senza posti e' piu' chiaro.
  tessera: { flexGrow: 1, flexBasis: 58, maxWidth: 110, minWidth: 0, alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 8, borderRadius: 14 },
  anno: { fontSize: 17, lineHeight: 21, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  interruttore: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: spazio.tre, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  casella: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  spunta: { color: '#fff', fontSize: 13, fontFamily: F.extra, lineHeight: 15 },
  nota: { fontSize: 13, lineHeight: 19, fontFamily: F.medio, paddingHorizontal: 2 },
})
