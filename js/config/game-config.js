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

  // Chat notturna dei Traditori
  chatMaxLength: 200,
  chatMaxMessages: 80,
});
