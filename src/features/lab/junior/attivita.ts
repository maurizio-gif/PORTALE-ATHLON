import type { GruppoJunior, PersonaJunior } from "@/api/junior";
import { t } from "@/lib/lingua";

import { annoDi, eBaby } from "./comune";

// Cosa sono le attivita' junior e cosa c'e' da sapere di ciascuna (22/10/2026, richiesta di Maurizio): l'app spiega l'attivita' del
// bambino in base a come e' fatta la sua famiglia (Baby Nuoto per l'eta' del Baby, Scuola Nuoto per la sua, Pallanuoto e nuoto
// agonistico dove l'anno di nascita le apre), e quando si sceglie un gruppo mette in evidenza gli aspetti che contano.
//
// **Ogni frase ripete una regola scritta dal club**: le pagine dei corsi (`data/junior.ts` del sito), le schede del Wiki
// (iscrizione, recuperi, disdetta, sospensione) e la knowledge base dell'assistente. Se una regola cambia, cambia in tutti questi
// posti, o l'app dice una cosa e il sito un'altra. Gli anni e i giorni sono quelli della stagione 2026/27. **Nessun prezzo qui**: i
// costi li calcola PerfectGym e li mostra il passo dell'iscrizione.

export type ChiaveAttivita =
  | "baby"
  | "snb"
  | "pallanuoto"
  | "agonistico"
  | "propaganda";

export type Attivita = {
  chiave: ChiaveAttivita;
  nome: () => string;
  claim: () => string;
  cosaE: () => string;
  /** I dati secchi: a chi e', quanto dura, dove, quante volte. */
  inBreve: () => string[];
  /** Gli aspetti che contano, in evidenza: titolo e frase. */
  daSapere: () => { titolo: string; testo: string }[];
};

// Le tre regole di ogni abbonamento mensile dei corsi in vasca (Scuola Nuoto, Pallanuoto, Agonistico, Propaganda).
const MENSILE = () => [
  {
    titolo: t("Rinnovo e disdetta", "Renewal and cancellation"),
    testo: t(
      "L’abbonamento è mensile e si rinnova il 1° di ogni mese. Per disdire scrivi a disdetta@athlonroma.it dall’indirizzo registrato, almeno 10 giorni prima del rinnovo (entro la mezzanotte del 21 per un mese da 31 giorni, del 20 per uno da 30, del 18 per febbraio). Una disdetta in ritardo vale dal mese dopo, e il primo addebito parte comunque.",
      "The membership is monthly and renews on the 1st of each month. To cancel, write to disdetta@athlonroma.it from your registered address at least 10 days before renewal (by midnight on the 21st for a 31-day month, the 20th for a 30-day month, the 18th for February). A late cancellation takes effect the following month, and the first charge still goes through.",
    ),
  },
  {
    titolo: t("Se serve fermarsi", "If you need to pause"),
    testo: t(
      "Qui non esiste la sospensione a pagamento. C’è solo la sospensione per inidoneità documentata di almeno 60 giorni: la quota del mese resta dovuta e il ristoro è un credito di almeno 2 mensilità. Si chiede scrivendo a desk@athlonroma.it con il certificato medico.",
      "There’s no paid pause here. The only option is a suspension for documented unfitness of at least 60 days: the month’s fee is still due and compensation is a credit of at least 2 monthly fees. Request it by writing to desk@athlonroma.it with the medical certificate.",
    ),
  },
];

export const ATTIVITA: Record<ChiaveAttivita, Attivita> = {
  baby: {
    chiave: "baby",
    nome: () => t("Baby Nuoto", "Baby Swim"),
    claim: () => t("In acqua con te, dai tre mesi.", "In the water with you, from three months."),
    cosaE: () =>
      t(
        "Un corso ludico-didattico per far sentire l’acqua come un posto familiare e sicuro. Il bambino scopre l’acqua insieme a un genitore, con lo staff che guida i movimenti: quaranta minuti in cui si sta in acqua insieme.",
        "A play-based course that makes the water feel familiar and safe. Your baby discovers the water together with a parent, with staff guiding the movements: forty minutes in the water together.",
      ),
    inBreve: () => [
      t("Nati nel 2024, 2025 e 2026 (dai 3 mesi)", "Born in 2024, 2025 and 2026 (from 3 months)"),
      t("Lezioni da 40 minuti, con un genitore in acqua", "40-minute classes, with a parent in the water"),
      t("Sabato e domenica mattina: 9:30, 10:10, 10:50, 11:30", "Saturday and Sunday morning: 9:30, 10:10, 10:50, 11:30"),
      t("Due gruppi per età: fino a 15 mesi e oltre i 15 mesi (non per livello)", "Two age groups: up to 15 months and over 15 months (not by level)"),
      t("Acqua tra 31,5 e 32 °C", "Water between 31.5 and 32 °C"),
    ],
    daSapere: () => [
      {
        titolo: t("Si prenota lezione per lezione", "You book class by class"),
        testo: t(
          "A differenza della Scuola Nuoto, qui non c’è un turno fisso: si prenota da 3 giorni prima fino all’inizio della lezione e si disdice fino a 1 ora prima. Puoi scegliere la lezione singola o l’abbonamento mensile.",
          "Unlike the Swim School there’s no fixed slot: you book from 3 days ahead until the class starts and cancel up to 1 hour before. You can choose a single class or the monthly membership.",
        ),
      },
      {
        titolo: t("Il genitore entra in acqua", "A parent goes in the water"),
        testo: t(
          "Entra un genitore o un accompagnatore, e si può cambiare accompagnatore da una lezione all’altra.",
          "A parent or companion goes in, and you can change companion from one class to the next.",
        ),
      },
      {
        titolo: t("Spogliatoi pensati per i piccoli", "Changing rooms made for little ones"),
        testo: t(
          "Adiacenti al piano vasca, con fasciatoi e box, assistenza negli spogliatoi delle mamme e una balconata da cui assistere alla lezione.",
          "Next to the pool deck, with changing tables and cubicles, assistance in the mothers’ changing rooms and a balcony to watch the class from.",
        ),
      },
    ],
  },
  snb: {
    chiave: "snb",
    nome: () => t("Scuola Nuoto Bambini", "Kids Swim School"),
    claim: () => t("Prima la passione. Poi i risultati.", "Passion first. Results follow."),
    cosaE: () =>
      t(
        "Dai 3 anni, in acqua senza il genitore, con i tecnici della scuola nuoto federale di Athlon da oltre cinquant’anni. Prima si costruisce il rapporto del bambino con l’acqua; i risultati arrivano da lì, con un percorso didattico individuale.",
        "From age 3, in the water without a parent, with the technicians of Athlon’s federal swim school for over fifty years. First we build your child’s relationship with the water; results follow, with an individual learning path.",
      ),
    inBreve: () => [
      t("Nati dal 2013 al 2023", "Born 2013 to 2023"),
      t("Dal 14 settembre 2026 al 20 giugno 2027", "From 14 September 2026 to 20 June 2027"),
      t("Lezioni da 40 minuti in vasca piccola (nati 2021, 2022, 2023: 12 m, 120 cm, si tocca) e da 50 minuti in vasca grande (25 m)", "40-minute classes in the small pool (born 2021, 2022, 2023: 12 m, 120 cm, they can stand) and 50 minutes in the big pool (25 m)"),
      t("Turni divisi per età, gruppi divisi per livello", "Slots split by age, groups split by level"),
      t("Brevetto federale e diploma a giugno", "Federal badge and diploma in June"),
    ],
    daSapere: () => [
      {
        titolo: t("Il turno è fisso", "The slot is fixed"),
        testo: t(
          "Giorno e ora si scelgono all’iscrizione e restano gli stessi per tutta la stagione. Col bisettimanale i turni fissi sono due, uno per lezione. Le lezioni non si prenotano una per una e non si cambia orario di settimana in settimana.",
          "You pick the day and time when you enroll and they stay the same all season. With twice a week there are two fixed slots, one per class. Classes aren’t booked one by one and the time doesn’t change week to week.",
        ),
      },
      {
        titolo: t("Se perdi una lezione: il recupero", "If you miss a class: the make-up"),
        testo: t(
          "Prima disdici la lezione (fino a 1 ora prima), poi prenoti il recupero: un’altra lezione della stessa fascia d’età, da 3 giorni prima. Non è un modo per tornare alla lezione appena disdetta. Nella prima settimana di corso e nella settimana dei Brevetti non ci sono recuperi. Servono abbonamento attivo e pagamenti in regola; con la disdetta del contratto si perdono; vanno usati entro il 20 giugno e non passano all’anno dopo.",
          "First cancel the class (up to 1 hour before), then book the make-up: another class for the same age group, from 3 days ahead. It’s not a way back into the class you just cancelled. There are no make-ups in the first week of the course or during Badge week. You need an active membership and payments up to date; cancelling the contract loses them; use them by 20 June, they don’t carry over to next year.",
        ),
      },
      {
        titolo: t("Il gruppo si decide guardandolo nuotare", "The group is decided by watching them swim"),
        testo: t(
          "Dentro lo stesso orario ci sono più corsi e più istruttori. L’istruttore viene assegnato dopo la prima settimana; se in stagione il bambino è pronto per il gruppo successivo, passa senza cambiare orario. I progressi si vedono nella sezione Brevetti.",
          "Within the same time slot there are several courses and instructors. The instructor is assigned after the first week; if your child is ready for the next group during the season they move up without changing time. Progress shows in the Badges section.",
        ),
      },
      {
        titolo: t("Prima di cominciare", "Before you start"),
        testo: t(
          "Serve il certificato medico di idoneità non agonistica (si esentano i bambini fino a 5 anni), da mandare a desk@athlonroma.it. Il tesseramento ASI lo fa il club. Senza metodo di pagamento l’iscrizione viene cancellata entro 24 ore.",
          "A non-competitive medical fitness certificate is required (children up to age 5 are exempt), to send to desk@athlonroma.it. The club handles the ASI membership. Without a payment method the enrollment is cancelled within 24 hours.",
        ),
      },
      {
        titolo: t("Turno al completo", "Full slot"),
        testo: t(
          "Per iscriversi a un turno non c’è una lista d’attesa: si sceglie un altro turno con posti liberi, oppure si scrive alla segreteria.",
          "There’s no waiting list for a slot: pick another slot with spots available, or write to the front desk.",
        ),
      },
      ...MENSILE(),
    ],
  },
  pallanuoto: {
    chiave: "pallanuoto",
    nome: () => t("Pallanuoto", "Water polo"),
    claim: () => t("Nuoto, squadra e tattica di gioco", "Swimming, team and game tactics"),
    cosaE: () =>
      t(
        "Una tradizione che comincia nel 1989: il nuoto incontra il gioco di squadra, insegnando non solo la tecnica ma anche impegno, dedizione e corretta competizione. Due corsi: Acqua Gol per i più piccoli e Under 14 per chi vuole fare sul serio.",
        "A tradition that began in 1989: swimming meets team play, teaching not just technique but commitment, dedication and fair competition. Two courses: Acqua Gol for the youngest and Under 14 for those ready to get serious.",
      ),
    inBreve: () => [
      t("Solo maschile", "Boys only"),
      t("Dagli 8 ai 13 anni, in vasca grande", "Ages 8 to 13, in the big pool"),
      t("Acqua Gol, nati 2016-17-18: 3 sessioni a settimana, ne consigliamo 2", "Acqua Gol, born 2016-17-18: 3 sessions a week, 2 recommended"),
      t("Under 14, nati 2013-14-15: 4 sessioni a settimana, ne consigliamo 3", "Under 14, born 2013-14-15: 4 sessions a week, 3 recommended"),
      t("Livello minimo B2: dorso, stile libero, gambe a rana", "Minimum level B2: backstroke, freestyle, breaststroke kick"),
    ],
    daSapere: () => [
      {
        titolo: t("Prova di inserimento", "Placement trial"),
        testo: t(
          "Prima dell’ammissione c’è una prova di inserimento obbligatoria, che valuta il livello tecnico. Si richiede dalla pagina del corso su athlonroma.it («Richiedi la prova di inserimento»).",
          "Before admission there’s a mandatory placement trial that assesses technical level. Request it from the course page on athlonroma.it (“Request the placement trial”).",
        ),
      },
      {
        titolo: t("Giorni e orari propri", "Their own days and times"),
        testo: t(
          "Il gruppo ha giorni e orari fissi, che vedi accanto al gruppo. I recuperi sono solo della Scuola Nuoto Bambini.",
          "The group has fixed days and times, shown next to the group. Make-ups only apply to the Kids Swim School.",
        ),
      },
      {
        titolo: t("Acqua Gol: senza gare", "Acqua Gol: no competitions"),
        testo: t(
          "Si impara giocando, senza tornei né manifestazioni esterne in questa fase.",
          "Kids learn by playing, with no tournaments or outside events at this stage.",
        ),
      },
      {
        titolo: t("Certificato", "Certificate"),
        testo: t(
          "Serve il certificato medico di idoneità non agonistica.",
          "A non-competitive medical fitness certificate is required.",
        ),
      },
      ...MENSILE(),
    ],
  },
  agonistico: {
    chiave: "agonistico",
    nome: () => t("Nuoto Agonistico", "Competitive Swimming"),
    claim: () => t("Il ponte tra la scuola nuoto e la gara", "The bridge between swim school and racing"),
    cosaE: () =>
      t(
        "Il passo successivo per chi vuole alzare l’asticella: migliorare tecnica, resistenza e consapevolezza, vivere l’esperienza di una squadra e partecipare alle gare ufficiali del Circuito ASI.",
        "The next step for those who want to raise the bar: improving technique, endurance and awareness, living the team experience and taking part in official ASI Circuit races.",
      ),
    inBreve: () => [
      t("Nati dal 2008 al 2015, in vasca grande", "Born 2008 to 2015, in the big pool"),
      t("4 sessioni a settimana, ne servono 3", "4 sessions a week, 3 required"),
      t("Livello minimo B4: dorso, stile libero, rana", "Minimum level B4: backstroke, freestyle, breaststroke"),
      t("Circuito ASI: 4 tappe regionali da novembre a maggio, finale nazionale a giugno", "ASI Circuit: 4 regional stages from November to May, national final in June"),
    ],
    daSapere: () => [
      {
        titolo: t("Prova di inserimento", "Placement trial"),
        testo: t(
          "Prima dell’ammissione c’è una prova di inserimento obbligatoria, che valuta il livello tecnico. Si richiede dalla pagina del corso su athlonroma.it.",
          "Before admission there’s a mandatory placement trial that assesses technical level. Request it from the course page on athlonroma.it.",
        ),
      },
      {
        titolo: t("Le gare", "Races"),
        testo: t(
          "Gli atleti sono divisi per fascia d’età e anno di nascita, con la libertà di iscriversi a una o più gare in base alle proprie ambizioni.",
          "Athletes are split by age group and birth year, free to enter one or more races according to their ambitions.",
        ),
      },
      {
        titolo: t("Certificato agonistico", "Competitive certificate"),
        testo: t(
          "Serve il certificato medico di idoneità agonistica.",
          "A competitive medical fitness certificate is required.",
        ),
      },
      {
        titolo: t("Giorni e orari propri", "Their own days and times"),
        testo: t(
          "Il gruppo ha giorni e orari fissi, che vedi accanto al gruppo. I recuperi sono solo della Scuola Nuoto Bambini.",
          "The group has fixed days and times, shown next to the group. Make-ups only apply to the Kids Swim School.",
        ),
      },
      ...MENSILE(),
    ],
  },
  propaganda: {
    chiave: "propaganda",
    nome: () => t("Nuoto Propaganda", "Propaganda Swimming"),
    claim: () => t("Le prime gare, in un ambiente che motiva", "First races, in a motivating setting"),
    cosaE: () =>
      t(
        "Per chi ha già frequentato la scuola nuoto e vuole continuare a migliorare: si perfezionano le tecniche di base e si vivono le prime gare amatoriali. La partecipazione alle gare promozionali del Circuito ASI è garantita.",
        "For those who’ve already attended swim school and want to keep improving: basic techniques are refined and first amateur races are enjoyed. Participation in the ASI Circuit’s promotional races is guaranteed.",
      ),
    inBreve: () => [
      t("Nati dal 2014 al 2018, in vasca grande", "Born 2014 to 2018, in the big pool"),
      t("Livello minimo B3: stile libero bilaterale, rana completa, delfinizzazione, subacquea 10 m", "Minimum level B3: bilateral freestyle, full breaststroke, dolphin kick, 10 m underwater"),
    ],
    daSapere: () => [
      {
        titolo: t("Certificato agonistico", "Competitive certificate"),
        testo: t(
          "Serve il certificato medico di idoneità agonistica.",
          "A competitive medical fitness certificate is required.",
        ),
      },
      {
        titolo: t("Giorni e orari propri", "Their own days and times"),
        testo: t(
          "Il gruppo ha giorni e orari fissi, che vedi accanto al gruppo. I recuperi sono solo della Scuola Nuoto Bambini.",
          "The group has fixed days and times, shown next to the group. Make-ups only apply to the Kids Swim School.",
        ),
      },
      ...MENSILE(),
    ],
  },
};

/** Di che attivita' e' un gruppo, dal nome. */
export function chiaveDelGruppo(
  g: Pick<GruppoJunior, "nome" | "corso">,
): ChiaveAttivita | null {
  const n = `${g.corso} ${g.nome}`.toLowerCase();
  if (n.includes("propaganda")) return "propaganda";
  if (n.includes("agonistic")) return "agonistico";
  if (n.includes("pallanuoto")) return "pallanuoto";
  if (n.includes("scuola nuoto")) return "snb";
  return null;
}

/** Di che attivita' e' un gruppo a cui la persona e' iscritta, dal solo nome (`{ nome }` come lo da `junior_nucleo`). */
function chiaveDelNome(nome: string): ChiaveAttivita | null {
  return chiaveDelGruppo({ nome, corso: nome });
}

/**
 * Le attivita' da spiegare per una persona: quelle a cui e' iscritta; se non e' iscritta, quelle che il suo anno di nascita apre (il
 * Baby Nuoto per l'eta' del Baby, la Scuola Nuoto per i nati 2013-2023, e dove l'anno le apre Pallanuoto, Propaganda e Agonistico).
 * La prima e' quella principale.
 */
export function attivitaDiPersona(p: PersonaJunior): ChiaveAttivita[] {
  const iscritte = [
    ...new Set(
      p.gruppi.map((g) => chiaveDelNome(g.nome)).filter((x): x is ChiaveAttivita => !!x),
    ),
  ];
  if (iscritte.length) return iscritte;
  if (eBaby(p.data_nascita)) return ["baby"];
  const a = annoDi(p);
  if (a == null) return [];
  const out: ChiaveAttivita[] = [];
  if (a >= 2013 && a <= 2023) out.push("snb");
  if (a >= 2013 && a <= 2018) out.push("pallanuoto");
  if (a >= 2014 && a <= 2018) out.push("propaganda");
  if (a >= 2008 && a <= 2015) out.push("agonistico");
  return out;
}
