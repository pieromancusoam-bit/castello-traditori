# Il Castello dei Traditori — istruzioni per Claude Code

Web app gratuita per giocare dal vivo a un gioco di deduzione sociale in stile *The Traitors*.
Un dispositivo **master** (TV, tablet o PC) fa da narratore e da arbitro; da 5 a 16 giocatori
nella stessa stanza giocano dal proprio **telefono**, entrando con un QR code.

- Progetto di gioco completo: `docs/PROGETTO.md` (regole, ruoli, missioni, oggetti, schermate, fasi).
- Specifiche tecniche: `docs/ARCHITETTURA.md` (struttura cartelle, modello di stato, protocollo).
- Avanzamento: `docs/STATO.md` — aggiornalo alla fine di ogni sessione di lavoro.

Leggi questi tre file prima di iniziare qualsiasi attività.

## Lingua

- Parla con me in **italiano**.
- Tutto il testo visibile nell'app è in italiano.
- Codice (nomi di variabili, funzioni, file) in inglese; commenti in italiano, brevi.
- Messaggi di commit in italiano, all'imperativo ("Aggiungi sala d'attesa").

## Vincoli non negoziabili

1. **Costo zero.** Niente servizi a pagamento, niente database, niente backend da gestire.
   Hosting su GitHub Pages; connessioni con PeerJS (server cloud gratuito solo per l'aggancio).
2. **Nessuna compilazione.** HTML, CSS e JavaScript moderni con moduli ES nativi
   (`<script type="module">`). Niente npm per l'app, niente bundler, niente framework.
   Le librerie esterne (PeerJS, generatore QR) vanno **scaricate in `/vendor/` con versione fissata**,
   non caricate da CDN a runtime. npm/Node si usa solo per i test in locale.
3. **Il master è l'unica fonte di verità.** Lo stato completo della partita esiste solo sul master.
   I telefoni ricevono **solo la propria vista filtrata** (`viewFor(state, playerId)`) e inviano
   **solo azioni**. Un telefono non deve mai ricevere un dato che il suo giocatore non può conoscere
   (ruoli altrui, voti individuali, scelte segrete). Questo vale anche per i messaggi di debug.
4. **Motore di gioco puro.** Tutto ciò che sta in `js/engine/` è privo di DOM, rete, timer reali
   e `Math.random` diretto: riceve stato + azione (+ generatore casuale con seed) e restituisce
   nuovo stato + effetti. Così è testabile con `node --test`.
5. **Numeri in configurazione.** Soglie, valori delle missioni, durate dei timer, numero di
   Traditori per numero di giocatori: tutto in `js/config/`, mai sparso nel codice.
6. **Stessa stanza, stesso Wi-Fi.** Il gioco a distanza è fuori dal progetto base.

## Come lavoriamo

- Si procede **una fase alla volta** (vedi `docs/PROGETTO.md`, sezione "Fasi di sviluppo").
  Non anticipare funzioni delle fasi successive se non te lo chiedo.
- All'inizio di una fase: proponimi un piano breve (file da creare/modificare, passi) e aspetta l'ok.
- Commit piccoli e frequenti, uno per funzione completata. Pusha solo quando te lo chiedo.
- Alla fine di una fase: aggiorna `docs/STATO.md` (fatto, da fare, problemi noti, decisioni prese)
  e dammi una checklist di prova manuale da fare con i telefoni veri.
- Se una regola di gioco in `docs/PROGETTO.md` è ambigua o incompleta, **chiedimi** prima di inventare.
  Se prendi una decisione minore da solo, annotala in `docs/STATO.md`.

## Test

- Motore: `node --test tests/` (test runner integrato di Node, nessuna dipendenza).
  Ogni regola nuova ha almeno un test. Test obbligatorio e permanente: nessuna `viewFor` di un
  Leale contiene il ruolo di un altro giocatore.
- Interfaccia in locale: `npx serve .` (o `python3 -m http.server`) e più schede del browser.
  Per simulare più giocatori sullo stesso browser, l'URL del giocatore accetta `&debug=nuovo`
  per forzare una nuova identità.
- Telefoni veri: alcune API (Wake Lock, vibrazione, a volte la sintesi vocale) richiedono HTTPS,
  quindi i test sui telefoni si fanno sulla versione pubblicata su GitHub Pages, non su
  `http://192.168.x.x`.

## Accorgimenti tecnici noti

- PeerJS Cloud è condiviso con altri utenti: gli ID dei peer vanno prefissati
  (es. `castello-traditori-<CODICE>`) per evitare collisioni.
- Il server cloud non offre TURN: sulla stessa rete Wi-Fi non serve, ma reti "ospiti" con
  isolamento tra dispositivi bloccano la connessione. Mostra un messaggio d'errore chiaro.
- Prevedi un'impostazione per usare un PeerServer personale (host/porta/percorso) come piano B.
- I telefoni vanno in sospensione: usa la Wake Lock API e gestisci sempre la riconnessione
  (token del giocatore salvato nel browser, il master lo riassocia al posto giusto).
- iPhone/Safari: testa audio e sintesi vocale solo dopo un'interazione dell'utente (tocco).

## Stile dell'interfaccia

- Master: pensato per TV orizzontale vista a 3 metri — testi grandi, poco testo per schermata.
- Telefono: verticale, una mano, pulsanti grandi, conferma per voto e sabotaggio.
- Palette scura (pietra, velluto rosso, oro). Titoli con un font gotico gratuito, testo leggibile.
- Nessun personaggio, logo o materiale del programma TV reale: tutto originale.
