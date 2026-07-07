// Reports & Analytics Calculation Layer (CORS-friendly for file:// protocol)

// Get sales records within a date range
async function getSalesInRange(startDate, endDate) {
  const sales = await db.getAll('sales');
  return sales.filter(s => {
    const saleDate = new Date(s.timestamp);
    return saleDate >= startDate && saleDate <= endDate;
  });
}

// Get expenses within a date range
async function getExpensesInRange(startDate, endDate) {
  const expenses = await db.getAll('expenses');
  return expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate >= startDate && expenseDate <= endDate;
  });
}

// Get purchases within a date range
async function getPurchasesInRange(startDate, endDate) {
  const purchases = await db.getAll('purchases');
  return purchases.filter(p => {
    const purchaseDate = new Date(p.date);
    return purchaseDate >= startDate && purchaseDate <= endDate;
  });
}

// Helper: Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// 1. Sales trends report
async function getSalesReportData(timeframe = 'weekly') {
  const now = new Date();
  let startDate;
  let labelFormatFn;
  let labels = [];
  const salesMap = {};

  if (timeframe === 'today') {
    // Today hourly
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < 24; i++) {
      const label = `${String(i).padStart(2, '0')}:00`;
      labels.push(label);
      salesMap[label] = 0;
    }
    labelFormatFn = (date) => `${String(date.getHours()).padStart(2, '0')}:00`;
  } else if (timeframe === 'weekly') {
    // Last 7 days
    startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      labels.push(label);
      salesMap[label] = 0;
    }
    labelFormatFn = (date) => date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } else if (timeframe === 'monthly') {
    // Last 30 days
    startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      labels.push(label);
      salesMap[label] = 0;
    }
    labelFormatFn = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else if (timeframe === 'yearly') {
    // Last 12 months
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      labels.push(label);
      salesMap[label] = 0;
    }
    labelFormatFn = (date) => date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  }

  const sales = await getSalesInRange(startDate, now);
  sales.forEach(sale => {
    const key = labelFormatFn(new Date(sale.timestamp));
    if (salesMap[key] !== undefined) {
      salesMap[key] += sale.grandTotal;
    }
  });

  return {
    labels,
    datasets: [
      {
        label: 'Sales Revenue',
        data: labels.map(l => parseFloat(salesMap[l].toFixed(2))),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };
}

// 2. Expense Category breakdown
async function getExpenseReportData(timeframe = 'monthly') {
  const now = new Date();
  let startDate;
  
  if (timeframe === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeframe === 'weekly') {
    startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else if (timeframe === 'monthly') {
    startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else if (timeframe === 'yearly') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }

  const expenses = await getExpensesInRange(startDate, now);
  
  const categoryMap = {
    electricity: 0,
    rent: 0,
    gas: 0,
    salaries: 0,
    packaging: 0,
    transport: 0,
    maintenance: 0,
    miscellaneous: 0
  };

  expenses.forEach(exp => {
    if (categoryMap[exp.category] !== undefined) {
      categoryMap[exp.category] += exp.amount;
    } else {
      categoryMap.miscellaneous += exp.amount;
    }
  });

  const categories = [
    { key: 'electricity', name: 'Electricity' },
    { key: 'rent', name: 'Shop Rent' },
    { key: 'gas', name: 'Gas & Fuel' },
    { key: 'salaries', name: 'Salaries' },
    { key: 'packaging', name: 'Packaging' },
    { key: 'transport', name: 'Transport' },
    { key: 'maintenance', name: 'Maintenance' },
    { key: 'miscellaneous', name: 'Miscellaneous' }
  ];

  const labels = categories.map(c => c.name);
  const data = categories.map(c => parseFloat(categoryMap[c.key].toFixed(2)));

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: [
          '#ef4444', // electricity (red)
          '#3b82f6', // rent (blue)
          '#f59e0b', // gas (amber)
          '#10b981', // salaries (emerald)
          '#8b5cf6', // packaging (violet)
          '#06b6d4', // transport (cyan)
          '#ec4899', // maintenance (pink)
          '#6b7280'  // miscellaneous (gray)
        ]
      }
    ]
  };
}

// 3. Profit & Loss analysis
async function getProfitReportData(timeframe = 'monthly') {
  const now = new Date();
  let startDate;

  if (timeframe === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeframe === 'weekly') {
    startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else if (timeframe === 'monthly') {
    startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else if (timeframe === 'yearly') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }

  const sales = await getSalesInRange(startDate, now);
  const expenses = await getExpensesInRange(startDate, now);
  
  // Calculate total revenue, tax collected, and COGS (Cost of Goods Sold)
  let totalRevenue = 0;
  let taxCollected = 0;
  let costOfGoods = 0;

  // For products sold, estimate purchase price as COGS if set.
  // We can fetch products dynamically.
  const products = await db.getAll('products');
  const prodMap = {};
  products.forEach(p => {
    prodMap[p.id] = p.purchasePrice || 0;
  });

  sales.forEach(sale => {
    totalRevenue += (sale.grandTotal - sale.taxTotal); // net revenue post tax
    taxCollected += sale.taxTotal;
    
    sale.items.forEach(item => {
      const unitPurchaseCost = prodMap[item.productId] || 0;
      costOfGoods += (unitPurchaseCost * item.quantity);
    });
  });

  // Total operating expenses (rent, electricity, salaries, etc.)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const netProfit = totalRevenue - costOfGoods - totalExpenses;

  return {
    totalSalesGross: parseFloat((totalRevenue + taxCollected).toFixed(2)),
    netRevenue: parseFloat(totalRevenue.toFixed(2)),
    taxCollected: parseFloat(taxCollected.toFixed(2)),
    cogs: parseFloat(costOfGoods.toFixed(2)),
    operatingExpenses: parseFloat(totalExpenses.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    profitMargin: totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0
  };
}

// 4. Best Selling Products
async function getBestSellingProducts(limit = 5) {
  const sales = await db.getAll('sales');
  const productQuantityMap = {};
  const productNameMap = {};
  const productRevenueMap = {};

  sales.forEach(sale => {
    sale.items.forEach(item => {
      const pid = item.productId;
      productQuantityMap[pid] = (productQuantityMap[pid] || 0) + item.quantity;
      productNameMap[pid] = item.name;
      productRevenueMap[pid] = (productRevenueMap[pid] || 0) + item.total;
    });
  });

  const productIds = Object.keys(productQuantityMap);
  const list = productIds.map(pid => ({
    id: parseInt(pid),
    name: productNameMap[pid],
    quantitySold: productQuantityMap[pid],
    revenueGenerated: parseFloat(productRevenueMap[pid].toFixed(2))
  }));

  // Sort by quantity sold descending
  return list.sort((a, b) => b.quantitySold - a.quantitySold).slice(0, limit);
}

// 5. Stock status alerts
async function getStockStatusSummary() {
  const products = await db.getAll('products');
  const rawMaterials = await db.getAll('raw_materials');

  const lowStockProducts = products.filter(p => p.status === 'active' && p.stock <= p.minStock);
  const lowStockRawMaterials = rawMaterials.filter(r => r.stock <= r.minStock);

  return {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.status === 'active').length,
    lowStockProductsCount: lowStockProducts.length,
    lowStockProducts,
    totalRawMaterials: rawMaterials.length,
    lowStockRawCount: lowStockRawMaterials.length,
    lowStockRawMaterials
  };
}

// Expose globally
window.reports = {
  getSalesInRange,
  getExpensesInRange,
  getPurchasesInRange,
  formatDate,
  getSalesReportData,
  getExpenseReportData,
  getProfitReportData,
  getBestSellingProducts,
  getStockStatusSummary
};
