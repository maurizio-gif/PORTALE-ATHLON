import { Text, View } from 'react-native'

import { MESSAGGIO_SCUOLA_NUOTO, saNuotareAbbastanza, type Continuo, type Stile } from '@/api/lab'
import { spazio } from '@/theme'

import { Scelte, SceltePiu } from '../ui/Campi'
import { Messaggio, Sezione } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { CONTINUO_ELENCO, NOME_CONTINUO, STILI_ELENCO } from './nuoto'

// Le due domande che servono a scrivere un piano di nuoto, e il messaggio per chi non puo' ancora fare il Nuoto Libero
// (20/10/2026). Le usano l'agente dei piani (`Agente.tsx`, «In vasca») e il questionario del Percorso Athlon: sono le
// stesse e dicono le stesse parole, perche' la regola e' una sola ed e' del club.
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
      <Sezione titolo="Che stili sai nuotare">
        <SceltePiu valori={STILI_ELENCO} scelti={stili} onCambia={onStili} />
        {nonPuoFareNuotoLibero(stili) ? (
          <Messaggio tono="attenzione" titolo="Si parte dalla Scuola Nuoto Adulti">
            {MESSAGGIO_SCUOLA_NUOTO}
          </Messaggio>
        ) : (
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>Segna solo quelli che sai fare davvero: il piano usa solo questi.</Text>
        )}
      </Sezione>

      <Sezione titolo="Quanto nuoti di fila">
        <Scelte valori={CONTINUO_ELENCO} scelto={continuo} onScegli={onContinuo} />
        <View style={{ gap: spazio.uno }}>
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 }}>
            {continuo ? NOME_CONTINUO[continuo].nota : 'Senza fermarti e senza appoggiarti al bordo. Serve a non scriverti una ripetuta più lunga di quella che reggi.'}
          </Text>
        </View>
      </Sezione>
    </>
  )
}
