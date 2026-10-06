import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Edit3,
  FileCheck2,
  FileText,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { COMPONENT_DEFECT_REASONS } from '../../data/seedData';
import { ComponentCode, DefectItem, InspectionRecord } from '../../types';
import { EditInspectionModal } from './EditInspectionModal';
import { InspectionReportModal } from './InspectionReportModal';
import { NewInspectionModal } from './NewInspectionModal';
import { PeriodSelector } from '../common/PeriodSelector';

export const QualityInspectionView: React.FC = () => {
  const {
    inspections,
    activeRole,
    currentUser,
    updateInspectionStage2,
    getComponentStock,
  } = useApp();

  const [filterComponent, setFilterComponent] = useState<string>('ALL');
  const [filterDecision, setFilterDecision] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedInspectionForReport, setSelectedInspectionForReport] =
    useState<InspectionRecord | null>(null);
  const [editingInspection, setEditingInspection] = useState<InspectionRecord | null>(null);

  // Stage 2 completion modal
  const [stage2ModalInsp, setStage2ModalInsp] = useState<InspectionRecord | null>(null);
  const [stage2Defects, setStage2Defects] = useState<DefectItem[]>([]);
  const [showStage2Verification, setShowStage2Verification] = useState<boolean>(false);

  const handleOpenStage2 = (insp: InspectionRecord) => {
    setStage2ModalInsp(insp);
    const reasons = COMPONENT_DEFECT_REASONS[insp.componentCode] || ['General Non-conformance'];
    const initial: DefectItem[] = reasons.map((reason, idx) => ({
      id: `s2-${insp.id}-${idx}`,
      reason,
      count: 0,
      sourceCategory: 'Supplier production defect',
      notes: '',
    }));
    setStage2Defects(initial);
  };

  const stage2TotalDefects = stage2Defects.reduce(
    (sum, d) => sum + (Number(d.count) || 0),
    0
  );

  const handleUpdateStage2Count = (id: string, count: number) => {
    const safe = Math.max(0, isNaN(count) ? 0 : Math.floor(count));
    setStage2Defects((prev) =>
      prev.map((d) => (d.id === id ? { ...d, count: safe } : d))
    );
  };

  const handleIncrementStage2 = (id: string, delta: number) => {
    setStage2Defects((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, count: Math.max(0, (Number(d.count) || 0) + delta) } : d
      )
    );
  };

  const filteredInspections = inspections.filter((insp) => {
    if (filterComponent !== 'ALL' && insp.componentCode !== filterComponent) return false;
    if (filterDecision !== 'ALL' && insp.finalDecision !== filterDecision) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        insp.deliveryNumber.toLowerCase().includes(q) ||
        insp.inspectorName.toLowerCase().includes(q) ||
        insp.componentCode.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalCount = inspections.length;
  const acceptedCount = inspections.filter((i) => i.finalDecision === 'Accepted').length;
  const rejectedCount = inspections.filter((i) => i.finalDecision === 'Rejected').length;
  const pendingStage2Count = inspections.filter(
    (i) => i.status === 'Second Sample Required'
  ).length;
  const pendingSignoffCount = inspections.filter(
    (i) => i.status === 'Awaiting Supervisor Approval'
  ).length;
  const passRate = totalCount > 0 ? ((acceptedCount / totalCount) * 100).toFixed(1) : '100';

  const handleCompleteStage2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage2ModalInsp) return;
    setShowStage2Verification(true);
  };

  const handleConfirmedStage2Submit = () => {
    if (!stage2ModalInsp) return;
    const nonZeroStage2 = stage2Defects.filter((d) => d.count > 0);
    const targetId = stage2ModalInsp.id;
    updateInspectionStage2(targetId, stage2TotalDefects, nonZeroStage2);
    setShowStage2Verification(false);
    setStage2ModalInsp(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Incoming Quality Inspection</span>
          </h2>
          <p className="text-xs text-slate-500">
            Authoritative ANSI/ASQ Z1.4-2003 Normal Sampling (Single & Double) @ General Level II
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <PeriodSelector />
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Quality Inspection</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-xs">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
            Total Inbound Lots
          </span>
          <span className="text-2xl font-black text-slate-800 value-mono mt-1 block">{totalCount}</span>
          <span className="text-[10px] text-slate-500">100% General Level II</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-xs">
          <span className="text-[10px] text-emerald-600 block font-bold uppercase tracking-wider">
            Accepted Lots
          </span>
          <span className="text-2xl font-black text-emerald-600 value-mono mt-1 block">{acceptedCount}</span>
          <span className="text-[10px] text-emerald-600/80">Fed to MRP Actual Receiving</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-xs">
          <span className="text-[10px] text-red-600 block font-bold uppercase tracking-wider">
            Rejected Lots
          </span>
          <span className="text-2xl font-black text-red-600 value-mono mt-1 block">{rejectedCount}</span>
          <span className="text-[10px] text-red-500/80">Returned + Urgent Replaced</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-xs">
          <span className="text-[10px] text-blue-600 block font-bold uppercase tracking-wider">
            Acceptance Rate
          </span>
          <span className="text-2xl font-black text-blue-600 value-mono mt-1 block">{passRate}%</span>
          <span className="text-[10px] text-slate-500">Target ≥ 95.0%</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-xs">
          <span className="text-[10px] text-amber-600 block font-bold uppercase tracking-wider">
            Pending Sign-off
          </span>
          <span className="text-2xl font-black text-amber-600 value-mono mt-1 block">
            {pendingSignoffCount + pendingStage2Count}
          </span>
          <span className="text-[10px] text-slate-500">
            {pendingStage2Count > 0 ? `${pendingStage2Count} Stage 2 pending` : 'Ready for review'}
          </span>
        </div>
      </div>

      {/* Live Warehouse Usable Inventory Strip */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white p-3.5 rounded-xl border border-slate-700/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Live Warehouse Usable Inventory</span>
              <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono border border-emerald-800/60">
                Auto-updated on Inspection
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Accepted lots automatically increase available warehouse stock and update MRP Daily Actuals
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
          <div className="bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">AA (Outer Tub)</span>
            <span className="text-sm font-black text-blue-400 value-mono">
              {getComponentStock('AA')} <span className="text-[10px] font-normal text-slate-400">units</span>
            </span>
          </div>
          <div className="bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">BB (Inner Tub)</span>
            <span className="text-sm font-black text-emerald-400 value-mono">
              {getComponentStock('BB')} <span className="text-[10px] font-normal text-slate-400">units</span>
            </span>
          </div>
          <div className="bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">CC (Ridgeform)</span>
            <span className="text-sm font-black text-amber-400 value-mono">
              {getComponentStock('CC')} <span className="text-[10px] font-normal text-slate-400">units</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Delivery #, component or inspector..."
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Component:</span>
            <select
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none text-xs"
            >
              <option value="ALL">All Components</option>
              <option value="AA">AA — Outer Tub</option>
              <option value="BB">BB — Inner Tub</option>
              <option value="CC">CC — Ridgeform</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Decision:</span>
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none text-xs"
            >
              <option value="ALL">All Decisions</option>
              <option value="Accepted">Accepted Only</option>
              <option value="Rejected">Rejected Only</option>
              <option value="Pending">Pending / Stage 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="mrp-table w-full">
            <thead>
              <tr>
                <th className="row-label">Delivery #</th>
                <th>Received Date/Time</th>
                <th>Component</th>
                <th className="text-right">Lot Size</th>
                <th className="text-center">Sampling / AQL</th>
                <th className="text-center">Sample Size (n)</th>
                <th className="text-center">Ac / Re</th>
                <th className="text-center">Defects</th>
                <th className="text-center">Decision</th>
                <th className="text-center">Sign-off</th>
                <th className="text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    No inspection records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredInspections.map((insp) => {
                  const isAcc = insp.finalDecision === 'Accepted';
                  const isRej = insp.finalDecision === 'Rejected';
                  const isStage2Needed = insp.status === 'Second Sample Required';

                  return (
                    <tr
                      key={insp.id}
                      className="hover:bg-slate-50 text-slate-700"
                    >
                      {/* Delivery # */}
                      <td className="row-label font-bold text-slate-900 flex items-center gap-1.5">
                        {insp.replacementSequence > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                        )}
                        <span>{insp.deliveryNumber}</span>
                      </td>

                      {/* Date & Time */}
                      <td className="text-slate-600">
                        <div>{insp.lotReceivedDate}</div>
                        <div className="text-[10px] text-slate-400">{insp.lotReceivedTime}</div>
                      </td>

                      {/* Component */}
                      <td className="font-semibold text-slate-800">
                        <span
                          className={`status-pill ${
                            insp.componentCode === 'AA'
                              ? 'status-safe'
                              : insp.componentCode === 'BB'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'status-warning'
                          }`}
                        >
                          {insp.componentCode}
                        </span>
                      </td>

                      {/* Lot Size */}
                      <td className="text-right value-mono font-bold text-slate-800">
                        {insp.lotSize}
                      </td>

                      {/* Sampling / AQL */}
                      <td className="text-center">
                        <span className="value-mono text-[11px] text-slate-700 font-semibold">
                          {insp.samplingMethod} (AQL {insp.aql})
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Letter {insp.codeLetter}
                        </span>
                      </td>

                      {/* Sample size */}
                      <td className="text-center value-mono font-semibold text-blue-700">
                        {insp.sampleSizeStage1}
                        {insp.samplingMethod === 'Double' && insp.sampleSizeStage2 && (
                          <span className="text-slate-400"> + {insp.sampleSizeStage2}</span>
                        )}
                      </td>

                      {/* Ac / Re */}
                      <td className="text-center value-mono text-slate-600">
                        {insp.acStage1} / {insp.reStage1}
                      </td>

                      {/* Defects: Total & Exact Reason Breakdown */}
                      <td className="text-center py-2 px-2.5">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full value-mono text-[11px] font-bold ${
                              insp.totalDefectCount === 0
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : isRej
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            Total: {insp.totalDefectCount}
                          </span>
                          {insp.defects && insp.defects.length > 0 ? (
                            <div
                              className="text-[10px] text-slate-500 max-w-[160px] truncate leading-tight cursor-default"
                              title={insp.defects.map((d) => `${d.reason}: ${d.count}`).join(' • ')}
                            >
                              {insp.defects.map((d) => `${d.reason} (${d.count})`).join(', ')}
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">0 defects</span>
                          )}
                        </div>
                      </td>

                      {/* Decision */}
                      <td className="text-center">
                        {isAcc && (
                          <span className="status-pill status-safe font-bold">
                            ACCEPTED
                          </span>
                        )}
                        {isRej && (
                          <span className="status-pill status-alert font-bold">
                            REJECTED
                          </span>
                        )}
                        {isStage2Needed && (
                          <span className="status-pill status-warning font-bold">
                            2nd Sample Req
                          </span>
                        )}
                      </td>

                      {/* Sign-off */}
                      <td className="text-center">
                        {insp.supervisorSignature ? (
                          <span className="text-green-700 flex items-center justify-center gap-1 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Signed</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 text-[10px] font-medium">Pending</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {isStage2Needed && (
                            <button
                              onClick={() => handleOpenStage2(insp)}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                            >
                              Record Stage 2
                            </button>
                          )}

                          <button
                            onClick={() => setEditingInspection(insp)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors"
                            title="Edit / Correct Inspection Data"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => setSelectedInspectionForReport(insp)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors"
                            title="View Official Inspection Report"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Report</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Inspection Modal */}
      <NewInspectionModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(created) => setSelectedInspectionForReport(created)}
      />

      {/* Official Inspection Report Modal */}
      <InspectionReportModal
        isOpen={!!selectedInspectionForReport}
        inspection={selectedInspectionForReport}
        onClose={() => setSelectedInspectionForReport(null)}
      />

      {/* Edit Inspection Modal */}
      {editingInspection && (
        <EditInspectionModal
          isOpen={!!editingInspection}
          inspection={editingInspection}
          onClose={() => setEditingInspection(null)}
          onSaved={(updated) => {
            if (selectedInspectionForReport?.id === updated.id) {
              setSelectedInspectionForReport(updated);
            }
          }}
        />
      )}

      {/* Double Sampling Stage 2 Completion Modal */}
      {stage2ModalInsp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-4 sm:p-5 text-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Stage 2 Sample Recording</span>
              </h3>
              <button
                onClick={() => setStage2ModalInsp(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="flex justify-between">
                <span><strong>Delivery:</strong> {stage2ModalInsp.deliveryNumber}</span>
                <span className="font-semibold text-slate-700">Component: {stage2ModalInsp.componentCode}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span><strong>Stage 1 Sample:</strong> {stage2ModalInsp.sampleSizeStage1} units</span>
                <span className="font-bold text-amber-700">
                  Stage 1 Defects: {stage2ModalInsp.stage1DefectsCount} defects
                </span>
              </div>
              {stage2ModalInsp.defects.length > 0 && (
                <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
                  <span className="font-semibold text-slate-600 block mb-0.5">Stage 1 Reasons:</span>
                  {stage2ModalInsp.defects.map((d) => `${d.reason}: ${d.count}`).join(' • ')}
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span><strong>Stage 2 Required Sample:</strong> {stage2ModalInsp.sampleSizeStage2} units</span>
                <span className="text-slate-700">
                  Cumulative Limits: <strong>Ac2: ≤{stage2ModalInsp.acStage2} | Re2: ≥{stage2ModalInsp.reStage2}</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleCompleteStage2} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Stage 2 Defect Reasons ({stage2ModalInsp.sampleSizeStage2} units)
                  </label>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 value-mono">
                    Stage 2 Subtotal: {stage2TotalDefects}
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {stage2Defects.map((d) => (
                    <div
                      key={d.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-medium text-slate-700">{d.reason}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleIncrementStage2(d.id, -1)}
                          disabled={d.count <= 0}
                          className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-30 text-slate-700 flex items-center justify-center font-bold transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={d.count === 0 ? '0' : d.count}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                            handleUpdateStage2Count(d.id, val);
                          }}
                          className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 font-bold text-center value-mono focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleIncrementStage2(d.id, 1)}
                          className="w-6 h-6 rounded bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center font-bold transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cumulative calculation summary banner */}
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Cumulative Defect Calculation:</span>
                  <span className="font-black text-sm text-slate-900 value-mono">
                    {stage2ModalInsp.stage1DefectsCount + stage2TotalDefects} total
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Stage 1 ({stage2ModalInsp.stage1DefectsCount}) + Stage 2 ({stage2TotalDefects}) = <strong>{stage2ModalInsp.stage1DefectsCount + stage2TotalDefects} defects</strong> across {stage2ModalInsp.sampleSizeStage1 + (stage2ModalInsp.sampleSizeStage2 || 0)} total sampled units.
                </p>
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Evaluation:</span>
                  <span
                    className={`font-bold ${
                      stage2ModalInsp.stage1DefectsCount + stage2TotalDefects <= (stage2ModalInsp.acStage2 ?? 4)
                        ? 'text-emerald-700'
                        : 'text-red-700'
                    }`}
                  >
                    {stage2ModalInsp.stage1DefectsCount + stage2TotalDefects <= (stage2ModalInsp.acStage2 ?? 4)
                      ? `✓ PASS (≤ ${stage2ModalInsp.acStage2} will be ACCEPTED)`
                      : `✗ FAIL (≥ ${stage2ModalInsp.reStage2} will be REJECTED)`}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStage2ModalInsp(null)}
                  className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Finalize Stage 2 & Evaluate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage 2 Verification Popup Modal ("Is this correct?") */}
      {showStage2Verification && stage2ModalInsp && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Stage 2 Inspection Summary Verification
                </h4>
                <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Please verify: Is this Stage 2 summary report correct?</span>
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery:</span>
                <span className="font-bold text-slate-900 font-mono">{stage2ModalInsp.deliveryNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Component:</span>
                <span className="font-semibold text-slate-800">{stage2ModalInsp.componentCode}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">Stage 1 Defects:</span>
                <span className="font-semibold text-slate-800 value-mono">{stage2ModalInsp.stage1DefectsCount} defects (n={stage2ModalInsp.sampleSizeStage1})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stage 2 Defects:</span>
                <span className="font-semibold text-amber-700 value-mono">{stage2TotalDefects} defects (n={stage2ModalInsp.sampleSizeStage2})</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span className="text-slate-700">Cumulative Total Defects:</span>
                <span className="text-sm text-slate-900 value-mono">
                  {stage2ModalInsp.stage1DefectsCount + stage2TotalDefects} defects
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cumulative Threshold:</span>
                <span className="text-slate-700 value-mono">
                  Ac2: ≤{stage2ModalInsp.acStage2 ?? 4} | Re2: ≥{stage2ModalInsp.reStage2 ?? 5}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">Final Evaluated Result:</span>
                <span
                  className={`font-black text-xs ${
                    stage2ModalInsp.stage1DefectsCount + stage2TotalDefects <= (stage2ModalInsp.acStage2 ?? 4)
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {stage2ModalInsp.stage1DefectsCount + stage2TotalDefects <= (stage2ModalInsp.acStage2 ?? 4)
                    ? '✓ PASSED (LOT ACCEPTED)'
                    : '✗ FAILED (LOT REJECTED)'}
                </span>
              </div>
            </div>

            {/* Stage 2 defect reasons list in popup */}
            <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] bg-slate-100 p-2.5 rounded border border-slate-200">
              <span className="font-bold text-slate-600 block mb-1">
                Stage 2 Failure Reasons Breakdown:
              </span>
              {stage2Defects.filter((d) => d.count > 0).length === 0 ? (
                <span className="text-emerald-700">0 defects recorded in Stage 2 sample</span>
              ) : (
                stage2Defects
                  .filter((d) => d.count > 0)
                  .map((d) => (
                    <div key={d.id} className="flex justify-between text-slate-700">
                      <span>{d.reason}:</span>
                      <strong className="text-amber-700 value-mono">{d.count}</strong>
                    </div>
                  ))
              )}
            </div>

            {/* Footer Buttons: Edit and Correct */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              {/* Edit Button */}
              <button
                type="button"
                onClick={() => setShowStage2Verification(false)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-300"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                <span>Edit / Make Corrections</span>
              </button>

              {/* Correct / Finalize Button */}
              <button
                type="button"
                onClick={handleConfirmedStage2Submit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Yes, Correct — Finalize Stage 2</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
