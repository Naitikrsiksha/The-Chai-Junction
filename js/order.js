// ============================================================
//  order.js — Order & Booking form submission logic
// ============================================================

let orderType = 'dine-in';

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set UPI ID from config
  const upiEl = document.getElementById('upi-display');
  if (upiEl) upiEl.textContent = CAFE_CONFIG.UPI_ID;

  // Populate table dropdown
  const tableSelect = document.getElementById('table-no');
  if (tableSelect) {
    for (let i = 1; i <= CAFE_CONFIG.TOTAL_TABLES; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Table ${i}`;
      tableSelect.appendChild(opt);
    }
  }

  // Set min date for booking to today
  const dateInput = document.getElementById('booking-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }

  // Load cart into summary
  loadCartSummary();

  // Check if URL has #booking
  if (window.location.hash === '#booking') {
    switchTab('booking');
  }
});

// ── Tab switch ───────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('order-section').style.display  = tab === 'order'   ? 'block' : 'none';
  document.getElementById('booking-section').style.display = tab === 'booking' ? 'block' : 'none';

  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'order') || (i === 1 && tab === 'booking'));
  });
}

// ── Order Type selection ─────────────────────────────────────
function selectType(type) {
  orderType = type;
  document.querySelectorAll('.type-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.type === type);
  });

  const tableGroup = document.getElementById('table-group');
  if (tableGroup) tableGroup.style.display = type === 'dine-in' ? 'block' : 'none';
}

// ── Load cart into summary ───────────────────────────────────
function loadCartSummary() {
  const cart = JSON.parse(localStorage.getItem('ancafe_cart') || '[]');
  const itemsEl = document.getElementById('summary-items');
  const subtotalEl = document.getElementById('summary-subtotal');

  if (!itemsEl) return;

  if (!cart.length) {
    itemsEl.innerHTML = `<div class="empty-cart-msg">Cart is empty.<br/><a href="menu.html" style="color:var(--gold);">Add items →</a></div>`;
    if (subtotalEl) subtotalEl.textContent = '₹0';
    return;
  }

  let total = 0;
  itemsEl.innerHTML = cart.map(item => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;
    return `
      <div class="summary-item">
        <span class="summary-item-name">${item.name} × ${item.qty}</span>
        <span class="summary-item-price">₹${lineTotal}</span>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.textContent = `₹${total}`;
}

// ── Place Order ──────────────────────────────────────────────
async function placeOrder() {
  const name  = document.getElementById('order-name').value.trim();
  const phone = document.getElementById('order-phone').value.trim();
  const email = document.getElementById('order-email').value.trim();
  const notes = document.getElementById('order-notes').value.trim();
  const table = document.getElementById('table-no')?.value || '';

  // Validate
  if (!name)  { showToast('Please enter your name', 'error'); return; }
  if (!phone) { showToast('Please enter your phone number', 'error'); return; }
  if (orderType === 'dine-in' && !table) { showToast('Please select a table', 'error'); return; }

  const cart = JSON.parse(localStorage.getItem('ancafe_cart') || '[]');
  if (!cart.length) { showToast('Your cart is empty! Add items from the menu.', 'error'); return; }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const btn = document.getElementById('place-order-btn');
  btn.textContent = 'Placing Order...';
  btn.disabled = true;

  const result = await apiPost({
    action: 'saveOrder',
    name, phone, email, notes,
    items: cart,
    total,
    type: orderType,
    table_no: table
  });

  btn.textContent = 'Place Order →';
  btn.disabled = false;

  if (result && result.success) {
    // Clear cart
    localStorage.removeItem('ancafe_cart');

    // Show success
    document.getElementById('order-form-panel').style.display = 'none';
    document.getElementById('order-id-display').textContent = result.orderId;
    document.getElementById('order-success').style.display = 'block';

    showToast('Order placed successfully! 🎉', 'success', 4000);
  } else if (!result) {
    // API not configured — demo mode
    const demoId = 'ORD' + Date.now();
    localStorage.removeItem('ancafe_cart');
    document.getElementById('order-form-panel').style.display = 'none';
    document.getElementById('order-id-display').textContent = demoId;
    document.getElementById('order-success').style.display = 'block';
    showToast('Demo mode: Order saved locally ✓', 'info', 4000);
  } else {
    showToast('Something went wrong. Please try again.', 'error');
  }
}

// ── Place Booking ────────────────────────────────────────────
async function placeBooking() {
  const name   = document.getElementById('booking-name').value.trim();
  const phone  = document.getElementById('booking-phone').value.trim();
  const email  = document.getElementById('booking-email').value.trim();
  const date   = document.getElementById('booking-date').value;
  const time   = document.getElementById('booking-time').value;
  const guests = document.getElementById('booking-guests').value;
  const notes  = document.getElementById('booking-notes').value.trim();

  if (!name)   { showToast('Please enter your name', 'error'); return; }
  if (!phone)  { showToast('Please enter your phone', 'error'); return; }
  if (!date)   { showToast('Please select a date', 'error'); return; }
  if (!time)   { showToast('Please select a time', 'error'); return; }
  if (!guests) { showToast('Please select number of guests', 'error'); return; }

  const result = await apiPost({ action: 'saveBooking', name, phone, email, date, time, guests, notes });

  if (result && result.success) {
    document.getElementById('booking-form-panel').style.display = 'none';
    document.getElementById('booking-id-display').textContent = result.bookingId;
    document.getElementById('booking-success').style.display = 'block';
    showToast('Table booked! See you soon ☕', 'success', 4000);
  } else if (!result) {
    const demoId = 'BKG' + Date.now();
    document.getElementById('booking-form-panel').style.display = 'none';
    document.getElementById('booking-id-display').textContent = demoId;
    document.getElementById('booking-success').style.display = 'block';
    showToast('Demo mode: Booking saved ✓', 'info', 4000);
  } else {
    showToast('Something went wrong. Please try again.', 'error');
  }
}

// ── Reset forms ──────────────────────────────────────────────
function resetOrderForm() {
  document.getElementById('order-success').style.display = 'none';
  document.getElementById('order-form-panel').style.display = 'block';
  loadCartSummary();
}

function resetBookingForm() {
  document.getElementById('booking-success').style.display = 'none';
  document.getElementById('booking-form-panel').style.display = 'block';
}

