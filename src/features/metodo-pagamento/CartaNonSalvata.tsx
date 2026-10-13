import { View } from 'react-native'

import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Forte, Testo } from '@/components/Testo'

// Quando la carta non arriva su PerfectGym dopo la pagina di Adyen. Ripreso
// dal CRM (`_condivisi/CartaNonSalvata.tsx`).
//
// Il motivo, quando c'e', viene dalla banca (tradotto dalla funzione). Quando
// non c'e' si dicono i motivi per cui succede quasi sempre, ciascuno con cosa
// fare. Il conto corrente si offre sempre: non passa dal 3D Secure.
export function CartaNonSalvata({ motivo, onRiprova }: { motivo?: string | null; onRiprova: () => void }) {
  return (
    <>
      <Testo variante="sottotitolo">La carta non risulta salvata</Testo>
      {motivo ? (
        <>
          <Testo>La registrazione sulla pagina di Adyen non è andata a buon fine.</Testo>
          <Avviso>
            <Testo>
              <Forte>Cosa è successo:</Forte> {motivo}
            </Testo>
          </Avviso>
        </>
      ) : (
        <>
          <Testo>La registrazione sulla pagina di Adyen non è andata in fondo. Quasi sempre è per uno di questi motivi:</Testo>
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
          </View>
        </>
      )}
      <Testo variante="attenuato">
        Se preferisci evitare la carta, puoi salvare il <Forte>conto corrente (IBAN)</Forte>: non chiede conferme dalla banca. Se non riesci
        in nessun modo, scrivici a desk@athlonroma.it e ti aiutiamo noi.
      </Testo>
      <Bottone testo="Riprova o scegli il conto" onPress={onRiprova} />
    </>
  )
}
