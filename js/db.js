// IndexedDB Database Layer for Sweet Shop ERP
const DB_NAME = 'SweetShopERP';
const DB_VERSION = 1;

// Pure JS SHA-256 fallback for file:// or insecure HTTP contexts
function sha256PureJS(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;
  var result = '';

  var words = [];
  var asciiLength = ascii[lengthProperty] * 8;
  
  var hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  var k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) {
    ascii += '\x00';
  }
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII check
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength | 0);
  
  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16);
    var oldHash = hash.slice(0);
    
    for (i = 0; i < 64; i++) {
      var wItem = w[i];
      if (i >= 16) {
        var s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = wItem = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      
      var ch = (oldHash[4] & oldHash[5]) ^ (~oldHash[4] & oldHash[6]);
      var maj = (oldHash[0] & oldHash[1]) ^ (oldHash[0] & oldHash[2]) ^ (oldHash[1] & oldHash[2]);
      var sigma0 = rightRotate(oldHash[0], 2) ^ rightRotate(oldHash[0], 13) ^ rightRotate(oldHash[0], 22);
      var sigma1 = rightRotate(oldHash[4], 6) ^ rightRotate(oldHash[4], 11) ^ rightRotate(oldHash[4], 25);
      var temp1 = (oldHash[7] + sigma1 + ch + k[i] + wItem) | 0;
      var temp2 = (sigma0 + maj) | 0;
      
      oldHash = [(temp1 + temp2) | 0].concat(oldHash);
      oldHash[4] = (oldHash[4] + temp1) | 0;
      oldHash.length = 8;
    }
    
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  for (i = 0; i < 8; i++) {
    var val = hash[i];
    if (val < 0) val += 0x100000000;
    result += val.toString(16).padStart(8, '0');
  }
  
  return result;
}

// Web Crypto SHA-256 hashing helper with pure JS fallback
async function hashPassword(password) {
  if (window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn("WebCrypto failed, falling back to pure JS SHA-256", e);
      return sha256PureJS(password);
    }
  } else {
    return sha256PureJS(password);
  }
}

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Users
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'username' });
        }

        // 2. Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // 3. Categories
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
        }

        // 4. Products
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        }

        // 5. Raw Materials
        if (!db.objectStoreNames.contains('raw_materials')) {
          db.createObjectStore('raw_materials', { keyPath: 'id', autoIncrement: true });
        }

        // 6. Raw Material Logs
        if (!db.objectStoreNames.contains('raw_material_logs')) {
          db.createObjectStore('raw_material_logs', { keyPath: 'id', autoIncrement: true });
        }

        // 7. Recipes
        if (!db.objectStoreNames.contains('recipes')) {
          db.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true });
        }

        // 8. Suppliers
        if (!db.objectStoreNames.contains('suppliers')) {
          db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
        }

        // 9. Purchases
        if (!db.objectStoreNames.contains('purchases')) {
          db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
        }

        // 10. Sales
        if (!db.objectStoreNames.contains('sales')) {
          db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        }

        // 11. Workers
        if (!db.objectStoreNames.contains('workers')) {
          db.createObjectStore('workers', { keyPath: 'id', autoIncrement: true });
        }

        // 12. Attendance
        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'id' }); // key will be 'date_workerId'
        }

        // 13. Salary Payments
        if (!db.objectStoreNames.contains('salary_payments')) {
          db.createObjectStore('salary_payments', { keyPath: 'id', autoIncrement: true });
        }

        // 14. Expenses
        if (!db.objectStoreNames.contains('expenses')) {
          db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        try {
          await this.prepopulateIfEmpty();
          resolve(this);
        } catch (err) {
          reject(err);
        }
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  // Prepopulate tables with initial default data if they are empty
  async prepopulateIfEmpty() {
    // Check if owner user exists
    const users = await this.getAll('users');
    if (users.length === 0) {
      // Default credentials: username 'owner', password 'admin123'
      const passwordHash = await hashPassword('admin123');
      await this.add('users', {
        username: 'owner',
        passwordHash: passwordHash,
        securityQuestion: 'What is the name of your first school?',
        securityAnswer: 'primary',
        createdAt: new Date().toISOString()
      });
    }

    // Check settings
    const settings = await this.getAll('settings');
    if (settings.length === 0) {
      await this.add('settings', {
        key: 'shop_settings',
        shopName: 'Sweet Delight Palace',
        logo: '', // Base64 logo placeholder (none initially)
        address: '123 Sweet Street, Mithai Chowk, Kolkata, 700001',
        phone: '+91 98765 43210',
        gstNumber: '19AAAAA0000A1Z5',
        invoiceHeader: 'Welcome to Sweet Delight Palace\nFresh & Pure Sweets Made Daily',
        invoiceFooter: 'Thank you for your visit!\nVisit again soon. Have a sweet day!',
        currency: 'INR',
        taxPercentage: 5,
        theme: 'dark'
      });
    }

    // Check categories
    const categories = await this.getAll('categories');
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Bengali Sweets' },
        { name: 'Ghee Sweets' },
        { name: 'Dry Fruit Sweets' },
        { name: 'Milk & Chhena Sweets' },
        { name: 'Snacks & Savouries' },
        { name: 'Beverages' }
      ];
      for (const cat of defaultCategories) {
        await this.add('categories', cat);
      }
    }

    // Check raw materials
    const rawMaterials = await this.getAll('raw_materials');
    if (rawMaterials.length === 0) {
      const defaultIngredients = [
        { name: 'Milk', stock: 100, unit: 'Liters', minStock: 20, lastUpdated: new Date().toISOString() },
        { name: 'Sugar', stock: 150, unit: 'Kg', minStock: 30, lastUpdated: new Date().toISOString() },
        { name: 'Maida (Flour)', stock: 50, unit: 'Kg', minStock: 10, lastUpdated: new Date().toISOString() },
        { name: 'Ghee', stock: 40, unit: 'Kg', minStock: 10, lastUpdated: new Date().toISOString() },
        { name: 'Chhena (Cottage Cheese)', stock: 30, unit: 'Kg', minStock: 8, lastUpdated: new Date().toISOString() },
        { name: 'Cashews (Kaju)', stock: 20, unit: 'Kg', minStock: 5, lastUpdated: new Date().toISOString() },
        { name: 'Almonds (Badam)', stock: 15, unit: 'Kg', minStock: 5, lastUpdated: new Date().toISOString() },
        { name: 'Pistachios (Pista)', stock: 10, unit: 'Kg', minStock: 2, lastUpdated: new Date().toISOString() },
        { name: 'Cardamom (Elaichi)', stock: 2, unit: 'Kg', minStock: 0.5, lastUpdated: new Date().toISOString() },
        { name: 'Saffron (Kesar)', stock: 100, unit: 'Grams', minStock: 20, lastUpdated: new Date().toISOString() },
        { name: 'Khoya / Mawa', stock: 50, unit: 'Kg', minStock: 15, lastUpdated: new Date().toISOString() }
      ];
      for (const ingredient of defaultIngredients) {
        const id = await this.add('raw_materials', ingredient);
        // Add initial log
        await this.add('raw_material_logs', {
          rawMaterialId: id,
          type: 'in',
          quantity: ingredient.stock,
          reason: 'Initial setup stock',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // Promise-based Generic Database operations
  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(transaction.db.objectStoreNames.contains(storeName) ? storeName : null);
      if (!store) {
        reject(new Error(`Object store ${storeName} not found`));
        return;
      }
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  add(storeName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(value);

      request.onsuccess = () => resolve(request.result); // Returns key (like id)
      request.onerror = () => reject(request.error);
    });
  }

  put(storeName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data (for testing/restores)
  async wipeDatabase() {
    const stores = Array.from(this.db.objectStoreNames);
    for (const store of stores) {
      await this.clearStore(store);
    }
  }
}

const db = new Database();
window.db = db;
window.hashPassword = hashPassword;
