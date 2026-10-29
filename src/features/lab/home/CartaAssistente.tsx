import { useGlobalSearchParams, usePathname } from 'expo-router'
import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { schermataAssistente } from '../assistente/destinazioni'
import { FoglioAssistente } from '../assistente/FoglioAssistente'
import { Icona } from '../ui/Icona'
import { Carta, Entra } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'

// La carta dell'assistente in Home (29/10/2026): «Cerchi qualcosa?». Tocca e sale il foglio con la chat (`assistente/FoglioAssistente`). Sta
// sotto il messaggio di benvenuto. **Mai in vista cliente**: chi guarda l'app di un socio non conversa a suo nome (la funzione risponderebbe 403).
// Il foglio resta qui montato: la conversazione sta in memoria (`assistente/store.ts`) e non si perde chiudendolo.
export function CartaAssistente() {
  const p = usePalette()
  const percorso = usePathname()
  const { sezione } = useGlobalSearchParams<{ sezione?: string }>()
  const [aperto, setAperto] = useState(false)
  // La schermata in cui si e' toccata la carta, non quella di quando si preme «Invia»: e' qui che la persona stava guardando.
  const schermata = useRef<string | null>(null)

  if (vistaCorrente()) return null

  return (
    <>
      <Entra indice={1}>
        <Carta
          onPress={() => {
            schermata.current = schermataAssistente(percorso, typeof sezione === 'string' ? sezione : null)
            setAperto(true)
          }}
        >
          <View style={stili.riga} accessibilityRole="button" accessibilityLabel={t('Cerchi qualcosa? Chiedi all’assistente dove trovare le cose.', 'Looking for something? Ask the assistant where to find things.')}>
            <View style={[stili.bollino, { backgroundColor: p.incavo }]}>
              <Icona nome="cerca" size={22} colore={p.accento} />
            </View>
            <View style={stili.testi}>
              <Text style={[stili.titolo, { color: p.testo }]}>{t('Cerchi qualcosa?', 'Looking for something?')}</Text>
              <Text style={[stili.sotto, { color: p.testoSecondario }]}>
                {t('Chiedimi dove trovare le cose o cosa risulta sul tuo account: ti porto io nel punto giusto.', 'Ask me where to find things or what shows on your account: I’ll take you to the right place.')}
              </Text>
            </View>
            <Icona nome="avanti" size={18} colore={p.testoTerzo} />
          </View>
        </Carta>
      </Entra>
      <FoglioAssistente aperto={aperto} schermata={schermata.current} onChiudi={() => setAperto(false)} />
    </>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  bollino: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  testi: { flex: 1, gap: 3 },
  titolo: { fontFamily: F.extra, fontSize: 18, lineHeight: 22, letterSpacing: -0.4 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
