// Rifiuto di un'azione: il reducer lo intercetta e lascia lo stato com'era.

export const REJECT = Object.freeze({
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  NOT_ALLOWED: 'NOT_ALLOWED',
  WRONG_PHASE: 'WRONG_PHASE',
  NOT_ALIVE: 'NOT_ALIVE',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INVALID_TARGET: 'INVALID_TARGET',
  ALREADY_DONE: 'ALREADY_DONE',
  STALE: 'STALE', // timer o turno ormai superati
});

export class Rejection extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

export const reject = (reason) => { throw new Rejection(reason); };
export const check = (cond, reason) => { if (!cond) reject(reason); };
