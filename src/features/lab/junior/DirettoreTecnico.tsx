import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  annullaDirettoreTecnico,
  appuntamentiDirettoreTecnico,
  prenotaDirettoreTecnico,
  slotDirettoreTecnico,
  spostaDirettoreTecnico,
  type AppuntamentoDt,
  type EsitoSlotDt,
  type PersonaJunior,
} from "@/api/junior";
import { leggiAnagrafica, type EsitoAnagrafica } from "@/api/lab";
import { locale, t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { Messaggio, Pulsante, Sezione, SchedeInArrivo, Carta } from "../ui/kit";
import { CampoTesto, Scelte } from "../ui/Campi";
import { Icona } from "../ui/Icona";
import { inMemoria, prendi } from "../memoria";
import { Consenso } from "./Consenso";
import { Dettagli } from "./Dettagli";
import { F, usePalette, velo } from "../ui/tema";

// Il Direttore Tecnico, dalla scheda di un bambino iscritto (22/10/2026, richiesta di Maurizio): cosa fa, e il calendario aperto per
// fissare una telefonata di quindici minuti. **Il sistema sa gia' chi e' il genitore e chi e' il bambino**: non si chiede nessun dato,
// solo di cosa si vuole parlare (il Direttore Tecnico lo legge prima di chiamare) e, se PerfectGym non lo ha, il cellulare. Chi prenota
// dev'essere il titolare del nucleo e il bambino dev'essere iscritto a un corso: lo controlla la funzione (`dt_prenota`), non l'app. Stessa
// agenda, stessi orari e stesse email del modulo del sito; la riga arriva marcata «app». Le regole sulle quali famiglie possono chiamare
// e di cosa si parla sono quelle della scheda «Direzione Tecnica» del Wiki: se cambiano, cambiano anche qui.

const MOTIVO_MAX = 500;

function giornoBreve(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  return d.toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" });
}

function giornoLungo(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  return d.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
}

export function DirettoreTecnico({
  persona,
  vista,
}: {
  persona: PersonaJunior;
  vista: boolean;
}) {
  const p = usePalette();
  const nome = persona.nome ?? t("tuo figlio", "your child");
  const [esito, setEsito] = useState<EsitoSlotDt | undefined>();
  const [aperto, setAperto] = useState(false);
  const [giorno, setGiorno] = useState<string | null>(null);
  const [ora, setOra] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  // Il numero a cui richiamare (02/11/2026, richiesta di Maurizio: «puoi essere richiamato a questo numero?», con il numero modificabile): **si propone sempre**, quello di PerfectGym
  // se la funzione lo manda (`dt_slot`), se no quello del Profilo (`anagrafica`), e il genitore lo conferma con una spunta o lo cambia. Parte sempre col nome `telefono`.
  const [telefono, setTelefono] = useState("");
  const [telefonoToccato, setTelefonoToccato] = useState(false);
  const [confermaTel, setConfermaTel] = useState(false);
  const [telProfilo, setTelProfilo] = useState<string | null>(() => {
    const a = inMemoria<EsitoAnagrafica>("anagrafica");
    return a?.ok ? a.anagrafica.telefono : null;
  });
  // Ha toccato «Conferma» senza aver scritto di cosa vuole parlare: il campo si segna e il motivo si dice.
  const [provato, setProvato] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState<{ data: string; ora: string } | null>(null);
  const [mie, setMie] = useState<AppuntamentoDt[]>([]);

  // I suoi appuntamenti già fissati: si leggono subito all'apertura e dopo ogni prenotazione, spostamento o disdetta.
  const rileggiMie = useCallback(async () => {
    const r = await appuntamentiDirettoreTecnico();
    if (r) setMie(r.filter((a) => a.memberId === null || a.memberId === persona.member_id));
  }, [persona.member_id]);
  useEffect(() => {
    setMie([]);
    rileggiMie();
  }, [rileggiMie]);

  const carica = useCallback(async () => {
    setEsito(undefined);
    setEsito(await slotDirettoreTecnico(persona.member_id));
  }, [persona.member_id]);

  // Si leggono gli orari solo quando la persona apre il calendario: non pesa su chi non li vuole.
  useEffect(() => {
    setAperto(false);
    setGiorno(null);
    setOra(null);
    setMotivo("");
    setTelefono("");
    setTelefonoToccato(false);
    setConfermaTel(false);
    setProvato(false);
    setErrore(null);
    setFatto(null);
    setEsito(undefined);
  }, [persona.member_id]);
  useEffect(() => {
    if (aperto && !vista) carica();
  }, [aperto, vista, carica]);
  // Il numero del Profilo, se non c'e' gia' in memoria.
  useEffect(() => {
    if (telProfilo || vista) return;
    prendi("anagrafica", leggiAnagrafica).then((r) => {
      if (r.ok && r.anagrafica.telefono) setTelProfilo(r.anagrafica.telefono);
    });
  }, [telProfilo, vista]);
  // Il numero proposto: quello di PerfectGym, o del Profilo; non si riscrive se la persona l'ha gia' toccato.
  const numeroProposto = (esito?.ok && esito.telefono ? esito.telefono : telProfilo) ?? "";
  useEffect(() => {
    if (!telefonoToccato && numeroProposto) setTelefono(numeroProposto);
  }, [numeroProposto, telefonoToccato]);

  const giorni = esito?.ok ? esito.giorni : [];
  const slotDelGiorno = giorni.find((g) => g.data === giorno)?.slot ?? [];

  const telefonoOk = telefono.replace(/\D/g, "").length >= 8;
  const motivoMancante = motivo.trim().length === 0;
  const telefonoMancanteOra = !telefonoOk || !confermaTel;

  const prenota = async () => {
    if (!giorno || !ora || invio) return;
    // Il motivo e' obbligatorio: lo legge il Direttore Tecnico prima di chiamare. Senza, non si manda niente e il campo si segna.
    if (motivoMancante || telefonoMancanteOra) {
      setProvato(true);
      return;
    }
    setInvio(true);
    setErrore(null);
    const r = await prenotaDirettoreTecnico({
      memberId: persona.member_id,
      data: giorno,
      ora,
      motivo: motivo.trim(),
      telefono: telefono.trim(),
    });
    setInvio(false);
    if (r.ok) {
      setFatto({ data: r.data, ora: r.ora });
      // Subito in elenco, con la possibilità di spostarlo o annullarlo: prima dalla risposta, poi riletto.
      if (r.id) {
        setMie((m) => [
          ...m.filter((a) => a.id !== r.id),
          { id: r.id as string, data: r.data, ora: r.ora, durataMinuti: r.durataMinuti, bambino: null, memberId: persona.member_id, motivo: motivo.trim() },
        ]);
      }
      setAperto(false);
      setGiorno(null);
      setOra(null);
      setMotivo("");
      setProvato(false);
      setConfermaTel(false);
      rileggiMie();
      return;
    }
    setErrore(r.errore);
    // Un orario preso da altri nel frattempo: si rilegge, e si sceglie di nuovo.
    if (r.slotOccupato) {
      setOra(null);
      carica();
    }
  };

  return (
    <Sezione titolo={t("Parla con il Direttore Tecnico", "Talk to the Technical Director")}>
      <Carta>
        <View style={stili.corpo}>
          <View style={stili.testa}>
            <View style={[stili.bollino, { backgroundColor: velo(p, "blu", p.scuro ? 0.2 : 0.12) }]}>
              <Icona nome="persone" size={20} colore={p.blu} />
            </View>
            <Text style={[stili.titolo, { color: p.testo }]}>
              {t("Chi è e cosa fa", "Who they are and what they do")}
            </Text>
          </View>
          <Text style={[stili.testo, { color: p.testoSecondario }]}>
            {t(
              `Il Direttore Tecnico è il punto di riferimento per il percorso di ${nome}: ti richiama per una telefonata di quindici minuti.`,
              `The Technical Director is the point of contact for ${nome}’s journey: they’ll call you for a fifteen-minute phone call.`,
            )}
          </Text>
          <Dettagli titolo={t("Di cosa puoi parlare", "What you can talk about")}>
            {[
              t("A che punto è e cosa si sta lavorando: obiettivi raggiunti e prossimi passi.", "Where they are and what they’re working on: goals reached and next steps."),
              t("Cambio di gruppo o di orario, quando serve per livello o per esigenze di famiglia.", "A change of group or time slot, when needed for level or family reasons."),
              t("Osservazioni e segnalazioni su lezioni, istruttore, organizzazione.", "Feedback and reports on classes, instructor, organization."),
              t("Dubbi sul percorso sportivo: il passaggio ad agonistico o pallanuoto, o se continuare.", "Questions about the sporting path: moving to competitive or water polo, or whether to continue."),
            ].map((r, i) => (
              <View key={i} style={stili.riga}>
                <View style={[stili.punto, { backgroundColor: p.blu }]} />
                <Text style={[stili.testo, { color: p.testoSecondario, flex: 1 }]}>{r}</Text>
              </View>
            ))}
            <Text style={[stili.nota, { color: p.testoTerzo }]}>
              {t(
                "Non è la strada per iscriversi, per scegliere un turno o per chiedere un posto in un turno al completo: per quello scrivi alla segreteria.",
                "It’s not for enrolling, choosing a slot or asking for a spot in a full slot: for that, write to the front desk.",
              )}
            </Text>
          </Dettagli>

          {fatto ? (
            <Messaggio tono="ok" titolo={t("Appuntamento fissato", "Appointment booked")}>
              {t(
                `Il Direttore Tecnico ti chiamerà ${giornoLungo(fatto.data)} alle ${fatto.ora}. Ti abbiamo mandato una email di conferma. Lo trovi qui sotto: da lì lo puoi spostare o annullare.`,
                `The Technical Director will call you on ${giornoLungo(fatto.data)} at ${fatto.ora}. We’ve sent you a confirmation email. You’ll find it below: you can move or cancel it from there.`,
              )}
            </Messaggio>
          ) : null}

          {mie.length ? (
            <View style={{ gap: spazio.due }}>
              <Text style={[stili.sotto, { color: p.testo }]}>
                {mie.length === 1 ? t("Il tuo appuntamento", "Your appointment") : t("I tuoi appuntamenti", "Your appointments")}
              </Text>
              {mie.map((a) => (
                <CartaAppuntamento key={a.id} a={a} vista={vista} persona={persona} onCambiato={rileggiMie} />
              ))}
            </View>
          ) : null}

          {vista ? (
            <Messaggio tono="attenzione">
              {t(
                "In vista cliente non si prenota: l’appuntamento lo fissa il genitore dalla sua app.",
                "In customer view you can’t book: the parent books the appointment from their own app.",
              )}
            </Messaggio>
          ) : !aperto ? (
            <Pulsante
              testo={mie.length ? t("Fissa un’altra telefonata", "Book another call") : t("Fissa una telefonata", "Book a phone call")}
              icona="calendario"
              onPress={() => setAperto(true)}
            />
          ) : !esito ? (
            <SchedeInArrivo quante={1} />
          ) : !esito.ok ? (
            <View style={{ gap: spazio.due }}>
              <Messaggio>{esito.errore}</Messaggio>
              <Pulsante testo={t("Riprova", "Try again")} icona="aggiorna" variante="secondario" onPress={carica} />
            </View>
          ) : giorni.length === 0 ? (
            <Messaggio tono="attenzione">
              {t(
                "Non ci sono orari liberi nei prossimi giorni. Scrivici a nuoto@athlonroma.it.",
                "There are no free times in the next few days. Write to nuoto@athlonroma.it.",
              )}
            </Messaggio>
          ) : (
            <View style={{ gap: spazio.tre }}>
              <Text style={[stili.sotto, { color: p.testo }]}>
                {t("Scegli il giorno", "Choose the day")}
              </Text>
              <Scelte
                valori={giorni.map((g) => ({ valore: g.data, testo: giornoBreve(g.data) }))}
                scelto={giorno}
                onScegli={(v) => {
                  setGiorno(v);
                  setOra(null);
                }}
              />
              {giorno ? (
                <>
                  <Text style={[stili.sotto, { color: p.testo }]}>
                    {t("Scegli l’orario", "Choose the time")}
                    {esito.durataMinuti
                      ? ` · ${t(`${esito.durataMinuti} minuti`, `${esito.durataMinuti} minutes`)}`
                      : ""}
                  </Text>
                  <Scelte
                    valori={slotDelGiorno.map((s) => ({ valore: s, testo: s }))}
                    scelto={ora}
                    onScegli={setOra}
                  />
                </>
              ) : null}
              {ora ? (
                <>
                  <View style={{ gap: spazio.due }}>
                    <CampoTesto
                      etichetta={t("Di cosa vuoi parlare? (obbligatorio)", "What would you like to discuss? (required)")}
                      value={motivo}
                      onChangeText={(v) => setMotivo(v.slice(0, MOTIVO_MAX))}
                      multiline
                      errore={provato && motivoMancante}
                      placeholder={t("Spiegaci di cosa vuoi parlare, anche in due parole", "Tell us what you’d like to discuss, a few words are enough")}
                    />
                    <Text style={[stili.nota, { color: provato && motivoMancante ? p.errore : p.testoTerzo }]}>
                      {provato && motivoMancante
                        ? t("Scrivi di cosa vuoi parlare per confermare l’appuntamento.", "Write what you’d like to discuss to confirm the appointment.")
                        : t("Il Direttore Tecnico lo legge prima di chiamarti.", "The Technical Director reads it before calling you.")}
                    </Text>
                  </View>
                  <View style={{ gap: spazio.due }}>
                    <CampoTesto
                      etichetta={t("Numero a cui richiamarti", "Number to call you back on")}
                      value={telefono}
                      onChangeText={(v) => {
                        setTelefono(v);
                        setTelefonoToccato(true);
                        setConfermaTel(false);
                      }}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      errore={provato && !telefonoOk}
                      placeholder="+39 …"
                    />
                    <Text style={[stili.nota, { color: provato && !telefonoOk ? p.errore : p.testoTerzo }]}>
                      {provato && !telefonoOk
                        ? t("Scrivi un numero di cellulare valido.", "Enter a valid mobile number.")
                        : t("Puoi cambiarlo: il Direttore Tecnico ti richiamerà a questo numero.", "You can change it: the Technical Director will call you back on this number.")}
                    </Text>
                    <Consenso
                      spuntato={confermaTel}
                      onCambia={() => setConfermaTel((v) => !v)}
                      errore={provato && telefonoOk && !confermaTel}
                      testo={t("Confermo che posso essere richiamato a questo numero.", "I confirm that I can be called back on this number.")}
                    />
                  </View>
                  {errore ? <Messaggio>{errore}</Messaggio> : null}
                  <Pulsante
                    testo={t("Conferma l’appuntamento", "Confirm the appointment")}
                    icona="spunta"
                    inCorso={invio}
                    onPress={prenota}
                  />
                </>
              ) : errore ? (
                <Messaggio>{errore}</Messaggio>
              ) : null}
            </View>
          )}
        </View>
      </Carta>
    </Sezione>
  );
}

/** Un appuntamento già fissato: quando, di cosa si parla, e «Sposta» / «Annulla» (con conferma). */
function CartaAppuntamento({
  a,
  vista,
  persona,
  onCambiato,
}: {
  a: AppuntamentoDt;
  vista: boolean;
  persona: PersonaJunior;
  onCambiato: () => void;
}) {
  const p = usePalette();
  const [conferma, setConferma] = useState(false);
  const [sposta, setSposta] = useState(false);
  const [esito, setEsito] = useState<EsitoSlotDt | undefined>();
  const [giorno, setGiorno] = useState<string | null>(null);
  const [ora, setOra] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const apriSposta = async () => {
    setSposta(true);
    setConferma(false);
    setErrore(null);
    setEsito(undefined);
    setEsito(await slotDirettoreTecnico(persona.member_id, a.id));
  };
  const giorni = esito?.ok ? esito.giorni : [];
  const slotDelGiorno = giorni.find((g) => g.data === giorno)?.slot ?? [];

  const annulla = async () => {
    setInCorso(true);
    setErrore(null);
    const r = await annullaDirettoreTecnico(a.id);
    setInCorso(false);
    if (r.ok) return onCambiato();
    setErrore(r.errore);
    setConferma(false);
  };
  const conferma_sposta = async () => {
    if (!giorno || !ora) return;
    setInCorso(true);
    setErrore(null);
    const r = await spostaDirettoreTecnico(a.id, giorno, ora);
    setInCorso(false);
    if (r.ok) {
      setSposta(false);
      return onCambiato();
    }
    setErrore(r.errore);
    if (r.slotOccupato) {
      setOra(null);
      setEsito(await slotDirettoreTecnico(persona.member_id, a.id));
    }
  };

  return (
    <View style={[stili.appuntamento, { backgroundColor: p.incavo, borderColor: p.linea }]}>
      <Text style={[stili.sotto, { color: p.testo }]}>
        {giornoLungo(a.data)} · {a.ora}
        {a.durataMinuti ? ` · ${t(`${a.durataMinuti} min`, `${a.durataMinuti} min`)}` : ""}
      </Text>
      {a.motivo ? (
        <Text style={[stili.testo, { color: p.testoSecondario }]} numberOfLines={3}>
          {a.motivo}
        </Text>
      ) : null}
      {errore ? <Messaggio>{errore}</Messaggio> : null}
      {vista ? null : sposta ? (
        <View style={{ gap: spazio.tre }}>
          {!esito ? (
            <SchedeInArrivo quante={1} />
          ) : !esito.ok ? (
            <Messaggio>{esito.errore}</Messaggio>
          ) : (
            <>
              <Text style={[stili.sotto, { color: p.testo }]}>{t("Scegli il nuovo giorno", "Choose the new day")}</Text>
              <Scelte
                valori={giorni.map((g) => ({ valore: g.data, testo: giornoBreve(g.data) }))}
                scelto={giorno}
                onScegli={(v) => {
                  setGiorno(v);
                  setOra(null);
                }}
              />
              {giorno ? (
                <>
                  <Text style={[stili.sotto, { color: p.testo }]}>{t("Scegli il nuovo orario", "Choose the new time")}</Text>
                  <Scelte valori={slotDelGiorno.map((x) => ({ valore: x, testo: x }))} scelto={ora} onScegli={setOra} />
                </>
              ) : null}
              <Pulsante
                testo={t("Conferma lo spostamento", "Confirm the change")}
                icona="spunta"
                inCorso={inCorso}
                disabilitato={!giorno || !ora}
                onPress={conferma_sposta}
              />
            </>
          )}
          <Pulsante testo={t("Lascia com’è", "Keep it as it is")} variante="secondario" piccolo pieno={false} onPress={() => setSposta(false)} disabilitato={inCorso} />
        </View>
      ) : conferma ? (
        <View style={stili.azioni}>
          <Pulsante testo={t("Sì, annulla", "Yes, cancel")} variante="pericolo" piccolo pieno={false} onPress={annulla} inCorso={inCorso} />
          <Pulsante testo={t("No", "No")} variante="secondario" piccolo pieno={false} onPress={() => setConferma(false)} disabilitato={inCorso} />
        </View>
      ) : (
        <View style={stili.azioni}>
          <Pulsante testo={t("Sposta", "Move")} icona="calendario" variante="secondario" piccolo pieno={false} onPress={apriSposta} />
          <Pulsante testo={t("Annulla", "Cancel")} variante="secondario" piccolo pieno={false} onPress={() => setConferma(true)} />
        </View>
      )}
    </View>
  );
}

const stili = StyleSheet.create({
  appuntamento: { gap: spazio.due, padding: spazio.tre, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  azioni: { flexDirection: "row", gap: spazio.due, flexWrap: "wrap" },
  corpo: { gap: spazio.tre, padding: spazio.tre },
  testa: { flexDirection: "row", alignItems: "center", gap: spazio.tre },
  bollino: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  titolo: { flex: 1, fontFamily: F.bold, fontSize: 16, lineHeight: 21 },
  testo: { fontFamily: F.medio, fontSize: 14, lineHeight: 21 },
  riga: { flexDirection: "row", gap: spazio.due, alignItems: "flex-start" },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  nota: { fontFamily: F.medio, fontSize: 12.5, lineHeight: 18 },
  sotto: { fontFamily: F.bold, fontSize: 14 },
});
