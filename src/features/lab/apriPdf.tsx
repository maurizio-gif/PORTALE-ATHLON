import { useCallback, useState, type ReactNode } from 'react'
import { Linking, Platform, Text } from 'react-native'

import { Foglio } from './ui/Foglio'
import { Messaggio, Pulsante } from './ui/kit'
import { F, usePalette } from './ui/tema'

// Aprire un PDF dal portale (i documenti, il contratto firmato).
//
// Il link lo da' il server nel momento in cui serve - e' un link firmato di
// Supabase Storage, valido un'ora; i PDF di PerfectGym sono copiati li' - quindi
// si apre DOPO una richiesta di rete, e li' i browser bloccano la scheda nuova
// come popup: Safari sempre, e l'app installata sulla schermata Home di un
// iPhone peggio ancora, perche' non ha nemmeno le schede. Quindi tre strade:
//
// - app nativa: si passa al sistema, che sa cosa farne;
// - browser: la scheda si apre SUBITO, dentro il tocco, e solo dopo si sa dove
//   mandarla;
// - app installata, o scheda negata: niente scheda anticipata. Si mostra «Il
//   documento e' pronto» con un pulsante, e l'apertura parte da quel tocco, che
//   e' il solo gesto che l'iPhone accetta senza discutere.

export type EsitoPdf = { ok: true; url: string } | { ok: false; errore: string }

/** Aperta dalla schermata Home (iPhone: `navigator.standalone`, il resto: display-mode). */
function appInstallata(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches) || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

// Un foglio dal basso e non un riquadro in pagina: chi tocca una ricevuta in fondo
// a un elenco lungo non vedrebbe comparire niente in cima, e crederebbe che non
// sia successo niente.
function PdfPronto({ url, onChiudi }: { url: string | null; onChiudi: () => void }) {
  const p = usePalette()
  function apri() {
    if (!url) return
    if (Platform.OS !== 'web') {
      Linking.openURL(url)
      return
    }
    // Sincrono dentro il tocco: e' questo che lo rende lecito.
    const scheda = window.open(url, '_blank')
    // Fuori dall'app installata si puo' andare al PDF nella stessa scheda; dentro no,
    // perche' non c'e' un tasto indietro per tornare.
    if (!scheda && !appInstallata()) window.location.href = url
  }
  return (
    <Foglio aperto={Boolean(url)} titolo="Il documento è pronto" onChiudi={onChiudi}>
      <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 }}>
        Toccalo per aprirlo: da lì lo puoi salvare o condividere. Il link vale un'ora.
      </Text>
      <Pulsante testo="Apri il PDF" icona="apriFuori" onPress={apri} />
    </Foglio>
  )
}

/**
 * Chi apre i PDF: `apri(prendiUrl)` si chiama dentro il tocco, e `avviso` e' da
 * mettere in pagina - e' vuoto finche' non c'e' un errore da dire o un
 * documento da toccare.
 */
export function useApriPdf(): { apri: (prendiUrl: () => Promise<EsitoPdf>) => Promise<void>; avviso: ReactNode } {
  const [pronto, setPronto] = useState<string | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  const apri = useCallback(async (prendiUrl: () => Promise<EsitoPdf>) => {
    setErrore(null)
    setPronto(null)
    const web = Platform.OS === 'web'
    const scheda = web && !appInstallata() ? window.open('about:blank', '_blank') : null
    const r = await prendiUrl()
    if (!r.ok) {
      scheda?.close()
      setErrore(r.errore)
      return
    }
    if (!web) {
      await Linking.openURL(r.url)
      return
    }
    if (scheda && !scheda.closed) {
      scheda.location.href = r.url
      return
    }
    setPronto(r.url)
  }, [])

  const avviso = (
    <>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <PdfPronto url={pronto} onChiudi={() => setPronto(null)} />
    </>
  )
  return { apri, avviso }
}
