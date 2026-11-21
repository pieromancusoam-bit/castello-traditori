// Numeri della rete: tutti qui, mai sparsi nel codice.

export const NET = Object.freeze({
  // Prefisso degli ID su PeerJS Cloud (condiviso con altri utenti)
  peerPrefix: 'castello-traditori-',

  // Codice stanza: 4 caratteri, senza 0/O, 1/I/L
  roomCodeLength: 4,
  roomCodeAlphabet: '23456789ABCDEFGHJKMNPQRSTUVWXYZ',

  // Battito: un ping ogni 5 s, disconnesso dopo 3 battiti persi
  heartbeatMs: 5000,
  missedBeatsForDisconnect: 3,

  // Telefono: tempo massimo per aprire il canale con il master
  connectTimeoutMs: 15000,
  // Attese tra un tentativo e l'altro (l'ultima si ripete)
  reconnectDelaysMs: [1000, 2000, 3000, 5000],

  // Master: "Riprendi" con ID ancora occupato su PeerJS
  resumeIdRetryMs: 3000,
  resumeIdMaxWaitMs: 30000,

  // Master: nuovi tentativi verso il server di aggancio
  signalRetryDelaysMs: [2000, 4000, 8000, 15000],

  // Stanza
  maxPlayers: 16,
  nameMaxLength: 16,
});
