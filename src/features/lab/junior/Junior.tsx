import { router, useFocusEffect } from "expo-router";
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
  annoDi,
  calendarioGruppo,
  chiPuoIscriversi,
  anniDisponibili,
  descriviPersona,
  eBaby,
  giorniDelAnno,
  gruppiDellAnno,
  personeDaMostrare,
  SIGLE_GIORNI,
  statoPosti,
  quotaMensile,
  titoloGruppo,
} from "./comune";
import { attivitaDiPersona } from "./attivita";
import { CambioOrario } from "./CambioOrario";
import { CorsiPersona } from "./Corsi";
import { concludiInCorso, iscrizioniInCorso, type InCorso } from "./inCorso";
import { DirettoreTecnico } from "./DirettoreTecnico";
import { AggiungiComponente } from "../famiglia/AggiungiComponente";
import { FoglioLivelli } from "./FoglioLivelli";
import { TestataJunior } from "./Presentazione";
import { SchedaAttivita } from "./SchedaAttivita";

// La sezione Junior (21/10/2026, richiesta di Maurizio): tutti i gruppi dei corsi per bambini e ragazzi attivi adesso
// (Scuola Nuoto mono e bisettimanale, Nuoto Agonistico e Propaganda, Pallanuoto), divisi per anno di nascita, con i
// posti che restano. Un gruppo che accoglie piu' anni («(2015-14-13)») compare sotto ognuno.
//
// In cima, **il nucleo** (21/10/2026): chi della famiglia puo' fare le attivita' junior (dai 3 mesi ai nati nell'anno piu'
// vecchio dei gruppi del Nuoto Agonistico: lo decide il database) e a quali gruppi e' iscritto; toccando una persona si apre
// il suo anno. Sotto, «Aggiungi un componente» (`famiglia/AggiungiComponente`, lo stesso della Home): un figlio con tutti i dati
// (`FoglioComponente`: la funzione controlla che non sia gia' al club prima di crearlo su PerfectGym) oppure un altro adulto a cui dare
// la delega sui figli (`/delega`). In vista cliente il comando non c'e'.
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
  const [esito, setEsito] = useState<EsitoGruppi | undefined>(() =>
    inMemoria<EsitoGruppi>(CHIAVE_GRUPPI_JUNIOR),
  );
  const [soloLiberi, setSoloLiberi] = useState(false);
  const [giorni, setGiorni] = useState<number[]>([]);
  const [storiaLivelli, setStoriaLivelli] = useState(false);
  const [daIscrivere, setDaIscrivere] = useState<GruppoJunior | null>(null);
  const [aggiunto, setAggiunto] = useState<string | null>(null);
  const [personaScelta, setPersonaScelta] = useState<number | null>(null);
  const vista = !!vistaCorrente();

  const carica = useCallback(async () => {
    setEsito(await prendi(CHIAVE_GRUPPI_JUNIOR, gruppiJunior));
  }, []);
  // Ogni volta che la schermata torna in primo piano (dopo la firma o il pagamento) si rilegge: non resta quella di prima.
  useFocusEffect(
    useCallback(() => {
      carica();
    }, [carica]),
  );

  const gruppi = esito?.ok ? esito.gruppi : [];
  const anni = useMemo(() => anniDisponibili(gruppi), [gruppi]);
  const nucleoServer = esito?.ok ? esito.nucleo : null;
  // Un'iscrizione appena firmata che il mirror non ha ancora (`inCorso.ts`) si vede subito, e si rilegge finche' non arriva.
  const [giroInCorso, setGiroInCorso] = useState(0);
  const inCorso = useMemo(
    () => (nucleoServer ? daMostrare(nucleoServer, iscrizioniInCorso()) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nucleoServer, giroInCorso],
  );
  const nucleo = useMemo(() => conInCorso(nucleoServer, inCorso), [nucleoServer, inCorso]);
  useEffect(() => {
    if (!nucleoServer) return;
    // Il mirror l'ha vista: la voce provvisoria non serve piu'.
    for (const x of iscrizioniInCorso()) {
      const pers = nucleoServer.persone.find((q) => q.member_id === x.member_id);
      if (pers?.gruppi.some((g) => g.group_id === x.group_id)) {
        concludiInCorso(x.member_id, x.group_id);
        setGiroInCorso((n) => n + 1);
      }
    }
  }, [nucleoServer]);
  useEffect(() => {
    if (!inCorso.length) return;
    const id = setInterval(carica, 6000);
    return () => clearInterval(id);
  }, [inCorso.length, carica]);
  const persone = personeDaMostrare(nucleo);
  // La persona di cui si vedono i corsi: quella toccata, se c'e' ancora; se no la prima in eta' per i corsi.
  const idonee = persone.filter((x) => x.idoneo);
  const persona =
    idonee.find((x) => x.member_id === personaScelta) ?? idonee[0] ?? null;
  const personaBaby = !!persona && eBaby(persona.data_nascita);
  const personaIscritta = !!persona && persona.gruppi.length > 0;
  // **Senza un figlio registrato non si mostra nessun turno** (02/11/2026, richiesta di Maurizio): resta solo «Aggiungi un
  // componente», con la spiegazione di cosa succede dopo.
  const senzaFigli = !persona;
  // I gruppi da cui scegliere servono a chi non ha ancora un corso: non a un lattante (c'e' il Baby Nuoto) e non a chi e'
  // gia' iscritto (ha il suo abbonamento sopra), salvo che li chieda.
  const mostraGruppi = !!persona && !personaBaby && !personaIscritta;
  // L'anno e' quello della persona: non si sceglie, e si vedono solo i gruppi che lo accolgono. Se il suo anno non ha nessun
  // gruppo non si mostra altro (niente tessere degli altri anni).
  const annoPersona = persona ? annoDi(persona) : null;
  const annoFisso = annoPersona != null && anni.includes(annoPersona) ? annoPersona : null;
  const scelto = annoFisso;

  function dopoAggiunta(nome: string, n: NucleoJunior | null) {
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

  if (!anni.length && !senzaFigli) {
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
        senzaFigli
          ? t("Aggiungi un componente per vedere le attività.", "Add a family member to see the activities.")
          : mostraGruppi
          ? t("I gruppi attivi e i posti ancora liberi.", "Active groups and spots still available.")
          : t(`I corsi di ${persona?.nome ?? "chi hai scelto"}: abbonamento, lezioni e recuperi.`, `${persona?.nome ?? "The person you chose"}’s courses: membership, classes and make-ups.`)
      }
    >
      <TestataJunior nome={persona?.nome} />
      {nucleo || senzaFigli ? (
        <Sezione titolo={t("La tua famiglia", "Your family")}>
          {persone.length ? (
            <Carta>
              {persone.map((x, i) => {
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
                            }
                          : undefined
                      }
                    />
                  </View>
                );
              })}
            </Carta>
          ) : null}
          {senzaFigli ? (
            <Messaggio titolo={t("Aggiungi un figlio per vedere le attività", "Add a child to see the activities")}>
              {t(
                `Una volta inserito, qui vedrai tutte le attività disponibili per la sua età${nucleo ? ` (dai ${nucleo.mesi_minimi} mesi ai nati nel ${nucleo.anno_minimo})` : ""}, con i turni e le modalità di iscrizione.`,
                `Once you’ve added them, you’ll see here all the activities available for their age${nucleo ? ` (from ${nucleo.mesi_minimi} months old to those born in ${nucleo.anno_minimo})` : ""}, with the slots and how to enroll.`,
              )}
            </Messaggio>
          ) : null}
          {aggiunto ? <Messaggio tono="ok">{aggiunto}</Messaggio> : null}
          <AggiungiComponente onApri={() => setAggiunto(null)} onAggiunto={dopoAggiunta} />
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

      {persona ? (
        <CorsiPersona
          persona={persona}
          vista={vista}
          inCorso={inCorso.find((x) => x.member_id === persona.member_id)}
          onInCorsoFinito={() => setGiroInCorso((n) => n + 1)}
        />
      ) : null}
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

      {mostraGruppi && persona && annoFisso == null ? (
        <Messaggio
          tono="attenzione"
          titolo={t(
            `Nessun gruppo per i nati nel ${annoPersona ?? "?"}`,
            `No groups for those born in ${annoPersona ?? "?"}`,
          )}
        >
          {t(
            `Al momento non ci sono gruppi attivi per ${persona.nome ?? "chi hai scelto"}. Per altre informazioni chiedi in segreteria.`,
            `There are no active groups for ${persona.nome ?? "the person you chose"} right now. Ask at the front desk for more information.`,
          )}
        </Messaggio>
      ) : mostraGruppi && persona ? (
        <>
          <View style={{ gap: spazio.due }}>
            <Text
              style={[stili.filtriTitolo, { color: p.testoSecondario }]}
              accessibilityRole="header"
            >
              {t(
                `Le nostre attività per ${persona.nome ?? "chi hai scelto"} · nato nel ${annoFisso}`,
                `Our activities for ${persona.nome ?? "the person you chose"} · born in ${annoFisso}`,
              )}
            </Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t("La pallanuoto è solo maschile.", "Water polo is boys only.")}
            </Text>
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
                          <View style={{ gap: 6 }}>
                            <Text style={[stili.nota, { color: p.testoSecondario }]}>
                              {(calendarioGruppo(g) ? calendarioGruppo(g) + "\n" : "") +
                                annateGruppo(g)}
                            </Text>
                            {chi.length ? (
                              <Tocco
                                onPress={() => tocca(g)}
                                style={{ alignSelf: "flex-start", paddingVertical: 6 }}
                              >
                                <Text style={{ color: p.accento, fontFamily: F.semi, fontSize: 13.5 }}>
                                  {t("Iscriviti a questo turno →", "Enroll in this slot →")}
                                </Text>
                              </Tocco>
                            ) : null}
                          </View>
                        }
                        coda={
                          <View style={{ alignItems: "flex-end", gap: 6 }}>
                            <Etichetta testo={s.testo} tono={s.tono} />
                            {quotaMensile(g) ? (
                              <Etichetta testo={quotaMensile(g)!} tono="neutro" />
                            ) : null}
                          </View>
                        }
                      />
                    );
                  })}
                </Carta>
              </Sezione>
            ))
          ) : (
            <Messaggio
              tono="attenzione"
              titolo={t(`Nessun gruppo per i nati nel ${annoFisso}`, `No groups for those born in ${annoFisso}`)}
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

/** Le iscrizioni firmate che il mirror non ha ancora (la persona esiste nel nucleo e non ha ancora quel gruppo). */
function daMostrare(n: NucleoJunior, tutte: InCorso[]): InCorso[] {
  return tutte.filter((x) => {
    const pers = n.persone.find((q) => q.member_id === x.member_id);
    return !!pers && !pers.gruppi.some((g) => g.group_id === x.group_id);
  });
}

/** Il nucleo con, per chi ha un'iscrizione appena firmata, il gruppo gia' dentro: la sezione lo tratta da iscritto. */
function conInCorso(n: NucleoJunior | null, inCorso: InCorso[]): NucleoJunior | null {
  if (!n || !inCorso.length) return n;
  return {
    ...n,
    persone: n.persone.map((q) => {
      const x = inCorso.find((y) => y.member_id === q.member_id);
      return x ? { ...q, gruppi: [...q.gruppi, { group_id: x.group_id, nome: x.gruppo }] } : q;
    }),
  };
}
