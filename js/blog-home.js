// HS Gestión – Blog na Home v1.0.0
// Mostra os 3 artigos mais recentes na página principal
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:"AIzaSyDmMP5ZCfl9JfkQQf1xIfcGAei_BPLvKj8",
  authDomain:"hs-gestion-a102e.firebaseapp.com",
  projectId:"hs-gestion-a102e",
  storageBucket:"hs-gestion-a102e.firebasestorage.app",
  messagingSenderId:"40828198084",
  appId:"1:40828198084:web:70dd328e4e242925727d91"
};

const CATS = {
  'diseño-web':'🌐 Diseño Web','redes':'📱 Redes Sociales',
  'convites':'✉️ Convites','tips':'💡 Tips','novedades':'🔔 Novedades'
};

async function loadBlogHome() {
  const section = document.getElementById('blogHomeSection');
  const grid    = document.getElementById('blogHomeGrid');
  if(!section || !grid) return;

  try {
    let snap;
    try {
      snap = await getDocs(query(
        collection(getFirestore(initializeApp(firebaseConfig,'blog')),
        'blogPosts'),
        where('published','==',true),
        orderBy('createdAt','desc'),
        limit(3)
      ));
    } catch {
      const db2 = getFirestore(initializeApp(firebaseConfig,'blog2'));
      snap = await getDocs(query(
        collection(db2,'blogPosts'),
        where('published','==',true)
      ));
    }

    const posts = snap.docs
      .map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>{
        const ta = a.createdAt?.toDate?.()?.getTime?.() || 0;
        const tb = b.createdAt?.toDate?.()?.getTime?.() || 0;
        return tb - ta;
      })
      .slice(0,3);

    if(!posts.length) { section.style.display='none'; return; }

    section.style.display = 'block';
    grid.innerHTML = posts.map(p => {
      const d = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
      const dateStr = d.toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'});
      return `
        <a href="blog/index.html" class="blog-home-card">
          <div class="bhc-img">
            ${p.imageUrl
              ? `<img src="${p.imageUrl}" alt="${p.title}" loading="lazy"/>`
              : `<div class="bhc-img-placeholder">✍️</div>`}
            <div class="bhc-overlay"></div>
            ${p.category?`<span class="bhc-cat">${CATS[p.category]||p.category}</span>`:''}
          </div>
          <div class="bhc-body">
            <span class="bhc-date">${dateStr}</span>
            <h3 class="bhc-title">${p.title}</h3>
            <p class="bhc-excerpt">${p.excerpt||p.content?.substring(0,100)+'...'||''}</p>
            <span class="bhc-more">Leer más →</span>
          </div>
        </a>`;
    }).join('');
  } catch(e) {
    console.error('Blog home:', e);
    if(section) section.style.display='none';
  }
}

loadBlogHome();
