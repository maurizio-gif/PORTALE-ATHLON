import { Pagina } from '@/components/Pagina'
import { Voce } from '@/components/Voce'

// Il laboratorio (binario B): fuori da PerfectGym per l'accesso, solo per i
// tester. Le voci si accendono tappa per tappa (docs/piano-fase-1.md).
export default function Laboratorio() {
  return (
    <Pagina titolo="Laboratorio" sottotitolo="Area di prova riservata ai tester: qui nascono login, area riservata, calendario e pagamenti.">
      <Voce titolo="Accesso con codice via email" descrizione="Login senza password, solo per gli indirizzi dei tester." etichetta="tappa 2" />
      <Voce titolo="La mia area" descrizione="Abbonamenti, famiglia, metodo di pagamento, certificato." etichetta="tappa 2" />
      <Voce titolo="Calendario lezioni" descrizione="Posti liberi, prenota e disdici: prenotazioni vere su PerfectGym." etichetta="tappa 4" />
      <Voce titolo="Pagamenti" descrizione="Pagamento diretto con Adyen, con il tetto di prova." etichetta="tappa 4" />
    </Pagina>
  )
}
