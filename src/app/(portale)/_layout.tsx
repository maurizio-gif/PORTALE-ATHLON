import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import { Stack } from 'expo-router'
import { View } from 'react-native'

import { PulsanteAssistente } from '@/features/lab/assistente/PulsanteAssistente'
import { Avvio } from '@/features/lab/avvio/Avvio'
import { CompletaProfilo } from '@/features/lab/ingresso/CompletaProfilo'
import { useIngresso } from '@/features/lab/ingresso/useIngresso'
import { Notifiche } from '@/features/lab/notifiche/Notifiche'
import { EsciTotem } from '@/features/lab/totem/EsciTotem'
import { PagamentoTotem } from '@/features/lab/totem/PagamentoTotem'
import { BannerVista } from '@/features/lab/ui/BannerVista'
import { BarraSchede } from '@/features/lab/ui/BarraSchede'
import { SchermataInArrivo } from '@/features/lab/ui/Attesa'
import { Messaggio, Pulsante } from '@/features/lab/ui/kit'
import { Schermata } from '@/features/lab/ui/Schermata'
import { usePalette } from '@/features/lab/ui/tema'
import { useSessione } from '@/features/lab/useSessione'
import { vistaCorrente } from '@/features/lab/vista'
import { t } from '@/lib/lingua'
import { inModalitaTotem } from '@/lib/totem'

// Il portale (le schermate dopo l'accesso) sta nel gruppo `(portale)`, che non compare
// nell'indirizzo: la Home e' `/`, le altre `/calendario`, `/allenamento`, `/tv`...
// I vecchi indirizzi `/lab/...` li reindirizza vercel.json.
// Ha la sua cornice da app: il suo carattere (Plus Jakarta
// Sans), le schermate che passano l'una nell'altra in dissolvenza, come le
// schede di un'app, e sotto la barra delle schede, solo per chi e' entrato.
// Finche' il carattere non c'e' si usa quello di sistema: niente schermo vuoto.
export default function LayoutLaboratorio() {
  const p = usePalette()
  const sessione = useSessione()
  const { ingresso, fatto, riprova } = useIngresso(sessione)
  useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold })
  // Chi ha una sessione ma non puo' ancora entrare (e' nuovo, o la sua scheda non ha la data di nascita: `portale-registrazione`, 01/11/2026) vede
  // «Completa il profilo» al posto di tutto il portale: niente barra, niente notifiche, niente assistente, nessuna schermata che chiamerebbe una
  // funzione chiusa.
  //
  // **Lo `Stack` resta montato anche allora, e il gate si disegna dentro `screenLayout`** (04/11/2026): al posto del contenuto di ogni schermata.
  // Prima il gate sostituiva l'intero layout, `Stack` compreso: quando la persona poteva entrare lo `Stack` si montava da zero e, senza lo stato
  // che aveva preso dall'indirizzo, partiva dalla **prima schermata dichiarata** (`pagamenti/[riferimento]`, con il riferimento mancante), che
  // subito dopo riportava alla Home (`StatoPagamento`). Era il «mi si apre un attimo una pagina di pagamento e poi torno indietro» del
  // 02/11/2026 — e voleva dire che **qualunque indirizzo aperto a freddo** (`/calendario?attivita=…` da un link del sito, un ricaricamento,
  // il link dell'email di `/entra`) finiva sulla Home. Provato nel browser: aperto a freddo, `/calendario?attivita=Group%20Reformer` finiva su `/`
  // con il layout di prima e resta dov'e' con questo.
  const gate = Boolean(sessione && ingresso.fase !== 'dentro')
  const contenutoGate = gate ? (
    ingresso.fase === 'completa' ? (
      <CompletaProfilo key={ingresso.campi.join()} campi={ingresso.campi} precompila={ingresso.precompila} onFatto={fatto} />
    ) : ingresso.fase === 'segreteria' ? (
      <CompletaProfilo campi={[]} segreteria onFatto={fatto} />
    ) : ingresso.fase === 'errore' ? (
      <Schermata titolo="Athlon Club" barra={false}>
        <Messaggio>{ingresso.errore}</Messaggio>
        <Pulsante testo={t('Riprova', 'Try again')} onPress={riprova} />
      </Schermata>
    ) : (
      <SchermataInArrivo />
    )
  ) : null
  return (
    <View style={{ flex: 1, backgroundColor: p.fondo }}>
      {/* In vista cliente (vista.ts) la striscia con di chi e'; sulla stessa
          app, solo per chi e' entrato: senza accesso non c'e' niente da guardare. */}
      {sessione && !gate ? <BannerVista /> : null}
      <Stack screenLayout={({ children }) => (contenutoGate ?? children)} screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: p.fondo } }}>
        <Stack.Screen name="pagamenti/[riferimento]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="pagamenti/storico" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tv/[raccolta]/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="tv/[raccolta]/[video]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/[scheda]/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/[scheda]/[giorno]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/agente" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/importa" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/nuova" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/storico" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/test" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/misure" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/alimentazione" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/balance" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/punteggio" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/training" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/mese" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/settimana" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/consigli" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/percorso" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="allenamento/percorso-nuovo" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="allenamento/percorso-modifica" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="notifiche" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="invita" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="delega" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="consensi-minori" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="elimina-account" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="dati-figlio/[figlio]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="badge" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shop/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shop/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shop/carrello" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="shop/ordini" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shop/ordine/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen name="metodo-pagamento/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="club-life/news/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="club-life/eventi/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="club-life/help-desk/[...scheda]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="club-life/modulo/[tipo]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="club-life/survey/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="club-life/survey/[tema]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="metodo-pagamento/fatto/[token]" options={{ animation: 'fade' }} />
      </Stack>
      {sessione && !gate ? <BarraSchede /> : null}
      {/* Le notifiche del club (features/lab/notifiche): il giro che le legge e la finestra che compare appena ne arriva una. Solo per
          chi e' entrato, e mai in vista cliente: chi guarda l'app di un socio non deve segnare come viste le sue notifiche. */}
      {sessione && !gate && !vistaCorrente() ? <Notifiche /> : null}
      {/* Il pulsante «Assistente virtuale», in alto a destra e sempre visibile (features/lab/assistente): apre la chat, che resta
          montata qui e non si perde cambiando schermata. Solo con una sessione, e prima dell'avvio animato, che lo copre. In vista
          cliente non si disegna. Il feedback dei tester e' una carta della Home (home/CartaFeedback). */}
      {/* Sul totem (lib/totem.ts) al suo posto c'e' «Esci»: l'assistente non ha senso su un pannello davanti al desk, e chi finisce deve poter uscire con un tocco. */}
      {sessione && !gate ? inModalitaTotem() ? <EsciTotem /> : <PulsanteAssistente /> : null}
      {/* Sul totem ogni pagamento passa dalle tre strade (QR, email, con un operatore): la schermata che le mostra sta qui, sempre montata (`totem/passaggio.ts`). */}
      {sessione && !gate && inModalitaTotem() ? <PagamentoTotem /> : null}
      {/* L'avvio animato: una volta a ogni apertura, sopra tutto (features/lab/avvio).
          **Il `key` e' la ragione per cui si vede.** Chi ha gia' una sessione passa da questo ramo a quello di «Completa il profilo» (mentre
          `useIngresso` chiede lo stato al server) e poi di nuovo qui: l'`<Avvio />` sta in posizioni diverse nei due rami, quindi senza
          un `key` React smonta quello che sta girando e ne monta uno nuovo, che trova «gia' mostrato» (mostra.ts) e non disegna niente: si
          vedeva «Un attimo…» e il logo non partiva mai (01/11/2026, da «Completa il profilo»). Con lo stesso `key` in tutti e due i rami
          e' la stessa istanza, e l'animazione copre il passaggio. */}
      <Avvio key="avvio" />
    </View>
  )
}
