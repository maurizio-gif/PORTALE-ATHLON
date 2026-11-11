import { t } from '@/lib/lingua'

import { Messaggio } from '../ui/kit'

// Le aree sulla salute per un ragazzo da 13 a 17 anni (11/11/2026): Food, Recover, le misure del corpo e i piani con l'AI gliele apre un
// genitore, una alla volta, dalla pagina «Consensi per i tuoi figli» della sua app (`ConsensiMinori.tsx`). **Chi puo' entrare lo decide il
// server** (`_shared/salute-minori.ts` di APP-ATHLON), a ogni chiamata: qui si dice solo perche' la porta e' chiusa, o chi altro vede i dati.
//
// Il server manda `consenso_genitore`: `null` per un adulto (niente di tutto questo si vede), `false` per un ragazzo a cui il consenso manca,
// `true` per un ragazzo che ce l'ha. Una funzione non ancora aggiornata non lo manda: vale `null`, e l'app si comporta come prima.

/** Al posto di «per i maggiorenni»: al ragazzo manca il consenso del genitore per quest'area. Dice cosa serve e dove il genitore lo da'. */
export function ServeIlGenitore({ area }: { area: string }) {
  return (
    <Messaggio tono="attenzione" icona="famiglia" titolo={t('Serve il consenso di un genitore', 'A parent’s consent is needed')}>
      {t(
        `Hai meno di 18 anni: ${area} si apre quando un tuo genitore dà il consenso. Lo fa dalla sua app Athlon: Home → Famiglia → «Consensi per i tuoi figli». Appena lo ha dato, riapri questa pagina.`,
        `You’re under 18: ${area} opens once one of your parents gives consent. They do it from their own Athlon app: Home → Family → “Consents for your children”. Once they have, reopen this page.`,
      )}
    </Messaggio>
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
