# Stato del progetto

Aggiornato da Claude Code alla fine di ogni sessione di lavoro.

## Fase corrente

**Fase 0 — Prototipo di connessione** (codice completo, manca la prova con 3 telefoni veri)

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

## Da fare nella fase corrente

- [x] Struttura cartelle e `index.html` con instradamento master/giocatore
- [x] Librerie in `/vendor/` (PeerJS, QR) con versione fissata
- [x] Master: crea stanza, mostra codice e QR, elenca i telefoni collegati
- [x] Telefono: entra dal QR, inserisce nome, appare sul master
- [x] Battito ping/pong e stato "disconnesso" sul master
- [x] Riconnessione con token dopo ricarica (telefono) e "Riprendi" (master)
- [x] Wake Lock su master e telefoni
- [x] Messaggio d'errore chiaro se la connessione non parte
- [ ] Push su GitHub Pages e prova con 3 telefoni veri per 15 minuti (vedi checklist sotto)

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

## Decisioni aperte

- Come continuare se tutti i Traditori sono banditi con più di 4 giocatori in gioco (da decidere prima della Fase 1)
- Nome definitivo del gioco (provvisorio: Il Castello dei Traditori)
- Ruoli speciali da includere nella prima versione
- Montepremi "per la gloria" o con premio reale

## Problemi noti

- Wake Lock: nel browser integrato di prova risulta "non attivo"; va verificato sui telefoni veri
  (richiede https, quindi solo dalla versione su GitHub Pages).
- Dopo la ricarica del master i telefoni rientrano in circa 20 s (attese tra i tentativi + tempo
  di PeerJS per riassegnare l'ID). Accettabile; se dà fastidio si accorciano le attese in `js/config/net-config.js`.
- Un telefono chiuso di colpo risulta "disconnesso" solo dopo 3 battiti persi (circa 15-20 s):
  WebRTC non sempre avvisa subito della chiusura.
- Piano B: da GitHub Pages (https) il server di aggancio personale deve essere raggiungibile in
  https/wss. Un PeerServer su un PC di casa in semplice http non funziona senza un certificato.

## Checklist di prova Fase 0 (telefoni veri)

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
