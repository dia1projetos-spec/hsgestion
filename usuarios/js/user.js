// HS Gestión – User Page JS v3.0.0
import { initializeApp }    from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDocs,
  deleteDoc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const get    = id  => document.getElementById(id);
const months = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
const days   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const fmtDate = ts => ts?.toDate ? ts.toDate().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';

let currentUser = null, userData = null;

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
    if (snap.empty) { showError('Tu cuenta no está registrada. Contactá al administrador.'); return; }
    userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
    renderPage(userData);
    await Promise.all([loadMessages(userData), loadPacks(userData)]);
    get('loadingState').style.display = 'none';
    get('mainContent').style.display  = 'block';
  } catch(err) {
    console.error(err);
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

  // Header
  get('headerName').textContent = u.name;

  // Hero
  get('heroTitle').innerHTML = `Hola, <em>${u.name.split(' ')[0]}</em>`;
  get('heroSub').textContent = u.service ? `Servicio: ${u.service}` : 'Tu espacio exclusivo de gestión';

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
      <a href="https://wa.me/${WHATSAPP_NUM}?text=${msg}" target="_blank" class="pay-btn">
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:white;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Pagar por WhatsApp
      </a>
      <p style="font-size:.72rem;color:var(--muted);margin-top:8px;">Alias: <strong style="color:var(--gold)">${ALIAS_PAGO}</strong></p>`;
  } else {
    payAct.innerHTML = `<p class="pay-confirmed">✦ Servicio activo y al día 🎉</p>`;
  }

  // Logout
  get('logoutBtn').addEventListener('click', () =>
    signOut(auth).then(() => window.location.href = '../index.html')
  );

  // Relógio
  startClock();
  // Agenda
  initAgenda(u.id);
}

// ── RELÓGIO ───────────────────────────────────────────────────────────────────
function startClock() {
  const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    get('ch').textContent = h;
    get('cm').textContent = m;
    get('cs').textContent = s;
    get('clockDate').textContent = `${DIAS[now.getDay()]}, ${now.getDate()} de ${MESES[now.getMonth()]} ${now.getFullYear()}`;
  }
  tick();
  setInterval(tick, 1000);
}

// ── AGENDA ────────────────────────────────────────────────────────────────────
function initAgenda(userId) {
  const STORAGE_KEY = `hs_agenda_${userId}`;
  let events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  // events = { "2025-01-15": ["Reunión con HS Gestión", "Otro evento"] }

  let viewYear  = new Date().getFullYear();
  let viewMonth = new Date().getMonth();
  let selectedDate = null;

  function saveEvents() { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); }

  function renderCalendar() {
    get('agMonth').textContent = `${months[viewMonth]} ${viewYear}`;
    const grid = get('agGrid');
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth+1, 0).getDate();
    const today = new Date();

    let html = days.map(d => `<div class="agenda-day-name">${d}</div>`).join('');

    for (let i=0; i<firstDay; i++)
      html += `<div class="agenda-day empty-day"></div>`;

    for (let d=1; d<=totalDays; d++) {
      const key = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = d===today.getDate() && viewMonth===today.getMonth() && viewYear===today.getFullYear();
      const hasEv   = events[key]?.length > 0;
      const isSel   = key === selectedDate;
      html += `<div class="agenda-day ${isToday?'today':''} ${hasEv?'has-event':''} ${isSel?'marked':''}"
        onclick="selectDay('${key}')">${d}</div>`;
    }
    grid.innerHTML = html;
    renderEvents();
  }

  function renderEvents() {
    const el = get('agEvents');
    if (!selectedDate) { el.innerHTML = '<p style="font-size:.72rem;color:var(--muted);padding:4px 0;">Seleccioná un día para ver eventos</p>'; return; }
    const evs = events[selectedDate] || [];
    if (!evs.length) { el.innerHTML = `<p style="font-size:.72rem;color:var(--muted);padding:4px 0;">Sin eventos el ${selectedDate}</p>`; return; }
    el.innerHTML = evs.map((ev, i) => `
      <div class="event-item">
        <span class="ev-text">${ev}</span>
        <span class="ev-date">${selectedDate}</span>
        <button class="ev-del" onclick="deleteEvent('${selectedDate}',${i})">✕</button>
      </div>`).join('');
  }

  window.selectDay = key => {
    selectedDate = key;
    renderCalendar();
  };

  window.deleteEvent = (key, idx) => {
    events[key].splice(idx, 1);
    if (!events[key].length) delete events[key];
    saveEvents();
    renderCalendar();
  };

  get('agPrev').addEventListener('click', () => {
    if (viewMonth === 0) { viewMonth=11; viewYear--; } else viewMonth--;
    renderCalendar();
  });
  get('agNext').addEventListener('click', () => {
    if (viewMonth === 11) { viewMonth=0; viewYear++; } else viewMonth++;
    renderCalendar();
  });

  get('agAddBtn').addEventListener('click', () => {
    const txt = get('agInput').value.trim();
    if (!txt) return;
    if (!selectedDate) { alert('Seleccioná un día en el calendario primero'); return; }
    if (!events[selectedDate]) events[selectedDate] = [];
    events[selectedDate].push(txt);
    saveEvents();
    get('agInput').value = '';
    renderCalendar();
  });

  get('agInput').addEventListener('keydown', e => { if(e.key==='Enter') get('agAddBtn').click(); });

  renderCalendar();
}

// ── MENSAGENS ─────────────────────────────────────────────────────────────────
async function loadMessages(u) {
  try {
    // Mensagens do admin para este usuário
    const adminSnap = await getDocs(
      query(collection(db,'messages'), orderBy('createdAt','asc'))
    );
    const adminMsgs = adminSnap.docs
      .map(d=>({id:d.id, ...d.data(), source:'admin'}))
      .filter(m => m.userId==='all' || m.userId===u.id);

    // Mensagens do cliente para o admin
    const clientSnap = await getDocs(
      query(collection(db,'clientMessages'), where('userId','==',u.id), orderBy('createdAt','asc'))
    );
    const clientMsgs = clientSnap.docs.map(d=>({id:d.id,...d.data(),source:'client'}));

    // Combinar e ordenar
    const all = [...adminMsgs, ...clientMsgs].sort((a,b) => {
      const ta = a.createdAt?.toDate?.()?.getTime() || 0;
      const tb = b.createdAt?.toDate?.()?.getTime() || 0;
      return ta - tb;
    });

    renderMessages(all, u);
  } catch(err) {
    console.error('Mensagens:', err);
  }
}

function renderMessages(msgs, u) {
  const el = get('msgArea');
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
          <div class="msg-text">${m.text} <button class="msg-del" onclick="deleteClientMsg('${m.id}')">✕</button></div>
          <div class="msg-date">${fmtDate(m.createdAt)}</div>
        </div>`;
    }
  }).join('');
  el.scrollTop = el.scrollHeight;
}

window.deleteClientMsg = async mid => {
  if (!confirm('¿Eliminar este mensaje?')) return;
  await deleteDoc(doc(db,'clientMessages',mid));
  await loadMessages(userData);
};

// Enviar mensagem
get('msgSendBtn').addEventListener('click', sendMessage);
get('msgInput').addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

async function sendMessage() {
  const txt = get('msgInput').value.trim();
  if (!txt || !userData) return;
  get('msgInput').value = '';
  try {
    await setDoc(doc(collection(db,'clientMessages')), {
      userId:   userData.id,
      userName: userData.name,
      text:     txt,
      createdAt: serverTimestamp()
    });
    await loadMessages(userData);
  } catch(err) {
    console.error(err);
  }
}

// ── PACKS ─────────────────────────────────────────────────────────────────────
async function loadPacks(u) {
  try {
    const snap = await getDocs(
      query(collection(db,'packs'), where('assignedTo','array-contains',u.id))
    );
    const packs = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderPacks(packs);
  } catch(err) { console.error('Packs:', err); }
}

function renderPacks(packs) {
  const section = get('packsSection');
  const grid    = get('packsGrid');
  if (!packs.length) { section.style.display='none'; return; }
  section.style.display = 'block';
  grid.innerHTML = packs.map(p => {
    const files = p.files || [];
    const thumb = files[0];
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
          <div class="pack-desc">${p.description||''}</div>
          <div class="pack-files">
            ${files.map((f,i) => `
              <a href="${f.url}" download="${p.title}-${i+1}.${f.format||'jpg'}" target="_blank" class="dl-btn">
                <svg viewBox="0 0 24 24"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 4h14v-2H5v2z"/></svg>
                ${f.resource_type==='video'?`Video ${i+1}`:`Foto ${i+1}`}
              </a>`).join('')}
          </div>
        </div>
      </div>`;
  }).join('');
}

function showError(msg) {
  get('loadingState').style.display = 'none';
  get('mainContent').style.display  = 'none';
  get('errorState').style.display   = 'block';
  get('errorMsg').textContent = msg;
}
