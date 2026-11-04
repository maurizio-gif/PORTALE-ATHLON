import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import type Animated from "react-native-reanimated";

import { anteprimaIscrizione, firmaIscrizione, type AnteprimaIscrizione, type PersonaDati } from "@/api/abbonamento";
import { Casella } from "@/components/Casella";
import { euro } from "@/lib/eventi";
import { t } from "@/lib/lingua";
import { spazio } from "@/theme";

import { DocumentoContratto, residenzaConPaese, RigaDato } from "../Abbonamento";
import { CorreggiDati } from "../abbonamento/CorreggiDati";
import { Indicatore } from "../abbonamento/Passi";
import { FirmaPad } from "../FirmaPad";
import { scorda, scordaPrefisso } from "../memoria";
import { RiepilogoCosti } from "../RiepilogoCosti";
import { SchermataInArrivo } from "../ui/Attesa";
import { Foglio } from "../ui/Foglio";
import { Icona } from "../ui/Icona";
import { Carta, Messaggio, Pulsante, Sezione } from "../ui/kit";
import { Schermata } from "../ui/Schermata";
import { F, usePalette } from "../ui/tema";
import { colpetto, Tocco } from "../ui/Tocco";
import { vistaCorrente } from "../vista";
import { registraInCorso } from "./inCorso";
import { CHIAVE_GRUPPI_JUNIOR } from "./Junior";

/** Fine della stagione 2026/27 (la stessa di `Iscrizione.tsx`, da riprendere ogni anno con il sito). */
const FINE_STAGIONE = "2027-06-20";

// L'iscrizione di piu' figli insieme (04/11/2026, richiesta di Maurizio), da «Tutti i tuoi figli» → «Iscrivi Stella e Arianna».
// **Per PerfectGym restano iscrizioni separate**: ogni bambino ha il suo contratto (`junior_firma`, uno per figlio, con la sua impronta e
// i suoi consensi) e il suo incasso. Per il genitore e' una procedura sola: i costi di tutti, i dati, i contratti uno dopo l'altro nello
// stesso foglio e **una firma sola** («Firmo i contratti di …», scelta di Maurizio), che vale per ogni contratto. Poi un pagamento
// solo: `/pagamento-figli` (`PagamentoFigli.tsx`).
//
// `?voci=<member_id>:<group_id>,<member_id>:<group_id>` (da due a quattro). Se un contratto non si firma, quelli firmati restano firmati
// (non si rifirmano: il server non lo permette per 15 minuti) e si riprova solo quello mancante.

type Voce = { member_id: number; group_id: string };

function leggiVoci(v: unknown): Voce[] {
  if (typeof v !== "string") return [];
  const voci = v
    .split(",")
    .map((x) => /^(\d{1,10}):(\d{1,10})$/.exec(x.trim()))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ member_id: Number(m[1]), group_id: m[2] }));
  const visti = new Set<number>();
  return voci.filter((x) => (visti.has(x.member_id) ? false : (visti.add(x.member_id), true))).slice(0, 4);
}

type Stato =
  | { ok: true; a: AnteprimaIscrizione }
  | { ok: false; errore: string | null; mancanti: string[] | null; persone_dati: PersonaDati[]; nomeGruppo: string | null };

export function IscrizioneFigli() {
  const p = usePalette();
  const { voci: vociParam } = useLocalSearchParams<{ voci?: string }>();
  const voci = useMemo(() => leggiVoci(vociParam), [vociParam]);
  const vista = !!vistaCorrente();
  const [passo, setPasso] = useState<1 | 2>(1);
  const scorrimento = useRef<Animated.ScrollView>(null);
  const [stati, setStati] = useState<Record<number, Stato>>({});
  const [lettura, setLettura] = useState(true);
  const [datiOk, setDatiOk] = useState(false);
  const [foglio, setFoglio] = useState(false);
  const [consensi, setConsensi] = useState<Record<string, boolean>>({});
  const [firmaPng, setFirmaPng] = useState<string | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [erroreFirma, setErroreFirma] = useState<string | null>(null);
  /** I contratti gia' firmati in questa schermata: member_id → numero. */
  const [firmati, setFirmati] = useState<Record<number, string>>({});
  const giro = useRef(0);

  const carica = useCallback(async () => {
    const mio = ++giro.current;
    setLettura(true);
    const risposte = await Promise.all(
      voci.map((v) => anteprimaIscrizione({ member_id: v.member_id, group_id: v.group_id })),
    );
    if (mio !== giro.current) return;
    const nuovi: Record<number, Stato> = {};
    risposte.forEach((r, i) => {
      const id = voci[i].member_id;
      nuovi[id] = r.ok
        ? { ok: true, a: r.anteprima }
        : {
            ok: false,
            errore: r.mancanti?.length ? null : r.errore,
            mancanti: r.mancanti?.length ? r.mancanti : null,
            persone_dati: r.persone_dati ?? [],
            nomeGruppo: r.gruppo?.nome ?? null,
          };
    });
    setStati(nuovi);
    // Le dichiarazioni: le obbligatorie spuntate e bloccate, la facoltativa come dice il catalogo (uguale per tutti i contratti).
    const prima = risposte.find((r) => r.ok);
    if (prima?.ok) {
      setConsensi((c) =>
        Object.keys(c).length ? c : Object.fromEntries(prima.anteprima.consensi.map((x) => [x.chiave, x.obbligatorio || x.preselezionato])),
      );
    }
    setLettura(false);
  }, [voci]);
  useEffect(() => {
    if (voci.length >= 2) carica();
  }, [carica, voci.length]);

  const anteprime = voci.map((v) => stati[v.member_id]).filter((s): s is { ok: true; a: AnteprimaIscrizione } => !!s?.ok).map((s) => s.a);
  const tuttePronte = anteprime.length === voci.length && voci.length >= 2;
  const nomeDi = (memberId: number) => {
    const s = stati[memberId];
    return s?.ok ? s.a.contraente.nome : (s && !s.ok ? s.persone_dati.find((d) => d.ruolo === "contraente")?.nome : null) ?? t("Senza nome", "No name");
  };
  const elenco = (nomi: string[]) => (nomi.length > 1 ? `${nomi.slice(0, -1).join(", ")} ${t("e", "and")} ${nomi[nomi.length - 1]}` : (nomi[0] ?? ""));
  const nomiTutti = elenco(voci.map((v) => nomeDi(v.member_id)));
  const totaleOggi = anteprime.reduce((s, a) => s + Number(a.importi.calendario?.totale_oggi ?? a.importi.totale_alla_firma ?? 0), 0);
  // Le dichiarazioni sono le stesse in ogni contratto (lo stesso catalogo): si mostrano una volta e valgono per tutti.
  const dichiarazioni = anteprime[0]?.consensi ?? [];
  const obbligatoriOk = tuttePronte && anteprime.every((a) => a.consensi.every((c) => !c.obbligatorio || consensi[c.chiave]));
  // I dati da confermare o correggere: il genitore una volta sola, e ogni bambino.
  const datiPersone = useMemo(() => {
    const visti = new Set<number>();
    const tutti: PersonaDati[] = [];
    for (const v of voci) {
      const s = stati[v.member_id];
      const elencoDati = s ? (s.ok ? (s.a.persone_dati ?? []) : s.persone_dati) : [];
      for (const d of elencoDati) if (!visti.has(d.member_id)) (visti.add(d.member_id), tutti.push(d));
    }
    return tutti.sort((a, b) => (a.ruolo === b.ruolo ? 0 : a.ruolo === "genitore" ? -1 : 1));
  }, [stati, voci]);
  const mancanti = voci.flatMap((v) => {
    const s = stati[v.member_id];
    return s && !s.ok && s.mancanti ? s.mancanti : [];
  });
  const errori = voci
    .map((v) => ({ id: v.member_id, s: stati[v.member_id] }))
    .filter((x) => x.s && !x.s.ok && x.s.errore)
    .map((x) => `${nomeDi(x.id)}: ${(x.s as { errore: string }).errore}`);

  const scorrimentoFoglio = useRef<ScrollView>(null);
  const posti = useRef({ corpo: 0, firma: 0 });
  const [firmaVicina, setFirmaVicina] = useState(false);
  function scorriFoglio(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    const firma = posti.current.corpo + posti.current.firma;
    setFirmaVicina(firma > 0 && contentOffset.y >= firma - layoutMeasurement.height * 0.5);
  }
  function vaiAllaFirma() {
    colpetto("scelta");
    scorrimentoFoglio.current?.scrollTo({ y: Math.max(0, posti.current.corpo + posti.current.firma - 12), animated: true });
  }
  function vai(n: 1 | 2) {
    setPasso(n);
    setTimeout(() => (scorrimento.current as unknown as ScrollView | null)?.scrollTo({ y: 0, animated: true }), 30);
  }

  async function firma() {
    if (!tuttePronte || !firmaPng) return;
    setErroreFirma(null);
    setFirmando(true);
    const fatti: Record<number, string> = { ...firmati };
    for (const v of voci) {
      if (fatti[v.member_id]) continue;
      const st = stati[v.member_id];
      if (!st?.ok) continue;
      const a = st.a;
      const suoi = Object.fromEntries(a.consensi.map((c) => [c.chiave, !!consensi[c.chiave]]));
      const r = await firmaIscrizione({ member_id: v.member_id, group_id: v.group_id, data_inizio: a.data_inizio }, a.impronta, suoi, firmaPng);
      if (!r.ok) {
        setFirmati(fatti);
        setFirmando(false);
        colpetto("errore");
        const giaFirmati = Object.keys(fatti).map((id) => nomeDi(Number(id)));
        return setErroreFirma(
          giaFirmati.length
            ? t(
                `Il contratto di ${nomeDi(v.member_id)} non si è firmato: ${r.errore} Quello di ${elenco(giaFirmati)} è firmato e resta valido: riprova per ${nomeDi(v.member_id)}.`,
                `${nomeDi(v.member_id)}’s contract wasn’t signed: ${r.errore} ${elenco(giaFirmati)}’s is signed and stays valid: try again for ${nomeDi(v.member_id)}.`,
              )
            : `${nomeDi(v.member_id)}: ${r.errore}`,
        );
      }
      fatti[v.member_id] = r.esito.numero;
      registraInCorso({ member_id: v.member_id, group_id: Number(v.group_id), gruppo: a.gruppo.nome, numero: r.esito.numero });
    }
    setFirmati(fatti);
    colpetto("ok");
    setFoglio(false);
    setFirmando(false);
    scorda(CHIAVE_GRUPPI_JUNIOR);
    scordaPrefisso("junior:corsi");
    scorda("abbonamenti:contratti");
    scorda("area");
    const numeri = voci.map((v) => fatti[v.member_id]).filter(Boolean);
    router.replace({ pathname: "/pagamento-figli", params: { numeri: numeri.join(",") } });
  }

  const intestazione = {
    titolo: t("Iscrizione", "Enrollment"),
    sopratitolo: t("Corsi per bambini e ragazzi", "Courses for children and teens"),
    indietro: "/junior" as const,
    barra: false,
  };

  if (vista) {
    return (
      <Schermata {...intestazione}>
        <Messaggio tono="attenzione" titolo={t("Solo dal suo account", "Only from their account")}>
          {t("L’iscrizione si firma dall’account del socio: da qui si guarda e basta.", "The enrollment is signed from the member’s own account: from here you can only look.")}
        </Messaggio>
      </Schermata>
    );
  }
  if (voci.length < 2) {
    return (
      <Schermata {...intestazione}>
        <Messaggio>{t("Non troviamo i figli da iscrivere.", "We can’t find the children to enroll.")}</Messaggio>
        <Pulsante testo={t("Torna alla sezione Junior", "Back to the Junior section")} variante="secondario" onPress={() => router.navigate("/junior" as const)} />
      </Schermata>
    );
  }
  if (lettura && !Object.keys(stati).length) return <SchermataInArrivo titolo={t("Iscrizione", "Enrollment")} />;

  const NOMI_PASSI = [t("Costi", "Costs"), t("Dati e firma", "Details and signature")];
  const SOTTOTITOLI = [
    t(`Le iscrizioni di ${nomiTutti}: quanto e quando paghi.`, `${nomiTutti}’s enrollments: how much you pay and when.`),
    t("Conferma i dati, leggi i contratti e firma una volta sola. Il pagamento viene dopo.", "Confirm the details, read the contracts and sign once. Payment comes next."),
  ];

  return (
    <Schermata {...intestazione} sottotitolo={SOTTOTITOLI[passo - 1]} scorrimento={scorrimento}>
      <View style={{ gap: spazio.quattro }}>
        <Indicatore passo={passo} nomi={NOMI_PASSI} />
        {errori.length ? <Messaggio>{errori.join("\n")}</Messaggio> : null}

        {passo === 1 ? (
          <>
            {voci.map((v) => {
              const s = stati[v.member_id];
              return (
                <Carta key={v.member_id}>
                  <View style={{ gap: spazio.due }}>
                    <Text style={[stili.etichetta, { color: p.testoSecondario }]}>{nomeDi(v.member_id)}</Text>
                    <Text style={[stili.gruppo, { color: p.testo }]}>{s?.ok ? s.a.gruppo.nome : (s && !s.ok ? s.nomeGruppo : null) ?? "…"}</Text>
                    {s?.ok ? (
                      <>
                        <Text style={[stili.nota, { color: p.testoSecondario }]}>
                          {[s.a.gruppo.giorni, s.a.gruppo.orario].filter(Boolean).join(" · ")}
                          {s.a.gruppo.giorni || s.a.gruppo.orario ? " · " : ""}
                          {t(`${euro(s.a.piano.mensile)} al mese`, `${euro(s.a.piano.mensile)} a month`)}
                        </Text>
                        <RiepilogoCosti importi={s.a.importi} primaLezione={s.a.inizi?.[0]?.data ?? null} fineStagione={FINE_STAGIONE} senzaTotale />
                      </>
                    ) : null}
                  </View>
                </Carta>
              );
            })}
            {tuttePronte ? (
              <Messaggio tono="ok" icona="carta" titolo={t(`Oggi in tutto: ${euro(totaleOggi)}`, `Today in total: ${euro(totaleOggi)}`)}>
                {t(
                  "Ogni figlio ha il suo contratto e le sue quote: le paghi tutte insieme, alla fine, con un solo pagamento.",
                  "Each child has their own contract and installments: you pay them all together at the end, in one go.",
                )}
              </Messaggio>
            ) : null}
            <Pulsante testo={t("Continua", "Continue")} icona="avanti" onPress={() => vai(2)} disabilitato={lettura || (!tuttePronte && !mancanti.length)} />
            <Pulsante testo={t("Torna alla sezione Junior", "Back to the Junior section")} variante="fantasma" piccolo pieno={false} onPress={() => router.navigate("/junior" as const)} />
          </>
        ) : null}

        {passo === 2 ? (
          <>
            <Sezione titolo={t("I dati dei contratti", "Contract details")}>
              {anteprime.map((a) => (
                <Carta piatta key={a.contraente.nome + a.gruppo.group_id}>
                  <View style={{ gap: spazio.due }}>
                    <RigaDato nome={t("Nome e cognome", "Full name")} valore={`${a.contraente.nome} ${a.contraente.cognome}`.trim()} />
                    <RigaDato nome={t("Codice fiscale", "Tax code (codice fiscale)")} valore={a.contraente.codice_fiscale?.toUpperCase() ?? null} />
                    <RigaDato nome={t("Gruppo", "Group")} valore={a.gruppo.nome} />
                  </View>
                </Carta>
              ))}
              {anteprime[0] ? (
                <Carta piatta>
                  <View style={{ gap: spazio.due }}>
                    {anteprime[0].genitore ? (
                      <RigaDato nome={t("Firma il genitore", "Signed by the parent")} valore={`${anteprime[0].genitore.nome} ${anteprime[0].genitore.cognome}`.trim()} />
                    ) : null}
                    <RigaDato nome={t("Indirizzo del genitore", "Parent’s address")} valore={residenzaConPaese(anteprime[0].contraente)} />
                    {anteprime[0].contraente.email ? <RigaDato nome="Email" valore={anteprime[0].contraente.email} /> : null}
                    <RigaDato nome={t("Cellulare del genitore", "Parent’s mobile")} valore={anteprime[0].contraente.telefono} />
                  </View>
                </Carta>
              ) : null}
              {mancanti.length ? (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>
                  {t("Per i contratti servono dati corretti: completali qui sotto, poi si va avanti.", "The contracts need correct details: complete them below, then continue.")}
                </Text>
              ) : null}
              {datiPersone.map((d) => (
                <CorreggiDati
                  key={`${d.member_id}-${d.codice_fiscale}-${d.telefono}-${d.indirizzo?.via}-${d.indirizzo?.cap}`}
                  persona={d}
                  titolo={
                    d.ruolo === "genitore"
                      ? t("Indirizzo, cellulare e dati del genitore che firma", "Address, mobile and details of the signing parent")
                      : t(`Correggi i dati di ${d.nome}`, `Correct ${d.nome}’s details`)
                  }
                  senzaRecapiti={d.ruolo === "contraente"}
                  apertoDa={mancanti.length > 0}
                  mancanti={mancanti.length ? mancanti : undefined}
                  onSalvato={() => carica()}
                />
              ))}
              {tuttePronte ? (
                <Casella spuntata={datiOk} onCambia={() => setDatiOk((x) => !x)} etichetta={t("Confermo che i dati sono corretti", "I confirm the details are correct")}>
                  <Text style={{ color: p.testo, fontFamily: F.medio, fontSize: 14, lineHeight: 20 }}>
                    {t("Confermo che questi dati sono corretti.", "I confirm these details are correct.")}
                  </Text>
                </Casella>
              ) : null}
            </Sezione>

            <Messaggio tono="attenzione" titolo={t("Adesso i contratti", "Now the contracts")} icona="documento">
              {t(
                `Leggi i contratti di ${nomiTutti}, uno dopo l’altro, spunti le dichiarazioni e firmi una volta sola: la firma vale per ogni contratto. Il pagamento viene dopo.`,
                `Read ${nomiTutti}’s contracts one after the other, tick the declarations and sign once: the signature applies to each contract. Payment comes next.`,
              )}
            </Messaggio>
            <Pulsante
              testo={t("Leggi i contratti e firma", "Read the contracts and sign")}
              icona="documento"
              onPress={() => {
                setFirmaVicina(false);
                setFoglio(true);
              }}
              disabilitato={!tuttePronte || !datiOk}
            />
            {Object.keys(firmati).length ? (
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t(
                  `Già firmato: ${elenco(Object.keys(firmati).map((id) => nomeDi(Number(id))))}.`,
                  `Already signed: ${elenco(Object.keys(firmati).map((id) => nomeDi(Number(id))))}.`,
                )}
              </Text>
            ) : null}
            <Pulsante testo={t("Indietro", "Back")} variante="fantasma" piccolo pieno={false} onPress={() => vai(1)} />
          </>
        ) : null}
      </View>

      <Foglio
        aperto={foglio && tuttePronte}
        titolo={t("I contratti", "The contracts")}
        sottotitolo={t("Leggili, oppure vai subito alle dichiarazioni e alla firma.", "Read them, or go straight to the declarations and the signature.")}
        onChiudi={() => !firmando && setFoglio(false)}
        scorrimento={scorrimentoFoglio}
        onScorri={scorriFoglio}
        flottante={
          tuttePronte && !firmaVicina ? (
            <Tocco onPress={vaiAllaFirma} etichetta={t("Firma ora: vai alle dichiarazioni e alla firma", "Sign now: go to the declarations and the signature")} scala={0.96} style={[stili.firmaOra, { backgroundColor: p.accento }]}>
              <Text style={{ color: "#fff", fontFamily: F.extra, fontSize: 15 }}>{t("Firma ora", "Sign now")}</Text>
              <Icona nome="giu" size={18} colore="#fff" />
            </Tocco>
          ) : null
        }
      >
        {tuttePronte ? (
          <View style={{ gap: spazio.tre }} onLayout={(e) => (posti.current.corpo = e.nativeEvent.layout.y)}>
            {anteprime.map((a, i) => (
              <View key={a.contraente.nome + a.gruppo.group_id} style={{ gap: spazio.tre }}>
                <Text style={[stili.titoloContratto, { color: p.testo, borderTopColor: p.linea, paddingTop: i ? spazio.quattro : 0, borderTopWidth: i ? 1 : 0 }]}>
                  {t(`Il contratto di ${a.contraente.nome}`, `${a.contraente.nome}’s contract`)} · {a.gruppo.nome}
                </Text>
                <RiepilogoCosti importi={a.importi} primaLezione={a.inizi?.[0]?.data ?? null} fineStagione={FINE_STAGIONE} senzaTotale />
                <DocumentoContratto blocchi={a.documento.blocchi} />
              </View>
            ))}

            <Text style={[stili.titoloContratto, { color: p.testo, marginTop: spazio.tre }]} onLayout={(e) => (posti.current.firma = e.nativeEvent.layout.y)}>
              {t("Dichiarazioni", "Declarations")}
            </Text>
            <Text style={[stili.nota, { color: p.testoSecondario }]}>
              {t(
                `Valgono per ogni contratto (${nomiTutti}). Quelle del contratto sono già spuntate: puoi togliere solo quella facoltativa, per le comunicazioni.`,
                `They apply to each contract (${nomiTutti}). The contract ones are already ticked: you can only untick the optional one, for communications.`,
              )}
            </Text>
            {dichiarazioni.map((c) => (
              <Casella key={c.chiave} spuntata={!!consensi[c.chiave]} bloccata={c.obbligatorio} onCambia={() => setConsensi((x) => ({ ...x, [c.chiave]: !x[c.chiave] }))} etichetta={c.testo}>
                <Text style={{ color: p.testo, fontFamily: F.normale, fontSize: 13, lineHeight: 19 }}>
                  {c.testo}
                  {c.obbligatorio ? "" : t(" (facoltativo)", " (optional)")}
                </Text>
              </Casella>
            ))}

            <Text style={[stili.titoloContratto, { color: p.testo, marginTop: spazio.tre }]}>{t("Firma del genitore", "Parent’s signature")}</Text>
            <FirmaPad onCambia={setFirmaPng} />
            <Text style={{ color: p.testoSecondario, fontFamily: F.medio, fontSize: 12, lineHeight: 17 }}>
              {t(
                `Firmando confermi di aver letto i contratti di ${nomiTutti}: la stessa firma vale per ognuno. Conserviamo la firma insieme a data, ora, indirizzo IP e dispositivo, come prova della sottoscrizione.`,
                `By signing you confirm you have read ${nomiTutti}’s contracts: the same signature applies to each. We keep the signature together with the date, time, IP address and device, as proof of signing.`,
              )}
            </Text>
            {erroreFirma ? <Messaggio>{erroreFirma}</Messaggio> : null}
            <Pulsante
              testo={t(`Firma i contratti di ${nomiTutti}`, `Sign ${nomiTutti}’s contracts`)}
              icona="impronta"
              onPress={firma}
              inCorso={firmando}
              disabilitato={!obbligatoriOk || !firmaPng}
            />
            {!obbligatoriOk ? (
              <Text style={[stili.nota, { color: p.testoSecondario }]}>{t("Spunta tutte le dichiarazioni obbligatorie per firmare.", "Tick all the required declarations to sign.")}</Text>
            ) : null}
          </View>
        ) : null}
      </Foglio>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  etichetta: { fontFamily: F.bold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  gruppo: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
  titoloContratto: { fontFamily: F.extra, fontSize: 18 },
  firmaOra: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
