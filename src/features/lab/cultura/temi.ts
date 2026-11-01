import { t } from '@/lib/lingua'

import type { NomeIcona } from '../ui/Icona'
import { FUOCO, MARE, NOTTE, ORTO } from '../ui/tema'

// «Capire il cibo» (01/11/2026, idea di Maurizio da un'app di allenamento vista per caso): sei letture brevi di
// cultura alimentare nell'area Food. Non sono consigli e non sono diete: il club non ha un nutrizionista, quindi
// niente cifre «da raggiungere» e nessuna frase che dica a una persona quanto deve mangiare. Si spiega come
// funzionano le cose, con i riferimenti pubblici (LARN, ACSM, CREA) mostrati come riferimenti.
//
// **Sono contenuti generali, senza dati personali**: si leggono anche prima del consenso all'informativa di Food e
// non toccano il diario. Solo per i maggiorenni, come tutta l'area Food.
//
// **I numeri sono ricordati, non riletti alla fonte** (come nei consigli, `consigli.ts`): vanno ricontrollati prima
// di aprire la sezione a tutti. Ogni tema porta in fondo le sue fonti.

export type NomeVisual = 'kcal-grammo' | 'larn' | 'fonti-proteine' | 'altalena' | 'dove-va-energia' | 'timeline' | 'urine' | 'nova'

export type Macro = 'proteine' | 'carboidrati' | 'grassi'

export type Blocco =
  | { tipo: 'testo'; titolo?: string; testo: string }
  | { tipo: 'punti'; titolo?: string; voci: { titolo: string; testo: string; macro?: Macro; emoji?: string }[] }
  | { tipo: 'visual'; visual: NomeVisual; titolo?: string; didascalia?: string }
  | { tipo: 'mito'; mito: string; realta: string }

export type IdTema = 'macros' | 'proteine' | 'bilancio' | 'prima-dopo' | 'idratazione' | 'qualita'

export type Tema = {
  id: IdTema
  titolo: string
  /** La riga sotto il nome, nella tessera e in cima alla lettura. */
  sottotitolo: string
  minuti: number
  icona: NomeIcona
  /** Tre illustrazioni (emoji) per la tessera e per l'apertura della lettura: la grande, la media, la piccola. */
  emoji: readonly [string, string, string]
  /** Il fondo della tessera e dell'apertura della lettura. */
  colori: readonly [string, string, string]
  /** Il colore dei grafici dentro la lettura (chiaro come l'arancio del club, mai quello di un fondo scuro). */
  accento: string
  unaRiga: string
  blocchi: Blocco[]
  fonti: string
}

const ROSSO = ['#FF7A93', '#E5484D', '#B42335'] as const
const VIOLA = ['#B79CFF', '#7C5CF0', '#5B3BC9'] as const

export const COLORE_MACRO: Record<Macro, string> = { proteine: ORTO[1], carboidrati: '#F2B84B', grassi: '#FF8A5B' }

export const TEMI: Tema[] = [
  // -------------------------------------------------------------------------
  {
    id: 'macros',
    titolo: t('Capire i macros', 'Understanding macros'),
    sottotitolo: t('Le tre famiglie di nutrienti che portano energia', 'The three families of nutrients that carry energy'),
    minuti: 3,
    icona: 'macros',
    emoji: ['🥩', '🍚', '🥑'],
    colori: FUOCO,
    accento: FUOCO[1],
    unaRiga: t(
      'Proteine, carboidrati e grassi servono tutti: cambia quanta energia porta ogni grammo e che lavoro fa ciascuno.',
      'Protein, carbs and fat are all needed: what changes is how much energy each gram carries and what job each one does.',
    ),
    blocchi: [
      {
        tipo: 'punti',
        titolo: t('Chi fa cosa', 'Who does what'),
        voci: [
          { macro: 'proteine', emoji: '🥩', titolo: t('Proteine', 'Protein'), testo: t('Mattoni per muscoli, enzimi e ormoni: servono a riparare e a costruire.', 'Building blocks for muscles, enzymes and hormones: they repair and build.') },
          { macro: 'carboidrati', emoji: '🍚', titolo: t('Carboidrati', 'Carbs'), testo: t('Il carburante preferito di cervello e muscoli, soprattutto quando ti alleni.', 'The preferred fuel of the brain and muscles, especially when you train.') },
          { macro: 'grassi', emoji: '🥑', titolo: t('Grassi', 'Fat'), testo: t('Riserva di energia, ormoni, pareti delle cellule e trasporto delle vitamine A, D, E e K.', 'Energy reserve, hormones, cell walls, and transport of vitamins A, D, E and K.') },
        ],
      },
      {
        tipo: 'visual',
        visual: 'kcal-grammo',
        titolo: t('Energia per grammo', 'Energy per gram'),
        didascalia: t('Un grammo di grassi porta più del doppio dell’energia di un grammo di proteine o di carboidrati. Per questo anche un filo d’olio si fa sentire nel conto.', 'A gram of fat carries more than twice the energy of a gram of protein or carbs. That’s why even a drizzle of oil shows up in the count.'),
      },
      {
        tipo: 'mito',
        mito: t('Un macro è “buono” e un altro è “cattivo”.', 'One macro is “good” and another is “bad”.'),
        realta: t('Nessun gruppo si elimina: ognuno ha il suo compito. Le scelte che tolgono un intero gruppo sono spesso difficili da mantenere e vanno parlate con un medico.', 'No group gets cut out: each has its job. Choices that remove a whole group are often hard to keep up and should be discussed with a doctor.'),
      },
      {
        tipo: 'visual',
        visual: 'larn',
        titolo: t('I riferimenti per gli adulti', 'References for adults'),
        didascalia: t('Sono intervalli di riferimento, non traguardi da centrare ogni giorno: nel diario di Food trovi la ripartizione della tua giornata accanto a queste fasce.', 'These are reference ranges, not targets to hit every day: in your Food diary you’ll see your day’s split next to these bands.'),
      },
      {
        tipo: 'testo',
        titolo: t('Perché se ne parla tanto', 'Why everyone talks about them'),
        testo: t('Sono le calorie totali a decidere se il peso sale o scende. La ripartizione fra i macros pesa su altro: la sazietà, l’energia che hai in allenamento, il recupero e la costruzione dei muscoli.', 'Total calories decide whether your weight goes up or down. The split between macros matters for other things: fullness, the energy you have in training, recovery and muscle building.'),
      },
    ],
    fonti: t('LARN 2014 (SINU); ACSM, Academy of Nutrition and Dietetics e Dietitians of Canada 2016; fattori di Atwater (4, 4, 9 kcal/g).', 'LARN 2014 (SINU); ACSM, Academy of Nutrition and Dietetics and Dietitians of Canada 2016; Atwater factors (4, 4, 9 kcal/g).'),
  },

  // -------------------------------------------------------------------------
  {
    id: 'proteine',
    titolo: t('Proteine dagli alimenti', 'Protein from real food'),
    sottotitolo: t('Costruire e riparare, partendo dal piatto', 'Build and repair, starting from your plate'),
    minuti: 3,
    icona: 'piatto',
    emoji: ['🍗', '🥚', '🐟'],
    colori: ROSSO,
    accento: ROSSO[1],
    unaRiga: t(
      'Le proteine stanno in tanti piatti, non solo nei prodotti «da palestra»: un po’ a ogni pasto, da fonti diverse, fa il lavoro.',
      'Protein is in plenty of dishes, not just “gym” products: a little at every meal, from different sources, does the job.',
    ),
    blocchi: [
      {
        tipo: 'testo',
        titolo: t('A cosa servono', 'What they’re for'),
        testo: t(
          'Le proteine forniscono amminoacidi, i mattoni di muscoli, enzimi e molte altre strutture del corpo. L’allenamento di forza dà ai muscoli il motivo per ripararsi e rinforzarsi, e le proteine dell’alimentazione sono la materia prima. Saziano più di carboidrati e grassi, e per digerirle il corpo spende più energia.',
          'Protein supplies amino acids, the building blocks of muscles, enzymes and many other structures in the body. Strength training gives muscles a reason to repair and grow stronger, and dietary protein is the raw material. It fills you up more than carbs and fat, and the body spends more energy digesting it.',
        ),
      },
      {
        tipo: 'visual',
        visual: 'fonti-proteine',
        titolo: t('Quante proteine in 100 g', 'How much protein in 100 g'),
        didascalia: t('Ordini di grandezza: cambiano da prodotto a prodotto e con la cottura (tonno al naturale, legumi già cotti). Nel catalogo del diario trovi i valori di ogni alimento.', 'Orders of magnitude: they vary by product and with cooking (tuna in water, legumes already cooked). In the diary catalog you’ll find the values for each food.'),
      },
      {
        tipo: 'punti',
        titolo: t('Come distribuirle', 'How to spread them'),
        voci: [
          { emoji: '🍽️', titolo: t('Un po’ a ogni pasto', 'A little at every meal'), testo: t('Si usano meglio distribuite nella giornata che tutte a cena. Negli studi su chi si allena si parla di circa 20–40 g per pasto.', 'They’re used better when spread through the day than all at dinner. Studies on people who train talk about roughly 20–40 g per meal.') },
          { emoji: '🌱', titolo: t('Fonti diverse', 'Different sources'), testo: t('Carne, pesce, uova e latticini hanno tutti gli amminoacidi essenziali. I legumi, la soia, i cereali e la frutta a guscio si completano a vicenda nell’arco della giornata.', 'Meat, fish, eggs and dairy have all the essential amino acids. Legumes, soy, grains and nuts complement each other over the course of the day.') },
        ],
      },
      {
        tipo: 'mito',
        mito: t('Senza lo shake i muscoli non crescono.', 'Without a shake, muscles don’t grow.'),
        realta: t('Per i muscoli conta soprattutto quante proteine arrivano in tutta la giornata: dal piatto o dallo shake, il lavoro è lo stesso. Il cibo vero ha in più fibre, vitamine e minerali. Lo shake è una comodità, quando il piatto non c’è.', 'What matters most for muscles is how much protein you get over the whole day: from the plate or the shake, the job is the same. Real food also gives you fiber, vitamins and minerals. A shake is a convenience for when the plate isn’t there.'),
      },
      {
        tipo: 'testo',
        testo: t('Quanta te ne serve dipende da peso, età, allenamento e salute: è una cosa da vedere con un medico o con un dietista, non da un’app. I riferimenti generali li trovi nella lettura sui macros.', 'How much you need depends on weight, age, training and health: it’s something to work out with a doctor or a dietitian, not an app. You’ll find the general references in the reading on macros.'),
      },
    ],
    fonti: t('LARN 2014 (SINU); ACSM, AND, DC 2016; ISSN 2017 (proteine ed esercizio); CREA, tabelle di composizione degli alimenti.', 'LARN 2014 (SINU); ACSM, AND, DC 2016; ISSN 2017 (protein and exercise); CREA, food composition tables.'),
  },

  // -------------------------------------------------------------------------
  {
    id: 'bilancio',
    titolo: t('Bilancio calorico', 'Energy balance'),
    sottotitolo: t('Quanta energia entra, quanta ne esce', 'How much energy comes in, how much goes out'),
    minuti: 3,
    icona: 'fiamma',
    emoji: ['⚖️', '🔥', '🍽️'],
    colori: VIOLA,
    accento: VIOLA[1],
    unaRiga: t(
      'Il peso segue la differenza fra l’energia che mangi e quella che consumi. Capirlo non vuol dire contarlo ogni giorno.',
      'Your weight follows the difference between the energy you eat and the energy you use. Understanding it doesn’t mean counting it every day.',
    ),
    blocchi: [
      { tipo: 'visual', visual: 'altalena', titolo: t('Provala', 'Try it') },
      {
        tipo: 'visual',
        visual: 'dove-va-energia',
        titolo: t('Dove va l’energia', 'Where the energy goes'),
        didascalia: t('Le proporzioni cambiano da persona a persona e con quanto ti muovi: è un’illustrazione, non il tuo caso. Il contatore delle calorie e il Balance dell’app ragionano così: riposo più attività.', 'Proportions change from person to person and with how much you move: it’s an illustration, not your case. The app’s calorie counter and the Balance work this way: rest plus activity.'),
      },
      {
        tipo: 'mito',
        mito: t('Una formula dice quante calorie ti servono, e basta.', 'A formula tells you how many calories you need, end of story.'),
        realta: t('Le formule e le app danno stime, e quasi sempre sbagliano del 10–20% (come le stime del nostro contatore). L’unico modo per affinarle è guardare per qualche settimana come cambia il peso.', 'Formulas and apps give estimates, and they’re almost always off by 10–20% (like our counter’s estimates). The only way to refine them is to watch how your weight changes over a few weeks.'),
      },
      {
        tipo: 'testo',
        titolo: t('Senza estremismi', 'No extremes'),
        testo: t(
          'Quando per un periodo entra più energia di quella che esce il peso tende a salire; quando entra meno, tende a scendere. Gli scarti piccoli e graduali si sopportano meglio e costano meno muscoli ed energia di quelli drastici, e l’allenamento di forza aiuta a tenere i muscoli. Di quanto, per te? Dipende da troppe cose: è una domanda per un medico o per un dietista.',
          'When more energy comes in than goes out for a while, weight tends to go up; when less comes in, it tends to go down. Small, gradual gaps are easier to live with and cost less muscle and energy than drastic ones, and strength training helps hold on to muscle. By how much, for you? It depends on too many things: that’s a question for a doctor or a dietitian.',
        ),
      },
    ],
    fonti: t('ACSM, AND, DC 2016; LARN 2014 (SINU); OMS, Healthy diet.', 'ACSM, AND, DC 2016; LARN 2014 (SINU); WHO, Healthy diet.'),
  },

  // -------------------------------------------------------------------------
  {
    id: 'prima-dopo',
    titolo: t('Prima e dopo l’allenamento', 'Before and after training'),
    sottotitolo: t('Il momento conta, ma meno del totale', 'Timing matters, but less than the total'),
    minuti: 2,
    icona: 'cronometro',
    emoji: ['🍌', '🏋️', '🥛'],
    colori: NOTTE,
    accento: FUOCO[1],
    unaRiga: t(
      'Prima serve energia facile da usare, dopo serve materia per recuperare. Ma quello che mangi in tutta la giornata pesa più dell’orario perfetto.',
      'Before, you need energy that’s easy to use; after, you need material to recover. But what you eat over the whole day matters more than perfect timing.',
    ),
    blocchi: [
      { tipo: 'visual', visual: 'timeline', titolo: t('La giornata dell’allenamento', 'Training day') },
      {
        tipo: 'testo',
        titolo: t('Da evitare', 'What to avoid'),
        testo: t('I pasti pesanti e molto grassi subito prima: rallentano la digestione e si sentono, in sala e ancora di più in vasca.', 'Heavy, very fatty meals right before: they slow digestion and you feel it, in the gym and even more in the pool.'),
      },
      {
        tipo: 'mito',
        mito: t('Hai 30 minuti dopo l’allenamento, poi è tutto sprecato.', 'You have 30 minutes after training, then it’s all wasted.'),
        realta: t('La famosa «finestra anabolica» è molto più larga di quanto si racconti: un pasto nelle ore successive va benissimo. Conta di più quanto mangi in tutta la giornata.', 'The famous “anabolic window” is much wider than people say: a meal in the following hours is just fine. What you eat over the whole day matters more.'),
      },
      {
        tipo: 'testo',
        titolo: t('E a digiuno?', 'What about fasted?'),
        testo: t('Allenarsi a digiuno è possibile per chi si sente bene, ma non per tutti: se ti gira la testa, o se l’allenamento è lungo o intenso, un piccolo spuntino prima fa la differenza. Con una condizione medica o una terapia, chiedi al medico.', 'Training fasted is possible for people who feel fine, but not for everyone: if you feel dizzy, or the session is long or intense, a small snack beforehand makes a difference. With a medical condition or a treatment, ask your doctor.'),
      },
    ],
    fonti: t('ACSM, AND, DC 2016; Aragon e Schoenfeld 2013 (nutrient timing).', 'ACSM, AND, DC 2016; Aragon and Schoenfeld 2013 (nutrient timing).'),
  },

  // -------------------------------------------------------------------------
  {
    id: 'idratazione',
    titolo: t('Liquidi e idratazione', 'Fluids and hydration'),
    sottotitolo: t('Acqua ed elettroliti, prima, durante e dopo', 'Water and electrolytes, before, during and after'),
    minuti: 2,
    icona: 'goccia',
    emoji: ['💧', '🍋', '🥤'],
    colori: MARE,
    accento: MARE[1],
    unaRiga: t(
      'Bere con regolarità e guardare il colore delle urine dice più di qualunque formula.',
      'Drinking regularly and checking the color of your urine tells you more than any formula.',
    ),
    blocchi: [
      {
        tipo: 'testo',
        titolo: t('Perché conta', 'Why it matters'),
        testo: t('L’acqua partecipa a quasi tutti i processi del corpo, e col sudore perdi liquidi e minerali. Quando la perdita arriva a circa il 2% del peso, concentrazione, coordinazione e prestazione cominciano a risentirne, e il recupero rallenta.', 'Water takes part in almost every process in the body, and with sweat you lose fluids and minerals. When the loss reaches about 2% of body weight, concentration, coordination and performance start to suffer, and recovery slows down.'),
      },
      {
        tipo: 'visual',
        visual: 'urine',
        titolo: t('Il test del colore', 'The color test'),
      },
      {
        tipo: 'testo',
        titolo: t('Quanta, in tutto', 'How much, overall'),
        testo: t('Il riferimento europeo per l’acqua totale, bevande e cibo insieme, è di circa 2 litri al giorno per le donne e 2,5 per gli uomini adulti, in condizioni normali. Una parte arriva dal cibo, e serve di più nei giorni di allenamento e quando fa caldo.', 'The European reference for total water, drinks and food together, is about 2 liters a day for women and 2.5 for adult men, in normal conditions. Some of it comes from food, and you need more on training days and when it’s hot.'),
      },
      {
        tipo: 'punti',
        titolo: t('Prima, durante, dopo', 'Before, during, after'),
        voci: [
          { emoji: '🥛', titolo: t('Prima', 'Before'), testo: t('Qualche bicchiere nelle due ore che precedono, senza arrivare già assetato.', 'A few glasses in the two hours before, without already being thirsty.') },
          { emoji: '🏊', titolo: t('Durante', 'During'), testo: t('Piccoli sorsi regolari, senza aspettare di avere molta sete: in vasca e nei giorni caldi si suda più di quanto sembri.', 'Small regular sips, without waiting until you’re very thirsty: in the pool and on hot days you sweat more than you think.') },
          { emoji: '🍌', titolo: t('Dopo', 'After'), testo: t('Rimetti quello che hai perso: acqua, e un pasto con un po’ di sale se hai sudato molto.', 'Put back what you lost: water, and a meal with a little salt if you sweated a lot.') },
        ],
      },
      {
        tipo: 'testo',
        titolo: t('E gli elettroliti?', 'And electrolytes?'),
        testo: t('Sotto l’ora di solito basta l’acqua. Con uno sforzo lungo o intenso, o con molto caldo, col sudore se ne vanno anche sodio, potassio e magnesio: li ritrovi in una bevanda con sali minerali o, dopo, in una banana e qualcosa di salato.', 'Under an hour, water is usually enough. With a long or intense effort, or in very hot weather, sweat also takes away sodium, potassium and magnesium: you’ll find them in a drink with mineral salts or, afterwards, in a banana and something salty.'),
      },
      {
        tipo: 'mito',
        mito: t('Più bevi, meglio è.', 'The more you drink, the better.'),
        realta: t('Bere molto più di quanto perdi non migliora la prestazione e, in rari casi (sforzi lunghi bevendo solo acqua), può diluire il sodio nel sangue. Si tratta di rimettere quello che perdi, non di battere un record.', 'Drinking far more than you lose doesn’t improve performance and, in rare cases (long efforts drinking only water), can dilute the sodium in your blood. It’s about putting back what you lose, not setting a record.'),
      },
    ],
    fonti: t('ACSM 2007 (esercizio e reintegro dei liquidi); EFSA 2010 (acqua); CREA 2018.', 'ACSM 2007 (exercise and fluid replacement); EFSA 2010 (water); CREA 2018.'),
  },

  // -------------------------------------------------------------------------
  {
    id: 'qualita',
    titolo: t('Qualità degli alimenti', 'Food quality'),
    sottotitolo: t('Cibo vero e cibo ultra-trasformato', 'Real food and ultra-processed food'),
    minuti: 3,
    icona: 'foglia',
    emoji: ['🥦', '🍎', '🥕'],
    colori: ORTO,
    accento: ORTO[1],
    unaRiga: t(
      'Non tutte le calorie sono uguali: cambiano fibre, nutrienti e sazietà. Quello che conta è quanto è trasformato un cibo, non se è «buono» o «cattivo».',
      'Not all calories are equal: fiber, nutrients and fullness differ. What matters is how processed a food is, not whether it’s “good” or “bad”.',
    ),
    blocchi: [
      {
        tipo: 'testo',
        titolo: t('Perché la qualità conta', 'Why quality matters'),
        testo: t('Due alimenti con le stesse calorie possono dare al corpo cose molto diverse: fibre, vitamine, minerali, sazietà. I prodotti ultra-trasformati in genere portano molta energia, pochi nutrienti e poca sazietà, e si mangiano in fretta.', 'Two foods with the same calories can give your body very different things: fiber, vitamins, minerals, fullness. Ultra-processed products generally carry a lot of energy, few nutrients and little fullness, and are eaten quickly.'),
      },
      {
        tipo: 'visual',
        visual: 'nova',
        titolo: t('Quattro gruppi', 'Four groups'),
        didascalia: t('È la classificazione NOVA. Trasformato non vuol dire cattivo: pane, formaggi e legumi in scatola stanno nel terzo gruppo e vanno benissimo. Il problema è il quarto, quando diventa la base di quello che mangi.', 'This is the NOVA classification. Processed doesn’t mean bad: bread, cheese and canned legumes are in the third group and are perfectly fine. The problem is the fourth, when it becomes the base of what you eat.'),
      },
      {
        tipo: 'punti',
        titolo: t('Cosa mettere al centro del piatto', 'What to put at the center of your plate'),
        voci: [
          { emoji: '🥗', titolo: t('Verdura e frutta', 'Vegetables and fruit'), testo: t('Ogni giorno, di colori diversi.', 'Every day, in different colors.') },
          { emoji: '🌾', titolo: t('Cereali integrali', 'Whole grains'), testo: t('Avena, riso, farro, pane integrale.', 'Oats, rice, spelt, whole-grain bread.') },
          { emoji: '🐟', titolo: t('Proteine di qualità', 'Quality protein'), testo: t('Pesce, uova, legumi, carni magre.', 'Fish, eggs, legumes, lean meats.') },
          { emoji: '🥜', titolo: t('Grassi buoni', 'Good fats'), testo: t('Olio extravergine d’oliva, frutta a guscio, pesce azzurro.', 'Extra virgin olive oil, nuts, oily fish.') },
          { emoji: '🧀', titolo: t('Latticini', 'Dairy'), testo: t('Yogurt, ricotta, formaggi, se li tolleri.', 'Yogurt, ricotta, cheese, if you tolerate them.') },
        ],
      },
      {
        tipo: 'punti',
        titolo: t('Qualche trucco pratico', 'A few practical tricks'),
        voci: [
          { emoji: '📋', titolo: t('Lista degli ingredienti corta', 'Short ingredient list'), testo: t('Spesso è un buon segno.', 'It’s often a good sign.') },
          { emoji: '🍱', titolo: t('Cucinare in anticipo', 'Cook ahead'), testo: t('Preparare i pasti per qualche giorno fa risparmiare tempo e rende più facile scegliere bene.', 'Preparing meals for a few days saves time and makes it easier to choose well.') },
          { emoji: '⚖️', titolo: t('Una regola pratica: 80/20', 'A rule of thumb: 80/20'), testo: t('Se la maggior parte delle scelte è di qualità, il resto può essere piacere, senza sensi di colpa. Non è una legge: è un modo per non farne una battaglia.', 'If most of your choices are quality ones, the rest can be pleasure, without guilt. It’s not a law: it’s a way of not turning it into a battle.') },
        ],
      },
      {
        tipo: 'mito',
        mito: t('Per mangiare bene serve la perfezione.', 'Eating well takes perfection.'),
        realta: t('Conta quello che fai quasi sempre, non una cena. La costanza batte gli estremi.', 'What counts is what you do most of the time, not one dinner. Consistency beats extremes.'),
      },
    ],
    fonti: t('CREA, Linee guida per una sana alimentazione 2018; Monteiro et al., Public Health Nutrition 2019 (NOVA); LARN 2014 (SINU).', 'CREA, Italian dietary guidelines 2018; Monteiro et al., Public Health Nutrition 2019 (NOVA); LARN 2014 (SINU).'),
  },
]

export const temaPer = (id: string | undefined): Tema | undefined => TEMI.find((x) => x.id === id)
