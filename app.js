/* ============================================================
   SISTEMA DE ASISTENCIA · CGBVP COMPAÑÍA ANCÓN N.° 163
   Portal del usuario + Panel administrativo
   Funciona en MODO DEMO (localStorage) o con FIREBASE.
   ============================================================ */
'use strict';

/* ==================== UTILIDADES ==================== */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); };
const nowTime  = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fechaNice = iso => { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('es-PE', { weekday:'short', day:'numeric', month:'short', year:'numeric' }); };
const fechaCorta = iso => { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' }); };
const mesNombre = (y, m) => new Date(y, m, 1).toLocaleDateString('es-PE', { month:'long', year:'numeric' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fullName = u => ((u.nombres || '') + ' ' + (u.apellidos || '')).trim() || u.username;
const CAT_LABEL = { postulante:'Postulante', aspirante:'Aspirante', administrador:'Administrador' };

function toast(msg, tipo) {
  const t = document.createElement('div');
  t.className = 'toast ' + (tipo || 'info');
  t.textContent = msg;
  $('#toast-root').appendChild(t);
  setTimeout(() => t.classList.add('show'), 20);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3200);
}

function openModal(html, maxW) {
  const root = $('#modal-root');
  root.innerHTML = '<div class="modal-overlay" onclick="if(event.target===this)closeModal()">' +
    '<div class="modal" style="max-width:' + (maxW || '520px') + '">' + html + '</div></div>';
  document.body.style.overflow = 'hidden';
}
function closeModal() { $('#modal-root').innerHTML = ''; document.body.style.overflow = ''; }

/* ==================== LOGO INSTITUCIONAL ==================== */
function logoHTML(size) {
  return (window.LOGO_URL && String(window.LOGO_URL).trim())
    ? '<img src="' + esc(window.LOGO_URL) + '" alt="logo" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;border-radius:10px;background:#fff;padding:3px">'
    : '🚒';
}
function applyLogo() { const b = $('#brand-logo'); if (b) b.innerHTML = logoHTML(36); }

/* ==================== VISOR DE FOTOS Y ARCHIVOS ==================== */
const PHOTO_MAP = {};
window.regPhoto = function(key, url) { PHOTO_MAP[key] = url; };
window.openPhotoKey = function(key) {
  const url = PHOTO_MAP[key];
  if (!url) { toast('No se encontró la imagen.', 'error'); return; }
  openModal('<div style="text-align:center"><img src="' + url + '" style="width:100%;border-radius:12px" alt="evidencia"><p class="hint">Evidencia fotográfica de asistencia</p></div>', '680px');
};
window.photoIcon = function(key, url) {
  if (!url) return '';
  regPhoto(key, url);
  return ' <button type="button" class="link" title="Ver evidencia fotográfica" onclick="openPhotoKey(\'' + key + '\')">📷</button>';
};
window.openFile = function(url) {
  if (!url) return;
  if (url.indexOf('data:') === 0) {
    try {
      const parts = url.split(',');
      const mime = (parts[0].match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
      const bin = atob(parts[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const obj = URL.createObjectURL(new Blob([arr], { type: mime }));
      window.open(obj, '_blank');
      setTimeout(() => URL.revokeObjectURL(obj), 120000);
    } catch(e) { toast('No se pudo abrir el archivo.', 'error'); }
  } else {
    window.open(url, '_blank');
  }
};
window.openFileWrap = function(url) { openFile(url); };

/* ==================== FICHA DEL INTEGRANTE (drill-down) ==================== */
window.openPersona = async function(uidv) {
  const [users, att, abs] = await Promise.all([Store.listUsers(), Store.myAttendance(uidv), Store.listAbsences({ uid: uidv })]);
  const u = users.find(x => x.id === uidv);
  if (!u) { toast('Usuario no encontrado.', 'error'); return; }
  att.sort((a, b) => b.fecha.localeCompare(a.fecha));
  const asist = att.filter(x => x.tipo === 'asistencia');
  const tards = att.filter(x => x.tipo === 'tardanza');
  const justOK = abs.filter(x => x.estado === 'aprobada');
  const justPen = abs.filter(x => x.estado === 'pendiente');
  const justRec = abs.filter(x => x.estado === 'rechazada');
  const chipEst = { aprobada:['st-ok','🟢 Aprobada'], pendiente:['st-just','🟡 En revisión'], rechazada:['st-bad','🔴 Rechazada'] };
  const absRows = [...abs].sort((a,b) => b.fecha.localeCompare(a.fecha)).map(b => `
    <div class="list-item"><div>
      <strong>${fechaNice(b.fecha)}</strong> <span class="chip ${chipEst[b.estado][0]}">${chipEst[b.estado][1]}</span><br>
      <em>${esc(b.motivo || '')}</em>
      ${(b.archivos||[]).map(a => ' <button type="button" class="link" onclick="openFileWrap(\'' + a.url + '\')">📎 ' + esc(a.name) + '</button>').join('')}
      ${b.observacion ? '<br><small>Obs. admin: ' + esc(b.observacion) + '</small>' : ''}
    </div></div>`).join('');
  const attRows = att.map(a => `
    <div class="list-item"><div><strong>${fechaNice(a.fecha)}</strong> <small>🕐 ${esc(a.hora || '')}</small>
    <span class="chip ${a.tipo === 'tardanza' ? 'st-late' : 'st-ok'}">${a.tipo === 'tardanza' ? '🟠 Tardanza' : '🟢 Puntual'}</span>${photoIcon('pm-' + a.id, a.fotoURL)}</div></div>`).join('');
  let guardHTML = '';
  if (u.categoria === 'aspirante') {
    const guards = await Store.listGuards({ uid: uidv });
    const gc = guards.filter(x => x.estado === 'cumplida').length;
    const gj = guards.filter(x => x.estado === 'justificada').length;
    const gn = guards.filter(x => x.estado === 'no_cumplida').length;
    const gp = guards.filter(x => x.estado === 'pendiente' && x.fecha >= todayStr()).length;
    guardHTML = `<h4>🌙 Guardias: ${gc} cumplidas · ${gj} justificadas · ${gn} no cumplidas · ${gp} pendientes</h4>
      ${guards.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(g => { const st = ESTADO_STYLE[g.estado] || ESTADO_STYLE.pendiente; return `<div class="list-item"><span class="chip ${st[2]}">${st[0]} ${st[1]}</span> <strong>${fechaNice(g.fecha)}</strong></div>`; }).join('') || '<p class="hint">Sin guardias registradas.</p>'}`;
  }
  openModal(`
    <h3>👤 ${esc(fullName(u))}</h3>
    <p class="hint">${CAT_LABEL[u.categoria] || u.categoria} · Grado: ${esc(u.grado || '—')} · Usuario: ${esc(u.username)}</p>
    <div class="grid-cards" style="grid-template-columns:repeat(4,1fr)">
      <div class="card c-green"><span class="num">${asist.length}</span><span class="lbl">Asistencias</span></div>
      <div class="card c-orange"><span class="num">${tards.length}</span><span class="lbl">Tardanzas</span></div>
      <div class="card c-yellow"><span class="num">${justOK.length + justPen.length}</span><span class="lbl">Faltas just.</span></div>
      <div class="card c-red"><span class="num">${justRec.length}</span><span class="lbl">Rechazadas</span></div>
    </div>
    ${guardHTML}
    <h4>🔴 Faltas y justificaciones (${abs.length})</h4>
    ${absRows || '<p class="hint">Sin faltas registradas.</p>'}
    <h4>🕐 Detalle de asistencias y tardanzas (${att.length})</h4>
    ${attRows || '<p class="hint">Sin registros de asistencia.</p>'}
  `, '680px');
};

/* ==================== LISTAS DETALLADAS DEL DÍA ==================== */
async function dayListsHTML(f) {
  const [users, att, abs] = await Promise.all([Store.listUsers(), Store.attendanceOn(f), Store.listAbsences({ fecha: f })]);
  const nameOf = id => { const u = users.find(x => x.id === id); return u ? fullName(u) : 'Usuario eliminado'; };
  const activos = users.filter(u => u.activo !== false && u.categoria !== 'administrador');
  const ok = att.filter(x => x.tipo === 'asistencia');
  const late = att.filter(x => x.tipo === 'tardanza');
  const just = abs.filter(x => x.estado !== 'rechazada');
  const justSet = new Set(just.map(x => x.uid));
  const injust = f <= todayStr() ? activos.filter(u => !att.some(x => x.uid === u.id) && !justSet.has(u.id)) : [];
  const pname = (id, txt) => '<button type="button" class="link pname" onclick="openPersona(\'' + id + '\')">' + esc(txt) + '</button>';
  const attRow = x => `<div class="list-item"><div>${pname(x.uid, nameOf(x.uid))} <small>🕐 ${esc(x.hora || '')}</small>${photoIcon('ev-' + f + '-' + x.id, x.fotoURL)}</div></div>`;
  const justRow = x => `<div class="list-item"><div>${pname(x.uid, nameOf(x.uid))} <span class="chip ${x.estado === 'aprobada' ? 'st-ok' : 'st-just'}">${x.estado === 'aprobada' ? 'aprobada' : 'en revisión'}</span><br><em>${esc(x.motivo || '')}</em>
    ${(x.archivos || []).map(a => '<button type="button" class="link" onclick="openFileWrap(\'' + a.url + '\')">📎 ' + esc(a.name) + '</button>').join(' ')}
    ${x.observacion ? '<br><small>Obs. admin: ' + esc(x.observacion) + '</small>' : ''}</div></div>`;
  const injustRow = x => `<div class="list-item"><div>${pname(x.id, fullName(x))}</div></div>`;
  const bloque = (titulo, cls, arr, render) => `<div class="panel ${cls}"><h4>${titulo} (${arr.length})</h4>${arr.length ? arr.map(render).join('') : '<p class="hint">Nadie.</p>'}</div>`;
  return `<div class="two-col">
    ${bloque('✅ Asistieron', 'p-green', ok, attRow)}
    ${bloque('🟠 Llegaron tarde', 'p-orange', late, attRow)}
    ${bloque('🟡 Faltaron justificadamente', 'p-yellow', just, justRow)}
    ${bloque(f <= todayStr() ? '🔴 Faltaron injustificadamente' : '⚪ Jornada futura', 'p-red', injust, injustRow)}
  </div>`;
}

/* ==================== MODO DE OPERACIÓN ==================== */
const FB_ACTIVE = window.FIREBASE_CONFIG && !String(window.FIREBASE_CONFIG.apiKey || '').startsWith('PEGA');
let fdb = null, fauth = null, fstorage = null;
if (FB_ACTIVE) {
  firebase.initializeApp(window.FIREBASE_CONFIG);
  fauth = firebase.auth();
  fdb = firebase.firestore();
  fstorage = firebase.storage();
}

/* ==================== CAPA DE DATOS · DEMO (localStorage) ==================== */
function seedDemo() {
  const hoy = todayStr();
  const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.getFullYear() + '-' + pad(x.getMonth()+1) + '-' + pad(x.getDate()); };
  return {
    session: null,
    users: [
      { id:'u-admin', nombres:'Administrador', apellidos:' del Sistema', username:'admin', password:'admin123', categoria:'administrador', grado:'Oficial', activo:true, createdAt:hoy },
      { id:'u-asp1', nombres:'Juan Carlos', apellidos:'Pérez Quispe', username:'juan.perez', password:'demo123', categoria:'aspirante', grado:'Aspirante', activo:true, createdAt:hoy },
      { id:'u-pos1', nombres:'María Fernanda', apellidos:'García López', username:'maria.garcia', password:'demo123', categoria:'postulante', grado:'Postulante', activo:true, createdAt:hoy }
    ],
    attendance: [
      { id:uid(), uid:'u-asp1', fecha:d(1), hora:'19:42', tipo:'asistencia', fotoURL:'', actividad:'instruccion' },
      { id:uid(), uid:'u-asp1', fecha:d(3), hora:'20:15', tipo:'tardanza', fotoURL:'', actividad:'instruccion' },
      { id:uid(), uid:'u-pos1', fecha:d(1), hora:'19:50', tipo:'asistencia', fotoURL:'', actividad:'instruccion' }
    ],
    absences: [
      { id:uid(), uid:'u-pos1', fecha:d(3), motivo:'Compromiso familiar de fuerza mayor.', archivos:[], estado:'aprobada', observacion:'OK', createdAt:d(3) + ' 18:00' },
      { id:uid(), uid:'u-asp1', fecha:d(5), motivo:'Viaje por salud, adjunto constancia.', archivos:[], estado:'pendiente', observacion:'', createdAt:d(5) + ' 17:30' }
    ],
    guards: [
      { id:uid(), uid:'u-asp1', fecha:d(2), estado:'cumplida' },
      { id:uid(), uid:'u-asp1', fecha:hoy, estado:'pendiente' },
      { id:uid(), uid:'u-asp1', fecha:d(6), estado:'no_cumplida' },
      { id:uid(), uid:'u-asp1', fecha:d(9), estado:'justificada' }
    ],
    documents: [
      { id:uid(), titulo:'Reglamento Interno de Instrucción', descripcion:'Normas de la Sección de Instrucción.', url:'', fileName:'reglamento.pdf', uploadedBy:'admin', createdAt:hoy }
    ],
    audit: [
      { id:uid(), fecha:d(1), hora:'19:42', usuario:'juan.perez', accion:'REGISTRO ASISTENCIA', detalle:'Asistencia registrada el ' + d(1) }
    ],
    config: { horaLimite:'20:00' }
  };
}

const Local = {
  key: 'bmb163_data_v1',
  data: null,
  load() {
    if (!this.data) {
      try { this.data = JSON.parse(localStorage.getItem(this.key)); } catch(e) { this.data = null; }
      if (!this.data || !this.data.users) { this.data = seedDemo(); this.save(); }
    }
    return this.data;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch(e) { toast('⚠️ Almacenamiento lleno: reduce el tamaño de las evidencias.', 'error'); } }
};

const DemoStore = {
  async init() { Local.load(); },
  async login(username, password) {
    const u = Local.data.users.find(x => x.username.toLowerCase() === String(username).toLowerCase());
    if (!u || u.password !== password) return { ok:false, error:'Usuario o contraseña incorrectos.' };
    if (u.activo === false) return { ok:false, error:'Cuenta desactivada. Contacta a la administración.' };
    Local.data.session = u.id; Local.save();
    return { ok:true, user:{...u} };
  },
  async logout() { Local.data.session = null; Local.save(); },
  async getSessionUser() {
    const id = Local.data.session;
    if (!id) return null;
    const u = Local.data.users.find(x => x.id === id);
    return (u && u.activo !== false) ? {...u} : null;
  },
  async listUsers() { return [...Local.data.users]; },
  async createUser(d) {
    if (Local.data.users.some(x => x.username.toLowerCase() === d.username.toLowerCase()))
      return { ok:false, error:'El usuario ya existe.' };
    const u = { id:uid(), activo:true, createdAt:todayStr(), ...d };
    Local.data.users.push(u); Local.save();
    return { ok:true, user:u };
  },
  async updateUser(id, patch) {
    const u = Local.data.users.find(x => x.id === id);
    if (u) { Object.assign(u, patch); Local.save(); }
    return { ok:true };
  },
  async setActive(id, active) { return this.updateUser(id, { activo:active }); },
  async resetPassword(username) {
    const u = Local.data.users.find(x => x.username.toLowerCase() === String(username).toLowerCase());
    if (!u) return { ok:false, error:'Usuario no encontrado.' };
    return { ok:true, temp:'demo123' };
  },
  async getConfig() { return {...Local.data.config}; },
  async setConfig(c) { Object.assign(Local.data.config, c); Local.save(); return { ok:true }; },
  async addAttendance(a) { const r = { id:uid(), ...a }; Local.data.attendance.push(r); Local.save(); return r; },
  async attendanceOn(fecha) { return Local.data.attendance.filter(a => a.fecha === fecha); },
  async myAttendance(uidv) { return Local.data.attendance.filter(a => a.uid === uidv); },
  async addAbsence(a) { const r = { id:uid(), estado:'pendiente', archivos:[], observacion:'', ...a }; Local.data.absences.push(r); Local.save(); return r; },
  async updateAbsence(id, patch) { const r = Local.data.absences.find(x => x.id === id); if (r) { Object.assign(r, patch); Local.save(); } return { ok:true }; },
  async listAbsences(f) {
    let r = [...Local.data.absences];
    if (f.uid) r = r.filter(x => x.uid === f.uid);
    if (f.fecha) r = r.filter(x => x.fecha === f.fecha);
    if (f.estado) r = r.filter(x => x.estado === f.estado);
    return r.sort((a,b) => (b.fecha + (b.createdAt||'')).localeCompare(a.fecha + (a.createdAt||'')));
  },
  async addGuard(g) { const r = { id:uid(), estado:'pendiente', ...g }; Local.data.guards.push(r); Local.save(); return r; },
  async updateGuard(id, patch) { const r = Local.data.guards.find(x => x.id === id); if (r) { Object.assign(r, patch); Local.save(); } return { ok:true }; },
  async listGuards(f) {
    let r = [...Local.data.guards];
    if (f.uid) r = r.filter(x => x.uid === f.uid);
    if (f.fecha) r = r.filter(x => x.fecha === f.fecha);
    if (f.estado) r = r.filter(x => x.estado === f.estado);
    return r.sort((a,b) => a.fecha.localeCompare(b.fecha));
  },
  async addDocument(d) { const r = { id:uid(), createdAt:todayStr(), ...d }; Local.data.documents.push(r); Local.save(); return r; },
  async listDocuments() { return [...Local.data.documents].sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||'')); },
  async deleteDocument(id) { Local.data.documents = Local.data.documents.filter(x => x.id !== id); Local.save(); return { ok:true }; },
  async addAudit(a) { const r = { id:uid(), fecha:todayStr(), hora:nowTime(), ...a }; Local.data.audit.unshift(r); Local.save(); return r; },
  async listAudit() { return [...Local.data.audit].slice(0, 300); },
  async uploadFile(path, file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  },
  async changePassword(uidv, newPass) { const u = Local.data.users.find(x => x.id === uidv); if (u) { u.password = newPass; Local.save(); } return { ok:true }; }
};

/* ==================== CAPA DE DATOS · FIREBASE ==================== */
const emailFor = u => (u + '@cgbvp163.pe').toLowerCase();

const FireStore = {
  _user: null,
  async init() {
    fauth.onAuthStateChanged(async fbUser => {
      if (fbUser) {
        const doc = await fdb.collection('users').doc(fbUser.uid).get();
        if (doc.exists) {
          const u = doc.data();
          if (u.activo === false) { await fauth.signOut(); this._user = null; }
          else this._user = { id: fbUser.uid, ...u };
        } else this._user = null;
      } else this._user = null;
      route();
    });
  },
  async login(username, password) {
    try {
      const cred = await fauth.signInWithEmailAndPassword(emailFor(username), password);
      const doc = await fdb.collection('users').doc(cred.user.uid).get();
      if (!doc.exists) { await fauth.signOut(); return { ok:false, error:'Perfil no encontrado.' }; }
      const u = doc.data();
      if (u.activo === false) { await fauth.signOut(); return { ok:false, error:'Cuenta desactivada. Contacta a la administración.' }; }
      return { ok:true, user:{ id:cred.user.uid, ...u } };
    } catch(e) { return { ok:false, error:'Usuario o contraseña incorrectos.' }; }
  },
  async logout() { await fauth.signOut(); },
  async getSessionUser() { return this._user; },
  async listUsers() {
    const snap = await fdb.collection('users').get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  },
  async createUser(d) {
    const snap = await fdb.collection('users').where('username', '==', d.username.toLowerCase()).get();
    if (!snap.empty) return { ok:false, error:'El usuario ya existe.' };
    const secondary = firebase.initializeApp(window.FIREBASE_CONFIG, 'secondary-' + Date.now());
    try {
      const cred = await secondary.auth().createUserWithEmailAndPassword(emailFor(d.username), d.password);
      const { password, ...profile } = d;
      await fdb.collection('users').doc(cred.user.uid).set({ ...profile, username:d.username.toLowerCase(), activo:true, createdAt:todayStr() });
      await secondary.auth().signOut();
      return { ok:true, user:{ id:cred.user.uid, ...profile } };
    } catch(e) {
      return { ok:false, error:(e.code === 'auth/email-already-in-use') ? 'El usuario ya existe.' : 'Error al crear la cuenta: ' + e.message };
    } finally { setTimeout(() => secondary.delete().catch(()=>{}), 4000); }
  },
  async updateUser(id, patch) { await fdb.collection('users').doc(id).update(patch); return { ok:true }; },
  async setActive(id, active) { await fdb.collection('users').doc(id).update({ activo:active }); return { ok:true }; },
  async resetPassword(username) {
    try { await fauth.sendPasswordResetEmail(emailFor(username)); return { ok:true }; }
    catch(e) { return { ok:false, error:'No se pudo enviar el correo de restablecimiento.' }; }
  },
  async getConfig() {
    const doc = await fdb.collection('config').doc('general').get();
    return doc.exists ? doc.data() : { horaLimite:'20:00' };
  },
  async setConfig(c) { await fdb.collection('config').doc('general').set(c, { merge:true }); return { ok:true }; },
  async addAttendance(a) {
    const { id, ...data } = a;
    const ref = await fdb.collection('attendance').add({ ...data, serverTs: firebase.firestore.FieldValue.serverTimestamp() });
    return { id:ref.id, ...a };
  },
  async attendanceOn(fecha) {
    const snap = await fdb.collection('attendance').where('fecha', '==', fecha).get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  },
  async myAttendance(uidv) {
    const snap = await fdb.collection('attendance').where('uid', '==', uidv).get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  },
  async addAbsence(a) {
    const { id, ...data } = a;
    const ref = await fdb.collection('absences').add({ ...data, estado:'pendiente', archivos:[], observacion:'' });
    return { id:ref.id, estado:'pendiente', archivos:[], observacion:'', ...a };
  },
  async updateAbsence(id, patch) { await fdb.collection('absences').doc(id).update(patch); return { ok:true }; },
  async listAbsences(f) {
    let q = fdb.collection('absences');
    if (f.uid) q = q.where('uid', '==', f.uid);
    if (f.fecha) q = q.where('fecha', '==', f.fecha);
    if (f.estado) q = q.where('estado', '==', f.estado);
    const snap = await q.get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => (b.fecha||'').localeCompare(a.fecha||''));
  },
  async addGuard(g) {
    const { id, ...data } = g;
    const ref = await fdb.collection('guards').add({ ...data, estado:'pendiente' });
    return { id:ref.id, estado:'pendiente', ...g };
  },
  async updateGuard(id, patch) { await fdb.collection('guards').doc(id).update(patch); return { ok:true }; },
  async listGuards(f) {
    let q = fdb.collection('guards');
    if (f.uid) q = q.where('uid', '==', f.uid);
    if (f.fecha) q = q.where('fecha', '==', f.fecha);
    if (f.estado) q = q.where('estado', '==', f.estado);
    const snap = await q.get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''));
  },
  async addDocument(d) {
    const { id, ...data } = d;
    const ref = await fdb.collection('documents').add(data);
    return { id:ref.id, ...d };
  },
  async listDocuments() {
    const snap = await fdb.collection('documents').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  },
  async deleteDocument(id) { await fdb.collection('documents').doc(id).delete(); return { ok:true }; },
  async addAudit(a) { await fdb.collection('audit').add({ fecha:todayStr(), hora:nowTime(), ...a }); return { ok:true }; },
  async listAudit() {
    const snap = await fdb.collection('audit').orderBy('fecha', 'desc').limit(300).get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  },
  async uploadFile(path, file) {
    const ref = fstorage.ref().child(path);
    await ref.put(file);
    return await ref.getDownloadURL();
  },
  async changePassword(uidv, newPass) {
    const u = fauth.currentUser;
    if (!u) return { ok:false, error:'Sesión expirada.' };
    await u.updatePassword(newPass);
    return { ok:true };
  }
};

const Store = FB_ACTIVE ? FireStore : DemoStore;
let ME = null;
let CONFIG = { horaLimite:'20:00' };

async function audit(accion, detalle) {
  try { await Store.addAudit({ uid: ME ? ME.id : '', usuario: ME ? ME.username : 'sistema', accion, detalle: detalle || '' }); } catch(e) {}
}

/* ==================== ROUTER ==================== */
const state = { tab:'inicio', adminTab:'dashboard', histMonth:null, calMonth:null, calFecha:null, calMode:'dia' };

async function route() {
  ME = await Store.getSessionUser();
  CONFIG = await Store.getConfig().catch(() => ({ horaLimite:'20:00' }));
  if (!ME) { renderLogin(); return; }
  $('#topbar').classList.remove('hidden');
  applyLogo();
  $('#topbar-user').innerHTML =
    '<span class="badge cat-' + ME.categoria + '">' + (CAT_LABEL[ME.categoria] || ME.categoria) + '</span>' +
    '<span class="tb-name">' + esc(fullName(ME)) + '</span>' +
    '<button class="btn btn-ghost btn-sm" onclick="doLogout()">Salir ⏻</button>';
  if (ME.categoria === 'administrador') renderAdmin(); else renderUserPortal();
}

async function doLogout() { await Store.logout(); location.hash = ''; route(); }

/* ==================== LOGIN ==================== */
function renderLogin() {
  $('#topbar').classList.add('hidden');
  $('#main').innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-logo">${logoHTML(64)}</div>
        <h1>Cuerpo General de Bomberos Voluntarios del Perú</h1>
        <h2>Compañía de Bomberos Ancón N.° 163</h2>
        <p class="login-sub">Sección de Instrucción · Sistema de Control de Asistencia</p>
        ${FB_ACTIVE ? '' : '<div class="demo-banner">⚡ MODO DEMO — los datos se guardan en este navegador. Configura Firebase en <code>assets/js/firebase-config.js</code> para producción.</div>'}
        <form onsubmit="return doLogin(event)">
          <label>Usuario</label>
          <input id="lg-user" autocomplete="username" required placeholder="Ej: juan.perez">
          <label>Contraseña</label>
          <input id="lg-pass" type="password" autocomplete="current-password" required placeholder="••••••••">
          <button class="btn btn-primary btn-block btn-lg" type="submit">Ingresar 🔥</button>
        </form>
        ${FB_ACTIVE ? '<p class="login-hint">¿Olvidaste tu contraseña? Solicita el restablecimiento a la administración.</p>'
                    : '<p class="login-hint">Demo: <b>admin / admin123</b> · <b>juan.perez / demo123</b> (aspirante) · <b>maria.garcia / demo123</b> (postulante)</p>'}
      </div>
    </div>`;
}

async function doLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Verificando…';
  const r = await Store.login($('#lg-user').value.trim(), $('#lg-pass').value);
  btn.disabled = false; btn.innerHTML = 'Ingresar 🔥';
  if (!r.ok) { toast('❌ ' + r.error, 'error'); return false; }
  toast('✅ Bienvenido, ' + fullName(r.user));
  route();
  return false;
}

/* ==================== NAVEGACIÓN ==================== */
function setTab(t) { state.tab = t; renderUserPortal(); window.scrollTo(0, 0); }
function setAdminTab(t) { state.adminTab = t; renderAdmin(); window.scrollTo(0, 0); }

function navTabs(items, active, fn) {
  return '<nav class="tabs">' + items.map(i =>
    '<button class="tab ' + (i[0] === active ? 'active' : '') + '" onclick="' + fn + '(\'' + i[0] + '\')">' + i[1] + '</button>'
  ).join('') + '</nav>';
}

/* ==================== CÁLCULO DE ESTADOS ==================== */
/* Devuelve mapa uid -> { estado, registro } para una fecha.
   estados: asistencia, tardanza, justificada, justificada_pendiente, injustificada, sin_jornada */
async function statusMapForDate(fecha) {
  const [users, att, abs] = await Promise.all([
    Store.listUsers(),
    Store.attendanceOn(fecha),
    Store.listAbsences({ fecha })
  ]);
  const map = {};
  att.forEach(a => map[a.uid] = { estado: a.tipo, registro: a });
  abs.forEach(b => {
    if (map[b.uid]) return; // la asistencia manda
    if (b.estado === 'aprobada') map[b.uid] = { estado:'justificada', registro:b };
    else if (b.estado === 'pendiente') map[b.uid] = { estado:'justificada_pendiente', registro:b };
    else if (b.estado === 'rechazada') map[b.uid] = { estado:'injustificada', registro:b };
  });
  users.filter(u => u.activo !== false && u.categoria !== 'administrador').forEach(u => {
    if (!map[u.id]) map[u.id] = { estado: fecha <= todayStr() ? 'injustificada' : 'sin_jornada', registro:null };
  });
  return map;
}

const ESTADO_STYLE = {
  asistencia:['🟢','Asistencia','st-ok'],
  tardanza:['🟠','Tardanza','st-late'],
  justificada:['🟡','Falta justificada','st-just'],
  justificada_pendiente:['🟡','Falta justificada (en revisión)','st-just'],
  injustificada:['🔴','Falta injustificada','st-bad'],
  sin_jornada:['⚪','Sin registro','st-none'],
  pendiente:['⚪','Guardia pendiente','st-none'],
  cumplida:['🟢','Guardia cumplida','st-ok'],
  no_cumplida:['🔴','Guardia no cumplida','st-bad'],
  aprobada:['🟡','Guardia justificada','st-just']
};

async function myStats(uidv) {
  const [att, abs] = await Promise.all([Store.myAttendance(uidv), Store.listAbsences({ uid: uidv })]);
  const s = { asistencias:0, tardanzas:0, justificadas:0, injustificadas:0, pendientes:0 };
  att.forEach(a => { if (a.tipo === 'tardanza') s.tardanzas++; else s.asistencias++; });
  abs.forEach(b => {
    if (b.estado === 'aprobada') s.justificadas++;
    else if (b.estado === 'rechazada') s.injustificadas++;
    else s.pendientes++;
  });
  // Faltas injustificadas = jornadas pasadas sin asistencia ni justificación
  const attFechas = new Set(att.map(a => a.fecha));
  const absOK = new Set(abs.filter(b => b.estado !== 'rechazada').map(b => b.fecha));
  const hoy = todayStr();
  const dias = new Set([...attFechas, ...absOK]);
  // recorre desde la primera fecha registrada hasta hoy (máx. 120 días)
  const fechas = [...dias, ...att.map(a=>a.fecha)].sort();
  return s;
}

/* ==================== PORTAL DEL USUARIO ==================== */
function renderUserPortal() {
  const items = [
    ['inicio','🏠 Inicio'],
    ['asistencia','📸 Asistencia'],
    ['falta','📝 Registrar falta'],
    ['historial','🗓️ Mi historial'],
    ...(ME.categoria === 'aspirante' ? [['guardias','🌙 Mis guardias']] : []),
    ['documentos','📄 Documentos'],
    ['perfil','👤 Perfil']
  ];
  let body = '';
  switch (state.tab) {
    case 'asistencia': body = vRegistrarAsistencia(); break;
    case 'falta': body = vRegistrarFalta(); break;
    case 'historial': body = vHistorial(); break;
    case 'guardias': body = '<div id="view-guardias"><div class="panel"><p class="hint">Cargando…</p></div></div>'; break;
    case 'documentos': body = '<div id="view-documentos"></div>'; break;
    case 'perfil': body = vPerfil(); break;
    default: body = '<div id="view-inicio"><div class="panel"><p class="hint">Cargando…</p></div></div>';
  }
  $('#main').innerHTML = navTabs(items, state.tab, 'setTab') + '<div class="container">' + body + '</div>';
  if (state.tab === 'asistencia') initAsistencia();
  if (state.tab === 'historial') renderHistCalendar();
  if (state.tab === 'inicio') vInicio();
  if (state.tab === 'guardias') vMisGuardias();
  if (state.tab === 'documentos') vDocumentos(false);
  if (state.tab === 'falta') loadMisFaltas();
}

async function vInicio() {
  const [stats, guards] = await Promise.all([
    (async () => {
      const att = await Store.myAttendance(ME.id);
      const abs = await Store.listAbsences({ uid: ME.id });
      const s = { asistencias:0, tardanzas:0, justificadas:0, pendJust:0, injustRech:0 };
      att.forEach(a => a.tipo === 'tardanza' ? s.tardanzas++ : s.asistencias++);
      abs.forEach(b => { if (b.estado==='aprobada') s.justificadas++; else if (b.estado==='pendiente') s.pendJust++; else s.injustRech++; });
      return s;
    })(),
    ME.categoria === 'aspirante' ? Store.listGuards({ uid: ME.id }) : Promise.resolve([])
  ]);
  const prox = guards.filter(g => g.fecha >= todayStr() && g.estado === 'pendiente').sort((a,b)=>a.fecha.localeCompare(b.fecha))[0];
  $('#view-inicio').innerHTML = `
    <div class="grid-cards">
      <div class="card c-green"><span class="num">${stats.asistencias}</span><span class="lbl">Asistencias</span></div>
      <div class="card c-orange"><span class="num">${stats.tardanzas}</span><span class="lbl">Tardanzas</span></div>
      <div class="card c-yellow"><span class="num">${stats.justificadas}</span><span class="lbl">Faltas justificadas</span></div>
      <div class="card c-yellow"><span class="num">${stats.pendJust}</span><span class="lbl">Justificaciones en revisión</span></div>
      <div class="card c-red"><span class="num">${stats.injustRech}</span><span class="lbl">Faltas rechazadas</span></div>
    </div>
    ${prox ? `<div class="notice">🌙 <b>Próxima guardia:</b> ${fechaNice(prox.fecha)}</div>` : ''}
    <div class="quick-actions">
      <button class="btn btn-primary btn-lg" onclick="setTab('asistencia')">📸 Registrar asistencia</button>
      <button class="btn btn-secondary btn-lg" onclick="setTab('falta')">📝 Registrar falta</button>
    </div>`;
}

function vRegistrarAsistencia() {
  return `
    <div id="view-asistencia">
      <div class="panel">
        <h3>📸 Registro de asistencia</h3>
        <div class="auto-data">
          <div><label>Nombre</label><strong>${esc(fullName(ME))}</strong></div>
          <div><label>Categoría</label><strong>${CAT_LABEL[ME.categoria]}</strong></div>
          <div><label>Grado</label><strong>${esc(ME.grado || '—')}</strong></div>
          <div><label>Fecha</label><strong>${fechaNice(todayStr())}</strong></div>
          <div><label>Hora actual</label><strong id="live-clock" class="clock">--:--:--</strong></div>
        </div>
        <div id="att-status"></div>
        <div id="cam-area" class="cam-area">
          <video id="cam-video" autoplay playsinline muted class="hidden"></video>
          <img id="cam-preview" class="hidden" alt="evidencia">
          <div id="cam-placeholder">📷 Se requiere una fotografía tomada en este momento como evidencia de presencia.</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="btn-start-cam">Encender cámara</button>
          <button class="btn btn-secondary hidden" id="btn-shot">📸 Capturar</button>
          <button class="btn btn-ghost hidden" id="btn-retake">↺ Repetir</button>
        </div>
        <button class="btn btn-primary btn-block btn-lg hidden" id="btn-confirm-att">✅ Confirmar asistencia</button>
        <p class="hint">⏱ Hora límite para asistencia puntual: <b>${esc(CONFIG.horaLimite || '20:00')} h</b>. Después se registrará como tardanza.</p>
      </div>
    </div>`;
}

let camStream = null, shotBlob = null;

async function initAsistencia() {
  const clock = $('#live-clock');
  const tick = () => { if (clock) clock.textContent = new Date().toLocaleTimeString('es-PE'); };
  tick(); const iv = setInterval(() => { if (!document.body.contains(clock)) { clearInterval(iv); return; } tick(); }, 1000);

  const att = await Store.myAttendance(ME.id);
  const hoy = att.find(a => a.fecha === todayStr());
  if (hoy) {
    $('#att-status').innerHTML = '<div class="notice ok">Ya registraste tu ' + (hoy.tipo === 'tardanza' ? 'tardanza' : 'asistencia') + ' hoy a las ' + esc(hoy.hora) + '. ✅</div>';
    $('#cam-area').style.display = 'none';
    $('#btn-start-cam').style.display = 'none';
    return;
  }

  $('#btn-start-cam').onclick = startCamera;
  $('#btn-shot').onclick = takeShot;
  $('#btn-retake').onclick = () => { shotBlob = null; $('#cam-preview').classList.add('hidden'); $('#cam-video').classList.remove('hidden'); $('#btn-shot').classList.remove('hidden'); $('#btn-retake').classList.add('hidden'); $('#btn-confirm-att').classList.add('hidden'); };
  $('#btn-confirm-att').onclick = confirmAttendance;
}

async function startCamera() {
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    $('#cam-video').srcObject = camStream;
    $('#cam-video').classList.remove('hidden');
    $('#cam-placeholder').classList.add('hidden');
    $('#btn-start-cam').classList.add('hidden');
    $('#btn-shot').classList.remove('hidden');
  } catch(e) {
    // Alternativa: input de archivo con captura (abre la cámara nativa en móviles)
    openModal(`
      <h3>📷 Tomar fotografía</h3>
      <p class="hint">Tu navegador bloqueó la cámara web. Usa el botón de abajo para abrir la cámara del dispositivo.</p>
      <input type="file" id="m-file" accept="image/*" capture="user" class="input-file">
      <div class="btn-row"><button class="btn btn-primary" onclick="usePickedFile()">Usar fotografía</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button></div>`);
  }
}

window.usePickedFile = function() {
  const f = $('#m-file').files[0];
  if (!f) { toast('Selecciona una fotografía.', 'error'); return; }
  shotBlob = f;
  $('#cam-preview').src = URL.createObjectURL(f);
  $('#cam-preview').classList.remove('hidden');
  $('#cam-video').classList.add('hidden');
  $('#cam-placeholder').classList.add('hidden');
  $('#btn-start-cam').classList.add('hidden');
  $('#btn-shot').classList.add('hidden');
  $('#btn-retake').classList.remove('hidden');
  $('#btn-confirm-att').classList.remove('hidden');
  closeModal();
};

function takeShot() {
  const video = $('#cam-video');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    shotBlob = blob;
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
    $('#cam-preview').src = URL.createObjectURL(blob);
    $('#cam-preview').classList.remove('hidden');
    $('#cam-video').classList.add('hidden');
    $('#btn-shot').classList.add('hidden');
    $('#btn-retake').classList.remove('hidden');
    $('#btn-confirm-att').classList.remove('hidden');
  }, 'image/jpeg', 0.85);
}

async function confirmAttendance() {
  if (!shotBlob) { toast('Primero toma la fotografía.', 'error'); return; }
  const btn = $('#btn-confirm-att');
  btn.disabled = true; btn.textContent = 'Registrando…';
  try {
    const hora = nowTime();
    const limite = CONFIG.horaLimite || '20:00';
    const tipo = hora >= limite ? 'tardanza' : 'asistencia';
    const fotoURL = await Store.uploadFile('evidencias/' + ME.id + '/' + todayStr() + '_' + hora.replace(':','') + '.jpg', shotBlob);
    await Store.addAttendance({ uid: ME.id, fecha: todayStr(), hora, tipo, fotoURL, actividad: 'instruccion' });
    await audit('REGISTRO ' + tipo.toUpperCase(), fullName(ME) + ' registró ' + tipo + ' el ' + todayStr() + ' a las ' + hora);
    toast(tipo === 'tardanza' ? '🟠 Asistencia registrada como TARDANZA.' : '🟢 ¡Asistencia registrada correctamente!');
    renderUserPortal();
  } catch(e) {
    toast('❌ Error al registrar: ' + e.message, 'error');
    btn.disabled = false; btn.textContent = '✅ Confirmar asistencia';
  }
}

function vRegistrarFalta() {
  return `
    <div class="panel">
      <h3>📝 Registrar falta / justificación</h3>
      <p class="hint">Usa esta opción cuando <b>no podrás asistir</b> a la jornada. La administración revisará y aprobará tu justificación.</p>
      <form onsubmit="return submitFalta(event)">
        <label>Fecha de la falta</label>
        <input type="date" id="f-fecha" value="${todayStr()}" required>
        <label>Motivo</label>
        <textarea id="f-motivo" rows="3" required placeholder="Describe el motivo de tu inasistencia…"></textarea>
        <label>Evidencias (documentos, fotos, capturas)</label>
        <input type="file" id="f-files" multiple accept="image/*,.pdf,.doc,.docx" class="input-file">
        <button class="btn btn-primary btn-block btn-lg" type="submit">Enviar justificación</button>
      </form>
      <div id="f-mis-faltas" style="margin-top:16px"></div>
    </div>`;
}

async function submitFalta(e) {
  e.preventDefault();
  const fecha = $('#f-fecha').value;
  const motivo = $('#f-motivo').value.trim();
  if (!fecha || !motivo) { toast('Completa todos los campos.', 'error'); return false; }
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const files = [...$('#f-files').files];
    const archivos = [];
    for (const f of files) {
      const url = await Store.uploadFile('justificaciones/' + ME.id + '/' + fecha + '_' + uid() + '_' + f.name, f);
      archivos.push({ name: f.name, url });
    }
    await Store.addAbsence({ uid: ME.id, fecha, motivo, archivos, createdAt: todayStr() + ' ' + nowTime() });
    await audit('REGISTRO FALTA', fullName(ME) + ' justificó falta del ' + fecha);
    toast('🟡 Justificación enviada. Queda pendiente de revisión.');
    e.target.reset(); $('#f-fecha').value = todayStr();
    loadMisFaltas();
  } catch(err) {
    toast('❌ Error: ' + err.message, 'error');
  }
  btn.disabled = false; btn.textContent = 'Enviar justificación';
  return false;
}

async function loadMisFaltas() {
  const list = await Store.listAbsences({ uid: ME.id });
  const box = $('#f-mis-faltas');
  if (!box) return;
  if (!list.length) { box.innerHTML = '<p class="hint">No tienes faltas registradas.</p>'; return; }
  box.innerHTML = '<h4>Mis justificaciones</h4>' + list.map(b => {
    const est = b.estado === 'aprobada' ? ['🟢 Aprobada','st-ok'] : b.estado === 'rechazada' ? ['🔴 Rechazada','st-bad'] : ['🟡 Pendiente','st-just'];
    return `<div class="list-item">
      <div><strong>${fechaCorta(b.fecha)}</strong> — ${esc(b.motivo)}<br>
      <small class="chip ${est[1]}">${est[0]}</small>
      ${b.observacion ? '<small>Obs.: ' + esc(b.observacion) + '</small>' : ''}
      ${(b.archivos||[]).map(a => '<button type="button" class="link" onclick="openFileWrap(\'' + a.url + '\')">📎 ' + esc(a.name) + '</button>').join(' ')}
      </div></div>`;
  }).join('');
}

/* ---------- MI HISTORIAL ---------- */
function vHistorial() {
  if (!state.histMonth) { const d = new Date(); state.histMonth = [d.getFullYear(), d.getMonth()]; }
  return `
    <div class="panel">
      <h3>🗓️ Mi historial</h3>
      <div class="cal-nav">
        <button class="btn btn-ghost" onclick="histNav(-1)">◀</button>
        <strong id="hist-title">${mesNombre(state.histMonth[0], state.histMonth[1])}</strong>
        <button class="btn btn-ghost" onclick="histNav(1)">▶</button>
      </div>
      <div class="legend">
        <span><i class="dot d-green"></i> Asistencia</span>
        <span><i class="dot d-orange"></i> Tardanza</span>
        <span><i class="dot d-yellow"></i> Falta justificada</span>
        <span><i class="dot d-red"></i> Falta injustificada</span>
      </div>
      <div id="hist-cal"></div>
      <div id="hist-detail" style="margin-top:14px"></div>
    </div>`;
}

function histNav(delta) {
  let [y, m] = state.histMonth;
  m += delta;
  if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
  state.histMonth = [y, m];
  renderUserPortal();
}

async function renderHistCalendar() {
  const [y, m] = state.histMonth;
  $('#hist-title') && ($('#hist-title').textContent = mesNombre(y, m));
  const [att, abs] = await Promise.all([Store.myAttendance(ME.id), Store.listAbsences({ uid: ME.id })]);
  const map = {};
  att.forEach(a => map[a.fecha] = a.tipo);
  abs.forEach(b => { if (!map[b.fecha]) map[b.fecha] = b.estado === 'rechazada' ? 'injustificada' : 'justificada'; });
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const hoy = todayStr();
  let html = '<div class="cal-grid cal-head"><span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span></div><div class="cal-grid">';
  for (let i = 0; i < first; i++) html += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const iso = y + '-' + pad(m + 1) + '-' + pad(d);
    const st = map[iso] || (iso <= hoy ? 'injustificada' : 'sin_jornada');
    html += '<button class="cal-day ' + (ESTADO_STYLE[st] ? ESTADO_STYLE[st][2] : '') + (iso === hoy ? ' today' : '') + '" onclick="histDay(\'' + iso + '\')">' + d + '</button>';
  }
  $('#hist-cal').innerHTML = html + '</div>';
  histDay(hoy);
}

window.histDay = async function(fecha) {
  const [att, abs] = await Promise.all([Store.myAttendance(ME.id), Store.listAbsences({ uid: ME.id })]);
  const a = att.find(x => x.fecha === fecha);
  const b = abs.find(x => x.fecha === fecha);
  let inner = '<strong>' + fechaNice(fecha) + '</strong>: ';
  if (a) inner += '<span class="chip ' + ESTADO_STYLE[a.tipo][2] + '">' + ESTADO_STYLE[a.tipo][0] + ' ' + ESTADO_STYLE[a.tipo][1] + ' · ' + esc(a.hora) + '</span>';
  else if (b) inner += '<span class="chip ' + ESTADO_STYLE.justificada[2] + '">' + ESTADO_STYLE.justificada[0] + ' Falta justificada (' + esc(b.estado) + ')</span> — ' + esc(b.motivo);
  else if (fecha <= todayStr()) inner += '<span class="chip st-bad">🔴 Falta injustificada</span>';
  else inner += '<span class="chip st-none">⚪ Jornada futura</span>';
  if (a && a.fotoURL) { regPhoto('his-' + a.id, a.fotoURL); inner += ' <button type="button" class="link" onclick="openPhotoKey(\'his-' + a.id + '\')">📷 Ver evidencia</button>'; }
  $('#hist-detail').innerHTML = '<div class="notice">' + inner + '</div>';
};

/* ---------- MIS GUARDIAS (ASPIRANTES · se registran ellos mismos) ---------- */
async function vMisGuardias() {
  const g = await Store.listGuards({ uid: ME.id });
  const hoy = todayStr();
  const grupos = {
    proximas: g.filter(x => x.fecha >= hoy && x.estado === 'pendiente').sort((a,b) => a.fecha.localeCompare(b.fecha)),
    pasadas: g.filter(x => x.fecha < hoy && x.estado === 'pendiente'),
    cumplidas: g.filter(x => x.estado === 'cumplida').sort((a,b) => b.fecha.localeCompare(a.fecha)),
    justificadas: g.filter(x => x.estado === 'justificada'),
    no_cumplidas: g.filter(x => x.estado === 'no_cumplida')
  };
  const row = (x, del) => `<div class="list-item"><div><span class="chip ${ESTADO_STYLE[x.estado][2]}">${ESTADO_STYLE[x.estado][0]} ${ESTADO_STYLE[x.estado][1]}</span> <strong>${fechaNice(x.fecha)}</strong></div>
    ${del ? '<button class="btn btn-danger btn-sm" onclick="delMiGuardia(\'' + x.id + '\')">🗑️</button>' : ''}</div>`;
  $('#view-guardias').innerHTML = `
    <div class="panel">
      <h3>🌙 Mis guardias nocturnas</h3>
      <p class="hint">Tú eliges el día de tu guardia: regístralo aquí y la administración verificará su cumplimiento.</p>
      <form class="inline-form" onsubmit="return submitMiGuardia(event)">
        <input type="date" id="mg-fecha" min="${hoy}" value="${hoy}" required>
        <button class="btn btn-primary" type="submit">Registrar mi guardia</button>
      </form>
    </div>
    <div class="panel">
      <h4>Próximas</h4>
      ${grupos.proximas.length ? grupos.proximas.map(x => row(x, true)).join('') : '<p class="hint">Sin guardias programadas.</p>'}
      ${grupos.pasadas.length ? '<h4>⚠️ Pendientes de verificación (pasadas)</h4>' + grupos.pasadas.map(x => row(x, false)).join('') : ''}
      <h4>Cumplidas (${grupos.cumplidas.length})</h4>${grupos.cumplidas.length ? grupos.cumplidas.map(x => row(x, false)).join('') : '<p class="hint">—</p>'}
      <h4>Justificadas (${grupos.justificadas.length})</h4>${grupos.justificadas.length ? grupos.justificadas.map(x => row(x, false)).join('') : '<p class="hint">—</p>'}
      <h4>No cumplidas (${grupos.no_cumplidas.length})</h4>${grupos.no_cumplidas.length ? grupos.no_cumplidas.map(x => row(x, false)).join('') : '<p class="hint">—</p>'}
    </div>`;
}

window.submitMiGuardia = async function(e) {
  e.preventDefault();
  const fecha = $('#mg-fecha').value;
  if (!fecha || fecha < todayStr()) { toast('⚠️ Elige una fecha de hoy en adelante.', 'error'); return false; }
  const existentes = await Store.listGuards({ uid: ME.id });
  if (existentes.some(g => g.fecha === fecha)) { toast('⚠️ Ya registraste una guardia para esa fecha.', 'error'); return false; }
  await Store.addGuard({ uid: ME.id, fecha });
  await audit('REGISTRÓ GUARDIA', fullName(ME) + ' registró guardia del ' + fecha);
  toast('🌙 Guardia registrada para el ' + fechaCorta(fecha));
  vMisGuardias();
  return false;
};

window.delMiGuardia = async function(id) {
  if (!confirm('¿Eliminar esta guardia?')) return;
  if (FB_ACTIVE) await fdb.collection('guards').doc(id).delete();
  else { Local.data.guards = Local.data.guards.filter(x => x.id !== id); Local.save(); }
  toast('Guardia eliminada.');
  vMisGuardias();
};

/* ---------- DOCUMENTOS ---------- */
async function vDocumentos(isAdminView) {
  const docs = await Store.listDocuments();
  const box = isAdminView ? $('#view-docs-admin') : $('#view-documentos');
  if (!box) return;
  box.innerHTML = `
    <div class="panel">
      <h3>📄 Documentación institucional</h3>
      ${isAdminView ? `<button class="btn btn-primary" onclick="openDocUpload()">⬆️ Subir documento</button>` : ''}
      ${docs.length ? docs.map(d => `
        <div class="list-item">
          <div>
            <strong>📄 ${esc(d.titulo)}</strong><br>
            <small>${esc(d.descripcion || '')}</small><br>
            <small class="hint">Subido: ${esc(d.createdAt || '—')} · ${esc(d.fileName || '')}</small>
          </div>
          <div class="btn-row">
            ${d.url ? `<a class="btn btn-secondary btn-sm" href="${esc(d.url)}" target="_blank">Ver / Descargar</a>` : '<span class="hint">(solo demo)</span>'}
            ${isAdminView ? `<button class="btn btn-danger btn-sm" onclick="delDoc('${d.id}')">🗑️</button>` : ''}
          </div>
        </div>`).join('') : '<p class="hint">No hay documentos disponibles.</p>'}
    </div>`;
}

window.openDocUpload = function() {
  openModal(`
    <h3>⬆️ Subir documento institucional</h3>
    <form onsubmit="return submitDoc(event)">
      <label>Título</label><input id="d-titulo" required placeholder="Ej: Reglamento interno">
      <label>Descripción</label><input id="d-desc" placeholder="Breve descripción">
      <label>Archivo (PDF, Word, imagen…)</label><input type="file" id="d-file" required class="input-file">
      <button class="btn btn-primary btn-block" type="submit">Subir</button>
    </form>
    <button class="btn btn-ghost btn-block" onclick="closeModal()">Cancelar</button>`);
};

window.submitDoc = async function(e) {
  e.preventDefault();
  const f = $('#d-file').files[0];
  if (!f) return false;
  try {
    const url = await Store.uploadFile('documentos/' + Date.now() + '_' + f.name, f);
    await Store.addDocument({ titulo: $('#d-titulo').value.trim(), descripcion: $('#d-desc').value.trim(), url, fileName: f.name, uploadedBy: ME.username });
    await audit('SUBIÓ DOCUMENTO', ME.username + ': ' + $('#d-titulo').value);
    toast('📄 Documento subido.');
    closeModal();
    const isAdminView = !!$('#view-docs-admin');
    if (isAdminView) vDocumentos(true); else renderUserPortal();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
  return false;
};

window.delDoc = async function(id) {
  if (!confirm('¿Eliminar este documento?')) return;
  await Store.deleteDocument(id);
  await audit('ELIMINÓ DOCUMENTO', ME.username + ' eliminó documento ' + id);
  toast('Documento eliminado.');
  vDocumentos(true);
};

/* ---------- PERFIL ---------- */
function vPerfil() {
  return `
    <div class="panel">
      <h3>👤 Mi perfil</h3>
      <div class="auto-data">
        <div><label>Nombres</label><strong>${esc(ME.nombres)}</strong></div>
        <div><label>Apellidos</label><strong>${esc(ME.apellidos)}</strong></div>
        <div><label>Usuario</label><strong>${esc(ME.username)}</strong></div>
        <div><label>Categoría</label><strong>${CAT_LABEL[ME.categoria]}</strong></div>
        <div><label>Grado</label><strong>${esc(ME.grado || '—')}</strong></div>
        <div><label>Cuenta creada</label><strong>${esc(ME.createdAt || '—')}</strong></div>
      </div>
      <h4>Cambiar contraseña</h4>
      <form onsubmit="return submitPass(event)">
        <label>Nueva contraseña</label>
        <input type="password" id="p-new" minlength="6" required placeholder="Mínimo 6 caracteres">
        <button class="btn btn-primary btn-block" type="submit">Actualizar contraseña</button>
      </form>
    </div>`;
}

async function submitPass(e) {
  e.preventDefault();
  const r = await Store.changePassword(ME.id, $('#p-new').value);
  if (r.ok) { toast('🔑 Contraseña actualizada.'); $('#p-new').value = ''; }
  else toast('❌ ' + (r.error || 'No se pudo actualizar.'), 'error');
  return false;
}

/* ==================== DATOS COMPARTIDOS PARA ADMIN ==================== */
DemoStore.allAttendance = async function() { return [...Local.data.attendance]; };
FireStore.allAttendance = async function() {
  const snap = await fdb.collection('attendance').get();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
};

async function rankingData() {
  const [users, att, abs] = await Promise.all([Store.listUsers(), Store.allAttendance(), Store.listAbsences({})]);
  const map = {};
  users.filter(u => u.categoria !== 'administrador').forEach(u => map[u.id] = { user:u, asist:0, tard:0, just:0, injust:0 });
  att.forEach(a => { const r = map[a.uid]; if (!r) return; a.tipo === 'tardanza' ? r.tard++ : r.asist++; });
  abs.forEach(b => {
    const r = map[b.uid]; if (!r) return;
    if (b.estado === 'aprobada') r.just++;
    else if (b.estado === 'rechazada') r.injust++;
  });
  // Faltas injustificadas: jornadas pasadas con registros pero sin asistencia ni justificación aprobada/pendiente
  const hoy = todayStr();
  const fechasJornada = new Set([...att.map(a => a.fecha), ...abs.map(b => b.fecha)].filter(f => f <= hoy));
  const attByFecha = {}; att.forEach(a => (attByFecha[a.fecha] = attByFecha[a.fecha] || new Set(), attByFecha[a.fecha].add(a.uid)));
  const absOk = {}; abs.filter(b => b.estado !== 'rechazada').forEach(b => (absOk[b.fecha] = absOk[b.fecha] || new Set(), absOk[b.fecha].add(b.uid)));
  fechasJornada.forEach(f => {
    Object.values(map).forEach(r => {
      if (!(attByFecha[f] && attByFecha[f].has(r.user.id)) && !(absOk[f] && absOk[f].has(r.user.id))) r.injust++;
    });
  });
  return Object.values(map);
}

/* ==================== PANEL ADMINISTRATIVO ==================== */
function renderAdmin() {
  const items = [
    ['dashboard','📊 Dashboard'],
    ['calendario','🗓️ Calendario'],
    ['usuarios','👥 Usuarios'],
    ['justificaciones','📝 Justificaciones'],
    ['guardias','🌙 Guardias'],
    ['rankings','🏆 Rankings'],
    ['documentos','📄 Documentos'],
    ['auditoria','🧾 Auditoría'],
    ['config','⚙️ Config']
  ];
  $('#main').innerHTML = navTabs(items, state.adminTab, 'setAdminTab') +
    '<div class="container"><div id="admin-view"><div class="panel"><p class="hint">Cargando…</p></div></div></div>';
  const views = {
    dashboard: aDashboard, calendario: aCalendario, usuarios: aUsuarios,
    justificaciones: aJustificaciones, guardias: aGuardias, rankings: aRankings,
    auditoria: aAuditoria, config: aConfig,
    documentos: async () => { $('#admin-view').innerHTML = '<div id="view-docs-admin"></div>'; await vDocumentos(true); }
  };
  (views[state.adminTab] || aDashboard)();
}

/* ---------- DASHBOARD ---------- */
async function aDashboard() {
  const hoy = todayStr();
  const [mapHoy, users, rk] = await Promise.all([statusMapForDate(hoy), Store.listUsers(), rankingData()]);
  const vals = Object.values(mapHoy);
  const c = k => vals.filter(v => v.estado === k).length;
  const esperados = vals.length;

  // Resumen semanal (últimos 7 días)
  let wAsist = 0, wTard = 0, wJust = 0, wInjust = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const f = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
    const m = await statusMapForDate(f);
    Object.values(m).forEach(v => {
      if (v.estado === 'asistencia') wAsist++;
      else if (v.estado === 'tardanza') wTard++;
      else if (v.estado === 'justificada') wJust++;
      else if (v.estado === 'injustificada') wInjust++;
    });
  }
  const totW = wAsist + wTard + wJust + wInjust || 1;
  const pct = Math.round((wAsist + wTard) / totW * 100);

  // Cumplimiento de guardias del mes
  const guards = await Store.listGuards({});
  const mesP = hoy.slice(0, 7);
  const gm = guards.filter(g => (g.fecha || '').startsWith(mesP));
  const gCum = gm.filter(g => g.estado === 'cumplida').length;
  const gPct = gm.length ? Math.round(gCum / gm.length * 100) : 100;

  const topFaltas = [...rk].sort((a,b) => (b.just + b.injust) - (a.just + a.injust)).slice(0, 5);
  const topTard = [...rk].sort((a,b) => b.tard - a.tard).slice(0, 5);
  const detalleHoy = await dayListsHTML(hoy);

  $('#admin-view').innerHTML = `
    <h3 class="view-title">📊 Resumen del día — ${fechaNice(hoy)}</h3>
    <div class="grid-cards">
      <div class="card"><span class="num">${esperados}</span><span class="lbl">Usuarios esperados</span></div>
      <div class="card c-green"><span class="num">${c('asistencia')}</span><span class="lbl">Presentes</span></div>
      <div class="card c-orange"><span class="num">${c('tardanza')}</span><span class="lbl">Tardíos</span></div>
      <div class="card c-yellow"><span class="num">${c('justificada') + c('justificada_pendiente')}</span><span class="lbl">Faltas justificadas</span></div>
      <div class="card c-red"><span class="num">${c('injustificada')}</span><span class="lbl">Faltas injustificadas</span></div>
    </div>
    <h3 class="view-title">📈 Resumen semanal</h3>
    <div class="grid-cards">
      <div class="card c-green"><span class="num">${pct}%</span><span class="lbl">Asistencia semanal</span></div>
      <div class="card"><span class="num">${wAsist}</span><span class="lbl">Asistencias (7 días)</span></div>
      <div class="card c-orange"><span class="num">${wTard}</span><span class="lbl">Tardanzas</span></div>
      <div class="card c-red"><span class="num">${wInjust}</span><span class="lbl">Faltas injustificadas</span></div>
      <div class="card c-blue"><span class="num">${gPct}%</span><span class="lbl">Cumplimiento de guardias (mes)</span></div>
    </div>
    <div class="two-col">
      <div class="panel">
        <h4>🏆 Más faltas (total)</h4>
        ${topFaltas.map((r,i) => `<div class="list-item"><b>#${i+1}</b> <button type="button" class="link pname" onclick="openPersona('${r.user.id}')">${esc(fullName(r.user))}</button> <span class="chip st-bad">${r.just + r.injust}</span> <small>(${r.just} just. / ${r.injust} injust.)</small></div>`).join('') || '<p class="hint">Sin datos.</p>'}
      </div>
      <div class="panel">
        <h4>⏱ Más tardanzas</h4>
        ${topTard.map((r,i) => `<div class="list-item"><b>#${i+1}</b> <button type="button" class="link pname" onclick="openPersona('${r.user.id}')">${esc(fullName(r.user))}</button> <span class="chip st-late">${r.tard}</span></div>`).join('') || '<p class="hint">Sin datos.</p>'}
      </div>
    </div>
    <h3 class="view-title">📋 Detalle de hoy — presiona un nombre para ver su ficha completa</h3>
    ${detalleHoy}`;
}

/* ---------- CALENDARIO ADMIN ---------- */
function aCalendario() {
  if (!state.calMonth) { const d = new Date(); state.calMonth = [d.getFullYear(), d.getMonth()]; }
  if (!state.calFecha) state.calFecha = todayStr();
  const [y, m] = state.calMonth;
  $('#admin-view').innerHTML = `
    <h3 class="view-title">🗓️ Calendario administrativo</h3>
    <div class="cal-nav">
      <button class="btn btn-ghost" onclick="calNav(-1)">◀</button>
      <strong>${mesNombre(y, m)}</strong>
      <button class="btn btn-ghost" onclick="calNav(1)">▶</button>
      <span style="flex:1"></span>
      <div class="seg">
        ${['dia','semana','mes'].map(md => '<button class="seg-btn ' + (state.calMode === md ? 'active' : '') + '" onclick="setCalMode(\'' + md + '\')">' + md[0].toUpperCase() + md.slice(1) + '</button>').join('')}
      </div>
    </div>
    <div id="admin-cal"></div>
    <div id="admin-cal-detail" style="margin-top:16px"></div>`;
  renderAdminCal();
}

window.calNav = function(delta) {
  let [y, m] = state.calMonth; m += delta;
  if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
  state.calMonth = [y, m];
  aCalendario();
};
window.setCalMode = function(md) { state.calMode = md; aCalendario(); };
window.pickCalDay = function(fecha) { state.calFecha = fecha; renderAdminCal(); };

async function renderAdminCal() {
  const [y, m] = state.calMonth;
  const [users, att, abs] = await Promise.all([Store.listUsers(), Store.allAttendance(), Store.listAbsences({})]);
  const activos = users.filter(u => u.activo !== false && u.categoria !== 'administrador');
  const attByFecha = {}; att.forEach(a => (attByFecha[a.fecha] = attByFecha[a.fecha] || []).push(a));
  const absByFecha = {}; abs.forEach(b => (absByFecha[b.fecha] = absByFecha[b.fecha] || []).push(b));

  // grid del mes
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  let html = '<div class="cal-grid cal-head"><span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span></div><div class="cal-grid">';
  for (let i = 0; i < first; i++) html += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const iso = y + '-' + pad(m+1) + '-' + pad(d);
    const asist = (attByFecha[iso] || []).length;
    const just = (absByFecha[iso] || []).filter(b => b.estado !== 'rechazada').length;
    const injust = Math.max(0, activos.length - asist - just - (iso > todayStr() ? activos.length : 0));
    html += '<button class="cal-day admin ' + (iso === state.calFecha ? ' today' : '') + '" onclick="pickCalDay(\'' + iso + '\')">' + d +
      '<small>🟢' + asist + ' 🟡' + just + (iso <= todayStr() ? ' 🔴' + Math.max(0, activos.length - asist - just) : '') + '</small></button>';
  }
  $('#admin-cal').innerHTML = html + '</div>';

  // detalle según modo
  const det = $('#admin-cal-detail');
  const uName = id => { const u = users.find(x => x.id === id); return u ? fullName(u) : id; };

  if (state.calMode === 'dia') {
    det.innerHTML = `<h3 class="view-title">📅 ${fechaNice(state.calFecha)}</h3>` + await dayListsHTML(state.calFecha);
  } else if (state.calMode === 'semana') {
    const base = new Date(state.calFecha + 'T00:00:00');
    const dow = (base.getDay() + 6) % 7; // lunes=0
    const inicio = new Date(base); inicio.setDate(base.getDate() - dow);
    let rows = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio); d.setDate(inicio.getDate() + i);
      const iso = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
      const a = attByFecha[iso] || [];
      const bset = new Set((absByFecha[iso] || []).filter(x => x.estado !== 'rechazada').map(x => x.uid));
      rows += `<tr><td>${fechaCorta(iso)}</td><td>🟢 ${a.filter(x=>x.tipo==='asistencia').length}</td><td>🟠 ${a.filter(x=>x.tipo==='tardanza').length}</td><td>🟡 ${bset.size}</td><td>🔴 ${iso <= todayStr() ? Math.max(0, activos.length - a.length - bset.size) : 0}</td></tr>`;
    }
    det.innerHTML = `<h3 class="view-title">📅 Semana del ${fechaCorta(inicio.getFullYear() + '-' + pad(inicio.getMonth()+1) + '-' + pad(inicio.getDate()))}</h3>
      <div class="panel"><table class="tbl"><thead><tr><th>Fecha</th><th>Asistieron</th><th>Tardíos</th><th>Justificadas</th><th>Injustificadas</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  } else {
    const prefijo = y + '-' + pad(m+1);
    const diasMes = [...new Set([...att.map(a=>a.fecha), ...abs.map(b=>b.fecha)])].filter(f => f.startsWith(prefijo));
    let asist = 0, tard = 0, just = 0, injust = 0;
    diasMes.forEach(f => {
      const a = attByFecha[f] || [];
      const bset = new Set((absByFecha[f] || []).filter(x => x.estado !== 'rechazada').map(x => x.uid));
      asist += a.filter(x => x.tipo === 'asistencia').length;
      tard += a.filter(x => x.tipo === 'tardanza').length;
      just += bset.size;
      if (f <= todayStr()) injust += Math.max(0, activos.length - a.length - bset.size);
    });
    det.innerHTML = `<h3 class="view-title">📅 Resumen de ${mesNombre(y, m)}</h3>
      <div class="grid-cards">
        <div class="card c-green"><span class="num">${asist}</span><span class="lbl">Asistencias</span></div>
        <div class="card c-orange"><span class="num">${tard}</span><span class="lbl">Tardanzas</span></div>
        <div class="card c-yellow"><span class="num">${just}</span><span class="lbl">Justificadas</span></div>
        <div class="card c-red"><span class="num">${injust}</span><span class="lbl">Injustificadas</span></div>
      </div>`;
  }
}

/* ---------- USUARIOS ---------- */
async function aUsuarios() {
  const users = await Store.listUsers();
  const cats = ['postulante','aspirante','administrador'];
  $('#admin-view').innerHTML = `
    <h3 class="view-title">👥 Gestión de usuarios</h3>
    <button class="btn btn-primary" onclick="openUserForm()">➕ Crear usuario</button>
    <div class="panel"><table class="tbl">
      <thead><tr><th>Nombre completo</th><th>Usuario</th><th>Categoría</th><th>Grado</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${users.map(u => `
        <tr class="${u.activo === false ? 'row-off' : ''}">
          <td><button type="button" class="link pname" onclick="openPersona('${u.id}')">${esc(fullName(u))}</button></td>
          <td>${esc(u.username)}</td>
          <td><span class="badge cat-${u.categoria}">${CAT_LABEL[u.categoria] || u.categoria}</span></td>
          <td>${esc(u.grado || '—')}</td>
          <td>${u.activo !== false ? '<span class="chip st-ok">Activo</span>' : '<span class="chip st-bad">Desactivado</span>'}</td>
          <td class="btn-row">
            <button class="btn btn-secondary btn-sm" onclick="openUserForm('${u.id}')">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="resetPass('${esc(u.username)}')">🔑</button>
            ${u.id !== ME.id ? `<button class="btn ${u.activo !== false ? 'btn-warn' : 'btn-secondary'} btn-sm" onclick="toggleUser('${u.id}', ${u.activo !== false})">${u.activo !== false ? 'Desactivar' : 'Activar'}</button>` : '<small>(tú)</small>'}
          </td>
        </tr>`).join('')}
      </tbody></table></div>`;
}

window.openUserForm = function(id) {
  Store.listUsers().then(users => {
    const u = id ? users.find(x => x.id === id) : null;
    openModal(`
      <h3>${u ? '✏️ Editar usuario' : '➕ Crear usuario'}</h3>
      <form onsubmit="return submitUser(event, ${u ? ('\'' + u.id + '\'') : 'null'})">
        <label>Nombres</label><input id="u-nombres" required value="${u ? esc(u.nombres) : ''}">
        <label>Apellidos</label><input id="u-apellidos" required value="${u ? esc(u.apellidos) : ''}">
        <label>Usuario (login)</label><input id="u-username" required value="${u ? esc(u.username) : ''}" ${u ? 'disabled' : ''} placeholder="sin espacios, ej: juan.perez">
        ${u ? '' : '<label>Contraseña inicial</label><input id="u-password" type="password" minlength="6" required placeholder="Mínimo 6 caracteres">'}
        <label>Categoría</label>
        <select id="u-categoria">
          ${['postulante','aspirante','administrador'].map(c => '<option value="' + c + '" ' + (u && u.categoria === c ? 'selected' : '') + '>' + CAT_LABEL[c] + '</option>').join('')}
        </select>
        <label>Grado</label><input id="u-grado" value="${u ? esc(u.grado || '') : ''}" placeholder="Ej: Aspirante, Cabo, etc.">
        <button class="btn btn-primary btn-block" type="submit">${u ? 'Guardar cambios' : 'Crear usuario'}</button>
      </form>
      <button class="btn btn-ghost btn-block" onclick="closeModal()">Cancelar</button>`);
  });
};

window.submitUser = async function(e, id) {
  e.preventDefault();
  const data = {
    nombres: $('#u-nombres').value.trim(),
    apellidos: $('#u-apellidos').value.trim(),
    categoria: $('#u-categoria').value,
    grado: $('#u-grado').value.trim()
  };
  try {
    if (id) {
      await Store.updateUser(id, data);
      await audit('EDITÓ USUARIO', ME.username + ' editó a ' + data.nombres + ' ' + data.apellidos);
      toast('✅ Usuario actualizado.');
    } else {
      data.username = $('#u-username').value.trim().toLowerCase().replace(/\s+/g, '.');
      data.password = $('#u-password').value;
      const r = await Store.createUser(data);
      if (!r.ok) { toast('❌ ' + r.error, 'error'); return false; }
      await audit('CREÓ USUARIO', ME.username + ' creó a ' + data.nombres + ' ' + data.apellidos + ' (' + data.categoria + ')');
      toast('✅ Usuario creado: ' + data.username);
    }
    closeModal();
    aUsuarios();
  } catch(err) { toast('❌ ' + err.message, 'error'); }
  return false;
};

window.toggleUser = async function(id, activo) {
  if (!confirm(activo ? '¿Desactivar esta cuenta? No podrá iniciar sesión, pero su historial se conservará.' : '¿Reactivar esta cuenta?')) return;
  await Store.setActive(id, !activo);
  await audit(activo ? 'DESACTIVÓ USUARIO' : 'ACTIVÓ USUARIO', ME.username + ' cambió estado de ' + id);
  toast(activo ? 'Cuenta desactivada.' : 'Cuenta activada.');
  aUsuarios();
};

window.resetPass = async function(username) {
  if (!confirm('¿Enviar restablecimiento de contraseña a "' + username + '"?')) return;
  const r = await Store.resetPassword(username);
  if (r.ok) toast(r.temp ? '🔑 Contraseña temporal en demo: ' + r.temp : '🔑 Correo de restablecimiento enviado.');
  else toast('❌ ' + (r.error || 'No se pudo restablecer.'), 'error');
};

/* ---------- JUSTIFICACIONES ---------- */
let justFilter = 'pendiente';
async function aJustificaciones() {
  const [abs, users] = await Promise.all([Store.listAbsences({}), Store.listUsers()]);
  const uName = id => { const u = users.find(x => x.id === id); return u ? fullName(u) : id; };
  const list = abs.filter(b => justFilter === 'todas' ? true : b.estado === justFilter);
  $('#admin-view').innerHTML = `
    <h3 class="view-title">📝 Revisión de justificaciones</h3>
    <div class="seg">
      ${[['pendiente','🟡 Pendientes'],['aprobada','🟢 Aprobadas'],['rechazada','🔴 Rechazadas'],['todas','Todas']].map(o =>
        '<button class="seg-btn ' + (justFilter === o[0] ? 'active' : '') + '" onclick="justFilter=\'' + o[0] + '\';aJustificaciones()">' + o[1] + '</button>').join('')}
    </div>
    ${list.length ? list.map(b => {
      const est = b.estado === 'aprobada' ? ['🟢 Aprobada','st-ok'] : b.estado === 'rechazada' ? ['🔴 Rechazada','st-bad'] : ['🟡 Pendiente','st-just'];
      return `<div class="panel">
        <div class="list-item">
          <div>
            <strong>${esc(uName(b.uid))}</strong> — ${fechaNice(b.fecha)}
            <span class="chip ${est[1]}">${est[0]}</span><br>
            <em>${esc(b.motivo)}</em><br>
            ${(b.archivos || []).map(a => '<button type="button" class="link" onclick="openFileWrap(\'' + a.url + '\')">📎 ' + esc(a.name) + '</button>').join(' ')}
            ${b.observacion ? '<br><small>Obs. admin: ' + esc(b.observacion) + '</small>' : ''}
          </div>
          ${b.estado === 'pendiente' ? `<div class="btn-row">
            <button class="btn btn-primary btn-sm" onclick="reviewJust('${b.id}', 'aprobada')">✅ Aprobar</button>
            <button class="btn btn-danger btn-sm" onclick="reviewJust('${b.id}', 'rechazada')">❌ Rechazar</button>
          </div>` : ''}
        </div>
      </div>`;
    }).join('') : '<div class="panel"><p class="hint">No hay justificaciones en esta categoría.</p></div>'}`;
}

window.reviewJust = async function(id, estado) {
  const obs = prompt((estado === 'aprobada' ? 'Observación de aprobación' : 'Motivo del rechazo') + ' (opcional):') || '';
  await Store.updateAbsence(id, { estado, observacion: obs });
  await audit(estado === 'aprobada' ? 'APROBÓ JUSTIFICACIÓN' : 'RECHAZÓ JUSTIFICACIÓN', ME.username + ' → ' + id + (obs ? ' · ' + obs : ''));
  toast(estado === 'aprobada' ? '🟢 Justificación aprobada.' : '🔴 Justificación rechazada.');
  aJustificaciones();
};

/* ---------- GUARDIAS (ADMIN · solo verificación) ---------- */
async function aGuardias() {
  const [guards, users] = await Promise.all([Store.listGuards({}), Store.listUsers()]);
  const uName = id => { const u = users.find(x => x.id === id); return u ? fullName(u) : id; };
  const sorted = [...guards].sort((a,b) => b.fecha.localeCompare(a.fecha));
  $('#admin-view').innerHTML = `
    <h3 class="view-title">🌙 Control de guardias nocturnas</h3>
    <div class="notice">ℹ️ Las guardias las registran los propios aspirantes desde su portal ("Mis guardias"). Aquí solo verificas el cumplimiento.</div>
    <div class="panel">
      <table class="tbl"><thead><tr><th>Aspirante</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>
      ${sorted.map(g => `<tr>
        <td><button type="button" class="link pname" onclick="openPersona('${g.uid}')">${esc(uName(g.uid))}</button></td>
        <td>${fechaCorta(g.fecha)}</td>
        <td><select onchange="setGuardEstado('${g.id}', this.value)">
          ${[['pendiente','⚪ Pendiente'],['cumplida','🟢 Cumplida'],['justificada','🟡 Justificada'],['no_cumplida','🔴 No cumplida']].map(o =>
            '<option value="' + o[0] + '" ' + (g.estado === o[0] ? 'selected' : '') + '>' + o[1] + '</option>').join('')}
        </select></td>
        <td><button class="btn btn-danger btn-sm" onclick="delGuard('${g.id}')">🗑️</button></td>
      </tr>`).join('') || '<tr><td colspan="4" class="hint">Sin guardias registradas aún.</td></tr>'}
      </tbody></table>
    </div>`;
}

/* ---------- RANKINGS ---------- */
let rkTab = 'faltas';
async function aRankings() {
  const rk = await rankingData();
  const medal = i => ['🥇','🥈','🥉'][i] || (i + 1) + '.';
  let body = '';
  if (rkTab === 'faltas') {
    const total = [...rk].sort((a,b) => (b.just + b.injust) - (a.just + a.injust));
    const just = [...rk].sort((a,b) => b.just - a.just);
    const injust = [...rk].sort((a,b) => b.injust - a.injust);
    const tbl = (arr, fn, lbl) => `<div class="panel"><h4>${lbl}</h4>
      ${arr.map((r,i) => `<div class="list-item"><b>${medal(i)}</b> <button type="button" class="link pname" onclick="openPersona('${r.user.id}')">${esc(fullName(r.user))}</button> <span class="chip st-bad">${fn(r)}</span></div>`).join('') || '<p class="hint">Sin datos.</p>'}</div>`;
    body = `<div class="three-col">${tbl(total, r => r.just + r.injust, 'Total de faltas')}${tbl(just, r => r.just, 'Faltas justificadas')}${tbl(injust, r => r.injust, 'Faltas injustificadas')}</div>`;
  } else {
    const tard = [...rk].sort((a,b) => b.tard - a.tard);
    body = `<div class="panel"><h4>⏱ Ranking de tardanzas</h4>
      ${tard.map((r,i) => `<div class="list-item"><b>${medal(i)}</b> <button type="button" class="link pname" onclick="openPersona('${r.user.id}')">${esc(fullName(r.user))}</button> <span class="chip st-late">${r.tard} tardanza(s)</span> · 🟢 ${r.asist} asistencias</div>`).join('') || '<p class="hint">Sin datos.</p>'}</div>`;
  }
  $('#admin-view').innerHTML = `
    <h3 class="view-title">🏆 Rankings</h3>
    <div class="seg">
      <button class="seg-btn ${rkTab === 'faltas' ? 'active' : ''}" onclick="rkTab='faltas';aRankings()">Faltas</button>
      <button class="seg-btn ${rkTab === 'tardanzas' ? 'active' : ''}" onclick="rkTab='tardanzas';aRankings()">Tardanzas</button>
    </div>${body}`;
}

/* ---------- AUDITORÍA ---------- */
async function aAuditoria() {
  const logs = await Store.listAudit();
  $('#admin-view').innerHTML = `
    <h3 class="view-title">🧾 Auditoría del sistema</h3>
    <div class="panel"><table class="tbl">
      <thead><tr><th>Fecha</th><th>Hora</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
      <tbody>${logs.map(l => `<tr><td>${fechaCorta(l.fecha)}</td><td>${esc(l.hora || '')}</td><td>${esc(l.usuario || '')}</td><td><span class="chip st-none">${esc(l.accion)}</span></td><td><small>${esc(l.detalle || '')}</small></td></tr>`).join('') || '<tr><td colspan="5" class="hint">Sin registros.</td></tr>'}</tbody>
    </table></div>`;
}

/* ---------- CONFIGURACIÓN ---------- */
function aConfig() {
  $('#admin-view').innerHTML = `
    <h3 class="view-title">⚙️ Configuración</h3>
    <div class="panel">
      <form onsubmit="return submitConfig(event)">
        <label>Hora límite para asistencia puntual (desde esta hora se registra tardanza)</label>
        <input type="time" id="c-hora" value="${esc(CONFIG.horaLimite || '20:00')}" required>
        <button class="btn btn-primary" type="submit">Guardar configuración</button>
      </form>
      <p class="hint" style="margin-top:10px">⏱ Hora actual del servidor/dispositivo: <b>${nowTime()} h</b></p>
    </div>
    <div class="panel">
      <h4>📦 Datos</h4>
      <p class="hint">Modo actual: <b>${FB_ACTIVE ? '☁️ Firebase (producción)' : '💻 Demo local'}</b></p>
      ${FB_ACTIVE ? '' : '<button class="btn btn-danger" onclick="if(confirm(\'¿Borrar TODOS los datos demo y reiniciar?\')){localStorage.removeItem(\'bmb163_data_v1\');location.reload();}">🗑️ Reiniciar datos demo</button>'}
    </div>`;
}

async function submitConfig(e) {
  e.preventDefault();
  await Store.setConfig({ horaLimite: $('#c-hora').value });
  CONFIG = await Store.getConfig();
  await audit('CAMBIÓ CONFIGURACIÓN', ME.username + ' → hora límite ' + CONFIG.horaLimite);
  toast('⚙️ Configuración guardada.');
  return false;
}

/* ==================== ARRANQUE ==================== */
(async function boot() {
  await Store.init();
  if (FB_ACTIVE) route(); else { await route(); }
})();
