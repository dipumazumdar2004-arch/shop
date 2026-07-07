// Data Backup & Audit Report Exporter Layer (CORS-friendly for file:// protocol)

async function exportDatabase() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Read all tables from database
  const settingsData = await db.get('settings', 'shop_settings');
  const shopName = settingsData?.shopName || 'Sweet Delight Palace';
  const currency = settingsData?.currency || 'INR';

  const productsList = await db.getAll('products');
  const categoriesList = await db.getAll('categories');
  const rawMaterials = await db.getAll('raw_materials');
  const suppliersList = await db.getAll('suppliers');
  const workersList = await db.getAll('workers');
  const salesList = await db.getAll('sales');
  const expensesList = await db.getAll('expenses');
  
  let y = 20;

  // Helper to check page end and add page
  const checkPage = (needed) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
      return true;
    }
    return false;
  };
  
  // Title / Header
  doc.setFontSize(22);
  doc.setFont('Helvetica', 'bold');
  doc.text('SWEET SHOP DATA SUMMARY REPORT', 20, y);
  y += 8;
  
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, y);
  doc.text(`Shop Name: ${shopName}`, 120, y);
  y += 10;
  
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 12;

  // Executive Summary Card
  doc.setFillColor(245, 247, 250);
  doc.rect(20, y, 170, 45, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('EXECUTIVE SUMMARY', 25, y + 8);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Sweets Cataloged: ${productsList.length}`, 25, y + 16);
  doc.text(`Total Categories: ${categoriesList.length}`, 25, y + 23);
  doc.text(`Ingredients in Inventory: ${rawMaterials.length}`, 25, y + 30);
  doc.text(`Staff Count (Active): ${workersList.filter(w => w.status === 'active').length}`, 25, y + 37);

  const totalRevenue = salesList.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
  doc.text(`Total Sales Revenue: ${currency} ${totalRevenue.toFixed(2)}`, 105, y + 16);
  doc.text(`Total Expense Outflow: ${currency} ${totalExpenses.toFixed(2)}`, 105, y + 23);
  const totalDues = suppliersList.reduce((sum, s) => sum + s.outstandingBalance, 0);
  doc.text(`Total Supplier Dues: ${currency} ${totalDues.toFixed(2)}`, 105, y + 30);
  y += 55;

  // Section 1: Products List
  checkPage(40);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('1. SWEETS PRODUCTS CATALOG', 20, y);
  y += 8;
  
  doc.setFillColor(235, 238, 243);
  doc.rect(20, y, 170, 8, 'F');
  doc.setFontSize(9);
  doc.text('SKU', 22, y + 5.5);
  doc.text('Product Name', 60, y + 5.5);
  doc.text('Selling Price', 120, y + 5.5);
  doc.text('Current Stock', 150, y + 5.5);
  y += 8;
  
  doc.setFont('Helvetica', 'normal');
  productsList.forEach(p => {
    checkPage(10);
    doc.text(p.sku || '-', 22, y + 6);
    doc.text(p.name, 60, y + 6);
    doc.text(`${currency} ${p.sellingPrice.toFixed(2)}`, 120, y + 6);
    doc.text(`${p.stock} ${p.unit}`, 150, y + 6);
    y += 8;
  });
  y += 10;

  // Section 2: Raw Ingredients Inventory
  checkPage(40);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('2. RAW INGREDIENTS INVENTORY', 20, y);
  y += 8;
  
  doc.setFillColor(235, 238, 243);
  doc.rect(20, y, 170, 8, 'F');
  doc.setFontSize(9);
  doc.text('Ingredient Name', 22, y + 5.5);
  doc.text('Stock Level', 110, y + 5.5);
  doc.text('Alert Threshold', 150, y + 5.5);
  y += 8;
  
  doc.setFont('Helvetica', 'normal');
  rawMaterials.forEach(m => {
    checkPage(10);
    doc.text(m.name, 22, y + 6);
    doc.text(`${m.stock.toFixed(2)} ${m.unit}`, 110, y + 6);
    doc.text(`${m.minStock.toFixed(2)} ${m.unit}`, 150, y + 6);
    y += 8;
  });
  y += 10;

  // Section 3: Suppliers outstanding
  checkPage(40);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('3. SUPPLIERS DIRECTORY', 20, y);
  y += 8;
  
  doc.setFillColor(235, 238, 243);
  doc.rect(20, y, 170, 8, 'F');
  doc.setFontSize(9);
  doc.text('Supplier/Company', 22, y + 5.5);
  doc.text('Contact Phone', 90, y + 5.5);
  doc.text('Outstanding Balance', 140, y + 5.5);
  y += 8;
  
  doc.setFont('Helvetica', 'normal');
  suppliersList.forEach(s => {
    checkPage(10);
    doc.text(s.name, 22, y + 6);
    doc.text(s.phone || '-', 90, y + 6);
    doc.text(`${currency} ${s.outstandingBalance.toFixed(2)}`, 140, y + 6);
    y += 8;
  });
  y += 10;

  // Section 4: Worker staff list
  checkPage(40);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('4. SHOP STAFF & WORKERS', 20, y);
  y += 8;
  
  doc.setFillColor(235, 238, 243);
  doc.rect(20, y, 170, 8, 'F');
  doc.setFontSize(9);
  doc.text('Staff Name', 22, y + 5.5);
  doc.text('Role/Type', 80, y + 5.5);
  doc.text('Salary', 120, y + 5.5);
  doc.text('Status', 160, y + 5.5);
  y += 8;
  
  doc.setFont('Helvetica', 'normal');
  workersList.forEach(w => {
    checkPage(10);
    doc.text(w.name, 22, y + 6);
    doc.text(w.type, 80, y + 6);
    doc.text(`${currency} ${w.salary.toFixed(2)}`, 120, y + 6);
    doc.text(w.status.toUpperCase(), 160, y + 6);
    y += 8;
  });
  y += 10;

  // Section 5: Recent Transactions Log
  checkPage(40);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('5. RECENT POS BILLS SUMMARY', 20, y);
  y += 8;
  
  doc.setFillColor(235, 238, 243);
  doc.rect(20, y, 170, 8, 'F');
  doc.setFontSize(9);
  doc.text('Invoice No', 22, y + 5.5);
  doc.text('Date & Time', 60, y + 5.5);
  doc.text('Method', 120, y + 5.5);
  doc.text('Grand Total', 150, y + 5.5);
  y += 8;
  
  doc.setFont('Helvetica', 'normal');
  const recentSales = salesList.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);
  recentSales.forEach(s => {
    checkPage(10);
    doc.text(s.invoiceNumber, 22, y + 6);
    doc.text(new Date(s.timestamp).toLocaleString(), 60, y + 6);
    doc.text(s.paymentMethod.toUpperCase(), 120, y + 6);
    doc.text(`${currency} ${s.grandTotal.toFixed(2)}`, 150, y + 6);
    y += 8;
  });
  
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`SweetShop_DataReport_${dateStr}.pdf`);
  return true;
}

async function importDatabase(jsonFile) {
  const STORES = [
    'users',
    'settings',
    'categories',
    'products',
    'raw_materials',
    'raw_material_logs',
    'recipes',
    'suppliers',
    'purchases',
    'sales',
    'workers',
    'attendance',
    'salary_payments',
    'expenses'
  ];

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        
        // Basic schema verification
        const hasSomeStores = STORES.some(storeName => backupData[storeName] !== undefined);
        if (!hasSomeStores) {
          throw new Error('Invalid backup file. Missing required data stores.');
        }

        // Wipe existing records
        await db.wipeDatabase();

        // Restore each store
        for (const storeName of STORES) {
          const records = backupData[storeName];
          if (records && Array.isArray(records)) {
            for (const record of records) {
              await db.put(storeName, record);
            }
          }
        }

        // Re-verify settings are populated. If not, reinitialize defaults.
        await db.prepopulateIfEmpty();

        resolve({ success: true });
      } catch (err) {
        reject(new Error(`Failed to restore backup: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Error reading the backup file.'));
    reader.readAsText(jsonFile);
  });
}

// Expose globally
window.backup = {
  exportDatabase,
  importDatabase
};
