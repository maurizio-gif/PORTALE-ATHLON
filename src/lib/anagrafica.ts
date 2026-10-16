// I controlli dei contatti che il tester puo' cambiare dal laboratorio. Gli
// stessi, con le stesse parole, li deve fare `portale-lab-anagrafica`: qui
// servono a correggere subito, la' a non scrivere mai su PerfectGym un dato storto.

import type { Indirizzo } from '@/api/lab'

import { capLiberoValido, ITALIA, nomePaese } from './residenteEstero'

const pulito = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

/**
 * Il cellulare, come lo controlla `portale-lab-anagrafica` (telefonoDa del
 * CRM): italiano, che comincia per 3, o col prefisso internazionale. Il
 * valore che si manda e' quello scritto: lo normalizza la funzione.
 */
export function controllaTelefono(t: string): { ok: true; valore: string } | { ok: false; errore: string } {
  const grezzo = pulito(t)
  const cifre = grezzo.replace(/[^0-9]/g, '')
  const estero = grezzo.startsWith('+') && cifre.slice(0, 2) !== '39'
  const valido = estero ? /^[1-9]\d{6,14}$/.test(cifre) : /^3\d{8,9}$/.test(cifre.replace(/^0039/, '').replace(/^39(?=3)/, ''))
  if (!valido) return { ok: false, errore: 'Controlla il numero di cellulare.' }
  return { ok: true, valore: grezzo }
}

export function controllaResidenza(d: Partial<Record<keyof Indirizzo, unknown>>): { ok: true; valori: Indirizzo } | { ok: false; errore: string } {
  const via = pulito(d.via)
  const cap = pulito(d.cap)
  const citta = pulito(d.citta)
  const paese = pulito(d.paese) || ITALIA
  if (via.length < 3) return { ok: false, errore: 'Scrivi via e numero civico.' }
  if (via.length > 120) return { ok: false, errore: 'L’indirizzo è troppo lungo.' }
  // Fuori dall'Italia il CAP e' libero: i CAP esteri non hanno cinque cifre.
  if (paese === ITALIA ? !/^\d{5}$/.test(cap) : !capLiberoValido(cap)) {
    return { ok: false, errore: paese === ITALIA ? 'Il CAP ha cinque cifre.' : 'Il CAP non è valido: da 2 a 12 caratteri fra lettere, cifre, spazio e trattino.' }
  }
  if (citta.length < 2 || citta.length > 60) return { ok: false, errore: 'Scrivi la città.' }
  return { ok: true, valori: { via, cap, citta, paese } }
}

/** «Via Ugo Ojetti 134, 00137 Roma»; fuori dall'Italia, con il Paese in fondo. */
export function indirizzoInRiga(i: Indirizzo | null | undefined): string | null {
  if (!i?.via) return null
  const estero = i.paese && i.paese !== ITALIA ? nomePaese(i.paese) : null
  return [i.via, [i.cap, i.citta].filter(Boolean).join(' '), estero].filter(Boolean).join(', ')
}
