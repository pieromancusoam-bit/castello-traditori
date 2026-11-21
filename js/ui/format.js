// Formati comuni per master e telefono.

// 1250 -> "1.250" (a mano: in italiano toLocaleString non separa le migliaia sotto 10.000)
export const coins = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// 412 -> "0,41 s"
export const seconds = (ms) => `${(ms / 1000).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s`;

// 75000 -> "1:15"
export function clock(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// ["Anna", "Bruno", "Carla"] -> "Anna, Bruno e Carla"
export function listNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
