// I dati dell'ente, per le pagine su cui si chiede qualcosa di delicato.
//
// Copiati da `lib/club-legale.ts` del CRM, che li copia dal sito
// (`src/data/club.ts`): duplicazione dichiarata, il giorno che uno cambia va
// cambiato in tutti e tre i posti. Il telefono non c'e' di proposito: il sito
// non ne dichiara uno del club.
export const CLUB_LEGALE = {
  ragione: 'Società Sportiva Dilettantistica Point 2000 SSD',
  marchio: 'Athlon Club',
  indirizzo: 'Via Ugo Ojetti 134, 00137 Roma',
  piva: '05154811003',
  email: 'desk@athlonroma.it',
  pec: 'point2000srl@pec.it',
  sito: 'https://www.athlonroma.it',
  affiliazioni: 'ASI LAZ-RM4453 · FIN 996434 · CSEN 71519',
} as const
