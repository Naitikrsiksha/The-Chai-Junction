// ============================================================
//  menu.js — Menu page logic: load items, filter, cart
// ============================================================

// ── Category emojis ─────────────────────────────────────────
const CAT_EMOJI = {
  Coffee: '☕', Beverages: '🥤', Food: '🍽️',
  Desserts: '🍫', Snacks: '🥪', Smoothies: '🥤'
};

// ── Cart state ───────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('ancafe_cart') || '[]');
let allItems = [];
let activeFilter = 'All';

// ── Save cart to localStorage ────────────────────────────────
function saveCart() {
  localStorage.setItem('ancafe_cart', JSON.stringify(cart));
}

// ── Load & render menu ───────────────────────────────────────
async function loadMenu() {
  const container = document.getElementById('menu-container');

  const result = await apiGet('getMenu');

  if (!result || !result.success) {
    // Fallback static data if API not configured yet
    allItems = DEMO_ITEMS;
  } else {
    allItems = result.data;
  }

  renderMenu(allItems, activeFilter);
  updateCartUI();
}

function renderMenu(items, filter) {
  const container = document.getElementById('menu-container');

  const filtered = filter === 'All' ? items : items.filter(i => i.category === filter);

  if (!filtered.length) {
    container.innerHTML = `<div style="text-align:center;padding:4rem;color:var(--cream-dim);">No items in this category yet.</div>`;
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
      <div class="category-section" data-category="${cat}">
        <div class="category-header">
          <h2>${CAT_EMOJI[cat] || '🍴'} ${cat}</h2>
          <div class="category-line"></div>
          <span class="badge badge-gold">${catItems.length} items</span>
        </div>
        <div class="items-grid">
          ${catItems.map(item => renderItemCard(item)).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Attach qty button events
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id    = btn.dataset.id;
      const delta = parseInt(btn.dataset.delta);
      changeQty(id, delta);
    });
  });
}

function renderItemCard(item) {
  const cartItem = cart.find(c => c.id === item.id);
  const qty = cartItem ? cartItem.qty : 0;

  return `
    <div class="item-card" id="card-${item.id}">
      <div class="item-emoji">${CAT_EMOJI[item.category] || '🍴'}</div>
      <div class="item-body">
        <div class="item-name">${item.name}</div>
        <div class="item-desc">${item.description || ''}</div>
        <div class="item-footer">
          <div class="item-price">${CAFE_CONFIG.CURRENCY}${item.price}</div>
          <div class="qty-control">
            <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
            <span class="qty-num" id="qty-${item.id}">${qty}</span>
            <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Qty change ───────────────────────────────────────────────
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
  updateQtyDisplay(itemId);
  updateCartUI();

  if (delta > 0) showToast(`${item.name} added to cart`, 'success', 2000);
}

function updateQtyDisplay(itemId) {
  const el = document.getElementById(`qty-${itemId}`);
  if (!el) return;
  const cartItem = cart.find(c => c.id === itemId);
  el.textContent = cartItem ? cartItem.qty : 0;
}

// ── Cart UI ──────────────────────────────────────────────────
function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const fab = document.getElementById('cart-fab');
  const countEl = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');

  if (fab) fab.classList.toggle('visible', count > 0);
  if (countEl) countEl.textContent = count;
  if (totalEl) totalEl.textContent = `${CAFE_CONFIG.CURRENCY}${total}`;

  // Render cart items
  const itemsEl = document.getElementById('cart-items');
  if (!itemsEl) return;

  if (!cart.length) {
    itemsEl.innerHTML = `<div class="cart-empty"><div class="icon">🛒</div><p>Your cart is empty</p></div>`;
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-emoji">${CAT_EMOJI[item.category] || '🍴'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-sub">${CAFE_CONFIG.CURRENCY}${item.price} × ${item.qty}</div>
      </div>
      <div class="cart-item-price">${CAFE_CONFIG.CURRENCY}${item.price * item.qty}</div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">✕</button>
    </div>
  `).join('');
}

function removeFromCart(itemId) {
  cart = cart.filter(c => c.id !== itemId);
  saveCart();
  updateCartUI();
  allItems.forEach(item => { if (item.id === itemId) updateQtyDisplay(itemId); });
}

// ── Cart open/close ──────────────────────────────────────────
function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Proceed to order ─────────────────────────────────────────
function proceedToOrder() {
  if (!cart.length) { showToast('Cart is empty!', 'error'); return; }
  window.location.href = 'order.html';
}

// ── Filter buttons ───────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.cat;
    renderMenu(allItems, activeFilter);
    updateCartUI();
  });
});

// ── Demo data (shown when API not configured) ────────────────
const DEMO_ITEMS = [
  { id: 'ITEM_1', category: 'Coffee',    name: 'Espresso',          description: 'Strong single shot, pure intensity', price: 80,  available: true },
  { id: 'ITEM_2', category: 'Coffee',    name: 'Cappuccino',        description: 'Espresso with velvety steamed milk foam', price: 120, available: true },
  { id: 'ITEM_3', category: 'Coffee',    name: 'Cold Brew',         description: '12-hour cold steeped smooth coffee', price: 150, available: true },
  { id: 'ITEM_9', category: 'Coffee',    name: 'Latte',             description: 'Creamy espresso with lots of milk', price: 130, available: true },
  { id: 'ITEM_4', category: 'Food',      name: 'Croissant',         description: 'Buttery flaky freshly baked pastry', price: 90,  available: true },
  { id: 'ITEM_5', category: 'Food',      name: 'Avocado Toast',     description: 'Sourdough with fresh avocado & chilli', price: 180, available: true },
  { id: 'ITEM_10',category: 'Food',      name: 'Grilled Sandwich',  description: 'Cheese, veggies, herbs on sourdough', price: 140, available: true },
  { id: 'ITEM_6', category: 'Beverages', name: 'Fresh Lime Soda',   description: 'Chilled lime juice with sparkling soda', price: 70,  available: true },
  { id: 'ITEM_7', category: 'Beverages', name: 'Mango Smoothie',    description: 'Fresh Alphonso mango blended cold', price: 130, available: true },
  { id: 'ITEM_11',category: 'Beverages', name: 'Iced Tea',          description: 'Chilled lemon iced tea, lightly sweet', price: 90,  available: true },
  { id: 'ITEM_8', category: 'Desserts',  name: 'Chocolate Lava Cake', description: 'Warm cake with molten center', price: 160, available: true },
  { id: 'ITEM_12',category: 'Desserts',  name: 'Tiramisu',          description: 'Classic Italian coffee-soaked dessert', price: 180, available: true },
];

// ── Init ─────────────────────────────────────────────────────
loadMenu();
    
