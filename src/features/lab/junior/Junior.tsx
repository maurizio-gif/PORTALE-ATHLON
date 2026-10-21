import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  gruppiJunior,
  type EsitoGruppi,
  type NucleoJunior,
} from "@/api/junior";
import { spazio } from "@/theme";

import { inMemoria, prendi, ricorda, scorda } from "../memoria";
import {
  Avatar,
  Bollino,
  Carta,
  Etichetta,
  Messaggio,
  Pulsante,
  Riga,
  SchedeInArrivo,
  Sezione,
} from "../ui/kit";
import { Schermata } from "../ui/Schermata";
import { Tocco } from "../ui/Tocco";
import { F, usePalette, velo } from "../ui/tema";
import { vistaCorrente } from "../vista";
import {
  annateGruppo,
  annoDalNucleo,
  annoDi,
  annoIniziale,
  anniDisponibili,
  conPosto,
  descriviPersona,
  giorniDelAnno,
  gruppiDellAnno,
  personeDaMostrare,
  SIGLE_GIORNI,
  statoPosti,
  titoloGruppo,
} from "./comune";
import { FoglioComponente } from "./FoglioComponente";

// La sezione Junior (21/10/2026, richiesta di Maurizio): tutti i gruppi dei corsi per bambini e ragazzi attivi adesso
// (Scuola Nuoto mono e bisettimanale, Nuoto Agonistico e Propaganda, Pallanuoto), divisi per anno di nascita, con i
// posti che restano. Un gruppo che accoglie piu' anni («(2015-14-13)») compare sotto ognuno.
//
// In cima, **il nucleo** (21/10/2026): chi della famiglia puo' fare le attivita' junior (dai 3 mesi ai nati nell'anno piu'
// vecchio dei gruppi del Nuoto Agonistico: lo decide il database) e a quali gruppi e' iscritto; toccando una persona si apre
// il suo anno. Sotto, «Aggiungi un componente» (`FoglioComponente`): un figlio con tutti i dati, che la funzione controlla
// non sia gia' al club prima di crearlo su PerfectGym. In vista cliente il comando non c'e'.
//
// Ai gruppi da qui non ci si iscrive. I numeri sono quelli del mirror di PerfectGym (si aggiornano ogni
// pochi minuti), e l'ultima parola sui posti e' della segreteria al momento dell'iscrizione: la schermata lo dice.

export const CHIAVE_GRUPPI_JUNIOR = "junior:gruppi";

export function Junior() {
  const p = usePalette();
  const { anno: chiesto } = useLocalSearchParams<{ anno?: string }>();
  const [esito, setEsito] = useState<EsitoGruppi | undefined>(() =>
    inMemoria<EsitoGruppi>(CHIAVE_GRUPPI_JUNIOR),
  );
  const [anno, setAnno] = useState<number | null>(null);
  const [soloLiberi, setSoloLiberi] = useState(false);
  const [giorni, setGiorni] = useState<number[]>([]);
  const [foglio, setFoglio] = useState(false);
  const [aggiunto, setAggiunto] = useState<string | null>(null);
  const vista = !!vistaCorrente();

  const carica = useCallback(async () => {
    setEsito(await prendi(CHIAVE_GRUPPI_JUNIOR, gruppiJunior));
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);

  const gruppi = esito?.ok ? esito.gruppi : [];
  const anni = useMemo(() => anniDisponibili(gruppi), [gruppi]);
  const nucleo = esito?.ok ? esito.nucleo : null;
  const persone = personeDaMostrare(nucleo);
  const scelto =
    anno != null && anni.includes(anno)
      ? anno
      : annoIniziale(anni, chiesto ?? annoDalNucleo(nucleo, anni)?.toString());

  function dopoAggiunta(nome: string, n: NucleoJunior | null) {
    setFoglio(false);
    setAggiunto(`${nome} è nel tuo nucleo familiare.`);
    // L'area della Home ha il nucleo di prima: alla prossima apertura si rilegge.
    scorda("area");
    if (esito?.ok && n) {
      const nuovo: EsitoGruppi = { ...esito, nucleo: n };
      ricorda(CHIAVE_GRUPPI_JUNIOR, nuovo);
      setEsito(nuovo);
    } else carica();
  }
  // Solo i giorni che quell'anno ha davvero; i giorni scelti che non ci sono piu' (cambio d'anno) non contano.
  const giorniAnno = useMemo(
    () => (scelto == null ? [] : giorniDelAnno(gruppi, scelto)),
    [gruppi, scelto],
  );
  const giorniAttivi = giorni.filter((i) => giorniAnno.includes(i));
  const blocchi = useMemo(
    () =>
      scelto == null
        ? []
        : gruppiDellAnno(gruppi, scelto, soloLiberi, giorniAttivi),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gruppi, scelto, soloLiberi, giorniAttivi.join(",")],
  );
  function scegliGiorno(i: number) {
    setGiorni((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]));
  }

  const intestazione = {
    titolo: "Junior",
    sopratitolo: "Corsi per bambini e ragazzi",
    indietro: "/" as const,
    barra: false,
  };

  if (!esito) {
    return (
      <Schermata {...intestazione}>
        <SchedeInArrivo quante={3} />
      </Schermata>
    );
  }

  if (!esito.ok) {
    return (
      <Schermata {...intestazione}>
        <Messaggio>{esito.errore}</Messaggio>
        <Pulsante
          testo="Riprova"
          icona="aggiorna"
          variante="secondario"
          onPress={carica}
        />
      </Schermata>
    );
  }

  if (!anni.length) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo="Nessun gruppo attivo">
          In questo momento non ci sono gruppi dei corsi junior aperti.
        </Messaggio>
      </Schermata>
    );
  }

  return (
    <Schermata
      {...intestazione}
      sottotitolo="I gruppi attivi e i posti ancora liberi. Scegli l’anno di nascita."
    >
      {nucleo ? (
        <Sezione titolo="La tua famiglia">
          {persone.length ? (
            <Carta>
              {persone.map((x, i) => {
                const a = annoDi(x);
                const apre = x.idoneo && a != null && anni.includes(a);
                return (
                  <Riga
                    key={x.member_id}
                    prima={i === 0}
                    testa={
                      <Avatar nome={x.nome} cognome={x.cognome} size={40} />
                    }
                    titolo={
                      [x.nome, x.cognome].filter(Boolean).join(" ") ||
                      "Senza nome"
                    }
                    sotto={descriviPersona(x)}
                    coda={
                      apre ? (
                        <Etichetta
                          testo={a === scelto ? "Il suo anno" : "Vedi i gruppi"}
                          tono={a === scelto ? "accento" : "neutro"}
                        />
                      ) : !x.idoneo ? (
                        <Etichetta testo="Non ancora" tono="neutro" />
                      ) : undefined
                    }
                    onPress={apre ? () => setAnno(a) : undefined}
                  />
                );
              })}
            </Carta>
          ) : (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              Nel tuo nucleo familiare non c’è nessuno in età per i corsi junior
              (dai {nucleo.mesi_minimi} mesi ai nati nel {nucleo.anno_minimo}).
            </Text>
          )}
          {aggiunto ? <Messaggio tono="ok">{aggiunto}</Messaggio> : null}
          {!vista ? (
            <Pulsante
              testo="Aggiungi un componente"
              icona="aggiungi"
              variante="secondario"
              onPress={() => {
                setAggiunto(null);
                setFoglio(true);
              }}
            />
          ) : null}
        </Sezione>
      ) : null}

      <View style={{ gap: spazio.due }}>
        <Text
          style={[stili.filtriTitolo, { color: p.testoSecondario }]}
          accessibilityRole="header"
        >
          Anno di nascita
        </Text>
        <View style={stili.tessere}>
          {anni.map((a) => {
            const attivo = a === scelto;
            const n = conPosto(gruppi, a);
            return (
              <Tocco
                key={a}
                vibra="scelta"
                stato={{ selected: attivo }}
                onPress={() => setAnno(a)}
                etichetta={`Nati nel ${a}, ${n} ${n === 1 ? "gruppo" : "gruppi"} con posti liberi`}
                style={[
                  stili.tessera,
                  {
                    backgroundColor: attivo
                      ? velo(p, "accento", p.scuro ? 0.16 : 0.1)
                      : p.carta,
                    borderColor: attivo ? p.accento : p.linea,
                    borderWidth: attivo ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    stili.anno,
                    {
                      color: n ? p.testo : p.testoTerzo,
                      fontFamily: attivo ? F.extra : F.bold,
                    },
                  ]}
                >
                  {a}
                </Text>
              </Tocco>
            );
          })}
        </View>
        {giorniAnno.length ? (
          <>
            <Text
              style={[stili.filtriTitolo, { color: p.testoSecondario }]}
              accessibilityRole="header"
            >
              Giorno della settimana
            </Text>
            <View style={stili.tessere}>
              <Tocco
                vibra="scelta"
                stato={{ selected: !giorniAttivi.length }}
                onPress={() => setGiorni([])}
                etichetta="Tutti i giorni"
                style={[
                  stili.giorno,
                  stili.giornoTutti,
                  {
                    backgroundColor: !giorniAttivi.length
                      ? velo(p, "accento", p.scuro ? 0.16 : 0.1)
                      : p.carta,
                    borderColor: !giorniAttivi.length ? p.accento : p.linea,
                  },
                ]}
              >
                <Text
                  style={[
                    stili.giornoTesto,
                    {
                      color: p.testo,
                      fontFamily: !giorniAttivi.length ? F.extra : F.bold,
                    },
                  ]}
                >
                  Tutti
                </Text>
              </Tocco>
              {giorniAnno.map((i) => {
                const on = giorniAttivi.includes(i);
                return (
                  <Tocco
                    key={i}
                    vibra="scelta"
                    stato={{ selected: on }}
                    onPress={() => scegliGiorno(i)}
                    etichetta={SIGLE_GIORNI[i]}
                    style={[
                      stili.giorno,
                      {
                        backgroundColor: on
                          ? velo(p, "accento", p.scuro ? 0.16 : 0.1)
                          : p.carta,
                        borderColor: on ? p.accento : p.linea,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        stili.giornoTesto,
                        {
                          color: p.testo,
                          fontFamily: on ? F.extra : F.bold,
                        },
                      ]}
                    >
                      {SIGLE_GIORNI[i]}
                    </Text>
                  </Tocco>
                );
              })}
            </View>
          </>
        ) : null}
        <Tocco
          vibra="scelta"
          stato={{ selected: soloLiberi }}
          onPress={() => setSoloLiberi((v) => !v)}
          etichetta="Mostra solo i gruppi con posti liberi"
          style={[
            stili.interruttore,
            {
              backgroundColor: soloLiberi
                ? velo(p, "accento", p.scuro ? 0.16 : 0.1)
                : p.carta,
              borderColor: soloLiberi ? p.accento : p.linea,
            },
          ]}
        >
          <View
            style={[
              stili.casella,
              {
                borderColor: soloLiberi ? p.accento : p.testoTerzo,
                backgroundColor: soloLiberi ? p.accento : "transparent",
              },
            ]}
          >
            {soloLiberi ? <Text style={stili.spunta}>✓</Text> : null}
          </View>
          <Text style={{ color: p.testo, fontFamily: F.semi, fontSize: 14 }}>
            Solo i gruppi con posti liberi
          </Text>
        </Tocco>
      </View>

      {blocchi.length ? (
        blocchi.map((b) => (
          <Sezione key={b.corso} titolo={b.corso}>
            <Carta>
              {b.gruppi.map((g, i) => {
                const s = statoPosti(g);
                return (
                  <Riga
                    key={g.id}
                    prima={i === 0}
                    testa={
                      <Bollino
                        icona="goccia"
                        tono={s.tono === "neutro" ? "neutro" : "blu"}
                        size={40}
                      />
                    }
                    titolo={titoloGruppo(g)}
                    sotto={
                      g.posti != null
                        ? `${annateGruppo(g)} · ${g.iscritti} su ${g.posti} iscritti`
                        : annateGruppo(g)
                    }
                    coda={<Etichetta testo={s.testo} tono={s.tono} />}
                  />
                );
              })}
            </Carta>
          </Sezione>
        ))
      ) : (
        <Messaggio
          tono="attenzione"
          titolo={`Nessun gruppo per i nati nel ${scelto}`}
        >
          {soloLiberi && !giorniAttivi.length
            ? "Tutti i gruppi di quest’anno sono al completo. Togli il filtro per vederli, o chiedi in segreteria."
            : "Con questi filtri non c’è nessun gruppo. Prova a togliere un giorno o i posti liberi."}
        </Messaggio>
      )}

      <Text style={[stili.nota, { color: p.testoTerzo }]}>
        I posti sono quelli del gestionale del club e si aggiornano ogni pochi
        minuti: al momento dell’iscrizione la segreteria ti conferma quello che
        c’è davvero.
      </Text>

      {!vista ? (
        <FoglioComponente
          aperto={foglio}
          onChiudi={() => setFoglio(false)}
          onAggiunto={dopoAggiunta}
        />
      ) : null}
    </Schermata>
  );
}

const stili = StyleSheet.create({
  filtriTitolo: {
    fontSize: 13,
    fontFamily: F.extra,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: 2,
  },
  tessere: { flexDirection: "row", flexWrap: "wrap", gap: spazio.due },
  // Sedici anni in poche righe su un telefono: tessere piccole col solo anno. Un anno senza posti e' piu' chiaro.
  tessera: {
    flexGrow: 1,
    flexBasis: 58,
    maxWidth: 110,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  anno: {
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  giorno: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  giornoTutti: { paddingHorizontal: 16 },
  giornoTesto: { fontSize: 14, lineHeight: 18 },
  interruttore: {
    flexDirection: "row",
    alignItems: "center",
    gap: spazio.due,
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: spazio.tre,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  casella: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  spunta: { color: "#fff", fontSize: 13, fontFamily: F.extra, lineHeight: 15 },
  nota: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: F.medio,
    paddingHorizontal: 2,
  },
});
