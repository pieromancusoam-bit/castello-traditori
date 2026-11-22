// Spettacolo: voce del narratore, musica, effetti, pause di suspense, vibrazioni.
// Tutti i numeri qui, mai sparsi nel codice.

export const SHOW = Object.freeze({
  // Voce del narratore (sintesi vocale del browser)
  voice: Object.freeze({
    lang: 'it',
    pitch: 0.75,          // più basso = voce più profonda (0–2)
    rate: 0.88,           // più basso = più lento (0.1–10)
    // Voci italiane maschili preferite, in ordine (il nome della voce le contiene)
    preferred: Object.freeze(['Diego', 'Cosimo', 'Giuseppe', 'Benigno', 'Luca', 'Paolo', 'Roberto', 'Carlo', 'Giorgio', 'Federico', 'Marco', 'Andrea']),
    chunkMaxChars: 180,   // le frasi lunghe si spezzano (Chrome si blocca sopra i ~15 secondi)
    gapMs: 250,           // pausa tra due frasi
  }),

  // Volumi di partenza (0–1); il master li cambia dal pannello Audio
  volumes: Object.freeze({ voice: 1, music: 0.45, effects: 0.8 }),
  // Mentre parla il narratore la musica scende a questa frazione del suo volume
  duck: 0.3,
  duckRampMs: 400,
  musicFadeMs: 2500,

  // Tempi delle rivelazioni (millisecondi dall'apparizione della schermata)
  votes: Object.freeze({
    firstMs: 1500,  // primo voto
    stepMs: 1100,   // tra un voto e il successivo
    outcomeMs: 900, // dopo l'ultimo voto: conteggio ed esito
  }),
  revealSilenceMs: 4500,   // bandito: silenzio (con il cuore) prima della fazione
  unveilSilenceMs: 3500,   // ultime maschere: silenzio prima della fazione
  breakfastBreakMs: 1600,  // il quadro della vittima si rompe (uguale al CSS)
  breakfastTextMs: 2600,   // poi il testo

  // "Avanti" mentre il narratore parla: tenere premuto per saltare
  skipHoldMs: 800,

  // Vibrazioni dei telefoni: solo eventi pubblici, uguali per tutti
  vibrate: Object.freeze({
    phase: Object.freeze([120]),            // cambio di fase
    vote: Object.freeze([90, 80, 90]),      // si apre una votazione o una scelta
    timer: Object.freeze([60, 60, 60, 60, 60]), // tempo quasi scaduto
    timerWarnMs: 10000,
  }),
  flashMs: 450, // dove la vibrazione non esiste (iPhone): lampo dello schermo
});
