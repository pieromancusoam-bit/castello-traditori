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

  // Il finale (Cerimonia delle Polveri) scatta quando i vivi sono al massimo questi
  finalThreshold: 4,
  // Nella Cerimonia non si scende sotto questo numero: poi solo rivelazioni
  finalMinPlayers: 2,

  // Cerimonia delle Polveri: tempi della rivelazione delle scelte sullo schermo del master
  ceremonyReveal: Object.freeze({
    introMs: 3500,    // schermata d'attesa prima dei nomi
    portraitMs: 1600, // ritratto e nome, prima delle fiamme
    flameMs: 2600,    // fiamme verdi (chiudere) o rosse (bandire)
  }),

  // Chat notturna dei Traditori
  chatMaxLength: 200,
  // Pochi messaggi: la vista di un Traditore deve restare sotto NET.messageMaxBytes
  chatMaxMessages: 30,
  // Tetto ai byte (UTF-8) di tutti i testi della chat insieme: si tolgono i messaggi più vecchi
  chatMaxBytes: 4000,
});
