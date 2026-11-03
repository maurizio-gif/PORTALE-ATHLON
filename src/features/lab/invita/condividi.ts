import { Linking, Platform, Share } from 'react-native'

// I modi di mandare il link d'invito (21/10/2026, richiesta di Maurizio; allargati il 04/11/2026: «Facebook, Instagram,
// TikTok, ecc. L'idea e' farlo condividere a piu' persone possibile»). Il testo lo scrive la funzione
// (`portale-lab-referral`), e il link e' sempre lo stesso per il socio: qui si sceglie solo da dove parte. Niente dati
// dell'amico passano da noi: il messaggio lo manda il socio, dal suo telefono.
//
// **Cosa si puo' fare davvero, canale per canale** (non tutti hanno un indirizzo di condivisione):
//  - WhatsApp, Telegram, Facebook, email, SMS: un indirizzo che apre l'app o il sito col testo (Facebook prende solo il
//    link: il testo non si precompila piu' dal 2018) gia' scritto.
//  - Instagram e TikTok **non hanno un indirizzo di condivisione**: da una pagina web non si puo' preparare ne' una storia
//    ne' un messaggio. Sul web si copiano testo e link e si apre il loro sito, e la persona incolla dove vuole (storia,
//    messaggio, post). Sull'app nativa si apre il foglio di condivisione del telefono, che li elenca (e dove l'app c'e'
//    accetta il link).
//  - «Altre app»: il foglio di condivisione del sistema (sul web `navigator.share`, dove c'e': telefoni e qualche computer),
//    che arriva a tutto quello che la persona ha installato: Messenger, Snapchat, X, LinkedIn…

export type Canale = 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'telegram' | 'email' | 'sms' | 'altre' | 'copia'

/** L'esito: `aperto` (si e' aperta un'app o un sito), `copiato` (testo e link negli appunti), `condiviso` (il foglio del sistema), `errore`. */
export type EsitoCondivisione = 'aperto' | 'copiato' | 'condiviso' | 'errore'

const SITI: Partial<Record<Canale, string>> = { instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/' }

/** L'SMS ha senso dove c'e' un telefono: sull'app nativa, e sul web solo con un touch (sul computer `sms:` non apre niente). */
export function smsDisponibile(): boolean {
  if (Platform.OS !== 'web') return true
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}

/** Il foglio di condivisione del sistema: sempre sull'app nativa, sul web solo dove il browser lo offre. */
export function altreDisponibile(): boolean {
  if (Platform.OS !== 'web') return true
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

function indirizzo(canale: 'whatsapp' | 'facebook' | 'telegram' | 'email' | 'sms', oggetto: string, messaggio: string, link: string): string {
  const t = encodeURIComponent(messaggio)
  if (canale === 'whatsapp') return `https://wa.me/?text=${t}`
  // Facebook prende solo il link (`u`): titolo e testo li legge dalla pagina del link, e `quote` non e' piu' supportato.
  if (canale === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`
  // Telegram: il link e, come testo, la riga dell'oggetto (il messaggio intero lo conterrebbe due volte).
  if (canale === 'telegram') return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(oggetto)}`
  if (canale === 'email') return `mailto:?subject=${encodeURIComponent(oggetto)}&body=${t}`
  // iOS vuole `sms:&body=`, Android `sms:?body=`: `sms:?&body=` li apre tutti e due.
  return `sms:?&body=${t}`
}

/** Il foglio di condivisione del sistema col messaggio gia' scritto (il link e' dentro il testo). Chiuderlo senza scegliere non e' un errore. */
async function foglio(oggetto: string, messaggio: string): Promise<EsitoCondivisione> {
  if (Platform.OS === 'web') {
    try {
      await navigator.share({ title: oggetto, text: messaggio })
    } catch (e) {
      // `AbortError`: la persona ha chiuso il foglio. Qualunque altro errore (browser senza supporto) si dice.
      if ((e as { name?: string })?.name !== 'AbortError') return 'errore'
    }
    return 'condiviso'
  }
  await Share.share({ message: messaggio })
  return 'condiviso'
}

/** Copia negli appunti del browser. Sull'app nativa non c'e' un modulo per gli appunti (servirebbe una build nuova). */
async function copiaSulWeb(testo: string): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.clipboard) return false
  try {
    await navigator.clipboard.writeText(testo)
    return true
  } catch {
    return false
  }
}

/** Apre l'app scelta col messaggio gia' scritto, o copia il link. */
export async function manda(canale: Canale, oggetto: string, messaggio: string, link: string): Promise<EsitoCondivisione> {
  try {
    if (canale === 'copia') {
      if (await copiaSulWeb(link)) return 'copiato'
      // Sull'app nativa il foglio di condivisione del telefono ha «Copia» fra le sue voci.
      await Share.share(Platform.OS === 'ios' ? { url: link } : { message: link })
      return 'condiviso'
    }

    if (canale === 'altre') return await foglio(oggetto, messaggio)

    if (canale === 'instagram' || canale === 'tiktok') {
      // Nell'app nativa il foglio del telefono li elenca. Sul web: testo e link negli appunti, e il loro sito in una scheda nuova.
      if (Platform.OS !== 'web') return await foglio(oggetto, messaggio)
      const copiato = await copiaSulWeb(messaggio)
      if (typeof window !== 'undefined') window.open(SITI[canale], '_blank', 'noopener')
      return copiato ? 'copiato' : 'aperto'
    }

    const url = indirizzo(canale, oggetto, messaggio, link)
    if (Platform.OS === 'web' && canale !== 'email' && canale !== 'sms' && typeof window !== 'undefined') {
      // Sul web le app di messaggi e i social si aprono in una scheda nuova: l'app resta dov'e'.
      window.open(url, '_blank', 'noopener')
      return 'aperto'
    }
    await Linking.openURL(url)
    return 'aperto'
  } catch {
    return 'errore'
  }
}
