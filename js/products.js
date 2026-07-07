// Product & Category Management Layer (CORS-friendly for file:// protocol)

// Category Operations
async function getCategories() {
  return await db.getAll('categories');
}

async function addCategory(name) {
  if (!name || name.trim() === '') throw new Error('Category name cannot be empty');
  const cat = { name: name.trim(), createdAt: new Date().toISOString() };
  return await db.add('categories', cat);
}

async function updateCategory(id, name) {
  if (!name || name.trim() === '') throw new Error('Category name cannot be empty');
  const cat = await db.get('categories', id);
  if (!cat) throw new Error('Category not found');
  cat.name = name.trim();
  return await db.put('categories', cat);
}

async function deleteCategory(id) {
  // Check if there are products associated with this category name
  const cat = await db.get('categories', id);
  if (cat) {
    const productsList = await db.getAll('products');
    const hasProducts = productsList.some(p => p.category === cat.name);
    if (hasProducts) {
      throw new Error(`Cannot delete category "${cat.name}" because it contains products. Relabel those products first.`);
    }
  }
  return await db.delete('categories', id);
}

// Product Operations
async function getProducts() {
  return await db.getAll('products');
}

async function getProduct(id) {
  return await db.get('products', id);
}

async function addProduct(productData) {
  // Validate SKU and Barcode uniqueness
  const productsList = await getProducts();
  if (productData.sku && productsList.some(p => p.sku === productData.sku)) {
    throw new Error(`SKU "${productData.sku}" is already in use.`);
  }
  if (productData.barcode && productsList.some(p => p.barcode === productData.barcode)) {
    throw new Error(`Barcode "${productData.barcode}" is already in use.`);
  }

  const newProduct = {
    name: productData.name,
    category: productData.category,
    sku: productData.sku || '',
    barcode: productData.barcode || '',
    unit: productData.unit || 'Kg',
    purchasePrice: parseFloat(productData.purchasePrice) || 0,
    sellingPrice: parseFloat(productData.sellingPrice) || 0,
    stock: parseFloat(productData.stock) || 0,
    minStock: parseFloat(productData.minStock) || 0,
    tax: parseFloat(productData.tax) || 0,
    description: productData.description || '',
    status: productData.status || 'active',
    image: productData.image || '', // Base64
    createdAt: new Date().toISOString()
  };

  return await db.add('products', newProduct);
}

async function updateProduct(id, productData) {
  const existingProduct = await db.get('products', id);
  if (!existingProduct) throw new Error('Product not found');

  // Validate SKU and Barcode uniqueness if changed
  const productsList = await getProducts();
  if (productData.sku && productData.sku !== existingProduct.sku && productsList.some(p => p.sku === productData.sku)) {
    throw new Error(`SKU "${productData.sku}" is already in use.`);
  }
  if (productData.barcode && productData.barcode !== existingProduct.barcode && productsList.some(p => p.barcode === productData.barcode)) {
    throw new Error(`Barcode "${productData.barcode}" is already in use.`);
  }

  const updatedProduct = {
    ...existingProduct,
    name: productData.name,
    category: productData.category,
    sku: productData.sku || '',
    barcode: productData.barcode || '',
    unit: productData.unit || 'Kg',
    purchasePrice: parseFloat(productData.purchasePrice) || 0,
    sellingPrice: parseFloat(productData.sellingPrice) || 0,
    stock: parseFloat(productData.stock) || 0,
    minStock: parseFloat(productData.minStock) || 0,
    tax: parseFloat(productData.tax) || 0,
    description: productData.description || '',
    status: productData.status || 'active',
    image: productData.image !== undefined ? productData.image : existingProduct.image
  };

  return await db.put('products', updatedProduct);
}

async function deleteProduct(id) {
  // Check if there are recipes referencing this product
  const recipes = await db.getAll('recipes');
  const isReferencedInRecipe = recipes.some(r => r.productId === id);
  if (isReferencedInRecipe) {
    // Delete the recipe when the product is deleted to maintain references integrity
    const targetRecipe = recipes.find(r => r.productId === id);
    if (targetRecipe) {
      await db.delete('recipes', targetRecipe.id);
    }
  }
  return await db.delete('products', id);
}

async function duplicateProduct(id) {
  const prod = await db.get('products', id);
  if (!prod) throw new Error('Product to duplicate not found');

  const productsList = await getProducts();
  let baseName = prod.name;
  let newName = `${baseName} (Copy)`;
  let counter = 1;
  while (productsList.some(p => p.name === newName)) {
    newName = `${baseName} (Copy ${counter})`;
    counter++;
  }

  let baseSku = prod.sku || 'SKU';
  let newSku = `${baseSku}-COPY`;
  counter = 1;
  while (productsList.some(p => p.sku === newSku)) {
    newSku = `${baseSku}-COPY-${counter}`;
    counter++;
  }

  let newBarcode = '';
  if (prod.barcode) {
    let baseBarcode = prod.barcode;
    newBarcode = `${baseBarcode}99`; // modify barcode slightly
    counter = 1;
    while (productsList.some(p => p.barcode === newBarcode)) {
      newBarcode = `${baseBarcode}${counter}`;
      counter++;
    }
  }

  const duplicatedData = {
    name: newName,
    category: prod.category,
    sku: newSku,
    barcode: newBarcode,
    unit: prod.unit,
    purchasePrice: prod.purchasePrice,
    sellingPrice: prod.sellingPrice,
    stock: 0, // Reset stock for duplicate to avoid imaginary inventory creation
    minStock: prod.minStock,
    tax: prod.tax,
    description: prod.description,
    status: prod.status,
    image: prod.image
  };

  return await addProduct(duplicatedData);
}

// Search, filter, and sorting utility
function queryProducts(productsArray, { search = '', category = '', status = '', sortKey = 'name', sortOrder = 'asc' } = {}) {
  let filtered = [...productsArray];

  // Search filter
  if (search && search.trim() !== '') {
    const s = search.toLowerCase().trim();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(s) || 
      (p.sku && p.sku.toLowerCase().includes(s)) ||
      (p.barcode && p.barcode.toLowerCase().includes(s))
    );
  }

  // Category filter
  if (category && category !== 'All') {
    filtered = filtered.filter(p => p.category === category);
  }

  // Status filter
  if (status && status !== 'All') {
    filtered = filtered.filter(p => p.status === status);
  }

  // Sorting
  filtered.sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    // Handle string case-insensitive comparisons
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return filtered;
}

// Expose globally
window.products = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  getProduct,
  addProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  queryProducts
};
