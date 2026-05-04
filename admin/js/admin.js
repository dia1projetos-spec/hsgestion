// HS Gestión – Admin JS v3.0.0
import { initializeApp }                        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, createUserWithEmailAndPassword }
                                                from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, setDoc, doc,
         deleteDoc, updateDoc, getDoc, serverTimestamp, query, orderBy }
                                                from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── CONFIG ────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDmMP5ZCfl9JfkQQf1xIfcGAei_BPLvKj8",
  authDomain:        "hs-gestion-a102e.firebaseapp.com",
  projectId:         "hs-gestion-a102e",
  storageBucket:     "hs-gestion-a102e.firebasestorage.app",
  messagingSenderId: "40828198084",
  appId:             "1:40828198084:web:70dd328e4e242925727d91"
};
const ADMIN_EMAIL    = "riconetson@gmail.com";
const CLOUD_NAME     = "dc0bxgeea";
const UPLOAD_PRESET  = "hs_gestion_packs";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── UTILS ─────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const container = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = `toast-item toast-${type}`;
  el.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' });
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
window.closeModal = closeModal;

// Fechar modal clicando fora
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// Clock
setInterval(() => {
  const el = document.getElementById('topbarTime');
  if (el) el.textContent = new Date().toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}, 1000);

// ── CLOUDINARY ────────────────────────────────────────────────────────────
function uploadToCloudinary(file, folder, progressWrapId, progressBarId) {
  return new Promise((resolve, reject) => {
    const wrap = progressWrapId ? document.getElementById(progressWrapId) : null;
    const bar  = progressBarId  ? document.getElementById(progressBarId)  : null;
    if (wrap) { wrap.style.display = 'block'; }
    if (bar)  { bar.style.width = '0%'; }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    fd.append('folder', 'hs-gestion/' + folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && bar)
        bar.style.width = Math.round((e.loaded / e.total) * 100) + '%';
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        if (wrap) setTimeout(() => { wrap.style.display = 'none'; }, 700);
        resolve(res.secure_url);
      } else {
        let errMsg = 'Upload falhou';
        try { errMsg = JSON.parse(xhr.responseText).error?.message || errMsg; } catch {}
        toast('Error Cloudinary: ' + errMsg, 'error');
        reject(new Error(errMsg));
      }
    };
    xhr.onerror = () => { toast('Error de red al subir imagen', 'error'); reject(new Error('network')); };
    xhr.send(fd);
  });
}

function setupUploadZone(zoneId, progressWrapId, progressBarId, hiddenId, folder, onSuccess) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;

  async function doUpload(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast('Archivo muy grande (máx 10MB)', 'error'); return; }
    toast('Subiendo imagen...');
    try {
      const url = await uploadToCloudinary(file, folder, progressWrapId, progressBarId);
      document.getElementById(hiddenId).value = url;
      onSuccess(url);
      toast('Imagen subida ✓');
    } catch (e) { /* ya mostrado */ }
  }

  zone.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => doUpload(inp.files[0]);
    inp.click();
  });
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag');
    doUpload(e.dataTransfer.files[0]);
  });
}

// ── AUTH GUARD ────────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (!user || user.email !== ADMIN_EMAIL) {
    window.location.href = '../index.html';
    return;
  }
  document.getElementById('adminEmail').textContent = user.email;
  initApp(); // inicializar tudo após autenticação confirmada
});

// ── INIT (roda após auth confirmada) ─────────────────────────────────────
function initApp() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../index.html';
  });

  // Sidebar mobile
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navTo(item.dataset.page));
  });

  // Upload zones — inicializar aqui depois do DOM estar pronto
  setupUploadZone(
    'coverUploadZone', 'coverProgress', 'coverProgressBar',
    'pCoverImage', 'posts',
    url => { document.getElementById('coverPreview').innerHTML =
      `<div class="img-thumb"><img src="${url}"/><button class="del" onclick="clearCover()">✕</button></div>`; }
  );
  setupUploadZone(
    'slideUploadZone', 'slideProgress', 'slideProgressBar',
    'sImageUrl', 'slides',
    url => { document.getElementById('slideImgPreview').innerHTML =
      `<div class="img-thumb"><img src="${url}"/><button class="del" onclick="clearSlideImg()">✕</button></div>`; }
  );

  window.clearCover    = () => { document.getElementById('pCoverImage').value=''; document.getElementById('coverPreview').innerHTML=''; };
  window.clearSlideImg = () => { document.getElementById('sImageUrl').value='';   document.getElementById('slideImgPreview').innerHTML=''; };

  // Botões salvar artigo
  document.getElementById('savePostBtn').addEventListener('click',  () => savePost('published'));
  document.getElementById('saveDraftBtn').addEventListener('click', () => savePost('draft'));

  // Slide modal
  document.getElementById('newSlideBtn').addEventListener('click', () => openSlideModal(null));
  document.getElementById('saveSlideBtn').addEventListener('click', saveSlide);

  // Menu modal
  document.getElementById('newMenuItemBtn').addEventListener('click', () => openMenuModal(null));
  document.getElementById('saveMenuItemBtn').addEventListener('click', saveMenuItem);

  // User modal
  document.getElementById('newUserBtn').addEventListener('click', () => openUserModal(null));
  document.getElementById('saveUserBtn').addEventListener('click', saveUser);

  // Dashboard inicial
  loadDashboard();
}

// ── NAVIGATION ────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:'DASHBOARD', posts:'ARTÍCULOS', newpost:'NUEVO ARTÍCULO',
  slides:'SLIDES', menu:'MENÚ', users:'USUARIOS', contacts:'CONSULTAS'
};

window.navTo = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  const navEl  = document.querySelector(`[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[page] || page.toUpperCase();
  document.getElementById('sidebar').classList.remove('open');

  if (page === 'dashboard') loadDashboard();
  if (page === 'posts')     loadPosts();
  if (page === 'slides')    loadSlides();
  if (page === 'menu')      loadMenu();
  if (page === 'users')     loadUsers();
  if (page === 'contacts')  loadContacts();
  if (page === 'newpost')   initPostForm(null);
};

// ── QUILL EDITOR ─────────────────────────────────────────────────────────
let quill = null;

function initPostForm(editData) {
  document.getElementById('postFormTitle').textContent = editData ? 'EDITAR ARTÍCULO' : 'NUEVO ARTÍCULO';
  document.getElementById('editPostId').value  = editData?.id       || '';
  document.getElementById('pTitle').value      = editData?.title    || '';
  document.getElementById('pCategory').value   = editData?.category || '';
  document.getElementById('pStatus').value     = editData?.status   || 'draft';
  document.getElementById('pAuthor').value     = editData?.author   || '';
  document.getElementById('pExcerpt').value    = editData?.excerpt  || '';
  document.getElementById('pCoverImage').value = editData?.coverImage || '';
  document.getElementById('coverPreview').innerHTML = editData?.coverImage
    ? `<div class="img-thumb"><img src="${editData.coverImage}"/><button class="del" onclick="clearCover()">✕</button></div>` : '';

  // Quill: criar se não existe, limpar se já existe
  if (!quill) {
    quill = new Quill('#quillEditor', {
      theme: 'snow',
      placeholder: 'Escribí el contenido del artículo...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['link', 'blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['image'],
          ['clean']
        ]
      }
    });

    // Upload de imagem dentro do editor
    quill.getModule('toolbar').addHandler('image', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        const file = inp.files[0]; if (!file) return;
        toast('Subiendo imagen...');
        try {
          const url = await uploadToCloudinary(file, 'post-images', null, null);
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', url, 'user');
          toast('Imagen insertada ✓');
        } catch (e) { /* ya mostrado */ }
      };
      inp.click();
    });
  } else {
    quill.setContents([{ insert: '\n' }]);
  }

  if (editData?.content) {
    quill.clipboard.dangerouslyPasteHTML(editData.content);
  }
}

// ── SAVE POST ─────────────────────────────────────────────────────────────
async function savePost(status) {
  const title = document.getElementById('pTitle').value.trim();
  if (!title) { toast('El título es obligatorio', 'error'); return; }

  if (!quill) { toast('Editor no inicializado. Ingresá a "Nuevo Artículo" primero.', 'error'); return; }

  const content    = quill.root.innerHTML.trim();
  const editId     = document.getElementById('editPostId').value.trim();
  const coverImage = document.getElementById('pCoverImage').value.trim();

  const data = {
    title,
    content,
    status,
    excerpt:     document.getElementById('pExcerpt').value.trim(),
    category:    document.getElementById('pCategory').value,
    author:      document.getElementById('pAuthor').value.trim(),
    coverImage:  coverImage,
    updatedAt:   serverTimestamp()
  };

  const btn = document.getElementById(status === 'published' ? 'savePostBtn' : 'saveDraftBtn');
  btn.disabled = true;
  btn.textContent = 'GUARDANDO...';

  try {
    if (editId) {
      await updateDoc(doc(db, 'posts', editId), data);
      toast('Artículo actualizado ✓');
    } else {
      data.createdAt = serverTimestamp();
      const ref = await addDoc(collection(db, 'posts'), data);
      toast('Artículo guardado (ID: ' + ref.id + ') ✓');
    }
    navTo('posts');
  } catch (e) {
    console.error('savePost error:', e);
    toast('Error al guardar: ' + (e.message || e.code || 'desconocido'), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = status === 'published' ? 'PUBLICAR ARTÍCULO' : 'GUARDAR BORRADOR';
  }
}

// ── LOAD POSTS ────────────────────────────────────────────────────────────
async function loadPosts() {
  const tbody = document.querySelector('#postsTable tbody');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">Cargando...</td></tr>`;
  try {
    let snap;
    try   { snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'))); }
    catch { snap = await getDocs(collection(db, 'posts')); }

    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">No hay artículos aún.</td></tr>`;
      return;
    }

    const posts = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return tb - ta;
      });

    tbody.innerHTML = '';
    posts.forEach(p => {
      const badge = p.status === 'published' ? 'badge-green' : 'badge-yellow';
      const label = p.status === 'published' ? 'PUBLICADO'   : 'BORRADOR';
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td><strong>${p.title}</strong></td>
          <td>${p.category || '—'}</td>
          <td><span class="badge ${badge}">${label}</span></td>
          <td style="font-family:var(--mono);font-size:.72rem">${fmtDate(p.createdAt)}</td>
          <td><div class="actions">
            <button class="btn btn-cyan btn-sm" onclick="editPost('${p.id}')">EDITAR</button>
            <button class="btn btn-red btn-sm"  onclick="deletePost('${p.id}')">ELIMINAR</button>
          </div></td>
        </tr>`);
    });
  } catch (e) {
    console.error('loadPosts:', e);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--red);font-family:var(--mono);font-size:.75rem">Error: ${e.message}</td></tr>`;
  }
}

window.editPost = async id => {
  try {
    const snap = await getDoc(doc(db, 'posts', id));
    if (!snap.exists()) { toast('Artículo no encontrado', 'error'); return; }
    navTo('newpost');
    setTimeout(() => initPostForm({ id, ...snap.data() }), 150);
  } catch (e) { toast('Error al cargar artículo', 'error'); }
};

window.deletePost = async id => {
  if (!confirm('¿Eliminar este artículo?')) return;
  try {
    await deleteDoc(doc(db, 'posts', id));
    toast('Artículo eliminado');
    loadPosts();
  } catch (e) { toast('Error al eliminar', 'error'); }
};

// ── SLIDES ────────────────────────────────────────────────────────────────
async function loadSlides() {
  const grid = document.getElementById('slidesGrid');
  grid.innerHTML = `<p style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">Cargando...</p>`;
  try {
    let snap;
    try   { snap = await getDocs(query(collection(db, 'slides'), orderBy('order', 'asc'))); }
    catch { snap = await getDocs(collection(db, 'slides')); }

    if (snap.empty) {
      grid.innerHTML = `<p style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">No hay slides aún. Creá el primero.</p>`;
      return;
    }

    const slides = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    grid.innerHTML = '';
    slides.forEach(s => {
      grid.insertAdjacentHTML('beforeend', `
        <div class="slide-card">
          ${s.imageUrl
            ? `<img src="${s.imageUrl}" style="width:100%;height:130px;object-fit:cover;display:block"/>`
            : `<div class="slide-card-img">🖼️</div>`}
          <div class="slide-card-body">
            <div class="slide-card-title">${s.title || 'Sin título'}</div>
            <div class="slide-order">Orden: <strong>${s.order || 0}</strong></div>
            ${s.caption ? `<div style="font-family:var(--mono);font-size:.65rem;color:var(--muted);margin-top:4px">${s.caption}</div>` : ''}
            <div class="slide-card-actions">
              <button class="btn btn-cyan btn-sm" onclick="editSlide('${s.id}')">EDITAR</button>
              <button class="btn btn-red btn-sm"  onclick="deleteSlide('${s.id}')">ELIMINAR</button>
            </div>
          </div>
        </div>`);
    });
  } catch (e) {
    console.error('loadSlides:', e);
    grid.innerHTML = `<p style="color:var(--red);font-family:var(--mono)">Error: ${e.message}</p>`;
  }
}

function openSlideModal(data) {
  document.getElementById('slideModalTitle').textContent = data ? 'EDITAR SLIDE' : 'NUEVO SLIDE';
  document.getElementById('editSlideId').value  = data?.id       || '';
  document.getElementById('sTitle').value       = data?.title    || '';
  document.getElementById('sCaption').value     = data?.caption  || '';
  document.getElementById('sOrder').value       = data?.order    ?? 0;
  document.getElementById('sImageUrl').value    = data?.imageUrl || '';
  document.getElementById('sLink').value        = data?.link     || '';
  document.getElementById('slideImgPreview').innerHTML = data?.imageUrl
    ? `<div class="img-thumb"><img src="${data.imageUrl}"/><button class="del" onclick="clearSlideImg()">✕</button></div>` : '';
  openModal('slideModal');
}

window.editSlide = async id => {
  try {
    const snap = await getDoc(doc(db, 'slides', id));
    if (snap.exists()) openSlideModal({ id, ...snap.data() });
  } catch (e) { toast('Error al cargar slide', 'error'); }
};

async function saveSlide() {
  const editId = document.getElementById('editSlideId').value.trim();
  const imageUrl = document.getElementById('sImageUrl').value.trim();
  const data = {
    title:     document.getElementById('sTitle').value.trim(),
    caption:   document.getElementById('sCaption').value.trim(),
    order:     parseInt(document.getElementById('sOrder').value) || 0,
    imageUrl,
    link:      document.getElementById('sLink').value.trim(),
    updatedAt: serverTimestamp()
  };
  const btn = document.getElementById('saveSlideBtn');
  btn.disabled = true; btn.textContent = 'GUARDANDO...';
  try {
    if (editId) {
      await updateDoc(doc(db, 'slides', editId), data);
      toast('Slide actualizado ✓');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'slides'), data);
      toast('Slide creado ✓');
    }
    closeModal('slideModal');
    loadSlides();
  } catch (e) {
    console.error('saveSlide:', e);
    toast('Error al guardar slide: ' + (e.message || e.code), 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'GUARDAR SLIDE';
  }
}

window.deleteSlide = async id => {
  if (!confirm('¿Eliminar este slide?')) return;
  try { await deleteDoc(doc(db, 'slides', id)); toast('Slide eliminado'); loadSlides(); }
  catch (e) { toast('Error al eliminar', 'error'); }
};

// ── MENU ──────────────────────────────────────────────────────────────────
let menuItems = [];

async function loadMenu() {
  const list = document.getElementById('menuList');
  list.innerHTML = `<p style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">Cargando...</p>`;
  try {
    let snap;
    try   { snap = await getDocs(query(collection(db, 'menu'), orderBy('order', 'asc'))); }
    catch { snap = await getDocs(collection(db, 'menu')); }
    menuItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMenuList();
  } catch (e) {
    console.error('loadMenu:', e);
    list.innerHTML = `<p style="color:var(--red);font-family:var(--mono)">Error: ${e.message}</p>`;
  }
}

function renderMenuList() {
  const list = document.getElementById('menuList');
  if (!menuItems.length) {
    list.innerHTML = `<p style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">No hay ítems. Creá el primero.</p>`;
    return;
  }
  const roots    = menuItems.filter(i => !i.parentId).sort((a, b) => (a.order||0) - (b.order||0));
  const children = menuItems.filter(i =>  i.parentId);
  list.innerHTML = '';
  roots.forEach(item => {
    const subs = children.filter(c => c.parentId === item.id).sort((a, b) => (a.order||0) - (b.order||0));
    list.insertAdjacentHTML('beforeend', `
      <div class="menu-item-row">
        <span class="drag-handle">⠿</span>
        <span class="menu-item-label">${item.label}</span>
        <span class="menu-item-url">${item.url || ''}</span>
        ${subs.length ? `<span class="badge" style="border:1px solid rgba(0,212,255,.25);color:var(--cyan);background:rgba(0,212,255,.07);font-family:var(--mono);font-size:.6rem;padding:2px 8px">${subs.length} submenu</span>` : ''}
        <div class="actions">
          <button class="btn btn-cyan btn-sm" onclick="editMenuItem('${item.id}')">EDITAR</button>
          <button class="btn btn-red btn-sm"  onclick="deleteMenuItem('${item.id}')">ELIMINAR</button>
        </div>
      </div>
      ${subs.map(s => `
        <div style="margin-left:28px;margin-bottom:8px">
          <div class="menu-item-row" style="background:rgba(0,212,255,.03);border-color:rgba(0,212,255,.12)">
            <span class="drag-handle">⠿</span>
            <span style="color:var(--cyan);margin-right:4px;font-size:.75rem">↳</span>
            <span class="menu-item-label">${s.label}</span>
            <span class="menu-item-url">${s.url || ''}</span>
            <div class="actions">
              <button class="btn btn-cyan btn-sm" onclick="editMenuItem('${s.id}')">EDITAR</button>
              <button class="btn btn-red btn-sm"  onclick="deleteMenuItem('${s.id}')">ELIMINAR</button>
            </div>
          </div>
        </div>`).join('')}`);
  });
}

function openMenuModal(data) {
  document.getElementById('menuModalTitle').textContent = data ? 'EDITAR ÍTEM' : 'NUEVO ÍTEM DE MENÚ';
  document.getElementById('editMenuId').value = data?.id    || '';
  document.getElementById('mLabel').value     = data?.label || '';
  document.getElementById('mUrl').value       = data?.url   || '';
  document.getElementById('mOrder').value     = data?.order ?? 0;

  const sel = document.getElementById('mParent');
  sel.innerHTML = '<option value="">Ninguno (ítem raíz)</option>';
  menuItems.filter(i => !i.parentId && i.id !== data?.id).forEach(i => {
    sel.insertAdjacentHTML('beforeend', `<option value="${i.id}">${i.label}</option>`);
  });
  sel.value = data?.parentId || '';
  openModal('menuModal');
}

window.editMenuItem = id => {
  const item = menuItems.find(i => i.id === id);
  if (item) openMenuModal(item);
};

async function saveMenuItem() {
  const label = document.getElementById('mLabel').value.trim();
  if (!label) { toast('La etiqueta es obligatoria', 'error'); return; }

  const editId = document.getElementById('editMenuId').value.trim();
  const data = {
    label,
    url:       document.getElementById('mUrl').value.trim(),
    parentId:  document.getElementById('mParent').value || null,
    order:     parseInt(document.getElementById('mOrder').value) || 0,
    updatedAt: serverTimestamp()
  };

  const btn = document.getElementById('saveMenuItemBtn');
  btn.disabled = true; btn.textContent = 'GUARDANDO...';
  try {
    if (editId) {
      await updateDoc(doc(db, 'menu', editId), data);
      toast('Ítem actualizado ✓');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'menu'), data);
      toast('Ítem creado ✓');
    }
    closeModal('menuModal');
    loadMenu();
  } catch (e) {
    console.error('saveMenuItem:', e);
    toast('Error al guardar: ' + (e.message || e.code), 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'GUARDAR';
  }
}

window.deleteMenuItem = async id => {
  if (!confirm('¿Eliminar este ítem?')) return;
  try { await deleteDoc(doc(db, 'menu', id)); toast('Ítem eliminado'); loadMenu(); }
  catch (e) { toast('Error al eliminar', 'error'); }
};

// ── USUARIOS ──────────────────────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">Cargando...</td></tr>`;
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">No hay usuarios aún.</td></tr>`;
      return;
    }
    tbody.innerHTML = '';
    snap.docs.forEach(d => {
      const u = { id: d.id, ...d.data() };
      const active = u.active !== false;
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td><strong>${u.name || '—'}</strong></td>
          <td style="font-family:var(--mono);font-size:.72rem">${u.email || '—'}</td>
          <td>${u.service || '—'}</td>
          <td><span class="badge ${active ? 'badge-green' : 'badge-red'}">${active ? 'ACTIVO' : 'INACTIVO'}</span></td>
          <td><div class="actions">
            <button class="btn btn-cyan btn-sm" onclick="editUser('${u.id}')">EDITAR</button>
            <button class="btn btn-red btn-sm"  onclick="deleteUser('${u.id}')">ELIMINAR</button>
          </div></td>
        </tr>`);
    });
  } catch (e) { console.error('loadUsers:', e); toast('Error al cargar usuarios', 'error'); }
}

function openUserModal(data) {
  document.getElementById('userModalTitle').textContent = data ? 'EDITAR USUARIO' : 'NUEVO USUARIO';
  document.getElementById('editUserId').value = data?.id      || '';
  document.getElementById('uName').value      = data?.name    || '';
  document.getElementById('uEmail').value     = data?.email   || '';
  document.getElementById('uPass').value      = '';
  document.getElementById('uService').value   = data?.service || '';
  document.getElementById('uPhone').value     = data?.phone   || '';
  document.getElementById('uNotes').value     = data?.notes   || '';
  openModal('userModal');
}

window.editUser = async id => {
  try {
    const snap = await getDoc(doc(db, 'users', id));
    if (snap.exists()) openUserModal({ id, ...snap.data() });
  } catch (e) { toast('Error al cargar usuario', 'error'); }
};

async function saveUser() {
  const name  = document.getElementById('uName').value.trim();
  const email = document.getElementById('uEmail').value.trim();
  const pass  = document.getElementById('uPass').value;
  const editId = document.getElementById('editUserId').value.trim();
  if (!name || !email) { toast('Nombre y email son obligatorios', 'error'); return; }

  const data = {
    name, email,
    service:   document.getElementById('uService').value,
    phone:     document.getElementById('uPhone').value.trim(),
    notes:     document.getElementById('uNotes').value.trim(),
    active:    true,
    updatedAt: serverTimestamp()
  };

  const btn = document.getElementById('saveUserBtn');
  btn.disabled = true; btn.textContent = 'GUARDANDO...';
  try {
    if (editId) {
      await updateDoc(doc(db, 'users', editId), data);
      toast('Usuario actualizado ✓');
    } else {
      if (!pass || pass.length < 6) { toast('Contraseña mínima 6 caracteres', 'error'); btn.disabled=false; btn.textContent='GUARDAR'; return; }
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      data.uid = cred.user.uid;
      data.createdAt = serverTimestamp();
      await setDoc(doc(db, 'users', cred.user.uid), data);
      toast('Usuario creado ✓');
    }
    closeModal('userModal');
    loadUsers();
  } catch (e) {
    console.error('saveUser:', e);
    const msg = e.code === 'auth/email-already-in-use'
      ? 'Este email ya está registrado en Firebase Auth'
      : 'Error: ' + (e.message || e.code);
    toast(msg, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'GUARDAR';
  }
}

window.deleteUser = async id => {
  if (!confirm('¿Eliminar este usuario?')) return;
  try { await deleteDoc(doc(db, 'users', id)); toast('Usuario eliminado'); loadUsers(); }
  catch (e) { toast('Error al eliminar', 'error'); }
};

// ── CONSULTAS ─────────────────────────────────────────────────────────────
async function loadContacts() {
  const tbody = document.querySelector('#contactsTable tbody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">Cargando...</td></tr>`;
  try {
    let snap;
    try   { snap = await getDocs(query(collection(db, 'contacts'), orderBy('createdAt', 'desc'))); }
    catch { snap = await getDocs(collection(db, 'contacts')); }

    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">No hay consultas aún.</td></tr>`;
      return;
    }

    const contacts = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return tb - ta;
      });

    tbody.innerHTML = '';
    contacts.forEach(c => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td><strong>${c.name || '—'}</strong></td>
          <td style="font-family:var(--mono);font-size:.72rem"><a href="mailto:${c.email}" style="color:var(--green)">${c.email || '—'}</a></td>
          <td style="font-family:var(--mono);font-size:.72rem">${c.phone || '—'}</td>
          <td>${c.service || '—'}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem;color:var(--muted)">${c.message || '—'}</td>
          <td style="font-family:var(--mono);font-size:.68rem;white-space:nowrap">${fmtDate(c.createdAt)}</td>
        </tr>`);
    });
  } catch (e) { console.error('loadContacts:', e); }
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [postsSnap, usersSnap, slidesSnap, contactsSnap] = await Promise.all([
      getDocs(collection(db, 'posts')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'slides')),
      getDocs(collection(db, 'contacts'))
    ]);

    document.getElementById('sPosts').textContent    = postsSnap.size;
    document.getElementById('sUsers').textContent    = usersSnap.size;
    document.getElementById('sSlides').textContent   = slidesSnap.size;
    document.getElementById('sContacts').textContent = contactsSnap.size;

    const tbody = document.querySelector('#recentContacts tbody');
    const contacts = contactsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return tb - ta;
      }).slice(0, 5);

    tbody.innerHTML = contacts.length
      ? contacts.map(c => `
          <tr>
            <td><strong>${c.name || '—'}</strong></td>
            <td>${c.service || '—'}</td>
            <td style="font-family:var(--mono);font-size:.72rem"><a href="mailto:${c.email}" style="color:var(--green)">${c.email || '—'}</a></td>
            <td style="font-family:var(--mono);font-size:.68rem">${fmtDate(c.createdAt)}</td>
          </tr>`).join('')
      : `<tr><td colspan="4" style="text-align:center;padding:16px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">Sin consultas aún.</td></tr>`;
  } catch (e) { console.error('loadDashboard:', e); }
}
