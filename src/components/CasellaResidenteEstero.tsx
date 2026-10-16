import { Text } from 'react-native'

import { F, usePalette } from '@/features/lab/ui/tema'
import { TESTO_RESIDENTE_ESTERO } from '@/lib/residenteEstero'

import { Casella } from './Casella'

// «Sono residente all'estero e non ho un codice fiscale italiano»: la stessa
// casella, con le stesse parole, sotto il codice fiscale di ogni modulo.
export function CasellaResidenteEstero({ spuntata, onCambia, lab = false }: { spuntata: boolean; onCambia: () => void; lab?: boolean }) {
  const p = usePalette()
  return (
    <Casella spuntata={spuntata} onCambia={onCambia} etichetta={TESTO_RESIDENTE_ESTERO}>
      <Text style={{ color: p.testo, fontFamily: lab ? F.medio : undefined, fontSize: lab ? 14 : 15, lineHeight: lab ? 20 : 22 }}>{TESTO_RESIDENTE_ESTERO}</Text>
    </Casella>
  )
}
