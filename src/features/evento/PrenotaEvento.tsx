import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'

import { chiamaLink } from '@/api/link'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Casella } from '@/components/Casella'
import { Pagina } from '@/components/Pagina'
import { Scelta } from '@/components/Scelta'
import { Forte, Testo } from '@/components/Testo'
import { giornoEsteso, nomeDi, ora, paginaEventoSito, type EsitoPrenotazione, type PaginaEvento, type Turno } from '@/lib/eventi'
import { spazio, useColori } from '@/theme'

// Prima il turno, poi i bambini. Ripreso dal CRM (`app/eventi/[codice]/PrenotaEvento.tsx`).
//
// I turni vengono prima perche' sono la cosa contesa: con due figli, sapere se
// nello stesso turno restano due posti e' la prima domanda. Nel secondo passo
// non si possono spuntare piu' bambini dei posti che restano. Un bambino gia'
// prenotato si vede, e non si riprenota: l'evento e' uno, e la funzione
// rifiuta comunque un secondo turno per lo stesso bambino.

type Schermata = 'turni' | 'bambini' | 'esito'

function postiLeggibili(t: Turno): string {
  if (t.chiuso) return 'Già cominciato'
  if (t.liberi <= 0) return 'Completo'
  if (t.liberi === 1) return 'Ultimo posto'
  return `${t.liberi} posti liberi`
}

export function PrenotaEvento({ token, nome, iniziale }: { token: string; nome: string | null; iniziale: PaginaEvento }) {
  const c = useColori()
  const [pagina, setPagina] = useState(iniziale)
  const [schermata, setSchermata] = useState<Schermata>('turni')
  const [turnoId, setTurnoId] = useState<number | null>(null)
  const [scelti, setScelti] = useState<Set<number>>(new Set())
  const [risultati, setRisultati] = useState<EsitoPrenotazione[]>([])
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)

  const { evento, turni, bambini, fuori_fascia } = pagina
  const turno = turni.find((t) => t.class_id === turnoId) ?? null
  const daPrenotare = bambini.filter((b) => !b.prenotato)
  const fascia = `nati dal ${evento.nati_dal} al ${evento.nati_al}`
  const titolo = nome ? `Ciao ${nome}` : evento.titolo
  const sottotitolo = `${nome ? `${evento.titolo} · ` : ''}${giornoEsteso(evento.data)}`

  async function ricarica() {
    const { ok, dati } = await chiamaLink(token, 'pagina')
    if (ok) setPagina(dati as unknown as PaginaEvento)
  }

  function scegliTurno(t: Turno) {
    setErrore('')
    setTurnoId(t.class_id)
    // Si parte coi bambini da prenotare gia' spuntati, fino ai posti che
    // restano: il caso normale e' «tutti i miei figli, nello stesso turno».
    setScelti(new Set(daPrenotare.slice(0, Math.max(0, t.liberi)).map((b) => b.member_id)))
    setSchermata('bambini')
  }

  function cambia(id: number) {
    setScelti((prima) => {
      const dopo = new Set(prima)
      if (dopo.has(id)) dopo.delete(id)
      else dopo.add(id)
      return dopo
    })
  }

  async function prenota() {
    if (!turno || !scelti.size) return
    setErrore('')
    setAttesa(true)
    const { ok, dati } = await chiamaLink(token, 'prenota', { class_id: turno.class_id, membri: [...scelti] })
    if (ok && Array.isArray(dati.risultati)) {
      setRisultati(dati.risultati as EsitoPrenotazione[])
      setSchermata('esito')
    } else {
      setErrore(dati.errore ?? 'Non siamo riusciti a prenotare adesso. Riprova fra qualche minuto.')
    }
    await ricarica()
    setAttesa(false)
  }

  const aggiungi = (
    <Testo variante="piccolo">
      Manca un bambino nato fra il {evento.nati_dal} e il {evento.nati_al}? Aggiungilo dalla{' '}
      <Text style={{ color: c.accento, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(`${paginaEventoSito(evento.slug)}#prenota`)}>
        pagina dell’evento
      </Text>
      : inserisci di nuovo la tua email e i suoi dati, e ti mandiamo un link che lo comprende.
    </Testo>
  )

  if (schermata === 'esito' && turno) {
    const tutti = risultati.length > 0 && risultati.every((r) => r.esito === 'prenotato')
    return (
      <Pagina titolo={tutti ? 'Prenotazione fatta!' : 'Ecco com’è andata'} sottotitolo={sottotitolo}>
        <View style={{ gap: spazio.due }}>
          {risultati.map((r) => {
            const b = bambini.find((x) => x.member_id === r.member_id)
            return (
              <Avviso key={r.member_id} tono={r.esito === 'prenotato' ? 'ok' : r.esito === 'attesa' ? 'attenzione' : 'errore'}>
                <Testo>
                  <Forte>{b ? nomeDi(b) : 'Bambino'}</Forte>
                  {' — '}
                  {r.esito === 'prenotato' ? `prenotato alle ${ora(turno.inizio)}` : null}
                  {r.esito === 'attesa' ? `in lista d’attesa alle ${ora(turno.inizio)}: i posti sono finiti mentre prenotavi` : null}
                  {r.esito === 'errore' ? r.errore : null}
                </Testo>
              </Avviso>
            )
          })}
        </View>
        {risultati.some((r) => r.esito === 'prenotato') ? (
          <Testo>
            Vi aspettiamo {giornoEsteso(evento.data)} alle <Forte>{ora(turno.inizio)}</Forte>. La prenotazione la trovi anche nell’app Athlon,
            alla voce Prenotazioni, a nome del bambino.
          </Testo>
        ) : null}
        <Bottone
          testo="Torna ai turni"
          variante="contorno"
          onPress={() => {
            setSchermata('turni')
            setTurnoId(null)
          }}
        />
      </Pagina>
    )
  }

  if (schermata === 'bambini' && turno) {
    const pieno = scelti.size >= turno.liberi
    return (
      <Pagina titolo="Per chi prenoti?" sottotitolo={`Turno delle ${ora(turno.inizio)} · ${postiLeggibili(turno)}`}>
        <View style={{ gap: spazio.due }}>
          {bambini.map((b) => {
            if (b.prenotato) {
              const suo = turni.find((t) => t.class_id === b.prenotato!.class_id)
              return (
                <View key={b.member_id} style={[stili.spento, { borderColor: c.bordo }]}>
                  <Testo>
                    <Forte>{nomeDi(b)}</Forte>
                    {b.anno ? ` · ${b.anno}` : ''}
                  </Testo>
                  <Testo variante="piccolo">
                    {b.prenotato.attesa ? 'In lista d’attesa' : 'Già prenotato'}
                    {suo ? ` alle ${ora(suo.inizio)}` : ''}
                  </Testo>
                </View>
              )
            }
            const preso = scelti.has(b.member_id)
            const bloccato = !preso && pieno
            return (
              <View key={b.member_id} style={{ opacity: bloccato ? 0.5 : 1 }} pointerEvents={bloccato ? 'none' : 'auto'}>
                <Casella riquadro spuntata={preso} onCambia={() => cambia(b.member_id)} etichetta={nomeDi(b)}>
                  <Testo>
                    <Forte>{nomeDi(b)}</Forte>
                    {b.anno ? ` · ${b.anno}` : ''}
                  </Testo>
                </Casella>
              </View>
            )
          })}
        </View>
        {pieno && daPrenotare.length > scelti.size ? (
          <Testo variante="piccolo">
            In questo turno {turno.liberi === 1 ? 'resta un posto solo' : `restano ${turno.liberi} posti`}: per gli altri bambini scegli un altro turno.
          </Testo>
        ) : null}
        {errore ? <Avviso>{errore}</Avviso> : null}
        <Bottone
          testo={scelti.size > 1 ? `Prenota ${scelti.size} posti alle ${ora(turno.inizio)}` : `Prenota alle ${ora(turno.inizio)}`}
          onPress={prenota}
          inCorso={attesa}
          disabilitato={scelti.size === 0}
        />
        <Bottone
          testo="Cambia turno"
          variante="contorno"
          disabilitato={attesa}
          onPress={() => {
            setErrore('')
            setSchermata('turni')
          }}
        />
        {aggiungi}
      </Pagina>
    )
  }

  const tuttiPrenotati = bambini.length > 0 && daPrenotare.length === 0
  return (
    <Pagina titolo={titolo} sottotitolo={sottotitolo}>
      {turni.length === 0 ? (
        <Testo variante="attenuato">I turni di questo evento non sono ancora in calendario. Riprova più tardi, o scrivici a desk@athlonroma.it.</Testo>
      ) : (
        <>
          <Testo variante="sottotitolo" style={{ fontSize: 17 }}>
            Scegli il turno
          </Testo>
          <View style={{ gap: spazio.due }}>
            {turni.map((t) => {
              const spento = t.chiuso || t.liberi <= 0 || daPrenotare.length === 0
              const loro = bambini.filter((b) => b.prenotato?.class_id === t.class_id)
              return (
                <Scelta key={t.class_id} scelta={false} spento={spento} onPress={() => scegliTurno(t)} stile={stili.turno} etichetta={`Turno ${ora(t.inizio)}, ${postiLeggibili(t)}`}>
                  <Text style={[stili.oraTurno, { color: c.testo }]}>
                    {ora(t.inizio)} – {ora(t.fine)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Testo variante="piccolo" style={{ color: c.testo }}>
                      {postiLeggibili(t)}
                    </Testo>
                    {loro.length ? <Testo variante="piccolo">Prenotato: {loro.map((b) => b.nome ?? nomeDi(b)).join(', ')}</Testo> : null}
                  </View>
                </Scelta>
              )
            })}
          </View>
        </>
      )}
      {bambini.length === 0 ? (
        <>
          <Testo>Nel tuo account non troviamo bambini {fascia}, che è la fascia di questo evento.</Testo>
          {fuori_fascia.length ? (
            <Testo variante="piccolo">Risultano: {fuori_fascia.map((p) => `${p.nome ?? 'senza nome'}${p.anno ? ` (${p.anno})` : ''}`).join(', ')}.</Testo>
          ) : null}
        </>
      ) : tuttiPrenotati ? (
        <Testo>Tutti i tuoi bambini {fascia} sono già prenotati: vi aspettiamo!</Testo>
      ) : (
        <Testo variante="piccolo">Al passo dopo scegli per quali bambini prenotare. Sono quelli del tuo account {fascia}.</Testo>
      )}
      {aggiungi}
    </Pagina>
  )
}

const stili = StyleSheet.create({
  turno: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, paddingVertical: spazio.tre },
  oraTurno: { fontSize: 17, fontWeight: '700', minWidth: 112 },
  spento: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, opacity: 0.6 },
})
