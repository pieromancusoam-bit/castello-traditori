// Il regista: confronta due schermate consecutive del master (viewForMaster) e decide
// cosa fanno narratore, musica ed effetti. Funzione pura: niente DOM, niente audio.
// Usa SOLO la vista dello schermo condiviso: per costruzione non può dire nulla di segreto.
//
// Segnali (cues), ognuno con `at` = millisecondi dall'apparizione della schermata:
//   { type: 'music', track }                  traccia di sottofondo (o null)
//   { type: 'sound', id, at }                 effetto sonoro
//   { type: 'say', moment, vars, at, once? }  frase del narratore (once: solo la prima volta)

import { SHOW } from '../config/show-config.js';
import { MISSIONS } from '../config/missions.js';
import { EVENTS } from '../config/game-config.js';
import { coins, listNames } from '../ui/format.js';

// Schermata "precedente" quando la partita parte dalla sala d'attesa (non dopo un "Riprendi")
export const LOBBY_VIEW = Object.freeze({ phase: 'lobby', day: 0, players: [], curses: [], sealed: [], step: {} });

// Musica per fase
const TRACK = {
  roles: 'day', breakfast: 'day', presentations: 'day', mission: 'day', dusk: 'day',
  roundtable: 'roundtable', reveal: 'roundtable', scene: 'roundtable',
  night: 'night', final: 'final', ended: 'final',
};
export const trackOf = (v) => (v ? TRACK[v.phase] || null : null);

// Chiave della "scena": cambia solo quando cambia il momento da raccontare,
// non quando cambiano i conteggi (chi ha votato, chi ha scelto…)
export function sceneKey(v) {
  if (!v) return '';
  const st = v.step || {};
  const k = [v.phase, v.day];
  switch (v.phase) {
    case 'mission': k.push(st.slot, st.id, st.stage); break;
    case 'presentations': k.push(st.index); break;
    case 'roundtable': k.push(st.stage, st.round, st.second); break;
    case 'final': k.push(st.stage, st.round ?? '', st.stage === 'unveil' ? st.revealed.length : ''); break;
    default: break;
  }
  return k.join('|');
}

// Tempi della rivelazione dei voti (uguali a quelli usati dallo schermo)
export function voteTimes(count) {
  const T = SHOW.votes;
  const at = (i) => T.firstMs + i * T.stepMs;
  return { at, outcome: at(Math.max(count - 1, 0)) + T.outcomeMs };
}

export function cuesFor(prev, next) {
  const out = [];
  if (!next) return out;
  const nameOf = (id) => (next.players.find((p) => p.id === id) || { name: '?' }).name;
  const namesOf = (ids) => listNames(ids.map(nameOf));
  const say = (moment, vars = {}, at = 0, once = null) => out.push({ type: 'say', moment, vars, at, ...(once ? { once } : {}) });
  const sound = (id, at = 0) => out.push({ type: 'sound', id, at });

  if (trackOf(prev) !== trackOf(next)) out.push({ type: 'music', track: trackOf(next) });

  // Maledizioni e Sigilli: arrivano a metà schermata (tabellone o Colazione)
  if (prev && prev.day === next.day) {
    for (const id of next.curses.filter((x) => !prev.curses.includes(x))) {
      sound('curse');
      say('curse', { name: nameOf(id) });
    }
    for (const id of next.sealed.filter((x) => !prev.sealed.includes(x))) {
      sound('seal');
      say('sealed', { name: nameOf(id) });
    }
  }

  // Dopo un "Riprendi" (nessuna schermata precedente) solo la musica: niente frasi ripetute
  if (!prev || sceneKey(prev) === sceneKey(next)) return out;

  const st = next.step || {};
  switch (next.phase) {
    case 'roles':
      sound('gong');
      say('roles');
      break;

    case 'breakfast':
      sound('bell');
      if (st.firstDay) say('breakfast.first', {}, 1200);
      else if (st.victimId) {
        sound('crack', SHOW.breakfastBreakMs);
        say('breakfast.victim', { name: nameOf(st.victimId) }, SHOW.breakfastTextMs);
      } else if (st.failed) say('breakfast.failed', {}, 1200);
      else say('breakfast.none', {}, 1200);
      if (st.suspects.length) say('breakfast.suspects', { names: namesOf(st.suspects) });
      if (next.event && !next.event.cancelled) {
        const def = EVENTS[next.event.id];
        sound('gong');
        say('event', { name: def.name, text: def.text });
        if (next.event.id === 'doubleStakes') say('event.double', { slot: String(next.event.slot) });
      }
      break;

    case 'presentations':
      if (st.index === 0) say('presentations.start', {}, 0, 'presentations');
      say('presentations.turn', { name: nameOf(st.playerId), theme: st.theme });
      break;

    case 'mission':
      missionCues(st, next, { say, sound, namesOf });
      break;

    case 'roundtable':
      voteCues(st, { say, sound, namesOf, nameOf });
      break;

    case 'reveal':
      revealCues(st, nameOf, { say, sound });
      break;

    case 'scene':
      sound('heart');
      say('scene');
      say('scene.read', { scene: st.scene });
      break;

    case 'dusk':
      sound('toll');
      if (st.reason === 'murdered') {
        sound('crack', SHOW.breakfastBreakMs);
        say('dusk.murdered', { name: nameOf(st.victimId) }, SHOW.breakfastTextMs);
      } else say(st.reason === 'gone' ? 'dusk.gone' : 'dusk.none');
      break;

    case 'night': {
      sound('nightfall');
      say('night', {}, 600);
      const ev = next.event && !next.event.cancelled ? next.event.id : null;
      if (ev === 'banquet') say('night.banquet');
      if (ev === 'daylightMurder') say('night.daylight');
      break;
    }

    case 'final':
      switch (st.stage) {
        case 'choice':
          sound('gong');
          say('final.choice');
          break;
        case 'choice-reveal':
          say('final.reveal');
          break;
        case 'unveil': {
          const prevUnveil = prev.phase === 'final' && prev.step.stage === 'unveil';
          if (!prevUnveil) {
            sound('gong');
            say('final.unveil');
          }
          const id = st.revealed.at(-1);
          if (id) {
            const p = next.players.find((x) => x.id === id);
            sound('heart');
            say(p.faction === 'traitors' ? 'unveil.traitor' : 'unveil.faithful', { name: p.name }, SHOW.unveilSilenceMs);
          }
          break;
        }
        case 'reveal':
          revealCues(st, nameOf, { say, sound });
          break;
        default:
          voteCues(st, { say, sound, namesOf, nameOf }, true);
      }
      break;

    case 'ended': {
      sound('fanfare');
      say(next.winner === 'traitors' ? 'end.traitors' : 'end.faithfuls');
      const prize = next.prize;
      if (prize && prize.pot > 0 && prize.winners.length) {
        say('end.prize', { coins: coins(prize.pot), names: namesOf(prize.winners), share: coins(prize.share) });
      } else say('end.noprize');
      break;
    }
    default:
      break;
  }
  return out;
}

function missionCues(st, v, { say, sound, namesOf }) {
  const def = MISSIONS[st.id];
  const m = st.mission || {};
  switch (st.stage) {
    case 'intro': {
      sound('gong');
      say('mission.intro', { title: def.title, slot: String(st.slot), perDay: String(st.perDay) });
      if (st.double) say('mission.double');
      say('mission.rules', { rules: def.rules }, 0, `rules:${st.id}`);
      const chosen = st.id === 'chest' ? m.group : st.id === 'bridge' ? m.pair
        : st.id === 'messenger' ? [m.messengerId] : st.id === 'letter' ? [m.keeperId] : null;
      if (chosen && chosen.length) say('mission.chosen', { names: namesOf(chosen) });
      if (st.id === 'auction') say('mission.stake.auction');
      else if (st.id !== 'letter') say('mission.stake', { coins: coins(st.value) });
      break;
    }
    case 'play':
      sound('toll');
      say('mission.play');
      break;
    case 'result': {
      const r = st.result;
      if (r.success) {
        sound('coins');
        say('mission.success', { coins: coins(Math.max(r.coins, 0)) });
      } else if (r.doubleLoss) {
        sound('fail');
        say('mission.doubleLoss', { coins: coins(-r.coins) });
      } else {
        sound('fail');
        say(r.coins > 0 ? 'mission.partial' : 'mission.fail', { coins: coins(Math.max(r.coins, 0)) });
      }
      if (r.itemGiven) say('mission.gift', {}, 0);
      break;
    }
    case 'board':
      say('board', { coins: coins(v.pot) });
      break;
    default:
      break;
  }
}

function voteCues(st, { say, sound, namesOf, nameOf }, final = false) {
  if (st.stage === 'discussion') {
    sound('toll');
    say('roundtable.discussion');
    return;
  }
  if (st.stage === 'voting') {
    sound('toll');
    if (st.round === 2) return say('roundtable.runoff', { names: namesOf(st.candidates) });
    if (st.second) say('roundtable.second');
    if (st.fog) say('roundtable.fog');
    say(final ? 'final.voting' : 'roundtable.voting');
    return;
  }
  if (st.stage !== 'results') return;
  // I voti compaiono uno alla volta, ognuno con un rintocco; poi l'esito
  const count = st.fog ? st.fogCounts.length : st.votes.length;
  const T = voteTimes(count);
  for (let i = 0; i < count; i++) sound('vote', T.at(i));
  const o = st.outcome;
  if (o.kind === 'banish') say('votes.banish', { name: nameOf(o.playerId) }, T.outcome);
  else if (o.kind === 'runoff') say('votes.runoff', { names: namesOf(o.candidates) }, T.outcome);
  else say(o.reason === 'tie' ? 'votes.tie' : 'votes.none', {}, T.outcome);
}

function revealCues(st, nameOf, { say, sound }) {
  sound('door');
  sound('heart', 900);
  say(st.faction === 'traitors' ? 'reveal.traitor' : 'reveal.faithful', { name: nameOf(st.playerId) }, SHOW.revealSilenceMs);
}
