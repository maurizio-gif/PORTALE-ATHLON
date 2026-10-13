import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'

import { disdiciLezione, leggiGiorno, prenotaLezione, type Giorno, type Lezione, type PersonaCalendario, type SchedaLezione } from '@/api/lab'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Scelta } from '@/components/Scelta'
import { Griglia } from '@/components/Griglia'
import { Forte, Testo } from '@/components/Testo'
import { giornoEsteso, ora } from '@/lib/eventi'

import { FinestraLezione, Fotina } from './SchedaLezione'
import { spazio, stileTono, useColori } from '@/theme'

// Il calendario del laboratorio: le lezioni di gruppo di oggi e dei tre giorni
// dopo, e la prenotazione vera su PerfectGym, per se' o per un figlio.
// Le regole (apertura, posti, disdetta, quote da saldare) le applica
// PerfectGym; qui si mostrano i suoi rifiuti.

/** Nome e cognome per esteso, come sulla scheda del club. */
function nomeCompleto(p: Pick<PersonaCalendario, 'nome' | 'cognome'>): string {
  return [p.nome, p.cognome].filter(Boolean).join(' ') || 'Senza nome'
}

function maiuscola(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function etichettaGiorno(data: string): { settimana: string; numero: string } {
  const [settimana, numero] = giornoEsteso(data).split(' ')
  return { settimana: settimana.slice(0, 3), numero }
}

/** «gio 22 ott, 10:00», all'ora di Roma. */
function apertura(iso: string): string {
  const d = new Date(iso)
  const giorno = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' }).format(d)
  return `${giorno}, ${ora(iso)}`
}

function minuti(inizio: string, fine: string): number {
  return Math.round((new Date(fine).getTime() - new Date(inizio).getTime()) / 60000)
}

function RigaLezione({
  l,
  scheda,
  onScheda,
  occupato,
  onPrenota,
  onDisdici,
}: {
  l: Lezione
  scheda: SchedaLezione | null
  onScheda: () => void
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

  // I posti liberi sono la cosa che si guarda per prima: un numero grande, a
  // destra, verde quando ce n'e', arancione quando stanno finendo, rosso
  // quando la lezione e' completa.
  const tono = l.liberi <= 0 ? ('errore' as const) : l.liberi < 5 ? ('attenzione' as const) : ('ok' as const)
  const posti = l.iniziata ? null : (
    <View
      style={[stili.posti, stileTono(c, tono)]}
      accessibilityLabel={l.liberi <= 0 ? 'Lezione completa' : `${l.liberi} ${l.liberi === 1 ? 'posto libero' : 'posti liberi'}`}
    >
      {l.liberi <= 0 ? (
        <Text style={[stili.completa, { color: c[tono] }]}>Completa</Text>
      ) : (
        <>
          <Text style={[stili.numeroPosti, { color: c[tono] }]}>{l.liberi}</Text>
          <Text style={[stili.etichettaPosti, { color: c.testoSecondario }]}>{l.liberi === 1 ? 'posto' : 'posti'}</Text>
        </>
      )}
    </View>
  )
  const statoPrenotazione = b ? (b.attesa ? ' · In lista d’attesa' : ' · Prenotato') : l.iniziata ? ' · Già cominciata' : ''

  return (
    <View style={[stili.lezione, { borderColor: c.bordo, backgroundColor: c.superficie }, b ? stileTono(c, b.attesa ? 'attenzione' : 'ok') : null]}>
      <View style={stili.testa}>
        {scheda ? <Fotina scheda={scheda} onApri={onScheda} /> : null}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[stili.nome, { color: c.testo }]}>{l.nome}</Text>
          <Text style={[stili.ora, { color: c.testo }]}>
            {ora(l.inizio)}–{ora(l.fine)}
            <Text style={{ color: c.testoSecondario, fontWeight: '400' }}>{` · ${minuti(l.inizio, l.fine)} min`}</Text>
          </Text>
          <Testo variante="piccolo">
            {l.istruttore ?? ''}
            {statoPrenotazione ? <Forte>{l.istruttore ? statoPrenotazione : statoPrenotazione.slice(3)}</Forte> : null}
          </Testo>
        </View>
        {posti}
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
      ) : l.prenotabile_dal ? (
        <Bottone testo={`Prenotabile da ${apertura(l.prenotabile_dal)}`} variante="contorno" onPress={() => {}} disabilitato />
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
  // La categoria scelta (Corsi Fitness, Group Reformer, …) resta passando da
  // un giorno all'altro: chi cerca il Reformer lo cerca in tutta la settimana.
  const [attivita, setAttivita] = useState<string | null>(null)
  const [aperta, setAperta] = useState<Lezione | null>(null)

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
  const conteggi = new Map<string, number>()
  for (const l of visibili) conteggi.set(l.categoria, (conteggi.get(l.categoria) ?? 0) + 1)
  const attivitaDelGiorno = [...conteggi.keys()].sort((x, y) => x.localeCompare(y, 'it'))
  const filtrate = attivita ? visibili.filter((l) => l.categoria === attivita) : visibili
  const perChi = giorno.persone.find((p) => p.member_id === giorno.member_id)
  return (
    <Pagina larga titolo="Calendario lezioni" sottotitolo="Laboratorio · le prenotazioni sono vere: le trovi anche nell’app Athlon.">
      {giorno.persone.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila}>
          {giorno.persone.map((p) => {
            const attivo = p.member_id === giorno.member_id
            return (
              <Scelta key={p.member_id} scelta={attivo} onPress={() => leggi(giorno.data, p.member_id)} etichetta={`Prenota per ${nomeCompleto(p)}`}>
                <Text style={{ color: attivo ? c.suAccento : c.testo, fontWeight: '600' }}>{nomeCompleto(p)}</Text>
              </Scelta>
            )
          })}
        </ScrollView>
      ) : null}
      {perChi ? (
        <Testo>
          Stai prenotando per <Forte>{nomeCompleto(perChi)}</Forte>
        </Testo>
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
      {attivitaDelGiorno.length > 1 || attivita ? (
        // La scelta attiva subito dopo «Tutte», e la fila torna all'inizio a
        // ogni giorno (key): l'attivita' scelta non resta mai fuori vista.
        <ScrollView key={giorno.data} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila}>
          {[null, ...(attivita ? [attivita] : []), ...attivitaDelGiorno.filter((x) => x !== attivita)].map((a) => {
            const attivo = a === attivita
            const n = a ? conteggi.get(a) ?? 0 : visibili.length
            return (
              <Scelta key={a ?? 'tutte'} scelta={attivo} onPress={() => setAttivita(a)} etichetta={`${a ?? 'Tutte le attività'}, ${n}`}>
                <Text style={{ color: attivo ? c.suAccento : c.testo, fontWeight: '600' }}>
                  {a ?? 'Tutte'} <Text style={{ fontWeight: '400', opacity: 0.75 }}>{n}</Text>
                </Text>
              </Scelta>
            )
          })}
        </ScrollView>
      ) : null}
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
      ) : filtrate.length === 0 ? (
        <>
          <Testo variante="attenuato">Nessuna lezione di «{attivita}» ancora da cominciare in questo giorno.</Testo>
          <Bottone testo="Mostra tutte le attività" variante="contorno" onPress={() => setAttivita(null)} />
        </>
      ) : (
        <View style={{ gap: spazio.due }}>
          {nascoste && !attivita ? <Testo variante="piccolo">{nascoste === 1 ? 'Una lezione è già cominciata.' : `${nascoste} lezioni sono già cominciate.`}</Testo> : null}
          <Griglia>
            {filtrate.map((l) => (
              <RigaLezione
                key={l.class_id}
                l={l}
                scheda={l.scheda ? giorno.schede?.[l.scheda] ?? null : null}
                onScheda={() => setAperta(l)}
                occupato={occupato}
                onPrenota={() => prenota(l)}
                onDisdici={() => disdici(l)}
              />
            ))}
          </Griglia>
        </View>
      )}
      <FinestraLezione
        scheda={aperta?.scheda ? giorno.schede?.[aperta.scheda] ?? null : null}
        titolo={aperta?.nome ?? ''}
        onChiudi={() => setAperta(null)}
      />
    </Pagina>
  )
}

const stili = StyleSheet.create({
  fila: { gap: spazio.due, paddingBottom: spazio.uno },
  giorno: { minWidth: 64, alignItems: 'center' },
  settimana: { fontSize: 11, textTransform: 'uppercase', opacity: 0.8 },
  numero: { fontSize: 18, fontWeight: '700' },
  lezione: { borderWidth: 1, borderRadius: 20, padding: spazio.tre, gap: spazio.tre },
  testa: { flexDirection: 'row', gap: spazio.tre, alignItems: 'center' },
  nome: { fontSize: 18, fontWeight: '700', lineHeight: 23 },
  ora: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  azioni: { flexDirection: 'row', gap: spazio.due },
  posti: { minWidth: 62, borderRadius: 10, paddingVertical: spazio.uno, paddingHorizontal: spazio.due, alignItems: 'center', justifyContent: 'center' },
  numeroPosti: { fontSize: 24, fontWeight: '800', lineHeight: 28, fontVariant: ['tabular-nums'] },
  etichettaPosti: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  completa: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', paddingVertical: spazio.due },
})
