import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  corsiJunior,
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
import { FoglioLezione } from "../ui/FoglioLezione";
import { F, usePalette } from "../ui/tema";
import { usePrenotazioneLezione } from "../usePrenotazioneLezione";
import {
  dataIt,
  euroIt,
  finestraLezioni,
  nLezioni,
  rinnovoContratto,
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
// acquisto della lezione se non e' compresa). **In vista cliente dello staff si legge e basta.**

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
  (piano ?? "Abbonamento").replace(/^!\s*/, "").trim();

export function CorsiPersona({
  persona,
  vista,
}: {
  persona: PersonaJunior;
  vista: boolean;
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
    carica();
  }, [chiave, carica]);

  /** Dopo una prenotazione o una disdetta i conteggi sono cambiati: si rileggono. */
  const cambiato = useCallback(async () => {
    scorda(chiave);
    await carica();
  }, [chiave, carica]);

  if (!esito) return <SchedeInArrivo quante={1} />;
  if (!esito.ok)
    return (
      <View style={{ gap: spazio.due }}>
        <Messaggio>{esito.errore}</Messaggio>
        <Pulsante
          testo="Riprova"
          icona="aggiorna"
          variante="secondario"
          onPress={carica}
        />
      </View>
    );

  const nome = persona.nome ?? "";
  return (
    <>
      {esito.baby ? (
        <SezioneBaby
          nome={nome}
          memberId={persona.member_id}
          baby={esito.baby}
          vista={vista}
          onCambiato={cambiato}
        />
      ) : null}
      {esito.iscrizioni.map((i) => (
        <SezioneIscrizione
          key={i.iscrizione_id}
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
// L'iscrizione a un gruppo

function SezioneIscrizione({
  nome,
  memberId,
  iscrizione: i,
  vista,
  onCambiato,
}: {
  nome: string;
  memberId: number;
  iscrizione: IscrizioneJunior;
  vista: boolean;
  onCambiato: () => Promise<void>;
}) {
  const p = usePalette();
  const c = i.contratto;
  const azioni = usePrenotazioneLezione(memberId, {
    prenotata: () => undefined,
    disdetta: () => {
      onCambiato();
    },
  });
  return (
    <>
      <Sezione titolo={nome ? `L’abbonamento di ${nome}` : "L’abbonamento"}>
        <Carta>
          <Riga
            prima
            testa={<Bollino icona="goccia" tono="blu" size={40} />}
            titolo={senzaPunto(c.piano)}
            sotto={i.gruppo}
            coda={<Etichetta testo={statoContratto(c.stato)} tono="ok" />}
          />
          {c.canone != null && c.canone > 0 ? (
            <Dato etichetta="Quota" valore={`${euroIt(c.canone)} al mese`} />
          ) : null}
          <Dato etichetta="Dal" valore={dataIt(c.inizio ?? i.dal)} />
          <Dato etichetta="Rinnovo" valore={rinnovoContratto(c)} />
          {c.fine && !c.disdetta ? (
            <Dato etichetta="Pagato fino al" valore={dataIt(c.fine)} />
          ) : null}
        </Carta>
      </Sezione>

      {i.recuperabile ? (
        <Sezione titolo="Le lezioni disdette e i recuperi">
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            I recuperi si usano entro e non oltre la fine del corso e sono
            legati all’abbonamento da cui sono stati generati: l’abbonamento
            deve restare attivo per mantenerne la validità. In caso di
            disdetta, i recuperi si perdono.
          </Text>
          <View style={stili.conteggi}>
            <Conteggio n={i.conteggi.disdette} testo="Disdette" />
            <Conteggio n={i.conteggi.recuperate} testo="Recuperate" />
            <Conteggio
              n={i.conteggi.da_recuperare}
              testo="Da recuperare"
              evidenza={i.conteggi.da_recuperare > 0}
            />
          </View>
          {i.conteggi.da_recuperare > 0 && i.conteggi.scade_il ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              Hai {nLezioni(i.conteggi.da_recuperare)} da recuperare: il
              recupero si usa entro il {dataIt(i.conteggi.scade_il)}.
            </Text>
          ) : null}
          {(i.conteggi.scadute ?? 0) > 0 ? (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {nLezioni(i.conteggi.scadute ?? 0)} di recupero non{" "}
              {(i.conteggi.scadute ?? 0) === 1
                ? "è stata usata"
                : "sono state usate"}{" "}
              in tempo e{" "}
              {(i.conteggi.scadute ?? 0) === 1 ? "è scaduta" : "sono scadute"}.
            </Text>
          ) : null}
          <Text style={[stili.nota, { color: p.testoTerzo }]}>
            Un recupero ti viene assegnato quando disdici una lezione in tempo
            (fino a un’ora prima dell’inizio): lo vedi anche fra i prodotti del
            tuo profilo.
          </Text>
        </Sezione>
      ) : null}

      <Sezione
        titolo="Le prossime lezioni del corso"
        conteggio={i.prossime.length}
      >
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {finestraLezioni(c)}
        </Text>
        {i.prossime.length ? (
          <View style={{ gap: spazio.due }}>
            <ConAltre
              visibili={6}
              nome={["lezione", "lezioni"]}
              voci={i.prossime.map((l) => (
                <RigaPrenotata
                  key={l.class_id}
                  l={l}
                  azioni={azioni}
                  puoDisdire={i.recuperabile && !vista}
                />
              ))}
            />
          </View>
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            Non ci sono altre lezioni in programma fino alla fine del contratto.
          </Text>
        )}
        {i.recuperabile && !vista ? (
          <Text style={[stili.nota, { color: p.testoTerzo }]}>
            Puoi disdire una lezione fino a un’ora prima dell’inizio: poi la
            recuperi con una lezione di recupero, qui sotto.
          </Text>
        ) : null}
      </Sezione>

      {i.recuperabile && !vista ? (
        <Sezione titolo="Prenota un recupero">
          {i.conteggi.da_recuperare === 0 ? (
            <Messaggio tono="attenzione">
              Per il conteggio non hai lezioni da recuperare. Se pensi di
              averne, prova a prenotare: PerfectGym ti dice se si può.
            </Messaggio>
          ) : null}
          <CalendarioLezioni
            categoria="recuperi"
            memberId={memberId}
            vuoto="Nei prossimi giorni non ci sono lezioni di recupero per la sua annata."
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
  vista,
  onCambiato,
}: {
  nome: string;
  memberId: number;
  baby: BabyJunior;
  vista: boolean;
  onCambiato: () => Promise<void>;
}) {
  const p = usePalette();
  const a = baby.abbonamento;
  return (
    <>
      <Sezione titolo={nome ? `Baby Nuoto di ${nome}` : "Baby Nuoto"}>
        {a ? (
          <Carta>
            <Riga
              prima
              testa={<Bollino icona="goccia" tono="blu" size={40} />}
              titolo={senzaPunto(a.piano)}
              sotto="Abbonamento mensile"
              coda={<Etichetta testo={statoContratto(a.stato)} tono="ok" />}
            />
            {a.canone != null && a.canone > 0 ? (
              <Dato etichetta="Quota" valore={`${euroIt(a.canone)} al mese`} />
            ) : null}
            <Dato etichetta="Dal" valore={dataIt(a.inizio)} />
            <Dato etichetta="Rinnovo" valore={rinnovoContratto(a)} />
          </Carta>
        ) : (
          <View style={{ gap: spazio.due }}>
            {baby.singola ? (
              <Carta>
                <Riga
                  prima
                  testa={<Bollino icona="goccia" tono="blu" size={40} />}
                  titolo="Lezione singola"
                  sotto="Prenoti e paghi una lezione alla volta. Nessuna quota di attivazione."
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
                  titolo="Abbonamento mensile"
                  sotto={`Prenoti in tutti i turni disponibili, senza limiti. Quota di attivazione una tantum ${euroIt(baby.mensile.quota_attivazione)}.`}
                  coda={
                    <Etichetta
                      testo={`${euroIt(baby.mensile.canone)} al mese`}
                      tono="accento"
                    />
                  }
                />
              </Carta>
            ) : null}
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              Il Baby Nuoto si prenota lezione per lezione, come le attività
              degli adulti: con l’abbonamento mensile oppure con la lezione
              singola, che acquisti dal calendario qui sotto quando prenoti. Per
              attivare il mensile da qui stiamo preparando l’iscrizione: intanto
              lo attivi in segreteria.
            </Text>
          </View>
        )}
      </Sezione>
      {!vista ? (
        <Sezione titolo="Prenota una lezione di Baby Nuoto">
          <CalendarioLezioni
            categoria="baby"
            memberId={memberId}
            vuoto="Nei prossimi giorni non ci sono lezioni di Baby Nuoto per la sua età."
            onCambiato={onCambiato}
          />
        </Sezione>
      ) : null}
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
        <Etichetta testo="Prenotata" tono="ok" icona="spunta" />
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
          testo="Riprova"
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
        nome={["lezione", "lezioni"]}
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
        I posti cambiano in fretta: l’ultima parola è del Calendario.
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
