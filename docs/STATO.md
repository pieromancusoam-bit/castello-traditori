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

## Decisioni aperte

- Nome definitivo del gioco (provvisorio: Il Castello dei Traditori)
- Ruoli speciali da includere nella prima versione
- Montepremi "per la gloria" o con premio reale

## Problemi noti

Nessuno.
