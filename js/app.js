// Global variables for active charts
let salesChart = null;
let expenseChart = null;
let reportsSalesChart = null;
let reportsExpenseChart = null;

// ==========================================
// TOAST NOTIFICATION UTILITY
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '';
  if (type === 'success') icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  else if (type === 'warning') icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  else if (type === 'danger') icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  // Animate slide-in/out
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
window.showToast = showToast;

// ==========================================
// CONFIRMATION DIALOG UTILITY
// ==========================================
let confirmResolve = null;
function showConfirm(title, message) {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    modal.classList.add('active');
  });
}
window.showConfirm = showConfirm;

function handleConfirmClose(confirmed) {
  const modal = document.getElementById('confirm-modal');
  modal.classList.remove('active');
  if (confirmResolve) {
    confirmResolve(confirmed);
    confirmResolve = null;
  }
}

// ==========================================
// SPA ROUTER & VIEWS
// ==========================================
const views = {
  dashboard: renderDashboard,
  pos: renderPOS,
  products: renderProducts,
  inventory: renderInventory,
  purchases: renderPurchases,
  suppliers: renderSuppliers,
  workers: renderWorkers,
  expenses: renderExpenses,
  reports: renderReports,
  settings: renderSettings,
  backup: renderBackup
};

async function navigate(viewName) {
  if (!auth.checkSession()) {
    showAuthScreen(true);
    return;
  }
  
  showAuthScreen(false);

  // Update active sidebar nav item
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    }
  });

  // Set topbar title
  const titleMap = {
    dashboard: 'Dashboard Overview',
    pos: 'Point of Sale (POS)',
    products: 'Products & Categories Directory',
    inventory: 'Raw Ingredients & Recipes',
    purchases: 'Raw Material Purchases Log',
    suppliers: 'Suppliers Directory',
    workers: 'Worker Directory & Attendance',
    expenses: 'General Expense Registry',
    reports: 'Reports & Business Analytics',
    settings: 'Shop Configurations',
    backup: 'Backup & Recovery Panel'
  };
  document.getElementById('view-title').innerText = titleMap[viewName] || 'Sweet Shop ERP';

  // Render view template
  const container = document.getElementById('content-view');
  container.innerHTML = '<div class="flex items-center justify-center h-[200px]"><span class="animate-pulse text-zinc-400 text-sm font-semibold">Loading data...</span></div>';
  
  try {
    await views[viewName](container);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="p-4 bg-rose-950/20 border border-rose-800 rounded-lg text-rose-400 text-sm">Failed to load view: ${err.message}</div>`;
  }

  // Refresh low stock notification badge
  await refreshNotifications();
}

// Global modal close listeners
function initModalCloseHandlers() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    // Close on clicking backdrop
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });

    // Close on clicking close icon
    overlay.querySelectorAll('.modal-close').forEach(closeBtn => {
      closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    });
  });
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Image File upload Base64 translator helper
function handleImageUpload(inputEl, previewEl, placeholderEl) {
  return new Promise((resolve) => {
    inputEl.addEventListener('change', () => {
      const file = inputEl.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target.result;
          previewEl.src = base64;
          previewEl.classList.remove('hidden');
          placeholderEl.classList.add('hidden');
          resolve(base64);
        };
        reader.readAsDataURL(file);
      } else {
        resolve('');
      }
    });
  });
}

function initDragAndDrop(dropzoneEl, inputEl, previewEl, placeholderEl) {
  let base64Image = '';

  dropzoneEl.addEventListener('click', () => inputEl.click());
  
  dropzoneEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneEl.style.borderColor = 'var(--primary)';
    dropzoneEl.style.backgroundColor = 'var(--bg-active)';
  });

  dropzoneEl.addEventListener('dragleave', () => {
    dropzoneEl.style.borderColor = '';
    dropzoneEl.style.backgroundColor = '';
  });

  dropzoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneEl.style.borderColor = '';
    dropzoneEl.style.backgroundColor = '';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        base64Image = event.target.result;
        previewEl.src = base64Image;
        previewEl.classList.remove('hidden');
        placeholderEl.classList.add('hidden');
        dropzoneEl.dispatchEvent(new CustomEvent('imageLoaded', { detail: base64Image }));
      };
      reader.readAsDataURL(file);
    }
  });

  inputEl.addEventListener('change', () => {
    const file = inputEl.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        base64Image = event.target.result;
        previewEl.src = base64Image;
        previewEl.classList.remove('hidden');
        placeholderEl.classList.add('hidden');
        dropzoneEl.dispatchEvent(new CustomEvent('imageLoaded', { detail: base64Image }));
      };
      reader.readAsDataURL(file);
    }
  });

  return {
    getImage: () => base64Image,
    reset: () => {
      base64Image = '';
      previewEl.src = '';
      previewEl.classList.add('hidden');
      placeholderEl.classList.remove('hidden');
      inputEl.value = '';
    },
    setImage: (base64) => {
      if (base64) {
        base64Image = base64;
        previewEl.src = base64;
        previewEl.classList.remove('hidden');
        placeholderEl.classList.add('hidden');
      } else {
        base64Image = '';
        previewEl.src = '';
        previewEl.classList.add('hidden');
        placeholderEl.classList.remove('hidden');
      }
    }
  };
}

// Low Stock Notifications Badge Coordinator
async function refreshNotifications() {
  const summary = await reports.getStockStatusSummary();
  const alertCount = summary.lowStockProductsCount + summary.lowStockRawCount;
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');

  if (alertCount > 0) {
    badge.innerText = alertCount;
    badge.classList.remove('hidden');
    
    let html = '';
    summary.lowStockProducts.forEach(p => {
      html += `
        <div class="notif-item">
          <div class="notif-item-title text-rose-500">Low Sweet Stock: ${p.name}</div>
          <div class="notif-item-desc">Current stock is ${p.stock} ${p.unit} (Min: ${p.minStock} ${p.unit})</div>
        </div>
      `;
    });
    summary.lowStockRawMaterials.forEach(r => {
      html += `
        <div class="notif-item">
          <div class="notif-item-title text-amber-500">Low Raw Stock: ${r.name}</div>
          <div class="notif-item-desc">Current stock is ${r.stock} ${r.unit} (Min: ${r.minStock} ${r.unit})</div>
        </div>
      `;
    });
    list.innerHTML = html;
  } else {
    badge.classList.add('hidden');
    list.innerHTML = '<div class="notif-empty">No alerts currently.</div>';
  }
}

// ==========================================
// 1. DASHBOARD VIEW RENDERER
// ==========================================
async function renderDashboard(container) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Fetch metrics
  const shopSettings = await settings.getSettings();
  const currency = shopSettings?.currency || 'INR';

  const todaySales = await reports.getSalesInRange(todayStart, now);
  const revenueToday = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthExpenses = await reports.getExpensesInRange(startOfMonth, now);
  const expensesMonthSum = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const stockSummary = await reports.getStockStatusSummary();
  const lowStockCount = stockSummary.lowStockProductsCount + stockSummary.lowStockRawCount;

  // Worker Attendance
  const workersList = await workers.getWorkers();
  const activeWorkers = workersList.filter(w => w.status === 'active');
  const todayStr = now.toISOString().split('T')[0];
  const todayAttendance = await workers.getAttendanceForDate(todayStr);
  const presentCount = todayAttendance.filter(a => a.status === 'present' || a.status === 'paid_leave' || a.status === 'half_day').length;
  const attendanceRate = activeWorkers.length > 0 ? ((presentCount / activeWorkers.length) * 100) : 0;

  // Best Sellers & Recent Sales
  const bestSellers = await reports.getBestSellingProducts(4);
  const recentSales = todaySales.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

  container.innerHTML = `
    <div class="kpi-row">
      <div class="kpi-card kpi-sales">
        <div class="kpi-data">
          <span>Today's Sales</span>
          <h3>${currency} ${revenueToday.toFixed(2)}</h3>
        </div>
        <div class="kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>
      <div class="kpi-card kpi-expenses">
        <div class="kpi-data">
          <span>Expenses (Month)</span>
          <h3>${currency} ${expensesMonthSum.toFixed(2)}</h3>
        </div>
        <div class="kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        </div>
      </div>
      <div class="kpi-card kpi-alerts">
        <div class="kpi-data">
          <span>Stock Warnings</span>
          <h3>${lowStockCount}</h3>
        </div>
        <div class="kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
      </div>
      <div class="kpi-card kpi-attendance">
        <div class="kpi-data">
          <span>Attendance Today</span>
          <h3>${attendanceRate.toFixed(0)}%</h3>
        </div>
        <div class="kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <h3>Sales Trend (Last 7 Days)</h3>
        <div class="chart-wrapper">
          <canvas id="dashboard-sales-chart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Expense Distribution (Last 30 Days)</h3>
        <div class="chart-wrapper">
          <canvas id="dashboard-expense-chart"></canvas>
        </div>
      </div>
    </div>

    <div class="recent-row">
      <div class="panel">
        <div class="panel-header">
          <h3 class="text-zinc-200">Recent Transactions (Today)</h3>
          <a href="#pos" class="btn btn-primary h-[34px] text-xs">New POS Bill</a>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Time</th>
                <th>Payment</th>
                <th>Tax</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${recentSales.length === 0 ? `
                <tr><td colspan="5" class="text-center text-zinc-500 py-6">No invoices generated today yet.</td></tr>
              ` : recentSales.map(sale => `
                <tr>
                  <td class="font-bold text-indigo-400">${sale.invoiceNumber}</td>
                  <td>${new Date(sale.timestamp).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}</td>
                  <td><span class="badge ${sale.paymentMethod === 'cash' ? 'badge-success' : sale.paymentMethod === 'upi' ? 'badge-warning' : 'badge-secondary'}">${sale.paymentMethod}</span></td>
                  <td>${currency} ${sale.taxTotal.toFixed(2)}</td>
                  <td class="font-bold">${currency} ${sale.grandTotal.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3 class="text-zinc-200 mb-4">Best Sellers</h3>
        <div class="best-sellers-list">
          ${bestSellers.length === 0 ? `
            <div class="text-center text-zinc-500 py-6">No sales history yet.</div>
          ` : bestSellers.map(item => {
            const maxSold = Math.max(...bestSellers.map(b => b.quantitySold), 1);
            const fillRatio = (item.quantitySold / maxSold) * 100;
            return `
              <div class="best-seller-item">
                <div class="best-seller-meta">
                  <span class="font-semibold">${item.name}</span>
                  <span class="text-indigo-400 font-bold">${item.quantitySold} sold</span>
                </div>
                <div class="best-seller-bar-bg">
                  <div class="best-seller-bar-fill" style="width: ${fillRatio}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // Instantiate Chart.js
  const salesData = await reports.getSalesReportData('weekly');
  const expenseData = await reports.getExpenseReportData('monthly');

  if (salesChart) salesChart.destroy();
  if (expenseChart) expenseChart.destroy();

  const ctxSales = document.getElementById('dashboard-sales-chart').getContext('2d');
  salesChart = new Chart(ctxSales, {
    type: 'line',
    data: salesData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#a1a1aa' } },
        x: { grid: { display: false }, ticks: { color: '#a1a1aa' } }
      }
    }
  });

  const ctxExpense = document.getElementById('dashboard-expense-chart').getContext('2d');
  expenseChart = new Chart(ctxExpense, {
    type: 'doughnut',
    data: expenseData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#a1a1aa', font: { family: 'Outfit' } }
        }
      }
    }
  });
}

// ==========================================
// 2. POS BILLING INTERFACE
// ==========================================
async function renderPOS(container) {
  const rawProducts = await products.getProducts();
  const categoriesList = await products.getCategories();
  const shopSettings = await settings.getSettings();
  const currency = shopSettings?.currency || 'INR';

  // Render Skeleton Structure
  container.innerHTML = `
    <div class="pos-layout">
      <!-- Left side catalog -->
      <div class="pos-catalog-panel">
        <div class="flex gap-2">
          <div class="search-box flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="pos-search" placeholder="Search sweets (F2)...">
          </div>
          <div class="barcode-reader-input-wrapper w-[160px]">
            <input type="text" id="pos-barcode-input" placeholder="Barcode scanner">
            <svg class="barcode-scanner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5v14M21 5v14M7 5v14M17 5v14M12 5v14"/></svg>
          </div>
        </div>

        <div class="pos-filter-bar" id="pos-category-filters">
          <button class="pos-filter-btn active" data-category="All">All Categories</button>
          ${categoriesList.map(c => `<button class="pos-filter-btn" data-category="${c.name}">${c.name}</button>`).join('')}
        </div>

        <div class="pos-products-grid" id="pos-catalog-grid">
          <!-- Populated by JS -->
        </div>
      </div>

      <!-- Right side Cart -->
      <div class="pos-cart-panel">
        <div class="pos-cart-header">
          <h3 class="text-zinc-200">Active Order</h3>
          <button id="pos-clear-cart" class="btn btn-secondary h-[30px] text-xs">Clear All (F4)</button>
        </div>

        <div class="pos-cart-items" id="pos-cart-items-list">
          <!-- Cart list -->
        </div>

        <div class="pos-cart-footer">
          <div class="totals-breakdown">
            <div class="totals-row">
              <span>Subtotal</span>
              <span id="pos-subtotal">${currency} 0.00</span>
            </div>
            <div class="totals-row items-center">
              <span>Discount %</span>
              <input type="number" id="pos-discount" min="0" max="100" value="0" class="w-[60px] h-[26px] p-1 text-center font-bold" style="background-color:rgba(0,0,0,0.3)">
            </div>
            <div class="totals-row">
              <span>Tax (GST)</span>
              <span id="pos-tax">${currency} 0.00</span>
            </div>
            <div class="totals-row grand">
              <span>Total Payable</span>
              <span id="pos-grand-total">${currency} 0.00</span>
            </div>
          </div>

          <div class="mt-2">
            <label class="text-[0.7rem] uppercase text-zinc-400 font-semibold block mb-1">Payment Method</label>
            <div class="pos-payment-selector">
              <button class="pos-pay-btn active" data-method="cash">CASH</button>
              <button class="pos-pay-btn" data-method="upi">UPI</button>
              <button class="pos-pay-btn" data-method="card">CARD</button>
            </div>
          </div>

          <div class="mt-2">
            <textarea id="pos-bill-notes" placeholder="Order notes (optional)..." rows="1" class="w-full text-xs p-2 bg-zinc-900/60"></textarea>
          </div>

          <button id="pos-btn-checkout" class="btn btn-primary w-full h-[44px] mt-2 text-md font-bold">
            Checkout & Print Receipt (F9)
          </button>
          
          <div class="pos-shortcuts-banner">
            <span><kbd>F2</kbd> Search</span>
            <span><kbd>F4</kbd> Clear Cart</span>
            <span><kbd>F8</kbd> Discount</span>
            <span><kbd>F9</kbd> Pay</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // State elements
  const searchInput = document.getElementById('pos-search');
  const barcodeInput = document.getElementById('pos-barcode-input');
  const cartContainer = document.getElementById('pos-cart-items-list');
  const subtotalEl = document.getElementById('pos-subtotal');
  const discountInput = document.getElementById('pos-discount');
  const taxEl = document.getElementById('pos-tax');
  const grandEl = document.getElementById('pos-grand-total');
  const checkoutBtn = document.getElementById('pos-btn-checkout');
  const notesText = document.getElementById('pos-bill-notes');
  const clearBtn = document.getElementById('pos-clear-cart');

  let activeCategory = 'All';
  let activePaymentMethod = 'cash';

  // Render product grid
  function updateCatalog() {
    const query = searchInput.value;
    const filtered = products.queryProducts(rawProducts, {
      search: query,
      category: activeCategory,
      status: 'active'
    });

    const grid = document.getElementById('pos-catalog-grid');
    if (filtered.length === 0) {
      grid.innerHTML = '<div class="col-span-full text-center text-zinc-500 py-10">No active products found matching criteria.</div>';
      return;
    }

    grid.innerHTML = filtered.map(p => `
      <div class="pos-product-card" data-id="${p.id}">
        ${p.image ? `<img src="${p.image}" class="pos-prod-img">` : `<div class="pos-prod-img-placeholder">Mithai</div>`}
        <div class="pos-prod-name">${p.name}</div>
        <div class="pos-prod-price">${currency} ${p.sellingPrice.toFixed(2)}</div>
        <div class="pos-prod-stock ${p.stock <= p.minStock ? 'out' : ''}">Stock: ${p.stock} ${p.unit}</div>
      </div>
    `).join('');

    // Attach card clicks
    grid.querySelectorAll('.pos-product-card').forEach(card => {
      card.addEventListener('click', async () => {
        const id = parseInt(card.getAttribute('data-id'));
        await pos.addToCart(id, 1);
      });
    });
  }

  // Update Cart details
  async function updateCartUI() {
    const cart = pos.getCart();
    if (cart.length === 0) {
      cartContainer.innerHTML = `
        <div class="pos-cart-empty">
          <svg class="h-10 w-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span class="text-sm font-semibold">Cart is Empty</span>
          <span class="text-xs text-zinc-500">Click items on the left to add</span>
        </div>
      `;
      subtotalEl.innerText = `${currency} 0.00`;
      taxEl.innerText = `${currency} 0.00`;
      grandEl.innerText = `${currency} 0.00`;
      return;
    }

    // List active cart rows
    cartContainer.innerHTML = cart.map(item => {
      const p = item.product;
      const rowTotal = p.sellingPrice * item.quantity;
      return `
        <div class="pos-cart-item">
          <div class="pos-item-details">
            <span class="pos-item-name">${p.name}</span>
            <span class="pos-item-sub">${currency} ${p.sellingPrice.toFixed(2)} / ${p.unit}</span>
          </div>
          <div class="pos-qty-actions">
            <button class="pos-qty-btn dec-qty" data-id="${p.id}">-</button>
            <input type="number" class="pos-qty-input val-qty" data-id="${p.id}" value="${item.quantity}">
            <button class="pos-qty-btn inc-qty" data-id="${p.id}">+</button>
          </div>
          <div class="pos-item-total-area">
            <span class="pos-item-total">${currency} ${rowTotal.toFixed(2)}</span>
            <button class="pos-btn-remove" data-id="${p.id}">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind item events
    cartContainer.querySelectorAll('.dec-qty').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = pos.getCart().find(c => c.product.id === id);
        if (item) pos.updateCartQuantity(id, item.quantity - 1);
      });
    });

    cartContainer.querySelectorAll('.inc-qty').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = pos.getCart().find(c => c.product.id === id);
        if (item) pos.updateCartQuantity(id, item.quantity + 1);
      });
    });

    cartContainer.querySelectorAll('.val-qty').forEach(input => {
      input.addEventListener('change', () => {
        const id = parseInt(input.getAttribute('data-id'));
        const val = parseFloat(input.value);
        pos.updateCartQuantity(id, isNaN(val) ? 1 : val);
      });
    });

    cartContainer.querySelectorAll('.pos-btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        pos.removeFromCart(id);
      });
    });

    // Recompute totals
    const disc = parseFloat(discountInput.value) || 0;
    const totals = await pos.calculateCartTotals(disc);
    subtotalEl.innerText = `${currency} ${totals.subtotal.toFixed(2)}`;
    taxEl.innerText = `${currency} ${totals.taxTotal.toFixed(2)}`;
    grandEl.innerText = `${currency} ${totals.grandTotal.toFixed(2)}`;
  }

  // Handle barcode reader trigger
  barcodeInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const code = barcodeInput.value.trim();
      if (code) {
        // Find matching product
        const matched = rawProducts.find(p => p.barcode === code && p.status === 'active');
        if (matched) {
          await pos.addToCart(matched.id, 1);
          showToast(`Added ${matched.name} via barcode.`);
        } else {
          showToast('No active product found matching this barcode.', 'warning');
        }
        barcodeInput.value = '';
      }
    }
  });

  // Bind category button filters
  document.getElementById('pos-category-filters').querySelectorAll('.pos-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('pos-category-filters').querySelectorAll('.pos-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-category');
      updateCatalog();
    });
  });

  // Bind payment method toggles
  document.querySelectorAll('.pos-payment-selector .pos-pay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pos-payment-selector .pos-pay-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePaymentMethod = btn.getAttribute('data-method');
    });
  });

  // Listeners
  searchInput.addEventListener('input', updateCatalog);
  discountInput.addEventListener('input', updateCartUI);
  clearBtn.addEventListener('click', () => {
    pos.clearCart();
    showToast('POS Cart cleared.');
  });

  window.addEventListener('cartUpdated', updateCartUI);

  // Submit checkout
  checkoutBtn.addEventListener('click', async () => {
    const cart = pos.getCart();
    if (cart.length === 0) {
      showToast('POS Cart is empty.', 'warning');
      return;
    }

    // Verify raw material recipe stocks
    const warnings = await pos.verifyCartStock();
    if (warnings.length > 0) {
      let msg = 'The following recipe ingredients are short:\n\n';
      warnings.forEach(w => {
        msg += `- ${w.productName}:\n  ${w.warnings.join('\n  ')}\n`;
      });
      msg += '\nDo you still want to proceed with this checkout?';
      
      const proceed = await showConfirm('Insufficient Raw Ingredients!', msg);
      if (!proceed) return;
    }

    try {
      const disc = parseFloat(discountInput.value) || 0;
      const notes = notesText.value.trim();
      const res = await pos.checkout(activePaymentMethod, disc, notes);
      
      showToast(`Sale completed! Invoice: ${res.saleRecord.invoiceNumber}`);
      
      // Auto trigger PDF print
      await pos.generateInvoicePDF(res.saleRecord, 'thermal');

      // Reset local inputs
      discountInput.value = '0';
      notesText.value = '';
      
      // Refresh current catalog stock display
      const latestProducts = await products.getProducts();
      rawProducts.length = 0;
      Object.assign(rawProducts, latestProducts);
      updateCatalog();
      
    } catch (err) {
      showToast(`Checkout failed: ${err.message}`, 'danger');
    }
  });

  // Setup POS keyboard shortcuts
  const keydownShortcutHandler = (e) => {
    if (window.location.hash !== '#pos') return;

    if (e.key === 'F2') {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === 'F4') {
      e.preventDefault();
      clearBtn.click();
    } else if (e.key === 'F8') {
      e.preventDefault();
      discountInput.focus();
      discountInput.select();
    } else if (e.key === 'F9') {
      e.preventDefault();
      checkoutBtn.click();
    }
  };
  window.addEventListener('keydown', keydownShortcutHandler);

  // Cleanup shortcut handler when view changes to avoid global keyboard interception
  const cleanupHandler = () => {
    window.removeEventListener('keydown', keydownShortcutHandler);
    window.removeEventListener('hashchange', cleanupHandler);
  };
  window.addEventListener('hashchange', cleanupHandler);

  // Initialize display
  updateCatalog();
  updateCartUI();
}

// ==========================================
// 3. PRODUCTS & CATEGORIES MANAGER
// ==========================================
async function renderProducts(container) {
  let rawProducts = await products.getProducts();
  let categoriesList = await products.getCategories();
  const settingsData = await settings.getSettings();
  const currency = settingsData?.currency || 'INR';

  // Render view layout
  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div class="flex gap-2 flex-wrap items-center">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="prod-search" placeholder="Search sweets, SKU...">
          </div>
          
          <select id="prod-filter-cat" class="w-[180px] h-[38px]">
            <option value="All">All Categories</option>
            ${categoriesList.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
          </select>

          <select id="prod-filter-status" class="w-[140px] h-[38px]">
            <option value="All">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select id="prod-sort" class="w-[180px] h-[38px]">
            <option value="name">Sort by Name</option>
            <option value="sellingPrice">Sort by Price</option>
            <option value="stock">Sort by Stock</option>
          </select>
        </div>

        <div class="panel-actions">
          <button id="btn-manage-cats" class="btn btn-secondary">Categories</button>
          <button id="btn-add-product" class="btn btn-primary">+ Add Product</button>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">Photo</th>
              <th>Product Details</th>
              <th>Category</th>
              <th>SKU / Barcode</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th style="width: 160px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="products-table-body">
            <!-- Filled dynamically -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = document.getElementById('products-table-body');
  const searchIn = document.getElementById('prod-search');
  const filterCat = document.getElementById('prod-filter-cat');
  const filterStatus = document.getElementById('prod-filter-status');
  const sortSel = document.getElementById('prod-sort');

  function renderTable() {
    const query = searchIn.value;
    const cat = filterCat.value;
    const statusVal = filterStatus.value;
    const sort = sortSel.value;
    
    // Sort ordering
    let sortOrder = 'asc';
    let sortKey = sort;
    if (sort === 'sellingPrice' || sort === 'stock') {
      sortOrder = 'desc'; // numbers usually dec
    }

    const filtered = products.queryProducts(rawProducts, {
      search: query,
      category: cat,
      status: statusVal,
      sortKey,
      sortOrder
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-zinc-500 py-10">No sweets products cataloged.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(p => `
      <tr>
        <td>
          ${p.image ? `<img src="${p.image}" class="img-thumb">` : `<div class="img-thumb-placeholder">M</div>`}
        </td>
        <td>
          <div class="font-bold text-zinc-100">${p.name}</div>
          <div class="text-[0.7rem] text-zinc-500">${p.description || 'No description'}</div>
        </td>
        <td><span class="badge badge-secondary">${p.category}</span></td>
        <td>
          <div class="text-xs text-zinc-300">SKU: ${p.sku || '-'}</div>
          <div class="text-xs text-zinc-500">BC: ${p.barcode || '-'}</div>
        </td>
        <td>${currency} ${(p.purchasePrice || 0).toFixed(2)}</td>
        <td class="font-semibold text-indigo-400">${currency} ${p.sellingPrice.toFixed(2)}</td>
        <td>
          <span class="font-bold ${p.stock <= p.minStock ? 'text-rose-500' : 'text-zinc-200'}">${p.stock} ${p.unit}</span>
          ${p.stock <= p.minStock ? `<span class="block text-[0.65rem] text-rose-500 font-semibold font-sans">LOW STOCK (Min: ${p.minStock})</span>` : ''}
        </td>
        <td>
          <span class="badge ${p.status === 'active' ? 'badge-success' : 'badge-danger'}">${p.status}</span>
        </td>
        <td class="text-right">
          <button class="btn-icon recipe" data-id="${p.id}" title="Recipe Link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </button>
          <button class="btn-icon duplicate" data-id="${p.id}" title="Duplicate Sweet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn-icon edit" data-id="${p.id}" title="Edit Detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete" data-id="${p.id}" title="Delete Sweet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

    // Attach Row Action Handlers
    tbody.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        await openProductFormModal(id);
      });
    });

    tbody.querySelectorAll('.duplicate').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const ok = await showConfirm('Duplicate Product?', 'Do you want to duplicate this product entry? Stock will start at 0.');
        if (ok) {
          try {
            await products.duplicateProduct(id);
            showToast('Product duplicated successfully.');
            rawProducts = await products.getProducts();
            renderTable();
          } catch (err) {
            showToast(err.message, 'danger');
          }
        }
      });
    });

    tbody.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const ok = await showConfirm('Delete Product?', 'Warning: This will permanently delete this product and its recipes. Proceed?');
        if (ok) {
          try {
            await products.deleteProduct(id);
            showToast('Product deleted.');
            rawProducts = await products.getProducts();
            renderTable();
          } catch (err) {
            showToast(err.message, 'danger');
          }
        }
      });
    });

    tbody.querySelectorAll('.recipe').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        await openRecipeFormModal(id);
      });
    });
  }

  // Filters bindings
  searchIn.addEventListener('input', renderTable);
  filterCat.addEventListener('change', renderTable);
  filterStatus.addEventListener('change', renderTable);
  sortSel.addEventListener('change', renderTable);

  // Trigger modals
  document.getElementById('btn-add-product').addEventListener('click', () => {
    openProductFormModal(null);
  });

  document.getElementById('btn-manage-cats').addEventListener('click', () => {
    openCategoriesModal();
  });

  // Render Table initially
  renderTable();

  // ==========================================
  // PRODUCT FORM MODAL HANDLERS
  // ==========================================
  const prodModal = document.getElementById('product-modal');
  const prodForm = document.getElementById('product-form');
  const dropzoneEl = document.getElementById('photo-dropzone');
  const fileInputEl = document.getElementById('prod-photo-input');
  const previewImgEl = document.getElementById('prod-photo-preview');
  const placeholderDiv = document.getElementById('photo-placeholder');

  const dragDrop = initDragAndDrop(dropzoneEl, fileInputEl, previewImgEl, placeholderDiv);

  async function openProductFormModal(productId = null) {
    dragDrop.reset();
    prodForm.reset();

    // Populate category selections
    const latestCats = await products.getCategories();
    const catSelect = document.getElementById('prod-category');
    catSelect.innerHTML = latestCats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

    if (!productId) {
      document.getElementById('product-modal-title').innerText = 'Add Product';
      document.getElementById('prod-id').value = '';
      document.getElementById('prod-stock').removeAttribute('disabled'); // Allow starting stock
    } else {
      document.getElementById('product-modal-title').innerText = 'Edit Product Details';
      const item = await products.getProduct(productId);
      if (item) {
        document.getElementById('prod-id').value = item.id;
        document.getElementById('prod-name').value = item.name;
        document.getElementById('prod-category').value = item.category;
        document.getElementById('prod-sku').value = item.sku;
        document.getElementById('prod-barcode').value = item.barcode;
        document.getElementById('prod-unit').value = item.unit;
        document.getElementById('prod-purchase-price').value = item.purchasePrice;
        document.getElementById('prod-selling-price').value = item.sellingPrice;
        document.getElementById('prod-stock').value = item.stock;
        document.getElementById('prod-min-stock').value = item.minStock;
        document.getElementById('prod-tax').value = item.tax;
        document.getElementById('prod-description').value = item.description;
        document.getElementById('prod-status').checked = item.status === 'active';
        
        // Disable starting stock direct modifications during edit to preserve recipe accounting logs (use adjustments in inventory logs instead if needed, but keeping it editable is fine too, though we warn them).
        // Let's let them edit it but suggest raw stock adjustments.
        
        dragDrop.setImage(item.image);
      }
    }
    showModal('product-modal');
  }

  // Submit product
  prodForm.onsubmit = async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('prod-id').value;
    const data = {
      name: document.getElementById('prod-name').value,
      category: document.getElementById('prod-category').value,
      sku: document.getElementById('prod-sku').value,
      barcode: document.getElementById('prod-barcode').value,
      unit: document.getElementById('prod-unit').value,
      purchasePrice: parseFloat(document.getElementById('prod-purchase-price').value),
      sellingPrice: parseFloat(document.getElementById('prod-selling-price').value),
      stock: parseFloat(document.getElementById('prod-stock').value),
      minStock: parseFloat(document.getElementById('prod-min-stock').value),
      tax: parseFloat(document.getElementById('prod-tax').value),
      description: document.getElementById('prod-description').value,
      status: document.getElementById('prod-status').checked ? 'active' : 'inactive',
      image: dragDrop.getImage()
    };

    try {
      if (!idVal) {
        await products.addProduct(data);
        showToast('Sweet product added successfully.');
      } else {
        await products.updateProduct(parseInt(idVal), data);
        showToast('Sweet product details updated.');
      }
      closeModal('product-modal');
      rawProducts = await products.getProducts();
      renderTable();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // ==========================================
  // CATEGORIES MANAGER MODAL HANDLERS
  // ==========================================
  const catTableBody = document.getElementById('categories-table-body');
  const catForm = document.getElementById('category-form');

  async function openCategoriesModal() {
    catForm.reset();
    await updateCategoriesTableUI();
    showModal('category-modal');
  }

  async function updateCategoriesTableUI() {
    const list = await products.getCategories();
    catTableBody.innerHTML = list.map(c => `
      <tr>
        <td class="font-semibold text-zinc-200">${c.name}</td>
        <td class="text-right">
          <button class="btn-icon delete-cat" data-id="${c.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

    catTableBody.querySelectorAll('.delete-cat').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const ok = await showConfirm('Delete Category?', 'Are you sure you want to delete this category? Products in this category will block deletion.');
        if (ok) {
          try {
            await products.deleteCategory(id);
            showToast('Category deleted.');
            await updateCategoriesTableUI();
            
            // Reload page options dropdowns
            categoriesList = await products.getCategories();
            filterCat.innerHTML = '<option value="All">All Categories</option>' + categoriesList.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
          } catch (err) {
            showToast(err.message, 'danger');
          }
        }
      });
    });
  }

  catForm.onsubmit = async (e) => {
    e.preventDefault();
    const val = document.getElementById('cat-name').value.trim();
    try {
      await products.addCategory(val);
      showToast('Category added.');
      document.getElementById('cat-name').value = '';
      await updateCategoriesTableUI();
      
      // Reload page options dropdowns
      categoriesList = await products.getCategories();
      filterCat.innerHTML = '<option value="All">All Categories</option>' + categoriesList.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // ==========================================
  // RECIPE MODAL HANDLERS
  // ==========================================
  const recipeRowsContainer = document.getElementById('recipe-ingredients-list');
  const recipeForm = document.getElementById('recipe-form');
  const addRowBtn = document.getElementById('btn-recipe-add-row');

  async function openRecipeFormModal(productId) {
    recipeRowsContainer.innerHTML = '';
    
    const prod = await products.getProduct(productId);
    if (!prod) return;

    document.getElementById('recipe-product-id').value = prod.id;
    document.getElementById('recipe-product-name').innerText = `${prod.name} (${prod.unit})`;

    // Get list of raw materials
    const materials = await inventory.getRawMaterials();
    if (materials.length === 0) {
      recipeRowsContainer.innerHTML = '<div class="text-center text-zinc-500 py-4">No raw materials registered. Register ingredients first.</div>';
      showModal('recipe-modal');
      return;
    }

    // Load active recipe
    const recipe = await inventory.getRecipeForProduct(productId);
    if (recipe && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(item => {
        addRecipeIngredientRow(materials, item.rawMaterialId, item.quantity);
      });
    } else {
      // Add one default blank row
      addRecipeIngredientRow(materials);
    }

    addRowBtn.onclick = () => addRecipeIngredientRow(materials);

    showModal('recipe-modal');
  }

  function addRecipeIngredientRow(materials, rawMaterialId = '', quantity = '') {
    const row = document.createElement('div');
    row.className = 'recipe-row mb-2';
    row.innerHTML = `
      <select class="recipe-ingredient-select" required>
        <option value="" disabled selected>-- Select Ingredient --</option>
        ${materials.map(m => `<option value="${m.id}" ${parseInt(rawMaterialId) === m.id ? 'selected' : ''}>${m.name} (${m.unit})</option>`).join('')}
      </select>
      <input type="number" class="recipe-quantity-input" min="0.0001" step="0.0001" placeholder="Quantity" value="${quantity}" required>
      <button type="button" class="btn btn-danger h-[38px] recipe-btn-delete-row">&times;</button>
    `;

    row.querySelector('.recipe-btn-delete-row').addEventListener('click', () => {
      row.remove();
    });

    recipeRowsContainer.appendChild(row);
  }

  recipeForm.onsubmit = async (e) => {
    e.preventDefault();
    const pid = parseInt(document.getElementById('recipe-product-id').value);
    
    const ingredientsList = [];
    recipeRowsContainer.querySelectorAll('.recipe-row').forEach(row => {
      const matId = row.querySelector('.recipe-ingredient-select').value;
      const qty = row.querySelector('.recipe-quantity-input').value;
      if (matId && qty) {
        ingredientsList.push({
          rawMaterialId: parseInt(matId),
          quantity: parseFloat(qty)
        });
      }
    });

    try {
      await inventory.saveRecipe(pid, ingredientsList);
      showToast('Recipe linkages updated.');
      closeModal('recipe-modal');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };
}

// ==========================================
// 4. RAW MATERIAL INVENTORY & RECIPES LOG
// ==========================================
async function renderInventory(container) {
  let materials = await inventory.getRawMaterials();
  let logs = await inventory.getRawMaterialLogs();

  container.innerHTML = `
    <!-- Tabs Header -->
    <div class="flex gap-4 border-b border-zinc-800 mb-6 pb-px">
      <button id="tab-raw-stock" class="pb-3 border-b-2 border-indigo-500 text-indigo-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none">Ingredients Inventory</button>
      <button id="tab-raw-logs" class="pb-3 border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none">Inventory Logs History</button>
    </div>

    <!-- Tab 1: Ingredients Stock -->
    <div id="panel-raw-stock" class="panel">
      <div class="panel-header">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="raw-search" placeholder="Search ingredients...">
        </div>
        <button id="btn-add-raw" class="btn btn-primary">+ Add Raw Material</button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Ingredient Name</th>
              <th>Current Stock</th>
              <th>Measurement Unit</th>
              <th>Min Alert Threshold</th>
              <th>Last Updated</th>
              <th style="width: 220px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="raw-table-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Logs History -->
    <div id="panel-raw-logs" class="panel hidden">
      <div class="panel-header">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="raw-log-search" placeholder="Search logs...">
        </div>
      </div>
      
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Ingredient</th>
              <th>Movement</th>
              <th>Quantity Change</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody id="raw-logs-table-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Dynamic elements
  const tabStock = document.getElementById('tab-raw-stock');
  const tabLogs = document.getElementById('tab-raw-logs');
  const panelStock = document.getElementById('panel-raw-stock');
  const panelLogs = document.getElementById('panel-raw-logs');

  const stockBody = document.getElementById('raw-table-body');
  const searchStock = document.getElementById('raw-search');

  const logsBody = document.getElementById('raw-logs-table-body');
  const searchLogs = document.getElementById('raw-log-search');

  // Tab switcher
  tabStock.onclick = () => {
    tabStock.className = 'pb-3 border-b-2 border-indigo-500 text-indigo-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    tabLogs.className = 'pb-3 border-b-2 border-transparent text-zinc-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    panelStock.classList.remove('hidden');
    panelLogs.classList.add('hidden');
  };

  tabLogs.onclick = () => {
    tabLogs.className = 'pb-3 border-b-2 border-indigo-500 text-indigo-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    tabStock.className = 'pb-3 border-b-2 border-transparent text-zinc-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    panelLogs.classList.remove('hidden');
    panelStock.classList.add('hidden');
    renderLogsTable();
  };

  // Stock Table Drawer
  function renderStockTable() {
    const q = searchStock.value.toLowerCase().trim();
    const filtered = materials.filter(m => m.name.toLowerCase().includes(q));

    if (filtered.length === 0) {
      stockBody.innerHTML = '<tr><td colspan="6" class="text-center text-zinc-500 py-10">No matching ingredients cataloged.</td></tr>';
      return;
    }

    stockBody.innerHTML = filtered.map(m => `
      <tr>
        <td class="font-bold text-zinc-200">${m.name}</td>
        <td>
          <span class="font-bold ${m.stock <= m.minStock ? 'text-rose-500' : 'text-zinc-200'}">${m.stock.toFixed(2)}</span>
          ${m.stock <= m.minStock ? `<span class="block text-[0.65rem] text-rose-500 font-semibold font-sans">LOW INGREDIENT</span>` : ''}
        </td>
        <td><span class="badge badge-secondary">${m.unit}</span></td>
        <td>${m.minStock} ${m.unit}</td>
        <td>${new Date(m.lastUpdated).toLocaleString()}</td>
        <td class="text-right">
          <button class="btn btn-success h-[30px] text-xs add-stock" data-id="${m.id}" title="Stock In">+ In</button>
          <button class="btn btn-danger h-[30px] text-xs deduct-stock" data-id="${m.id}" title="Stock Out">- Out</button>
          <button class="btn-icon edit" data-id="${m.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete" data-id="${m.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

    // Table triggers
    stockBody.querySelectorAll('.add-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        openAdjustStockModal(id, 'in');
      });
    });

    stockBody.querySelectorAll('.deduct-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        openAdjustStockModal(id, 'out');
      });
    });

    stockBody.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        openMaterialFormModal(id);
      });
    });

    stockBody.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const ok = await showConfirm('Delete Raw Material?', 'Are you sure? This will delete the raw material. If used in a recipe, deletion will block.');
        if (ok) {
          try {
            await inventory.deleteRawMaterial(id);
            showToast('Raw material deleted.');
            materials = await inventory.getRawMaterials();
            renderStockTable();
          } catch (err) {
            showToast(err.message, 'danger');
          }
        }
      });
    });
  }

  // Logs Table Drawer
  async function renderLogsTable() {
    logs = await inventory.getRawMaterialLogs();
    const materialsMap = {};
    materials.forEach(m => { materialsMap[m.id] = m; });

    const q = searchLogs.value.toLowerCase().trim();
    
    const filtered = logs.filter(log => {
      const name = materialsMap[log.rawMaterialId]?.name.toLowerCase() || '';
      const r = log.reason.toLowerCase() || '';
      return name.includes(q) || r.includes(q);
    });

    if (filtered.length === 0) {
      logsBody.innerHTML = '<tr><td colspan="5" class="text-center text-zinc-500 py-10">No stock logs history matching query.</td></tr>';
      return;
    }

    logsBody.innerHTML = filtered.map(log => {
      const mat = materialsMap[log.rawMaterialId];
      return `
        <tr>
          <td>${new Date(log.timestamp).toLocaleString()}</td>
          <td class="font-bold text-zinc-300">${mat ? mat.name : `Ingredient #${log.rawMaterialId}`}</td>
          <td><span class="badge ${log.type === 'in' ? 'badge-success' : 'badge-danger'}">${log.type === 'in' ? 'Stock In' : 'Stock Out'}</span></td>
          <td class="font-bold ${log.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}">${log.type === 'in' ? '+' : '-'}${log.quantity} ${mat ? mat.unit : ''}</td>
          <td class="text-zinc-400 font-sans">${log.reason}</td>
        </tr>
      `;
    }).join('');
  }

  // Stock Adjust Modal triggers
  const adjustForm = document.getElementById('raw-stock-form');
  function openAdjustStockModal(id, type) {
    const item = materials.find(m => m.id === id);
    if (!item) return;

    adjustForm.reset();
    document.getElementById('raw-stock-id').value = id;
    document.getElementById('raw-stock-material-name').innerText = `${item.name} (${item.stock} ${item.unit} currently)`;
    document.getElementById('raw-stock-type').value = type;
    document.getElementById('raw-stock-unit').innerText = item.unit;
    
    showModal('raw-stock-modal');
  }

  adjustForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('raw-stock-id').value);
    const type = document.getElementById('raw-stock-type').value;
    const qty = parseFloat(document.getElementById('raw-stock-quantity').value);
    const reason = document.getElementById('raw-stock-reason').value.trim();

    try {
      await inventory.adjustRawMaterialStock(id, type, qty, reason);
      showToast('Inventory stock level adjusted.');
      closeModal('raw-stock-modal');
      materials = await inventory.getRawMaterials();
      renderStockTable();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Add/Edit raw material forms
  const matForm = document.getElementById('raw-material-form');
  function openMaterialFormModal(id = null) {
    matForm.reset();
    if (!id) {
      document.getElementById('raw-material-modal-title').innerText = 'Add Raw Material Ingredient';
      document.getElementById('raw-material-id').value = '';
      document.getElementById('raw-initial-stock-group').classList.remove('hidden');
    } else {
      document.getElementById('raw-material-modal-title').innerText = 'Edit Ingredient Config';
      const item = materials.find(m => m.id === id);
      if (item) {
        document.getElementById('raw-material-id').value = item.id;
        document.getElementById('raw-name').value = item.name;
        document.getElementById('raw-unit').value = item.unit;
        document.getElementById('raw-min-stock').value = item.minStock;
        document.getElementById('raw-initial-stock-group').classList.add('hidden'); // disable init modification during edits
      }
    }
    showModal('raw-material-modal');
  }

  matForm.onsubmit = async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('raw-material-id').value;
    const data = {
      name: document.getElementById('raw-name').value,
      unit: document.getElementById('raw-unit').value,
      minStock: parseFloat(document.getElementById('raw-min-stock').value),
      initialStock: parseFloat(document.getElementById('raw-initial-stock').value) || 0
    };

    try {
      if (!idVal) {
        await inventory.addRawMaterial(data);
        showToast('New raw material registered.');
      } else {
        await inventory.updateRawMaterial(parseInt(idVal), data);
        showToast('Raw material updated.');
      }
      closeModal('raw-material-modal');
      materials = await inventory.getRawMaterials();
      renderStockTable();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  document.getElementById('btn-add-raw').onclick = () => openMaterialFormModal(null);
  searchStock.addEventListener('input', renderStockTable);
  searchLogs.addEventListener('input', renderLogsTable);

  renderStockTable();
}

// ==========================================
// 5. PURCHASES LOG MANAGER
// ==========================================
async function renderPurchases(container) {
  let purchasesList = await purchases.getPurchases();
  const settingsData = await settings.getSettings();
  const currency = settingsData?.currency || 'INR';

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="pur-search" placeholder="Search invoice, supplier...">
        </div>
        <button id="btn-add-purchase" class="btn btn-primary">+ Record Purchase Invoice</button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier Name</th>
              <th>Invoice Number</th>
              <th>Items Bought</th>
              <th>Subtotal Cost</th>
              <th>Paid Amount</th>
              <th>Balance Generated</th>
            </tr>
          </thead>
          <tbody id="purchases-table-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = document.getElementById('purchases-table-body');
  const searchIn = document.getElementById('pur-search');

  async function renderTable() {
    const q = searchIn.value.toLowerCase().trim();
    const rawMaterialsList = await inventory.getRawMaterials();
    const materialsMap = {};
    rawMaterialsList.forEach(m => { materialsMap[m.id] = m; });

    const filtered = purchasesList.filter(p => 
      p.supplierName.toLowerCase().includes(q) || 
      p.invoiceNumber.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-zinc-500 py-10">No wholesale purchases cataloged.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const itemsDesc = p.items.map(item => {
        const mat = materialsMap[item.rawMaterialId];
        return `${mat ? mat.name : `ID#${item.rawMaterialId}`} x${item.quantity}`;
      }).join(', ');
      
      const bal = p.totalAmount - p.amountPaid;

      return `
        <tr>
          <td>${p.date}</td>
          <td class="font-bold text-zinc-200">${p.supplierName}</td>
          <td class="font-semibold text-indigo-400">${p.invoiceNumber || `PUR-#${p.id}`}</td>
          <td class="text-xs text-zinc-400 font-sans" title="${itemsDesc}">${itemsDesc.length > 40 ? itemsDesc.substring(0, 38) + '...' : itemsDesc}</td>
          <td>${currency} ${p.totalAmount.toFixed(2)}</td>
          <td>${currency} ${p.amountPaid.toFixed(2)}</td>
          <td>
            <span class="font-semibold ${bal > 0 ? 'text-rose-500' : 'text-emerald-400'}">
              ${bal > 0 ? `+${currency} ${bal.toFixed(2)}` : 'Cleared'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Create purchase invoice modal triggers
  const purModalForm = document.getElementById('purchase-form');
  const rowsContainer = document.getElementById('purchase-items-list');
  const totalCostInput = document.getElementById('pur-total');
  const paidCostInput = document.getElementById('pur-paid');
  const outDueDiv = document.getElementById('pur-balance-due');

  async function openPurchaseRecordModal() {
    purModalForm.reset();
    rowsContainer.innerHTML = '';
    
    // Set default date
    document.getElementById('pur-date').value = new Date().toISOString().split('T')[0];

    // Populate suppliers dropdown
    const sups = await purchases.getSuppliers();
    const supSelect = document.getElementById('pur-supplier');
    if (sups.length === 0) {
      showToast('Please add at least one supplier before recording a purchase.', 'warning');
      navigate('suppliers');
      return;
    }
    supSelect.innerHTML = sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    const materials = await inventory.getRawMaterials();
    if (materials.length === 0) {
      showToast('Please add raw materials first.', 'warning');
      navigate('inventory');
      return;
    }

    // Add first blank row
    addPurchaseItemRow(materials);

    document.getElementById('btn-purchase-add-row').onclick = () => addPurchaseItemRow(materials);

    // Calculate totals automatically when paid amount updates or when items update
    paidCostInput.oninput = recalculatePurchaseDue;
    
    showModal('purchase-modal');
  }

  function addPurchaseItemRow(materials) {
    const row = document.createElement('div');
    row.className = 'purchase-row mb-2';
    row.innerHTML = `
      <select class="pur-item-select" required>
        <option value="" disabled selected>-- Select Ingredient --</option>
        ${materials.map(m => `<option value="${m.id}">${m.name} (${m.unit})</option>`).join('')}
      </select>
      <input type="number" class="pur-item-qty" min="0.01" step="0.01" placeholder="Quantity" required>
      <input type="number" class="pur-item-price" min="0.01" step="0.01" placeholder="Price/Unit" required>
      <button type="button" class="btn btn-danger h-[38px] pur-btn-delete-row">&times;</button>
    `;

    row.querySelector('.pur-btn-delete-row').addEventListener('click', () => {
      row.remove();
      recalculatePurchaseTotal();
    });

    row.querySelector('.pur-item-qty').addEventListener('input', recalculatePurchaseTotal);
    row.querySelector('.pur-item-price').addEventListener('input', recalculatePurchaseTotal);

    rowsContainer.appendChild(row);
  }

  function recalculatePurchaseTotal() {
    let subtotal = 0;
    rowsContainer.querySelectorAll('.purchase-row').forEach(row => {
      const q = parseFloat(row.querySelector('.pur-item-qty').value) || 0;
      const p = parseFloat(row.querySelector('.pur-item-price').value) || 0;
      subtotal += q * p;
    });
    totalCostInput.value = subtotal.toFixed(2);
    recalculatePurchaseDue();
  }

  function recalculatePurchaseDue() {
    const total = parseFloat(totalCostInput.value) || 0;
    const paid = parseFloat(paidCostInput.value) || 0;
    const due = Math.max(0, total - paid);
    outDueDiv.innerText = `${currency} ${due.toFixed(2)}`;
  }

  purModalForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const items = [];
    rowsContainer.querySelectorAll('.purchase-row').forEach(row => {
      const matId = row.querySelector('.pur-item-select').value;
      const q = row.querySelector('.pur-item-qty').value;
      const p = row.querySelector('.pur-item-price').value;
      if (matId && q && p) {
        items.push({
          rawMaterialId: parseInt(matId),
          quantity: parseFloat(q),
          purchasePrice: parseFloat(p)
        });
      }
    });

    const data = {
      supplierId: document.getElementById('pur-supplier').value,
      invoiceNumber: document.getElementById('pur-invoice').value.trim(),
      date: document.getElementById('pur-date').value,
      items,
      totalAmount: parseFloat(totalCostInput.value),
      amountPaid: parseFloat(paidCostInput.value)
    };

    try {
      await purchases.addPurchase(data);
      showToast('Purchase invoice recorded and stocks incremented.');
      closeModal('purchase-modal');
      purchasesList = await purchases.getPurchases();
      renderTable();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  document.getElementById('btn-add-purchase').onclick = openPurchaseRecordModal;
  searchIn.addEventListener('input', renderTable);

  renderTable();
}

// ==========================================
// 6. SUPPLIERS MANAGER
// ==========================================
async function renderSuppliers(container) {
  let list = await purchases.getSuppliers();
  const settingsData = await settings.getSettings();
  const currency = settingsData?.currency || 'INR';

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="sup-search" placeholder="Search suppliers...">
        </div>
        <button id="btn-add-supplier" class="btn btn-primary">+ Add Supplier</button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>GSTIN</th>
              <th>Outstanding Balance</th>
              <th style="width: 180px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="suppliers-table-body">
            <!-- Filled dynamically -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = document.getElementById('suppliers-table-body');
  const searchIn = document.getElementById('sup-search');

  function renderTable() {
    const q = searchIn.value.toLowerCase().trim();
    const filtered = list.filter(s => s.name.toLowerCase().includes(q));

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-zinc-500 py-10">No suppliers registered.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td class="font-bold text-zinc-200">${s.name}</td>
        <td>${s.phone || '-'}</td>
        <td>${s.email || '-'}</td>
        <td><span class="badge badge-secondary">${s.gstNumber || '-'}</span></td>
        <td>
          <span class="font-bold ${s.outstandingBalance > 0 ? 'text-rose-500' : 'text-emerald-400'}">
            ${currency} ${s.outstandingBalance.toFixed(2)}
          </span>
        </td>
        <td class="text-right">
          ${s.outstandingBalance > 0 ? `<button class="btn btn-success h-[30px] text-xs pay-balance" data-id="${s.id}">Clear Due</button>` : ''}
          <button class="btn-icon edit" data-id="${s.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete" data-id="${s.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.pay-balance').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        openPayBalanceModal(id);
      });
    });

    tbody.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        openSupplierFormModal(id);
      });
    });

    tbody.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const ok = await showConfirm('Delete Supplier?', 'Are you sure? Outflow records linked to purchases from this supplier will block deletion.');
        if (ok) {
          try {
            await purchases.deleteSupplier(id);
            showToast('Supplier deleted.');
            list = await purchases.getSuppliers();
            renderTable();
          } catch (err) {
            showToast(err.message, 'danger');
          }
        }
      });
    });
  }

  // Pay supplier balance modal triggers
  const payForm = document.getElementById('supplier-pay-form');
  function openPayBalanceModal(supplierId) {
    const s = list.find(item => item.id === supplierId);
    if (!s) return;

    payForm.reset();
    document.getElementById('supplier-pay-id').value = s.id;
    document.getElementById('supplier-pay-name').innerText = s.name;
    document.getElementById('supplier-pay-due').innerText = `${currency} ${s.outstandingBalance.toFixed(2)}`;
    document.getElementById('supplier-pay-amount').max = s.outstandingBalance;
    document.getElementById('supplier-pay-amount').value = s.outstandingBalance;

    showModal('supplier-pay-modal');
  }

  payForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('supplier-pay-id').value);
    const amt = parseFloat(document.getElementById('supplier-pay-amount').value);
    const method = document.getElementById('supplier-pay-method').value;
    const note = document.getElementById('supplier-pay-notes').value.trim();

    try {
      await purchases.paySupplierBalance(id, amt, method, note);
      showToast('Payment recorded successfully.');
      closeModal('supplier-pay-modal');
      list = await purchases.getSuppliers();
      renderTable();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Add/Edit supplier modals
  const supForm = document.getElementById('supplier-form');
  function openSupplierFormModal(id = null) {
    supForm.reset();
    if (!id) {
      document.getElementById('supplier-modal-title').innerText = 'Add Supplier Profile';
      document.getElementById('supplier-id').value = '';
      document.getElementById('sup-balance-group').classList.remove('hidden');
    } else {
      document.getElementById('supplier-modal-title').innerText = 'Edit Supplier Profile';
      const item = list.find(s => s.id === id);
      if (item) {
        document.getElementById('supplier-id').value = item.id;
        document.getElementById('sup-name').value = item.name;
        document.getElementById('sup-phone').value = item.phone;
        document.getElementById('sup-email').value = item.email;
        document.getElementById('sup-gst').value = item.gstNumber;
        document.getElementById('sup-address').value = item.address;
        document.getElementById('sup-balance-group').classList.add('hidden');
      }
    }
    showModal('supplier-modal');
  }

  supForm.onsubmit = async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('supplier-id').value;
    const data = {
      name: document.getElementById('sup-name').value,
      phone: document.getElementById('sup-phone').value,
      email: document.getElementById('sup-email').value,
      gstNumber: document.getElementById('sup-gst').value,
      address: document.getElementById('sup-address').value,
      outstandingBalance: parseFloat(document.getElementById('sup-balance').value) || 0
    };

    try {
      if (!idVal) {
        await purchases.addSupplier(data);
        showToast('New supplier profile registered.');
      } else {
        await purchases.updateSupplier(parseInt(idVal), data);
        showToast('Supplier profile updated.');
      }
      closeModal('supplier-modal');
      list = await purchases.getSuppliers();
      renderTable();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  document.getElementById('btn-add-supplier').onclick = () => openSupplierFormModal(null);
  searchIn.addEventListener('input', renderTable);

  renderTable();
}

// ==========================================
// 7. WORKER MANAGEMENT & payroll
// ==========================================
async function renderWorkers(container) {
  let workersList = await workers.getWorkers();
  const settingsData = await settings.getSettings();
  const currency = settingsData?.currency || 'INR';

  // We maintain calendar state for the visual spreadsheet attendance
  let calendarYearMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

  container.innerHTML = `
    <!-- Tabs Header -->
    <div class="flex gap-4 border-b border-zinc-800 mb-6 pb-px">
      <button id="tab-work-directory" class="pb-3 border-b-2 border-indigo-500 text-indigo-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none">Workers Profiles</button>
      <button id="tab-work-attendance" class="pb-3 border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none">Daily Attendance Spreadsheet</button>
      <button id="tab-work-salary" class="pb-3 border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none">Salary Payment Records</button>
    </div>

    <!-- Tab 1: Profiles -->
    <div id="panel-work-directory">
      <div class="panel-header mb-4">
        <h3 class="text-zinc-200">Shop Staff Cards</h3>
        <button id="btn-add-worker" class="btn btn-primary">+ Add New Worker</button>
      </div>
      <div class="workers-grid" id="workers-cards-grid">
        <!-- Dynamically populated -->
      </div>
    </div>

    <!-- Tab 2: Attendance Spreadsheet -->
    <div id="panel-work-attendance" class="panel hidden">
      <div class="attendance-month-header">
        <div class="flex items-center gap-2">
          <label for="attendance-month-selector" class="text-xs font-semibold uppercase text-zinc-400">Select Month:</label>
          <input type="month" id="attendance-month-selector" value="${calendarYearMonth}" class="w-[180px] h-[34px] p-1 font-bold text-indigo-400" style="background-color:rgba(0,0,0,0.3)">
        </div>
        <div class="flex gap-4 text-xs font-semibold">
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-emerald-500/20 border border-emerald-500 rounded block"></span> P: Present</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-rose-500/20 border border-rose-500 rounded block"></span> A: Absent</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-amber-500/20 border border-amber-500 rounded block"></span> H: Half Day</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-indigo-500/20 border border-indigo-500 rounded block"></span> L: Paid Leave</span>
        </div>
      </div>
      <div class="attendance-scroll-area">
        <table class="attendance-table">
          <thead id="attendance-table-head">
            <!-- Populated dynamically -->
          </thead>
          <tbody id="attendance-table-body">
            <!-- Populated dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 3: Salaries -->
    <div id="panel-work-salary" class="panel hidden">
      <div class="panel-header">
        <h3 class="text-zinc-200">Payroll Ledger Log</h3>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date Paid</th>
              <th>Worker Name</th>
              <th>Salary Month</th>
              <th>Disbursed Amount</th>
              <th>Payment Mode</th>
              <th>Reference/Notes</th>
            </tr>
          </thead>
          <tbody id="salary-payments-table-body">
            <!-- Populated dynamically -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Dynamic elements
  const tDir = document.getElementById('tab-work-directory');
  const tAtt = document.getElementById('tab-work-attendance');
  const tSal = document.getElementById('tab-work-salary');

  const pDir = document.getElementById('panel-work-directory');
  const pAtt = document.getElementById('panel-work-attendance');
  const pSal = document.getElementById('panel-work-salary');

  // Tab switch
  tDir.onclick = () => {
    tDir.className = 'pb-3 border-b-2 border-indigo-500 text-indigo-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    tAtt.className = 'pb-3 border-b-2 border-transparent text-zinc-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    tSal.className = 'pb-3 border-b-2 border-transparent text-zinc-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    pDir.classList.remove('hidden');
    pAtt.classList.add('hidden');
    pSal.classList.add('hidden');
  };

  tAtt.onclick = () => {
    tAtt.className = 'pb-3 border-b-2 border-indigo-500 text-indigo-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    tDir.className = 'pb-3 border-b-2 border-transparent text-zinc-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    tSal.className = 'pb-3 border-b-2 border-transparent text-zinc-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    pAtt.classList.remove('hidden');
    pDir.classList.add('hidden');
    pSal.classList.add('hidden');
    renderAttendanceGrid();
  };

  tSal.onclick = () => {
    tSal.className = 'pb-3 border-b-2 border-indigo-500 text-indigo-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    tDir.className = 'pb-3 border-b-2 border-transparent text-zinc-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    tAtt.className = 'pb-3 border-b-2 border-transparent text-zinc-400 font-bold text-sm bg-transparent border-0 cursor-pointer outline-none';
    pSal.classList.remove('hidden');
    pDir.classList.add('hidden');
    pAtt.classList.add('hidden');
    renderSalariesTable();
  };

  // Render staff cards
  function renderStaffCards() {
    const grid = document.getElementById('workers-cards-grid');
    if (workersList.length === 0) {
      grid.innerHTML = '<div class="col-span-full text-center text-zinc-500 py-10">No workers registered in your shop directories.</div>';
      return;
    }

    grid.innerHTML = workersList.map(w => `
      <div class="worker-card">
        <div class="worker-card-header">
          ${w.photo ? `<img src="${w.photo}" class="worker-card-avatar">` : `<div class="worker-card-avatar flex items-center justify-center font-bold text-xl bg-indigo-900/40 text-indigo-400 border border-indigo-800/60">${w.name.substring(0, 2).toUpperCase()}</div>`}
          <div class="worker-card-info">
            <span class="worker-card-name">${w.name}</span>
            <span class="worker-card-role">${w.type}</span>
          </div>
        </div>
        <div class="worker-card-body">
          <div class="worker-meta-item">
            <span class="worker-meta-label">Phone:</span>
            <span class="worker-meta-value">${w.phone}</span>
          </div>
          <div class="worker-meta-item">
            <span class="worker-meta-label">Base Salary:</span>
            <span class="worker-meta-value">${currency} ${w.salary.toFixed(2)}/mo</span>
          </div>
          <div class="worker-meta-item">
            <span class="worker-meta-label">Address:</span>
            <span class="worker-meta-value text-xs text-right max-w-[150px] truncate" title="${w.address}">${w.address || '-'}</span>
          </div>
          <div class="worker-meta-item">
            <span class="worker-meta-label">Joined:</span>
            <span class="worker-meta-value">${w.joiningDate}</span>
          </div>
          <div class="worker-meta-item">
            <span class="worker-meta-label">Status:</span>
            <span class="badge ${w.status === 'active' ? 'badge-success' : 'badge-danger'}">${w.status}</span>
          </div>
        </div>
        <div class="worker-card-footer">
          ${w.status === 'active' ? `<button class="btn btn-primary h-[30px] text-xs pay-salary" data-id="${w.id}">Disburse Salary</button>` : ''}
          <button class="btn-icon edit" data-id="${w.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete" data-id="${w.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    // Events triggers
    grid.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        openWorkerFormModal(id);
      });
    });

    grid.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const ok = await showConfirm('Delete Worker?', 'WARNING: This will permanently delete this worker profile, their attendance records, and their salary pay ledger history.');
        if (ok) {
          try {
            await workers.deleteWorker(id);
            showToast('Worker profile deleted.');
            workersList = await workers.getWorkers();
            renderStaffCards();
          } catch (err) {
            showToast(err.message, 'danger');
          }
        }
      });
    });

    grid.querySelectorAll('.pay-salary').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        openSalaryPaymentModal(id);
      });
    });
  }

  // Visual spreadsheet attendance calendar builder
  async function renderAttendanceGrid() {
    const head = document.getElementById('attendance-table-head');
    const body = document.getElementById('attendance-table-body');
    const monthSelect = document.getElementById('attendance-month-selector');
    
    calendarYearMonth = monthSelect.value;
    const [year, month] = calendarYearMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();

    // Get active workers
    const activeStaff = workersList.filter(w => w.status === 'active');
    if (activeStaff.length === 0) {
      head.innerHTML = '';
      body.innerHTML = '<tr><td class="text-center py-6 text-zinc-500">No active workers to display attendance.</td></tr>';
      return;
    }

    // Build Table Header (Headers are Days of Month 1 to N)
    let headHtml = `<tr><th class="sticky-col">Worker Name</th>`;
    for (let day = 1; day <= totalDays; day++) {
      headHtml += `<th style="text-align: center; font-size:0.75rem;">${day}</th>`;
    }
    headHtml += `</tr>`;
    head.innerHTML = headHtml;

    // Fetch month attendance records
    const attendanceLogs = await workers.getAttendanceForMonth(calendarYearMonth);
    const logsMap = {};
    attendanceLogs.forEach(l => {
      logsMap[`${l.date}_${l.workerId}`] = l.status;
    });

    // Build Rows
    let bodyHtml = '';
    activeStaff.forEach(w => {
      bodyHtml += `<tr><td class="sticky-col font-bold text-zinc-200">${w.name}</td>`;
      for (let day = 1; day <= totalDays; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${calendarYearMonth}-${dayStr}`;
        const status = logsMap[`${dateStr}_${w.id}`] || '';
        
        let cellClass = 'cell-empty';
        let cellText = '-';
        if (status === 'present') { cellClass = 'cell-present'; cellText = 'P'; }
        else if (status === 'absent') { cellClass = 'cell-absent'; cellText = 'A'; }
        else if (status === 'half_day') { cellClass = 'cell-half'; cellText = 'H'; }
        else if (status === 'paid_leave') { cellClass = 'cell-leave'; cellText = 'L'; }

        bodyHtml += `<td class="attendance-cell ${cellClass}" data-date="${dateStr}" data-worker-id="${w.id}" data-status="${status}">${cellText}</td>`;
      }
      bodyHtml += `</tr>`;
    });
    body.innerHTML = bodyHtml;

    // Click cycles attendance status: Empty -> Present -> Absent -> Half Day -> Paid Leave -> Empty
    body.querySelectorAll('.attendance-cell').forEach(cell => {
      cell.addEventListener('click', async () => {
        const date = cell.getAttribute('data-date');
        const wid = cell.getAttribute('data-worker-id');
        const current = cell.getAttribute('data-status');
        
        let next = '';
        let nextText = '-';
        let nextClass = 'cell-empty';

        if (current === '') { next = 'present'; nextText = 'P'; nextClass = 'cell-present'; }
        else if (current === 'present') { next = 'absent'; nextText = 'A'; nextClass = 'cell-absent'; }
        else if (current === 'absent') { next = 'half_day'; nextText = 'H'; nextClass = 'cell-half'; }
        else if (current === 'half_day') { next = 'paid_leave'; nextText = 'L'; nextClass = 'cell-leave'; }
        else if (current === 'paid_leave') { next = ''; nextText = '-'; nextClass = 'cell-empty'; }

        // Save to DB
        if (next) {
          await workers.saveAttendance(date, wid, next);
        } else {
          // Remove key from database if reset to blank
          await db.delete('attendance', `${date}_${wid}`);
        }

        cell.setAttribute('data-status', next);
        cell.innerText = nextText;
        cell.className = `attendance-cell ${nextClass}`;
        
        showToast(`Attendance updated: Day ${date.split('-')[2]} Status = ${next || 'Cleared'}`);
      });
    });
  }

  // Monthly Attendance selector listener
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'attendance-month-selector') {
      renderAttendanceGrid();
    }
  });

  // Render Payroll Ledger list
  async function renderSalariesTable() {
    const list = await workers.getSalaryPayments();
    const tbody = document.getElementById('salary-payments-table-body');
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-zinc-500 py-10">No salary payment receipts logged.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(s => `
      <tr>
        <td>${s.paymentDate}</td>
        <td class="font-bold text-zinc-200">${s.workerName}</td>
        <td class="font-semibold text-indigo-400">${s.paymentMonth}</td>
        <td class="font-bold">${currency} ${s.amountPaid.toFixed(2)}</td>
        <td><span class="badge badge-secondary">${s.paymentMethod}</span></td>
        <td class="text-zinc-400 font-sans text-xs">${s.notes || '-'}</td>
      </tr>
    `).join('');
  }

  // Add/Edit Worker Profile modal triggers
  const workerPhotoDropzone = document.getElementById('worker-photo-dropzone');
  const workerPhotoInput = document.getElementById('worker-photo-input');
  const workerPhotoPreview = document.getElementById('worker-photo-preview');
  const workerPhotoPlaceholder = document.getElementById('worker-photo-placeholder');
  const workerForm = document.getElementById('worker-form');

  const dragDropWorker = initDragAndDrop(workerPhotoDropzone, workerPhotoInput, workerPhotoPreview, workerPhotoPlaceholder);

  function openWorkerFormModal(id = null) {
    workerForm.reset();
    dragDropWorker.reset();

    if (!id) {
      document.getElementById('worker-modal-title').innerText = 'Add Worker Profile';
      document.getElementById('worker-id').value = '';
      document.getElementById('work-join').value = new Date().toISOString().split('T')[0];
    } else {
      document.getElementById('worker-modal-title').innerText = 'Edit Worker Details';
      const item = workersList.find(w => w.id === id);
      if (item) {
        document.getElementById('worker-id').value = item.id;
        document.getElementById('work-name').value = item.name;
        document.getElementById('work-phone').value = item.phone;
        document.getElementById('work-type').value = item.type;
        document.getElementById('work-salary').value = item.salary;
        document.getElementById('work-join').value = item.joiningDate;
        document.getElementById('work-status').value = item.status;
        document.getElementById('work-address').value = item.address;
        document.getElementById('work-notes').value = item.notes;
        dragDropWorker.setImage(item.photo);
      }
    }
    showModal('worker-modal');
  }

  workerForm.onsubmit = async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('worker-id').value;
    const data = {
      name: document.getElementById('work-name').value,
      phone: document.getElementById('work-phone').value,
      type: document.getElementById('work-type').value,
      salary: parseFloat(document.getElementById('work-salary').value),
      joiningDate: document.getElementById('work-join').value,
      status: document.getElementById('work-status').value,
      address: document.getElementById('work-address').value,
      notes: document.getElementById('work-notes').value,
      photo: dragDropWorker.getImage()
    };

    try {
      if (!idVal) {
        await workers.addWorker(data);
        showToast('Worker profile added successfully.');
      } else {
        await workers.updateWorker(parseInt(idVal), data);
        showToast('Worker details updated.');
      }
      closeModal('worker-modal');
      workersList = await workers.getWorkers();
      renderStaffCards();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Salary Payment disburse modal triggers
  const salaryForm = document.getElementById('salary-form');
  async function openSalaryPaymentModal(workerId) {
    salaryForm.reset();

    const activeMonth = new Date().toISOString().substring(0, 7); // current month YYYY-MM
    const stats = await workers.getWorkerStatsForMonth(workerId, activeMonth);

    document.getElementById('salary-worker-id').value = workerId;
    document.getElementById('salary-worker-name').innerText = stats.worker.name;
    document.getElementById('salary-base').innerText = `${currency} ${stats.worker.salary.toFixed(2)}`;
    document.getElementById('salary-month').value = activeMonth;
    
    document.getElementById('salary-attendance-desc').innerText = `Present: ${stats.present}, Leaves: ${stats.paidLeave}, Half-Days: ${stats.halfDay} (out of ${stats.daysInMonth} days)`;
    document.getElementById('salary-payable').innerText = `${currency} ${stats.calculatedSalary.toFixed(2)}`;
    document.getElementById('salary-due').innerText = `${currency} ${stats.remainingDue.toFixed(2)}`;
    
    // Default disburse amount input is remaining due
    document.getElementById('salary-amount').max = stats.remainingDue;
    document.getElementById('salary-amount').value = stats.remainingDue;

    showModal('salary-modal');
  }

  salaryForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const workerId = parseInt(document.getElementById('salary-worker-id').value);
    const dateVal = new Date().toISOString().split('T')[0];
    const amountVal = parseFloat(document.getElementById('salary-amount').value);
    const monthVal = document.getElementById('salary-month').value;
    const methodVal = document.getElementById('salary-method').value;
    const notesVal = document.getElementById('salary-notes').value.trim();

    try {
      await workers.payWorkerSalary({
        workerId,
        paymentDate: dateVal,
        amountPaid: amountVal,
        paymentMonth: monthVal,
        paymentMethod: methodVal,
        notes: notesVal
      });
      showToast('Salary disbursed and logged in expenses.');
      closeModal('salary-modal');
      workersList = await workers.getWorkers();
      renderStaffCards();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  document.getElementById('btn-add-worker').onclick = () => openWorkerFormModal(null);
  
  renderStaffCards();
}

// ==========================================
// 8. GENERAL BUSINESS EXPENSE LOGS
// ==========================================
async function renderExpenses(container) {
  let list = await expenses.getExpenses();
  const settingsData = await settings.getSettings();
  const currency = settingsData?.currency || 'INR';
  const categoriesList = expenses.getExpenseCategories();
  const catMap = {};
  categoriesList.forEach(c => { catMap[c.key] = c.name; });

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="exp-search" placeholder="Search expenses...">
        </div>
        <button id="btn-add-expense" class="btn btn-primary">+ Log Expense Outflow</button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date Spent</th>
              <th>Expense Category</th>
              <th>Amount Spent</th>
              <th>Notes / Details</th>
              <th style="width: 120px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="expenses-table-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = document.getElementById('expenses-table-body');
  const searchIn = document.getElementById('exp-search');

  function renderTable() {
    const q = searchIn.value.toLowerCase().trim();
    const filtered = list.filter(e => 
      e.notes.toLowerCase().includes(q) || 
      (catMap[e.category] && catMap[e.category].toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-zinc-500 py-10">No business expense outflows recorded.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(e => `
      <tr>
        <td>${e.date}</td>
        <td><span class="badge ${e.category === 'salaries' ? 'badge-success' : e.category === 'rent' ? 'badge-secondary' : 'badge-warning'}">${catMap[e.category] || e.category}</span></td>
        <td class="font-bold text-rose-500">${currency} ${e.amount.toFixed(2)}</td>
        <td class="text-zinc-400 font-sans text-xs" title="${e.notes}">${e.notes || '-'}</td>
        <td class="text-right">
          <!-- Salaries and raw material expenses are automated, prevent editing to preserve transactional link integrity -->
          ${e.category !== 'salaries' && !e.notes.includes('Supplier Purchase Bill') ? `
            <button class="btn-icon edit" data-id="${e.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon delete" data-id="${e.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          ` : '<span class="text-[0.65rem] text-zinc-500 uppercase font-sans tracking-wide">Locked</span>'}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        openExpenseFormModal(id);
      });
    });

    tbody.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const ok = await showConfirm('Delete Expense Record?', 'Are you sure? This will delete this expense line entry permanently.');
        if (ok) {
          await expenses.deleteExpense(id);
          showToast('Expense record deleted.');
          list = await expenses.getExpenses();
          renderTable();
        }
      });
    });
  }

  // Log Form Modal triggers
  const expFormModal = document.getElementById('expense-modal');
  const expForm = document.getElementById('expense-form');
  function openExpenseFormModal(id = null) {
    expForm.reset();
    if (!id) {
      document.getElementById('expense-modal-title').innerText = 'Log New Expense';
      document.getElementById('expense-id').value = '';
      document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
    } else {
      document.getElementById('expense-modal-title').innerText = 'Edit Expense Details';
      const item = list.find(e => e.id === id);
      if (item) {
        document.getElementById('expense-id').value = item.id;
        document.getElementById('exp-category').value = item.category;
        document.getElementById('exp-amount').value = item.amount;
        document.getElementById('exp-date').value = item.date;
        document.getElementById('exp-notes').value = item.notes;
      }
    }
    showModal('expense-modal');
  }

  expForm.onsubmit = async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('expense-id').value;
    const data = {
      category: document.getElementById('exp-category').value,
      amount: parseFloat(document.getElementById('exp-amount').value),
      date: document.getElementById('exp-date').value,
      notes: document.getElementById('exp-notes').value.trim()
    };

    try {
      if (!idVal) {
        await expenses.addExpense(data);
        showToast('Expense outflows logged.');
      } else {
        await expenses.updateExpense(parseInt(idVal), data);
        showToast('Expense details updated.');
      }
      closeModal('expense-modal');
      list = await expenses.getExpenses();
      renderTable();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  document.getElementById('btn-add-expense').onclick = () => openExpenseFormModal(null);
  searchIn.addEventListener('input', renderTable);

  renderTable();
}

// ==========================================
// 9. REPORTS & BUSINESS ANALYTICS
// ==========================================
async function renderReports(container) {
  const now = new Date();
  const settingsData = await settings.getSettings();
  const currency = settingsData?.currency || 'INR';

  let currentRange = 'monthly';

  // Build View Container
  container.innerHTML = `
    <!-- Top Selector Filter -->
    <div class="flex justify-between items-center flex-wrap gap-3 mb-6">
      <div class="flex items-center gap-2">
        <label for="reports-range-selector" class="text-xs font-semibold uppercase text-zinc-400">Timeframe:</label>
        <select id="reports-range-selector" class="w-[180px] h-[36px] font-bold text-indigo-400" style="background-color:rgba(0,0,0,0.3)">
          <option value="today">Today (Hourly)</option>
          <option value="weekly">This Week (Last 7 Days)</option>
          <option value="monthly" selected>This Month (Last 30 Days)</option>
          <option value="yearly">This Year (Last 12 Months)</option>
        </select>
      </div>
    </div>

    <!-- P&L Sheet -->
    <div class="panel mb-6 bg-zinc-900/40 border border-zinc-800" id="reports-pl-card">
      <!-- Injected by JS -->
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <div class="chart-card">
        <h3>Sales Revenue Trend</h3>
        <div class="chart-wrapper">
          <canvas id="reports-sales-chart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Expense Distribution Breakdown</h3>
        <div class="chart-wrapper">
          <canvas id="reports-expense-chart"></canvas>
        </div>
      </div>
    </div>
  `;

  // Draw reports tables and load charts dynamically
  async function refreshReports() {
    const selector = document.getElementById('reports-range-selector');
    if (selector) currentRange = selector.value;

    const pl = await reports.getProfitReportData(currentRange);

    const plContainer = document.getElementById('reports-pl-card');
    plContainer.innerHTML = `
      <div class="panel-header mb-4">
        <h3 class="text-zinc-200">Profit & Loss Statement (Estimated)</h3>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div class="p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-lg text-center">
          <span class="text-[0.65rem] uppercase text-zinc-400 font-semibold block mb-1">Gross Sales Revenue</span>
          <span class="text-lg font-bold text-emerald-400">${currency} ${pl.totalSalesGross.toFixed(2)}</span>
        </div>
        <div class="p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-lg text-center">
          <span class="text-[0.65rem] uppercase text-zinc-400 font-semibold block mb-1">Net Sales (Excl. Tax)</span>
          <span class="text-lg font-bold text-zinc-100">${currency} ${pl.netRevenue.toFixed(2)}</span>
        </div>
        <div class="p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-lg text-center">
          <span class="text-[0.65rem] uppercase text-zinc-400 font-semibold block mb-1">GST Collected</span>
          <span class="text-lg font-bold text-zinc-400">${currency} ${pl.taxCollected.toFixed(2)}</span>
        </div>
        <div class="p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-lg text-center">
          <span class="text-[0.65rem] uppercase text-zinc-400 font-semibold block mb-1">Cost of Goods (COGS)</span>
          <span class="text-lg font-bold text-amber-500">${currency} ${pl.cogs.toFixed(2)}</span>
        </div>
        <div class="p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-lg text-center">
          <span class="text-[0.65rem] uppercase text-zinc-400 font-semibold block mb-1">Net Profits</span>
          <span class="text-lg font-bold ${pl.netProfit >= 0 ? 'text-indigo-400' : 'text-rose-500'}">
            ${currency} ${pl.netProfit.toFixed(2)}
          </span>
          <span class="block text-[0.65rem] ${pl.netProfit >= 0 ? 'text-indigo-400/80' : 'text-rose-500/80'} font-semibold font-sans mt-1">Margin: ${pl.profitMargin}%</span>
        </div>
      </div>
    `;

    // Render Charts
    const salesData = await reports.getSalesReportData(currentRange);
    const expenseData = await reports.getExpenseReportData(currentRange);

    if (reportsSalesChart) reportsSalesChart.destroy();
    if (reportsExpenseChart) reportsExpenseChart.destroy();

    const ctxSales = document.getElementById('reports-sales-chart').getContext('2d');
    reportsSalesChart = new Chart(ctxSales, {
      type: 'line',
      data: salesData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#a1a1aa' } },
          x: { grid: { display: false }, ticks: { color: '#a1a1aa' } }
        }
      }
    });

    const ctxExpense = document.getElementById('reports-expense-chart').getContext('2d');
    reportsExpenseChart = new Chart(ctxExpense, {
      type: 'doughnut',
      data: expenseData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#a1a1aa', font: { family: 'Outfit' } }
          }
        }
      }
    });
  }

  // Range selector listener
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'reports-range-selector') {
      refreshReports();
    }
  });

  await refreshReports();
}

// ==========================================
// 10. SHOP CONFIGURATIONS (SETTINGS)
// ==========================================
async function renderSettings(container) {
  const shopData = await settings.getSettings();
  const username = sessionStorage.getItem('currentOwnerUser') || 'owner';
  const ownerRecord = await db.get('users', username);

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Panel 1: Shop Identity Configs -->
      <div class="panel">
        <h3 class="text-zinc-200 mb-4 border-b border-zinc-800 pb-3">Shop Identity & Invoice Template</h3>
        <form id="settings-shop-form" class="flex flex-col gap-4">
          
          <div class="form-group">
            <label for="set-name">Shop Name *</label>
            <input type="text" id="set-name" required value="${shopData?.shopName || ''}">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label for="set-phone">Phone Number *</label>
              <input type="text" id="set-phone" required value="${shopData?.phone || ''}">
            </div>
            <div class="form-group">
              <label for="set-gst">GST Number *</label>
              <input type="text" id="set-gst" required value="${shopData?.gstNumber || ''}">
            </div>
          </div>

          <div class="form-group">
            <label for="set-address">Shop Address *</label>
            <input type="text" id="set-address" required value="${shopData?.address || ''}">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label for="set-currency">Currency Code *</label>
              <select id="set-currency" required>
                <option value="INR" ${shopData?.currency === 'INR' ? 'selected' : ''}>INR (₹)</option>
                <option value="USD" ${shopData?.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                <option value="EUR" ${shopData?.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                <option value="GBP" ${shopData?.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="set-tax">Global Default GST % *</label>
              <input type="number" id="set-tax" required min="0" step="0.01" value="${shopData?.taxPercentage || '5'}">
            </div>
          </div>

          <div class="form-group">
            <label for="set-header">Invoice Header Messages</label>
            <textarea id="set-header" rows="2">${shopData?.invoiceHeader || ''}</textarea>
          </div>

          <div class="form-group">
            <label for="set-footer">Invoice Footer Messages</label>
            <textarea id="set-footer" rows="2">${shopData?.invoiceFooter || ''}</textarea>
          </div>

          <button type="submit" class="btn btn-primary mt-2">Update Shop Details</button>
        </form>
      </div>

      <!-- Panel 2: Credentials Security Config -->
      <div class="flex flex-col gap-6">
        <div class="panel">
          <h3 class="text-zinc-200 mb-4 border-b border-zinc-800 pb-3">Update Owner Credentials</h3>
          <form id="settings-owner-form" class="flex flex-col gap-4">
            
            <div class="form-group">
              <label for="set-username">Username *</label>
              <input type="text" id="set-username" required value="${username}">
            </div>

            <div class="form-group">
              <label for="set-password">New Password</label>
              <input type="password" id="set-password" placeholder="Leave blank to keep existing password" autocomplete="new-password">
            </div>

            <div class="form-group">
              <label for="set-question">Security Question *</label>
              <input type="text" id="set-question" required value="${ownerRecord?.securityQuestion || 'What is the name of your first school?'}">
            </div>

            <div class="form-group">
              <label for="set-answer">Security Question Answer</label>
              <input type="text" id="set-answer" placeholder="Leave blank to keep existing answer">
            </div>

            <button type="submit" class="btn btn-primary mt-2">Save Login Credentials</button>
          </form>
        </div>

        <div class="panel">
          <h3 class="text-zinc-200 mb-4 border-b border-zinc-800 pb-3">Aesthetic Configuration</h3>
          <div class="flex justify-between items-center">
            <span class="text-sm font-semibold text-zinc-300">Theme Interface Colors</span>
            <div class="pos-payment-selector w-[180px]">
              <button class="pos-pay-btn ${shopData?.theme === 'dark' ? 'active' : ''}" id="btn-theme-dark">DARK</button>
              <button class="pos-pay-btn ${shopData?.theme === 'light' ? 'active' : ''}" id="btn-theme-light">LIGHT</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  // Shop settings form submission
  document.getElementById('settings-shop-form').onsubmit = async (e) => {
    e.preventDefault();
    const updated = {
      shopName: document.getElementById('set-name').value,
      phone: document.getElementById('set-phone').value,
      gstNumber: document.getElementById('set-gst').value,
      address: document.getElementById('set-address').value,
      currency: document.getElementById('set-currency').value,
      taxPercentage: parseFloat(document.getElementById('set-tax').value),
      invoiceHeader: document.getElementById('set-header').value,
      invoiceFooter: document.getElementById('set-footer').value
    };

    try {
      await settings.updateSettings(updated);
      showToast('Shop identity and templates saved.');
      
      // Update sidebar shop name visually
      document.getElementById('sidebar-shop-name').innerText = updated.shopName;
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Owner credentials change form submission
  document.getElementById('settings-owner-form').onsubmit = async (e) => {
    e.preventDefault();
    const user = document.getElementById('set-username').value.trim();
    const pass = document.getElementById('set-password').value;
    const question = document.getElementById('set-question').value.trim();
    const answer = document.getElementById('set-answer').value;

    try {
      const res = await auth.updateOwnerProfile(user, pass, question, answer);
      if (res.success) {
        showToast('Login credentials updated successfully.');
        document.getElementById('set-password').value = '';
        document.getElementById('set-answer').value = '';
      } else {
        showToast(res.message, 'danger');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Theme controls inside settings page
  const darkBtn = document.getElementById('btn-theme-dark');
  const lightBtn = document.getElementById('btn-theme-light');

  darkBtn.onclick = async () => {
    darkBtn.classList.add('active');
    lightBtn.classList.remove('active');
    await settings.updateSettings({ theme: 'dark' });
    showToast('Applied Obsidian Dark Glow theme.');
  };

  lightBtn.onclick = async () => {
    lightBtn.classList.add('active');
    darkBtn.classList.remove('active');
    await settings.updateSettings({ theme: 'light' });
    showToast('Applied Ice Glass Light theme.');
  };
}

// ==========================================
// 11. DATA BACKUP & RESTORE PANEL
// ==========================================
async function renderBackup(container) {
  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Export Panel -->
      <div class="panel text-center flex flex-col justify-center items-center py-10">
        <svg class="h-16 w-16 text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/></svg>
        <h3 class="text-zinc-200 mb-2">Download Shop Data Report</h3>
        <p class="text-zinc-400 text-sm max-w-[320px] mb-6">Generate a comprehensive PDF audit report containing products catalog, raw materials inventory, outstanding supplier dues, active staff list, and recent POS invoice logs.</p>
        <button id="btn-export" class="btn btn-primary w-[200px] h-[44px] text-md font-bold">Download PDF Report</button>
      </div>

      <!-- Import Panel -->
      <div class="panel text-center flex flex-col justify-center items-center py-10">
        <svg class="h-16 w-16 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
        <h3 class="text-zinc-200 mb-2">Restore Backup File</h3>
        <p class="text-zinc-400 text-sm max-w-[320px] mb-6">Select a previously exported SweetShop ERP JSON backup file. WARNING: Importing will completely replace all existing records in your system.</p>
        
        <input type="file" id="import-file-input" class="hidden" accept=".json">
        <button id="btn-import-trigger" class="btn btn-secondary w-[200px] h-[44px] text-md font-bold">Choose Backup File</button>
        <div id="import-file-selected" class="text-xs text-indigo-400 font-semibold mt-2 hidden">No file selected</div>
        <button id="btn-import" class="btn btn-danger w-[200px] h-[40px] mt-4 font-bold hidden">Restore Database</button>
      </div>

    </div>
  `;

  const exportBtn = document.getElementById('btn-export');
  const importTriggerBtn = document.getElementById('btn-import-trigger');
  const importInput = document.getElementById('import-file-input');
  const importSelectedText = document.getElementById('import-file-selected');
  const importConfirmBtn = document.getElementById('btn-import');

  // Trigger export
  exportBtn.onclick = async () => {
    try {
      await backup.exportDatabase();
      showToast('Shop data report PDF download started.');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Trigger file dialog
  importTriggerBtn.onclick = () => importInput.click();

  importInput.onchange = () => {
    const file = importInput.files[0];
    if (file) {
      importSelectedText.innerText = `Selected: ${file.name}`;
      importSelectedText.classList.remove('hidden');
      importConfirmBtn.classList.remove('hidden');
    } else {
      importSelectedText.classList.add('hidden');
      importConfirmBtn.classList.add('hidden');
    }
  };

  // Restore Database trigger
  importConfirmBtn.onclick = async () => {
    const file = importInput.files[0];
    if (!file) return;

    const ok = await showConfirm(
      'RESTORE DATABASE WARNING!',
      'Are you absolutely sure you want to proceed? This will destroy all current records and restore data from this backup file. This action is irreversible.'
    );

    if (ok) {
      try {
        await backup.importDatabase(file);
        showToast('Database restored successfully! Reloading...');
        
        // Clear imports selections
        importInput.value = '';
        importSelectedText.classList.add('hidden');
        importConfirmBtn.classList.add('hidden');

        // Instantly reload app to re-sync state
        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  };
}

// ==========================================
// AUTHENTICATOR SCREENS CONTROLLER
// ==========================================
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');

function showAuthScreen(show) {
  if (show) {
    authScreen.classList.remove('hidden');
    appContainer.classList.add('hidden');
  } else {
    authScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');
  }
}

async function initAuthentication() {
  const loginForm = document.getElementById('login-form');
  const recoveryForm = document.getElementById('recovery-form');
  const forgotLink = document.getElementById('forgot-password-link');
  const backLink = document.getElementById('back-to-login-link');
  const fetchQuestionBtn = document.getElementById('btn-fetch-question');
  const securityBlock = document.getElementById('security-question-block');

  // Toggle Forgot Password Form
  forgotLink.onclick = (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    recoveryForm.classList.remove('hidden');
    securityBlock.classList.add('hidden');
    recoveryForm.reset();
  };

  backLink.onclick = (e) => {
    e.preventDefault();
    recoveryForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    loginForm.reset();
  };

  // Fetch security question
  fetchQuestionBtn.onclick = async () => {
    const username = document.getElementById('recovery-username').value.trim();
    if (!username) {
      showToast('Please type your username first.', 'warning');
      return;
    }
    const res = await auth.getSecurityQuestion(username);
    if (res.success) {
      document.getElementById('display-security-question').innerText = res.question;
      securityBlock.classList.remove('hidden');
    } else {
      showToast(res.message, 'danger');
    }
  };

  // Reset password submit
  recoveryForm.onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('recovery-username').value.trim();
    const answer = document.getElementById('recovery-answer').value;
    const newPass = document.getElementById('recovery-new-password').value;

    try {
      const res = await auth.resetPassword(username, answer, newPass);
      if (res.success) {
        showToast('Password reset successful. Logging in now...');
        // Perform log in
        await auth.login(username, newPass);
        
        // Navigate to dashboard
        showAuthScreen(false);
        await initApplicationSession();
      } else {
        showToast(res.message, 'danger');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Standard Login Submit
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;

    const res = await auth.login(user, pass);
    if (res.success) {
      showToast('Signed in successfully.');
      showAuthScreen(false);
      await initApplicationSession();
    } else {
      showToast(res.message, 'danger');
    }
  };

  // Logout Click
  document.getElementById('btn-logout').onclick = async () => {
    const ok = await showConfirm('Logout?', 'Are you sure you want to end your current session?');
    if (ok) {
      auth.logout();
      showToast('Signed out.');
      showAuthScreen(true);
    }
  };

  // Check if session is already active (reload recovery)
  if (auth.checkSession()) {
    showAuthScreen(false);
    await initApplicationSession();
  } else {
    showAuthScreen(true);
  }
}

// ==========================================
// APPLICATION LIFECYCLE INITIALIZER
// ==========================================
async function initApplicationSession() {
  // Sync global settings layout
  const shopData = await settings.getSettings();
  if (shopData) {
    document.getElementById('sidebar-shop-name').innerText = shopData.shopName;
    settings.applyTheme(shopData.theme);
    
    // Sync active settings theme toggler headers
    const darkToggle = document.querySelector('#btn-theme-toggle .moon-icon');
    const lightToggle = document.querySelector('#btn-theme-toggle .sun-icon');
    if (shopData.theme === 'light') {
      darkToggle.classList.add('hidden');
      lightToggle.classList.remove('hidden');
    } else {
      darkToggle.classList.remove('hidden');
      lightToggle.classList.add('hidden');
    }
  }

  // Load router views
  const router = () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    if (views[hash]) {
      navigate(hash);
    } else {
      navigate('dashboard');
    }
  };

  window.addEventListener('hashchange', router);

  // Intercept hash link clicks to avoid security origin warnings under file:// protocol
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const viewName = href.slice(1);
        if (views[viewName]) {
          e.preventDefault();
          navigate(viewName);
          history.replaceState(null, null, '#' + viewName);
        }
      }
    }
  });

  router(); // trigger initial load
}

// Global visual theme switch headers
document.getElementById('btn-theme-toggle').onclick = async () => {
  const shopData = await settings.getSettings();
  const currentTheme = shopData?.theme || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  await settings.updateSettings({ theme: newTheme });
  
  const darkToggle = document.querySelector('#btn-theme-toggle .moon-icon');
  const lightToggle = document.querySelector('#btn-theme-toggle .sun-icon');
  if (newTheme === 'light') {
    darkToggle.classList.add('hidden');
    lightToggle.classList.remove('hidden');
    showToast('Applied Ice Glass Light theme.');
  } else {
    darkToggle.classList.remove('hidden');
    lightToggle.classList.add('hidden');
    showToast('Applied Obsidian Dark Glow theme.');
  }
};

// Global Notifications Dropdown toggle
document.getElementById('btn-notifications').onclick = () => {
  document.getElementById('notification-dropdown').classList.toggle('hidden');
};

// Close notifications click outside
document.addEventListener('click', (e) => {
  const notifArea = document.querySelector('.notification-wrapper');
  if (notifArea && !notifArea.contains(e.target)) {
    document.getElementById('notification-dropdown').classList.add('hidden');
  }
});

// Setup OK/Cancel confirm listeners
document.getElementById('btn-confirm-cancel').onclick = () => handleConfirmClose(false);
document.getElementById('btn-confirm-ok').onclick = () => handleConfirmClose(true);

// Start
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Initialize DB
    await db.init();
    
    // 2. Setup standard modals backdrop closures
    initModalCloseHandlers();
    
    // 3. Initialize Authentication session checks
    await initAuthentication();
    
  } catch (err) {
    console.error('Boot failure:', err);
    alert(`System boot failure: ${err.message}`);
  }
});
