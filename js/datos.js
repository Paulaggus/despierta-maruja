// Listas de valores, fechas y conversiones. Sin dependencias.

export const AREAS = [
  'Actividad física y coordinación',
  'Actividades instrumentales y autonomía',
  'Atención y concentración',
  'Creatividad y habilidades manipulativas',
  'Funciones ejecutivas',
  'Habilidades visuoespaciales y praxias',
  'Lenguaje y comunicación',
  'Memoria episódica y autobiográfica',
  'Memoria semántica y aprendizaje',
  'Orientación temporal y espacial',
  'Socialización y participación comunitaria',
];
export const MODS = ['Autónoma', 'Autónoma con supervisión ocasional', 'Acompañada'];
export const DIFS = ['Fácil', 'Intermedio', 'Avanzado', 'Adaptable'];
export const CONTEXTOS = ['En casa', 'Exterior'];
export const ESTADOS = ['Pendiente', 'Realizada', 'Cancelada'];
export const REAL = ['Completa', 'Parcial', 'No realizada'];
export const PART = ['Activa', 'Con ayuda', 'Observadora', 'No ha querido participar'];
export const AYUDA = ['Ninguna', 'Algunas pistas', 'Ayuda frecuente', 'Acompañamiento continuo'];
export const DIFP = ['Fácil', 'Adecuada', 'Difícil'];
export const GUSTO = ['Sí', 'Regular', 'No'];
export const PROX = ['Repetir', 'Adaptar', 'Aumentar dificultad'];

// Valores antiguos (Excel / prototipo) → valores definitivos
const ALIAS = {
  realizacion: { 'Sí': 'Completa', 'Si': 'Completa', 'No': 'No realizada' },
  participacion: {
    'Participa con ayuda': 'Con ayuda', 'Observa': 'Observadora',
    'No quiso participar': 'No ha querido participar',
  },
  ayuda: { 'Pocas pistas': 'Algunas pistas' },
  gusto: { 'Le gustó': 'Sí', 'Indiferente': 'Regular', 'No le gustó': 'No', 'No se pudo valorar': '' },
  dificultad_percibida: { 'No se pudo valorar': '' },
  dificultad: { 'Difícil': 'Avanzado' },
};
const LISTAS = {
  area: AREAS, modalidad: MODS, dificultad: DIFS, contexto: CONTEXTOS, estado: ESTADOS,
  realizacion: REAL, participacion: PART, ayuda: AYUDA,
  dificultad_percibida: DIFP, gusto: GUSTO, proxima_vez: PROX,
};

// Normaliza un valor de lista. Devuelve {v} o {error}.
export function normaliza(campo, valor, { vacioPermitido = true } = {}) {
  let v = String(valor ?? '').trim();
  if (ALIAS[campo] && v in ALIAS[campo]) v = ALIAS[campo][v];
  if (v === '') return vacioPermitido ? { v: '' } : { error: `falta «${campo}»` };
  const lista = LISTAS[campo];
  if (!lista) return { v };
  const hit = lista.find((x) => x.toLowerCase() === v.toLowerCase());
  return hit ? { v: hit } : { error: `«${v}» no es un valor válido de ${campo}` };
}

// ---------- Fechas (siempre hora de Madrid, nunca UTC) ----------
const TZ = 'Europe/Madrid';
const fmtISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const hoy = (d = new Date()) => fmtISO.format(d);
const toUTC = (s) => new Date(s + 'T12:00:00Z');
const isoUTC = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => { const d = toUTC(s); d.setUTCDate(d.getUTCDate() + n); return isoUTC(d); };
export const addMonths = (s, n) => { const d = toUTC(s.slice(0, 8) + '01'); d.setUTCMonth(d.getUTCMonth() + n); return isoUTC(d); };
export const dowLunes = (s) => (toUTC(s).getUTCDay() + 6) % 7; // 0 = lunes
export const lunesDe = (s) => addDays(s, -dowLunes(s));
const fmt = (s, o) => toUTC(s).toLocaleDateString('es-ES', { timeZone: 'UTC', ...o });
export const fLarga = (s) => fmt(s, { weekday: 'long', day: 'numeric', month: 'long' });
export const fCorta = (s) => fmt(s, { weekday: 'short', day: 'numeric', month: 'short' });
export const fMes = (s) => fmt(s, { month: 'long', year: 'numeric' });
export const fDiaMes = (s) => fmt(s, { day: 'numeric', month: 'short' });
export const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Convierte lo que venga de una celda de Excel en AAAA-MM-DD (o '').
export function aFecha(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return isNaN(v) ? '' : hoy(v);
  if (typeof v === 'number') { // número de serie de fecha de Excel
    return v > 0 && v < 100000 ? isoUTC(new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 864e5)) : '';
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  if (/^\d{5}$/.test(s)) return isoUTC(new Date(Date.UTC(1899, 11, 30) + Number(s) * 864e5));
  return '';
}

export const aEntero = (v) => {
  const m = String(v ?? '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

// Siguiente ID de actividad: el número siguiente al más alto (ACT042…)
export function siguienteId(actividades) {
  const max = actividades.reduce((m, a) => {
    const n = parseInt(String(a.id).replace(/^ACT/, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return 'ACT' + String(max + 1).padStart(3, '0');
}

// Texto que ve la madre según la modalidad
export function textoModalidad(e) {
  if (e.modalidad === 'Autónoma') return 'Puedes hacerla tú sola';
  if (e.modalidad === 'Autónoma con supervisión ocasional') return 'Puedes hacerla tú, con alguien cerca';
  return e.hermana ? `Viene ${e.hermana}` : 'Con compañía';
}
export const esAcompanada = (m) => m === 'Acompañada';
export const claseMod = (m) => (m === 'Acompañada' ? 'acc' : m === 'Autónoma' ? 'aut' : 'sup');
