// HS Gestión – User Page JS v1.2.0
// Página dinâmica — carrega qualquer cliente pelo slug na URL
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmMP5ZCfl9JfkQQf1xIfcGAei_BPLvKj8",
  authDomain: "hs-gestion-a102e.firebaseapp.com",
  projectId: "hs-gestion-a102e",
  storageBucket: "hs-gestion-a102e.firebasestorage.app",
  messagingSenderId: "40828198084",
  appId: "1:40828198084:web:70dd328e4e242925727d91"
};

const ADMIN_EMAIL = "riconetson@gmail.com";
const ALIAS_PAGO  = "sofiacuello25";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const dateStr = ts =>
  ts?.toDate ? ts.toDate().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';

// ════════════════════════════════════════════════════════════
// ⚡ PACKS DE CONTEÚDO — edite aqui e também em admin/js/admin.js
// Coloque os arquivos em: packs/imagens/  e  packs/videos/
// ════════════════════════════════════════════════════════════
const PACKS_CATALOG = [
  // Exemplo (apague e coloque os seus):
  // {
  //   id: "pack-redes-enero",
  //   title: "Pack Redes Sociales – Enero",
  //   description: "15 imágenes para Instagram y Facebook.",
  //   type: "images",
  //   thumb: "../packs/imagens/redes-enero/thumb.jpg",
  //   files: [
  //     "../packs/imagens/redes-enero/foto1.jpg",
  //     "../packs/imagens/redes-enero/foto2.jpg",
  //   ]
  // },
];

// ── AUTH ──────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (!user) {
    // Não logado — volta para o início
    window.location.href = '../index.html';
    return;
  }
  if (user.email === ADMIN_EMAIL) {
    // Admin — vai para o painel
    window.location.href = '../admin/index.html';
    return;
  }
  // Cliente autenticado — carrega seus dados
  await loadUserData(user);
});

async function loadUserData(user) {
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('email', '==', user.email))
    );

    if (snap.empty) {
      showError('Tu cuenta no está registrada en el sistema. Contactá al administrador.');
      return;
    }

    const userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
    renderPage(userData);

    // Carregar mensagens
    const msgsSnap = await getDocs(
      query(collection(db, 'messages'), orderBy('createdAt', 'desc'))
    );
    const messages = msgsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => m.userId === userData.id || m.userId === 'all');
    renderMessages(messages);

    // Carregar packs atribuídos
    const packsSnap = await getDocs(
      query(collection(db, 'packAssignments'), where('userId', '==', userData.id))
    );
    const assignedIds = packsSnap.docs.map(d => d.data().packId);
    const myPacks = PACKS_CATALOG.filter(p => assignedIds.includes(p.id));
    renderPacks(myPacks);

    // Mostrar conteúdo
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display  = 'block';

  } catch (err) {
    console.error(err);
    showError('Error al cargar tu perfil. Intentá recargar la página.');
  }
}

// ── RENDER PAGE ───────────────────────────────────────────────────────────────
function renderPage(u) {
  // Logo
  if (u.logoFile) {
    const logo = document.getElementById('clientLogo');
    logo.src = `../images/usuarios/${u.logoFile}`;
    logo.style.display = 'block';
    logo.onerror = () => { logo.style.display = 'none'; };
    document.getElementById('clientLogoPlaceholder').style.display = 'none';
  } else {
    const ph = document.getElementById('clientLogoPlaceholder');
    ph.textContent = u.name.charAt(0).toUpperCase();
  }

  // Título no header
  document.getElementById('headerName').textContent = u.name;
  document.title = `${u.name} – HS Gestión`;

  // Bienvenida
  document.getElementById('welcomeName').textContent    = `¡Bienvenido/a, ${u.name}! 👋`;
  document.getElementById('welcomeService').textContent = u.service
    ? `Tu servicio contratado: ${u.service}`
    : 'Aquí encontrás toda la información de tu cuenta.';

  // Estado de pago
  const isPaid = u.paymentStatus === 'paid';
  document.getElementById('paymentStatus').textContent = isPaid ? '✅' : '⏳';

  const labelEl = document.getElementById('paymentLabel');
  labelEl.textContent  = isPaid ? 'Pago Confirmado' : 'Pago Pendiente';
  labelEl.className    = `payment-label ${isPaid ? 'paid' : 'open'}`;

  if (u.serviceValue) {
    document.getElementById('paymentAmount').textContent =
      `$${parseFloat(u.serviceValue).toLocaleString('es-AR')}`;
  }
  if (u.service) {
    document.getElementById('paymentService').textContent = u.service;
  }

  const payWrap = document.getElementById('payBtnWrap');
  if (!isPaid) {
    const msg = encodeURIComponent(
      `Hola HS Gestión! Soy ${u.name} y quiero abonar mi servicio.\nAlias: ${ALIAS_PAGO}`
    );
    payWrap.innerHTML = `
      <a href="https://wa.me/5513981763452?text=${msg}" target="_blank" rel="noopener" class="pay-btn">
        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:white;flex-shrink:0;">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Pagar por WhatsApp
      </a>
      <p style="margin-top:8px;font-size:.78rem;color:var(--muted);">
        Alias: <strong style="color:var(--dark)">${ALIAS_PAGO}</strong>
      </p>`;
  } else {
    payWrap.innerHTML = `
      <p style="color:var(--green);font-size:.9rem;font-weight:600;margin-top:8px;">
        ¡Gracias! Tu pago fue recibido 🎉
      </p>`;
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = '../index.html');
  });
}

// ── MENSAGENS ─────────────────────────────────────────────────────────────────
function renderMessages(messages) {
  const list = document.getElementById('messagesList');
  if (!messages.length) {
    list.innerHTML = `<div class="empty-msg">📭 No hay mensajes aún</div>`;
    return;
  }
  list.innerHTML = messages.map(m => `
    <div class="msg-item">
      <div class="msg-date">${dateStr(m.createdAt)}</div>
      <div class="msg-text">${m.text}</div>
    </div>`).join('');
}

// ── PACKS ─────────────────────────────────────────────────────────────────────
function renderPacks(packs) {
  const section = document.getElementById('packsSection');
  const grid    = document.getElementById('packsGrid');
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
          ${p.files.map((f, i) => `
            <a href="${f}" download target="_blank" class="pack-download">
              ⬇️ ${p.type === 'images' ? `Foto ${i+1}` : `Video ${i+1}`}
            </a>`).join('')}
        </div>
      </div>
    </div>`).join('');
}

function showError(msg) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('mainContent').style.display  = 'none';
  document.getElementById('errorState').style.display   = 'block';
  document.getElementById('errorMsg').textContent = msg;
}
