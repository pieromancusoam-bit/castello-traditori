// Frasi del narratore: per ogni momento 4–5 varianti (scelte a caso, mai la stessa due volte di fila).
// `first`: la prima volta nella partita il narratore spiega la regola; poi usa `lines`.
// Variabili tra graffe, solo informazioni pubbliche: {name}, {names}, {coins}, {title}, {theme}…
// Testi originali; si possono correggere liberamente.

const L = (lines, first) => Object.freeze(first ? { first: Object.freeze(first), lines: Object.freeze(lines) } : { lines: Object.freeze(lines) });

export const NARRATOR_LINES = Object.freeze({
  // ---------------- Ruoli ----------------
  roles: L([
    'Il castello ha deciso chi siete. Guardate il telefono e tenete premuto per scoprirlo. Nessuno vi veda.',
    'Le carte sono distribuite. Tenete premuto sul telefono per girare la vostra. Poi nascondetela, e mentite bene.',
    'Benvenuti al castello. Tra voi si nascondono i Traditori. Tenete premuto sul telefono: scoprirete da che parte state.',
    'Ognuno di voi ha ricevuto un destino. Leale o Traditore? Tenete premuto sul telefono, in silenzio.',
  ]),

  // ---------------- Colazione ----------------
  'breakfast.first': L([
    'Il castello si sveglia. Siete tutti qui, per ora. Guardatevi bene: qualcuno a questo tavolo vi tradirà.',
    'Prima colazione al castello. Sorrisi, caffè, strette di mano… e almeno un Traditore tra voi.',
    'Buongiorno, ospiti. Oggi siete tutti vivi. Godetevi questa colazione: potrebbe essere l\'ultima così affollata.',
    'Il sole entra dalle finestre del castello. Nessuno manca, oggi. Ma i Traditori vi stanno già osservando.',
  ]),
  'breakfast.victim': L([
    'Stanotte i Traditori hanno colpito. {name} non scenderà più a colazione.',
    'Una sedia resta vuota. {name} è stato assassinato nella notte.',
    'Il ritratto di {name} si è incrinato. I Traditori hanno scelto la loro vittima.',
    'Brutte notizie dal castello. {name} non si è svegliato. Qualcuno, a questo tavolo, sa perché.',
    'I corridoi hanno sussurrato tutta la notte. Stamattina {name} non c\'è più.',
  ]),
  'breakfast.failed': L([
    'Stanotte i Traditori hanno colpito… ma qualcuno era protetto da uno Scudo. L\'omicidio è fallito.',
    'Un pugnale nel buio, e poi il rumore del metallo. Uno Scudo ha salvato una vita, stanotte.',
    'I Traditori sono rimasti a mani vuote. Uno Scudo ha fermato la loro lama.',
    'Siete tutti qui. Non perché i Traditori abbiano avuto pietà: uno Scudo li ha fermati.',
  ]),
  'breakfast.none': L([
    'Stanotte nessuno è stato assassinato. Il castello trattiene il fiato.',
    'Siete ancora tutti qui. Strano. Molto strano.',
    'Una notte senza sangue. Non abituatevi.',
    'Nessuna vittima, stanotte. I Traditori hanno altri piani… oppure aspettano.',
  ]),
  'breakfast.suspects': L([
    'Il castello sospetta di {names}.',
    'Stanotte molti sguardi si sono posati su {names}.',
    'Nel buio, le dita hanno indicato {names}.',
    'I sospetti della notte cadono su {names}.',
  ]),
  event: L([
    'Il castello annuncia un evento: {name}. {text}',
    'Oggi il castello cambia le regole. {name}: {text}',
    'Ascoltate bene. Oggi c\'è {name}. {text}',
    'Un evento scuote il castello: {name}. {text}',
  ]),
  'event.double': L([
    'Tocca al gioco numero {slot} di oggi.',
    'Sarà il gioco numero {slot}. Non sbagliatelo.',
    'Fate attenzione al gioco numero {slot}.',
    'Il gioco che vale doppio è il numero {slot}.',
  ]),

  // ---------------- Presentazioni ----------------
  'presentations.start': L([
    'Prima di cominciare, presentatevi. Uno alla volta, ognuno con un tema diverso. Avete quarantacinque secondi.',
    'Il castello vuole conoscervi. Uno alla volta vi presenterete, seguendo il tema che vedete sullo schermo.',
    'È il momento delle presentazioni. Ascoltate bene: chi mente, spesso, parla troppo.',
    'Ognuno di voi si presenterà al castello, con un tema a sorpresa. Quarantacinque secondi a testa.',
  ]),
  'presentations.turn': L([
    'Tocca a {name}. {theme}.',
    '{name}, il castello ti ascolta. {theme}.',
    'Ora {name}. {theme}.',
    'Avanti, {name}. {theme}.',
  ]),

  // ---------------- Giochi ----------------
  'mission.intro': L([
    'Gioco {slot} di {perDay}: {title}.',
    'Il prossimo gioco è {title}.',
    'Preparatevi. Arriva {title}.',
    'Ecco il gioco numero {slot}: {title}.',
    'Il castello vi mette alla prova con {title}.',
  ]),
  'mission.double': L([
    'Attenzione: questo gioco vale il doppio. Ma se fallisce, il montepremi perde monete.',
    'Doppia posta: si vince il doppio, o si perde davvero.',
    'Questo è il gioco della doppia posta. Il doppio delle monete, e un rischio vero.',
    'Oggi questo gioco pesa il doppio. Nel bene e nel male.',
  ]),
  'mission.rules': L(['{rules}']),
  'mission.chosen': L([
    'Il castello sceglie {names}.',
    'Tocca a {names}.',
    'Sono stati scelti {names}.',
    'Il destino indica {names}.',
  ]),
  'mission.stake': L([
    'In palio ci sono {coins} monete.',
    'Vale {coins} monete per il montepremi.',
    'Sul tavolo: {coins} monete.',
    'Il premio è di {coins} monete. Se i Traditori ve lo lasciano.',
  ]),
  'mission.stake.auction': L([
    'All\'asta c\'è uno Scudo. Le offerte si pagano con il montepremi.',
    'Il castello mette all\'asta uno Scudo. Quanto vale la vostra vita?',
    'Uno Scudo, al miglior offerente. Le monete escono dal montepremi di tutti.',
    'Si vende uno Scudo. Offerte segrete, prezzo pagato da tutti.',
  ]),
  'mission.play': L([
    'Che il gioco cominci.',
    'Il tempo corre.',
    'Al lavoro. E occhio ai sabotatori.',
    'Si comincia. Guardate il telefono.',
    'Via!',
  ]),
  'mission.success': L([
    'Gioco riuscito! {coins} monete entrano nel montepremi.',
    'Ben fatto. Il montepremi cresce di {coins} monete.',
    'Il castello è soddisfatto: {coins} monete per voi.',
    'Ce l\'avete fatta. {coins} monete. Ma qualcuno, forse, ha giocato contro.',
  ]),
  'mission.partial': L([
    'Solo in parte. Il montepremi guadagna {coins} monete.',
    'Poteva andare meglio: {coins} monete.',
    'Qualcosa è andato storto. Entrano solo {coins} monete.',
    'Un mezzo successo: {coins} monete. Chi ha sbagliato… apposta?',
  ]),
  'mission.fail': L([
    'Gioco fallito. Nessuna moneta. I Traditori sorridono.',
    'Niente. Il montepremi resta com\'era. Chiedetevi perché.',
    'Il gioco è perduto. Qualcuno, tra voi, ne è felice.',
    'Fallito. E i fallimenti, al castello, non sono mai un caso.',
  ]),
  'mission.doubleLoss': L([
    'Doppia posta perduta: il montepremi perde {coins} monete.',
    'Il rischio non ha pagato. Escono {coins} monete dal montepremi.',
    'Fallito, e con la doppia posta. Meno {coins} monete.',
    'Il castello si riprende {coins} monete. Qualcuno ha giocato contro.',
  ]),
  'mission.gift': L([
    'Un oggetto è stato consegnato in segreto a uno di voi. Solo il suo telefono lo sa.',
    'Il castello ha lasciato un dono a qualcuno. In segreto.',
    'Qualcuno di voi ha appena ricevuto un oggetto. Non lo dirà, se è furbo.',
    'Un premio segreto per uno di voi. Guardate i vostri telefoni, senza farvi notare.',
  ]),
  board: L([
    'Il montepremi è di {coins} monete. E adesso, la Tavola Rotonda.',
    'Nel forziere del castello ci sono {coins} monete. È ora di decidere chi se le merita.',
    'Il montepremi sale a {coins} monete. Ora, i sospetti.',
    '{coins} monete in palio. Andiamo alla Tavola Rotonda.',
  ]),
  curse: L([
    '{name} è stato maledetto: alla Tavola Rotonda non voterà.',
    'Una Maledizione cade su {name}. Oggi resterà in silenzio, al voto.',
    'Qualcuno ha maledetto {name}. Non saprete mai chi.',
    '{name} non voterà oggi. Una Maledizione lo ha colpito.',
  ]),
  sealed: L([
    '{name} ha spezzato la Maledizione con il Sigillo.',
    'Un Sigillo libera {name}. Voterà, dopo tutto.',
    '{name} rompe la Maledizione.',
    'La Maledizione su {name} è spezzata.',
  ]),

  // ---------------- Tavola Rotonda ----------------
  'roundtable.discussion': L([
    'Alla Tavola Rotonda. Discutete. Quando la clessidra sarà vuota, si vota.',
    'Sedetevi. Parlate, accusate, difendetevi. La clessidra scorre.',
    'Il tavolo è pronto. Chi sono i Traditori? Avete fino alla fine della clessidra.',
    'È il momento dei sospetti. Parlate ora: dopo, si vota.',
  ], [
    'Benvenuti alla Tavola Rotonda. Qui si discute: chi sono i Traditori? Quando la clessidra sarà vuota, ognuno voterà dal telefono chi bandire dal castello.',
  ]),
  'roundtable.voting': L([
    'Il tempo delle parole è finito. Votate.',
    'Si vota. Sul telefono, chi volete bandire.',
    'Ora votate. E ricordate: il voto si vedrà.',
    'Basta parlare. Scegliete.',
    'Il castello aspetta il vostro voto.',
  ], [
    'È il momento di votare. Sul telefono scegliete chi bandire, poi confermate. Il voto non si cambia, e alla fine tutti vedranno chi ha votato chi.',
  ]),
  'roundtable.second': L([
    'Dopo il Banchetto, una seconda votazione. Senza discussione.',
    'Ancora un voto. Il Banchetto ha un prezzo.',
    'Seconda votazione. Subito.',
    'Il Banchetto chiede un altro nome. Votate di nuovo.',
  ]),
  'roundtable.fog': L([
    'C\'è la nebbia: vedrete solo quanti voti ha ricevuto ciascuno, non chi li ha dati.',
    'La nebbia copre il tavolo. I voti resteranno senza nome.',
    'Nella nebbia nessuno saprà chi ha votato chi.',
    'Oggi la nebbia nasconde i votanti. Solo i numeri.',
  ]),
  'roundtable.runoff': L([
    'Ballottaggio tra {names}. Votate ancora.',
    'Parità. Si sceglie di nuovo, tra {names}.',
    'Il castello non ha deciso. Ballottaggio tra {names}.',
    'Ancora un voto: {names}.',
  ]),
  'votes.banish': L([
    '{name} lascia il castello.',
    'Il castello ha deciso: {name} viene bandito.',
    'Per {name} la partita finisce qui.',
    'Avete scelto {name}. Ma era la scelta giusta?',
    '{name}, il castello ti chiede di andartene.',
  ]),
  'votes.runoff': L([
    'Parità tra {names}. Si va al ballottaggio.',
    'Pari. {names} si giocano tutto.',
    'Il voto è spaccato: {names}. Ballottaggio.',
    'Nessuna maggioranza tra {names}. Si vota ancora.',
  ]),
  'votes.tie': L([
    'Ancora parità. Oggi nessuno lascia il castello.',
    'Il tavolo resta diviso. Nessun bando, oggi.',
    'Pari anche questa volta. I Traditori ringraziano.',
    'Nessuna decisione. Tutti restano, per ora.',
  ]),
  'votes.none': L([
    'Nessun voto. Oggi nessuno lascia il castello.',
    'Il silenzio ha vinto. Nessun bando.',
    'Nessuno ha votato. I Traditori dormiranno tranquilli.',
    'Oggi nessun nome. Il castello è deluso.',
  ]),
  'reveal.traitor': L([
    '{name}… era un Traditore.',
    'Avevate ragione. {name} era un Traditore.',
    'Un Traditore in meno. {name} è stato smascherato.',
    'La maschera cade: {name} era un Traditore.',
    'Colpito. {name} era un Traditore.',
  ]),
  'reveal.faithful': L([
    '{name}… era un Leale.',
    'Avete sbagliato. {name} era un Leale.',
    'Un innocente lascia il castello. {name} era Leale.',
    '{name} era Leale. I Traditori brindano, stasera.',
    'No. {name} era dalla vostra parte.',
  ]),

  // ---------------- Omicidio a vista e tramonto ----------------
  scene: L([
    'La scena. Toccate un nome sul telefono.',
    'Ancora la scena. Ognuno tocchi un nome.',
    'Toccate un nome. Uno di quei tocchi uccide.',
    'Tutti sul telefono. Un nome a testa.',
  ], [
    'Omicidio a vista. Ognuno tocchi un nome sul telefono. Solo uno di quei tocchi uccide, e lo scoprirete al tramonto.',
  ]),
  'scene.read': L(['{scene}']),
  'dusk.murdered': L([
    'Al tramonto il castello scopre il delitto. {name} è stato ucciso alla luce del giorno.',
    'Il sole cala, e con lui {name}. Assassinato in pieno giorno.',
    'Il pugnale ha trovato {name}, mentre tutti guardavano.',
    'Tramonto di sangue: {name} non c\'è più.',
  ]),
  'dusk.gone': L([
    'Il pugnale cerca la sua vittima… ma ha già lasciato il castello.',
    'Troppo tardi: la vittima scelta non è più qui.',
    'Il colpo cade nel vuoto. La vittima se n\'era già andata.',
    'Al tramonto nessuno cade: la vittima era già fuori dal castello.',
  ]),
  'dusk.none': L([
    'Al tramonto nessuno è caduto. Il Traditore non ha colpito.',
    'Il sole cala in pace. Nessun delitto, oggi.',
    'Il pugnale è rimasto nel fodero.',
    'Nessuna vittima al tramonto.',
  ]),

  // ---------------- Notte ----------------
  night: L([
    'Cala la notte. Chiudete gli occhi. Tutti toccano il telefono.',
    'Il castello si addormenta. Ognuno faccia la sua scelta, in silenzio.',
    'Notte. I Traditori si incontrano nell\'ombra. Tutti al telefono.',
    'Le candele si spengono. Toccate il vostro telefono, senza farvi vedere.',
    'È buio. Qualcuno, stanotte, non dormirà.',
  ], [
    'Cala la notte. Tutti toccano il telefono, così nessuno si tradisce. I Leali indicano chi sospettano; i Traditori scelgono la loro vittima.',
  ]),
  'night.banquet': L([
    'Stanotte c\'è il Banchetto: nessuno morirà.',
    'Il Banchetto protegge tutti, stanotte.',
    'Una notte di festa. Nessuna lama.',
    'Mangiate tranquilli: stanotte nessuno muore.',
  ]),
  'night.daylight': L([
    'Il sangue è già stato versato oggi. Stanotte nessuno morirà.',
    'Basta delitti, per oggi. La notte sarà quieta.',
    'Dopo l\'omicidio di giorno, la notte riposa.',
    'Stanotte il pugnale resta nel fodero.',
  ]),

  // ---------------- Finale ----------------
  'final.choice': L([
    'Cerimonia delle Polveri. Scegliete: chiudere la partita o bandire ancora.',
    'Ancora una volta, le polveri. Chiudere o bandire?',
    'Fidarvi o no? Scegliete in segreto.',
    'Le polveri attendono. Chiudere, o bandire ancora?',
  ], [
    'È il momento della Cerimonia delle Polveri. Ognuno sceglie in segreto: chiudere la partita, o bandire ancora. Se anche uno solo vuole bandire, si vota di nuovo.',
  ]),
  'final.reveal': L([
    'Le polveri si accendono. Vediamo cosa avete scelto.',
    'Il fuoco dirà la verità. Uno alla volta.',
    'Fiamme verdi per chi chiude, rosse per chi vuole bandire.',
    'Guardate le fiamme.',
  ]),
  'final.voting': L([
    'Qualcuno vuole bandire ancora. Votate.',
    'Si vota di nuovo. Chi deve lasciare il castello?',
    'Un altro voto. L\'ultimo, forse.',
    'Ancora un nome. Votate.',
  ]),
  'final.unveil': L([
    'Le ultime maschere. È il momento della verità.',
    'Siete arrivati alla fine. Ora si scopre chi siete davvero.',
    'Le maschere cadono, una alla volta.',
    'È finita. Vediamo chi ha mentito.',
  ]),
  'unveil.traitor': L([
    '{name}… era un Traditore.',
    '{name} ha mentito fino alla fine. Traditore.',
    'Sotto la maschera di {name}: un Traditore.',
    '{name}. Traditore.',
  ]),
  'unveil.faithful': L([
    '{name}… era Leale.',
    '{name} ha detto la verità. Leale.',
    'Sotto la maschera di {name}: un Leale.',
    '{name}. Leale.',
  ]),
  'end.traitors': L([
    'I Traditori hanno vinto. Il castello è loro.',
    'Vincono i Traditori. Avete creduto alle persone sbagliate.',
    'Il castello cade nelle mani dei Traditori.',
    'Vittoria dei Traditori. Hanno mentito meglio di quanto voi abbiate indagato.',
  ]),
  'end.faithfuls': L([
    'I Leali hanno vinto. Il castello è salvo.',
    'Vincono i Leali. Nessun Traditore è sopravvissuto.',
    'Il castello è libero. Vittoria dei Leali.',
    'I Leali trionfano. I Traditori sono stati smascherati.',
  ]),
  'end.prize': L([
    'Il montepremi di {coins} monete va a {names}: {share} monete a testa.',
    '{names} si dividono {coins} monete. {share} ciascuno.',
    '{coins} monete per {names}. {share} a testa.',
    'Il forziere si apre per {names}: {share} monete ciascuno.',
  ]),
  'end.noprize': L([
    'Il forziere resta vuoto. Ma la gloria è tutta vostra.',
    'Nessuna moneta da dividere. Solo la gloria.',
    'Il montepremi è vuoto. Peccato.',
    'Niente monete, stavolta. Solo onore.',
  ]),
});
