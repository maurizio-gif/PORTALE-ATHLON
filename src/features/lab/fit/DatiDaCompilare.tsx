import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Richiamo } from '../profilo/Richiamo'
import { Icona } from '../ui/Icona'
import { Pulsante, Tag } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { type DatoMancante } from './calcoloDatiCorpo'

// I dati del corpo da compilare (29/10/2026, richiesta di Maurizio): altezza, peso e sesso (`calcoloDatiCorpo.ts`). **Non bloccano
// la sezione**: prima la chiudevano finche' mancavano, poi si e' scelto il blocco morbido (un consenso a dati sulla salute da cui
// dipende tutto l'uso della sezione non e' libero, e peso, altezza e sesso servono solo alle calorie). Finche' mancano, questa carta sta
// **subito sotto il video**, in evidenza (bordo arancio, anello che pulsa, le tre voci con «Da inserire»), e **le calorie restano
// chiuse** (lo dicono loro, con il pulsante per inserirli): e' la sola cosa che dipende da questi dati. Il resto si usa come sempre.
// Inseriti i dati, tornando sulla schermata la carta sparisce da sola (`useDatiCorpo`, che rilegge a ogni ritorno).

const apriDati = () => router.push('/allenamento/misure')

const NOMI: Record<DatoMancante, () => string> = {
  altezza: () => t('Altezza', 'Height'),
  peso: () => t('Peso', 'Weight'),
  sesso: () => t('Sesso', 'Sex'),
}
const TUTTI: DatoMancante[] = ['altezza', 'peso', 'sesso']

export function CartaDatiDaCompilare({ mancano, senzaConsenso }: { mancano: DatoMancante[]; senzaConsenso: boolean }) {
  const p = usePalette()
  return (
    <View style={[stili.carta, { backgroundColor: p.carta, borderColor: p.accento, boxShadow: p.ombra }]}>
      {/* Finche' i dati non ci sono un anello pulsa sulla carta, come per gli altri dati che mancano e servono. */}
      <Richiamo raggio={26} colore={p.accento} ingrandimento={1.03} spessore={2} finoAlFatto />
      <View style={stili.testa}>
        <LinearGradient colors={['#5C8DFF', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={stili.icona}>
          <Icona nome="persona" size={22} colore="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, gap: 4, alignItems: 'flex-start' }}>
          <Tag testo={t('Da compilare', 'To fill in')} colore={p.accento} />
          <Text style={[stili.titolo, { color: p.testo }]}>{t('Completa i tuoi dati', 'Complete your details')}</Text>
        </View>
      </View>
      <Text style={[stili.testo, { color: p.testo }]}>
        {t(
          'Servono altezza, peso e sesso per stimare le calorie che consumi in lezioni e allenamenti. Finché mancano, le calorie restano chiuse: il resto lo usi come sempre. Ci vuole un minuto, restano tuoi e li aggiorni quando vuoi.',
          'We need your height, weight and sex to estimate the calories you burn in classes and workouts. Until they’re in, calories stay closed: you use everything else as usual. It takes a minute, they stay yours and you can update them any time.',
        )}
      </Text>
      <View style={[stili.elenco, { backgroundColor: p.incavo }]}>
        {TUTTI.map((d) => {
          const manca = mancano.includes(d)
          return (
            <View key={d} style={stili.riga} accessibilityLabel={`${NOMI[d]()}: ${manca ? t('da inserire', 'to enter') : t('inserito', 'entered')}`}>
              {manca ? <View style={[stili.vuoto, { borderColor: p.accento }]} /> : <Icona nome="ok" size={20} colore={p.ok} />}
              <Text style={[stili.voce, { color: p.testo }]}>{NOMI[d]()}</Text>
              <Text style={[stili.stato, { color: manca ? p.accento : p.ok }]}>{manca ? t('Da inserire', 'To enter') : t('Fatto', 'Done')}</Text>
            </View>
          )
        })}
      </View>
      {senzaConsenso ? (
        <Text style={[stili.piccola, { color: p.testoSecondario }]}>
          {t(
            'Peso, altezza e sesso sono dati sulla salute: prima ti mostriamo l’informativa, e se vuoi dai il consenso. Se non lo dai, le calorie restano chiuse e tutto il resto funziona.',
            'Weight, height and sex are health data: first we show you the privacy notice, and if you want you give your consent. If you don’t, calories stay closed and everything else works.',
          )}
        </Text>
      ) : null}
      <Pulsante testo={t('Inserisci i tuoi dati', 'Enter your details')} icona="avanti" onPress={apriDati} />
    </View>
  )
}

const stili = StyleSheet.create({
  carta: { borderRadius: 26, borderWidth: 2, padding: spazio.tre + 2, gap: spazio.tre },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  icona: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  titolo: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.4 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  elenco: { borderRadius: 18, paddingVertical: spazio.due, paddingHorizontal: spazio.tre, gap: spazio.due },
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.due + 2, minHeight: 26 },
  vuoto: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  voce: { flex: 1, fontFamily: F.bold, fontSize: 15 },
  stato: { fontFamily: F.bold, fontSize: 12.5 },
  piccola: { fontFamily: F.medio, fontSize: 12, lineHeight: 17 },
})
