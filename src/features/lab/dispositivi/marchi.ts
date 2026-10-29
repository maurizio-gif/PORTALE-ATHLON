import { t } from '@/lib/lingua'

// I marchi di dispositivi e app che scrivono su Apple Salute (iPhone) e su Health Connect (Android), per la guida
// `GuidaCollegamento.tsx` (29/10/2026). **Verificato su pagine ufficiali dei produttori, di Apple e di Google il 29/10/2026**
// (ricerca in `docs/marchi-salute.md`): ogni indirizzo e' la pagina di istruzioni del produttore, non una nostra.
//   - `confermato`: una pagina ufficiale lo dice. `non-chiaro`: solo fonti di terzi o contraddittorie, o pagina non trovata.
//     `no`: il produttore dice che non e' possibile (Galaxy Watch con iPhone, Pixel Watch con iPhone, Apple Watch con Android):
//     in quel caso il marchio non compare nell'elenco di quella piattaforma, ma la guida lo cita fra quelli che non funzionano.
//   - `nota`: una condizione scritta nella pagina ufficiale (un abbonamento, una versione di Android). Mai istruzioni di menu:
//     cambiano, e per quelle c'e' il collegamento.
// **Non sono qui, di proposito**: MyFitnessPal e YAZIO (scrivono alimentazione, che da qui non leggiamo: il diario e' di Food).
// **Da rifare ogni tanto**: i produttori cambiano nome e regole (Fitbit e' diventata Google Health il 19/05/2026; Withings ha messo
// Withings+ per i nuovi account dal 13/10/2026). I marchi sono dei rispettivi proprietari: si citano in testo semplice, senza loghi
// (Apple e Oura hanno regole d'uso; il badge «Works with Apple Health» e' solo per gli sviluppatori di app HealthKit approvate).

export type Piattaforma = 'apple' | 'google'
export type Categoria = 'orologio' | 'anello' | 'fascia' | 'app' | 'attrezzatura'
export type Verdetto = 'confermato' | 'non-chiaro' | 'no'
export type Supporto = { verdetto: Verdetto; url?: string; nota?: string }
export type Marchio = { id: string; nome: string; categoria: Categoria; app: string; apple: Supporto; google: Supporto }

export const MARCHI: Marchio[] = [
  {
    id: 'applewatch',
    nome: 'Apple Watch',
    categoria: 'orologio',
    app: 'Salute',
    apple: { verdetto: 'confermato', url: 'https://support.apple.com/en-us/104997', nota: t('Automatico: i dati arrivano da soli, non c’è niente da collegare.', 'Automatic: the data comes in by itself, nothing to connect.') },
    google: { verdetto: 'no', url: 'https://support.apple.com/en-us/109015' },
  },
  {
    id: 'garmin',
    nome: 'Garmin',
    categoria: 'orologio',
    app: 'Garmin Connect',
    apple: { verdetto: 'confermato', url: 'https://support.garmin.com/en-US/?faq=lK5FPB9iPF5PXFkIpFlFPA' },
    google: { verdetto: 'confermato', url: 'https://support.garmin.com/en-US/?faq=JToBEy0jfe6pIygark2Ui5', nota: t('Solo con Android 14 o successivo.', 'Only with Android 14 or later.') },
  },
  {
    id: 'oura',
    nome: 'Oura',
    categoria: 'anello',
    app: 'Oura',
    apple: { verdetto: 'confermato', url: 'https://support.ouraring.com/hc/en-us/articles/360025438734-Apple-Health-Integration' },
    google: { verdetto: 'confermato', url: 'https://support.ouraring.com/hc/en-us/articles/10786105824531-Health-Connect-by-Android-Integration' },
  },
  {
    id: 'polar',
    nome: 'Polar',
    categoria: 'orologio',
    app: 'Polar Flow',
    apple: { verdetto: 'confermato', url: 'https://support.polar.com/us-en/support/connecting_polar_flow_with_apple_health' },
    google: { verdetto: 'confermato', url: 'https://support.polar.com/en/flow-app-health-connect' },
  },
  {
    id: 'fitbit',
    nome: 'Fitbit',
    categoria: 'fascia',
    app: 'Google Health (ex Fitbit)',
    apple: { verdetto: 'confermato', url: 'https://support.google.com/googlehealth/answer/17037331', nota: t('Dal maggio 2026 l’app Fitbit si chiama Google Health: serve un account Google.', 'Since May 2026 the Fitbit app is called Google Health: you need a Google account.') },
    google: { verdetto: 'confermato', url: 'https://support.google.com/googlehealth/answer/14506680', nota: t('Dal maggio 2026 l’app Fitbit si chiama Google Health: serve un account Google.', 'Since May 2026 the Fitbit app is called Google Health: you need a Google account.') },
  },
  {
    id: 'samsung',
    nome: 'Samsung Galaxy Watch',
    categoria: 'orologio',
    app: 'Samsung Health',
    apple: { verdetto: 'no', url: 'https://www.samsung.com/us/support/answer/ANS10004668/' },
    google: { verdetto: 'confermato', url: 'https://developer.samsung.com/health/health-connect-faq.html' },
  },
  {
    id: 'whoop',
    nome: 'WHOOP',
    categoria: 'fascia',
    app: 'WHOOP',
    apple: { verdetto: 'confermato', url: 'https://support.whoop.com/s/article/Apple-Health-Integration?language=en_US', nota: t('Non condivide l’HRV.', 'It doesn’t share HRV.') },
    google: { verdetto: 'confermato', url: 'https://support.whoop.com/s/article/Google-Health-Integration-For-Android?language=en_US', nota: t('Fra i dati condivisi non c’è l’HRV.', 'HRV isn’t among the shared data.') },
  },
  {
    id: 'withings',
    nome: 'Withings',
    categoria: 'orologio',
    app: 'Withings',
    apple: { verdetto: 'confermato', url: 'https://support.withings.com/hc/en-us/articles/46746224229777-Partner-Apps-Apple-Health-Exporting-Withings-data-into-Apple-Health', nota: t('Per gli account creati dal 13 ottobre 2026 serve Withings+ per condividere i dati.', 'For accounts created from 13 October 2026, sharing data needs Withings+.') },
    google: { verdetto: 'confermato', url: 'https://support.withings.com/hc/en-us/articles/27322856325905-Partner-Apps-Health-Connect-Exporting-Withings-data-into-Health-Connect', nota: t('Per gli account creati dal 13 ottobre 2026 serve Withings+ per condividere i dati.', 'For accounts created from 13 October 2026, sharing data needs Withings+.') },
  },
  {
    id: 'xiaomi',
    nome: 'Xiaomi Smart Band',
    categoria: 'fascia',
    app: 'Mi Fitness',
    apple: { verdetto: 'confermato', url: 'https://www.mi.com/global/support/faq/details/KA-728033/' },
    google: { verdetto: 'confermato', url: 'https://www.mi.com/global/support/faq/details/KA-728033/' },
  },
  {
    id: 'pixelwatch',
    nome: 'Google Pixel Watch',
    categoria: 'orologio',
    app: 'Google Health',
    apple: { verdetto: 'no', url: 'https://support.google.com/googlepixelwatch/answer/12652073' },
    google: { verdetto: 'confermato', url: 'https://support.google.com/googlehealth/answer/14506680' },
  },
  {
    id: 'amazfit',
    nome: 'Amazfit',
    categoria: 'orologio',
    app: 'Zepp',
    apple: { verdetto: 'confermato', url: 'https://in.amazfit.com/pages/faq/what-apps-can-the-zepp-app-sync-with' },
    google: { verdetto: 'non-chiaro' },
  },
  {
    id: 'coros',
    nome: 'COROS',
    categoria: 'orologio',
    app: 'COROS',
    apple: { verdetto: 'confermato', url: 'https://support.coros.com/hc/en-us/articles/360041549551-Connecting-Apple-Health-with-COROS-App' },
    google: { verdetto: 'confermato', url: 'https://support.coros.com/hc/en-us/articles/360040256531-Supported-3rd-Party-Apps' },
  },
  {
    id: 'suunto',
    nome: 'Suunto',
    categoria: 'orologio',
    app: 'Suunto',
    apple: { verdetto: 'non-chiaro' },
    google: { verdetto: 'non-chiaro' },
  },
  {
    id: 'huawei',
    nome: 'Huawei',
    categoria: 'orologio',
    app: 'Huawei Health',
    apple: { verdetto: 'non-chiaro', url: 'https://consumer.huawei.com/en/community/details/topicId-147760/' },
    google: { verdetto: 'non-chiaro' },
  },
  {
    id: 'ultrahuman',
    nome: 'Ultrahuman',
    categoria: 'anello',
    app: 'Ultrahuman',
    apple: { verdetto: 'confermato', url: 'https://www.ultrahuman.com/blog/how-to-access-your-hrv-data-on-apple-health/' },
    google: { verdetto: 'non-chiaro', url: 'https://www.ultrahuman.com/blog/ultrahuman-cycle-and-ovulation-powerplug/' },
  },
  {
    id: 'strava',
    nome: 'Strava',
    categoria: 'app',
    app: 'Strava',
    apple: { verdetto: 'confermato', url: 'https://support.strava.com/hc/en-us/articles/216917527-Health-App-and-Strava' },
    google: { verdetto: 'confermato', url: 'https://support.strava.com/hc/en-us/articles/43440435267597-Health-Connect-and-Strava' },
  },
  {
    id: 'technogym',
    nome: 'Technogym',
    categoria: 'attrezzatura',
    app: 'Technogym',
    apple: { verdetto: 'confermato', url: 'https://www.technogym.com/en-US/support/product/technogym-app/?tab=faq' },
    google: { verdetto: 'non-chiaro', url: 'https://www.technogym.com/en-US/support/product/technogym-app/?tab=faq' },
  },
  {
    id: 'wahoo',
    nome: 'Wahoo',
    categoria: 'attrezzatura',
    app: 'Wahoo',
    apple: { verdetto: 'confermato', url: 'https://support.wahoofitness.com/hc/en-us/articles/14467471126802-Authorized-Apps-Wahoo-app' },
    google: { verdetto: 'confermato', url: 'https://support.wahoofitness.com/hc/en-us/articles/14467471126802-Authorized-Apps-Wahoo-app' },
  },
  {
    id: 'peloton',
    nome: 'Peloton',
    categoria: 'attrezzatura',
    app: 'Peloton',
    apple: { verdetto: 'confermato', url: 'https://support.onepeloton.com/s/article/360022843811-Apple-Health?language=en_GB' },
    google: { verdetto: 'confermato', url: 'https://support.onepeloton.com/s/article/10883732748180-Android-Health-Connect-mit-der-Peloton-App?language=de' },
  },
  {
    id: 'hevy',
    nome: 'Hevy',
    categoria: 'app',
    app: 'Hevy',
    apple: { verdetto: 'confermato', url: 'https://help.hevyapp.com/hc/en-us/articles/36957445562775-Hevy-Not-Syncing-to-Apple-Health-Step-by-Step-Troubleshooting-Guide' },
    google: { verdetto: 'confermato', url: 'https://help.hevyapp.com/hc/en-us/articles/36957110114455-Health-Connect-Not-Receiving-Hevy-Data-Here-s-How-to-Fix-It' },
  },
]
