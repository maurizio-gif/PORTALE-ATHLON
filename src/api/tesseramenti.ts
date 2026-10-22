import { Platform } from 'react-native'

import { CRM_URL } from '@/config'
import { vistaCorrente } from '@/features/lab/vista'
import { supabase } from '@/lib/supabase'
import { t } from '@/lib/lingua'

// Il tesseramento ASI del socio e della sua famiglia (17/10/2026): la tessera attiva di ogni
// persona del nucleo, e il suo PDF, lo stesso che il CRM stampa dalla scheda. I dati li dice il
// database (`portale_i_miei_tesseramenti`, o `portale_tesseramenti_di` in vista cliente); il PDF lo
// genera il CRM (`/api/portale/tessera-asi`), che verifica la sessione e che la persona sia del nucleo.

export type Tessera = {
  member_id: number
  nome: string | null
  cognome: string | null
  titolare: boolean
  numero: string
  tipo: string | null
  stagione: number | null
  /** «AAAA-MM-GG»: da quando vale. */
  dal: string | null
  /** «AAAA-MM-GG»: fino a quando vale; null se la tessera non ha scadenza. */
  al: string | null
}

export type EsitoTesseramenti = { ok: true; tessere: Tessera[] } | { ok: false; errore: string }

export async function leggiTesseramenti(): Promise<EsitoTesseramenti> {
  const vista = vistaCorrente()
  const { data, error } = vista ? await supabase.rpc('portale_tesseramenti_di', { p_email: vista }) : await supabase.rpc('portale_i_miei_tesseramenti')
  if (error) {
    console.error('tesseramenti:', error.code, error.message)
    return { ok: false, errore: t('Non riusciamo a leggere il tuo tesseramento adesso.', 'We can’t load your membership card right now.') }
  }
  return { ok: true, tessere: ((data as { tessere?: Tessera[] } | null)?.tessere ?? []) as Tessera[] }
}

export type EsitoTessera = { ok: true; url: string; nome: string } | { ok: false; errore: string }

/**
 * Il PDF della tessera di una persona. Sul web il file si scarica con la sessione e diventa un
 * indirizzo locale (`blob:`) da aprire, salvare o inviare; nell'app nativa servira' un file
 * sul telefono (expo-file-system, expo-sharing), che oggi il progetto non ha.
 */
export async function scaricaTessera(tessera: Tessera): Promise<EsitoTessera> {
  const nome = `tessera-asi-${tessera.numero.replace(/[^\w-]/g, '')}.pdf`
  if (Platform.OS !== 'web') {
    return { ok: false, errore: t('Il download della tessera dall’app installata arriva con la versione definitiva: per ora aprila da app.athlonroma.it.', 'Downloading the card from the installed app comes with the final version: for now, open it from app.athlonroma.it.') }
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, errore: t('Sessione scaduta: entra di nuovo.', 'Session expired: sign in again.') }
  const vista = vistaCorrente()
  try {
    const r = await fetch(`${CRM_URL}/api/portale/tessera-asi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(vista ? { 'X-Athlon-Come': vista } : {}) },
      body: JSON.stringify({ member_id: tessera.member_id }),
    })
    if (!r.ok) {
      const d = (await r.json().catch(() => null)) as { errore?: string } | null
      return { ok: false, errore: d?.errore ?? t('Non riusciamo a scaricare la tessera adesso. Riprova fra qualche minuto.', 'We can’t download the card right now. Try again in a few minutes.') }
    }
    const blob = await r.blob()
    return { ok: true, url: URL.createObjectURL(blob), nome }
  } catch {
    return { ok: false, errore: t('Connessione non riuscita. Controlla la rete e riprova.', 'Connection failed. Check your network and try again.') }
  }
}
