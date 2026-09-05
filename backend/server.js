/**
 * Warehouse Inventory System - Backend API Server
 * Features:
 * - Express REST API
 * - Socket.io Real-Time Synchronization
 * - Cryptographic QR Code Generation (crypto + qrcode)
 * - Auto-Buy Procurement Engine
 * - Optimized Straight-Line Pick Routing (Sorted by physical bin code)
 * - Zero-config native SQLite (DatabaseSync)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { db, initDatabase, query } = require('./database');

// Initialize database tables
initDatabase();

const app = express();
const server = http.createServer(app);

// Configure Socket.io with permissive CORS for development
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Track connected sockets
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.emit('connected', { message: 'Connected to Warehouse Realtime Engine', socketId: socket.id });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

/**
 * -------------------------------------------------------------
 * HELPER: AUTO-BUY PROCUREMENT ENGINE
 * Automatically evaluates stock thresholds and creates POs
 * -------------------------------------------------------------
 */
function checkAndTriggerAutoBuy(productId, workerName = 'System Auto-Buy Engine') {
  const product = query.get('SELECT * FROM Products WHERE id = ?', productId);
  if (!product) return null;

  // Calculate total on-hand stock across all warehouse locations
  const stockResult = query.get(`
    SELECT COALESCE(SUM(quantity), 0) as total_stock 
    FROM Inventory 
    WHERE product_id = ?
  `, productId);

  const currentTotal = stockResult ? stockResult.total_stock : 0;

  // If current stock is at or below reorder_level
  if (currentTotal <= product.reorder_level) {
    // Check if an open/pending PO already exists to avoid duplicate floods
    const existingPo = query.get(`
      SELECT * FROM PurchaseOrders 
      WHERE product_id = ? AND status IN ('PENDING', 'ORDERED')
      ORDER BY id DESC LIMIT 1
    `, productId);

    if (existingPo) {
      console.log(`⚠️ Auto-Buy: Pending PO #${existingPo.po_number} already active for ${product.sku}.`);
      return { triggered: false, po: existingPo, reason: 'Active PO already exists' };
    }

    // Generate unique Purchase Order Number
    const poNumber = `PO-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const reason = `Automated Procurement Trigger: On-hand stock (${currentTotal}) dropped <= threshold (${product.reorder_level}).`;

    const poInsert = query.run(`
      INSERT INTO PurchaseOrders (po_number, product_id, quantity, status, trigger_reason)
      VALUES (?, ?, ?, 'PENDING', ?)
    `, poNumber, product.id, product.reorder_quantity, reason);

    const createdPo = query.get('SELECT * FROM PurchaseOrders WHERE id = ?', Number(poInsert.lastInsertRowid));

    const alertPayload = {
      po: createdPo,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        reorder_level: product.reorder_level,
        reorder_quantity: product.reorder_quantity
      },
      currentStock: currentTotal,
      timestamp: new Date().toISOString()
    };

    console.log(`🚨 [AUTO-BUY TRIGGERED] ${product.sku} - Stock: ${currentTotal}. Created ${poNumber} for ${product.reorder_quantity} units.`);

    // Broadcast to all connected Admin dashboards
    io.emit('autoBuyTriggered', alertPayload);

    io.emit('workerAction', {
      type: 'AUTO_BUY',
      sku: product.sku,
      title: 'Auto-Buy PO Created',
      description: `Stock: ${currentTotal}/${product.reorder_level}. Ordered +${product.reorder_quantity} units.`,
      poNumber: poNumber,
      timestamp: new Date().toISOString()
    });

    return { triggered: true, po: createdPo };
  }

  return { triggered: false, currentStock: currentTotal };
}

/**
 * -------------------------------------------------------------
 * API ROUTES
 * -------------------------------------------------------------
 */

// 1. Warehouse Overview Stats
app.get('/api/stats', (req, res) => {
  try {
    const stats = query.get(`
      SELECT 
        (SELECT COUNT(*) FROM Products) as total_products,
        (SELECT COUNT(*) FROM Locations) as total_locations,
        (SELECT COALESCE(SUM(quantity), 0) FROM Inventory) as total_units,
        (SELECT COUNT(DISTINCT p.id) 
         FROM Products p 
         JOIN (SELECT product_id, SUM(quantity) as stock FROM Inventory GROUP BY product_id) s 
         ON p.id = s.product_id 
         WHERE s.stock <= p.reorder_level) as low_stock_count,
        (SELECT COUNT(*) FROM PurchaseOrders WHERE status = 'PENDING') as pending_pos
    `);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Products List
app.get('/api/products', (req, res) => {
  try {
    const products = query.all(`
      SELECT 
        p.*,
        COALESCE(SUM(i.quantity), 0) as current_stock,
        t.batch_hash as latest_batch_hash,
        t.qr_code_base64
      FROM Products p
      LEFT JOIN Inventory i ON p.id = i.product_id
      LEFT JOIN (
        SELECT product_id, batch_hash, qr_code_base64
        FROM ItemTags
        GROUP BY product_id
        HAVING MAX(id)
      ) t ON p.id = t.product_id
      GROUP BY p.id
      ORDER BY p.name ASC
    `);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Warehouse Locations & Grid
app.get('/api/locations', (req, res) => {
  try {
    const locations = query.all(`
      SELECT 
        l.*,
        COUNT(i.id) as item_count,
        COALESCE(SUM(i.quantity), 0) as total_units
      FROM Locations l
      LEFT JOIN Inventory i ON l.id = i.location_id
      GROUP BY l.id
      ORDER BY l.code ASC
    `);
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Detailed Inventory (Items + Locations + Stock)
app.get('/api/inventory', (req, res) => {
  try {
    const inventory = query.all(`
      SELECT 
        i.id as inventory_id,
        i.quantity,
        i.updated_at,
        p.id as product_id,
        p.sku,
        p.name as product_name,
        p.category,
        p.price,
        p.reorder_level,
        p.reorder_quantity,
        l.id as location_id,
        l.code as location_code,
        l.row_zone,
        l.bin_number,
        l.shelf_tier,
        t.batch_hash,
        t.qr_code_base64
      FROM Inventory i
      JOIN Products p ON i.product_id = p.id
      JOIN Locations l ON i.location_id = l.id
      LEFT JOIN (
        SELECT product_id, batch_hash, qr_code_base64
        FROM ItemTags
        GROUP BY product_id
        HAVING MAX(id)
      ) t ON p.id = t.product_id
      ORDER BY l.code ASC
    `);
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. QR Code Generation Endpoint
app.post('/api/products/:sku/generate-tag', async (req, res) => {
  try {
    const { sku } = req.params;
    const product = query.get('SELECT * FROM Products WHERE sku = ?', sku);

    if (!product) {
      return res.status(404).json({ error: `Product with SKU '${sku}' not found.` });
    }

    // Generate unique batch hash using crypto SHA-256
    const entropy = `${sku}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const batchHash = crypto
      .createHash('sha256')
      .update(entropy)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();

    // Fetch primary warehouse location for QR metadata
    const inv = query.get(`
      SELECT l.code 
      FROM Inventory i 
      JOIN Locations l ON i.location_id = l.id 
      WHERE i.product_id = ? 
      LIMIT 1
    `, product.id);

    const locationCode = inv ? inv.code : 'UNASSIGNED';

    // Build QR payload
    const qrPayload = JSON.stringify({
      sku: product.sku,
      name: product.name,
      batch: batchHash,
      location: locationCode,
      ts: new Date().toISOString()
    });

    // Create Base64 QR code image
    const qrCodeBase64 = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 260,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    // Save to ItemTags table
    const result = query.run(`
      INSERT INTO ItemTags (product_id, batch_hash, qr_code_base64)
      VALUES (?, ?, ?)
    `, product.id, batchHash, qrCodeBase64);

    const createdTag = {
      id: Number(result.lastInsertRowid),
      product_id: product.id,
      sku: product.sku,
      product_name: product.name,
      batch_hash: batchHash,
      qr_code_base64: qrCodeBase64,
      location_code: locationCode,
      created_at: new Date().toISOString()
    };

    io.emit('workerAction', {
      type: 'QR_GENERATED',
      sku: product.sku,
      title: 'New QR Item Tag Generated',
      description: `Batch ${batchHash} assigned to ${product.name}`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Cryptographic QR Item Tag generated successfully.',
      tag: createdTag
    });
  } catch (err) {
    console.error('Error generating QR tag:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Optimized Straight-Line Pick Routing
app.post('/api/orders/pick-route', (req, res) => {
  try {
    const { skus } = req.body;

    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of SKUs in the request body.' });
    }

    const placeholders = skus.map(() => '?').join(',');

    // Fetch items with inventory and warehouse locations
    // Sorted alphabetically by physical location code (e.g. A-01, A-04, B-02, C-09, D-10)
    // so the worker walks in an uninterrupted straight, non-backtracking line!
    const pickList = query.all(`
      SELECT 
        p.id as product_id,
        p.sku,
        p.name,
        p.category,
        p.price,
        p.reorder_level,
        i.id as inventory_id,
        i.quantity as on_hand_quantity,
        l.id as location_id,
        l.code as location_code,
        l.row_zone,
        l.bin_number,
        l.shelf_tier,
        t.batch_hash,
        t.qr_code_base64
      FROM Products p
      JOIN Inventory i ON p.id = i.product_id
      JOIN Locations l ON i.location_id = l.id
      LEFT JOIN (
        SELECT product_id, batch_hash, qr_code_base64
        FROM ItemTags
        GROUP BY product_id
        HAVING MAX(id)
      ) t ON p.id = t.product_id
      WHERE p.sku IN (${placeholders})
      ORDER BY l.code ASC, p.sku ASC
    `, ...skus);

    // Annotate with route step sequence numbers
    const sequencedRoute = pickList.map((item, index) => ({
      ...item,
      step_number: index + 1,
      total_steps: pickList.length,
      is_picked: false
    }));

    res.json({
      success: true,
      order_id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      total_items: sequencedRoute.length,
      route_strategy: 'Physical Bin Straight-Line Sort (A-01 -> D-10)',
      pick_list: sequencedRoute
    });
  } catch (err) {
    console.error('Error computing pick route:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper endpoint to generate a random 3-5 item test pick order
app.post('/api/orders/generate-random', (req, res) => {
  try {
    const randomProducts = query.all(`
      SELECT p.sku 
      FROM Products p 
      JOIN Inventory i ON p.id = i.product_id 
      WHERE i.quantity > 0 
      ORDER BY RANDOM() 
      LIMIT 4
    `);

    const skus = randomProducts.map((p) => p.sku);

    // Call pick route logic
    const placeholders = skus.map(() => '?').join(',');
    const pickList = query.all(`
      SELECT 
        p.id as product_id,
        p.sku,
        p.name,
        p.category,
        p.price,
        p.reorder_level,
        i.id as inventory_id,
        i.quantity as on_hand_quantity,
        l.id as location_id,
        l.code as location_code,
        l.row_zone,
        l.bin_number,
        l.shelf_tier,
        t.batch_hash,
        t.qr_code_base64
      FROM Products p
      JOIN Inventory i ON p.id = i.product_id
      JOIN Locations l ON i.location_id = l.id
      LEFT JOIN (
        SELECT product_id, batch_hash, qr_code_base64
        FROM ItemTags
        GROUP BY product_id
        HAVING MAX(id)
      ) t ON p.id = t.product_id
      WHERE p.sku IN (${placeholders})
      ORDER BY l.code ASC
    `, ...skus);

    const sequencedRoute = pickList.map((item, index) => ({
      ...item,
      step_number: index + 1,
      total_steps: pickList.length,
      pick_quantity: 1,
      is_picked: false
    }));

    res.json({
      success: true,
      order_id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      total_items: sequencedRoute.length,
      route_strategy: 'Physical Bin Straight-Line Sort (A-01 -> D-10)',
      pick_list: sequencedRoute
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Worker Item Pick Execution
app.post('/api/inventory/pick', (req, res) => {
  try {
    const { sku, location_id, quantity = 1, worker_name = 'Tablet Worker 01' } = req.body;

    if (!sku) {
      return res.status(400).json({ error: 'SKU is required' });
    }

    const product = query.get('SELECT * FROM Products WHERE sku = ?', sku);
    if (!product) {
      return res.status(404).json({ error: `Product with SKU ${sku} not found.` });
    }

    // Find inventory entry
    let inv;
    if (location_id) {
      inv = query.get('SELECT * FROM Inventory WHERE product_id = ? AND location_id = ?', product.id, location_id);
    } else {
      inv = query.get('SELECT * FROM Inventory WHERE product_id = ? AND quantity >= ? ORDER BY quantity DESC LIMIT 1', product.id, quantity);
    }

    if (!inv || inv.quantity < quantity) {
      return res.status(400).json({
        error: `Insufficient inventory for SKU '${sku}'. Requested: ${quantity}, Available: ${inv ? inv.quantity : 0}`
      });
    }

    const newQuantity = inv.quantity - quantity;

    // Deduct stock
    query.run(`
      UPDATE Inventory 
      SET quantity = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, newQuantity, inv.id);

    // Audit log in StockMovement
    query.run(`
      INSERT INTO StockMovement (product_id, location_id, type, quantity_change, worker_name)
      VALUES (?, ?, 'PICK', ?, ?)
    `, product.id, inv.location_id, -quantity, worker_name);

    // Fetch location details for display
    const location = query.get('SELECT * FROM Locations WHERE id = ?', inv.location_id);

    // Automatic Check: Auto-Buy Engine Trigger
    const autoBuyResult = checkAndTriggerAutoBuy(product.id, worker_name);

    // Real-Time WebSocket Event Emission
    const stockUpdatePayload = {
      sku: product.sku,
      product_name: product.name,
      location_code: location ? location.code : 'UNKNOWN',
      location_id: inv.location_id,
      deducted: quantity,
      remaining_quantity: newQuantity,
      worker_name,
      timestamp: new Date().toISOString()
    };

    io.emit('stockUpdate', stockUpdatePayload);

    io.emit('workerAction', {
      type: 'ITEM_PICKED',
      sku: product.sku,
      title: `${worker_name} Picked Item`,
      description: `Picked ${quantity}x from ${location ? location.code : 'Bin'}. Remaining: ${newQuantity}`,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Successfully picked ${quantity}x of ${sku}.`,
      deducted: quantity,
      remaining: newQuantity,
      location: location ? location.code : null,
      autoBuyTriggered: autoBuyResult ? autoBuyResult.triggered : false,
      purchaseOrder: autoBuyResult ? autoBuyResult.po : null
    });
  } catch (err) {
    console.error('Error during pick execution:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Purchase Orders List & Management
app.get('/api/purchase-orders', (req, res) => {
  try {
    const orders = query.all(`
      SELECT 
        po.*,
        p.sku,
        p.name as product_name,
        p.category,
        p.price,
        p.reorder_level
      FROM PurchaseOrders po
      JOIN Products p ON po.product_id = p.id
      ORDER BY po.id DESC
    `);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Receive / Restock Purchase Order (Replenishment Action)
app.post('/api/purchase-orders/:id/receive', (req, res) => {
  try {
    const { id } = req.params;
    const po = query.get('SELECT * FROM PurchaseOrders WHERE id = ?', id);

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }

    if (po.status === 'RECEIVED') {
      return res.status(400).json({ error: 'This Purchase Order has already been received and restocked.' });
    }

    // Find primary location to receive inventory into
    let inv = query.get('SELECT * FROM Inventory WHERE product_id = ? LIMIT 1', po.product_id);
    let locationId;

    if (inv) {
      locationId = inv.location_id;
      const newQty = inv.quantity + po.quantity;
      query.run('UPDATE Inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', newQty, inv.id);
    } else {
      // Pick first available location
      const firstLoc = query.get('SELECT id FROM Locations LIMIT 1');
      locationId = firstLoc.id;
      query.run('INSERT INTO Inventory (product_id, location_id, quantity) VALUES (?, ?, ?)', po.product_id, locationId, po.quantity);
    }

    // Update PO status
    query.run(`UPDATE PurchaseOrders SET status = 'RECEIVED' WHERE id = ?`, id);

    // Record stock movement
    query.run(`
      INSERT INTO StockMovement (product_id, location_id, type, quantity_change, worker_name)
      VALUES (?, ?, 'RESTOCK', ?, 'Procurement Intake')
    `, po.product_id, locationId, po.quantity);

    const product = query.get('SELECT * FROM Products WHERE id = ?', po.product_id);
    const location = query.get('SELECT * FROM Locations WHERE id = ?', locationId);
    const updatedInv = query.get('SELECT quantity FROM Inventory WHERE product_id = ? AND location_id = ?', po.product_id, locationId);

    // Broadcast restock updates
    io.emit('stockUpdate', {
      sku: product.sku,
      product_name: product.name,
      location_code: location ? location.code : 'UNKNOWN',
      location_id: locationId,
      deducted: -po.quantity,
      remaining_quantity: updatedInv ? updatedInv.quantity : po.quantity,
      worker_name: 'Procurement Intake',
      timestamp: new Date().toISOString()
    });

    io.emit('workerAction', {
      type: 'PO_RECEIVED',
      sku: product.sku,
      title: `PO #${po.po_number} Restocked`,
      description: `Replenished +${po.quantity} units into ${location ? location.code : 'Warehouse'}`,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Purchase Order ${po.po_number} marked as RECEIVED. +${po.quantity} restocked.`,
      po_id: id,
      new_quantity: updatedInv ? updatedInv.quantity : po.quantity
    });
  } catch (err) {
    console.error('Error receiving PO:', err);
    res.status(500).json({ error: err.message });
  }
});

// 10. Audit Log / Recent Movements
app.get('/api/movements', (req, res) => {
  try {
    const movements = query.all(`
      SELECT 
        sm.*,
        p.sku,
        p.name as product_name,
        l.code as location_code
      FROM StockMovement sm
      JOIN Products p ON sm.product_id = p.id
      LEFT JOIN Locations l ON sm.location_id = l.id
      ORDER BY sm.id DESC
      LIMIT 50
    `);
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Warehouse Inventory Backend Engine LIVE on port ${PORT}`);
  console.log(`⚡ WebSocket Server Active (Socket.io)`);
  console.log(`📡 Ready for Worker Tablet & Admin Command Center`);
  console.log(`======================================================\n`);
});
