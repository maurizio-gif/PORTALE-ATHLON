import { View } from 'react-native'

import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Forte, Testo } from '@/components/Testo'
import { t, tv } from '@/lib/lingua'

// Quando la carta non arriva su PerfectGym dopo la pagina di Adyen. Ripreso
// dal CRM (`_condivisi/CartaNonSalvata.tsx`).
//
// Il motivo, quando c'e', viene dalla banca (tradotto dalla funzione). Quando
// non c'e' si dicono i motivi per cui succede quasi sempre, ciascuno con cosa
// fare. Il conto corrente si offre sempre: non passa dal 3D Secure.
export function CartaNonSalvata({ motivo, onRiprova }: { motivo?: string | null; onRiprova: () => void }) {
  return (
    <>
      <Testo variante="sottotitolo">{t('La carta non risulta salvata', 'The card doesn’t appear to be saved')}</Testo>
      {motivo ? (
        <>
          <Testo>{t('La registrazione sulla pagina di Adyen non è andata a buon fine.', 'Saving the card on Adyen’s page didn’t go through.')}</Testo>
          <Avviso>
            <Testo>
              <Forte>{t('Cosa è successo:', 'What happened:')}</Forte> {motivo}
            </Testo>
          </Avviso>
        </>
      ) : (
        <>
          <Testo>{t('La registrazione sulla pagina di Adyen non è andata in fondo. Quasi sempre è per uno di questi motivi:', 'Saving the card on Adyen’s page wasn’t completed. It’s almost always for one of these reasons:')}</Testo>
          {tv(
            <View style={{ gap: 10 }}>
              <Testo>
                • <Forte>La conferma della banca (3D Secure) non è stata completata.</Forte> Molte banche chiedono di approvare nell’app o con
                un codice via SMS: se la notifica scade o la pagina si chiude prima, la carta non si salva. Riprova tenendo a portata di mano
                il telefono con l’app della banca, e approva entro pochi minuti.
              </Testo>
              <Testo>
                • <Forte>La banca ha rifiutato la carta.</Forte> Succede con alcune carte prepagate o virtuali, o con carte non abilitate ai
                pagamenti online o ricorrenti. Prova con un’altra carta, oppure chiedi alla tua banca di abilitarla.
              </Testo>
              <Testo>
                • <Forte>Un dato non corrispondeva.</Forte> Numero, scadenza o codice di sicurezza (CVV) devono essere scritti esattamente come
                sulla carta.
              </Testo>
            </View>,
            <View style={{ gap: 10 }}>
              <Testo>
                • <Forte>The bank confirmation (3D Secure) wasn’t completed.</Forte> Many banks ask you to approve in their app or with a code
                by text message: if the notification expires or the page closes first, the card isn’t saved. Try again with your phone and
                banking app at hand, and approve within a few minutes.
              </Testo>
              <Testo>
                • <Forte>The bank declined the card.</Forte> This happens with some prepaid or virtual cards, or cards not enabled for online
                or recurring payments. Try another card, or ask your bank to enable it.
              </Testo>
              <Testo>
                • <Forte>A detail didn’t match.</Forte> The number, expiry date and security code (CVV) must be entered exactly as on the card.
              </Testo>
            </View>,
          )}
        </>
      )}
      <Testo variante="attenuato">
        {tv(
          <>
            Se preferisci evitare la carta, puoi salvare il <Forte>conto corrente (IBAN)</Forte>: non chiede conferme dalla banca.
          </>,
          <>
            If you’d rather not use a card, you can save your <Forte>bank account (IBAN)</Forte>: it doesn’t need any bank confirmation.
          </>,
        )}
      </Testo>
      <Bottone testo={t('Riprova o scegli il conto', 'Try again or choose the account')} onPress={onRiprova} />
    </>
  )
}
