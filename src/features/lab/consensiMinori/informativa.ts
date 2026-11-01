import type { AmbitoMinore } from '@/api/consensiMinori'
import { t, tv } from '@/lib/lingua'

// L'informativa al genitore per i dati sulla salute di un figlio da 13 a 17 anni (01/11/2026).
//
// **Bozza scritta da Claude, da far leggere al consulente privacy prima di aprire i minori**: non e' un testo legale approvato.
// **Cambiando il testo si cambia `VERSIONE_INFORMATIVA_MINORI` qui e in `_shared/consensi-minori.ts` di APP-ATHLON**: i consensi dati alla
// versione di prima compaiono «da rinnovare» e il genitore li riconferma.
export const VERSIONE_INFORMATIVA_MINORI = '2026-11-01'

export const TESTI_AMBITO: Record<AmbitoMinore, { titolo: string; descrizione: string }> = {
  food: {
    titolo: t('Food: il diario dei pasti', 'Food: the meal diary'),
    descrizione: t('Cosa mangia, scritto da lui o da lei, e il questionario sulle abitudini. Senza il consenso la sezione Food resta chiusa.', 'What they eat, entered by them, and the habits questionnaire. Without consent the Food section stays closed.'),
  },
  recover: {
    titolo: t('Recover: sonno e dispositivi', 'Recover: sleep and devices'),
    descrizione: t('Il sonno scritto a mano e quello che orologi e app Salute del telefono (Apple Salute, Health Connect) passano all’app.', 'Sleep entered by hand and what watches and phone health apps (Apple Health, Health Connect) send to the app.'),
  },
  corpo: {
    titolo: t('Il corpo: misure', 'Body: measurements'),
    descrizione: t('Altezza, peso e altre misure del corpo, e il sesso scelto per stimare le calorie delle lezioni.', 'Height, weight and other body measurements, and the sex chosen to estimate the calories of classes.'),
  },
  piani_ai: {
    titolo: t('Piani di allenamento con l’intelligenza artificiale', 'Training plans with artificial intelligence'),
    descrizione: t('Le risposte al questionario (anche fastidi o infortuni) vanno a un servizio esterno di intelligenza artificiale che compone la bozza del piano.', 'The questionnaire answers (including aches or injuries) go to an external artificial-intelligence service that drafts the plan.'),
  },
}

export const TITOLO_INFORMATIVA = t('Informativa per il genitore', 'Information notice for parents')

export const PARAGRAFI_INFORMATIVA: string[] = tv(
  [
    'Chi tratta i dati: la Società Sportiva Dilettantistica Point 2000 SSD (Athlon Club), titolare del trattamento.',
    'Quali dati: quelli sulla salute di tuo figlio che raccoglie l’Athlon Health System, cioè diario dei pasti, sonno e dati dei dispositivi, misure del corpo e risposte per i piani di allenamento. Sono dati particolari (art. 9 GDPR) e per un minorenne li trattiamo solo con il tuo consenso.',
    'Perché: per mostrargli il suo punteggio, i suoi piani e i suoi progressi nell’app. Non li usiamo per pubblicità né li vendiamo.',
    'Chi li vede: tuo figlio e tu, come genitore. Il personale del club non vede il diario, il sonno e le misure che scrive nell’app; i trainer possono leggere i piani di allenamento, in sola lettura.',
    'Piani con l’intelligenza artificiale: le risposte al questionario vanno a un servizio esterno che non le conserva né le usa per addestrarsi. Il piano che ne esce è una proposta da rileggere, non un parere medico.',
    'Il consenso è tuo, e si dà un’area alla volta: puoi concederne una, alcune o tutte, e ritirarle quando vuoi da questa pagina. Ritirare un consenso cancella i dati di quell’area.',
    'A 18 anni il tuo consenso decade: tuo figlio dovrà darlo da solo per continuare a usare queste aree.',
  ],
  [
    'Who handles the data: Società Sportiva Dilettantistica Point 2000 SSD (Athlon Club), the data controller.',
    'Which data: your child’s health data collected by the Athlon Health System, namely meal diary, sleep and device data, body measurements and answers for training plans. These are special-category data (art. 9 GDPR) and for a minor we only process them with your consent.',
    'Why: to show them their score, plans and progress in the app. We don’t use them for advertising and we don’t sell them.',
    'Who sees them: your child and you, as a parent. Club staff don’t see the diary, sleep and measurements they enter in the app; trainers can read training plans, read-only.',
    'Plans with artificial intelligence: the questionnaire answers go to an external service that doesn’t keep them or use them for training. The resulting plan is a suggestion to review, not medical advice.',
    'The consent is yours, and it’s given one area at a time: you can grant one, some or all of them, and withdraw them whenever you like from this page. Withdrawing a consent deletes the data of that area.',
    'At 18 your consent lapses: your child will have to give it themselves to keep using these areas.',
  ],
)
