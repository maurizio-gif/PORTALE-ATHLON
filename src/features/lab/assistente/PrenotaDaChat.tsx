import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { leggiGiorno, type Giorno, type Lezione } from '@/api/lab'
import { pulsanteToccato } from '@/api/assistente'
import { ora } from '@/lib/eventi'
import { locale, t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { AzioniLezione } from '../Calendario'
import { dimenticaGiornoCalendario } from '../percorso/useSettimana'
import { Icona } from '../ui/Icona'
import { Etichetta, Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { usePrenotazioneLezione } from '../usePrenotazioneLezione'
import { conPrenotazioneLezione, type ProponePrenotazione } from './prenotaDaChat'

// La proposta di una prenotazione nella chat (30/10/2026): un pulsante con la lezione che l'assistente propone e, toccandolo, una carta con la lezione **letta dal
// calendario** (posti, orario, se e' gia' prenotata o aperta) e gli stessi pulsanti del Calendario (`AzioniLezione`: prenota, lista d'attesa, disdici, acquista se non e'
// compresa, e i motivi per cui non si puo'). **Niente parte da solo**: la prenotazione parte solo con «Prenota» sulla carta. Tutte le regole (limite della categoria,
// apertura tre giorni prima, lezione non compresa) sono quelle del Calendario: se qui non si puo', la carta lo dice con le sue parole.
// La lezione non si fida del testo del modello: nome, orario e posti arrivano dal calendario, non dalla risposta.

type Carta = { lezione: Lezione; giorno: Giorno }

const quando = (iso: string) => `${new Date(iso).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })} · ${ora(iso)}`

function CartaLezione({ proposta, carta, onVai, onCambia }: { proposta: ProponePrenotazione; carta: Carta; onVai: () => void; onCambia: (l: Lezione) => void }) {
  const p = usePalette()
  const { lezione: l, giorno } = carta
  const memberId = proposta.memberId && giorno.persone.some((x) => x.member_id === proposta.memberId) ? proposta.memberId : giorno.member_id
  const chi = giorno.persone.length > 1 ? giorno.persone.find((x) => x.member_id === memberId) : null

  const aggiorna = (prenotazione: Lezione['prenotazione'], delta: number, deltaAttesa: number) => {
    dimenticaGiornoCalendario(proposta.giorno, memberId)
    onCambia(conPrenotazioneLezione(l, prenotazione, delta, deltaAttesa))
  }
  const azioni = usePrenotazioneLezione(memberId, {
    prenotata: (_id, b) => aggiorna(b, b.attesa ? 0 : 1, b.attesa ? 1 : 0),
    disdetta: (_id, inAttesa) => aggiorna(null, inAttesa ? 0 : -1, inAttesa ? -1 : 0),
  })
  // Pagare porta fuori dal foglio (la pagina di Adyen o il Calendario): il foglio si chiude.
  const seAndata = async (r: Promise<string | null>) => {
    const problema = await r
    if (!problema) onVai()
    return problema
  }

  const posti = l.liberi > 0 ? t(`${l.liberi} ${l.liberi === 1 ? 'posto libero' : 'posti liberi'}`, `${l.liberi} ${l.liberi === 1 ? 'spot available' : 'spots available'}`) : t('Completa: ti metti in lista d’attesa', 'Full: you’d join the waiting list')
  return (
    <View style={[stili.carta, { backgroundColor: p.incavo, borderColor: p.linea }]}>
      <View style={{ gap: 2 }}>
        <Text style={[stili.nome, { color: p.testo }]}>{l.nome}</Text>
        <Text style={[stili.riga, { color: p.testoSecondario }]}>{quando(l.inizio)}</Text>
        {l.istruttore ? <Text style={[stili.riga, { color: p.testoSecondario }]}>{t('con', 'with')} {l.istruttore}</Text> : null}
        {!l.iniziata && !l.prenotazione ? <Text style={[stili.riga, { color: p.testoSecondario }]}>{posti}</Text> : null}
        {chi ? <Text style={[stili.riga, { color: p.testo, fontFamily: F.bold }]}>{t('Per', 'For')} {chi.nome ?? ''}</Text> : null}
      </View>
      {l.prenotazione ? (
        <View style={{ flexDirection: 'row' }}>
          <Etichetta testo={l.prenotazione.attesa ? t('In lista d’attesa', 'On the waiting list') : t('Prenotata', 'Booked')} tono={l.prenotazione.attesa ? 'attenzione' : 'ok'} icona={l.prenotazione.attesa ? 'clessidra' : 'spunta'} />
        </View>
      ) : null}
      {l.iniziata && !l.prenotazione ? <Messaggio tono="attenzione">{t('Questa lezione è già cominciata.', 'This class has already started.')}</Messaggio> : null}
      {!l.prenotazione && !l.iniziata && !l.prenotabile_dal && !l.limite ? (
        <Text style={[stili.riga, { color: p.testoTerzo }]}>{t('Controlla e conferma: la prenotazione parte solo quando tocchi il pulsante.', 'Check and confirm: the booking only goes through when you tap the button.')}</Text>
      ) : null}
      <AzioniLezione
        l={l}
        scheda={null}
        onScheda={() => undefined}
        occupato={azioni.occupato}
        onPrenota={() => azioni.prenota(l.class_id)}
        onAcquista={(url) => seAndata(azioni.acquista(l.class_id, url))}
        onPagaCarta={(id) => seAndata(azioni.pagaCarta(id))}
        onDisdici={() => azioni.disdici(l.class_id, !!l.prenotazione?.attesa)}
      />
    </View>
  )
}

export function PrenotaDaChat({ proposta, messaggioId, onVai }: { proposta: ProponePrenotazione; messaggioId: string | null; onVai: () => void }) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)
  const [carta, setCarta] = useState<Carta | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [nonTrovata, setNonTrovata] = useState(false)
  const [tentativo, setTentativo] = useState(0)

  useEffect(() => {
    if (!aperta || carta || nonTrovata) return
    let vivo = true
    setErrore(null)
    leggiGiorno(proposta.giorno, proposta.memberId).then((r) => {
      if (!vivo) return
      if (!r.ok) return setErrore(r.errore)
      const lezione = r.giorno.lezioni.find((x) => x.class_id === proposta.classId)
      if (lezione) setCarta({ lezione, giorno: r.giorno })
      else setNonTrovata(true)
    })
    return () => {
      vivo = false
    }
  }, [aperta, carta, nonTrovata, tentativo, proposta.giorno, proposta.memberId, proposta.classId])

  return (
    <View style={{ gap: spazio.due, width: '100%', minWidth: 0 }}>
      {!aperta ? (
        <Tocco
          etichetta={proposta.etichetta}
          onPress={() => {
            if (messaggioId) pulsanteToccato(messaggioId, 'prenota-lezione')
            setAperta(true)
          }}
          style={[stili.proposta, { backgroundColor: p.accento }]}
        >
          <Icona nome="calendario" size={15} colore="#fff" />
          <Text style={stili.propostaTesto} numberOfLines={2}>
            {proposta.etichetta}
          </Text>
        </Tocco>
      ) : errore ? (
        <>
          <Messaggio>{errore}</Messaggio>
          <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" piccolo onPress={() => {
              setErrore(null)
              setTentativo((n) => n + 1)
            }} />
        </>
      ) : nonTrovata ? (
        <>
          <Messaggio tono="attenzione">{t('Non troviamo più questa lezione nel calendario: potrebbe essere stata spostata o annullata.', 'We can’t find this class in the calendar anymore: it may have been moved or cancelled.')}</Messaggio>
          <Pulsante
            testo={t('Apri il calendario del giorno', 'Open that day in the calendar')}
            variante="secondario"
            piccolo
            onPress={() => {
              onVai()
              router.navigate({ pathname: '/calendario', params: { giorno: proposta.giorno } })
            }}
          />
        </>
      ) : !carta ? (
        <SchedeInArrivo quante={1} />
      ) : (
        <CartaLezione proposta={proposta} carta={carta} onVai={onVai} onCambia={(lezione) => setCarta({ ...carta, lezione })} />
      )}
    </View>
  )
}

const stili = StyleSheet.create({
  proposta: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', maxWidth: '100%' },
  propostaTesto: { fontFamily: F.semi, fontSize: 14, color: '#fff', flexShrink: 1 },
  carta: { borderRadius: 18, borderWidth: 1, padding: spazio.tre, gap: spazio.tre, minWidth: 0 },
  nome: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3 },
  riga: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19, flexShrink: 1 },
})
