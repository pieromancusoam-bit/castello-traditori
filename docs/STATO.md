# Stato del progetto

Aggiornato da Claude Code alla fine di ogni sessione di lavoro.

## Fase corrente

**Fase 4 — Spettacolo**: codice completo e provato in locale il 2026-11-22 (non ancora pubblicato).
Si prova con i telefoni veri insieme a Fase 2b e Fase 3 nella seconda serata (checklist in fondo).

**Fase 3 — Profondità**: codice completo e provato in locale il 2026-11-22 (non ancora pubblicato);
la seconda serata con il gruppo proverà insieme Fase 2b e Fase 3 (checklist in fondo).

Fase 2b — Correzioni dopo la prima serata: codice completo e provato in locale il 2026-11-22.

Fase 2 — MVP giocabile: **prima serata giocata** (2026-11-21); le osservazioni del gruppo sono diventate la Fase 2b.

Fase 1 — Scheletro del gioco: **completata il 2026-11-21** (prova con i telefoni veri superata).

Fase 0 — Prototipo di connessione: **completata il 2026-11-21** (prova con 3 telefoni veri superata).

## Fatto

- Progetto di gioco (`PROGETTO.md`) e architettura (`ARCHITETTURA.md`) definiti.
- Repository pubblico `castello-traditori` su GitHub, GitHub Pages attivo su `main` (radice).
- Fase 0, codice: instradamento master/giocatore, stanza con codice e QR, ingresso dei telefoni
  con nome, elenco live sul master, battito ping/pong, riconnessione con token, "Riprendi" sul master,
  Wake Lock, messaggi d'errore, server di aggancio alternativo, pulsante "Saluta il master"
  per provare il canale telefono → master. 16 test (`npm test`).
- Prova in locale (browser integrato, 3 schede, PeerJS Cloud): ingresso, nome doppio rifiutato,
  saluto, ricarica del telefono con rientro automatico, ricarica del master + "Riprendi" con rientro
  automatico dei telefoni (circa 20 s), telefono chiuso segnato "disconnesso" (circa 20 s),
  codice stanza non valido.
- Fase 1, codice:
  - motore puro in `js/engine/` (stato, azioni, fasi, voti, ruoli, viste, generatore con seed);
  - partita completa: Sala d'attesa → Ruoli → Colazione → Tavola Rotonda (voto, parità,
    ballottaggio) → Rivelazione → Notte (omicidio, chat dei Traditori, nuovo Traditore scelto dal
    castello) → finale con **Cerimonia delle Polveri** e vincitore;
  - salvataggio automatico della partita sul master e "Riprendi" a metà partita;
  - ritratto del giocatore (foto facoltativa dal telefono) e **parete dei ritratti** alla Colazione:
    X rossa per i banditi con la fazione, vetro incrinato e cornice storta per gli assassinati;
  - schermate di testo per master e telefono, pulsante "Avanti" del master, pannello `?debug=1`.
- Test: 67 (`npm test`). Il test obbligatorio gioca 150 partite casuali da 5 a 16 giocatori e
  controlla ogni vista di ogni Leale a ogni passo (oltre 10.000 viste): nessun ruolo nascosto,
  niente chat dei Traditori, niente voti individuali, e la vista non cambia se si rimescolano i
  ruoli nascosti. Stessi controlli sullo schermo del master. Prova di verifica: inserendo apposta
  una fuga (numero di Traditori o "accordo raggiunto" sullo schermo) il test fallisce.
- Prova in locale (browser integrato, master + 5 schede, PeerJS Cloud): ingresso, 2 ritratti,
  ruoli con carta da tenere premuta, parità → ballottaggio → nessun bando, notte con chat e accordo,
  Colazione con il quadro della vittima rotto, ricarica del master + "Riprendi" a metà partita
  (stessa fase, ritratti e telefoni ricollegati in circa 30 s), Cerimonia con un "Bandire", bando,
  rivelazioni una alla volta, vittoria dei Traditori, "Nuova partita, stessi giocatori".
  Nessun errore in console.

- Fase 2, codice:
  - montepremi (parte da zero, sempre visibile sul master e sui telefoni) e valore delle missioni
    che cresce ogni giorno (`GAME.missionBaseValue`, `GAME.missionValuePerDay`);
  - interfaccia comune delle missioni in `js/engine/missions/` (setup, start, input, advance,
    result, masterView, playerView) e catalogo in `js/config/missions.js`;
  - 4 missioni: **Il Forziere**, **L'Enigma del Castello** (42 domande originali),
    **Le Torce**, **La Prova Fisica** (10 prove); estrazione senza ripetizioni;
  - timer nel motore come durata + chiave (`TIMER_EXPIRED`), orologio vero sul master,
    clessidra su master e telefoni;
  - tabellone (montepremi, vivi, banditi con fazione, assassinati, missioni giocate) dopo ogni
    missione e a richiesta con il pulsante "Tabellone";
  - finale: il montepremi si divide tra i sopravvissuti della fazione vincente; ognuno vede la
    propria quota sul telefono;
  - salvataggio: anche i dati delle missioni; dopo "Riprendi" il timer in corso riparte;
  - grafica a tema: font gotico Grenze Gotisch (OFL) in `assets/fonts/`, sfondo di pietra e velluto,
    forziere, monete, torcia e risultati disegnati in CSS.
- Test: 94 (`npm test`). Il test obbligatorio gioca anche le missioni e controlla che nessuna vista
  (telefono o schermo) contenga scelte individuali (Oro/Piombo, risposte, tempi, voti della prova);
  un test dedicato rimescola le scelte altrui e verifica che nessuna vista cambi.
- Prova in locale (browser integrato, master + 5 schede): le 4 missioni dall'inizio al tabellone,
  Torce con chi tocca troppo presto e chi non tocca, Forziere con un Piombo, Enigma con rivelazione
  e passaggio automatico alla domanda dopo, "Riprendi" del master e ricarica dei telefoni a metà
  partita, Tavola Rotonda → Cerimonia → montepremi al vincitore. Nessun errore in console.

- Fase 2b, codice (dalle osservazioni della prima serata):
  - **presentazioni** del giorno 1: uno alla volta, in ordine casuale, ognuno con un tema diverso
    (32 temi in `js/config/presentations.js`), 45 secondi a testa, "Avanti" per il prossimo;
  - **3 giochi al giorno** (`GAME.missionsPerDay`); tabellone solo dopo il terzo;
  - **tracce del sabotaggio** a gioco chiuso (chi ha fatto cosa, mai i ruoli) in tutti i giochi
    tranne il Forziere;
  - **4 missioni nuove**: La Stima (disegno in SVG con candele o monete), La Catena della Memoria
    (6 simboli disegnati in SVG), La Cronologia (42 eventi storici), Il Messaggero (30 scene);
    **15 prove fisiche in più** (25 in tutto);
  - **discussione minima** alla Tavola Rotonda: 5 minuti fino a 9 giocatori in gioco, 10 da 10 in su;
    il voto si apre a tempo scaduto (salto solo con `?debug=1`);
  - **Seduzione** la prima notte nelle partite con un solo Traditore;
  - **Cerimonia con 3 giocatori** fino a 7 giocatori iniziali, con 4 oltre;
  - **ultime maschere**: prima i Leali, i Traditori per ultimi.
- Test: 114 (`npm test`). Le partite casuali del test obbligatorio giocano con tutte le regole
  nuove accese (presentazioni, discussione, Seduzione, 8 missioni).
- Prova in locale (master con `?debug=1` + 5 schede): presentazioni su TV e telefoni, Messaggero,
  Enigma con i nomi sotto le risposte, Forziere, discussione con clessidra, voto, Seduzione accettata
  (offerta anonima, complice svelato, esito solo al Traditore), Stima, Cronologia, Prova Fisica con
  "fallita" e astenuti, Cerimonia con 3 giocatori, Traditori svelati per ultimi, montepremi diviso
  tra due vincitori. La Catena della Memoria provata disegnando le sue schermate nella pagina (non è
  uscita in partita). Nessun errore in console.

- Fase 3, codice:
  - **impostazioni partita** nella sala d'attesa (Traditori, soglia della Cerimonia, giochi al giorno,
    tempo dei giochi, presentazioni, discussione, Veggente, Cavaliere, Traditore Segreto, Seduzione,
    Ultimatum, i 4 eventi); valori di partenza da `js/config/`, scelte salvate sul master;
  - **oggetti** con inventario segreto sul telefono: Scudo, Pugnale, Maledizione, Sigillo, Specchio;
    un oggetto in segreto a un giocatore estratto a ogni gioco riuscito;
  - **ruoli speciali**: Veggente, Traditore Segreto, Cavaliere (svelati a fine partita);
  - **Ultimatum di reclutamento** al bando del primo Traditore;
  - **eventi**: Nebbia, Doppia posta, Banchetto, Omicidio a vista (scena e tramonto);
  - **4 missioni**: Il Codice della Cripta, Il Ponte, L'Asta, La Lettera Sigillata (catalogo completo: 12);
  - timer che ripartono **dal tempo rimasto** dopo "Riprendi" (master e telefoni che rientrano);
  - con `?debug=1`: scelta del prossimo gioco e del prossimo evento, "dai un oggetto a…".
- Test: 180 (`npm test`). Le partite casuali del test obbligatorio giocano con tutto acceso: ruoli
  speciali, oggetti in mano fin dall'inizio, Ultimatum, eventi sempre estratti quando possibili,
  12 missioni. Il test controlla anche Veggente e Cavaliere e rimescola, oltre ai ruoli, gli oggetti
  dei giocatori nascosti. In 150 partite escono tutti gli eventi, la scena, il tramonto, la seconda
  votazione, lo Scudo che salva, il cambio di vittima e l'Ultimatum.
- Prova in locale (master con `?debug=1` + 7 schede, due partite): impostazioni partita, carte dei
  ruoli speciali, Cripta (frammento falso al Traditore, codici con i nomi), Ponte con tradimento e
  oggetto segreto, Maledizione annunciata senza autore, Sigillo, Pugnale "×2", Specchio, Veggente,
  Ultimatum accettato e rifiutato, Asta con vincitore segreto, Lettera aperta, Scudo del Cavaliere
  ("omicidio fallito"), Traditore Segreto che vede la chat e decide sulla vittima, Omicidio a vista
  (scena e tramonto), Catena della Memoria in partita, Nebbia, Cerimonia e ruoli svelati alla fine,
  "Riprendi" del master durante la discussione (da 2:46 riparte a 2:38) e telefono ricaricato (2:07).
  Banchetto e Doppia posta provati solo con i test. Nessun errore in console.

- Fase 4, codice:
  - **regista** puro (`js/show/director.js`): confronta due schermate del master e decide frasi,
    effetti e musica. Usa solo `viewForMaster`, quindi non può dire segreti;
  - **narratore** con la sintesi vocale del browser: voce italiana maschile scelta da sola (Diego,
    Cosimo, Luca…), tono 0,75 e velocità 0,88 (`js/config/show-config.js`), frasi lunghe spezzate,
    coda; 54 momenti con 4–5 frasi originali ciascuno in `js/config/narrator-lines.js`; la prima
    volta in partita spiega la regola (Tavola Rotonda, voto, notte, scena, Cerimonia) e legge le
    regole di ogni gioco una volta sola; mai la stessa frase due volte di fila; dopo "Riprendi"
    nessuna frase ripetuta;
  - **"Avanti" aspetta il narratore** (scritta "Il narratore parla…"); tenendolo premuto si salta
    e le animazioni arrivano subito alla fine;
  - **musica ed effetti** generati dal vivo con Web Audio (nessun file, nessuna licenza): quattro
    sottofondi (giorno, notte, Tavola Rotonda, finale) con dissolvenza e volume che si abbassa
    quando parla il narratore; campana della colazione, rintocco del voto, gong, porta che si
    chiude al bando, cuore, vetro che si rompe, monete, fallimento, maledizione, sigillo, notte,
    fanfara, fiamme della Cerimonia. File veri facoltativi in `js/config/sounds.js`;
  - **pannello Audio** sul master (sala d'attesa e partita): voce sì/no, scelta della voce con
    "Prova voce", volumi di voce, musica ed effetti; salvato nel browser del master;
  - **suspense**: voti che compaiono uno alla volta con un rintocco (dal meno al più votato nella
    Nebbia), esito alla fine; bandito con il nome che pulsa e la fazione dopo 4,5 s di silenzio;
    ultime maschere con silenzio prima di ogni fazione; vincitori con bagliore; notte che respira;
  - **stemmi araldici**: 20 stemmi originali in SVG (`js/ui/heraldry.js`); il master ne assegna
    uno libero a ogni giocatore, il telefono lo cambia nella sala d'attesa tra quelli liberi.
    Sul master al posto delle iniziali (o in un angolo della foto), sul telefono accanto al nome
    e nelle griglie di voto e di notte (uguali per tutti);
  - **vibrazioni**: cambio di fase, inizio di voto/scelta/gioco, 10 s alla fine dei timer lunghi;
    decise solo da fase e momento pubblici; su iPhone (niente vibrazione) un lampo dello schermo.
- Test: 190 (`npm test`). Nuovi: frasi complete (4–5 per momento, variabili note, ogni momento del
  regista esiste), narratore senza ripetizioni e con "prima volta", 60 partite casuali in cui ogni
  frase è completa e una schermata uguale non produce segnali; stemmi (unici, solo liberi, solo in
  sala d'attesa); **obbligatorio**: in 60 partite casuali ogni telefono vibra negli stessi momenti.
- Prova in locale (master con `?debug=1` + 5 schede): voce Microsoft Cosimo scelta da sola,
  frasi spezzate e in coda, "Avanti" bloccato e salto tenendo premuto, regole del Forziere lette,
  presentazioni, "Riprendi" senza frasi ripetute, voti con esito, bando con silenzio e fazione,
  prima notte con la spiegazione, stemmi (scelta, stemma preso disattivato, parete della
  Colazione), vibrazione e lampo al cambio di fase. Nessun errore in console. **Non ascoltati**:
  musica ed effetti (il browser di prova è muto); Cerimonia e finale visti solo con i test.

## Fase 4 — attività

- [x] Regista e frasi del narratore
- [x] Voce, musica ed effetti sintetizzati, pannello Audio
- [x] Suspense nelle rivelazioni
- [x] Stemmi araldici
- [x] Vibrazioni (e lampo su iPhone)
- [x] Prova in locale
- [ ] Ascoltare voce, musica ed effetti sulla TV vera e regolare volumi e tempi
- [ ] Facoltativo: file audio registrati (CC0) al posto dei suoni sintetizzati
- [ ] Push su GitHub Pages e seconda serata con il gruppo

## Fase 3 — attività

- [x] Impostazioni nel motore, ruoli e fazioni separati, inventario
- [x] Timer dopo "Riprendi" e strumenti di prova (`?debug=1`)
- [x] Schermata Impostazioni partita
- [x] Oggetti con inventario sul telefono
- [x] Veggente, Traditore Segreto, Cavaliere
- [x] Ultimatum di reclutamento
- [x] Eventi
- [x] Il Codice della Cripta, Il Ponte, L'Asta, La Lettera Sigillata
- [x] Prova in locale
- [ ] Push su GitHub Pages e seconda serata con il gruppo (Fase 2b + Fase 3)

## Fase 2b — attività

- [x] Presentazioni del giorno 1 con temi casuali
- [x] 3 giochi al giorno
- [x] Tracce del sabotaggio nei giochi
- [x] La Stima, La Catena della Memoria, La Cronologia, Il Messaggero; più prove fisiche
- [x] Discussione minima alla Tavola Rotonda
- [x] Seduzione la prima notte con un solo Traditore
- [x] Cerimonia con 3 giocatori fino a 7; Traditori svelati per ultimi
- [x] Prova in locale
- [ ] Push su GitHub Pages e seconda serata con il gruppo

## Fase 2 — attività

- [x] Montepremi e valori in configurazione
- [x] Interfaccia comune delle missioni e timer
- [x] Il Forziere, L'Enigma del Castello, Le Torce, La Prova Fisica (con test)
- [x] Tabellone sul master
- [x] Finale con Cerimonia delle Polveri e divisione del montepremi
- [x] Salvataggio automatico anche delle missioni
- [x] Prima grafica a tema (palette scura, font gotico per i titoli)
- [x] Prova in locale con 5 schede
- [x] Push su GitHub Pages e prima serata di gioco vera con il gruppo (2026-11-21)

## Fase 1 — attività (completate)

- [x] Motore puro con test: ruoli, voti, parità, ballottaggio, notte, castello, finale
- [x] `viewFor` / `viewForMaster` con allow-list e test obbligatorio
- [x] Cerimonia delle Polveri (anticipata dalla Fase 2, su richiesta)
- [x] Salvataggio automatico e ripresa della partita (anticipato dalla Fase 2, su richiesta)
- [x] Ritratti e parete della Colazione (aggiunta su richiesta)
- [x] Schermate di testo master e telefono
- [x] Prova in locale con 5 schede
- [x] Correzioni dopo la prima prova: ritratto su iOS, rimozione dei disconnessi, Cerimonia animata
- [x] Push su GitHub Pages e prova con i telefoni veri: tutto ok (Piero, 2026-11-21)

## Fase 0 — attività (completate)

- [x] Struttura cartelle e `index.html` con instradamento master/giocatore
- [x] Librerie in `/vendor/` (PeerJS, QR) con versione fissata
- [x] Master: crea stanza, mostra codice e QR, elenca i telefoni collegati
- [x] Telefono: entra dal QR, inserisce nome, appare sul master
- [x] Battito ping/pong e stato "disconnesso" sul master
- [x] Riconnessione con token dopo ricarica (telefono) e "Riprendi" (master)
- [x] Wake Lock su master e telefoni
- [x] Messaggio d'errore chiaro se la connessione non parte
- [x] Push su GitHub Pages e prova con 3 telefoni veri per 15 minuti: tutto ok (Piero, 2026-11-21)

## Decisioni prese

| Data | Decisione | Motivo |
| --- | --- | --- |
| 2026-11-21 | Architettura peer-to-peer con master autoritativo (PeerJS) | Gratis, stessa stanza, segreti protetti per costruzione |
| 2026-11-21 | Repository pubblico su GitHub, sito su GitHub Pages | Gratis; il sito sarebbe pubblico comunque; il codice non rivela i ruoli (decisi a runtime sul master). Regole: niente dati personali, chiavi o materiale del programma TV nel repository; solo asset con licenza ridistribuibile; commit con indirizzo email noreply di GitHub |
| 2026-11-21 | Codice stanza di 4 caratteri senza simboli ambigui (es. `7K3Q`); ID PeerJS `castello-traditori-<CODICE>` | Facile da dettare; niente collisioni su PeerJS Cloud |
| 2026-11-21 | Il server di aggancio alternativo (piano B) viaggia nel QR (`&ps=host:porta/percorso`) solo se attivo | I telefoni devono usare lo stesso server del master |
| 2026-11-21 | "Riprendi" sul master riprova da solo per ~30 s se l'ID è ancora occupato su PeerJS | Il server tiene l'ID vecchio per qualche secondo dopo una ricarica |
| 2026-11-21 | Controllo del finale (4 giocatori) anche alla Colazione, dopo l'omicidio | Decisione di Piero |
| 2026-11-21 | Nessuna fine anticipata: si continua anche senza Traditori o con Traditori ≥ Leali | Decisione di Piero |
| 2026-11-21 | Cerimonia delle Polveri: minimo 2 giocatori, poi rivelazione uno alla volta | Decisione di Piero |
| 2026-11-21 | Ultimatum di reclutamento: solo al bando del primo Traditore | Decisione di Piero |
| 2026-11-21 | Tutti i Traditori banditi con più di 4 in gioco: la notte dopo il castello trasforma in segreto un Leale a caso in Traditore (nessun omicidio quella notte); numero di Traditori iniziali non annunciato | Decisione di Piero (opzione A) |
| 2026-11-21 | Cerimonia delle Polveri e salvataggio automatico anticipati in Fase 1 | Decisione di Piero: evitare un finale provvisorio da buttare |
| 2026-11-21 | Cerimonia: chi non sceglie vale "Chiudere"; parità → ballottaggio → se ancora pari nessuno esce e si torna a scegliere; rivelazioni una alla volta anche quando tutti chiudono | Decisione di Piero; "una alla volta" decisione minore di Claude |
| 2026-11-21 | Omicidio: chat dei Traditori + un pulsante per ogni Leale vivo; servono tutti sullo stesso nome. Con "Avanti" senza accordo vince il più indicato, parità estratta a caso; nessuna indicazione = nessuna vittima | Decisione di Piero; "nessuna indicazione" decisione minore di Claude |
| 2026-11-21 | Notte uguale per tutti: griglia con tutti gli altri vivi e conferma (ai Traditori i complici disattivati, così il numero di caselle non rivela nulla). La notte finisce da sola quando i Traditori sono d'accordo e tutti hanno scelto | Proposta approvata da Piero |
| 2026-11-21 | Sospetto notturno (sostituisce la scelta finta): i Leali indicano "Di chi sospetti?"; alla Colazione il castello annuncia il più sospettato tra i vivi, in parità tutti i pari merito, senza numero di sospetti né autori. Anche il nuovo Traditore scelto dal castello, quella notte, indica un sospetto | Decisione di Piero (opzione B); dettagli (parità, niente conteggio, solo vivi) decisioni minori di Claude: il conteggio rivelerebbe quanti Leali ci sono |
| 2026-11-21 | Voto: non per sé stessi; al ballottaggio votano tutti, solo tra i candidati; un voto confermato non si cambia; i nomi dei voti solo sul master a votazione chiusa, ai telefoni solo l'esito | Proposta approvata da Piero; "voto non modificabile" decisione minore di Claude |
| 2026-11-21 | Prima Colazione subito dopo i Ruoli, senza Notte prima | Proposta approvata da Piero |
| 2026-11-21 | Ritratto facoltativo scattato dal telefono (JPEG 192 px), solo sul master, salvato a parte e cancellato alla chiusura della stanza; senza foto, quadro con le iniziali | Decisione di Piero |
| 2026-11-21 | Stato del generatore casuale (`rngState`) dentro la partita; salvataggio a ogni azione accettata | Decisione minore di Claude: ripresa identica dopo "Riprendi" |
| 2026-11-21 | Di notte lo schermo conta chi ha "fatto una scelta" (primo tocco), non chi ha finito | Decisione minore di Claude, imposta dal test: il conteggio non deve dipendere dai ruoli |
| 2026-11-21 | Fine partita: "Nuova partita, stessi giocatori" riporta alla sala d'attesa | Decisione minore di Claude, utile per le prove |
| 2026-11-21 | Cerimonia: chiuse le scelte, attesa e poi rivelazione pubblica una per una (ritratto, nome, fiamme verdi = Chiudere, rosse = Bandire), nell'ordine d'ingresso; chi non ha scelto compare come "Chiudere". "Avanti" compare solo a fine animazione; tempi in `GAME.ceremonyReveal` | Decisione di Piero; ordine, astenuti e tempi decisioni minori di Claude |
| 2026-11-21 | Sala d'attesa: il master può rimuovere i giocatori disconnessi; se rientrano, ricompaiono come nuovi | Richiesta di Piero |
| 2026-11-21 | Missioni: 1.000 monete il giorno 1, +250 al giorno; Forziere con metà dei vivi (minimo 3) e 2 Piombo per svuotarlo; Enigma 5 domande da 20 s, vale la maggioranza, parità = sbagliata; Torce 5 giri, mancata = 1,5 s, premio pieno fino a 0,45 s di media e metà fino a 0,65 s; Prova Fisica riuscita con la maggioranza dei vivi; montepremi diviso in parti uguali per difetto tra i sopravvissuti vincitori; solo i vivi giocano le missioni | Proposte approvate da Piero |
| 2026-11-21 | Missione dopo la Colazione anche il primo giorno; momenti: regole → gioco → risultato → tabellone → Tavola Rotonda | Decisione minore di Claude |
| 2026-11-21 | Forziere: chi non sceglie in tempo (60 s) vale Oro. Enigma: dopo ogni domanda 6 s di rivelazione, poi la successiva da sola. Prova Fisica: tempo della prova dal catalogo, poi 45 s di voto | Decisioni minori di Claude (tempi in `js/config/missions.js`) |
| 2026-11-21 | Le Torce: il telefono misura da sé il tempo di reazione (il ritardo del Wi-Fi non conta); toccare prima della fiamma = torcia mancata | Decisione minore di Claude |
| 2026-11-21 | Testi di domande e prove viaggiano nella vista (non solo l'indice), così un telefono con la versione vecchia in cache non mostra la domanda sbagliata; la risposta giusta arriva solo a domanda chiusa | Decisione minore di Claude |
| 2026-11-21 | Le missioni non usano i ruoli: i Traditori sabotano solo con le proprie scelte, con schermate identiche a quelle dei Leali | Decisione minore di Claude, coerente con il test di non interferenza |
| 2026-11-21 | Font dei titoli: Grenze Gotisch (SIL OFL), scaricato in `assets/fonts/` | Gotico ma leggibile anche sulla TV |
| 2026-11-21 | Ogni messaggio di rete resta sotto 15.000 byte (`NET.messageMaxBytes`): ritratto ridotto fino a stare in 12.000 caratteri, chat limitata a 30 messaggi e 4.000 byte, test sul caso peggiore (16 giocatori, nomi e chat pieni: circa 9.600 byte) | Correzione del bug iOS: PeerJS (JSON) chiude il canale sopra 16.300 byte |

| 2026-11-22 | Presentazioni del giorno 1 con un tema diverso per ognuno; 3 giochi al giorno; discussione minima 5/10 minuti; Cerimonia con 3 fino a 7 giocatori; Traditori svelati per ultimi | Osservazioni di Piero dopo la prima serata |
| 2026-11-22 | Seduzione: la prima notte, se la partita è iniziata con un solo Traditore, il Traditore sceglie Assassinare o Sedurre. Il sedotto può rifiutare e resta vivo; se accetta diventa Traditore e uccide dalla notte dopo. Offerta anonima; nessun omicidio quella notte | Decisione di Piero; "offerta anonima" proposta di Claude approvata |
| 2026-11-22 | Indizi sulla fazione come tracce del sabotaggio: a gioco chiuso si vede chi ha fatto cosa (risposte, tempi, voti, stime); il Forziere resta anonimo | Decisione di Piero ("tracce del sabotaggio"); Forziere anonimo proposta di Claude approvata |
| 2026-11-22 | Con esattamente 10 giocatori in gioco la discussione dura 10 minuti | Proposta di Claude approvata |
| 2026-11-22 | "Qualche prova in più": 15 prove fisiche nuove nel catalogo (25 in tutto), oltre alle 4 missioni anticipate | Interpretazione di Claude della richiesta di Piero |
| 2026-11-22 | Seduzione: un'offerta senza risposta quando il master chiude la notte vale come rifiutata; il Traditore non può cambiare il sedotto né tornare ad "Assassinare" dopo aver inviato l'offerta; il sedotto quella notte non indica sospetti obbligatori | Decisioni minori di Claude |
| 2026-11-22 | Presentazioni: allo scadere dei 45 secondi non si passa da soli al prossimo, serve "Avanti" | Decisione minore di Claude: nessuno viene interrotto a metà frase |
| 2026-11-22 | La Stima vince se la media cade entro il 10%; Catena della Memoria e Cronologia danno monete in proporzione alle parti giuste; il Messaggero vince con la maggioranza dei presenti che indovina | Decisioni minori di Claude (valori in `js/config/missions.js`) |
| 2026-11-22 | Partite salvate con la versione precedente: riprendono con 1 gioco al giorno, senza presentazioni, discussione e Seduzione | Decisione minore di Claude |

| 2026-11-22 | Fase 3: tutte le proposte della sessione di piano accettate (oggetti dai giochi riusciti, Scudo, Pugnale, Maledizione/Sigillo, Specchio, Traditore Segreto, Veggente, Cavaliere, Ultimatum, eventi, 4 missioni; dettagli in PROGETTO.md) | Decisione di Piero ("sì, tutte ok") |
| 2026-11-22 | Ultimatum senza accordo all'alba: nessuna offerta e nessun omicidio. Ultimatum senza risposta: vale come rifiutato (il Leale muore) | Decisioni minori di Claude |
| 2026-11-22 | Il Traditore Segreto resta segreto anche per chi recluta con l'Ultimatum: il reclutato vede solo i Traditori "normali" | Decisione minore di Claude, coerente con il ruolo |
| 2026-11-22 | Di notte, ad accordo raggiunto, la notte aspetta che il Traditore Segreto decida (cambia o lascia) finché ha il potere | Decisione minore di Claude: altrimenti la notte finirebbe prima che possa agire |
| 2026-11-22 | Omicidio a vista: la scena viene dopo il primo gioco (con un solo gioco al giorno o senza giochi, prima della Tavola Rotonda); 20 s (`GAME.sceneMs`); senza tocco valido nessuno muore. Il giorno dell'Omicidio a vista l'Ultimatum aspetta la notte dopo | Decisioni minori di Claude |
| 2026-11-22 | Il montepremi non scende mai sotto zero e la perdita mostrata è quella vera; la Doppia posta fallita toglie il valore normale del gioco | Decisione minore di Claude |
| 2026-11-22 | Maledizione: nelle partite senza giochi si lancia alla Colazione. Specchio: si usa in qualsiasi momento dopo una Tavola Rotonda | Decisioni minori di Claude |
| 2026-11-22 | Il moltiplicatore "tempo dei giochi" vale solo per i timer delle missioni; presentazioni e discussione hanno i loro valori | Decisione minore di Claude |
| 2026-11-22 | Di notte il pulsante "Oggetti" non compare: la schermata notturna resta uguale per tutti | Decisione minore di Claude |
| 2026-11-22 | Riepilogo della sala d'attesa: "Traditori automatico / scelti a mano", mai il numero | Decisione minore di Claude: lo schermo lo vedono tutti |

| 2026-11-22 | Fase 4: piano accettato con le risposte consigliate (stemma scelto in sala d'attesa, al posto delle iniziali e piccolo sulla foto; vibrazioni solo pubbliche e uguali per tutti; lampo su iPhone; il narratore legge le regole la prima volta; "Avanti" bloccato con tocco lungo per saltare; una traccia per momento; musica CC BY ammessa con crediti; frasi scritte da Claude) | Decisione di Piero ("Sì, procedi") |
| 2026-11-22 | Musica ed effetti generati dal browser (Web Audio) invece di file scaricati; i file restano possibili in `js/config/sounds.js` | Decisione minore di Claude: costo zero, nessuna licenza, nessun download da approvare; si scaricano file veri solo se il suono sintetizzato non piace |
| 2026-11-22 | Narratore, suoni e musica fuori dal motore: un regista puro confronta le schermate del master (invece degli effetti `narrate`/`playSound` del motore previsti in ARCHITETTURA) | Decisione minore di Claude: non può rivelare segreti per costruzione e non tocca il motore |
| 2026-11-22 | Dopo "Riprendi" il narratore tace fino al momento successivo (solo la musica riparte); la memoria delle regole già spiegate è salvata per stanza e si azzera a ogni partita nuova | Decisione minore di Claude |
| 2026-11-22 | Nella Nebbia i conteggi compaiono dal meno al più votato | Decisione minore di Claude: suspense fino all'ultimo |
| 2026-11-22 | Vibrazione del tempo quasi scaduto solo per timer da 30 s in su (non per le domande lampo dell'Enigma) | Decisione minore di Claude |
| 2026-11-22 | Il lampo al posto della vibrazione è tenue di notte | Decisione minore di Claude: la luce non deve farsi notare |

## Decisioni aperte

- Nome definitivo del gioco (provvisorio: Il Castello dei Traditori)
- Montepremi "per la gloria" o con premio reale

## Problemi noti

- Fase 4: **cache del browser**: dopo un aggiornamento alcuni browser tengono i file vecchi per un po'
  (GitHub Pages: 10 minuti). Sul master Ctrl+F5; sui telefoni ricaricare la pagina e, se serve,
  chiudere e riaprire la scheda.
- Fase 4: le voci dipendono dal browser. Chrome su Windows: Cosimo (maschile) ed Elsa; Edge ha
  voci "naturali" più belle (Diego, Giuseppe) che però ignorano in parte il tono. Un browser senza
  voce italiana (alcune TV) resta muto: il pannello Audio lo dice e si gioca con il testo.
- Fase 4: musica ed effetti mai ascoltati davvero (il browser di prova è muto): volumi, tempi e
  gusto vanno regolati sulla TV (`js/config/show-config.js`, `js/platform/audio.js`).
- Fase 4: Android vibra solo dopo il primo tocco sulla pagina (regola del browser); su iPhone c'è
  il lampo. Chi ha la vibrazione spenta non sente nulla.
- Fase 4: le partite salvate prima della Fase 4 riprendono con le iniziali al posto degli stemmi.

- Fase 3: Banchetto e Doppia posta non sono ancora stati visti sullo schermo (solo test del motore):
  da guardare nella seconda serata o forzandoli con `?debug=1`.
- Fase 3: il pulsante "Oggetti" compare solo a chi ha oggetti: chi sbircia il telefono altrui
  sa che ne ha. Di notte è nascosto.
- Fase 3: il Codice della Cripta con 5–6 giocatori ha pochi frammenti: se il Traditore ha l'indizio
  diretto su una cifra, il gruppo può non riuscire a ricostruirla. Da valutare giocando.
- Fase 3: l'Asta con il montepremi vuoto non vende nulla (offerte solo da 0).
- Fase 3: il Traditore Segreto di notte ha la schermata più lunga (chat in lettura), come i Traditori.
- Fase 3: con le animazioni del browser in pausa (pannello nascosto) la catena di simboli non scorre:
  in locale si prova con la finestra in primo piano.

- Fase 2b: la durata di una giornata con 3 giochi e 5–10 minuti di discussione va misurata nella
  seconda serata; se è troppo lunga si scende a 2 giochi (impostazioni partita).
- Fase 2b: con 16 giocatori la Catena della Memoria dura circa 28 secondi di simboli: da valutare.
- Fase 2b: le tracce rendono il sabotaggio molto visibile; se i Traditori vengono scoperti troppo
  presto si possono ridurre (per esempio togliere i nomi dall'Enigma).
- **Chiusi in Fase 3**: la Catena della Memoria è uscita in una partita di prova (forzata con
  `?debug=1`); dopo "Riprendi" i timer (missioni, discussione, presentazioni) ripartono dal tempo
  rimasto e non più da capo.

- Fase 2: le domande dell'Enigma sono nel codice pubblico: chi le cerca nel sito trova le risposte.
- Fase 2: con 5–6 giocatori c'è un solo Traditore, che da solo non può svuotare il Forziere
  (servono 2 Piombo). Da valutare dopo la prima serata (`MISSIONS.chest.leadToFail`).
- Fase 2: le soglie delle Torce (0,45 / 0,65 s) vanno tarate sui telefoni veri, che hanno
  ritardi di tocco diversi tra iPhone e Android.
- Fase 2: le domande dell'Enigma sono 42: in più partite di fila cominceranno a ripetersi.

- **Corretto e riprovato su iPhone**: il ritratto da iOS causava "Ritratto non arrivato al master"
  e scollegamenti a ripetizione. Causa: PeerJS chiude il canale con messaggi oltre 16.300 byte e il
  telefono rimandava la foto a ogni rientro. Ora il ritratto viene ridotto finché sta nel limite
  (provato in locale con un'immagine di rumore da 11 MB: 11 KB) e i reinvii automatici sono al massimo 2.
- Dopo un "Riprendi" durante la rivelazione delle scelte, l'animazione riparte dall'inizio.

- Scatto del ritratto con la fotocamera vera non ancora provato: in locale è stato simulato con
  un file. Va verificato su iPhone e Android dalla versione pubblicata (https).
- Dopo un "Riprendi" alla Colazione l'animazione del quadro che si rompe riparte.
- Nessun timer in Fase 1: chi è disconnesso durante un voto non viene atteso 60 s; il master
  chiude a mano con "Chiudi la votazione" e chi manca risulta astenuto.
- Di notte i Traditori vedono in più la chat: la loro schermata è più lunga e chi sbircia
  può accorgersene.
- Chi è disconnesso quando si preme "Inizia la partita" entra comunque in partita (il master
  chiede conferma). Manca la rimozione di un giocatore che abbandona (pannello di controllo).
- `.claude/launch.json` ha una seconda configurazione (`castello-alt`, porta 8125) per provare
  in locale quando la 8123 è occupata.

- Dopo la ricarica del master i telefoni rientrano in circa 20 s (attese tra i tentativi + tempo
  di PeerJS per riassegnare l'ID). Accettabile; se dà fastidio si accorciano le attese in `js/config/net-config.js`.
- Un telefono chiuso di colpo risulta "disconnesso" solo dopo 3 battiti persi (circa 15-20 s):
  WebRTC non sempre avvisa subito della chiusura.
- Piano B: da GitHub Pages (https) il server di aggancio personale deve essere raggiungibile in
  https/wss. Un PeerServer su un PC di casa in semplice http non funziona senza un certificato.

## Checklist Fase 4 (spettacolo) — da fare prima o durante la seconda serata

Prima della serata
1. Push su GitHub Pages. Sul master **Ctrl+F5**; sui telefoni già usati ricaricate la pagina.
2. Master collegato alla TV con l'audio della TV (o una cassa). Aprite **Audio**: controllate che
   la voce sia italiana e maschile, premete "Prova voce" e "Prova effetto", regolate i volumi.
   Se la voce non piace, provate le altre dell'elenco (con Edge ci sono le voci "naturali").

Durante la partita
3. Sala d'attesa: ogni telefono ha uno stemma; "Cambia stemma" mostra quelli liberi, quelli presi
   sono spenti. Sul master lo stemma compare nell'elenco.
4. "Inizia la partita": il narratore spiega come guardare il ruolo; la musica parte.
5. Mentre parla, "Avanti" dice "Il narratore parla…": tenetelo premuto per saltare.
6. Primo gioco: il narratore legge le regole; le volte dopo no. Risultato con monete o
   fallimento (suono diverso).
7. Tavola Rotonda: rintocco, spiegazione la prima volta; alla chiusura i voti compaiono uno alla
   volta con un rintocco ciascuno, poi l'esito detto a voce.
8. Bando: porta che si chiude, cuore, silenzio, poi la fazione (a voce e sullo schermo).
9. Notte: musica scura, spiegazione la prima volta. Alla Colazione campana e quadro che si rompe.
10. Telefoni: vibrano (Android) o lampeggiano (iPhone) a ogni cambio di fase e all'inizio di ogni
    voto; nessuno deve vibrare da solo (chat dei Traditori, oggetti, offerte non vibrano).
11. Stemmi accanto ai nomi nelle griglie di voto e di notte.
12. Cerimonia: fiamme con il loro suono; ultime maschere con silenzio prima di ogni fazione;
    vittoria con fanfara e montepremi detto a voce.
13. A metà partita ricaricate il master e "Riprendi": torna la musica, il narratore non ripete.

Dopo la serata
14. Annotate: il gruppo ha seguito il narratore senza leggere? Voce troppo lenta o veloce? Frasi
    da cambiare? Musica e volumi? Suspense troppo lunga (tempi in `show-config.js`)? Vibrazioni
    fastidiose? Se i suoni sintetizzati non piacciono, si scaricano file registrati (CC0).

## Checklist per la seconda serata (Fase 2b + Fase 3)

L'obiettivo della Fase 3 è provare in partita almeno una volta ogni oggetto, ruolo ed evento.
Conviene fare due partite: una piccola (5–6 giocatori, Seduzione) e una grande (7+, ruoli speciali).
Se qualcosa non esce da solo, il master con `?debug=1` può forzare il prossimo gioco, il prossimo
evento o dare un oggetto (barra verde in basso): usatela tra una partita e l'altra, non a sorpresa.

Prima della serata
1. Push su GitHub Pages; sul master Ctrl+F5 per caricare la versione nuova. Sui telefoni che erano
   già entrati, ricaricare la pagina.
2. Stessa rete Wi-Fi, risparmio energetico spento, qualche oggetto per le prove fisiche
   (bicchieri di plastica, monete, un mazzo di carte, una cintura).
3. Sala d'attesa: aprite **Impostazioni partita** prima che arrivino i giocatori. Controllate che
   il riepilogo sotto l'elenco non mostri mai il numero di Traditori. Per la partita grande:
   Veggente, Cavaliere e Traditore Segreto su "Sì", eventi tutti accesi.

Giorno 1
4. **Carta del ruolo**: Veggente, Cavaliere e Traditore Segreto vedono nome e potere; il Traditore
   Segreto vede i complici, i Traditori non vedono lui. Il Cavaliere ha "Oggetti (1)" in alto.
5. Dopo la prima Colazione partono le **presentazioni** (ritratto, nome e tema; "Prossimo" del master).
6. **3 giochi** (o quanti scelti): "gioco 1 di 3", tabellone solo dopo l'ultimo; a gioco chiuso le
   **tracce** sulla TV. Dopo un gioco riuscito la TV dice "un oggetto in segreto a uno di voi": solo
   un telefono mostra quale.
7. Giochi nuovi da vedere almeno una volta: **Codice della Cripta** (il Traditore vede "frammento
   FALSO"; codici con i nomi alla fine), **Ponte** (due giocatori, scelte svelate alla fine),
   **Asta** (offerte segrete, si vede solo il prezzo), **Lettera** (scelta pubblica, oggetto segreto).
8. Sul **tabellone**, chi ha una Maledizione la lancia: la TV annuncia il maledetto, non chi l'ha
   lanciata. Alla **Tavola Rotonda** il maledetto non vota, a meno che usi un **Sigillo** (si vede).
9. **Tavola Rotonda**: clessidra da 5 minuti (10 con 10+ giocatori). Chi ha il **Pugnale** lo usa
   prima di votare: alla rivelazione compare "×2" accanto al suo voto. Dopo il voto chi ha lo
   **Specchio** lo usa e vede solo lui chi l'ha votato.
10. A metà discussione ricaricate il master e premete "Riprendi stanza": la clessidra riparte dal
    tempo che restava, non da capo.

Notti
11. Prima notte con un solo Traditore: "Assassinare / Sedurre" (offerta anonima, il sedotto accetta
    o rifiuta, nessun morto, esito solo al Traditore).
12. **Veggente**: "Usa la tua visione", poi il sospetto; la risposta resta sulla sua carta.
13. **Traditore Segreto**: vede chat e scelte dei Traditori; ad accordo raggiunto cambia la vittima o
    "Lascia la loro scelta" (la notte aspetta lui, una volta per partita).
14. **Scudo** (o Cavaliere colpito): alla Colazione "l'omicidio è fallito", senza nome.
15. **Ultimatum**: la notte dopo il bando del primo Traditore, i rimasti scelgono "Ultimatum" e lo
    stesso nome. Chi lo riceve vede l'avviso "se rifiuti la vittima sarai tu". Provate un sì e un no.

Eventi (dal giorno 2, annunciati alla Colazione)
16. **Nebbia**: alla Tavola Rotonda solo il conteggio dei voti, senza nomi.
17. **Doppia posta**: il gioco indicato vale il doppio ("Doppia posta" sul titolo); se fallisce il
    montepremi perde monete.
18. **Banchetto**: la notte nessuno muore; il giorno dopo due votazioni, la seconda senza discussione.
19. **Omicidio a vista**: il Traditore designato lo sa alla Colazione; dopo il primo gioco "La scena":
    tutti toccano un nome; la vittima si scopre al **tramonto**, dopo la Tavola Rotonda.

Finale
20. Con 5–7 giocatori la **Cerimonia** parte quando restano 3; oltre i 7 quando restano 4. Nelle
    **ultime maschere** i Leali prima, i Traditori per ultimi. A fine partita compaiono anche i
    ruoli speciali (Veggente, Cavaliere, Traditore Segreto).

Dopo la serata
21. Annotate: durata di ogni giornata, se 3 giochi sono troppi, giochi più e meno piaciuti, se le
    tracce svelano troppo, come sono andate Seduzione e Ultimatum, quali oggetti sono stati usati e
    quali mai, se gli eventi sono troppo frequenti (50% al giorno), se la Cripta con pochi giocatori
    è risolvibile, se l'Asta svuota troppo il montepremi, telefoni e browser usati.

## Checklist per la prima serata di prova (Fase 2) — svolta

Prima della serata
1. Push su GitHub Pages; apri il sito sul master (TV o PC collegato alla TV) e controlla che i
   titoli siano in gotico (se non lo sono, ricarica la pagina con Ctrl+F5).
2. Tutti sulla rete Wi-Fi principale (non "ospiti"); telefoni carichi, risparmio energetico spento.
3. Prepara per la Prova Fisica: qualche bicchiere di plastica, una moneta o un tappo.

Durante la partita (5–10 giocatori)
4. Ingresso dal QR, ritratti facoltativi, "Inizia la partita", ruoli con la carta da tenere premuta.
5. Dopo la Colazione parte la missione: le regole sullo schermo e "In palio 1.000 monete".
   Il master preme "Inizia la missione": compare la clessidra su TV e telefoni.
6. **Forziere**: solo il gruppo estratto vede Oro e Piombo, con conferma; gli altri vedono
   "Il gruppo sta scegliendo". Sullo schermo solo quanti Piombo, mai chi.
7. **Enigma**: le domande arrivano su tutti i telefoni; dopo ogni risposta la TV mostra la risposta
   giusta e quanti hanno scelto ogni opzione, poi passa da sola alla domanda dopo.
8. **Torce**: toccare quando compare la fiamma. Provate apposta un tocco anticipato
   ("Troppo presto!"). Annotate la media del gruppo: serve a tarare le soglie.
9. **Prova Fisica**: la prova sulla TV, il master preme "Fine della prova", poi tutti votano.
10. Dopo il risultato compare il **tabellone**; il pulsante "Tabellone" lo riapre quando serve.
11. Tavola Rotonda, Notte e Colazione come in Fase 1; il montepremi resta in alto su TV e telefoni.
12. A metà missione ricarica il master e premi "Riprendi stanza": stessa missione, timer da capo,
    telefoni che rientrano da soli.
13. Finale: Cerimonia delle Polveri, verdetto, montepremi diviso tra i vincitori sopravvissuti;
    ognuno vede la propria quota sul telefono.

Dopo la serata
14. Annota: durata della partita, missione più e meno divertente, se il Forziere con 1 solo
    Traditore è troppo facile, medie delle Torce, domande troppo facili o difficili, testi poco chiari,
    modelli di telefono e cosa non ha funzionato.

## Checklist di prova Fase 0 (telefoni veri) — superata

1. Master su PC/TV: apri il sito, "Nuova stanza". Compare QR e codice, stato "Castello aperto".
2. 3 telefoni sullo stesso Wi-Fi inquadrano il QR, inseriscono il nome: compaiono sul master.
3. Prova un nome già usato: messaggio "Nome già preso".
4. Da ogni telefono "Saluta il master": il nome si illumina sul master.
5. Ricarica un telefono: rientra da solo, stesso nome, nessun doppione sul master.
6. Blocca lo schermo di un telefono per 1 minuto, poi riaprilo: si ricollega da solo.
7. Ricarica il master, premi "Riprendi stanza": i telefoni rientrano da soli.
8. Spegni il Wi-Fi di un telefono: sul master diventa "disconnesso" entro ~20 s; riaccendi e rientra.
9. Lascia tutto acceso 15 minuti senza toccare: nessuno si scollega, gli schermi restano accesi.
10. (Facoltativo) Prova su una rete ospiti: deve comparire il messaggio sul Wi-Fi ospiti.
11. Annota modello di telefono, browser e cosa non ha funzionato.

## Checklist di prova Fase 1 (telefoni veri) — superata

1. Master su TV/PC: "Nuova stanza". Entrano 5–7 telefoni sullo stesso Wi-Fi.
2. Su almeno 2 telefoni (un iPhone e un Android) "Scatta il tuo ritratto": si apre la fotocamera
   frontale, il ritratto compare sul telefono e la miniatura nell'elenco del master.
3. "Inizia la partita". Su ogni telefono tieni premuta la carta: compare il ruolo; ai Traditori
   anche i complici. Rilasciando si copre. "Ho visto" si attiva solo dopo averla girata.
4. Colazione: la parete mostra tutti i quadri (foto o iniziali), testo "Il castello si sveglia".
5. Tavola Rotonda: votate tutti; serve la conferma e il master mostra i voti solo a votazione
   chiusa. Prova una parità per vedere il ballottaggio.
6. Rivelazione: il bandito vede "Sei stato bandito", il master mostra la fazione.
7. Notte: i Leali vedono "Di chi sospetti?", i Traditori "Chi colpire stanotte?" con la stessa
   griglia (complici disattivati). I Traditori si accordano in chat; a un Leale non arriva nulla.
   Alla Colazione master e telefoni annunciano il più sospettato, con l'etichetta sul suo quadro.
8. Colazione dopo l'omicidio: il quadro della vittima si incrina e si storce; la vittima vede
   "Stanotte sei stato assassinato" e diventa spettatore. Un bandito ha la X rossa e la fazione.
9. A metà partita ricarica il master e premi "Riprendi stanza": stessa fase, stessi ritratti,
   i telefoni rientrano da soli (circa 20–30 s).
10. Ricarica un telefono a metà notte o a metà voto: rientra nello stesso punto.
11. (Se capita) Banditi tutti i Traditori con più di 4 in gioco: la notte dopo un Leale riceve
    "Il castello ti ha scelto", nessun omicidio, e dalla notte dopo uccide.
12. Con 4 rimasti parte la Cerimonia delle Polveri: quando tutti hanno scelto, lo schermo mostra
    l'attesa e poi ogni giocatore con ritratto, nome e fiamme verdi o rosse; "Al voto" o "Le ultime
    maschere" compare solo alla fine. Prova almeno un "Bandire ancora", poi rivelazioni una alla
    volta, verdetto finale e "Hai vinto / Hai perso" sui telefoni.
12b. Sala d'attesa: chiudi la pagina su un telefono, aspetta che risulti "disconnesso" e premi
    "Rimuovi" sul master.
12c. iPhone: scatta il ritratto. Deve comparire "Il tuo ritratto è appeso nel castello" e il
    telefono deve restare collegato.
13. Annota modello di telefono, browser e tutto ciò che non ha funzionato o non era chiaro.
