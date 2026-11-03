import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { configurazioneAdyen, type SessioneAdyen } from "@/api/lab";
import {
  esitoSessioneGara,
  iscriviAGara,
  leggiGare,
  pagaGara,
  sessioneGara,
  type DatiGare,
  type GaraTrofeo,
  type IscrizioneMia,
  type PersonaGara,
} from "@/api/gare";
import type { PersonaJunior } from "@/api/junior";
import { apriPagamento } from "@/lib/pagamentoEsterno";
import { locale, t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { DropIn, pagamentoDisponibile, riprendiDopoRedirect } from "../adyen";
import { Icona } from "../ui/Icona";
import { Bollino, Carta, Etichetta, Messaggio, Numero, Pulsante, SchedeInArrivo } from "../ui/kit";
import { useRiduciMovimento } from "../ui/movimento";
import { Tocco } from "../ui/Tocco";
import { F, FUOCO, usePalette, velo } from "../ui/tema";
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
//
// **L'ora del turno e' la cosa piu' importante della carta** (04/11/2026, dallo screenshot di Maurizio: «il testo e' troppo piatto, e nel caso di cambio sesso devi
// comunque evidenziare l'orario»): sta in un riquadro scuro subito sotto la testata, in ogni stato (da iscrivere, da pagare, confermata), con **due ore a 44 punti**:
// la **convocazione** e l'**inizio gara**. L'ora che arriva dai turni e' quella dell'inizio gara; **la convocazione e' sempre 30 minuti prima** (Maurizio).
// L'ora arriva dai turni che la funzione manda per la gara: se la gara non ne ha (2ª e 3ª per ora), il riquadro non c'e'.
//
// **Il sesso lo dice il codice fiscale** (Maurizio: «onde evitare questa scelta maschio-femmina che potrebbe generare confusione»): l'app non lo chiede, e il riquadro del turno
// mostra subito l'ora della categoria giusta. Lo chiede **solo se il codice fiscale non lo dice** (manca, o non torna con la data di nascita: 69 bambini su 1.135 oggi), con
// i due pulsanti che portano ciascuno la sua ora. Se il sesso del codice e' diverso da quello sulla scheda su PerfectGym lo si dice, e lo aggiorna la funzione.
//
// **Si paga nella carta, col Drop-in di Adyen** (04/11/2026, Maurizio: «mi apre un altro link: usa l'altra modalita' di Adyen che gia' avevamo, l'embed nel nostro sito, metti i dati
// della carta e ti da' il risultato li'»): sul web, dopo l'iscrizione, la carta della gara si apre su `CassaGara` con il modulo di Adyen (`../adyen`, la stessa sessione e lo stesso
// riferimento `GARA-<id>` del link). Finito il pagamento si chiede l'esito al server (`esitoSessioneGara`: «ricevuto», «rifiutato») e si rilegge finche' il webhook non conferma
// l'iscrizione. **Nell'app nativa il Drop-in non c'e'** (`pagamentoDisponibile` falso) e si resta sul link di prima, nel browser integrato.
//
// **Nessuna scadenza scritta** (Maurizio): le iscrizioni restano aperte fino a un minuto prima dell'inizio della gara, e la schermata non dice quando chiudono.

type Sesso = "Male" | "Female";

export function Gare({ persona, vista }: { persona: PersonaJunior; vista: boolean }) {
  const [dati, setDati] = useState<(DatiGare & { ok: true }) | { ok: false; errore: string } | undefined>();
  // `attendo` e' l'iscrizione di cui si aspetta la conferma; -1 = una qualunque (si torna dalla 3D Secure senza sapere quale).
  const [attendo, setAttendo] = useState<number | null>(null);
  const giri = useRef(0);
  const { sessionId, redirectResult } = useLocalSearchParams<{ sessionId?: string; redirectResult?: string }>();

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
      const fatta = e.ok && e.persone.some((x) => x.member_id === persona.member_id && x.iscrizioni.some((i) => (attendo === -1 || i.id === attendo) && i.stato === "confermata"));
      if (fatta || giri.current >= 15) setAttendo(null);
    }, 4000);
    return () => clearInterval(id);
  }, [attendo, carica, persona.member_id]);

  // Il ritorno dalla 3D Secure o da un metodo con reindirizzamento: Adyen riporta qui con `sessionId` e `redirectResult`, che vanno consegnati ad Adyen o il pagamento non si
  // completa. Una volta sola per risultato; poi si aspetta la conferma del webhook.
  useEffect(() => {
    if (!pagamentoDisponibile || !sessionId || !redirectResult || !primaVolta(`gare-redirect-${redirectResult.slice(0, 40)}`)) return;
    (async () => {
      try {
        const cfg = await configurazioneAdyen();
        if (cfg.ok) await riprendiDopoRedirect({ clientKey: cfg.clientKey, environment: cfg.environment, sessionId, redirectResult });
      } catch {
        // lo stato qui sotto segue comunque il webhook
      }
      setAttendo(-1);
    })();
  }, [sessionId, redirectResult]);

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

/** Il Trofeo in breve: i numeri a colpo d'occhio, i punti, e solo in fondo le condizioni. */
function Presentazione({ quotaCent }: { quotaCent: number }) {
  const p = usePalette();
  const punti: [string, number][] = [
    [t("1°", "1st"), 100],
    [t("2°", "2nd"), 70],
    [t("3°", "3rd"), 50],
    [t("4°", "4th"), 30],
    [t("5°", "5th"), 10],
    [t("Altri", "Others"), 5],
  ];
  return (
    <Carta piatta style={{ gap: spazio.tre }}>
      <View style={stili.testa}>
        <Bollino icona="trofeo" size={46} pieno />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[stili.titolo, { color: p.testo }]}>{t("Trofeo Athlon 2026/27", "Athlon Trophy 2026/27")}</Text>
          <Text style={[stili.corpo, { color: p.testoSecondario }]}>{t("Il circuito di gare della Scuola Nuoto", "The Swim School race circuit")}</Text>
        </View>
      </View>

      <View style={stili.fila}>
        <Fatto valore="3" testo={t("gare nella stagione", "races this season")} />
        <Fatto valore={euro(quotaCent)} testo={t("a gara", "per race")} />
        <Fatto valore="Top 3" testo={t("premiati in ogni categoria", "prizes in each category")} />
      </View>
      <View style={{ gap: spazio.due }}>
        <View style={stili.rigaIcona}>
          <Icona nome="stella" size={16} colore={p.accento} />
          <Text style={[stili.corpo, { color: p.testo, flex: 1 }]}>{t("Medaglia di partecipazione a tutti", "Participation medal for everyone")}</Text>
        </View>
        <View style={stili.rigaIcona}>
          <Icona nome="orologio" size={16} colore={p.accento} />
          <Text style={[stili.corpo, { color: p.testo, flex: 1 }]}>{t("Convocazione 30 minuti prima dell’inizio della gara", "Call time 30 minutes before the race starts")}</Text>
        </View>
      </View>

      <View style={{ gap: spazio.due }}>
        <Text style={[stili.sopra, { color: p.testoSecondario }]}>{t("PUNTI PER LA CLASSIFICA DEL TROFEO", "POINTS FOR THE TROPHY RANKING")}</Text>
        <View style={stili.fila}>
          {punti.map(([pos, v], i) => (
            <View key={pos} style={[stili.punto, { backgroundColor: i === 0 ? velo(p, "accento", p.scuro ? 0.2 : 0.12) : p.incavo }]}>
              <Text style={[stili.puntoPos, { color: i === 0 ? p.accento : p.testoSecondario }]}>{pos}</Text>
              <Text style={[stili.puntoValore, { color: p.testo }]}>{v}</Text>
            </View>
          ))}
        </View>
        <Etichetta tono="accento" icona="fulmine" testo={t("+30 punti di bonus a chi partecipa a tutte e tre", "+30 bonus points if you take part in all three")} />
      </View>

      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t(
          "La partecipazione è facoltativa e riservata ai tesserati ASI che frequentano la Scuola Nuoto, dal livello A3 in su.",
          "Taking part is optional and open to ASI members attending the Swim School, from level A3 up.",
        )}
      </Text>
    </Carta>
  );
}

function Fatto({ valore, testo }: { valore: string; testo: string }) {
  const p = usePalette();
  return (
    <View style={[stili.fatto, { backgroundColor: p.incavo }]}>
      <Text style={[stili.fattoValore, { color: p.testo }]}>{valore}</Text>
      <Text style={[stili.fattoTesto, { color: p.testoSecondario }]}>{testo}</Text>
    </View>
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

  // Il sesso lo dice il codice fiscale; la scelta del genitore c'e' solo se il codice non basta. Il sesso scelto e il modulo aperto stanno qui e non nel modulo: il
  // riquadro del turno, in alto, deve seguire la scelta.
  const sessoCf: Sesso | null = pg.sesso_cf === "Male" || pg.sesso_cf === "Female" ? pg.sesso_cf : null;
  const sessoScheda: Sesso | null = pg.sesso === "Male" || pg.sesso === "Female" ? pg.sesso : null;
  const [scelto, setScelto] = useState<Sesso | null>(sessoScheda);
  const [aperto, setAperto] = useState(false);
  // L'iscrizione che si sta pagando nella carta, col Drop-in (solo sul web).
  const [cassa, setCassa] = useState<number | null>(null);

  const iscritto = confermata || inAttesa;
  const sessoUsato: Sesso | null = sessoCf ?? (iscritto ? (mia?.sesso ?? scelto) : scelto);
  const isoTurno = iscritto ? (mia?.turno_inizio ?? (sessoUsato ? turnoDi(gara, pg, sessoUsato) : null)) : sessoUsato ? turnoDi(gara, pg, sessoUsato) : null;
  // Il riquadro c'e' se la gara ha i turni e la persona puo' gareggiare. Col sesso da scegliere compare solo a modulo aperto (con l'invito a scegliere).
  const mostraTurno = pg.ammesso && !gara.passata && gara.turni.length > 0 && (iscritto || sessoCf !== null || aperto);

  return (
    <Carta style={{ gap: spazio.tre }}>
      <View style={stili.testa}>
        <TesseraData iso={gara.inizio} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={stili.titoloRiga}>
            <Text style={[stili.titolo, { color: p.testo }]}>{t(`${gara.numero}ª gara`, `Race ${gara.numero}`)}</Text>
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
          <Text style={[stili.corpo, { color: p.testoSecondario }]}>
            {gara.turni.length > 0 ? `${giorno(gara.inizio)} · ${t("turni dalle", "heats from")} ${ora(gara.inizio)}` : quando(gara.inizio)}
          </Text>
        </View>
      </View>

      {mostraTurno ? <TurnoEvidenza nome={pg.nome} iso={isoTurno} sesso={sessoUsato} fascia={pg.fascia} /> : null}

      {pg.ammesso && prova ? <Prova gruppo={pg.gruppo ?? ""} testo={prova} /> : null}

      {mia && mia.esito ? <Risultato mia={mia} /> : null}

      {!pg.ammesso ? (
        <Text style={[stili.corpo, { color: p.testoSecondario }]}>{motivo(pg)}</Text>
      ) : confermata ? (
        mia?.esito ? null : (
          <Messaggio tono="ok" titolo={t("Iscrizione confermata", "Registration confirmed")}>
            {isoTurno
              ? t(`Ti aspettiamo ${giorno(gara.inizio)}: convocazione alle ${ora(convocazione(isoTurno))}. Ti scriviamo anche per email con tutte le informazioni.`, `See you on ${giorno(gara.inizio)}: call time ${ora(convocazione(isoTurno))}. We’ll also email you all the details.`)
              : t(`Ti aspettiamo ${giorno(gara.inizio)}. La convocazione è 30 minuti prima dell’inizio del turno. Ti scriviamo anche per email con tutte le informazioni.`, `See you on ${giorno(gara.inizio)}. Call time is 30 minutes before your heat starts. We’ll also email you all the details.`)}
          </Messaggio>
        )
      ) : gara.passata ? null : !gara.aperta && !inAttesa ? (
        <Text style={[stili.corpo, { color: p.testoSecondario }]}>
          {new Date(gara.chiude).getTime() <= Date.now()
            ? t("Le iscrizioni a questa gara sono chiuse.", "Registration for this race is closed.")
            : t("Le iscrizioni non sono ancora aperte.", "Registration isn’t open yet.")}
        </Text>
      ) : vista ? (
        <Text style={[stili.corpo, { color: p.testoSecondario }]}>{t("Vista cliente: qui non si può iscrivere.", "Client view: you can’t register from here.")}</Text>
      ) : inAttesa && iscr ? (
        cassa === iscr.id ? (
          <CassaGara iscrizioneId={iscr.id} quotaCent={quotaCent} onAttendo={onPagamentoAperto} onChiudi={() => setCassa(null)} />
        ) : (
          <Pagamento iscrizioneId={iscr.id} quotaCent={quotaCent} onCassa={setCassa} onPagamentoAperto={onPagamentoAperto} />
        )
      ) : (
        <FormIscrizione
          gara={gara}
          pg={pg}
          quotaCent={quotaCent}
          aperto={aperto}
          onApri={() => setAperto(true)}
          sessoCf={sessoCf}
          sessoScheda={sessoScheda}
          scelto={scelto}
          onScelto={setScelto}
          onFatto={onCambiato}
          onCassa={setCassa}
          onPagamentoAperto={onPagamentoAperto}
        />
      )}
    </Carta>
  );
}

/** Il giorno come una tessera di calendario: sigla del giorno, numero grande, mese. */
function TesseraData({ iso }: { iso: string }) {
  const p = usePalette();
  const d = new Date(iso);
  const pezzo = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(locale(), { ...o, timeZone: "Europe/Rome" }).replace(".", "").toUpperCase();
  return (
    <View style={[stili.data, { backgroundColor: velo(p, "accento", p.scuro ? 0.2 : 0.12) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[stili.dataSopra, { color: p.accento }]}>{pezzo({ weekday: "short" })}</Text>
      <Text style={[stili.dataGiorno, { color: p.testo }]}>{pezzo({ day: "numeric" })}</Text>
      <Text style={[stili.dataSopra, { color: p.accento }]}>{pezzo({ month: "short" })}</Text>
    </View>
  );
}

/**
 * L'ora del turno: la cosa che il genitore deve ricordare. Riquadro scuro con due ore grandi: la **convocazione** (30 minuti prima) e l'**inizio gara**, e la categoria
 * sotto. Col sesso ancora da scegliere (solo se il codice fiscale non lo dice) si invita a farlo; scegliendo, l'ora si aggiorna con un piccolo salto.
 */
function TurnoEvidenza({ nome, iso, sesso, fascia }: { nome: string | null; iso: string | null; sesso: Sesso | null; fascia: string | null }) {
  const riduci = useRiduciMovimento();
  const chi = nome ?? "";
  const categoria = [sesso ? sessoTesto(sesso) : null, fascia ? `${t("nati nel", "born in")} ${fasciaTesto(fascia)}` : null].filter(Boolean).join(" · ");
  const etichetta = chi ? t(`Il turno di ${chi}`, `${chi}’s heat`) : t("Il turno", "The heat");
  const conv = iso ? convocazione(iso) : null;
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={
        iso && conv
          ? t(`${etichetta}: convocazione alle ${ora(conv)}, inizio gara alle ${ora(iso)}. ${categoria}`, `${etichetta}: call time ${ora(conv)}, race starts at ${ora(iso)}. ${categoria}`)
          : t("Il turno dipende dal sesso: scegli maschio o femmina.", "The heat depends on gender: choose boy or girl.")
      }
      style={[stili.turno, { borderColor: iso ? FUOCO[1] : "rgba(255,255,255,0.14)" }]}
    >
      <View style={stili.turnoTesta}>
        <Icona nome="orologio" size={15} colore={FUOCO[0]} />
        <Text style={stili.turnoEtichetta}>{etichetta.toUpperCase()}</Text>
      </View>
      {iso && conv ? (
        <>
          <View style={stili.turnoOre}>
            <Animated.View key={`c${iso}`} entering={riduci ? undefined : ZoomIn.duration(240)} style={stili.turnoOra}>
              <Text style={[stili.turnoOraEtichetta, { color: FUOCO[0] }]}>{t("CONVOCAZIONE", "CALL TIME")}</Text>
              <Numero valore={ora(conv)} size={44} colore="#FFFFFF" />
            </Animated.View>
            <View style={stili.turnoSepara} />
            <Animated.View key={`i${iso}`} entering={riduci ? undefined : ZoomIn.duration(240)} style={stili.turnoOra}>
              <Text style={stili.turnoOraEtichetta}>{t("INIZIO GARA", "RACE START")}</Text>
              <Numero valore={ora(iso)} size={44} colore="#FFFFFF" />
            </Animated.View>
          </View>
          {categoria ? <Text style={stili.turnoCategoria}>{categoria}</Text> : null}
          <Text style={stili.turnoSotto}>{t("La convocazione è sempre 30 minuti prima dell’inizio.", "Call time is always 30 minutes before the start.")}</Text>
        </>
      ) : (
        <Text style={stili.turnoSotto}>{t("Il turno dipende dal sesso: scegli qui sotto e lo vedi subito.", "The heat depends on gender: choose below and you’ll see it right here.")}</Text>
      )}
    </View>
  );
}

/** La prova del gruppo, con il suo nome e la sua descrizione. */
function Prova({ gruppo, testo }: { gruppo: string; testo: string }) {
  const p = usePalette();
  return (
    <View style={[stili.prova, { backgroundColor: p.incavo }]}>
      <Bollino icona="cronometro" size={38} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[stili.sopra, { color: p.testoSecondario }]}>{t(`LA PROVA DI ${gruppo.replace("-", "–")}`, `THE EVENT FOR ${gruppo.replace("-", "–")}`)}</Text>
        <Text style={[stili.corpo, { color: p.testo, fontFamily: F.bold }]}>{testo}</Text>
      </View>
    </View>
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

/**
 * L'iscrizione. Col sesso dato dal codice fiscale e' un solo tocco: «Iscrivi e paga». Solo se il codice non lo dice (manca, o non torna con la data di nascita) il
 * genitore sceglie maschio o femmina, e ogni scelta porta la sua ora.
 */
function FormIscrizione({
  gara,
  pg,
  quotaCent,
  aperto,
  onApri,
  sessoCf,
  sessoScheda,
  scelto,
  onScelto,
  onFatto,
  onCassa,
  onPagamentoAperto,
}: {
  gara: GaraTrofeo;
  pg: PersonaGara;
  quotaCent: number;
  aperto: boolean;
  onApri: () => void;
  sessoCf: Sesso | null;
  sessoScheda: Sesso | null;
  scelto: Sesso | null;
  onScelto: (s: Sesso) => void;
  onFatto: () => Promise<unknown>;
  onCassa: (iscrizioneId: number) => void;
  onPagamentoAperto: (iscrizioneId: number) => void;
}) {
  const p = usePalette();
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const nome = nomeCompleto(pg);
  const auto = sessoCf !== null;

  async function vai() {
    if (!auto && !scelto) return;
    setErrore(null);
    setLavoro(true);
    const r = await iscriviAGara(gara.id, pg.member_id, auto ? null : scelto);
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
    // Sul web si paga qui, nella carta (Drop-in); altrove, col link nel browser integrato.
    if (pagamentoDisponibile) {
      onCassa(r.iscrizione_id);
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

  const note = (
    <Text style={[stili.nota, { color: p.testoSecondario }]}>
      {t("Si paga ora con carta, sulla pagina sicura di Adyen. La quota non è rimborsabile.", "You pay now by card on Adyen’s secure page. The fee is non-refundable.")}
    </Text>
  );

  // Il sesso lo dice il codice fiscale: un tocco solo.
  if (auto) {
    const cambia = sessoScheda !== sessoCf;
    return (
      <View style={{ gap: spazio.tre }}>
        {errore ? <Messaggio>{errore}</Messaggio> : null}
        <Pulsante
          testo={t(`Iscrivi ${pg.nome ?? ""} e paga ${euro(quotaCent)}`.replace("  ", " "), `Register ${pg.nome ?? ""} and pay ${euro(quotaCent)}`.replace("  ", " "))}
          icona="carta"
          inCorso={lavoro}
          onPress={vai}
        />
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t(
            `Le classifiche sono separate per maschi e femmine: la categoria la ricaviamo dal codice fiscale (${sessoTesto(sessoCf!, true)}).${cambia ? " Aggiorniamo anche la scheda." : ""}`,
            `Rankings are separate for boys and girls: we get the category from the tax code (${sessoTesto(sessoCf!, true)}).${cambia ? " We’ll update the profile too." : ""}`,
          )}
        </Text>
        {note}
      </View>
    );
  }

  // Il codice fiscale non lo dice: lo sceglie il genitore.
  if (!aperto) {
    return <Pulsante testo={t(`Iscrivi ${pg.nome ?? ""}`.trim(), `Register ${pg.nome ?? ""}`.trim())} icona="trofeo" onPress={onApri} />;
  }
  return (
    <View style={{ gap: spazio.tre }}>
      <Messaggio tono="attenzione" icona="info">
        {t(
          `Non riusciamo a ricavare il sesso dal codice fiscale di ${pg.nome ?? "questo bambino"} (manca, o non torna con la data di nascita). Scegli tu: le classifiche sono separate per maschi e femmine.`,
          `We can’t get ${pg.nome ?? "this child"}’s gender from the tax code (it’s missing, or doesn’t match the date of birth). Please choose: rankings are separate for boys and girls.`,
        )}
      </Messaggio>
      <Text style={[stili.corpo, { color: p.testo, fontFamily: F.bold }]}>
        {t(`${nome} è un maschio o una femmina?`, `Is ${nome} a boy or a girl?`)}
      </Text>
      <View style={stili.fila} accessibilityRole="radiogroup">
        {([["Male", t("Maschio", "Boy")], ["Female", t("Femmina", "Girl")]] as const).map(([v, testo]) => {
          const on = scelto === v;
          const iso = turnoDi(gara, pg, v);
          return (
            <Tocco
              key={v}
              vibra="scelta"
              ruolo="radio"
              stato={{ checked: on }}
              etichetta={iso ? `${testo}, ${t("inizio gara alle", "race starts at")} ${ora(iso)}` : testo}
              onPress={() => onScelto(v)}
              style={[stili.scelta, { backgroundColor: on ? velo(p, "accento", p.scuro ? 0.18 : 0.1) : p.carta, borderColor: on ? p.accento : p.linea }]}
            >
              <Text style={{ color: p.testo, fontFamily: on ? F.extra : F.bold, fontSize: 15 }}>{testo}</Text>
              {iso ? (
                <View style={stili.sceltaOra}>
                  <Icona nome="orologio" size={13} colore={on ? p.accento : p.testoSecondario} />
                  <Text style={{ color: on ? p.accento : p.testoSecondario, fontFamily: F.extra, fontSize: 15, fontVariant: ["tabular-nums"] }}>{ora(iso)}</Text>
                </View>
              ) : null}
            </Tocco>
          );
        })}
      </View>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante
        testo={t(`Iscrivi e paga ${euro(quotaCent)}`, `Register and pay ${euro(quotaCent)}`)}
        icona="carta"
        inCorso={lavoro}
        disabilitato={!scelto}
        onPress={vai}
      />
      {note}
    </View>
  );
}

/** Iscritto ma non ancora pagato: si riprende il pagamento. */
function Pagamento({ iscrizioneId, quotaCent, onCassa, onPagamentoAperto }: { iscrizioneId: number; quotaCent: number; onCassa: (iscrizioneId: number) => void; onPagamentoAperto: (iscrizioneId: number) => void }) {
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  async function paga() {
    if (pagamentoDisponibile) return onCassa(iscrizioneId);
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
      <Messaggio tono="attenzione" titolo={t("Manca il pagamento", "Payment is missing")}>
        {t("L’iscrizione è confermata solo dopo il pagamento.", "Registration is confirmed only after payment.")}
      </Messaggio>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      <Pulsante testo={t(`Paga ${euro(quotaCent)}`, `Pay ${euro(quotaCent)}`)} icona="carta" inCorso={lavoro} onPress={paga} />
    </View>
  );
}

/**
 * Il pagamento nella carta, sul web: il Drop-in di Adyen. La sessione la prepara il server (`sessioneGara`), la carta si scrive nel modulo sicuro di Adyen (i dati non passano da noi)
 * e, finito, si chiede l'esito al server: «ricevuto» (e si aspetta la conferma del webhook), «rifiutato» o «non completato» (con «Riprova», che chiede una sessione nuova).
 */
function CassaGara({ iscrizioneId, quotaCent, onAttendo, onChiudi }: { iscrizioneId: number; quotaCent: number; onAttendo: (iscrizioneId: number) => void; onChiudi: () => void }) {
  const p = usePalette();
  const [sessione, setSessione] = useState<SessioneAdyen | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<{ tono: "ok" | "attenzione" | "errore"; titolo: string; testo: string; riprova: boolean } | null>(null);
  const [giro, setGiro] = useState(0); // cambia per chiedere una sessione nuova

  useEffect(() => {
    let vivo = true;
    setSessione(null);
    setErrore(null);
    setEsito(null);
    (async () => {
      const r = await sessioneGara(iscrizioneId);
      if (!vivo) return;
      if (!r.ok) return setErrore(r.errore);
      if ("giaPagata" in r) {
        onAttendo(iscrizioneId);
        return setEsito({ tono: "ok", titolo: t("Pagamento già ricevuto", "Payment already received"), testo: t("Stiamo confermando l’iscrizione.", "We’re confirming the registration."), riprova: false });
      }
      setSessione(r);
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iscrizioneId, giro]);

  const fine = useCallback(
    async (risultato: string | null) => {
      const id = sessione?.sessione.id;
      let stato: string | null = null;
      if (id && risultato) {
        const e = await esitoSessioneGara(iscrizioneId, id, risultato);
        if (e.ok) stato = e.adyen_status;
      }
      setSessione(null); // il modulo si chiude
      if (stato === "refused") {
        setEsito({ tono: "errore", titolo: t("Pagamento rifiutato", "Payment declined"), testo: t("La banca non ha autorizzato il pagamento. Non è stato addebitato nulla: puoi riprovare con un’altra carta.", "Your bank didn’t authorize the payment. Nothing was charged: you can try another card."), riprova: true });
      } else if (stato === "canceled" || stato === "expired") {
        setEsito({ tono: "attenzione", titolo: t("Pagamento non completato", "Payment not completed"), testo: t("Il pagamento non è stato completato. Non è stato addebitato nulla.", "The payment wasn’t completed. Nothing was charged."), riprova: true });
      } else {
        // Ricevuto, in verifica o esito non leggibile: la conferma e' del webhook, e la schermata la aspetta.
        onAttendo(iscrizioneId);
        setEsito(
          stato === "completed"
            ? { tono: "ok", titolo: t("Pagamento ricevuto", "Payment received"), testo: t("Stiamo confermando l’iscrizione: di solito bastano pochi secondi.", "We’re confirming the registration: it usually takes a few seconds."), riprova: false }
            : { tono: "attenzione", titolo: t("Stiamo verificando il pagamento", "We’re checking the payment"), testo: t("La banca non ha ancora risposto. Se il pagamento va a buon fine l’iscrizione si conferma da sola.", "Your bank hasn’t replied yet. If the payment goes through the registration confirms itself."), riprova: false },
        );
      }
    },
    [sessione, iscrizioneId, onAttendo],
  );

  return (
    <View style={{ gap: spazio.tre }}>
      <View style={stili.rigaIcona}>
        <Icona nome="carta" size={18} colore={p.accento} />
        <Text style={[stili.corpo, { color: p.testo, fontFamily: F.bold, flex: 1 }]}>{t(`Paga ${euro(quotaCent)} con carta`, `Pay ${euro(quotaCent)} by card`)}</Text>
      </View>
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {sessione ? <DropIn sessione={sessione} onFine={fine} onErrore={setErrore} /> : !esito && !errore ? <SchedeInArrivo quante={1} /> : null}
      {esito ? (
        <Messaggio tono={esito.tono} titolo={esito.titolo}>
          {esito.testo}
        </Messaggio>
      ) : null}
      {errore || esito?.riprova ? <Pulsante testo={t("Riprova", "Try again")} icona="aggiorna" variante="secondario" onPress={() => setGiro((g) => g + 1)} /> : null}
      {!esito || esito.riprova ? <Pulsante testo={t("Non adesso", "Not now")} variante="secondario" piccolo onPress={onChiudi} /> : null}
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t("I dati della carta li scrivi nel modulo sicuro di Adyen: non passano da noi. La quota non è rimborsabile.", "You enter your card details in Adyen’s secure form: they don’t pass through us. The fee is non-refundable.")}
      </Text>
    </View>
  );
}

/** Una volta sola per risultato: un ricaricamento non lo consegna due volte. */
function primaVolta(chiave: string): boolean {
  try {
    if (globalThis.sessionStorage?.getItem(chiave)) return false;
    globalThis.sessionStorage?.setItem(chiave, "1");
  } catch {
    // senza sessionStorage si prova comunque
  }
  return true;
}

/** L'ora del turno di questa categoria (fascia d'eta' del bambino e sesso). */
function turnoDi(gara: GaraTrofeo, pg: PersonaGara, sesso: Sesso): string | null {
  return gara.turni.find((x) => x.fascia_eta === pg.fascia && x.sesso === sesso)?.inizio ?? null;
}

/** La convocazione e' sempre 30 minuti prima dell'inizio del turno. */
const MINUTI_CONVOCAZIONE = 30;
const convocazione = (iso: string): string => new Date(new Date(iso).getTime() - MINUTI_CONVOCAZIONE * 60_000).toISOString();

const sessoTesto = (s: Sesso, singolare = false) =>
  singolare ? (s === "Male" ? t("maschio", "boy") : t("femmina", "girl")) : s === "Male" ? t("Maschi", "Boys") : t("Femmine", "Girls");
/** «2021-22» -> «2021–22». */
const fasciaTesto = (f: string) => f.replace("-", "–");

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
  testa: { flexDirection: "row", alignItems: "center", gap: spazio.tre },
  titoloRiga: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spazio.due },
  titolo: { fontFamily: F.extra, fontSize: 17, lineHeight: 22 },
  corpo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  nota: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  sopra: { fontFamily: F.extra, fontSize: 11, lineHeight: 15, letterSpacing: 0.8 },
  fila: { flexDirection: "row", gap: spazio.due },
  rigaIcona: { flexDirection: "row", alignItems: "center", gap: spazio.due },

  // Presentazione.
  fatto: { flex: 1, padding: spazio.tre, borderRadius: 14, gap: 2 },
  fattoValore: { fontFamily: F.extra, fontSize: 21, lineHeight: 26, fontVariant: ["tabular-nums"] },
  fattoTesto: { fontFamily: F.medio, fontSize: 12, lineHeight: 16 },
  punto: { flex: 1, alignItems: "center", paddingVertical: spazio.due + 2, borderRadius: 12, gap: 1 },
  puntoPos: { fontFamily: F.bold, fontSize: 11, lineHeight: 15 },
  puntoValore: { fontFamily: F.extra, fontSize: 17, lineHeight: 22, fontVariant: ["tabular-nums"] },

  // La carta di una gara.
  data: { width: 58, paddingVertical: 6, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dataSopra: { fontFamily: F.extra, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.8 },
  dataGiorno: { fontFamily: F.extra, fontSize: 24, lineHeight: 28, fontVariant: ["tabular-nums"] },
  turno: { padding: spazio.tre + 4, borderRadius: 20, borderWidth: 1.5, gap: 4, backgroundColor: "#17181B" },
  turnoTesta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  turnoEtichetta: { fontFamily: F.extra, fontSize: 11.5, lineHeight: 16, letterSpacing: 0.9, color: "rgba(255,255,255,0.7)" },
  turnoOre: { flexDirection: "row", alignItems: "flex-end", gap: spazio.tre },
  turnoOra: { flex: 1, gap: 2 },
  turnoOraEtichetta: { fontFamily: F.extra, fontSize: 11, lineHeight: 15, letterSpacing: 0.9, color: "rgba(255,255,255,0.7)" },
  turnoSepara: { width: 1, alignSelf: "stretch", marginVertical: 4, backgroundColor: "rgba(255,255,255,0.16)" },
  turnoCategoria: { fontFamily: F.bold, fontSize: 14, lineHeight: 20, color: "#FFFFFF" },
  turnoSotto: { fontFamily: F.medio, fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.72)" },
  prova: { flexDirection: "row", alignItems: "center", gap: spazio.tre, padding: spazio.tre, borderRadius: 16 },
  risultato: { padding: spazio.tre, borderRadius: 14, borderWidth: 1.5, gap: 2 },

  // I pulsanti del sesso, ciascuno con la sua ora.
  scelta: { flex: 1, minHeight: 68, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 14, borderWidth: 1.5, paddingVertical: spazio.due },
  sceltaOra: { flexDirection: "row", alignItems: "center", gap: 4 },
});
