// Votazioni per bandire (Tavola Rotonda e Cerimonia delle Polveri):
// raccolta, conteggio, parità e ballottaggio. Funzioni pure.

// Primo turno: candidati tutti i vivi (null). Ballottaggio: solo i candidati in parità.
export function openBallot(candidates = null) {
  return { round: candidates ? 2 : 1, candidates, votes: {} };
}

// Restituisce un codice d'errore oppure null se il voto è valido
export function voteError(ballot, voterId, targetId, aliveIds) {
  if (!aliveIds.includes(voterId)) return 'NOT_ALIVE';
  if (ballot.votes[voterId] !== undefined) return 'ALREADY_VOTED';
  if (!aliveIds.includes(targetId)) return 'INVALID_TARGET';
  if (targetId === voterId) return 'SELF_VOTE';
  if (ballot.candidates && !ballot.candidates.includes(targetId)) return 'NOT_CANDIDATE';
  return null;
}

// Conteggio: { counts, leaders, max }. I leader seguono l'ordine dei giocatori.
export function tally(votes, order) {
  const counts = {};
  for (const target of Object.values(votes)) counts[target] = (counts[target] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const leaders = max > 0 ? order.filter((id) => counts[id] === max) : [];
  return { counts, leaders, max };
}

// Esito di una votazione chiusa:
//   { kind: 'banish', playerId }      un solo più votato
//   { kind: 'runoff', candidates }    parità al primo turno -> ballottaggio
//   { kind: 'none', reason }          parità al ballottaggio, o nessun voto
export function outcomeOf(ballot, order) {
  const { leaders } = tally(ballot.votes, order);
  if (leaders.length === 0) return { kind: 'none', reason: 'no-votes' };
  if (leaders.length === 1) return { kind: 'banish', playerId: leaders[0] };
  if (ballot.round === 1) return { kind: 'runoff', candidates: leaders };
  return { kind: 'none', reason: 'tie' };
}
