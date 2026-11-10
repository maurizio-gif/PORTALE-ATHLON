import { t } from '@/lib/lingua'

// Modulo puro (niente React ne' React Native): lo prova `scripts/prova-posizione-attesa.ts`.

/** Le due righe sotto la pillola «In lista d'attesa»: «Posizione 3» e, sotto, «2 persone davanti a te». */
export type PostoInCoda = { posizione: string; davanti: string }

/**
 * Il posto in coda di chi e' in lista d'attesa (10/11/2026, richiesta di Maurizio). Il numero lo calcola la funzione (`posizioniInAttesa` in
 * APP-ATHLON); 1 e' il primo. Sono **due righe e non una frase**: sul telefono la colonna e' stretta, e una frase sola si spezzava dove
 * capitava («Posizione 2 · 1 / persona davanti a / te»). Senza un numero valido (la funzione non l'ha calcolato, o non e' ancora
 * aggiornata) non si dice niente: meglio nessuna riga di un posto inventato.
 */
export function testoPosizione(posizione: number | null | undefined): PostoInCoda | null {
  if (typeof posizione !== 'number' || !Number.isInteger(posizione) || posizione < 1) return null
  const davanti = posizione - 1
  return {
    posizione: t(`Posizione ${posizione}`, `Position ${posizione}`),
    davanti:
      davanti === 0
        ? t('Sei il primo in lista', 'You are first in line')
        : t(`${davanti} ${davanti === 1 ? 'persona' : 'persone'} davanti a te`, `${davanti} ${davanti === 1 ? 'person' : 'people'} ahead of you`),
  }
}
