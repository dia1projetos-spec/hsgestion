import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:"AIzaSyDmMP5ZCfl9JfkQQf1xIfcGAei_BPLvKj8",authDomain:"hs-gestion-a102e.firebaseapp.com",
  projectId:"hs-gestion-a102e",storageBucket:"hs-gestion-a102e.firebasestorage.app",
  messagingSenderId:"40828198084",appId:"1:40828198084:web:70dd328e4e242925727d91"
};
const ADMIN_EMAIL = "riconetson@gmail.com";
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Loader
window.addEventListener('load', () => { setTimeout(() => { const l=document.getElementById('pageLoader'); if(l){l.classList.add('hide');setTimeout(()=>l.remove(),500);} },1200); });

// Cursor
const cursor=document.getElementById('cursor'), trail=document.getElementById('cursor-trail');
let mx=0,my=0,tx=0,ty=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(cursor){cursor.style.left=mx+'px';cursor.style.top=my+'px';}});
setInterval(()=>{tx+=(mx-tx)*.14;ty+=(my-ty)*.14;if(trail){trail.style.left=tx+'px';trail.style.top=ty+'px';}},16);

// Header scroll
window.addEventListener('scroll',()=>{document.getElementById('header')?.classList.toggle('scrolled',window.scrollY>50);});

// Hamburger
document.getElementById('hamburger')?.addEventListener('click',()=>document.getElementById('dynMenu')?.classList.toggle('open'));

// Login panel
const loginPanel=document.getElementById('loginPanel'),loginTrigger=document.getElementById('loginTrigger');
loginTrigger?.addEventListener('click',e=>{e.stopPropagation();loginPanel?.classList.toggle('open');});
document.getElementById('loginClose')?.addEventListener('click',()=>loginPanel?.classList.remove('open'));
document.addEventListener('click',e=>{if(loginPanel&&!loginPanel.contains(e.target)&&e.target!==loginTrigger)loginPanel.classList.remove('open');});

onAuthStateChanged(auth,async user=>{
  if(!user)return;
  if(user.email===ADMIN_EMAIL){window.location.href='admin/index.html';return;}
  const snap=await getDocs(query(collection(db,'users'),where('email','==',user.email)));
  if(!snap.empty)window.location.href='usuarios/index.html';
});

document.getElementById('loginSubmitBtn')?.addEventListener('click',async()=>{
  const email=document.getElementById('loginEmail').value.trim(),pass=document.getElementById('loginPass').value;
  const btn=document.getElementById('loginSubmitBtn'),errEl=document.getElementById('loginError');
  errEl.style.display='none';btn.textContent='...';btn.disabled=true;
  try{ await signInWithEmailAndPassword(auth,email,pass); }
  catch(err){errEl.textContent='⚠ Email o contraseña incorrectos.';errEl.style.display='block';btn.textContent='INICIAR_SESIÓN()';btn.disabled=false;}
});

// Dynamic menu
async function loadMenu(){
  const menuEl=document.getElementById('dynMenu');
  try{
    let snap;try{snap=await getDocs(query(collection(db,'menu'),orderBy('order','asc')));}catch{snap=await getDocs(collection(db,'menu'));}
    if(snap.empty)return;
    const items=snap.docs.map(d=>({id:d.id,...d.data()}));
    const roots=items.filter(i=>!i.parentId).sort((a,b)=>(a.order||0)-(b.order||0));
    const children=items.filter(i=>i.parentId);
    menuEl.innerHTML='';
    roots.forEach(item=>{
      const subs=children.filter(c=>c.parentId===item.id).sort((a,b)=>(a.order||0)-(b.order||0));
      const li=document.createElement('li');
      li.className=subs.length?'has-dropdown':'';
      if(subs.length){
        li.innerHTML=`<span class="has-toggle">${item.label} <span class="drop-arrow">▼</span></span><ul class="submenu">${subs.map(s=>`<li><a href="${s.url||'#'}">${s.label}</a></li>`).join('')}</ul>`;
        li.querySelector('.has-toggle').addEventListener('click',()=>li.classList.toggle('open-m'));
      }else{li.innerHTML=`<a href="${item.url||'#'}">${item.label}</a>`;}
      menuEl.appendChild(li);
    });
  }catch(e){console.error(e);}
}
loadMenu();

// Read progress
window.addEventListener('scroll',()=>{
  const el=document.getElementById('artContent');const bar=document.getElementById('readProgress');
  if(!el||!bar)return;
  const rect=el.getBoundingClientRect();const total=el.offsetHeight-window.innerHeight;
  const scrolled=Math.max(0,-rect.top);const pct=total>0?Math.min(100,(scrolled/total)*100):100;
  bar.style.width=pct+'%';
});

// Load article
const params=new URLSearchParams(location.search);
const articleId=params.get('id');

async function loadArticle(){
  if(!articleId){showNotFound();return;}
  try{
    const snap=await getDoc(doc(db,'posts',articleId));
    if(!snap.exists()||snap.data().status!=='published'){showNotFound();return;}
    const p={id:snap.id,...snap.data()};
    renderArticle(p);
    loadRelated(p.category,p.id);
  }catch(err){console.error(err);showNotFound();}
}

function showNotFound(){
  document.getElementById('notFound').style.display='block';
  document.getElementById('pageLoader')?.remove();
}

function renderArticle(p){
  // SEO
  document.getElementById('pageTitle').textContent=`${p.title} | HS Gestión`;
  document.getElementById('pageDesc').content=p.excerpt||p.title;

  // Hero
  document.getElementById('articleHero').style.display='block';
  if(p.category){const el=document.getElementById('artCat');el.textContent=p.category;el.style.display='inline-block';}
  document.getElementById('artTitle').textContent=p.title;

  const date=p.createdAt?.toDate?p.createdAt.toDate().toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'}):'';
  const readTime=p.content?Math.max(1,Math.ceil(p.content.replace(/<[^>]+>/g,'').split(' ').length/200)):2;
  if(date)document.getElementById('artDate').textContent='📅 '+date;
  if(p.author)document.getElementById('artAuthor').textContent='✍ '+p.author;
  document.getElementById('artReadTime').textContent='⏱ '+readTime+' min de lectura';

  // Cover
  if(p.coverImage){const img=document.getElementById('artCover');img.src=p.coverImage;img.style.display='block';}

  // Content
  document.getElementById('artContent').innerHTML=p.content||'';
  document.getElementById('articleBody').style.display='block';

  // TOC
  const headings=document.querySelectorAll('.article-content h2');
  if(headings.length>1){
    const toc=document.getElementById('tocList');
    headings.forEach((h,i)=>{
      h.id='section-'+i;
      const li=document.createElement('li');
      li.innerHTML=`<a href="#section-${i}">${h.textContent}</a>`;
      toc.appendChild(li);
    });
    document.getElementById('tocWidget').style.display='block';
    // Active on scroll
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){document.querySelectorAll('.toc a').forEach(a=>a.classList.remove('active'));document.querySelector(`.toc a[href="#${e.target.id}"]`)?.classList.add('active');}});
    },{rootMargin:'-30% 0px -60% 0px'});
    headings.forEach(h=>obs.observe(h));
  }

  // Share
  const url=encodeURIComponent(location.href);const title=encodeURIComponent(p.title);
  document.getElementById('shareWA').href=`https://wa.me/?text=${title}%20${url}`;
  document.getElementById('shareX').href=`https://twitter.com/intent/tweet?text=${title}&url=${url}`;
  document.getElementById('copyLink').addEventListener('click',()=>{
    navigator.clipboard.writeText(location.href).then(()=>{
      const btn=document.getElementById('copyLink');btn.textContent='✓ Copiado!';setTimeout(()=>btn.textContent='🔗 Copiar link',2000);
    });
  });

  // Reveal
  const obs2=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs2.unobserve(e.target);}}),{threshold:.1});
  document.querySelectorAll('.reveal').forEach(el=>obs2.observe(el));
}

async function loadRelated(category,currentId){
  if(!category)return;
  try{
    let snap;
    try{snap=await getDocs(query(collection(db,'posts'),where('status','==','published'),where('category','==',category),orderBy('createdAt','desc'),limit(4)));}
    catch{snap=await getDocs(query(collection(db,'posts'),where('status','==','published'),where('category','==',category),limit(4)));}
    const related=snap.docs.filter(d=>d.id!==currentId).slice(0,3);
    if(!related.length)return;
    const container=document.getElementById('relatedList');
    related.forEach(d=>{
      const p={id:d.id,...d.data()};
      const date=p.createdAt?.toDate?p.createdAt.toDate().toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'}):'';
      container.insertAdjacentHTML('beforeend',`
        <a href="articulo.html?id=${p.id}" class="related-card">
          <div class="related-thumb">${p.coverImage?`<img src="${p.coverImage}" alt="${p.title}" />`:'📄'}</div>
          <div><div class="related-title">${p.title}</div><div class="related-date">${date}</div></div>
        </a>`);
    });
    document.getElementById('relatedWidget').style.display='block';
  }catch(e){console.error(e);}
}

loadArticle();
