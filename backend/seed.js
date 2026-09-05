/**
 * Warehouse Seeding Script
 * Generates:
 * - 40 Warehouse Locations across Rows A-D, Bins 1-10
 * - 50 Realistic E-Commerce / Tech Products with realistic SKUs and Reorder Levels
 * - Distributed Inventory across locations (with some near reorder levels for instant Auto-Buy testing)
 * - Initial cryptographic QR Code ItemTags
 */

const crypto = require('crypto');
const QRCode = require('qrcode');
const { db, initDatabase, query } = require('./database');

async function seed() {
  console.log('⚡ Initializing database schema...');
  initDatabase();

  // Clear existing data in correct FK order
  console.log('🧹 Clearing previous warehouse records...');
  db.exec(`
    DELETE FROM StockMovement;
    DELETE FROM PurchaseOrders;
    DELETE FROM ItemTags;
    DELETE FROM Inventory;
    DELETE FROM Locations;
    DELETE FROM Products;
  `);

  console.log('📦 Seeding Warehouse Locations (Rows A-D, Bins 1-10)...');
  const rows = ['A', 'B', 'C', 'D'];
  const locations = [];
  const insertLocationStmt = db.prepare(`
    INSERT INTO Locations (code, row_zone, bin_number, shelf_tier)
    VALUES (?, ?, ?, ?)
  `);

  for (const row of rows) {
    for (let bin = 1; bin <= 10; bin++) {
      const code = `${row}-${bin.toString().padStart(2, '0')}`;
      const shelfTier = (bin % 3) + 1; // Tier 1, 2, or 3
      const res = insertLocationStmt.run(code, row, bin, shelfTier);
      locations.push({ id: Number(res.lastInsertRowid), code, row, bin });
    }
  }
  console.log(`✅ Created ${locations.length} warehouse locations (A-01 through D-10).`);

  console.log('🏭 Seeding 50 E-Commerce Products...');
  const productCatalog = [
    // Category: Electronics & Peripherals
    { name: 'Logitech MX Master 3S Wireless Mouse', cat: 'Electronics', price: 99.99, min: 15, qty: 50 },
    { name: 'Keychron Q1 Pro Mechanical Keyboard', cat: 'Electronics', price: 199.00, min: 10, qty: 40 },
    { name: 'Sony WH-1000XM5 Noise Canceling Headphones', cat: 'Electronics', price: 348.00, min: 12, qty: 30 },
    { name: 'Dell UltraSharp 27" 4K USB-C Monitor', cat: 'Electronics', price: 479.99, min: 8, qty: 25 },
    { name: 'Elgato Stream Deck MK.2 Studio Controller', cat: 'Electronics', price: 149.99, min: 15, qty: 45 },
    { name: 'Anker 737 Power Bank 24000mAh 140W', cat: 'Electronics', price: 109.99, min: 20, qty: 60 },
    { name: 'Shure SM7B Cardioid Dynamic Vocal Mic', cat: 'Electronics', price: 399.00, min: 8, qty: 20 },
    { name: 'Apple iPad Air 11-inch M2 128GB Space Gray', cat: 'Electronics', price: 599.00, min: 10, qty: 35 },
    { name: 'DJI Mini 4 Pro 4K Drone Fly More Combo', cat: 'Electronics', price: 759.00, min: 6, qty: 15 },
    { name: 'Razer DeathAdder V3 Pro Ultra-lightweight', cat: 'Electronics', price: 139.99, min: 18, qty: 55 },

    // Category: Warehouse & Rugged Hardware
    { name: 'Zebra TC26 Handheld Touch Mobile Computer', cat: 'Industrial', price: 620.00, min: 5, qty: 15 },
    { name: 'Honeywell Voyager 1400g 2D Barcode Scanner', cat: 'Industrial', price: 185.50, min: 10, qty: 30 },
    { name: 'Dymo LabelWriter 450 Turbo Thermal Printer', cat: 'Industrial', price: 129.99, min: 12, qty: 35 },
    { name: 'Milwaukee High-Dexterity Nitrile Work Gloves', cat: 'Industrial', price: 14.99, min: 40, qty: 120 },
    { name: '3M Heavy-Duty Packaging Tape 6-Pack', cat: 'Industrial', price: 24.50, min: 30, qty: 100 },
    { name: 'Slice Ceramic Box Cutter Retractable Blade', cat: 'Industrial', price: 19.99, min: 25, qty: 80 },
    { name: 'Vestil Heavy Duty 500lb Hand Truck Trolley', cat: 'Industrial', price: 189.00, min: 6, qty: 18 },
    { name: 'Fluke 117 True-RMS Multimeter', cat: 'Industrial', price: 229.99, min: 8, qty: 25 },
    { name: 'Mitutoyo 500-196-30 Advanced Digital Caliper', cat: 'Industrial', price: 135.00, min: 10, qty: 30 },
    { name: 'Industrial High-Visibility Safety Vest (L)', cat: 'Industrial', price: 12.50, min: 50, qty: 150 },

    // Category: Apparel & Wearables
    { name: 'Champion Reverse Weave Heavyweight Hoodie', cat: 'Apparel', price: 65.00, min: 20, qty: 60 },
    { name: 'Nike Air Force 1 07 Triple White (Size 10)', cat: 'Apparel', price: 115.00, min: 15, qty: 45 },
    { name: 'Patagonia Better Sweater Fleece Full-Zip', cat: 'Apparel', price: 149.00, min: 12, qty: 35 },
    { name: 'Carhartt Rugged Flex Canvas Work Dungaree', cat: 'Apparel', price: 59.99, min: 25, qty: 75 },
    { name: 'Darn Tough Vermont Hiker Boot Full Cushion', cat: 'Apparel', price: 27.00, min: 35, qty: 90 },
    { name: 'North Face Recon Everyday Commuter Backpack', cat: 'Apparel', price: 109.00, min: 15, qty: 40 },
    { name: 'Lululemon Metal Vent Tech Short Sleeve Shirt', cat: 'Apparel', price: 78.00, min: 20, qty: 50 },
    { name: 'Adidas Ultraboost Light Running Shoes (Size 9.5)', cat: 'Apparel', price: 190.00, min: 14, qty: 40 },
    { name: 'Ray-Ban Classic Aviator Polarized Sunglasses', cat: 'Apparel', price: 175.00, min: 10, qty: 30 },
    { name: 'Columbia Watertight II Packable Rain Jacket', cat: 'Apparel', price: 89.99, min: 16, qty: 45 },

    // Category: Home, Kitchen & Coffee
    { name: 'Breville Barista Touch Espresso Machine', cat: 'Home & Kitchen', price: 999.95, min: 4, qty: 12 },
    { name: 'Fellow Ode Gen 2 Brew Burr Coffee Grinder', cat: 'Home & Kitchen', price: 345.00, min: 8, qty: 24 },
    { name: 'Vitamix 5200 Professional-Grade Blender', cat: 'Home & Kitchen', price: 449.95, min: 6, qty: 18 },
    { name: 'Cosori Pro III Dual Blaze Smart Air Fryer 6.8Qt', cat: 'Home & Kitchen', price: 169.99, min: 15, qty: 45 },
    { name: 'Yeti Rambler 36 oz Vacuum Insulated Bottle', cat: 'Home & Kitchen', price: 50.00, min: 30, qty: 80 },
    { name: 'Le Creuset Enameled Cast Iron Dutch Oven 5.5Qt', cat: 'Home & Kitchen', price: 420.00, min: 5, qty: 15 },
    { name: 'Wüsthof Classic 8-Inch Chef Knife High Carbon', cat: 'Home & Kitchen', price: 170.00, min: 10, qty: 30 },
    { name: 'Benriner Japanese Mandoline Slicer Classic', cat: 'Home & Kitchen', price: 42.00, min: 20, qty: 50 },
    { name: 'BenQ ScreenBar Plus e-Reading LED Monitor Light', cat: 'Home & Kitchen', price: 139.00, min: 15, qty: 40 },
    { name: 'OXO Good Grips Pop Food Storage 10-Piece Set', cat: 'Home & Kitchen', price: 112.99, min: 18, qty: 50 },

    // Category: Gaming & Smart Workspace
    { name: 'Sony PlayStation 5 DualSense Edge Wireless Controller', cat: 'Gaming', price: 199.99, min: 12, qty: 36 },
    { name: 'Xbox Wireless Controller Robot White Edition', cat: 'Gaming', price: 59.99, min: 25, qty: 70 },
    { name: 'SteelSeries QcK Heavy XXL Gaming Mouse Pad', cat: 'Gaming', price: 29.99, min: 40, qty: 100 },
    { name: 'Meta Quest 3 128GB Mixed Reality Headset', cat: 'Gaming', price: 499.99, min: 8, qty: 25 },
    { name: 'Govee RGBIC Neon TV & Desk Backlight Rope', cat: 'Gaming', price: 69.99, min: 20, qty: 55 },
    { name: 'Secretlab TITAN Evo Ergonomic Gaming Chair (PU)', cat: 'Gaming', price: 549.00, min: 5, qty: 15 },
    { name: 'Samsung 990 PRO 2TB PCIe 4.0 NVMe SSD M.2', cat: 'Gaming', price: 179.99, min: 20, qty: 60 },
    { name: 'Corsair Vengeance DDR5 RAM 32GB (2x16GB) 6000MHz', cat: 'Gaming', price: 114.99, min: 25, qty: 75 },
    { name: 'Audio-Technica ATH-M50xBT2 Wireless Studio Monitor', cat: 'Gaming', price: 199.00, min: 15, qty: 45 },
    { name: 'CalDigit TS4 Thunderbolt 4 18-Port Premium Dock', cat: 'Gaming', price: 399.95, min: 6, qty: 20 }
  ];

  const insertProductStmt = db.prepare(`
    INSERT INTO Products (sku, name, category, price, reorder_level, reorder_quantity)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertInventoryStmt = db.prepare(`
    INSERT INTO Inventory (product_id, location_id, quantity)
    VALUES (?, ?, ?)
  `);

  const insertTagStmt = db.prepare(`
    INSERT INTO ItemTags (product_id, batch_hash, qr_code_base64)
    VALUES (?, ?, ?)
  `);

  const insertMovementStmt = db.prepare(`
    INSERT INTO StockMovement (product_id, location_id, type, quantity_change, worker_name)
    VALUES (?, ?, 'INITIAL', ?, 'System Seeder')
  `);

  let lowStockCount = 0;

  for (let i = 0; i < productCatalog.length; i++) {
    const item = productCatalog[i];
    const catCode = item.cat.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const sku = `SKU-${catCode}-${(i + 1).toString().padStart(4, '0')}`;

    const prodRes = insertProductStmt.run(
      sku,
      item.name,
      item.cat,
      item.price,
      item.min,
      item.qty
    );
    const productId = Number(prodRes.lastInsertRowid);

    // Distribute across 1 to 2 locations
    const assignedLocation = locations[i % locations.length];

    // Intentionally assign stock so that 8 items start right at or near reorder level
    // This allows immediate demonstration of Auto-Buy when worker picks them!
    let initialQty;
    if (i < 8) {
      initialQty = item.min + 1; // Picking 1-2 will instantly trigger Auto-Buy!
      lowStockCount++;
    } else {
      initialQty = Math.floor(Math.random() * 45) + (item.min + 10);
    }

    insertInventoryStmt.run(productId, assignedLocation.id, initialQty);
    insertMovementStmt.run(productId, assignedLocation.id, initialQty);

    // Generate cryptographic QR tag
    const batchHash = crypto
      .createHash('sha256')
      .update(`${sku}-BATCH-${Date.now()}-${i}`)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();

    const qrPayload = JSON.stringify({
      sku,
      name: item.name,
      batch: batchHash,
      location: assignedLocation.code,
      ver: '1.0'
    });

    const qrBase64 = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 200,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    insertTagStmt.run(productId, batchHash, qrBase64);
  }

  console.log(`✅ Seeded 50 products with inventory and cryptographic QR ItemTags.`);
  console.log(`🎯 ${lowStockCount} products are primed right near their reorder threshold for immediate Auto-Buy demonstration.`);

  const summary = query.get(`
    SELECT 
      (SELECT COUNT(*) FROM Products) as total_products,
      (SELECT COUNT(*) FROM Locations) as total_locations,
      (SELECT SUM(quantity) FROM Inventory) as total_stock,
      (SELECT COUNT(*) FROM ItemTags) as total_qr_tags
  `);
  console.log('\n📊 Warehouse Database Summary:', summary);
}

seed()
  .then(() => {
    console.log('🎉 Database seeding completed successfully!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
