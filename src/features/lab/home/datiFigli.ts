import type { PersonaArea } from '@/api/lab'

// I dati di un figlio nella sezione Famiglia (06/11/2026, richiesta di Maurizio): il codice fiscale sempre, l'email e il cellulare
// solo se sono diversi da quelli del titolare. Un bambino scritto con l'email e il numero del genitore (il caso normale) non li
// ripete: sulla riga resterebbero due righe uguali a quelle del Profilo.
//
// **Il server decide chi li ha** (`portale_area_per_email`, migrazione 20261106b): `dati` c'e' solo per i figli del genitore, non
// per il titolare e non per i bambini raggiunti con una delega. Qui non si ricontrolla niente: senza `dati` non c'e' nessuna riga.
// Un codice fiscale mancante non ha una riga («non presente» su un bambino piccolo si legge come un errore del genitore); il
// segnaposto «ESTERO…» dei residenti all'estero non arriva nemmeno dal server.

export type RigaDato = { chiave: 'codice_fiscale' | 'email' | 'telefono'; valore: string }

const pulito = (v: string | null | undefined) => String(v ?? '').trim()

/** Stessa email, senza guardare maiuscole e spazi. Se una delle due manca non sono uguali. */
export function stessaEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = pulito(a).toLowerCase()
  return x !== '' && x === pulito(b).toLowerCase()
}

/**
 * Stesso cellulare: gli ultimi 9 numeri (come `registrazione_somiglianze` sul server), cosi' «+39 320 123 4567», «0039 3201234567» e
 * «320-1234567» sono lo stesso numero. Sotto i 6 numeri non e' un cellulare e non si confronta.
 */
export function stessoCellulare(a: string | null | undefined, b: string | null | undefined): boolean {
  const ultime = (v: string | null | undefined) => pulito(v).replace(/\D/g, '').slice(-9)
  const x = ultime(a)
  return x.length >= 6 && x === ultime(b)
}

/** Le righe da mostrare sotto un figlio, nell'ordine: codice fiscale, email, cellulare. Vuoto per il titolare e per chi non ha `dati`. */
export function righeDatiFiglio(x: Pick<PersonaArea, 'titolare' | 'dati'>, titolare: Pick<PersonaArea, 'email' | 'telefono'> | undefined): RigaDato[] {
  const d = x.dati
  if (x.titolare || !d) return []
  const righe: RigaDato[] = []
  const cf = pulito(d.codice_fiscale).toUpperCase()
  if (cf) righe.push({ chiave: 'codice_fiscale', valore: cf })
  const email = pulito(d.email)
  if (email && !stessaEmail(email, titolare?.email)) righe.push({ chiave: 'email', valore: email })
  const telefono = pulito(d.telefono)
  if (telefono && !stessoCellulare(telefono, titolare?.telefono)) righe.push({ chiave: 'telefono', valore: telefono })
  return righe
}
