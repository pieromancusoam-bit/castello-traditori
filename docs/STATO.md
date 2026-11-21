# Stato del progetto

Aggiornato da Claude Code alla fine di ogni sessione di lavoro.

## Fase corrente

**Fase 0 — Prototipo di connessione** (non iniziata)

## Fatto

- Progetto di gioco (`PROGETTO.md`) e architettura (`ARCHITETTURA.md`) definiti.

## Da fare nella fase corrente

- [ ] Struttura cartelle e `index.html` con instradamento master/giocatore
- [ ] Librerie in `/vendor/` (PeerJS, QR) con versione fissata
- [ ] Master: crea stanza, mostra codice e QR, elenca i telefoni collegati
- [ ] Telefono: entra dal QR, inserisce nome, appare sul master
- [ ] Battito ping/pong e stato "disconnesso" sul master
- [ ] Riconnessione con token dopo ricarica (telefono) e "Riprendi" (master)
- [ ] Wake Lock su master e telefoni
- [ ] Messaggio d'errore chiaro se la connessione non parte
- [ ] Pubblicazione su GitHub Pages e prova con 3 telefoni veri

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

Nessuno.
