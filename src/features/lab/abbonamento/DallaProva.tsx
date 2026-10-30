import { Text, View } from 'react-native'

import { euro } from '@/lib/eventi'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { dataLunga } from '../RiepilogoCosti'
import { Carta, Messaggio } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// Dalla prova all'abbonamento (29/10/2026, richiesta di Maurizio): chi ha un Guest Pass in corso e si iscrive non sceglie la data.
// L'abbonamento parte **il giorno dopo la fine della prova**, senza interruzioni, e per questo la quota di attivazione non e'
// dovuta: lo dice qui, dentro la procedura (il messaggio di benvenuto accenna solo ai «vantaggi», senza parlare di soldi).
// La data la decide il server (`da_guest_pass` di `portale-abbonamento`: `inizio_min` = `inizio_max`) e lo ricontrolla alla firma.

/**
 * `inizio` e' il giorno di partenza (il giorno dopo la fine della prova). Senza `conData` e' l'avviso del primo passo, che spiega
 * il vantaggio; con `conData` e' il posto della data nel secondo, al posto della scelta del giorno.
 */
export function DallaProva({ inizio, quota, conData = false }: { inizio: string; quota: number; conData?: boolean }) {
  const p = usePalette()
  const giorno = dataLunga(inizio)
  // Testo corto (30/10/2026, Maurizio): niente ragionamento, solo la data e il vantaggio. La quota e' in omaggio solo se parte quel giorno: la data e' obbligatoria.
  const vantaggio =
    quota > 0
      ? t(`in questo modo avrai la quota di attivazione di ${euro(quota)} in omaggio.`, `this way you get the ${euro(quota)} joining fee for free.`)
      : t('in questo modo non c’è nessuna interruzione.', 'this way there’s no gap.')
  if (!conData) {
    return (
      <Messaggio tono="ok" icona="regalo" titolo={t('Dalla prova all’abbonamento', 'From your trial to a membership')}>
        {t(`Il tuo abbonamento partirà il ${giorno}, il giorno dopo la fine della prova: ${vantaggio}`, `Your membership will start on ${giorno}, the day after your trial ends: ${vantaggio}`)}
      </Messaggio>
    )
  }
  return (
    <Carta piatta>
      <View style={{ gap: spazio.due }}>
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{t('Parte il', 'Starts on')}</Text>
        <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 }}>{giorno}</Text>
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>
          {t('Il giorno dopo la fine della prova: ', 'The day after your trial ends: ')}
          {vantaggio}
        </Text>
      </View>
    </Carta>
  )
}
