import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import type { Area, PersonaArea } from '@/api/lab'
import { spazio } from '@/theme'
import { t } from '@/lib/lingua'

import { Bollino, Carta, Entra, Pulsante } from '../ui/kit'
import { F, usePalette, velo } from '../ui/tema'
import { vistaCorrente } from '../vista'
import { nome, statoCertificato, testoProroga, urgenzaCertificato, type StatoCertificato } from './certificato'
import { personeConAbbonamento } from './regolarita'

// L'avviso del certificato medico, subito sotto la testata della Home (20/10/2026, richiesta del club).
// Compare solo per chi **ha un abbonamento** e ha il certificato **scaduto o mancante**: chi non ha un
// abbonamento in vigore (un ex socio, una prova, un familiare senza corso) non e' tenuto a consegnarlo, e
// per lui resta la voce discreta di «Da fare» e la sezione Certificato. Un certificato che la segreteria sta
// ancora guardando non e' un avviso: la persona ha fatto la sua parte (`scadutoOMancante` e' falso). «In
// scadenza» e «da consegnare entro i 6 anni» non sono qui: non c'e' ancora niente di scaduto.
//
// Tutto da `portale_la_mia_area`, gia' letta: nessuna chiamata in piu'. Un abbonamento e' quello di
// `eAbbonamento` (con una quota, o principale a quota zero: omaggi ed employee), di ogni persona del nucleo.

type AreaTrovata = Extract<Area, { trovato: true }>

export type Avviso = { persona: PersonaArea; s: StatoCertificato }

/**
 * Le persone del nucleo da avvisare: hanno un abbonamento in vigore e il certificato scaduto o mancante.
 * Prima chi ha piu' fretta (scaduto, poi mancante); a pari urgenza l'ordine del nucleo, cioe' il titolare per primo.
 */
export function personeDaAvvisare(area: AreaTrovata): Avviso[] {
  const abbonate = personeConAbbonamento(area)
  return area.persone
    .filter((persona) => abbonate.has(persona.member_id))
    .map((persona) => ({ persona, s: statoCertificato(area.certificati.find((c) => c.member_id === persona.member_id), persona.data_nascita) }))
    .filter((a) => a.s.scadutoOMancante)
    .sort((a, b) => urgenzaCertificato(b.s) - urgenzaCertificato(a.s))
}

/** Di chi si parla: «Tu» per il titolare, il nome per un familiare. */
function chi(a: Avviso): string {
  return a.persona.titolare ? t('Tu', 'You') : nome(a.persona)
}

export function AvvisoCertificato({ area, onVai }: { area: AreaTrovata; onVai: () => void }) {
  const p = usePalette()
  const { width } = useWindowDimensions()
  const avvisi = personeDaAvvisare(area)
  if (!avvisi.length) return null
  const unico = avvisi.length === 1 ? avvisi[0] : null
  // Con una proroga temporanea concessa non e' un allarme: la segreteria ha dato tempo fino a una data, e l'avviso lo dice (ambra, non rosso).
  const tutteConProroga = avvisi.every((a) => a.s.proroga)
  const tono = tutteConProroga ? 'attenzione' : 'errore'
  const titolo = tutteConProroga && unico?.s.proroga
    ? t('Proroga temporanea concessa', 'Temporary extension granted')
    : unico ? t(`Certificato medico ${unico.s.testo.toLowerCase()}`, `Medical certificate ${unico.s.testo.toLowerCase()}`) : t('Certificati medici da sistemare', 'Medical certificates to sort out')
  // Chi guarda l'app di un cliente (lo staff, in sola lettura) vede la sezione ma non puo' caricare niente.
  const testoPulsante = vistaCorrente() ? t('Vedi il certificato', 'View the certificate') : avvisi.length > 1 ? t('Sistema i certificati', 'Sort out the certificates') : t('Carica il certificato', 'Upload certificate')
  return (
    <Entra indice={1}>
      <Carta style={[stili.carta, { borderColor: p[tono], backgroundColor: velo(p, tono, p.scuro ? 0.13 : 0.06) }]}>
        <View accessibilityRole="alert" style={{ gap: spazio.tre }}>
          <View style={stili.testa}>
            {/* Pieno in chiaro; in scuro il rosso e' pallido e l'icona bianca non si leggerebbe: li' il bollino e' a velo, con l'icona rossa. */}
            <Bollino icona="certificato" tono={tono} pieno={!p.scuro} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[stili.titolo, { color: p.testo }]}>{titolo}</Text>
              <Text style={[stili.sotto, { color: p.testoSecondario }]}>{tutteConProroga ? t('Il certificato va consegnato entro quella data: da qui, con una foto o un PDF.', 'The certificate must be handed in by then: here, with a photo or a PDF.') : t('Si consegna da qui, con una foto o un PDF.', 'You can hand it in here, with a photo or a PDF.')}</Text>
            </View>
          </View>
          <View style={{ gap: spazio.due }}>
            {avvisi.map((a) => (
              <View key={a.persona.member_id} style={{ gap: 1 }}>
                <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 13.5 }}>{unico ? chi(a) : `${chi(a)} · ${a.s.testo}`}</Text>
                <Text style={[stili.sotto, { color: p.testoSecondario }]}>{a.s.dettaglio}</Text>
                {a.s.proroga ? <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 13.5 }}>{testoProroga(a.s.proroga.fine)}</Text> : null}
              </View>
            ))}
          </View>
          {/* A tutta larghezza sul telefono, dove si tocca col pollice; sul desktop quanto il testo. */}
          <Pulsante testo={testoPulsante} icona="avanti" onPress={onVai} pieno={width < 700} />
        </View>
      </Carta>
    </Entra>
  )
}

const stili = StyleSheet.create({
  carta: { borderWidth: 1.5, padding: spazio.quattro - 2 },
  testa: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre },
  titolo: { fontFamily: F.extra, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  sotto: { fontFamily: F.medio, fontSize: 13.5, lineHeight: 19 },
})
