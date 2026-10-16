import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { leggiTesseramenti, scaricaTessera, type Tessera } from '@/api/tesseramenti'
import { spazio } from '@/theme'

import { useApriPdf } from '../apriPdf'
import { inMemoria, prendi } from '../memoria'
import { Bollino, Carta, Pulsante } from '../ui/kit'
import { F, usePalette } from '../ui/tema'

// La sezione Tesseramento della Home (17/10/2026): la tessera ASI attiva di ogni persona del
// nucleo, con il nome, il numero, da quando a quando vale, e il PDF da scaricare: lo stesso che
// il CRM stampa dalla scheda. Il riquadro compare solo se nel nucleo c'e' almeno una tessera
// attiva (AreaRiservata); le tessere scadute non si mostrano.
//
// Il PDF passa da «Il documento e' pronto» (apriPdf), che lo fa aprire, salvare e inviare: un PDF
// scaricato si puo' sempre anche inviare.

export const CHIAVE_TESSERAMENTI = 'tesseramenti:elenco'

/** Le tessere attive del nucleo, o null finche' non si sa (o se non si leggono: il riquadro allora non compare). */
export function useTesseramenti(): Tessera[] | null {
  const [tessere, setTessere] = useState<Tessera[] | null>(() => inMemoria<{ ok: true; tessere: Tessera[] }>(CHIAVE_TESSERAMENTI)?.tessere ?? null)
  useEffect(() => {
    let vivo = true
    prendi(CHIAVE_TESSERAMENTI, leggiTesseramenti).then((r) => {
      if (vivo && r.ok) setTessere(r.tessere)
    })
    return () => {
      vivo = false
    }
  }, [])
  return tessere
}

/** «1 settembre 2026», dal giorno del database («2026-09-01»). */
function giornoLungo(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' })
}

function validita(t: Tessera): string {
  if (t.dal && t.al) return `Valida dal ${giornoLungo(t.dal)} al ${giornoLungo(t.al)}`
  if (t.al) return `Valida fino al ${giornoLungo(t.al)}`
  if (t.dal) return `Valida dal ${giornoLungo(t.dal)}, senza scadenza`
  return 'Tessera attiva'
}

function SchedaTessera({ t, conNome }: { t: Tessera; conNome: boolean }) {
  const p = usePalette()
  const { apri, avviso } = useApriPdf()
  const [inCorso, setInCorso] = useState(false)
  const nome = [t.nome, t.cognome].filter(Boolean).join(' ').trim() || 'Tesseramento'

  async function scarica() {
    setInCorso(true)
    await apri(() => scaricaTessera(t))
    setInCorso(false)
  }

  return (
    <Carta>
      <View style={{ gap: spazio.tre }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spazio.tre }}>
          <Bollino icona="tessera" tono="blu" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 18, letterSpacing: -0.4 }} accessibilityRole="header">
              {nome}
            </Text>
            {conNome ? <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 13 }}>{t.titolare ? 'Titolare' : 'Familiare'}</Text> : null}
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={{ color: p.testoSecondario, fontFamily: F.semi, fontSize: 12, letterSpacing: 0.6 }}>TESSERA ASI N.</Text>
          <Text style={{ color: p.testo, fontFamily: F.extra, fontSize: 22, letterSpacing: -0.3 }} selectable>
            {t.numero}
          </Text>
          <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 14.5, lineHeight: 20 }}>{validita(t)}</Text>
        </View>
        <Pulsante testo="Scarica la tessera (PDF)" icona="scarica" onPress={scarica} inCorso={inCorso} />
        {avviso}
      </View>
    </Carta>
  )
}

export function SezioneTesseramento({ tessere }: { tessere: Tessera[] }) {
  return (
    <View style={{ gap: spazio.tre }}>
      {tessere.map((t) => (
        <SchedaTessera key={t.member_id} t={t} conNome={tessere.length > 1} />
      ))}
    </View>
  )
}
