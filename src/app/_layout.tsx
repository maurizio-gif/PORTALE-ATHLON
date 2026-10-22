import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { useLingua } from '@/lib/lingua-react'
import { useColori } from '@/theme'

export default function Layout() {
  const c = useColori()
  // Sull'app nativa cambiare lingua ridisegna tutto da qui (sul web la pagina si ricarica: lib/lingua.ts).
  const lingua = useLingua()
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        key={lingua}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.sfondo },
        }}
      />
    </>
  )
}
