// HS Gestión Admin – main.js v1.1.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDocs,
  deleteDoc, query, orderBy, serverTimestamp, updateDoc, where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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

// ⚠️ Coloque aqui o email exato que você usou para criar o admin no Firebase Auth
const ADMIN_EMAIL = "riconetson@gmail.com";

let allUsers = [], allMessages = [], allPacks = [];
let confirmCallback = null, editingUserId = null;

const $ = (s,c=document)=>c.querySelector(s);
const $$ = (s,c=document)=>[...c.querySelectorAll(s)];
const dateStr = ts=>ts?.toDate?ts.toDate().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
const slugify = s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');

function toast(msg,type='info'){
  const t=document.createElement('div');
  t.className=`toast ${type}`;
  t.innerHTML=`<span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400)},4000);
}

function openModal(id){document.getElementById(id)?.classList.add('open');}
function closeModal(id){document.getElementById(id)?.classList.remove('open');}
function closeAllModals(){$$('.modal-overlay').forEach(m=>m.classList.remove('open'));}
function showConfirm(msg,cb){$('#confirmMessage').textContent=msg;confirmCallback=cb;openModal('confirmModal');}

function updateStats(){
  const paid=allUsers.filter(u=>u.paymentStatus==='paid').length;
  const open=allUsers.filter(u=>u.paymentStatus==='open').length;
  $('#statUsers').textContent=allUsers.length;
  $('#statPaid').textContent=paid;
  $('#statOpen').textContent=open;
  $('#statPacks').textContent=allPacks.length;
  $('#userCountPill').textContent=allUsers.length;
  const dashEl=$('#dashRecentUsers');
  if(dashEl){
    dashEl.innerHTML=allUsers.slice(0,4).map(u=>`
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div class="user-logo-placeholder" style="width:32px;height:32px;font-size:.8rem;border-radius:8px;overflow:hidden;">
          ${u.logoFile?`<img src="../../images/usuarios/${u.logoFile}" style="width:32px;height:32px;object-fit:cover;" onerror="this.style.display='none'" />`:u.name.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.88rem;font-weight:600;color:var(--white)">${u.name}</div>
          <div style="font-size:.75rem;color:var(--muted)">${u.service||'Sin servicio'}</div>
        </div>
        <span class="badge ${u.paymentStatus==='paid'?'badge-green':'badge-red'}" style="font-size:.7rem">
          ${u.paymentStatus==='paid'?'Pagado':'Pendiente'}
        </span>
      </div>`).join('')||'<p style="color:var(--muted);font-size:.88rem;">Sin usuarios aún</p>';
  }
}

// AUTH — O login é feito no index.html principal
// Aqui só verificamos se o usuário já está logado como admin
$('#logoutBtn').addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = '../index.html';
  });
});

onAuthStateChanged(auth, async user => {
  if (user && user.email === ADMIN_EMAIL) {
    // Admin logado — mostrar painel
    $('#loginScreen').style.display = 'none';
    $('#adminApp').style.display    = 'grid';
    $('#adminEmailDisplay').textContent = user.email;
    await loadAll();
    navigateTo('dashboard');
  } else if (user && user.email !== ADMIN_EMAIL) {
    // Cliente tentou acessar o admin — volta para sua página
    await signOut(auth);
    window.location.href = '../index.html';
  } else {
    // Não logado — redirecionar para o login principal
    window.location.href = '../index.html';
  }
});

// NAVEGAÇÃO
function navigateTo(section){
  $$('.page-section').forEach(s=>s.classList.remove('active'));
  $$('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById(`page-${section}`)?.classList.add('active');
  document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
  const titles={dashboard:'Dashboard',usuarios:'Gestión de Usuarios',mensajes:'Mensajes',packs:'Packs de Contenido'};
  $('#topbarTitle').textContent=titles[section]||'Admin';
  $('#sidebar').classList.remove('open');
  $('#sidebarOverlay').classList.remove('show');
}
$$('.nav-item[data-section]').forEach(item=>item.addEventListener('click',()=>navigateTo(item.dataset.section)));
$('#menuToggle').addEventListener('click',()=>{$('#sidebar').classList.toggle('open');$('#sidebarOverlay').classList.toggle('show');});
$('#sidebarOverlay').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#sidebarOverlay').classList.remove('show');});

// LOAD ALL
async function loadAll(){await Promise.all([loadUsers(),loadMessages(),loadPacks()]);updateStats();}
window.loadAll=loadAll;

// USUÁRIOS
async function loadUsers(){
  try{
    const snap=await getDocs(query(collection(db,'users'),orderBy('createdAt','desc')));
    allUsers=snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch{
    const snap=await getDocs(collection(db,'users'));
    allUsers=snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  renderUsersTable();
  populateUserSelects();
}

function renderUsersTable(){
  const tbody=$('#usersTableBody');
  if(!allUsers.length){
    tbody.innerHTML=`<tr><td colspan="7"><div class="empty-state"><div class="icon">👥</div><p>No hay usuarios creados aún. Hacé clic en "Crear Usuario".</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=allUsers.map(u=>`
    <tr>
      <td>
        <div class="user-cell">
          ${u.logoFile
            ?`<img src="../../images/usuarios/${u.logoFile}" class="user-logo-thumb" alt="${u.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
              <div class="user-logo-placeholder" style="display:none">${u.name.charAt(0).toUpperCase()}</div>`
            :`<div class="user-logo-placeholder">${u.name.charAt(0).toUpperCase()}</div>`}
          <div>
            <div class="user-name">${u.name}</div>
            <div class="user-email">${u.email}</div>
          </div>
        </div>
      </td>
      <td>${u.service||'—'}</td>
      <td>${u.serviceValue?`$${parseFloat(u.serviceValue).toLocaleString('es-AR')}`:'—'}</td>
      <td><span class="badge ${u.paymentStatus==='paid'?'badge-green':'badge-red'}">${u.paymentStatus==='paid'?'✓ Pagado':'⏳ Pendiente'}</span></td>
      <td><span class="badge badge-blue">${dateStr(u.createdAt)}</span></td>
      <td><a href="../usuarios/${u.slug}/index.html" target="_blank" class="user-page-link">🔗 Ver Página</a></td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="editUser('${u.id}')" title="Editar usuario">✏️</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="togglePayment('${u.id}','${u.paymentStatus}')" title="Cambiar estado de pago">💳</button>
          <button class="btn-delete" onclick="confirmDeleteUser('${u.id}','${u.name}')" title="Eliminar usuario">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

function populateUserSelects(){
  const opts=`<option value="">📢 Todos los usuarios</option>`+allUsers.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  ['#msgUserSelect','#packUserSelect'].forEach(sel=>{const el=$(sel);if(el)el.innerHTML=opts;});
}

$('#btnNewUser').addEventListener('click',()=>{
  editingUserId=null;
  $('#userModalTitle').textContent='Crear Nuevo Usuario';
  $('#userForm').reset();
  $('#logoPreview').style.display='none';
  openModal('userModal');
});

$('#uLogoFile').addEventListener('input',e=>{
  const val=e.target.value.trim();
  const prev=$('#logoPreview');
  if(val){prev.src=`../../images/usuarios/${val}`;prev.style.display='block';prev.onerror=()=>{prev.style.display='none';};}
  else{prev.style.display='none';}
});

window.editUser=uid=>{
  const u=allUsers.find(x=>x.id===uid);
  if(!u)return;
  editingUserId=uid;
  $('#userModalTitle').textContent='Editar Usuario';
  $('#uName').value=u.name||'';
  $('#uEmail').value=u.email||'';
  $('#uPassword').value='';
  $('#uService').value=u.service||'';
  $('#uValue').value=u.serviceValue||'';
  $('#uLogoFile').value=u.logoFile||'';
  $$('input[name=payStatus]').forEach(r=>{r.checked=r.value===u.paymentStatus;});
  const prev=$('#logoPreview');
  if(u.logoFile){prev.src=`../../images/usuarios/${u.logoFile}`;prev.style.display='block';}
  else{prev.style.display='none';}
  openModal('userModal');
};

$('#userForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=$('#saveUserBtn');
  btn.textContent='Guardando...';btn.disabled=true;
  const name=$('#uName').value.trim();
  const email=$('#uEmail').value.trim();
  const password=$('#uPassword').value.trim();
  const service=$('#uService').value.trim();
  const value=$('#uValue').value.trim();
  const logoFile=$('#uLogoFile').value.trim();
  const payStatus=$('input[name=payStatus]:checked')?.value||'open';
  const slug=slugify(name)||`user-${Date.now()}`;
  try{
    if(!editingUserId){
      const uid=`u_${Date.now()}`;
      await setDoc(doc(db,'users',uid),{name,email,password,service,serviceValue:value,paymentStatus:payStatus,logoFile,slug,createdAt:serverTimestamp()});
      toast(`✅ Usuario "${name}" creado! Recordá crear su cuenta en Firebase Auth también.`,'success');
    }else{
      await updateDoc(doc(db,'users',editingUserId),{name,service,serviceValue:value,paymentStatus:payStatus,logoFile,slug});
      toast('✅ Usuario actualizado correctamente.','success');
    }
    closeModal('userModal');
    await loadUsers();
    updateStats();
  }catch(err){console.error(err);toast('Error: '+err.message,'error');}
  finally{btn.textContent='Guardar Usuario';btn.disabled=false;}
});

window.togglePayment=async(uid,current)=>{
  const next=current==='paid'?'open':'paid';
  await updateDoc(doc(db,'users',uid),{paymentStatus:next});
  toast(next==='paid'?'✅ Marcado como Pagado':'⏳ Marcado como Pendiente','success');
  await loadUsers();updateStats();
};

window.confirmDeleteUser=(uid,name)=>{
  showConfirm(`¿Eliminar al usuario "${name}"? Se borrarán sus datos, mensajes y packs asignados.`,()=>deleteUser(uid));
};

async function deleteUser(uid){
  try{
    await deleteDoc(doc(db,'users',uid));
    const s1=await getDocs(query(collection(db,'messages'),where('userId','==',uid)));
    for(const d of s1.docs)await deleteDoc(d.ref);
    const s2=await getDocs(query(collection(db,'packAssignments'),where('userId','==',uid)));
    for(const d of s2.docs)await deleteDoc(d.ref);
    toast('🗑️ Usuario eliminado completamente.','success');
    await loadAll();
  }catch(err){toast('Error al eliminar: '+err.message,'error');}
}

// MENSAGENS
async function loadMessages(){
  try{
    const snap=await getDocs(query(collection(db,'messages'),orderBy('createdAt','desc')));
    allMessages=snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch{
    const snap=await getDocs(collection(db,'messages'));
    allMessages=snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  renderMessages();
}

function renderMessages(){
  const list=$('#messagesList');
  if(!allMessages.length){
    list.innerHTML=`<div class="empty-state"><div class="icon">💬</div><p>No hay mensajes enviados aún</p></div>`;
    return;
  }
  list.innerHTML=allMessages.map(m=>{
    const user=allUsers.find(u=>u.id===m.userId);
    return `
      <div class="message-card" id="msg-${m.id}">
        <div class="message-meta">
          <span class="message-target">→ ${m.userId==='all'?'📢 Todos los usuarios':user?.name||m.userId}</span>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="message-date">${dateStr(m.createdAt)}</span>
            <button class="btn btn-danger btn-icon btn-sm" onclick="confirmDeleteMessage('${m.id}')">🗑️</button>
          </div>
        </div>
        <p class="message-text">${m.text}</p>
      </div>`;
  }).join('');
}

$('#btnNewMessage').addEventListener('click',()=>{$('#messageForm').reset();openModal('messageModal');});

$('#messageForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=$('#saveMsgBtn');btn.textContent='Enviando...';btn.disabled=true;
  const userId=$('#msgUserSelect').value||'all';
  const text=$('#msgText').value.trim();
  try{
    await setDoc(doc(collection(db,'messages')),{userId,text,createdAt:serverTimestamp()});
    toast('📨 Mensaje enviado correctamente','success');
    closeModal('messageModal');
    await loadMessages();
  }catch(err){toast('Error: '+err.message,'error');}
  finally{btn.textContent='Enviar Mensaje';btn.disabled=false;}
});

window.confirmDeleteMessage=mid=>{
  showConfirm('¿Eliminar este mensaje? Desaparecerá también de la página del usuario.',()=>deleteMessage(mid));
};
async function deleteMessage(mid){
  await deleteDoc(doc(db,'messages',mid));
  toast('🗑️ Mensaje eliminado','success');
  await loadMessages();
}

// PACKS
// ════════════════════════════════════════════════════════════
// ⚡ EDITE AQUI seus packs — coloque os arquivos em:
//   packs/imagens/nome-da-pasta/  e  packs/videos/nome-da-pasta/
// Depois copie o mesmo array em usuarios/js/user.js
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

async function loadPacks(){
  const snap=await getDocs(collection(db,'packAssignments'));
  const assignments=snap.docs.map(d=>({id:d.id,...d.data()}));
  allPacks=PACKS_CATALOG.map(p=>({...p,assignments:assignments.filter(a=>a.packId===p.id)}));
  renderPacks();
}

function renderPacks(){
  const grid=$('#packsGrid');
  if(!PACKS_CATALOG.length){
    grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="icon">📦</div><p>No hay packs. Editá el array <strong>PACKS_CATALOG</strong> en <code>admin/js/admin.js</code></p></div>`;
    return;
  }
  grid.innerHTML=allPacks.map(p=>{
    const assigned=p.assignments.map(a=>allUsers.find(u=>u.id===a.userId)?.name||a.userId).join(', ')||'Sin asignar';
    return `
      <div class="pack-card">
        <div class="pack-thumb">
          ${p.type==='images'?`<img src="${p.thumb}" alt="${p.title}" onerror="this.style.display='none'" />`:` <video src="${p.files[0]}" muted></video>`}
          <div class="pack-thumb-overlay"></div>
          <div class="pack-type-badge"><span class="badge ${p.type==='images'?'badge-blue':'badge-yellow'}">${p.type==='images'?'🖼️ Imágenes':'🎬 Videos'}</span></div>
        </div>
        <div class="pack-body">
          <div class="pack-title">${p.title}</div>
          <div class="pack-desc">${p.description}</div>
          <div class="pack-footer">
            <span class="pack-users-assigned">👤 ${assigned}</span>
            <div style="display:flex;gap:6px">
              <button class="btn btn-primary btn-sm" onclick="openAssignPack('${p.id}')">Asignar</button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="confirmUnassignPack('${p.id}')">🗑️</button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

window.openAssignPack=packId=>{$('#assignPackId').value=packId;openModal('assignPackModal');};

$('#assignPackForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const packId=$('#assignPackId').value;
  const userId=$('#packUserSelect').value;
  if(!userId){toast('Seleccioná un usuario','error');return;}
  try{
    await setDoc(doc(db,'packAssignments',`${packId}_${userId}`),{packId,userId,assignedAt:serverTimestamp()});
    toast('✅ Pack asignado al usuario','success');
    closeModal('assignPackModal');
    await loadPacks();
  }catch(err){toast('Error: '+err.message,'error');}
});

window.confirmUnassignPack=packId=>{
  showConfirm('¿Quitar todas las asignaciones de este pack?',async()=>{
    const snap=await getDocs(query(collection(db,'packAssignments'),where('packId','==',packId)));
    for(const d of snap.docs)await deleteDoc(d.ref);
    toast('🗑️ Asignaciones eliminadas','success');
    await loadPacks();
  });
};

// CONFIRMAR + FECHAR MODAIS
$('#confirmOk').addEventListener('click',()=>{closeModal('confirmModal');confirmCallback?.();});
$('#confirmCancel').addEventListener('click',()=>closeModal('confirmModal'));
$$('[data-close-modal]').forEach(btn=>btn.addEventListener('click',closeAllModals));
$$('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAllModals();});
