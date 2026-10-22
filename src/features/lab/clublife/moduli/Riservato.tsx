import { router } from 'expo-router'
import type { ReactNode } from 'react'

import type { TipoModulo } from '@/api/clubLife'
import { t } from '@/lib/lingua'

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
    sopra: t('Prenota una chiamata', 'Book a call'),
    titolo: t('Questa chiamata è per chi non è ancora iscritto', 'This call is for people who aren’t members yet'),
    testo: t('Nel tuo nucleo c’è già un abbonamento. Per qualsiasi cosa ti serva, scrivi al club da qui.', 'Your family already has a membership. For anything you need, write to the club from here.'),
  },
  'appuntamento-nuoto': {
    sopra: t('Direzione Tecnica del nuoto', 'Swimming Technical Director'),
    titolo: t('Riservato alle famiglie dei corsi di nuoto', 'For families in our swimming courses only'),
    testo: t('Puoi prenotare se tuo figlio è già iscritto, o se il suo abbonamento sta per iniziare.', 'You can book if your child is already enrolled, or if their membership is about to start.'),
  },
}

/** Mostra il modulo a chi puo' usarlo, l'attesa finche' non si sa chi e', un avviso a tutti gli altri. */
export function Riservato({ tipo, children }: { tipo: TipoModulo; children: ReactNode }) {
  const { caricato, profilo } = useProfilo()
  if (!caricato) return <SchermataInArrivo />
  if (moduloAperto(tipo, profilo)) return <>{children}</>
  const r = RISERVATO[tipo]
  return (
    <Cornice sopratitolo={r?.sopra ?? 'Club Life'} titolo={r?.titolo ?? t('Modulo non disponibile', 'Form not available')}>
      <Messaggio>{r?.testo ?? t('Questo modulo non è disponibile per te.', 'This form isn’t available to you.')}</Messaggio>
      {tipo === 'appuntamento' ? <Pulsante testo={t('Scrivi al club', 'Write to the club')} onPress={() => router.push(hrefModulo('scrivi'))} /> : null}
      <Pulsante testo={t('Torna a Club Life', 'Back to Club Life')} variante={tipo === 'appuntamento' ? 'secondario' : 'primario'} onPress={() => router.navigate('/club-life')} />
    </Cornice>
  )
}
