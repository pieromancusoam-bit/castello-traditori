// Catalogo delle missioni: testi e parametri. Aggiungere o regolare una missione
// si fa qui, senza toccare il motore. Tempi in millisecondi.

export const MISSIONS = Object.freeze({
  chest: Object.freeze({
    title: 'Il Forziere',
    rules: 'Il castello sceglie alcuni di voi. Ognuno, in segreto, mette nel forziere Oro o Piombo. Con 2 o più Piombo il forziere resta vuoto.',
    playerRules: 'Scegli in segreto: Oro o Piombo.',
    groupMin: 3,          // giocatori minimi nel gruppo
    groupFraction: 0.5,   // metà dei vivi, arrotondata per difetto
    leadToFail: 2,        // Piombo necessari per svuotare il forziere
    chooseMs: 60000,      // chi non sceglie in tempo vale Oro
  }),
  riddle: Object.freeze({
    title: "L'Enigma del Castello",
    rules: 'Domande a tempo su tutti i telefoni. Per ogni domanda vale la risposta della maggioranza: ogni risposta giusta del gruppo vale monete.',
    playerRules: 'Rispondi prima che la clessidra si svuoti.',
    questions: 5,
    answerMs: 20000,
    revealMs: 6000,       // risposta giusta sullo schermo, poi la domanda dopo
  }),
  torches: Object.freeze({
    title: 'Le Torce',
    rules: 'Quando la torcia si accende sul telefono, toccatela il più in fretta possibile. Conta la media di tutto il gruppo.',
    playerRules: 'Aspetta la fiamma, poi tocca la torcia. Non toccare prima!',
    rounds: 5,
    delayMinMs: 1500,     // attesa casuale prima che la torcia si accenda
    delayMaxMs: 4500,
    litMs: 2000,          // la torcia resta accesa al massimo così: poi è mancata
    minValidMs: 80,       // tempi più bassi sono impossibili: contano come mancati
    roundSlackMs: 4000,   // margine di rete prima che il master chiuda il giro
    missPenaltyMs: 1500,  // tempo di chi manca, tocca troppo presto o non risponde
    fullBelowMs: 450,     // media fino a qui: premio pieno
    halfBelowMs: 650,     // media fino a qui: metà premio; oltre, niente
  }),
  trial: Object.freeze({
    title: 'La Prova Fisica',
    rules: 'Una prova da fare tutti insieme nella stanza. Alla fine ognuno vota dal telefono se è riuscita: serve la maggioranza dei giocatori in gioco.',
    playerRules: 'Fate la prova insieme. Alla fine votate.',
    voteMs: 45000,
  }),
});

// Domande dell'Enigma. answer = indice della risposta giusta in options.
export const RIDDLE_QUESTIONS = Object.freeze([
  { q: 'Come si chiama il fossato pieno d\'acqua attorno a un castello?', options: ['Bastione', 'Fossato', 'Merlo', 'Torrione'], answer: 1 },
  { q: 'Come si chiamano le sporgenze a dente in cima alle mura?', options: ['Merli', 'Archi', 'Guglie', 'Lesene'], answer: 0 },
  { q: 'Qual è la torre principale e più difesa di un castello?', options: ['Il campanile', 'Il mastio', 'La garitta', 'Il rivellino'], answer: 1 },
  { q: 'Quanti lati ha un ettagono?', options: ['6', '8', '7', '9'], answer: 2 },
  { q: 'Qual è il pianeta più vicino al Sole?', options: ['Venere', 'Marte', 'Terra', 'Mercurio'], answer: 3 },
  { q: 'Quante zampe ha un ragno?', options: ['6', '8', '10', '12'], answer: 1 },
  { q: 'In che anno è caduto l\'Impero romano d\'Occidente, secondo la data tradizionale?', options: ['476', '1066', '800', '313'], answer: 0 },
  { q: 'Chi fu incoronato imperatore la notte di Natale dell\'anno 800?', options: ['Federico Barbarossa', 'Ottone I', 'Carlo Magno', 'Pipino il Breve'], answer: 2 },
  { q: 'Qual è il fiume più lungo d\'Italia?', options: ['Adige', 'Tevere', 'Arno', 'Po'], answer: 3 },
  { q: 'Quanti secondi ci sono in un\'ora?', options: ['3.600', '6.000', '360', '1.440'], answer: 0 },
  { q: 'Quale metallo è liquido a temperatura ambiente?', options: ['Piombo', 'Mercurio', 'Stagno', 'Zinco'], answer: 1 },
  { q: 'Chi ha scritto la Divina Commedia?', options: ['Petrarca', 'Boccaccio', 'Dante Alighieri', 'Ariosto'], answer: 2 },
  { q: 'Qual è la capitale della Scozia?', options: ['Glasgow', 'Edimburgo', 'Aberdeen', 'Dublino'], answer: 1 },
  { q: 'Quante carte ha un mazzo da poker senza jolly?', options: ['40', '54', '48', '52'], answer: 3 },
  { q: 'Quale gas respiriamo per vivere?', options: ['Ossigeno', 'Azoto', 'Elio', 'Anidride carbonica'], answer: 0 },
  { q: 'Qual è il numero romano che vale 50?', options: ['C', 'D', 'L', 'X'], answer: 2 },
  { q: 'Quale animale compare più spesso negli stemmi araldici come simbolo di coraggio?', options: ['Il leone', 'La lepre', 'Il gufo', 'La tartaruga'], answer: 0 },
  { q: 'Come si chiama il ponte di un castello che si alza con le catene?', options: ['Ponte sospeso', 'Ponte levatoio', 'Ponte girevole', 'Ponte di barche'], answer: 1 },
  { q: 'Quanti giocatori ha in campo una squadra di calcio?', options: ['10', '12', '9', '11'], answer: 3 },
  { q: 'Qual è l\'oceano più grande della Terra?', options: ['Atlantico', 'Indiano', 'Pacifico', 'Artico'], answer: 2 },
  { q: 'In quale città si trova la Torre pendente?', options: ['Pisa', 'Bologna', 'Siena', 'Lucca'], answer: 0 },
  { q: 'Quanti minuti dura un tempo di una partita di calcio?', options: ['40', '45', '50', '30'], answer: 1 },
  { q: 'Qual è il risultato di 7 × 8?', options: ['54', '63', '56', '48'], answer: 2 },
  { q: 'Chi dipinse la Gioconda?', options: ['Michelangelo', 'Raffaello', 'Caravaggio', 'Leonardo da Vinci'], answer: 3 },
  { q: 'Che cosa misura un termometro?', options: ['La pressione', 'La temperatura', 'L\'umidità', 'Il vento'], answer: 1 },
  { q: 'Quale di questi è un mammifero?', options: ['Lo squalo', 'Il pinguino', 'Il delfino', 'Il salmone'], answer: 2 },
  { q: 'Quante sono le note musicali nella scala do-re-mi?', options: ['7', '5', '8', '12'], answer: 0 },
  { q: 'Qual è la capitale della Spagna?', options: ['Barcellona', 'Siviglia', 'Valencia', 'Madrid'], answer: 3 },
  { q: 'Come si chiamava l\'armatura fatta di piccoli anelli di ferro intrecciati?', options: ['Corazza', 'Cotta di maglia', 'Usbergo di cuoio', 'Brigantina'], answer: 1 },
  { q: 'Quale strumento usavano gli arcieri medievali inglesi, famoso per la sua lunghezza?', options: ['La balestra', 'Il longbow', 'La fionda', 'Il trabucco'], answer: 1 },
  { q: 'Quanti giorni ha un anno bisestile?', options: ['364', '365', '366', '367'], answer: 2 },
  { q: 'Qual è la montagna più alta d\'Europa occidentale?', options: ['Monte Bianco', 'Monte Rosa', 'Cervino', 'Gran Paradiso'], answer: 0 },
  { q: 'Di che colore si ottiene mescolando blu e giallo?', options: ['Viola', 'Arancione', 'Marrone', 'Verde'], answer: 3 },
  { q: 'Qual è l\'organo che pompa il sangue nel corpo?', options: ['Il fegato', 'Il cuore', 'I polmoni', 'I reni'], answer: 1 },
  { q: 'Quante ore ci sono in una settimana?', options: ['148', '168', '172', '156'], answer: 1 },
  { q: 'Quale macchina d\'assedio lanciava pietre con un contrappeso?', options: ['Il trabucco', 'L\'ariete', 'La torre d\'assedio', 'La testuggine'], answer: 0 },
  { q: 'In che anno Cristoforo Colombo arrivò per la prima volta in America?', options: ['1453', '1515', '1492', '1498'], answer: 2 },
  { q: 'Qual è il simbolo chimico dell\'oro?', options: ['Or', 'Ag', 'Go', 'Au'], answer: 3 },
  { q: 'Quanti lati ha un triangolo?', options: ['2', '3', '4', '5'], answer: 1 },
  { q: 'Qual è il più grande animale vivente?', options: ['L\'elefante africano', 'La balenottera azzurra', 'Lo squalo balena', 'La giraffa'], answer: 1 },
  { q: 'Come si chiamava il giovane al servizio di un cavaliere, prima di diventarlo a sua volta?', options: ['Scudiero', 'Giullare', 'Vassallo', 'Menestrello'], answer: 0 },
  { q: 'Quale pezzo degli scacchi si muove a "L"?', options: ['L\'alfiere', 'La torre', 'Il cavallo', 'Il re'], answer: 2 },
]);

// Prove fisiche: ms = durata del tempo a disposizione sullo schermo
export const PHYSICAL_TRIALS = Object.freeze([
  { title: 'Il conto alla cieca', text: 'Contate insieme da 1 a 20, un numero a testa, senza accordarvi e senza un ordine. Se due persone parlano insieme si riparte da 1.', ms: 180000 },
  { title: 'Le statue del castello', text: 'Tutti in piedi, immobili come statue, per 60 secondi. Chi si muove o ride fa fallire la prova.', ms: 90000 },
  { title: 'La torre', text: 'Costruite una torre alta almeno quanto un bicchiere in piedi, usando solo oggetti che avete in tasca o sul tavolo.', ms: 180000 },
  { title: 'Il mimo a catena', text: 'Il primo inventa un gesto, il secondo lo ripete e ne aggiunge uno, e così via. L\'ultimo deve ripetere tutta la catena senza errori.', ms: 240000 },
  { title: 'Su un piede solo', text: 'Tutti su un piede solo, per 45 secondi. Nessuno può appoggiare l\'altro piede o reggersi a qualcosa.', ms: 90000 },
  { title: 'L\'alfabeto del castello', text: 'A turno, nominate un oggetto della stanza che inizi con la lettera successiva, dalla A alla M. Niente ripetizioni, niente pause lunghe.', ms: 120000 },
  { title: 'La catena umana', text: 'Mettetevi in fila e passate un oggetto (una moneta, un tappo) da uno all\'altro senza usare le mani, fino all\'ultimo.', ms: 180000 },
  { title: 'Il coro', text: 'Scegliete una canzone che conoscete tutti e cantatene una strofa, una parola a testa, senza sbagliare il turno.', ms: 180000 },
  { title: 'L\'ordine silenzioso', text: 'Senza parlare, mettetevi in fila in ordine di data di nascita (giorno e mese). Alla fine controllate ad alta voce.', ms: 150000 },
  { title: 'Il bicchiere sul dorso', text: 'Passatevi un bicchiere di plastica vuoto tenendolo sul dorso della mano, da uno all\'altro, senza farlo cadere.', ms: 150000 },
]);
