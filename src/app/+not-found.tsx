import { Pagina } from '@/components/Pagina'
import { Voce } from '@/components/Voce'
import { t } from '@/lib/lingua'

export default function NonTrovata() {
  return (
    <Pagina titolo={t('Pagina non trovata', 'Page not found')} sottotitolo={t('L’indirizzo non corrisponde a nessuna pagina del portale.', 'This address doesn’t match any page of the portal.')}>
      <Voce titolo={t('Torna all’inizio', 'Back to the start')} descrizione={t('Scegli cosa vuoi fare.', 'Choose what you want to do.')} href="/" />
    </Pagina>
  )
}
