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
  estimate: Object.freeze({
    title: 'La Stima',
    rules: 'Il castello mostra per pochi secondi una sala piena di oggetti. Ognuno scrive sul telefono quanti sono: si vince se la media del gruppo cade entro il 10%. Alla fine le stime si vedono con i nomi.',
    playerRules: 'Guarda bene lo schermo, poi scrivi la tua stima.',
    lookMs: 12000,      // immagine sullo schermo
    guessMs: 30000,     // tempo per scrivere la stima
    min: 35,            // quanti oggetti, al minimo e al massimo
    max: 120,
    tolerance: 0.1,     // la media deve cadere entro il 10% del numero vero
    maxGuess: 9999,
  }),
  memory: Object.freeze({
    title: 'La Catena della Memoria',
    rules: 'Il castello mostra una catena di simboli, uno per ciascuno di voi, con il vostro nome. Ricordate il vostro: alla fine si vedrà chi ha sbagliato.',
    playerRules: 'Ricorda il simbolo che compare accanto al tuo nome.',
    itemMs: 1600,       // ogni simbolo resta sullo schermo così
    introMs: 2500,      // attesa prima del primo simbolo
    pickMs: 25000,
  }),
  chronology: Object.freeze({
    title: 'La Cronologia',
    rules: 'Ognuno riceve un evento storico sul telefono. Parlatevi e mettete gli eventi in ordine di tempo: ognuno indica il posto del proprio. Alla fine si vedrà chi l\'ha messo nel punto sbagliato.',
    playerRules: 'Leggi il tuo evento agli altri e scegli il suo posto nella fila.',
    placeMs: 150000,
  }),
  messenger: Object.freeze({
    title: 'Il Messaggero',
    rules: 'Un messaggero estratto a caso vede una scena sul telefono e la descrive a voce, senza usare le parole proibite. Gli altri scelgono tra 6 scene: si vince con la maggioranza giusta.',
    playerRules: 'Ascolta il messaggero e scegli la scena giusta.',
    options: 6,
    describeMs: 90000,
  }),
});

// Simboli della Catena della Memoria (disegnati in js/ui/symbols.js)
export const MEMORY_SYMBOLS = Object.freeze(['Corona', 'Spada', 'Luna', 'Torre', 'Chiave', 'Calice']);

// Oggetti della Stima (disegnati sullo schermo del master)
export const ESTIMATE_OBJECTS = Object.freeze([
  Object.freeze({ id: 'candles', name: 'candele' }),
  Object.freeze({ id: 'coins', name: 'monete' }),
]);

// Eventi della Cronologia: anni tutti diversi (negativi = avanti Cristo)
export const CHRONOLOGY_EVENTS = Object.freeze([
  { text: 'La fondazione di Roma, secondo la tradizione', year: -753 },
  { text: 'Annibale attraversa le Alpi con gli elefanti', year: -218 },
  { text: 'L\'assassinio di Giulio Cesare', year: -44 },
  { text: 'L\'eruzione del Vesuvio che seppellisce Pompei', year: 79 },
  { text: 'L\'editto di Costantino a Milano', year: 313 },
  { text: 'La caduta dell\'Impero romano d\'Occidente', year: 476 },
  { text: 'Carlo Magno incoronato imperatore', year: 800 },
  { text: 'La battaglia di Hastings', year: 1066 },
  { text: 'I crociati conquistano Gerusalemme', year: 1099 },
  { text: 'La firma della Magna Carta in Inghilterra', year: 1215 },
  { text: 'Marco Polo parte per la Cina', year: 1271 },
  { text: 'La morte di Dante Alighieri', year: 1321 },
  { text: 'La peste nera arriva in Europa', year: 1347 },
  { text: 'La caduta di Costantinopoli', year: 1453 },
  { text: 'Cristoforo Colombo arriva in America', year: 1492 },
  { text: 'Michelangelo termina il David', year: 1504 },
  { text: 'Lutero affigge le sue 95 tesi', year: 1517 },
  { text: 'La battaglia di Lepanto', year: 1571 },
  { text: 'Galileo scopre le lune di Giove', year: 1610 },
  { text: 'Newton pubblica i Principia', year: 1687 },
  { text: 'James Cook raggiunge le coste dell\'Australia', year: 1770 },
  { text: 'La Dichiarazione d\'indipendenza degli Stati Uniti', year: 1776 },
  { text: 'La presa della Bastiglia', year: 1789 },
  { text: 'La battaglia di Waterloo', year: 1815 },
  { text: 'La spedizione dei Mille', year: 1860 },
  { text: 'La proclamazione del Regno d\'Italia', year: 1861 },
  { text: 'Roma diventa capitale d\'Italia', year: 1871 },
  { text: 'Le prime Olimpiadi moderne, ad Atene', year: 1896 },
  { text: 'Il primo volo dei fratelli Wright', year: 1903 },
  { text: 'L\'affondamento del Titanic', year: 1912 },
  { text: 'L\'inizio della Prima guerra mondiale', year: 1914 },
  { text: 'Fleming scopre la penicillina', year: 1928 },
  { text: 'La fine della Seconda guerra mondiale', year: 1945 },
  { text: 'Il referendum che fa nascere la Repubblica italiana', year: 1946 },
  { text: 'Le prime trasmissioni regolari della televisione in Italia', year: 1954 },
  { text: 'Il lancio dello Sputnik, primo satellite artificiale', year: 1957 },
  { text: 'Il primo uomo sulla Luna', year: 1969 },
  { text: 'L\'Italia vince i Mondiali di calcio in Spagna', year: 1982 },
  { text: 'La caduta del muro di Berlino', year: 1989 },
  { text: 'L\'euro entra nelle tasche degli italiani', year: 2002 },
  { text: 'L\'Italia vince i Mondiali di calcio in Germania', year: 2006 },
  { text: 'La presentazione del primo iPhone', year: 2007 },
]);

// Scene del Messaggero: banned = parole che il messaggero non può dire
export const MESSENGER_SCENES = Object.freeze([
  { title: 'Un drago che dorme su un mucchio d\'oro', banned: ['drago', 'oro', 'dormire'] },
  { title: 'Un cavaliere caduto da cavallo', banned: ['cavaliere', 'cavallo', 'cadere'] },
  { title: 'Una regina che si guarda allo specchio', banned: ['regina', 'specchio'] },
  { title: 'Un gatto nero seduto sul trono', banned: ['gatto', 'trono'] },
  { title: 'Un banchetto con un maiale arrosto', banned: ['banchetto', 'maiale', 'cena'] },
  { title: 'Un fantasma che suona l\'organo', banned: ['fantasma', 'organo', 'musica'] },
  { title: 'Una torre colpita da un fulmine', banned: ['torre', 'fulmine', 'temporale'] },
  { title: 'Un giullare che fa il giocoliere con tre mele', banned: ['giullare', 'mele', 'giocoliere'] },
  { title: 'Un ponte levatoio che si chiude', banned: ['ponte', 'levatoio'] },
  { title: 'Un re che ha perso la corona', banned: ['re', 'corona'] },
  { title: 'Una strega che mescola un pentolone', banned: ['strega', 'pentola', 'pozione'] },
  { title: 'Un corvo che ruba un anello', banned: ['corvo', 'anello', 'uccello'] },
  { title: 'Un mago con il cappello a punta', banned: ['mago', 'cappello'] },
  { title: 'Due cavalieri che duellano sulla neve', banned: ['duello', 'neve', 'spada'] },
  { title: 'Una barca che affonda nel lago', banned: ['barca', 'lago', 'affondare'] },
  { title: 'Una principessa che dorme da cento anni', banned: ['principessa', 'dormire', 'cento'] },
  { title: 'Un lupo travestito da pecora', banned: ['lupo', 'pecora'] },
  { title: 'Una mappa del tesoro che brucia', banned: ['mappa', 'tesoro', 'fuoco'] },
  { title: 'Un orologio che batte la mezzanotte', banned: ['orologio', 'mezzanotte', 'ore'] },
  { title: 'Un topo che mangia il formaggio del re', banned: ['topo', 'formaggio'] },
  { title: 'Un unicorno nel giardino del castello', banned: ['unicorno', 'cavallo', 'corno'] },
  { title: 'Un arciere che manca il bersaglio', banned: ['arciere', 'freccia', 'bersaglio'] },
  { title: 'Una candela che si spegne da sola', banned: ['candela', 'spegnere'] },
  { title: 'Un cuoco che piange tagliando le cipolle', banned: ['cuoco', 'cipolla', 'piangere'] },
  { title: 'Un trono vuoto coperto di polvere', banned: ['trono', 'polvere'] },
  { title: 'Una chiave che non apre nessuna porta', banned: ['chiave', 'porta'] },
  { title: 'Un gufo che legge un libro', banned: ['gufo', 'libro'] },
  { title: 'Un ballo in maschera', banned: ['maschera', 'ballo', 'festa'] },
  { title: 'Una lettera chiusa con la cera rossa', banned: ['lettera', 'cera', 'sigillo'] },
  { title: 'Un serpente attorcigliato a una spada', banned: ['serpente', 'spada'] },
]);

// Domande dell'Enigma. answer = indice della risposta giusta in options.
export const RIDDLE_QUESTIONS = Object.freeze([
  { q: 'Come si chiama lo scavo pieno d\'acqua attorno alle mura di un castello?', options: ['Bastione', 'Fossato', 'Merlo', 'Torrione'], answer: 1 },
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
  { title: 'Né sì né no', text: 'Per un minuto vi fate domande a vicenda, a raffica. Nessuno può rispondere con "sì" o "no": chi lo dice fa fallire la prova.', ms: 90000 },
  { title: 'Il nodo umano', text: 'In cerchio, ognuno afferra con ogni mano la mano di due persone diverse, non vicine. Sciogliete il nodo senza mai lasciarvi.', ms: 240000 },
  { title: 'La pallina di carta', text: 'Fate una pallina di carta e lanciatevela: ognuno deve toccarla una volta sola, in qualsiasi ordine, senza che cada a terra.', ms: 120000 },
  { title: 'Il battito a catena', text: 'In cerchio, battete le mani una volta a testa, uno dopo l\'altro, sempre più veloci: tre giri completi senza un errore.', ms: 120000 },
  { title: 'La frase a catena', text: 'Costruite una frase di 15 parole, una parola a testa a turno. Alla fine deve avere senso e il gruppo la deve ripetere tutta.', ms: 150000 },
  { title: 'Il libro in testa', text: 'Uno alla volta, attraversate la stanza con un libro (o un piatto di plastica) in equilibrio sulla testa, senza toccarlo.', ms: 240000 },
  { title: 'Il silenzio del castello', text: 'Scegliete un giullare: per 60 secondi prova a far ridere tutti gli altri, che devono restare seri e in silenzio.', ms: 120000 },
  { title: 'Gli oggetti scomparsi', text: 'Uno mette 8 oggetti sul tavolo; gli altri li guardano per 20 secondi, poi chiudono gli occhi e ne viene tolto uno. Il gruppo deve indovinare quale.', ms: 180000 },
  { title: 'Il disegno a voce', text: 'Uno descrive una figura semplice (una casa, un pesce…) senza nominarla; un altro la disegna senza guardare il modello. Il gruppo deve riconoscerla.', ms: 180000 },
  { title: 'Il castello di carte', text: 'Con un mazzo di carte costruite un castello di almeno due piani che resti in piedi per 10 secondi.', ms: 240000 },
  { title: 'Il passaparola', text: 'Il primo sussurra all\'orecchio del vicino una frase di 8 parole, e così via. L\'ultimo la dice ad alta voce: deve essere identica.', ms: 150000 },
  { title: 'L\'anello che passa', text: 'In fila mano nella mano, fate passare una cintura chiusa ad anello (o un elastico grande) lungo tutta la fila senza lasciarvi le mani.', ms: 180000 },
  { title: 'Il ritmo', text: 'Il primo batte un ritmo con le mani, il secondo lo ripete e aggiunge un colpo, e così via. Fate un giro completo senza errori.', ms: 180000 },
  { title: 'La torre di monete', text: 'A turno, una moneta a testa, impilate almeno 15 monete senza farle cadere. Se cadono si riparte da zero.', ms: 150000 },
  { title: 'Gli specchi', text: 'A coppie, uno fa gesti lenti e l\'altro li copia come uno specchio per 30 secondi. Il resto del gruppo giudica se le coppie erano perfette.', ms: 180000 },
]);
