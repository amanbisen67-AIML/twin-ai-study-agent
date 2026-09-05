import React, { useState, useEffect } from 'react';
import { X, QrCode, Sparkles, Copy, Check, Download, Layers } from 'lucide-react';

export default function QrGeneratorModal({ isOpen, onClose, initialSku, products }) {
  const [selectedSku, setSelectedSku] = useState(initialSku || '');
  const [loading, setLoading] = useState(false);
  const [generatedTag, setGeneratedTag] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialSku) {
      setSelectedSku(initialSku);
      generateTag(initialSku);
    } else if (products && products.length > 0 && !selectedSku) {
      setSelectedSku(products[0].sku);
    }
  }, [initialSku, products]);

  if (!isOpen) return null;

  const generateTag = async (skuToGen) => {
    const sku = skuToGen || selectedSku;
    if (!sku) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/products/${sku}/generate-tag`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedTag(data.tag);
      } else {
        setError(data.error || 'Failed to generate QR tag');
      }
    } catch (err) {
      setError('Network error generating QR tag');
    } finally {
      setLoading(false);
    }
  };

  const copyHash = () => {
    if (generatedTag?.batch_hash) {
      navigator.clipboard.writeText(generatedTag.batch_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0f172a] border border-slate-700 shadow-2xl p-6 sm:p-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Cryptographic QR ItemTag Studio</h3>
            <p className="text-xs text-slate-400">Generates unique SHA-256 batch hash tags for physical tracking</p>
          </div>
        </div>

        {/* Product Selector */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Select Product SKU:
            </label>
            <div className="flex space-x-2">
              <select
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {(products || []).map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => generateTag(selectedSku)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Generating...' : 'Generate'}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Generated QR Preview */}
          {generatedTag && (
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-inner max-w-xs mx-auto">
                <img
                  src={generatedTag.qr_code_base64}
                  alt={`QR code for ${generatedTag.sku}`}
                  className="w-48 h-48 object-contain"
                />
                <div className="text-center mt-2 font-mono text-slate-900 font-bold text-xs tracking-wider">
                  {generatedTag.sku}
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  LOCATION: {generatedTag.location_code}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">BATCH HASH:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400 font-bold">{generatedTag.batch_hash}</span>
                    <button
                      onClick={copyHash}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Copy Hash"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">PHYSICAL BIN:</span>
                  <span className="text-white font-bold">{generatedTag.location_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ENGINE:</span>
                  <span className="text-emerald-400">Node crypto (SHA-256)</span>
                </div>
              </div>

              <a
                href={generatedTag.qr_code_base64}
                download={`${generatedTag.sku}-tag.png`}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Print-Ready PNG Tag</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
