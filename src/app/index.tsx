import { Pagina } from '@/components/Pagina'
import { Voce } from '@/components/Voce'

// La porta d'ingresso. In fase 1 non c'e' login: ogni operazione parte da
// una richiesta con l'email e si conclude dal link che arriva (binario A).
// L'area riservata (binario B) e' a parte: si entra con il codice che arriva per email.
export default function Home() {
  return (
    <Pagina indietro={false} titolo="Cosa vuoi fare?" sottotitolo="Scegli l’operazione e scrivi la tua email: ti mandiamo un link per completarla.">
      <Voce
        titolo="Metodo di pagamento"
        descrizione="Salva o cambia l’IBAN o la carta dei tuoi abbonamenti e di quelli dei tuoi figli."
        href="/richiesta/metodo-pagamento"
      />
      <Voce titolo="La tua area" descrizione="Abbonamenti, pagamenti, prenotazioni, workout e Athlon TV: entra con la tua email." href="/lab" />
    </Pagina>
  )
}
