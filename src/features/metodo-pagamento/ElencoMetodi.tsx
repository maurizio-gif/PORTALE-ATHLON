import { StyleSheet, View } from 'react-native'

import { Bottone } from '@/components/Bottone'
import { Testo } from '@/components/Testo'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { MetodoAttualeBadge } from './Metodo'

// Le carte e i conti che la persona ha gia' salvati, da cui sceglierne uno per gli abbonamenti senza registrarne
// uno nuovo (30/10/2026). Si usa in due posti: nella scelta «Cambia metodo di pagamento» e al ritorno dalla pagina
// della carta, quando la verifica e' riuscita su una carta che c'era gia' e ce n'e' piu' d'una (non si indovina quale).
// Di ogni metodo si dicono solo il tipo, le ultime quattro cifre e la scadenza.

export type MetodoSalvato = { fonte_id: number; tipo: 'CreditCard' | 'DirectDebit'; finale: string | null; scadenza: string | null }

export function ElencoMetodi({
  metodi,
  inUso,
  occupato,
  inCorso,
  onScegli,
  etichetta,
}: {
  metodi: MetodoSalvato[]
  /** Quali sono gia' il metodo di tutti gli abbonamenti scelti: si dicono «già in uso» e non si offrono. */
  inUso?: (m: MetodoSalvato) => boolean
  /** Qualcosa sta partendo: i comandi si spengono. */
  occupato?: boolean
  /** Il metodo che si sta salvando adesso, per il segno di attesa sul suo pulsante. */
  inCorso?: number | null
  onScegli: (m: MetodoSalvato) => void
  etichetta?: (m: MetodoSalvato) => string
}) {
  return (
    <View style={stili.elenco}>
      {metodi.map((m) => {
        const usato = inUso?.(m) ?? false
        return (
          <View key={m.fonte_id} style={stili.riga}>
            <MetodoAttualeBadge metodo={{ tipo: m.tipo, finale: m.finale, scadenza: m.scadenza, scaduta: false }} />
            {usato ? (
              <Testo variante="piccolo">{t('È già quello che usano gli abbonamenti scelti.', 'It’s already the one the selected memberships use.')}</Testo>
            ) : (
              <Bottone
                testo={etichetta ? etichetta(m) : m.tipo === 'CreditCard' ? t('Usa questa carta', 'Use this card') : t('Usa questo conto', 'Use this account')}
                variante="contorno"
                inCorso={inCorso === m.fonte_id}
                disabilitato={occupato}
                onPress={() => onScegli(m)}
              />
            )}
          </View>
        )
      })}
    </View>
  )
}

const stili = StyleSheet.create({
  elenco: { gap: spazio.tre },
  riga: { gap: spazio.due },
})
