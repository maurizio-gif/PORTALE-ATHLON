// I prefissi telefonici internazionali, per codice ISO del Paese (gli stessi di `paesi.ts`).
// Servono alla tendina del prefisso del cellulare (`CampoTelefono`): il numero che parte
// e' sempre «+<prefisso><numero>», come lo vuole `telefonoDa` delle funzioni.
// Dove piu' Paesi hanno lo stesso prefisso (+1, +7, +44, +39...), leggendo un numero gia'
// scritto vale il primo di `PREFERITO`.

import { PAESI } from './paesi'

export const PREFISSO: Readonly<Record<string, string>> = {
  IT: '39', AF: '93', AL: '355', DZ: '213', AD: '376', AO: '244', AI: '1', AG: '1', SA: '966', AR: '54', AM: '374', AW: '297',
  AU: '61', AT: '43', AZ: '994', BS: '1', BH: '973', BD: '880', BB: '1', BE: '32', BZ: '501', BJ: '229', BM: '1',
  BT: '975', BY: '375', BO: '591', BA: '387', BW: '267', BR: '55', BN: '673', BG: '359', BF: '226', BI: '257',
  KH: '855', CM: '237', CA: '1', CV: '238', BQ: '599', CZ: '420', TD: '235', CL: '56', CN: '86', CY: '357', VA: '39',
  CO: '57', KM: '269', CD: '243', CG: '242', KP: '850', KR: '82', CI: '225', CR: '506', HR: '385', CU: '53', CW: '599',
  DK: '45', DM: '1', EC: '593', EG: '20', SV: '503', AE: '971', ER: '291', EE: '372', SZ: '268', ET: '251', FJ: '679',
  PH: '63', FI: '358', FR: '33', GA: '241', GM: '220', GE: '995', DE: '49', GH: '233', JM: '1', JP: '81', GI: '350',
  DJ: '253', JO: '962', GR: '30', GD: '1', GL: '299', GP: '590', GU: '1', GT: '502', GG: '44', GN: '224', GQ: '240',
  GW: '245', GY: '592', GF: '594', HT: '509', HN: '504', IN: '91', ID: '62', IR: '98', IQ: '964', IE: '353', IS: '354',
  CX: '61', IM: '44', NF: '672', AX: '358', KY: '1', CC: '61', CK: '682', FO: '298', FK: '500', MP: '1', MH: '692',
  PN: '64', SB: '677', TC: '1', VI: '1', VG: '1', IL: '972', JE: '44', KZ: '7', KE: '254', KG: '996', KI: '686',
  KW: '965', LA: '856', LS: '266', LV: '371', LB: '961', LR: '231', LY: '218', LI: '423', LT: '370', LU: '352',
  MK: '389', MG: '261', MW: '265', MY: '60', MV: '960', ML: '223', MT: '356', MA: '212', MQ: '596', MR: '222',
  MU: '230', YT: '262', MX: '52', FM: '691', MD: '373', MC: '377', MN: '976', ME: '382', MS: '1', MZ: '258', MM: '95',
  NA: '264', NR: '674', NP: '977', NI: '505', NE: '227', NG: '234', NU: '683', NO: '47', NC: '687', NZ: '64', OM: '968',
  NL: '31', PK: '92', PW: '680', PA: '507', PG: '675', PY: '595', PE: '51', PF: '689', PL: '48', PT: '351', PR: '1',
  QA: '974', HK: '852', MO: '853', GB: '44', CF: '236', DO: '1', RE: '262', RO: '40', RW: '250', RU: '7', EH: '212',
  KN: '1', LC: '1', MF: '590', VC: '1', BL: '590', PM: '508', WS: '685', AS: '1', SM: '378', SH: '290', ST: '239',
  SN: '221', RS: '381', SC: '248', SL: '232', SG: '65', SX: '1', SY: '963', SK: '421', SI: '386', SO: '252', ES: '34',
  LK: '94', US: '1', SS: '211', ZA: '27', SD: '249', SR: '597', SJ: '47', SE: '46', CH: '41', TJ: '992', TW: '886',
  TZ: '255', PS: '970', IO: '246', TH: '66', TL: '670', TG: '228', TK: '690', TO: '676', TT: '1', TN: '216', TR: '90',
  TM: '993', TV: '688', UA: '380', UG: '256', HU: '36', UY: '598', UZ: '998', VU: '678', VE: '58', VN: '84', WF: '681',
  YE: '967', ZM: '260', ZW: '263',
}

/** Per un prefisso condiviso, il Paese che si sceglie leggendo un numero gia' scritto. */
const PREFERITO: Readonly<Record<string, string>> = { '1': 'US', '7': 'RU', '44': 'GB', '39': 'IT', '47': 'NO', '61': 'AU', '212': 'MA', '262': 'RE', '358': 'FI', '590': 'GP', '599': 'CW', '64': 'NZ' }

/** L'elenco della tendina: l'Italia in cima, poi gli altri in ordine alfabetico. */
export const VOCI_PREFISSO: readonly (readonly [codice: string, nome: string, prefisso: string])[] = [
  ['IT', 'Italia', '39'],
  ...PAESI.filter(([c]) => PREFISSO[c]).map(([c, n]) => [c, n, PREFISSO[c]] as const),
]

const PREFISSI_LUNGHI = [...new Set(Object.values(PREFISSO))].sort((a, b) => b.length - a.length)

/**
 * Divide un numero gia' scritto in Paese del prefisso e numero. Senza «+» (o «00») e' un
 * numero italiano; un «39» davanti a un cellulare che comincia per 3 e' il prefisso.
 */
export function dividiTelefono(t: string | null | undefined): { paese: string; numero: string } {
  const grezzo = String(t ?? '').trim()
  let cifre = grezzo.replace(/[^0-9]/g, '')
  const internazionale = grezzo.startsWith('+') || cifre.startsWith('00')
  if (cifre.startsWith('00')) cifre = cifre.slice(2)
  if (!internazionale) {
    if (/^393\d{8,9}$/.test(cifre)) cifre = cifre.slice(2)
    return { paese: 'IT', numero: cifre }
  }
  const p = PREFISSI_LUNGHI.find((x) => cifre.startsWith(x))
  if (!p) return { paese: 'IT', numero: cifre }
  const paese = PREFERITO[p] ?? Object.keys(PREFISSO).find((c) => PREFISSO[c] === p) ?? 'IT'
  return { paese, numero: cifre.slice(p.length) }
}

/** «+39» e il numero, come si manda alla funzione: senza spazi, «+» e soltanto cifre. */
export function unisciTelefono(paese: string, numero: string): string {
  const cifre = numero.replace(/[^0-9]/g, '')
  if (!cifre) return ''
  return `+${PREFISSO[paese] ?? '39'}${cifre}`
}
