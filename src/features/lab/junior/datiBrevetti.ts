import { locale, t } from "@/lib/lingua";

// I brevetti della Scuola Nuoto Bambini (02/11/2026, richiesta di Maurizio). Ogni livello di PerfectGym (categoria di attivita' 28) e' un brevetto, e i livelli sono
// **progressivi**: chi ha il M1 ha gia' conseguito A1, A2 e A3. Il contenuto di ogni livello (il programma e le prove) viene dal **libretto del club**
// («libretto_athlon_1/2_FR/RT definitivo», 02/11/2026), trascritto cosi' com'e': **in caso di dubbio vale il libretto stampato**, e se il club lo cambia si cambia qui.
//
// I dodici livelli, in tre cicli (Art. 5 del libretto):
//   - 1° ciclo «Pre-corso» di ambientamento: Stella Marina 1, 2, 3 (A1, A2, A3);
//   - 2° ciclo «Mini-brevetto»: Anatroccolo 1, 2, 3 (M1, M2, M3);
//   - 3° ciclo «Brevetti»: Cavalluccio Marino (B1), Pinguino (B2), Pinna Bianca (B3), Delfino (B4), Squalo Tigre (B5), Squalo Bianco (B6).
// PerfectGym da' solo il nome del livello di adesso («A2 - Stella Marina 2»); la storia dei passaggi la scrive il nostro database (`junior_livelli_storico`, dal 22/10/2026).
//
// **Ogni livello ha due elenchi, come sul libretto**: le *prove* (la pagina del brevetto: quello che l'esaminatore controlla) e il *programma* (quello che si impara
// nel livello). Le due liste del club non coincidono sempre fra loro (per esempio i «100 metri misti» stanno nel programma del B5 e fra le prove del B6): qui sono
// quelle del libretto. **PerfectGym non sa quali singole prove sono state superate**: si sa solo il livello, quindi le prove si segnano superate per ogni livello
// fino a quello di adesso, compreso. I giudizi (S, B, O, DM), le date e le firme del libretto stampato non ci sono nell'app.

export type CicloBrevetti = "pre" | "mini" | "brevetti";

export type Brevetto = {
  /** «A2», o vuoto se il nome del livello non ha la sigla. */
  codice: string;
  /** Il nome come lo scrive PerfectGym: «Stella Marina 2». */
  nome: string;
  /** Il personaggio del brevetto senza il numero: «Stella Marina». Sui diplomi del club e' il nome del brevetto. */
  specie: string;
  /** Il numero del livello dentro il brevetto («2»), o null. */
  livello: string | null;
};

/** «A2 - Stella Marina 2» -> { codice: 'A2', nome: 'Stella Marina 2', specie: 'Stella Marina', livello: '2' }. */
export function leggiBrevetto(livello: string): Brevetto {
  const m = /^\s*([A-Za-z]\d{1,2})\s*[-–—]\s*(.+?)\s*$/.exec(livello);
  const codice = m ? m[1].toUpperCase() : "";
  const nome = m ? m[2] : livello.trim();
  const n = /^(.*?)\s+(\d{1,2})$/.exec(nome);
  return { codice, nome, specie: n ? n[1] : nome, livello: n ? n[2] : null };
}

export type LivelloBrevetto = {
  codice: string;
  specie: string;
  numero: string | null;
  ciclo: CicloBrevetti;
  /** Solo A1: «con ausili didattici». */
  ausili: boolean;
  /** Quello che si impara nel livello (il «programma» del libretto). */
  programma: () => string[];
  /** Le prove del brevetto (la pagina del brevetto sul libretto). */
  prove: () => string[];
};

type Voci = [string, string][];
const voci = (v: Voci) => () => v.map(([it, en]) => t(it, en));

export const LIVELLI: LivelloBrevetto[] = [
  {
    codice: "A1", specie: "Stella Marina", numero: "1", ciclo: "pre", ausili: true,
    programma: voci([
      ["Ambientamento", "Getting used to the water"],
      ["Salto dal bordo", "Jump from the edge"],
      ["Bollicine", "Blowing bubbles"],
    ]),
    prove: voci([
      ["Salto dal bordo", "Jump from the edge"],
      ["Stellina (accenno)", "Starfish float (first attempt)"],
      ["Bollicine", "Blowing bubbles"],
    ]),
  },
  {
    codice: "A2", specie: "Stella Marina", numero: "2", ciclo: "pre", ausili: false,
    programma: voci([
      ["Galleggiamento prono e supino", "Floating face down and on the back"],
      ["Respirazione da fermo con appoggio", "Breathing while standing, holding the edge"],
      ["Salto dal bordo", "Jump from the edge"],
    ]),
    prove: voci([
      ["Salto dal bordo", "Jump from the edge"],
      ["Respirazione da fermo con appoggio", "Breathing while standing, holding the edge"],
      ["Gambe dorso con ausilio", "Back kick with a float"],
      ["Accenni di cagnolino", "First attempts at doggy paddle"],
    ]),
  },
  {
    codice: "A3", specie: "Stella Marina", numero: "3", ciclo: "pre", ausili: false,
    programma: voci([
      ["Salto dal bordo", "Jump from the edge"],
      ["Immersione", "Going underwater"],
      ["Scivolamento", "Gliding"],
      ["Cagnolino", "Doggy paddle"],
      ["Gambe dorso", "Back kick"],
      ["Gambe stile libero con ausili", "Freestyle kick with floats"],
      ["Respirazioni", "Breathing"],
    ]),
    prove: voci([
      ["Salto dal bordo", "Jump from the edge"],
      ["Immersione", "Going underwater"],
      ["Accenni di gambe dorso", "First attempts at back kick"],
      ["Cagnolino", "Doggy paddle"],
    ]),
  },
  {
    codice: "M1", specie: "Anatroccolo", numero: "1", ciclo: "mini", ausili: false,
    programma: voci([
      ["Galleggiamento prono e supino", "Floating face down and on the back"],
      ["Scivolamento prono e supino", "Gliding face down and on the back"],
      ["Respirazioni da fermo in appoggio, espirazione in acqua", "Breathing while standing at the edge, breathing out in the water"],
      ["Tuffo in ginocchio", "Kneeling dive"],
      ["Spinte e scivolamento in apnea e con espirazione", "Push-offs and glides, holding the breath and breathing out"],
      ["Cagnolino", "Doggy paddle"],
      ["Gambe dorso, 12,50 metri", "Back kick, 12.5 m"],
      ["Spinta e scivolamento", "Push-off and glide"],
      ["Gambe dorso con le braccia in alto", "Back kick with arms up"],
    ]),
    prove: voci([
      ["Tuffo a candela, braccia su", "Feet-first jump, arms up"],
      ["Gambe dorso, 12,50 metri", "Back kick, 12.5 m"],
      ["Spinta e scivolamento", "Push-off and glide"],
      ["Cagnolino, 12,50 metri", "Doggy paddle, 12.5 m"],
      ["Respirazioni in appoggio", "Breathing at the edge"],
      ["Scivolamento prono", "Gliding face down"],
    ]),
  },
  {
    codice: "M2", specie: "Anatroccolo", numero: "2", ciclo: "mini", ausili: false,
    programma: voci([
      ["Gambe stile libero con appoggio, 12,50 metri", "Freestyle kick holding the edge, 12.5 m"],
      ["Gambe dorso, 12,50 metri", "Back kick, 12.5 m"],
      ["Spinta e scivolamento con cambio di fronte da supini a proni e viceversa", "Push-off and glide, turning from back to front and back again"],
      ["Cagnolino", "Doggy paddle"],
      ["Gambe stile libero con ausili e respirazioni saltuarie", "Freestyle kick with floats and occasional breaths"],
      ["Dieci respirazioni a pennello in appoggio", "Ten “brush” breaths at the edge"],
      ["Gambe dorso con le braccia in alto", "Back kick with arms up"],
      ["Tuffo dal bordo vasca, in ginocchio e in piedi", "Dive from the pool edge, kneeling and standing"],
      ["Recupero di un oggetto a 0,80 metri di profondità", "Retrieving an object at 0.8 m depth"],
      ["Cambi di fronte da cagnolino a dorso e viceversa", "Turning from doggy paddle to back and back again"],
      ["Braccia dorso successive", "Alternating back arms"],
    ]),
    prove: voci([
      ["Tuffo dal bordo in ginocchio", "Kneeling dive from the edge"],
      ["Gambe dorso, 12,50 metri, braccia alte", "Back kick, 12.5 m, arms up"],
      ["Gambe stile libero con ausili, 12,50 metri", "Freestyle kick with floats, 12.5 m"],
      ["10 respirazioni a pennello", "10 “brush” breaths"],
      ["Cambi di fronte", "Turning front to back"],
      ["Braccia dorso", "Back arms"],
    ]),
  },
  {
    codice: "M3", specie: "Anatroccolo", numero: "3", ciclo: "mini", ausili: false,
    programma: voci([
      ["Gambe stile libero con ausili e respirazione frontale", "Freestyle kick with floats and front breathing"],
      ["Tuffo in piedi con precedenza del capo, con e senza spinta", "Standing dive head first, with and without push-off"],
      ["Bracciata dorso da braccia in basso, simultanea e successiva", "Back stroke from arms down, together and alternating"],
      ["Alternato con pausa", "Alternating with a pause"],
      ["Recupero di un oggetto a 1,20 metri di profondità e a 3 metri di distanza", "Retrieving an object at 1.2 m depth and 3 m away"],
    ]),
    prove: voci([
      ["Tuffo", "Dive"],
      ["Gambe stile libero e respirazione laterale", "Freestyle kick and side breathing"],
      ["Dorso da braccia in alto", "Back stroke from arms up"],
      ["Dorso alternato con pausa", "Alternating back stroke with a pause"],
      ["Recupero di un oggetto immerso", "Retrieving a submerged object"],
    ]),
  },
  {
    codice: "B1", specie: "Cavalluccio Marino", numero: null, ciclo: "brevetti", ausili: false,
    programma: voci([
      ["Braccia dorso da braccia alte, bracciata successiva", "Back arms from arms up, alternating stroke"],
      ["Gambe stile libero con appoggio e senza (una mano alla coscia), respirazione continua laterale", "Freestyle kick holding the edge and without (one hand on the thigh), continuous side breathing"],
      ["Gambe stile libero con appoggio, bracciata (distesa) e respirazione", "Freestyle kick holding the edge, stroke (extended) and breathing"],
      ["Dorso alternato e continuo", "Alternating and continuous back stroke"],
      ["Tuffo con spinta e precedenza del capo", "Dive with push-off, head first"],
      ["Partenza dorso", "Back start"],
      ["Gambe stile libero con appoggio e bracciate successive (respirazione ogni 2)", "Freestyle kick holding the edge and alternating strokes (breathing every 2)"],
      ["Stile libero successivo", "Alternating freestyle"],
    ]),
    prove: voci([
      ["Tuffo con precedenza del capo", "Dive, head first"],
      ["Partenza dorso", "Back start"],
      ["Stile dorso", "Backstroke"],
      ["Stile libero successivo con ausili, 25 metri", "Alternating freestyle with floats, 25 m"],
      ["Scivolamento e capovolta", "Glide and somersault"],
    ]),
  },
  {
    codice: "B2", specie: "Pinguino", numero: null, ciclo: "brevetti", ausili: false,
    programma: voci([
      ["Stile libero successivo", "Alternating freestyle"],
      ["Stile libero successivo con respirazione mono e bilaterale", "Alternating freestyle with one-side and bilateral breathing"],
      ["Gambe rana", "Breaststroke kick"],
      ["Stile libero, 25 metri", "Freestyle, 25 m"],
      ["Tuffo di partenza", "Starting dive"],
      ["50 metri misti (stile libero e dorso)", "50 m medley (freestyle and back)"],
      ["Virate elementari stile libero e dorso", "Basic turns, freestyle and back"],
      ["Partenze elementari", "Basic starts"],
    ]),
    prove: voci([
      ["Tuffo di partenza (grab start)", "Starting dive (grab start)"],
      ["Stile libero, 25 metri", "Freestyle, 25 m"],
      ["Gambe rana", "Breaststroke kick"],
      ["Braccia rana e gambe stile libero", "Breaststroke arms with freestyle kick"],
    ]),
  },
  {
    codice: "B3", specie: "Pinna Bianca", numero: null, ciclo: "brevetti", ausili: false,
    programma: voci([
      ["Gambe rana e respirazione", "Breaststroke kick and breathing"],
      ["Braccia rana e respirazione", "Breaststroke arms and breathing"],
      ["Coordinazione braccia e gambe con respirazione", "Arm and leg coordination with breathing"],
      ["Stile rana con pausa e doppia gambata", "Breaststroke with a pause and double kick"],
      ["Stile rana", "Breaststroke"],
      ["Virata rana elementare", "Basic breaststroke turn"],
      ["Movimento delfino", "Dolphin movement"],
      ["Gambe delfino", "Dolphin kick"],
      ["Gambe delfino e respirazione", "Dolphin kick and breathing"],
      ["Delfino alternato", "Alternating dolphin"],
      ["75 metri misti (stile libero, dorso, rana)", "75 m medley (freestyle, back, breaststroke)"],
      ["Partenze elementari", "Basic starts"],
    ]),
    prove: voci([
      ["25 metri delfino", "25 m butterfly"],
      ["25 metri stile libero con respirazione bilaterale", "25 m freestyle with bilateral breathing"],
      ["25 metri rana", "25 m breaststroke"],
      ["Movimento a delfino", "Dolphin movement"],
      ["Subacquea, 10 metri", "Underwater, 10 m"],
    ]),
  },
  {
    codice: "B4", specie: "Delfino", numero: null, ciclo: "brevetti", ausili: false,
    programma: voci([
      ["Perfezionamento degli stili dorso, rana e libero", "Refining back, breaststroke and freestyle"],
      ["Stile delfino", "Butterfly"],
      ["Perfezionamento delle partenze", "Refining starts"],
      ["Perfezionamento del delfino", "Refining butterfly"],
      ["100 metri misti", "100 m medley"],
    ]),
    prove: voci([
      ["75 metri misti dorso, rana e stile libero, con virate", "75 m medley (back, breaststroke, freestyle) with turns"],
      ["Perfezionamento del delfino", "Refining butterfly"],
      ["Virata dorso", "Back turn"],
      ["Virata stile libero", "Freestyle turn"],
    ]),
  },
  {
    codice: "B5", specie: "Squalo Tigre", numero: null, ciclo: "brevetti", ausili: false,
    programma: voci([
      ["100 metri misti", "100 m medley"],
      ["Perfezionamento delle virate", "Refining turns"],
      ["Perfezionamento degli stili", "Refining strokes"],
      ["Perfezionamento delle partenze", "Refining starts"],
      ["Nozioni di salvamento", "Basic lifesaving"],
      ["Nozioni di apnea", "Basic breath-hold diving"],
    ]),
    prove: voci([
      ["50 metri stile libero", "50 m freestyle"],
      ["25 metri delfino", "25 m butterfly"],
      ["Virata delfino", "Butterfly turn"],
      ["Virata rana", "Breaststroke turn"],
      ["Recupero di un oggetto a 2,40 metri", "Retrieving an object at 2.4 m"],
    ]),
  },
  {
    codice: "B6", specie: "Squalo Bianco", numero: null, ciclo: "brevetti", ausili: false,
    programma: voci([
      ["Perfezionamento di virate, partenze e stili", "Refining turns, starts and strokes"],
      ["25 metri in apnea", "25 m breath-hold swim"],
      ["Esercizi di salvamento", "Lifesaving exercises"],
      ["Esercizi di pallanuoto", "Water polo exercises"],
    ]),
    prove: voci([
      ["100 metri misti", "100 m medley"],
      ["Esercizi di salvamento", "Lifesaving exercises"],
      ["Esercizi di apnea", "Breath-hold exercises"],
    ]),
  },
];

export const NOMI_CICLO: Record<CicloBrevetti, () => { titolo: string; sotto: string }> = {
  pre: () => ({ titolo: t("Pre-corso", "Pre-course"), sotto: t("Ambientamento", "Getting used to the water") }),
  mini: () => ({ titolo: t("Mini-brevetto", "Mini badge"), sotto: t("Anatroccolo 1, 2, 3", "Duckling 1, 2, 3") }),
  brevetti: () => ({ titolo: t("Brevetti", "Badges"), sotto: t("Sei gradi, dal Cavalluccio Marino allo Squalo Bianco", "Six levels, from Seahorse to Great White Shark") }),
};

/** Il livello del libretto dalla sigla («m1», «M1»), o null. */
export function livelloDi(codice: string): LivelloBrevetto | null {
  return LIVELLI.find((x) => x.codice === codice.toUpperCase()) ?? null;
}

/** Quante posizioni dal primo livello: -1 se la sigla non e' del libretto. */
export function posizioneDi(codice: string): number {
  return LIVELLI.findIndex((x) => x.codice === codice.toUpperCase());
}

/**
 * I livelli **conseguiti**: quello di adesso e tutti i precedenti (i livelli sono progressivi: con il M1 ci sono anche A1, A2 e A3). Vuoto se la sigla non e'
 * del libretto: senza sapere dove si e' non si dice niente.
 */
export function conseguiti(codiceAttuale: string): LivelloBrevetto[] {
  const i = posizioneDi(codiceAttuale);
  return i < 0 ? [] : LIVELLI.slice(0, i + 1);
}

/**
 * I nomi dei brevetti nelle due lingue (02/11/2026, richiesta di Maurizio: «in lingua inglese traducimi i nomi dei brevetti»). **La chiave resta il nome italiano** (e' quello di PerfectGym
 * e dei file dei personaggi); quello che si mostra, nell'app, nel libretto, nel PDF e sul diplomino, passa da `nomeSpecie`. Un nome che qui non c'e' si mostra com'e'.
 */
const SPECIE_EN: Record<string, string> = {
  "Stella Marina": "Starfish",
  Anatroccolo: "Duckling",
  "Cavalluccio Marino": "Seahorse",
  Pinguino: "Penguin",
  "Pinna Bianca": "White Fin",
  Delfino: "Dolphin",
  "Squalo Tigre": "Tiger Shark",
  "Squalo Bianco": "Great White Shark",
};

/** Il nome del brevetto nella lingua dell'app: «Anatroccolo» / «Duckling». */
export function nomeSpecie(specie: string): string {
  return t(specie, SPECIE_EN[specie] ?? specie);
}

/** Il brevetto come lo scrive PerfectGym, nella lingua dell'app: «Anatroccolo 1» / «Duckling 1». */
export function nomeBrevetto(b: Brevetto): string {
  return b.livello ? `${nomeSpecie(b.specie)} ${b.livello}` : nomeSpecie(b.specie);
}

/** Il nome del livello come sul libretto: «Stella Marina 1», «Cavalluccio Marino» (in inglese «Starfish 1», «Seahorse»). */
export function nomeLivello(l: LivelloBrevetto): string {
  return l.numero ? `${nomeSpecie(l.specie)} ${l.numero}` : nomeSpecie(l.specie);
}

/** Il giorno come si legge sull'app: «26 ottobre 2026», nella lingua dell'app e nel fuso di Roma. */
export function giornoBrevetto(iso: string): string {
  return new Date(iso).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
}

/**
 * Le date in cui abbiamo visto arrivare ogni brevetto (03/11/2026): sigla -> data ISO. **Vengono solo dal nostro registro dei passaggi**
 * (`junior_livelli_storico`): PerfectGym e il mirror non hanno nessuna data del livello (verificato: la relazione socio-livello porta solo `id`, `name`, `order`,
 * `activityCategoryId`, `isDeleted` e un `version` che e' quello della definizione del livello, uguale per tutti i bambini che lo hanno). Le righe «al primo
 * rilevamento» non contano: dicono solo che il livello c'era gia' il 22/10/2026, non quando e' arrivato. `passaggi` va dal piu' recente al piu' vecchio.
 */
export function dateDeiPassaggi(passaggi: { livello: string; primo_rilevamento: boolean; rilevato_il: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const x of passaggi) {
    if (x.primo_rilevamento) continue;
    const codice = leggiBrevetto(x.livello).codice;
    // Dal piu' recente: se un livello e' stato raggiunto due volte (un errore corretto), vale l'ultima.
    if (codice && !out[codice]) out[codice] = x.rilevato_il;
  }
  return out;
}
