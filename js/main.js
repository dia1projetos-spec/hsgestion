/* HS Gestión - Main JS v1.0.0 */

// ===== CACHE BUSTING VERSION =====
const APP_VERSION = '1.0.0';

document.addEventListener('DOMContentLoaded', () => {

  // ===== HEADER SCROLL =====
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  });

  // ===== MOBILE MENU =====
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  navLinks?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  // ===== ACTIVE NAV ON SCROLL =====
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-links a');

  const observeNav = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(a => a.classList.remove('active'));
        const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        active?.classList.add('active');
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(s => observeNav.observe(s));

  // ===== SCROLL REVEAL =====
  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, entry.target.dataset.delay || 0);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  reveals.forEach(el => revealObserver.observe(el));

  // ===== PARTICLES =====
  const particleContainer = document.getElementById('particles');
  if (particleContainer) {
    for (let i = 0; i < 35; i++) {
      const p = document.createElement('div');
      const size = Math.random() * 3 + 1;
      const x = Math.random() * 100;
      const delay = Math.random() * 10;
      const duration = Math.random() * 15 + 10;
      p.style.cssText = `
        position: absolute;
        left: ${x}%;
        bottom: -10px;
        width: ${size}px;
        height: ${size}px;
        background: rgba(0, 212, 255, ${Math.random() * 0.5 + 0.1});
        border-radius: 50%;
        animation: float-up ${duration}s ${delay}s infinite linear;
        box-shadow: 0 0 ${size * 3}px rgba(0, 212, 255, 0.5);
      `;
      particleContainer.appendChild(p);
    }

    const style = document.createElement('style');
    style.textContent = `
      @keyframes float-up {
        0% { transform: translateY(0) scale(1); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // ===== COUNTER ANIMATION =====
  const counters = document.querySelectorAll('.stat-number[data-count]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => counterObserver.observe(c));

  function animateCounter(el) {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current) + suffix;
      if (current >= target) clearInterval(timer);
    }, 16);
  }

  // ===== LOGIN MODAL =====
  const modal = document.getElementById('loginModal');
  const openLogin = document.querySelectorAll('[data-open-login]');
  const closeLogin = document.getElementById('closeLogin');

  openLogin.forEach(btn => {
    btn.addEventListener('click', () => modal.classList.add('open'));
  });

  closeLogin?.addEventListener('click', () => modal.classList.remove('open'));

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal?.classList.remove('open');
  });

  // ===== LOGIN FORM (placeholder – Firebase coming soon) =====
  const loginForm = document.getElementById('loginForm');
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    showNotification('🔒 Autenticación Firebase próximamente', 'info');
  });

  // ===== CONTACT FORM =====
  const contactForm = document.getElementById('contactForm');
  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('.form-submit');
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    setTimeout(() => {
      showNotification('✅ ¡Mensaje enviado! Te contactamos pronto.', 'success');
      contactForm.reset();
      btn.textContent = 'Enviar Consulta';
      btn.disabled = false;
    }, 1500);
  });

  // ===== NOTIFICATION =====
  function showNotification(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('show'));
    });
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 3500);
  }

  // ===== SMOOTH REVEAL DELAYS =====
  document.querySelectorAll('.service-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
  });

  document.querySelectorAll('.process-step').forEach((step, i) => {
    step.style.transitionDelay = `${i * 0.1}s`;
  });

  // ===== TILT EFFECT ON SERVICE CARDS =====
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
      card.style.transform = `translateY(-8px) perspective(600px) rotateX(${-y}deg) rotateY(${x}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // ===== CURSOR TRAIL =====
  const trail = [];
  for (let i = 0; i < 6; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: fixed;
      width: ${8 - i}px;
      height: ${8 - i}px;
      border-radius: 50%;
      background: rgba(0, 212, 255, ${0.6 - i * 0.08});
      pointer-events: none;
      z-index: 99999;
      transition: left 0.${i + 1}s, top 0.${i + 1}s;
      will-change: left, top;
    `;
    document.body.appendChild(dot);
    trail.push(dot);
  }

  document.addEventListener('mousemove', (e) => {
    trail.forEach(dot => {
      dot.style.left = `${e.clientX - 4}px`;
      dot.style.top = `${e.clientY - 4}px`;
    });
  });

});

// ===== VERSION CHECK / FORCE RELOAD =====
(function() {
  const stored = localStorage.getItem('hs_app_version');
  if (stored && stored !== APP_VERSION) {
    localStorage.setItem('hs_app_version', APP_VERSION);
    window.location.reload(true);
  } else if (!stored) {
    localStorage.setItem('hs_app_version', APP_VERSION);
  }
})();
