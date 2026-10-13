import { useLocalSearchParams } from 'expo-router'
import { Text } from 'react-native'

import { Pagina } from '@/components/Pagina'
import { useColori } from '@/theme'

// La pagina di arrivo di **ogni** link via email: `https://app.athlonroma.it/r/<token>`.
// Un solo prefisso, cosi' i deep link di iOS e Android (app.json) si
// registrano una volta. Il tipo di operazione sta nella richiesta salvata, non
// nell'URL: alla tappa 1 questa pagina la legge da `portale-link`.
export default function ArrivoDaLink() {
  const c = useColori()
  const { token } = useLocalSearchParams<{ token: string }>()
  const formaValida = typeof token === 'string' && /^[A-Za-z0-9_-]{20,64}$/.test(token)
  return (
    <Pagina
      titolo={formaValida ? 'Quasi pronto' : 'Link non valido'}
      sottotitolo={
        formaValida
          ? 'Questa pagina è in preparazione: per ora i link delle nostre email si aprono ancora sul vecchio indirizzo.'
          : 'Il link è incompleto o non è più valido. Torna alla pagina iniziale e chiedine uno nuovo.'
      }
    >
      <Text style={{ color: c.testoSecondario }}>Per qualsiasi dubbio scrivi a desk@athlonroma.it.</Text>
    </Pagina>
  )
}
