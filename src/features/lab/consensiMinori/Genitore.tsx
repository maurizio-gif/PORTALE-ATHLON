import { useState } from 'react'
import { View } from 'react-native'

import { chiediConsensoAlGenitore } from '@/api/consensiMinori'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { Messaggio, Pulsante } from '../ui/kit'

// Le aree sulla salute per un ragazzo da 13 a 17 anni (11/11/2026): Food, Recover, le misure del corpo e i piani con l'AI gliele apre un
// genitore, una alla volta, dalla pagina «Consensi per i tuoi figli» della sua app (`ConsensiMinori.tsx`). **Chi puo' entrare lo decide il
// server** (`_shared/salute-minori.ts` di APP-ATHLON), a ogni chiamata: qui si dice solo perche' la porta e' chiusa, o chi altro vede i dati.
//
// Il server manda `consenso_genitore`: `null` per un adulto (niente di tutto questo si vede), `false` per un ragazzo a cui il consenso manca,
// `true` per un ragazzo che ce l'ha. Una funzione non ancora aggiornata non lo manda: vale `null`, e l'app si comporta come prima.

/**
 * Al posto di «per i maggiorenni»: al ragazzo manca il consenso del genitore per quest'area. Dice cosa serve e, con **«Chiedi a un genitore»**
 * (11/11/2026, richiesta di Maurizio), manda al genitore un'email col pulsante che apre la sua app sulla pagina dei consensi
 * (`chiediConsensoAlGenitore`: la funzione trova il genitore dalla scheda del club, una richiesta ogni 24 ore). L'email non concede niente.
 */
export function ServeIlGenitore({ area }: { area: string }) {
  const [stato, setStato] = useState<'no' | 'in-corso' | 'fatto'>('no')
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null)

  async function chiedi() {
    setStato('in-corso')
    const r = await chiediConsensoAlGenitore()
    setEsito(r.ok ? { ok: true, testo: r.messaggio } : { ok: false, testo: r.errore })
    // Dopo un errore il pulsante resta: la funzione dice perche' (gia' chiesto oggi, nessun genitore sulla scheda) e si puo' riprovare.
    setStato(r.ok ? 'fatto' : 'no')
  }

  return (
    <View style={{ gap: spazio.tre }}>
      <Messaggio tono="attenzione" icona="famiglia" titolo={t('Serve il consenso di un genitore', 'A parent’s consent is needed')}>
        {t(
          `Hai meno di 18 anni: ${area} si apre quando un tuo genitore dà il consenso. Chiediglielo da qui: riceve un’email con il pulsante per aprire la sua app e decidere. Oppure lo fa da solo: Home → Famiglia → «Consensi per i tuoi figli».`,
          `You’re under 18: ${area} opens once one of your parents gives consent. Ask them from here: they get an email with a button to open their app and decide. Or they can do it themselves: Home → Family → “Consents for your children”.`,
        )}
      </Messaggio>
      {esito ? <Messaggio tono={esito.ok ? 'ok' : 'errore'}>{esito.testo}</Messaggio> : null}
      {stato === 'fatto' ? null : <Pulsante testo={t('Chiedi a un genitore', 'Ask a parent')} icona="famiglia" inCorso={stato === 'in-corso'} onPress={chiedi} />}
    </View>
  )
}

/**
 * Sulla pagina dove il ragazzo legge e accetta l'informativa della sezione: il consenso l'ha dato un genitore, e **il genitore puo' vedere
 * questi dati** (lo dice l'informativa al genitore, e deve saperlo anche lui prima di scrivere qualcosa). Sta fuori dal testo dell'informativa,
 * che ha una versione e vale per tutti: cambiarlo farebbe riaccettare ogni socio.
 */
export function NotaGenitore() {
  return (
    <Messaggio tono="attenzione" icona="famiglia" titolo={t('Con il consenso di un tuo genitore', 'With your parent’s consent')}>
      {t(
        'Hai meno di 18 anni: quest’area te l’ha aperta un genitore, che dalla sua app può vedere i dati che scrivi qui e può richiuderla quando vuole (in quel caso i dati di quest’area si cancellano). Il personale del club non li vede.',
        'You’re under 18: a parent opened this area for you. From their own app they can see the data you enter here, and they can close it whenever they like (in which case this area’s data is deleted). Club staff can’t see it.',
      )}
    </Messaggio>
  )
}
