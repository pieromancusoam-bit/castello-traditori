// Tipi di azione del motore.

export const A = Object.freeze({
  // Dai telefoni (il master aggiunge sempre playerId dal canale, mai dal messaggio)
  ROLE_SEEN: 'ROLE_SEEN',       // "Ho visto il mio ruolo"
  VOTE: 'VOTE',                 // { targetId } Tavola Rotonda e Cerimonia
  NIGHT_CHOOSE: 'NIGHT_CHOOSE', // { targetId } Traditori: vittima (o sedotto); Leali: sospetto
  NIGHT_CHAT: 'NIGHT_CHAT',     // { text } solo Traditori
  NIGHT_PLAN: 'NIGHT_PLAN',     // { plan: 'murder' | 'seduce' } prima notte con un solo Traditore
  SEDUCTION_ANSWER: 'SEDUCTION_ANSWER', // { accept: true | false } chi riceve la Seduzione o l'Ultimatum
  NIGHT_VISION: 'NIGHT_VISION', // { targetId } Veggente, una volta per partita
  NIGHT_SWAP: 'NIGHT_SWAP',     // { targetId | null } Traditore Segreto, una volta per partita
  FINAL_CHOICE: 'FINAL_CHOICE', // { choice: 'end' | 'banish' }
  MISSION_INPUT: 'MISSION_INPUT', // dati propri della missione in corso (vedi js/engine/missions/)
  USE_ITEM: 'USE_ITEM',         // { item, targetId? } Pugnale, Maledizione, Sigillo, Specchio
  SCENE_TOUCH: 'SCENE_TOUCH',   // { targetId } Omicidio a vista: tutti toccano un nome

  // Dal master
  ADVANCE: 'ADVANCE',           // "Avanti": chiude la fase o la fa proseguire ({ force } solo per le prove)
  TIMER_EXPIRED: 'TIMER_EXPIRED', // { key } tempo scaduto (il master tiene l'orologio)
  DEBUG_NEXT: 'DEBUG_NEXT',     // { mission?, event? } solo prove (?debug=1): prossimo gioco o evento
});

export const PLAYER_ACTIONS = new Set([
  A.ROLE_SEEN, A.VOTE, A.NIGHT_CHOOSE, A.NIGHT_CHAT, A.NIGHT_PLAN, A.SEDUCTION_ANSWER, A.FINAL_CHOICE, A.MISSION_INPUT,
  A.USE_ITEM, A.NIGHT_VISION, A.NIGHT_SWAP, A.SCENE_TOUCH,
]);
export const MASTER_ACTIONS = new Set([A.ADVANCE, A.TIMER_EXPIRED, A.DEBUG_NEXT]);

export const FINAL_CHOICES = Object.freeze({ END: 'end', BANISH: 'banish' });
