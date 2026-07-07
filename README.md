# Sweet Shop ERP & Inventory Management System

A premium desktop-style Single Page Web Application (SPA) designed for a single-owner sweet shop to manage billing, products, categories, recipes, raw material inventory, purchases, supplier accounts, workers directory, attendance, payroll, expenses, and business analytics.

## Tech Stack & Libraries
- **Frontend Core**: HTML5, Vanilla CSS3, Vanilla ES6 JavaScript (Modules).
- **Local Storage**: IndexedDB (for storing high-capacity structured data: product photos, staff photos, inventory logs, sales history, etc. without hitting the standard 5MB localstorage limit).
- **Core Libraries (via CDN)**:
  - **Chart.js**: Interactive graphs for sales and expenses.
  - **jsPDF**: Thermal and A4 billing receipt generation and download.
- **Development Tooling**:
  - **Vite**: Ultra-fast vanilla assets server.

---

## Features Implemented

1. **Owner Authentication**
   - Single-owner login (default credentials: Username `owner` / Password `admin123`).
   - Profile management to modify username/password.
   - Password recovery via a customizable security question and hashed answers.
   - Session manager (keeps owner signed in).

2. **Shop Settings**
   - Manage shop name, logo, address, phone number, GSTIN, invoice headers, and footers.
   - Customize global currency (INR, USD, EUR, etc.) and global GST tax rate.
   - Syncs changes instantly across invoice logs, dashboard, reports, and headers.

3. **POS Billing Terminal**
   - Multi-filtered category bar & live search box.
   - Integrated barcode scan handler.
   - Cart adjustments (quick increments, decrements, manual inputs, and removals).
   - Dynamic taxes and discounts.
   - PDF Invoice Generator (supports **80mm Thermal Receipt** slips and standard A4 formal invoice formats).
   - Deducts recipe ingredients automatically from raw stock upon checkout.
   - POS Keyboard Shortcuts:
     - `F2`: Focus Product search
     - `F4`: Clear Active Cart
     - `F8`: Focus Discount percentage input
     - `F9`: Trigger Checkout & Print Receipt

4. **Product Catalog & Categories**
   - Dynamic Categories editor (Rename, add, delete, blocks deletion if products are linked).
   - Sweets catalog CRUD with image upload, SKU, Barcode, unit options, selling/cost pricing, stock triggers, and low stock threshold alerts.
   - "Duplicate Product" function (quickly copies settings with stock starting at 0).
   - "Link Recipe" option.

5. **Raw Material Inventory & Recipes**
   - Ingredient directory (sugar, milk, ghee, khoya, cardamom, saffron, dry fruits, etc.).
   - Stock-in and Stock-out logs with reason trails.
   - Recipe Builder: link products to multiple raw ingredients and precise quantities (e.g. 1 unit of Kaju Katli uses 200g Cashews, 50g Sugar).
   - Stock-short warning indicators on POS checkout.

6. **Worker Directory & Payroll**
   - Worker profiles (Photo, Joining Date, Role, Salary).
   - **Spreadsheet Attendance Matrix**: Calendar matrix where clicking any cell cycles through present, absent, half day, and paid leave.
   - Pro-rated salary disburser: calculates expected payable salary based on attendance logs and records disbursements in business expense logs automatically.

7. **Purchases & Suppliers**
   - Suppliers directory tracking outstanding balances and contact information.
   - Purchase invoice tracker: logging wholesale raw material buying, incrementing stock automatically, and updating supplier debt balances.
   - Supplier ledger: payments to clear outstandings.

8. **General Expenses**
   - Logs bills (rent, gas, electricity, packaging, transport, maintenance).
   - Dynamic analytics charts displaying category-wise distributions.

9. **Analytics Reports**
   - Estimated Profit & Loss sheets (Gross Sales, Net Revenue, COGS, Operating Expenses, Net Profits, and margins).
   - Interactive charts.

10. **Data Backup & Restore**
    - Instant JSON exports.
    - JSON imports to restore database files.

---

## How to Run the Application

### Prerequisites
- Node.js (v16.0.0 or higher recommended) installed.

### Steps to Run
1. Navigate to the project root directory:
   ```powershell
   cd "e:\web development\billing erp"
   ```
2. Install the dev server dependencies (Vite):
   ```powershell
   npm install
   ```
3. Launch the development server:
   ```powershell
   npm run dev
   ```
4. Open the browser and go to the local URL (usually `http://localhost:5173`).
5. Sign in with the default owner credentials:
   - **Username**: `owner`
   - **Password**: `admin123`
