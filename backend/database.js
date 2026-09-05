/**
 * Database Module for Warehouse Inventory System
 * Powered by Node.js native DatabaseSync (node:sqlite)
 * Zero-configuration, synchronous, prepared-statement SQLite engine.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'warehouse.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high-performance concurrent access
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initializes database schema with all required tables:
 * - Products
 * - Locations
 * - Inventory
 * - ItemTags (QR codes)
 * - PurchaseOrders (Auto-Buy procurement)
 * - StockMovement (Audit log)
 */
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      reorder_level INTEGER NOT NULL DEFAULT 15,
      reorder_quantity INTEGER NOT NULL DEFAULT 50,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      row_zone TEXT NOT NULL,
      bin_number INTEGER NOT NULL,
      shelf_tier INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS Inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE CASCADE,
      UNIQUE(product_id, location_id)
    );

    CREATE TABLE IF NOT EXISTS ItemTags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_hash TEXT UNIQUE NOT NULL,
      qr_code_base64 TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS PurchaseOrders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ORDERED', 'RECEIVED'
      trigger_reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS StockMovement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'PICK', 'RESTOCK', 'INITIAL', 'TRANSFER'
      quantity_change INTEGER NOT NULL,
      worker_name TEXT DEFAULT 'Worker-01',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES Locations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_products_sku ON Products(sku);
    CREATE INDEX IF NOT EXISTS idx_locations_code ON Locations(code);
    CREATE INDEX IF NOT EXISTS idx_inventory_product ON Inventory(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_location ON Inventory(location_id);
    CREATE INDEX IF NOT EXISTS idx_po_status ON PurchaseOrders(status);
  `);
}

// Helper query wrappers for clean application code
const query = {
  all(sql, ...params) {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },
  get(sql, ...params) {
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  },
  run(sql, ...params) {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  }
};

module.exports = {
  db,
  initDatabase,
  query
};
