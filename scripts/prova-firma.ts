// @ts-nocheck — script da `npx tsx`: usa moduli di Node che il progetto dell'app (tsc) non conosce.
// Prova di `features/lab/firmaTratti.ts` (puro): `LC_ALL=it_IT.UTF-8 npx tsx scripts/prova-firma.ts`
import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'

import { LUNGHEZZA_MINIMA, PNG_MAX, PNG_MIN, contaPunto, controllaPng, dentro, distanza, firmaSufficiente, lunghezza, percorso, pulisciPng } from '../src/features/lab/firmaTratti'

// Il campo firma dell'app nativa (08/11/2026): il disegno del tratto, quando una firma conta, e se il PNG e' uno che il
// server accetta (`portale-abbonamento`: base64 pulito, fra 200 e 400.000 caratteri).
let n = 0
const ok = (nome: string, f: () => void) => {
  f()
  n++
  console.log('ok', nome)
}
const linea = (da: number, a: number, passo = 5, y = 0) => {
  const punti = []
  for (let x = da; x <= a; x += passo) punti.push({ x, y })
  return punti
}

// Un PNG vero (CRC e Adler comprese, perche' lo fa zlib): una zona bianca RGBA di larghezza×altezza.
const crcTabella = Array.from({ length: 256 }, (_, i) => {
  let c = i
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (b: Buffer) => {
  let c = 0xffffffff
  for (const x of b) c = crcTabella[(c ^ x) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const pezzo = (tipo: string, dati: Buffer) => {
  const lung = Buffer.alloc(4)
  lung.writeUInt32BE(dati.length)
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dati])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corpo))
  return Buffer.concat([lung, corpo, crc])
}
const pngBianco = (l: number, a: number, casuale = false) => {
  const riga = l * 4 + 1
  const crudo = Buffer.alloc(riga * a, 0xff)
  for (let y = 0; y < a; y++) crudo[y * riga] = 0
  if (casuale) for (let i = 0; i < crudo.length; i++) if (i % riga) crudo[i] = Math.floor(Math.random() * 256)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(l, 0)
  ihdr.writeUInt32BE(a, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pezzo('IHDR', ihdr), pezzo('IDAT', deflateSync(crudo)), pezzo('IEND', Buffer.alloc(0))])
}
/** Quello che controlla il server, copiato da `portale-abbonamento/index.ts` (`firma_png`). */
const serverAccetta = (png: string) => !(!png || !/^[A-Za-z0-9+/=]+$/.test(png) || png.length > 400_000 || png.length < 200)

ok('la distanza e la lunghezza di un tratto', () => {
  assert.equal(distanza({ x: 0, y: 0 }, { x: 3, y: 4 }), 5)
  assert.equal(lunghezza([]), 0)
  assert.equal(lunghezza([{ x: 5, y: 5 }]), 0)
  assert.equal(lunghezza([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 14 }]), 15)
})

ok('un dito fermo non aggiunge punti, uno che si muove si', () => {
  assert.equal(contaPunto(undefined, { x: 1, y: 1 }), true, 'il primo punto c\'e\' sempre')
  assert.equal(contaPunto({ x: 10, y: 10 }, { x: 10.3, y: 10.3 }), false)
  assert.equal(contaPunto({ x: 10, y: 10 }, { x: 11, y: 10 }), true)
})

ok('il dito che esce dal foglio resta sul bordo', () => {
  assert.deepEqual(dentro({ x: -20, y: 400 }, 300, 160), { x: 0, y: 160 })
  assert.deepEqual(dentro({ x: 350, y: -3 }, 300, 160), { x: 300, y: 0 })
  assert.deepEqual(dentro({ x: 120, y: 80 }, 300, 160), { x: 120, y: 80 })
})

ok('il percorso: vuoto, un tocco (pallino), due punti, una curva', () => {
  assert.equal(percorso([]), '')
  // Un tocco e' un segmento di un decimo di punto (non di lunghezza zero): con la punta tonda si vede un pallino.
  assert.equal(percorso([{ x: 10, y: 20 }]), 'M10 20L10.1 20')
  assert.ok(lunghezza([{ x: 10, y: 20 }, { x: 10.1, y: 20 }]) > 0)
  assert.equal(percorso([{ x: 10, y: 20 }, { x: 30, y: 40 }]), 'M10 20L30 40')
  const d = percorso([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }, { x: 30, y: 10 }])
  assert.equal(d, 'M0 0Q10 10 15 5Q20 0 25 5L30 10')
  assert.ok(d.startsWith('M0 0'), 'parte dal primo punto')
  assert.ok(d.endsWith('L30 10'), 'arriva all\'ultimo punto')
})

ok('il percorso e\' sempre un `d` valido (solo comandi M, L, Q e numeri) e non ha mai NaN', () => {
  const casuale = Array.from({ length: 400 }, () => ({ x: Math.random() * 330, y: Math.random() * 190 }))
  for (const k of [1, 2, 3, 4, 10, 400]) {
    const d = percorso(casuale.slice(0, k))
    assert.match(d, /^M-?[\d.]+ -?[\d.]+([LQ]-?[\d.]+ -?[\d.]+( -?[\d.]+ -?[\d.]+)?)*$/, `forma, ${k} punti`)
    assert.ok(!/NaN|undefined|Infinity/.test(d))
  }
  // Numeri a un decimale: il percorso non pesa quanto i float interi.
  assert.ok(!/\.\d{2,}/.test(percorso(casuale)))
})

ok('un tocco o un trattino non sono una firma, una firma si', () => {
  assert.equal(firmaSufficiente([]), false)
  assert.equal(firmaSufficiente([[{ x: 5, y: 5 }]]), false, 'un tocco')
  assert.equal(firmaSufficiente([linea(0, 40)]), false, '40 punti di strada')
  assert.equal(firmaSufficiente([linea(0, LUNGHEZZA_MINIMA - 1)]), false)
  assert.equal(firmaSufficiente([linea(0, LUNGHEZZA_MINIMA)]), true)
  assert.equal(firmaSufficiente([linea(0, 200)]), true)
})

ok('i tratti si sommano: una firma fatta a pezzi (la i col puntino, la barra della t) conta', () => {
  assert.equal(firmaSufficiente([linea(0, 50), linea(0, 40, 5, 20)]), true)
  assert.equal(firmaSufficiente([linea(0, 30), linea(0, 30, 5, 20), [{ x: 3, y: 3 }]]), false)
})

ok('il base64 si ripulisce: senza prefisso e senza a capo', () => {
  assert.equal(pulisciPng('data:image/png;base64,AAAA'), 'AAAA')
  assert.equal(pulisciPng('AA\nAA\r\nBB BB\t'), 'AAAABBBB')
  assert.equal(pulisciPng('AAAA'), 'AAAA')
})

ok('un PNG vero passa; il suo base64 comincia come deve', () => {
  const b64 = pngBianco(1074, 600).toString('base64')
  assert.ok(b64.startsWith('iVBORw0KGgo'))
  assert.equal(controllaPng(b64), 'ok')
  assert.equal(serverAccetta(b64), true, 'e il server lo accetta')
})

ok('un PNG ripulito dai ritorni a capo di iOS passa, sporco non per il server', () => {
  const b64 = pngBianco(300, 170).toString('base64')
  const conCapo = b64.replace(/(.{76})/g, '$1\n')
  assert.equal(serverAccetta(conCapo), false, 'il server non accetta a capo: per questo si ripulisce')
  assert.equal(controllaPng(pulisciPng(conCapo)), 'ok')
  assert.equal(controllaPng(pulisciPng(`data:image/png;base64,${conCapo}`)), 'ok')
})

ok('vuoto, troppo corto e caratteri strani non passano', () => {
  assert.equal(controllaPng(''), 'vuoto')
  assert.equal(controllaPng('iVBORw0KGgo'), 'vuoto')
  assert.equal(controllaPng('iVBORw0KGgo' + '!'.repeat(PNG_MIN)), 'vuoto')
  assert.equal(controllaPng('iVBORw0KGgo' + 'A'.repeat(PNG_MIN - 12)), 'vuoto', 'a 199 caratteri')
  assert.notEqual(controllaPng('iVBORw0KGgo' + 'A'.repeat(PNG_MIN - 11)), 'vuoto', 'a 200 passa il controllo di lunghezza')
})

ok('quello che non e\' un PNG non passa, anche se e\' base64 e lungo abbastanza', () => {
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(500, 7)]).toString('base64')
  assert.equal(controllaPng(jpg), 'non_png')
  const testo = Buffer.from('<html>'.repeat(100)).toString('base64')
  assert.equal(controllaPng(testo), 'non_png')
})

ok('un PNG enorme si ferma qui, come il server: oltre 400.000 caratteri', () => {
  const grande = pngBianco(1200, 450, true).toString('base64')
  assert.ok(grande.length > PNG_MAX, `il PNG di prova pesa ${grande.length}`)
  assert.equal(controllaPng(grande), 'troppo_grande')
  assert.equal(serverAccetta(grande), false)
  // Il limite sta proprio sul confine del server, con i suoi numeri scritti qui e non quelli del modulo: se il modulo li
  // spostasse, la prova non deve spostarsi con lui.
  assert.equal(PNG_MAX, 400_000)
  assert.equal(PNG_MIN, 200)
  const confine = 'iVBORw0KGgo' + 'A'.repeat(400_000 - 11)
  assert.equal(confine.length, 400_000)
  assert.equal(controllaPng(confine), 'ok')
  assert.equal(serverAccetta(confine), true)
  assert.equal(controllaPng(confine + 'A'), 'troppo_grande')
  assert.equal(serverAccetta(confine + 'A'), false)
})

ok('quello che dice «ok» qui lo accetta anche il server (su mille PNG di misure diverse)', () => {
  for (let i = 0; i < 1000; i++) {
    const l = 120 + Math.floor(Math.random() * 1100)
    const a = 60 + Math.floor(Math.random() * 600)
    const b64 = pulisciPng(pngBianco(l, a).toString('base64'))
    if (controllaPng(b64) === 'ok') assert.equal(serverAccetta(b64), true, `${l}×${a}`)
    else assert.equal(serverAccetta(b64), false, `${l}×${a}: scartato qui, e il server lo scarterebbe`)
  }
})

console.log(`${n} gruppi ok`)
