import { usePathname } from 'expo-router'
import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { schermataDa } from '../feedback/comune'
import { FoglioFeedback } from '../feedback/FoglioFeedback'
import { useFeedback } from '../feedback/useFeedback'
import { Icona } from '../ui/Icona'
import { Carta, Entra } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { vistaCorrente } from '../vista'

// La carta del feedback in Home (30/10/2026, richiesta di Maurizio): prende il posto di «Cerchi qualcosa?» (l'assistente e' passato al pulsante
// «Assistente virtuale» in alto a destra, `assistente/PulsanteAssistente`) e **invita i tester a lasciare segnalazioni e suggerimenti** per aiutarci a
// migliorare l'app. Tocca e sale lo stesso foglio di prima (`feedback/FoglioFeedback`), che era quello della pillola «Feedback» in alto a destra: un campo
// di testo e, se serve, degli allegati. Il messaggio arriva nella sezione Tester app del CRM.
//
// **Mai in vista cliente**: chi guarda l'app di un cliente non scrive feedback al suo posto (la funzione risponderebbe 403).
// **Lo stato del foglio vive qui** (`useFeedback`): chiudere per sbaglio, o un invio rifiutato, lascia testo, tipo e allegati dove stanno, finche' la Home
// resta aperta. Lasciare la Home non smonta la schermata (sta sotto nella pila), ma uscire dall'app si': la bozza non si conserva oltre.
export function CartaFeedback() {
  const p = usePalette()
  const percorso = usePathname()
  const f = useFeedback()
  const [aperto, setAperto] = useState(false)
  // La schermata in cui si e' toccata la carta, non quella di quando si preme «Invia»: e' la Home, ma la funzione la riceve com'e'.
  const schermata = useRef('/')

  if (vistaCorrente()) return null

  return (
    <>
      <Entra indice={1}>
        <Carta
          onPress={() => {
            schermata.current = schermataDa(percorso)
            setAperto(true)
          }}
        >
          <View
            style={stili.riga}
            accessibilityRole="button"
            accessibilityLabel={t('Aiutaci a migliorare l’app. Se sei un tester, lascia qui segnalazioni e suggerimenti.', 'Help us improve the app. If you’re a tester, leave your reports and suggestions here.')}
          >
            <View style={[stili.bollino, { backgroundColor: p.incavo }]}>
              <Icona nome="feedback" size={22} colore={p.accento} />
            </View>
            <View style={stili.testi}>
              <Text style={[stili.titolo, { color: p.testo }]}>{t('Aiutaci a migliorare l’app', 'Help us improve the app')}</Text>
              <Text style={[stili.sotto, { color: p.testoSecondario }]}>
                {t('Sei un tester? Se hai segnalazioni, suggerimenti o problemi, lasciali qui: ci aiutano a far crescere l’app.', 'Are you a tester? If you have reports, suggestions or problems, leave them here: they help us make the app better.')}
              </Text>
              <Text style={[stili.invito, { color: p.accento }]}>{t('Lascia un feedback', 'Leave feedback')}</Text>
            </View>
            <Icona nome="avanti" size={18} colore={p.testoTerzo} />
          </View>
        </Carta>
      </Entra>
      <FoglioFeedback aperto={aperto} f={f} schermata={schermata.current} onChiudi={() => setAperto(false)} />
    </>
  )
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  bollino: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  testi: { flex: 1, gap: 3 },
  titolo: { fontFamily: F.extra, fontSize: 18, lineHeight: 22, letterSpacing: -0.4 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  invito: { fontFamily: F.semi, fontSize: 13.5, lineHeight: 19, marginTop: 2 },
})
