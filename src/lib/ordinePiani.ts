// L'ordine degli abbonamenti in tutta l'app (03/11/2026, richiesta di Maurizio): **prima il Premium, poi lo Smart**, e dentro ciascuno le formule come sul sito:
// Annuale a rate, Annuale in un'unica soluzione, Mensile Flex. Il server manda i piani nell'ordine del listino del sito (Smart, Premium): l'ordine si decide qui, **una volta
// sola**, appena arrivano (`statoAbbonamento`), cosi' ogni schermata che li elenca (il listino, il cambio, l'upgrade) lo eredita senza ricordarsene.
//
// Un abbonamento che non e' ne' Premium ne' Smart (un piano nuovo del listino) va dopo, nell'ordine in cui il server lo manda.
const GRUPPO = (nome: string): number => (/premium/i.test(nome) ? 0 : /smart/i.test(nome) ? 1 : 2)
const FORMULA: Record<string, number> = { 'annuale-rate': 0, 'annuale-unico': 1, flex: 2 }

export function ordinaPiani<T extends { abbonamento: string; formula: string }>(piani: readonly T[]): T[] {
  return piani
    .map((x, i) => ({ x, i }))
    .sort((a, b) => {
      const g = GRUPPO(a.x.abbonamento) - GRUPPO(b.x.abbonamento)
      if (g) return g
      // Dentro lo stesso abbonamento le formule come sul sito; fra due abbonamenti «altri» resta l'ordine del server.
      if (a.x.abbonamento === b.x.abbonamento) return (FORMULA[a.x.formula] ?? 3) - (FORMULA[b.x.formula] ?? 3) || a.i - b.i
      return a.i - b.i
    })
    .map(({ x }) => x)
}
