// Messaggi d'errore chiari, in italiano, per chi gioca (non per chi programma).

const GUEST_WIFI =
  'Se siete su una rete Wi-Fi "ospiti", i dispositivi non possono vedersi: ' +
  'usate la rete principale di casa o l\'hotspot di un telefono.';

const TEXTS = {
  // Problemi di connessione
  'browser-incompatible': {
    title: 'Browser non compatibile',
    text: 'Questo browser non supporta le connessioni dirette. Usa Chrome o Safari aggiornati.',
  },
  'insecure-context': {
    title: 'Pagina non sicura',
    text: 'Apri il gioco dall\'indirizzo https:// pubblicato, non da un indirizzo http:// locale.',
  },
  network: {
    title: 'Servizio di aggancio irraggiungibile',
    text: 'Non riesco a contattare il servizio che fa incontrare i dispositivi. Controlla che ci sia Internet. Riprovo da solo…',
  },
  'server-error': {
    title: 'Servizio di aggancio in difficoltà',
    text: 'Il servizio che fa incontrare i dispositivi non risponde bene. Riprovo da solo… Se continua, si può usare un server di aggancio personale (Impostazioni del master).',
  },
  'peer-unavailable': {
    title: 'Castello non trovato',
    text: 'Non trovo questa stanza. Controlla che il master sia acceso con la stanza aperta. Riprovo da solo…',
  },
  timeout: {
    title: 'Il master non risponde',
    text: `Il castello esiste ma il collegamento diretto non parte. ${GUEST_WIFI} Riprovo da solo…`,
  },
  'heartbeat-lost': {
    title: 'Collegamento perso',
    text: 'Il master non risponde più. Mi ricollego da solo…',
  },
  closed: {
    title: 'Collegamento chiuso',
    text: 'Il collegamento con il master si è chiuso. Mi ricollego da solo…',
  },
  'unavailable-id': {
    title: 'Riapro il castello…',
    text: 'La stanza è ancora "occupata" sul servizio di aggancio. Riprovo ogni pochi secondi.',
  },
  'id-stuck': {
    title: 'Non riesco a riaprire la stanza',
    text: 'Il codice della stanza è ancora occupato. Aspetta un minuto e premi "Riprova", oppure apri una stanza nuova.',
  },
  'invalid-room': {
    title: 'Codice stanza non valido',
    text: 'Il QR code o il link non contengono un codice stanza valido. Inquadra di nuovo il QR sullo schermo principale.',
  },

  // Errori mandati dal master
  NAME_REQUIRED: { title: 'Serve un nome', text: 'Scrivi il nome con cui vuoi giocare.' },
  NAME_TAKEN: { title: 'Nome già preso', text: 'Qualcuno nel castello usa già questo nome. Scegline un altro.' },
  ROOM_FULL: { title: 'Castello pieno', text: 'La stanza ha già il numero massimo di giocatori.' },
  GAME_STARTED: { title: 'Partita già iniziata', text: 'Non si possono aggiungere giocatori a partita iniziata.' },
  INVALID_MESSAGE: { title: 'Messaggio non valido', text: 'Il master ha rifiutato un messaggio. Ricarica la pagina.' },
  NOT_JOINED: { title: 'Non sei ancora entrato', text: 'Ricarica la pagina e inserisci il nome.' },
};

export function errorText(code) {
  return TEXTS[code] || { title: 'Problema di connessione', text: `Qualcosa non va (${code}). Riprovo da solo…` };
}
