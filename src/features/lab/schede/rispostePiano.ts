import { RISPOSTE_VUOTE, type PassoSala, type Risposte } from './questionario'
import { RISPOSTE_VASCA_VUOTE, type PassoVascaTutti, type RisposteVasca } from './questionarioVasca'

// Le risposte dei questionari a passi (`PassiSala.tsx`, `PassiVasca.tsx`) e il passo a cui si e' arrivati, **solo in memoria, mai sul
// disco**: servono a non perdere venti schermate se si esce per sbaglio (il gesto indietro del telefono, il tasto del browser) e a
// ritrovarle tornando. Le zone che danno fastidio sono dati sulla salute: uscendo dall'app (`esciDalLaboratorio`, memoria.ts) si
// buttano, e si buttano quando il piano e' stato composto o il socio ricomincia. Sala e vasca hanno ognuna le sue.

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

// ---- la vasca (22/10/2026) ------------------------------------------------------------------------------------------------

let risposteVasca: RisposteVasca = { ...RISPOSTE_VASCA_VUOTE }
let passoVasca: PassoVascaTutti | null = null

export function leggiRisposteVasca(): { risposte: RisposteVasca; passo: PassoVascaTutti | null } {
  return { risposte: risposteVasca, passo: passoVasca }
}

export function ricordaRisposteVasca(r: RisposteVasca, p: PassoVascaTutti) {
  risposteVasca = r
  passoVasca = p
}

export function dimenticaRisposteVasca() {
  risposteVasca = { ...RISPOSTE_VASCA_VUOTE }
  passoVasca = null
}

/** All'uscita dall'app: niente di nessuno dei due questionari resta a chi entra dopo. */
export function dimenticaTutteLeRisposte() {
  dimenticaRisposte()
  dimenticaRisposteVasca()
}
