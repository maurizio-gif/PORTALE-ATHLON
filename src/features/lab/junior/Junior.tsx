import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { inMemoria, prendi, ricorda, scorda } from "../memoria";
import { Etichetta, Messaggio, Pulsante, SchedeInArrivo, Sezione } from "../ui/kit";
import { Schermata } from "../ui/Schermata";
import { F, usePalette } from "../ui/tema";
import { vistaCorrente } from "../vista";
import { annoDi, chiPuoIscriversi, eBaby, haBrevetti, nomeCompleto, nomeIscrizione, personeDaMostrare } from "./comune";
import { attivitaDiPersona } from "./attivita";
import { AttivitaDaScegliere } from "./AttivitaDaScegliere";
import { Brevetti } from "./Brevetti";
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
  const { voce: voceParam } = useLocalSearchParams<{ voce?: string }>();

  const carica = useCallback(async () => {
    setEsito(await prendi(CHIAVE_GRUPPI_JUNIOR, gruppiJunior));
  }, []);
  // Ogni volta che la schermata torna in primo piano (dopo la firma o il pagamento) si rilegge: non resta quella di prima.
  useFocusEffect(
    useCallback(() => {
      carica();
    }, [carica]),
  );

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
  const persona = scegliibili.find((x) => x.member_id === personaScelta) ?? idonee[0] ?? scegliibili[0] ?? null;
  // **Senza un figlio registrato non si mostra nessun turno** (02/11/2026): resta solo «Aggiungi».
  const senzaFigli = !persona;
  const personaIscritta = !!persona && (persona.gruppi.length > 0);

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
      <TestataJunior nome={persona ? nomeCompleto(persona) : null} />

      <SceltaFiglio
        persone={persone}
        scelta={persona?.member_id ?? null}
        onScegli={(id) => {
          setAggiunto(null);
          setPersonaScelta(id);
        }}
        onAggiunto={dopoAggiunta}
        onApriAggiungi={() => setAggiunto(null)}
      />
      {aggiunto ? <Messaggio tono="ok">{aggiunto}</Messaggio> : null}

      {senzaFigli ? (
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
              voceIniziale={voceParam === "gare" ? "gare" : undefined}
            />
          ) : (
            <>
              {/* Senza un abbonamento i brevetti già ottenuti si vedono lo stesso, e si scarica il libretto e si condivide (04/11/2026, richiesta di Maurizio). */}
              {persona.livello ? (
                <Sezione titolo={t("Brevetti", "Badges")}>
                  <Brevetti key={persona.member_id} persona={persona} vista={vista} />
                </Sezione>
              ) : null}
              {persona.idoneo ? (
            <AttivitaDaScegliere
              key={persona.member_id}
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
