import { Text, View } from 'react-native'

import { MESSAGGIO_SCUOLA_NUOTO, saNuotareAbbastanza, type Continuo, type Stile } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Scelte, SceltePiu } from '../ui/Campi'
import { Messaggio, Sezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { CONTINUO_ELENCO, NOME_CONTINUO, STILI_ELENCO } from './nuoto'

// Le due domande che servono a scrivere un piano di nuoto, e il messaggio per chi non puo' ancora fare il Nuoto Libero
// (20/10/2026). Le usa il questionario del Percorso Athlon (in standby). L'agente dei piani, dal 22/10/2026, ha le sue
// domande a passi (`PassiVasca.tsx`), che dicono le stesse parole: la regola e' una sola ed e' del club.
//
// **Il Nuoto Libero chiede stile libero e dorso.** Non e' un giudizio sul livello: e' l'attivita' che il club ha scritto
// cosi'. Chi non c'e' ancora comincia dalla Scuola Nuoto Adulti, dove sono gli istruttori a dire quando passare. Il
// controllo e' anche nella funzione (400): qui si dice prima, senza far aspettare un piano che non si scrive.

/** Chi ha scelto gli stili ma non ha stile libero e dorso: il messaggio e' il suo. Vuoto finche' non ha scelto niente. */
export const nonPuoFareNuotoLibero = (stili: readonly Stile[]): boolean => stili.length > 0 && !saNuotareAbbastanza(stili)

export function CampiNuoto({ stili, onStili, continuo, onContinuo }: { stili: Stile[]; onStili: (v: Stile[]) => void; continuo: Continuo | null; onContinuo: (v: Continuo) => void }) {
  const p = usePalette()
  return (
    <>
      <Sezione titolo={t('Che stili sai nuotare', 'Which strokes you can swim')}>
        <SceltePiu valori={STILI_ELENCO} scelti={stili} onCambia={onStili} />
        {nonPuoFareNuotoLibero(stili) ? (
          <Messaggio tono="attenzione" titolo={t('Si parte dalla Scuola Nuoto Adulti', 'Start with Scuola Nuoto Adulti')}>
            {MESSAGGIO_SCUOLA_NUOTO}
          </Messaggio>
        ) : (
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>
            {t('Segna solo quelli che sai fare davvero: il piano usa solo questi.', 'Only tick the ones you can really do: the plan uses only these.')}
          </Text>
        )}
      </Sezione>

      <Sezione titolo={t('Quanto nuoti di fila', 'How far you swim without stopping')}>
        <Scelte valori={CONTINUO_ELENCO} scelto={continuo} onScegli={onContinuo} />
        <View style={{ gap: spazio.uno }}>
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>
            {continuo ? NOME_CONTINUO[continuo].nota : t(
                  'Senza fermarti e senza appoggiarti al bordo. Serve a non scriverti una ripetuta più lunga di quella che reggi.',
                  'Without stopping or holding the wall. It keeps us from giving you a repeat longer than you can manage.',
                )}
          </Text>
        </View>
      </Sezione>
    </>
  )
}
