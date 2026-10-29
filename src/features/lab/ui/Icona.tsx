import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols'
import { View, type StyleProp, type ViewStyle } from 'react-native'

// Le icone del laboratorio: SF Symbols su iOS, Material Symbols su Android e
// sul web (expo-symbols porta il carattere con se'). Un nome nostro per ogni
// icona, cosi' le schermate non devono sapere come si chiama sulle due piattaforme.

const ICONE = {
  casa: ['house.fill', 'home'],
  calendario: ['calendar', 'calendar_month'],
  carta: ['creditcard.fill', 'credit_card'],
  banca: ['building.columns.fill', 'account_balance'],
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
  volume: ['speaker.wave.2.fill', 'volume_up'],
  grafico: ['chart.bar.fill', 'bar_chart'],
  stella: ['sparkles', 'auto_awesome'],
  piu: ['plus', 'add'],
  meno: ['minus', 'remove'],
  peso: ['dumbbell.fill', 'fitness_center'],
  cronometro: ['timer', 'timer'],
  elenco: ['list.bullet', 'format_list_bulleted'],
  bandiera: ['flag.checkered', 'sports_score'],
  fiamma: ['flame.fill', 'local_fire_department'],
  condividi: ['square.and.arrow.up', 'ios_share'],
  aggiungiQuadrato: ['plus.square', 'add_box'],
  menuPunti: ['ellipsis', 'more_vert'],
  menuRighe: ['line.3.horizontal', 'menu'],
  apriFuori: ['safari', 'open_in_browser'],
  scarica: ['arrow.down.app', 'install_mobile'],
  copia: ['doc.on.doc', 'content_copy'],
  cerca: ['magnifyingglass', 'search'],
  giornale: ['newspaper.fill', 'newspaper'],
  aiuto: ['questionmark.circle.fill', 'help'],
  giu: ['chevron.down', 'expand_more'],
  su: ['chevron.up', 'expand_less'],
  // L'alimentazione (19/10/2026).
  piatto: ['fork.knife', 'restaurant'],
  fotocamera: ['camera.fill', 'photo_camera'],
  galleria: ['photo.fill', 'photo_library'],
  foglia: ['leaf.fill', 'eco'],
  goccia: ['drop.fill', 'water_drop'],
  cestino: ['trash', 'delete'],
  // Le notifiche del club (20/10/2026).
  campanello: ['bell.fill', 'notifications'],
  // Il feedback dei tester (20/10/2026): il fumetto con le righe, per il pulsante in alto a destra.
  feedback: ['text.bubble.fill', 'rate_review'],
  // Lo shop (18/10/2026).
  carrello: ['cart.fill', 'shopping_cart'],
  sacchetto: ['bag.fill', 'shopping_bag'],
  // L'invito di un amico (21/10/2026): l'SMS e il link da copiare.
  fumetto: ['message.fill', 'sms'],
  link: ['link', 'link'],
  // Il badge di accesso nel wallet del telefono (22/10/2026).
  wallet: ['wallet.pass.fill', 'wallet'],
  // Il video di Athlon Health System (25/10/2026): avvia, pausa e audio spento.
  riproduci: ['play.fill', 'play_arrow'],
  pausa: ['pause.fill', 'pause'],
  muto: ['speaker.slash.fill', 'volume_off'],
  // L'invito a collegare Apple Salute (29/10/2026): il cuore, i passi e il sonno.
  cuore: ['heart.fill', 'favorite'],
  passi: ['figure.walk', 'directions_walk'],
  luna: ['moon.zzz.fill', 'bedtime'],
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
