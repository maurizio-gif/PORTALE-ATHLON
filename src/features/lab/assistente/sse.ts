// Il lettore di `text/event-stream` (modulo puro, si prova con `node --experimental-strip-types`): la funzione `portale-lab-assistente` manda
// gli eventi `inizio`, `testo`, `sostituisci`, `fine` ed `errore`, ognuno `event: <nome>` e `data: <json>` e una riga vuota. I pezzi arrivano
// tagliati dove capita (anche a meta' di una riga): qui si rimettono insieme.

export type EventoSse = { evento: string; dati: Record<string, any> }

export class LettoreSse {
  private resto = ''

  /** Un pezzo di testo del corpo; ritorna gli eventi completi che contiene. */
  push(pezzo: string): EventoSse[] {
    this.resto += pezzo.replace(/\r\n/g, '\n')
    const blocchi = this.resto.split('\n\n')
    this.resto = blocchi.pop() ?? ''
    const fuori: EventoSse[] = []
    for (const blocco of blocchi) {
      let evento = 'message'
      const dati: string[] = []
      for (const riga of blocco.split('\n')) {
        if (riga.startsWith('event:')) evento = riga.slice(6).trim()
        else if (riga.startsWith('data:')) dati.push(riga.slice(5).replace(/^ /, ''))
      }
      if (!dati.length) continue
      try {
        const j = JSON.parse(dati.join('\n'))
        if (j && typeof j === 'object' && !Array.isArray(j)) fuori.push({ evento, dati: j })
      } catch {
        // Un evento rotto non ferma gli altri.
      }
    }
    return fuori
  }

  /** Fine del corpo: un ultimo evento senza la riga vuota finale si legge lo stesso. */
  fine(): EventoSse[] {
    return this.resto.trim() ? this.push('\n\n') : []
  }
}
