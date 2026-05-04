// HS Gestión – Admin JS v2.0.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, setDoc, doc, deleteDoc, updateDoc, query, orderBy, limit, getDoc, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey:"AIzaSyDmMP5ZCfl9JfkQQf1xIfcGAei_BPLvKj8",authDomain:"hs-gestion-a102e.firebaseapp.com",
  projectId:"hs-gestion-a102e",storageBucket:"hs-gestion-a102e.firebasestorage.app",
  messagingSenderId:"40828198084",appId:"1:40828198084:web:70dd328e4e242925727d91"
};
const ADMIN_EMAIL = "riconetson@gmail.com";

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

// ── UTILS ──────────────────────────────────────────────────────────────────
function toast(msg, type='success') {
  const t = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = `toast-item toast-${type}`;
  el.textContent = (type==='success'?'✓ ':'✗ ') + msg;
  t.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'});
}

function confirmDel(msg) { return confirm('¿Eliminar? ' + msg); }

window.closeModal = (id) => document.getElementById(id).classList.remove('open');
function openModal(id) { document.getElementById(id).classList.add('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if(e.target === m) m.classList.remove('open'); });
});

// ── TOPBAR CLOCK ───────────────────────────────────────────────────────────
setInterval(() => {
  const el = document.getElementById('topbarTime');
  if(el) el.textContent = new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}, 1000);

// ── AUTH GUARD ─────────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (!user || user.email !== ADMIN_EMAIL) { window.location.href='../index.html'; return; }
  document.getElementById('adminEmail').textContent = user.email;
  loadDashboard();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth); window.location.href = '../index.html';
});

// ── NAVIGATION ─────────────────────────────────────────────────────────────
const titles = { dashboard:'DASHBOARD', posts:'ARTÍCULOS', newpost:'NUEVO ARTÍCULO', slides:'SLIDES', menu:'MENÚ', users:'USUARIOS', contacts:'CONSULTAS' };

window.navTo = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  document.getElementById('topbarTitle').textContent = titles[page] || page.toUpperCase();
  document.getElementById('sidebar').classList.remove('open');
  // Load data
  if(page==='dashboard')  loadDashboard();
  if(page==='posts')      loadPosts();
  if(page==='slides')     loadSlides();
  if(page==='menu')       loadMenu();
  if(page==='users')      loadUsers();
  if(page==='contacts')   loadContacts();
  if(page==='newpost')    initNewPost();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => navTo(item.dataset.page));
});

// Sidebar mobile
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── QUILL EDITOR ───────────────────────────────────────────────────────────
let quill = null;
function initNewPost(editData = null) {
  document.getElementById('postFormTitle').textContent = editData ? 'EDITAR ARTÍCULO' : 'NUEVO ARTÍCULO';
  document.getElementById('editPostId').value = editData?.id || '';
  document.getElementById('pTitle').value = editData?.title || '';
  document.getElementById('pCategory').value = editData?.category || '';
  document.getElementById('pStatus').value = editData?.status || 'draft';
  document.getElementById('pAuthor').value = editData?.author || '';
  document.getElementById('pExcerpt').value = editData?.excerpt || '';
  document.getElementById('pCoverImage').value = editData?.coverImage || '';
  renderCoverPreview(editData?.coverImage || null);

  if (!quill) {
    quill = new Quill('#quillEditor', {
      theme: 'snow',
      placeholder: 'Escribí el contenido del artículo...',
      modules: {
        toolbar: [
          [{ header: [1,2,3,false] }],
          ['bold','italic','underline','strike'],
          ['link','blockquote','code-block'],
          [{ list:'ordered' },{ list:'bullet' }],
          ['image'],
          ['clean']
        ]
      }
    });
    // Image handler
    quill.getModule('toolbar').addHandler('image', () => {
      const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
      inp.onchange = async () => {
        const file = inp.files[0]; if(!file) return;
        toast('Subiendo imagen...');
        const url = await uploadFile(file, 'post-images/'+Date.now()+'-'+file.name);
        if(url) { const range = quill.getSelection(true); quill.insertEmbed(range.index,'image',url,'user'); }
      };
      inp.click();
    });
  } else {
    quill.setContents([]);
  }
  if(editData?.content) quill.clipboard.dangerouslyPasteHTML(editData.content);
}

// ── UPLOAD HELPER ─────────────────────────────────────────────────────────
function uploadFile(file, path, progressBarId = null) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);
    if(progressBarId) {
      const wrap = document.getElementById(progressBarId+'Wrap')||document.getElementById(progressBarId)?.parentElement;
      if(wrap) wrap.style.display='block';
    }
    task.on('state_changed',
      snap => {
        const pct = (snap.bytesTransferred/snap.totalBytes)*100;
        const bar = document.getElementById(progressBarId);
        if(bar) bar.style.width = pct+'%';
      },
      err => { toast('Error al subir imagen','error'); reject(err); },
      async () => { const url = await getDownloadURL(task.snapshot.ref); resolve(url); }
    );
  });
}

function setupUploadZone(zoneId, progressId, hiddenId, previewId) {
  const zone = document.getElementById(zoneId);
  const hidden = document.getElementById(hiddenId);
  if(!zone) return;
  zone.addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange = async () => handleFileUpload(inp.files[0], progressId, hiddenId, previewId);
    inp.click();
  });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag');
    handleFileUpload(e.dataTransfer.files[0], progressId, hiddenId, previewId);
  });
}

async function handleFileUpload(file, progressId, hiddenId, previewId) {
  if(!file || file.size > 3*1024*1024) { toast('Archivo muy grande (máx 3MB)','error'); return; }
  const prog = document.getElementById(progressId);
  if(prog) { prog.style.display='block'; }
  const bar = document.getElementById(progressId+'Bar');
  const path = 'uploads/'+Date.now()+'-'+file.name;
  try {
    const url = await uploadFile(file, path, progressId);
    document.getElementById(hiddenId).value = url;
    if(previewId === 'coverPreview') renderCoverPreview(url);
    if(previewId === 'slideImgPreview') renderSlidePreview(url);
    if(prog) setTimeout(()=>prog.style.display='none', 500);
    toast('Imagen subida correctamente');
  } catch(e) { toast('Error al subir','error'); }
}

function renderCoverPreview(url) {
  const el = document.getElementById('coverPreview'); if(!el) return;
  el.innerHTML = url ? `<div class="img-thumb"><img src="${url}" /><button class="del" onclick="clearCover()">✕</button></div>` : '';
}
window.clearCover = () => { document.getElementById('pCoverImage').value=''; renderCoverPreview(null); };

function renderSlidePreview(url) {
  const el = document.getElementById('slideImgPreview'); if(!el) return;
  el.innerHTML = url ? `<div class="img-thumb"><img src="${url}" /><button class="del" onclick="clearSlideImg()">✕</button></div>` : '';
}
window.clearSlideImg = () => { document.getElementById('sImageUrl').value=''; renderSlidePreview(null); };

setupUploadZone('coverUploadZone','coverProgress','pCoverImage','coverPreview');
setupUploadZone('slideUploadZone','slideProgress','sImageUrl','slideImgPreview');

// ── SAVE POST ─────────────────────────────────────────────────────────────
async function savePost(status) {
  const title = document.getElementById('pTitle').value.trim();
  if(!title) { toast('El título es obligatorio','error'); return; }
  const content = quill ? quill.root.innerHTML : '';
  const editId = document.getElementById('editPostId').value;
  const data = {
    title,
    content,
    excerpt:      document.getElementById('pExcerpt').value.trim(),
    category:     document.getElementById('pCategory').value,
    author:       document.getElementById('pAuthor').value.trim(),
    status,
    coverImage:   document.getElementById('pCoverImage').value || '',
    updatedAt:    serverTimestamp()
  };
  try {
    if(editId) {
      await updateDoc(doc(db,'posts',editId), data);
      toast('Artículo actualizado');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db,'posts'), data);
      toast('Artículo guardado');
    }
    navTo('posts');
  } catch(e) { console.error(e); toast('Error al guardar','error'); }
}

document.getElementById('savePostBtn').addEventListener('click', () => savePost('published'));
document.getElementById('saveDraftBtn').addEventListener('click', () => savePost('draft'));

// ── LOAD POSTS ────────────────────────────────────────────────────────────
async function loadPosts() {
  const tbody = document.querySelector('#postsTable tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">Cargando...</td></tr>';
  try {
    let snap; try { snap = await getDocs(query(collection(db,'posts'),orderBy('createdAt','desc'))); }
    catch { snap = await getDocs(collection(db,'posts')); }
    if(snap.empty) { tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">No hay artículos aún.</td></tr>'; return; }
    tbody.innerHTML = '';
    snap.docs.forEach(d => {
      const p = {id:d.id,...d.data()};
      const badge = p.status==='published'?'badge-green':'badge-yellow';
      const label = p.status==='published'?'PUBLICADO':'BORRADOR';
      tbody.insertAdjacentHTML('beforeend',`
        <tr>
          <td><strong>${p.title}</strong></td>
          <td>${p.category||'—'}</td>
          <td><span class="badge ${badge}">${label}</span></td>
          <td style="font-family:var(--mono);font-size:.72rem">${fmtDate(p.createdAt)}</td>
          <td><div class="actions">
            <button class="btn btn-cyan btn-sm" onclick="editPost('${p.id}')">EDITAR</button>
            <button class="btn btn-red btn-sm" onclick="deletePost('${p.id}','${p.title}')">ELIMINAR</button>
          </div></td>
        </tr>`);
    });
  } catch(e) { console.error(e); tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--red);font-family:var(--mono);font-size:.75rem;padding:20px">Error al cargar.</td></tr>'; }
}

window.editPost = async (id) => {
  const snap = await getDoc(doc(db,'posts',id));
  if(!snap.exists()) return;
  navTo('newpost');
  setTimeout(() => initNewPost({id,...snap.data()}), 100);
};

window.deletePost = async (id, title) => {
  if(!confirmDel(`"${title}"`)) return;
  await deleteDoc(doc(db,'posts',id));
  toast('Artículo eliminado');
  loadPosts();
};

// ── SLIDES ────────────────────────────────────────────────────────────────
async function loadSlides() {
  const grid = document.getElementById('slidesGrid');
  grid.innerHTML = '<p style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">Cargando...</p>';
  try {
    let snap; try { snap = await getDocs(query(collection(db,'slides'),orderBy('order','asc'))); }
    catch { snap = await getDocs(collection(db,'slides')); }
    if(snap.empty) { grid.innerHTML='<p style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">No hay slides. Creá el primero.</p>'; return; }
    grid.innerHTML = '';
    snap.docs.forEach(d => {
      const s = {id:d.id,...d.data()};
      grid.insertAdjacentHTML('beforeend',`
        <div class="slide-card">
          ${s.imageUrl
            ? `<img src="${s.imageUrl}" class="slide-card-img" style="width:100%;height:130px;object-fit:cover" />`
            : `<div class="slide-card-img">🖼️</div>`}
          <div class="slide-card-body">
            <div class="slide-card-title">${s.title||'Sin título'}</div>
            <div class="slide-order">Orden: <strong>${s.order||0}</strong></div>
            ${s.caption?`<div style="font-family:var(--mono);font-size:.65rem;color:var(--muted);margin-top:4px">${s.caption}</div>`:''}
            <div class="slide-card-actions">
              <button class="btn btn-cyan btn-sm" onclick="editSlide('${s.id}')">EDITAR</button>
              <button class="btn btn-red btn-sm" onclick="deleteSlide('${s.id}')">ELIMINAR</button>
            </div>
          </div>
        </div>`);
    });
  } catch(e) { console.error(e); grid.innerHTML='<p style="color:var(--red);font-family:var(--mono)">Error al cargar slides.</p>'; }
}

document.getElementById('newSlideBtn').addEventListener('click', () => {
  document.getElementById('slideModalTitle').textContent = 'NUEVO SLIDE';
  document.getElementById('editSlideId').value = '';
  document.getElementById('sTitle').value = '';
  document.getElementById('sCaption').value = '';
  document.getElementById('sOrder').value = '0';
  document.getElementById('sImageUrl').value = '';
  document.getElementById('sLink').value = '';
  renderSlidePreview(null);
  openModal('slideModal');
});

window.editSlide = async (id) => {
  const snap = await getDoc(doc(db,'slides',id));
  if(!snap.exists()) return;
  const s = snap.data();
  document.getElementById('slideModalTitle').textContent = 'EDITAR SLIDE';
  document.getElementById('editSlideId').value = id;
  document.getElementById('sTitle').value = s.title||'';
  document.getElementById('sCaption').value = s.caption||'';
  document.getElementById('sOrder').value = s.order||0;
  document.getElementById('sImageUrl').value = s.imageUrl||'';
  document.getElementById('sLink').value = s.link||'';
  renderSlidePreview(s.imageUrl||null);
  openModal('slideModal');
};

document.getElementById('saveSlideBtn').addEventListener('click', async () => {
  const editId = document.getElementById('editSlideId').value;
  const data = {
    title:    document.getElementById('sTitle').value.trim(),
    caption:  document.getElementById('sCaption').value.trim(),
    order:    parseInt(document.getElementById('sOrder').value)||0,
    imageUrl: document.getElementById('sImageUrl').value,
    link:     document.getElementById('sLink').value.trim(),
    updatedAt: serverTimestamp()
  };
  try {
    if(editId) { await updateDoc(doc(db,'slides',editId),data); toast('Slide actualizado'); }
    else { data.createdAt=serverTimestamp(); await addDoc(collection(db,'slides'),data); toast('Slide creado'); }
    closeModal('slideModal'); loadSlides();
  } catch(e) { console.error(e); toast('Error al guardar slide','error'); }
});

window.deleteSlide = async (id) => {
  if(!confirmDel('este slide')) return;
  await deleteDoc(doc(db,'slides',id)); toast('Slide eliminado'); loadSlides();
};

// ── MENU ──────────────────────────────────────────────────────────────────
let menuItems = [];

async function loadMenu() {
  const list = document.getElementById('menuList');
  list.innerHTML = '<p style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">Cargando...</p>';
  try {
    let snap; try { snap = await getDocs(query(collection(db,'menu'),orderBy('order','asc'))); }
    catch { snap = await getDocs(collection(db,'menu')); }
    menuItems = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderMenuList();
  } catch(e) { console.error(e); list.innerHTML='<p style="color:var(--red);font-family:var(--mono)">Error al cargar menú.</p>'; }
}

function renderMenuList() {
  const list = document.getElementById('menuList');
  if(!menuItems.length) { list.innerHTML='<p style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">No hay ítems de menú. Creá el primero.</p>'; return; }
  const roots = menuItems.filter(i=>!i.parentId).sort((a,b)=>(a.order||0)-(b.order||0));
  const children = menuItems.filter(i=>i.parentId);
  list.innerHTML = '';
  roots.forEach(item => {
    const subs = children.filter(c=>c.parentId===item.id);
    const rowHtml = `
      <div class="menu-item-row">
        <span class="drag-handle">⠿</span>
        <span class="menu-item-label">${item.label}</span>
        <span class="menu-item-url">${item.url||''}</span>
        ${subs.length?`<span class="badge badge-cyan" style="border-color:rgba(0,212,255,.2);color:var(--cyan);background:rgba(0,212,255,.08)">${subs.length} sub</span>`:''}
        <div class="actions">
          <button class="btn btn-cyan btn-sm" onclick="editMenuItem('${item.id}')">EDITAR</button>
          <button class="btn btn-red btn-sm" onclick="deleteMenuItem('${item.id}')">ELIMINAR</button>
        </div>
      </div>
      ${subs.map(s=>`
        <div class="menu-children">
          <div class="menu-item-row" style="background:rgba(0,212,255,0.03);border-color:rgba(0,212,255,.1)">
            <span class="drag-handle">⠿</span>
            <span style="color:var(--cyan);font-size:.75rem;margin-right:4px">↳</span>
            <span class="menu-item-label">${s.label}</span>
            <span class="menu-item-url">${s.url||''}</span>
            <div class="actions">
              <button class="btn btn-cyan btn-sm" onclick="editMenuItem('${s.id}')">EDITAR</button>
              <button class="btn btn-red btn-sm" onclick="deleteMenuItem('${s.id}')">ELIMINAR</button>
            </div>
          </div>
        </div>`).join('')}`;
    list.insertAdjacentHTML('beforeend', rowHtml);
  });
}

document.getElementById('newMenuItemBtn').addEventListener('click', () => {
  document.getElementById('menuModalTitle').textContent = 'NUEVO ÍTEM DE MENÚ';
  document.getElementById('editMenuId').value = '';
  document.getElementById('mLabel').value = '';
  document.getElementById('mUrl').value = '';
  document.getElementById('mOrder').value = '0';
  // Populate parent dropdown
  const sel = document.getElementById('mParent');
  sel.innerHTML = '<option value="">Ninguno (ítem raíz)</option>';
  menuItems.filter(i=>!i.parentId).forEach(i => {
    sel.insertAdjacentHTML('beforeend',`<option value="${i.id}">${i.label}</option>`);
  });
  sel.value = '';
  openModal('menuModal');
});

window.editMenuItem = async (id) => {
  const item = menuItems.find(i=>i.id===id); if(!item) return;
  document.getElementById('menuModalTitle').textContent = 'EDITAR ÍTEM';
  document.getElementById('editMenuId').value = id;
  document.getElementById('mLabel').value = item.label||'';
  document.getElementById('mUrl').value = item.url||'';
  document.getElementById('mOrder').value = item.order||0;
  const sel = document.getElementById('mParent');
  sel.innerHTML = '<option value="">Ninguno (ítem raíz)</option>';
  menuItems.filter(i=>!i.parentId&&i.id!==id).forEach(i => {
    sel.insertAdjacentHTML('beforeend',`<option value="${i.id}">${i.label}</option>`);
  });
  sel.value = item.parentId||'';
  openModal('menuModal');
};

document.getElementById('saveMenuItemBtn').addEventListener('click', async () => {
  const label = document.getElementById('mLabel').value.trim();
  if(!label) { toast('La etiqueta es obligatoria','error'); return; }
  const editId = document.getElementById('editMenuId').value;
  const data = {
    label,
    url:      document.getElementById('mUrl').value.trim(),
    parentId: document.getElementById('mParent').value || null,
    order:    parseInt(document.getElementById('mOrder').value)||0,
    updatedAt: serverTimestamp()
  };
  try {
    if(editId) { await updateDoc(doc(db,'menu',editId),data); toast('Ítem actualizado'); }
    else { data.createdAt=serverTimestamp(); await addDoc(collection(db,'menu'),data); toast('Ítem creado'); }
    closeModal('menuModal'); loadMenu();
  } catch(e) { console.error(e); toast('Error al guardar ítem','error'); }
});

window.deleteMenuItem = async (id) => {
  if(!confirmDel('este ítem de menú')) return;
  await deleteDoc(doc(db,'menu',id)); toast('Ítem eliminado'); loadMenu();
};

// ── USERS ─────────────────────────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">Cargando...</td></tr>';
  try {
    const snap = await getDocs(collection(db,'users'));
    if(snap.empty) { tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">No hay usuarios aún.</td></tr>'; return; }
    tbody.innerHTML='';
    snap.docs.forEach(d => {
      const u = {id:d.id,...d.data()};
      tbody.insertAdjacentHTML('beforeend',`
        <tr>
          <td><strong>${u.name||'—'}</strong></td>
          <td style="font-family:var(--mono);font-size:.72rem">${u.email||'—'}</td>
          <td>${u.service||'—'}</td>
          <td><span class="badge ${u.active===false?'badge-red':'badge-green'}">${u.active===false?'INACTIVO':'ACTIVO'}</span></td>
          <td><div class="actions">
            <button class="btn btn-cyan btn-sm" onclick="editUser('${u.id}')">EDITAR</button>
            <button class="btn btn-red btn-sm" onclick="deleteUser('${u.id}','${u.name||u.email}')">ELIMINAR</button>
          </div></td>
        </tr>`);
    });
  } catch(e) { console.error(e); toast('Error al cargar usuarios','error'); }
}

document.getElementById('newUserBtn').addEventListener('click', () => {
  document.getElementById('userModalTitle').textContent = 'NUEVO USUARIO';
  document.getElementById('editUserId').value = '';
  ['uName','uEmail','uPass','uPhone','uNotes'].forEach(id => document.getElementById(id).value='');
  document.getElementById('uService').value='';
  openModal('userModal');
});

window.editUser = async (id) => {
  const snap = await getDoc(doc(db,'users',id));
  if(!snap.exists()) return;
  const u = snap.data();
  document.getElementById('userModalTitle').textContent = 'EDITAR USUARIO';
  document.getElementById('editUserId').value = id;
  document.getElementById('uName').value = u.name||'';
  document.getElementById('uEmail').value = u.email||'';
  document.getElementById('uPass').value = '';
  document.getElementById('uService').value = u.service||'';
  document.getElementById('uPhone').value = u.phone||'';
  document.getElementById('uNotes').value = u.notes||'';
  openModal('userModal');
};

document.getElementById('saveUserBtn').addEventListener('click', async () => {
  const name  = document.getElementById('uName').value.trim();
  const email = document.getElementById('uEmail').value.trim();
  const pass  = document.getElementById('uPass').value;
  const editId = document.getElementById('editUserId').value;
  if(!name||!email) { toast('Nombre y email son obligatorios','error'); return; }
  const data = {
    name, email,
    service: document.getElementById('uService').value,
    phone:   document.getElementById('uPhone').value.trim(),
    notes:   document.getElementById('uNotes').value.trim(),
    active:  true,
    updatedAt: serverTimestamp()
  };
  try {
    if(editId) {
      await updateDoc(doc(db,'users',editId),data);
      toast('Usuario actualizado');
    } else {
      if(!pass||pass.length<6) { toast('Contraseña mínima 6 caracteres','error'); return; }
      // Crear en Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      data.uid = cred.user.uid;
      data.createdAt = serverTimestamp();
      await setDoc(doc(db,'users',cred.user.uid), data);
      toast('Usuario creado correctamente');
    }
    closeModal('userModal'); loadUsers();
  } catch(e) {
    console.error(e);
    let msg = 'Error al guardar usuario';
    if(e.code==='auth/email-already-in-use') msg='Email ya registrado en Firebase Auth';
    toast(msg,'error');
  }
});

window.deleteUser = async (id, name) => {
  if(!confirmDel(`usuario "${name}"`)) return;
  await deleteDoc(doc(db,'users',id)); toast('Usuario eliminado del Firestore'); loadUsers();
};

// ── CONTACTS ──────────────────────────────────────────────────────────────
async function loadContacts() {
  const tbody = document.querySelector('#contactsTable tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">Cargando...</td></tr>';
  try {
    let snap; try { snap = await getDocs(query(collection(db,'contacts'),orderBy('createdAt','desc'))); }
    catch { snap = await getDocs(collection(db,'contacts')); }
    if(snap.empty) { tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">No hay consultas aún.</td></tr>'; return; }
    tbody.innerHTML='';
    snap.docs.forEach(d=>{
      const c={id:d.id,...d.data()};
      tbody.insertAdjacentHTML('beforeend',`
        <tr>
          <td><strong>${c.name||'—'}</strong></td>
          <td style="font-family:var(--mono);font-size:.72rem"><a href="mailto:${c.email}" style="color:var(--green)">${c.email||'—'}</a></td>
          <td style="font-family:var(--mono);font-size:.72rem">${c.phone||'—'}</td>
          <td>${c.service||'—'}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem;color:var(--muted)">${c.message||'—'}</td>
          <td style="font-family:var(--mono);font-size:.68rem;white-space:nowrap">${fmtDate(c.createdAt)}</td>
        </tr>`);
    });
  } catch(e) { console.error(e); }
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [posts,users,slides,contacts] = await Promise.all([
      getDocs(collection(db,'posts')),
      getDocs(collection(db,'users')),
      getDocs(collection(db,'slides')),
      getDocs(collection(db,'contacts'))
    ]);
    document.getElementById('sPosts').textContent    = posts.size;
    document.getElementById('sUsers').textContent    = users.size;
    document.getElementById('sSlides').textContent   = slides.size;
    document.getElementById('sContacts').textContent = contacts.size;

    // Recent contacts
    const tbody = document.querySelector('#recentContacts tbody');
    const recentSnap = contacts.docs
      .map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>{
        const ta = a.createdAt?.toDate?a.createdAt.toDate():new Date(0);
        const tb = b.createdAt?.toDate?b.createdAt.toDate():new Date(0);
        return tb-ta;
      }).slice(0,5);

    tbody.innerHTML = recentSnap.length
      ? recentSnap.map(c=>`<tr><td><strong>${c.name||'—'}</strong></td><td>${c.service||'—'}</td><td style="font-family:var(--mono);font-size:.72rem"><a href="mailto:${c.email}" style="color:var(--green)">${c.email||'—'}</a></td><td style="font-family:var(--mono);font-size:.68rem">${fmtDate(c.createdAt)}</td></tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;padding:16px;font-family:var(--mono);font-size:.75rem;color:var(--muted)">Sin consultas aún.</td></tr>';
  } catch(e) { console.error(e); }
}
