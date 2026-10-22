import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  gruppiJunior,
  type EsitoGruppi,
  type GruppoJunior,
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
import { Foglio } from "../ui/Foglio";
import { Schermata } from "../ui/Schermata";
import { Tocco } from "../ui/Tocco";
import { F, usePalette, velo } from "../ui/tema";
import { vistaCorrente } from "../vista";
import {
  annateGruppo,
  annoDalNucleo,
  annoDi,
  annoIniziale,
  calendarioGruppo,
  chiPuoIscriversi,
  anniDisponibili,
  conPosto,
  descriviPersona,
  eBaby,
  giorniDelAnno,
  gruppiDellAnno,
  personeDaMostrare,
  SIGLE_GIORNI,
  statoPosti,
  titoloGruppo,
} from "./comune";
import { attivitaDiPersona } from "./attivita";
import { CambioOrario } from "./CambioOrario";
import { ComeFunziona } from "./ComeFunziona";
import { CorsiPersona } from "./Corsi";
import { DirettoreTecnico } from "./DirettoreTecnico";
import { FoglioComponente } from "./FoglioComponente";
import { FoglioLivelli } from "./FoglioLivelli";
import { TestataJunior } from "./Presentazione";
import { SchedaAttivita } from "./SchedaAttivita";

// La sezione Junior (21/10/2026, richiesta di Maurizio): tutti i gruppi dei corsi per bambini e ragazzi attivi adesso
// (Scuola Nuoto mono e bisettimanale, Nuoto Agonistico e Propaganda, Pallanuoto), divisi per anno di nascita, con i
// posti che restano. Un gruppo che accoglie piu' anni («(2015-14-13)») compare sotto ognuno.
//
// In cima, **il nucleo** (21/10/2026): chi della famiglia puo' fare le attivita' junior (dai 3 mesi ai nati nell'anno piu'
// vecchio dei gruppi del Nuoto Agonistico: lo decide il database) e a quali gruppi e' iscritto; toccando una persona si apre
// il suo anno. Sotto, «Aggiungi un componente» (`FoglioComponente`): un figlio con tutti i dati, che la funzione controlla
// non sia gia' al club prima di crearlo su PerfectGym. In vista cliente il comando non c'e'.
//
// **Sotto le anagrafiche, i corsi della persona scelta** (22/10/2026, `CorsiPersona`): se e' iscritta a un gruppo, l'abbonamento
// con tutti i suoi dati, i conteggi delle lezioni disdette e recuperate, le prossime lezioni (con «Disdici») e il calendario dei
// recuperi; se e' in eta' per il Baby Nuoto, l'abbonamento o le due strade (lezione singola, mensile) e il calendario delle
// lezioni. I gruppi con l'anno di nascita restano per chi non e' ancora iscritto e non e' in eta' per il Baby Nuoto (e, con
// il «Cambio orario», per chi e' gia' iscritto: solo turni dello stesso tipo).
//
// Ai gruppi da qui ci si iscrive toccando un turno con posti (`/iscrizione`). I numeri sono quelli del mirror di PerfectGym (si aggiornano ogni
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
  const [storiaLivelli, setStoriaLivelli] = useState(false);
  const [daIscrivere, setDaIscrivere] = useState<GruppoJunior | null>(null);
  const [aggiunto, setAggiunto] = useState<string | null>(null);
  const [personaScelta, setPersonaScelta] = useState<number | null>(null);
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
  // La persona di cui si vedono i corsi: quella toccata, se c'e' ancora; se no la prima in eta' per i corsi.
  const idonee = persone.filter((x) => x.idoneo);
  const persona =
    idonee.find((x) => x.member_id === personaScelta) ?? idonee[0] ?? null;
  const personaBaby = !!persona && eBaby(persona.data_nascita);
  const personaIscritta = !!persona && persona.gruppi.length > 0;
  // I gruppi da cui scegliere servono a chi non ha ancora un corso: non a un lattante (c'e' il Baby Nuoto) e non a chi e'
  // gia' iscritto (ha il suo abbonamento sopra), salvo che li chieda.
  const mostraGruppi =
    !persona || (!personaBaby && !personaIscritta);
  // Con una persona scelta l'anno e' il suo: non si sceglie (si vedono solo i gruppi per i suoi anni). Le tessere restano
  // solo se non si sa chi e', o se il suo anno non ha nessun gruppo.
  const annoPersona = persona ? annoDi(persona) : null;
  const annoFisso = annoPersona != null && anni.includes(annoPersona) ? annoPersona : null;
  const scelto =
    annoFisso != null
      ? annoFisso
      : anno != null && anni.includes(anno)
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
  // Solo i giorni che quell'anno ha davvero; i giorni scelti che non ci sono piu' (cambio d'anno) non contano.
  const giorniAnno = useMemo(
    () => (scelto == null ? [] : giorniDelAnno(gruppi, scelto)),
    [gruppi, scelto],
  );
  const giorniAttivi = giorni.filter((i) => giorniAnno.includes(i));
  function iscrivi(g: GruppoJunior, membro: number) {
    setDaIscrivere(null);
    router.navigate({
      pathname: "/iscrizione",
      params: { group: g.id, membro: String(membro) },
    });
  }
  function tocca(g: GruppoJunior) {
    const chi = chiPuoIscriversi(nucleo, g);
    if (chi.length === 1) iscrivi(g, chi[0].member_id);
    else if (chi.length > 1) setDaIscrivere(g);
  }
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
      sottotitolo={
        mostraGruppi
          ? t("I gruppi attivi e i posti ancora liberi.", "Active groups and spots still available.")
          : t(`I corsi di ${persona?.nome ?? "chi hai scelto"}: abbonamento, lezioni e recuperi.`, `${persona?.nome ?? "The person you chose"}’s courses: membership, classes and make-ups.`)
      }
    >
      <TestataJunior nome={persona?.nome} />
      {nucleo ? (
        <Sezione titolo={t("La tua famiglia", "Your family")}>
          {persone.length ? (
            <Carta>
              {persone.map((x, i) => {
                const a = annoDi(x);
                const apre = x.idoneo && a != null && anni.includes(a);
                const sel = x.member_id === persona?.member_id;
                return (
                  <View
                    key={x.member_id}
                    style={
                      sel
                        ? [
                            stili.scelta,
                            {
                              backgroundColor: velo(
                                p,
                                "accento",
                                p.scuro ? 0.18 : 0.1,
                              ),
                              borderColor: p.accento,
                            },
                          ]
                        : undefined
                    }
                  >
                    <Riga
                      prima={i === 0 || sel}
                      testa={
                        <View
                          style={[
                            stili.avatarAnello,
                            { borderColor: sel ? p.accento : "transparent" },
                          ]}
                        >
                          <Avatar nome={x.nome} cognome={x.cognome} size={40} />
                        </View>
                      }
                      titolo={
                        ([x.nome, x.cognome].filter(Boolean).join(" ") ||
                          t("Senza nome", "No name")) +
                        (x.livello ? ` · ${x.livello}` : "")
                      }
                      sotto={descriviPersona(x)}
                      coda={
                        x.idoneo ? (
                          <Etichetta
                            icona={sel ? "spunta" : undefined}
                            grande={sel}
                            testo={sel ? t("Scelto", "Selected") : t("Vedi i corsi", "See courses")}
                            tono={
                              x.member_id === persona?.member_id
                                ? "accento"
                                : "neutro"
                            }
                          />
                        ) : (
                          <Etichetta testo={t("Non ancora", "Not yet")} tono="neutro" />
                        )
                      }
                      onPress={
                        x.idoneo
                          ? () => {
                              setPersonaScelta(x.member_id);
                              if (apre) setAnno(a);
                            }
                          : undefined
                      }
                    />
                  </View>
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

      {persona?.livello ? (
        <Carta>
          <Riga
            prima
            icona="stella"
            titolo={t("Livello", "Level")}
            sotto={persona.livello}
            coda={<Etichetta testo={t("Storia", "History")} tono="neutro" />}
            onPress={() => setStoriaLivelli(true)}
          />
        </Carta>
      ) : null}

      {persona ? <CorsiPersona persona={persona} vista={vista} /> : null}
      {persona && persona.minorenne && persona.gruppi.length > 0 ? (
        <DirettoreTecnico persona={persona} vista={vista} />
      ) : null}
      <FoglioLivelli
        persona={persona}
        aperto={storiaLivelli}
        onChiudi={() => setStoriaLivelli(false)}
      />

      {persona ? (
        <SchedaAttivita
          key={persona.member_id}
          chiavi={attivitaDiPersona(persona)}
          nome={persona.nome}
        />
      ) : null}

      <ComeFunziona />

      {mostraGruppi ? (
        <>
          <View style={{ gap: spazio.due }}>
            {annoFisso != null && persona ? (
              <Text
                style={[stili.filtriTitolo, { color: p.testoSecondario }]}
                accessibilityRole="header"
              >
                {t(
                  `Le nostre attività per ${persona.nome ?? "chi hai scelto"} · nato nel ${annoFisso}`,
                  `Our activities for ${persona.nome ?? "the person you chose"} · born in ${annoFisso}`,
                )}
              </Text>
            ) : null}
            {annoFisso != null && persona ? (
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t("La pallanuoto è solo maschile.", "Water polo is boys only.")}
              </Text>
            ) : (
              <>
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
              </>
            )}
            {giorniAnno.length ? (
              <>
                <Text
                  style={[stili.filtriTitolo, { color: p.testoSecondario }]}
                  accessibilityRole="header"
                >
                  {t("Giorno della settimana", "Day of the week")}
                </Text>
                <View style={stili.tessere}>
                  <Tocco
                    vibra="scelta"
                    stato={{ selected: !giorniAttivi.length }}
                    onPress={() => setGiorni([])}
                    etichetta={t("Tutti i giorni", "Every day")}
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
                      {t("Tutti", "All")}
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
              <Text
                style={{ color: p.testo, fontFamily: F.semi, fontSize: 14 }}
              >
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
                    const chi = vista ? [] : chiPuoIscriversi(nucleo, g);
                    return (
                      <View key={g.id}>
                      <Riga
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
                          (calendarioGruppo(g) ? calendarioGruppo(g) + "\n" : "") +
                          annateGruppo(g)
                        }
                        coda={<Etichetta testo={s.testo} tono={s.tono} />}
                        onPress={chi.length ? () => tocca(g) : undefined}
                      />
                      {chi.length ? (
                        <View style={{ paddingHorizontal: spazio.due, paddingBottom: spazio.due }}>
                          <Pulsante
                            testo={t("Scopri le modalità di iscrizione e iscriviti", "See how to enroll, and enroll")}
                            onPress={() => tocca(g)}
                          />
                        </View>
                      ) : null}
                      </View>
                    );
                  })}
                </Carta>
              </Sezione>
            ))
          ) : (
            <Messaggio
              tono="attenzione"
              titolo={t(`Nessun gruppo per i nati nel ${scelto}`, `No groups for those born in ${scelto}`)}
            >
              {soloLiberi && !giorniAttivi.length
                ? t("Tutti i gruppi di quest’anno sono al completo. Togli il filtro per vederli, o chiedi in segreteria.", "All groups for this year are full. Remove the filter to see them, or ask at the front desk.")
                : t("Con questi filtri non c’è nessun gruppo. Prova a togliere un giorno o i posti liberi.", "No groups match these filters. Try removing a day or the available-spots filter.")}
            </Messaggio>
          )}

          <Text style={[stili.nota, { color: p.testoTerzo }]}>
            {t("I posti sono quelli del gestionale del club e si aggiornano ogni pochi minuti: al momento dell’iscrizione la segreteria ti conferma quello che c’è davvero.", "Spots come from the club’s management system and update every few minutes: when you enroll, the front desk confirms what’s actually available.")}
          </Text>
        </>
      ) : personaIscritta && persona && !personaBaby ? (
        <CambioOrario persona={persona} gruppi={gruppi} vista={vista} />
      ) : null}

      <Foglio
        aperto={!!daIscrivere}
        titolo={t("Chi vuoi iscrivere?", "Who do you want to enroll?")}
        sottotitolo={daIscrivere ? titoloGruppo(daIscrivere) : undefined}
        onChiudi={() => setDaIscrivere(null)}
      >
        <Carta>
          {daIscrivere
            ? chiPuoIscriversi(nucleo, daIscrivere).map((x, i) => (
                <Riga
                  key={x.member_id}
                  prima={i === 0}
                  testa={<Avatar nome={x.nome} cognome={x.cognome} size={40} />}
                  titolo={
                    [x.nome, x.cognome].filter(Boolean).join(" ") ||
                    t("Senza nome", "No name")
                  }
                  sotto={descriviPersona(x)}
                  onPress={() => iscrivi(daIscrivere, x.member_id)}
                />
              ))
            : null}
        </Carta>
      </Foglio>

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
  // La persona scelta: sfondo e bordo nell'arancio del club, e l'anello intorno all'avatar.
  scelta: {
    borderRadius: 18,
    borderWidth: 2,
    marginHorizontal: -2,
    overflow: "hidden",
  },
  avatarAnello: {
    padding: 2,
    borderRadius: 18,
    borderWidth: 2,
  },
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
