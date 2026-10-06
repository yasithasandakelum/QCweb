import React, { useState } from 'react';
import {
  AlertTriangle,
  Mail,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RejectedLotRecord } from '../../types';

export const RejectedLotsView: React.FC = () => {
  const { rejectedLots, systemConfig, urgentReplenishments } = useApp();
  const [selectedLot, setSelectedLot] = useState<RejectedLotRecord | null>(null);

  const openLots = rejectedLots.filter((r) => r.closureStatus !== 'Closed');
  const closedLots = rejectedLots.filter((r) => r.closureStatus === 'Closed');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>Rejected Lots & Urgent Replacements</span>
          </h2>
          <p className="text-xs text-slate-500">
            Rejected lots do not enter MRP receiving. Physical lots are returned to supplier and trigger replacement deliveries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-bold shadow-xs">
            {openLots.length} Active Replacements Pending
          </span>
        </div>
      </div>

      {/* Critical Business Rule Reminder Banner */}
      <div className="p-3.5 bg-white border border-slate-200 border-l-4 border-l-red-500 rounded-lg shadow-xs text-xs space-y-1">
        <div className="flex items-center gap-2 text-red-700 font-bold">
          <AlertTriangle className="w-4 h-4" />
          <span>Automated Business Rules for Rejected Inbound Lots</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          1. <strong>Zero MRP Entry:</strong> When a lot fails AQL, 0 units are credited to Daily Actual Receiving.
          <br />
          2. <strong>Same-Lorry Return:</strong> Defective lot is turned away and returned to {systemConfig.supplierName} in the same transport.
          <br />
          3. <strong>Urgent Replacement Delivery:</strong> Generates replacement code (e.g. <code>DEL-004-R1</code>) with target lead time of {systemConfig.urgentReplacementLeadDays} working days.
          <br />
          4. <strong>Automated Procurement Notification:</strong> Formal non-conformance dispatch sent to <code>{systemConfig.procurementEmail}</code>.
        </p>
      </div>

      {/* Rejected Lots Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
            Rejected Lot Ledger ({rejectedLots.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="mrp-table w-full">
            <thead>
              <tr>
                <th className="row-label">Delivery #</th>
                <th>Rejected Date</th>
                <th>Component</th>
                <th className="text-right">Lot Size</th>
                <th className="text-center">Defect Count</th>
                <th>Non-Conformance Reasons</th>
                <th className="text-center">Physical Return</th>
                <th>Urgent Replacement</th>
                <th className="text-center">Procurement Alert</th>
                <th className="text-right pr-4">Closure Status</th>
              </tr>
            </thead>
            <tbody>
              {rejectedLots.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No rejected lots recorded. All inbound supplier deliveries have passed AQL sampling limits.
                  </td>
                </tr>
              ) : (
                rejectedLots.map((rej) => {
                  const linkedUrgent = urgentReplenishments.find(
                    (u) => u.id === rej.urgentReplacementId
                  );

                  return (
                    <tr
                      key={rej.id}
                      className="hover:bg-slate-50 text-slate-700"
                    >
                      <td className="row-label font-bold text-red-600">
                        {rej.deliveryNumber}
                      </td>
                      <td className="text-slate-600">{rej.rejectedDate}</td>
                      <td className="font-semibold text-slate-800">
                        <span className="status-pill status-alert font-bold">
                          {rej.componentCode}
                        </span>
                      </td>
                      <td className="text-right value-mono font-bold text-slate-800">
                        {rej.lotSize}
                      </td>
                      <td className="text-center font-bold text-red-600 value-mono">
                        {rej.defectCount}
                      </td>
                      <td className="text-slate-600 max-w-xs truncate" title={rej.reasons.join(', ')}>
                        {rej.reasons.join(', ')}
                      </td>
                      <td className="text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] inline-flex items-center gap-1 font-medium">
                          <Truck className="w-3 h-3 text-blue-600" />
                          <span>Returned (Same Lorry)</span>
                        </span>
                      </td>
                      <td className="value-mono font-bold text-purple-700">
                        <div className="flex items-center gap-1.5">
                          <span>{rej.replacementDeliveryNumber || 'Pending'}</span>
                          {linkedUrgent && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              (Target: {linkedUrgent.targetDate})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="text-green-700 inline-flex items-center gap-1 text-[11px] font-medium">
                          <Mail className="w-3.5 h-3.5" />
                          <span>Dispatched</span>
                        </span>
                      </td>
                      <td className="text-right pr-4">
                        <span
                          className={`status-pill ${
                            rej.closureStatus === 'Closed'
                              ? 'status-safe'
                              : 'status-warning'
                          }`}
                        >
                          {rej.closureStatus}
                        </span>
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
};
