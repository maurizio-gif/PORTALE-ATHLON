import type { CorsoDelSito, Vetrina } from '@/api/lab'

// Le copertine delle raccolte di Athlon TV (04/11/2026): la foto di una raccolta e' quella del
// CORSO che porta lo stesso nome (le foto di `lezioni.json`, le stesse del Calendario); se il
// club non ha un corso con quel nome, quella del corso piu' simile. Prima la scelta la faceva
// solo la funzione `portale-lab-video` (APP-ATHLON) con una tabella di 20 nomi scritti uguali
// al carattere: bastava un accento diverso («Passé» e non «Passè») o una raccolta nuova e
// restava il fotogramma scelto da Vimeo, che per lo piu' non c'entra col corso.
// **Il modulo e' puro** (niente rete ne' React Native: si prova con `npx tsx scripts/prova-copertine.ts`);
// la lettura di `lezioni.json` sta in `leggiCorsiDelSito` (`api/lab.ts`).

/** «G-Passè» e «G-Passé», «Aero & Step» e «aero e step»: stessa cosa. Minuscolo, senza accenti ne' segni. */
export function normalizza(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Le raccolte che conosciamo per nome, con il corso da usare. Sono le 20 della tabella della funzione, con due
 * correzioni dove il corso non era dello stesso genere: «Aero & Step» (cardio a ritmo di musica) non e' il MOTR
 * (attrezzo, Pilates e mobilita'), «Body Tone» (tonificazione) non e' il Group Reformer.
 * Per «G-Passè» e «GAG» la scelta e' rimasta quella di prima: non sappiamo con certezza che cosa siano.
 */
const NOTE: Record<string, string> = {
  salute: 'GINNASTICA DOLCE',
  kids: 'BABY SWIM',
  'aero & step': 'GP COREO',
  'g-passè': 'HBX FUSION',
  'yoga fusion': 'YOGASSÈ',
  'short lessons': 'BODY SCULPT',
  'atletica workout': 'GYM FLOOR',
  'zumba fitness': 'BALLI DI GRUPPO',
  'total body': 'LES MILLS BODY PUMP',
  'slimming workout': 'HBX BOXING',
  'power yoga': 'POWER YOGA',
  'power pilates': 'MAT 41',
  'hatha yoga': 'HATHA YOGA',
  'ginnastica posturale': 'GINNASTICA POSTURALE',
  gag: 'GINN PILATES',
  'functional training': 'STRENGTH DEVELOPMENT',
  calisthenics: 'CALISTHENICS',
  'booty workout': 'BOOTY WORKOUT',
  'body tone': 'BODY SCULPT',
  '20 minuti di': 'ANTIGRAVITY',
}

const NOTE_NORMALIZZATE = new Map(Object.entries(NOTE).map(([titolo, corso]) => [normalizza(titolo), normalizza(corso)]))

/**
 * Per una raccolta che non ha un corso con il suo nome (e non e' fra le note): il corso piu' simile, dalle
 * parole del titolo. Si guarda dall'alto e vince la prima regola che combacia, quindi le piu' precise stanno prima.
 */
const SIMILI: [RegExp, string][] = [
  [/\bhatha\b/, 'HATHA YOGA'],
  [/\bpower\b.*\byoga\b|\byoga\b.*\bpower\b|\bvinyasa\b|\bashtanga\b/, 'POWER YOGA'],
  [/\byoga\b.*\b(fusion|pilates|stretching)\b|\b(fusion|pilates)\b.*\byoga\b/, 'YOGASSÈ'],
  [/\byoga\b/, 'HATHA YOGA'],
  [/\breformer\b/, 'GROUP REFORMER'],
  [/\b(motr|equilibrio|propriocezione)\b/, 'MOTR'],
  [/\b(mat|matwork|mat work)\b.*\b(41|flow)\b|\bflow\b/, 'MAT 41'],
  [/\b(ginn|ginnastica)\b.*\bpilates\b/, 'GINN PILATES'],
  [/\bpilates\b|\bmatwork\b|\bmat work\b|\bcore\b/, 'PILATES MATWORK'],
  [/\b(postura|posturale|schiena|cervicale|lombare|back)\b/, 'GINNASTICA POSTURALE'],
  [/\b(dolce|salute|senior|over|terza eta|mobilita|stretching|allungamento|rilassamento)\b/, 'GINNASTICA DOLCE'],
  [/\b(difesa|autodifesa|krav|self defense)\b/, 'DIFESA PERSONALE'],
  [/\b(box|boxe|boxing|kick|combat|fight|muay)\b/, 'HBX BOXING'],
  [/\b(hydrobike|idrobike|aquabike|acquabike|hydro)\b|\b(aqua|acqua)\b.*\bbike\b/, 'HYDROBIKE'],
  [/\b(aqua|acqua|acquagym|acquafitness|acqua fitness)\b.*\b(soft|dolce|rigenerante)\b/, 'AQUA SOFT'],
  [/\b(aqua|acqua|acquagym)\b.*\b(training|allenamento|vasca)\b/, 'AQUA TRAINING'],
  [/\b(aqua|acqua|acquagym)\b.*\b(aerobic|aerobica|cardio)\b/, 'AQUA AEROBIC'],
  [/\b(aqua|acqua|acquagym|acquafitness)\b/, 'AQUA TONIC'],
  [/\b(baby|bimbi|bambini|bambino|kids|junior|mesi)\b/, 'BABY SWIM'],
  [/\b(scuola nuoto|corso di nuoto|tecnica di nuoto)\b/, 'SCUOLA NUOTO'],
  [/\b(nuoto|swim|swimming|vasca|stile libero|dorso|rana|delfino)\b/, 'NUOTO LIBERO'],
  [/\b(zumba|balli|ballo|danza|latin|latino|country|folk|salsa|bachata)\b/, 'BALLI DI GRUPPO'],
  [/\b(coreo|coreografia|coreografico|aerobica|aerobic|aero|step|dance|hip hop|funky)\b/, 'GP COREO'],
  [/\b(booty|glutei|gluteo|gambe|gag|brasiliana)\b/, 'BOOTY WORKOUT'],
  [/\b(pump|bilanciere|body pump|total body|full body)\b/, 'LES MILLS BODY PUMP'],
  [/\b(sculpt|tone|tonic|tonificazione|tonificante|modella|short|lessons|express|20 minuti|30 minuti)\b/, 'BODY SCULPT'],
  [/\b(calisthenics|corpo libero|street workout|trazioni)\b/, 'CALISTHENICS'],
  [/\b(antigravity|anti gravity|gravity|amaca|sospensione|aerial)\b/, 'ANTIGRAVITY'],
  [/\b(strength|forza|functional|funzionale|powerlifting|potenza|power)\b/, 'STRENGTH DEVELOPMENT'],
  [/\b(hiit|cardio|slimming|dimagrimento|dimagrire|circuit|circuito|crossfit|metabolico|brucia|fusion|bootcamp)\b/, 'HBX FUSION'],
  [/\b(gym|sala|sala pesi|atletica|workout|allenamento|fitness|training)\b/, 'GYM FLOOR'],
]

const SIMILI_NORMALIZZATI = SIMILI.map(([re, corso]) => [re, normalizza(corso)] as const)

/** `perNome`: i corsi per nome normalizzato, alias compresi; `alias`: quali di quei nomi sono alias. */
export type CorsiPerNome = { perNome: Map<string, CorsoDelSito>; alias: Set<string> }

/** I corsi di `lezioni.json` per nome normalizzato; gli alias («Pilates», «Body Pump») puntano al corso vero. */
export function corsiPerNome(lezioni: Record<string, CorsoDelSito>, alias: Record<string, string> = {}): CorsiPerNome {
  const perNome = new Map<string, CorsoDelSito>()
  const chiaviAlias = new Set<string>()
  for (const [nome, c] of Object.entries(lezioni)) perNome.set(normalizza(nome), c)
  for (const [a, nome] of Object.entries(alias)) {
    const c = lezioni[nome]
    const k = normalizza(a)
    if (c && !perNome.has(k)) {
      perNome.set(k, c)
      chiaviAlias.add(k)
    }
  }
  return { perNome, alias: chiaviAlias }
}

/**
 * Il corso la cui foto va sulla raccolta, o null (allora resta la copertina che arriva dal server):
 * 1) una raccolta nota per nome; 2) un corso che ha lo stesso nome (o un alias del sito), o il cui nome intero e' dentro
 * il titolo («Hatha Yoga Base»): un alias dentro il titolo non basta, «Pilates» dice poco in «Reformer Pilates»; 3) il piu' simile.
 * Si guardano solo i corsi che hanno una foto.
 */
export function corsoPer(titolo: string, corsi: CorsiPerNome): CorsoDelSito | null {
  const k = normalizza(titolo)
  if (!k) return null
  const conFoto = (nome: string | undefined) => {
    const c = nome ? corsi.perNome.get(nome) : undefined
    return c?.foto ? c : null
  }

  const nota = conFoto(NOTE_NORMALIZZATE.get(k))
  if (nota) return nota

  let migliore: { nome: string; corso: CorsoDelSito } | null = null
  for (const [nome, corso] of corsi.perNome) {
    if (!corso.foto) continue
    if (k !== nome && (corsi.alias.has(nome) || !` ${k} `.includes(` ${nome} `))) continue
    if (!migliore || nome.length > migliore.nome.length) migliore = { nome, corso }
  }
  if (migliore) return migliore.corso

  for (const [re, nome] of SIMILI_NORMALIZZATI) {
    if (!re.test(k)) continue
    const c = conFoto(nome)
    if (c) return c
  }
  return null
}

/** La raccolta con la foto del suo corso. Senza corsi (il sito non risponde) o senza un corso adatto, com'era. */
export function conFotoDelCorso(v: Vetrina, corsi: CorsiPerNome | null): Vetrina {
  if (!corsi) return v
  const corso = corsoPer(v.titolo, corsi)
  return corso?.foto ? { ...v, copertina: corso.foto, fuoco: corso.fuoco ?? null } : v
}
