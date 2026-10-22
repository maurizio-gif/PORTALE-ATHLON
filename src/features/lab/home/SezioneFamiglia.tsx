import { Text, View } from 'react-native'

import type { Area } from '@/api/lab'
import { dataBreve } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { Avatar, Carta, Etichetta, Riga } from '../ui/kit'
import { BollinoDebito } from '../ui/Irregolarita'
import { F, usePalette } from '../ui/tema'
import { nome, statoCertificato } from './certificato'

// La sezione Famiglia della Home: le persone del nucleo, con la data di
// nascita, il certificato in sintesi e il bollino di un pagamento in sospeso.
// Il dettaglio del certificato sta nella sezione Certificato.

type AreaTrovata = Extract<Area, { trovato: true }>

export function SezioneFamiglia({ area }: { area: AreaTrovata }) {
  const p = usePalette()
  return (
    <View style={{ gap: spazio.due }}>
      <Carta style={{ paddingVertical: spazio.due }}>
        {area.persone.map((x, i) => {
          const s = statoCertificato(area.certificati.find((c) => c.member_id === x.member_id), x.data_nascita)
          return (
            <Riga
              key={x.member_id}
              prima={i === 0}
              testa={<Avatar nome={x.nome} cognome={x.cognome} size={40} />}
              titolo={nome(x)}
              sotto={
                <View style={{ gap: 6, alignItems: 'flex-start' }}>
                  <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13.5 }}>
                    {[x.titolare ? t('Tu, titolare', 'You, account holder') : t('Familiare', 'Family member'), dataBreve(x.data_nascita) ? t(`nato/a il ${dataBreve(x.data_nascita)}`, `born ${dataBreve(x.data_nascita)}`) : null].filter(Boolean).join(' · ')}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <Etichetta testo={t(`Certificato: ${s.testo.toLowerCase()}`, `Certificate: ${s.testo.toLowerCase()}`)} tono={s.tono} />
                    <BollinoDebito debito={x.debito} />
                  </View>
                </View>
              }
            />
          )
        })}
      </Carta>
      {area.persone.length === 1 ? (
        <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 }}>
          {t('Sulla tua scheda non ci sono altre persone: i familiari iscritti al club compaiono qui.', 'There is no one else on your account: family members registered with the club show up here.')}
        </Text>
      ) : null}
    </View>
  )
}
