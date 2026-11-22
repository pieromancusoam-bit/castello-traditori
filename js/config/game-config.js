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
});
