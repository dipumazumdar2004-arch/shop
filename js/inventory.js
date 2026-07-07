// Raw Materials & Recipe Operations (CORS-friendly for file:// protocol)

// Raw Materials API
async function getRawMaterials() {
  return await db.getAll('raw_materials');
}

async function getRawMaterial(id) {
  return await db.get('raw_materials', id);
}

async function addRawMaterial({ name, unit, minStock, initialStock = 0 }) {
  if (!name || name.trim() === '') throw new Error('Raw material name is required');
  
  const rawMaterials = await getRawMaterials();
  if (rawMaterials.some(r => r.name.toLowerCase() === name.toLowerCase().trim())) {
    throw new Error(`Raw material "${name}" already exists.`);
  }

  const material = {
    name: name.trim(),
    unit: unit || 'Kg',
    stock: parseFloat(initialStock) || 0,
    minStock: parseFloat(minStock) || 0,
    lastUpdated: new Date().toISOString()
  };

  const id = await db.add('raw_materials', material);

  if (material.stock > 0) {
    await db.add('raw_material_logs', {
      rawMaterialId: id,
      type: 'in',
      quantity: material.stock,
      reason: 'Initial setup stock registration',
      timestamp: new Date().toISOString()
    });
  }

  return id;
}

async function updateRawMaterial(id, { name, unit, minStock }) {
  const material = await db.get('raw_materials', id);
  if (!material) throw new Error('Raw material not found');

  const rawMaterials = await getRawMaterials();
  if (name && name.toLowerCase().trim() !== material.name.toLowerCase() && 
      rawMaterials.some(r => r.name.toLowerCase() === name.toLowerCase().trim())) {
    throw new Error(`Raw material "${name}" already exists.`);
  }

  material.name = name ? name.trim() : material.name;
  material.unit = unit || material.unit;
  material.minStock = minStock !== undefined ? parseFloat(minStock) : material.minStock;
  material.lastUpdated = new Date().toISOString();

  return await db.put('raw_materials', material);
}

async function adjustRawMaterialStock(id, type, quantity, reason) {
  const material = await db.get('raw_materials', id);
  if (!material) throw new Error('Raw material not found');

  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) throw new Error('Invalid quantity value');

  if (type === 'out') {
    material.stock -= qty;
  } else if (type === 'in') {
    material.stock += qty;
  } else {
    throw new Error('Invalid transaction type. Use "in" or "out"');
  }

  material.lastUpdated = new Date().toISOString();
  await db.put('raw_materials', material);

  // Write history log
  await db.add('raw_material_logs', {
    rawMaterialId: id,
    type,
    quantity: qty,
    reason: reason || 'Manual inventory adjustment',
    timestamp: new Date().toISOString()
  });

  return material;
}

async function deleteRawMaterial(id) {
  // Check if any recipe is using this raw material
  const recipes = await db.getAll('recipes');
  const isUsed = recipes.some(r => r.ingredients.some(i => i.rawMaterialId === id));
  if (isUsed) {
    throw new Error('Cannot delete raw material. It is used in one or more recipes. Remove it from recipes first.');
  }
  return await db.delete('raw_materials', id);
}

// Log history
async function getRawMaterialLogs() {
  const logs = await db.getAll('raw_material_logs');
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Recipes Management
async function getRecipes() {
  return await db.getAll('recipes');
}

async function getRecipeForProduct(productId) {
  const recipes = await db.getAll('recipes');
  return recipes.find(r => r.productId === productId) || null;
}

async function saveRecipe(productId, ingredientsList) {
  // ingredientsList = [{ rawMaterialId: Number, quantity: Number }]
  const recipes = await getRecipes();
  const existingRecipe = recipes.find(r => r.productId === productId);

  // Filter out invalid ingredients (quantity <= 0 or missing ID)
  const validIngredients = ingredientsList.filter(i => i.rawMaterialId && parseFloat(i.quantity) > 0);

  if (existingRecipe) {
    if (validIngredients.length === 0) {
      // If recipe is emptied, delete it
      await db.delete('recipes', existingRecipe.id);
      return null;
    }
    existingRecipe.ingredients = validIngredients;
    await db.put('recipes', existingRecipe);
    return existingRecipe;
  } else {
    if (validIngredients.length === 0) return null;
    const newRecipe = {
      productId,
      ingredients: validIngredients
    };
    const id = await db.add('recipes', newRecipe);
    newRecipe.id = id;
    return newRecipe;
  }
}

// Check if stock is available before a POS sale
async function checkRecipeStockAvailability(productId, productQuantity) {
  const recipe = await getRecipeForProduct(productId);
  if (!recipe) return { available: true }; // No ingredients required

  const warnings = [];
  for (const item of recipe.ingredients) {
    const raw = await db.get('raw_materials', item.rawMaterialId);
    if (!raw) {
      warnings.push(`Ingredient ID ${item.rawMaterialId} not found in database.`);
      continue;
    }
    const needed = item.quantity * productQuantity;
    if (raw.stock < needed) {
      warnings.push(`Insufficient ${raw.name}. Need ${needed.toFixed(2)} ${raw.unit}, only have ${raw.stock.toFixed(2)} ${raw.unit}.`);
    }
  }

  return {
    available: warnings.length === 0,
    warnings
  };
}

// Deduct ingredients from raw material stock upon purchase checkout
async function deductRecipeStockForProduct(productId, productQuantity, invoiceNumber) {
  const recipe = await getRecipeForProduct(productId);
  if (!recipe) return; // No ingredients linked

  const product = await db.get('products', productId);
  const productName = product ? product.name : `Product #${productId}`;

  for (const item of recipe.ingredients) {
    const raw = await db.get('raw_materials', item.rawMaterialId);
    if (raw) {
      const needed = parseFloat(item.quantity) * productQuantity;
      raw.stock = parseFloat((raw.stock - needed).toFixed(4));
      raw.lastUpdated = new Date().toISOString();
      await db.put('raw_materials', raw);

      // Log transaction
      await db.add('raw_material_logs', {
        rawMaterialId: raw.id,
        type: 'out',
        quantity: needed,
        reason: `Deduction for POS Bill #${invoiceNumber} - ${productName} x${productQuantity}`,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Expose globally
window.inventory = {
  getRawMaterials,
  getRawMaterial,
  addRawMaterial,
  updateRawMaterial,
  adjustRawMaterialStock,
  deleteRawMaterial,
  getRawMaterialLogs,
  getRecipes,
  getRecipeForProduct,
  saveRecipe,
  checkRecipeStockAvailability,
  deductRecipeStockForProduct
};
