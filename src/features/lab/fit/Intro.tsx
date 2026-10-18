import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

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
  { nome: 'Train', icona: 'peso', colore: '#FF5701', testo: 'allenarsi il giusto, non troppo. Qui le tue schede, il registro dei pesi, il test dei massimali e le calorie che consumi.' },
  { nome: 'Food', icona: 'piatto', colore: '#18A957', testo: 'mangiare bene. Il diario dei pasti, la foto del piatto e i consigli; si apre dopo aver accettato la sua informativa, e i dati li vedi solo tu.' },
  { nome: 'Relax', icona: 'foglia', colore: '#14B8A6', testo: 'recuperare. Il sonno e i giorni di riposo fanno parte dell’allenamento: è lì che il corpo si rimette in forze.' },
]

export function IntroFit() {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={{ gap: 4 }}>
        <Text style={[stili.titolo, { color: p.testo }]}>Il benessere è un equilibrio.</Text>
        <Text style={[stili.testo, { color: p.testoSecondario }]}>Viene da tre cose insieme, e nessuna basta da sola:</Text>
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
            </Text>
          </View>
        ))}
      </View>
      <Text style={[stili.testo, { color: p.testoSecondario }]}>
        <Text style={{ fontFamily: F.extra, color: p.testo }}>Balance </Text>
        mette accanto le calorie che consumi e quelle che mangi: è il punto in cui allenamento e alimentazione si incontrano.
      </Text>
      <Tocco onPress={() => setAperto((a) => !a)} etichetta={aperto ? 'Chiudi la spiegazione dei numeri' : 'Come leggere i numeri'} style={[stili.apri, { borderTopColor: p.linea }]}>
        <Text style={[stili.apriTesto, { color: p.accento }]}>Come leggere i numeri</Text>
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
