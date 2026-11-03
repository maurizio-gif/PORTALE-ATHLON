import { locale, t } from "@/lib/lingua";

// I brevetti della Scuola Nuoto Bambini (02/11/2026, richiesta di Maurizio). Ogni livello di PerfectGym (categoria di attivita' 28) e' un brevetto, e i livelli sono
// **progressivi**: chi ha il M1 ha gia' conseguito A1, A2 e A3. **Le prove** di ogni livello sono dal 04/11/2026 **quelle di PerfectGym** («Livelli e abilita'», la stampa che Maurizio
// ha mandato il 03/11/2026: 57 abilita' in dodici livelli, stesso testo e stesso ordine), che sostituiscono quelle trascritte dal libretto stampato; **il programma** («Cosa si impara») resta
// quello del **libretto del club** («libretto_athlon_1/2_FR/RT definitivo», 02/11/2026). Se il club cambia le abilita' in PerfectGym si cambia qui E nel database (`brevetti_prove`):
// la chiave di una prova e' (livello, ordine) e l'ordine non si cambia da una parte sola.
//
// I dodici livelli, in tre cicli (Art. 5 del libretto):
//   - 1° ciclo «Pre-corso» di ambientamento: Stella Marina 1, 2, 3 (A1, A2, A3);
//   - 2° ciclo «Mini-brevetto»: Anatroccolo 1, 2, 3 (M1, M2, M3);
//   - 3° ciclo «Brevetti»: Cavalluccio Marino (B1), Pinguino (B2), Pinna Bianca (B3), Delfino (B4), Squalo Tigre (B5), Squalo Bianco (B6).
// PerfectGym da' solo il nome del livello di adesso («A2 - Stella Marina 2»); la storia dei passaggi la scrive il nostro database (`junior_livelli_storico`, dal 22/10/2026).
//
// **Ogni livello ha due elenchi**: le *prove* (quello che l'esaminatore controlla: le abilita' di PerfectGym) e il *programma* (quello che si impara nel livello, dal libretto). Le due
// liste non coincidono sempre fra loro (per esempio i «100 metri misti» stanno nel programma del B5 e fra le prove del B6). **Nel mirror di PerfectGym ci sono i livelli dei soci ma non le
// abilita' spuntate** (la schermata «Livelli e abilita'» le mostra, il mirror non le ha): le prove superate le tiene il nostro database (`junior_brevetti_prove`), e quelle dei livelli
// ottenuti si danno per superate. I giudizi (S, B, O, DM), le date e le firme del libretto stampato non ci sono nell'app.

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
      ["Ambientamento", "Getting used to the water"],
      ["Salto dal Bordo con ausilio", "Jump from the edge with a learning aid"],
      ["Bollicine", "Blowing bubbles"],
      ["Stellina (accenno)", "Starfish float (first attempt)"],
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
      ["Respirazione da fermo con appoggio (viso in acqua)", "Breathing while standing, holding the edge (face in the water)"],
      ["Gambe Dorso con ausilio", "Back kick with a float"],
      ["Cenni Cagnolino", "First attempts at doggy paddle"],
      ["Galleggiamento supino", "Floating on the back"],
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
      ["Tuffo a candela", "Feet-first jump"],
      ["Immersione", "Going underwater"],
      ["Accenni gambe Dorso", "First attempts at back kick"],
      ["Cagnolino", "Doggy paddle"],
      ["Respirazioni ritmiche al muro", "Rhythmic breathing at the wall"],
      ["Scivolamento supino", "Gliding on the back"],
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
      ["Tuffo a candela braccia in alto", "Feet-first jump, arms up"],
      ["Gambe Dorso 12,5m", "Back kick, 12.5 m"],
      ["Spinta e scivolamento supino", "Push-off and glide on the back"],
      ["Cagnolino 12,5m con respirazioni", "Doggy paddle with breathing, 12.5 m"],
      ["Respirazioni ritmiche mani e piedi al muro", "Rhythmic breathing, hands and feet on the wall"],
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
      ["Scivolamento supino, gambe Dorso 12,5m braccia in alto", "Glide on the back, back kick with arms up, 12.5 m"],
      ["Scivolamento prono, gambe stile con ausilio 12,5m respirazione frontale", "Glide face down, freestyle kick with a float and front breathing, 12.5 m"],
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
      ["Tuffo dal bordo", "Dive from the edge"],
      ["Scivolamento prono, gambe Stile Libero, respirazione laterale con ausilio", "Glide face down, freestyle kick, side breathing with a float"],
      ["Dorso successivo", "Alternating backstroke"],
      ["Dorso alternato con pausa", "Alternating back stroke with a pause"],
      ["Recupero oggetto immerso in acqua bassa", "Retrieving a submerged object in shallow water"],
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
      ["Tuffo di partenza con precedenza del capo", "Starting dive, head first"],
      ["Partenza Dorso", "Back start"],
      ["Dorso completo 25m", "Full backstroke, 25 m"],
      ["Stile Libero successivo 25m", "Alternating freestyle, 25 m"],
      ["Scivolamento + capovolta", "Glide and somersault"],
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
      ["Tuffo di partenza Grab Start", "Starting dive (grab start)"],
      ["Stile Libero completo 25m", "Full freestyle, 25 m"],
      ["Gambe rana", "Breaststroke kick"],
      ["Braccia Rana gambe Stile Libero", "Breaststroke arms with freestyle kick"],
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
      ["Tuffo di partenza Track Start", "Starting dive (track start)"],
      ["Stile Libero respirazione bilaterale 25m", "Freestyle with bilateral breathing, 25 m"],
      ["Rana completa 25m", "Full breaststroke, 25 m"],
      ["Movimento a Delfino", "Dolphin movement"],
      ["Subacquea 10m", "Underwater, 10 m"],
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
      ["75m Misti Dorso-Rana-Stile + virate", "75 m medley (back, breaststroke, freestyle) with turns"],
      ["Perfezionamento Delfino", "Refining butterfly"],
      ["Virata Dorso", "Back turn"],
      ["Virata Stile Libero", "Freestyle turn"],
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
      ["50m Stile Libero a tempo", "50 m freestyle, timed"],
      ["Recupero oggetto in acqua alta", "Retrieving an object in deep water"],
      ["Delfino completo 25m", "Full butterfly, 25 m"],
      ["Virata Rana", "Breaststroke turn"],
      ["Virata Delfino", "Butterfly turn"],
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
      ["100m Misti a tempo", "100 m medley, timed"],
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
