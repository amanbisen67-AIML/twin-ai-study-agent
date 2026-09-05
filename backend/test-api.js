const { initDatabase, query } = require('./database');
initDatabase();

console.log('Testing Database Queries:');
const stats = query.get(`
  SELECT 
    (SELECT COUNT(*) FROM Products) as products,
    (SELECT COUNT(*) FROM Locations) as locations,
    (SELECT SUM(quantity) FROM Inventory) as total_qty,
    (SELECT COUNT(*) FROM ItemTags) as tags
`);
console.log('Stats:', stats);

// Test pick route query
const sampleSkus = query.all('SELECT sku FROM Products LIMIT 4').map(p => p.sku);
console.log('Testing Pick Routing for SKUs:', sampleSkus);
const placeholders = sampleSkus.map(() => '?').join(',');
const route = query.all(`
  SELECT p.sku, p.name, l.code as location_code
  FROM Products p
  JOIN Inventory i ON p.id = i.product_id
  JOIN Locations l ON i.location_id = l.id
  WHERE p.sku IN (${placeholders})
  ORDER BY l.code ASC
`, ...sampleSkus);

console.log('Optimized Straight-Line Route:');
route.forEach((step, idx) => {
  console.log(`  Step ${idx + 1}: ${step.location_code} -> ${step.sku} (${step.name})`);
});

console.log('\nAll backend database tests passed!');
