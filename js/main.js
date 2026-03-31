// ============================================================
//  main.js — Shared JS: navbar, toast, API, PWA, fade-in
// ============================================================

// ── Service Worker Registration (PWA) ────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[PWA] Service worker registered:', reg.scope))
      .catch(err => console.warn('[PWA] SW registration failed:', err));
  });
}

// ── PWA Install Prompt ───────────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;

  // Show install banner after 3 seconds
  setTimeout(() => {
    const banner = document.getElementById('install-banner');
    if (banner && !sessionStorage.getItem('pwa-banner-dismissed')) {
      banner.classList.add('show');
    }
  }, 3000);
});

function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') {
      showToast('App install ho gaya! 🎉', 'success');
      dismissInstallBanner();
    }
    deferredInstallPrompt = null;
  });
}

function dismissInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.remove('show');
  sessionStorage.setItem('pwa-banner-dismissed', '1');
}

// ── Navbar scroll ────────────────────────────────────────────
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ── Active nav link ──────────────────────────────────────────
document.querySelectorAll('.nav-links a').forEach(link => {
  if (link.href === window.location.href ||
      window.location.pathname.endsWith(link.getAttribute('href'))) {
    link.classList.add('active');
  }
});

// ── Hamburger menu ───────────────────────────────────────────
const hamburger = document.querySelector('.nav-hamburger');
const navLinks  = document.querySelector('.nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    if (navLinks.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.querySelectorAll('span').forEach(s => { s.style.transform=''; s.style.opacity=''; });
    });
  });
}

// ── Toast system ─────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success:'✓', error:'✕', info:'ℹ', warn:'⚠' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── API helpers ──────────────────────────────────────────────
async function apiGet(action, params = {}) {
  if (!CAFE_CONFIG.SCRIPT_URL || CAFE_CONFIG.SCRIPT_URL.includes('YOUR_')) {
    console.warn('⚠️ Script URL not set in config.js');
    return null;
  }
  const url = new URL(CAFE_CONFIG.SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString());
    return await res.json();
  } catch (err) {
    console.error('API GET error:', err);
    return null;
  }
}

async function apiPost(body) {
  if (!CAFE_CONFIG.SCRIPT_URL || CAFE_CONFIG.SCRIPT_URL.includes('YOUR_')) {
    console.warn('⚠️ Script URL not set in config.js');
    return null;
  }
  try {
    const res = await fetch(CAFE_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(body) });
    return await res.json();
  } catch (err) {
    console.error('API POST error:', err);
    return null;
  }
}

// ── Utilities ────────────────────────────────────────────────
function formatPrice(n) { return `${CAFE_CONFIG.CURRENCY}${Number(n).toFixed(0)}`; }

// ── Fade-in on scroll ────────────────────────────────────────
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity   = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.fade-in').forEach(el => {
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  fadeObserver.observe(el);
});
