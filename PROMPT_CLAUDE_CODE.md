# Come partire con Claude Code

## Preparazione (una volta sola)

1. **Crea un repository su GitHub**, per esempio `castello-traditori`.
   Rendilo **pubblico**: con l'account gratuito GitHub Pages funziona sui repository pubblici.
2. **Copia in questo repository** i file preparati:
   ```
   CLAUDE.md
   PROMPT_CLAUDE_CODE.md
   docs/PROGETTO.md
   docs/ARCHITETTURA.md
   docs/STATO.md
   ```
   `CLAUDE.md` va nella radice: Claude Code lo legge automaticamente a ogni sessione.
3. **Apri Claude Code** sul repository: dal terminale nella cartella clonata, oppure da
   Claude Code sul web/desktop collegando il repository GitHub.
4. **Incolla il Prompt 1** qui sotto.
5. Dopo il primo push, su GitHub: *Settings → Pages → Build and deployment →
   Deploy from a branch → `main` / `(root)`*. Dopo circa un minuto il gioco è online su
   `https://<tuo-utente>.github.io/castello-traditori/`.

Suggerimento: una sessione di Claude Code per fase. Quando una fase è chiusa e
`docs/STATO.md` è aggiornato, apri una sessione nuova per la fase successiva.

---

## Prompt 1 — Avvio e Fase 0 (prototipo di connessione)

```
Ciao! Questo repository contiene il progetto di una web app di gioco in stile The Traitors.
Leggi CLAUDE.md, docs/PROGETTO.md, docs/ARCHITETTURA.md e docs/STATO.md.

Poi:
1. Riassumimi in 5-6 righe cosa hai capito del progetto e dei vincoli, e segnalami
   eventuali punti ambigui o contraddizioni tra i documenti.
2. Proponimi il piano per la FASE 0 (prototipo di connessione), come descritto in
   docs/STATO.md: file da creare, librerie da scaricare in /vendor con la versione che
   scegli, ordine dei passi. Aspetta il mio ok prima di scrivere codice.

Obiettivo della Fase 0: un master che crea una stanza con codice e QR, telefoni che entrano
inquadrando il QR e inserendo il nome, elenco live dei collegati sul master, ping/pong con
stato "disconnesso", riconnessione automatica dopo ricarica (sia del telefono sia del
master con "Riprendi"), Wake Lock, messaggi d'errore chiari se la connessione fallisce.
Grafica minima ma già scura e leggibile: il gioco vero arriva in Fase 1.

Criterio di completamento: 3 telefoni veri restano collegati al master per 15 minuti e
rientrano da soli dopo un ricaricamento della pagina.
```

## Prompt 2 — Fase 1 (scheletro del gioco)

```
Leggi docs/STATO.md e verifica che la Fase 0 sia chiusa. Poi proponimi il piano per la
FASE 1 di docs/PROGETTO.md: motore puro in js/engine/ con test node --test, viewFor con
allow-list, fasi Sala d'attesa → Ruoli → Colazione → Tavola Rotonda (voto, parità,
ballottaggio) → Rivelazione → Notte (omicidio dei Traditori, chat dei Traditori) →
condizioni di vittoria. Schermate semplici, solo testo.
Includi il test obbligatorio: nessuna vista di un Leale contiene ruoli altrui.
Aspetta il mio ok prima di scrivere codice.
```

## Prompt 3 — Fase 2 (MVP giocabile)

```
Leggi docs/STATO.md. Proponimi il piano per la FASE 2: montepremi, interfaccia comune per
le missioni in js/engine/missions/, le prime 4 missioni (Il Forziere, L'Enigma del
Castello, Le Torce, La Prova Fisica), tabellone sul master, finale con Cerimonia delle
Polveri, salvataggio automatico a ogni fase, prima grafica a tema (palette scura,
font gotico per i titoli). Alla fine dammi una checklist per la prima serata di prova.
Aspetta il mio ok prima di scrivere codice.
```

## Prompt 4 — Fase 3 (profondità)

```
Leggi CLAUDE.md, docs/STATO.md (soprattutto la Fase 2b: decisioni prese e problemi noti)
e docs/PROGETTO.md. La seconda serata di prova si farà solo a sviluppo completato: in questa
fase non ci fermiamo per provare con il gruppo, ma ogni parte va provata con i test e in
locale (master con ?debug=1 e più schede).

Proponimi il piano per la FASE 3 (profondità), a blocchi, un commit per funzione:
1. Oggetti: Scudo, Pugnale, Maledizione, Specchio, Sigillo, con inventario sul telefono.
   Nessun oggetto né il suo uso deve arrivare agli altri telefoni oltre a quanto prevede
   PROGETTO.md.
2. Ruoli speciali attivabili: Traditore Segreto, Veggente, Cavaliere. Devono convivere
   con la Seduzione della prima notte e con il nuovo Traditore scelto dal castello.
3. Ultimatum di reclutamento (al bando del primo Traditore): spiegami come convive con
   la Seduzione prima di scriverlo.
4. Eventi: Omicidio a vista, Banchetto, Nebbia, Doppia posta (al massimo uno ogni due
   giorni, attivabili dalle impostazioni).
5. Le 4 missioni che restano nel catalogo: Il Codice della Cripta, Il Ponte, L'Asta,
   La Lettera Sigillata (ora esistono gli oggetti), con le tracce del sabotaggio a gioco
   chiuso come le altre.
6. Schermata Impostazioni partita sul master, prima di "Inizia la partita": numero di
   Traditori, ruoli speciali, eventi sì/no, giochi al giorno, durata della discussione,
   presentazioni sì/no, Seduzione sì/no, soglia della Cerimonia, durata dei timer.
   I valori di partenza restano quelli di js/config/.
7. I problemi noti di STATO.md che si possono chiudere ora (per esempio la Catena della
   Memoria mai uscita in partita, i timer che ripartono da capo dopo "Riprendi").

Ogni oggetto, ruolo, evento e missione ha i suoi test; le partite casuali del test
obbligatorio sui segreti devono tenerli tutti accesi.
Se una regola di PROGETTO.md è ambigua, raccogli tutte le domande all'inizio e chiedimele
insieme. Aspetta il mio ok prima di scrivere codice. Alla fine aggiorna STATO.md e la
checklist della seconda serata, che proverà insieme Fase 2b e Fase 3.
```

## Prompt 5 — Fase 4 (spettacolo)

```
Leggi docs/STATO.md. Proponimi il piano per la FASE 4: narratore con sintesi vocale
italiana e 3-5 frasi alternative per ogni momento (in js/config/narrator-lines.js),
musica ambient e effetti con licenza libera (indicami fonte e licenza di ogni file),
animazioni e pause di suspense nelle rivelazioni, avatar araldici originali, vibrazioni.
Aspetta il mio ok prima di scrivere codice.
```

## Prompt 6 — Fase 5 (rifinitura)

```
Leggi docs/STATO.md e le note delle partite. Proponimi il piano per la FASE 5:
bilanciamento dei numeri in js/config/ in base ai risultati, regole consultabili nell'app,
PWA installabile (manifest + service worker), verifica su iPhone, Android e TV,
e la mia lista di bug aperti. Aspetta il mio ok prima di scrivere codice.
```

---

## Prompt utili in qualsiasi momento

**Segnalare un problema emerso giocando**
```
Durante la prova è successo questo: [descrizione]. Telefono/browser: [es. iPhone Safari].
Fase di gioco: [es. Tavola Rotonda, giorno 3]. Trova la causa, proponimi la correzione
e aggiungi un test che riproduca il problema.
```

**Controllo di sicurezza dei segreti**
```
Fai una revisione mirata: c'è qualche percorso (viste, messaggi, log, debug, localStorage
del telefono) in cui un telefono può ricevere informazioni che il suo giocatore non deve
conoscere? Elenca ciò che trovi prima di correggere.
```

**Modificare una regola**
```
Voglio cambiare questa regola: [descrizione]. Aggiorna prima docs/PROGETTO.md,
poi motore, configurazione e test. Dimmi quali altre regole ne sono influenzate.
```

**Chiusura sessione**
```
Aggiorna docs/STATO.md (fatto, da fare, decisioni prese, problemi noti), fai commit
e dammi la checklist di prova manuale per quanto fatto oggi.
```
