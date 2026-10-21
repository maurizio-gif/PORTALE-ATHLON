import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Linking, Platform, Share, Text } from 'react-native'
import { t } from '@/lib/lingua'

import { Foglio } from './ui/Foglio'
import { Messaggio, Pulsante } from './ui/kit'
import { F, usePalette } from './ui/tema'

// Aprire un PDF dal portale (i documenti, il contratto firmato, la tessera).
//
// **Un PDF che si scarica si puo' sempre anche inviare** (17/10/2026): e' un principio del
// portale, e vale per ogni PDF, oggi e quando sara' un'app vera. Per questo ogni PDF passa da
// «Il documento e' pronto», con tre gesti: aprirlo, salvarlo, inviarlo. Prima il PDF si apriva
// da solo e l'invio dipendeva dal visualizzatore del telefono.
//
// Il link lo da' il server nel momento in cui serve (un link firmato di Supabase Storage,
// valido un'ora, o un file locale `blob:` come per la tessera), quindi il PDF e' pronto DOPO una
// richiesta di rete, e li' i browser bloccano la scheda nuova come popup: Safari sempre, e
// l'app installata sulla schermata Home di un iPhone peggio ancora. La scheda si apre dal tocco
// su «Apri», che e' il solo gesto che l'iPhone accetta senza discutere.
//
// **Inviare.** Sul web e' la condivisione del sistema (Web Share) con il file vero, cosi' il PDF
// arriva allegato e non come un link che scade; dove non c'e' si condivide l'indirizzo, e in
// ultimo si apre la posta. Nell'app nativa e' la condivisione del sistema, che oggi porta
// l'indirizzo: con il file sul telefono (expo-sharing) portera' il PDF.

export type EsitoPdf = { ok: true; url: string; nome?: string } | { ok: false; errore: string }

type Pronto = { url: string; nome: string }

/** Aperta dalla schermata Home (iPhone: `navigator.standalone`, il resto: display-mode). */
function appInstallata(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches) || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Il file del PDF, scaricato in anticipo: lo `share` del browser vuole un gesto dell'utente, e non aspetta una rete. */
function useFileCondivisibile(pronto: Pronto | null): File | null {
  // Il file porta con se' l'indirizzo da cui e' venuto: se il PDF cambia, quello vecchio non vale piu'.
  const [scaricato, setScaricato] = useState<{ url: string; file: File } | null>(null)
  useEffect(() => {
    if (!pronto || Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.canShare) return
    let vivo = true
    fetch(pronto.url)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (vivo && b) setScaricato({ url: pronto.url, file: new File([b], pronto.nome, { type: 'application/pdf' }) })
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [pronto])
  return pronto && scaricato?.url === pronto.url ? scaricato.file : null
}

// Un foglio dal basso e non un riquadro in pagina: chi tocca una ricevuta in fondo
// a un elenco lungo non vedrebbe comparire niente in cima, e crederebbe che non
// sia successo niente.
function PdfPronto({ pronto, onChiudi }: { pronto: Pronto | null; onChiudi: () => void }) {
  const p = usePalette()
  const file = useFileCondivisibile(pronto)
  // L'errore vale per il PDF per cui e' venuto: aprendone un altro non si vede piu'.
  const [guasto, setGuasto] = useState<{ per: Pronto | null; testo: string } | null>(null)
  const errore = guasto && guasto.per === pronto ? guasto.testo : null
  const setErrore = (testo: string | null) => setGuasto(testo ? { per: pronto, testo } : null)

  function apri() {
    if (!pronto) return
    if (Platform.OS !== 'web') {
      Linking.openURL(pronto.url)
      return
    }
    // Sincrono dentro il tocco: e' questo che lo rende lecito.
    const scheda = window.open(pronto.url, '_blank')
    // Fuori dall'app installata si puo' andare al PDF nella stessa scheda; dentro no,
    // perche' non c'e' un tasto indietro per tornare.
    if (!scheda && !appInstallata()) window.location.href = pronto.url
  }

  function salva() {
    if (!pronto || Platform.OS !== 'web') return
    const a = document.createElement('a')
    a.href = pronto.url
    a.download = pronto.nome
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function invia() {
    if (!pronto) return
    setErrore(null)
    try {
      if (Platform.OS !== 'web') {
        await Share.share({ message: pronto.nome, url: pronto.url })
        return
      }
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: pronto.nome })
        return
      }
      // Un indirizzo `blob:` non esiste fuori da questa pagina: non si manda come link.
      const condivisibile = !pronto.url.startsWith('blob:')
      if (condivisibile && navigator.share) {
        await navigator.share({ title: pronto.nome, url: pronto.url })
        return
      }
      if (condivisibile) {
        window.location.href = `mailto:?subject=${encodeURIComponent(pronto.nome)}&body=${encodeURIComponent(pronto.url)}`
        return
      }
      setErrore(t('Da questo dispositivo non si può inviare direttamente: salva il PDF e invialo dalla posta o da un messaggio.', 'You can’t send it directly from this device: save the PDF and send it by email or in a message.'))
    } catch (e) {
      // Chi chiude il foglio di condivisione non ha sbagliato niente.
      if ((e as { name?: string })?.name !== 'AbortError') setErrore(t('Non siamo riusciti a inviare il PDF. Riprova, oppure salvalo e invialo da lì.', 'We couldn’t send the PDF. Try again, or save it and send it from there.'))
    }
  }

  return (
    <Foglio aperto={Boolean(pronto)} titolo={t('Il documento è pronto', 'Your document is ready')} onChiudi={onChiudi}>
      <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14.5, lineHeight: 21 }}>
        {pronto?.nome ? `${pronto.nome}. ` : ''}{t('Aprilo per guardarlo, salvalo sul dispositivo o invialo a chi vuoi.', 'Open it to view it, save it to your device or send it to anyone you like.')}
      </Text>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo={t('Invia', 'Send')} icona="condividi" onPress={invia} />
      <Pulsante testo={t('Apri il PDF', 'Open the PDF')} icona="apriFuori" variante="secondario" onPress={apri} />
      {Platform.OS === 'web' ? <Pulsante testo={t('Salva sul dispositivo', 'Save to device')} icona="scarica" variante="contorno" onPress={salva} /> : null}
    </Foglio>
  )
}

/**
 * Chi apre i PDF: `apri(prendiUrl)` si chiama dentro il tocco, e `avviso` e' da
 * mettere in pagina - e' vuoto finche' non c'e' un errore da dire o un
 * documento pronto.
 */
export function useApriPdf(): { apri: (prendiUrl: () => Promise<EsitoPdf>) => Promise<void>; avviso: ReactNode } {
  const [pronto, setPronto] = useState<Pronto | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  const chiudi = useCallback(() => {
    setPronto((p) => {
      // Un file locale non serve piu': si libera.
      if (p?.url.startsWith('blob:') && typeof URL !== 'undefined') URL.revokeObjectURL(p.url)
      return null
    })
  }, [])

  const apri = useCallback(async (prendiUrl: () => Promise<EsitoPdf>) => {
    setErrore(null)
    setPronto(null)
    const r = await prendiUrl()
    if (!r.ok) {
      setErrore(r.errore)
      return
    }
    setPronto({ url: r.url, nome: r.nome ?? t('documento.pdf', 'document.pdf') })
  }, [])

  const avviso = (
    <>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <PdfPronto pronto={pronto} onChiudi={chiudi} />
    </>
  )
  return { apri, avviso }
}
