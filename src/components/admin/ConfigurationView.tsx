import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Save,
  Settings,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ConfigurationView: React.FC = () => {
  const { systemConfig, updateSystemConfig, activeRole } = useApp();

  // General settings state
  const [companyName, setCompanyName] = useState<string>(systemConfig.companyName);
  const [supplierName, setSupplierName] = useState<string>(systemConfig.supplierName);
  const [procurementEmail, setProcurementEmail] = useState<string>(systemConfig.procurementEmail);
  const [urgentLeadDays, setUrgentLeadDays] = useState<number>(
    systemConfig.urgentReplacementLeadDays
  );

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const isAdmin = activeRole === 'Manager' || activeRole === 'Supervisor';

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemConfig({
      companyName,
      supplierName,
      procurementEmail,
      urgentReplacementLeadDays: urgentLeadDays,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>System Configuration & Business Parameters</span>
          </h2>
          <p className="text-xs text-slate-500">
            Delivery constraints, fixed batch specifications, safety stock buffers, and company settings.
          </p>
        </div>

        {savedSuccess && (
          <span className="px-3 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Configuration Saved Successfully</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Component Delivery Constraints & BB Config */}
        <div className="lg:col-span-7 space-y-4">
          {/* BB Fixed Batch Specification Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Component BB Batch Size Specification (Fixed at 160 Units)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Component BB (Inner Tub) delivery batch size is strictly fixed at 160 units (1 full lorry load).
                </p>
              </div>

              <span className="status-pill status-safe font-bold">
                Fixed &amp; Locked
              </span>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Standard Batch Quantity:</span>
                <strong className="text-emerald-800 value-mono text-sm font-black">160 units / lorry</strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Delivery Structure:</span>
                <span className="text-slate-800 font-semibold">Strict Multiples of 160 (Full Lorry Loads)</span>
              </div>
              <p className="text-[11px] text-emerald-800/80 pt-1 border-t border-emerald-200/60">
                ✓ By operational requirement and supplier contract, Component BB delivery batch size cannot be changed. All planned orders and deliveries are placed in fixed lots of 160.
              </p>
            </div>
          </div>

          {/* All Components Rules Matrix */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Fixed Component Constraints Matrix
            </h3>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-blue-700">AA (Outer Tub)</div>
                <div className="text-[11px] text-slate-600">Multiplier: <strong>1x</strong></div>
                <div className="text-[11px] text-slate-600">Min Delivery: <strong>150</strong></div>
                <div className="text-[11px] text-slate-600">Max Delivery: <strong>300</strong></div>
              </div>

              <div className="p-3 bg-emerald-50/40 rounded-lg border border-emerald-200 space-y-1">
                <div className="font-bold text-emerald-700">BB (Inner Tub)</div>
                <div className="text-[11px] text-slate-600">Multiplier: <strong>1x</strong></div>
                <div className="text-[11px] text-slate-600">
                  Fixed Batch: <strong className="text-emerald-700">160 (1 Lorry)</strong>
                </div>
                <div className="text-[11px] text-slate-600">Status: <strong>Fixed &amp; Locked</strong></div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-amber-700">CC (Ridgeform)</div>
                <div className="text-[11px] text-slate-600">Multiplier: <strong>3x</strong></div>
                <div className="text-[11px] text-slate-600">Min Delivery: <strong>250</strong></div>
                <div className="text-[11px] text-slate-600">Max Delivery: <strong>560</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: General Company & Procurement Settings */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Company & Procurement Parameters</span>
            </h3>

            <form onSubmit={handleSaveGeneral} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Inbound Supplier (Active: 1)
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                />
                <p className="text-[10px] text-emerald-700 mt-1">
                  ✓ Structure ready for multi-supplier scale; defaults to 1 active supplier.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Procurement Non-Conformance Dispatch Email
                </label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={procurementEmail}
                  onChange={(e) => setProcurementEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-60 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Urgent Replenishment Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  disabled={!isAdmin}
                  value={urgentLeadDays}
                  onChange={(e) => setUrgentLeadDays(parseInt(e.target.value) || 2)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 disabled:opacity-60"
                />
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save General Parameters</span>
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
