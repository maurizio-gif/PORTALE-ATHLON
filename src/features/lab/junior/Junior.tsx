import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  gruppiJunior,
  type EsitoGruppi,
  type NucleoJunior,
} from "@/api/junior";
import { t } from "@/lib/lingua";
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
  gruppiDellAnno,
  personeDaMostrare,
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
    setAggiunto(t(`${nome} è nel tuo nucleo familiare.`, `${nome} is now in your family members.`));
    // L'area della Home ha il nucleo di prima: alla prossima apertura si rilegge.
    scorda("area");
    if (esito?.ok && n) {
      const nuovo: EsitoGruppi = { ...esito, nucleo: n };
      ricorda(CHIAVE_GRUPPI_JUNIOR, nuovo);
      setEsito(nuovo);
    } else carica();
  }
  const blocchi = useMemo(
    () => (scelto == null ? [] : gruppiDellAnno(gruppi, scelto, soloLiberi)),
    [gruppi, scelto, soloLiberi],
  );

  const intestazione = {
    titolo: "Junior",
    sopratitolo: t("Corsi per bambini e ragazzi", "Courses for kids and teens"),
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
          testo={t("Riprova", "Try again")}
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
        <Messaggio tono="attenzione" titolo={t("Nessun gruppo attivo", "No active groups")}>
          {t("In questo momento non ci sono gruppi dei corsi junior aperti.", "There are no junior course groups open right now.")}
        </Messaggio>
      </Schermata>
    );
  }

  return (
    <Schermata
      {...intestazione}
      sottotitolo={t("I gruppi attivi e i posti ancora liberi. Scegli l’anno di nascita.", "Active groups and spots still available. Choose the birth year.")}
    >
      {nucleo ? (
        <Sezione titolo={t("La tua famiglia", "Your family")}>
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
                      t("Senza nome", "No name")
                    }
                    sotto={descriviPersona(x)}
                    coda={
                      apre ? (
                        <Etichetta
                          testo={a === scelto ? t("Il suo anno", "Their year") : t("Vedi i gruppi", "See groups")}
                          tono={a === scelto ? "accento" : "neutro"}
                        />
                      ) : !x.idoneo ? (
                        <Etichetta testo={t("Non ancora", "Not yet")} tono="neutro" />
                      ) : undefined
                    }
                    onPress={apre ? () => setAnno(a) : undefined}
                  />
                );
              })}
            </Carta>
          ) : (
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(`Nel tuo nucleo familiare non c’è nessuno in età per i corsi junior (dai ${nucleo.mesi_minimi} mesi ai nati nel ${nucleo.anno_minimo}).`, `No one in your family is the right age for junior courses (from ${nucleo.mesi_minimi} months old to those born in ${nucleo.anno_minimo}).`)}
            </Text>
          )}
          {aggiunto ? <Messaggio tono="ok">{aggiunto}</Messaggio> : null}
          {!vista ? (
            <Pulsante
              testo={t("Aggiungi un componente", "Add a family member")}
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
          {t("Anno di nascita", "Birth year")}
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
                etichetta={t(`Nati nel ${a}, ${n} ${n === 1 ? "gruppo" : "gruppi"} con posti liberi`, `Born in ${a}, ${n} ${n === 1 ? "group" : "groups"} with spots available`)}
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
        <Tocco
          vibra="scelta"
          stato={{ selected: soloLiberi }}
          onPress={() => setSoloLiberi((v) => !v)}
          etichetta={t("Mostra solo i gruppi con posti liberi", "Show only groups with spots available")}
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
            {t("Solo i gruppi con posti liberi", "Only groups with spots available")}
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
                        ? t(`${annateGruppo(g)} · ${g.iscritti} su ${g.posti} iscritti`, `${annateGruppo(g)} · ${g.iscritti} of ${g.posti} enrolled`)
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
          titolo={t(`Nessun posto libero per i nati nel ${scelto}`, `No spots available for those born in ${scelto}`)}
        >
          {t("Tutti i gruppi di quest’anno sono al completo. Togli il filtro per vederli, o chiedi in segreteria.", "All groups for this year are full. Remove the filter to see them, or ask at the front desk.")}
        </Messaggio>
      )}

      <Text style={[stili.nota, { color: p.testoTerzo }]}>
        {t("I posti sono quelli del gestionale del club e si aggiornano ogni pochi minuti: al momento dell’iscrizione la segreteria ti conferma quello che c’è davvero.", "Spots come from the club’s management system and update every few minutes: when you enroll, the front desk confirms what’s actually available.")}
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
