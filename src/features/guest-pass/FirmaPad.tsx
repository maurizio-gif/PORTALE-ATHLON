import { Avviso } from '@/components/Avviso'

// Nell'app la firma col dito arrivera' con un modulo nativo: per ora il Guest
// Pass si attiva dal web. La versione web e' FirmaPad.web.tsx.

export const firmaDisponibile = false

export function FirmaPad(_: { onFirma: (png: string | null) => void; cancella: number }) {
  return <Avviso tono="attenzione">La firma del contratto, per ora, si fa dal sito: app.athlonroma.it.</Avviso>
}
