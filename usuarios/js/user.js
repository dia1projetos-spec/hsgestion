// HS Gestión – User Page JS v1.0.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs,
  query, orderBy, where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ── CONFIG ── (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: "AIzaSyDmMP5ZCfl9JfkQQf1xIfcGAei_BPLvKj8",
  authDomain: "hs-gestion-a102e.firebaseapp.com",
  projectId: "hs-gestion-a102e",
  storageBucket: "hs-gestion-a102e.firebasestorage.app",
  messagingSenderId: "40828198084",
  appId: "1:40828198084:web:70dd328e4e242925727d91"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const ADMIN_EMAIL = "riconetson@gmail.com"; // ⚠️ mesmo do admin.js
const ALIAS_PAGO  = "sofiacuello25";           // ⚠️ alias de pago

// ── PACKS CATALOG (mesmo do admin.js — mantener sincronizado) ──────────────
// ⚠️ Copie o mesmo PACKS_CATALOG do admin.js aqui
const PACKS_CATALOG = [
  {
    id: "pack-exemplo-fotos",
    title: "Pack Fotos Redes Sociales",
    description: "10 imágenes para Instagram y Facebook de alta resolución.",
    type: "images",
    thumb: "../../packs/imagens/pack-exemplo/thumb.jpg",
    files: [
      "../../packs/imagens/pack-exemplo/foto1.jpg",
    ]
  },
  {
    id: "pack-exemplo-videos",
    title: "Pack Videos Stories",
    description: "5 videos verticales prontos para Stories y Reels.",
    type: "videos",
    thumb: "../../packs/videos/pack-exemplo/thumb.jpg",
    files: [
      "../../packs/videos/pack-exemplo/video1.mp4",
    ]
  }
];

const dateStr = (ts) => ts?.toDate ? ts.toDate().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';

// ── MAIN ─────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Não logado — redirecionar para login
    window.location.href = '../../index.html#loginModal';
    return;
  }
  if (user.email === ADMIN_EMAIL) {
    // Admin acessou por engano — ir ao painel
    window.location.href = '../../admin/index.html';
    return;
  }

  // Buscar dados do usuário no Firestore
  const usersSnap = await getDocs(
    query(collection(db, 'users'), where('email', '==', user.email))
  );

  if (usersSnap.empty) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#64748b;text-align:center;padding:20px;">
        <div>
          <p style="font-size:3rem;margin-bottom:16px;">😕</p>
          <p>Tu cuenta no está configurada aún. Contactá al administrador.</p>
        </div>
      </div>`;
    return;
  }

  const userData = { id: usersSnap.docs[0].id, ...usersSnap.docs[0].data() };
  renderUserPage(userData);

  // Cargar mensajes
  const msgsSnap = await getDocs(
    query(collection(db, 'messages'), orderBy('createdAt', 'desc'))
  );
  const messages = msgsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(m => m.userId === userData.id || m.userId === 'all');
  renderMessages(messages);

  // Cargar packs asignados
  const packsSnap = await getDocs(
    query(collection(db, 'packAssignments'), where('userId', '==', userData.id))
  );
  const assignedPackIds = packsSnap.docs.map(d => d.data().packId);
  const myPacks = PACKS_CATALOG.filter(p => assignedPackIds.includes(p.id));
  renderPacks(myPacks);
});

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderUserPage(u) {
  // Logo del cliente
  if (u.logoURL) {
    const logoEl = document.getElementById('clientLogo');
    if (logoEl) { logoEl.src = u.logoURL; logoEl.style.display = 'block'; }
    const logoPlaceholder = document.getElementById('clientLogoPlaceholder');
    if (logoPlaceholder) logoPlaceholder.style.display = 'none';
  }

  // Nombre en header
  const nameEl = document.getElementById('headerName');
  if (nameEl) nameEl.textContent = u.name;

  // Bienvenida
  const greetEl = document.getElementById('welcomeName');
  if (greetEl) greetEl.textContent = `¡Bienvenido/a, ${u.name}!`;

  const servEl = document.getElementById('welcomeService');
  if (servEl && u.service) servEl.textContent = `Servicio: ${u.service}`;

  // Estado de pago
  const isPaid = u.paymentStatus === 'paid';
  const statusEl = document.getElementById('paymentStatus');
  const statusLabel = document.getElementById('paymentLabel');
  const amountEl = document.getElementById('paymentAmount');
  const serviceEl = document.getElementById('paymentService');
  const payBtnWrap = document.getElementById('payBtnWrap');

  if (statusEl) statusEl.textContent = isPaid ? '✅' : '⏳';
  if (statusLabel) {
    statusLabel.textContent = isPaid ? 'Pago Confirmado' : 'Pago Pendiente';
    statusLabel.className = `payment-label ${isPaid ? 'paid' : 'open'}`;
  }
  if (amountEl && u.serviceValue) {
    amountEl.textContent = `$${parseFloat(u.serviceValue).toLocaleString('es-AR')}`;
  }
  if (serviceEl && u.service) {
    serviceEl.textContent = u.service;
  }

  // Botón pagar si está pendiente
  if (!isPaid && payBtnWrap) {
    const msg = encodeURIComponent(`Hola HS Gestión, soy ${u.name} y quiero abonar mi servicio. Alias: ${ALIAS_PAGO}`);
    payBtnWrap.innerHTML = `
      <a href="https://wa.me/5513981763452?text=${msg}" target="_blank" rel="noopener" class="pay-btn">
        <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Pagar Ahora por WhatsApp
      </a>
      <p style="margin-top:10px;font-size:.8rem;color:var(--muted);">Alias CVU: <strong style="color:var(--dark);">${ALIAS_PAGO}</strong></p>
    `;
  } else if (isPaid && payBtnWrap) {
    payBtnWrap.innerHTML = `<p style="color:var(--green);font-size:.9rem;font-weight:600;">¡Gracias! Tu pago fue recibido 🎉</p>`;
  }

  // Logout btn
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth).then(() => {
      window.location.href = '../../index.html';
    }));
  }
}

function renderMessages(messages) {
  const list = document.getElementById('messagesList');
  if (!list) return;
  if (!messages.length) {
    list.innerHTML = `<div class="empty-msg">📭 No hay mensajes aún</div>`;
    return;
  }
  list.innerHTML = messages.map(m => `
    <div class="msg-item">
      <div class="msg-date">${dateStr(m.createdAt)}</div>
      <div class="msg-text">${m.text}</div>
    </div>
  `).join('');
}

function renderPacks(packs) {
  const section = document.getElementById('packsSection');
  const grid = document.getElementById('packsGrid');
  if (!section || !grid) return;
  if (!packs.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  grid.innerHTML = packs.map(p => `
    <div class="pack-item">
      <div class="pack-thumb">
        ${p.type === 'images'
          ? `<img src="${p.thumb}" alt="${p.title}" onerror="this.style.display='none'" />`
          : `<video src="${p.files[0]}" muted style="width:100%;height:100%;object-fit:cover;"></video>`}
      </div>
      <div class="pack-body">
        <div class="pack-name">${p.title}</div>
        <div class="pack-desc">${p.description}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${p.files.map((f,i) => `
            <a href="${f}" download class="pack-download" target="_blank">
              ⬇️ ${p.type==='images'?`Foto ${i+1}`:`Video ${i+1}`}
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}
