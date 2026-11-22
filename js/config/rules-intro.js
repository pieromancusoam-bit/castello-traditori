// Spiegazione delle regole a inizio partita: diapositive sul master, lette dal narratore.
// Dipende dalle impostazioni della partita (giochi, ruoli speciali, eventi accesi).
// MAI il numero di Traditori: lo schermo lo vedono tutti.

import { ITEMS, ITEM_IDS, EVENTS, EVENT_IDS } from './game-config.js';

const SPECIAL = {
  seer: { name: 'Il Veggente', text: 'È un Leale. Una volta per partita, di notte, scopre la fazione di un giocatore.' },
  knight: { name: 'Il Cavaliere', text: 'È un Leale. Parte con uno Scudo che lo salva da un omicidio.' },
  secretTraitor: { name: 'Il Traditore Segreto', text: 'È un Traditore che gli altri Traditori non conoscono. Una volta per partita può cambiare la loro vittima.' },
};

// settings = impostazioni risolte (resolveSettings)
export function rulesSlides(settings) {
  const slides = [];
  const add = (title, lines, say, extra = {}) => slides.push({ title, lines, say, ...extra });

  add('Il castello', [
    'Tra voi si nascondono alcuni Traditori. Tutti gli altri sono Leali.',
    'I Leali vincono se smascherano tutti i Traditori.',
    'I Traditori vincono se arrivano alla fine senza farsi scoprire.',
  ], 'Benvenuti al castello. Io ne sono il custode. Tra voi si nascondono alcuni Traditori: tutti gli altri sono Leali. '
    + 'I Leali vincono se smascherano tutti i Traditori. I Traditori vincono se arrivano alla fine senza farsi scoprire. '
    + 'Tra poco ognuno di voi scoprirà, in segreto sul telefono, da che parte sta.');

  if (settings.missions) {
    const n = settings.missionsPerDay;
    add('Il giorno e i giochi', [
      'Ogni mattina, a colazione, si scopre chi è stato assassinato.',
      `Poi ${n === 1 ? 'un gioco' : `${n} giochi`} insieme: ogni gioco riuscito aggiunge monete al montepremi.`,
      'Attenzione: i Traditori possono sabotare i giochi.',
    ], 'Ogni mattina, a colazione, scoprirete chi non è sopravvissuto alla notte. '
      + `Poi giocherete insieme: ${n === 1 ? 'un gioco' : `${n} giochi`} al giorno. Ogni gioco riuscito aggiunge monete al montepremi. `
      + 'Ma attenzione: i Traditori possono sabotarli. Le regole di ogni gioco ve le spiegherò al momento.');
  }

  add('La Tavola Rotonda', [
    'Ogni giorno si discute: chi sono i Traditori?',
    'Poi ognuno vota dal telefono chi bandire. I voti alla fine si vedono.',
    'Il bandito dice le sue ultime parole, poi il castello svela la sua fazione.',
  ], 'Ogni giorno vi siederete alla Tavola Rotonda. Discuterete, accuserete, vi difenderete. '
    + 'Poi ognuno voterà dal telefono chi bandire dal castello, e alla fine tutti vedranno chi ha votato chi. '
    + 'Il bandito potrà dire le sue ultime parole, poi il castello svelerà se era Leale o Traditore.');

  add('La notte', [
    'Tutti toccano il telefono, così nessuno si tradisce.',
    'I Traditori scelgono insieme chi assassinare.',
    'I Leali indicano chi sospettano: il castello lo annuncia a colazione.',
  ], 'Poi cala la notte. Tutti toccheranno il telefono, così nessuno si tradisce. '
    + 'I Traditori si accordano in segreto e scelgono chi assassinare. I Leali indicano chi sospettano: a colazione il castello annuncerà il più sospettato.'
    + (settings.ultimatum || settings.seduction ? ' E a volte i Traditori potranno provare a reclutare un Leale.' : ''));

  if (settings.missions) {
    add('Gli oggetti', [
      'Un gioco riuscito regala un oggetto, in segreto, a uno di voi.',
      'Gli oggetti si vedono e si usano dal pulsante "Oggetti" sul telefono.',
    ], 'Ogni gioco riuscito regala un oggetto, in segreto, a uno di voi. Gli oggetti si usano dal pulsante Oggetti sul telefono. Eccoli. '
      + ITEM_IDS.map((id) => `${ITEMS[id].name}: ${ITEMS[id].text}`).join(' '),
    { items: ITEM_IDS.map((id) => ({ id, name: ITEMS[id].name, text: ITEMS[id].text })) });
  }

  const specials = Object.keys(SPECIAL).filter((k) => settings.roles && settings.roles[k]);
  if (specials.length) {
    add('Ruoli speciali', specials.map((k) => `${SPECIAL[k].name}: ${SPECIAL[k].text}`),
      `In questa partita possono esserci anche dei ruoli speciali. ${specials.map((k) => `${SPECIAL[k].name}. ${SPECIAL[k].text}`).join(' ')}`);
  }

  const events = EVENT_IDS.filter((id) => settings.events && settings.events[id]);
  if (events.length) {
    add('Gli eventi', events.map((id) => `${EVENTS[id].name}: ${EVENTS[id].text}`),
      'Dal secondo giorno, a colazione, il castello potrà annunciare un evento che cambia le regole della giornata. Ve lo spiegherò quando accadrà.');
  }

  add('Il finale', [
    `Quando restano ${settings.finalThreshold} giocatori arriva la Cerimonia delle Polveri.`,
    'Ognuno sceglie in segreto: chiudere la partita o bandire ancora.',
    'Se tra i sopravvissuti c\'è un Traditore, il montepremi è dei Traditori. Altrimenti dei Leali.',
  ], `Quando resteranno ${settings.finalThreshold} giocatori arriverà la Cerimonia delle Polveri: ognuno sceglierà in segreto se chiudere la partita o bandire ancora. `
    + 'Se tra i sopravvissuti ci sarà anche un solo Traditore, il montepremi andrà ai Traditori. Altrimenti, ai Leali. Ora… che il gioco abbia inizio.');

  return slides;
}
