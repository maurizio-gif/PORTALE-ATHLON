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

import { BarraSchede } from '@/features/lab/ui/BarraSchede'
import { usePalette } from '@/features/lab/ui/tema'
import { useSessione } from '@/features/lab/useSessione'

// Il laboratorio ha la sua cornice da app: il suo carattere (Plus Jakarta
// Sans), le schermate che passano l'una nell'altra in dissolvenza, come le
// schede di un'app, e sotto la barra delle schede, solo per chi e' entrato.
// Finche' il carattere non c'e' si usa quello di sistema: niente schermo vuoto.
export default function LayoutLaboratorio() {
  const p = usePalette()
  const sessione = useSessione()
  useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold })
  return (
    <View style={{ flex: 1, backgroundColor: p.fondo }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: p.fondo } }}>
        <Stack.Screen name="pagamenti/[riferimento]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="pagamenti/storico" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tv/[raccolta]/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tv/[raccolta]/[video]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/[scheda]/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/[scheda]/[giorno]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/agente" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/storico" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/test" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/misure" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="metodo-pagamento/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="metodo-pagamento/fatto/[token]" options={{ animation: 'fade' }} />
      </Stack>
      {sessione ? <BarraSchede /> : null}
    </View>
  )
}
