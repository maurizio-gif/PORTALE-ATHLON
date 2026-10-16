import { router } from 'expo-router'
import type { ReactNode } from 'react'

import type { TipoModulo } from '@/api/clubLife'

import { SchermataInArrivo } from '../../ui/Attesa'
import { Messaggio, Pulsante } from '../../ui/kit'
import { hrefModulo } from '../link'
import { Cornice } from './Cornice'
import { moduloAperto, useProfilo } from './profilo'

// La porta dei due appuntamenti, che non sono per tutti: la carta nella scheda
// non si mostra a chi non puo' usarli (Blocchi), e qui si chiude anche la strada
// dei link e degli indirizzi, che porterebbero allo stesso modulo.

const RISERVATO: Partial<Record<TipoModulo, { sopra: string; titolo: string; testo: string }>> = {
  appuntamento: {
    sopra: 'Prenota una chiamata',
    titolo: 'Questa chiamata è per chi non è ancora iscritto',
    testo: 'Nel tuo nucleo c’è già un abbonamento. Per qualsiasi cosa ti serva, scrivi al club da qui.',
  },
  'appuntamento-nuoto': {
    sopra: 'Direzione Tecnica del nuoto',
    titolo: 'Riservato alle famiglie dei corsi di nuoto',
    testo: 'Puoi prenotare se tuo figlio è già iscritto, o se il suo abbonamento sta per iniziare.',
  },
}

/** Mostra il modulo a chi puo' usarlo, l'attesa finche' non si sa chi e', un avviso a tutti gli altri. */
export function Riservato({ tipo, children }: { tipo: TipoModulo; children: ReactNode }) {
  const { caricato, profilo } = useProfilo()
  if (!caricato) return <SchermataInArrivo />
  if (moduloAperto(tipo, profilo)) return <>{children}</>
  const t = RISERVATO[tipo]
  return (
    <Cornice sopratitolo={t?.sopra ?? 'Club Life'} titolo={t?.titolo ?? 'Modulo non disponibile'}>
      <Messaggio>{t?.testo ?? 'Questo modulo non è disponibile per te.'}</Messaggio>
      {tipo === 'appuntamento' ? <Pulsante testo="Scrivi al club" onPress={() => router.push(hrefModulo('scrivi'))} /> : null}
      <Pulsante testo="Torna a Club Life" variante={tipo === 'appuntamento' ? 'secondario' : 'primario'} onPress={() => router.navigate('/club-life')} />
    </Cornice>
  )
}
