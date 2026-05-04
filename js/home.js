// HS Gestión – Home JS v2.0.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDmMP5ZCfl9JfkQQf1xIfcGAei_BPLvKj8",
  authDomain:        "hs-gestion-a102e.firebaseapp.com",
  projectId:         "hs-gestion-a102e",
  storageBucket:     "hs-gestion-a102e.firebasestorage.app",
  messagingSenderId: "40828198084",
  appId:             "1:40828198084:web:70dd328e4e242925727d91"
};
const ADMIN_EMAIL = "riconetson@gmail.com";
const POSTS_PER_PAGE = 6;

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── LOADER ───────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('pageLoader');
    if (loader) { loader.classList.add('hide'); setTimeout(() => loader.remove(), 500); }
  }, 1400);
});

// ── CURSOR ───────────────────────────────────────────────────────────────────
const cursor = document.getElementById('cursor');
const trail  = document.getElementById('cursor-trail');
let mx = 0, my = 0, tx = 0, ty = 0;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; cursor.style.left = mx+'px'; cursor.style.top = my+'px'; });
setInterval(() => {
  tx += (mx - tx) * 0.14; ty += (my - ty) * 0.14;
  if (trail) { trail.style.left = tx+'px'; trail.style.top = ty+'px'; }
}, 16);

document.querySelectorAll('a, button, .blog-card').forEach(el => {
  el.addEventListener('mouseenter', () => { if(cursor){cursor.style.width='18px';cursor.style.height='18px';cursor.style.background='var(--cyan)';} });
  el.addEventListener('mouseleave', () => { if(cursor){cursor.style.width='10px';cursor.style.height='10px';cursor.style.background='var(--green)';} });
});

// ── SCROLL HEADER ─────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('header')?.classList.toggle('scrolled', window.scrollY > 50);
});

// ── MATRIX CANVAS ────────────────────────────────────────────────────────────
function initMatrix(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth  || window.innerWidth;
  canvas.height = canvas.offsetHeight || window.innerHeight;
  const chars  = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ';
  const colW   = 14;
  const cols   = Math.floor(canvas.width / colW);
  const drops  = Array(cols).fill(1);

  setInterval(() => {
    ctx.fillStyle = 'rgba(5,10,15,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff88';
    ctx.font = '12px Share Tech Mono, monospace';
    drops.forEach((y, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * colW, y * 14);
      if (y * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
  }, 60);
}
initMatrix(document.getElementById('matrixCanvas'));

// ── GLITCH NUMBERS ────────────────────────────────────────────────────────────
const glitchEl = document.getElementById('glitchNums');
if (glitchEl) {
  setInterval(() => {
    let nums = '';
    for (let i=0; i<18; i++) {
      nums += Math.random().toString(2).substring(2,10) + '\n';
    }
    glitchEl.textContent = nums;
  }, 120);
}

// ── TYPED TEXT ───────────────────────────────────────────────────────────────
const phrases = [
  'Sitios web modernos y optimizados para SEO.',
  'Gestión profesional de redes sociales.',
  'Invitaciones digitales únicas e interactivas.',
  'Tu presencia digital, transformada.',
];
let pIdx = 0, cIdx = 0, deleting = false;
const typedEl = document.getElementById('typedText');
function type() {
  if (!typedEl) return;
  const phrase = phrases[pIdx];
  if (!deleting) {
    typedEl.textContent = phrase.substring(0, cIdx+1);
    cIdx++;
    if (cIdx === phrase.length) { deleting = true; setTimeout(type, 2200); return; }
    setTimeout(type, 48);
  } else {
    typedEl.textContent = phrase.substring(0, cIdx-1);
    cIdx--;
    if (cIdx === 0) { deleting = false; pIdx = (pIdx+1) % phrases.length; setTimeout(type, 400); return; }
    setTimeout(type, 28);
  }
}
type();

// ── HAMBURGER ────────────────────────────────────────────────────────────────
document.getElementById('hamburger')?.addEventListener('click', () => {
  document.getElementById('dynMenu')?.classList.toggle('open');
});

// ── LOGIN PANEL ──────────────────────────────────────────────────────────────
const loginPanel  = document.getElementById('loginPanel');
const loginTrigger = document.getElementById('loginTrigger');
const loginClose   = document.getElementById('loginClose');

loginTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  loginPanel?.classList.toggle('open');
});
loginClose?.addEventListener('click', () => loginPanel?.classList.remove('open'));
document.addEventListener('click', e => {
  if (loginPanel && !loginPanel.contains(e.target) && e.target !== loginTrigger)
    loginPanel.classList.remove('open');
});
document.getElementById('loginPass')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginSubmitBtn')?.click();
});

// ── AUTH ─────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (!user) return;
  await redirectUser(user);
});

document.getElementById('loginSubmitBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const btn   = document.getElementById('loginSubmitBtn');
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  btn.textContent = 'AUTENTICANDO...'; btn.disabled = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await redirectUser(cred.user);
  } catch(err) {
    let msg = 'Email o contraseña incorrectos.';
    if (err.code === 'auth/too-many-requests') msg = 'Demasiados intentos. Esperá unos minutos.';
    else if (err.code === 'auth/invalid-email') msg = 'Email no válido.';
    errEl.textContent = '⚠ ' + msg; errEl.style.display = 'block';
    btn.textContent = 'INICIAR_SESIÓN()'; btn.disabled = false;
  }
});

async function redirectUser(user) {
  if (user.email === ADMIN_EMAIL) { window.location.href = 'admin/index.html'; return; }
  try {
    // Busca pelo UID diretamente (evita query por email que exige permissão extra)
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      window.location.href = 'usuarios/index.html';
    } else {
      const errEl = document.getElementById('loginError');
      errEl.textContent = '⚠ Tu cuenta no está registrada. Contactá al administrador.';
      errEl.style.display = 'block';
      document.getElementById('loginSubmitBtn').textContent = 'INICIAR_SESIÓN()';
      document.getElementById('loginSubmitBtn').disabled = false;
      await signOut(auth);
    }
  } catch(err) {
    console.error('redirectUser error:', err);
    await signOut(auth);
  }
}

// ── SLIDER ────────────────────────────────────────────────────────────────────
let slides = [], currentSlide = 0, sliderTimer = null;

async function loadSlider() {
  try {
    let snap;
    try { snap = await getDocs(query(collection(db,'slides'), orderBy('order','asc'))); }
    catch { snap = await getDocs(collection(db,'slides')); }
    if (snap.empty) { initSlider([]); return; }
    slides = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>(a.order||0)-(b.order||0));
    initSlider(slides);
  } catch(e) { console.error('loadSlider error:', e); initSlider([]); }
}

function initSlider(data) {
  const wrap = document.getElementById('sliderWrap');
  const dotsEl = document.getElementById('sliderDots');
  const defaultSlide = document.getElementById('defaultSlide');

  if (!data.length) {
    // mantém slide padrão com matrix
    document.getElementById('sliderPrev').style.display = 'none';
    document.getElementById('sliderNext').style.display = 'none';
    startProgress();
    return;
  }

  // Remove slide padrão
  defaultSlide?.remove();

  // Cria slides
  data.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = `slide${i===0?' active':''}`;
    div.dataset.idx = i;
    let bgStyle = s.imageUrl ? `background-image:url('${s.imageUrl}')` : '';
    div.innerHTML = `
      <div class="slide-bg${s.imageUrl?'':' no-img grid-bg'}" style="${bgStyle}"></div>
      ${!s.imageUrl ? `<canvas class="slide-matrix" style="position:absolute;inset:0;opacity:.18;z-index:1;"></canvas>` : ''}
      ${s.caption ? `<div style="position:absolute;bottom:70px;right:0;padding:10px 18px;background:rgba(0,0,0,.5);border-left:2px solid var(--green);font-family:'Share Tech Mono',monospace;font-size:.7rem;color:var(--green);letter-spacing:1px;max-width:260px;z-index:20;">${s.caption}</div>` : ''}
    `;
    wrap.appendChild(div);
    // Init matrix se sem imagem
    if (!s.imageUrl) {
      const c = div.querySelector('canvas');
      if (c) { c.width = window.innerWidth; c.height = window.innerHeight; initMatrix(c); }
    }
  });

  // Dots
  data.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = `s-dot${i===0?' active':''}`;
    d.addEventListener('click', () => goSlide(i));
    dotsEl.appendChild(d);
  });

  // Arrows
  document.getElementById('sliderPrev').addEventListener('click', () => goSlide((currentSlide-1+data.length)%data.length));
  document.getElementById('sliderNext').addEventListener('click', () => goSlide((currentSlide+1)%data.length));

  startAutoSlide(data.length);
  startProgress();
}

function goSlide(idx) {
  const allSlides = document.querySelectorAll('.slide');
  const allDots   = document.querySelectorAll('.s-dot');
  allSlides[currentSlide]?.classList.remove('active');
  allDots[currentSlide]?.classList.remove('active');
  currentSlide = idx;
  allSlides[currentSlide]?.classList.add('active');
  allDots[currentSlide]?.classList.add('active');
  startProgress();
}

function startAutoSlide(total) {
  clearInterval(sliderTimer);
  sliderTimer = setInterval(() => goSlide((currentSlide+1)%total), 5000);
}

function startProgress() {
  const bar = document.getElementById('sliderProgress');
  if (!bar) return;
  bar.style.transition = 'none'; bar.style.width = '0';
  requestAnimationFrame(() => {
    bar.style.transition = 'width 5s linear'; bar.style.width = '100%';
  });
}

// ── BLOG ──────────────────────────────────────────────────────────────────────
let lastDoc = null, allLoaded = false;

async function loadBlog(loadMore = false) {
  const grid    = document.getElementById('blogGrid');
  const moreBtn = document.getElementById('blogMore');

  if (!loadMore) grid.innerHTML = '<div class="blog-empty"><div style="font-size:2rem;margin-bottom:12px">📡</div>Cargando artículos...</div>';

  try {
    // Busca todos os publicados (sem orderBy composto — evita exigir índice)
    // Busca todos e filtra client-side (evita problemas de regras/índice)
    const snap = await getDocs(collection(db, 'posts'));

    let posts = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.status === 'published');

    // Ordenar client-side por data
    posts.sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return tb - ta;
    });

    if (!posts.length) {
      grid.innerHTML = `<div class="blog-empty"><div style="font-size:2rem;margin-bottom:12px">📡</div>No hay artículos publicados aún. Volvé pronto.</div>`;
      if (moreBtn) moreBtn.style.display = 'none';
      return;
    }

    // Paginação client-side
    const page    = loadMore ? (grid.dataset.page ? parseInt(grid.dataset.page) + 1 : 1) : 0;
    const start   = page * POSTS_PER_PAGE;
    const slice   = posts.slice(start, start + POSTS_PER_PAGE);

    if (!loadMore) grid.innerHTML = '';
    slice.forEach(p => grid.insertAdjacentHTML('beforeend', buildCard(p)));
    grid.dataset.page  = page;
    grid.dataset.total = posts.length;

    if (moreBtn) {
      moreBtn.style.display = (start + POSTS_PER_PAGE < posts.length) ? 'flex' : 'none';
    }

  } catch(err) {
    console.error('loadBlog error:', err);
    grid.innerHTML = `<div class="blog-empty">Error al cargar artículos. Revisá la consola.</div>`;
  }
}

function buildCard(p) {
  const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'}) : '';
  const readTime = p.content ? Math.max(1, Math.ceil(p.content.replace(/<[^>]+>/g,'').split(' ').length / 200)) : 2;
  return `
    <a href="articulo.html?id=${p.id}" class="blog-card">
      <div class="blog-thumb">
        ${p.coverImage
          ? `<img src="${p.coverImage}" alt="${p.title}" loading="lazy" />`
          : `<div class="blog-thumb-placeholder">📄</div>`}
        ${p.category ? `<span class="blog-cat">${p.category}</span>` : ''}
      </div>
      <div class="blog-body">
        <div class="blog-meta">
          ${date ? `<span>${date}</span><span>·</span>` : ''}
          <span>${readTime} min de lectura</span>
        </div>
        <div class="blog-title">${p.title}</div>
        <div class="blog-excerpt">${p.excerpt || p.content?.replace(/<[^>]+>/g,'').substring(0,160) || ''}</div>
      </div>
      <div class="blog-footer">
        <span class="blog-read">LEER ARTÍCULO →</span>
        ${p.author ? `<span style="font-family:var(--mono);font-size:.65rem;color:var(--muted)">${p.author}</span>` : ''}
      </div>
    </a>`;
}

document.getElementById('loadMoreBtn')?.addEventListener('click', () => loadBlog(true));

// ── DYNAMIC MENU ─────────────────────────────────────────────────────────────
async function loadMenu() {
  const menuEl = document.getElementById('dynMenu');
  const footerEl = document.getElementById('footerLinks');
  try {
    let snap;
    try { snap = await getDocs(query(collection(db,'menu'), orderBy('order','asc'))); }
    catch { snap = await getDocs(collection(db,'menu')); }

    if (snap.empty) {
      // Fallback: menu fixo já no HTML
      return;
    }

    const items = snap.docs.map(d => ({id:d.id,...d.data()}));
    const roots = items.filter(i => !i.parentId).sort((a,b)=>(a.order||0)-(b.order||0));
    const children = items.filter(i => i.parentId);

    menuEl.innerHTML = '';
    let footerHtml = '';

    roots.forEach(item => {
      const subs = children.filter(c => c.parentId === item.id).sort((a,b)=>(a.order||0)-(b.order||0));
      const hasDropdown = subs.length > 0;
      const li = document.createElement('li');
      li.className = hasDropdown ? 'has-dropdown' : '';

      if (hasDropdown) {
        li.innerHTML = `
          <span class="has-toggle">${item.label} <span class="drop-arrow">▼</span></span>
          <ul class="submenu">
            ${subs.map(s=>`<li><a href="${s.url||'#'}">${s.label}</a></li>`).join('')}
          </ul>`;
        // Mobile toggle
        li.querySelector('.has-toggle').addEventListener('click', () => li.classList.toggle('open-m'));
      } else {
        li.innerHTML = `<a href="${item.url||'#'}">${item.label}</a>`;
      }
      menuEl.appendChild(li);
      footerHtml += `<li><a href="${item.url||'#'}">→ ${item.label}</a></li>`;
    });

    if (footerEl && footerHtml) footerEl.innerHTML = footerHtml;

  } catch(err) {
    console.error('loadMenu error:', err);
    // fallback: mantém menu fixo
  }
}

// ── CONTACT FORM ─────────────────────────────────────────────────────────────
document.getElementById('contactForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  btn.textContent = 'ENVIANDO...'; btn.disabled = true;
  try {
    await setDoc(doc(collection(db,'contacts')), {
      name:    (document.getElementById('firstName').value + ' ' + (document.getElementById('lastName').value||'')).trim(),
      email:   document.getElementById('contactEmail').value,
      phone:   document.getElementById('phone').value || '',
      service: document.getElementById('service').value,
      message: document.getElementById('message').value || '',
      createdAt: new Date()
    });
    btn.textContent = '✓ ENVIADO!';
    btn.style.background = '#00cc6a';
    e.target.reset();
    setTimeout(() => { btn.textContent = 'ENVIAR_CONSULTA()'; btn.style.background=''; btn.disabled = false; }, 3000);
  } catch(err) {
    console.error(err);
    btn.textContent = '✗ ERROR – REINTENTÁ'; btn.disabled = false;
    btn.style.background = 'var(--red)';
    setTimeout(() => { btn.textContent='ENVIAR_CONSULTA()'; btn.style.background=''; }, 3000);
  }
});

// ── REVEAL ANIMATION ──────────────────────────────────────────────────────────
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// ── INIT ──────────────────────────────────────────────────────────────────────
loadSlider();
loadBlog();
loadMenu();
