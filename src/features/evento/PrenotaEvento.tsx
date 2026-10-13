import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'

import { chiamaLink } from '@/api/link'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Griglia } from '@/components/Griglia'
import { Pagina } from '@/components/Pagina'
import { Scelta } from '@/components/Scelta'
import { Forte, Testo } from '@/components/Testo'
import { FinestraLezione, Fotina } from '@/features/lab/SchedaLezione'
import { euro, giornoEsteso, nomeDi, ora, paginaEventoSito, type EsitoPrenotazione, type PaginaEvento, type Persona, type Prodotto, type Turno } from '@/lib/eventi'
import { spazio, stileTono, useColori, type Tono } from '@/theme'

// La prenotazione di un evento dal link per email, come il calendario del
// laboratorio: in alto per chi si prenota («Stai prenotando per …»), sotto le
// lezioni dell'evento con foto, scheda e posti liberi. Senza login: il link
// vale per il nucleo dell'email che l'ha chiesto, e chi si puo' prenotare lo
// decide perfectgym-eventi (fascia dell'evento e regole d'eta' del calendario).
//
// L'evento e' uno: chi e' gia' prenotato in un turno non si prenota in un
// altro (la funzione lo rifiuta comunque), e la scheda lo dice.
//
// **A pagamento** (Master Class, Eventi): se PerfectGym dice che alla persona
// manca il prodotto, «Prenota» diventa «Acquista e prenota»: si paga sulla
// pagina di PerfectGym e si torna qui con ?acquisto=<id>, dove la
// prenotazione si riprova finche' PerfectGym vede l'acquisto.

type Esito = { testo: string; tono: Tono; daPagare?: Prodotto | null }

function minuti(t: Turno): number {
  return Math.round((new Date(t.fine).getTime() - new Date(t.inizio).getTime()) / 60000)
}

function RigaTurno({
  t,
  nome,
  pagina,
  persona,
  occupato,
  onScheda,
  onPrenota,
  onAcquista,
}: {
  t: Turno
  nome: string
  pagina: PaginaEvento
  persona: Persona | null
  occupato: boolean
  onScheda: (() => void) | null
  onPrenota: () => Promise<Esito | null>
  onAcquista: () => Promise<string | null>
}) {
  const c = useColori()
  const [attesa, setAttesa] = useState(false)
  const [esito, setEsito] = useState<Esito | null>(null)
  const suo = persona?.prenotato ?? null
  const qui = suo?.class_id === t.class_id
  const altrove = suo && !qui ? pagina.turni.find((x) => x.class_id === suo.class_id) : null
  // Chi del nucleo e' gia' prenotato qui: si vede su ogni turno.
  const loro = (pagina.persone ?? pagina.bambini).filter((p) => p.prenotato?.class_id === t.class_id)

  const tono = t.liberi <= 0 ? ('errore' as const) : t.liberi < 5 ? ('attenzione' as const) : ('ok' as const)

  async function prenota() {
    setEsito(null)
    setAttesa(true)
    setEsito(await onPrenota())
    setAttesa(false)
  }

  async function acquista() {
    setAttesa(true)
    const problema = await onAcquista()
    // Se tutto va bene il browser e' gia' sulla pagina di pagamento.
    setAttesa(false)
    if (problema) setEsito({ testo: problema, tono: 'errore' })
  }

  const prodotto = pagina.pagamento?.prodotto ?? null
  // Il prezzo si cambia per persona: si ricomincia da «Prenota» scegliendo un altro.
  useEffect(() => setEsito(null), [persona?.member_id])

  let azione: React.ReactNode
  if (t.chiuso) azione = <Testo variante="piccolo">Già cominciato.</Testo>
  else if (!persona) azione = null
  else if (qui) azione = <Avviso tono={suo!.attesa ? 'attenzione' : 'ok'}>{`${persona.nome ?? nomeDi(persona)} è ${suo!.attesa ? 'in lista d’attesa' : 'prenotato'} qui.`}</Avviso>
  else if (altrove) azione = <Bottone testo={`Già prenotato alle ${ora(altrove.inizio)}`} variante="contorno" onPress={() => {}} disabilitato />
  else if (t.liberi <= 0) azione = <Bottone testo="Completo" variante="contorno" onPress={() => {}} disabilitato />
  else if (esito?.daPagare)
    azione = (
      <Bottone
        testo={`Acquista e prenota${esito.daPagare.prezzo != null ? ` · ${euro(esito.daPagare.prezzo)}` : ''}`}
        onPress={acquista}
        inCorso={attesa}
        disabilitato={occupato}
      />
    )
  else azione = <Bottone testo={`Prenota per ${persona.nome ?? nomeDi(persona)}`} onPress={prenota} inCorso={attesa} disabilitato={occupato} />

  return (
    <View style={[stili.lezione, { borderColor: c.bordo, backgroundColor: c.superficie }, qui ? stileTono(c, suo!.attesa ? 'attenzione' : 'ok') : null]}>
      <View style={stili.testa}>
        {pagina.scheda && onScheda ? <Fotina scheda={pagina.scheda} onApri={onScheda} /> : null}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[stili.nome, { color: c.testo }]}>{nome}</Text>
          <Text style={[stili.ora, { color: c.testo }]}>
            {ora(t.inizio)}–{ora(t.fine)}
            <Text style={{ color: c.testoSecondario, fontWeight: '400' }}>{` · ${minuti(t)} min`}</Text>
          </Text>
          {t.istruttore ? <Testo variante="piccolo">{t.istruttore}</Testo> : null}
        </View>
        {t.chiuso ? null : (
          <View style={[stili.posti, stileTono(c, tono)]} accessibilityLabel={t.liberi <= 0 ? 'Completo' : `${t.liberi} posti liberi`}>
            {t.liberi <= 0 ? (
              <Text style={[stili.completa, { color: c[tono] }]}>Completo</Text>
            ) : (
              <>
                <Text style={[stili.numeroPosti, { color: c[tono] }]}>{t.liberi}</Text>
                <Text style={[stili.etichettaPosti, { color: c.testoSecondario }]}>{t.liberi === 1 ? 'posto' : 'posti'}</Text>
              </>
            )}
          </View>
        )}
      </View>
      {prodotto?.prezzo != null && !t.chiuso ? (
        <Testo variante="piccolo">{`Compresa negli abbonamenti che la includono; per gli altri ${euro(prodotto.prezzo)} a persona, da pagare online.`}</Testo>
      ) : null}
      {loro.length ? <Testo variante="piccolo">{`Prenotati qui: ${loro.map((p) => p.nome ?? nomeDi(p)).join(', ')}`}</Testo> : null}
      {azione}
      {esito && !esito.daPagare ? <Avviso tono={esito.tono}>{esito.testo}</Avviso> : null}
      {esito?.daPagare ? <Testo variante="piccolo">{esito.testo}</Testo> : null}
    </View>
  )
}

export function PrenotaEvento({ token, nome, iniziale }: { token: string; nome: string | null; iniziale: PaginaEvento }) {
  const c = useColori()
  const [pagina, setPagina] = useState(iniziale)
  const [sceltaId, setSceltaId] = useState<number | null>(null)
  const [occupato, setOccupato] = useState(false)
  const [schedaAperta, setSchedaAperta] = useState(false)

  const { evento, turni, fuori_fascia } = pagina
  const persone = pagina.persone ?? pagina.bambini
  const famiglia = evento.per === 'famiglia'
  // Si parte dal primo che non e' ancora prenotato: il caso normale e' «prenoto me, poi gli altri».
  const persona = persone.find((p) => p.member_id === sceltaId) ?? persone.find((p) => !p.prenotato) ?? persone[0] ?? null
  const nomeLezione = evento.lezione ?? evento.titolo
  const fascia =
    evento.nati_dal != null && evento.nati_al != null
      ? `nati dal ${evento.nati_dal} al ${evento.nati_al}`
      : evento.nati_dal != null
        ? `nati dal ${evento.nati_dal}`
        : evento.nati_al != null
          ? `nati fino al ${evento.nati_al}`
          : null

  async function ricarica() {
    const { ok, dati } = await chiamaLink(token, 'pagina')
    if (ok) setPagina(dati as unknown as PaginaEvento)
  }

  async function prenota(t: Turno): Promise<Esito | null> {
    if (!persona) return null
    // Resta su chi si e' appena prenotato, anche se la scelta era quella di partenza.
    setSceltaId(persona.member_id)
    setOccupato(true)
    const { ok, dati } = await chiamaLink(token, 'prenota', { class_id: t.class_id, membri: [persona.member_id] })
    await ricarica()
    setOccupato(false)
    const chi = persona.nome ?? nomeDi(persona)
    if (!ok || !Array.isArray(dati.risultati)) return { testo: dati.errore ?? 'Non siamo riusciti a prenotare adesso. Riprova fra qualche minuto.', tono: 'errore' }
    const r = (dati.risultati as EsitoPrenotazione[])[0]
    if (r?.esito === 'prenotato') return { testo: `Fatto: ${chi} è prenotato ${giornoEsteso(evento.data)} alle ${ora(t.inizio)}. Lo trovi anche nell’app Athlon.`, tono: 'ok' }
    if (r?.esito === 'attesa') return { testo: `${chi} è in lista d’attesa: i posti sono finiti mentre prenotavi.`, tono: 'attenzione' }
    if (r?.esito === 'da_pagare')
      return {
        testo: `Per ${chi} questa lezione non è compresa nell’abbonamento: si acquista online e la prenotazione parte subito dopo il pagamento.`,
        tono: 'attenzione',
        daPagare: r.prodotto ?? pagina.pagamento?.prodotto ?? null,
      }
    return { testo: r?.errore ?? 'PerfectGym non ha accettato la prenotazione.', tono: 'errore' }
  }

  async function acquista(t: Turno): Promise<string | null> {
    if (!persona) return null
    const { ok, dati } = await chiamaLink(token, 'acquista', { class_id: t.class_id, member_id: persona.member_id })
    if (!ok || typeof dati.url !== 'string') return dati.errore ?? 'Non riusciamo ad aprire il pagamento adesso. Riprova fra qualche minuto.'
    if (Platform.OS === 'web') window.location.assign(dati.url)
    else await Linking.openURL(dati.url)
    return null
  }

  // Il ritorno dal pagamento: si chiede com'e' andata finche' la prenotazione
  // non c'e' (il pagamento arriva a PerfectGym qualche secondo dopo), per due minuti.
  const { acquisto } = useLocalSearchParams<{ acquisto?: string }>()
  const [ritorno, setRitorno] = useState<{ stato: string; errore?: string | null; class_id?: number; member_id?: number } | null>(null)
  const avviato = useRef(false)
  useEffect(() => {
    if (!acquisto || avviato.current) return
    avviato.current = true
    let giri = 0
    let fermo = false
    const giro = async () => {
      const { ok, dati } = await chiamaLink(token, 'esito_acquisto', { acquisto_id: acquisto })
      if (fermo) return
      if (!ok) return setRitorno({ stato: 'errore', errore: dati.errore ?? null })
      if (dati.stato === 'avviato' && ++giri < 30) {
        setRitorno(dati as any)
        setTimeout(giro, 4000)
        return
      }
      setRitorno(dati.stato === 'avviato' ? { stato: 'errore', errore: null } : (dati as any))
      ricarica()
    }
    setRitorno({ stato: 'avviato' })
    giro()
    return () => {
      fermo = true
    }
  }, [acquisto, token])

  const chiRitorno = ritorno?.member_id ? persone.find((p) => p.member_id === ritorno.member_id) : null
  const turnoRitorno = ritorno?.class_id ? turni.find((t) => t.class_id === ritorno.class_id) : null
  const avvisoRitorno = !ritorno ? null : ritorno.stato === 'avviato' ? (
    <Avviso tono="attenzione">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.due }}>
        <ActivityIndicator color={c.attenzione} />
        <Testo>Aspettiamo da PerfectGym la conferma del pagamento, poi prenotiamo. Non chiudere la pagina.</Testo>
      </View>
    </Avviso>
  ) : ritorno.stato === 'prenotato' ? (
    <Avviso tono="ok">
      {`Pagamento ricevuto: ${chiRitorno ? chiRitorno.nome ?? nomeDi(chiRitorno) : 'la persona'} è prenotato${turnoRitorno ? ` ${giornoEsteso(evento.data)} alle ${ora(turnoRitorno.inizio)}` : ''}. Lo trovi anche nell’app Athlon.`}
    </Avviso>
  ) : ritorno.stato === 'attesa' ? (
    <Avviso tono="attenzione">Pagamento ricevuto, ma i posti sono finiti mentre pagavi: sei in lista d’attesa. Ti scriviamo noi.</Avviso>
  ) : (
    <Avviso>
      {ritorno.errore ??
        'Non vediamo ancora il pagamento. Se l’hai completato, ricarica la pagina fra qualche minuto.'}
    </Avviso>
  )

  const aggiungi = famiglia ? null : (
    <Testo variante="piccolo">
      {`Manca un bambino${fascia ? ` ${fascia}` : ''}? Aggiungilo dalla `}
      <Text style={{ color: c.accento, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(`${paginaEventoSito(evento.slug)}#prenota`)}>
        pagina dell’evento
      </Text>
      : inserisci di nuovo la tua email e i suoi dati, e ti mandiamo un link che lo comprende.
    </Testo>
  )

  return (
    <Pagina larga titolo={evento.titolo} sottotitolo={`${nome ? `Ciao ${nome} · ` : ''}${giornoEsteso(evento.data)}`}>
      {avvisoRitorno}
      {persone.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stili.fila}>
          {persone.map((p) => {
            const attivo = p.member_id === persona?.member_id
            return (
              <Scelta key={p.member_id} scelta={attivo} onPress={() => setSceltaId(p.member_id)} etichetta={`Prenota per ${nomeDi(p)}`} stile={attivo ? stili.personaScelta : stili.persona}>
                <Text style={[attivo ? stili.nomeScelto : stili.nomePersona, { color: attivo ? c.suAccento : c.testoSecondario }]}>
                  {nomeDi(p)}
                  {p.prenotato ? ' ✓' : ''}
                </Text>
              </Scelta>
            )
          })}
        </ScrollView>
      ) : null}
      {persona ? (
        <Testo>
          Stai prenotando per <Forte>{nomeDi(persona)}</Forte>
        </Testo>
      ) : null}

      {turni.length === 0 ? (
        <Testo variante="attenuato">Le lezioni di questo evento non sono ancora in calendario. Riprova più tardi.</Testo>
      ) : (
        <Griglia minima={400}>
          {turni.map((t) => (
            <RigaTurno
              key={t.class_id}
              t={t}
              nome={nomeLezione}
              pagina={pagina}
              persona={persona}
              occupato={occupato}
              onScheda={pagina.scheda ? () => setSchedaAperta(true) : null}
              onPrenota={() => prenota(t)}
              onAcquista={() => acquista(t)}
            />
          ))}
        </Griglia>
      )}

      {persone.length === 0 ? (
        <>
          <Testo>
            {famiglia
              ? `Nella tua famiglia non troviamo nessuno che possa partecipare a questo evento${fascia ? ` (${fascia})` : ''}.`
              : `Nel tuo account non troviamo bambini${fascia ? ` ${fascia}` : ''}, che è la fascia di questo evento.`}
          </Testo>
          {fuori_fascia.length ? (
            <Testo variante="piccolo">Risultano: {fuori_fascia.map((p) => `${p.nome ?? 'senza nome'}${p.anno ? ` (${p.anno})` : ''}`).join(', ')}.</Testo>
          ) : null}
        </>
      ) : null}
      {persone.length && fuori_fascia.length ? (
        <Testo variante="piccolo">
          {`Per età non ${fuori_fascia.length === 1 ? 'può' : 'possono'} partecipare: ${fuori_fascia.map((p) => `${p.nome ?? 'senza nome'}${p.anno ? ` (${p.anno})` : ''}`).join(', ')}.`}
        </Testo>
      ) : null}
      {persone.length && persone.every((p) => p.prenotato) ? (
        <Testo>{persone.length > 1 ? 'Siete tutti prenotati: vi aspettiamo!' : 'Sei prenotato: ti aspettiamo!'}</Testo>
      ) : null}
      {aggiungi}

      <FinestraLezione scheda={schedaAperta ? pagina.scheda ?? null : null} titolo={nomeLezione} onChiudi={() => setSchedaAperta(false)} />
    </Pagina>
  )
}

const stili = StyleSheet.create({
  fila: { gap: spazio.due, paddingBottom: spazio.uno, alignItems: 'center' },
  persona: { borderRadius: 999, paddingVertical: spazio.uno, paddingHorizontal: spazio.due + 2 },
  personaScelta: { borderRadius: 999, paddingVertical: spazio.due + 2, paddingHorizontal: spazio.tre + 2 },
  nomePersona: { fontSize: 13, fontWeight: '600' },
  nomeScelto: { fontSize: 16, fontWeight: '700' },
  lezione: { borderWidth: 1, borderRadius: 20, padding: spazio.tre, gap: spazio.tre },
  testa: { flexDirection: 'row', gap: spazio.tre, alignItems: 'center' },
  nome: { fontSize: 18, fontWeight: '700', lineHeight: 23 },
  ora: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  posti: { minWidth: 62, borderRadius: 10, paddingVertical: spazio.uno, paddingHorizontal: spazio.due, alignItems: 'center', justifyContent: 'center' },
  numeroPosti: { fontSize: 24, fontWeight: '800', lineHeight: 28, fontVariant: ['tabular-nums'] },
  etichettaPosti: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  completa: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', paddingVertical: spazio.due },
})
