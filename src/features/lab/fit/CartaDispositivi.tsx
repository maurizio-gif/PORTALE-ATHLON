import { router } from 'expo-router'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { appleSaluteAttivo } from '../dispositivi/appleSalute'
import { dopo, FORNITORI } from '../dispositivi/comune'
import { dispositiviCollegabili, relaxAperto, type Dispositivi } from '../dispositivi/useDispositivi'
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
  const apple = Platform.OS === 'ios'
  if (disp.vista || !relaxAperto(disp.stato) || !(apple || dispositiviCollegabili(disp.stato))) return null

  const collegamenti = disp.dati?.collegamenti ?? (disp.stato?.ok ? disp.stato.collegamenti : [])
  const appleAttivo = apple && appleSaluteAttivo()
  const righe = [
    ...(appleAttivo
      ? [{ id: 'apple', nome: t('Apple Salute', 'Apple Health'), attivo: true, sync: null as string | null }]
      : []),
    ...collegamenti.map((c) => ({
      id: c.fornitore,
      nome: FORNITORI[c.fornitore]?.nome ?? c.fornitore,
      attivo: c.stato === 'attivo',
      sync: c.ultimo_sync_il,
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
          {righe.map((r) => (
            <View key={r.id} style={stili.riga}>
              <View style={{ flex: 1 }}>
                <Text style={[stili.nome, { color: p.testo }]}>{r.nome}</Text>
                {r.sync ? <Text style={[stili.piccola, { color: p.testoSecondario }]}>{t(`Aggiornato ${dopo(r.sync)}`, `Updated ${dopo(r.sync)}`)}</Text> : null}
              </View>
              {r.attivo ? <Etichetta testo={t('Attivo', 'On')} tono="ok" icona="ok" /> : <Etichetta testo={t('Da ricollegare', 'Reconnect')} tono="attenzione" />}
            </View>
          ))}
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
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
})
