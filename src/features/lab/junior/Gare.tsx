import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  iscriviAGara,
  leggiGare,
  pagaGara,
  type DatiGare,
  type GaraTrofeo,
  type IscrizioneMia,
  type PersonaGara,
} from "@/api/gare";
import type { PersonaJunior } from "@/api/junior";
import { apriPagamento } from "@/lib/pagamentoEsterno";
import { locale, t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Carta, Etichetta, Messaggio, Pulsante, SchedeInArrivo } from "../ui/kit";
import { Tocco } from "../ui/Tocco";
import { F, usePalette, velo } from "../ui/tema";
import { nomeCompleto } from "./comune";

// La voce «Gare» di un bambino iscritto (04/11/2026, richiesta di Maurizio): il Trofeo Athlon 2026/27 della Scuola Nuoto, tre gare nella stagione.
//
// Per ogni gara: quando e' (e fino a quando ci si iscrive), la prova del gruppo del bambino (il gruppo lo decide il **livello ottenuto**, il database), e:
//   - se non e' ammesso, il motivo (livello sotto A3, anno fuori dalle quattro categorie);
//   - se puo' iscriversi: si **conferma il sesso** (le classifiche sono separate per maschi e femmine; se e' diverso dalla scheda la aggiorna la funzione), poi si paga
//     (8 euro, Adyen diretto, fuori da PerfectGym) nel browser integrato. **L'iscrizione e' confermata quando Adyen avvisa il database, non al ritorno**: per questo dopo il
//     pagamento la schermata rilegge finche' non vede «confermata»;
//   - se e' iscritto: la prova e, a gara fatta, il tempo, la posizione e i punti.
// Il gruppo e il livello li dice il database; qui non si deduce niente. In vista cliente (staff che guarda) i comandi sono chiusi.

export function Gare({ persona, vista }: { persona: PersonaJunior; vista: boolean }) {
  const [dati, setDati] = useState<(DatiGare & { ok: true }) | { ok: false; errore: string } | undefined>();
  const [attendo, setAttendo] = useState<number | null>(null);
  const giri = useRef(0);

  const carica = useCallback(async () => {
    const e = await leggiGare();
    setDati(e);
    return e;
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);

  // Dopo il pagamento si rilegge ogni 4 secondi, per un minuto: l'avviso di Adyen arriva poco dopo il ritorno.
  useEffect(() => {
    if (attendo === null) return;
    giri.current = 0;
    const id = setInterval(async () => {
      giri.current += 1;
      const e = await carica();
      const fatta = e.ok && e.persone.some((x) => x.member_id === persona.member_id && x.iscrizioni.some((i) => i.id === attendo && i.stato === "confermata"));
      if (fatta || giri.current >= 15) setAttendo(null);
    }, 4000);
    return () => clearInterval(id);
  }, [attendo, carica, persona.member_id]);

  if (!dati) return <SchedeInArrivo quante={2} />;
  if (!dati.ok) {
    return (
      <>
        <Messaggio>{dati.errore}</Messaggio>
        <Pulsante testo={t("Riprova", "Try again")} icona="aggiorna" variante="secondario" onPress={carica} />
      </>
    );
  }
  const pg = dati.persone.find((x) => x.member_id === persona.member_id);
  const mie = dati.mie.filter((x) => x.member_id === persona.member_id);

  return (
    <View style={{ gap: spazio.tre }}>
      <Presentazione quotaCent={dati.quota_cent} />
      {attendo !== null ? (
        <Messaggio tono="ok" titolo={t("Stiamo confermando il pagamento…", "Confirming your payment…")}>
          {t("Di solito ci vogliono pochi secondi. Puoi restare qui: appena arriva la conferma l’iscrizione risulta confermata.", "It usually takes a few seconds. You can stay here: as soon as it arrives your registration shows as confirmed.")}
        </Messaggio>
      ) : null}
      {!pg ? (
        <Messaggio tono="attenzione">{t("Per questa persona le gare non sono disponibili.", "Races aren’t available for this person.")}</Messaggio>
      ) : (
        dati.gare.map((g) => (
          <CartaGara
            key={g.id}
            gara={g}
            pg={pg}
            mia={mie.find((m) => m.gara_id === g.id)}
            quotaCent={dati.quota_cent}
            vista={vista}
            onCambiato={carica}
            onPagamentoAperto={(id) => setAttendo(id)}
          />
        ))
      )}
    </View>
  );
}

function Presentazione({ quotaCent }: { quotaCent: number }) {
  const p = usePalette();
  return (
    <Carta piatta>
      <Text style={[stili.titolo, { color: p.testo }]}>{t("Trofeo Athlon 2026/27", "Athlon Trophy 2026/27")}</Text>
      <Text style={[stili.corpo, { color: p.testoSecondario }]}>
        {t(
          `Il circuito di gare della Scuola Nuoto: tre gare nella stagione, ${euro(quotaCent)} a gara, medaglia di partecipazione a tutti e premi ai primi tre di ogni categoria. Ogni gara dà punti per la classifica finale del Trofeo: 100 al primo, 70 al secondo, 50 al terzo, 30 al quarto, 10 al quinto e 5 a tutti gli altri, con 30 punti di bonus a chi partecipa a tutte e tre. La partecipazione è facoltativa e riservata ai tesserati ASI che frequentano la Scuola Nuoto, dal livello A3 in su.`,
          `The Swim School race circuit: three races in the season, ${euro(quotaCent)} per race, a participation medal for everyone and prizes for the top three in each category. Each race gives points for the final Trophy ranking: 100 for first, 70 for second, 50 for third, 30 for fourth, 10 for fifth and 5 for everyone else, with a 30-point bonus for those who take part in all three. Taking part is optional and open to ASI members attending the Swim School, from level A3 up.`,
        )}
      </Text>
    </Carta>
  );
}

function CartaGara({
  gara,
  pg,
  mia,
  quotaCent,
  vista,
  onCambiato,
  onPagamentoAperto,
}: {
  gara: GaraTrofeo;
  pg: PersonaGara;
  mia?: IscrizioneMia;
  quotaCent: number;
  vista: boolean;
  onCambiato: () => Promise<unknown>;
  onPagamentoAperto: (iscrizioneId: number) => void;
}) {
  const p = usePalette();
  const prova = pg.gruppo ? gara.prove[pg.gruppo]?.descrizione : undefined;
  const iscr = pg.iscrizioni.find((i) => i.gara_id === gara.id);
  const confermata = iscr?.stato === "confermata";
  const inAttesa = iscr?.stato === "in_attesa_pagamento";

  return (
    <Carta>
      <View style={stili.testa}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{t(`${gara.numero}ª gara`, `Race ${gara.numero}`)}</Text>
          <Text style={[stili.corpo, { color: p.testoSecondario }]}>{quando(gara.inizio)}</Text>
        </View>
        {confermata ? (
          <Etichetta grande icona="spunta" tono="ok" testo={t("Iscritto", "Registered")} />
        ) : inAttesa ? (
          <Etichetta grande icona="attenzione" tono="attenzione" testo={t("Da pagare", "To pay")} />
        ) : gara.passata ? (
          <Etichetta testo={t("Conclusa", "Finished")} />
        ) : gara.aperta ? (
          <Etichetta tono="ok" testo={t("Iscrizioni aperte", "Open")} />
        ) : (
          <Etichetta testo={t("Iscrizioni chiuse", "Closed")} />
        )}
      </View>

      {pg.ammesso && prova ? (
        <Text style={[stili.corpo, { color: p.testo }]}>
          <Text style={{ fontFamily: F.bold }}>{t("La prova di ", "The event for ")}{pg.gruppo}: </Text>
          {prova}
        </Text>
      ) : null}

      {pg.ammesso && (confermata || inAttesa) && (mia?.turno_inizio || turnoPersona(gara, pg)) ? (
        <Text style={[stili.corpo, { color: p.testo }]}>
          <Text style={{ fontFamily: F.bold }}>{t("Il turno: ", "Your heat: ")}</Text>
          {t(`ore ${ora(mia?.turno_inizio ?? turnoPersona(gara, pg)!)}. Presentati un po’ prima.`, `${ora(mia?.turno_inizio ?? turnoPersona(gara, pg)!)}. Arrive a little early.`)}
        </Text>
      ) : null}

      {mia && mia.esito ? <Risultato mia={mia} /> : null}

      {!pg.ammesso ? (
        <Text style={[stili.corpo, { color: p.testoSecondario }]}>{motivo(pg)}</Text>
      ) : confermata ? (
        <Text style={[stili.corpo, { color: p.testoSecondario }]}>
          {mia?.esito
            ? ""
            : t(`Iscrizione confermata. Ti aspettiamo ${quando(gara.inizio)}.`, `Registration confirmed. See you ${quando(gara.inizio)}.`)}
        </Text>
      ) : gara.passata ? null : !gara.aperta && !inAttesa ? (
        <Text style={[stili.corpo, { color: p.testoSecondario }]}>
          {new Date(gara.chiude).getTime() <= Date.now()
            ? t("Le iscrizioni a questa gara sono chiuse.", "Registration for this race is closed.")
            : t("Le iscrizioni non sono ancora aperte.", "Registration isn’t open yet.")}
        </Text>
      ) : vista ? (
        <Text style={[stili.corpo, { color: p.testoSecondario }]}>{t("Vista cliente: qui non si può iscrivere.", "Client view: you can’t register from here.")}</Text>
      ) : inAttesa && iscr ? (
        <Pagamento
          iscrizioneId={iscr.id}
          quotaCent={quotaCent}
          chiude={gara.chiude}
          onPagamentoAperto={onPagamentoAperto}
        />
      ) : (
        <FormIscrizione gara={gara} pg={pg} quotaCent={quotaCent} onFatto={onCambiato} onPagamentoAperto={onPagamentoAperto} />
      )}
    </Carta>
  );
}

function Risultato({ mia }: { mia: IscrizioneMia }) {
  const p = usePalette();
  if (mia.esito === "assente") return <Etichetta testo={t("Assente", "Absent")} />;
  if (mia.esito === "squalificato") return <Etichetta tono="attenzione" testo={t("Squalificato", "Disqualified")} />;
  return (
    <View style={[stili.risultato, { backgroundColor: velo(p, "accento", p.scuro ? 0.18 : 0.1), borderColor: p.accento }]}>
      <Text style={[stili.titolo, { color: p.testo }]}>
        {mia.posizione ? `${mia.posizione}° ` : ""}
        {tempo(mia.tempo_cent)}
      </Text>
      <Text style={[stili.corpo, { color: p.testoSecondario }]}>{t(`${mia.punti} punti per il Trofeo`, `${mia.punti} points for the Trophy`)}</Text>
    </View>
  );
}

/** L'iscrizione: si conferma il sesso e si va a pagare. */
function FormIscrizione({
  gara,
  pg,
  quotaCent,
  onFatto,
  onPagamentoAperto,
}: {
  gara: GaraTrofeo;
  pg: PersonaGara;
  quotaCent: number;
  onFatto: () => Promise<unknown>;
  onPagamentoAperto: (iscrizioneId: number) => void;
}) {
  const p = usePalette();
  const [aperto, setAperto] = useState(false);
  const [sesso, setSesso] = useState<"Male" | "Female" | null>(pg.sesso === "Male" || pg.sesso === "Female" ? pg.sesso : null);
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const nome = nomeCompleto(pg);

  async function vai() {
    if (!sesso) return;
    setErrore(null);
    setLavoro(true);
    const r = await iscriviAGara(gara.id, pg.member_id, sesso);
    if (!r.ok && !r.gia_iscritto) {
      setLavoro(false);
      setErrore(r.errore);
      return;
    }
    if (!r.ok) {
      setLavoro(false);
      await onFatto();
      return;
    }
    const l = await pagaGara(r.iscrizione_id);
    setLavoro(false);
    await onFatto();
    if (!l.ok) {
      setErrore(l.errore);
      return;
    }
    if (l.url) {
      const aperto = await apriPagamento(l.url);
      if (aperto) onPagamentoAperto(r.iscrizione_id);
    }
  }

  if (!aperto) {
    return <Pulsante testo={t(`Iscrivi ${pg.nome ?? ""}`.trim(), `Register ${pg.nome ?? ""}`.trim())} icona="trofeo" onPress={() => setAperto(true)} />;
  }
  return (
    <View style={{ gap: spazio.tre }}>
      <Text style={[stili.corpo, { color: p.testo, fontFamily: F.bold }]}>
        {t(`${nome} è un maschio o una femmina?`, `Is ${nome} a boy or a girl?`)}
      </Text>
      <View style={stili.fila} accessibilityRole="radiogroup">
        {([["Male", t("Maschio", "Boy")], ["Female", t("Femmina", "Girl")]] as const).map(([v, testo]) => {
          const on = sesso === v;
          return (
            <Tocco
              key={v}
              vibra="scelta"
              ruolo="radio"
              stato={{ checked: on }}
              etichetta={testo}
              onPress={() => setSesso(v)}
              style={[stili.scelta, { backgroundColor: on ? velo(p, "accento", p.scuro ? 0.18 : 0.1) : p.carta, borderColor: on ? p.accento : p.linea }]}
            >
              <Text style={{ color: p.testo, fontFamily: on ? F.extra : F.bold, fontSize: 15 }}>{testo}</Text>
            </Tocco>
          );
        })}
      </View>
      {sesso && turnoDi(gara, pg, sesso) ? (
        <Text style={[stili.corpo, { color: p.testo }]}>
          {t(`Il turno sarà alle ${ora(turnoDi(gara, pg, sesso)!)}.`, `The heat will be at ${ora(turnoDi(gara, pg, sesso)!)}.`)}
        </Text>
      ) : null}
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t(
          "Le classifiche sono separate per maschi e femmine. Se è diverso da quello sulla scheda, la aggiorniamo.",
          "Rankings are separate for boys and girls. If it differs from the profile, we’ll update the profile.",
        )}
      </Text>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante
        testo={t(`Iscrivi e paga ${euro(quotaCent)}`, `Register and pay ${euro(quotaCent)}`)}
        icona="carta"
        inCorso={lavoro}
        disabilitato={!sesso}
        onPress={vai}
      />
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t(
          `Si paga ora con carta, sulla pagina sicura di Adyen. Iscrizioni fino alle ${ora(gara.chiude)} di ${giorno(gara.chiude)}. La quota non è rimborsabile.`,
          `You pay now by card on Adyen’s secure page. Registration closes at ${ora(gara.chiude)} on ${giorno(gara.chiude)}. The fee is non-refundable.`,
        )}
      </Text>
    </View>
  );
}

/** Iscritto ma non ancora pagato: si riprende il pagamento. */
function Pagamento({ iscrizioneId, quotaCent, chiude, onPagamentoAperto }: { iscrizioneId: number; quotaCent: number; chiude: string; onPagamentoAperto: (iscrizioneId: number) => void }) {
  const p = usePalette();
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  async function paga() {
    setErrore(null);
    setLavoro(true);
    const l = await pagaGara(iscrizioneId);
    setLavoro(false);
    if (!l.ok) return setErrore(l.errore);
    if (l.url) {
      const aperto = await apriPagamento(l.url);
      if (aperto) onPagamentoAperto(iscrizioneId);
    }
  }
  return (
    <View style={{ gap: spazio.tre }}>
      <Text style={[stili.corpo, { color: p.testoSecondario }]}>
        {t(
          `L’iscrizione è confermata solo dopo il pagamento. Hai tempo fino alle ${ora(chiude)} di ${giorno(chiude)}.`,
          `Registration is confirmed only after payment. You have until ${ora(chiude)} on ${giorno(chiude)}.`,
        )}
      </Text>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo={t(`Paga ${euro(quotaCent)}`, `Pay ${euro(quotaCent)}`)} icona="carta" inCorso={lavoro} onPress={paga} />
    </View>
  );
}

/** L'ora del turno del bambino in questa gara: con il sesso dato (quello che il genitore conferma) o, in sua assenza, quello della scheda. */
function turnoDi(gara: GaraTrofeo, pg: PersonaGara, sesso: "Male" | "Female"): string | null {
  return gara.turni.find((x) => x.fascia_eta === pg.fascia && x.sesso === sesso)?.inizio ?? null;
}
function turnoPersona(gara: GaraTrofeo, pg: PersonaGara): string | null {
  return pg.sesso === "Male" || pg.sesso === "Female" ? turnoDi(gara, pg, pg.sesso) : null;
}

function motivo(pg: PersonaGara): string {
  if (pg.motivo === "livello")
    return t("Per gareggiare serve almeno il livello A3, già ottenuto. Il livello lo aggiorna la Direzione Tecnica.", "To compete you need at least level A3, already achieved. The Technical Director updates the level.");
  if (pg.motivo === "fuori_fascia")
    return t("Quest’anno di nascita non è in nessuna categoria del Trofeo (2013–2022).", "This birth year isn’t in any Trophy category (2013–2022).");
  if (pg.motivo === "data_nascita") return t("Manca la data di nascita sulla scheda.", "The date of birth is missing from the profile.");
  return t("Non può iscriversi a questa gara.", "Can’t register for this race.");
}

const euro = (cent: number) => `${(cent / 100).toLocaleString(locale(), { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

function giorno(iso: string): string {
  return new Date(iso).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" });
}
function ora(iso: string): string {
  return new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
}
function quando(iso: string): string {
  return `${giorno(iso)}, ${t("ore", "at")} ${ora(iso)}`;
}

/** Un tempo in centesimi di secondo come sul cronometro: 3547 -> «35,47», 6534 -> «1:05,34». */
function tempo(cent: number | null): string {
  if (!cent) return "";
  const s = Math.floor(cent / 100);
  const cc = String(cent % 100).padStart(2, "0");
  const sep = locale() === "it-IT" ? "," : ".";
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}${sep}${cc}` : `${s}${sep}${cc}`;
}

const stili = StyleSheet.create({
  testa: { flexDirection: "row", alignItems: "center", gap: spazio.due },
  titolo: { fontFamily: F.extra, fontSize: 17, lineHeight: 22 },
  corpo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  nota: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  fila: { flexDirection: "row", gap: spazio.due },
  scelta: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1.5 },
  risultato: { padding: spazio.tre, borderRadius: 14, borderWidth: 1.5, gap: 2 },
});
