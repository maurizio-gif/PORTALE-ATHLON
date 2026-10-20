import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import { Stack } from 'expo-router'
import { View } from 'react-native'

import { Avvio } from '@/features/lab/avvio/Avvio'
import { PulsanteFeedback } from '@/features/lab/feedback/PulsanteFeedback'
import { Notifiche } from '@/features/lab/notifiche/Notifiche'
import { BannerVista } from '@/features/lab/ui/BannerVista'
import { BarraSchede } from '@/features/lab/ui/BarraSchede'
import { usePalette } from '@/features/lab/ui/tema'
import { useSessione } from '@/features/lab/useSessione'
import { vistaCorrente } from '@/features/lab/vista'

// Il portale (le schermate dopo l'accesso) sta nel gruppo `(portale)`, che non compare
// nell'indirizzo: la Home e' `/`, le altre `/calendario`, `/allenamento`, `/tv`...
// I vecchi indirizzi `/lab/...` li reindirizza vercel.json.
// Ha la sua cornice da app: il suo carattere (Plus Jakarta
// Sans), le schermate che passano l'una nell'altra in dissolvenza, come le
// schede di un'app, e sotto la barra delle schede, solo per chi e' entrato.
// Finche' il carattere non c'e' si usa quello di sistema: niente schermo vuoto.
export default function LayoutLaboratorio() {
  const p = usePalette()
  const sessione = useSessione()
  useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold })
  return (
    <View style={{ flex: 1, backgroundColor: p.fondo }}>
      {/* In vista cliente (vista.ts) la striscia con di chi e'; sulla stessa
          app, solo per chi e' entrato: senza accesso non c'e' niente da guardare. */}
      {sessione ? <BannerVista /> : null}
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: p.fondo } }}>
        <Stack.Screen name="pagamenti/[riferimento]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="pagamenti/storico" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tv/[raccolta]/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tv/[raccolta]/[video]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/[scheda]/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/[scheda]/[giorno]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/agente" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/importa" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/nuova" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/storico" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/test" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/misure" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/alimentazione" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/balance" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/punteggio" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/training" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/consigli" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/percorso" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/percorso-nuovo" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/percorso-modifica" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="notifiche" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shop/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shop/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shop/carrello" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="shop/ordini" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shop/ordine/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen name="metodo-pagamento/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="club-life/news/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="club-life/eventi/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="club-life/help-desk/[...scheda]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="club-life/modulo/[tipo]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="metodo-pagamento/fatto/[token]" options={{ animation: 'fade' }} />
      </Stack>
      {sessione ? <BarraSchede /> : null}
      {/* Le notifiche del club (features/lab/notifiche): il giro che le legge e la finestra che compare appena ne arriva una. Solo per
          chi e' entrato, e mai in vista cliente: chi guarda l'app di un socio non deve segnare come viste le sue notifiche. */}
      {sessione && !vistaCorrente() ? <Notifiche /> : null}
      {/* Il pulsante «Feedback» dei tester, in alto a destra (features/lab/feedback): solo con una sessione, e prima
          dell'avvio animato, che lo copre. In vista cliente non si disegna. */}
      {sessione ? <PulsanteFeedback /> : null}
      {/* L'avvio animato: una volta a ogni apertura, sopra tutto (features/lab/avvio). */}
      <Avvio />
    </View>
  )
}
