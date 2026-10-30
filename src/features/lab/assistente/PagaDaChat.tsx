import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { pulsanteToccato } from '@/api/assistente'
import type { Movimento } from '@/api/lab'
import { t } from '@/lib/lingua'
import { spazio } from '@/theme'

import { scorda } from '../memoria'
import { CHIAVE_MOVIMENTI, DaPagare, useMovimenti } from '../pagamenti/Movimenti'
import { Icona } from '../ui/Icona'
import { Messaggio, Pulsante, SchedeInArrivo } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { Tocco } from '../ui/Tocco'
import type { ProponePagamento } from './pagaDaChat'

// Il pagamento delle quote scadute nella chat (30/10/2026): un pulsante con la proposta dell'assistente («Paga la quota · 21,00 €») e, toccandolo, la carta «Da pagare»
// **della sezione Pagamenti** (`DaPagare`, lo stesso componente): le quote **rilette adesso dal server** e i pulsanti «Paga … con la carta •••• 1234» e «Usa un'altra carta».
// **Niente parte da solo**: l'addebito parte solo quando la persona tocca uno di quei pulsanti, e il server rilegge le quote da PerfectGym e non addebita niente se il totale
// non e' quello mostrato. L'importo scritto sul pulsante della proposta e' solo un'etichetta: quello che conta e' quello della carta, riletto.
// «Usa un'altra carta» porta fuori dall'app (la pagina di Adyen) e ritorna sulla sezione Pagamenti della Home, che verifica com'e' andata.

function CartaPagamento() {
  const p = usePalette()
  const { dati, errore, carica, rileggi } = useMovimenti()
  // Dopo il pagamento il mirror si aggiorna e l'elenco puo' svuotarsi: la carta resta con l'ultimo elenco visto, o sparirebbe il «Pagamento ricevuto».
  const visto = useRef<Movimento[] | null>(null)
  if (dati?.daSaldare.length) visto.current = dati.daSaldare

  if (!dati) {
    return errore ? (
      <>
        <Messaggio>{errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} icona="aggiorna" variante="secondario" piccolo onPress={carica} />
      </>
    ) : (
      <SchedeInArrivo quante={1} />
    )
  }
  const elenco = dati.daSaldare.length ? dati.daSaldare : visto.current
  if (!elenco) {
    return (
      <View style={{ gap: spazio.due }}>
        <Messaggio tono="ok">{t('Non risultano quote scadute da pagare.', 'No overdue instalments to pay.')}</Messaggio>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t('Se hai appena pagato, può servire qualche minuto perché il pagamento compaia.', 'If you’ve just paid, it can take a few minutes for the payment to show up.')}
        </Text>
      </View>
    )
  }
  return <DaPagare elenco={elenco} carta={dati.cartaSaldo} onAggiorna={rileggi} verificaSubito={false} />
}

export function PagaDaChat({ proposta, messaggioId }: { proposta: ProponePagamento; messaggioId: string | null }) {
  const p = usePalette()
  const [aperta, setAperta] = useState(false)

  return (
    <View style={{ gap: spazio.due, width: '100%', minWidth: 0 }}>
      {!aperta ? (
        <Tocco
          etichetta={proposta.etichetta}
          onPress={() => {
            if (messaggioId) pulsanteToccato(messaggioId, 'paga-quote')
            // Si apre sempre su una lettura nuova: la memoria dei pagamenti potrebbe dire «da pagare» di una quota pagata dal telefono.
            scorda(CHIAVE_MOVIMENTI)
            setAperta(true)
          }}
          style={[stili.proposta, { backgroundColor: p.accento }]}
        >
          <Icona nome="carta" size={15} colore="#fff" />
          <Text style={stili.propostaTesto} numberOfLines={2}>
            {proposta.etichetta}
          </Text>
        </Tocco>
      ) : (
        <CartaPagamento />
      )}
    </View>
  )
}

const stili = StyleSheet.create({
  proposta: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', maxWidth: '100%' },
  propostaTesto: { fontFamily: F.semi, fontSize: 14, color: '#fff', flexShrink: 1 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 18 },
})
