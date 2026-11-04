import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  gruppiJunior,
  type EsitoGruppi,
  type GruppoJunior,
  type NucleoJunior,
  type PersonaJunior,
} from "@/api/junior";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { apriAssistente, impostaTemaJunior } from "../assistente/store";
import { inMemoria, prendi, ricorda, scorda } from "../memoria";
import { Etichetta, Messaggio, Pulsante, SchedeInArrivo } from "../ui/kit";
import { Schermata } from "../ui/Schermata";
import { F, usePalette } from "../ui/tema";
import { vistaCorrente } from "../vista";
import { annoDi, chiPuoIscriversi, eBaby, haBrevetti, nomeCompleto, nomeIscrizione, personeDaMostrare } from "./comune";
import { attivitaDiPersona } from "./attivita";
import { AttivitaDaScegliere } from "./AttivitaDaScegliere";
import { Brevetti } from "./Brevetti";
import { BrevettiChiusi } from "./BrevettiChiusi";
import { CambioOrario } from "./CambioOrario";
import { CorsiPersona, type ParteCorsi } from "./Corsi";
import { concludiInCorso, iscrizioniInCorso, type InCorso } from "./inCorso";
import { DirettoreTecnico } from "./DirettoreTecnico";
import { Gare } from "./Gare";
import { InvitoAbbonamentoAdulti } from "./InvitoAbbonamentoAdulti";
import { MenuIscritto, type VoceJunior } from "./MenuIscritto";
import { TestataJunior } from "./Presentazione";
import { SceltaFiglio } from "./SceltaFiglio";
import { SchedaAttivita } from "./SchedaAttivita";
import { chiudiCoda, codaIscrizioni, iniziaCoda, type VoceCoda } from "./codaIscrizioni";
import { CodaIscrizioniCarta, InvitoAltroFiglio, mostraInvitoAltroFiglio } from "./PiuFigli";
import { mostraTurniVicini, TurniVicini } from "./TurniVicini";

// La sezione Junior (21/10/2026, richiesta di Maurizio): i corsi per bambini e ragazzi (Scuola Nuoto mono e bisettimanale, Nuoto
// Agonistico e Propaganda, Pallanuoto, Baby Nuoto) con i posti che restano.
//
// **Riordinata il 02/11/2026** (richiesta di Maurizio: «c'e' troppo testo tutto insieme, non si capisce»). Lo scopo e' uno solo: scegliere
// il bambino per cui si opera, o aggiungerne uno, e poi:
//   - **se non ha un abbonamento attivo**, le attivita' che il suo anno di nascita apre, come carte chiuse con l'«upsell» (da quanto,
//     quanti posti) e aperte con tutti i dettagli e i turni (`AttivitaDaScegliere`);
//   - **se ce l'ha**, un menu (`MenuIscritto`) con le voci che si possono guardare (abbonamento, lezioni, recuperi, livello, cambio
//     orario, Direttore Tecnico, da sapere): sotto si vede una voce alla volta, e la pagina non scorre all'infinito.
// Il nucleo non e' piu' un elenco con una riga di testo per persona: e' una fila di tessere (`SceltaFiglio`) con «Aggiungi» in fondo
// (`famiglia/AggiungiComponente`, lo stesso della Home: un figlio con tutti i dati oppure un altro adulto con la delega sui figli).
//
// Ai gruppi da qui ci si iscrive toccando un turno con posti (`/iscrizione`). I numeri sono quelli del mirror di PerfectGym (si aggiornano ogni
// pochi minuti), e l'ultima parola sui posti e' della segreteria al momento dell'iscrizione. Il bambino iscritto non si iscrive ad altri
// turni da qui: puo' chiedere un altro turno dello stesso tipo (`CambioOrario`).


/** La tessera «Tutti i tuoi figli» nella scelta del bambino: un id che nessun membro ha. */
const TUTTI = -1;
export const CHIAVE_GRUPPI_JUNIOR = "junior:gruppi";

export function Junior() {
  const p = usePalette();
  const [esito, setEsito] = useState<EsitoGruppi | undefined>(() =>
    inMemoria<EsitoGruppi>(CHIAVE_GRUPPI_JUNIOR),
  );
  const [aggiunto, setAggiunto] = useState<string | null>(null);
  const [personaScelta, setPersonaScelta] = useState<number | null>(null);
  // Un lattante non ha gruppi: e' «iscritto» se ha l'abbonamento mensile del Baby Nuoto, che sa solo `CorsiPersona` (null: non si sa ancora).
  const [babyAbbonato, setBabyAbbonato] = useState<{ id: number; si: boolean } | null>(null);
  const vista = !!vistaCorrente();
  // `?voce=gare`: il ritorno dal pagamento della gara e il link dall'evento aprono direttamente la voce «Gare» (04/11/2026).
  // `?voce=recuperi`: il link dell'email della disdetta di una lezione del corso, col recupero accreditato (04/11/2026).
  // `?assistenza=1`: il link dell'email che il genitore riceve dopo aver registrato il figlio dal sito (chat o «Contattaci», Scuola Nuoto
  // Bambini e Baby Nuoto, 04/11/2026). La chat dell'assistente si apre da sola, una volta: prende il posto di quella del sito.
  // `?figlio=<id>`: lo stesso link apre la sezione gia' sul bambino appena registrato (04/11/2026). Se non e' fra i figli di chi e'
  // entrato (o il mirror non lo ha ancora), si apre il primo come sempre.
  const { voce: voceParam, assistenza, figlio: figlioParam } = useLocalSearchParams<{ voce?: string; assistenza?: string; figlio?: string }>();

  useEffect(() => {
    if (typeof figlioParam === "string" && /^\d{1,10}$/.test(figlioParam)) setPersonaScelta(Number(figlioParam));
  }, [figlioParam]);

  const carica = useCallback(async () => {
    setEsito(await prendi(CHIAVE_GRUPPI_JUNIOR, gruppiJunior));
  }, []);
  // Ogni volta che la schermata torna in primo piano (dopo la firma o il pagamento) si rilegge: non resta quella di prima.
  useFocusEffect(
    useCallback(() => {
      carica();
    }, [carica]),
  );

  // Si apre quando la sezione ha letto il nucleo (la chat si appoggia sulla schermata vera, non sull'attesa), e il parametro si toglie:
  // tornando qui, o ricaricando, non si riapre. Il pulsante dell'assistente sta nel layout e puo' registrarsi un attimo dopo: qualche
  // tentativo, poi si lascia stare (resta il pulsante «Richiedi assistenza» in alto).
  const assistenzaAperta = useRef(false);
  useEffect(() => {
    if (assistenza !== "1" || !esito || assistenzaAperta.current || vistaCorrente()) return;
    assistenzaAperta.current = true;
    let tentativi = 0;
    const prova = () => {
      if (apriAssistente("junior") || ++tentativi >= 10) {
        router.setParams({ assistenza: undefined });
        return;
      }
      timer = setTimeout(prova, 300);
    };
    let timer = setTimeout(prova, 250);
    return () => clearTimeout(timer);
  }, [assistenza, esito]);

  const gruppi = useMemo(() => (esito?.ok ? esito.gruppi : []), [esito]);
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
  // La persona di cui si lavora: quella toccata, se c'e' ancora; se no la prima in eta' per i corsi.
  const idonee = persone.filter((x) => x.idoneo);
  // Chi ha dei brevetti si sceglie anche se non è in età per i corsi (04/11/2026): il libretto resta suo, iscritto o no.
  const scegliibili = persone.filter((x) => x.idoneo || haBrevetti(x));
  // «Tutti i tuoi figli» (04/11/2026, richiesta di Maurizio): accanto ai nomi, una tessera come quella di un figlio in piu', con dentro i
  // turni che i figli in eta' da Scuola Nuoto possono fare insieme. Prima era una carta sopra la pagina del bambino scelto.
  const tuttiPossibile = mostraTurniVicini(persone);
  const tutti = tuttiPossibile && personaScelta === TUTTI;
  const persona = tutti ? null : (scegliibili.find((x) => x.member_id === personaScelta) ?? idonee[0] ?? scegliibili[0] ?? null);
  // **Senza un figlio registrato non si mostra nessun turno** (02/11/2026): resta solo «Aggiungi».
  const senzaFigli = !persona && !tutti;
  const personaIscritta = !!persona && (persona.gruppi.length > 0);

  // Il corso del bambino scelto, per il benvenuto della chat (04/11/2026): aprendo l'assistente da qui, o dal link del sito, la chat comincia
  // da quel corso (`assistente/BenvenutoJunior.tsx`) e non dai suggerimenti generici. Uscendo dalla sezione si toglie.
  const corsoTema: "snb" | "baby" | null = !persona ? null : eBaby(persona.data_nascita) ? "baby" : attivitaDiPersona(persona).includes("snb") ? "snb" : null;
  const iscrittoTema = !!persona && (personaIscritta || (eBaby(persona.data_nascita) && babyAbbonato?.id === persona.member_id && babyAbbonato.si));
  const nomeTema = persona ? nomeCompleto({ nome: persona.nome, cognome: null }) || null : null;
  useEffect(() => {
    impostaTemaJunior(persona ? { corso: corsoTema, nome: nomeTema, iscritto: iscrittoTema } : null);
  }, [persona?.member_id, corsoTema, nomeTema, iscrittoTema]);
  useEffect(() => () => impostaTemaJunior(null), []);

  function dopoAggiunta(nome: string, n: NucleoJunior | null) {
    setAggiunto(t(`${nome} è nel tuo nucleo familiare.`, `${nome} is now in your family members.`));
    // Il bambino appena aggiunto diventa quello scelto.
    const prima = new Set((nucleo?.persone ?? []).map((x) => x.member_id));
    const nuovo = n?.persone.find((x) => !prima.has(x.member_id) && x.idoneo);
    if (nuovo) setPersonaScelta(nuovo.member_id);
    // L'area della Home ha il nucleo di prima: alla prossima apertura si rilegge.
    scorda("area");
    if (esito?.ok && n) {
      const nuovoEsito: EsitoGruppi = { ...esito, nucleo: n };
      ricorda(CHIAVE_GRUPPI_JUNIOR, nuovoEsito);
      setEsito(nuovoEsito);
    } else carica();
  }

  // Piu' figli (04/11/2026): le iscrizioni avviate dai turni vicini, una dopo l'altra (`codaIscrizioni.ts`). Si rilegge a ogni ritorno
  // sulla sezione (dopo il pagamento), quindi segue `esito`.
  const [coda, setCoda] = useState<VoceCoda[]>(() => codaIscrizioni());
  useFocusEffect(
    useCallback(() => {
      setCoda(codaIscrizioni());
    }, []),
  );
  const iscrittoA = (memberId: number, groupId: number) =>
    !!nucleo?.persone.find((x) => x.member_id === memberId)?.gruppi.some((g) => Number(g.group_id) === groupId);
  function avviaCoda(voci: VoceCoda[]) {
    iniziaCoda(voci);
    setCoda(voci);
    const prima = voci[0];
    if (prima) router.navigate({ pathname: "/iscrizione", params: { group: prima.group_id, membro: String(prima.member_id) } });
  }
  function chiudiLaCoda() {
    chiudiCoda();
    setCoda([]);
  }

  function iscrivi(g: GruppoJunior, membro: number) {
    router.navigate({
      pathname: "/iscrizione",
      params: { group: g.id, membro: String(membro) },
    });
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

  // Senza gruppi aperti non c'è niente da scegliere, ma i brevetti si vedono lo stesso (04/11/2026).
  if (!gruppi.length && !senzaFigli && !(persona && haBrevetti(persona))) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t("Nessun gruppo attivo", "No active groups")}>
          {t("In questo momento non ci sono gruppi dei corsi junior aperti.", "There are no junior course groups open right now.")}
        </Messaggio>
      </Schermata>
    );
  }

  return (
    <Schermata {...intestazione}>
      <TestataJunior nome={tutti ? t("I tuoi figli", "Your children") : persona ? nomeCompleto(persona) : null} />

      <SceltaFiglio
        persone={persone}
        scelta={persona?.member_id ?? null}
        tutti={
          tuttiPossibile
            ? {
                scelto: tutti,
                onScegli: () => {
                  setAggiunto(null);
                  setPersonaScelta(TUTTI);
                },
              }
            : null
        }
        onScegli={(id) => {
          setAggiunto(null);
          setPersonaScelta(id);
        }}
        onAggiunto={dopoAggiunta}
        onApriAggiungi={() => setAggiunto(null)}
      />
      {aggiunto ? <Messaggio tono="ok">{aggiunto}</Messaggio> : null}

      {coda.length ? (
        <CodaIscrizioniCarta
          voci={coda}
          iscritto={iscrittoA}
          onContinua={(v) => router.navigate({ pathname: "/iscrizione", params: { group: v.group_id, membro: String(v.member_id) } })}
          onChiudi={chiudiLaCoda}
        />
      ) : null}
      {!vista && !coda.length && mostraInvitoAltroFiglio(persone) ? (
        <InvitoAltroFiglio onAggiunto={dopoAggiunta} onApri={() => setAggiunto(null)} />
      ) : null}

      {tutti ? (
        <TurniVicini persone={persone} vista={vista} onIscrivi={avviaCoda} />
      ) : senzaFigli ? (
        <Messaggio titolo={t("Aggiungi un figlio per vedere le attività", "Add a child to see the activities")}>
          {t(
            `Una volta inserito vedrai le attività per la sua età${nucleo ? ` (dai ${nucleo.mesi_minimi} mesi ai nati nel ${nucleo.anno_minimo})` : ""}.`,
            `Once added, you’ll see the activities for their age${nucleo ? ` (from ${nucleo.mesi_minimi} months old to those born in ${nucleo.anno_minimo})` : ""}.`,
          )}
        </Messaggio>
      ) : persona ? (
        <>
          <StatoIscrizione
            persona={persona}
            iscritto={personaIscritta ? true : eBaby(persona.data_nascita) ? (babyAbbonato?.id === persona.member_id ? babyAbbonato.si : null) : false}
          />
          {/* Un figlio da 13 a 17 anni, iscritto o no ai corsi: l'invito ad attivare l'abbonamento adulti a suo nome (03/11/2026). */}
          <InvitoAbbonamentoAdulti persona={persona} vista={vista} />
          {!personaIscritta && eBaby(persona.data_nascita) ? (
            // Chi e' in eta' per il Baby Nuoto: la lettura dei suoi dati parte subito, per dire in alto se ha l'abbonamento.
            <CorsiPersona persona={persona} vista={vista} parte={null} onDati={(d) => setBabyAbbonato({ id: persona.member_id, si: d.babyAbbonato })} />
          ) : null}
          {personaIscritta ? (
            <AreaIscritto
              key={persona.member_id}
              persona={persona}
              gruppi={gruppi}
              vista={vista}
              inCorso={inCorso.find((x) => x.member_id === persona.member_id)}
              onInCorsoFinito={() => setGiroInCorso((n) => n + 1)}
              voceIniziale={voceParam === "gare" || voceParam === "recuperi" ? voceParam : undefined}
            />
          ) : (
            <>
              {persona.idoneo ? (
                <AttivitaDaScegliere
                  // Chiavi diverse per i due blocchi fratelli (attività e brevetti chiusi): con la stessa chiave, cambiando bambino, React sul
                  // web lasciava in pagina le copie vecchie, una in più a ogni cambio, e quelle copie non si aprivano al tocco (04/11/2026).
                  key={`attivita-${persona.member_id}`}
                  persona={persona}
                  gruppi={gruppi}
                  vista={vista}
                  puoIscriversi={(g) => chiPuoIscriversi(nucleo, g).some((x) => x.member_id === persona.member_id)}
                  onIscrivi={(g) => iscrivi(g, persona.member_id)}
                  contenutoBaby={
                    <CorsiPersona
                      persona={persona}
                      vista={vista}
                      parte="baby"
                      inCorso={inCorso.find((x) => x.member_id === persona.member_id)}
                      onInCorsoFinito={() => setGiroInCorso((n) => n + 1)}
                    />
                  }
                />
              ) : null}
              {/* Senza un abbonamento i brevetti già ottenuti si vedono lo stesso (libretto, diploma), ma in fondo e chiusi, sotto le attività da scegliere (04/11/2026, richiesta di Maurizio). */}
              {persona.livello ? <BrevettiChiusi key={`brevetti-${persona.member_id}`} persona={persona} vista={vista} /> : null}
            </>
          )}
        </>
      ) : null}
    </Schermata>
  );
}

/**
 * Subito sotto la scelta del bambino, in grande, se e' iscritto o no (02/11/2026, richiesta di Maurizio): «Iscritto» con i corsi a cui
 * e' dentro, oppure «Non iscritto». `null`: ancora non si sa (la lettura dell'abbonamento del Baby Nuoto), si dice solo la classe.
 */
function StatoIscrizione({ persona, iscritto }: { persona: PersonaJunior; iscritto: boolean | null }) {
  const p = usePalette();
  const anno = annoDi(persona);
  const classe = anno ? t(`Classe ${anno}`, `Born ${anno}`) : null;
  const corsi = persona.gruppi.map((g) => nomeIscrizione(g.nome)).join(", ");
  return (
    <View style={stili.stato} accessibilityRole="summary">
      {iscritto === null ? null : (
        <Etichetta
          grande
          icona={iscritto ? "spunta" : "attenzione"}
          tono={iscritto ? "ok" : "attenzione"}
          testo={iscritto ? t("Iscritto", "Enrolled") : t("Non iscritto", "Not enrolled")}
        />
      )}
      <Text style={[stili.riepilogo, { color: p.testoSecondario }]} numberOfLines={2}>
        {[classe, iscritto && corsi ? corsi : iscritto === false ? t("nessun abbonamento attivo", "no active membership") : null]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </View>
  );
}

/**
 * Un bambino con un abbonamento attivo: il menu e, sotto, la voce scelta. `CorsiPersona` resta montato per tutte le voci (legge i dati
 * una volta sola) e disegna solo la sua parte; le altre voci sono pagine a se'.
 */
function AreaIscritto({
  persona,
  gruppi,
  vista,
  inCorso,
  onInCorsoFinito,
  voceIniziale,
}: {
  persona: PersonaJunior;
  gruppi: GruppoJunior[];
  vista: boolean;
  inCorso?: InCorso;
  onInCorsoFinito: () => void;
  voceIniziale?: VoceJunior;
}) {
  const baby = eBaby(persona.data_nascita);
  const [voce, setVoce] = useState<VoceJunior>(voceIniziale ?? "abbonamento");
  const [recuperabile, setRecuperabile] = useState<boolean | null>(null);

  const voci = useMemo(() => {
    const v: VoceJunior[] = ["abbonamento", "lezioni"];
    if (recuperabile !== false) v.push("recuperi");
    if (haBrevetti(persona)) v.push("brevetti");
    // Le gare (Trofeo Athlon): per i minorenni non in eta' da Baby Nuoto; se non e' ammesso, la voce dice perche'.
    if (!baby && persona.minorenne) v.push("gare");
    if (!baby) v.push("cambio");
    if (persona.minorenne) v.push("dt");
    v.push("attivita");
    return v;
  }, [recuperabile, persona.livello, persona.in_corso, persona.minorenne, baby]);
  // Se la voce aperta sparisce dal menu (i recuperi, quando si scopre che non ci sono) si torna alla prima.
  const attiva: VoceJunior = voci.includes(voce) ? voce : voci[0];
  const parte: ParteCorsi | null = attiva === "abbonamento" || attiva === "lezioni" || attiva === "recuperi" ? attiva : null;

  return (
    <>
      <MenuIscritto voci={voci} scelta={attiva} onScegli={setVoce} />

      <CorsiPersona
        persona={persona}
        vista={vista}
        parte={parte}
        inCorso={inCorso}
        onInCorsoFinito={onInCorsoFinito}
        onDati={(d) => setRecuperabile(d.recuperabile)}
      />

      {attiva === "brevetti" && haBrevetti(persona) ? <Brevetti persona={persona} vista={vista} /> : null}
      {attiva === "gare" ? <Gare persona={persona} vista={vista} /> : null}
      {attiva === "cambio" ? <CambioOrario persona={persona} gruppi={gruppi} vista={vista} /> : null}
      {attiva === "dt" ? <DirettoreTecnico persona={persona} vista={vista} /> : null}
      {attiva === "attivita" ? <SchedaAttivita chiavi={attivitaDiPersona(persona)} nome={persona.nome} /> : null}

    </>
  );
}

const stili = StyleSheet.create({
  stato: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spazio.due, paddingHorizontal: 2 },
  riepilogo: { flexShrink: 1, fontSize: 13, lineHeight: 19, fontFamily: F.medio },
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
