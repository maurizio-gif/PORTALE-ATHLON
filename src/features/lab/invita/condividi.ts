import { Linking, Platform, Share } from 'react-native'

// I quattro modi di mandare il link d'invito (21/10/2026, richiesta di Maurizio): WhatsApp, email, SMS, oppure copiarlo.
// Il testo lo scrive la funzione (`portale-lab-referral`), e il link e' sempre lo stesso per il socio: qui si sceglie
// solo da dove parte. Niente dati dell'amico passano da noi: il messaggio lo manda il socio, dal suo telefono.

export type Canale = 'whatsapp' | 'email' | 'sms' | 'copia'

/** L'SMS ha senso dove c'e' un telefono: sull'app nativa, e sul web solo con un touch (sul computer `sms:` non apre niente). */
export function smsDisponibile(): boolean {
  if (Platform.OS !== 'web') return true
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}

function indirizzo(canale: Exclude<Canale, 'copia'>, oggetto: string, messaggio: string): string {
  const t = encodeURIComponent(messaggio)
  if (canale === 'whatsapp') return `https://wa.me/?text=${t}`
  if (canale === 'email') return `mailto:?subject=${encodeURIComponent(oggetto)}&body=${t}`
  // iOS vuole `sms:&body=`, Android `sms:?body=`: `sms:?&body=` li apre tutti e due.
  return `sms:?&body=${t}`
}

/** Apre l'app scelta col messaggio gia' scritto, o copia il link. `copiato` vuol dire che il link e' negli appunti. */
export async function manda(canale: Canale, oggetto: string, messaggio: string, link: string): Promise<'aperto' | 'copiato' | 'condiviso' | 'errore'> {
  try {
    if (canale === 'copia') {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link)
        return 'copiato'
      }
      // Sull'app nativa non c'e' un modulo per gli appunti (servirebbe una build nuova): il foglio di condivisione
      // del telefono ha «Copia» fra le sue voci.
      await Share.share(Platform.OS === 'ios' ? { url: link } : { message: link })
      return 'condiviso'
    }
    const url = indirizzo(canale, oggetto, messaggio)
    if (Platform.OS === 'web' && canale === 'whatsapp' && typeof window !== 'undefined') {
      // Sul web WhatsApp si apre in una scheda nuova: l'app resta dov'e'.
      window.open(url, '_blank', 'noopener')
      return 'aperto'
    }
    await Linking.openURL(url)
    return 'aperto'
  } catch {
    return 'errore'
  }
}
