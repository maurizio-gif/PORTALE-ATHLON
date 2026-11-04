import { Linking, Text } from 'react-native'

import { t } from '@/lib/lingua'
import { inModalitaTotem } from '@/lib/totem'

import { F, usePalette } from './tema'
import { Tocco } from './Tocco'

// «Realizzata da Ready 2 Digital» (04/11/2026, richiesta di Maurizio): il credito di chi ha fatto l'app, in fondo alla pagina
// d'accesso e al Profilo, sull'app iOS e Android e sul portale web. Discreto, come la riga della privacy: si legge, non chiede niente.
//
// **Sul totem il nome resta e il link no**: un tocco aprirebbe un sito estraneo sul pannello del club, da cui chi e' davanti non sa
// tornare (la modalita' totem esiste per tenere la persona dentro l'app, vedi lib/totem.ts).

export const SITO_READY2DIGITAL = 'https://www.ready2digital.it'

export function Realizzata() {
  const p = usePalette()
  const testo = (
    <Text style={{ color: p.testoTerzo, textAlign: 'center', fontSize: 12, lineHeight: 18, fontFamily: F.medio }}>
      {t('Realizzata da', 'Made by')}{' '}
      <Text style={{ fontFamily: F.bold, color: inModalitaTotem() ? p.testoTerzo : p.accento }}>Ready 2 Digital</Text>
    </Text>
  )
  if (inModalitaTotem()) return testo
  return (
    <Tocco
      onPress={() => Linking.openURL(SITO_READY2DIGITAL)}
      ruolo="link"
      etichetta={t('Realizzata da Ready 2 Digital: apre il sito', 'Made by Ready 2 Digital: opens the website')}
      vibra={null}
      scala={0.99}
      style={{ alignSelf: 'center', paddingVertical: 6 }}
    >
      {testo}
    </Tocco>
  )
}
