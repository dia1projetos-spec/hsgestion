// HS Gestión Admin – admin.js v2.0.0
import { initializeApp }          from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDocs,
  deleteDoc, query, orderBy, serverTimestamp, updateDoc, where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDmMP5ZCfl9JfkQQf1xIfcGAei_BPLvKj8",
  authDomain:        "hs-gestion-a102e.firebaseapp.com",
  projectId:         "hs-gestion-a102e",
  storageBucket:     "hs-gestion-a102e.firebasestorage.app",
  messagingSenderId: "40828198084",
  appId:             "1:40828198084:web:70dd328e4e242925727d91"
};
const ADMIN_EMAIL = "riconetson@gmail.com";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── STATE ─────────────────────────────────────────────────────────────────────
let allUsers = [], allMessages = [], allPacks = [];
let confirmCb = null, editingId = null;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const get  = id  => document.getElementById(id);
const qs   = sel => document.querySelector(sel);
const qsa  = sel => [...document.querySelectorAll(sel)];
const slugify = s => s.toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'-')
  .replace(/-+/g,'-').replace(/^-|-$/g,'');
const fmtDate = ts => ts?.toDate
  ? ts.toDate().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
const fmtMoney = v => v ? `$${parseFloat(v).toLocaleString('es-AR')}` : '—';

function toast(msg, type='info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 3500);
}

function openModal(id)  { get(id).classList.add('open'); }
function closeModal(id) { get(id).classList.remove('open'); }
function closeAll()     { qsa('.modal-bg').forEach(m => m.classList.remove('open')); }

function confirm(msg, cb) {
  get('confirmTxt').textContent = msg;
  confirmCb = cb;
  openModal('mConfirm');
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (user && user.email === ADMIN_EMAIL) {
    get('loginScreen').style.display = 'none';
    get('adminApp').style.display    = 'block';
    get('adminEmail').textContent    = user.email;
    await loadAll();
    startAdminClock();
    initAdminAgenda();
    loadClientMessages();
    goTo('dashboard');
  } else if (user) {
    await signOut(auth);
    window.location.href = '../index.html';
  } else {
    window.location.href = '../index.html';
  }
});

get('logoutBtn').addEventListener('click', () =>
  signOut(auth).then(() => window.location.href = '../index.html')
);

// ── NAVEGAÇÃO ─────────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  usuarios:  'Usuarios',
  mensajes:  'Mensajes',
  packs:     'Packs de Contenido'
};

function goTo(pg) {
  qsa('.page').forEach(p => p.classList.remove('active'));
  qsa('.sb-item[data-pg]').forEach(b => b.classList.remove('active'));
  get(`pg-${pg}`)?.classList.add('active');
  qs(`.sb-item[data-pg="${pg}"]`)?.classList.add('active');
  get('topbarTitle').textContent = PAGE_TITLES[pg] || pg;
  get('sidebar').classList.remove('open');
  get('sbOverlay').classList.remove('show');
}

qsa('.sb-item[data-pg]').forEach(b =>
  b.addEventListener('click', () => goTo(b.dataset.pg))
);

// Mobile sidebar
get('menuToggle').addEventListener('click', () => {
  get('sidebar').classList.toggle('open');
  get('sbOverlay').classList.toggle('show');
});
get('sbOverlay').addEventListener('click', () => {
  get('sidebar').classList.remove('open');
  get('sbOverlay').classList.remove('show');
});

// Dashboard quick actions
get('dBtnUser').addEventListener('click',  () => { goTo('usuarios'); get('btnNewUser').click(); });
get('dBtnMsg').addEventListener('click',   () => { goTo('mensajes'); get('btnNewMsg').click(); });
get('dBtnPacks').addEventListener('click', () => goTo('packs'));
get('btnRefresh').addEventListener('click', loadAll);

// ── LOAD ALL ──────────────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadUsers(), loadMessages(), loadPacks()]);
  updateStats();
}

// ── RELÓGIO ADMIN ────────────────────────────────────────────────────────────────
function startAdminClock() {
  const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    const cl = get('adminClock'), dt = get('adminDate');
    if(cl) cl.textContent = `${h}:${m}:${s}`;
    if(dt) dt.textContent = `${DIAS[now.getDay()]}, ${now.getDate()} ${MESES[now.getMonth()]} ${now.getFullYear()}`;
  }
  tick();
  setInterval(tick, 1000);
}

// ── AGENDA ADMIN ──────────────────────────────────────────────────────────────
function initAdminAgenda() {
  const MONTHS_ES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const DAYS_ES   = ['D','L','M','M','J','V','S'];
  const KEY = 'hs_admin_agenda';
  let events = JSON.parse(localStorage.getItem(KEY)||'{}');
  let vy = new Date().getFullYear(), vm = new Date().getMonth(), sel = null;

  function save() { localStorage.setItem(KEY, JSON.stringify(events)); }

  function renderCal() {
    const gEl = get('adAgGrid'), mEl = get('adAgMonth');
    if(!gEl||!mEl) return;
    mEl.textContent = `${MONTHS_ES[vm]} ${vy}`;
    const first = new Date(vy,vm,1).getDay();
    const total = new Date(vy,vm+1,0).getDate();
    const today = new Date();
    let html = DAYS_ES.map(d=>`<div style="text-align:center;font-size:.55rem;color:#484f58;padding:2px 0;font-family:monospace;">${d}</div>`).join('');
    for(let i=0;i<first;i++) html+=`<div></div>`;
    for(let d=1;d<=total;d++){
      const key=`${vy}-${String(vm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isT = d===today.getDate()&&vm===today.getMonth()&&vy===today.getFullYear();
      const hasE = events[key]?.length>0;
      const isSel = key===sel;
      html+=`<div onclick="adSelDay('${key}')" style="
        aspect-ratio:1;display:flex;align-items:center;justify-content:center;
        border-radius:4px;font-size:.65rem;cursor:pointer;
        color:${isT?'#1f6feb':isSel?'#d29922':'#8b949e'};
        background:${isSel?'rgba(210,153,34,.1)':'transparent'};
        border:1px solid ${isT?'#1f6feb':'transparent'};
        position:relative;
      ">${d}${hasE?`<span style="position:absolute;bottom:2px;width:3px;height:3px;border-radius:50%;background:#d29922;"></span>`:''}</div>`;
    }
    gEl.innerHTML = html;
    renderEvs();
  }

  function renderEvs() {
    const el = get('adAgEvents');
    if(!el) return;
    if(!sel){el.innerHTML='<p style="font-size:.68rem;color:#484f58;">Seleccioná un día</p>';return;}
    const evs = events[sel]||[];
    el.innerHTML = evs.length
      ? evs.map((ev,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 6px;background:rgba(210,153,34,.08);border-radius:4px;margin-bottom:3px;">
          <span style="flex:1;font-size:.72rem;color:#c9d1d9;">${ev}</span>
          <button onclick="adDelEv('${sel}',${i})" style="background:none;border:none;color:#484f58;cursor:pointer;font-size:.75rem;">✕</button>
        </div>`).join('')
      : `<p style="font-size:.68rem;color:#484f58;">Sin eventos el ${sel}</p>`;
  }

  window.adSelDay = key => { sel=key; renderCal(); };
  window.adDelEv  = (key,i) => {
    events[key].splice(i,1);
    if(!events[key].length) delete events[key];
    save(); renderCal();
  };

  get('adAgPrev')?.addEventListener('click',()=>{ if(vm===0){vm=11;vy--;}else vm--; renderCal(); });
  get('adAgNext')?.addEventListener('click',()=>{ if(vm===11){vm=0;vy++;}else vm++; renderCal(); });
  get('adAgAdd')?.addEventListener('click',()=>{
    const txt=get('adAgInput')?.value.trim();
    if(!txt)return;
    if(!sel){alert('Seleccioná un día primero');return;}
    if(!events[sel])events[sel]=[];
    events[sel].push(txt);
    save();
    if(get('adAgInput'))get('adAgInput').value='';
    renderCal();
  });
  get('adAgInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')get('adAgAdd')?.click();});
  renderCal();
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function updateStats() {
  const paid = allUsers.filter(u => u.paymentStatus === 'paid').length;
  get('stUsers').textContent = allUsers.length;
  get('stPaid').textContent  = paid;
  get('stOpen').textContent  = allUsers.length - paid;
  get('stPacks').textContent = allPacks.length;
  get('userPill').textContent = allUsers.length;

  // Dashboard recentes
  const el = get('dashRecent');
  if (!allUsers.length) {
    el.innerHTML = `<p style="color:#484f58;font-size:.83rem;">Sin usuarios aún</p>`;
    return;
  }
  el.innerHTML = allUsers.slice(0,5).map(u => `
    <div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid #21262d;">
      <div class="u-ava" style="width:28px;height:28px;font-size:.75rem;">
        ${u.logoFile
          ? `<img src="../../images/usuarios/${u.logoFile}" onerror="this.style.display='none'" />`
          : u.name.charAt(0).toUpperCase()}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:.83rem;font-weight:600;color:#f0f6fc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.name}</div>
        <div style="font-size:.7rem;color:#484f58;">${u.service || 'Sin servicio'}</div>
      </div>
      <span class="badge ${u.paymentStatus==='paid'?'badge-green':'badge-red'}" style="font-size:.68rem;">
        ${u.paymentStatus==='paid'?'Pagado':'Pendiente'}
      </span>
    </div>`).join('');
}

// ── USUARIOS ──────────────────────────────────────────────────────────────────
async function loadUsers() {
  try {
    const snap = await getDocs(query(collection(db,'users'), orderBy('createdAt','desc')));
    allUsers = snap.docs.map(d => ({id:d.id,...d.data()}));
  } catch {
    const snap = await getDocs(collection(db,'users'));
    allUsers = snap.docs.map(d => ({id:d.id,...d.data()}));
  }
  renderUsers();
  fillSelects();
}

function renderUsers() {
  const tbody = get('usersBody');
  if (!allUsers.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty"><span class="empty-ic">👥</span><p>Sin usuarios. Hacé clic en "Crear Usuario".</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = allUsers.map(u => `
    <tr>
      <td>
        <div class="u-cell">
          <div class="u-ava">
            ${u.logoFile
              ? `<img src="../../images/usuarios/${u.logoFile}" onerror="this.style.display='none'" />`
              : u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div class="u-name">${u.name}</div>
            <div class="u-email">${u.email}</div>
          </div>
        </div>
      </td>
      <td>${u.service || '—'}</td>
      <td>${fmtMoney(u.serviceValue)}</td>
      <td><span class="badge ${u.paymentStatus==='paid'?'badge-green':'badge-red'}">${u.paymentStatus==='paid'?'✓ Pagado':'⏳ Pendiente'}</span></td>
      <td><span class="badge badge-blue">${fmtDate(u.createdAt)}</span></td>
      <td><a href="../usuarios/index.html" target="_blank" class="pg-link">🔗 Ver</a></td>
      <td>
        <div class="act-row">
          <button class="btn btn-gray btn-ico btn-sm" onclick="editUser('${u.id}')" title="Editar">✏️</button>
          <button class="btn btn-gray btn-ico btn-sm" onclick="togglePay('${u.id}','${u.paymentStatus}')" title="Cambiar pago">💳</button>
          <button class="btn-x" onclick="askDeleteUser('${u.id}','${u.name.replace(/'/g,"\\'")}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

function fillSelects() {
  const optsAll = `<option value="">📢 Todos los usuarios</option>` +
    allUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  const optsNone = `<option value="">— Todos / Elegir después —</option>` +
    allUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  if(get('msgTo'))  get('msgTo').innerHTML  = optsAll;
  if(get('packTo')) get('packTo').innerHTML = optsNone;
}

// Criar/Editar
get('btnNewUser').addEventListener('click', () => {
  editingId = null;
  get('mUserTitle').textContent = 'Crear Usuario';
  get('userForm').reset();
  get('logoPreview').style.display = 'none';
  get('fbTip').style.display = 'none';
  openModal('mUser');
});

get('uLogo').addEventListener('input', e => {
  const v = e.target.value.trim();
  const img = get('logoPreview');
  if (v) { img.src = `../../images/usuarios/${v}`; img.style.display = 'block'; img.onerror = () => img.style.display='none'; }
  else     { img.style.display = 'none'; }
});

window.editUser = uid => {
  const u = allUsers.find(x => x.id===uid);
  if (!u) return;
  editingId = uid;
  get('mUserTitle').textContent = 'Editar Usuario';
  get('uName').value    = u.name    || '';
  get('uEmail').value   = u.email   || '';
  get('uPassword').value= '';
  get('uService').value = u.service || '';
  get('uValue').value   = u.serviceValue || '';
  get('uLogo').value    = u.logoFile || '';
  qsa('input[name=pay]').forEach(r => r.checked = r.value === u.paymentStatus);
  const img = get('logoPreview');
  if (u.logoFile) { img.src = `../../images/usuarios/${u.logoFile}`; img.style.display='block'; }
  else img.style.display = 'none';
  get('fbTip').style.display = 'none';
  openModal('mUser');
};

get('userForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn  = get('saveUserBtn');
  btn.textContent = 'Guardando...'; btn.disabled = true;

  const name      = get('uName').value.trim();
  const email     = get('uEmail').value.trim();
  const password  = get('uPassword').value.trim();
  const service   = get('uService').value.trim();
  const value     = get('uValue').value.trim();
  const logoFile  = get('uLogo').value.trim();
  const payStatus = qs('input[name=pay]:checked')?.value || 'open';
  const slug      = slugify(name) || `u${Date.now()}`;

  try {
    if (!editingId) {
      await setDoc(doc(db,'users',`u_${Date.now()}`), {
        name, email, password, service, serviceValue:value,
        paymentStatus:payStatus, logoFile, slug, createdAt:serverTimestamp()
      });
      get('fbTip').style.display = 'block';
      toast(`✅ Usuario "${name}" creado!`, 'success');
    } else {
      await updateDoc(doc(db,'users',editingId), {
        name, service, serviceValue:value, paymentStatus:payStatus, logoFile, slug
      });
      toast('✅ Usuario actualizado', 'success');
      closeModal('mUser');
    }
    await loadUsers(); updateStats();
  } catch(err) {
    toast('Error: '+err.message, 'error');
  } finally {
    btn.textContent = '💾 Guardar'; btn.disabled = false;
  }
});

window.togglePay = async (uid, cur) => {
  const next = cur==='paid' ? 'open' : 'paid';
  await updateDoc(doc(db,'users',uid), {paymentStatus:next});
  toast(next==='paid' ? '✅ Marcado Pagado' : '⏳ Marcado Pendiente', 'success');
  await loadUsers(); updateStats();
};

window.askDeleteUser = (uid, name) =>
  confirm(`¿Eliminar a "${name}"? Se borran sus datos, mensajes y packs.`, () => deleteUser(uid));

async function deleteUser(uid) {
  try {
    await deleteDoc(doc(db,'users',uid));
    const s1 = await getDocs(query(collection(db,'messages'), where('userId','==',uid)));
    for (const d of s1.docs) await deleteDoc(d.ref);
    const s2 = await getDocs(query(collection(db,'packAssignments'), where('userId','==',uid)));
    for (const d of s2.docs) await deleteDoc(d.ref);
    toast('🗑️ Usuario eliminado', 'success');
    await loadAll();
  } catch(err) { toast('Error: '+err.message, 'error'); }
}

// ── MENSAJES ──────────────────────────────────────────────────────────────────
async function loadMessages() {
  try {
    const snap = await getDocs(query(collection(db,'messages'), orderBy('createdAt','desc')));
    allMessages = snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch {
    const snap = await getDocs(collection(db,'messages'));
    allMessages = snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  renderMessages();
}

function renderMessages() {
  const el = get('msgListAdmin');
  if(!el) return;
  if (!allMessages.length) {
    el.innerHTML = `<div class="empty"><span class="empty-ic">💬</span><p>Sin mensajes aún</p></div>`;
    return;
  }
  el.innerHTML = allMessages.map(m => {
    const u = allUsers.find(x => x.id===m.userId);
    return `
      <div class="msg-card">
        <div class="msg-top">
          <span class="msg-to">→ ${m.userId==='all'?'📢 Todos':u?.name||m.userId}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="msg-date">${fmtDate(m.createdAt)}</span>
            <button class="btn-x" onclick="askDeleteMsg('${m.id}')">✕</button>
          </div>
        </div>
        <p class="msg-txt">${m.text}</p>
      </div>`;
  }).join('');
}

get('btnNewMsg').addEventListener('click', () => { get('msgForm').reset(); openModal('mMsg'); });

get('msgForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = get('saveMsgBtn');
  btn.textContent = 'Enviando...'; btn.disabled = true;
  try {
    await setDoc(doc(collection(db,'messages')), {
      userId: get('msgTo').value || 'all',
      text:   get('msgTxt').value.trim(),
      createdAt: serverTimestamp()
    });
    toast('📨 Mensaje enviado', 'success');
    closeModal('mMsg');
    await loadMessages();
  } catch(err) { toast('Error: '+err.message, 'error'); }
  finally { btn.textContent = '📨 Enviar'; btn.disabled = false; }
});

window.askDeleteMsg = mid =>
  confirm('¿Eliminar este mensaje?', () => deleteMsg(mid));

async function deleteMsg(mid) {
  await deleteDoc(doc(db,'messages',mid));
  toast('🗑️ Mensaje eliminado', 'success');
  await loadMessages();
}

// ── PACKS (Cloudinary) ───────────────────────────────────────────────────────────

// Credenciais Cloudinary
const CLOUD_NAME   = "dc0bxgeea";
const UPLOAD_PRESET = "hs_gestion_packs"; // unsigned preset — criar no Cloudinary Dashboard

async function uploadToCloudinary(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'hs-gestion/packs');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
    };
    xhr.onload = () => {
      const res = JSON.parse(xhr.responseText);
      if (xhr.status === 200) resolve(res);
      else reject(new Error(res.error?.message || 'Upload falhou'));
    };
    xhr.onerror = () => reject(new Error('Erro de rede'));
    xhr.send(formData);
  });
}

async function loadPacks() {
  try {
    const snap = await getDocs(query(collection(db,'packs'), orderBy('createdAt','desc')));
    allPacks = snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch {
    const snap = await getDocs(collection(db,'packs'));
    allPacks = snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  renderPacks();
}

function renderPacks() {
  const el = get('packsGrid');
  if (!allPacks.length) {
    el.innerHTML = `<div class="empty" style="grid-column:1/-1"><span class="empty-ic">📦</span><p>Sin packs aún. Hacé clic en "Nuevo Pack".</p></div>`;
    return;
  }
  el.innerHTML = allPacks.map(p => {
    const assignedNames = (p.assignedTo || [])
      .map(uid => allUsers.find(u=>u.id===uid)?.name || uid)
      .join(', ') || 'Sin asignar';
    const thumb = p.files?.[0];
    const isVideo = thumb?.resource_type === 'video';
    return `
      <div class="pack-card">
        <div class="pack-thumb">
          ${thumb
            ? isVideo
              ? `<video src="${thumb.url}" muted style="width:100%;height:100%;object-fit:cover;"></video>`
              : `<img src="${thumb.url}" style="width:100%;height:100%;object-fit:cover;" />`
            : '📦'}
          <div style="position:absolute;top:7px;left:7px;">
            <span class="badge ${isVideo?'badge-blue':'badge-green'}" style="font-size:.65rem;">
              ${isVideo?'🎬 Video':'🖼️ Imagen'}
            </span>
          </div>
          <div style="position:absolute;top:7px;right:7px;background:rgba(0,0,0,.6);color:#fff;border-radius:20px;padding:2px 7px;font-size:.68rem;font-weight:700;">
            ${p.files?.length || 0} archivo${p.files?.length!==1?'s':''}
          </div>
        </div>
        <div class="pack-body">
          <div class="pack-name">${p.title}</div>
          <div class="pack-desc">${p.description || ''}</div>
          <div class="pack-ft">
            <span class="pack-who">👤 ${assignedNames}</span>
            <div style="display:flex;gap:5px;">
              <button class="btn btn-blue btn-sm" onclick="openAssignModal('${p.id}')">Asignar</button>
              <button class="btn-x" onclick="askDeletePack('${p.id}','${p.title.replace(/'/g,"\'")}')">✕</button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// Preview de arquivos selecionados
get('pFiles').addEventListener('change', e => {
  const files = [...e.target.files];
  const preview = get('filePreview');
  const grid = get('previewGrid');
  if (!files.length) { preview.style.display='none'; return; }
  preview.style.display = 'block';
  grid.innerHTML = files.map(f => {
    const url = URL.createObjectURL(f);
    const isVideo = f.type.startsWith('video');
    return `<div style="border-radius:6px;overflow:hidden;height:70px;background:#0d1117;border:1px solid #21262d;">
      ${isVideo
        ? `<video src="${url}" style="width:100%;height:100%;object-fit:cover;" muted></video>`
        : `<img src="${url}" style="width:100%;height:100%;object-fit:cover;" />`}
    </div>`;
  }).join('');
});

// Novo Pack
get('btnNewPack').addEventListener('click', () => {
  get('packForm').reset();
  get('previewGrid').innerHTML = '';
  get('filePreview').style.display = 'none';
  get('uploadProgress').style.display = 'none';
  openModal('mPack');
});

get('packForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn   = get('savePackBtn');
  const files = [...get('pFiles').files];
  if (!files.length) { toast('Seleccioná al menos un archivo','error'); return; }

  const title  = get('pTitle').value.trim();
  const desc   = get('pDesc').value.trim();
  const userId = get('packTo').value;

  btn.textContent = 'Subiendo...'; btn.disabled = true;
  get('uploadProgress').style.display = 'block';

  try {
    const uploaded = [];
    for (let i=0; i<files.length; i++) {
      const pct = Math.round(i/files.length*100);
      get('progressBar').style.width = pct+'%';
      get('progressTxt').textContent = `Subiendo ${i+1} de ${files.length}...`;
      const res = await uploadToCloudinary(files[i], p => {
        const overall = Math.round((i + p/100) / files.length * 100);
        get('progressBar').style.width = overall+'%';
      });
      uploaded.push({
        url:           res.secure_url,
        public_id:     res.public_id,
        resource_type: res.resource_type,
        format:        res.format,
        bytes:         res.bytes
      });
    }

    get('progressBar').style.width = '100%';
    get('progressTxt').textContent = 'Guardando en base de datos...';

    // Salvar no Firestore
    const packRef = doc(collection(db,'packs'));
    await setDoc(packRef, {
      title, description: desc,
      files: uploaded,
      assignedTo: userId ? [userId] : [],
      createdAt: serverTimestamp()
    });

    toast(`✅ Pack "${title}" creado con ${uploaded.length} archivo(s)!`, 'success');
    closeModal('mPack');
    await loadPacks();
    updateStats();
  } catch(err) {
    console.error(err);
    toast('Error al subir: ' + err.message, 'error');
  } finally {
    btn.textContent = '☁️ Subir y Guardar'; btn.disabled = false;
    get('uploadProgress').style.display = 'none';
  }
});

// Asignar pack a usuario
function fillAssignSelect() {
  const opts = `<option value="">— Seleccionar usuario —</option>` +
    allUsers.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  if(get('assignTo')) get('assignTo').innerHTML = opts;
}

window.openAssignModal = pid => {
  get('assignPackId').value = pid;
  fillAssignSelect();
  openModal('mAssign');
};

get('assignForm').addEventListener('submit', async e => {
  e.preventDefault();
  const pid = get('assignPackId').value;
  const uid = get('assignTo').value;
  if (!uid) { toast('Seleccioná un usuario','error'); return; }
  try {
    const pack = allPacks.find(p=>p.id===pid);
    const current = pack?.assignedTo || [];
    if (current.includes(uid)) { toast('Este usuario ya tiene este pack','info'); return; }
    await updateDoc(doc(db,'packs',pid), { assignedTo: [...current, uid] });
    toast('✅ Pack asignado!', 'success');
    closeModal('mAssign');
    await loadPacks();
  } catch(err) { toast('Error: '+err.message,'error'); }
});

window.askDeletePack = (pid, title) =>
  confirm(`¿Eliminar el pack "${title}"? Los archivos en Cloudinary serán desvinculados.`, () => deletePack(pid));

async function deletePack(pid) {
  try {
    await deleteDoc(doc(db,'packs',pid));
    toast('🗑️ Pack eliminado','success');
    await loadPacks();
  } catch(err) { toast('Error: '+err.message,'error'); }
}

// ── CONFIRM ───────────────────────────────────────────────────────────────────
get('confirmSi').addEventListener('click', () => { closeModal('mConfirm'); confirmCb?.(); });
get('confirmNo').addEventListener('click', () => closeModal('mConfirm'));

// ── FECHAR MODAIS ─────────────────────────────────────────────────────────────
qsa('[data-close]').forEach(b => b.addEventListener('click', closeAll));
qsa('.modal-bg').forEach(bg => bg.addEventListener('click', e => { if(e.target===bg) closeAll(); }));
document.addEventListener('keydown', e => { if(e.key==='Escape') closeAll(); });

// ── MENSAGENS DOS CLIENTES ────────────────────────────────────────────────────
let clientMessages = [];

async function loadClientMessages() {
  try {
    const snap = await getDocs(query(collection(db,'clientMessages'), orderBy('createdAt','desc')));
    clientMessages = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderClientMessages();
    // Badge de contagem
    const count = get('clientMsgCount');
    if(count && clientMessages.length > 0) {
      count.textContent = clientMessages.length;
      count.style.display = 'inline';
    }
  } catch(err) { console.error('Client msgs:', err); }
}

function renderClientMessages() {
  const el = get('msgListClient');
  if(!el) return;
  if(!clientMessages.length) {
    el.innerHTML = `<div class="empty"><span class="empty-ic">📥</span><p>Sin mensajes de clientes aún</p></div>`;
    return;
  }
  el.innerHTML = clientMessages.map(m => {
    const u = allUsers.find(x=>x.id===m.userId);
    return `
      <div class="msg-card">
        <div class="msg-top">
          <span class="msg-to">📥 ${m.userName || u?.name || 'Cliente'}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="msg-date">${fmtDate(m.createdAt)}</span>
            <button class="btn-x" onclick="askDeleteClientMsg('${m.id}')">✕</button>
          </div>
        </div>
        <p class="msg-txt">${m.text}</p>
      </div>`;
  }).join('');
}

window.askDeleteClientMsg = mid =>
  confirm('¿Eliminar este mensaje del cliente?', async () => {
    await deleteDoc(doc(db,'clientMessages',mid));
    toast('🗑️ Mensaje eliminado','success');
    await loadClientMessages();
  });

// Tabs de mensagens
window.switchMsgTab = tab => {
  const admin  = get('msgListAdmin');
  const client = get('msgListClient');
  const btnA   = get('tabAdmin');
  const btnC   = get('tabClient');
  if(tab==='admin'){
    admin.style.display='flex'; client.style.display='none';
    btnA.className='btn btn-blue btn-sm'; btnC.className='btn btn-gray btn-sm';
  } else {
    admin.style.display='none'; client.style.display='flex';
    btnA.className='btn btn-gray btn-sm'; btnC.className='btn btn-blue btn-sm';
  }
};
