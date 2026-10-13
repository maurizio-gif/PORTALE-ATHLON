import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'

import { disdiciLezione, leggiGiorno, prenotaLezione, type Giorno, type Lezione } from '@/api/lab'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Scelta } from '@/components/Scelta'
import { Forte, Testo } from '@/components/Testo'
import { giornoEsteso, ora } from '@/lib/eventi'
import { spazio, stileTono, useColori } from '@/theme'

// Il calendario del laboratorio: le lezioni di gruppo di oggi e dei tre giorni
// dopo, e la prenotazione vera su PerfectGym, per se' o per un figlio.
// Le regole (apertura, posti, disdetta, quote da saldare) le applica
// PerfectGym; qui si mostrano i suoi rifiuti.

function maiuscola(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function etichettaGiorno(data: string): { settimana: string; numero: string } {
  const [settimana, numero] = giornoEsteso(data).split(' ')
  return { settimana: settimana.slice(0, 3), numero }
}

function RigaLezione({
  l,
  occupato,
  onPrenota,
  onDisdici,
}: {
  l: Lezione
  occupato: boolean
  onPrenota: () => Promise<string | null>
  onDisdici: () => Promise<string | null>
}) {
  const c = useColori()
  const [conferma, setConferma] = useState(false)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const b = l.prenotazione

  async function esegui(azione: () => Promise<string | null>) {
    setErrore(null)
    setAttesa(true)
    const problema = await azione()
    setAttesa(false)
    setConferma(false)
    if (problema) setErrore(problema)
  }

  const stato = b
    ? { testo: b.attesa ? 'In lista d’attesa' : 'Prenotato', tono: b.attesa ? ('attenzione' as const) : ('ok' as const) }
    : l.iniziata
      ? { testo: 'Già cominciata', tono: null }
      : l.liberi <= 0
        ? { testo: 'Completa', tono: null }
        : { testo: l.liberi === 1 ? 'Ultimo posto' : `${l.liberi} posti liberi`, tono: null }

  return (
    <View style={[stili.lezione, { borderColor: c.bordo, backgroundColor: c.superficie }, b ? stileTono(c, b.attesa ? 'attenzione' : 'ok') : null]}>
      <View style={stili.testa}>
        <Text style={[stili.ora, { color: c.testo }]}>{ora(l.inizio)}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Testo>
            <Forte>{l.nome}</Forte>
          </Testo>
          <Testo variante="piccolo">
            {ora(l.inizio)}–{ora(l.fine)}
            {l.istruttore ? ` · ${l.istruttore}` : ''} · {stato.testo}
          </Testo>
        </View>
      </View>
      {errore ? <Avviso>{errore}</Avviso> : null}
      {l.iniziata ? null : b ? (
        conferma ? (
          <View style={stili.azioni}>
            <View style={{ flex: 1 }}>
              <Bottone testo="Sì, disdici" onPress={() => esegui(onDisdici)} inCorso={attesa} />
            </View>
            <View style={{ flex: 1 }}>
              <Bottone testo="No" variante="contorno" onPress={() => setConferma(false)} disabilitato={attesa} />
            </View>
          </View>
        ) : (
          <Bottone testo="Disdici" variante="contorno" onPress={() => setConferma(true)} disabilitato={occupato} />
        )
      ) : (
        <Bottone testo={l.liberi <= 0 ? 'Mettiti in lista d’attesa' : 'Prenota'} variante="contorno" onPress={() => esegui(onPrenota)} inCorso={attesa} disabilitato={occupato} />
      )}
    </View>
  )
}

export function Calendario() {
  const c = useColori()
  const [giorno, setGiorno] = useState<Giorno | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [carica, setCarica] = useState(true)
  const [occupato, setOccupato] = useState(false)

  const leggi = useCallback(async (data?: string, memberId?: number) => {
    setCarica(true)
    setErrore(null)
    const esito = await leggiGiorno(data, memberId)
    if (esito.ok) setGiorno(esito.giorno)
    else setErrore(esito.errore)
    setCarica(false)
  }, [])

  useEffect(() => {
    leggi()
  }, [leggi])

  // Dopo un clic si aggiorna la riga subito, con quello che dice PerfectGym,
  // senza ricaricare la giornata: il mirror puo' essere indietro.
  function aggiorna(classId: number, prenotazione: Lezione['prenotazione'], delta: number) {
    setGiorno((g) =>
      g
        ? {
            ...g,
            lezioni: g.lezioni.map((l) =>
              l.class_id === classId ? { ...l, prenotazione, iscritti: l.iscritti + delta, liberi: Math.max(0, l.liberi - delta) } : l
            ),
          }
        : g
    )
  }

  async function prenota(l: Lezione): Promise<string | null> {
    if (!giorno) return null
    setOccupato(true)
    const esito = await prenotaLezione(l.class_id, giorno.member_id)
    setOccupato(false)
    if (!esito.ok) return esito.errore
    aggiorna(l.class_id, { booking_id: esito.booking_id ?? 0, attesa: esito.esito === 'attesa' }, esito.esito === 'attesa' ? 0 : 1)
    return null
  }

  async function disdici(l: Lezione): Promise<string | null> {
    if (!giorno) return null
    setOccupato(true)
    const esito = await disdiciLezione(l.class_id, giorno.member_id)
    setOccupato(false)
    if (!esito.ok) return esito.errore
    aggiorna(l.class_id, null, l.prenotazione?.attesa ? 0 : -1)
    return null
  }

  if (errore && !giorno) {
    return (
      <Pagina titolo="Calendario lezioni" sottotitolo={errore}>
        <Bottone testo="Riprova" onPress={() => leggi()} />
      </Pagina>
    )
  }
  if (!giorno) {
    return (
      <Pagina titolo="Calendario lezioni">
        <ActivityIndicator color={c.accento} style={{ alignSelf: 'flex-start' }} />
      </Pagina>
    )
  }

  const mie = giorno.lezioni.filter((l) => l.prenotazione)
  // Le lezioni gia' cominciate non si prenotano piu': si tengono solo quelle
  // con una prenotazione, che dicono «ci sei andato».
  const visibili = giorno.lezioni.filter((l) => !l.iniziata || l.prenotazione)
  const nascoste = giorno.lezioni.length - visibili.length
  return (
    <Pagina titolo="Calendario lezioni" sottotitolo="Laboratorio · le prenotazioni sono vere: le trovi anche nell’app Athlon.">
      {giorno.persone.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila}>
          {giorno.persone.map((p) => {
            const attivo = p.member_id === giorno.member_id
            return (
              <Scelta key={p.member_id} scelta={attivo} onPress={() => leggi(giorno.data, p.member_id)} etichetta={`Prenota per ${p.nome ?? ''}`}>
                <Text style={{ color: attivo ? c.suAccento : c.testo, fontWeight: '600' }}>{p.titolare ? 'Io' : p.nome ?? 'Senza nome'}</Text>
              </Scelta>
            )
          })}
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila}>
        {giorno.giorni.map((d) => {
          const attivo = d === giorno.data
          const e = etichettaGiorno(d)
          const colore = attivo ? c.suAccento : c.testo
          return (
            <Scelta key={d} scelta={attivo} onPress={() => leggi(d, giorno.member_id)} stile={stili.giorno} etichetta={giornoEsteso(d)}>
              <Text style={[stili.settimana, { color: colore }]}>{e.settimana}</Text>
              <Text style={[stili.numero, { color: colore }]}>{e.numero}</Text>
            </Scelta>
          )
        })}
      </ScrollView>

      <Testo variante="sottotitolo" style={{ fontSize: 17 }}>
        {maiuscola(giornoEsteso(giorno.data))}
      </Testo>
      {!giorno.prenotazioni_lette ? <Avviso tono="attenzione">PerfectGym non risponde: le tue prenotazioni potrebbero non comparire.</Avviso> : null}
      {mie.length ? (
        <Testo variante="piccolo">
          Prenotato quel giorno: {mie.map((l) => `${l.nome} alle ${ora(l.inizio)}`).join(', ')}.
        </Testo>
      ) : null}

      {carica ? (
        <ActivityIndicator color={c.accento} style={{ alignSelf: 'flex-start' }} />
      ) : visibili.length === 0 ? (
        <Testo variante="attenuato">Nessuna lezione ancora da cominciare in questo giorno.</Testo>
      ) : (
        <View style={{ gap: spazio.due }}>
          {nascoste ? <Testo variante="piccolo">{nascoste === 1 ? 'Una lezione è già cominciata.' : `${nascoste} lezioni sono già cominciate.`}</Testo> : null}
          {visibili.map((l) => (
            <RigaLezione key={l.class_id} l={l} occupato={occupato} onPrenota={() => prenota(l)} onDisdici={() => disdici(l)} />
          ))}
        </View>
      )}
    </Pagina>
  )
}

const stili = StyleSheet.create({
  fila: { gap: spazio.due, paddingBottom: spazio.uno },
  giorno: { minWidth: 64, alignItems: 'center' },
  settimana: { fontSize: 11, textTransform: 'uppercase', opacity: 0.8 },
  numero: { fontSize: 18, fontWeight: '700' },
  lezione: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.due },
  testa: { flexDirection: 'row', gap: spazio.tre, alignItems: 'flex-start' },
  ora: { fontSize: 17, fontWeight: '700', minWidth: 52, fontVariant: ['tabular-nums'] },
  azioni: { flexDirection: 'row', gap: spazio.due },
})
