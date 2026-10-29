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
  const omaggio =
    quota > 0
      ? t(`La quota di attivazione di ${euro(quota)} è in omaggio, perché non c’è nessuna interruzione fra la prova e l’abbonamento.`, `The ${euro(quota)} joining fee is waived, because there’s no gap between your trial and your membership.`)
      : t('Non c’è nessuna interruzione fra la prova e l’abbonamento.', 'There’s no gap between your trial and your membership.')
  if (!conData) {
    return (
      <Messaggio tono="ok" icona="regalo" titolo={t('Dalla prova all’abbonamento', 'From your trial to a membership')}>
        {t(
          `Ti iscrivi durante la prova: l’abbonamento parte il ${giorno}, il giorno dopo la fine del tuo Guest Pass, e non perdi nemmeno un giorno. ${omaggio}`,
          `You’re joining during your trial: your membership starts on ${giorno}, the day after your Guest Pass ends, so you don’t lose a single day. ${omaggio}`,
        )}
      </Messaggio>
    )
  }
  return (
    <Carta piatta>
      <View style={{ gap: spazio.due }}>
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{t('Parte il', 'Starts on')}</Text>
        <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 }}>{giorno}</Text>
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>
          {t('È il giorno dopo la fine del tuo Guest Pass: la data è fissa, così continui senza interruzioni. ', 'It’s the day after your Guest Pass ends: the date is fixed, so you carry on without a break. ')}
          {omaggio}
        </Text>
      </View>
    </Carta>
  )
}
