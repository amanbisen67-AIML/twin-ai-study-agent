# AERO-WAREHOUSE: Next-Gen E-Commerce Warehouse Inventory System

A production-ready full-stack Warehouse Logistics & Automated Procurement Operating System built with **Node.js, Express, SQLite (zero-config `node:sqlite`), Socket.io, React, and Tailwind CSS**.

---

## Architecture Overview

```
newman/
├── backend/
│   ├── database.js          # SQLite tables setup (Products, Locations, Inventory, ItemTags, PurchaseOrders, StockMovement)
│   ├── seed.js              # Database seeder (50 products, 40 locations A-01 to D-10, QR codes)
│   ├── server.js            # Express API, Socket.io server, Auto-Buy engine, Straight-line pick router
│   ├── integration-test.js  # Automated E2E test suite
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx           # Real-time WebSocket connection status & view switcher
│   │   │   ├── WorkerView.jsx       # Rugged tablet view: Fast-find pick path & QR scan simulation
│   │   │   ├── AdminDashboard.jsx   # Command center: Auto-Buy alerts, live worker feed, inventory table
│   │   │   ├── WarehouseMap.jsx     # 2D visual topology floor grid (Rows A-D, Bins 1-10)
│   │   │   ├── QrGeneratorModal.jsx # Cryptographic SHA-256 batch QR tag generator
│   │   │   └── SoundEffects.js      # Web Audio API industrial scanner & alert beeps
│   │   ├── App.jsx                  # Master controller & WebSocket subscriptions
│   │   ├── socket.js                # Socket.io client singleton
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
└── package.json                     # Monorepo root runner scripts
```

---

## Next-Gen Features

1. **Cryptographic QR Code Generation (`crypto` + `qrcode`)**:
   - Computes unique tamper-evident SHA-256 batch hashes.
   - Generates high-density ECC Level H base64 QR codes stored in `ItemTags`.
   - Print-ready and viewable directly in the UI.

2. **Auto-Buy Procurement Engine**:
   - Monitors inventory during picks.
   - If stock falls at or below safety stock threshold (`reorder_level`), automatically creates a Purchase Order in `PurchaseOrders`.
   - Instantly broadcasts `autoBuyTriggered` alerts to the Admin Dashboard via WebSockets.
   - Includes one-click **"Receive & Restock"** replenishment.

3. **Optimized Straight-Line Pick Routing**:
   - Evaluates order SKUs and sorts waypoints alphabetically by physical bin location (`A-01` -> `D-10`).
   - Ensures warehouse pickers walk in an efficient straight line with zero backtracking.

4. **Real-Time WebSockets (`Socket.io`)**:
   - Emits `stockUpdate` on every item pick or replenishment.
   - Live activity stream tracks every worker action with millisecond timestamps.

5. **Industrial Worker Tablet View (Fast Find)**:
   - High-contrast touch interface with giant location beacons (`Row`, `Bin`, `Shelf`).
   - Synthetic Web Audio scanner beeps on pick.
   - Visual progress bar and celebratory completion feedback.

---

## Quick Start (Terminal Commands)

### 1. Terminal 1: Backend Server

```bash
cd backend
npm install
node seed.js     # Seeds 50 products & warehouse locations
npm start        # Launches server on http://localhost:5000
```

### 2. Terminal 2: Frontend Web App

```bash
cd frontend
npm install
npm run dev      # Launches React app on http://localhost:5173
```

Open **`http://localhost:5173`** in your browser.

---

## Running Verification Tests

To run the automated end-to-end integration test suite:

```bash
cd backend
node integration-test.js
```
