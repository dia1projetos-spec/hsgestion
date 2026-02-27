// HS Gestión – Login Unificado v1.2.0
// Um único login para admin e clientes — redireciona automaticamente
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, query, where
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

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Se já está logado, redireciona direto ──────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (!user) return; // não logado, fica na página normal
  await redirectUser(user);
});

// ── Formulário de login ────────────────────────────────────────────────────
const loginForm = document.getElementById('loginForm');
loginForm?.addEventListener('submit', async e => {
  e.preventDefault();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;
  const btn      = document.getElementById('loginSubmitBtn');
  const errorEl  = document.getElementById('loginError');

  // Reset visual
  errorEl.style.display = 'none';
  btn.textContent = 'Entrando...';
  btn.disabled = true;

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await redirectUser(credential.user);
  } catch (err) {
    let msg = 'Email o contraseña incorrectos. Intentá de nuevo.';
    if (err.code === 'auth/too-many-requests') {
      msg = 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.';
    } else if (err.code === 'auth/user-not-found') {
      msg = 'No existe una cuenta con este email.';
    } else if (err.code === 'auth/wrong-password') {
      msg = 'Contraseña incorrecta.';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'El formato del email no es válido.';
    }
    errorEl.textContent = '⚠️ ' + msg;
    errorEl.style.display = 'block';
    btn.textContent = 'Iniciar Sesión';
    btn.disabled = false;
  }
});

// ── Lógica de redirecionamento ─────────────────────────────────────────────
async function redirectUser(user) {
  if (user.email === ADMIN_EMAIL) {
    // É o admin → vai para o painel
    window.location.href = 'admin/index.html';
    return;
  }

  // É um cliente → busca o slug no Firestore e redireciona
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('email', '==', user.email))
    );

    if (!snap.empty) {
      const userData = snap.docs[0].data();
      // Todos os clientes vão para a mesma página dinâmica
      window.location.href = 'usuarios/index.html';
    } else {
      showError('Tu cuenta no está registrada en el sistema. Contactá al administrador.');
      await signOut(auth);
    }
  } catch (err) {
    showError('Error al cargar tu perfil. Intentá de nuevo.');
    await signOut(auth);
  }
}

function showError(msg) {
  const btn = document.getElementById('loginSubmitBtn');
  const errorEl = document.getElementById('loginError');
  if (btn) { btn.textContent = 'Iniciar Sesión'; btn.disabled = false; }
  if (errorEl) { errorEl.textContent = '⚠️ ' + msg; errorEl.style.display = 'block'; }
}
