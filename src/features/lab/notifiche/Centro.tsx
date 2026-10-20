import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { conPulsante, leggiElenco, leggiTutte, segna, type NotificaApp } from '@/api/notifiche'
import { spazio } from '@/theme'

import { Foglio } from '../ui/Foglio'
import { Carta, Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { vistaCorrente } from '../vista'
import { apriDestinazione } from './apri'
import { AttivaPush } from './AttivaPush'
import { rileggi, tutteLette, unaLetta } from './store'

// Il centro notifiche (20/10/2026): tutto quello che il club ha scritto, dalla piu' recente, con un pallino sulle non lette.
// Si arriva dal campanello della Home, o dal tocco su una notifica push (`/notifiche?apri=<id>`, che apre subito quella).
//
// **Si apre una notifica toccandola**: da li' e' `aperta` (dal centro) e il pallino si spegne; il pulsante e' `azione`.
// «Segna tutte come lette» toglie i pallini ma **non conta come apertura**: il club vuole sapere chi l'ha letta davvero.
// Nella vista cliente dello staff non si apre: sono le notifiche del socio, e guardarle le segnerebbe come viste.

/** «oggi 10:30», «ieri», «12 ott»: all'ora di Roma. */
function quando(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const giorno = (x: Date) => x.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
  const oggi = new Date()
  if (giorno(d) === giorno(oggi)) return `oggi ${ora}`
  if (giorno(d) === giorno(new Date(oggi.getTime() - 86_400_000))) return `ieri ${ora}`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
}

type Stato = { fase: 'carico' } | { fase: 'errore'; testo: string } | { fase: 'pronto'; notifiche: NotificaApp[] }

export function CentroNotifiche() {
  const p = usePalette()
  const { apri } = useLocalSearchParams<{ apri?: string }>()
  const [stato, setStato] = useState<Stato>({ fase: 'carico' })
  const [aperta, setAperta] = useState<NotificaApp | null>(null)
  const inVista = vistaCorrente() !== null

  const carica = useCallback(async () => {
    if (inVista) return
    const r = await leggiElenco()
    if (!r.ok) return setStato({ fase: 'errore', testo: r.errore })
    setStato({ fase: 'pronto', notifiche: r.notifiche })
    // Il pallino della Home si allinea a quello che il centro ha appena mostrato.
    void rileggi()
  }, [inVista])

  useEffect(() => {
    void carica()
  }, [carica])

  function segnaLetta(n: NotificaApp) {
    setStato((s) => (s.fase === 'pronto' ? { fase: 'pronto', notifiche: s.notifiche.map((x) => (x.id === n.id ? { ...x, letta: true, aperta: true } : x)) } : s))
    if (!n.letta) unaLetta()
  }

  function apriVoce(n: NotificaApp) {
    segna(n.id, 'aperta', 'centro')
    segnaLetta(n)
    setAperta({ ...n, letta: true, aperta: true })
  }

  // Dal tocco su una push: si apre subito la notifica, una volta sola.
  useEffect(() => {
    if (!apri || stato.fase !== 'pronto') return
    const n = stato.notifiche.find((x) => x.notifica === apri || x.id === apri)
    router.setParams({ apri: '' })
    if (n) apriVoce(n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apri, stato.fase])

  async function leggiTutteOra() {
    if (await leggiTutte()) {
      setStato((s) => (s.fase === 'pronto' ? { fase: 'pronto', notifiche: s.notifiche.map((x) => ({ ...x, letta: true })) } : s))
      tutteLette()
    }
  }

  function premiPulsante(n: NotificaApp) {
    segna(n.id, 'azione', 'centro')
    setAperta(null)
    apriDestinazione(n)
  }

  function nascondi(n: NotificaApp) {
    segna(n.id, 'nascosta')
    if (!n.letta) unaLetta()
    setStato((s) => (s.fase === 'pronto' ? { fase: 'pronto', notifiche: s.notifiche.filter((x) => x.id !== n.id) } : s))
    setAperta(null)
  }

  const nonLette = stato.fase === 'pronto' ? stato.notifiche.filter((n) => !n.letta).length : 0

  return (
    <Schermata titolo="Notifiche" sopratitolo="Dal club" sottotitolo="Quello che il club ti ha scritto." indietro="/">
      {inVista ? (
        <Messaggio tono="attenzione" icona="info">
          Vista cliente: le notifiche sono del socio, e guardarle le segnerebbe come viste. Le trovi nella sua scheda, dal pannello.
        </Messaggio>
      ) : (
        <View style={{ gap: spazio.tre }}>
          <AttivaPush />

          {stato.fase === 'carico' ? <SchedeInArrivo quante={2} /> : null}
          {stato.fase === 'errore' ? (
            <>
              <Messaggio tono="errore">{stato.testo}</Messaggio>
              <Pulsante testo="Riprova" icona="aggiorna" onPress={() => void carica()} />
            </>
          ) : null}

          {stato.fase === 'pronto' && stato.notifiche.length === 0 ? (
            <Carta piatta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
              <Text style={[stili.vuotoTitolo, { color: p.testo }]}>Nessuna notifica</Text>
              <Text style={[stili.vuotoTesto, { color: p.testoSecondario }]}>Quando il club ti scrive, lo trovi qui.</Text>
            </Carta>
          ) : null}

          {stato.fase === 'pronto' && stato.notifiche.length > 0 ? (
            <>
              {nonLette > 0 ? (
                <View style={stili.testaElenco}>
                  <Text style={[stili.contatore, { color: p.testoSecondario }]}>{nonLette === 1 ? '1 da leggere' : `${nonLette} da leggere`}</Text>
                  <Tocco onPress={() => void leggiTutteOra()} etichetta="Segna tutte come lette">
                    <Text style={[stili.link, { color: p.accento }]}>Segna tutte come lette</Text>
                  </Tocco>
                </View>
              ) : null}
              {stato.notifiche.map((n) => (
                <Carta key={n.id} onPress={() => apriVoce(n)} style={stili.voce}>
                  <View style={[stili.pallino, { backgroundColor: n.letta ? 'transparent' : FUOCO[1] }]} accessibilityLabel={n.letta ? undefined : 'Da leggere'} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={stili.titoloRiga}>
                      <Text style={[stili.titolo, { color: p.testo, fontFamily: n.letta ? F.bold : F.extra }]} numberOfLines={2}>
                        {n.titolo}
                      </Text>
                      <Text style={[stili.quando, { color: p.testoTerzo }]}>{quando(n.creata_il)}</Text>
                    </View>
                    <Text style={[stili.anteprima, { color: p.testoSecondario }]} numberOfLines={2}>
                      {n.testo}
                    </Text>
                    {n.per?.nome ? <Text style={[stili.per, { color: p.accento }]}>Per {n.per.nome}</Text> : null}
                  </View>
                </Carta>
              ))}
            </>
          ) : null}
        </View>
      )}

      <Foglio aperto={aperta !== null} titolo={aperta?.titolo ?? ''} sottotitolo={aperta ? [aperta.per?.nome ? `Per ${aperta.per.nome}` : null, quando(aperta.creata_il)].filter(Boolean).join(' · ') : undefined} onChiudi={() => setAperta(null)}>
        {aperta ? (
          <View style={{ gap: spazio.tre }}>
            <Text style={[stili.dettaglio, { color: p.testo }]} selectable>
              {aperta.testo}
            </Text>
            {conPulsante(aperta) ? <Pulsante testo={aperta.etichetta ?? 'Apri'} icona="avanti" onPress={() => premiPulsante(aperta)} /> : null}
            <Pulsante testo="Togli dall’elenco" variante="fantasma" piccolo onPress={() => nascondi(aperta)} />
          </View>
        ) : null}
      </Foglio>
    </Schermata>
  )
}

const stili = StyleSheet.create({
  testaElenco: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  contatore: { fontFamily: F.semi, fontSize: 13 },
  link: { fontFamily: F.bold, fontSize: 13 },
  voce: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre - 2, paddingVertical: spazio.tre },
  pallino: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  titoloRiga: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spazio.due },
  titolo: { flex: 1, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  quando: { fontFamily: F.medio, fontSize: 12, marginTop: 3 },
  anteprima: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  per: { fontFamily: F.bold, fontSize: 12 },
  dettaglio: { fontFamily: F.medio, fontSize: 16, lineHeight: 24 },
  vuotoTitolo: { fontFamily: F.extra, fontSize: 18 },
  vuotoTesto: { fontFamily: F.medio, fontSize: 14, textAlign: 'center' },
})
