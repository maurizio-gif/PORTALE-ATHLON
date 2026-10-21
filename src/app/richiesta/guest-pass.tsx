import { RichiestaGuestPass } from '@/features/guest-pass/RichiestaGuestPass'

// La richiesta del Guest Pass dal link pubblico: il percorso sta in features/guest-pass, lo stesso della pagina
// dell'invito di un amico (/invito/<codice>).
export default function PaginaRichiestaGuestPass() {
  return <RichiestaGuestPass />
}
