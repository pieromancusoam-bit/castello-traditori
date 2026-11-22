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
  // Dopo "Riprendi" un timer già scaduto riparte con almeno questo tempo (per vedere la clessidra)
  resumeTimerMinMs: 3000,

  // Master: nuovi tentativi verso il server di aggancio
  signalRetryDelaysMs: [2000, 4000, 8000, 15000],

  // Stanza
  maxPlayers: 16,
  nameMaxLength: 16,

  // PeerJS (serializzazione JSON) rifiuta i messaggi da 16300 byte in su e chiude il canale:
  // nessun messaggio deve superare questo tetto, con un margine di sicurezza
  messageMaxBytes: 15000,

  // Ritratto del giocatore: lati in pixel da provare, qualità JPEG da/fino a, testo base64 massimo
  photoSizes: [176, 144, 112],
  photoQuality: 0.72,
  photoMinQuality: 0.35,
  photoMaxChars: 12000,
  // Tentativi automatici di reinvio del ritratto dopo un rientro (per caricamento di pagina)
  photoAutoRetries: 2,
});
