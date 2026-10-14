import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols'
import { View, type StyleProp, type ViewStyle } from 'react-native'

// Le icone del laboratorio: SF Symbols su iOS, Material Symbols su Android e
// sul web (expo-symbols porta il carattere con se'). Un nome nostro per ogni
// icona, cosi' le schermate non devono sapere come si chiama sulle due piattaforme.

const ICONE = {
  casa: ['house.fill', 'home'],
  calendario: ['calendar', 'calendar_month'],
  carta: ['creditcard.fill', 'credit_card'],
  pass: ['ticket.fill', 'confirmation_number'],
  esci: ['rectangle.portrait.and.arrow.right', 'logout'],
  persona: ['person.fill', 'person'],
  famiglia: ['person.2.fill', 'group'],
  abbonamento: ['figure.strengthtraining.traditional', 'fitness_center'],
  certificato: ['cross.case.fill', 'health_and_safety'],
  avanti: ['chevron.right', 'chevron_right'],
  indietro: ['chevron.left', 'chevron_left'],
  ok: ['checkmark.circle.fill', 'check_circle'],
  spunta: ['checkmark', 'check'],
  no: ['xmark.circle.fill', 'cancel'],
  clessidra: ['hourglass', 'hourglass_top'],
  orologio: ['clock', 'schedule'],
  email: ['envelope.fill', 'mail'],
  lucchetto: ['lock.fill', 'lock'],
  fulmine: ['bolt.fill', 'bolt'],
  chiudi: ['xmark', 'close'],
  info: ['info.circle', 'info'],
  laboratorio: ['flask.fill', 'science'],
  play: ['play.circle.fill', 'play_circle'],
  invia: ['paperplane.fill', 'send'],
  aggiorna: ['arrow.clockwise', 'refresh'],
  attenzione: ['exclamationmark.triangle.fill', 'warning'],
  rinnovo: ['arrow.triangle.2.circlepath', 'autorenew'],
  aggiungi: ['person.badge.plus', 'person_add'],
  ricevuta: ['list.bullet.rectangle.portrait', 'receipt_long'],
  persone: ['person.3.fill', 'groups'],
  stop: ['stop.circle', 'block'],
  regalo: ['gift.fill', 'redeem'],
  scudo: ['checkmark.shield.fill', 'verified_user'],
  modifica: ['pencil', 'edit'],
  telefono: ['phone.fill', 'call'],
  luogo: ['mappin.and.ellipse', 'location_on'],
  documento: ['person.text.rectangle', 'badge'],
  torta: ['birthday.cake.fill', 'cake'],
  impronta: ['touchid', 'fingerprint'],
  tessera: ['person.crop.square.filled.and.at.rectangle', 'card_membership'],
  chiocciola: ['at', 'alternate_email'],
} as const satisfies Record<string, readonly [SFSymbol, AndroidSymbol]>

export type NomeIcona = keyof typeof ICONE

export function Icona({ nome, size = 20, colore, style }: { nome: NomeIcona; size?: number; colore: string; style?: StyleProp<ViewStyle> }) {
  const [ios, material] = ICONE[nome]
  return (
    <SymbolView
      name={{ ios, android: material, web: material }}
      size={size}
      tintColor={colore}
      weight="semibold"
      style={style}
      fallback={<View style={[{ width: size, height: size }, style]} />}
    />
  )
}
