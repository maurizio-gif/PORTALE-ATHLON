import { Text, View } from 'react-native'

import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { dataLunga } from '../RiepilogoCosti'
import { Carta, Messaggio } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// Il cambio senza disdetta (30/10/2026, Maurizio): chi e' nella finestra (da 30 a 10 giorni prima della fine dell'impegno) cambia abbonamento
// senza disdire. Il vecchio finisce alla sua fine, **il nuovo parte il giorno dopo**, senza interruzioni, e per questo la quota di attivazione
// e' in omaggio. La data la decide il server (`cambio_contract_id` di `portale-abbonamento`) e la ricontrolla alla firma.

/** Senza `conData` e' l'avviso del primo passo; con `conData` e' il posto della data nel secondo, al posto della scelta del giorno. */
export function DaCambio({ fine, inizio, piano, conData = false }: { fine: string; inizio: string; piano: string; conData?: boolean }) {
  const p = usePalette()
  if (!conData) {
    return (
      <Messaggio tono="ok" icona="rinnovo" titolo={t('Cambi abbonamento, senza disdire', 'Change membership, no cancelling')}>
        {t(
          `Il tuo abbonamento attuale (${piano}) finisce il ${dataLunga(fine)} e il nuovo parte il ${dataLunga(inizio)}: continui ad allenarti senza nemmeno un giorno di pausa. La quota di attivazione è in omaggio e puoi scegliere l’abbonamento che preferisci.`,
          `Your current membership (${piano}) ends on ${dataLunga(fine)} and the new one starts on ${dataLunga(inizio)}: you keep training without a day’s break. The joining fee is waived and you can choose whichever membership you prefer.`,
        )}
      </Messaggio>
    )
  }
  return (
    <Carta piatta>
      <View style={{ gap: spazio.due }}>
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12 }}>{t('Parte il', 'Starts on')}</Text>
        <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 }}>{dataLunga(inizio)}</Text>
        <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13, lineHeight: 19 }}>
          {t(`È il giorno dopo la fine dell’abbonamento attuale (${dataLunga(fine)}): la data è fissa, così non c’è nessuna interruzione. La quota di attivazione è in omaggio.`, `It’s the day after your current membership ends (${dataLunga(fine)}): the date is fixed, so there’s no gap. The joining fee is waived.`)}
        </Text>
      </View>
    </Carta>
  )
}
