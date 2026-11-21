# Stato del progetto

Aggiornato da Claude Code alla fine di ogni sessione di lavoro.

## Fase corrente

**Fase 2 — MVP giocabile**: codice completo e provato in locale il 2026-11-21; manca la prima serata di gioco vera con il gruppo.

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

## Fase 2 — attività

- [x] Montepremi e valori in configurazione
- [x] Interfaccia comune delle missioni e timer
- [x] Il Forziere, L'Enigma del Castello, Le Torce, La Prova Fisica (con test)
- [x] Tabellone sul master
- [x] Finale con Cerimonia delle Polveri e divisione del montepremi
- [x] Salvataggio automatico anche delle missioni
- [x] Prima grafica a tema (palette scura, font gotico per i titoli)
- [x] Prova in locale con 5 schede
- [ ] Push su GitHub Pages e prima serata di gioco vera con il gruppo

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

## Decisioni aperte

- Nome definitivo del gioco (provvisorio: Il Castello dei Traditori)
- Ruoli speciali da includere nella prima versione
- Montepremi "per la gloria" o con premio reale

## Problemi noti

- Fase 2: dopo un "Riprendi" a metà missione il timer in corso riparte da capo.
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

## Checklist per la prima serata di prova (Fase 2)

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
