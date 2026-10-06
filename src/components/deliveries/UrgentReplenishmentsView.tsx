import React, { useState } from 'react';
import {
  AlertCircle,
  Clock,
  Mail,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UrgentReplenishmentRecord } from '../../types';

export const UrgentReplenishmentsView: React.FC = () => {
  const { urgentReplenishments, systemConfig, updateUrgentStatus, activeRole } = useApp();

  const [selectedUrgent, setSelectedUrgent] = useState<UrgentReplenishmentRecord | null>(null);
  const [confirmedDateInput, setConfirmedDateInput] = useState<string>('');

  const isProcurementOrAdmin =
    activeRole === 'Procurement' || activeRole === 'Supervisor' || activeRole === 'Manager';

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-red-600" />
            <span>Urgent Replenishments & Safety Buffer Escalations</span>
          </h2>
          <p className="text-xs text-slate-500">
            Emergency component replenishment workflows triggered by rejected inbound lots or safety stock threshold breaches.
          </p>
        </div>

        <div className="text-xs">
          <span className="text-slate-500">Target Supplier Lead Time: </span>
          <strong className="text-slate-800 font-bold">{systemConfig.urgentReplacementLeadDays} Working Days</strong>
        </div>
      </div>

      {/* Urgent Replenishments Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
            Urgent Replenishment Queue ({urgentReplenishments.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="mrp-table w-full">
            <thead>
              <tr>
                <th className="row-label">Trigger Source</th>
                <th>Component</th>
                <th className="text-right">Required Qty</th>
                <th>Requested At</th>
                <th>Target Arrival</th>
                <th>Confirmed Date</th>
                <th className="text-center">Supplier Email</th>
                <th className="text-center">Status</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {urgentReplenishments.map((urg) => {
                const isRejectedSource = urg.sourceType === 'REJECTED_LOT';

                return (
                  <tr key={urg.id} className="hover:bg-slate-50 text-slate-700">
                    <td className="row-label font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {isRejectedSource ? (
                          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        )}
                        <span className="truncate">{urg.reason}</span>
                      </div>
                    </td>

                    <td className="font-semibold text-slate-800">
                      <span className="status-pill status-safe font-bold">
                        {urg.componentCode}
                      </span>
                    </td>

                    <td className="text-right value-mono font-bold text-red-600">
                      {urg.quantity}
                    </td>

                    <td className="text-slate-500">
                      {new Date(urg.requestedAt).toLocaleDateString()}
                    </td>

                    <td className="value-mono font-bold text-slate-900">{urg.targetDate}</td>

                    <td className="value-mono font-semibold text-emerald-700">
                      {urg.confirmedDate || 'Awaiting'}
                    </td>

                    <td className="text-center">
                      <span className="text-green-700 inline-flex items-center gap-1 text-[11px] font-medium">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Dispatched</span>
                      </span>
                    </td>

                    <td className="text-center">
                      <span
                        className={`status-pill ${
                          urg.status === 'Completed'
                            ? 'status-safe font-bold'
                            : urg.status === 'Confirmed by Supplier'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                            : 'status-warning font-semibold'
                        }`}
                      >
                        {urg.status}
                      </span>
                    </td>

                    <td className="pr-4 text-right">
                      {isProcurementOrAdmin && urg.status !== 'Completed' && (
                        <button
                          onClick={() => {
                            setSelectedUrgent(urg);
                            setConfirmedDateInput(urg.targetDate);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-blue-600 text-[11px] font-semibold border border-slate-200 transition-colors"
                        >
                          Update Status
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Confirmation Sub-modal */}
      {selectedUrgent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-4 sm:p-5 text-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Supplier Confirmation Update</span>
              </h3>
              <button onClick={() => setSelectedUrgent(null)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p>
                <strong>Component:</strong> {selectedUrgent.componentCode} ({selectedUrgent.quantity} units)
              </p>
              <p>
                <strong>Reason:</strong> {selectedUrgent.reason}
              </p>
              <p>
                <strong>Calculated Target Date:</strong> {selectedUrgent.targetDate}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier Confirmed Delivery Date
                </label>
                <input
                  type="date"
                  value={confirmedDateInput}
                  onChange={(e) => setConfirmedDateInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    updateUrgentStatus(selectedUrgent.id, 'Confirmed by Supplier', confirmedDateInput);
                    setSelectedUrgent(null);
                  }}
                  className="py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                >
                  Confirm Supplier ETA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateUrgentStatus(selectedUrgent.id, 'Completed');
                    setSelectedUrgent(null);
                  }}
                  className="py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  Mark Delivered & Closed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
