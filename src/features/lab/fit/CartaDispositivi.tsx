import { router } from 'expo-router'
import { useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { appleSaluteAttivo } from '../dispositivi/appleSalute'
import { datiAppleSalute, dopo, FORNITORI, giornoBreve, notaAppleSaluteDalWeb, riepilogoAppleSalute } from '../dispositivi/comune'
import { dispositiviCollegabili, type Dispositivi } from '../dispositivi/useDispositivi'
import { Icona } from '../ui/Icona'
import { Tocco } from '../ui/Tocco'
import { Bollino, Carta, Etichetta, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// «Collega i tuoi dispositivi» / «I tuoi dispositivi» (28/10/2026, richiesta di Maurizio: Apple Salute era troppo nascosto,
// dentro Relax). Una carta sua, accanto a «Il tuo corpo»: finche' non c'e' niente di collegato invita a collegare (Apple
// Salute su iPhone, Oura e Polar dove il club li ha attivati); a dispositivi collegati diventa «I tuoi dispositivi» e li
// elenca con lo stato e l'ultimo aggiornamento. Il tocco porta sempre alla schermata dei dispositivi, dove si fa tutto.
// Non compare nella vista cliente dello staff, ai minorenni, e dove non c'e' niente da collegare.

const apri = () => router.push('/allenamento/dispositivi')

export function CartaDispositivi({ disp }: { disp: Dispositivi }) {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  const apple = Platform.OS === 'ios'
  // Sempre al suo posto (28/10/2026): si nasconde solo in vista cliente, ai minorenni e dove non c'e' niente da collegare.
  // Se lo stato non e' ancora arrivato (o non e' arrivato) la carta c'e' lo stesso: il tocco porta alla schermata che lo rilegge.
  const noto = disp.stato?.ok ? disp.stato : null
  const appleDalleApp = !apple ? datiAppleSalute(disp.dati) : { ha: false, ultimo: null }
  if (disp.vista || (noto && !noto.maggiorenne) || (noto && !apple && !appleDalleApp.ha && !dispositiviCollegabili(disp.stato))) return null

  const collegamenti = disp.dati?.collegamenti ?? (disp.stato?.ok ? disp.stato.collegamenti : [])
  const appleAttivo = apple && appleSaluteAttivo()
  // Dal web: Apple Salute c'e' se l'app iPhone ha mandato dati, ma si aggiorna solo quando l'app si apre.
  const righe = [
    ...(appleAttivo || appleDalleApp.ha
      ? [{ id: 'apple', nome: t('Apple Salute', 'Apple Health'), attivo: true, sync: null as string | null, nota: appleDalleApp.ha ? notaAppleSaluteDalWeb(appleDalleApp.ultimo) : null }]
      : []),
    ...collegamenti.map((c) => ({
      id: c.fornitore,
      nome: FORNITORI[c.fornitore]?.nome ?? c.fornitore,
      attivo: c.stato === 'attivo',
      sync: c.ultimo_sync_il,
      nota: null as string | null,
    })),
  ]
  const collegati = righe.length > 0

  return (
    <Carta style={{ gap: spazio.tre }} onPress={apri}>
      <View style={stili.testa}>
        <Bollino icona="orologio" tono={collegati ? 'ok' : 'accento'} size={46} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{collegati ? t('I tuoi dispositivi', 'Your devices') : t('Collega i tuoi dispositivi', 'Connect your devices')}</Text>
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {collegati
              ? t('Sonno, passi e allenamenti che arrivano da loro.', 'Sleep, steps and workouts that come from them.')
              : apple
                ? t('Apple Salute, e dove c’è anche Oura e Polar: sonno, passi e allenamenti nell’app.', 'Apple Health, and Oura and Polar where available: sleep, steps and workouts in the app.')
                : t('Oura e Polar: sonno, recupero e allenamenti nell’app.', 'Oura and Polar: sleep, recovery and workouts in the app.')}
          </Text>
        </View>
      </View>
      {collegati ? (
        <View style={{ gap: spazio.due }}>
          {righe.map((r) => {
            const espandi = r.id === 'apple'
            const voci = espandi ? riepilogoAppleSalute(disp.dati) : []
            return (
              <View key={r.id} style={{ gap: spazio.due }}>
                <Tocco onPress={espandi ? () => setAperto((v) => !v) : apri} ruolo="button" etichetta={r.nome} scala={1}>
                  <View style={stili.riga}>
                    <View style={{ flex: 1 }}>
                      <Text style={[stili.nome, { color: p.testo }]}>{r.nome}</Text>
                      {r.nota && !aperto ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{r.nota}</Text> : null}
                      {r.sync ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t(`Aggiornato ${dopo(r.sync)}`, `Updated ${dopo(r.sync)}`)}</Text> : null}
                      {espandi ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{aperto ? t('Nascondi i dati', 'Hide data') : t('Vedi i dati che arrivano da qui', 'See the data coming from here')}</Text> : null}
                    </View>
                    {r.attivo ? <Etichetta testo={t('Collegato', 'Connected')} tono="ok" icona="ok" /> : <Etichetta testo={t('Da ricollegare', 'Reconnect')} tono="attenzione" />}
                    {espandi ? <Icona nome={aperto ? 'su' : 'giu'} size={18} colore={p.testoTerzo} /> : null}
                  </View>
                </Tocco>
                {espandi && aperto ? (
                  <View style={[stili.voci, { backgroundColor: p.incavo }]}>
                    {voci.map((v) => (
                      <View key={v.id} style={stili.voce}>
                        <Text style={[stili.piccola, { color: p.testoSecondario, flex: 1 }]}>{v.etichetta}</Text>
                        <Text style={[stili.piccola, { color: p.testo, fontFamily: F.bold }]}>
                          {v.valore ? `${v.valore}${v.giorno ? ` · ${giornoBreve(v.giorno)}` : ''}` : t('non ancora ricevuto', 'not received yet')}
                        </Text>
                      </View>
                    ))}
                    {r.nota ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{r.nota}</Text> : null}
                  </View>
                ) : null}
              </View>
            )
          })}
        </View>
      ) : null}
      <Pulsante testo={collegati ? t('Gestisci i dispositivi', 'Manage devices') : t('Collega', 'Connect')} icona={collegati ? 'orologio' : 'avanti'} variante={collegati ? 'contorno' : 'primario'} piccolo={collegati} onPress={apri} />
    </Carta>
  )
}

const stili = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  titolo: { fontFamily: F.extra, fontSize: 18 },
  nome: { fontFamily: F.bold, fontSize: 15 },
  nota: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
  voci: { borderRadius: 14, padding: spazio.tre, gap: 6 },
  voce: { flexDirection: 'row', justifyContent: 'space-between', gap: spazio.due },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
})
