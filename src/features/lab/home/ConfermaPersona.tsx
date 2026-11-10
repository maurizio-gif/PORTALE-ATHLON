import { StyleSheet, Text, View } from 'react-native'

import type { PersonaArea } from '@/api/lab'
import { dataBreve } from '@/lib/metodoPagamento'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { Consenso } from '../junior/Consenso'
import { Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'
import { nome } from './certificato'

// Il primo passo di «Carica il certificato» (10/11/2026): **per chi lo stai caricando?** Un genitore ha caricato sul
// proprio profilo il certificato del figlio, e la segreteria lo ha rifiutato (nome e data di nascita non tornano):
// ora, prima di scegliere il file, si dice di chi e', si spunta «confermo che e' di Tizio», e se non e' lui si
// sceglie un'altra persona del nucleo. Dal passo dopo si puo' tornare qui («Cambia persona») senza perdere i file
// gia' scelti: chi si accorge dello sbaglio a meta' ha gia' il file giusto in mano.

/** Sotto il nome: il titolare e' «il tuo profilo», un familiare ha la data di nascita, che e' quella che la segreteria confronta col certificato. */
export function dettaglioPersona(persona: PersonaArea): string {
  if (persona.titolare) return t('Il tuo profilo', 'Your profile')
  const data = persona.data_nascita ? dataBreve(persona.data_nascita) : null
  return data ? t(`Data di nascita ${data}`, `Date of birth ${data}`) : t('Familiare', 'Family member')
}

export function ConfermaPersona({
  persona,
  altre,
  spuntato,
  onSpunta,
  onContinua,
  onScegli,
}: {
  persona: PersonaArea
  /** Le altre persone del nucleo, a cui si puo' passare se questo non e' il certificato giusto. */
  altre: PersonaArea[]
  /** La spunta «confermo che e' di Tizio»; «Continua» si accende solo con lei. */
  spuntato: boolean
  onSpunta: () => void
  onContinua: () => void
  onScegli: (p: PersonaArea) => void
}) {
  const p = usePalette()
  const n = nome(persona)
  return (
    <View style={{ gap: spazio.tre }}>
      <View style={[stili.carta, { backgroundColor: p.incavo }]} accessibilityRole="header">
        <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{t('Stai caricando il certificato di', 'You’re uploading the certificate for')}</Text>
        <Text style={[stili.nome, { color: p.testo }]}>{n}</Text>
        <Text style={[stili.piccolo, { color: p.testoSecondario }]}>{dettaglioPersona(persona)}</Text>
      </View>
      <Text style={[stili.nota, { color: p.testoTerzo }]}>{t('Sul certificato devono esserci il nome e la data di nascita di questa persona.', 'The certificate must show this person’s name and date of birth.')}</Text>

      <Consenso spuntato={spuntato} onCambia={onSpunta} testo={t(`Confermo che il certificato è di ${n}`, `I confirm the certificate is for ${n}`)} />
      <Pulsante testo={t('Continua', 'Continue')} icona="avanti" disabilitato={!spuntato} onPress={onContinua} />

      {/* «Ah no, e' di un altro»: si sceglie la persona giusta, e la spunta riparte da capo. */}
      {altre.length ? (
        <View style={{ gap: spazio.due, paddingTop: spazio.uno }}>
          <Text style={[stili.forte, { color: p.testo }]}>{t(`Non è di ${n}? Scegli per chi è:`, `Not for ${n}? Choose who it’s for:`)}</Text>
          {altre.map((a) => (
            <Pulsante key={a.member_id} testo={a.titolare ? t('Per me', 'For me') : nome(a)} variante="contorno" piccolo onPress={() => onScegli(a)} />
          ))}
        </View>
      ) : (
        <Text style={[stili.nota, { color: p.testoTerzo }]}>
          {t(
            `Non è di ${n}? Il certificato di un figlio si carica dal suo profilo: se non lo vedi qui, aggiungilo prima da Famiglia con «Aggiungi un componente».`,
            `Not for ${n}? A child’s certificate is uploaded from their own profile: if you can’t see them here, add them first from Family with “Add a family member”.`,
          )}
        </Text>
      )}
    </View>
  )
}

const stili = StyleSheet.create({
  carta: { borderRadius: 18, padding: spazio.quattro - 2, gap: 4 },
  nome: { fontFamily: F.extra, fontSize: 22, lineHeight: 27, letterSpacing: -0.4 },
  piccolo: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
  forte: { fontFamily: F.semi, fontSize: 14.5, lineHeight: 20 },
  nota: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
})
