import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { useColori } from '@/theme'

export default function Layout() {
  const c = useColori()
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.sfondo },
        }}
      />
    </>
  )
}
