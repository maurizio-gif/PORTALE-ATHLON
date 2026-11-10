import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { disdiciCorso } from "@/api/junior";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Foglio } from "../ui/Foglio";
import { Carta, Messaggio, Pulsante } from "../ui/kit";
import { scorda } from "../memoria";
import { F, usePalette } from "../ui/tema";
import { dataIt, fineDisdettaMensile, oggiRoma } from "./comune";
import { Consenso } from "./Consenso";

// «Disdici l'abbonamento» di un bambino iscritto a un gruppo (22/10/2026), **rifatto come quello degli adulti** (`abbonamento/Gestisci.tsx`, «Gestisci abbonamento»; 02/11/2026,
// richiesta di Maurizio): non piu' un solo foglio ma **tre passi**, con l'indicatore «Passo n di 3» e la conferma con le spunte.
//   1. **Cosa succede se disdici**: la disdetta spegne il rinnovo automatico; l'abbonamento finisce alla data di fine, le lezioni continuano e **le quote mensili fino a quel mese
//      restano dovute** (sono abbonamenti mensili); la regola dei 10 giorni (Termini 7.10, `fineDisdettaMensile`).
//   2. **Recuperi e nuova iscrizione**: con la disdetta i recuperi non usati si perdono, ma **si possono usare fino alla data di fine**; una nuova iscrizione vuole **una nuova
//      quota di attivazione** ed e' **soggetta alla disponibilita' residua dei corsi**; il posto nel turno si libera.
//   3. **Conferma**: il riepilogo (abbonamento, finisce il, rinnovo automatico disattivato), le due spunte e il pulsante rosso. Solo qui parte la richiesta (`disdici_corso`).
// **Dal 09/11/2026 la disdetta e' una richiesta alla segreteria** (scelta di Maurizio): PerfectGym non accetta la disdetta dall'app, quindi la funzione scrive la
// richiesta con la fine del giorno in cui si chiede, e la segreteria la registra; la famiglia riceve la ricevuta subito e la conferma quando e' fatta. Finche'
// la richiesta e' aperta (o fatta ma non ancora nel mirror) i corsi portano `disdetta_richiesta` e qui si mostra quella, non il comando.
// Non c'e' il passo del «perche'» degli adulti: la funzione dei bambini non lo registra.

function Passo({ n, di }: { n: number; di: number }) {
  const p = usePalette();
  return <Text style={[stili.passo, { color: p.accento }]}>{t(`Passo ${n} di ${di}`, `Step ${n} of ${di}`).toUpperCase()}</Text>;
}

function Titolo({ children }: { children: string }) {
  const p = usePalette();
  return <Text style={[stili.titolo, { color: p.testo }]}>{children}</Text>;
}

function Nota({ children }: { children: string }) {
  const p = usePalette();
  return <Text style={[stili.nota, { color: p.testoSecondario }]}>{children}</Text>;
}

function Riga({ nome, valore }: { nome: string; valore: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", gap: spazio.due, justifyContent: "space-between" }}>
      <Text style={[stili.nota, { color: p.testoSecondario, flex: 1 }]}>{nome}</Text>
      <Text style={{ color: p.testo, fontFamily: F.bold, fontSize: 14, flexShrink: 1, textAlign: "right" }}>{valore}</Text>
    </View>
  );
}

export function DisdiciAbbonamento({
  disdetto,
  richiesta,
  nome,
  memberId,
  contractId,
  gruppo,
  onCambiato,
}: {
  /** Gia' disdetto: il comando non c'e', resta solo la conferma appena data. */
  disdetto: boolean;
  /** La richiesta di disdetta gia' fatta (dai corsi): al posto del comando si dice che c'e'. */
  richiesta?: { fine: string; stato: "in_attesa" | "fatta" } | null;
  nome: string;
  memberId: number;
  contractId: number;
  gruppo: string;
  onCambiato: () => Promise<void>;
}) {
  const p = usePalette();
  const [aperto, setAperto] = useState(false);
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inviata, setInviata] = useState<{ fine: string; inAttesa: boolean } | null>(null);
  const [capitoQuote, setCapitoQuote] = useState(false);
  const [capitoRecuperi, setCapitoRecuperi] = useState(false);
  const fine = fineDisdettaMensile(oggiRoma());
  const chi = nome || t("tuo figlio", "your child");
  if (disdetto && !inviata) return null;
  // La richiesta appena inviata da qui vince su quella letta coi corsi (che arriva al giro dopo).
  const esito = inviata ?? (richiesta ? { fine: richiesta.fine, inAttesa: richiesta.stato === "in_attesa" } : null);

  function apri() {
    setErrore(null);
    setPasso(1);
    setCapitoQuote(false);
    setCapitoRecuperi(false);
    setAperto(true);
  }

  async function conferma() {
    setInvio(true);
    setErrore(null);
    const r = await disdiciCorso({ memberId, contractId });
    setInvio(false);
    if (!r.ok) {
      setErrore(r.errore);
      if (r.giaDisdetto) {
        scorda("abbonamenti:contratti");
        await onCambiato();
      }
      return;
    }
    // Con la funzione di prima la disdetta era scritta subito su PerfectGym: niente richiesta, ed e' gia' fatta.
    setInviata({ fine: r.fine, inAttesa: r.richiesta && r.stato !== "fatta" });
    setAperto(false);
    scorda("abbonamenti:contratti");
    await onCambiato();
  }

  return (
    <>
      {esito ? (
        esito.inAttesa ? (
          <Messaggio tono="ok" titolo={t("Richiesta di disdetta inviata", "Cancellation request sent")}>
            {t(
              `La segreteria registra la disdetta e ti conferma per email. L’abbonamento di ${chi} finisce il ${dataIt(esito.fine)} e non si rinnova: fino ad allora le lezioni continuano e i recuperi si possono usare.`,
              `The front desk records the cancellation and confirms it by email. ${chi}’s membership ends on ${dataIt(esito.fine)} and won’t renew: until then classes continue and make-ups can be used.`,
            )}
          </Messaggio>
        ) : (
          <Messaggio tono="ok" titolo={t("Disdetta registrata", "Cancellation recorded")}>
            {t(
              `L’abbonamento di ${chi} finisce il ${dataIt(esito.fine)} e non si rinnova. I recuperi si possono usare fino a quel giorno.`,
              `${chi}’s membership ends on ${dataIt(esito.fine)} and won’t renew. Make-ups can be used until that day.`,
            )}
          </Messaggio>
        )
      ) : (
        <Pulsante testo={t("Disdici l’abbonamento", "Cancel the membership")} icona="chiudi" variante="fantasma" piccolo onPress={apri} />
      )}
      <Foglio aperto={aperto} titolo={t("Disdici l’abbonamento", "Cancel the membership")} sottotitolo={gruppo} onChiudi={() => (invio ? undefined : setAperto(false))}>
        <View style={{ gap: spazio.tre }}>
          {passo === 1 ? (
            <>
              <Passo n={1} di={3} />
              <Titolo>{t("Cosa succede se disdici", "What happens if you cancel")}</Titolo>
              <View style={{ gap: spazio.tre }}>
                <View style={stili.tappa}>
                  <Text style={[stili.tappaQuando, { color: p.accento }]}>{t("Oggi", "Today")}</Text>
                  <Text style={[stili.tappaTesto, { color: p.testo }]}>{t("Chiedi la disdetta: la segreteria la registra e ti conferma per email", "You request the cancellation: the front desk records it and confirms by email")}</Text>
                </View>
                <View style={stili.tappa}>
                  <Text style={[stili.tappaQuando, { color: p.testoSecondario }]}>{t("Fino alla scadenza", "Until the end date")}</Text>
                  <Text style={[stili.tappaTesto, { color: p.testo }]}>
                    {t(
                      `L’abbonamento di ${chi} resta attivo: le lezioni continuano e le quote mensili fino a quel mese restano dovute`,
                      `${chi}’s membership stays active: classes continue and the monthly fees up to that month remain due`,
                    )}
                  </Text>
                </View>
                <View style={stili.tappa}>
                  <Text style={[stili.tappaQuando, { color: p.testo }]}>{dataIt(fine)}</Text>
                  <Text style={[stili.tappaTesto, { color: p.testo }]}>{t("Fine dell’abbonamento, senza rinnovo", "End of the membership, no renewal")}</Text>
                </View>
              </View>
              <Nota>
                {t(
                  "La disdetta vale dalla fine del mese se la chiedi almeno 10 giorni prima del rinnovo del giorno 1, altrimenti dalla fine del mese dopo. Conta il giorno in cui la chiedi, non quello in cui la segreteria la registra.",
                  "A cancellation takes effect at the end of the month if you request it at least 10 days before the renewal on the 1st, otherwise at the end of the following month. What counts is the day you request it, not the day the front desk records it.",
                )}
              </Nota>
              <Pulsante testo={t("Continua", "Continue")} icona="avanti" onPress={() => setPasso(2)} />
              <Pulsante testo={t("Annulla", "Keep it")} variante="fantasma" piccolo onPress={() => setAperto(false)} />
            </>
          ) : null}

          {passo === 2 ? (
            <>
              <Passo n={2} di={3} />
              <Titolo>{t("Recuperi e nuova iscrizione", "Make-ups and new enrollment")}</Titolo>
              <Messaggio tono="attenzione" icona="rinnovo" titolo={t("I recuperi", "Make-ups")}>
                {t(
                  `Con la disdetta i recuperi non usati si perdono. Puoi comunque usarli fino al ${dataIt(fine)}, la data in cui finisce l’abbonamento.`,
                  `With the cancellation, unused make-ups are lost. You can still use them until ${dataIt(fine)}, when the membership ends.`,
                )}
              </Messaggio>
              <Messaggio tono="attenzione" icona="attenzione" titolo={t("Se ti iscrivi di nuovo", "If you enroll again")}>
                {t(
                  `Per una nuova iscrizione di ${chi} si paga una nuova quota di attivazione, e l’iscrizione è soggetta alla disponibilità residua dei corsi. Dopo il ${dataIt(fine)} il posto nel turno si libera.`,
                  `A new enrollment for ${chi} means paying a new activation fee, and it is subject to the courses’ remaining availability. After ${dataIt(fine)} the spot in the slot is released.`,
                )}
              </Messaggio>
              <Pulsante testo={t("Continua", "Continue")} icona="avanti" onPress={() => setPasso(3)} />
              <Pulsante testo={t("Indietro", "Back")} variante="fantasma" piccolo onPress={() => setPasso(1)} />
            </>
          ) : null}

          {passo === 3 ? (
            <>
              <Passo n={3} di={3} />
              <Titolo>{t("Conferma la richiesta", "Confirm the request")}</Titolo>
              <Carta piatta>
                <View style={{ gap: 8 }}>
                  <Riga nome={t("Abbonamento", "Membership")} valore={gruppo} />
                  <Riga nome={t("Finisce il", "Ends on")} valore={dataIt(fine)} />
                  <Riga nome={t("Rinnovo automatico", "Auto-renewal")} valore={t("Disattivato", "Off")} />
                </View>
              </Carta>
              <Consenso
                spuntato={capitoQuote}
                onCambia={() => setCapitoQuote((v) => !v)}
                testo={t(
                  `Ho capito che le quote mensili fino al ${dataIt(fine)} restano dovute.`,
                  `I understand that the monthly fees up to ${dataIt(fine)} remain due.`,
                )}
              />
              <Consenso
                spuntato={capitoRecuperi}
                onCambia={() => setCapitoRecuperi((v) => !v)}
                testo={t(
                  `Ho capito che i recuperi si possono usare fino al ${dataIt(fine)}, poi si perdono, e che per una nuova iscrizione servirà una nuova quota di attivazione, soggetta alla disponibilità residua dei corsi.`,
                  `I understand that make-ups can be used until ${dataIt(fine)} and are then lost, and that a new enrollment will need a new activation fee, subject to the courses’ remaining availability.`,
                )}
              />
              {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
              <Pulsante testo={t("Invia la richiesta di disdetta", "Send the cancellation request")} variante="pericolo" disabilitato={!capitoQuote || !capitoRecuperi} inCorso={invio} onPress={conferma} />
              <Pulsante testo={t("Indietro", "Back")} variante="fantasma" piccolo onPress={() => setPasso(2)} disabilitato={invio} />
            </>
          ) : null}
        </View>
      </Foglio>
    </>
  );
}

const stili = StyleSheet.create({
  passo: { fontFamily: F.extra, fontSize: 12, letterSpacing: 0.8 },
  titolo: { fontFamily: F.extra, fontSize: 20, letterSpacing: -0.4 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
  tappa: { gap: 2 },
  tappaQuando: { fontFamily: F.bold, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" },
  tappaTesto: { fontFamily: F.semi, fontSize: 15, lineHeight: 21 },
});
