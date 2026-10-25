import type { StatoPush } from './push'

// Quando la Home invita ad attivare le notifiche (25/10/2026, richiesta di Maurizio: «promuovi di piu l'attivazione delle push»).
// La parte che decide e' pura, cosi' si prova senza schermata (`npx tsx`); `CartaPush.tsx` la usa.
//
// **Si invita solo dove c'e' una cosa da fare**: push spenta (un tocco) o bloccata dal browser (si sblocca dalle impostazioni).
// Non si invita dove la push e' gia' attiva, dove il browser non la sa fare (o l'app e' nativa), dove il club non l'ha ancora
// attivata sul server, e **su iPhone senza app installata**: li' c'e' gia' il riquadro «Installa l'app» (`ui/Installa.tsx`), che
// dice anche che e' l'unico modo di ricevere le notifiche; due carte per la stessa cosa una sull'altra sarebbero troppo.
//
// **«Non ora» rimanda di tre giorni, non per sempre**: una carta che non si puo' togliere e' una carta che si impara a non
// guardare; una che torna dopo qualche giorno e' un invito. Il rimando e' del dispositivo e si azzera uscendo dall'app: su un
// dispositivo condiviso chi entra dopo non eredita il «non ora» di chi c'era.

export const GIORNI_RIMANDO = 3
const GIORNO_MS = 86_400_000
const CHIAVE_RIMANDO = 'athlon:push-dopo'

export type InvitoPush = 'attiva' | 'sbloccare'

/** Cosa proporre adesso, o `null` se niente. `rimandataFinoA` e' un istante in millisecondi (0 = mai rimandata). */
export function invitoPush(stato: StatoPush, rimandataFinoA: number, ora: number): InvitoPush | null {
  if (rimandataFinoA > ora) return null
  if (stato === 'spento') return 'attiva'
  if (stato === 'bloccato') return 'sbloccare'
  return null
}

/** Fino a quando rimandare un invito dato adesso. */
export function rimandaFinoA(ora: number, giorni: number = GIORNI_RIMANDO): number {
  return ora + giorni * GIORNO_MS
}

/** Il rimando salvato su questo dispositivo, o 0. Non solleva mai: senza la memoria del browser l'invito torna a ogni apertura. */
export function leggiRimandoPush(): number {
  try {
    const n = Number(localStorage.getItem(CHIAVE_RIMANDO) ?? 0)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export function salvaRimandoPush(finoA: number): void {
  try {
    localStorage.setItem(CHIAVE_RIMANDO, String(finoA))
  } catch {
    // Niente memoria: l'invito torna alla prossima apertura, e va bene.
  }
}

/** Uscendo dall'app il «non ora» non passa a chi entra dopo. */
export function azzeraRimandoPush(): void {
  try {
    localStorage.removeItem(CHIAVE_RIMANDO)
  } catch {
    // Niente da togliere.
  }
}
