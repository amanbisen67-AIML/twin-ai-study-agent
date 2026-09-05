import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  MapPin, 
  ArrowRight, 
  RotateCcw, 
  QrCode, 
  Package, 
  Layers, 
  Sparkles, 
  ScanLine, 
  Truck, 
  Clock, 
  Check,
  AlertCircle
} from 'lucide-react';
import { sounds } from './SoundEffects';

export default function WorkerView({ onPickCompleted }) {
  const [pickOrder, setPickOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [lastPickedInfo, setLastPickedInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch or generate a default pick order
  const generateNewOrder = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/orders/generate-random', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPickOrder(data);
        setActiveStepIndex(0);
        setLastPickedInfo(null);
      } else {
        setErrorMessage(data.error || 'Failed to generate pick order');
      }
    } catch (err) {
      setErrorMessage('Network error fetching pick order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateNewOrder();
  }, []);

  const currentItem = pickOrder?.pick_list?.[activeStepIndex];
  const allPicked = pickOrder?.pick_list && pickOrder.pick_list.every((item) => item.is_picked);
  const pickedCount = pickOrder?.pick_list?.filter((item) => item.is_picked).length || 0;
  const progressPercent = pickOrder?.total_items ? Math.round((pickedCount / pickOrder.total_items) * 100) : 0;

  // Simulate scanning and trigger pick API
  const handleScanAndPick = async () => {
    if (!currentItem || currentItem.is_picked || isScanning) return;

    try {
      setIsScanning(true);
      setErrorMessage(null);

      // Play authentic industrial barcode scanner beep
      sounds.playScanSuccess();

      // Small delay to simulate optical scan sweep
      await new Promise((resolve) => setTimeout(resolve, 600));

      const res = await fetch('/api/inventory/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: currentItem.sku,
          location_id: currentItem.location_id,
          quantity: 1,
          worker_name: 'Tablet Operator #07'
        })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Pick deduction failed');
      }

      // Mark current item as picked in local state
      const updatedList = [...pickOrder.pick_list];
      updatedList[activeStepIndex] = {
        ...updatedList[activeStepIndex],
        is_picked: true,
        picked_at: new Date().toLocaleTimeString(),
        remaining_quantity: result.remaining
      };

      setPickOrder({
        ...pickOrder,
        pick_list: updatedList
      });

      setLastPickedInfo({
        sku: currentItem.sku,
        name: currentItem.name,
        location: currentItem.location_code,
        remaining: result.remaining,
        autoBuyTriggered: result.autoBuyTriggered,
        po: result.purchaseOrder
      });

      if (result.autoBuyTriggered) {
        sounds.playAlert();
      }

      if (onPickCompleted) {
        onPickCompleted(result);
      }

      // Check if order is fully completed
      const nextIndex = updatedList.findIndex((item) => !item.is_picked);
      if (nextIndex === -1) {
        // Confetti celebration!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setActiveStepIndex(nextIndex);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Tablet Top Controls & Order Status */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-mono font-bold tracking-wide uppercase">
                Order #{pickOrder?.order_id || 'LOAD...'}
              </span>
              <span className="text-xs text-slate-400 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Path: <strong>Straight-Line Bin Route (A → D)</strong></span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
              Fast-Find Pick Sequence
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={generateNewOrder}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Spawn New Batch</span>
            </button>
          </div>
        </div>

        {/* Pick Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex justify-between items-center text-xs font-mono mb-1.5">
            <span className="text-slate-400">BATCH FULFILLMENT PROGRESS</span>
            <span className="text-blue-400 font-bold">{pickedCount} / {pickOrder?.total_items || 0} ITEMS ({progressPercent}%)</span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Straight-Line Timeline Route */}
        {pickOrder?.pick_list && (
          <div className="mt-6">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
              <span>Optimized Walking Waypoints:</span>
              <span className="text-slate-500">(No backtracking)</span>
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
              {pickOrder.pick_list.map((item, idx) => {
                const isCurrent = idx === activeStepIndex && !allPicked;
                return (
                  <button
                    key={item.sku + idx}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl border text-xs font-mono transition-all min-w-max ${
                      item.is_picked
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200 ring-2 ring-blue-500/50 shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      item.is_picked 
                        ? 'bg-emerald-500 text-slate-950' 
                        : isCurrent 
                        ? 'bg-blue-500 text-white animate-pulse' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.is_picked ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                    </span>
                    <span className="font-bold">{item.location_code}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300 truncate max-w-[120px]">{item.sku}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Focus: Current Pick Item Card OR Completion Screen */}
      {allPicked ? (
        <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-xl" />
          <div className="relative z-10 max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pick Batch Completed!
            </h3>
            <p className="text-sm text-slate-300">
              All items collected along the optimal straight-line warehouse path. Inventory has been synchronized in real-time.
            </p>
            <div className="pt-4">
              <button
                onClick={generateNewOrder}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/25 transition transform active:scale-95"
              >
                Start Next Pick Order
              </button>
            </div>
          </div>
        </div>
      ) : currentItem ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Target Location Spotlight (Big Rugged Tablet Card) */}
          <div className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-8 border border-blue-500/40 shadow-2xl relative overflow-hidden">
            
            {/* Background scanner line effect when scanning */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none z-20">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#ef4444] animate-scan" />
                <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] transition-all" />
              </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>STEP {activeStepIndex + 1} OF {pickOrder.total_items}</span>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-800 text-slate-300">
                Target SKU: {currentItem.sku}
              </span>
            </div>

            {/* Giant Physical Location Beacon */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 rounded-2xl p-6 border border-slate-700/80 mb-6">
              <div className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-1">
                Walk To Physical Bin:
              </div>
              <div className="flex flex-wrap items-baseline gap-4 sm:gap-6">
                <span className="text-4xl sm:text-6xl font-black text-white font-mono tracking-tight">
                  {currentItem.location_code}
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-mono text-sm font-semibold border border-blue-500/30">
                    Row {currentItem.row_zone}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono text-sm font-semibold border border-indigo-500/30">
                    Bin #{currentItem.bin_number}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-sm font-semibold border border-slate-700">
                    Shelf Tier {currentItem.shelf_tier}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4 mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  {currentItem.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                  {currentItem.name}
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-mono">REQUIRED QTY</span>
                  <span className="text-lg font-bold text-white font-mono">1 UNIT</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-mono">ON-HAND STOCK</span>
                  <span className="text-lg font-bold text-slate-200 font-mono">
                    {currentItem.on_hand_quantity} units
                  </span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-mono">REORDER THRESHOLD</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">
                    {currentItem.reorder_level} units
                  </span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-mono">UNIT VALUE</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    ${Number(currentItem.price).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Threshold warning note if stock is close */}
              {currentItem.on_hand_quantity <= currentItem.reorder_level + 1 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>
                    <strong>Auto-Buy Watch:</strong> Picking this item will drop warehouse stock to or below {currentItem.reorder_level}. The Auto-Buy Procurement Engine will immediately fire.
                  </span>
                </div>
              )}
            </div>

            {/* Massive Tablet Action Button: SCAN QR & PICK */}
            <button
              onClick={handleScanAndPick}
              disabled={isScanning || currentItem.is_picked}
              className={`w-full py-5 px-6 rounded-2xl font-black text-lg sm:text-xl tracking-wide uppercase transition-all shadow-2xl flex items-center justify-center space-x-3 ${
                isScanning
                  ? 'bg-rose-600 text-white animate-pulse'
                  : currentItem.is_picked
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/40 hover:shadow-blue-600/60 transform active:scale-[0.98]'
              }`}
            >
              {isScanning ? (
                <>
                  <ScanLine className="w-7 h-7 animate-spin" />
                  <span>Laser Reading Optical QR...</span>
                </>
              ) : currentItem.is_picked ? (
                <>
                  <CheckCircle2 className="w-7 h-7" />
                  <span>Item Confirmed & Picked</span>
                </>
              ) : (
                <>
                  <QrCode className="w-7 h-7" />
                  <span>Scan QR & Confirm Pick</span>
                </>
              )}
            </button>
          </div>

          {/* Side Panel: QR Tag Inspection & Recent Pick Feedback */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* QR Code Tag Card */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase text-slate-400 flex items-center space-x-1.5">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  <span>Item Batch QR Tag</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  ECC Level H
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl flex items-center justify-center shadow-inner">
                {currentItem.qr_code_base64 ? (
                  <img
                    src={currentItem.qr_code_base64}
                    alt={`QR Code for ${currentItem.sku}`}
                    className="w-44 h-44 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                    No QR Generated
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">BATCH HASH:</span>
                  <span className="text-blue-400 font-bold">{currentItem.batch_hash || 'SHA-256'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TAG STATUS:</span>
                  <span className="text-emerald-400">VERIFIED AUTHENTIC</span>
                </div>
              </div>
            </div>

            {/* Last Pick Outcome Feedback Card */}
            {lastPickedInfo && (
              <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30 bg-emerald-950/20 shadow-lg animate-fade-in">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold font-mono mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>LAST ACTION SUMMARY</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  Picked 1x {lastPickedInfo.sku}
                </p>
                <div className="text-xs text-slate-300 mt-1">
                  Location: <span className="font-mono text-emerald-300 font-bold">{lastPickedInfo.location}</span> | Remaining: <span className="font-mono">{lastPickedInfo.remaining}</span>
                </div>

                {lastPickedInfo.autoBuyTriggered && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2 animate-pulse">
                    <Truck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <strong>Auto-Buy PO #{lastPickedInfo.po?.po_number}</strong> created! Restock queued.
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      ) : null}

    </div>
  );
}
