// ============================================================
//  admin.js — Admin dashboard logic
// ============================================================

// ── Login ────────────────────────────────────────────────────
function doLogin() {
  const pass = document.getElementById('admin-pass').value;
  if (pass === CAFE_CONFIG.ADMIN_PASSWORD) {
    sessionStorage.setItem('ancafe_admin', '1');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    initDashboard();
  } else {
    showToast('Wrong password!', 'error');
    document.getElementById('admin-pass').value = '';
    document.getElementById('admin-pass').focus();
  }
}

function logout() {
  sessionStorage.removeItem('ancafe_admin');
  window.location.reload();
}

// ── Check session ─────────────────────────────────────────────
(function checkSession() {
  if (sessionStorage.getItem('ancafe_admin') === '1') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    initDashboard();
  }
})();

// ── Init dashboard ────────────────────────────────────────────
function initDashboard() {
  loadStats();
}

// ── Panel switch ──────────────────────────────────────────────
function showPanel(name) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));

  document.getElementById(`panel-${name}`).classList.add('active');
  event.target.classList.add('active');

  if (name === 'orders')   loadOrders();
  if (name === 'bookings') loadBookings();
}

// ── Stats ──────────────────────────────────────────────────────
async function loadStats() {
  const result = await apiGet('getStats');
  if (!result || !result.success) {
    showToast('Could not load stats (check Script URL)', 'error');
    // Show demo stats
    setStats({ totalOrders: '—', pendingOrders: '—', totalBookings: '—', todayOrders: '—', totalRevenue: '—' });
    return;
  }

  setStats(result.data);
}

function setStats(d) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('s-total-orders', d.totalOrders);
  set('s-pending', d.pendingOrders);
  set('s-bookings', d.totalBookings);
  set('s-today', d.todayOrders);
  set('s-revenue', d.totalRevenue !== '—' ? `₹${d.totalRevenue}` : '—');
}

// ── Orders ────────────────────────────────────────────────────
async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="loader"></div></div></td></tr>`;

  const result = await apiGet('getOrders');

  if (!result || !result.success || !result.data.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">No orders yet.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = result.data.map(order => {
    let items = '—';
    try {
      const parsed = JSON.parse(order.items);
      items = parsed.map(i => `${i.name}×${i.qty}`).join(', ');
    } catch (e) { items = order.items; }

    return `
      <tr>
        <td><span class="badge badge-gold">${order.order_id || '—'}</span></td>
        <td>${order.timestamp || '—'}</td>
        <td class="name-col">${order.name || '—'}</td>
        <td>${order.phone || '—'}</td>
        <td style="max-width:200px;word-break:break-word;">${items}</td>
        <td style="color:var(--gold-light);font-family:var(--font-serif);">₹${order.total || 0}</td>
        <td><span class="badge ${order.type === 'dine-in' ? 'badge-blue' : 'badge-gold'}">${order.type || '—'}</span></td>
        <td>${order.table_no || '—'}</td>
        <td>
          <select class="status-select" onchange="updateStatus('${order.order_id}', this.value)">
            ${['Pending','Preparing','Ready','Delivered','Cancelled'].map(s =>
              `<option ${order.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateStatus(orderId, status) {
  const result = await apiPost({ action: 'updateOrderStatus', orderId, status });
  if (result && result.success) {
    showToast(`Order ${orderId} → ${status}`, 'success', 2000);
  } else {
    showToast('Could not update status', 'error');
  }
}

// ── Bookings ──────────────────────────────────────────────────
async function loadBookings() {
  const tbody = document.getElementById('bookings-tbody');
  tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="loader"></div></div></td></tr>`;

  const result = await apiGet('getBookings');

  if (!result || !result.success || !result.data.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">No bookings yet.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = result.data.map(b => `
    <tr>
      <td><span class="badge badge-gold">${b.booking_id || '—'}</span></td>
      <td>${b.timestamp || '—'}</td>
      <td class="name-col">${b.name || '—'}</td>
      <td>${b.phone || '—'}</td>
      <td>${b.date || '—'}</td>
      <td>${b.time || '—'}</td>
      <td>${b.guests || '—'}</td>
      <td><span class="badge ${b.status === 'Confirmed' ? 'badge-green' : 'badge-red'}">${b.status || '—'}</span></td>
      <td style="max-width:150px;">${b.notes || '—'}</td>
    </tr>
  `).join('');
        }

