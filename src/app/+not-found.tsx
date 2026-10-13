import { Pagina } from '@/components/Pagina'
import { Voce } from '@/components/Voce'

export default function NonTrovata() {
  return (
    <Pagina titolo="Pagina non trovata" sottotitolo="L’indirizzo non corrisponde a nessuna pagina del portale.">
      <Voce titolo="Torna all’inizio" descrizione="Scegli cosa vuoi fare." href="/" />
    </Pagina>
  )
}
