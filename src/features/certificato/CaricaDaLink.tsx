import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { caricaDaLink, type PaginaCertificato } from '@/api/certificati'
import { Avviso } from '@/components/Avviso'
import { Bottone } from '@/components/Bottone'
import { Pagina } from '@/components/Pagina'
import { Forte, Testo } from '@/components/Testo'
import { CERTIFICATO_ISTRUZIONI, FORMATI_CERTIFICATO } from '@/lib/certificatoIstruzioni'
import { MAX_BYTE, pesoLeggibile, type FileScelto } from '@/lib/fileCertificato'
import { dataBreve } from '@/lib/metodoPagamento'
import { spazio, useColori } from '@/theme'

import { useCarica } from './useCarica'

// Il certificato medico dal link dell'email (`app.athlonroma.it/r/<token>`, 17/10/2026): la
// pagina in cui il CRM manda chi non ha il certificato, ce l'ha scaduto o se l'e' visto
// rifiutare. Si apre senza accedere: la credenziale e' il token, che vale per una persona sola.
//
// Fa quello che il foglio dell'area riservata (features/lab/home/CaricaCertificato) fa con la
// sessione: spiega quale certificato serve, fa scegliere una foto o un PDF e lo invia. Il file
// va nel bucket privato, il certificato resta «in verifica» e la segreteria lo guarda dal CRM.

function Istruzioni() {
  const c = useColori()
  const i = CERTIFICATO_ISTRUZIONI
  return (
    <View style={[stili.riquadro, { backgroundColor: c.superficie, borderColor: c.bordo }]}>
      <Testo variante="sottotitolo">{i.titolo}</Testo>
      <Testo>
        <Forte>{i.tipo}</Forte> {i.escluso}
      </Testo>
      <Testo variante="attenuato">{i.ecg}</Testo>
      <Testo>
        <Forte>{i.chiTitolo}</Forte>
      </Testo>
      {i.chi.map((voce) => (
        <View key={voce} style={stili.voce}>
          <View style={[stili.punto, { backgroundColor: c.accento }]} />
          <View style={{ flex: 1 }}>
            <Testo variante="attenuato">{voce}</Testo>
          </View>
        </View>
      ))}
      <Testo variante="attenuato">{i.bambini}</Testo>
      {i.note.map((nota) => (
        <Testo key={nota} variante="piccolo">
          {nota}
        </Testo>
      ))}
    </View>
  )
}

export function CaricaCertificatoDaLink({ token, iniziale }: { token: string; iniziale: PaginaCertificato }) {
  const c = useColori()
  const [stato, setStato] = useState(iniziale.stato)
  const invia = useCallback(
    async (f: FileScelto) => {
      const esito = await caricaDaLink(token, f)
      if (esito.ok) setStato('in_verifica')
      return esito
    },
    [token],
  )
  const car = useCarica(invia)

  return (
    <Pagina titolo="Certificato medico" sottotitolo={iniziale.persona ? `Per ${iniziale.persona}` : undefined}>
      {stato === 'valido' ? (
        <Avviso tono="ok">
          {`Il certificato risulta valido${iniziale.scadenza ? ` fino al ${dataBreve(iniziale.scadenza)}` : ''}. Non serve altro: grazie!`}
        </Avviso>
      ) : stato === 'in_verifica' ? (
        <>
          <Avviso tono="ok">
            {car.fatto
              ? 'Certificato ricevuto: grazie! Lo stiamo controllando.'
              : 'Abbiamo già ricevuto un certificato: lo stiamo controllando.'}
          </Avviso>
          <Testo variante="attenuato">
            Appena la segreteria l’avrà verificato risulterà valido. Se qualcosa non va, ti scriviamo il motivo per email.
          </Testo>
        </>
      ) : (
        <>
          {iniziale.rifiuto ? (
            <Avviso tono="errore">
              {`L’ultimo certificato che ci hai mandato non è stato accettato${iniziale.rifiuto.motivo ? `: ${iniziale.rifiuto.motivo}` : '.'}`}
            </Avviso>
          ) : null}

          <Istruzioni />

          {car.file ? (
            <View style={[stili.file, { backgroundColor: c.superficie, borderColor: c.bordo }]}>
              <View style={{ flex: 1 }}>
                <Text style={[stili.nomeFile, { color: c.testo }]} numberOfLines={1}>
                  {car.file.nome}
                </Text>
                <Testo variante="piccolo">{pesoLeggibile(car.file.byte)}</Testo>
              </View>
              <View style={{ width: 110 }}>
                <Bottone testo="Cambia" variante="contorno" onPress={car.scegli} />
              </View>
            </View>
          ) : (
            <Bottone testo={car.inLettura ? 'Preparo il file…' : 'Scegli la foto o il PDF'} variante="contorno" inCorso={car.inLettura} onPress={car.scegli} />
          )}
          <Testo variante="piccolo">
            {FORMATI_CERTIFICATO}, fino a {MAX_BYTE / 1024 / 1024} MB. Se scatti una foto, controlla che si legga tutta la pagina. Il file lo vede solo la
            segreteria.
          </Testo>

          {car.errore ? <Avviso tono="errore">{car.errore}</Avviso> : null}

          <Bottone testo="Invia il certificato" inCorso={car.inCorso} disabilitato={!car.file || car.inLettura} onPress={car.spedisci} />
        </>
      )}
    </Pagina>
  )
}

const stili = StyleSheet.create({
  riquadro: { borderWidth: 1, borderRadius: 12, padding: spazio.tre, gap: spazio.due },
  voce: { flexDirection: 'row', gap: spazio.due, paddingLeft: spazio.uno },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  file: { flexDirection: 'row', alignItems: 'center', gap: spazio.tre, borderWidth: 1, borderRadius: 12, padding: spazio.tre },
  nomeFile: { fontSize: 15, fontWeight: '700' },
})
