import { RISPOSTE_VUOTE, type PassoSala, type Risposte } from './questionario'

// Le risposte del questionario a passi (`PassiSala.tsx`) e il passo a cui si e' arrivati, **solo in memoria, mai sul disco**: servono a
// non perdere venti schermate se si esce per sbaglio (il gesto indietro del telefono, il tasto del browser) e a ritrovarle tornando.
// Le zone che danno fastidio sono dati sulla salute: uscendo dall'app (`esciDalLaboratorio`, memoria.ts) si buttano, e si buttano
// quando il piano e' stato composto o il socio ricomincia.

let risposte: Risposte = { ...RISPOSTE_VUOTE }
let passo: PassoSala | 'dove' | null = null

export function leggiRisposte(): { risposte: Risposte; passo: PassoSala | 'dove' | null } {
  return { risposte, passo }
}

export function ricordaRisposte(r: Risposte, p: PassoSala | 'dove') {
  risposte = r
  passo = p
}

export function dimenticaRisposte() {
  risposte = { ...RISPOSTE_VUOTE }
  passo = null
}
