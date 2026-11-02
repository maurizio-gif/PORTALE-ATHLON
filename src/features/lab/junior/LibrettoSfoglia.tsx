import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import type { PersonaJunior } from "@/api/junior";
import { locale, t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Foglio } from "../ui/Foglio";
import { Icona } from "../ui/Icona";
import { Messaggio, Pulsante } from "../ui/kit";
import { F, usePalette } from "../ui/tema";
import { Tocco } from "../ui/Tocco";
import { conseguiti, LIVELLI, NOMI_CICLO, nomeLivello, nomeSpecie, type LivelloBrevetto } from "./datiBrevetti";
import { datiLibretto, stampaLibretto } from "./esportaLibretto";
import { InvitoFoto, useFotoBambino } from "./FotoBambino";
import { LOGO_SCUOLA_NUOTO, personaggioDi } from "./personaggiBrevetti";

// Il libretto dei brevetti da sfogliare (02/11/2026, richiesta di Maurizio): lo stesso libretto del club, in pagine che si scorrono col dito (o con le frecce) e
// si scaricano in PDF. Copertina, «Il brevetto», **una pagina per ognuno dei dodici livelli** (il personaggio, «Brevetto conseguito» o «Da conseguire», le prove con
// la spunta, il programma) e la pagina finale. I livelli sono progressivi: quelli fino al livello di adesso sono conseguiti. Il PDF e' lo stesso libretto in pagine A5
// (`documentoLibretto.ts`). Le pagine sono su carta chiara in ogni tema, come il libretto stampato.

const CARTA = "#FFFFFF";
const INCHIOSTRO = "#231F20";
const ARANCIO = "#FF5500";
const LILLA = "#EDE6F0";
const GRIGIO = "#5A6380";

/** Le fasce della copertina del libretto del club: in alto nera sopra e arancio sotto, in basso arancio sopra e nera sotto. */
function Fasce() {
  return (
    <>
      <View style={[stili.fascia, { top: 0 }]}>
        <View style={{ flex: 3, backgroundColor: INCHIOSTRO }} />
        <View style={{ flex: 2, backgroundColor: ARANCIO }} />
      </View>
      <View style={[stili.fascia, { bottom: 0 }]}>
        <View style={{ flex: 2, backgroundColor: ARANCIO }} />
        <View style={{ flex: 3, backgroundColor: INCHIOSTRO }} />
      </View>
    </>
  );
}

function Copertina({ nome, foto, onFoto }: { nome: string; foto: string | null; onFoto?: () => void }) {
  return (
    <View style={[stili.pagina, { alignItems: "center", justifyContent: "center", gap: spazio.tre }]}>
      <Fasce />
      <Image source={LOGO_SCUOLA_NUOTO} style={{ width: 210, height: 52 }} contentFit="contain" accessibilityLabel="Athlon 4.0" />
      <Text style={{ color: ARANCIO, fontFamily: F.extra, fontSize: 26, letterSpacing: 1 }}>{t("SCUOLA NUOTO", "SWIM SCHOOL")}</Text>
      {foto ? (
        <Image source={{ uri: foto }} style={stili.fotoCopertina} contentFit="cover" />
      ) : (
        // Senza foto la copertina la chiede: il cerchio vuoto si tocca e apre la scelta (richiesta di Maurizio: la foto deve esserci).
        <Tocco etichetta={t("Aggiungi la foto", "Add the photo")} onPress={onFoto} style={[stili.fotoCopertina, stili.fotoVuota]}>
          <Icona nome="fotocamera" size={30} colore={ARANCIO} />
          <Text style={{ color: ARANCIO, fontFamily: F.extra, fontSize: 11, textAlign: "center" }}>{t("Aggiungi\nla foto", "Add\nthe photo")}</Text>
        </Tocco>
      )}
      <Text style={{ color: INCHIOSTRO, fontFamily: F.extra, fontSize: 11, letterSpacing: 0.8 }}>{t("QUESTO È IL LIBRETTO DI", "THIS IS THE BOOKLET OF")}</Text>
      <View style={stili.nomeCasella}>
        <Text style={{ color: INCHIOSTRO, fontFamily: F.extra, fontSize: 20, textAlign: "center" }} numberOfLines={2}>
          {nome}
        </Text>
      </View>
      <Text style={{ color: INCHIOSTRO, fontFamily: F.semi, fontSize: 11, textAlign: "center", marginTop: spazio.tre }}>{"Athlon Club\nRoma – Via Ugo Ojetti, 134"}</Text>
    </View>
  );
}

function Introduzione({ nome, fatti }: { nome: string; fatti: number }) {
  return (
    <View style={[stili.pagina, { gap: spazio.tre }]}>
      <Text style={stili.titolo}>{t("Il brevetto", "The badge")}</Text>
      <Text style={stili.corpo}>
        {t(
          "Il brevetto è il libretto che attesta il grado di apprendimento raggiunto: gli elementi tecnici che permettono di nuotare i vari stili, dorso, stile libero, rana e delfino. È composto di diversi livelli, che si conquistano uno dopo l’altro (generalmente se ne acquisiscono due l’anno).",
          "The badge booklet records the level of learning reached: the technical elements that allow swimming the different strokes, backstroke, freestyle, breaststroke and butterfly. It is made of several levels, earned one after the other (usually two a year).",
        )}
      </Text>
      {(["pre", "mini", "brevetti"] as const).map((c) => {
        const n = NOMI_CICLO[c]();
        return (
          <View key={c} style={stili.ciclo}>
            <Text style={{ color: ARANCIO, fontFamily: F.extra, fontSize: 14 }}>{n.titolo}</Text>
            <Text style={[stili.corpo, { fontSize: 13 }]}>
              {LIVELLI.filter((l) => l.ciclo === c)
                .map((l) => `${nomeLivello(l)} (${l.codice})`)
                .join(" · ")}
            </Text>
          </View>
        );
      })}
      <Text style={[stili.corpo, { fontSize: 13 }]}>
        {t(
          "La Commissione esaminatrice è composta da due insegnanti ed è presieduta dal Direttore Tecnico. Il giudizio è: sufficiente, buono, ottimo, oppure da migliorare. L’iscrizione all’esame di brevetto è gratuita.",
          "The examining board is made of two teachers and chaired by the Technical Director. The judgement is: sufficient, good, excellent, or to be improved. Registration for the badge exam is free.",
        )}
      </Text>
      <Text style={[stili.corpo, { fontFamily: F.bold }]}>{t(`${nome}: ${fatti} brevetti conseguiti su ${LIVELLI.length}`, `${nome}: ${fatti} of ${LIVELLI.length} badges earned`)}</Text>
    </View>
  );
}

function PaginaLivello({ l, fatto }: { l: LivelloBrevetto; fatto: boolean }) {
  const img = personaggioDi(l.specie);
  return (
    <View style={[stili.pagina, { gap: spazio.due }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spazio.tre }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[stili.titolo, { marginBottom: 2 }]}>{nomeLivello(l)}</Text>
          <Text style={{ color: GRIGIO, fontFamily: F.bold, fontSize: 12 }}>
            {NOMI_CICLO[l.ciclo]().titolo}
            {l.ausili ? ` · ${t("con ausili didattici", "with learning aids")}` : ""}
          </Text>
        </View>
        <View style={stili.sigla}>
          <Text style={{ color: "#fff", fontFamily: F.extra, fontSize: 20 }}>{l.codice}</Text>
        </View>
      </View>
      {img ? <Image source={img} style={{ height: 120, width: "100%" }} contentFit="contain" accessibilityLabel={nomeSpecie(l.specie)} /> : null}
      <View style={{ alignItems: "center" }}>
        <View style={[stili.stato, { backgroundColor: fatto ? "#DDF4E4" : LILLA }]}>
          <Text style={{ color: fatto ? "#16803C" : GRIGIO, fontFamily: F.extra, fontSize: 12 }}>{fatto ? t("Brevetto conseguito", "Badge earned") : t("Da conseguire", "To be earned")}</Text>
        </View>
      </View>
      <Text style={stili.sezione}>{t("Le prove", "The tests")}</Text>
      {l.prove().map((x, i) => (
        <View key={i} style={stili.riga}>
          {fatto ? <Icona nome="spunta" size={15} colore="#16803C" /> : <View style={stili.cerchio} />}
          <Text style={[stili.corpo, { flex: 1, minWidth: 0 }]}>{x}</Text>
        </View>
      ))}
      <Text style={[stili.sezione, { marginTop: spazio.due }]}>{t("Il programma", "The programme")}</Text>
      {l.programma().map((x, i) => (
        <View key={i} style={stili.riga}>
          <Text style={{ color: ARANCIO, fontFamily: F.extra, fontSize: 14, width: 15, textAlign: "center" }}>•</Text>
          <Text style={[stili.corpo, { flex: 1, minWidth: 0, fontSize: 13, color: "#3F4660" }]}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

function Finale() {
  return (
    <View style={[stili.pagina, { alignItems: "center", justifyContent: "center", gap: spazio.tre }]}>
      <Fasce />
      <View style={{ height: 2, width: 140, backgroundColor: "#2B3350" }} />
      <Text style={[stili.corpo, { fontStyle: "italic", textAlign: "center", fontSize: 16, lineHeight: 26 }]}>
        {t("Ora che sei arrivato all’ultima pagina,\nsei veramente un buon nuotatore.", "Now that you have reached the last page,\nyou are truly a good swimmer.")}
        {"\n\n"}
        {t("Ricorda però di essere prudente.\nLa prudenza spesso è una prova di coraggio.", "But remember to be careful.\nCaution is often a proof of courage.")}
      </Text>
      <View style={{ height: 2, width: 140, backgroundColor: "#2B3350" }} />
    </View>
  );
}

export function FoglioLibretto({
  aperto,
  onChiudi,
  persona,
  vista,
  nome,
  codice,
}: {
  aperto: boolean;
  onChiudi: () => void;
  persona: PersonaJunior;
  vista: boolean;
  /** Nome e cognome del bambino. */
  nome: string;
  /** La sigla del livello di adesso. */
  codice: string;
}) {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const larghezza = Math.min(width, 560) - 40;
  const fatti = conseguiti(codice);
  const sigle = new Set(fatti.map((l) => l.codice));
  const scorri = useRef<ScrollView>(null);
  const [indice, setIndice] = useState(0);
  const statoFoto = useFotoBambino(aperto, persona, vista);
  const { foto } = statoFoto;
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  // Copertina, introduzione, i dodici livelli, pagina finale.
  const pagine = 2 + LIVELLI.length + 1;

  useEffect(() => {
    if (!aperto) return;
    setIndice(0);
    setErrore(null);
  }, [aperto]);

  const vai = (i: number) => {
    const n = Math.max(0, Math.min(pagine - 1, i));
    setIndice(n);
    scorri.current?.scrollTo({ x: n * larghezza, animated: true });
  };

  const scarica = async () => {
    setLavoro(true);
    setErrore(null);
    const data = new Date().toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });
    const r = await stampaLibretto(datiLibretto(nome, codice, foto, data));
    setLavoro(false);
    if (r === "errore") setErrore(t("Non siamo riusciti a preparare il PDF. Riprova.", "We couldn’t prepare the PDF. Please try again."));
  };

  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo={t("Il libretto dei brevetti", "The badge booklet")} sottotitolo={nome}>
      <View style={{ gap: spazio.tre }}>
        <InvitoFoto nome={persona.nome ?? t("il bambino", "your child")} stato={statoFoto} dove={t("Compare sulla copertina del libretto.", "It appears on the booklet cover.")} />
        <ScrollView
          ref={scorri}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / larghezza))}
          style={{ width: larghezza, alignSelf: "center" }}
        >
          <View style={{ width: larghezza }}>
            <Copertina nome={nome} foto={foto} onFoto={statoFoto.modificabile ? () => statoFoto.scegli("galleria") : undefined} />
          </View>
          <View style={{ width: larghezza }}>
            <Introduzione nome={nome} fatti={fatti.length} />
          </View>
          {LIVELLI.map((l) => (
            <View key={l.codice} style={{ width: larghezza }}>
              <PaginaLivello l={l} fatto={sigle.has(l.codice)} />
            </View>
          ))}
          <View style={{ width: larghezza }}>
            <Finale />
          </View>
        </ScrollView>

        <View style={stili.comandi}>
          <Tocco etichetta={t("Pagina precedente", "Previous page")} onPress={() => vai(indice - 1)} spento={indice === 0} style={[stili.freccia, { backgroundColor: p.incavo, opacity: indice === 0 ? 0.4 : 1 }]}>
            <Icona nome="indietro" size={18} colore={p.testo} />
          </Tocco>
          <Text style={{ color: p.testoSecondario, fontFamily: F.bold, fontSize: 13 }}>{t(`Pagina ${indice + 1} di ${pagine}`, `Page ${indice + 1} of ${pagine}`)}</Text>
          <Tocco etichetta={t("Pagina successiva", "Next page")} onPress={() => vai(indice + 1)} spento={indice === pagine - 1} style={[stili.freccia, { backgroundColor: p.incavo, opacity: indice === pagine - 1 ? 0.4 : 1 }]}>
            <Icona nome="avanti" size={18} colore={p.testo} />
          </Tocco>
        </View>

        {errore ? <Messaggio>{errore}</Messaggio> : null}
        <Pulsante testo={t("Scarica il PDF", "Download the PDF")} icona="scarica" inCorso={lavoro} onPress={scarica} />
        {!foto && statoFoto.modificabile ? (
          <Text style={{ color: p.accento, fontFamily: F.bold, fontSize: 13, lineHeight: 19 }}>
            {t("Senza la foto la copertina resta vuota: mettila qui sopra prima di scaricare il PDF.", "Without the photo the cover stays empty: add it above before downloading the PDF.")}
          </Text>
        ) : null}
        <Text style={{ color: p.testoTerzo, fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 }}>
          {t(
            "I livelli sono progressivi: quelli fino al brevetto di adesso risultano conseguiti. Giudizi, date e firme del libretto stampato non sono qui.",
            "Levels are progressive: those up to the current badge count as earned. The judgements, dates and signatures of the printed booklet aren’t here.",
          )}
        </Text>
      </View>
    </Foglio>
  );
}

const stili = StyleSheet.create({
  pagina: { backgroundColor: CARTA, borderRadius: 18, padding: 20, paddingTop: 34, paddingBottom: 34, minHeight: 520, overflow: "hidden", borderWidth: 1, borderColor: "#E6E1EA" },
  fascia: { position: "absolute", left: 0, right: 0, height: 14, flexDirection: "column" },
  titolo: { color: ARANCIO, fontFamily: F.extra, fontSize: 24, letterSpacing: -0.5 },
  corpo: { color: INCHIOSTRO, fontFamily: F.medio, fontSize: 14, lineHeight: 20 },
  sezione: { color: "#2B3350", fontFamily: F.extra, fontSize: 14 },
  riga: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  cerchio: { width: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: "#9A93B0", marginTop: 2 },
  sigla: { backgroundColor: ARANCIO, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  stato: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5 },
  ciclo: { backgroundColor: LILLA, borderRadius: 12, padding: 12, gap: 2 },
  nomeCasella: { width: "86%", borderWidth: 1.5, borderColor: ARANCIO, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 10 },
  fotoCopertina: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: ARANCIO },
  fotoVuota: { borderStyle: "dashed", backgroundColor: "#FFF3EA", alignItems: "center", justifyContent: "center", gap: 4 },
  comandi: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  freccia: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
