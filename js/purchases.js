// Supplier & Purchases Management Layer (CORS-friendly for file:// protocol)

// Suppliers Operations
async function getSuppliers() {
  return await db.getAll('suppliers');
}

async function getSupplier(id) {
  return await db.get('suppliers', id);
}

async function addSupplier({ name, phone, email, address, gstNumber, outstandingBalance = 0 }) {
  if (!name || name.trim() === '') throw new Error('Supplier name is required');
  
  const suppliersList = await getSuppliers();
  if (suppliersList.some(s => s.name.toLowerCase() === name.toLowerCase().trim())) {
    throw new Error(`Supplier "${name}" already exists.`);
  }

  const supplier = {
    name: name.trim(),
    phone: phone || '',
    email: email || '',
    address: address || '',
    gstNumber: gstNumber || '',
    outstandingBalance: parseFloat(outstandingBalance) || 0,
    createdAt: new Date().toISOString()
  };

  return await db.add('suppliers', supplier);
}

async function updateSupplier(id, supplierData) {
  const supplier = await db.get('suppliers', id);
  if (!supplier) throw new Error('Supplier not found');

  const suppliersList = await getSuppliers();
  if (supplierData.name && supplierData.name.toLowerCase().trim() !== supplier.name.toLowerCase() &&
      suppliersList.some(s => s.name.toLowerCase() === supplierData.name.toLowerCase().trim())) {
    throw new Error(`Supplier "${supplierData.name}" already exists.`);
  }

  const updatedSupplier = {
    ...supplier,
    name: supplierData.name ? supplierData.name.trim() : supplier.name,
    phone: supplierData.phone !== undefined ? supplierData.phone : supplier.phone,
    email: supplierData.email !== undefined ? supplierData.email : supplier.email,
    address: supplierData.address !== undefined ? supplierData.address : supplier.address,
    gstNumber: supplierData.gstNumber !== undefined ? supplierData.gstNumber : supplier.gstNumber,
    outstandingBalance: supplierData.outstandingBalance !== undefined ? parseFloat(supplierData.outstandingBalance) : supplier.outstandingBalance
  };

  return await db.put('suppliers', updatedSupplier);
}

async function paySupplierBalance(supplierId, paymentAmount, paymentMethod = 'Cash', notes = '') {
  const supplier = await db.get('suppliers', supplierId);
  if (!supplier) throw new Error('Supplier not found');

  const amount = parseFloat(paymentAmount);
  if (isNaN(amount) || amount <= 0) throw new Error('Payment amount must be greater than zero');

  supplier.outstandingBalance = parseFloat((supplier.outstandingBalance - amount).toFixed(2));
  await db.put('suppliers', supplier);

  // We should write this into expenses under 'Supplier Payment' or similar so the outflow is tracked.
  // And it keeps records accurate.
  await db.add('expenses', {
    category: 'miscellaneous',
    amount: amount,
    date: new Date().toISOString().split('T')[0],
    notes: `Paid Supplier: ${supplier.name}. Method: ${paymentMethod}. ${notes}`
  });

  return supplier;
}

async function deleteSupplier(id) {
  // Check if supplier has any purchases
  const purchasesList = await db.getAll('purchases');
  const hasPurchases = purchasesList.some(p => p.supplierId === id);
  if (hasPurchases) {
    throw new Error('Cannot delete supplier. They have purchase records. Archive them or set outstanding balance to 0.');
  }
  return await db.delete('suppliers', id);
}

// Purchases Operations
async function getPurchases() {
  return await db.getAll('purchases');
}

async function addPurchase({ supplierId, date, items, totalAmount, amountPaid, invoiceNumber }) {
  // items = [{ rawMaterialId, quantity, purchasePrice }]
  if (!supplierId) throw new Error('Supplier is required');
  if (!items || items.length === 0) throw new Error('At least one raw material item is required');

  const supplier = await db.get('suppliers', parseInt(supplierId));
  if (!supplier) throw new Error('Selected supplier does not exist');

  const total = parseFloat(totalAmount);
  const paid = parseFloat(amountPaid) || 0;
  const balance = parseFloat((total - paid).toFixed(2));

  // Create Purchase record
  const purchase = {
    supplierId: parseInt(supplierId),
    supplierName: supplier.name,
    date: date || new Date().toISOString().split('T')[0],
    items: items.map(i => ({
      rawMaterialId: parseInt(i.rawMaterialId),
      quantity: parseFloat(i.quantity),
      purchasePrice: parseFloat(i.purchasePrice)
    })),
    totalAmount: total,
    amountPaid: paid,
    invoiceNumber: invoiceNumber || '',
    timestamp: new Date().toISOString()
  };

  const purchaseId = await db.add('purchases', purchase);

  // Update supplier outstanding balance
  if (balance !== 0) {
    supplier.outstandingBalance = parseFloat((supplier.outstandingBalance + balance).toFixed(2));
    await db.put('suppliers', supplier);
  }

  // Update Raw Material Stock (calling inventory.adjustRawMaterialStock)
  for (const item of purchase.items) {
    const raw = await db.get('raw_materials', item.rawMaterialId);
    if (raw) {
      await inventory.adjustRawMaterialStock(
        item.rawMaterialId,
        'in',
        item.quantity,
        `Supplier Purchase Bill #${invoiceNumber || purchaseId} (${supplier.name})`
      );
    }
  }

  // Also log the cash outflow if anything was paid immediately.
  if (paid > 0) {
    await db.add('expenses', {
      category: 'miscellaneous',
      amount: paid,
      date: purchase.date,
      notes: `Payment for Raw Materials Invoice #${invoiceNumber || purchaseId} (Supplier: ${supplier.name})`
    });
  }

  return purchaseId;
}

// Expose globally
window.purchases = {
  getSuppliers,
  getSupplier,
  addSupplier,
  updateSupplier,
  paySupplierBalance,
  deleteSupplier,
  getPurchases,
  addPurchase
};
