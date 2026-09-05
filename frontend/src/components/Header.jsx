import React from 'react';
import { 
  Boxes, 
  Tablet, 
  LayoutDashboard, 
  Radio, 
  QrCode, 
  AlertTriangle, 
  Package, 
  Truck
} from 'lucide-react';

export default function Header({ 
  currentView, 
  setCurrentView, 
  isConnected, 
  stats, 
  onOpenQrModal 
}) {
  return (
    <header className="border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-white font-mono">
                  AERO<span className="text-blue-500">WAREHOUSE</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Next-Gen Warehouse OS & Automated Procurement</p>
            </div>
          </div>

          {/* Navigation View Switcher */}
          <div className="flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setCurrentView('worker')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentView === 'worker'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Tablet className="w-4 h-4" />
              <span>Worker Tablet View</span>
              <span className="hidden md:inline-block text-[10px] px-1.5 py-0.2 bg-blue-400/20 rounded text-blue-200">
                Fast-Find
              </span>
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentView === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin Dashboard</span>
              {stats?.low_stock_count > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          </div>

          {/* Live Status & Quick Action */}
          <div className="flex items-center space-x-3">
            {/* Quick QR Generator */}
            <button
              onClick={onOpenQrModal}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Generate Cryptographic QR Item Tag"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-400" />
              <span>QR Tag Studio</span>
            </button>

            {/* Socket.io Indicator */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-mono font-medium ${
              isConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`} />
              <span className="hidden sm:inline">
                {isConnected ? 'LIVE ENGINE' : 'DISCONNECTED'}
              </span>
            </div>
          </div>

        </div>

        {/* Real-time KPI Bar */}
        <div className="py-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 overflow-x-auto gap-4 no-scrollbar">
          <div className="flex items-center space-x-6 min-w-max">
            <div className="flex items-center space-x-2">
              <Package className="w-3.5 h-3.5 text-blue-400" />
              <span>Total SKUs:</span>
              <span className="font-semibold text-white font-mono">{stats?.total_products || 50}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Boxes className="w-3.5 h-3.5 text-indigo-400" />
              <span>Inventory Units:</span>
              <span className="font-semibold text-white font-mono">{stats?.total_units?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`flex items-center space-x-1 px-2 py-0.5 rounded-md ${
                stats?.low_stock_count > 0 
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 animate-pulse' 
                  : 'text-slate-400'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Low Stock Thresholds:</span>
                <span className="font-mono">{stats?.low_stock_count || 0}</span>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Buy Pending POs:</span>
              <span className="font-semibold text-amber-300 font-mono">{stats?.pending_pos || 0}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono min-w-max hidden md:block">
            Routing: Physical Straight-Line (A-01 → D-10)
          </div>
        </div>

      </div>
    </header>
  );
}
