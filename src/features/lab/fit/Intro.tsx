import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'

import { Icona, type NomeIcona } from '../ui/Icona'
import { Carta } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import { ComeLeggere } from './Balance'

// L'introduzione in cima a Fit (richiesta del club, 19/10/2026): cosa si puo'
// fare nelle tre parti e il senso dei numeri, prima di vederli. I numeri si
// spiegano in un pannello che si apre, per non spingere sotto la piega il
// Balance a ogni visita; il testo e' lo stesso in fondo alla schermata di Balance.

const PARTI: { nome: string; icona: NomeIcona; colore: string; testo: string }[] = [
  { nome: 'Balance', icona: 'grafico', colore: '#8B5CF6', testo: 'le calorie che consumi accanto a quelle che mangi, giorno per giorno e in media.' },
  { nome: 'Train', icona: 'peso', colore: '#FF5701', testo: 'le tue schede, il registro dei pesi, il test dei massimali, le tue misure e le calorie che consumi allenandoti.' },
  { nome: 'Food', icona: 'piatto', colore: '#18A957', testo: 'il diario dei pasti, la foto del piatto che diventa calorie e i consigli. Si apre dopo aver accettato la sua informativa: i dati li vedi solo tu.' },
]

export function IntroFit() {
  const p = usePalette()
  const [aperto, setAperto] = useState(false)
  return (
    <Carta style={{ gap: spazio.tre }}>
      <Text style={[stili.titolo, { color: p.testo }]}>Allenamento e alimentazione, in un posto solo.</Text>
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
