import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import type Animated from "react-native-reanimated";

import {
  anteprimaIscrizione,
  firmaIscrizione,
  type AnteprimaIscrizione,
  type ImportiContratto,
  type PersonaDati,
} from "@/api/abbonamento";
import { Casella } from "@/components/Casella";
import { euro } from "@/lib/eventi";
import { t } from "@/lib/lingua";
import { CODICE_FISCALE_NON_ATTRIBUITO } from "@/lib/residenteEstero";
import { spazio } from "@/theme";

import {
  DocumentoContratto,
  residenzaConPaese,
  RigaDato,
} from "../Abbonamento";
import { CorreggiDati } from "../abbonamento/CorreggiDati";
import { Indicatore } from "../abbonamento/Passi";
import { FirmaPad } from "../FirmaPad";
import { dataLunga, RiepilogoCosti } from "../RiepilogoCosti";
import { SchermataInArrivo } from "../ui/Attesa";
import { Foglio } from "../ui/Foglio";
import { Icona } from "../ui/Icona";
import { Carta, Messaggio, Pulsante, Sezione } from "../ui/kit";
import { Schermata } from "../ui/Schermata";
import { scorda, scordaPrefisso } from "../memoria";
import { registraInCorso } from "./inCorso";
import { CHIAVE_GRUPPI_JUNIOR } from "./Junior";
import { F, usePalette } from "../ui/tema";
import { colpetto, Tocco } from "../ui/Tocco";
import { vistaCorrente } from "../vista";

/** Fine della stagione 2026/27 (da riprendere ogni anno con il sito). */
const FINE_STAGIONE = "2027-06-20";

// L'iscrizione a un gruppo dei corsi junior, dal portale (21/10/2026, richiesta di Maurizio): quando parte, i costi, i dati, il
// contratto con le dichiarazioni e la firma. Il genitore firma per il minorenne. Il contratto lo crea PerfectGym iscrivendo
// al gruppo (`portale-abbonamento`, azioni `junior_anteprima` e `junior_firma`); **il pagamento e' quello degli abbonamenti**:
// a firma fatta si torna a `/abbonamento`, che trova il contratto firmato e non pagato e riparte dalla scelta del metodo.
// Prezzo, pro-rata e date arrivano dal server: qui si sceglie, si legge e si firma. In vista cliente non si arriva fin qui.

export function Iscrizione() {
  const p = usePalette();
  const {
    group,
    membro,
    baby: babyParam,
  } = useLocalSearchParams<{
    group?: string;
    membro?: string;
    baby?: string;
  }>();
  // Il mensile del Baby Nuoto (22/10/2026): stessa procedura, ma senza gruppo (`?baby=1`).
  const baby = babyParam === "1";
  const memberId = Number(membro);
  const vista = !!vistaCorrente();
  const [passo, setPasso] = useState<1 | 2>(1);
  const scorrimento = useRef<Animated.ScrollView>(null);
  const [anteprima, setAnteprima] = useState<AnteprimaIscrizione | null>(null);
  const [costi, setCosti] = useState<ImportiContratto | null>(null);
  const [inizio, setInizio] = useState<string | null>(null);
  const [nomeGruppo, setNomeGruppo] = useState<string | null>(null);
  const [mancanti, setMancanti] = useState<string[] | null>(null);
  const [personeDati, setPersoneDati] = useState<PersonaDati[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [fermo, setFermo] = useState(false);
  const [lettura, setLettura] = useState(true);
  const [datiOk, setDatiOk] = useState(false);
  const [foglio, setFoglio] = useState(false);
  const [consensi, setConsensi] = useState<Record<string, boolean>>({});
  const [firmaPng, setFirmaPng] = useState<string | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [erroreFirma, setErroreFirma] = useState<string | null>(null);
  const giro = useRef(0);

  /** Il contratto per questa data. Senza data, quella che propone il server (la prima lezione da oggi). */
  const carica = useCallback(
    async (data?: string | null) => {
      const mio = ++giro.current;
      setLettura(true);
      setErrore(null);
      const r = await anteprimaIscrizione({
        member_id: memberId,
        ...(baby ? { baby: true } : { group_id: String(group) }),
        data_inizio: data ?? undefined,
      });
      if (mio !== giro.current) return;
      setLettura(false);
      if (r.ok) {
        const a = r.anteprima;
        setAnteprima(a);
        setCosti(a.importi);
        setInizio(a.data_inizio);
        setNomeGruppo(a.gruppo.nome);
        setMancanti(null);
        setPersoneDati(a.persone_dati ?? []);
        // Le dichiarazioni obbligatorie partono spuntate e non si tolgono: il facoltativo segue il catalogo.
        setConsensi(
          Object.fromEntries(
            a.consensi.map((c) => [
              c.chiave,
              c.obbligatorio || c.preselezionato,
            ]),
          ),
        );
        setFirmaPng(null);
        setErroreFirma(null);
        return;
      }
      setAnteprima(null);
      if (r.data_inizio) setInizio(r.data_inizio);
      if (r.gruppo) setNomeGruppo(r.gruppo.nome);
      if (r.importi) setCosti(r.importi);
      setPersoneDati(r.persone_dati ?? []);
      if (r.mancanti?.length) {
        // Dati mancanti o sbagliati: si correggono qui sotto, non e' un errore da leggere e basta.
        setMancanti(r.mancanti);
        return;
      }
      colpetto("errore");
      setMancanti(null);
      setErrore(r.errore);
      // Senza costi non c'e' niente da scegliere: un gruppo pieno o un'iscrizione non permessa chiude la strada.
      if (!r.importi) setFermo(true);
    },
    [memberId, group, baby],
  );
  useEffect(() => {
    if (!Number.isFinite(memberId) || (!group && !baby)) return setFermo(true);
    carica();
  }, [carica, memberId, group, baby]);

  const scorrimentoFoglio = useRef<ScrollView>(null);
  const posti = useRef({ corpo: 0, firma: 0 });
  const [firmaVicina, setFirmaVicina] = useState(false);
  function scorriFoglio(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    const firma = posti.current.corpo + posti.current.firma;
    setFirmaVicina(
      firma > 0 && contentOffset.y >= firma - layoutMeasurement.height * 0.5,
    );
  }
  function vaiAllaFirma() {
    colpetto("scelta");
    scorrimentoFoglio.current?.scrollTo({
      y: Math.max(0, posti.current.corpo + posti.current.firma - 12),
      animated: true,
    });
  }

  function vai(n: 1 | 2) {
    setErrore(null);
    setPasso(n);
    setTimeout(
      () =>
        (scorrimento.current as unknown as ScrollView | null)?.scrollTo({
          y: 0,
          animated: true,
        }),
      30,
    );
  }

  const obbligatoriOk =
    !!anteprima &&
    anteprima.consensi.every((c) => !c.obbligatorio || consensi[c.chiave]);

  async function firma() {
    if (!anteprima || !firmaPng || !inizio) return;
    setErroreFirma(null);
    setFirmando(true);
    const r = await firmaIscrizione(
      {
        member_id: memberId,
        ...(baby ? { baby: true } : { group_id: String(group) }),
        data_inizio: inizio,
      },
      anteprima.impronta,
      consensi,
      firmaPng,
    );
    if (!r.ok) {
      setFirmando(false);
      colpetto("errore");
      return setErroreFirma(r.errore);
    }
    colpetto("ok");
    setFoglio(false);
    setFirmando(false);
    // Il contratto e' firmato e non pagato: `/abbonamento` lo trova e riparte dal pagamento. La sezione Junior non aspetta il
    // mirror di PerfectGym: lo dice subito («iscrizione in corso, da pagare») e butta le letture di prima.
    if (!baby) {
      registraInCorso({
        member_id: memberId,
        group_id: Number(group),
        gruppo: anteprima.gruppo.nome,
        numero: r.esito.numero,
      });
    }
    scorda(CHIAVE_GRUPPI_JUNIOR);
    scordaPrefisso("junior:corsi");
    scorda("abbonamenti:contratti");
    scorda("area");
    router.replace("/abbonamento" as const);
  }

  const intestazione = {
    titolo: t("Iscrizione", "Enrollment"),
    sopratitolo: baby
      ? "Baby Nuoto"
      : t("Corsi per bambini e ragazzi", "Courses for children and teens"),
    indietro: "/junior" as const,
    barra: false,
  };

  if (vista) {
    return (
      <Schermata {...intestazione}>
        <Messaggio
          tono="attenzione"
          titolo={t("Solo dal suo account", "Only from their account")}
        >
          {t(
            "L’iscrizione si firma dall’account del socio: da qui si guarda e basta.",
            "The enrollment is signed from the member’s own account: from here you can only look.",
          )}
        </Messaggio>
      </Schermata>
    );
  }
  if (fermo && errore)
    return (
      <Schermata {...intestazione}>
        <Messaggio>{errore}</Messaggio>
        <Pulsante
          testo={
            baby
              ? t("Torna alla sezione Junior", "Back to the Junior section")
              : t("Torna ai gruppi", "Back to groups")
          }
          variante="secondario"
          onPress={() => router.navigate("/junior" as const)}
        />
      </Schermata>
    );
  if (fermo)
    return (
      <Schermata {...intestazione}>
        <Messaggio>
          {baby
            ? t(
                "Non troviamo questo abbonamento.",
                "We can’t find this membership.",
              )
            : t("Non troviamo questo gruppo.", "We can’t find this group.")}
        </Messaggio>
      </Schermata>
    );
  if (!costi && lettura)
    return <SchermataInArrivo titolo={t("Iscrizione", "Enrollment")} />;

  const NOMI_PASSI = [
    t("Data e costi", "Date and costs"),
    t("Dati e firma", "Details and signature"),
  ];
  const SOTTOTITOLI = [
    t(
      "Scegli quando parte: vedi subito quanto e quando paghi.",
      "See right away how much you pay and when.",
    ),
    t(
      "Conferma i dati, leggi il contratto e firma. Il pagamento viene dopo.",
      "Confirm the details, read the contract and sign. Payment comes next.",
    ),
  ];

  return (
    <Schermata
      {...intestazione}
      sottotitolo={SOTTOTITOLI[passo - 1]}
      scorrimento={scorrimento}
    >
      <View style={{ gap: spazio.quattro }}>
        <Indicatore passo={passo} nomi={NOMI_PASSI} />
        {errore ? <Messaggio>{errore}</Messaggio> : null}

        {anteprima || nomeGruppo ? (
          <Carta piatta>
            <Text
              style={{
                color: p.testoSecondario,
                fontFamily: F.medio,
                fontSize: 12,
              }}
            >
              {baby ? t("Abbonamento", "Membership") : t("Gruppo", "Group")}
            </Text>
            <Text
              style={{
                color: p.testo,
                fontFamily: F.extra,
                fontSize: 18,
                letterSpacing: -0.3,
              }}
            >
              {anteprima?.gruppo.nome ?? nomeGruppo}
            </Text>
            {anteprima ? (
              <Text
                style={{
                  color: p.testoSecondario,
                  fontFamily: F.medio,
                  fontSize: 13,
                }}
              >
                {[anteprima.gruppo.giorni, anteprima.gruppo.orario]
                  .filter(Boolean)
                  .join(" · ")}
                {anteprima.gruppo.giorni || anteprima.gruppo.orario
                  ? " · "
                  : ""}
                {t(
                  `${euro(anteprima.piano.mensile)} al mese`,
                  `${euro(anteprima.piano.mensile)} a month`,
                )}
              </Text>
            ) : null}
          </Carta>
        ) : null}

        {passo === 1 ? (
          <>
            <Sezione
              titolo={t("Il tuo piano di pagamento", "Your payment plan")}
            >
              {costi ? (
                <RiepilogoCosti
                  importi={costi}
                  primaLezione={anteprima?.inizi?.[0]?.data ?? null}
                  fineStagione={baby ? undefined : FINE_STAGIONE}
                  senzaTotale
                />
              ) : (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>
                  {t("Calcoliamo i costi…", "Calculating the costs…")}
                </Text>
              )}
              {lettura && costi ? (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>
                  {t("Aggiorniamo i costi…", "Updating the costs…")}
                </Text>
              ) : null}
            </Sezione>

            <Pulsante
              testo={t("Continua", "Continue")}
              icona="avanti"
              onPress={() => vai(2)}
              disabilitato={!costi || lettura}
            />
            <Pulsante
              testo={
                baby
                  ? t("Torna alla sezione Junior", "Back to the Junior section")
                  : t("Torna ai gruppi", "Back to groups")
              }
              variante="fantasma"
              piccolo
              pieno={false}
              onPress={() => router.navigate("/junior" as const)}
            />
          </>
        ) : null}

        {passo === 2 ? (
          <>
            <Sezione
              titolo={
                anteprima?.genitore
                  ? t("I dati del contratto", "Contract details")
                  : t("I dati", "Details")
              }
            >
              {lettura && !anteprima ? (
                <Text style={[stili.nota, { color: p.testoSecondario }]}>
                  {t("Prepariamo il contratto…", "Preparing the contract…")}
                </Text>
              ) : anteprima ? (
                <>
                  <Carta piatta>
                    <View style={{ gap: spazio.due }}>
                      <RigaDato
                        nome={t("Nome e cognome", "Full name")}
                        valore={`${anteprima.contraente.nome} ${anteprima.contraente.cognome}`.trim()}
                      />
                      <RigaDato
                        nome={t("Nato/a il", "Born on")}
                        valore={
                          anteprima.contraente.data_nascita
                            ? dataLunga(anteprima.contraente.data_nascita)
                            : null
                        }
                      />
                      <RigaDato
                        nome={t("Codice fiscale", "Tax code (codice fiscale)")}
                        valore={
                          anteprima.contraente.codice_fiscale?.toUpperCase() ??
                          (anteprima.contraente.senza_codice_fiscale
                            ? CODICE_FISCALE_NON_ATTRIBUITO
                            : null)
                        }
                      />
                      <RigaDato
                        nome={
                          anteprima.genitore
                            ? t("Indirizzo del genitore", "Parent’s address")
                            : t("Residenza", "Address")
                        }
                        valore={residenzaConPaese(anteprima.contraente)}
                      />
                      {anteprima.contraente.email ? (
                        <RigaDato
                          nome="Email"
                          valore={anteprima.contraente.email}
                        />
                      ) : null}
                      <RigaDato
                        nome={
                          anteprima.genitore
                            ? t("Cellulare del genitore", "Parent’s mobile")
                            : t("Telefono", "Phone")
                        }
                        valore={anteprima.contraente.telefono}
                      />
                      {anteprima.genitore ? (
                        <RigaDato
                          nome={t("Firma il genitore", "Signed by the parent")}
                          valore={`${anteprima.genitore.nome} ${anteprima.genitore.cognome}`.trim()}
                        />
                      ) : null}
                    </View>
                  </Carta>
                  {personeDati.map((d) => (
                    <CorreggiDati
                      key={`${d.member_id}-${d.codice_fiscale}-${d.paese}-${d.telefono}-${d.indirizzo?.via}-${d.indirizzo?.cap}-${d.indirizzo?.paese}`}
                      persona={d}
                      titolo={
                        d.ruolo === "genitore"
                          ? t(
                              "Indirizzo, cellulare e dati del genitore che firma",
                              "Address, mobile and details of the signing parent",
                            )
                          : t("Correggi i dati", "Correct the details")
                      }
                      senzaRecapiti={
                        d.ruolo === "contraente" && !!anteprima.genitore
                      }
                      onSalvato={() => carica(inizio)}
                    />
                  ))}
                  <Casella
                    spuntata={datiOk}
                    onCambia={() => setDatiOk((v) => !v)}
                    etichetta={t(
                      "Confermo che i dati sono corretti",
                      "I confirm the details are correct",
                    )}
                  >
                    <Text
                      style={{
                        color: p.testo,
                        fontFamily: F.medio,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      {t(
                        "Confermo che questi dati sono corretti.",
                        "I confirm these details are correct.",
                      )}
                    </Text>
                  </Casella>
                </>
              ) : mancanti?.length ? (
                <>
                  <Text style={[stili.nota, { color: p.testoSecondario }]}>
                    {t(
                      "Per il contratto servono dati corretti: completali qui sotto, poi si va avanti.",
                      "The contract needs correct details: complete them below, then continue.",
                    )}
                  </Text>
                  {personeDati.map((d) => (
                    <CorreggiDati
                      key={`${d.member_id}-m`}
                      persona={d}
                      titolo={
                        d.ruolo === "genitore"
                          ? t(
                              "Indirizzo, cellulare e dati del genitore che firma",
                              "Address, mobile and details of the signing parent",
                            )
                          : t("I dati", "Details")
                      }
                      senzaRecapiti={
                        d.ruolo === "contraente" &&
                        personeDati.some((x) => x.ruolo === "genitore")
                      }
                      apertoDa
                      mancanti={mancanti}
                      onSalvato={() => carica(inizio)}
                    />
                  ))}
                </>
              ) : null}
            </Sezione>

            <Messaggio
              tono="attenzione"
              titolo={t("Adesso il contratto", "Now the contract")}
              icona="documento"
            >
              {anteprima?.firmatario === "genitore"
                ? t(
                    "Lo leggi, spunti le dichiarazioni e firma il genitore, con il dito o con il mouse. Il pagamento viene dopo: carta o conto corrente, lo scegli allora.",
                    "You read it, tick the declarations and the parent signs with a finger or the mouse. Payment comes next: card or bank account, you choose then.",
                  )
                : t(
                    "Lo leggi, spunti le dichiarazioni e firmi con il dito o con il mouse. Il pagamento viene dopo: carta o conto corrente, lo scegli allora.",
                    "You read it, tick the declarations and sign with a finger or the mouse. Payment comes next: card or bank account, you choose then.",
                  )}
            </Messaggio>

            <Pulsante
              testo={t(
                "Leggi il contratto e firma",
                "Read the contract and sign",
              )}
              icona="documento"
              onPress={() => {
                setFirmaVicina(false);
                setFoglio(true);
              }}
              disabilitato={!anteprima || !datiOk}
            />
            {anteprima && !datiOk ? (
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t(
                  "Conferma i dati per continuare.",
                  "Confirm the details to continue.",
                )}
              </Text>
            ) : null}
            <Pulsante
              testo={t("Indietro", "Back")}
              variante="fantasma"
              piccolo
              pieno={false}
              onPress={() => vai(1)}
            />
          </>
        ) : null}
      </View>

      <Foglio
        aperto={foglio && !!anteprima}
        titolo={t("Il contratto", "The contract")}
        sottotitolo={t(
          "Leggilo, oppure vai subito alle dichiarazioni e alla firma.",
          "Read it, or go straight to the declarations and the signature.",
        )}
        onChiudi={() => !firmando && setFoglio(false)}
        scorrimento={scorrimentoFoglio}
        onScorri={scorriFoglio}
        flottante={
          anteprima && !firmaVicina ? (
            <Tocco
              onPress={vaiAllaFirma}
              etichetta={t(
                "Firma ora: vai alle dichiarazioni e alla firma",
                "Sign now: go to the declarations and the signature",
              )}
              scala={0.96}
              style={[stili.firmaOra, { backgroundColor: p.accento }]}
            >
              <Text
                style={{ color: "#fff", fontFamily: F.extra, fontSize: 15 }}
              >
                {t("Firma ora", "Sign now")}
              </Text>
              <Icona nome="giu" size={18} colore="#fff" />
            </Tocco>
          ) : null
        }
      >
        {anteprima ? (
          <View
            style={{ gap: spazio.tre }}
            onLayout={(e) => (posti.current.corpo = e.nativeEvent.layout.y)}
          >
            <RiepilogoCosti
              importi={anteprima.importi}
              primaLezione={anteprima.inizi?.[0]?.data ?? null}
              fineStagione={baby ? undefined : FINE_STAGIONE}
              senzaTotale
            />
            <DocumentoContratto blocchi={anteprima.documento.blocchi} />

            <Text
              style={{
                color: p.testo,
                fontFamily: F.extra,
                fontSize: 18,
                marginTop: spazio.tre,
              }}
              onLayout={(e) => (posti.current.firma = e.nativeEvent.layout.y)}
            >
              {t("Dichiarazioni", "Declarations")}
            </Text>
            {anteprima.consensi.some((c) => !c.obbligatorio) ? (
              <Text
                style={{
                  color: p.testoSecondario,
                  fontFamily: F.medio,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {t(
                  "Le dichiarazioni del contratto sono già spuntate. Puoi togliere solo quella facoltativa, per le comunicazioni.",
                  "The contract declarations are already ticked. You can only untick the optional one, for communications.",
                )}
              </Text>
            ) : null}
            {anteprima.consensi.map((c) => (
              <Casella
                key={c.chiave}
                spuntata={!!consensi[c.chiave]}
                bloccata={c.obbligatorio}
                onCambia={() =>
                  setConsensi((x) => ({ ...x, [c.chiave]: !x[c.chiave] }))
                }
                etichetta={c.testo}
              >
                <Text
                  style={{
                    color: p.testo,
                    fontFamily: F.normale,
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  {c.testo}
                  {c.obbligatorio ? "" : t(" (facoltativo)", " (optional)")}
                </Text>
              </Casella>
            ))}

            <Text
              style={{
                color: p.testo,
                fontFamily: F.extra,
                fontSize: 18,
                marginTop: spazio.tre,
              }}
            >
              {anteprima.firmatario === "genitore"
                ? t("Firma del genitore", "Parent’s signature")
                : t("La tua firma", "Your signature")}
            </Text>
            <FirmaPad onCambia={setFirmaPng} />
            <Text
              style={{
                color: p.testoSecondario,
                fontFamily: F.medio,
                fontSize: 12,
                lineHeight: 17,
              }}
            >
              {t(
                "Firmando confermi di aver letto il contratto. Conserviamo la firma insieme a data, ora, indirizzo IP e dispositivo, come prova della sottoscrizione.",
                "By signing you confirm you have read the contract. We keep the signature together with the date, time, IP address and device, as proof of signing.",
              )}
            </Text>
            {erroreFirma ? <Messaggio>{erroreFirma}</Messaggio> : null}
            <Pulsante
              testo={t("Firma il contratto", "Sign the contract")}
              icona="impronta"
              onPress={firma}
              inCorso={firmando}
              disabilitato={!obbligatoriOk || !firmaPng}
            />
            {!obbligatoriOk ? (
              <Text style={[stili.nota, { color: p.testoSecondario }]}>
                {t(
                  "Spunta tutte le dichiarazioni obbligatorie per firmare.",
                  "Tick all the required declarations to sign.",
                )}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Foglio>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  giorno: {
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  nota: { fontFamily: F.medio, fontSize: 13, lineHeight: 19 },
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
