import React, { useState } from 'react';
import { MapPin, Box, Layers, Info } from 'lucide-react';

export default function WarehouseMap({ inventory, locations }) {
  const [selectedBin, setSelectedBin] = useState(null);

  // Rows A, B, C, D
  const rows = ['A', 'B', 'C', 'D'];
  const binNumbers = Array.from({ length: 10 }, (_, i) => i + 1);

  // Group inventory by location code
  const inventoryByLocation = (inventory || []).reduce((acc, item) => {
    acc[item.location_code] = item;
    return acc;
  }, {});

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span>Warehouse 2D Topology Grid (Rows A-D, Bins 1-10)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time heat-mapped physical floor bin status
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span>Optimal (&gt;20)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span>Warning (10-20)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500 animate-pulse" />
            <span>Critical (&le;10)</span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="space-y-3 pt-2">
        {rows.map((row) => (
          <div key={row} className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-900/40 border border-blue-600/30 flex items-center justify-center text-xs font-mono font-black text-blue-300 flex-shrink-0">
              {row}
            </div>

            <div className="grid grid-cols-10 gap-1.5 flex-1">
              {binNumbers.map((bin) => {
                const code = `${row}-${bin.toString().padStart(2, '0')}`;
                const item = inventoryByLocation[code];
                const qty = item ? item.quantity : 0;
                const reorder = item ? item.reorder_level : 15;

                let colorClasses = 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600';
                if (item) {
                  if (qty <= reorder) {
                    colorClasses = 'bg-rose-950/40 border-rose-500/60 text-rose-300 hover:bg-rose-900/50';
                  } else if (qty <= reorder + 10) {
                    colorClasses = 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/50';
                  } else {
                    colorClasses = 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40';
                  }
                }

                const isSelected = selectedBin?.code === code;

                return (
                  <button
                    key={code}
                    onClick={() => setSelectedBin(item ? { ...item, code } : { code, empty: true })}
                    className={`h-11 rounded-lg border flex flex-col items-center justify-center text-center p-1 transition-all ${colorClasses} ${
                      isSelected ? 'ring-2 ring-blue-400 scale-105 z-10 shadow-lg' : ''
                    }`}
                    title={`${code}: ${item ? `${item.product_name} (${qty} units)` : 'Empty'}`}
                  >
                    <span className="text-[10px] font-mono font-bold leading-none">{bin}</span>
                    <span className="text-[9px] font-mono mt-0.5 font-bold">
                      {item ? `${qty}u` : '-'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Bin Inspection Drawer */}
      {selectedBin && (
        <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-mono font-bold text-sm">
              {selectedBin.code}
            </div>
            <div>
              <div className="text-white font-bold text-sm">
                {selectedBin.product_name || 'No Product Assigned to Bin'}
              </div>
              <div className="text-slate-400 font-mono text-[11px]">
                {selectedBin.sku ? `SKU: ${selectedBin.sku} | Category: ${selectedBin.category}` : 'Physical Bin Available'}
              </div>
            </div>
          </div>

          {selectedBin.quantity !== undefined && (
            <div className="flex items-center space-x-4 font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">CURRENT STOCK</span>
                <span className={`text-base font-bold ${
                  selectedBin.quantity <= selectedBin.reorder_level ? 'text-rose-400' : 'text-white'
                }`}>
                  {selectedBin.quantity} units
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">REORDER POINT</span>
                <span className="text-amber-400 text-base font-bold">{selectedBin.reorder_level}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">UNIT PRICE</span>
                <span className="text-emerald-400 text-base font-bold">${Number(selectedBin.price).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
