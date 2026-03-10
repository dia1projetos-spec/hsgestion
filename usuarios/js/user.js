// HS Gestión – User Page JS v3.1.0
import { initializeApp }    from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDocs, getDoc,
  deleteDoc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
const IMGBB_API_KEY = "2ba495fa493ded06658bad56dd84c1e4";

const firebaseConfig = {
  apiKey:            "AIzaSyDmMP5ZCfl9JfkQQf1xIfcGAei_BPLvKj8",
  authDomain:        "hs-gestion-a102e.firebaseapp.com",
  projectId:         "hs-gestion-a102e",
  storageBucket:     "hs-gestion-a102e.firebasestorage.app",
  messagingSenderId: "40828198084",
  appId:             "1:40828198084:web:70dd328e4e242925727d91"
};

const ADMIN_EMAIL  = "riconetson@gmail.com";
const ALIAS_PAGO   = "sofiacuello25";
const WHATSAPP_NUM = "5513981763452";
const ZOE_EMAIL    = "zoeveos@protonmail.com";

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);

const get  = id => document.getElementById(id);
const fmtDate = ts => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'numeric'});
};

let currentUser = null;
let userData    = null;

// ── AUTH ──────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (!user)                      { window.location.href = '../index.html'; return; }
  if (user.email === ADMIN_EMAIL) { window.location.href = '../admin/index.html'; return; }
  currentUser = user;
  await loadUser(user);
});

async function loadUser(user) {
  try {
    const snap = await getDocs(query(collection(db,'users'), where('email','==',user.email)));
    if (snap.empty) {
      showError('Tu cuenta no está registrada. Contactá al administrador.');
      return;
    }
    userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
    renderPage(userData);

    // Carregar em paralelo
    await Promise.all([
      loadMessages(),
      loadPacks()
    ]);

    // Módulo exclusivo da Zoe
    if (user.email === ZOE_EMAIL) {
      initProductManager(userData.id);
    }

    get('loadingState').style.display = 'none';
    get('mainContent').style.display  = 'block';
  } catch(err) {
    console.error('loadUser error:', err);
    showError('Error al cargar tu perfil. Intentá recargar la página.');
  }
}

// ── RENDER PAGE ───────────────────────────────────────────────────────────────
function renderPage(u) {
  document.title = `${u.name} – HS Gestión`;

  // Avatar
  const ava = get('clientAva');
  if (u.logoFile) {
    const img = document.createElement('img');
    img.src = `../images/usuarios/${u.logoFile}`;
    img.onerror = () => { ava.textContent = u.name.charAt(0).toUpperCase(); };
    ava.innerHTML = '';
    ava.appendChild(img);
  } else {
    ava.textContent = u.name.charAt(0).toUpperCase();
  }

  get('headerName').textContent = u.name;
  get('heroTitle').innerHTML    = `Hola, <em>${u.name.split(' ')[0]}</em>`;
  get('heroSub').textContent    = u.service ? `Servicio: ${u.service}` : 'Tu espacio exclusivo de gestión';

  // Pagamento
  const isPaid = u.paymentStatus === 'paid';
  const icon   = get('payIcon');
  icon.textContent = isPaid ? '✅' : '⏳';
  icon.className   = `pay-icon ${isPaid ? 'paid' : 'open'}`;
  get('payLabel').textContent = isPaid ? 'Pago Confirmado' : 'Pago Pendiente';
  if (u.serviceValue) get('payAmount').textContent = `$${parseFloat(u.serviceValue).toLocaleString('es-AR')}`;
  if (u.service)      get('payService').textContent = u.service;

  const payAct = get('payAction');
  if (!isPaid) {
    const msg = encodeURIComponent(`Hola HS Gestión! Soy ${u.name} y quiero abonar mi servicio.\nAlias: ${ALIAS_PAGO}`);
    payAct.innerHTML = `
      <a href="https://wa.me/${WHATSAPP_NUM}?text=${msg}" target="_blank" rel="noopener" class="pay-btn">
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:white;flex-shrink:0;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Pagar por WhatsApp
      </a>
      <p style="font-size:.72rem;color:var(--muted);margin-top:8px;">Alias: <strong style="color:var(--gold)">${ALIAS_PAGO}</strong></p>`;
  } else {
    payAct.innerHTML = `<p class="pay-confirmed">✦ Servicio activo y al día 🎉</p>`;
  }

  get('logoutBtn').addEventListener('click', () =>
    signOut(auth).then(() => window.location.href = '../index.html')
  );

  startClock();
  initAgenda(u.id);
}

// ── RELÓGIO ───────────────────────────────────────────────────────────────────
function startClock() {
  const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    if(get('ch')) get('ch').textContent = h;
    if(get('cm')) get('cm').textContent = m;
    if(get('cs')) get('cs').textContent = s;
    if(get('clockDate')) get('clockDate').textContent =
      `${DIAS[now.getDay()]}, ${now.getDate()} de ${MESES[now.getMonth()]} ${now.getFullYear()}`;
  }
  tick();
  setInterval(tick, 1000);
}

// ── AGENDA ────────────────────────────────────────────────────────────────────
function initAgenda(userId) {
  const MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const KEY    = `hs_agenda_${userId}`;
  let events   = {};
  try { events = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch{}

  let vy = new Date().getFullYear();
  let vm = new Date().getMonth();
  let selectedDate = null;

  function save() { localStorage.setItem(KEY, JSON.stringify(events)); }

  function renderCalendar() {
    const gEl = get('agGrid'), mEl = get('agMonth');
    if(!gEl || !mEl) return;
    mEl.textContent = `${MONTHS[vm]} ${vy}`;
    const firstDay = new Date(vy, vm, 1).getDay();
    const total    = new Date(vy, vm+1, 0).getDate();
    const today    = new Date();
    let html = DAYS.map(d=>`<div class="agenda-day-name">${d}</div>`).join('');
    for(let i=0; i<firstDay; i++) html += `<div class="agenda-day empty-day"></div>`;
    for(let d=1; d<=total; d++) {
      const key = `${vy}-${String(vm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = d===today.getDate() && vm===today.getMonth() && vy===today.getFullYear();
      const hasEv   = (events[key]||[]).length > 0;
      const isSel   = key === selectedDate;
      html += `<div class="agenda-day ${isToday?'today':''} ${hasEv?'has-event':''} ${isSel?'marked':''}"
        onclick="agSelectDay('${key}')">${d}</div>`;
    }
    gEl.innerHTML = html;
    renderEvents();
  }

  function renderEvents() {
    const el = get('agEvents');
    if(!el) return;
    if (!selectedDate) {
      el.innerHTML = `<p style="font-size:.72rem;color:var(--muted);padding:4px 0;">Seleccioná un día para ver sus eventos</p>`;
      return;
    }
    const evs = events[selectedDate] || [];
    if (!evs.length) {
      el.innerHTML = `<p style="font-size:.72rem;color:var(--muted);padding:4px 0;">Sin eventos el ${selectedDate}</p>`;
      return;
    }
    el.innerHTML = evs.map((ev, i) => `
      <div class="event-item">
        <span class="ev-text">${ev}</span>
        <span class="ev-date">${selectedDate}</span>
        <button class="ev-del" onclick="agDeleteEvent('${selectedDate}',${i})">✕</button>
      </div>`).join('');
  }

  window.agSelectDay = key => { selectedDate = key; renderCalendar(); };
  window.agDeleteEvent = (key, i) => {
    events[key].splice(i, 1);
    if(!events[key].length) delete events[key];
    save(); renderCalendar();
  };

  get('agPrev')?.addEventListener('click', () => {
    if(vm===0){vm=11;vy--;}else vm--;
    renderCalendar();
  });
  get('agNext')?.addEventListener('click', () => {
    if(vm===11){vm=0;vy++;}else vm++;
    renderCalendar();
  });
  get('agAddBtn')?.addEventListener('click', () => {
    const txt = get('agInput')?.value.trim();
    if(!txt) return;
    if(!selectedDate){ alert('Seleccioná un día primero'); return; }
    if(!events[selectedDate]) events[selectedDate] = [];
    events[selectedDate].push(txt);
    save();
    if(get('agInput')) get('agInput').value = '';
    renderCalendar();
  });
  get('agInput')?.addEventListener('keydown', e => { if(e.key==='Enter') get('agAddBtn')?.click(); });

  renderCalendar();
}

// ── MENSAGENS ─────────────────────────────────────────────────────────────────
async function loadMessages() {
  if(!userData) return;
  const el = get('msgArea');
  try {
    // 1. Mensagens do ADMIN para este usuário (ou para todos)
    const allMsgsSnap = await getDocs(collection(db, 'messages'));
    const adminMsgs = allMsgsSnap.docs
      .map(d => ({ id: d.id, ...d.data(), source: 'admin' }))
      .filter(m => m.userId === 'all' || m.userId === userData.id);

    // 2. Mensagens do CLIENTE enviadas para o admin
    let clientMsgs = [];
    try {
      const clientSnap = await getDocs(
        query(collection(db, 'clientMessages'), where('userId', '==', userData.id))
      );
      clientMsgs = clientSnap.docs.map(d => ({ id: d.id, ...d.data(), source: 'client' }));
    } catch(e) {
      // Sem índice ainda — busca sem orderBy
      try {
        const clientSnap2 = await getDocs(collection(db, 'clientMessages'));
        clientMsgs = clientSnap2.docs
          .map(d => ({ id: d.id, ...d.data(), source: 'client' }))
          .filter(m => m.userId === userData.id);
      } catch(e2) { console.warn('clientMessages:', e2.message); }
    }

    // 3. Combinar e ordenar por data
    const all = [...adminMsgs, ...clientMsgs].sort((a, b) => {
      const ta = a.createdAt?.toDate?.()?.getTime?.() || 0;
      const tb = b.createdAt?.toDate?.()?.getTime?.() || 0;
      return ta - tb;
    });

    renderMessages(all);
  } catch(err) {
    console.error('loadMessages error:', err);
  }
}

function renderMessages(msgs) {
  const el = get('msgArea');
  if(!el) return;

  if (!msgs.length) {
    el.innerHTML = `<div class="empty-msg">📭 Sin mensajes aún</div>`;
    return;
  }

  el.innerHTML = msgs.map(m => {
    if (m.source === 'admin') {
      return `
        <div class="msg-bubble-admin">
          <div class="msg-from">HS Gestión</div>
          <div class="msg-text">${m.text}</div>
          <div class="msg-date">${fmtDate(m.createdAt)}</div>
        </div>`;
    } else {
      return `
        <div class="msg-bubble-client">
          <div class="msg-from">Vos</div>
          <div class="msg-text">${m.text}</div>
          <div class="msg-date">${fmtDate(m.createdAt)} <button class="msg-del" onclick="deleteClientMsg('${m.id}')">✕</button></div>
        </div>`;
    }
  }).join('');

  // Scroll para a última mensagem
  setTimeout(() => { el.scrollTop = el.scrollHeight; }, 100);
}

window.deleteClientMsg = async mid => {
  if(!confirm('¿Eliminar este mensaje?')) return;
  try {
    await deleteDoc(doc(db, 'clientMessages', mid));
    await loadMessages();
  } catch(err) { alert('Error al eliminar: ' + err.message); }
};

// Enviar mensagem
document.addEventListener('DOMContentLoaded', () => {
  get('msgSendBtn')?.addEventListener('click', sendMessage);
  get('msgInput')?.addEventListener('keydown', e => {
    if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
});

async function sendMessage() {
  const txt = get('msgInput')?.value.trim();
  if (!txt || !userData) return;
  get('msgInput').value = '';

  try {
    await setDoc(doc(collection(db, 'clientMessages')), {
      userId:    userData.id,
      userName:  userData.name,
      userEmail: userData.email,
      text:      txt,
      createdAt: serverTimestamp()
    });
    await loadMessages();
  } catch(err) {
    console.error('sendMessage error:', err);
    get('msgInput').value = txt; // devolve o texto se falhou
    alert('Error al enviar el mensaje. Verificá tu conexión.');
  }
}

// ── PACKS ─────────────────────────────────────────────────────────────────────
async function loadPacks() {
  if(!userData) return;
  try {
    const snap = await getDocs(
      query(collection(db, 'packs'), where('assignedTo', 'array-contains', userData.id))
    );
    const packs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPacks(packs);
  } catch(err) {
    console.error('loadPacks error:', err);
  }
}

function renderPacks(packs) {
  const section = get('packsSection');
  const grid    = get('packsGrid');
  if (!section || !grid) return;
  if (!packs.length) { section.style.display = 'none'; return; }

  section.style.display = 'block';
  grid.innerHTML = packs.map(p => {
    const files   = p.files || [];
    const thumb   = files[0];
    const isVideo = thumb?.resource_type === 'video';
    return `
      <div class="pack-item">
        <div class="pack-thumb">
          ${thumb
            ? isVideo
              ? `<video src="${thumb.url}" muted style="width:100%;height:100%;object-fit:cover;"></video>`
              : `<img src="${thumb.url}" style="width:100%;height:100%;object-fit:cover;" />`
            : '📦'}
          <div class="pack-thumb-overlay"></div>
          <div class="pack-count">${files.length} archivo${files.length!==1?'s':''}</div>
        </div>
        <div class="pack-body">
          <div class="pack-name">${p.title}</div>
          <div class="pack-desc">${p.description || ''}</div>
          <div class="pack-files">
            ${files.map((f, i) => `
              <button onclick="forceDownload('${f.url}','${(p.title+'-'+(i+1)+'.'+(f.format||'jpg')).replace(/'/g,"\\'")}','${f.resource_type||'image'}')" class="dl-btn">
                <svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:currentColor;"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 4h14v-2H5v2z"/></svg>
                ${f.resource_type==='video' ? `Video ${i+1}` : `Foto ${i+1}`}
              </button>`).join('')}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── DOWNLOAD FORÇADO ─────────────────────────────────────────────────────────
window.forceDownload = (url, filename, type) => {
  // Cloudinary: adiciona fl_attachment na URL para forçar download
  let dlUrl = url;
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    dlUrl = url.replace('/upload/', '/upload/fl_attachment/');
  }
  const a = document.createElement('a');
  a.href     = dlUrl;
  a.download = filename;
  a.target   = '_blank';
  a.rel      = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 200);
};

// ── GESTÃO DE PRODUTOS (exclusivo Zoe) ───────────────────────────────────────
function initProductManager(userId) {
  // Injetar seção no DOM
  const main = get('mainContent');
  const section = document.createElement('div');
  section.id = 'productSection';
  section.innerHTML = `
    <div class="prod-section">
      <div class="prod-header">
        <div>
          <div class="prod-eyebrow">✦ Gestión de Inventario</div>
          <h2 class="prod-title">Mis <em>Productos</em></h2>
          <p class="prod-sub">Controlá tu stock, inversión y ganancias en un solo lugar</p>
        </div>
        <button class="prod-add-btn" id="prodAddBtn">+ Agregar Producto</button>
      </div>

      <!-- Resumen stats -->
      <div class="prod-stats" id="prodStats">
        <div class="prod-stat">
          <div class="ps-label">Total Productos</div>
          <div class="ps-val" id="psTotalItems">0</div>
        </div>
        <div class="prod-stat">
          <div class="ps-label">Unidades en Stock</div>
          <div class="ps-val" id="psTotalUnits">0</div>
        </div>
        <div class="prod-stat">
          <div class="ps-label">Capital Invertido</div>
          <div class="ps-val" id="psTotalInvested">$0</div>
        </div>
        <div class="prod-stat">
          <div class="ps-label">Ganancia Potencial</div>
          <div class="ps-val green" id="psTotalProfit">$0</div>
        </div>
      </div>

      <!-- Grilla de productos -->
      <div class="prod-grid" id="prodGrid">
        <div class="prod-loading">Cargando productos...</div>
      </div>
    </div>

    <!-- Modal agregar/editar producto -->
    <div class="prod-modal-bg" id="prodModalBg">
      <div class="prod-modal">
        <div class="prod-modal-hd">
          <h3 id="prodModalTitle">Agregar Producto</h3>
          <button class="prod-modal-x" id="prodModalClose">✕</button>
        </div>

        <!-- Preview de imagen -->
        <div class="prod-img-upload" id="prodImgUpload">
          <input type="file" id="prodImgInput" accept="image/*" style="display:none"/>
          <div class="prod-img-preview" id="prodImgPreview">
            <span>📷</span>
            <p>Tocá para subir una foto</p>
          </div>
        </div>

        <div class="prod-form">
          <div class="pf-group">
            <label>Nombre del producto *</label>
            <input type="text" id="pfName" placeholder="Ej: Remera básica negra" />
          </div>
          <div class="pf-row">
            <div class="pf-group">
              <label>Cantidad en stock *</label>
              <input type="number" id="pfQty" placeholder="0" min="0" />
            </div>
            <div class="pf-group">
              <label>Categoría</label>
              <input type="text" id="pfCategory" placeholder="Ej: Ropa, Accesorios..." />
            </div>
          </div>
          <div class="pf-row">
            <div class="pf-group">
              <label>Valor invertido (por unidad) *</label>
              <input type="number" id="pfCost" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div class="pf-group">
              <label>Precio de venta *</label>
              <input type="number" id="pfPrice" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div class="pf-group">
            <label>Notas (opcional)</label>
            <textarea id="pfNotes" placeholder="Descripción, proveedor, colores disponibles..."></textarea>
          </div>
          <div class="pf-profit-preview" id="pfProfitPreview"></div>
          <div class="pf-actions">
            <button class="pf-cancel" id="pfCancelBtn">Cancelar</button>
            <button class="pf-save" id="pfSaveBtn">Guardar Producto</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal confirmar eliminação -->
    <div class="prod-modal-bg" id="prodDeleteBg">
      <div class="prod-modal" style="max-width:340px;text-align:center;">
        <span style="font-size:2.5rem;display:block;margin-bottom:12px;">🗑️</span>
        <h3 style="color:var(--white);margin-bottom:8px;">¿Eliminar producto?</h3>
        <p style="font-size:.85rem;color:var(--muted2);margin-bottom:20px;">Esta acción no se puede deshacer.</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="pf-cancel" id="delCancelBtn">Cancelar</button>
          <button class="pf-save" id="delConfirmBtn" style="background:var(--red);">Eliminar</button>
        </div>
      </div>
    </div>
  `;
  main.appendChild(section);

  // Estado do módulo
  let products    = [];
  let editingId   = null;
  let deletingId  = null;
  let uploadedUrl = null;
  let uploadedPath= null;

  const prodModalBg  = get('prodModalBg');
  const prodDeleteBg = get('prodDeleteBg');

  // ── Carregar produtos ──────────────────────────────────────────────────────
  async function loadProducts() {
    const grid = get('prodGrid');
    try {
      const snap = await getDocs(
        query(collection(db, 'zoe_products'), where('userId', '==', userId))
      );
      products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderProducts();
      updateStats();
    } catch(err) {
      console.error('loadProducts:', err);
      grid.innerHTML = `<div class="prod-loading">Error al cargar productos.</div>`;
    }
  }

  // ── Renderizar grilla ──────────────────────────────────────────────────────
  function renderProducts() {
    const grid = get('prodGrid');
    if (!products.length) {
      grid.innerHTML = `
        <div class="prod-empty">
          <span>📦</span>
          <p>Todavía no tenés productos cargados</p>
          <small>Hacé clic en "Agregar Producto" para empezar</small>
        </div>`;
      return;
    }
    grid.innerHTML = products.map(p => {
      const profit   = (parseFloat(p.price||0) - parseFloat(p.cost||0)).toFixed(2);
      const totalInv = (parseFloat(p.cost||0) * parseInt(p.qty||0)).toFixed(2);
      const margin   = p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
      return `
        <div class="prod-card">
          <div class="prod-card-img">
            ${p.imageUrl
              ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy"/>`
              : `<span class="prod-no-img">📦</span>`}
            ${p.category ? `<span class="prod-cat-badge">${p.category}</span>` : ''}
          </div>
          <div class="prod-card-body">
            <div class="prod-card-name">${p.name}</div>
            ${p.notes ? `<div class="prod-card-notes">${p.notes}</div>` : ''}
            <div class="prod-card-nums">
              <div class="pcn-item">
                <span class="pcn-label">Stock</span>
                <span class="pcn-val ${parseInt(p.qty)===0?'red':''}">${p.qty} u.</span>
              </div>
              <div class="pcn-item">
                <span class="pcn-label">Invertido</span>
                <span class="pcn-val">$${parseFloat(p.cost).toLocaleString('es-AR')}</span>
              </div>
              <div class="pcn-item">
                <span class="pcn-label">Venta</span>
                <span class="pcn-val">$${parseFloat(p.price).toLocaleString('es-AR')}</span>
              </div>
              <div class="pcn-item">
                <span class="pcn-label">Ganancia</span>
                <span class="pcn-val green">$${parseFloat(profit).toLocaleString('es-AR')} <small>(${margin}%)</small></span>
              </div>
            </div>
            <div class="prod-card-actions">
              <button class="pca-edit" onclick="prodEdit('${p.id}')">✏️ Editar</button>
              <button class="pca-del"  onclick="prodDelete('${p.id}')">🗑️</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  function updateStats() {
    const totalItems    = products.length;
    const totalUnits    = products.reduce((s,p) => s + parseInt(p.qty||0), 0);
    const totalInvested = products.reduce((s,p) => s + (parseFloat(p.cost||0) * parseInt(p.qty||0)), 0);
    const totalRevenue  = products.reduce((s,p) => s + (parseFloat(p.price||0) * parseInt(p.qty||0)), 0);
    const totalProfit   = totalRevenue - totalInvested;

    get('psTotalItems').textContent    = totalItems;
    get('psTotalUnits').textContent    = totalUnits;
    get('psTotalInvested').textContent = `$${totalInvested.toLocaleString('es-AR',{minimumFractionDigits:2})}`;
    get('psTotalProfit').textContent   = `$${totalProfit.toLocaleString('es-AR',{minimumFractionDigits:2})}`;
  }

  // ── Abrir modal ────────────────────────────────────────────────────────────
  function openModal(product = null) {
    editingId   = product?.id || null;
    uploadedUrl = product?.imageUrl || null;
    uploadedPath= product?.imagePath || null;

    get('prodModalTitle').textContent = product ? 'Editar Producto' : 'Agregar Producto';
    get('pfName').value     = product?.name     || '';
    get('pfQty').value      = product?.qty      || '';
    get('pfCategory').value = product?.category || '';
    get('pfCost').value     = product?.cost     || '';
    get('pfPrice').value    = product?.price    || '';
    get('pfNotes').value    = product?.notes    || '';

    const preview = get('prodImgPreview');
    if (product?.imageUrl) {
      preview.innerHTML = `<img src="${product.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"/>`;
    } else {
      preview.innerHTML = `<span>📷</span><p>Tocá para subir una foto</p>`;
    }

    updateProfitPreview();
    prodModalBg.classList.add('open');
  }

  function closeModal() {
    prodModalBg.classList.remove('open');
    editingId = null; uploadedUrl = null; uploadedPath = null;
  }

  // ── Preview de lucro ───────────────────────────────────────────────────────
  function updateProfitPreview() {
    const cost  = parseFloat(get('pfCost')?.value  || 0);
    const price = parseFloat(get('pfPrice')?.value || 0);
    const qty   = parseInt(get('pfQty')?.value     || 0);
    const el    = get('pfProfitPreview');
    if (!el) return;
    if (cost > 0 && price > 0) {
      const profit = price - cost;
      const margin = Math.round((profit / price) * 100);
      const total  = profit * qty;
      el.innerHTML = `
        <div class="profit-preview-inner">
          <span>💰 Ganancia por unidad: <strong>$${profit.toLocaleString('es-AR')}</strong></span>
          <span>📊 Margen: <strong>${margin}%</strong></span>
          ${qty > 0 ? `<span>🏆 Ganancia total potencial: <strong>$${total.toLocaleString('es-AR')}</strong></span>` : ''}
        </div>`;
    } else {
      el.innerHTML = '';
    }
  }

  // ── Upload de imagem (ImgBB) ───────────────────────────────────────────────
  get('prodImgUpload').addEventListener('click', () => get('prodImgInput').click());
  get('prodImgInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = get('prodImgPreview');
    preview.innerHTML = `<div class="prod-uploading">⏳ Subiendo imagen...</div>`;

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('key', IMGBB_API_KEY);

      const res  = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
      const json = await res.json();

      if (!json.success) throw new Error(json.error?.message || 'Error al subir');

      uploadedUrl  = json.data.url;
      uploadedPath = json.data.delete_url; // guardamos la URL de eliminación
      preview.innerHTML = `<img src="${uploadedUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"/>`;
    } catch(err) {
      console.error('upload error:', err);
      preview.innerHTML = `<span>⚠️</span><p>Error al subir. Intentá de nuevo.</p>`;
    }
  });

  // ── Guardar producto ───────────────────────────────────────────────────────
  get('pfSaveBtn').addEventListener('click', async () => {
    const name  = get('pfName').value.trim();
    const qty   = get('pfQty').value;
    const cost  = get('pfCost').value;
    const price = get('pfPrice').value;

    if (!name || qty === '' || cost === '' || price === '') {
      alert('Completá los campos obligatorios (*)');
      return;
    }

    const btn = get('pfSaveBtn');
    btn.textContent = 'Guardando...';
    btn.disabled = true;

    const data = {
      userId,
      name,
      qty:      parseInt(qty),
      category: get('pfCategory').value.trim(),
      cost:     parseFloat(cost),
      price:    parseFloat(price),
      notes:    get('pfNotes').value.trim(),
      imageUrl:  uploadedUrl  || null,
      imagePath: uploadedPath || null,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await setDoc(doc(db, 'zoe_products', editingId), data, { merge: true });
      } else {
        data.createdAt = serverTimestamp();
        await setDoc(doc(collection(db, 'zoe_products')), data);
      }
      closeModal();
      await loadProducts();
    } catch(err) {
      console.error('save error:', err);
      alert('Error al guardar: ' + err.message);
    } finally {
      btn.textContent = 'Guardar Producto';
      btn.disabled = false;
    }
  });

  // ── Editar ─────────────────────────────────────────────────────────────────
  window.prodEdit = id => {
    const p = products.find(x => x.id === id);
    if (p) openModal(p);
  };

  // ── Eliminar ───────────────────────────────────────────────────────────────
  window.prodDelete = id => {
    deletingId = id;
    prodDeleteBg.classList.add('open');
  };

  get('delCancelBtn').addEventListener('click', () => {
    prodDeleteBg.classList.remove('open');
    deletingId = null;
  });

  get('delConfirmBtn').addEventListener('click', async () => {
    if (!deletingId) return;
    const btn = get('delConfirmBtn');
    btn.textContent = 'Eliminando...';
    btn.disabled = true;

    try {
      await deleteDoc(doc(db, 'zoe_products', deletingId));
      prodDeleteBg.classList.remove('open');
      deletingId = null;
      await loadProducts();
    } catch(err) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      btn.textContent = 'Eliminar';
      btn.disabled = false;
    }
  });

  // ── Eventos gerais ─────────────────────────────────────────────────────────
  get('prodAddBtn').addEventListener('click', () => openModal());
  get('prodModalClose').addEventListener('click', closeModal);
  get('pfCancelBtn').addEventListener('click', closeModal);
  prodModalBg.addEventListener('click', e => { if(e.target===prodModalBg) closeModal(); });

  ['pfCost','pfPrice','pfQty'].forEach(id => {
    get(id)?.addEventListener('input', updateProfitPreview);
  });

  // Carregar
  loadProducts();
}

// ── ERROR / LOADING ────────────────────────────────────────────────────────────
function showError(msg) {
  get('loadingState').style.display = 'none';
  get('mainContent').style.display  = 'none';
  const err = get('errorState');
  if(err) {
    err.style.display = 'block';
    const errMsg = get('errorMsg');
    if(errMsg) errMsg.textContent = msg;
  }
}
