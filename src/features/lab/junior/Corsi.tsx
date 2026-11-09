import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  corsiJunior,
  disdiciCorso,
  type BabyJunior,
  type CorsiPersona,
  type IscrizioneJunior,
  type LezioneIscritto,
  type PersonaJunior,
} from "@/api/junior";
import {
  leggiLezioniPeriodo,
  type Lezione,
  type SchedaLezione,
} from "@/api/lab";
import type { LezioneConsiglio } from "@/api/percorso";
import { t, tv } from "@/lib/lingua";
import { spazio } from "@/theme";

import { AzioniLezione } from "../Calendario";
import { ConAltre, RigaLezione } from "../consigli/Lezioni";
import { inMemoria, prendi, ricorda, scorda } from "../memoria";
import { giornoOra } from "../percorso/TappaCarta";
import {
  Bollino,
  Carta,
  Etichetta,
  Messaggio,
  Pulsante,
  Riga,
  SchedeInArrivo,
  Sezione,
} from "../ui/kit";
import { Foglio } from "../ui/Foglio";
import { FoglioLezione } from "../ui/FoglioLezione";
import { Dettagli } from "./Dettagli";
import { DisdiciAbbonamento } from "./DisdiciCorso";
import { PagamentiContratto } from "./PagamentiContratto";
import { concludiInCorso, type InCorso } from "./inCorso";
import { F, usePalette } from "../ui/tema";
import { usePrenotazioneLezione } from "../usePrenotazioneLezione";
import {
  dataIt,
  disdettaVera,
  euroIt,
  fineDisdettaMensile,
  finestraLezioni,
  nLezioni,
  oggiRoma,
  rinnovoContratto,
  rinnovoJunior,
  statoContratto,
} from "./comune";

// I corsi di una persona del nucleo, sotto le anagrafiche della sezione Junior (22/10/2026, richiesta di Maurizio): cosa
// vede dipende dall'eta' e dall'abbonamento.
//
// **Iscritta a un gruppo** (la Scuola Nuoto Bambini e gli altri): il nome dell'abbonamento e tutti i suoi dati, i conteggi
// delle lezioni disdette, recuperate e ancora da recuperare, le prossime lezioni del suo turno con «Disdici», e sotto il
// calendario dei recuperi per prenotarne uno. **Le lezioni si vedono fino alla fine del contratto** (fino al mese pagato):
// il rinnovo di meta' mese, di solito fra il 20 e il 21, porta quelle del mese dopo. Lo decide PerfectGym, qui si dice.
//
// **In eta' per il Baby Nuoto** (da 3 a 36 mesi): se ha l'abbonamento mensile, i suoi dati; se no, le due strade (la lezione
// singola, che si compra prenotando, e il mensile). Sotto, il calendario delle lezioni del Baby Nuoto.
//
// I conteggi sono **stime** dal mirror, che non dice chi ha annullato una lezione: la schermata lo dice. Disdire e prenotare
// passano dalle stesse funzioni del Calendario, con le stesse regole di PerfectGym (disdetta entro un'ora prima, limiti,
// acquisto della lezione se non e' compresa). **In vista cliente dello staff si vede tutto fino alla firma e al pagamento** (06/11/2026,
// richiesta di Maurizio): i comandi si disegnano e i calendari si leggono, e a rifiutare la scrittura e' il server.

type EsitoCorsi = ({ ok: true } & CorsiPersona) | { ok: false; errore: string };

const chiaveCorsi = (id: number) => `junior:corsi:${id}`;

/** Una lezione dei corsi nella forma dei pulsanti del Calendario. */
function comeLezione(l: Lezione): LezioneConsiglio {
  return {
    class_id: l.class_id,
    inizio: l.inizio,
    fine: l.fine,
    nome: l.nome,
    istruttore: l.istruttore,
    posti: l.posti,
    liberi: l.liberi,
    in_attesa: l.in_attesa ?? 0,
    iniziata: l.iniziata,
    prenotabile_dal: l.prenotabile_dal,
    prenotazione: l.prenotazione,
    limite: (l.limite ?? null) as LezioneConsiglio["limite"],
    dopo: null,
    categoria: l.categoria,
    scheda: l.scheda,
    compresa: null,
  };
}

const senzaPunto = (piano: string | null) =>
  (piano ?? t("Abbonamento", "Membership")).replace(/^!\s*/, "").trim();

/**
 * Quale pezzo dei corsi mostrare (02/11/2026): la pagina Junior ha un menu e mostra una cosa per volta. `null` non disegna niente
 * ma lascia montato il componente (la lettura dei dati non riparte a ogni cambio di voce); senza `parte` si vede tutto, come prima.
 */
export type ParteCorsi = "abbonamento" | "lezioni" | "recuperi" | "baby";

export function CorsiPersona({
  persona,
  vista,
  parte,
  inCorso,
  onInCorsoFinito,
  onDati,
}: {
  persona: PersonaJunior;
  vista: boolean;
  parte?: ParteCorsi | null;
  /** Un'iscrizione appena firmata che il mirror non ha ancora (`inCorso.ts`). */
  inCorso?: InCorso;
  onInCorsoFinito?: () => void;
  /** Quello che la pagina Junior deve sapere per il suo menu (i recuperi ci sono solo per la Scuola Nuoto). */
  onDati?: (d: { recuperabile: boolean; babyAbbonato: boolean }) => void;
}) {
  const chiave = chiaveCorsi(persona.member_id);
  const [esito, setEsito] = useState<EsitoCorsi | undefined>(() =>
    inMemoria<EsitoCorsi>(chiave),
  );
  const carica = useCallback(async () => {
    setEsito(await prendi(chiave, () => corsiJunior(persona.member_id)));
  }, [chiave, persona.member_id]);
  useEffect(() => {
    setEsito(inMemoria<EsitoCorsi>(chiave));
  }, [chiave]);
  // Si rilegge a ogni ritorno sulla schermata (dopo la firma o il pagamento) e, finche' l'iscrizione appena firmata non e' nel
  // mirror, ogni pochi secondi: il pagamento fatto o da fare non resta quello di prima.
  useFocusEffect(
    useCallback(() => {
      scorda(chiave);
      carica();
    }, [chiave, carica]),
  );
  const attesa = !!inCorso;
  useEffect(() => {
    if (!attesa) return;
    const id = setInterval(() => {
      scorda(chiave);
      carica();
    }, 6000);
    return () => clearInterval(id);
  }, [attesa, chiave, carica]);
  const arrivata =
    !!inCorso && !!esito?.ok && esito.iscrizioni.some((i) => Number(i.gruppo_id) === inCorso.group_id);
  useEffect(() => {
    if (inCorso && arrivata) {
      concludiInCorso(inCorso.member_id, inCorso.group_id);
      onInCorsoFinito?.();
    }
  }, [arrivata, inCorso, onInCorsoFinito]);

  useEffect(() => {
    if (esito?.ok) onDati?.({ recuperabile: esito.iscrizioni.some((i) => i.recuperabile), babyAbbonato: !!esito.baby?.abbonamento });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esito]);

  /** Dopo una prenotazione o una disdetta i conteggi sono cambiati: si rileggono. */
  const cambiato = useCallback(async () => {
    scorda(chiave);
    await carica();
  }, [chiave, carica]);

  // L'iscrizione appena firmata, finche' il mirror non la dice: si vede subito, con il pagamento da fare o fatto.
  const provvisoria =
    inCorso && !arrivata && (parte === undefined || parte === "abbonamento") ? (
      <IscrizioneInCorso nome={persona.nome ?? ""} x={inCorso} />
    ) : null;
  if (parte === null) return null;
  if (!esito) return provvisoria ?? <SchedeInArrivo quante={1} />;
  if (!esito.ok)
    return (
      <View style={{ gap: spazio.due }}>
        <Messaggio>{esito.errore}</Messaggio>
        <Pulsante
          testo={t("Riprova", "Try again")}
          icona="aggiorna"
          variante="secondario"
          onPress={carica}
        />
      </View>
    );

  const nome = persona.nome ?? "";
  return (
    <>
      {provvisoria}
      {esito.baby && esito.iscrizioni.length === 0 && (parte === undefined || parte === "baby") ? (
        <SezioneBaby
          nome={nome}
          memberId={persona.member_id}
          baby={esito.baby}
          onCambiato={cambiato}
        />
      ) : null}
      {(parte === "baby" ? [] : esito.iscrizioni).map((i) => (
        <SezioneIscrizione
          key={i.iscrizione_id}
          parte={parte}
          nome={nome}
          memberId={persona.member_id}
          iscrizione={i}
          vista={vista}
          onCambiato={cambiato}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// L'iscrizione appena firmata (23/10/2026)

function IscrizioneInCorso({ nome, x }: { nome: string; x: InCorso }) {
  const p = usePalette();
  return (
    <Sezione
      titolo={
        nome
          ? t(`L’abbonamento di ${nome}`, `${nome}’s membership`)
          : t("L’abbonamento", "The membership")
      }
    >
      <Carta>
        <Riga
          prima
          testa={<Bollino icona="goccia" tono="blu" size={40} />}
          titolo={t("Iscrizione in corso", "Enrollment in progress")}
          sotto={x.gruppo}
          coda={
            <Etichetta
              testo={x.pagata ? t("Pagato", "Paid") : t("Da pagare", "To pay")}
              tono={x.pagata ? "ok" : "attenzione"}
            />
          }
        />
      </Carta>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {x.pagata
          ? t(
              `Pagamento ricevuto. Stiamo attivando l’iscrizione (contratto n. ${x.numero}): questa pagina si aggiorna da sola.`,
              `Payment received. We’re activating the enrollment (contract no. ${x.numero}): this page updates by itself.`,
            )
          : t(
              `Il contratto n. ${x.numero} è firmato. Per attivare l’iscrizione completa il pagamento: questa pagina si aggiorna da sola.`,
              `Contract no. ${x.numero} is signed. To activate the enrollment, complete the payment: this page updates by itself.`,
            )}
      </Text>
      {!x.pagata ? (
        <Pulsante
          testo={t("Completa il pagamento", "Complete the payment")}
          icona="carta"
          onPress={() => router.navigate("/abbonamento" as const)}
        />
      ) : null}
    </Sezione>
  );
}

// ---------------------------------------------------------------------------
// L'iscrizione a un gruppo

function SezioneIscrizione({
  parte,
  nome,
  memberId,
  iscrizione: i,
  vista,
  onCambiato,
}: {
  parte?: ParteCorsi;
  nome: string;
  memberId: number;
  iscrizione: IscrizioneJunior;
  vista: boolean;
  onCambiato: () => Promise<void>;
}) {
  const p = usePalette();
  const c = i.contratto;
  // Una quota scaduta e non pagata: il server non fa disdire nessuna lezione (e lo ricontrolla), qui non si offre il comando.
  const inDebito = (i.sospese ?? 0) > 0 || !!i.sospese_dal;
  const azioni = usePrenotazioneLezione(memberId, {
    prenotata: () => undefined,
    disdetta: () => {
      onCambiato();
    },
  });
  const mostra = (x: ParteCorsi) => !parte || parte === x;
  // Lezioni e recuperi in una voce sola, «Recuperi» (04/11/2026, richiesta di Maurizio): in alto le prossime lezioni con la procedura
  // (disdici la prenotazione e ti viene assegnato il recupero), sotto il saldo dei recuperi, sotto ancora la prenotazione del recupero.
  // `lezioni` resta per chi non ha recuperi (la voce si chiama allora «Lezioni»).
  const mostraLezioni = !parte || parte === "lezioni" || parte === "recuperi";
  return (
    <>
      {mostra("abbonamento") ? (
      <Sezione
        titolo={
          nome
            ? t(`L’abbonamento di ${nome}`, `${nome}’s membership`)
            : t("L’abbonamento", "The membership")
        }
      >
        <Carta>
          <Riga
            prima
            testa={<Bollino icona="goccia" tono="blu" size={40} />}
            titolo={senzaPunto(c.piano)}
            sotto={i.gruppo}
            coda={<Etichetta testo={statoContratto(c.stato)} tono="ok" />}
          />
          {c.stagionale && c.pagato_stagione != null && c.pagato_stagione > 0 ? (
            // Lo stagionale (09/11/2026): quello che la famiglia ha gia' pagato per la stagione, non una quota al mese.
            <Dato
              etichetta={t("Quota", "Fee")}
              valore={
                c.importo_stagione != null && c.pagato_stagione < c.importo_stagione
                  ? t(
                      `${euroIt(c.pagato_stagione)} pagati su ${euroIt(c.importo_stagione)} della stagione`,
                      `${euroIt(c.pagato_stagione)} paid of ${euroIt(c.importo_stagione)} for the season`,
                    )
                  : t(
                      `${euroIt(c.pagato_stagione)} per tutta la stagione, già pagata`,
                      `${euroIt(c.pagato_stagione)} for the whole season, already paid`,
                    )
              }
            />
          ) : c.canone != null && c.canone > 0 ? (
            <Dato
              etichetta={t("Quota", "Fee")}
              valore={t(
                `${euroIt(c.canone)} al mese`,
                `${euroIt(c.canone)} a month`,
              )}
            />
          ) : null}
          <Dato
            etichetta={t("Dal", "From")}
            valore={dataIt(c.inizio ?? i.dal)}
          />
          <Dato
            etichetta={t("Rinnovo", "Renewal")}
            valore={rinnovoJunior(c)}
          />
        </Carta>
        <PagamentiContratto contrattoId={c.id} />
        {/* Solo i mensili si disdicono (09/11/2026): lo stagionale e' gia' pagato per tutta la stagione. */}
        {!vista && c.disdicibile !== false ? (
          <DisdiciAbbonamento
            disdetto={disdettaVera(c)}
            richiesta={c.disdetta_richiesta ?? null}
            nome={nome}
            memberId={memberId}
            contractId={c.id}
            gruppo={i.gruppo}
            onCambiato={onCambiato}
          />
        ) : null}
      </Sezione>
      ) : null}

      {mostraLezioni ? (
      <Sezione
        titolo={t(
          "Le tue prossime lezioni",
          "Your upcoming classes",
        )}
        conteggio={i.prossime.length}
      >
        {i.recuperabile && !vista && !inDebito ? (
          <Messaggio tono="attenzione" icona="rinnovo" titolo={t("Come si recupera una lezione", "How to make up a class")}>
            {t(
              "Se non potete venire, disdici la prenotazione della lezione qui sotto, fino a un’ora prima dell’inizio. Nel momento in cui la disdici ti viene assegnato il recupero: lo vedi nel saldo e lo prenoti più in basso, in un’altra lezione della stessa fascia.",
              "If you can’t come, cancel the class booking below, up to one hour before it starts. As soon as you cancel, you’re given a make-up: you see it in the balance and book it further down, in another class of the same band.",
            )}
          </Messaggio>
        ) : null}
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {finestraLezioni(c)}
        </Text>
        {inDebito ? (
          <Messaggio
            tono="attenzione"
            titolo={t("Lezioni in attesa del pagamento", "Classes waiting for payment")}
          >
            {t(
              `Finché c’è una quota scaduta non si può disdire nessuna lezione: salda la quota e poi disdici. Le lezioni di un mese si vedono quando la sua quota è pagata. ${(i.sospese ?? 0) > 0 ? `${nLezioni(i.sospese ?? 0)} compariranno appena paghi` : "Paga"}${i.sospese_dal ? ` la quota di ${new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: "UTC" }).format(new Date(i.sospese_dal))}` : " la quota"}: la trovi qui sopra, fra i pagamenti da fare.`,
              `While a fee is overdue no class can be cancelled: pay the fee, then cancel. A month’s classes show up once its fee is paid. ${(i.sospese ?? 0) > 0 ? `${nLezioni(i.sospese ?? 0)} will appear as soon as you pay` : "Pay"}${i.sospese_dal ? ` the ${new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(i.sospese_dal))} fee` : " the fee"}: you’ll find it above, among the payments due.`,
            )}
          </Messaggio>
        ) : null}
        {i.prossime.length ? (
          <View style={{ gap: spazio.due }}>
            <ConAltre
              visibili={6}
              nome={tv<[string, string]>(
                ["lezione", "lezioni"],
                ["class", "classes"],
              )}
              voci={i.prossime.map((l) => (
                <RigaPrenotata
                  key={l.class_id}
                  l={l}
                  azioni={azioni}
                  puoDisdire={i.recuperabile && !vista && !inDebito}
                />
              ))}
            />
          </View>
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t(
              "Non ci sono altre lezioni in programma fino alla fine del contratto.",
              "There are no more classes scheduled until the end of the contract.",
            )}
          </Text>
        )}
      </Sezione>
      ) : null}

      {i.recuperabile && mostra("recuperi") ? (
        <Sezione
          titolo={t(
            "Il saldo dei recuperi",
            "Make-up balance",
          )}
        >
          <View style={stili.conteggi}>
            <Conteggio
              n={i.conteggi.disdette}
              testo={t("Disdette", "Cancelled")}
            />
            <Conteggio
              n={i.conteggi.recuperate}
              testo={t("Recuperate", "Made up")}
            />
            <Conteggio
              n={i.conteggi.da_recuperare}
              testo={t("Da recuperare", "To make up")}
              evidenza={i.conteggi.da_recuperare > 0}
            />
          </View>
          {i.conteggi.da_recuperare > 0 && i.conteggi.scade_il ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                `Hai ${nLezioni(i.conteggi.da_recuperare)} da recuperare: il recupero si usa entro il ${dataIt(i.conteggi.scade_il)}.`,
                `You have ${nLezioni(i.conteggi.da_recuperare)} to make up: the make-up must be used by ${dataIt(i.conteggi.scade_il)}.`,
              )}
            </Text>
          ) : null}
          {(i.conteggi.scadute ?? 0) > 0 ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {(i.conteggi.scadute ?? 0) === 1
                ? t(
                    `${nLezioni(1)} di recupero non è stata usata in tempo ed è scaduta.`,
                    `${nLezioni(1)} of make-up wasn’t used in time and has expired.`,
                  )
                : t(
                    `${nLezioni(i.conteggi.scadute ?? 0)} di recupero non sono state usate in tempo e sono scadute.`,
                    `${nLezioni(i.conteggi.scadute ?? 0)} of make-up weren’t used in time and have expired.`,
                  )}
            </Text>
          ) : null}
          <Dettagli titolo={t("Come funzionano i recuperi", "How make-ups work")}>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                "I recuperi si usano entro e non oltre la fine del corso e sono legati all’abbonamento da cui sono stati generati: l’abbonamento deve restare attivo per mantenerne la validità. In caso di disdetta, i recuperi si perdono.",
                "Make-ups must be used by the end of the course at the latest and are tied to the membership that generated them: the membership must stay active for them to remain valid. If you cancel, make-ups are lost.",
              )}
            </Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                "Un recupero ti viene assegnato quando disdici una lezione in tempo (fino a un’ora prima dell’inizio): lo vedi anche fra i prodotti del tuo profilo.",
                "A make-up is assigned when you cancel a class in time (up to one hour before it starts): you can also see it among the products in your profile.",
              )}
            </Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                "L’insegnante del recupero può variare di lezione in lezione, e generalmente non è mai quello del tuo corso.",
                "The make-up instructor can change from class to class, and generally isn’t the one from your own course.",
              )}
            </Text>
          </Dettagli>
        </Sezione>
      ) : null}

      {i.recuperabile && mostra("recuperi") ? (
        <Sezione titolo={t("Prenota un recupero", "Book a make-up")}>
          <CalendarioLezioni
            categoria="recuperi"
            memberId={memberId}
            vuoto={t(
              "Nei prossimi giorni non ci sono lezioni di recupero per la sua annata.",
              "There are no make-up classes in the next few days for their birth year.",
            )}
            onCambiato={onCambiato}
          />
        </Sezione>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Il Baby Nuoto

function SezioneBaby({
  nome,
  memberId,
  baby,
  onCambiato,
}: {
  nome: string;
  memberId: number;
  baby: BabyJunior;
  onCambiato: () => Promise<void>;
}) {
  const p = usePalette();
  const a = baby.abbonamento;
  return (
    <>
      <Sezione
        titolo={
          nome
            ? t(`Baby Nuoto di ${nome}`, `${nome}’s Baby Nuoto`)
            : "Baby Nuoto"
        }
      >
        {a ? (
          <Carta>
            <Riga
              prima
              testa={<Bollino icona="goccia" tono="blu" size={40} />}
              titolo={senzaPunto(a.piano)}
              sotto={t("Abbonamento mensile", "Monthly membership")}
              coda={<Etichetta testo={statoContratto(a.stato)} tono="ok" />}
            />
            {a.canone != null && a.canone > 0 ? (
              <Dato
                etichetta={t("Quota", "Fee")}
                valore={t(
                  `${euroIt(a.canone)} al mese`,
                  `${euroIt(a.canone)} a month`,
                )}
              />
            ) : null}
            <Dato etichetta={t("Dal", "From")} valore={dataIt(a.inizio)} />
            <Dato
              etichetta={t("Rinnovo", "Renewal")}
              valore={rinnovoContratto(a)}
            />
          </Carta>
        ) : (
          <View style={{ gap: spazio.due }}>
            {baby.singola ? (
              <Carta>
                <Riga
                  prima
                  testa={<Bollino icona="goccia" tono="blu" size={40} />}
                  titolo={t("Lezione singola", "Single class")}
                  sotto={t(
                    "Prenoti e paghi una lezione alla volta. Nessuna quota di attivazione.",
                    "You book and pay one class at a time. No activation fee.",
                  )}
                  coda={
                    <Etichetta
                      testo={euroIt(baby.singola.prezzo)}
                      tono="accento"
                    />
                  }
                />
              </Carta>
            ) : null}
            {baby.mensile ? (
              <Carta>
                <Riga
                  prima
                  testa={
                    <Bollino icona="calendario" tono="accento" size={40} />
                  }
                  titolo={t("Abbonamento mensile", "Monthly membership")}
                  sotto={t(
                    `Prenoti in tutti i turni disponibili, senza limiti. Quota di attivazione una tantum ${euroIt(baby.mensile.quota_attivazione)}.`,
                    `You can book every available class, with no limits. One-off activation fee of ${euroIt(baby.mensile.quota_attivazione)}.`,
                  )}
                  coda={
                    <Etichetta
                      testo={t(
                        `${euroIt(baby.mensile.canone)} al mese`,
                        `${euroIt(baby.mensile.canone)} a month`,
                      )}
                      tono="accento"
                    />
                  }
                />
                <View style={{ padding: spazio.quattro, paddingTop: 0 }}>
                  <Pulsante
                    testo={t(
                      "Attiva l’abbonamento mensile",
                      "Start the monthly membership",
                    )}
                    onPress={() =>
                      router.navigate(
                        `/iscrizione?membro=${memberId}&baby=1` as const,
                      )
                    }
                  />
                </View>
              </Carta>
            ) : null}
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                "Il Baby Nuoto si prenota lezione per lezione, come le attività degli adulti: con l’abbonamento mensile oppure con la lezione singola, che acquisti dal calendario qui sotto quando prenoti.",
                "Baby Nuoto is booked class by class, like the adults’ activities: with the monthly membership or with a single class, which you buy from the calendar below when you book.",
              )}
            </Text>
          </View>
        )}
      </Sezione>
      <Sezione
        titolo={t(
          "Prenota una lezione di Baby Nuoto",
          "Book a Baby Nuoto class",
        )}
      >
        <CalendarioLezioni
          categoria="baby"
          memberId={memberId}
          vuoto={t(
            "Nei prossimi giorni non ci sono lezioni di Baby Nuoto per la sua età.",
            "There are no Baby Nuoto classes in the next few days for their age.",
          )}
          onCambiato={onCambiato}
        />
      </Sezione>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pezzi comuni

function Dato({ etichetta, valore }: { etichetta: string; valore: string }) {
  const p = usePalette();
  if (!valore) return null;
  return (
    <View style={[stili.dato, { borderTopColor: p.linea }]}>
      <Text style={[stili.datoEtichetta, { color: p.testoSecondario }]}>
        {etichetta}
      </Text>
      <Text style={[stili.datoValore, { color: p.testo }]}>{valore}</Text>
    </View>
  );
}

function Conteggio({
  n,
  testo,
  evidenza = false,
}: {
  n: number;
  testo: string;
  evidenza?: boolean;
}) {
  const p = usePalette();
  return (
    <View
      accessible
      accessibilityLabel={`${testo}: ${nLezioni(n)}`}
      style={[
        stili.conteggio,
        {
          backgroundColor: evidenza ? p.accento : p.carta,
          borderColor: evidenza ? p.accento : p.linea,
        },
      ]}
    >
      <Text style={[stili.conteggioN, { color: evidenza ? "#fff" : p.testo }]}>
        {n}
      </Text>
      <Text
        style={[
          stili.conteggioTesto,
          { color: evidenza ? "#fff" : p.testoSecondario },
        ]}
      >
        {testo}
      </Text>
    </View>
  );
}

type Azioni = ReturnType<typeof usePrenotazioneLezione>;

/** Una lezione del corso in programma, con «Disdici» (conferma compresa) dove si puo'. */
function RigaPrenotata({
  l,
  azioni,
  puoDisdire,
}: {
  l: LezioneIscritto;
  azioni: Azioni;
  puoDisdire: boolean;
}) {
  const p = usePalette();
  const lezione: Lezione = {
    class_id: l.class_id,
    inizio: l.inizio,
    fine: l.fine,
    nome: l.nome,
    categoria: "Scuola Nuoto Bambini",
    istruttore: null,
    posti: 0,
    iscritti: 0,
    liberi: 0,
    iniziata: false,
    prenotabile_dal: null,
    prenotazione: { booking_id: l.booking_id, attesa: false },
    scheda: null,
  };
  return (
    <View style={[stili.riga, { backgroundColor: p.incavo }]}>
      <View style={stili.rigaTesta}>
        <Text style={[stili.quando, { color: p.testo }]}>
          {giornoOra(l.inizio)}
        </Text>
        <Etichetta testo={t("Prenotata", "Booked")} tono="ok" icona="spunta" />
      </View>
      {puoDisdire ? (
        <AzioniLezione
          l={lezione}
          scheda={null}
          onScheda={() => undefined}
          occupato={azioni.occupato}
          onPrenota={async () => null}
          onAcquista={(url) => azioni.acquista(l.class_id, url)}
          onPagaCarta={azioni.pagaCarta}
          onDisdici={() => azioni.disdici(l.class_id, false)}
        />
      ) : null}
    </View>
  );
}

/** Le lezioni di una categoria nei prossimi giorni (recuperi, Baby Nuoto), con i pulsanti del Calendario. */
function CalendarioLezioni({
  categoria,
  memberId,
  vuoto,
  onCambiato,
}: {
  categoria: "recuperi" | "baby";
  memberId: number;
  vuoto: string;
  onCambiato: () => Promise<void>;
}) {
  const p = usePalette();
  const chiave = `junior:periodo:${categoria}:${memberId}`;
  type Letto = Awaited<ReturnType<typeof leggiLezioniPeriodo>>;
  const [letto, setLetto] = useState<Letto | undefined>(() =>
    inMemoria<Letto>(chiave),
  );
  const [aperta, setAperta] = useState<{
    nome: string;
    categoria: string;
    scheda: SchedaLezione;
  } | null>(null);
  const leggi = useCallback(async () => {
    setLetto(
      await prendi(chiave, () => leggiLezioniPeriodo(categoria, memberId)),
    );
  }, [chiave, categoria, memberId]);
  useEffect(() => {
    leggi();
  }, [leggi]);

  /** Dopo un clic la riga dice com'e' andata (PerfectGym ha risposto) e i posti si rileggono dal calendario. */
  function aggiorna(
    classId: number,
    prenotazione: Lezione["prenotazione"],
    delta: number,
  ) {
    if (!letto?.ok) return;
    const nuovo: Letto = {
      ...letto,
      lezioni: letto.lezioni.map((l) =>
        l.class_id === classId
          ? {
              ...l,
              prenotazione,
              iscritti: Math.max(0, l.iscritti + delta),
              liberi: Math.max(0, l.liberi - delta),
            }
          : l,
      ),
    };
    ricorda(chiave, nuovo);
    setLetto(nuovo);
  }
  const azioni = usePrenotazioneLezione(memberId, {
    prenotata: (id, b) => {
      aggiorna(id, b, b.attesa ? 0 : 1);
      onCambiato();
      scorda(chiave);
    },
    disdetta: (id, inAttesa) => {
      aggiorna(id, null, inAttesa ? 0 : -1);
      onCambiato();
      scorda(chiave);
    },
  });

  if (!letto) return <SchedeInArrivo quante={2} />;
  if (!letto.ok)
    return (
      <View style={{ gap: spazio.due }}>
        <Messaggio>{letto.errore}</Messaggio>
        <Pulsante
          testo={t("Riprova", "Try again")}
          icona="aggiorna"
          variante="secondario"
          onPress={leggi}
        />
      </View>
    );
  if (!letto.lezioni.length)
    return (
      <Text style={[stili.nota, { color: p.testoSecondario }]}>{vuoto}</Text>
    );
  return (
    <View style={{ gap: spazio.due }}>
      <ConAltre
        visibili={4}
        nome={tv<[string, string]>(
          ["lezione", "lezioni"],
          ["class", "classes"],
        )}
        voci={letto.lezioni.map((l) => (
          <RigaLezione
            key={l.class_id}
            l={comeLezione(l)}
            schede={letto.schede}
            azioni={azioni}
            onScheda={setAperta}
          />
        ))}
      />
      <Text style={[stili.nota, { color: p.testoTerzo }]}>
        {t(
          "I posti cambiano in fretta: l’ultima parola è del Calendario.",
          "Spots go fast: the Calendar has the final say.",
        )}
      </Text>
      {aperta ? (
        <FoglioLezione
          scheda={aperta.scheda}
          titolo={aperta.nome}
          categoria={aperta.categoria}
          onChiudi={() => setAperta(null)}
        />
      ) : null}
    </View>
  );
}

const stili = StyleSheet.create({
  nota: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: F.medio,
    paddingHorizontal: 2,
  },
  dato: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spazio.tre,
    paddingHorizontal: spazio.quattro,
    paddingVertical: spazio.tre,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  datoEtichetta: { fontSize: 14, fontFamily: F.medio },
  datoValore: { fontSize: 14, fontFamily: F.semi, flex: 1, textAlign: "right" },
  conteggi: { flexDirection: "row", gap: spazio.due },
  conteggio: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spazio.tre,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  conteggioN: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: F.extra,
    fontVariant: ["tabular-nums"],
  },
  conteggioTesto: {
    fontSize: 12.5,
    lineHeight: 16,
    fontFamily: F.semi,
    textAlign: "center",
  },
  riga: { borderRadius: 16, padding: spazio.tre, gap: spazio.due },
  rigaTesta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  quando: { fontFamily: F.bold, fontSize: 14.5, flexShrink: 1 },
});
