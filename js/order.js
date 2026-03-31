// ============================================================
//  order.js — The Chai Junction
//  Features: validation, honeypot, rate limiting, real-time
//  total with live prices, UPI deep link (ID hidden in backend)
// ============================================================

// ── State ─────────────────────────────────────────────────────
let orderType    = 'dine-in';
let livePrices   = {};      // real-time prices from sheet
let cartItems    = [];      // local cart copy (with live prices)
let priceTimer   = null;

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  populateTables();
  setMinDate();
  loadCartSummary();
  await fetchLivePrices(); // load real-time prices immediately

  // Auto-refresh prices every 60s — total updates automatically
  clearInterval(priceTimer);
  priceTimer = setInterval(async () => {
    await fetchLivePrices();
    recalcTotal(); // update total with new prices
  }, 60000);

  // Check URL hash for tab
  if (window.location.hash === '#booking') switchTab('booking');
});

// ── Populate table dropdown ────────────────────────────────────
function populateTables() {
  const sel = document.getElementById('table-no');
  if (!sel) return;
  for (let i = 1; i <= CAFE_CONFIG.TOTAL_TABLES; i++) {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = `Table ${i}`;
    sel.appendChild(opt);
  }
}

// ── Min date for booking ───────────────────────────────────────
function setMinDate() {
  const d = document.getElementById('booking-date');
  if (d) d.min = new Date().toISOString().split('T')[0];
}

// ════════════════════════════════════════════════════════════
//  REAL-TIME PRICE SYSTEM
// ════════════════════════════════════════════════════════════

// Fetch latest prices from Google Sheets
async function fetchLivePrices() {
  const result = await apiGet('getPrices');
  if (result && result.success) {
    livePrices = result.data;

    // Update cart items with latest prices
    const rawCart = JSON.parse(localStorage.getItem('tcj_cart') || '[]');
    cartItems = rawCart.map(item => ({
      ...item,
      price: livePrices[item.id] !== undefined ? livePrices[item.id] : item.price
    }));

    // Show live price indicator
    const liveEl = document.getElementById('price-live-badge');
    if (liveEl) liveEl.style.display = 'inline-flex';
  } else {
    cartItems = JSON.parse(localStorage.getItem('tcj_cart') || '[]');
  }

  recalcTotal();
  renderSummaryItems();
}

// Recalculate total (items + pre-booking if applicable)
function recalcTotal() {
  const itemsTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const prebooking = (orderType === 'dine-in') ? CAFE_CONFIG.PREBOOKING_CHARGE : 0;
  const grand      = itemsTotal + prebooking;

  // Update all total displays
  const totalEls = document.querySelectorAll('[data-total]');
  totalEls.forEach(el => el.textContent = `₹${grand}`);

  const itemTotalEl = document.getElementById('items-subtotal');
  if (itemTotalEl) itemTotalEl.textContent = `₹${itemsTotal}`;

  const preEl = document.getElementById('prebooking-row');
  if (preEl) preEl.style.display = orderType === 'dine-in' ? 'flex' : 'none';

  // Update pay button text
  const payBtn = document.getElementById('upi-pay-btn');
  if (payBtn) payBtn.textContent = `Pay ₹${grand} via UPI →`;

  // Store grand total for payment
  window._grandTotal = grand;

  return grand;
}

// Load cart into summary panel + update all prices
function loadCartSummary() {
  cartItems = JSON.parse(localStorage.getItem('tcj_cart') || '[]');
  renderSummaryItems();
  recalcTotal();
}

function renderSummaryItems() {
  const itemsEl = document.getElementById('summary-items');
  if (!itemsEl) return;

  if (!cartItems.length) {
    itemsEl.innerHTML = `<div class="empty-cart-msg">Cart khaali hai.<br/><a href="menu.html" style="color:var(--saffron);">Menu se add karo →</a></div>`;
    return;
  }

  itemsEl.innerHTML = cartItems.map(item => `
    <div class="summary-item">
      <span class="summary-item-name">${item.name} <span style="color:var(--cream-dim);font-size:0.8rem;">×${item.qty}</span></span>
      <span class="summary-item-price">₹${item.price * item.qty}</span>
    </div>`).join('');
}

// ════════════════════════════════════════════════════════════
//  FORM HELPERS
// ════════════════════════════════════════════════════════════

// Tab switch (Order / Booking)
function switchTab(tab) {
  document.getElementById('order-section').style.display   = tab === 'order'   ? 'block' : 'none';
  document.getElementById('booking-section').style.display = tab === 'booking' ? 'block' : 'none';
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'order') || (i === 1 && tab === 'booking'));
  });
  if (tab === 'booking') window.location.hash = 'booking';
}

// Order type (dine-in / takeaway)
function selectType(type) {
  orderType = type;
  document.querySelectorAll('.type-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.type === type);
  });
  const tableGroup = document.getElementById('table-group');
  if (tableGroup) tableGroup.style.display = type === 'dine-in' ? 'block' : 'none';
  recalcTotal(); // pre-booking charge changes
}

// ════════════════════════════════════════════════════════════
//  VALIDATION
// ════════════════════════════════════════════════════════════

/**
 * Validate a single field
 * @param {string} fieldId - input element id
 * @param {Function} rule - returns true if valid
 * @param {string} errorMsg - shown below input on failure
 */
function validateField(fieldId, rule, errorMsg) {
  const input = document.getElementById(fieldId);
  if (!input) return true;
  const group = input.closest('.form-group');
  const errEl = group ? group.querySelector('.field-error') : null;

  const valid = rule(input.value.trim());
  if (group) {
    group.classList.toggle('error',   !valid);
    group.classList.toggle('success', valid);
  }
  if (errEl) errEl.textContent = errorMsg;
  return valid;
}

// Live validation on input
function bindValidation(fieldId, rule, errorMsg) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.addEventListener('input', () => validateField(fieldId, rule, errorMsg));
  el.addEventListener('blur',  () => validateField(fieldId, rule, errorMsg));
}

// Bind validations after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Order form
  bindValidation('order-name',
    v => v.length >= 2,
    'Naam kam se kam 2 characters ka hona chahiye');
  bindValidation('order-phone',
    v => /^\d{10}$/.test(v),
    'Phone number exactly 10 digits hona chahiye (sirf numbers)');

  // Booking form
  bindValidation('booking-name',
    v => v.length >= 2,
    'Naam kam se kam 2 characters ka hona chahiye');
  bindValidation('booking-phone',
    v => /^\d{10}$/.test(v),
    'Phone number exactly 10 digits hona chahiye (sirf numbers)');
});

// ════════════════════════════════════════════════════════════
//  BOT PROTECTION — HONEYPOT
// ════════════════════════════════════════════════════════════
// A hidden field that real users never fill — bots fill everything
function isBot() {
  const hp = document.getElementById('hp_website');
  if (!hp) return false;
  if (hp.value !== '') {
    console.warn('[Security] Bot detected via honeypot');
    return true;
  }
  return false;
}

// ════════════════════════════════════════════════════════════
//  RATE LIMITING — 1 submission per 30 seconds
// ════════════════════════════════════════════════════════════
function checkRateLimit(key) {
  const lastSubmit = parseInt(localStorage.getItem(key) || '0');
  const now        = Date.now();
  const diff       = Math.ceil((CAFE_CONFIG.RATE_LIMIT_SECONDS * 1000 - (now - lastSubmit)) / 1000);

  if (lastSubmit && (now - lastSubmit) < CAFE_CONFIG.RATE_LIMIT_SECONDS * 1000) {
    showToast(`Thoda ruko! ${diff} second mein dobara try karo.`, 'warn', 4000);
    return false;
  }
  localStorage.setItem(key, now.toString());
  return true;
}

// ── Set/reset submit button state ─────────────────────────────
function setButtonLoading(btnId, loading, loadingText = 'Submit ho raha hai...', defaultText = '') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled      = loading;
  if (loading) {
    btn.dataset.orig = btn.textContent;
    btn.textContent  = loadingText;
  } else {
    btn.textContent = defaultText || btn.dataset.orig || 'Submit';
  }
}

// ════════════════════════════════════════════════════════════
//  UPI PAYMENT — Amount auto-fill, ID stays on backend
// ════════════════════════════════════════════════════════════

/**
 * Get UPI deep link from backend
 * Backend generates upi://pay?pa=HIDDEN&am=AMOUNT&...
 * UPI ID is NEVER sent to frontend
 */
async function getUpiLink(amount, orderId) {
  const result = await apiGet('getPayLink', { amount, orderId });
  if (result && result.success) return result;
  return null;
}

/**
 * Open UPI payment with exact amount
 * Works on Android (opens GPay/PhonePe/Paytm automatically)
 * iOS shows manual instructions
 */
function openUpiPayment(deepLink, amount) {
  const isIOS     = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  if (isAndroid) {
    // On Android — directly open UPI app
    window.location.href = deepLink;
  } else if (isIOS) {
    // iOS UPI support is limited — show message
    showToast('iOS pe UPI open karo aur manually pay karo. Amount: ₹' + amount, 'info', 6000);
    window.location.href = deepLink; // still try
  } else {
    // Desktop — show QR/UPI info
    showToast('Mobile se UPI scan karo ya cafe me cash/card pay karo. Amount: ₹' + amount, 'info', 6000);
  }
}

// ════════════════════════════════════════════════════════════
//  PLACE ORDER
// ════════════════════════════════════════════════════════════
async function placeOrder() {
  // ── Bot check ──────────────────────────────────────────────
  if (isBot()) { console.log('Bot blocked'); return; }

  // ── Rate limit ─────────────────────────────────────────────
  if (!checkRateLimit('tcj_order_last')) return;

  // ── Validate fields ────────────────────────────────────────
  const nameValid  = validateField('order-name',  v => v.length >= 2,       'Naam kam se kam 2 characters');
  const phoneValid = validateField('order-phone', v => /^\d{10}$/.test(v),  'Exactly 10 digits chahiye');
  const tableValid = orderType !== 'dine-in' || validateField('table-no', v => !!v, 'Table select karo');

  if (!nameValid || !phoneValid || !tableValid) {
    showToast('Form sahi se bharo pehle ⚠️', 'error');
    return;
  }

  // ── Cart check ─────────────────────────────────────────────
  if (!cartItems.length) {
    showToast('Cart khaali hai! Pehle menu se items add karo.', 'error');
    return;
  }

  const name  = document.getElementById('order-name').value.trim();
  const phone = document.getElementById('order-phone').value.trim();
  const email = document.getElementById('order-email').value.trim();
  const notes = document.getElementById('order-notes').value.trim();
  const table = document.getElementById('table-no')?.value || '';

  const itemsTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const prebooking = orderType === 'dine-in' ? CAFE_CONFIG.PREBOOKING_CHARGE : 0;
  const grandTotal = itemsTotal + prebooking;

  // ── Loading state ───────────────────────────────────────────
  setButtonLoading('place-order-btn', true, 'Order place ho raha hai...');

  // ── Save to Google Sheets ──────────────────────────────────
  const saveResult = await apiPost({
    action: 'saveOrder',
    name, phone, email, notes,
    items:      cartItems,
    total:      grandTotal,
    type:       orderType,
    table_no:   table,
    prebooking: prebooking
  });

  const orderId = (saveResult && saveResult.success) ? saveResult.orderId : ('ORD' + Date.now());

  // ── Get UPI deep link from backend ─────────────────────────
  const payLink = await getUpiLink(grandTotal, orderId);

  setButtonLoading('place-order-btn', false);

  // ── Show success + payment ─────────────────────────────────
  localStorage.removeItem('tcj_cart');
  document.getElementById('order-form-panel').style.display = 'none';
  document.getElementById('order-success').style.display = 'block';

  // Fill order ID and amount in success screen
  const orderIdEl = document.getElementById('order-id-display');
  if (orderIdEl) orderIdEl.textContent = orderId;

  const amountEl = document.getElementById('pay-amount-display');
  if (amountEl) amountEl.textContent = `₹${grandTotal}`;

  // If pay link received, show UPI pay button
  if (payLink && payLink.deepLink) {
    const payBtnEl = document.getElementById('upi-pay-btn');
    if (payBtnEl) {
      payBtnEl.style.display = 'inline-flex';
      payBtnEl.textContent   = `Pay ₹${grandTotal} via UPI →`;
      payBtnEl.onclick       = () => openUpiPayment(payLink.deepLink, grandTotal);
    }
  } else {
    // API not configured — demo mode
    showToast(`Demo: Order ${orderId} — ₹${grandTotal}. UPI se pay karna.`, 'info', 5000);
  }

  showToast('Order place hua! Ab UPI se payment karo. 🎉', 'success', 5000);
}

// ════════════════════════════════════════════════════════════
//  PLACE BOOKING
// ════════════════════════════════════════════════════════════
async function placeBooking() {
  // Bot check
  if (isBot()) return;

  // Rate limit
  if (!checkRateLimit('tcj_booking_last')) return;

  // Validate
  const nameValid   = validateField('booking-name',   v => v.length >= 2,      'Naam 2+ characters');
  const phoneValid  = validateField('booking-phone',  v => /^\d{10}$/.test(v), 'Exactly 10 digits');
  const dateValid   = validateField('booking-date',   v => !!v,                'Date select karo');
  const timeValid   = validateField('booking-time',   v => !!v,                'Time select karo');
  const guestsValid = validateField('booking-guests', v => !!v,                'Guests select karo');

  if (!nameValid || !phoneValid || !dateValid || !timeValid || !guestsValid) {
    showToast('Sab fields sahi se bharo ⚠️', 'error');
    return;
  }

  const name   = document.getElementById('booking-name').value.trim();
  const phone  = document.getElementById('booking-phone').value.trim();
  const email  = document.getElementById('booking-email').value.trim();
  const date   = document.getElementById('booking-date').value;
  const time   = document.getElementById('booking-time').value;
  const guests = document.getElementById('booking-guests').value;
  const notes  = document.getElementById('booking-notes').value.trim();

  const prebooking = CAFE_CONFIG.PREBOOKING_CHARGE; // ₹30 always on booking

  setButtonLoading('place-booking-btn', true, 'Booking confirm ho rahi hai...');

  const saveResult = await apiPost({ action: 'saveBooking', name, phone, email, date, time, guests, notes, prebooking });
  const bookingId  = (saveResult && saveResult.success) ? saveResult.bookingId : ('BKG' + Date.now());

  // Get UPI link for pre-booking charge
  const payLink = await getUpiLink(prebooking, bookingId);

  setButtonLoading('place-booking-btn', false);

  // Show success
  document.getElementById('booking-form-panel').style.display = 'none';
  document.getElementById('booking-success').style.display = 'block';

  const bIdEl = document.getElementById('booking-id-display');
  if (bIdEl) bIdEl.textContent = bookingId;

  // Show UPI pay button for pre-booking ₹30
  if (payLink && payLink.deepLink) {
    const bPayBtn = document.getElementById('booking-pay-btn');
    if (bPayBtn) {
      bPayBtn.style.display = 'inline-flex';
      bPayBtn.textContent   = `Pay ₹${prebooking} Pre-booking Charge via UPI →`;
      bPayBtn.onclick       = () => openUpiPayment(payLink.deepLink, prebooking);
    }
  } else {
    showToast(`Demo: Booking ${bookingId} — Pre-booking ₹${prebooking} UPI se pay karna.`, 'info', 5000);
  }

  showToast('Table book hua! Pre-booking charge pay karo. ☕', 'success', 5000);
}

// ── Reset forms ────────────────────────────────────────────────
function resetOrderForm() {
  document.getElementById('order-success').style.display   = 'none';
  document.getElementById('order-form-panel').style.display = 'block';
  loadCartSummary();
  // Clear validation states
  document.querySelectorAll('#order-form-panel .form-group').forEach(g => {
    g.classList.remove('error', 'success');
  });
}

function resetBookingForm() {
  document.getElementById('booking-success').style.display   = 'none';
  document.getElementById('booking-form-panel').style.display = 'block';
  document.querySelectorAll('#booking-form-panel .form-group').forEach(g => {
    g.classList.remove('error', 'success');
  });
}
