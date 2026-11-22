// Stemmi dei giocatori: campo (sfondo dello scudo) e figura. Tutti disegnati da zero
// in js/ui/heraldry.js. Almeno quanti i giocatori massimi della stanza (16).

const T = {
  rosso: '#8c1c2c', azzurro: '#24477f', verde: '#1f5a35', nero: '#1c1719', porpora: '#552461',
  oro: '#d9b44a', argento: '#d8d3c8',
};

const A = (name, field, charge) => Object.freeze({ name, field: T[field], charge: T[charge] });

export const AVATARS = Object.freeze({
  torre: A('Torre', 'azzurro', 'oro'),
  chiave: A('Chiave', 'rosso', 'oro'),
  corona: A('Corona', 'porpora', 'oro'),
  spada: A('Spada', 'nero', 'argento'),
  stella: A('Stella', 'azzurro', 'argento'),
  luna: A('Luna', 'nero', 'argento'),
  sole: A('Sole', 'rosso', 'oro'),
  rosa: A('Rosa', 'argento', 'rosso'),
  albero: A('Albero', 'oro', 'verde'),
  calice: A('Calice', 'verde', 'oro'),
  ancora: A('Ancora', 'azzurro', 'argento'),
  giglio: A('Giglio', 'azzurro', 'oro'),
  croce: A('Croce', 'oro', 'nero'),
  pesce: A('Pesce', 'verde', 'argento'),
  corvo: A('Corvo', 'argento', 'nero'),
  serpente: A('Serpente', 'oro', 'verde'),
  gufo: A('Gufo', 'porpora', 'argento'),
  aquila: A('Aquila', 'oro', 'nero'),
  cervo: A('Cervo', 'verde', 'oro'),
  farfalla: A('Farfalla', 'rosso', 'argento'),
});

export const AVATAR_IDS = Object.freeze(Object.keys(AVATARS));
