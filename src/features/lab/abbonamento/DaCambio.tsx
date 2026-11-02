import { t } from '@/lib/lingua'
import { Messaggio } from '../ui/kit'

// Il cambio senza disdetta (30/10/2026, Maurizio): chi e' nella finestra (da 30 a 10 giorni prima della fine dell'impegno) cambia abbonamento
// senza disdire. **Dal 02/11/2026 la data la sceglie il socio** (da domani a 30 giorni, in `CalendarioCambio`): il nuovo parte quel giorno, il
// vecchio finisce il giorno prima, senza interruzioni, e per questo la quota di attivazione e' in omaggio. Le date le decide il server
// (`cambio_contract_id` di `portale-abbonamento`) e le ricontrolla alla firma. Qui c'e' solo l'avviso del primo passo.

export function DaCambio({ piano }: { piano: string }) {
  return (
    <Messaggio tono="ok" icona="rinnovo" titolo={t('Cambi abbonamento, senza disdire', 'Change membership, no cancelling')}>
      {t(
        `Scegli il giorno in cui parte il nuovo, nei prossimi 30 giorni: il tuo abbonamento attuale (${piano}) finisce il giorno prima, così continui ad allenarti senza pause. La quota di attivazione è in omaggio e puoi scegliere l’abbonamento che preferisci.`,
        `Choose the day the new one starts, within the next 30 days: your current membership (${piano}) ends the day before, so you keep training without a break. The joining fee is waived and you can choose whichever membership you prefer.`,
      )}
    </Messaggio>
  )
}
