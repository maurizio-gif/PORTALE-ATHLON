// Il primo, perche' decide dove stanno la sessione e la scala prima che qualunque altro modulo li usi (la modalita' totem: lib/totem.ts).
import '@/lib/totemAvvio'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { GuardiaTotem } from '@/features/lab/totem/GuardiaTotem'
import { useLingua } from '@/lib/lingua-react'
import { useSchemaColori } from '@/lib/schemaColori'
import { useColori } from '@/theme'

export default function Layout() {
  const c = useColori()
  // Sull'app nativa cambiare lingua ridisegna tutto da qui (sul web la pagina si ricarica: lib/lingua.ts).
  const lingua = useLingua()
  // La barra di stato segue il tema scelto dalla persona (o quello automatico), non solo quello del sistema.
  const schema = useSchemaColori()
  return (
    <>
      <StatusBar style={schema === 'dark' ? 'light' : 'dark'} />
      <Stack
        key={lingua}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.sfondo },
        }}
      />
      {/* L'uscita da sola del totem: cinque minuti senza tocchi (features/lab/totem). Fuori dal totem non disegna niente. */}
      <GuardiaTotem />
    </>
  )
}
