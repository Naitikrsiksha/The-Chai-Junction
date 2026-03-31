// ============================================================
//  menu.js — Menu page: real-time prices + cart
// ============================================================

const CAT_EMOJI = {
  Chai: '🍵', Coffee: '☕', Snacks: '🥙', Special: '✨',
  Beverages: '🥤', Desserts: '🍮', Sandwich: '🥪'
};

let allItems    = [];     // full menu items
let livePrices  = {};     // {item_id: price} — from prices sheet
let cart        = JSON.parse(localStorage.getItem('tcj_cart') || '[]');
let priceTimer  = null;   // for live price refresh

// ── Save cart ─────────────────────────────────────────────────
function saveCart() { localStorage.setItem('tcj_cart', JSON.stringify(cart)); }

// ── Load live prices from Google Sheets ──────────────────────
// This runs on load AND refreshes every 60 seconds
// Tum Google Sheet me price change karo → 60s me website pe reflect
async function loadLivePrices() {
  const result = await apiGet('getPrices');

  // Show "updating" on all prices
  document.querySelectorAll('.price-tag').forEach(el => el.classList.add('updating'));

  if (result && result.success) {
    livePrices = result.data;

    // Apply updated prices to currently rendered cards
    allItems.forEach(item => {
      if (livePrices[item.id] !== undefined) {
        item.price = livePrices[item.id]; // update local copy
        const priceEl = document.querySelector(`[data-price-id="${item.id}"]`);
        if (priceEl) priceEl.textContent = `₹${item.price}`;
      }
    });

    // Also update any cart items' prices
    cart = cart.map(ci => {
      if (livePrices[ci.id] !== undefined) ci.price = livePrices[ci.id];
      return ci;
    });
    saveCart();
    updateCartUI();
  }

  document.querySelectorAll('.price-tag').forEach(el => el.classList.remove('updating'));
}

// ── Load menu ─────────────────────────────────────────────────
async function loadMenu() {
  const container = document.getElementById('menu-container');
  container.innerHTML = `<div style="text-align:center;padding:5rem;"><div class="loader"></div><p style="color:var(--cream-dim);margin-top:1rem;">Menu load ho raha hai...</p></div>`;

  // Fetch menu items
  const menuResult   = await apiGet('getMenu');
  // Fetch live prices simultaneously
  const pricesResult = await apiGet('getPrices');

  if (pricesResult && pricesResult.success) livePrices = pricesResult.data;

  if (menuResult && menuResult.success) {
    allItems = menuResult.data.map(item => {
      // Override price with live price if available
      if (livePrices[item.id] !== undefined) item.price = livePrices[item.id];
      return item;
    });
  } else {
    // Use demo data if API not configured
    allItems = DEMO_ITEMS.map(item => {
      if (livePrices[item.id] !== undefined) item.price = livePrices[item.id];
      return item;
    });
  }

  renderMenu(allItems, activeFilter);
  updateCartUI();

  // Auto-refresh prices every 60 seconds
  clearInterval(priceTimer);
  priceTimer = setInterval(loadLivePrices, 60000);
}

// ── Render menu by category ───────────────────────────────────
let activeFilter = 'All';

function renderMenu(items, filter) {
  const container = document.getElementById('menu-container');
  const filtered  = filter === 'All' ? items : items.filter(i => i.category === filter);

  if (!filtered.length) {
    container.innerHTML = `<div style="text-align:center;padding:4rem;color:var(--cream-dim);">Is category mein abhi kuch nahi hai.</div>`;
    return;
  }

  // Group by category
  const groups = {};
  filtered.forEach(item => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  });

  let html = '';
  Object.entries(groups).forEach(([cat, catItems]) => {
    html += `
      <div class="category-section">
        <div class="category-header">
          <h2>${CAT_EMOJI[cat] || '🍴'} ${cat}</h2>
          <div class="category-line"></div>
          <span class="badge badge-saffron">${catItems.length} items</span>
        </div>
        <div class="items-grid">
          ${catItems.map(item => renderCard(item)).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html;

  // Bind qty buttons
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.dataset.id, parseInt(btn.dataset.delta)));
  });
}

// ── Render single item card ───────────────────────────────────
function renderCard(item) {
  const qty = (cart.find(c => c.id === item.id) || {}).qty || 0;
  return `
    <div class="item-card" id="card-${item.id}">
      <div class="item-emoji">${CAT_EMOJI[item.category] || '🍴'}</div>
      <div class="item-body">
        <div class="item-name">${item.name}</div>
        <div class="item-desc">${item.description || ''}</div>
        <div class="item-footer">
          <div>
            <span class="price-tag" data-price-id="${item.id}">₹${item.price}</span>
          </div>
          <div class="qty-control">
            <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
            <span class="qty-num" id="qty-${item.id}">${qty}</span>
            <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Cart qty change ───────────────────────────────────────────
function changeQty(itemId, delta) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;

  const idx = cart.findIndex(c => c.id === itemId);
  if (idx === -1) {
    if (delta > 0) cart.push({ id: item.id, name: item.name, price: item.price, qty: 1, category: item.category });
  } else {
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
  }

  saveCart();
  const qtyEl = document.getElementById(`qty-${itemId}`);
  if (qtyEl) qtyEl.textContent = (cart.find(c => c.id === itemId) || {}).qty || 0;
  updateCartUI();
  if (delta > 0) showToast(`${item.name} cart mein add hua ✓`, 'success', 1800);
}

// ── Cart UI ───────────────────────────────────────────────────
function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const fab      = document.getElementById('cart-fab');
  const countEl  = document.getElementById('cart-count');
  const totalEl  = document.getElementById('cart-total');
  const itemsEl  = document.getElementById('cart-items');

  if (fab)     fab.classList.toggle('visible', count > 0);
  if (countEl) countEl.textContent = count;
  if (totalEl) totalEl.textContent = `₹${total}`;

  if (!itemsEl) return;
  if (!cart.length) {
    itemsEl.innerHTML = `<div class="cart-empty"><div class="icon">🛒</div><p>Cart khaali hai</p></div>`;
    return;
  }
  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-emoji">${CAT_EMOJI[item.category] || '🍴'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-sub">₹${item.price} × ${item.qty}</div>
      </div>
      <div class="cart-item-price">₹${item.price * item.qty}</div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">✕</button>
    </div>`).join('');
}

function removeFromCart(itemId) {
  cart = cart.filter(c => c.id !== itemId);
  saveCart();
  updateCartUI();
  const qtyEl = document.getElementById(`qty-${itemId}`);
  if (qtyEl) qtyEl.textContent = 0;
}

// ── Cart drawer ───────────────────────────────────────────────
function openCart()  {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function proceedToOrder() {
  if (!cart.length) { showToast('Cart khaali hai!', 'error'); return; }
  window.location.href = 'order.html';
}

// ── Filter buttons ────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.cat;
    renderMenu(allItems, activeFilter);
    updateCartUI(); // rebind qty displays after re-render
  });
});

// ── Demo items ────────────────────────────────────────────────
const DEMO_ITEMS = [
  { id:'ITEM_1', category:'Chai',    name:'Masala Chai',     description:'Adrak aur elaichi ki kadak chai',           price:30 },
  { id:'ITEM_2', category:'Chai',    name:'Cutting Chai',    description:'Mumbai-style half cup strong chai',          price:20 },
  { id:'ITEM_7', category:'Chai',    name:'Irani Chai',      description:'Creamy Hyderabadi-style Irani chai',         price:45 },
  { id:'ITEM_8', category:'Chai',    name:'Paan Chai',       description:'Unique paan-flavoured tea',                  price:55 },
  { id:'ITEM_3', category:'Coffee',  name:'Filter Coffee',   description:'South Indian strong drip coffee',            price:50 },
  { id:'ITEM_4', category:'Snacks',  name:'Samosa (2 pcs)',  description:'Crispy aloo stuffed samosa',                 price:30 },
  { id:'ITEM_5', category:'Snacks',  name:'Bread Pakoda',    description:'Bread pakoda with green chutney',            price:40 },
  { id:'ITEM_6', category:'Snacks',  name:'Veg Sandwich',    description:'Grilled cheese veg sandwich',                price:60 },
];

// ── Init ──────────────────────────────────────────────────────
loadMenu();
