// L'informativa della classifica mensile (29/10/2026), da accettare nell'app prima di entrare. **E' una bozza da far rileggere dal consulente
// privacy prima di aprire la classifica a tutti**: compare con altri soci il nome, il punteggio e (se la persona vuole) la foto e un motto,
// e il punteggio tiene conto, per chi li usa, di Food e Recover, che sono dati sulla salute. Per questo il consenso e' esplicito e a parte.
//
// **La versione e' la stessa della funzione** (VERSIONE_INFORMATIVA in APP-ATHLON, `_shared/classifica`): cambiando il testo si cambia in
// tutti e due i posti, e chi e' dentro riaccetta o esce dalla classifica.
import { t, tv } from '../../../lib/lingua'

export const VERSIONE_INFORMATIVA_CLASSIFICA = '2026-10-29'

export const CONSENSO_CLASSIFICA = t(
  'Acconsento a comparire nella classifica mensile di Athlon con il mio nome e l’iniziale del cognome, il mio punteggio e la mia posizione (e la foto e il motto, se li scelgo), visibili agli altri soci che partecipano, come descritto nell’informativa. So che il punteggio tiene conto, se li uso, anche di Food e Recover.',
  'I consent to appear in the Athlon monthly leaderboard with my first name and the initial of my surname, my score and my position (and my photo and motto, if I choose them), visible to the other members who take part, as described in the privacy notice. I understand the score takes into account, if I use them, Food and Recover too.',
)

export const INFORMATIVA_CLASSIFICA: { titolo: string; testo: string }[] = tv(
  [
    {
      titolo: 'Che cos’è',
      testo:
        'Una classifica del mese fra i soci che scelgono di partecipare. Va dal primo all’ultimo giorno del mese (a Roma) e poi ricomincia da zero: non è una classifica assoluta. Non ci sono premi legati alla posizione.',
    },
    {
      titolo: 'Cosa si vede di te',
      testo:
        'Il tuo nome e l’iniziale del cognome (per esempio «Marco R.»), il tuo punteggio del mese e la tua posizione. La foto e il motto, una frase tua che ti motiva, compaiono solo se li scegli tu, e puoi toglierli o cambiarli quando vuoi. Gli altri non vedono altro di te: né la scheda, né l’abbonamento, né cosa c’è dietro il punteggio.',
    },
    {
      titolo: 'Come si calcola il punteggio',
      testo:
        'È la media dell’Athlon Health Score (da 0 a 100) nelle settimane del mese. Train viene dagli ingressi e dalle lezioni a cui la reception ha segnato la tua presenza; Food e Recover, solo se li usi, dal diario dei pasti e dal sonno che hai scritto o che arriva dai tuoi dispositivi. Chi non usa Food o Recover viene valutato sui pilastri che usa, quindi non è penalizzato. Food e Recover sono dati sulla salute: nella classifica si vede solo il punteggio finale, mai i dati da cui nasce.',
    },
    {
      titolo: 'Chi lo vede',
      testo:
        'Solo i soci che partecipano alla classifica, e solo le prime dieci posizioni più la tua con chi ti sta vicino. Lo staff del club può nascondere un motto o una foto che non rispettano le regole, e vedere chi ha segnalato un contenuto.',
    },
    {
      titolo: 'Per quanto e come uscire',
      testo:
        'Puoi uscire quando vuoi, da questa stessa schermata: sparisci subito dalla classifica e cancelliamo il tuo motto e la scelta sulla foto. Restano solo la registrazione di quando hai dato e tolto il consenso, come prova, e i punti dei mesi passati senza il tuo nome. Per gli altri diritti (accesso, rettifica, cancellazione, reclamo al Garante) vale l’informativa privacy del club.',
    },
    {
      titolo: 'Base e per chi è',
      testo:
        'Ti mettiamo in classifica solo con il tuo consenso esplicito (art. 6, par. 1, lett. a e, per i dati sulla salute da cui nasce il punteggio, art. 9, par. 2, lett. a del GDPR). La classifica è riservata ai maggiorenni. Se un numero ti mette a disagio, puoi uscire senza dare spiegazioni: l’Athlon Health Score continua a funzionare uguale.',
    },
  ],
  [
    { titolo: 'Courtesy translation', testo: 'Courtesy translation: the Italian text is the binding version.' },
    {
      titolo: 'What it is',
      testo:
        'A monthly leaderboard among the members who choose to take part. It runs from the first to the last day of the month (Rome time) and then starts again from zero: it isn’t an all-time ranking. There are no prizes tied to your position.',
    },
    {
      titolo: 'What others see of you',
      testo:
        'Your first name and the initial of your surname (for example “Marco R.”), your score for the month and your position. Your photo and your motto, a phrase of your own that motivates you, appear only if you choose them, and you can remove or change them whenever you like. Others see nothing else about you: not your record, not your membership, not what’s behind the score.',
    },
    {
      titolo: 'How the score is worked out',
      testo:
        'It’s the average of your Athlon Health Score (0 to 100) over the weeks of the month. Train comes from your entries and from the classes the front desk marked you present at; Food and Recover, only if you use them, from your meal diary and from the sleep you logged or that comes from your devices. If you don’t use Food or Recover you’re scored on the pillars you do use, so you’re not penalized. Food and Recover are health data: the leaderboard only shows the final score, never the data it comes from.',
    },
    {
      titolo: 'Who sees it',
      testo:
        'Only the members who take part in the leaderboard, and only the top ten positions plus yours with the people next to you. Club staff can hide a motto or a photo that doesn’t follow the rules, and see who reported a piece of content.',
    },
    {
      titolo: 'How long, and how to leave',
      testo:
        'You can leave whenever you like, from this same screen: you disappear from the leaderboard straight away and we delete your motto and your photo choice. Only the record of when you gave and withdrew consent is kept, as proof, and the points of past months without your name. For your other rights (access, correction, deletion, complaint to the Italian Data Protection Authority) the club’s privacy notice applies.',
    },
    {
      titolo: 'Basis and who it’s for',
      testo:
        'We put you in the leaderboard only with your explicit consent (art. 6(1)(a) and, for the health data the score comes from, art. 9(2)(a) GDPR). The leaderboard is for adults only. If a number makes you uncomfortable, you can leave without giving a reason: your Athlon Health Score keeps working just the same.',
    },
  ],
)
