// Importar y exportar Excel (.xlsx) con SheetJS, que se carga solo cuando hace falta.
import { normaliza, aFecha, aEntero, hoy } from './datos.js';

let cargando = null;
function cargarXLSX() {
  if (window.XLSX) return Promise.resolve();
  cargando ??= new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = new URL('../vendor/xlsx.mini.min.js', import.meta.url).href;
    s.onload = ok;
    s.onerror = () => { cargando = null; ko(new Error('No se pudo cargar el lector de Excel')); };
    document.head.appendChild(s);
  });
  return cargando;
}

// ---------- Lectura ----------
// Devuelve las filas de una hoja como objetos {cabecera: valor}, con _fila = número de fila en Excel.
function filas(ws) {
  if (!ws || !ws['!ref']) return [];
  const X = window.XLSX;
  const rango = X.utils.decode_range(ws['!ref']);
  const matriz = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true });
  const cab = (matriz[0] || []).map((h) => String(h).trim());
  const out = [];
  matriz.slice(1).forEach((fila, i) => {
    const o = { _fila: rango.s.r + i + 2 };
    let algo = false;
    cab.forEach((h, j) => {
      if (!h) return;
      const v = fila[j];
      o[h] = typeof v === 'string' ? v.trim() : v;
      if (o[h] !== '' && o[h] != null) algo = true;
    });
    if (algo) out.push(o);
  });
  return out;
}
const hoja = (wb, nombre) => {
  const n = wb.SheetNames.find((x) => x.trim().toLowerCase() === nombre.toLowerCase());
  return n ? Object.assign(wb.Sheets[n], { _nombre: n }) : null;
};
const txt = (v) => (v == null ? '' : v instanceof Date ? aFecha(v) : String(v).trim());

// Fila de la hoja Actividades → actividad (o errores)
function leerActividad(r) {
  const errores = [];
  const id = txt(r.ID_actividad ?? r.id).toUpperCase();
  const nombre = txt(r.Nombre ?? r.nombre);
  if (!/^ACT\d{3,}$/.test(id)) errores.push(id ? `ID «${id}» no tiene el formato ACT001` : 'falta el ID');
  if (!nombre) errores.push('falta el nombre');
  const campo = (c, v, vacio = true) => { const n = normaliza(c, v, { vacioPermitido: vacio }); if (n.error) errores.push(n.error); return n.v ?? ''; };
  const area = campo('area', r.Area_trabajo ?? r.area, false);
  const modalidad = campo('modalidad', r.Modalidad ?? r.modalidad, false);
  const dificultad = campo('dificultad', r.Dificultad ?? r.dificultad);
  const contexto = campo('contexto', r.Contexto ?? r.contexto) || 'En casa';
  const act = txt(r.Activa ?? r.activa).toLowerCase();
  let activa = true;
  if (['no', 'false', '0'].includes(act)) activa = false;
  else if (act && !['sí', 'si', 'true', '1'].includes(act)) errores.push(`«Activa» debe ser Sí o No`);
  return {
    fila: r._fila, errores,
    dato: {
      id, nombre, area, modalidad, dificultad, contexto, activa,
      instrucciones: txt(r.Instrucciones ?? r.instrucciones),
      materiales: txt(r.Materiales ?? r.materiales),
      duracion: txt(r.Duracion_min ?? r.duracion),
      capacidades: txt(r.Capacidades_implicadas ?? r.capacidades),
      objetivo: txt(r.Objetivo ?? r.objetivo),
    },
  };
}

// Fila de la hoja Registro (plantilla de Excel) → log
function leerRegistroPlantilla(r, actividades) {
  const errores = [];
  const fecha = aFecha(r.Fecha);
  if (!fecha) errores.push('fecha no válida');
  const activity_id = txt(r.ID_actividad).toUpperCase() || null;
  const a = actividades.get(activity_id);
  if (activity_id && !a) errores.push(`la actividad ${activity_id} no existe en el catálogo`);
  const campo = (c, v) => { const n = normaliza(c, v); if (n.error) errores.push(n.error); return n.v ?? ''; };
  const ref = txt(r.ID_registro) || 'REG' + String(r._fila - 1).padStart(4, '0');
  return {
    fila: r._fila, errores,
    dato: {
      id: 'XLS-' + ref, activity_id, fecha,
      nombre: txt(r.Nombre_actividad) || a?.nombre || '',
      area: a?.area || '',
      hermana: txt(r.Hermana_responsable),
      modalidad: campo('modalidad', r.Modalidad_realizada) || a?.modalidad || '',
      realizacion: campo('realizacion', r.Realizacion ?? r.Realizada) || 'Completa',
      duracion_real_min: aEntero(r.Duracion_real_min),
      participacion: campo('participacion', r.Participacion),
      ayuda: campo('ayuda', r.Ayuda_necesaria),
      gusto: campo('gusto', r.Gusto ?? r.Disfrute),
      dificultad_percibida: campo('dificultad_percibida', r.Dificultad_percibida),
      observaciones: txt(r.Observaciones),
      proxima_vez: campo('proxima_vez', r.Proxima_vez),
    },
  };
}

// Filas de una copia de seguridad (columnas con los nombres de la base de datos)
const COLS_EVENT = ['id', 'fecha', 'hora', 'activity_id', 'nombre', 'area', 'modalidad', 'hermana', 'duracion_min', 'estado'];
const COLS_LOG = ['id', 'event_id', 'activity_id', 'nombre', 'area', 'modalidad', 'fecha', 'hermana', 'duracion_real_min',
  'realizacion', 'participacion', 'ayuda', 'dificultad_percibida', 'gusto', 'observaciones', 'proxima_vez'];

function leerFilaCopia(r, cols, enteros, listas) {
  const errores = [];
  const d = {};
  for (const c of cols) d[c] = txt(r[c]);
  d.fecha = aFecha(r.fecha);
  if (!d.id) errores.push('falta id');
  if (!d.fecha) errores.push('fecha no válida');
  for (const c of enteros) d[c] = aEntero(r[c]);
  for (const c of listas) { const n = normaliza(c, d[c]); if (n.error) errores.push(n.error); else d[c] = n.v; }
  for (const c of ['activity_id', 'event_id']) if (c in d) d[c] = d[c] || null;
  return { fila: r._fila, errores, dato: d };
}

/**
 * Analiza un Excel y devuelve un plan de importación (todavía no guarda nada).
 * tipo: 'copia' (copia de seguridad completa) o 'catalogo' (plantilla).
 */
export async function analizarExcel(file, actuales) {
  await cargarXLSX();
  const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });

  const wsAct = hoja(wb, 'Actividades') || Object.assign(wb.Sheets[wb.SheetNames[0]], { _nombre: wb.SheetNames[0] });
  const wsCal = hoja(wb, 'Calendario');
  const esCopia = !!wsCal && ws_tiene(wsCal, 'id');

  const acts = filas(wsAct).map(leerActividad);
  const vistos = new Set();
  for (const r of acts) {
    if (r.dato.id && vistos.has(r.dato.id)) r.errores.push(`ID ${r.dato.id} repetido en el archivo`);
    vistos.add(r.dato.id);
  }
  const actOk = acts.filter((r) => !r.errores.length).map((r) => r.dato);
  const idsExist = new Set(actuales.A.map((a) => a.id));
  const catalogo = new Map([...actuales.A, ...actOk].map((a) => [a.id, a]));

  const plan = {
    tipo: esCopia ? 'copia' : 'catalogo',
    actividades: actOk,
    nuevas: actOk.filter((a) => !idsExist.has(a.id)).length,
    actualizadas: actOk.filter((a) => idsExist.has(a.id)).length,
    errores: acts.filter((r) => r.errores.length).map((r) => ({ hoja: wsAct._nombre, fila: r.fila, motivo: r.errores.join('; ') })),
    eventos: [], registros: [], hermanas: null,
  };

  const anota = (lista, nombreHoja) => {
    const ok = [];
    for (const r of lista) {
      if (r.errores.length) plan.errores.push({ hoja: nombreHoja, fila: r.fila, motivo: r.errores.join('; ') });
      else ok.push(r.dato);
    }
    return ok;
  };
  const sinActividadPerdida = (d) => {
    if (d.activity_id && !catalogo.has(d.activity_id)) d.activity_id = null;
    return d;
  };

  if (esCopia) {
    plan.eventos = anota(filas(wsCal).map((r) => leerFilaCopia(r, COLS_EVENT, ['duracion_min'], ['modalidad', 'estado'])), 'Calendario')
      .map((d) => sinActividadPerdida({ ...d, estado: d.estado || 'Pendiente', nombre: d.nombre || 'Visita' }));
    const idsEv = new Set([...actuales.E.map((e) => e.id), ...plan.eventos.map((e) => e.id)]);
    plan.registros = anota(filas(hoja(wb, 'Registro')).map((r) => leerFilaCopia(r, COLS_LOG, ['duracion_real_min'],
      ['realizacion', 'participacion', 'ayuda', 'dificultad_percibida', 'gusto', 'proxima_vez'])), 'Registro')
      .map((d) => { sinActividadPerdida(d); if (d.event_id && !idsEv.has(d.event_id)) d.event_id = null; d.realizacion ||= 'Completa'; return d; });
    const aj = filas(hoja(wb, 'Ajustes'));
    const h = aj.map((r) => txt(r.Hermana ?? r.hermanas)).filter(Boolean);
    if (h.length) plan.hermanas = h;
  } else {
    const wsReg = hoja(wb, 'Registro');
    plan.registros = anota(filas(wsReg).filter((r) => r.Fecha !== '' && r.Fecha != null)
      .map((r) => leerRegistroPlantilla(r, catalogo)), 'Registro');
  }
  return plan;
}
function ws_tiene(ws, col) {
  const cab = window.XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' })[0] || [];
  return cab.some((h) => String(h).trim() === col);
}

// ---------- Escritura ----------
const CAB_CATALOGO = ['ID_actividad', 'Nombre', 'Area_trabajo', 'Modalidad', 'Instrucciones', 'Materiales',
  'Duracion_min', 'Dificultad', 'Capacidades_implicadas', 'Contexto', 'Activa'];
const filaCatalogo = (a) => [a.id, a.nombre, a.area, a.modalidad, a.instrucciones, a.materiales,
  a.duracion, a.dificultad, a.capacidades, a.contexto, a.activa ? 'Sí' : 'No'];

function añadirHoja(wb, nombre, cabecera, filasDatos, anchos = {}) {
  const ws = window.XLSX.utils.aoa_to_sheet([cabecera, ...filasDatos]);
  ws['!cols'] = cabecera.map((h) => ({ wch: anchos[h] || Math.max(12, h.length + 2) }));
  window.XLSX.utils.book_append_sheet(wb, ws, nombre);
  return ws;
}

function descargar(wb, nombre) {
  window.XLSX.writeFile(wb, nombre, { compression: true });
}

const ANCHOS = { Nombre: 30, Area_trabajo: 32, Modalidad: 22, Instrucciones: 60, Materiales: 28, Capacidades_implicadas: 32,
  nombre: 28, observaciones: 40, area: 30, modalidad: 22 };

export async function exportarCatalogo(A, listas) {
  await cargarXLSX();
  const wb = window.XLSX.utils.book_new();
  añadirHoja(wb, 'Actividades', CAB_CATALOGO, [...A].sort((a, b) => a.id.localeCompare(b.id)).map(filaCatalogo), ANCHOS);
  const max = Math.max(...Object.values(listas).map((l) => l.length));
  const ancho = Object.fromEntries(Object.keys(listas).map((k) => [k, 36]));
  añadirHoja(wb, 'Listas', Object.keys(listas), [...Array(max)].map((_, i) => Object.values(listas).map((l) => l[i] ?? '')), ancho);
  descargar(wb, `despierta-maruja-catalogo-${hoy()}.xlsx`);
}

export async function exportarCopia({ A, E, L, S }) {
  await cargarXLSX();
  const wb = window.XLSX.utils.book_new();
  const ord = (x) => [...x].sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  añadirHoja(wb, 'Actividades', CAB_CATALOGO, [...A].sort((a, b) => a.id.localeCompare(b.id)).map(filaCatalogo), ANCHOS);
  añadirHoja(wb, 'Calendario', COLS_EVENT, ord(E).map((e) => COLS_EVENT.map((c) => e[c] ?? '')), ANCHOS);
  añadirHoja(wb, 'Registro', COLS_LOG, ord(L).map((l) => COLS_LOG.map((c) => l[c] ?? '')), ANCHOS);
  añadirHoja(wb, 'Ajustes', ['Hermana'], (S?.hermanas || []).map((h) => [h]), { Hermana: 24 });
  descargar(wb, `despierta-maruja-copia-${hoy()}.xlsx`);
}
