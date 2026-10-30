import { StyleSheet, Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Icona } from '../ui/Icona'
import { Carta, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { apriAssistente } from './store'

// «Richiedi assistenza» in Club Life, subito dopo gli orari (31/10/2026, richiesta di Maurizio): un bottone che **apre sempre la chat** dell'assistente, la stessa del pulsante in alto a destra.
// Chi guarda gli orari o le news e ha un dubbio la trova li', senza cercare l'icona. Dalla chat l'assistente risponde, porta nel punto giusto e, se serve una persona, propone di scrivere al team.
// **Mai in vista cliente** (come il pulsante: chi guarda l'app di un socio non conversa a suo nome).
export function RichiediAssistenza() {
  const p = usePalette()
  if (vistaCorrente()) return null
  return (
    <Carta piatta style={stili.carta}>
      <View style={stili.testata}>
        <Icona nome="assistente" size={20} colore={p.accento} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{t('Ti serve una mano?', 'Need a hand?')}</Text>
          <Text style={[stili.sotto, { color: p.testoSecondario }]}>
            {t('Scrivici qui: ti aiutiamo a trovare le cose nell’app e, se serve, ti mettiamo in contatto con il team.', 'Write to us here: we’ll help you find things in the app and, if needed, put you in touch with the team.')}
          </Text>
        </View>
      </View>
      <Pulsante testo={t('Richiedi assistenza', 'Get support')} icona="assistente" onPress={() => apriAssistente('club-life')} />
    </Carta>
  )
}

const stili = StyleSheet.create({
  carta: { gap: spazio.tre },
  testata: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio.tre - 2 },
  titolo: { fontFamily: F.extra, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
