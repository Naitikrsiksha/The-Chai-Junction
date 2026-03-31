// ============================================================
//  main.js — Shared utilities for all pages
// ============================================================

// ── Navbar scroll effect ────────────────────────────────────
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ── Active nav link highlight ───────────────────────────────
document.querySelectorAll('.nav-links a').forEach(link => {
  if (link.href === window.location.href) link.classList.add('active');
});

// ── Mobile hamburger menu ───────────────────────────────────
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

  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.querySelectorAll('span').forEach(s => {
        s.style.transform = ''; s.style.opacity = '';
      });
    });
  });
}

// ── Toast Notification System ───────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── API Helper ──────────────────────────────────────────────
async function apiGet(action, params = {}) {
  if (!CAFE_CONFIG.SCRIPT_URL || CAFE_CONFIG.SCRIPT_URL.includes('YOUR_')) {
    console.warn('⚠️ Script URL not configured in js/config.js');
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
    console.warn('⚠️ Script URL not configured in js/config.js');
    return null;
  }
  try {
    const res = await fetch(CAFE_CONFIG.SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error('API POST error:', err);
    return null;
  }
}

// ── Utility functions ───────────────────────────────────────
function formatPrice(amount) {
  return `${CAFE_CONFIG.CURRENCY}${Number(amount).toFixed(0)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ── Fade-in on scroll ───────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});
    
