import { useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'

import { chiamaLink } from '@/api/link'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Griglia } from '@/components/Griglia'
import { Pagina } from '@/components/Pagina'
import { Scelta } from '@/components/Scelta'
import { Forte, Testo } from '@/components/Testo'
import { FinestraLezione, Fotina } from '@/features/lab/SchedaLezione'
import { giornoEsteso, nomeDi, ora, paginaEventoSito, type EsitoPrenotazione, type PaginaEvento, type Persona, type Turno } from '@/lib/eventi'
import { spazio, stileTono, useColori, type Tono } from '@/theme'

// La prenotazione di un evento dal link per email, come il calendario del
// laboratorio: in alto per chi si prenota («Stai prenotando per …»), sotto le
// lezioni dell'evento con foto, scheda e posti liberi. Senza login: il link
// vale per il nucleo dell'email che l'ha chiesto, e chi si puo' prenotare lo
// decide perfectgym-eventi (fascia dell'evento e regole d'eta' del calendario).
//
// L'evento e' uno: chi e' gia' prenotato in un turno non si prenota in un
// altro (la funzione lo rifiuta comunque), e la scheda lo dice.

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
}: {
  t: Turno
  nome: string
  pagina: PaginaEvento
  persona: Persona | null
  occupato: boolean
  onScheda: (() => void) | null
  onPrenota: () => Promise<{ testo: string; tono: Tono } | null>
}) {
  const c = useColori()
  const [attesa, setAttesa] = useState(false)
  const [esito, setEsito] = useState<{ testo: string; tono: Tono } | null>(null)
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

  let azione: React.ReactNode
  if (t.chiuso) azione = <Testo variante="piccolo">Già cominciato.</Testo>
  else if (!persona) azione = null
  else if (qui) azione = <Avviso tono={suo!.attesa ? 'attenzione' : 'ok'}>{`${persona.nome ?? nomeDi(persona)} è ${suo!.attesa ? 'in lista d’attesa' : 'prenotato'} qui.`}</Avviso>
  else if (altrove) azione = <Bottone testo={`Già prenotato alle ${ora(altrove.inizio)}`} variante="contorno" onPress={() => {}} disabilitato />
  else if (t.liberi <= 0) azione = <Bottone testo="Completo" variante="contorno" onPress={() => {}} disabilitato />
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
      {loro.length ? <Testo variante="piccolo">{`Prenotati qui: ${loro.map((p) => p.nome ?? nomeDi(p)).join(', ')}`}</Testo> : null}
      {azione}
      {esito ? <Avviso tono={esito.tono}>{esito.testo}</Avviso> : null}
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

  async function prenota(t: Turno): Promise<{ testo: string; tono: Tono } | null> {
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
    return { testo: r?.errore ?? 'PerfectGym non ha accettato la prenotazione.', tono: 'errore' }
  }

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
        <Testo variante="attenuato">Le lezioni di questo evento non sono ancora in calendario. Riprova più tardi, o scrivici a desk@athlonroma.it.</Testo>
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
