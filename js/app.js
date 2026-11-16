// =====================================================================
//  DESPIERTA MARUJA · Aplicación
// =====================================================================
import { createApi, configurada } from './api.js';
import * as D from './datos.js';
import { analizarExcel, exportarCatalogo, exportarCopia } from './excel.js';

const { AREAS, MODS, DIFS, CONTEXTOS, ESTADOS, REAL, PART, AYUDA, DIFP, GUSTO, PROX } = D;

// window.__DM_API__ solo existe en las pruebas automáticas.
const api = window.__DM_API__ || (configurada() && window.supabase ? createApi() : null);

const st = { A: [], E: [], L: [], S: { hermanas: [], share_token: '' } };
const ui = {
  tab: 'calendario',
  vistaCal: lsGet('dm-vista-cal') || 'resumen',
  cursor: D.hoy(),
  q: '', fa: '', fm: '', fd: '',
};

const TABS = [
  { k: 'calendario', i: '📅', t: 'Calendario', c: '#e0733f' },
  { k: 'actividades', i: '📚', t: 'Actividades', c: '#3b82c4' },
  { k: 'registro', i: '📝', t: 'Registro', c: '#3f9a5b' },
  { k: 'seguimiento', i: '📊', t: 'Seguimiento', c: '#9b59b6' },
];

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const $ = (s, el = document) => el.querySelector(s);
const main = $('#main');
const cab = $('#cab');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }
const porFechaHora = (a, b) => (a.fecha + (a.hora || '99')).localeCompare(b.fecha + (b.hora || '99'));
const actividad = (id) => st.A.find((a) => a.id === id);
const esVisita = (e) => D.esAcompanada(e.modalidad) || !e.activity_id;
const nombreDia = (f) => {
  const t = D.hoy();
  if (f === t) return 'Hoy · ' + D.fLarga(f);
  if (f === D.addDays(t, 1)) return 'Mañana · ' + D.fLarga(f);
  return D.cap(D.fLarga(f));
};

function aviso(texto, tipo = 'ok', ms = 2600) {
  $('#avisos').replaceChildren(); // solo un aviso a la vez
  const el = document.createElement('div');
  el.className = 'aviso ' + tipo;
  el.textContent = texto;
  $('#avisos').appendChild(el);
  setTimeout(() => el.remove(), ms);
}
function errorAviso(e) {
  console.error(e);
  const msg = String(e?.message || e);
  if (/fetch|network|Failed/i.test(msg)) aviso('No se ha podido guardar: comprueba la conexión a internet.', 'error', 5000);
  else aviso('Algo ha fallado: ' + msg, 'error', 6000);
}
function banner(texto, alPulsar) {
  if ($('#banner')) return;
  const b = document.createElement('button');
  b.id = 'banner'; b.className = 'banner'; b.textContent = texto;
  b.onclick = alPulsar;
  document.body.appendChild(b);
}

// ---------- Diálogos ----------
function abrirDialogo(html, clase = '') {
  const d = document.createElement('dialog');
  d.className = clase;
  d.innerHTML = html;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => d.close()));
  d.showModal();
  return d;
}
// Formulario en ventana. Devuelve los datos o null si se cancela.
function pedir(titulo, campos, { ok = 'Guardar', alAbrir, validar } = {}) {
  return new Promise((res) => {
    let datos = null;
    const d = abrirDialogo(`<form><h2>${titulo}</h2>${campos}<p class="error-form" hidden></p>
      <div class="acciones-form"><button class="b" type="submit">${ok}</button>
      <button class="b g" type="button" data-cerrar>Cancelar</button></div></form>`);
    const f = d.querySelector('form');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const o = {};
      new FormData(f).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
      const err = validar && validar(o, f);
      if (err) { const p = f.querySelector('.error-form'); p.textContent = err; p.hidden = false; return; }
      datos = o; d.close();
    });
    d.addEventListener('close', () => res(datos));
    alAbrir && alAbrir(f, d);
    setTimeout(() => f.querySelector('input:not([type=hidden]):not([type=radio]),select,textarea')?.focus({ preventScroll: true }), 50);
  });
}
function confirmar(texto, { ok = 'Sí', peligro = false } = {}) {
  return new Promise((res) => {
    let si = false;
    const d = abrirDialogo(`<p class="pregunta">${texto}</p><div class="acciones-form">
      <button class="b ${peligro ? 'peligro' : ''}" data-si>${ok}</button><button class="b g" data-cerrar>No</button></div>`, 'pequeno');
    d.querySelector('[data-si]').onclick = () => { si = true; d.close(); };
    d.addEventListener('close', () => res(si));
  });
}

// ---------- Campos de formulario ----------
const campo = (n, l, v = '', t = 'text', x = '') =>
  `<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" ${x}></label>`;
const texto = (n, l, v = '', x = '') => `<label>${l}<textarea name="${n}" rows="3" ${x}>${esc(v)}</textarea></label>`;
const opcionesSel = (lista, v, vacio) =>
  (vacio != null ? `<option value="">${esc(vacio)}</option>` : '') +
  lista.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('');
const selector = (n, l, lista, v, { vacio, x = '' } = {}) => {
  const conActual = v && !lista.includes(v) ? [...lista, v] : lista;
  return `<label>${l}<select name="${n}" ${x}>${opcionesSel(conActual, v, vacio)}</select></label>`;
};
// Botones de opción grandes (más rápido que un desplegable en el móvil)
const pastillas = (n, l, lista, v) => `<fieldset class="pastillas"><legend>${l}</legend>${lista.map((o) =>
  `<label><input type="radio" name="${n}" value="${esc(o)}" ${o === v ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</fieldset>`;
const hermanasSel = (v, n = 'hermana', l = 'Hermana') =>
  selector(n, l, st.S.hermanas || [], v, { vacio: '— Sin asignar —' });
function selectorActividad(v, { vacio = '— Solo visita —', soloActivas = true } = {}) {
  const lista = st.A.filter((a) => !soloActivas || a.activa || a.id === v);
  const grupos = AREAS.map((ar) => [ar, lista.filter((a) => a.area === ar)]).filter(([, l]) => l.length);
  const otras = lista.filter((a) => !AREAS.includes(a.area));
  if (otras.length) grupos.push(['Otras', otras]);
  return `<label>Actividad<select name="activity_id"><option value="">${vacio}</option>${grupos.map(([g, l]) =>
    `<optgroup label="${esc(g)}">${l.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((a) =>
      `<option value="${a.id}" ${a.id === v ? 'selected' : ''}>${esc(a.nombre)}${a.activa ? '' : ' (desactivada)'}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
}

// ---------------------------------------------------------------------
// Datos: guardar, borrar, sincronizar
// ---------------------------------------------------------------------
const CLAVE = { activities: 'A', events: 'E', logs: 'L' };
function aplicar(tabla, fila, borrar = false) {
  if (tabla === 'settings') { if (fila && !borrar) st.S = fila; return; }
  const k = CLAVE[tabla];
  if (!k || !fila) return;
  if (borrar) { st[k] = st[k].filter((x) => x.id !== fila.id); return; }
  const i = st[k].findIndex((x) => x.id === fila.id);
  if (i >= 0) st[k][i] = fila; else st[k].push(fila);
}
let renderPendiente = 0;
function pedirRender() {
  clearTimeout(renderPendiente);
  renderPendiente = setTimeout(render, 60);
}
async function guardar(tabla, filas, msg = 'Guardado') {
  try {
    const out = await api.upsert(tabla, filas);
    out.forEach((f) => aplicar(tabla, f));
    pedirRender();
    if (msg) aviso(msg);
    return out;
  } catch (e) { errorAviso(e); return null; }
}
async function borrar(tabla, id, msg = 'Borrado') {
  try {
    await api.remove(tabla, id);
    aplicar(tabla, { id }, true);
    pedirRender();
    aviso(msg);
    return true;
  } catch (e) { errorAviso(e); return false; }
}
async function recargar() {
  try {
    const d = await api.loadAll();
    st.A = d.A; st.E = d.E; st.L = d.L;
    st.S = d.S || st.S;
    pedirRender();
  } catch (e) { errorAviso(e); }
}

// ---------------------------------------------------------------------
// Arranque y rutas
// ---------------------------------------------------------------------
function ruta() {
  const qs = new URLSearchParams(location.search);
  if (qs.get('ver')) return { ver: qs.get('ver') };
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/');
  if (a === 'ver' && b) return { ver: decodeURIComponent(b) };
  if (a === 'entrar') return { entrar: true };
  return { tab: [...TABS.map((t) => t.k), 'ajustes'].includes(a) ? a : 'calendario' };
}

async function arrancar() {
  registrarSW();
  const r = ruta();
  if (r.ver) return vistaMadre(r.ver);
  if (!api) return pantallaSinConfigurar();
  let ses = null;
  try { ses = await api.session(); } catch (e) { console.warn(e); }
  if (!ses) {
    const tok = lsGet('dm-ver');
    if (tok && !r.entrar && !lsGet('dm-familia')) return vistaMadre(tok);
    return pantallaEntrar();
  }
  return iniciarApp();
}

function pantallaSinConfigurar() {
  cab.innerHTML = '';
  main.innerHTML = `<section class="portada"><img src="iconos/icono-192.png" alt="" width="96" height="96">
    <h1>Despierta Maruja</h1><div class="card"><p><b>Falta un paso de configuración.</b></p>
    <p>Hay que poner la dirección y la clave pública de Supabase en el archivo <code>js/config.js</code>.
    Sigue el paso 4 del README.</p></div></section>`;
}

function pantallaEntrar() {
  cab.innerHTML = '';
  main.innerHTML = `<section class="portada"><img src="iconos/icono-192.png" alt="" width="96" height="96">
    <h1>Despierta Maruja</h1><p class="mu">Escribe la contraseña de la familia</p>
    <form id="fentrar" class="card"><label>Contraseña<input type="password" name="pw" autocomplete="current-password" required></label>
    <p class="error-form" hidden></p><button class="b grande" type="submit">Entrar</button></form></section>`;
  const f = $('#fentrar');
  f.pw.focus();
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      await api.login(f.pw.value);
      lsSet('dm-familia', '1');
      if (ruta().entrar) history.replaceState(null, '', location.pathname + location.search);
      iniciarApp();
    } catch (err) {
      const p = f.querySelector('.error-form');
      p.textContent = /invalid|credentials/i.test(err.message) ? 'La contraseña no es correcta.' : 'No se ha podido entrar: ' + err.message;
      p.hidden = false; btn.disabled = false; btn.textContent = 'Entrar';
    }
  };
}

let iniciada = false;
async function iniciarApp() {
  if (iniciada) return;
  iniciada = true;
  document.body.classList.remove('madre');
  main.innerHTML = '<p class="cargando">Cargando…</p>';
  pintarCabecera();
  await recargar();
  api.subscribe((p) => {
    if (p.eventType === 'DELETE') aplicar(p.table, p.old, true);
    else aplicar(p.table, p.new);
    pedirRender();
  }, (status) => {
    $('#conexion')?.classList.toggle('off', status !== 'SUBSCRIBED');
    if (status === 'SUBSCRIBED') recargar(); // por si algo cambió mientras estaba desconectada
  });
  addEventListener('hashchange', render);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') recargar(); });
  addEventListener('online', () => { $('#conexion')?.classList.remove('off'); recargar(); });
  addEventListener('offline', () => { $('#conexion')?.classList.add('off'); aviso('Sin conexión a internet', 'error'); });
  render();
}

function pintarCabecera() {
  cab.innerHTML = `<div class="titulo"><a href="#/calendario" class="marca"><img src="iconos/favicon-32.png" alt="" width="26" height="26">Despierta Maruja</a>
    <span id="conexion" class="conexion" title="Conexión"></span>
    <a href="#/ajustes" class="ajustes" aria-label="Ajustes">⚙️</a></div><nav id="nav"></nav>`;
}

// ---------------------------------------------------------------------
// Render general
// ---------------------------------------------------------------------
function render() {
  const r = ruta();
  if (r.ver) { location.reload(); return; }
  ui.tab = r.tab;
  $('#nav').innerHTML = TABS.map((t) => `<a href="#/${t.k}" style="--c:${t.c}" class="${ui.tab === t.k ? 'on' : ''}"
    ${ui.tab === t.k ? 'aria-current="page"' : ''}><b aria-hidden="true">${t.i}</b>${t.t}</a>`).join('');
  // conservar el foco (p. ej. el buscador) al redibujar
  const act = document.activeElement;
  const foco = act && act.id && main.contains(act) ? { id: act.id, s: act.selectionStart } : null;
  ({ calendario: vCalendario, actividades: vActividades, registro: vRegistro, seguimiento: vSeguimiento, ajustes: vAjustes })[ui.tab]();
  if (foco) { const el = document.getElementById(foco.id); if (el) { el.focus(); try { el.setSelectionRange(foco.s, foco.s); } catch { /* no es texto */ } } }
}

// ---------------------------------------------------------------------
// Calendario
// ---------------------------------------------------------------------
function tarjetaEvento(e, { conFecha = false } = {}) {
  const pend = e.estado === 'Pendiente';
  const mod = D.claseMod(e.modalidad);
  return `<article class="card ${mod} ${pend ? '' : 'hecha'}">
    <div class="fila sp"><b>${conFecha ? `<span class="fecha-ev">${D.cap(D.fCorta(e.fecha))}</span> ` : ''}${e.hora ? esc(e.hora) + ' · ' : ''}${esc(e.nombre)}</b>
    <span class="tag est-${e.estado}">${e.estado === 'Realizada' ? '✔ ' : ''}${e.estado}</span></div>
    <div class="mu">${mod === 'acc' ? '👩' : '🏠'} ${esc(e.modalidad)} · ${e.hermana ? esc(e.hermana) : 'sin hermana asignada'}${e.duracion_min ? ` · ${e.duracion_min} min` : ''}</div>
    <div class="fila botones">
      ${pend ? `<button class="b s" data-a="ev-reg" data-id="${e.id}">✔ Registrar</button>
      <button class="b g s" data-a="ev-rep" data-id="${e.id}">📆 Reprogramar</button>
      <button class="b g s" data-a="ev-can" data-id="${e.id}">Cancelar</button>` : ''}
      <button class="b g s" data-a="ev-edit" data-id="${e.id}">Editar</button>
      <button class="b g s" data-a="ev-del" data-id="${e.id}" aria-label="Borrar">🗑</button>
    </div></article>`;
}
const linea = (txt, sub, clase = '') => `<div class="linea ${clase}"><span>${txt}</span><span class="mu">${sub}</span></div>`;

function ultimasRealizadas(n = 5) {
  const deLogs = st.L.filter((l) => l.realizacion !== 'No realizada')
    .map((l) => ({ nombre: l.nombre, fecha: l.fecha, hermana: l.hermana, txt: l.realizacion, orden: l.created_at || '' }));
  const conLog = new Set(st.L.map((l) => l.event_id).filter(Boolean));
  const deEventos = st.E.filter((e) => e.estado === 'Realizada' && !conLog.has(e.id))
    .map((e) => ({ nombre: e.nombre, fecha: e.fecha, hermana: e.hermana, txt: 'Realizada', orden: '' }));
  return [...deLogs, ...deEventos].sort((a, b) => (b.fecha + b.orden).localeCompare(a.fecha + a.orden)).slice(0, n);
}

function vCalendario() {
  const v = ui.vistaCal;
  const cabecera = `<div class="fila sp encabezado"><h1>Calendario</h1><button class="b" data-a="ev-new">+ Añadir</button></div>
    <div class="segmentos" role="tablist">${[['resumen', 'Resumen'], ['semana', 'Semana'], ['mes', 'Mes']].map(([k, t]) =>
    `<button role="tab" aria-selected="${v === k}" class="${v === k ? 'on' : ''}" data-a="vista" data-v="${k}">${t}</button>`).join('')}</div>`;
  main.innerHTML = cabecera + (v === 'semana' ? calSemana() : v === 'mes' ? calMes() : calResumen());
}

function calResumen() {
  const t = D.hoy(), fin = D.addDays(t, 6);
  const pend = st.E.filter((e) => e.estado === 'Pendiente').sort(porFechaHora);
  const atrasadas = pend.filter((e) => e.fecha < t);
  const prox = pend.filter((e) => e.fecha >= t && e.fecha <= fin);
  const porDia = {};
  prox.forEach((e) => (porDia[e.fecha] ||= []).push(e));
  const visitas = (st.S.hermanas || []).map((h) => {
    const p = pend.find((e) => e.fecha >= t && e.hermana === h && esVisita(e));
    return `<span class="chip">${esc(h)}: <b>${p ? (p.fecha === t ? 'hoy' : D.fCorta(p.fecha)) + (p.hora ? ' ' + esc(p.hora) : '') : '—'}</b></span>`;
  }).join('');
  const autonomas = pend.filter((e) => e.fecha >= t && !D.esAcompanada(e.modalidad)).slice(0, 8);
  const ult = ultimasRealizadas();
  return `
    ${visitas ? `<section><h2>Próxima visita de cada hermana</h2><div class="chips">${visitas}</div></section>` : ''}
    ${atrasadas.length ? `<section class="atrasadas"><h2>⚠️ Atrasadas (${atrasadas.length})</h2>
      <p class="mu">Ya pasó la fecha: regístralas, reprográmalas o cancélalas.</p>${atrasadas.map((e) => tarjetaEvento(e, { conFecha: true })).join('')}</section>` : ''}
    <section><h2>Próximos 7 días</h2>
    ${Object.keys(porDia).map((d) => `<h3>${nombreDia(d)}</h3>${porDia[d].map((e) => tarjetaEvento(e)).join('')}`).join('') ||
      '<p class="vacio">No hay nada previsto. Pulsa «+ Añadir» para programar una actividad o una visita.</p>'}</section>
    <section><h2>🏠 Lo que puede hacer ella sola</h2>
    ${autonomas.map((e) => linea(esc(e.nombre), `${D.fCorta(e.fecha)}${e.modalidad !== 'Autónoma' ? ' · con alguien cerca' : ''}`, D.claseMod(e.modalidad))).join('') ||
      '<p class="vacio">No hay actividades autónomas pendientes.</p>'}</section>
    <section><h2>✔ Últimas realizadas</h2>
    ${ult.map((l) => linea(esc(l.nombre), `${D.fCorta(l.fecha)} · ${esc(l.hermana || '—')} · ${esc(l.txt)}`)).join('') ||
      '<p class="vacio">Todavía no hay nada registrado.</p>'}</section>`;
}

function mini(e) {
  return `<button class="mini ${D.claseMod(e.modalidad)} est-${e.estado}" data-a="ev-ver" data-id="${e.id}">
    ${e.hora ? `<span class="h">${esc(e.hora)}</span> ` : ''}${esc(e.nombre)}${e.hermana ? ` <span class="mu">· ${esc(e.hermana)}</span>` : ''}</button>`;
}
const eventosDe = (f) => st.E.filter((e) => e.fecha === f && e.estado !== 'Cancelada').sort(porFechaHora);

function calSemana() {
  const ini = D.lunesDe(ui.cursor), fin = D.addDays(ini, 6), t = D.hoy();
  const dias = [...Array(7)].map((_, i) => D.addDays(ini, i));
  return `<div class="navcal"><button class="b g s" data-a="cal-mover" data-n="-7" aria-label="Semana anterior">◀</button>
    <b>${D.fDiaMes(ini)} – ${D.fDiaMes(fin)} ${fin.slice(0, 4)}</b>
    <button class="b g s" data-a="cal-mover" data-n="7" aria-label="Semana siguiente">▶</button>
    <button class="b g s" data-a="cal-hoy">Hoy</button></div>
    <div class="semana">${dias.map((d) => `<div class="dia ${d === t ? 'hoy' : ''}">
      <div class="fila sp"><b>${D.cap(D.fCorta(d))}</b><button class="b g s mas" data-a="ev-new" data-fecha="${d}" aria-label="Añadir el ${D.fLarga(d)}">+</button></div>
      ${eventosDe(d).map(mini).join('') || '<span class="mu">—</span>'}</div>`).join('')}</div>
    <p class="mu leyenda"><span class="punto acc"></span> Acompañada <span class="punto aut"></span> Autónoma <span class="punto sup"></span> Con supervisión ocasional · Las canceladas no se muestran.</p>`;
}

function calMes() {
  const m1 = ui.cursor.slice(0, 8) + '01', t = D.hoy();
  const sig = D.addMonths(m1, 1);
  let d = D.lunesDe(m1);
  const celdas = [];
  while (d < sig || celdas.length % 7) {
    const evs = eventosDe(d);
    const fuera = d < m1 || d >= sig;
    celdas.push(`<button class="celda ${fuera ? 'fuera' : ''} ${d === t ? 'hoy' : ''}" data-a="dia" data-fecha="${d}"
      aria-label="${D.fLarga(d)}: ${evs.length} actividades"><span class="num">${+d.slice(8)}</span>
      ${evs.slice(0, 3).map((e) => `<span class="chipmes ${D.claseMod(e.modalidad)} est-${e.estado}">${esc(e.hora ? e.hora + ' ' : '')}${esc(e.nombre)}</span>`).join('')}
      ${evs.length > 3 ? `<span class="mu mas3">+${evs.length - 3}</span>` : ''}</button>`);
    d = D.addDays(d, 1);
  }
  return `<div class="navcal"><button class="b g s" data-a="cal-mes" data-n="-1" aria-label="Mes anterior">◀</button>
    <b>${D.cap(D.fMes(m1))}</b><button class="b g s" data-a="cal-mes" data-n="1" aria-label="Mes siguiente">▶</button>
    <button class="b g s" data-a="cal-hoy">Hoy</button></div>
    <div class="mes"><div class="dsem">L</div><div class="dsem">M</div><div class="dsem">X</div><div class="dsem">J</div>
    <div class="dsem">V</div><div class="dsem">S</div><div class="dsem">D</div>${celdas.join('')}</div>
    <p class="mu leyenda">Toca un día para ver el detalle o añadir algo.</p>`;
}

function verDia(f) {
  const evs = st.E.filter((e) => e.fecha === f).sort(porFechaHora);
  abrirDialogo(`<h2>${nombreDia(f)}</h2>${evs.map((e) => tarjetaEvento(e)).join('') || '<p class="vacio">Nada previsto este día.</p>'}
    <div class="acciones-form"><button class="b" data-a="ev-new" data-fecha="${f}">+ Añadir este día</button>
    <button class="b g" data-cerrar>Cerrar</button></div>`, 'auto-cierra');
}

async function formEvento(e = {}) {
  const nuevo = !e.id;
  const o = await pedir(nuevo ? 'Nueva actividad o visita' : 'Editar', `
    <div class="grid">${campo('fecha', 'Día', e.fecha || D.hoy(), 'date', 'required')}${campo('hora', 'Hora', e.hora ?? '17:00', 'time')}</div>
    ${selectorActividad(e.activity_id || '')}
    ${pastillas('modalidad', 'Modalidad', MODS, e.modalidad || 'Acompañada')}
    ${hermanasSel(e.hermana || '', 'hermana', 'Hermana responsable')}
    <div class="grid">${campo('duracion_min', 'Duración (min)', e.duracion_min ?? 30, 'number', 'min="0" max="600" inputmode="numeric"')}
    ${selector('estado', 'Estado', ESTADOS, e.estado || 'Pendiente')}</div>`, {
    alAbrir: (f) => {
      f.activity_id.addEventListener('change', () => {
        const a = actividad(f.activity_id.value);
        if (!a) return;
        const r = f.querySelector(`input[name=modalidad][value="${a.modalidad}"]`);
        if (r) r.checked = true;
        const n = D.aEntero(a.duracion);
        if (n) f.duracion_min.value = n;
      });
    },
  });
  if (!o) return;
  const a = actividad(o.activity_id);
  const nombre = a ? (a.id === e.activity_id && e.nombre ? e.nombre : a.nombre) : (!e.activity_id && e.nombre ? e.nombre : 'Visita');
  await guardar('events', {
    id: e.id || uuid(), fecha: o.fecha, hora: o.hora || '', activity_id: a ? a.id : null,
    nombre, area: a ? (a.id === e.activity_id && e.area ? e.area : a.area) : '',
    modalidad: o.modalidad || 'Acompañada', hermana: o.hermana || '',
    duracion_min: D.aEntero(o.duracion_min), estado: o.estado || 'Pendiente',
  }, nuevo ? 'Programado' : 'Guardado');
}

async function reprogramar(e) {
  const o = await pedir('Reprogramar: ' + esc(e.nombre), `<div class="grid">${campo('fecha', 'Nuevo día', e.fecha, 'date', 'required')}
    ${campo('hora', 'Hora', e.hora, 'time')}</div>`, { ok: 'Reprogramar' });
  if (o) await guardar('events', { ...e, fecha: o.fecha, hora: o.hora || '', estado: 'Pendiente' }, 'Reprogramado para el ' + D.fLarga(o.fecha));
}

// ---------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------
async function formRegistro(e = null) {
  const a = e ? actividad(e.activity_id) : null;
  const o = await pedir(e ? 'Registrar: ' + esc(e.nombre) : 'Nuevo registro', `
    ${e ? '' : selectorActividad('', { vacio: '— Elige la actividad —', soloActivas: false }) + pastillas('modalidad', 'Modalidad', MODS, 'Acompañada')}
    <div class="grid">${campo('fecha', 'Fecha', e && e.fecha <= D.hoy() ? e.fecha : D.hoy(), 'date', 'required')}${hermanasSel(e?.hermana || '')}</div>
    ${campo('duracion_real_min', 'Duración real (min)', e?.duracion_min ?? '', 'number', 'min="0" max="600" inputmode="numeric"')}
    ${pastillas('realizacion', 'Realización', REAL, 'Completa')}
    ${pastillas('participacion', 'Participación', PART, 'Activa')}
    ${pastillas('ayuda', 'Ayuda necesaria', AYUDA, 'Ninguna')}
    ${pastillas('dificultad_percibida', 'Dificultad percibida', DIFP, 'Adecuada')}
    ${pastillas('gusto', '¿Le ha gustado?', GUSTO, 'Sí')}
    ${pastillas('proxima_vez', 'Próxima vez', PROX, 'Repetir')}
    ${texto('observaciones', '🔒 Observaciones (privadas: solo las veis las hermanas)')}`, {
    validar: (o) => (!e && !o.activity_id ? 'Elige la actividad.' : null),
    alAbrir: (f) => {
      f.activity_id?.addEventListener('change', () => {
        const x = actividad(f.activity_id.value);
        const r = x && f.querySelector(`input[name=modalidad][value="${x.modalidad}"]`);
        if (r) r.checked = true;
      });
    },
  });
  if (!o) return;
  const act = e ? a : actividad(o.activity_id);
  const ok = await guardar('logs', {
    id: uuid(), event_id: e?.id || null, activity_id: act?.id || e?.activity_id || null,
    nombre: e?.nombre || act?.nombre || '', area: e?.area || act?.area || '',
    modalidad: e?.modalidad || o.modalidad || act?.modalidad || '', fecha: o.fecha, hermana: o.hermana || '',
    duracion_real_min: D.aEntero(o.duracion_real_min), realizacion: o.realizacion, participacion: o.participacion || '',
    ayuda: o.ayuda || '', dificultad_percibida: o.dificultad_percibida || '', gusto: o.gusto || '',
    observaciones: o.observaciones || '', proxima_vez: o.proxima_vez || '',
  }, 'Registro guardado');
  if (!ok || !e) return;
  if (o.realizacion !== 'No realizada') {
    await guardar('events', { ...e, estado: 'Realizada' }, null);
  } else if (await confirmar('No se ha podido hacer. ¿Quieres reprogramarla para otro día?', { ok: 'Reprogramar' })) {
    await reprogramar(e);
  }
}

function vRegistro() {
  const L = [...st.L].sort((a, b) => (b.fecha + (b.created_at || '')).localeCompare(a.fecha + (a.created_at || '')));
  main.innerHTML = `<div class="fila sp encabezado"><h1>Registro</h1><button class="b" data-a="log-new">+ Nuevo registro</button></div>
    <p class="mu">Para registrar algo programado, usa «✔ Registrar» en el calendario.</p>
    ${L.map((l) => `<article class="card ${D.claseMod(l.modalidad)}">
      <div class="fila sp"><b>${esc(l.nombre || '(sin nombre)')}</b><span class="mu">${D.cap(D.fCorta(l.fecha))}</span></div>
      <div class="mu">${esc(l.hermana || '—')}${l.duracion_real_min ? ` · ${l.duracion_real_min} min` : ''}</div>
      <div class="chips">${[l.realizacion, l.participacion, l.ayuda && 'Ayuda: ' + l.ayuda, l.dificultad_percibida && 'Dificultad: ' + l.dificultad_percibida,
        l.gusto && 'Le gustó: ' + l.gusto, l.proxima_vez && 'Próxima vez: ' + l.proxima_vez].filter(Boolean).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>
      ${l.observaciones ? `<p class="obs">🔒 ${esc(l.observaciones)}</p>` : ''}
      <div class="fila botones"><button class="b g s" data-a="log-del" data-id="${l.id}" aria-label="Borrar registro">🗑 Borrar</button></div></article>`).join('') ||
      '<p class="vacio">Todavía no hay registros.</p>'}
    <section class="card"><h2>💾 Copia de seguridad</h2><p class="mu">Descarga todo (actividades, calendario y registros) en un Excel. Guárdalo en un sitio seguro.</p>
    <div class="fila"><button class="b g" data-a="exp-copia">Descargar copia</button>
    <label class="b g">Restaurar copia<input type="file" accept=".xlsx" hidden data-importar></label></div></section>`;
}

// ---------------------------------------------------------------------
// Actividades
// ---------------------------------------------------------------------
function vActividades() {
  main.innerHTML = `<div class="fila sp encabezado"><h1>Actividades</h1><button class="b" data-a="act-new">+ Nueva</button></div>
    <div class="fila"><label class="b g">📥 Importar Excel<input type="file" accept=".xlsx" hidden data-importar></label>
    <button class="b g" data-a="exp-cat">📤 Exportar catálogo</button></div>
    <input id="q" type="search" placeholder="🔍 Buscar por nombre, instrucciones o material" value="${esc(ui.q)}" aria-label="Buscar">
    <div class="filtros"><select id="fa" aria-label="Área">${opcionesSel(AREAS, ui.fa, 'Todas las áreas')}</select>
    <select id="fm" aria-label="Modalidad">${opcionesSel(MODS, ui.fm, 'Toda modalidad')}</select>
    <select id="fd" aria-label="Dificultad">${opcionesSel(DIFS, ui.fd, 'Toda dificultad')}</select></div>
    <div id="lista"></div>`;
  pintarLista();
  $('#q').oninput = (e) => { ui.q = e.target.value; pintarLista(); };
  for (const k of ['fa', 'fm', 'fd']) $('#' + k).onchange = (e) => { ui[k] = e.target.value; pintarLista(); };
}
function pintarLista() {
  const q = ui.q.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const r = st.A.filter((a) => (!ui.fa || a.area === ui.fa) && (!ui.fm || a.modalidad === ui.fm) && (!ui.fd || a.dificultad === ui.fd) &&
    (!q || norm(a.nombre + ' ' + a.instrucciones + ' ' + a.materiales + ' ' + a.capacidades).includes(q)))
    .sort((a, b) => (b.activa - a.activa) || a.id.localeCompare(b.id));
  $('#lista').innerHTML = `<p class="mu">${r.length} de ${st.A.length} actividades</p>` + (r.map((a) => `
    <article class="card ${D.claseMod(a.modalidad)} ${a.activa ? '' : 'hecha'}">
      <div class="fila sp"><b>${esc(a.nombre)}</b><span class="tag">${a.activa ? esc(a.modalidad) : 'Desactivada'}</span></div>
      <div class="mu">${esc(a.id)} · ${esc(a.area)}</div>
      <div class="mu">${a.duracion ? `⏱ ${esc(a.duracion)} min · ` : ''}${esc(a.dificultad || '—')} · ${esc(a.contexto || '')}</div>
      <details><summary>Ver instrucciones</summary>${a.instrucciones ? `<p>${esc(a.instrucciones)}</p>` : ''}
        ${a.materiales ? `<p class="mu"><b>Material:</b> ${esc(a.materiales)}</p>` : ''}
        ${a.capacidades ? `<p class="mu"><b>Capacidades:</b> ${esc(a.capacidades)}</p>` : ''}
        ${a.objetivo ? `<p class="mu"><b>Objetivo:</b> ${esc(a.objetivo)}</p>` : ''}</details>
      <div class="fila botones">${a.activa ? `<button class="b s" data-a="act-plan" data-id="${a.id}">📅 Programar</button>` : ''}
        <button class="b g s" data-a="act-edit" data-id="${a.id}">Editar</button>
        <button class="b g s" data-a="act-dup" data-id="${a.id}">Duplicar</button>
        <button class="b g s" data-a="act-tog" data-id="${a.id}">${a.activa ? 'Desactivar' : 'Activar'}</button>
        <button class="b g s" data-a="act-del" data-id="${a.id}" aria-label="Borrar">🗑</button></div>
    </article>`).join('') || (st.A.length ? '<p class="vacio">Ninguna actividad coincide con la búsqueda.</p>'
    : '<p class="vacio">El catálogo está vacío. Pulsa «📥 Importar Excel» y elige el archivo BASE_DATOS_DESPIERTA_MARUJA.xlsx.</p>'));
}

async function formActividad(a = {}) {
  const nuevo = !a.id;
  const o = await pedir(nuevo ? 'Nueva actividad' : `Editar ${esc(a.id)}`, `
    ${campo('nombre', 'Nombre', a.nombre, 'text', 'required')}
    ${selector('area', 'Área de trabajo', AREAS, a.area || AREAS[0])}
    ${pastillas('modalidad', 'Modalidad', MODS, a.modalidad || 'Acompañada')}
    <div class="grid">${selector('dificultad', 'Dificultad', DIFS, a.dificultad || 'Fácil')}
    ${campo('duracion', 'Duración (min, p. ej. 15–30)', a.duracion)}</div>
    ${pastillas('contexto', 'Contexto', CONTEXTOS, a.contexto || 'En casa')}
    ${texto('instrucciones', 'Instrucciones', a.instrucciones)}
    ${campo('materiales', 'Material', a.materiales)}${campo('capacidades', 'Capacidades implicadas', a.capacidades)}
    ${campo('objetivo', 'Objetivo (opcional)', a.objetivo)}`);
  if (!o) return;
  await guardar('activities', {
    id: a.id || D.siguienteId(st.A), nombre: o.nombre, area: o.area, modalidad: o.modalidad, dificultad: o.dificultad,
    duracion: o.duracion, contexto: o.contexto, instrucciones: o.instrucciones, materiales: o.materiales,
    capacidades: o.capacidades, objetivo: o.objetivo, activa: a.activa ?? true,
  }, nuevo ? 'Actividad creada' : 'Guardado');
}

const sinCamposBD = ({ created_at, updated_at, ...resto }) => resto;

async function borrarActividad(a) {
  const usada = st.E.some((e) => e.activity_id === a.id) || st.L.some((l) => l.activity_id === a.id);
  if (usada) {
    if (await confirmar(`«${esc(a.nombre)}» ya tiene actividades programadas o registros, así que no se puede borrar sin perder historial.<br><br>¿Prefieres <b>desactivarla</b>? Dejará de aparecer para programar, pero el historial se conserva.`, { ok: 'Desactivar' })) {
      await guardar('activities', { ...sinCamposBD(a), activa: false }, 'Actividad desactivada');
    }
  } else if (await confirmar(`¿Borrar «${esc(a.nombre)}» del catálogo? No se puede deshacer.`, { ok: 'Borrar', peligro: true })) {
    await borrar('activities', a.id, 'Actividad borrada');
  }
}

// ---------------------------------------------------------------------
// Importar / exportar
// ---------------------------------------------------------------------
async function importar(file) {
  if (!file) return;
  aviso('Leyendo el archivo…', 'ok', 1500);
  let plan;
  try { plan = await analizarExcel(file, st); } catch (e) { errorAviso(new Error('No se ha podido leer el Excel (' + e.message + ')')); return; }
  const copia = plan.tipo === 'copia';
  const nada = !plan.actividades.length && !plan.eventos.length && !plan.registros.length;
  const errs = plan.errores;
  const d = abrirDialogo(`<h2>${copia ? 'Restaurar copia de seguridad' : 'Importar Excel'}</h2>
    <p class="mu">Archivo: ${esc(file.name)}</p>
    <ul class="resumen">
      <li>📚 Actividades nuevas: <b>${plan.nuevas}</b></li>
      <li>✏️ Actividades que se actualizan: <b>${plan.actualizadas}</b></li>
      ${copia ? `<li>📅 Eventos del calendario: <b>${plan.eventos.length}</b></li>` : ''}
      ${plan.registros.length ? `<li>📝 Registros: <b>${plan.registros.length}</b>${copia ? '' : ' (hoja Registro)'}</li>` : ''}
      ${plan.hermanas ? `<li>👩 Hermanas: ${plan.hermanas.map(esc).join(', ')}</li>` : ''}
      <li class="${errs.length ? 'con-error' : ''}">⚠️ Filas con errores (no se importan): <b>${errs.length}</b></li>
    </ul>
    ${errs.length ? `<details ${errs.length < 6 ? 'open' : ''}><summary>Ver errores</summary><ul class="errores">${errs.slice(0, 50).map((x) =>
      `<li>Hoja ${esc(x.hoja)}, fila ${x.fila}: ${esc(x.motivo)}</li>`).join('')}${errs.length > 50 ? `<li>… y ${errs.length - 50} más</li>` : ''}</ul></details>` : ''}
    ${copia ? '<p class="nota">Los datos del archivo sustituyen a los que tengan el mismo identificador. Lo demás se conserva.</p>' : ''}
    ${!copia && plan.registros.length ? '<label class="check"><input type="checkbox" id="conreg" checked> Importar también los registros de la hoja Registro</label>' : ''}
    <div class="acciones-form"><button class="b" data-ok ${nada ? 'disabled' : ''}>${copia ? 'Restaurar' : 'Importar'}</button>
    <button class="b g" data-cerrar>Cancelar</button></div>`);
  d.querySelector('[data-ok]').onclick = async (ev) => {
    const conReg = copia || d.querySelector('#conreg')?.checked;
    ev.target.disabled = true; ev.target.textContent = 'Guardando…';
    const okA = !plan.actividades.length || await guardar('activities', plan.actividades, null);
    const okE = okA && (!plan.eventos.length || await guardar('events', plan.eventos, null));
    const okL = okE && (!conReg || !plan.registros.length || await guardar('logs', plan.registros, null));
    if (okL && plan.hermanas) { try { aplicar('settings', await api.saveSettings({ hermanas: plan.hermanas })); } catch (e) { errorAviso(e); } }
    d.close();
    if (okL) aviso(copia ? 'Copia restaurada' : `Importadas ${plan.actividades.length} actividades${conReg && plan.registros.length ? ` y ${plan.registros.length} registros` : ''}`, 'ok', 4000);
    pedirRender();
  };
}

const LISTAS_EXCEL = {
  'Áreas de trabajo': AREAS, Modalidades: MODS, Dificultad: DIFS, Contexto: CONTEXTOS, Realización: REAL,
  'Escala de participación': PART, 'Escala de ayuda': AYUDA, 'Dificultad percibida': DIFP, Gusto: GUSTO, 'Próxima vez': PROX,
};
async function exportar(tipo) {
  try {
    aviso('Preparando el Excel…', 'ok', 1500);
    if (tipo === 'cat') await exportarCatalogo(st.A, LISTAS_EXCEL);
    else await exportarCopia(st);
  } catch (e) { errorAviso(e); }
}

// ---------------------------------------------------------------------
// Seguimiento
// ---------------------------------------------------------------------
function contar(arr, f) {
  const m = new Map();
  arr.forEach((x) => { const k = f(x); if (k) m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
function barras(lista, { orden = false, color = 'var(--ac)' } = {}) {
  if (!lista.length) return '<p class="vacio">Sin datos todavía.</p>';
  const mx = Math.max(1, ...lista.map((x) => x[1]));
  return `<div class="barras">${(orden ? lista : lista).map(([k, v]) => `<div class="barra-fila"><span class="etq">${esc(k)}</span>
    <span class="barra"><span style="width:${(v / mx) * 100}%;background:${color}"></span></span><b>${v}</b></div>`).join('')}</div>`;
}
function vSeguimiento() {
  const t = D.hoy();
  const hechas = st.L.filter((l) => l.realizacion !== 'No realizada');
  const hace7 = D.addDays(t, -6), mesIni = t.slice(0, 8) + '01';
  const semanas = [...Array(8)].map((_, i) => D.addDays(D.lunesDe(t), -7 * (7 - i)));
  const porSemana = semanas.map((s) => [`Semana del ${D.fDiaMes(s)}`, hechas.filter((l) => l.fecha >= s && l.fecha <= D.addDays(s, 6)).length]);
  const meses = [...Array(6)].map((_, i) => D.addMonths(mesIni, i - 5));
  const porMes = meses.map((m) => [D.cap(D.fMes(m)), hechas.filter((l) => l.fecha.slice(0, 7) === m.slice(0, 7)).length]);
  const visitas = st.E.filter((e) => esVisita(e) && e.estado !== 'Cancelada');
  main.innerHTML = `<h1>Seguimiento</h1>
    <div class="cifras"><div><b>${hechas.filter((l) => l.fecha >= hace7 && l.fecha <= t).length}</b><span>Últimos 7 días</span></div>
    <div><b>${hechas.filter((l) => l.fecha >= mesIni && l.fecha <= t).length}</b><span>En ${D.fMes(t).split(' ')[0]}</span></div>
    <div><b>${hechas.length}</b><span>En total</span></div></div>
    <p class="mu">Se cuentan los registros completos o parciales.</p>
    <h2>Por semana (últimas 8)</h2>${barras(porSemana)}
    <h2>Por mes (últimos 6)</h2>${barras(porMes)}
    <h2>Por área</h2>${barras(contar(hechas, (l) => l.area))}
    <h2>Autónomas y acompañadas</h2>${barras(MODS.map((m) => [m, hechas.filter((l) => l.modalidad === m).length]), { color: 'var(--aut)' })}
    <h2>Visitas programadas por hermana</h2>${barras(contar(visitas, (e) => e.hermana), { color: 'var(--reg)' })}
    <h2>Registros por hermana</h2>${barras(contar(st.L, (l) => l.hermana), { color: 'var(--reg)' })}
    <h2>Las que más le gustan</h2>${barras(contar(st.L.filter((l) => l.gusto === 'Sí'), (l) => l.nombre).slice(0, 6), { color: 'var(--seg)' })}
    <h2>Las que requieren más ayuda</h2>${barras(contar(st.L.filter((l) => ['Ayuda frecuente', 'Acompañamiento continuo'].includes(l.ayuda)), (l) => l.nombre).slice(0, 6), { color: 'var(--seg)' })}
    <p class="nota">Estos datos sirven para organizarnos en familia. No son una valoración médica ni una prueba.</p>`;
}

// ---------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------
const enlaceMadre = () => st.S.share_token ? `${location.origin}${location.pathname}#/ver/${st.S.share_token}` : '';
function vAjustes() {
  const h = st.S.hermanas || [];
  main.innerHTML = `<h1>Ajustes</h1>
    <section class="card"><h2>👩 Hermanas</h2><p class="mu">Estos nombres salen en los desplegables.</p>
    <form id="fherm">${[...h, '', ''].slice(0, Math.max(4, h.length + 1)).map((x, i) => `<input name="h${i}" value="${esc(x)}" placeholder="Nombre" aria-label="Hermana ${i + 1}">`).join('')}
    <button class="b">Guardar nombres</button></form></section>
    <section class="card"><h2>👵 Enlace para mamá</h2>
    <p class="mu">Con este enlace ve sus próximas visitas y actividades, sin contraseña y sin poder cambiar nada. No ve observaciones ni registros.</p>
    <input id="enlace" readonly value="${esc(enlaceMadre())}" aria-label="Enlace para mamá">
    <div class="fila"><button class="b" data-a="enl-copiar">Copiar enlace</button><a class="b g" href="${esc(enlaceMadre())}" target="_blank" rel="noopener">Abrir</a>
    <button class="b g" data-a="enl-regen">Cambiar enlace</button></div></section>
    <section class="card"><h2>💾 Copia de seguridad</h2><div class="fila"><button class="b g" data-a="exp-copia">Descargar copia</button>
    <label class="b g">Restaurar copia<input type="file" accept=".xlsx" hidden data-importar></label></div></section>
    <section class="card"><h2>🔑 Contraseña de la familia</h2><p class="mu">Al cambiarla, avisad a todas las hermanas. Los dispositivos que ya han entrado siguen dentro.</p>
    <button class="b g" data-a="pw">Cambiar contraseña</button></section>
    <section class="card"><h2>🚪 Salir</h2><p class="mu">Cierra la sesión en este dispositivo (por ejemplo, si no es tuyo).</p>
    <button class="b g" data-a="salir">Cerrar sesión</button></section>
    <p class="nota">Despierta Maruja guarda solo actividades, fechas, visitas y registros, en servidores de la Unión Europea (Supabase, Frankfurt). No guarda datos médicos.</p>`;
  $('#fherm').onsubmit = async (e) => {
    e.preventDefault();
    const nombres = [...new FormData(e.target).values()].map((v) => v.trim()).filter(Boolean);
    try { aplicar('settings', await api.saveSettings({ hermanas: [...new Set(nombres)] })); aviso('Nombres guardados'); render(); } catch (err) { errorAviso(err); }
  };
}

// ---------------------------------------------------------------------
// Acciones (un solo manejador de clics para toda la app)
// ---------------------------------------------------------------------
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-a]');
  if (!b) return;
  const a = b.dataset.a, id = b.dataset.id;
  const dlg = b.closest('dialog.auto-cierra');
  if (dlg) dlg.close();
  const e = st.E.find((x) => x.id === id);
  const ac = actividad(id);
  const l = st.L.find((x) => x.id === id);
  switch (a) {
    case 'vista': ui.vistaCal = b.dataset.v; lsSet('dm-vista-cal', ui.vistaCal); render(); break;
    case 'cal-mover': ui.cursor = D.addDays(ui.cursor, +b.dataset.n); render(); break;
    case 'cal-mes': ui.cursor = D.addMonths(ui.cursor, +b.dataset.n); render(); break;
    case 'cal-hoy': ui.cursor = D.hoy(); render(); break;
    case 'dia': verDia(b.dataset.fecha); break;
    case 'ev-ver': if (e) abrirDialogo(tarjetaEvento(e, { conFecha: true }) + '<div class="acciones-form"><button class="b g" data-cerrar>Cerrar</button></div>', 'auto-cierra'); break;
    case 'ev-new': formEvento(b.dataset.fecha ? { fecha: b.dataset.fecha } : {}); break;
    case 'ev-edit': if (e) formEvento(e); break;
    case 'ev-rep': if (e) reprogramar(e); break;
    case 'ev-reg': if (e) formRegistro(e); break;
    case 'ev-can': if (e && await confirmar(`¿Cancelar «${esc(e.nombre)}» del ${D.fLarga(e.fecha)}?`, { ok: 'Sí, cancelar' })) guardar('events', { ...e, estado: 'Cancelada' }, 'Cancelada'); break;
    case 'ev-del': if (e && await confirmar(`¿Borrar «${esc(e.nombre)}» del ${D.fLarga(e.fecha)}? No se puede deshacer.`, { ok: 'Borrar', peligro: true })) borrar('events', e.id); break;
    case 'log-new': formRegistro(); break;
    case 'log-del': if (l && await confirmar(`¿Borrar el registro de «${esc(l.nombre)}» del ${D.fLarga(l.fecha)}? No se puede deshacer.`, { ok: 'Borrar', peligro: true })) borrar('logs', l.id, 'Registro borrado'); break;
    case 'act-new': formActividad(); break;
    case 'act-edit': if (ac) formActividad(ac); break;
    case 'act-dup': if (ac) guardar('activities', { ...sinCamposBD(ac), id: D.siguienteId(st.A), nombre: ac.nombre + ' (copia)', activa: true }, 'Duplicada'); break;
    case 'act-tog': if (ac) guardar('activities', { ...sinCamposBD(ac), activa: !ac.activa }, ac.activa ? 'Desactivada' : 'Activada'); break;
    case 'act-del': if (ac) borrarActividad(ac); break;
    case 'act-plan': if (ac) formEvento({ activity_id: ac.id, modalidad: ac.modalidad, duracion_min: D.aEntero(ac.duracion) ?? 30 }); break;
    case 'exp-cat': exportar('cat'); break;
    case 'exp-copia': exportar('copia'); break;
    case 'enl-copiar':
      try { await navigator.clipboard.writeText(enlaceMadre()); aviso('Enlace copiado'); } catch { $('#enlace').select(); aviso('Selecciónalo y cópialo a mano', 'error'); }
      break;
    case 'enl-regen':
      if (await confirmar('¿Cambiar el enlace de mamá? El enlace actual dejará de funcionar y tendrás que enviarle el nuevo.', { ok: 'Cambiar enlace' })) {
        try { const tok = await api.regenToken(); st.S = { ...st.S, share_token: tok }; render(); aviso('Enlace nuevo creado. Envíaselo a mamá.', 'ok', 4000); } catch (err) { errorAviso(err); }
      }
      break;
    case 'pw': {
      const o = await pedir('Cambiar contraseña', `${campo('p1', 'Nueva contraseña', '', 'password', 'required minlength="8" autocomplete="new-password"')}
        ${campo('p2', 'Repítela', '', 'password', 'required autocomplete="new-password"')}`, {
        ok: 'Cambiar', validar: (o) => (o.p1.length < 8 ? 'Mínimo 8 caracteres.' : o.p1 !== o.p2 ? 'Las dos contraseñas no coinciden.' : null),
      });
      if (o) { try { await api.changePassword(o.p1); aviso('Contraseña cambiada. Avisa a tus hermanas.', 'ok', 4000); } catch (err) { errorAviso(err); } }
      break;
    }
    case 'salir':
      if (await confirmar('¿Cerrar la sesión en este dispositivo?')) { await api.logout(); lsSet('dm-familia', null); location.hash = ''; location.reload(); }
      break;
  }
});
document.addEventListener('change', (ev) => {
  if (ev.target.matches('input[data-importar]')) { importar(ev.target.files[0]); ev.target.value = ''; }
});

// ---------------------------------------------------------------------
// Vista de la madre (solo lectura)
// ---------------------------------------------------------------------
function saludo() {
  const h = +new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: 'numeric', hourCycle: 'h23' }).format(new Date());
  return h >= 6 && h < 14 ? '¡Buenos días' : h >= 14 && h < 21 ? '¡Buenas tardes' : '¡Buenas noches';
}
async function vistaMadre(token) {
  document.body.classList.add('madre');
  cab.innerHTML = '';
  lsSet('dm-ver', token);
  if (!location.hash.startsWith('#/ver/')) history.replaceState(null, '', location.pathname + '#/ver/' + encodeURIComponent(token));
  const pintar = async () => {
    let d;
    try { d = api ? await api.vistaMadre(token) : { ok: false }; } catch (e) {
      console.error(e);
      if (!main.querySelector('.madre-vista')) main.innerHTML = '<section class="madre-vista"><h1>Despierta Maruja</h1><p>Ahora mismo no hay conexión. Vuelve a intentarlo en un rato.</p></section>';
      return;
    }
    if (!d.ok) {
      lsSet('dm-ver', null);
      main.innerHTML = `<section class="madre-vista"><h1>Despierta Maruja</h1><p class="grande">Este enlace ya no funciona.</p>
        <p>Pide uno nuevo a tus hijas. 💛</p><p class="pie"><a href="#/entrar">Soy una de las hijas: entrar</a></p></section>`;
      return;
    }
    const t = d.hoy, E = d.eventos;
    const deHoy = E.filter((e) => e.fecha === t);
    const visitas = E.filter((e) => e.estado === 'Pendiente' && e.fecha > t && e.fecha <= D.addDays(t, 14) && D.esAcompanada(e.modalidad));
    const sola = E.filter((e) => e.estado === 'Pendiente' && e.fecha > t && e.fecha <= D.addDays(t, 7) && !D.esAcompanada(e.modalidad));
    const hecho = E.filter((e) => e.estado === 'Realizada' && e.fecha < t).reverse().slice(0, 10);
    const item = (e, conDia = true) => `<li class="${D.claseMod(e.modalidad)} ${e.estado === 'Realizada' ? 'hecha' : ''}">
      ${conDia ? `<span class="cuando">${D.cap(D.fLarga(e.fecha))}${e.hora ? ' · ' + esc(e.hora) : ''}</span>` : e.hora ? `<span class="cuando">${esc(e.hora)}</span>` : ''}
      <span class="que">${e.estado === 'Realizada' ? '✔ ' : ''}${esc(e.nombre)}</span><span class="quien">${esc(D.textoModalidad(e))}</span></li>`;
    main.innerHTML = `<section class="madre-vista">
      <h1>${saludo()}, Maruja! ${saludo().includes('noches') ? '🌙' : '🌞'}</h1><p class="grande">Hoy es <b>${D.fLarga(t)}</b></p>
      <h2>Hoy</h2>${deHoy.length ? `<ul>${deHoy.map((e) => item(e, false)).join('')}</ul>` : '<p>Hoy no hay nada previsto. ¡Día libre!</p>'}
      <h2>👩 Quién viene a verte</h2>${visitas.length ? `<ul>${visitas.map((e) => item(e)).join('')}</ul>` : '<p>Tus hijas aún no han apuntado la próxima visita.</p>'}
      <h2>🏠 Lo que puedes hacer tú</h2>${sola.length ? `<ul>${sola.map((e) => item(e)).join('')}</ul>` : '<p>Esta semana no hay nada apuntado.</p>'}
      <h2>✔ Lo que hemos hecho</h2>${hecho.length ? `<ul>${hecho.map((e) => item(e)).join('')}</ul>` : '<p>Todavía nada estos días.</p>'}
      <p class="pie"><a href="#/entrar">Soy una de las hijas: entrar</a></p></section>`;
  };
  await pintar();
  setInterval(pintar, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pintar(); });
  addEventListener('hashchange', () => { if (!location.hash.startsWith('#/ver/')) location.reload(); });
}

// ---------------------------------------------------------------------
// Aplicación instalable: avisar cuando haya versión nueva
// ---------------------------------------------------------------------
function registrarSW() {
  if (!('serviceWorker' in navigator) || window.__DM_API__) return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const avisar = (w) => banner('✨ Hay una versión nueva. Toca aquí para actualizar.', () => w.postMessage('activar'));
    if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) avisar(w); });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch((e) => console.warn('Service worker', e));
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargando) { recargando = true; location.reload(); } });
}

arrancar();
