import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  chiediCambioOrario,
  type GruppoJunior,
  type PersonaJunior,
} from "@/api/junior";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Foglio } from "../ui/Foglio";
import { Bollino, Carta, Etichetta, Messaggio, Pulsante, Riga, Sezione } from "../ui/kit";
import { F, usePalette } from "../ui/tema";
import { annoDi, annateGruppo, calendarioGruppo, statoPosti, titoloGruppo } from "./comune";

// Il cambio orario (22/10/2026, richiesta di Maurizio): un bambino iscritto a un gruppo non si iscrive ad altri corsi, ma puo'
// chiedere un altro turno **dello stesso tipo** (chi e' in un monosettimanale vede i monosettimanali, chi e' in un bisettimanale i
// bisettimanali: la categoria di PerfectGym) **della fascia d'eta' del turno in cui e' iscritto**. Si vedono solo i turni con un posto libero.
//
// **La fascia e' quella del turno, non l'anno di nascita** (04/11/2026, richiesta di Maurizio): la segreteria a volte mette un bambino
// in un gruppo di un'altra fascia (per il livello), e da li' il cambio e i recuperi restano in quella fascia. Il caso: un bambino del 2018
// iscritto a un monosettimanale «(2020-19)» vedeva solo i turni 2016-18. Se nessun suo turno dice le annate, vale l'anno di nascita.
//
// **Passa al bisettimanale** (04/11/2026, richiesta di Maurizio): chi e' in un monosettimanale ha un pulsante che, solo se lo tocca, elenca
// i bisettimanali della stessa fascia con un posto libero. La scelta manda una richiesta alla segreteria, che risponde per email con la
// procedura da seguire per il cambio abbonamento: dall'app non cambia ne' il turno ne' il contratto.
//
// **Da qui non si cambia niente da soli**: la richiesta arriva alla segreteria (Dashboard del CRM + email al desk), che la approva
// (con la data da cui vale, dalla prima lezione utile) o la rifiuta (con i motivi) e scrive l'esito al genitore. In vista cliente si guarda e basta.

/**
 * La fascia d'eta' del turno d'appartenenza: gli anni dei gruppi in cui la persona e' iscritta (lo stesso calcolo vale per il server,
 * `portale-lab-junior` e `portale-lab-calendario`). Se nessun gruppo li dice, il suo anno di nascita; vuoto se non c'e' neanche quello.
 */
export function fasciaDi(persona: PersonaJunior, gruppi: GruppoJunior[]): number[] {
  const mie = new Set(persona.gruppi.map((g) => String(g.group_id)));
  const anni = new Set(gruppi.filter((g) => mie.has(g.id)).flatMap((g) => g.anni));
  if (anni.size) return [...anni];
  const anno = annoDi(persona);
  return anno == null ? [] : [anno];
}

/** Il bisettimanale che corrisponde a una categoria monosettimanale («Scuola Nuoto Bambini - Monosettimanale»), o null. */
export function categoriaBisettimanale(categoria: string | null): string | null {
  return categoria && /monosettimanale/i.test(categoria) ? categoria.replace(/monosettimanale/i, "Bisettimanale") : null;
}

function turniDi(persona: PersonaJunior, gruppi: GruppoJunior[], categorie: Set<string>): GruppoJunior[] {
  const mie = new Set(persona.gruppi.map((g) => String(g.group_id)));
  const fascia = fasciaDi(persona, gruppi);
  if (!categorie.size || !fascia.length) return [];
  return gruppi.filter(
    (g) =>
      !mie.has(g.id) && !!g.categoria && categorie.has(g.categoria) && g.anni.some((a) => fascia.includes(a)) && (g.liberi ?? 0) > 0,
  );
}

function categorieMie(persona: PersonaJunior, gruppi: GruppoJunior[]): string[] {
  const mie = new Set(persona.gruppi.map((g) => String(g.group_id)));
  return gruppi.filter((g) => mie.has(g.id) && g.categoria).map((g) => g.categoria as string);
}

/** I turni che un bambino iscritto puo' chiedere: stessa categoria del suo gruppo, la fascia del suo turno, un posto libero, non quello che ha. */
export function turniPerCambio(persona: PersonaJunior, gruppi: GruppoJunior[]): GruppoJunior[] {
  return turniDi(persona, gruppi, new Set(categorieMie(persona, gruppi)));
}

/** Vero se la persona e' in un turno monosettimanale che ha il suo bisettimanale (la Scuola Nuoto Bambini): allora c'e' «Passa al bisettimanale». */
export function puoPassareAlBisettimanale(persona: PersonaJunior, gruppi: GruppoJunior[]): boolean {
  return categorieMie(persona, gruppi).some((c) => !!categoriaBisettimanale(c));
}

/** I bisettimanali della fascia del suo turno con un posto libero, per chi e' in un monosettimanale; vuoto per gli altri. */
export function turniBisettimanale(persona: PersonaJunior, gruppi: GruppoJunior[]): GruppoJunior[] {
  const bi = categorieMie(persona, gruppi).map(categoriaBisettimanale).filter((c): c is string => !!c);
  return turniDi(persona, gruppi, new Set(bi));
}

export function CambioOrario({
  persona,
  gruppi,
  vista,
}: {
  persona: PersonaJunior;
  gruppi: GruppoJunior[];
  vista: boolean;
}) {
  const p = usePalette();
  const turni = useMemo(() => turniPerCambio(persona, gruppi), [persona, gruppi]);
  const bisettimanali = useMemo(() => turniBisettimanale(persona, gruppi), [persona, gruppi]);
  const puoBi = useMemo(() => puoPassareAlBisettimanale(persona, gruppi), [persona, gruppi]);
  // I bisettimanali non si elencano subito: compaiono solo dopo «Passa al bisettimanale».
  const [mostraBi, setMostraBi] = useState(false);
  const [scelto, setScelto] = useState<GruppoJunior | null>(null);
  const [tipo, setTipo] = useState<"orario" | "bisettimanale">("orario");
  // La doppia conferma (02/11/2026, richiesta di Maurizio): il primo passo spiega e sconsiglia, il secondo chiede «sei sicuro?» e solo allora parte la richiesta.
  const [passo, setPasso] = useState<1 | 2>(1);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [chiesti, setChiesti] = useState<string[]>([]);
  const nome = persona.nome ?? t("tuo figlio", "your child");

  async function manda() {
    if (!scelto) return;
    setInvio(true);
    setErrore(null);
    const r = await chiediCambioOrario({ memberId: persona.member_id, groupId: scelto.id, tipo });
    setInvio(false);
    if (!r.ok) {
      setErrore(r.errore);
      return;
    }
    setChiesti((x) => [...x, scelto.id]);
    chiudi();
  }

  function apri(g: GruppoJunior, quale: "orario" | "bisettimanale" = "orario") {
    setTipo(quale);
    setPasso(1);
    setErrore(null);
    setScelto(g);
  }
  function chiudi() {
    setScelto(null);
    setPasso(1);
    setErrore(null);
  }

  return (
    <View style={{ gap: spazio.cinque }}>
    <Sezione titolo={t("Cambio orario", "Change schedule")} conteggio={turni.length}>
      <Text style={[stili.nota, { color: p.testoSecondario }]}>
        {t(
          `Se ${nome} vuole cambiare orario, puoi chiedere un altro turno dello stesso tipo con un posto libero. La segreteria controlla la richiesta e ti scrive l’esito per email.`,
          `If ${nome} wants a different time, you can ask for another slot of the same kind with a free spot. The front desk reviews the request and emails you the outcome.`,
        )}
      </Text>
      {chiesti.length ? (
        <Messaggio tono="ok" titolo={t("Richiesta inviata", "Request sent")}>
          {t(
            "La segreteria la controlla e ti scrive l’esito per email. Fino ad allora il turno resta quello di adesso.",
            "The front desk will review it and email you the outcome. Until then the slot stays the same.",
          )}
        </Messaggio>
      ) : null}
      {turni.length ? (
        <Carta>
          {turni.map((g, i) => {
            const s = statoPosti(g);
            const fatto = chiesti.includes(g.id);
            return (
              <Riga
                key={g.id}
                prima={i === 0}
                testa={<Bollino icona="goccia" tono="blu" size={40} />}
                titolo={titoloGruppo(g)}
                sotto={(calendarioGruppo(g) ? calendarioGruppo(g) + "\n" : "") + annateGruppo(g)}
                coda={<Etichetta testo={fatto ? t("Richiesto", "Requested") : s.testo} tono={fatto ? "ok" : s.tono} />}
                onPress={!vista && !fatto ? () => apri(g) : undefined}
              />
            );
          })}
        </Carta>
      ) : (
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t("Adesso non ci sono altri turni dello stesso tipo con un posto libero.", "There are no other slots of the same kind with a free spot right now.")}
        </Text>
      )}

      <Foglio
        aperto={!!scelto}
        titolo={
          tipo === "bisettimanale"
            ? t("Passa al bisettimanale", "Switch to twice a week")
            : passo === 1
              ? t("Chiedi il cambio di turno", "Request a slot change")
              : t("Ne sei sicuro?", "Are you sure?")
        }
        sottotitolo={scelto ? titoloGruppo(scelto) : undefined}
        onChiudi={() => (invio ? undefined : chiudi())}
      >
        {tipo === "bisettimanale" ? (
          <View style={{ gap: spazio.tre }}>
            <Messaggio tono="ok" titolo={t("Come funziona", "How it works")}>
              {t(
                `La richiesta va alla segreteria, che controlla il turno e ti risponde per email con la procedura da seguire per il cambio abbonamento, da monosettimanale a bisettimanale. Dall’app non cambia niente: fino ad allora ${nome} resta nel turno di adesso.`,
                `The request goes to the front desk, which checks the slot and emails you the steps to follow to change the membership from once to twice a week. Nothing changes from the app: until then ${nome} stays in the current slot.`,
              )}
            </Messaggio>
            {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
            <Pulsante testo={t("Manda la richiesta", "Send the request")} icona="ok" onPress={manda} inCorso={invio} />
            <Pulsante testo={t("Annulla", "Cancel")} variante="secondario" onPress={chiudi} disabilitato={invio} />
          </View>
        ) : passo === 1 ? (
          <View style={{ gap: spazio.tre }}>
            <Messaggio tono="attenzione" titolo={t("Cambiare turno è sconsigliato", "Changing slot is discouraged")}>
              {t(
                `Cambiare turno, e ancora di più farlo spesso, fa perdere a ${nome} la continuità con l’istruttore e con il gruppo, e rende meno efficace la didattica. Chiedilo solo se è davvero necessario.`,
                `Changing slot, and even more so doing it often, makes ${nome} lose continuity with the instructor and the group, and makes the teaching less effective. Only ask if it’s truly necessary.`,
              )}
            </Messaggio>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                `La richiesta non è automatica: la segreteria la controlla e la approva o la rifiuta. Se è approvata, il cambio vale dalla prima lezione utile dopo la data che ti comunichiamo; fino ad allora ${nome} resta nel turno di adesso. L’esito arriva per email.`,
                `The request isn’t automatic: the front desk reviews it and approves or declines it. If approved, the change applies from the first useful lesson after the date we give you; until then ${nome} stays in the current slot. The outcome arrives by email.`,
              )}
            </Text>
            <Pulsante testo={t("Manda la richiesta", "Send the request")} icona="avanti" onPress={() => setPasso(2)} />
            <Pulsante testo={t("Annulla", "Cancel")} variante="secondario" onPress={chiudi} />
          </View>
        ) : (
          <View style={{ gap: spazio.tre }}>
            <Messaggio tono="attenzione" titolo={t("Un ultimo controllo", "One last check")}>
              {t(
                "Se i cambi di turno diventano frequenti, le richieste successive potrebbero non essere accettate. Vuoi mandare questa richiesta?",
                "If slot changes become frequent, later requests may not be accepted. Do you want to send this request?",
              )}
            </Messaggio>
            {errore ? <Messaggio tono="errore">{errore}</Messaggio> : null}
            <Pulsante testo={t("Sì, ho bisogno del cambio", "Yes, I need the change")} icona="ok" onPress={manda} inCorso={invio} />
            <Pulsante testo={t("No, resto nel turno di adesso", "No, keep the current slot")} variante="secondario" onPress={chiudi} disabilitato={invio} />
          </View>
        )}
      </Foglio>
    </Sezione>

    {puoBi ? (
      <Sezione titolo={t("Passa al bisettimanale", "Switch to twice a week")} conteggio={mostraBi ? bisettimanali.length : undefined}>
        <Text style={[stili.nota, { color: p.testoSecondario }]}>
          {t(
            `Se vuoi che ${nome} venga due volte a settimana, puoi chiedere un turno bisettimanale della stessa fascia d’età. La segreteria ti risponde per email con la procedura da seguire per il cambio abbonamento.`,
            `If you’d like ${nome} to come twice a week, you can ask for a twice-a-week slot in the same age group. The front desk will email you the steps to change the membership.`,
          )}
        </Text>
        {!mostraBi ? (
          <Pulsante testo={t("Passa al bisettimanale", "Switch to twice a week")} icona="avanti" variante="secondario" onPress={() => setMostraBi(true)} />
        ) : bisettimanali.length ? (
          <Carta>
            {bisettimanali.map((g, i) => {
              const s = statoPosti(g);
              const fatto = chiesti.includes(g.id);
              return (
                <Riga
                  key={g.id}
                  prima={i === 0}
                  testa={<Bollino icona="goccia" tono="blu" size={40} />}
                  titolo={titoloGruppo(g)}
                  sotto={(calendarioGruppo(g) ? calendarioGruppo(g) + "\n" : "") + annateGruppo(g)}
                  coda={<Etichetta testo={fatto ? t("Richiesto", "Requested") : s.testo} tono={fatto ? "ok" : s.tono} />}
                  onPress={!vista && !fatto ? () => apri(g, "bisettimanale") : undefined}
                />
              );
            })}
          </Carta>
        ) : (
          <Text style={[stili.nota, { color: p.testoSecondario }]}>
            {t(
              "Adesso non ci sono turni bisettimanali della sua fascia con un posto libero. Se vuoi, scrivi alla segreteria dall’assistente.",
              "There are no twice-a-week slots with a free spot in this age group right now. If you like, write to the front desk from the assistant.",
            )}
          </Text>
        )}
      </Sezione>
    ) : null}
    </View>
  );
}

const stili = StyleSheet.create({
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
});
