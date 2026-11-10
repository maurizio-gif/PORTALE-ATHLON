/**
 * Di quanto alzare un livello che occupa tutta la finestra perche' la tastiera non lo copra.
 *
 * - `tastiera`: l'altezza che dice `useAltezzaTastiera` (0 = chiusa);
 * - `barra`: la barra di navigazione sotto la tastiera (`useSafeAreaInsets().bottom`): la tastiera sale dal bordo dello schermo di `tastiera + barra`;
 * - `massima` e `adesso`: l'altezza del livello a tastiera chiusa e quella di adesso. Se il sistema ha gia' ridimensionato la finestra (telefoni e
 *   versioni che lo fanno ancora) la differenza e' quanto ha tolto lui, e si alza solo di quello che manca: mai due volte.
 */
export function quantoAlzare(tastiera: number, barra: number, massima: number, adesso: number): number {
  if (tastiera <= 0) return 0
  const giaTolto = Math.max(0, massima - adesso)
  return Math.max(0, tastiera + barra - giaTolto)
}
