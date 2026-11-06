import type { ReactNode } from 'react'
import { StyleSheet, Text } from 'react-native'

import type { Ordine, StatoRitiro } from '@/api/shop'
import { t } from '@/lib/lingua'

import { Messaggio } from '../ui/kit'
import type { ToniTutti } from '../ui/tema'
import { F, usePalette } from '../ui/tema'
import { giorno } from './quando'
import { useVetrina } from './useVetrina'

// Dove sta la merce di un ordine pagato (06/11/2026): in preordine, ordinata al fornitore, pronta in segreteria, ritirata. Lo dice `stato_ritiro` del server; qui si scrive.
// Nessuna data e nessun orario e' scritto in questo file: «consegna prevista» viene dall'articolo della vetrina (l'ordine non la porta), e il ritiro «negli orari di
// apertura del club» e' la frase di sempre.

export type TestiRitiro = { etichetta: string; tono: ToniTutti; titolo: string; testo: string }

/** I testi per lo stato del ritiro di un ordine pagato. `consegnaPrevista` e' quella dell'articolo, se il club l'ha scritta. */
export function testiRitiro(stato: StatoRitiro, consegnato: string | null, consegnaPrevista?: string | null): TestiRitiro {
  const prevista = consegnaPrevista ? t(` Consegna prevista: ${consegnaPrevista}.`, ` Expected delivery: ${consegnaPrevista}.`) : ''
  switch (stato) {
    case 'in_attesa':
      return {
        etichetta: t('In preordine', 'Pre-ordered'),
        tono: 'blu',
        titolo: t('In preordine', 'Pre-ordered'),
        testo: t('Lo ordiniamo e ti diciamo quando arriva.', 'We’ll order it and let you know when it arrives.') + prevista,
      }
    case 'ordinato':
      return {
        etichetta: t('Ordinato al fornitore', 'Ordered from the supplier'),
        tono: 'blu',
        titolo: t('Ordinato al fornitore', 'Ordered from the supplier'),
        testo: t('Ti diciamo quando arriva.', 'We’ll let you know when it arrives.') + prevista,
      }
    case 'pronto':
      return {
        etichetta: t('Pronto per il ritiro', 'Ready for pick-up'),
        tono: 'ok',
        titolo: t('Pronto per il ritiro in segreteria', 'Ready for pick-up at reception'),
        testo: t('Passa negli orari di apertura del club e mostra il codice qui sotto.', 'Come during the club’s opening hours and show the code below.'),
      }
    case 'ritirato':
      return {
        etichetta: consegnato ? t(`Ritirato il ${giorno(consegnato)}`, `Picked up on ${giorno(consegnato)}`) : t('Ritirato', 'Picked up'),
        tono: 'neutro',
        titolo: t('Ritirato', 'Picked up'),
        testo: consegnato ? t(`Ritirato il ${giorno(consegnato)}.`, `Picked up on ${giorno(consegnato)}.`) : t('Questo ordine è già stato consegnato.', 'This order has already been picked up.'),
      }
  }
}

/** La consegna prevista di un ordine: quella scritta sull'articolo (l'ordine non la porta). Serve solo mentre la merce non e' ancora arrivata. */
function ConsegnaPrevista({ ordine, componi }: { ordine: Ordine; componi: (consegna: string | null) => ReactNode }) {
  const { dati } = useVetrina()
  const consegna = ordine.righe.map((r) => dati?.articoli.find((a) => a.product_id === r.product_id)?.consegna_prevista ?? null).find(Boolean) ?? null
  return <>{componi(consegna)}</>
}

/**
 * Lo stato del ritiro come messaggio (la pagina dell'esito). Per un preordine ancora in attesa legge la vetrina (una volta, in memoria) per la consegna prevista;
 * per gli altri stati non chiede niente.
 */
export function MessaggioRitiro({ ordine }: { ordine: Ordine }) {
  if (ordine.stato_ritiro === null) return null
  const stato = ordine.stato_ritiro
  const mostra = (consegna: string | null) => {
    const x = testiRitiro(stato, ordine.consegnato_il, consegna)
    return (
      <Messaggio tono="ok" titolo={x.titolo}>
        {x.testo}
      </Messaggio>
    )
  }
  if (stato === 'in_attesa' || stato === 'ordinato') return <ConsegnaPrevista ordine={ordine} componi={mostra} />
  return mostra(null)
}

/** Lo stato del ritiro in una riga di testo (l'elenco degli ordini): solo per la merce che non e' ancora pronta, perche' per le altre c'e' gia' l'etichetta e il codice. */
export function RigaRitiro({ ordine }: { ordine: Ordine }) {
  const p = usePalette()
  if (ordine.stato_ritiro !== 'in_attesa' && ordine.stato_ritiro !== 'ordinato') return null
  const stato = ordine.stato_ritiro
  return <ConsegnaPrevista ordine={ordine} componi={(consegna) => <Text style={[stili.riga, { color: p.testoSecondario }]}>{testiRitiro(stato, null, consegna).testo}</Text>} />
}

const stili = StyleSheet.create({
  riga: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
