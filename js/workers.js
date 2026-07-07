// Worker & Attendance Management Layer (CORS-friendly for file:// protocol)

// Worker Operations
async function getWorkers() {
  return await db.getAll('workers');
}

async function getWorker(id) {
  return await db.get('workers', id);
}

async function addWorker(workerData) {
  if (!workerData.name || workerData.name.trim() === '') throw new Error('Worker name is required');

  const newWorker = {
    name: workerData.name.trim(),
    phone: workerData.phone || '',
    address: workerData.address || '',
    joiningDate: workerData.joiningDate || new Date().toISOString().split('T')[0],
    type: workerData.type || 'Other', // Cook, Waiter, Cleaner, Helper, Delivery Boy, Sweet Maker, Other
    salary: parseFloat(workerData.salary) || 0,
    status: workerData.status || 'active',
    photo: workerData.photo || '', // Base64
    notes: workerData.notes || '',
    createdAt: new Date().toISOString()
  };

  return await db.add('workers', newWorker);
}

async function updateWorker(id, workerData) {
  const existingWorker = await db.get('workers', id);
  if (!existingWorker) throw new Error('Worker not found');

  const updatedWorker = {
    ...existingWorker,
    name: workerData.name ? workerData.name.trim() : existingWorker.name,
    phone: workerData.phone !== undefined ? workerData.phone : existingWorker.phone,
    address: workerData.address !== undefined ? workerData.address : existingWorker.address,
    joiningDate: workerData.joiningDate !== undefined ? workerData.joiningDate : existingWorker.joiningDate,
    type: workerData.type !== undefined ? workerData.type : existingWorker.type,
    salary: workerData.salary !== undefined ? parseFloat(workerData.salary) : existingWorker.salary,
    status: workerData.status !== undefined ? workerData.status : existingWorker.status,
    photo: workerData.photo !== undefined ? workerData.photo : existingWorker.photo,
    notes: workerData.notes !== undefined ? workerData.notes : existingWorker.notes
  };

  return await db.put('workers', updatedWorker);
}

async function deleteWorker(id) {
  // Clear attendance and salaries histories
  const attendance = await db.getAll('attendance');
  for (const item of attendance) {
    if (item.workerId === id) {
      await db.delete('attendance', item.id);
    }
  }

  const payments = await db.getAll('salary_payments');
  for (const item of payments) {
    if (item.workerId === id) {
      await db.delete('salary_payments', item.id);
    }
  }

  return await db.delete('workers', id);
}

// Attendance Simulator
async function saveAttendance(date, workerId, status) {
  // date: YYYY-MM-DD
  // status: 'present', 'absent', 'half_day', 'paid_leave'
  const key = `${date}_${workerId}`;
  const record = {
    id: key,
    date,
    workerId: parseInt(workerId),
    status
  };
  return await db.put('attendance', record);
}

async function getAttendanceForDate(date) {
  const attendance = await db.getAll('attendance');
  return attendance.filter(a => a.date === date);
}

async function getAttendanceForMonth(yearMonth) {
  // yearMonth: YYYY-MM
  const attendance = await db.getAll('attendance');
  return attendance.filter(a => a.date.startsWith(yearMonth));
}

// Payroll calculations
async function getWorkerStatsForMonth(workerId, yearMonth) {
  // yearMonth: YYYY-MM
  const attendance = await getAttendanceForMonth(yearMonth);
  const workerAttendance = attendance.filter(a => a.workerId === parseInt(workerId));
  const worker = await db.get('workers', parseInt(workerId));
  
  if (!worker) throw new Error('Worker not found');

  let present = 0;
  let absent = 0;
  let halfDay = 0;
  let paidLeave = 0;

  workerAttendance.forEach(a => {
    if (a.status === 'present') present++;
    else if (a.status === 'absent') absent++;
    else if (a.status === 'half_day') halfDay++;
    else if (a.status === 'paid_leave') paidLeave++;
  });

  // Calculate days in the target month
  const [year, month] = yearMonth.split('-').map(Number);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // Daily Wage pro-rate
  const dailyWage = worker.salary / totalDaysInMonth;
  const payableDays = present + paidLeave + (halfDay * 0.5);
  const calculatedSalary = payableDays * dailyWage;

  // Get payments already done for this month
  const allPayments = await db.getAll('salary_payments');
  const monthPayments = allPayments.filter(p => p.workerId === parseInt(workerId) && p.paymentMonth === yearMonth);
  const totalPaid = monthPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  const remainingDue = calculatedSalary - totalPaid;

  return {
    worker,
    yearMonth,
    daysInMonth: totalDaysInMonth,
    attendanceCount: workerAttendance.length,
    present,
    absent,
    halfDay,
    paidLeave,
    payableDays,
    dailyWage: parseFloat(dailyWage.toFixed(2)),
    calculatedSalary: parseFloat(calculatedSalary.toFixed(2)),
    totalPaid: parseFloat(totalPaid.toFixed(2)),
    remainingDue: parseFloat(Math.max(0, remainingDue).toFixed(2)),
    paymentHistory: monthPayments
  };
}

async function payWorkerSalary({ workerId, paymentDate, amountPaid, paymentMonth, paymentMethod = 'Cash', notes = '' }) {
  const worker = await db.get('workers', parseInt(workerId));
  if (!worker) throw new Error('Worker not found');

  const amount = parseFloat(amountPaid);
  if (isNaN(amount) || amount <= 0) throw new Error('Payment amount must be greater than zero');

  const paymentRecord = {
    workerId: parseInt(workerId),
    workerName: worker.name,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    amountPaid: amount,
    paymentMonth, // YYYY-MM
    paymentMethod,
    notes,
    timestamp: new Date().toISOString()
  };

  const paymentId = await db.add('salary_payments', paymentRecord);

  // Auto log salary as standard expense
  await db.add('expenses', {
    category: 'salaries',
    amount: amount,
    date: paymentRecord.paymentDate,
    notes: `Salary paid to ${worker.name} for ${paymentMonth}. Method: ${paymentMethod}. ${notes}`
  });

  return paymentId;
}

async function getSalaryPayments(workerId = null) {
  const payments = await db.getAll('salary_payments');
  const sorted = payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  if (workerId) {
    return sorted.filter(p => p.workerId === parseInt(workerId));
  }
  return sorted;
}

// Expose globally
window.workers = {
  getWorkers,
  getWorker,
  addWorker,
  updateWorker,
  deleteWorker,
  saveAttendance,
  getAttendanceForDate,
  getAttendanceForMonth,
  getWorkerStatsForMonth,
  payWorkerSalary,
  getSalaryPayments
};
