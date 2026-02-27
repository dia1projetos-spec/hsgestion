// HS Gestión – Firebase Login (main site) v1.0.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ⚠️ Substitua pelos seus dados
const firebaseConfig = {
  apiKey: "AIzaSyDmMP5ZCfl9JfkQQf1xIfcGAei_BPLvKj8",
  authDomain: "hs-gestion-a102e.firebaseapp.com",
  projectId: "hs-gestion-a102e",
  storageBucket: "hs-gestion-a102e.firebasestorage.app",
  messagingSenderId: "40828198084",
  appId: "1:40828198084:web:70dd328e4e242925727d91"
};

const ADMIN_EMAIL = "admin@hsgestion.com.ar"; // ⚠️ seu email admin

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Login form no modal
const loginForm = document.getElementById('loginForm');
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  const btn   = loginForm.querySelector('button[type=submit]');
  btn.textContent = 'Entrando...'; btn.disabled = true;

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(err) {
    showNotif('Credenciales incorrectas ❌', 'error');
    btn.textContent = 'Iniciar Sesión'; btn.disabled = false;
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  if (user.email === ADMIN_EMAIL) {
    // Redirecionar ao painel admin
    window.location.href = 'admin/index.html';
    return;
  }

  // Usuário normal — buscar slug e redirecionar
  const snap = await getDocs(query(collection(db,'users'), where('email','==',user.email)));
  if (!snap.empty) {
    const u = snap.docs[0].data();
    window.location.href = `usuarios/${u.slug || 'minha-area'}/index.html`;
  } else {
    showNotif('Tu cuenta no está configurada. Contactá al administrador.', 'error');
    await signOut(auth);
  }
});

function showNotif(msg, type) {
  const el = document.createElement('div');
  el.className = `notification ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('show')));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),400); },3500);
}
