import { useState } from 'react'
import { Text, View } from 'react-native'

import type { Area, PersonaArea } from '@/api/lab'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { Carta } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { FoglioCertificato } from './CaricaCertificato'
import { RigaCertificato, urgenzaCertificato, statoCertificato } from './certificato'

// La sezione Certificato della Home: una riga per ogni persona del nucleo, con
// lo stato e, dove manca o e' scaduto, la «i» di quale certificato serve e il comando per
// caricarlo (17/10/2026). Prima chi ha piu' fretta.

type AreaTrovata = Extract<Area, { trovato: true }>

export function SezioneCertificato({ area, onAggiorna }: { area: AreaTrovata; onAggiorna: () => void }) {
  const p = usePalette()
  // Per chi si sta caricando il certificato: il foglio e' uno solo, e si apre sulla persona scelta.
  const [per, setPer] = useState<PersonaArea | null>(null)
  const [aperto, setAperto] = useState(false)
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
          <RigaCertificato
            key={r.persona.member_id}
            persona={r.persona}
            ce={r.ce}
            prima={i === 0}
            onCarica={() => {
              setPer(r.persona)
              setAperto(true)
            }}
          />
        ))}
      </Carta>
      <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 }}>
        {t('Il certificato si consegna in formato digitale: tocca «Carica il certificato» e scegli una foto o un PDF. Toccando la «i» vedi quale serve.', 'The certificate is handed in digitally: tap “Upload certificate” and choose a photo or a PDF. Tap the “i” to see which one you need.')}
      </Text>
      <FoglioCertificato aperto={aperto} persona={per} onChiudi={() => setAperto(false)} onCaricato={onAggiorna} />
    </View>
  )
}
