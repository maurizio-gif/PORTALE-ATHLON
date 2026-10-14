import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { elencoSchede, type RigaSchedaLab, type SedutaBreve } from '@/api/lab'
import { spazio } from '@/theme'

import { inMemoria, prendi } from '../memoria'
import { Icona } from '../ui/Icona'
import { Carta, Entra, LinkSezione, Messaggio, Pulsante, Riga, SchedeInArrivo, Sezione, Tag } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, NOTTE, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { LIVELLI, quando, TIPI } from './comune'

// Allenamento: le schede del socio (del club, del suo trainer, dell'agente
// AI), la richiesta di una scheda all'agente, gli ultimi allenamenti.

type Dati = { schede: RigaSchedaLab[]; ultimi: SedutaBreve[]; ai: { usate: number; massimo: number } }
export const CHIAVE_SCHEDE = 'schede:elenco'

function SchedaCarta({ s, indice }: { s: RigaSchedaLab; indice: number }) {
  const p = usePalette()
  const colori = s.tipo === 'ai' ? (['#8B5CF6', '#5B21B6'] as const) : s.tipo === 'personalizzata' ? FUOCO : NOTTE
  return (
    <Entra indice={indice}>
      <Tocco onPress={() => router.push({ pathname: '/lab/allenamento/[scheda]', params: { scheda: s.id } })} etichetta={`Scheda ${s.titolo}`} scala={0.985}>
        <LinearGradient colors={colori} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.scheda}>
          <View style={stili.filigrana} pointerEvents="none">
            <Icona nome={s.tipo === 'ai' ? 'stella' : 'peso'} size={120} colore="rgba(255,255,255,0.08)" />
          </View>
          <Tag testo={TIPI[s.tipo] ?? s.tipo} colore="#fff" fondo="rgba(0,0,0,0.18)" />
          <Text style={stili.titolo} numberOfLines={2}>
            {s.titolo}
          </Text>
          <View style={stili.pillole}>
            {s.obiettivo ? <Text style={stili.pillola}>{s.obiettivo}</Text> : null}
            {s.livello ? <Text style={stili.pillola}>{LIVELLI[s.livello] ?? s.livello}</Text> : null}
            <Text style={stili.pillola}>{`${s.giorni} ${s.giorni === 1 ? 'giorno' : 'giorni'}`}</Text>
          </View>
          <Text style={[stili.ultimo, { color: 'rgba(255,255,255,0.75)' }]}>{s.ultimo ? `Ultimo allenamento ${quando(s.ultimo)}` : 'Non ancora iniziata'}</Text>
        </LinearGradient>
      </Tocco>
    </Entra>
  )
}

export function Schede() {
  const p = usePalette()
  const [dati, setDati] = useState<Dati | null>(() => inMemoria<Dati>(CHIAVE_SCHEDE) ?? null)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setErrore(null)
    const r = await prendi(CHIAVE_SCHEDE, elencoSchede)
    if (r.ok) setDati({ schede: r.schede, ultimi: r.ultimi, ai: r.ai })
    else setErrore(r.errore)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  if (!dati) {
    return (
      <Schermata sopratitolo="Laboratorio" titolo="Allenamento">
        {errore ? (
          <>
            <Messaggio>{errore}</Messaggio>
            <Pulsante testo="Riprova" icona="aggiorna" onPress={carica} />
          </>
        ) : (
          <SchedeInArrivo />
        )}
      </Schermata>
    )
  }

  const restano = Math.max(0, dati.ai.massimo - dati.ai.usate)
  return (
    <Schermata sopratitolo="Laboratorio" titolo="Allenamento" sottotitolo="Le tue schede, il registro dei pesi e il timer del recupero.">
      <Entra indice={0}>
        <Tocco onPress={() => router.push('/lab/allenamento/agente')} etichetta="Chiedi una scheda all’agente AI" scala={0.985} spento={!restano}>
          <View style={[stili.agente, { backgroundColor: p.carta, borderColor: p.linea, boxShadow: p.ombra }]}>
            <LinearGradient colors={['#8B5CF6', '#5B21B6']} style={stili.agenteIcona}>
              <Icona nome="stella" size={26} colore="#fff" />
            </LinearGradient>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[stili.agenteTitolo, { color: p.testo }]}>Chiedi una scheda all’agente AI</Text>
              <Text style={[stili.agenteTesto, { color: p.testoSecondario }]}>
                {restano
                  ? `Rispondi a sei domande e te la scrive in un paio di minuti. Ne puoi chiedere ancora ${restano} questo mese.`
                  : `Hai già chiesto ${dati.ai.massimo} schede negli ultimi trenta giorni: non è possibile chiederne altre per ora.`}
              </Text>
            </View>
            {restano ? <Icona nome="avanti" size={18} colore={p.testoTerzo} /> : null}
          </View>
        </Tocco>
      </Entra>

      <Sezione titolo="Le tue schede" conteggio={dati.schede.length}>
        {dati.schede.length ? (
          <View style={{ gap: spazio.tre }}>
            {dati.schede.map((s, i) => (
              <SchedaCarta key={s.id} s={s} indice={i + 1} />
            ))}
          </View>
        ) : (
          <Carta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
            <Icona nome="peso" size={32} colore={p.testoTerzo} />
            <Text style={[stili.nota, { color: p.testoSecondario, textAlign: 'center' }]}>
              Non hai ancora una scheda. Chiedila all’agente AI qui sopra: le schede del club e quelle del tuo trainer compariranno qui.
            </Text>
          </Carta>
        )}
      </Sezione>

      <Sezione titolo="Ultimi allenamenti" destra={<LinkSezione testo="Storico e progressi" onPress={() => router.push('/lab/allenamento/storico')} />}>
        <Carta style={{ paddingVertical: spazio.due }}>
          {dati.ultimi.length ? (
            dati.ultimi.map((a, i) => (
              <Riga
                key={a.id}
                prima={i === 0}
                icona={a.fine ? 'bandiera' : 'cronometro'}
                tono={a.fine ? 'ok' : 'attenzione'}
                titolo={[a.titolo, a.giorno_nome].filter(Boolean).join(' · ') || 'Allenamento'}
                sotto={`${quando(a.inizio)} · ${a.serie} ${a.serie === 1 ? 'serie' : 'serie'}${a.fine ? '' : ' · non chiuso'}`}
              />
            ))
          ) : (
            <Riga prima icona="cronometro" tono="neutro" titolo="Nessun allenamento registrato" sotto="Apri una scheda e premi «Inizia l’allenamento»." />
          )}
        </Carta>
      </Sezione>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  agente: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, padding: spazio.tre + 2, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth },
  agenteIcona: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  agenteTitolo: { fontFamily: F.extra, fontSize: 16.5, letterSpacing: -0.3 },
  agenteTesto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  scheda: { borderRadius: 28, padding: spazio.tre + 4, gap: spazio.due, overflow: 'hidden', minHeight: 170 },
  filigrana: { position: 'absolute', right: -14, bottom: -18, transform: [{ rotate: '-12deg' }] },
  titolo: { color: '#fff', fontFamily: F.extra, fontSize: 24, lineHeight: 28, letterSpacing: -0.7, maxWidth: '88%' },
  pillole: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pillola: { color: '#fff', fontFamily: F.bold, fontSize: 12, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  ultimo: { fontFamily: F.semi, fontSize: 12.5, marginTop: 'auto' },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
})
