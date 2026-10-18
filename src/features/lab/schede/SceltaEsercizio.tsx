import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { eserciziLibreria, type EsercizioLibreria } from '@/api/lab'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Foglio } from '../ui/Foglio'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante, Tag } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { MUSCOLI, muscoli } from './comune'

// La scelta di un esercizio per la scheda che il socio scrive (19/10/2026): la libreria accesa del club
// (senza video e poster: sono seicento) e gli esercizi che ha gia' scritto lui, con la ricerca per nome e il
// gruppo muscolare. **Chi non trova il suo scrive il nome**: diventa un esercizio suo, che si registra e si
// segue come gli altri (`nome_libero`, lo crea la funzione).

export type Scelta = { esercizio_id: string; nome: string } | { nome_libero: string }

const CHIAVE_LIBRERIA = 'schede:libreria'
const PAGINA = 40
const GRUPPI = ['pettorali', 'schiena', 'spalle', 'bicipiti', 'tricipiti', 'core', 'glutei', 'quadricipiti', 'femorali', 'polpacci']

/** Senza accenti e maiuscole: «Rematore» e «rémator» si trovano. */
const norma = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Dati = { esercizi: EsercizioLibreria[] }

export function SceltaEsercizio({ aperto, titolo = 'Scegli un esercizio', onChiudi, onScegli }: { aperto: boolean; titolo?: string; onChiudi: () => void; onScegli: (s: Scelta) => void }) {
  const p = usePalette()
  const [dati, setDati] = useState<Dati | null>(() => inMemoria<Dati>(CHIAVE_LIBRERIA) ?? null)
  const [errore, setErrore] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [gruppo, setGruppo] = useState<string | null>(null)
  const [quanti, setQuanti] = useState(PAGINA)
  const [libero, setLibero] = useState('')

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_LIBRERIA, eserciziLibreria)
    if (r.ok) setDati({ esercizi: r.esercizi })
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    if (!aperto) return
    setQ('')
    setGruppo(null)
    setQuanti(PAGINA)
    setLibero('')
    carica()
  }, [aperto, carica])

  const trovati = useMemo(() => {
    if (!dati) return []
    const parole = norma(q).split(/\s+/).filter(Boolean)
    return dati.esercizi.filter((e) => (!gruppo || e.muscoli_primari.includes(gruppo)) && parole.every((x) => norma(e.nome).includes(x)))
  }, [dati, q, gruppo])

  const nomeLibero = libero.trim() || q.trim()

  return (
    <Foglio aperto={aperto} titolo={titolo} sottotitolo="Cerca nella libreria del club, oppure scrivi il nome del tuo esercizio." onChiudi={onChiudi}>
      <View style={[stili.cerca, { backgroundColor: p.incavo }]}>
        <Icona nome="cerca" size={18} colore={p.testoSecondario} />
        <TextInput
          value={q}
          onChangeText={(t) => {
            setQ(t.slice(0, 60))
            setQuanti(PAGINA)
          }}
          placeholder="Cerca: panca, squat, lat machine…"
          placeholderTextColor={p.testoTerzo}
          accessibilityLabel="Cerca un esercizio"
          autoCorrect={false}
          style={[stili.campo, { color: p.testo }]}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spazio.due }} style={{ flexGrow: 0 }}>
        {[null, ...GRUPPI].map((g) => {
          const attivo = g === gruppo
          return (
            <Tocco
              key={g ?? 'tutti'}
              vibra="scelta"
              stato={{ selected: attivo }}
              onPress={() => {
                setGruppo(g)
                setQuanti(PAGINA)
              }}
              etichetta={g ? MUSCOLI[g] : 'Tutti i muscoli'}
              style={[stili.chip, { backgroundColor: attivo ? p.testo : p.incavo }]}
            >
              <Text style={{ color: attivo ? p.fondo : p.testo, fontFamily: attivo ? F.extra : F.semi, fontSize: 13.5 }}>{g ? MUSCOLI[g] : 'Tutti'}</Text>
            </Tocco>
          )
        })}
      </ScrollView>

      {errore ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo="Riprova" icona="aggiorna" variante="secondario" onPress={carica} />
        </>
      ) : !dati ? (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>Apro la libreria…</Text>
      ) : (
        <View style={{ gap: spazio.due }}>
          {trovati.slice(0, quanti).map((e) => (
            <Tocco key={e.id} onPress={() => onScegli({ esercizio_id: e.id, nome: e.nome })} etichetta={e.nome} scala={0.985}>
              <View style={[stili.riga, { backgroundColor: p.incavo }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[stili.nome, { color: p.testo }]} numberOfLines={2}>
                    {e.nome}
                  </Text>
                  <Text style={[stili.sotto, { color: p.testoSecondario }]} numberOfLines={1}>
                    {[muscoli(e.muscoli_primari.slice(0, 2)), e.attrezzo ? e.attrezzo.replace(/_/g, ' ') : null].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {e.mio ? <Tag testo="Tuo" colore={p.accento} /> : null}
                <Icona nome="piu" size={18} colore={p.testoSecondario} />
              </View>
            </Tocco>
          ))}
          {trovati.length > quanti ? <Pulsante testo={`Mostra altri (${trovati.length - quanti})`} variante="secondario" piccolo onPress={() => setQuanti((n) => n + PAGINA)} /> : null}
          {!trovati.length ? <Text style={[stili.nota, { color: p.testoSecondario }]}>Nessun esercizio con questo nome nella libreria.</Text> : null}
        </View>
      )}

      <View style={[stili.libero, { borderColor: p.linea }]}>
        <Text style={[stili.titoletto, { color: p.testo }]}>Non lo trovi?</Text>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>Scrivi il nome come lo chiami tu: resta un esercizio tuo, senza video, e lo segui come gli altri.</Text>
        <TextInput
          value={libero}
          onChangeText={(t) => setLibero(t.slice(0, 80))}
          placeholder={q.trim() ? q.trim() : 'Il nome del tuo esercizio'}
          placeholderTextColor={p.testoTerzo}
          accessibilityLabel="Il nome del tuo esercizio"
          style={[stili.input, { color: p.testo, backgroundColor: p.incavo }]}
        />
        <Pulsante testo={nomeLibero ? `Aggiungi «${nomeLibero}»` : 'Aggiungi un esercizio tuo'} icona="piu" variante="scuro" disabilitato={!nomeLibero} onPress={() => onScegli({ nome_libero: nomeLibero })} />
      </View>
    </Foglio>
  )
}

const stili = StyleSheet.create({
  cerca: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 16, paddingHorizontal: spazio.tre, minHeight: 48 },
  campo: { flex: 1, fontFamily: F.semi, fontSize: 15.5, minHeight: 48, outlineStyle: 'none' } as object,
  chip: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: spazio.tre },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.due, borderRadius: 16, padding: spazio.tre },
  nome: { fontFamily: F.extra, fontSize: 15, lineHeight: 19, letterSpacing: -0.2 },
  sotto: { fontFamily: F.semi, fontSize: 12.5 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  titoletto: { fontFamily: F.extra, fontSize: 16 },
  libero: { gap: spazio.due, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.tre },
  input: { minHeight: 48, borderRadius: 14, paddingHorizontal: spazio.tre, fontFamily: F.semi, fontSize: 15.5, outlineStyle: 'none' } as object,
})
