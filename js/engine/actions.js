// Tipi di azione del motore.

export const A = Object.freeze({
  // Dai telefoni (il master aggiunge sempre playerId dal canale, mai dal messaggio)
  ROLE_SEEN: 'ROLE_SEEN',       // "Ho visto il mio ruolo"
  VOTE: 'VOTE',                 // { targetId } Tavola Rotonda e Cerimonia
  NIGHT_CHOOSE: 'NIGHT_CHOOSE', // { targetId } Traditori: vittima; Leali: scelta finta
  NIGHT_CHAT: 'NIGHT_CHAT',     // { text } solo Traditori
  FINAL_CHOICE: 'FINAL_CHOICE', // { choice: 'end' | 'banish' }
  MISSION_INPUT: 'MISSION_INPUT', // dati propri della missione in corso (vedi js/engine/missions/)

  // Dal master
  ADVANCE: 'ADVANCE',           // "Avanti": chiude la fase o la fa proseguire
  TIMER_EXPIRED: 'TIMER_EXPIRED', // { key } tempo scaduto (il master tiene l'orologio)
});

export const PLAYER_ACTIONS = new Set([A.ROLE_SEEN, A.VOTE, A.NIGHT_CHOOSE, A.NIGHT_CHAT, A.FINAL_CHOICE, A.MISSION_INPUT]);
export const MASTER_ACTIONS = new Set([A.ADVANCE, A.TIMER_EXPIRED]);

export const FINAL_CHOICES = Object.freeze({ END: 'end', BANISH: 'banish' });
