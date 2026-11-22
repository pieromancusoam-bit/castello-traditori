// Numeri del gioco: tutti qui, mai sparsi nel codice.

export const GAME = Object.freeze({
  // Giocatori necessari per iniziare (il massimo è la capienza della stanza, NET.maxPlayers)
  minPlayers: 5,

  // Traditori iniziali in base al numero di giocatori (fino a `upTo` giocatori compresi)
  traitorTable: Object.freeze([
    Object.freeze({ upTo: 6, traitors: 1 }),
    Object.freeze({ upTo: 9, traitors: 2 }),
    Object.freeze({ upTo: 16, traitors: 3 }),
  ]),

  // Il finale (Cerimonia delle Polveri) scatta quando i vivi sono al massimo `threshold`,
  // in base ai giocatori a inizio partita (fino a `upTo` compresi)
  finalThresholdTable: Object.freeze([
    Object.freeze({ upTo: 7, threshold: 3 }),
    Object.freeze({ upTo: 16, threshold: 4 }),
  ]),
  // Nella Cerimonia non si scende sotto questo numero: poi solo rivelazioni
  finalMinPlayers: 2,

  // Cerimonia delle Polveri: tempi della rivelazione delle scelte sullo schermo del master
  ceremonyReveal: Object.freeze({
    introMs: 3500,    // schermata d'attesa prima dei nomi
    portraitMs: 1600, // ritratto e nome, prima delle fiamme
    flameMs: 2600,    // fiamme verdi (chiudere) o rosse (bandire)
  }),

  // Giochi (missioni) per giornata, tra la Colazione e la Tavola Rotonda
  missionsPerDay: 3,

  // Presentazioni del giorno 1: tempo per ogni giocatore
  presentationMs: 45000,

  // Tavola Rotonda: discussione minima prima del voto, in base ai giocatori in gioco
  // (fino a `upTo` compresi). Il voto si apre solo a tempo scaduto.
  discussionTable: Object.freeze([
    Object.freeze({ upTo: 9, ms: 5 * 60000 }),
    Object.freeze({ upTo: 16, ms: 10 * 60000 }),
  ]),

  // Seduzione: la prima notte, nelle partite iniziate con un solo Traditore,
  // il Traditore può sedurre un Leale invece di uccidere
  seductionMaxTraitors: 1,

  // Montepremi: valore massimo di una missione il giorno 1, poi cresce ogni giorno
  missionBaseValue: 1000,
  missionValuePerDay: 250,

  // Chat notturna dei Traditori
  chatMaxLength: 200,
  // Pochi messaggi: la vista di un Traditore deve restare sotto NET.messageMaxBytes
  chatMaxMessages: 30,
  // Tetto ai byte (UTF-8) di tutti i testi della chat insieme: si tolgono i messaggi più vecchi
  chatMaxBytes: 4000,

  // ---- Fase 3 ----

  // Ruoli speciali (modalità avanzata). Con "Automatico" si accendono da questi giocatori in su.
  // Il Traditore Segreto è uno degli N Traditori e serve almeno `secretTraitorMinTraitors` Traditori.
  specialRoles: Object.freeze({
    seerAutoFrom: 7,
    knightAutoFrom: 7,
    secretTraitorAutoFrom: 14,
    secretTraitorMinTraitors: 2,
  }),

  // Eventi: dal giorno `eventMinDay`, ogni giorno con probabilità `eventChance`;
  // dopo un evento ne servono `eventGapDays` prima del prossimo (al massimo uno ogni due giorni)
  eventChance: 0.5,
  eventMinDay: 2,
  eventGapDays: 2,

  // Omicidio a vista: durata della "scena" in cui il Traditore tocca la vittima
  sceneMs: 20000,

  // Timer dei giochi: moltiplicatore di base (si cambia nelle impostazioni partita)
  missionTimeScale: 1,
});

// Oggetti: nome, descrizione e peso nell'estrazione del premio di una missione riuscita
export const ITEMS = Object.freeze({
  shield: Object.freeze({ name: 'Scudo', text: 'Ti protegge da un omicidio notturno. Funziona da solo e si consuma quando ti salva.', weight: 3 }),
  dagger: Object.freeze({ name: 'Pugnale', text: 'Alla Tavola Rotonda il tuo voto conta doppio. Tutti lo vedranno alla rivelazione dei voti.', weight: 2 }),
  curse: Object.freeze({ name: 'Maledizione', text: 'Dopo i giochi del giorno: chi scegli non vota alla prossima Tavola Rotonda. Il castello annuncia il maledetto, non chi l\'ha lanciata.', weight: 2 }),
  seal: Object.freeze({ name: 'Sigillo', text: 'Annulla una Maledizione lanciata contro di te. Tutti lo vedranno.', weight: 2 }),
  mirror: Object.freeze({ name: 'Specchio', text: 'Ti mostra in segreto chi ha votato contro di te all\'ultima Tavola Rotonda.', weight: 1 }),
});
export const ITEM_IDS = Object.freeze(Object.keys(ITEMS));

// Chi riceve l'oggetto di un gioco riuscito: estratto a caso, ma ogni oggetto già ricevuto dal
// castello riduce la probabilità (peso 1 / (1 + penalità × ricevuti)). Mai "a turno": si capirebbe
// chi riceve l'ultimo.
export const GIFT_REPEAT_PENALTY = 2;

// Eventi del castello (si accendono o spengono dalle impostazioni)
export const EVENTS = Object.freeze({
  fog: Object.freeze({ name: 'Nebbia', text: 'Alla Tavola Rotonda di oggi i voti si vedranno solo come conteggio, senza nomi.' }),
  doubleStakes: Object.freeze({ name: 'Doppia posta', text: 'Un gioco di oggi vale il doppio. Ma se fallisce, il montepremi perde monete.' }),
  banquet: Object.freeze({ name: 'Banchetto', text: 'Stanotte nessuno morirà. Ma domani si bandiranno due giocatori.' }),
  daylightMurder: Object.freeze({ name: 'Omicidio a vista', text: 'Oggi un Traditore ucciderà alla luce del giorno. La vittima si scoprirà al tramonto.' }),
});
export const EVENT_IDS = Object.freeze(Object.keys(EVENTS));

// Scene dell'Omicidio a vista: il master le mostra mentre tutti toccano il telefono
export const SCENES = Object.freeze([
  'Il castello brinda: alzate i calici e guardatevi negli occhi.',
  'Si spengono le candele del salone: restate immobili.',
  'Il giullare entra e fa un inchino a ognuno di voi.',
  'Un corvo attraversa la sala: seguitelo con lo sguardo.',
  'Il ritratto del vecchio re vi osserva: nessuno parli.',
  'Suona la campana della torre: contate i rintocchi in silenzio.',
]);
