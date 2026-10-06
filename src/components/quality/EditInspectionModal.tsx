import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Edit3,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { COMPONENT_DEFECT_REASONS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import {
  evaluateDoubleStage1,
  evaluateDoubleStage2,
  evaluateSingleInspection,
} from '../../services/aqlEngine';
import {
  ComponentCode,
  DefectItem,
  DefectSourceCategory,
  InspectionRecord,
} from '../../types';

interface EditInspectionModalProps {
  isOpen: boolean;
  inspection: InspectionRecord | null;
  onClose: () => void;
  onSaved?: (updated: InspectionRecord) => void;
}

export const EditInspectionModal: React.FC<EditInspectionModalProps> = ({
  isOpen,
  inspection,
  onClose,
  onSaved,
}) => {
  const { systemConfig, updateInspection, inspections } = useApp();

  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [stage2Defects, setStage2Defects] = useState<DefectItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [vehicleRef, setVehicleRef] = useState<string>('');
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const [customReasonInput, setCustomReasonInput] = useState<string>('');
  const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false);

  // Initialize or re-populate when modal opens or inspection changes
  useEffect(() => {
    if (!isOpen || !inspection) return;

    setNotes(inspection.notes || '');
    setVehicleRef(inspection.vehicleRef || '');

    // Standard reasons for this component
    const standardReasons = COMPONENT_DEFECT_REASONS[inspection.componentCode] || [];
    const existingReasonsMap = new Map<string, DefectItem>();
    inspection.defects.forEach((d) => {
      existingReasonsMap.set(d.reason.toLowerCase(), d);
    });

    const populatedDefects: DefectItem[] = standardReasons.map((reason, idx) => {
      const existing = existingReasonsMap.get(reason.toLowerCase());
      if (existing) {
        return { ...existing };
      }
      return {
        id: `edit-def-${inspection.componentCode.toLowerCase()}-${idx + 1}`,
        reason,
        count: 0,
        sourceCategory: 'Supplier production defect',
        notes: '',
      };
    });

    // Add any non-standard existing defect reasons
    inspection.defects.forEach((d) => {
      const isStandard = standardReasons.some(
        (sr) => sr.toLowerCase() === d.reason.toLowerCase()
      );
      if (!isStandard) {
        populatedDefects.push({ ...d });
      }
    });

    setDefects(populatedDefects);

    // If double sampling and stage 2 was recorded
    if (inspection.stage2DefectsCount !== undefined) {
      setStage2Defects(
        populatedDefects.map((d) => ({
          ...d,
          id: `edit-stage2-${d.id}`,
          count: 0,
        }))
      );
    } else {
      setStage2Defects([]);
    }

    setShowConfirmPopup(false);
  }, [isOpen, inspection]);

  const totalStage1Count = useMemo(() => {
    return defects.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  }, [defects]);

  const totalStage2Count = useMemo(() => {
    return stage2Defects.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  }, [stage2Defects]);

  const grandTotalDefects = useMemo(() => {
    if (inspection?.stage2DefectsCount !== undefined) {
      return totalStage1Count + (totalStage2Count > 0 ? totalStage2Count : inspection.stage2DefectsCount);
    }
    return totalStage1Count;
  }, [totalStage1Count, totalStage2Count, inspection]);

  // Evaluated Decision Preview
  const evaluatedDecision = useMemo(() => {
    if (!inspection) return 'Pending';
    if (inspection.samplingMethod === 'Single') {
      return evaluateSingleInspection(
        totalStage1Count,
        inspection.acStage1,
        inspection.reStage1
      );
    } else {
      // Double Sampling
      if (inspection.stage2DefectsCount !== undefined) {
        const s2 = totalStage2Count > 0 ? totalStage2Count : inspection.stage2DefectsCount;
        return evaluateDoubleStage2(
          totalStage1Count,
          s2,
          inspection.acStage2 ?? 4,
          inspection.reStage2 ?? 5
        );
      } else {
        const s1Eval = evaluateDoubleStage1(
          totalStage1Count,
          inspection.acStage1,
          inspection.reStage1
        );
        return s1Eval === 'Second Sample Required' ? 'Pending' : s1Eval;
      }
    }
  }, [inspection, totalStage1Count, totalStage2Count]);

  if (!isOpen || !inspection) return null;

  const handleUpdateCount = (id: string, count: number) => {
    const safe = Math.max(0, isNaN(count) ? 0 : Math.floor(count));
    setDefects((prev) =>
      prev.map((d) => (d.id === id ? { ...d, count: safe } : d))
    );
  };

  const handleIncrement = (id: string, delta: number) => {
    setDefects((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, count: Math.max(0, (Number(d.count) || 0) + delta) } : d
      )
    );
  };

  const handleAddCustomDefect = () => {
    if (!customReasonInput.trim()) return;
    const newReason = customReasonInput.trim();
    const exists = defects.some((d) => d.reason.toLowerCase() === newReason.toLowerCase());
    if (exists) {
      alert(`Defect reason "${newReason}" already exists in the list.`);
      return;
    }
    const newId = `def-custom-edit-${Date.now()}`;
    setDefects((prev) => [
      ...prev,
      {
        id: newId,
        reason: newReason,
        count: 1,
        sourceCategory: 'Supplier production defect',
        notes: '',
      },
    ]);
    setCustomReasonInput('');
    setShowAddCustom(false);
  };

  const handleExecuteSave = () => {
    const nonZeroDefects = defects.filter((d) => d.count > 0);
    const updates: Partial<InspectionRecord> = {
      defects: nonZeroDefects,
      stage1DefectsCount: totalStage1Count,
      totalDefectCount: grandTotalDefects,
      finalDecision: evaluatedDecision as 'Accepted' | 'Rejected' | 'Pending',
      notes,
      vehicleRef,
    };

    updateInspection(inspection.id, updates);

    const updatedRecord: InspectionRecord = {
      ...inspection,
      ...updates,
      defects: nonZeroDefects,
      stage1DefectsCount: totalStage1Count,
      totalDefectCount: grandTotalDefects,
      finalDecision: evaluatedDecision as 'Accepted' | 'Rejected' | 'Pending',
    };

    if (onSaved) {
      onSaved(updatedRecord);
    }
    setShowConfirmPopup(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl sm:rounded-2xl w-full max-w-3xl text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Edit & Correct Inspection</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                  {inspection.deliveryNumber}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Adjust defect counts per failure reason and recalculate AQL decision
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Metadata banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-800/60 p-3 rounded-lg border border-slate-700/80">
            <div>
              <span className="text-[10px] text-slate-400 block">Component</span>
              <span className="font-bold text-white">
                {inspection.componentCode} ({systemConfig.components[inspection.componentCode]?.name})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Lot Size</span>
              <span className="font-bold text-white value-mono">{inspection.lotSize} units</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Sampling Plan</span>
              <span className="font-semibold text-slate-200">
                {inspection.samplingMethod} (n={inspection.sampleSizeStage1})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Limits (Ac / Re)</span>
              <span className="font-bold text-amber-300 value-mono">
                Ac: {inspection.acStage1} | Re: {inspection.reStage1}
              </span>
            </div>
          </div>

          {/* Live Recalculated Summary Banner */}
          <div className="p-3 bg-gradient-to-r from-slate-850 to-slate-800 border border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Live Corrected Defect Tally:
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-amber-300 value-mono">
                  {grandTotalDefects}
                </span>
                <span className="text-slate-300 text-xs">
                  total defects across {defects.filter((d) => d.count > 0).length} active failure reason(s)
                </span>
                {grandTotalDefects !== inspection.totalDefectCount && (
                  <span className="text-[11px] font-semibold text-blue-400">
                    (Previously: {inspection.totalDefectCount})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Recalculated Verdict:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  evaluatedDecision === 'Accepted'
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50'
                    : evaluatedDecision === 'Rejected'
                    ? 'bg-rose-950/70 text-rose-300 border-rose-500/50'
                    : 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                }`}
              >
                {evaluatedDecision === 'Accepted' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {evaluatedDecision === 'Rejected' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                {evaluatedDecision}
              </span>
            </div>
          </div>

          {/* Defect Reasons List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Defect Reason Breakdown (Sample Size: {inspection.sampleSizeStage1} units)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustom(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Custom Defect Reason</span>
                </button>
              </div>
            </div>

            {/* Custom Defect Reason Input Popover */}
            {showAddCustom && (
              <div className="p-3 bg-slate-800 border border-blue-500/40 rounded-lg mb-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter custom defect reason..."
                  value={customReasonInput}
                  onChange={(e) => setCustomReasonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomDefect();
                    }
                  }}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustomDefect}
                  disabled={!customReasonInput.trim()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded text-xs font-bold"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustom(false);
                    setCustomReasonInput('');
                  }}
                  className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Defect Items Grid */}
            <div className="space-y-2">
              {defects.map((d) => (
                <div
                  key={d.id}
                  className={`p-3 rounded-lg border transition-all text-xs ${
                    d.count > 0
                      ? 'bg-slate-800/90 border-amber-500/50 shadow-sm'
                      : 'bg-slate-800/40 border-slate-700/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{d.reason}</span>
                        {d.count > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-bold text-[10px] border border-amber-800/60">
                            {d.count} defect{d.count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={d.sourceCategory || 'Supplier production defect'}
                          onChange={(e) =>
                            setDefects((prev) =>
                              prev.map((item) =>
                                item.id === d.id
                                  ? {
                                      ...item,
                                      sourceCategory: e.target.value as DefectSourceCategory,
                                    }
                                  : item
                              )
                            )
                          }
                          className="bg-slate-900 border border-slate-700 text-slate-400 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                        >
                          <option value="Supplier production defect">Supplier defect</option>
                          <option value="Handling damage">Handling damage</option>
                          <option value="Packaging failure">Packaging failure</option>
                          <option value="Material flaw">Material flaw</option>
                          <option value="Warehouse Defect">Warehouse Defects</option>
                          <option value="Assembly Defect">Assembly Defects</option>
                          <option value="Safety Stock Defect">Safety Stock Defects</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={d.notes || ''}
                          onChange={(e) =>
                            setDefects((prev) =>
                              prev.map((item) =>
                                item.id === d.id ? { ...item, notes: e.target.value } : item
                              )
                            )
                          }
                          className="flex-1 bg-slate-900/60 border border-slate-700/70 text-slate-300 rounded px-1.5 py-0.5 text-[10px] placeholder-slate-600 focus:outline-none focus:border-slate-500"
                        />
                      </div>
                    </div>

                    {/* Numeric Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleIncrement(d.id, -1)}
                        disabled={d.count <= 0}
                        className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-200 flex items-center justify-center font-bold transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={d.count === 0 ? '0' : d.count}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          handleUpdateCount(d.id, val);
                        }}
                        className={`w-14 bg-slate-900 border rounded px-1.5 py-1 text-xs font-bold text-center value-mono focus:outline-none ${
                          d.count > 0
                            ? 'text-amber-300 border-amber-500'
                            : 'text-slate-400 border-slate-700'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleIncrement(d.id, 1)}
                        className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center font-bold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {d.count > 0 && (
                        <button
                          type="button"
                          onClick={() => handleUpdateCount(d.id, 0)}
                          title="Reset to 0"
                          className="px-1.5 py-1 text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Notes and Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                Vehicle Reference
              </label>
              <input
                type="text"
                value={vehicleRef}
                onChange={(e) => setVehicleRef(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                placeholder="e.g. LORRY-4491"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                Inspection Notes / Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                placeholder="e.g. Minor surface scratches detected..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-850 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmPopup(true)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-lg"
          >
            <Check className="w-4 h-4" />
            <span>Review & Save Corrections</span>
          </button>
        </div>

        {/* Confirmation & Summarized Report Verification Popup */}
        {showConfirmPopup && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Confirm Inspection Corrections
                  </h4>
                  <p className="text-xs text-amber-300 font-semibold">
                    Is this corrected summary report accurate?
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Delivery:</span>
                  <span className="font-bold text-white">{inspection.deliveryNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Component:</span>
                  <span className="font-semibold text-slate-200">{inspection.componentCode}</span>
                </div>
                <div className="flex justify-between border-t border-slate-700/60 pt-1.5">
                  <span className="text-slate-400">Corrected Defect Count:</span>
                  <span className="font-bold text-amber-300 value-mono text-sm">
                    {grandTotalDefects} total defect{grandTotalDefects === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">AQL Re-Evaluation:</span>
                  <span
                    className={`font-bold ${
                      evaluatedDecision === 'Accepted'
                        ? 'text-emerald-400'
                        : evaluatedDecision === 'Rejected'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {evaluatedDecision}
                  </span>
                </div>
              </div>

              {/* Defect reasons breakdown in popup */}
              <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] bg-slate-950/50 p-2.5 rounded border border-slate-800">
                <span className="font-bold text-slate-400 block mb-1">
                  Active Defect Reasons:
                </span>
                {defects.filter((d) => d.count > 0).length === 0 ? (
                  <span className="text-emerald-400">0 defects recorded (Clean Lot)</span>
                ) : (
                  defects
                    .filter((d) => d.count > 0)
                    .map((d) => (
                      <div key={d.id} className="flex justify-between text-slate-300">
                        <span>{d.reason}:</span>
                        <strong className="text-amber-300 value-mono">{d.count}</strong>
                      </div>
                    ))
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPopup(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Need to Edit</span>
                </button>

                {/* Correct / Confirm Button */}
                <button
                  type="button"
                  onClick={handleExecuteSave}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Yes, Correct — Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
