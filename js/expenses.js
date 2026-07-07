// General Expense Management Layer (CORS-friendly for file:// protocol)

async function getExpenses() {
  const expensesList = await db.getAll('expenses');
  return expensesList.sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function getExpense(id) {
  return await db.get('expenses', id);
}

async function addExpense({ category, amount, date, notes }) {
  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) throw new Error('Expense amount must be greater than zero');
  if (!category) throw new Error('Expense category is required');

  const expense = {
    category, // 'electricity', 'rent', 'gas', 'salaries', 'packaging', 'transport', 'maintenance', 'miscellaneous'
    amount: val,
    date: date || new Date().toISOString().split('T')[0],
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  return await db.add('expenses', expense);
}

async function updateExpense(id, { category, amount, date, notes }) {
  const existing = await db.get('expenses', id);
  if (!existing) throw new Error('Expense record not found');

  const val = parseFloat(amount);
  if (amount !== undefined && (isNaN(val) || val <= 0)) {
    throw new Error('Expense amount must be greater than zero');
  }

  const updated = {
    ...existing,
    category: category || existing.category,
    amount: amount !== undefined ? val : existing.amount,
    date: date || existing.date,
    notes: notes !== undefined ? notes : existing.notes
  };

  return await db.put('expenses', updated);
}

async function deleteExpense(id) {
  return await db.delete('expenses', id);
}

function getExpenseCategories() {
  return [
    { key: 'electricity', name: 'Electricity Bill' },
    { key: 'rent', name: 'Shop Rent' },
    { key: 'gas', name: 'Gas & Fuel' },
    { key: 'salaries', name: 'Worker Salaries' },
    { key: 'packaging', name: 'Packaging Materials' },
    { key: 'transport', name: 'Transport & Delivery' },
    { key: 'maintenance', name: 'Maintenance & Repairs' },
    { key: 'miscellaneous', name: 'Miscellaneous' }
  ];
}

// Expose globally
window.expenses = {
  getExpenses,
  getExpense,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories
};
