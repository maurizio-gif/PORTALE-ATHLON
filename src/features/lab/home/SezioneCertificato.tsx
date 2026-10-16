import { Text, View } from 'react-native'

import type { Area } from '@/api/lab'
import { spazio } from '@/theme'

import { Carta } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { RigaCertificato, urgenzaCertificato, statoCertificato } from './certificato'

// La sezione Certificato della Home: una riga per ogni persona del nucleo, con
// lo stato e, dove manca o e' scaduto, la «i» di quale certificato serve. Prima
// chi ha piu' fretta.

type AreaTrovata = Extract<Area, { trovato: true }>

export function SezioneCertificato({ area }: { area: AreaTrovata }) {
  const p = usePalette()
  const righe = area.persone
    .map((persona) => {
      const ce = area.certificati.find((x) => x.member_id === persona.member_id)
      return { persona, ce, urgenza: urgenzaCertificato(statoCertificato(ce, persona.data_nascita)) }
    })
    // Prima chi ha piu' fretta; a parita' l'ordine del nucleo (la Array.sort e' stabile).
    .sort((a, b) => b.urgenza - a.urgenza)
  return (
    <View style={{ gap: spazio.due }}>
      <Carta style={{ paddingVertical: spazio.due }}>
        {righe.map((r, i) => (
          <RigaCertificato key={r.persona.member_id} persona={r.persona} ce={r.ce} prima={i === 0} />
        ))}
      </Carta>
      <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 }}>
        Il certificato si consegna in formato digitale. Toccando la «i» vedi quale serve.
      </Text>
    </View>
  )
}
