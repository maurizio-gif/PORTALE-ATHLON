import type { Misura } from '@/api/lab'

import type { ToniTutti } from '../ui/tema'

// I dati del corpo (16/10/2026): il BMI da peso e altezza, la composizione
// (massa grassa e magra, l'una dall'altra col peso), e le serie nel tempo
// per il grafico dell'andamento.

export type Metrica = 'peso' | 'bmi' | 'vita' | 'fianchi' | 'petto' | 'braccio' | 'coscia' | 'grassa' | 'magra'

export const METRICHE: { chiave: Metrica; nome: string; unita: string }[] = [
  { chiave: 'peso', nome: 'Peso', unita: 'kg' },
  { chiave: 'bmi', nome: 'BMI', unita: '' },
  { chiave: 'grassa', nome: 'Massa grassa', unita: '%' },
  { chiave: 'magra', nome: 'Massa magra', unita: 'kg' },
  { chiave: 'vita', nome: 'Vita', unita: 'cm' },
  { chiave: 'fianchi', nome: 'Fianchi', unita: 'cm' },
  { chiave: 'petto', nome: 'Petto', unita: 'cm' },
  { chiave: 'braccio', nome: 'Braccio', unita: 'cm' },
  { chiave: 'coscia', nome: 'Coscia', unita: 'cm' },
]

/** «72,4». */
export function numero(n: number, decimali = 1): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: decimali, minimumFractionDigits: 0 })
}

/** «+1,2», «−0,8», «0». */
export function differenza(n: number): string {
  const r = Math.round(n * 10) / 10
  if (r === 0) return '0'
  return `${r > 0 ? '+' : '−'}${numero(Math.abs(r))}`
}

export function bmi(pesoKg: number | null | undefined, altezzaCm: number | null | undefined): number | null {
  if (!pesoKg || !altezzaCm) return null
  const m = altezzaCm / 100
  return Math.round((pesoKg / (m * m)) * 10) / 10
}

/**
 * Le fasce dell'OMS per gli adulti (le soglie), con parole morbide **di proposito**: il club non vuole
 * che un socio legga «Sovrappeso» o «Obesità» sul telefono. Niente giudizio, solo dove cade il numero
 * rispetto all'equilibrio. Stanno in una casella da una riga: non allungarle oltre 72 pt (11,5 pt
 * SemiBold), o sui telefoni stretti si troncano.
 */
export function fasciaBmi(v: number): { nome: string; tono: ToniTutti } {
  if (v < 18.5) return { nome: 'Leggero', tono: 'blu' }
  if (v < 25) return { nome: 'Equilibrio', tono: 'ok' }
  if (v < 30) return { nome: 'Un po’ sopra', tono: 'attenzione' }
  return { nome: 'Da bilanciare', tono: 'errore' }
}

/** L'altezza piu' recente fino a quella misurazione (si scrive di rado). */
export function altezzaAl(misure: Misura[], indice: number): number | null {
  for (let i = indice; i >= 0; i--) if (misure[i].altezza_cm) return misure[i].altezza_cm
  for (let i = indice + 1; i < misure.length; i++) if (misure[i].altezza_cm) return misure[i].altezza_cm
  return null
}

/** La massa grassa in percentuale: scritta, o dalla massa magra e dal peso. */
function grassaPct(m: Misura): number | null {
  if (m.massa_grassa_pct != null) return m.massa_grassa_pct
  if (m.massa_magra_kg != null && m.peso_kg) return Math.round(((m.peso_kg - m.massa_magra_kg) / m.peso_kg) * 1000) / 10
  return null
}

/** La massa magra in kg: scritta, o dalla massa grassa e dal peso. */
function magraKg(m: Misura): number | null {
  if (m.massa_magra_kg != null) return m.massa_magra_kg
  if (m.massa_grassa_pct != null && m.peso_kg) return Math.round(m.peso_kg * (1 - m.massa_grassa_pct / 100) * 10) / 10
  return null
}

export function valore(misure: Misura[], indice: number, metrica: Metrica): number | null {
  const m = misure[indice]
  switch (metrica) {
    case 'peso':
      return m.peso_kg
    case 'bmi':
      return bmi(m.peso_kg, altezzaAl(misure, indice))
    case 'grassa':
      return grassaPct(m)
    case 'magra':
      return magraKg(m)
    case 'vita':
      return m.vita_cm
    case 'fianchi':
      return m.fianchi_cm
    case 'petto':
      return m.petto_cm
    case 'braccio':
      return m.braccio_cm
    case 'coscia':
      return m.coscia_cm
  }
}

export type Punto = { data: string; valore: number }

/** I punti di una metrica, dalla misurazione piu' vecchia. */
export function serie(misure: Misura[], metrica: Metrica): Punto[] {
  const punti: Punto[] = []
  misure.forEach((m, i) => {
    const v = valore(misure, i, metrica)
    if (v != null) punti.push({ data: m.data, valore: v })
  })
  return punti
}

/** «12 ott», «12 ott 2025» se non e' di quest'anno. */
export function dataCorta(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  const stessoAnno = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', ...(stessoAnno ? {} : { year: 'numeric' }) })
}

/** «12/10». */
export function dataMinima(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

export function oggi(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
