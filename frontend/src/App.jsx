import React, { useState, useEffect, useCallback } from 'react';
import { socket } from './socket';
import Header from './components/Header';
import WorkerView from './components/WorkerView';
import AdminDashboard from './components/AdminDashboard';
import QrGeneratorModal from './components/QrGeneratorModal';
import { sounds } from './components/SoundEffects';

export default function App() {
  const [currentView, setCurrentView] = useState('worker'); // 'worker' | 'admin'
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [workerActions, setWorkerActions] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedSkuForQr, setSelectedSkuForQr] = useState(null);

  // Fetch warehouse state from backend
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      setInventory(data);
    } catch (e) {
      console.error('Error fetching inventory:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch('/api/purchase-orders');
      const data = await res.json();
      setPurchaseOrders(data);
    } catch (e) {
      console.error('Error fetching POs:', e);
    }
  };

  const fetchMovements = async () => {
    try {
      const res = await fetch('/api/movements');
      const data = await res.json();
      const initialActions = data.map((m) => ({
        type: m.type,
        sku: m.sku,
        title: `${m.worker_name} ${m.type === 'PICK' ? 'Picked Item' : 'Restocked'}`,
        description: `${m.quantity_change > 0 ? '+' : ''}${m.quantity_change} units at ${m.location_code || 'Bin'}`,
        timestamp: m.timestamp
      }));
      setWorkerActions(initialActions);
    } catch (e) {
      console.error('Error fetching movements:', e);
    }
  };

  const refreshAll = useCallback(() => {
    fetchStats();
    fetchInventory();
    fetchProducts();
    fetchPurchaseOrders();
    fetchMovements();
  }, []);

  // Initial load & Socket.io listeners
  useEffect(() => {
    refreshAll();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    // Real-Time Stock Update (pick or restock)
    function onStockUpdate(data) {
      console.log('⚡ [SOCKET] stockUpdate received:', data);
      
      // Update inventory table in state
      setInventory((prev) =>
        prev.map((item) => {
          if (item.sku === data.sku && (item.location_code === data.location_code || !data.location_code)) {
            return {
              ...item,
              quantity: data.remaining_quantity
            };
          }
          return item;
        })
      );

      // Refresh aggregate stats
      fetchStats();
    }

    // Real-Time Auto-Buy Alert
    function onAutoBuyTriggered(data) {
      console.log('🚨 [SOCKET] autoBuyTriggered received:', data);
      sounds.playAlert();
      
      // Add PO to top of state
      if (data.po) {
        setPurchaseOrders((prev) => [
          {
            ...data.po,
            sku: data.product.sku,
            product_name: data.product.name,
            category: data.product.category,
            reorder_level: data.product.reorder_level
          },
          ...prev
        ]);
      }
      fetchStats();
    }

    // Live Worker Activity Stream Event
    function onWorkerAction(action) {
      console.log('👷 [SOCKET] workerAction:', action);
      setWorkerActions((prev) => [action, ...prev.slice(0, 40)]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('stockUpdate', onStockUpdate);
    socket.on('autoBuyTriggered', onAutoBuyTriggered);
    socket.on('workerAction', onWorkerAction);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('stockUpdate', onStockUpdate);
      socket.off('autoBuyTriggered', onAutoBuyTriggered);
      socket.off('workerAction', onWorkerAction);
    };
  }, [refreshAll]);

  // Handle PO Receiving / Restocking
  const handleReceivePO = async (poId) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        refreshAll();
      }
    } catch (e) {
      console.error('Error receiving PO:', e);
    }
  };

  const handleOpenQrModal = (sku) => {
    setSelectedSkuForQr(sku || (products[0] ? products[0].sku : null));
    setQrModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e17] text-slate-100">
      
      {/* Sticky Header with Navigation & Socket.io badge */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        isConnected={isConnected}
        stats={stats}
        onOpenQrModal={() => handleOpenQrModal(null)}
      />

      {/* Main View Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {currentView === 'worker' ? (
          <WorkerView
            onPickCompleted={() => {
              fetchStats();
              fetchInventory();
              fetchPurchaseOrders();
            }}
          />
        ) : (
          <AdminDashboard
            inventory={inventory}
            purchaseOrders={purchaseOrders}
            workerActions={workerActions}
            onReceivePO={handleReceivePO}
            onOpenQrModal={handleOpenQrModal}
            refreshAll={refreshAll}
          />
        )}
      </main>

      {/* Cryptographic QR ItemTag Generator Modal */}
      <QrGeneratorModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        initialSku={selectedSkuForQr}
        products={products}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0d1322] py-4 text-center text-xs text-slate-500 font-mono">
        AERO-WAREHOUSE OS • SQLite Zero-Config • Socket.io Realtime • Straight-Line Pick Route Optimizer
      </footer>

    </div>
  );
}
