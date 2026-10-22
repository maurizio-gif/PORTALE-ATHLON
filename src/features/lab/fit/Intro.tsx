import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { ComeLeggere } from './Balance'

// L'introduzione in cima a Fit (richiesta del club, 19/10/2026): il benessere
// come equilibrio, cosa si puo' fare in Fit e il senso dei numeri, prima di vederli. I numeri si
// spiegano in un pannello che si apre, per non spingere sotto la piega il
// Balance a ogni visita; il testo e' lo stesso in fondo alla schermata di Balance.

// Il benessere come equilibrio di tre cose (richiesta del club): allenarsi il
// giusto, mangiare bene, recuperare. Il relax non ha una sezione sua: si dice qui
// che fa parte del programma, perche' chi apre Fit non pensi che servano sette
// allenamenti a settimana.
const PARTI: { nome: string; icona: NomeIcona; colore: string; testo: string }[] = [
  { nome: 'Train', icona: 'peso', colore: '#FF5701', testo: t('allenarsi il giusto, non troppo. Qui i tuoi piani di allenamento, il registro dei pesi, il test dei massimali e le calorie che consumi.', 'training the right amount, not too much. Here you’ll find your workout plans, your weight log, the one-rep max test and the calories you burn.') },
  { nome: 'Food', icona: 'piatto', colore: '#18A957', testo: t('mangiare bene. Il diario dei pasti, la foto del piatto e i consigli; si apre dopo aver accettato la sua informativa, e i dati li vedi solo tu.', 'eating well. The meal diary, the photo of your plate and tips; it opens once you accept its privacy notice, and only you see the data.') },
  { nome: 'Relax', icona: 'foglia', colore: '#14B8A6', testo: t('recuperare. Il sonno e i giorni di riposo fanno parte dell’allenamento: è lì che il corpo si rimette in forze.', 'recovering. Sleep and rest days are part of training: that’s when your body gets its strength back.') },
]

export function IntroFit({ relax = false }: { relax?: boolean }) {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={{ gap: 4 }}>
        <Text style={[stili.titolo, { color: p.testo }]}>{t('Il benessere è un equilibrio.', 'Wellbeing is a balance.')}</Text>
        <Text style={[stili.testo, { color: p.testoSecondario }]}>{t('Viene da tre cose insieme, e nessuna basta da sola:', 'It comes from three things together, and none is enough on its own:')}</Text>
      </View>
      <View style={{ gap: spazio.due }}>
        {PARTI.map((x) => (
          <View key={x.nome} style={stili.riga}>
            <View style={[stili.bollo, { backgroundColor: x.colore }]}>
              <Icona nome={x.icona} size={15} colore="#fff" />
            </View>
            <Text style={[stili.testo, { color: p.testoSecondario, flex: 1 }]}>
              <Text style={{ fontFamily: F.extra, color: p.testo }}>{`${x.nome}: `}</Text>
              {x.testo}
              {x.nome === 'Relax' && relax ? t(' Ogni mattina scrivi quanto hai dormito, o collega un anello Oura o un orologio Polar: il sonno arriva da solo.', ' Each morning, log how long you slept, or connect an Oura ring or a Polar watch: your sleep comes in by itself.') : ''}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[stili.testo, { color: p.testoSecondario }]}>
        <Text style={{ fontFamily: F.extra, color: p.testo }}>Athlon Health Score </Text>
        {t('mette insieme i tre in un punteggio da 0 a 100: premia la regolarità, non la quantità.', 'brings the three together in a score from 0 to 100: it rewards consistency, not quantity.')}
      </Text>
      <Text style={[stili.testo, { color: p.testoSecondario }]}>
        <Text style={{ fontFamily: F.extra, color: p.testo }}>Balance </Text>
        {t('mette accanto le calorie che consumi e quelle che mangi: è il punto in cui allenamento e alimentazione si incontrano.', 'puts the calories you burn next to the ones you eat: it’s where training and nutrition meet.')}
      </Text>
      <Tocco onPress={() => setAperto((a) => !a)} etichetta={aperto ? t('Chiudi la spiegazione dei numeri', 'Close the explanation of the numbers') : t('Come leggere i numeri', 'How to read the numbers')} style={[stili.apri, { borderTopColor: p.linea }]}>
        <Text style={[stili.apriTesto, { color: p.accento }]}>{t('Come leggere i numeri', 'How to read the numbers')}</Text>
        <View style={{ transform: [{ rotate: aperto ? '-90deg' : '90deg' }] }}>
          <Icona nome="avanti" size={14} colore={p.accento} />
        </View>
      </Tocco>
      {aperto ? <ComeLeggere /> : null}
    </Carta>
  )
}

const stili = StyleSheet.create({
  titolo: { fontFamily: F.extra, fontSize: 17, letterSpacing: -0.3, lineHeight: 22 },
  riga: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.due + 2 },
  bollo: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  apri: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spazio.tre, minHeight: 44 },
  apriTesto: { fontFamily: F.bold, fontSize: 14 },
})
