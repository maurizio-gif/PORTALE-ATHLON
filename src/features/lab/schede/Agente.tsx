import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'

import { PassiSala } from './PassiSala'
import { PassiVasca } from './PassiVasca'

// «Componi il tuo piano» (il file si chiama ancora Agente, e l'indirizzo /allenamento/agente: e' quello dei link gia' dati).
// L'agente compone la bozza di un piano con gli esercizi accesi della libreria del club, coi recuperi, in qualche decina di secondi.
// **Non e' ancora un piano del socio** (19/10/2026): torna una bozza, che l'editor fa rivedere e modificare, e solo alla conferma entra
// fra i suoi (origine «ai»).
//
// **L'AI non e' in primo piano** (20/10/2026, richiesta del club): nei testi si parla di «generiamo insieme» e di «comporre», niente
// «agente AI» ne' il viola dell'AI. Che il piano lo scriva un'intelligenza artificiale lo dice la nota in fondo, in piccolo, qui e dopo
// la composizione (editor e piano): e' una cosa che il socio ha diritto di sapere, soprattutto perche' le risposte sulla salute vanno a
// un fornitore di AI, ma non e' il titolo.
//
// **Il questionario e' a passi, in sala e in vasca** (22/10/2026): una domanda per schermata, con l'anello che si chiude. In sala sono
// diciotto domande (`PassiSala.tsx`); **in vasca sei, tutte sul nuoto** (`PassiVasca.tsx`: cosa vuoi ottenere, che stili sai, quanto
// nuoti di fila, quanto tempo hai, quante volte, fastidi). **Salute** (20/10/2026) non e' un obiettivo dell'agente, in sala e in vasca:
// porta al personal trainer (`SaluteBlocco.tsx`).
//
// **Da un consiglio** (21/10/2026): i Consigli di Athlon, per una seduta in sala o in vasca, portano qui con `?dove=sala` o `?dove=vasca`,
// e la prima domanda e' gia' risposta: con `sala` il questionario parte da «Qual e' il tuo obiettivo?», con `vasca` da «Cosa vuoi ottenere
// in vasca?». Dal primo passo della vasca, se si e' scelto «Dove ti alleni?» in sala, si torna a quella domanda.

export function Agente() {
  const { dove: doveDaFuori } = useLocalSearchParams<{ dove?: string }>()
  const [dove, setDove] = useState<'sala' | 'vasca' | null>(doveDaFuori === 'vasca' ? 'vasca' : doveDaFuori === 'sala' ? 'sala' : null)
  const [inVasca, setInVasca] = useState(doveDaFuori === 'vasca')

  if (inVasca) return <PassiVasca saltaDove={doveDaFuori === 'vasca'} onDove={() => setInVasca(false)} />
  return <PassiSala dove={dove} onDove={setDove} saltaDove={doveDaFuori === 'sala'} onVasca={() => setInVasca(true)} />
}
