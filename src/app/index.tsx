import { Pagina } from '@/components/Pagina'
import { Voce } from '@/components/Voce'

// La porta d'ingresso. In fase 1 non c'e' login: ogni operazione parte da
// una richiesta con l'email e si conclude dal link che arriva (binario A).
// Il laboratorio (binario B) e' a parte, solo per i tester.
export default function Home() {
  return (
    <Pagina indietro={false} titolo="Cosa vuoi fare?" sottotitolo="Scegli l’operazione e scrivi la tua email: ti mandiamo un link per completarla.">
      <Voce
        titolo="Metodo di pagamento"
        descrizione="Salva o cambia l’IBAN o la carta dei tuoi abbonamenti e di quelli dei tuoi figli."
        href="/richiesta/metodo-pagamento"
      />
      <Voce titolo="Prenota un evento" descrizione="Open day e lezioni speciali per i bambini." etichetta="presto" />
      <Voce titolo="Il tuo appuntamento" descrizione="Sposta o disdici la chiamata con il desk o con il nuoto." etichetta="presto" />
      <Voce titolo="Cambio abbonamento" descrizione="Chiedi di passare a un altro piano." etichetta="presto" />
      <Voce titolo="Laboratorio" descrizione="Area di prova riservata ai tester." href="/lab" />
    </Pagina>
  )
}
