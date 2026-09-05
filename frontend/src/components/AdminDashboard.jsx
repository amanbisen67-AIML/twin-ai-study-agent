import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Truck, 
  Activity, 
  QrCode, 
  Search, 
  CheckCircle, 
  Clock, 
  ArrowDownRight, 
  RefreshCw, 
  Box, 
  Boxes, 
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import WarehouseMap from './WarehouseMap';

export default function AdminDashboard({ 
  inventory, 
  purchaseOrders, 
  workerActions, 
  onReceivePO, 
  onOpenQrModal, 
  refreshAll 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [receivingId, setReceivingId] = useState(null);

  // Extract unique categories
  const categories = ['ALL', ...new Set((inventory || []).map((i) => i.category).filter(Boolean))];

  // Filtered inventory list
  const filteredInventory = (inventory || []).filter((item) => {
    const matchesSearch = 
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Pending Auto-Buy Purchase Orders
  const pendingOrders = (purchaseOrders || []).filter((po) => po.status === 'PENDING');

  const handleReceiveClick = async (poId) => {
    try {
      setReceivingId(poId);
      await onReceivePO(poId);
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* 1. AUTO-BUY PROCUREMENT ALERT CENTER */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
              <Truck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Auto-Buy Automated Procurement Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingOrders.length} ACTIVE POs
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Triggered automatically when inventory deductions breach safety stock thresholds
              </p>
            </div>
          </div>

          <button
            onClick={refreshAll}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Engine</span>
          </button>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400 mb-2 opacity-80" />
            <p className="text-white font-semibold">Warehouse Healthy: No Active Auto-Buy Alerts</p>
            <p className="text-xs text-slate-400 mt-0.5">
              All inventory levels are currently above reorder limits. Pick items on Worker Tablet to trigger automated restocking.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingOrders.map((po) => (
              <div 
                key={po.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-lg relative flex flex-col justify-between group hover:border-amber-400 transition"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-amber-400 font-bold tracking-wider">{po.po_number}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                      RESTOCK: +{po.quantity} UNITS
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white line-clamp-1 mb-1">
                    {po.product_name}
                  </h4>
                  <div className="text-xs font-mono text-slate-400 mb-3">
                    SKU: <span className="text-blue-400">{po.sku}</span> | Category: {po.category}
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 mb-4">
                    <div className="flex items-center space-x-1.5 text-amber-300 font-medium mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{po.trigger_reason}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Threshold: <strong>{po.reorder_level}</strong> units | Auto-Buy Qty: <strong>{po.quantity}</strong> units
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleReceiveClick(po.id)}
                  disabled={receivingId === po.id}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Truck className={`w-4 h-4 ${receivingId === po.id ? 'animate-bounce' : ''}`} />
                  <span>{receivingId === po.id ? 'Processing Inbound Restock...' : 'Receive & Restock Stock (+50)'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. LIVE SPLIT VIEW: 2D FLOOR MAP + LIVE WORKER ACTION FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Warehouse 2D Topology Grid */}
        <div className="lg:col-span-7">
          <WarehouseMap inventory={inventory} />
        </div>

        {/* Live Worker Activity Stream */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-base font-bold text-white">Live Worker Action Stream</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Socket.io Broadcast</span>
          </div>

          <div className="space-y-3 flex-1 max-h-[380px] overflow-y-auto pr-1">
            {(workerActions || []).length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No recent actions yet. Worker picks and auto-buys will appear here in real-time.
              </div>
            ) : (
              workerActions.map((act, index) => {
                let badgeClasses = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                if (act.type === 'AUTO_BUY') badgeClasses = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                if (act.type === 'PO_RECEIVED') badgeClasses = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                if (act.type === 'QR_GENERATED') badgeClasses = 'bg-purple-500/20 text-purple-400 border-purple-500/30';

                return (
                  <div 
                    key={index}
                    className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs flex items-start space-x-3 transition hover:bg-slate-800/40"
                  >
                    <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border mt-0.5 uppercase ${badgeClasses}`}>
                      {act.type || 'ACTION'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 truncate">{act.title || act.sku}</span>
                        <span className="text-[10px] font-mono text-slate-500 ml-2">
                          {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5 truncate">{act.description}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 3. LIVE INVENTORY MASTER DATA TABLE */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Boxes className="w-5 h-5 text-blue-400" />
              <span>Warehouse Inventory Master Table</span>
            </h3>
            <p className="text-xs text-slate-400">
              Live synchronized stock positions across Rows A-D and Bins 1-10
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search SKU, Product, Bin..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">SKU / Batch</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Unit Price</th>
                <th className="py-3.5 px-4 text-center">Stock Level</th>
                <th className="py-3.5 px-4 text-center">Threshold</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No matching inventory items found.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isLow = item.quantity <= item.reorder_level;
                  return (
                    <tr 
                      key={item.inventory_id} 
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isLow ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className="px-2 py-1 rounded bg-slate-800 text-blue-400 border border-slate-700">
                          {item.location_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-slate-200">{item.sku}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[100px]">
                          {item.batch_hash || 'SHA-256'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-white max-w-[220px] truncate">
                        {item.product_name}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                        ${Number(item.price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          isLow 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' 
                            : 'bg-slate-800 text-slate-200'
                        }`}>
                          {item.quantity} units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {item.reorder_level}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onOpenQrModal(item.sku)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition inline-flex items-center space-x-1"
                          title="Inspect or Regenerate QR Code"
                        >
                          <QrCode className="w-3 h-3 text-blue-400" />
                          <span>QR Tag</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
