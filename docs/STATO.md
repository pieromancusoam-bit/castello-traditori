# Stato del progetto

Aggiornato da Claude Code alla fine di ogni sessione di lavoro.

## Fase corrente

**Fase 1 — Scheletro del gioco**: codice completato e provato in locale il 2026-11-21.
Manca la prova con 5+ telefoni veri (checklist in fondo).

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
- Test: 63 (`npm test`). Il test obbligatorio gioca 150 partite casuali da 5 a 16 giocatori e
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

## Fase 1 — attività

- [x] Motore puro con test: ruoli, voti, parità, ballottaggio, notte, castello, finale
- [x] `viewFor` / `viewForMaster` con allow-list e test obbligatorio
- [x] Cerimonia delle Polveri (anticipata dalla Fase 2, su richiesta)
- [x] Salvataggio automatico e ripresa della partita (anticipato dalla Fase 2, su richiesta)
- [x] Ritratti e parete della Colazione (aggiunta su richiesta)
- [x] Schermate di testo master e telefono
- [x] Prova in locale con 5 schede
- [ ] Push su GitHub Pages e partita intera con 5+ telefoni veri

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

## Decisioni aperte

- Nome definitivo del gioco (provvisorio: Il Castello dei Traditori)
- Ruoli speciali da includere nella prima versione
- Montepremi "per la gloria" o con premio reale

## Problemi noti

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

## Checklist di prova Fase 1 (telefoni veri, dopo il push)

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
12. Con 4 rimasti parte la Cerimonia delle Polveri: prova almeno un "Bandire ancora", poi
    rivelazioni una alla volta, verdetto finale e "Hai vinto / Hai perso" sui telefoni.
13. Annota modello di telefono, browser e tutto ciò che non ha funzionato o non era chiaro.
