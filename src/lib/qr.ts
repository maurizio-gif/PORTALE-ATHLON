// @ts-expect-error il nucleo di `qrcode` e' JavaScript puro, ma i suoi tipi coprono solo l'ingresso principale (che per Metro tirerebbe dentro `fs` e `pngjs`)
import { create } from 'qrcode/lib/core/qrcode'

// Il codice QR di un testo, come matrice di quadratini (true = scuro). Solo il nucleo di `qrcode`: niente canvas, niente file, niente rete.
// Il disegno lo fa `components/CodiceQr.tsx` con `react-native-svg`. Non solleva mai: un testo che non entra (troppo lungo) torna null.

export function matriceQr(testo: string): boolean[][] | null {
  try {
    const { modules } = create(testo, { errorCorrectionLevel: 'M' }) as { modules: { size: number; get: (r: number, c: number) => number } }
    return Array.from({ length: modules.size }, (_, r) => Array.from({ length: modules.size }, (_, c) => !!modules.get(r, c)))
  } catch {
    return null
  }
}
