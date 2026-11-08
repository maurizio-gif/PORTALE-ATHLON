import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { elencoRichieste, type RichiestaTeam } from '@/api/assistente'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { apriAssistente } from '../assistente/store'
import { rileggi } from '../notifiche/store'
import { Carta, Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { Schermata } from '../ui/Schermata'
import { F, FUOCO, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { quando } from './quando'
import { chiaveStato, ordinaRichieste, totaleNonLette, type ChiaveStato } from './richieste'

// «Le tue richieste» (08/11/2026): quello che la persona ha scritto al team dall'assistente e come e' andata. Con la risposta in app la trova qui, nel filo di ogni richiesta; con la
// risposta via email resta qui come storico (sola lettura). Si arriva dalla notifica «il team ti ha risposto» (`/assistenza`), dalla carta «Scrivi al team» appena inviata e da Club Life.
// Si rilegge a ogni ritorno sulla schermata: aprendo una richiesta le sue risposte risultano lette, e tornando indietro il pallino deve essere spento.

const STATO = (): Record<ChiaveStato, string> => ({
  'nuova-risposta': t('Nuova risposta del team', 'New reply from the team'),
  'in-attesa': t('In attesa del team', 'Waiting for the team'),
  risposto: t('Il team ha risposto', 'The team has replied'),
  chiusa: t('Chiusa', 'Closed'),
})

type Stato = { fase: 'carico' } | { fase: 'errore'; testo: string } | { fase: 'pronto'; richieste: RichiestaTeam[] }

export function ElencoRichieste() {
  const p = usePalette()
  const inVista = vistaCorrente() !== null
  const [stato, setStato] = useState<Stato>({ fase: 'carico' })

  const carica = useCallback(async () => {
    if (inVista) return
    const r = await elencoRichieste()
    if (!r.ok) return setStato((s) => (s.fase === 'pronto' ? s : { fase: 'errore', testo: r.errore }))
    setStato({ fase: 'pronto', richieste: ordinaRichieste(r.richieste) })
    // Il pallino del campanello si allinea a quello che l'elenco ha appena mostrato.
    void rileggi()
  }, [inVista])

  useFocusEffect(
    useCallback(() => {
      void carica()
    }, [carica]),
  )

  const daLeggere = stato.fase === 'pronto' ? totaleNonLette(stato.richieste) : 0
  const nomiStato = STATO()

  return (
    <Schermata
      titolo={t('Le tue richieste', 'Your requests')}
      sopratitolo={t('Assistenza', 'Support')}
      sottotitolo={t('Quello che hai scritto al team e le sue risposte.', 'What you’ve written to the team, and its replies.')}
      indietro="/"
    >
      {inVista ? (
        <Messaggio tono="attenzione" icona="info">
          {t('Vista cliente: le richieste sono del socio, e aprirle segnerebbe come lette le risposte del team. Le trovi nella sua scheda, dal pannello.', 'Client view: these requests belong to the member, and opening them would mark the team’s replies as read. You’ll find them on their profile in the panel.')}
        </Messaggio>
      ) : (
        <View style={{ gap: spazio.tre }}>
          {stato.fase === 'carico' ? <SchedeInArrivo quante={2} /> : null}
          {stato.fase === 'errore' ? (
            <>
              <Messaggio tono="errore">{stato.testo}</Messaggio>
              <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" onPress={() => void carica()} />
            </>
          ) : null}

          {stato.fase === 'pronto' && stato.richieste.length === 0 ? (
            <Carta piatta style={{ alignItems: 'center', gap: spazio.due, paddingVertical: spazio.cinque }}>
              <Text style={[stili.vuotoTitolo, { color: p.testo }]}>{t('Non hai ancora scritto al team', 'You haven’t written to the team yet')}</Text>
              <Text style={[stili.vuotoTesto, { color: p.testoSecondario }]}>
                {t('Se l’assistente non basta, ti propone di scrivere al team: la tua richiesta e la risposta le trovi qui.', 'If the assistant isn’t enough, it offers to write to the team: your request and the reply will be here.')}
              </Text>
              <Pulsante testo={t('Apri l’assistente', 'Open the assistant')} icona="assistente" piccolo pieno={false} onPress={() => apriAssistente('assistenza')} />
            </Carta>
          ) : null}

          {stato.fase === 'pronto' && stato.richieste.length > 0 ? (
            <>
              {daLeggere > 0 ? (
                <Text style={[stili.contatore, { color: p.accento }]}>{daLeggere === 1 ? t('1 risposta da leggere', '1 reply to read') : t(`${daLeggere} risposte da leggere`, `${daLeggere} replies to read`)}</Text>
              ) : null}
              {stato.richieste.map((r) => {
                const chiave = chiaveStato(r)
                const nuova = chiave === 'nuova-risposta'
                return (
                  <Carta key={r.id} onPress={() => router.push({ pathname: '/assistenza/[id]', params: { id: r.id } })} style={stili.voce}>
                    <View style={[stili.pallino, { backgroundColor: nuova ? FUOCO[1] : 'transparent' }]} accessibilityLabel={nuova ? t('Risposta da leggere', 'Reply to read') : undefined} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={stili.titoloRiga}>
                        <Text style={[stili.titolo, { color: p.testo, fontFamily: nuova ? F.extra : F.bold }]} numberOfLines={2}>
                          {r.anteprima || t('Richiesta al team', 'Request to the team')}
                        </Text>
                        <Text style={[stili.quando, { color: p.testoTerzo }]}>{quando(r.aggiornato_il)}</Text>
                      </View>
                      <Text style={[stili.sotto, { color: nuova ? p.accento : p.testoSecondario }]} numberOfLines={1}>
                        {nomiStato[chiave]} · {r.canale === 'app' ? t('risposta in app', 'reply in the app') : t('risposta via email', 'reply by email')}
                      </Text>
                    </View>
                  </Carta>
                )
              })}
            </>
          ) : null}
        </View>
      )}
    </Schermata>
  )
}

const stili = StyleSheet.create({
  contatore: { fontFamily: F.semi, fontSize: 13, paddingHorizontal: 4 },
  voce: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre - 2, paddingVertical: spazio.tre },
  pallino: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  titoloRiga: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spazio.due },
  titolo: { flex: 1, fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  quando: { fontFamily: F.medio, fontSize: 12, marginTop: 3 },
  sotto: { fontFamily: F.semi, fontSize: 13 },
  vuotoTitolo: { fontFamily: F.extra, fontSize: 18, textAlign: 'center' },
  vuotoTesto: { fontFamily: F.medio, fontSize: 14, textAlign: 'center' },
})
