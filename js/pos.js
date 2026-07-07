// POS Operations Layer (CORS-friendly for file:// protocol)

let cart = []; // Array of { product, quantity }

function getCart() {
  return cart;
}

async function addToCart(productId, qty = 1) {
  const product = await products.getProduct(productId);
  if (!product) throw new Error('Product not found');
  if (product.status !== 'active') throw new Error('Product is inactive');

  const existingItem = cart.find(item => item.product.id === productId);
  if (existingItem) {
    existingItem.quantity += qty;
  } else {
    cart.push({ product, quantity: qty });
  }

  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  return cart;
}

function updateCartQuantity(productId, quantity) {
  const item = cart.find(item => item.product.id === productId);
  if (item) {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      removeFromCart(productId);
    } else {
      item.quantity = qty;
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
    }
  }
  return cart;
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.product.id !== productId);
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  return cart;
}

function clearCart() {
  cart = [];
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  return cart;
}

// Check stock and recipes for all items currently in cart
async function verifyCartStock() {
  const stockWarnings = [];
  for (const item of cart) {
    const check = await inventory.checkRecipeStockAvailability(item.product.id, item.quantity);
    if (!check.available) {
      stockWarnings.push({
        productName: item.product.name,
        warnings: check.warnings
      });
    }
  }
  return stockWarnings;
}

async function calculateCartTotals(discountPercent = 0) {
  const shopSettings = await settings.getSettings();
  const defaultTaxRate = shopSettings ? parseFloat(shopSettings.taxPercentage) || 0 : 0;

  let subtotal = 0;
  let taxTotal = 0;
  
  const items = cart.map(item => {
    const p = item.product;
    const qty = item.quantity;
    
    // Use product-specific tax rate or fallback to shop settings default
    const taxRate = p.tax !== undefined && !isNaN(p.tax) ? parseFloat(p.tax) : defaultTaxRate;
    const basePrice = p.sellingPrice;
    
    const rowSubtotal = basePrice * qty;
    const rowTax = rowSubtotal * (taxRate / 100);
    const rowTotal = rowSubtotal + rowTax;

    subtotal += rowSubtotal;
    taxTotal += rowTax;

    return {
      productId: p.id,
      name: p.name,
      quantity: qty,
      price: basePrice,
      taxRate: taxRate,
      taxAmount: parseFloat(rowTax.toFixed(2)),
      total: parseFloat(rowTotal.toFixed(2))
    };
  });

  const disc = parseFloat(discountPercent) || 0;
  const discountAmount = parseFloat((subtotal * (disc / 100)).toFixed(2));
  
  // Tax is calculated on post-discount subtotal. Let's adjust tax proportionally
  const discountRatio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;
  const adjustedTaxTotal = parseFloat((taxTotal * discountRatio).toFixed(2));

  const grandTotal = parseFloat((subtotal - discountAmount + adjustedTaxTotal).toFixed(2));

  return {
    items,
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountPercent: disc,
    discountAmount,
    taxTotal: adjustedTaxTotal,
    grandTotal
  };
}

// Generate sequential invoice numbers, e.g. INV-YYYYMMDD-0001
async function generateInvoiceNumber() {
  const sales = await db.getAll('sales');
  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  
  // Filter sales for today
  const todaySales = sales.filter(s => s.invoiceNumber && s.invoiceNumber.includes(`INV-${todayStr}`));
  const counter = todaySales.length + 1;
  const padCounter = String(counter).padStart(4, '0');
  
  return `INV-${todayStr}-${padCounter}`;
}

async function checkout(paymentMethod = 'cash', discountPercent = 0, notes = '') {
  if (cart.length === 0) throw new Error('Cart is empty');

  // Verify stock warnings
  const warnings = await verifyCartStock();
  
  const totals = await calculateCartTotals(discountPercent);
  const invoiceNumber = await generateInvoiceNumber();
  const timestamp = new Date().toISOString();

  const saleRecord = {
    invoiceNumber,
    timestamp,
    items: totals.items,
    subtotal: totals.subtotal,
    discountPercent: totals.discountPercent,
    discountAmount: totals.discountAmount,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    paymentMethod,
    notes
  };

  // 1. Save sale to IndexedDB
  const saleId = await db.add('sales', saleRecord);
  saleRecord.id = saleId;

  // 2. Deduct raw materials using recipe & deduct final product stock (if product is tracked directly)
  for (const item of cart) {
    // Deduct ingredient raw stocks
    await inventory.deductRecipeStockForProduct(item.product.id, item.quantity, invoiceNumber);

    // Deduct final sweet stock
    const p = await db.get('products', item.product.id);
    if (p) {
      p.stock = parseFloat((p.stock - item.quantity).toFixed(2));
      await db.put('products', p);
    }
  }

  // 3. Clear cart
  clearCart();

  return {
    saleRecord,
    warnings
  };
}

// Generate PDF Invoice using jsPDF (thermal format 80mm or standard A4)
async function generateInvoicePDF(saleRecord, paperSize = 'thermal') {
  const shopSettings = await settings.getSettings();
  const shopName = shopSettings?.shopName || 'Sweet Shop';
  const shopAddress = shopSettings?.address || '';
  const shopPhone = shopSettings?.phone || '';
  const shopGst = shopSettings?.gstNumber || '';
  const headerMsg = shopSettings?.invoiceHeader || '';
  const footerMsg = shopSettings?.invoiceFooter || '';
  const currency = shopSettings?.currency || 'INR';

  const { jsPDF } = window.jspdf;

  if (paperSize === 'thermal') {
    // Standard thermal receipt: 80mm width. Height dynamic based on items.
    const itemHeight = saleRecord.items.length * 6;
    const pageHeight = 110 + itemHeight + (saleRecord.notes ? 10 : 0);
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, Math.max(150, pageHeight)]
    });

    doc.setFont('Helvetica', 'normal');
    let y = 10;

    // Title / Shop Name
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.text(shopName, 40, y, { align: 'center' });
    y += 5;

    // Contact Details
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    if (shopAddress) {
      const splitAddress = doc.splitTextToSize(shopAddress, 70);
      splitAddress.forEach(line => {
        doc.text(line, 40, y, { align: 'center' });
        y += 3.5;
      });
    }
    if (shopPhone) {
      doc.text(`Phone: ${shopPhone}`, 40, y, { align: 'center' });
      y += 3.5;
    }
    if (shopGst) {
      doc.text(`GSTIN: ${shopGst}`, 40, y, { align: 'center' });
      y += 4;
    }

    // Header Message
    if (headerMsg) {
      const splitHeader = doc.splitTextToSize(headerMsg, 70);
      splitHeader.forEach(line => {
        doc.text(line, 40, y, { align: 'center' });
        y += 3.5;
      });
      y += 1.5;
    }

    // Divider
    doc.setLineWidth(0.2);
    doc.line(5, y, 75, y);
    y += 4;

    // Bill Info
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Invoice: ${saleRecord.invoiceNumber}`, 5, y);
    y += 3.5;
    doc.setFont('Helvetica', 'normal');
    const dateFormatted = new Date(saleRecord.timestamp).toLocaleString();
    doc.text(`Date: ${dateFormatted}`, 5, y);
    doc.text(`Mode: ${saleRecord.paymentMethod.toUpperCase()}`, 50, y);
    y += 4.5;

    // Table Header
    doc.setFont('Helvetica', 'bold');
    doc.text('Item Description', 5, y);
    doc.text('Qty', 45, y, { align: 'right' });
    doc.text('Price', 58, y, { align: 'right' });
    doc.text('Total', 75, y, { align: 'right' });
    y += 2.5;
    doc.line(5, y, 75, y);
    y += 4;

    // Table Body
    doc.setFont('Helvetica', 'normal');
    saleRecord.items.forEach(item => {
      let displayName = item.name;
      // Handle long name wrapping
      if (displayName.length > 20) {
        displayName = displayName.substring(0, 18) + '..';
      }
      doc.text(displayName, 5, y);
      doc.text(item.quantity.toString(), 45, y, { align: 'right' });
      doc.text(item.price.toFixed(2), 58, y, { align: 'right' });
      doc.text(item.total.toFixed(2), 75, y, { align: 'right' });
      y += 5;
    });

    // Divider
    doc.line(5, y, 75, y);
    y += 4;

    // Totals
    doc.setFontSize(8.5);
    doc.text('Subtotal:', 45, y, { align: 'right' });
    doc.text(`${currency} ${saleRecord.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;

    if (saleRecord.discountAmount > 0) {
      doc.text(`Discount (${saleRecord.discountPercent}%):`, 45, y, { align: 'right' });
      doc.text(`-${currency} ${saleRecord.discountAmount.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4;
    }

    doc.text('Tax (GST):', 45, y, { align: 'right' });
    doc.text(`${currency} ${saleRecord.taxTotal.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4.5;

    // Grand Total Boxed/Bold
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.text('GRAND TOTAL:', 45, y, { align: 'right' });
    doc.text(`${currency} ${saleRecord.grandTotal.toFixed(2)}`, 75, y, { align: 'right' });
    y += 6;

    // Divider
    doc.setLineWidth(0.1);
    doc.line(5, y, 75, y);
    y += 4.5;

    // Notes
    if (saleRecord.notes) {
      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'italic');
      doc.text(`Notes: ${saleRecord.notes}`, 5, y);
      y += 4;
    }

    // Footer Message
    if (footerMsg) {
      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'normal');
      const splitFooter = doc.splitTextToSize(footerMsg, 70);
      splitFooter.forEach(line => {
        doc.text(line, 40, y, { align: 'center' });
        y += 3.5;
      });
    }

    doc.save(`${saleRecord.invoiceNumber}.pdf`);
  } else {
    // A4 PDF format (more formal)
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'normal');

    // Header Panel
    doc.setFontSize(22);
    doc.setFont('Helvetica', 'bold');
    doc.text(shopName, 20, 25);

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(shopAddress, 20, 32);
    doc.text(`Phone: ${shopPhone} | GSTIN: ${shopGst}`, 20, 37);

    // Invoice Meta
    doc.setFontSize(18);
    doc.setFont('Helvetica', 'bold');
    doc.text('INVOICE', 140, 25);
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Invoice No: ${saleRecord.invoiceNumber}`, 140, 32);
    doc.text(`Date: ${new Date(saleRecord.timestamp).toLocaleString()}`, 140, 37);

    doc.line(20, 45, 190, 45);

    // Billing details
    doc.setFont('Helvetica', 'bold');
    doc.text('Billed By:', 20, 53);
    doc.setFont('Helvetica', 'normal');
    doc.text(shopName, 20, 58);

    doc.setFont('Helvetica', 'bold');
    doc.text('Payment Details:', 140, 53);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Payment Method: ${saleRecord.paymentMethod.toUpperCase()}`, 140, 58);
    if (saleRecord.notes) {
      doc.text(`Notes: ${saleRecord.notes}`, 140, 63);
    }

    // Table Headers
    let y = 75;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, 170, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.text('S.No', 22, y + 5);
    doc.text('Product Name', 35, y + 5);
    doc.text('Price', 105, y + 5, { align: 'right' });
    doc.text('Qty', 125, y + 5, { align: 'right' });
    doc.text('Tax Rate', 150, y + 5, { align: 'right' });
    doc.text('Total Amount', 185, y + 5, { align: 'right' });
    
    // Table content
    y += 8;
    doc.setFont('Helvetica', 'normal');
    saleRecord.items.forEach((item, index) => {
      doc.text((index + 1).toString(), 22, y + 5);
      doc.text(item.name, 35, y + 5);
      doc.text(item.price.toFixed(2), 105, y + 5, { align: 'right' });
      doc.text(item.quantity.toString(), 125, y + 5, { align: 'right' });
      doc.text(`${item.taxRate}%`, 150, y + 5, { align: 'right' });
      doc.text(item.total.toFixed(2), 185, y + 5, { align: 'right' });
      y += 8;
    });

    doc.line(20, y, 190, y);
    y += 6;

    // Totals Panel
    doc.text('Subtotal:', 140, y);
    doc.text(`${currency} ${saleRecord.subtotal.toFixed(2)}`, 185, y, { align: 'right' });
    y += 6;

    if (saleRecord.discountAmount > 0) {
      doc.text(`Discount (${saleRecord.discountPercent}%):`, 140, y);
      doc.text(`-${currency} ${saleRecord.discountAmount.toFixed(2)}`, 185, y, { align: 'right' });
      y += 6;
    }

    doc.text('GST Taxes:', 140, y);
    doc.text(`${currency} ${saleRecord.taxTotal.toFixed(2)}`, 185, y, { align: 'right' });
    y += 8;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Grand Total:', 140, y);
    doc.text(`${currency} ${saleRecord.grandTotal.toFixed(2)}`, 185, y, { align: 'right' });

    // Terms / messages
    y += 20;
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'italic');
    if (headerMsg) {
      doc.text(headerMsg, 20, y);
      y += 5;
    }
    if (footerMsg) {
      doc.text(footerMsg, 20, y);
    }

    doc.save(`${saleRecord.invoiceNumber}.pdf`);
  }
}

// Expose globally
window.pos = {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  verifyCartStock,
  calculateCartTotals,
  generateInvoiceNumber,
  checkout,
  generateInvoicePDF
};
