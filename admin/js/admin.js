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
  const opts = `<option value="">📢 Todos los usuarios</option>` +
    allUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  ['msgTo','packTo'].forEach(id => { if(get(id)) get(id).innerHTML = opts; });
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
  const el = get('msgList');
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

// ── PACKS ─────────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
// ⚡ Editá este array para agregar tus packs
// Archivos en: packs/imagens/  y  packs/videos/
// ════════════════════════════════════════════════════════════
const PACKS_CATALOG = [
  // {
  //   id: "pack-redes-enero",
  //   title: "Pack Redes – Enero",
  //   description: "15 imágenes para redes sociales.",
  //   type: "images",
  //   thumb: "../packs/imagens/redes-enero/thumb.jpg",
  //   files: ["../packs/imagens/redes-enero/foto1.jpg"]
  // },
];

async function loadPacks() {
  const snap = await getDocs(collection(db,'packAssignments'));
  const assigns = snap.docs.map(d=>({id:d.id,...d.data()}));
  allPacks = PACKS_CATALOG.map(p=>({...p, assigns: assigns.filter(a=>a.packId===p.id)}));
  renderPacks();
}

function renderPacks() {
  const el = get('packsGrid');
  if (!PACKS_CATALOG.length) {
    el.innerHTML = `<div class="empty" style="grid-column:1/-1"><span class="empty-ic">📦</span><p>Editá <code>PACKS_CATALOG</code> en admin.js para agregar packs</p></div>`;
    return;
  }
  el.innerHTML = allPacks.map(p => {
    const who = p.assigns.map(a=>allUsers.find(u=>u.id===a.userId)?.name||a.userId).join(', ')||'Sin asignar';
    return `
      <div class="pack-card">
        <div class="pack-thumb">
          ${p.type==='images'
            ? `<img src="${p.thumb}" onerror="this.style.display='none'" />`
            : `<video src="${p.files[0]}" muted></video>`}
        </div>
        <div class="pack-body">
          <div class="pack-name">${p.title}</div>
          <div class="pack-desc">${p.description}</div>
          <div class="pack-ft">
            <span class="pack-who">👤 ${who}</span>
            <div style="display:flex;gap:5px;">
              <button class="btn btn-blue btn-sm" onclick="openAssign('${p.id}')">Asignar</button>
              <button class="btn-x" onclick="askUnassign('${p.id}')">✕</button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

window.openAssign = pid => { get('packId').value = pid; openModal('mPack'); };

get('packForm').addEventListener('submit', async e => {
  e.preventDefault();
  const pid = get('packId').value;
  const uid = get('packTo').value;
  if (!uid) { toast('Seleccioná un usuario','error'); return; }
  try {
    await setDoc(doc(db,'packAssignments',`${pid}_${uid}`), {
      packId:pid, userId:uid, assignedAt:serverTimestamp()
    });
    toast('✅ Pack asignado','success');
    closeModal('mPack');
    await loadPacks();
  } catch(err) { toast('Error: '+err.message,'error'); }
});

window.askUnassign = pid =>
  confirm('¿Quitar todas las asignaciones de este pack?', async () => {
    const snap = await getDocs(query(collection(db,'packAssignments'),where('packId','==',pid)));
    for (const d of snap.docs) await deleteDoc(d.ref);
    toast('🗑️ Asignaciones eliminadas','success');
    await loadPacks();
  });

// ── CONFIRM ───────────────────────────────────────────────────────────────────
get('confirmSi').addEventListener('click', () => { closeModal('mConfirm'); confirmCb?.(); });
get('confirmNo').addEventListener('click', () => closeModal('mConfirm'));

// ── FECHAR MODAIS ─────────────────────────────────────────────────────────────
qsa('[data-close]').forEach(b => b.addEventListener('click', closeAll));
qsa('.modal-bg').forEach(bg => bg.addEventListener('click', e => { if(e.target===bg) closeAll(); }));
document.addEventListener('keydown', e => { if(e.key==='Escape') closeAll(); });
