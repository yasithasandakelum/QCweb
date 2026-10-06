import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Eye,
  FileCheck2,
  FileText,
  HelpCircle,
  Info,
  Lock,
  Minus,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { COMPONENT_DEFECT_REASONS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import {
  evaluateDoubleStage1,
  evaluateDoubleStage2,
  evaluateSingleInspection,
  getCodeLetter,
  getDoubleSamplingPlan,
  getSingleSamplingPlan,
} from '../../services/aqlEngine';
import {
  AQLValue,
  ComponentCode,
  DefectImage,
  DefectItem,
  DefectSourceCategory,
  SamplingMethod,
  InspectionRecord,
} from '../../types';

function createInitialDefectsForComponent(code: ComponentCode): DefectItem[] {
  const reasons = COMPONENT_DEFECT_REASONS[code] || [];
  return reasons.map((reason, idx) => ({
    id: `def-${code.toLowerCase()}-${idx + 1}`,
    reason,
    count: 0,
    sourceCategory: 'Supplier production defect' as DefectSourceCategory,
    notes: '',
  }));
}

interface NewInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (inspection: InspectionRecord) => void;
  onOpenAqlExplorer?: () => void;
  initialData?: {
    deliveryNumber?: string;
    componentCode?: ComponentCode;
    lotSize?: number;
    lotReceivedDate?: string;
    lotReceivedTime?: string;
    vehicleRef?: string;
  } | null;
}

export const NewInspectionModal: React.FC<NewInspectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const {
    systemConfig,
    currentUser,
    createInspection,
    deliveries,
    currentDay,
    currentMonth,
    getComponentStock,
  } = useApp();

  // Form State
  const [step, setStep] = useState<number>(1);
  const [deliveryNumber, setDeliveryNumber] = useState<string>('DEL-007');
  const [componentCode, setComponentCode] = useState<ComponentCode>('AA');
  const [lotReceivedDate, setLotReceivedDate] = useState<string>(
    `${currentMonth}-${String(currentDay).padStart(2, '0')}`
  );
  const [lotReceivedTime, setLotReceivedTime] = useState<string>('09:30');
  const [lotSize, setLotSize] = useState<number>(300);
  const [vehicleRef, setVehicleRef] = useState<string>('LORRY-4491');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        if (initialData.deliveryNumber) setDeliveryNumber(initialData.deliveryNumber);
        if (initialData.componentCode) setComponentCode(initialData.componentCode);
        if (initialData.lotSize) setLotSize(initialData.lotSize);
        if (initialData.lotReceivedDate) setLotReceivedDate(initialData.lotReceivedDate);
        if (initialData.lotReceivedTime) setLotReceivedTime(initialData.lotReceivedTime);
        if (initialData.vehicleRef) setVehicleRef(initialData.vehicleRef);
      } else {
        setLotReceivedDate(`${currentMonth}-${String(currentDay).padStart(2, '0')}`);
      }
      setStep(1);
      const code = initialData?.componentCode || componentCode;
      setDefects(createInitialDefectsForComponent(code));
      setStage2Defects(
        createInitialDefectsForComponent(code).map((d) => ({
          ...d,
          id: `stage2-${d.id}`,
        }))
      );
      setImages([]);
      setShowSummaryVerification(false);
    }
  }, [isOpen, currentDay, currentMonth, initialData]);

  // Sampling & AQL
  const [samplingMethod, setSamplingMethod] = useState<SamplingMethod>('Single');
  const [aql, setAql] = useState<AQLValue>(2.5);

  // Summarized Report Verification Modal state ("Is this correct?")
  const [showSummaryVerification, setShowSummaryVerification] = useState<boolean>(false);

  // Defect Items initialized with all standard component reasons
  const [defects, setDefects] = useState<DefectItem[]>(() =>
    createInitialDefectsForComponent('AA')
  );

  // Stage 2 Defect Items for Double Sampling
  const [stage2Defects, setStage2Defects] = useState<DefectItem[]>(() =>
    createInitialDefectsForComponent('AA').map((d) => ({
      ...d,
      id: `stage2-${d.id}`,
    }))
  );

  // Custom Defect Reason input state
  const [customReasonInput, setCustomReasonInput] = useState<string>('');
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);

  // Image Uploads (Simulated base64/data URLs)
  const [images, setImages] = useState<DefectImage[]>([]);

  // Computed AQL Plans
  const codeLetter = useMemo(() => getCodeLetter(lotSize), [lotSize]);

  const singlePlan = useMemo(
    () => getSingleSamplingPlan(lotSize, aql),
    [lotSize, aql]
  );

  const doublePlan = useMemo(
    () => getDoubleSamplingPlan(lotSize, aql),
    [lotSize, aql]
  );

  // Exact Total Recorded Defects for Stage 1
  const totalDefectCount = useMemo(() => {
    return defects.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  }, [defects]);

  // Exact Total Recorded Defects for Stage 2
  const totalStage2Defects = useMemo(() => {
    return stage2Defects.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  }, [stage2Defects]);

  const stage1Decision = useMemo(() => {
    if (samplingMethod === 'Double') {
      return evaluateDoubleStage1(totalDefectCount, doublePlan.stage1.ac, doublePlan.stage1.re);
    }
    return null;
  }, [samplingMethod, totalDefectCount, doublePlan]);

  // Decision preview
  const decisionPreview = useMemo(() => {
    if (samplingMethod === 'Single') {
      return evaluateSingleInspection(totalDefectCount, singlePlan.ac, singlePlan.re);
    } else {
      if (stage1Decision === 'Second Sample Required') {
        return evaluateDoubleStage2(
          totalDefectCount,
          totalStage2Defects,
          doublePlan.stage2.ac,
          doublePlan.stage2.re
        );
      }
      return stage1Decision;
    }
  }, [samplingMethod, totalDefectCount, singlePlan, doublePlan, totalStage2Defects, stage1Decision]);

  if (!isOpen) return null;

  const handleComponentChange = (code: ComponentCode) => {
    setComponentCode(code);
    setDefects(createInitialDefectsForComponent(code));
    setStage2Defects(
      createInitialDefectsForComponent(code).map((d) => ({
        ...d,
        id: `stage2-${d.id}`,
      }))
    );
  };

  const handleUpdateDefectCount = (id: string, newCount: number) => {
    const safeCount = Math.max(0, isNaN(newCount) ? 0 : Math.floor(newCount));
    setDefects((prev) =>
      prev.map((d) => (d.id === id ? { ...d, count: safeCount } : d))
    );
  };

  const handleIncrementDefect = (id: string, delta: number) => {
    setDefects((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, count: Math.max(0, (Number(d.count) || 0) + delta) } : d
      )
    );
  };

  const handleUpdateStage2Defect = (id: string, newCount: number) => {
    const safeCount = Math.max(0, isNaN(newCount) ? 0 : Math.floor(newCount));
    setStage2Defects((prev) =>
      prev.map((d) => (d.id === id ? { ...d, count: safeCount } : d))
    );
  };

  const handleIncrementStage2Defect = (id: string, delta: number) => {
    setStage2Defects((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, count: Math.max(0, (Number(d.count) || 0) + delta) } : d
      )
    );
  };

  const handleResetAllDefects = () => {
    setDefects((prev) => prev.map((d) => ({ ...d, count: 0, notes: '' })));
    setStage2Defects((prev) => prev.map((d) => ({ ...d, count: 0, notes: '' })));
  };

  const handleAddDefectRow = () => {
    setShowAddCustom(true);
  };

  const handleAddCustomDefect = () => {
    if (!customReasonInput.trim()) return;
    const newReason = customReasonInput.trim();
    const exists = defects.some((d) => d.reason.toLowerCase() === newReason.toLowerCase());
    if (exists) {
      alert(`Defect reason "${newReason}" already exists in the list.`);
      return;
    }
    const newId = `def-custom-${Date.now()}`;
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
    setStage2Defects((prev) => [
      ...prev,
      {
        id: `stage2-${newId}`,
        reason: newReason,
        count: 0,
        sourceCategory: 'Supplier production defect',
        notes: '',
      },
    ]);
    setCustomReasonInput('');
    setShowAddCustom(false);
  };

  const handleRemoveDefectRow = (id: string) => {
    setDefects(defects.filter((d) => d.id !== id));
    setStage2Defects(stage2Defects.filter((d) => d.id !== `stage2-${id}` && d.id !== id));
  };

  const handleUpdateDefect = (id: string, field: keyof DefectItem, value: any) => {
    setDefects(
      defects.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleUpdateStage2Item = (id: string, field: keyof DefectItem, value: any) => {
    setStage2Defects(
      stage2Defects.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (loadEv) => {
          const url = loadEv.target?.result as string;
          setImages((prev) => [
            ...prev,
            {
              id: `img-${Date.now()}-${i}`,
              url,
              caption: file.name,
              uploadedBy: currentUser?.name || 'System',
              uploadedAt: new Date().toISOString(),
              defectReason: defects[0]?.reason,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleOpenSummaryVerification = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSummaryVerification(true);
  };

  const handleConfirmedSubmit = () => {
    // Filter non-zero stage 1 defects
    const filteredStage1 = defects.filter((d) => d.count > 0);

    let finalDefects: DefectItem[] = [...filteredStage1];
    let finalStage2Count: number | undefined = undefined;
    let finalTotalCount = totalDefectCount;

    if (samplingMethod === 'Double' && stage1Decision === 'Second Sample Required') {
      finalStage2Count = totalStage2Defects;
      finalTotalCount = totalDefectCount + totalStage2Defects;

      const stage2NonZero = stage2Defects.filter((d) => d.count > 0);
      const mergedMap: Record<string, DefectItem> = {};
      filteredStage1.forEach((d) => {
        mergedMap[d.reason] = { ...d };
      });

      stage2NonZero.forEach((d) => {
        if (mergedMap[d.reason]) {
          mergedMap[d.reason].count += d.count;
          if (d.notes) {
            mergedMap[d.reason].notes = mergedMap[d.reason].notes
              ? `${mergedMap[d.reason].notes} | Stage 2: ${d.notes}`
              : `Stage 2: ${d.notes}`;
          }
        } else {
          mergedMap[d.reason] = {
            id: `def-merged-${d.reason.replace(/\s+/g, '-').toLowerCase()}`,
            reason: d.reason,
            count: d.count,
            sourceCategory: d.sourceCategory,
            notes: d.notes ? `Stage 2: ${d.notes}` : '',
          };
        }
      });
      finalDefects = Object.values(mergedMap);
    }

    const created = createInspection({
      deliveryNumber,
      deliveryFamilyNumber: deliveryNumber.split('-R')[0],
      replacementSequence: deliveryNumber.includes('-R')
        ? parseInt(deliveryNumber.split('-R')[1], 10) || 0
        : 0,
      supplierName: systemConfig.supplierName,
      componentCode,
      lotReceivedDate,
      lotReceivedTime,
      lotSize,
      vehicleRef,
      notes,
      samplingMethod,
      inspectionLevel: 'General II',
      aql,
      codeLetter,
      sampleSizeStage1:
        samplingMethod === 'Single' ? singlePlan.sampleSize : doublePlan.stage1.sampleSize,
      acStage1: samplingMethod === 'Single' ? singlePlan.ac : doublePlan.stage1.ac,
      reStage1: samplingMethod === 'Single' ? singlePlan.re : doublePlan.stage1.re,
      sampleSizeStage2:
        samplingMethod === 'Double' ? doublePlan.stage2.sampleSize : undefined,
      acStage2: samplingMethod === 'Double' ? doublePlan.stage2.ac : undefined,
      reStage2: samplingMethod === 'Double' ? doublePlan.stage2.re : undefined,
      stage1DefectsCount: totalDefectCount,
      stage2DefectsCount: finalStage2Count,
      totalDefectCount: finalTotalCount,
      defects: finalDefects,
      images,
      inspectorName: currentUser?.name || 'System',
    });

    setShowSummaryVerification(false);
    onSuccess(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl sm:rounded-2xl w-full max-w-3xl text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                Incoming Quality Inspection
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                ANSI/ASQ Z1.4-2003 Normal Level II
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-3 sm:px-6 py-2 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-xs font-medium shrink-0 overflow-x-auto gap-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs ${
                step === 1
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'text-blue-400 font-semibold' : 'text-slate-400'}>
              Receipt
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs ${
                step === 2
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'text-blue-400 font-semibold' : 'text-slate-400'}>
              Sampling
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs ${
                step === 3
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              3
            </span>
            <span className={step === 3 ? 'text-blue-400 font-semibold' : 'text-slate-400'}>
              Defects
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs ${
                step === 4
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              4
            </span>
            <span className={step === 4 ? 'text-blue-400 font-semibold' : 'text-slate-400'}>
              Decision
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleOpenSummaryVerification} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* STEP 1: Receipt Information */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Delivery Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryNumber}
                    onChange={(e) => setDeliveryNumber(e.target.value)}
                    placeholder="e.g. DEL-025 or DEL-025-R1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Use replacement suffix (e.g. -R1) if replacing a previously rejected lot.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supplier (Default Active)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={systemConfig.supplierName}
                    className="w-full bg-slate-800/50 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-emerald-400 mt-1">
                    ✓ 1 supplier active — auto-selected without redundant prompt.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Component *
                  </label>
                  <select
                    value={componentCode}
                    onChange={(e) => handleComponentChange(e.target.value as ComponentCode)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="AA">AA — Outer Tub (Multiplier 1x, Min 150, Max 300)</option>
                    <option value="BB">BB — Inner Tub (Multiplier 1x, Min TBD, Max 160)</option>
                    <option value="CC">CC — Ridgeform (Multiplier 3x, Min 250, Max 560)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lot Size (Units Received) *
                  </label>
                  <input
                    type="number"
                    min="2"
                    required
                    value={lotSize}
                    onChange={(e) => setLotSize(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lot Received Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={lotReceivedDate}
                    onChange={(e) => setLotReceivedDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lot Received Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={lotReceivedTime}
                    onChange={(e) => setLotReceivedTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vehicle / Lorry Reference
                  </label>
                  <input
                    type="text"
                    value={vehicleRef}
                    onChange={(e) => setVehicleRef(e.target.value)}
                    placeholder="e.g. LORRY-4491 / Container 2"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Inspector
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.name || 'System'}
                    className="w-full bg-slate-800/50 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-300 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Receiving Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes on packaging, container condition, lorry seal, or initial visual state..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Sampling Method & AQL Setup */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Method Choice */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Sampling Method *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={() => setSamplingMethod('Single')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      samplingMethod === 'Single'
                        ? 'bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-slate-100">Single Sampling</span>
                      {samplingMethod === 'Single' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Single Sampling inspects one sample from the lot. The total defects found in that sample are compared with the applicable acceptance and rejection numbers to decide whether the lot is accepted or rejected.
                    </p>
                  </div>

                  <div
                    onClick={() => setSamplingMethod('Double')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      samplingMethod === 'Double'
                        ? 'bg-purple-950/50 border-purple-500 ring-2 ring-purple-500/20'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-slate-100">Double Sampling</span>
                      {samplingMethod === 'Double' && (
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Double Sampling starts with a first sample. According to the Double Sampling table, the first result may accept the lot, reject the lot or require a second sample using cumulative limits.
                    </p>
                  </div>
                </div>
              </div>

              {/* Inspection Level & AQL Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Inspection Level</span>
                    <span className="text-[10px] text-amber-400 flex items-center gap-1 font-normal">
                      <Lock className="w-3 h-3" /> Fixed Standard
                    </span>
                  </label>
                  <div className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 flex items-center justify-between font-mono">
                    <span>General Inspection Level II</span>
                    <span className="text-xs text-slate-400">Fixed</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Locked to General Level II per ANSI/ASQ Z1.4 requirements.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Acceptable Quality Limit (AQL) *
                  </label>
                  <select
                    value={aql}
                    onChange={(e) => setAql(parseFloat(e.target.value) as AQLValue)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value={1.0}>AQL 1.0 (Strict / High Precision)</option>
                    <option value={1.5}>AQL 1.5</option>
                    <option value={2.5}>AQL 2.5 (Standard Factory Default)</option>
                    <option value={4.0}>AQL 4.0</option>
                    <option value={6.5}>AQL 6.5 (Relaxed)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Defaults to 2.5. Total recorded defect count applies to this single AQL.
                  </p>
                </div>
              </div>

              {/* Calculated Sampling Parameters Card */}
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      Calculated Sampling Parameters
                    </span>
                    <span className="px-2 py-0.5 text-[10px] rounded bg-blue-900/60 text-blue-300 font-mono">
                      Code Letter {codeLetter}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Lot Size: <strong className="text-slate-200">{lotSize}</strong> units
                  </span>
                </div>

                {samplingMethod === 'Single' ? (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Sample Size (n)</span>
                      <span className="text-lg font-bold text-blue-400">
                        {singlePlan.sampleSize}
                      </span>
                      {singlePlan.is100Percent && (
                        <span className="block text-[10px] text-amber-400">100% Inspection</span>
                      )}
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-emerald-400 block">Accept Limit (Ac)</span>
                      <span className="text-lg font-bold text-emerald-400">
                        ≤ {singlePlan.ac}
                      </span>
                      <span className="block text-[10px] text-slate-400">Pass if defects ≤ Ac</span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-rose-400 block">Reject Limit (Re)</span>
                      <span className="text-lg font-bold text-rose-400">
                        ≥ {singlePlan.re}
                      </span>
                      <span className="block text-[10px] text-slate-400">Fail if defects ≥ Re</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Stage 1 Sample (n1)</span>
                        <span className="text-base font-bold text-purple-400">
                          {doublePlan.stage1.sampleSize}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-emerald-400 block">Stage 1 Ac1</span>
                        <span className="text-base font-bold text-emerald-400">
                          ≤ {doublePlan.stage1.ac}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-rose-400 block">Stage 1 Re1</span>
                        <span className="text-base font-bold text-rose-400">
                          ≥ {doublePlan.stage1.re}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Stage 2 Sample (n2)</span>
                        <span className="text-base font-bold text-purple-400">
                          {doublePlan.stage2.sampleSize} (Cum {doublePlan.stage2.cumulativeSampleSize})
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-emerald-400 block">Stage 2 Ac2 (Cum)</span>
                        <span className="text-base font-bold text-emerald-400">
                          ≤ {doublePlan.stage2.ac}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-rose-400 block">Stage 2 Re2 (Cum)</span>
                        <span className="text-base font-bold text-rose-400">
                          ≥ {doublePlan.stage2.re}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Defect Recording & Photos */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {componentCode} Defect Breakdown & Exact Reason Tally
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Record exact defect counts for each failure mode across the {samplingMethod === 'Single' ? singlePlan.sampleSize : doublePlan.stage1.sampleSize} inspected units.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleAddDefectRow}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold border border-slate-700 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Reason</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAllDefects}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
                    title="Reset all defect counts to 0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Live Defect Calculation & Verification Summary Card */}
              <div className="p-4 bg-slate-800/90 rounded-xl border border-slate-700 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-700/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Defect Tally Summary
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-900/60 text-blue-300">
                      Sample (n): {samplingMethod === 'Single' ? singlePlan.sampleSize : doublePlan.stage1.sampleSize} units
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-700 text-slate-300">
                      AQL {aql} (Letter {codeLetter})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300">Total Defect Count:</span>
                    <span className="text-base font-black px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-white value-mono">
                      {totalDefectCount}
                    </span>
                  </div>
                </div>

                {/* Per Reason Breakdown Chips */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                    Exact Count by Failure Reason:
                  </span>
                  {defects.filter((d) => d.count > 0).length === 0 ? (
                    <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-3 py-2 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Zero non-conformities logged. All defect reasons currently set to 0.</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {defects
                        .filter((d) => d.count > 0)
                        .map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-amber-500/40 text-xs text-slate-200 shadow-2xs"
                          >
                            <span className="font-semibold text-amber-300">{d.reason}:</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 font-bold value-mono">
                              {d.count}
                            </span>
                          </div>
                        ))}
                      <div className="flex items-center gap-2 ml-auto">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-950/80 border border-blue-500/50 text-xs text-white font-bold shadow-xs">
                          <span>Grand Total:</span>
                          <span className="text-blue-300 value-mono text-sm">{totalDefectCount} defects</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenSummaryVerification}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-xs"
                          title="Preview summarized report and verify"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview Summary</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Threshold limits comparison strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 text-xs text-slate-300">
                  <div className="bg-slate-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Accept Limit (Ac)</span>
                    <span className="font-bold text-emerald-400 value-mono">
                      ≤ {samplingMethod === 'Single' ? singlePlan.ac : doublePlan.stage1.ac}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Reject Limit (Re)</span>
                    <span className="font-bold text-rose-400 value-mono">
                      ≥ {samplingMethod === 'Single' ? singlePlan.re : doublePlan.stage1.re}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg col-span-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Current Verdict</span>
                      <span
                        className={`font-bold text-xs ${
                          (samplingMethod === 'Single'
                            ? decisionPreview === 'Accepted'
                            : stage1Decision === 'Accepted')
                            ? 'text-emerald-400'
                            : (samplingMethod === 'Single'
                                ? decisionPreview === 'Rejected'
                                : stage1Decision === 'Rejected')
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {samplingMethod === 'Single'
                          ? decisionPreview === 'Accepted'
                            ? 'CONFORMS (ACCEPT LOT)'
                            : 'NON-CONFORMING (REJECT LOT)'
                          : stage1Decision === 'Accepted'
                          ? 'CONFORMS (ACCEPT LOT)'
                          : stage1Decision === 'Rejected'
                          ? 'NON-CONFORMING (REJECT LOT)'
                          : 'SECOND SAMPLE REQUIRED'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 text-right">
                      {totalDefectCount} total / {samplingMethod === 'Single' ? singlePlan.sampleSize : doublePlan.stage1.sampleSize} sample
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Custom Reason Inline Input */}
              {showAddCustom && (
                <div className="p-3 bg-blue-950/40 border border-blue-500/50 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300">
                      Add Custom Defect Reason for {componentCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddCustom(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customReasonInput}
                      onChange={(e) => setCustomReasonInput(e.target.value)}
                      placeholder="e.g. Broken latch, Micro-crack, Flash excess..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomDefect();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomDefect}
                      disabled={!customReasonInput.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Add Reason
                    </button>
                  </div>
                </div>
              )}

              {/* Defect Rows: List of each defect reason with exact count controls */}
              <div className="space-y-3">
                {defects.map((d, idx) => {
                  const hasDefects = d.count > 0;
                  return (
                    <div
                      key={d.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        hasDefects
                          ? 'bg-slate-800/90 border-amber-500/60 shadow-xs'
                          : 'bg-slate-800/50 border-slate-700/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {d.reason}
                          </span>
                          {hasDefects && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
                              {d.count} defect{d.count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Defect Counter with [-] [input] [+] buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">
                            Exact Count:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncrementDefect(d.id, -1)}
                            disabled={d.count <= 0}
                            className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 flex items-center justify-center transition-colors"
                            title="Decrement defect count"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={d.count === 0 ? '0' : d.count}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                              handleUpdateDefectCount(d.id, val);
                            }}
                            className="w-16 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white font-bold text-center focus:outline-none focus:border-blue-500 value-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleIncrementDefect(d.id, 1)}
                            className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-xs"
                            title="Increment defect count"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          {d.count > 0 && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDefectCount(d.id, 0)}
                              className="text-[10px] text-slate-400 hover:text-slate-200 px-1 py-0.5 rounded ml-1 transition-colors"
                              title="Clear count to 0"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Source category & Notes */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-700/60">
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Defect Source Category</label>
                          <select
                            value={d.sourceCategory || 'Supplier production defect'}
                            onChange={(e) =>
                              handleUpdateDefect(
                                d.id,
                                'sourceCategory',
                                e.target.value as DefectSourceCategory
                              )
                            }
                            className="w-full bg-slate-900/80 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-blue-500"
                          >
                            <option value="Supplier production defect">Supplier production defect</option>
                            <option value="Transport defect — internal">Transport defect — internal</option>
                            <option value="Transport defect — external">Transport defect — external</option>
                            <option value="Warehouse Defect">Warehouse Defects</option>
                            <option value="Assembly Defect">Assembly Defects</option>
                            <option value="Safety Stock Defect">Safety Stock Defects</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="sm:col-span-8 flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] text-slate-400 mb-0.5">Notes / Exact Location</label>
                            <input
                              type="text"
                              value={d.notes || ''}
                              onChange={(e) => handleUpdateDefect(d.id, 'notes', e.target.value)}
                              placeholder="e.g. Scuff on rear seam, 1.2mm warp at base..."
                              className="w-full bg-slate-900/60 border border-slate-750 rounded-md px-2.5 py-1 text-[11px] text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          {d.id.startsWith('def-custom-') && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDefectRow(d.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors shrink-0 mb-0.5"
                              title="Remove custom defect reason"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Running Defect Total Banner */}
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Total Recorded Defect Count (Stage 1):
                </span>
                <span className="text-base font-bold text-white px-3 py-0.5 rounded-lg bg-slate-900 border border-slate-700 value-mono">
                  {totalDefectCount}
                </span>
              </div>

              {/* Photo Uploads */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-400" />
                  <span>Defect Photos / Verification Evidence</span>
                </label>

                <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:border-slate-500 transition-colors bg-slate-800/30">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    id="defect-img-upload"
                    className="hidden"
                  />
                  <label
                    htmlFor="defect-img-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-medium text-blue-400">
                      Click to upload photos (JPG, PNG, WebP)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Attach visual documentation of defects for the inspection report.
                    </span>
                  </label>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {images.map((img, i) => (
                      <div key={img.id} className="relative group rounded-lg overflow-hidden border border-slate-700 aspect-video bg-slate-800">
                        <img
                          src={img.url}
                          alt={img.caption}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-1 bg-slate-950/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: AQL Decision Evaluation */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Decision Result Card */}
              <div
                className={`p-5 rounded-2xl border ${
                  decisionPreview === 'Accepted'
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-100'
                    : decisionPreview === 'Rejected'
                    ? 'bg-rose-950/40 border-rose-500/80 text-rose-100'
                    : 'bg-amber-950/40 border-amber-500/80 text-amber-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    {decisionPreview === 'Accepted' ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    ) : decisionPreview === 'Rejected' ? (
                      <AlertCircle className="w-7 h-7 text-rose-400" />
                    ) : (
                      <Info className="w-7 h-7 text-amber-400" />
                    )}
                    <div>
                      <h3 className="text-lg font-bold tracking-tight">
                        {decisionPreview === 'Accepted' && 'ACCEPTED LOT'}
                        {decisionPreview === 'Rejected' && 'REJECTED LOT'}
                        {decisionPreview === 'Second Sample Required' && 'SECOND SAMPLE REQUIRED'}
                      </h3>
                      <p className="text-xs opacity-80">
                        ANSI/ASQ Z1.4 Normal {samplingMethod} Inspection @ AQL {aql} (Letter {codeLetter})
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      decisionPreview === 'Accepted'
                        ? 'bg-emerald-800 text-emerald-100'
                        : decisionPreview === 'Rejected'
                        ? 'bg-rose-800 text-rose-100'
                        : 'bg-amber-800 text-amber-100'
                    }`}
                  >
                    {decisionPreview}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 border-t border-current/20 pt-3 opacity-90">
                  <div className="flex justify-between">
                    <span>Lot Size Received:</span>
                    <strong className="font-mono">{lotSize} {componentCode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sample Size Inspected:</span>
                    <strong className="font-mono">
                      {samplingMethod === 'Single'
                        ? `${singlePlan.sampleSize} units`
                        : stage1Decision === 'Second Sample Required'
                        ? `${doublePlan.stage1.sampleSize} + ${doublePlan.stage2.sampleSize} = ${doublePlan.stage2.cumulativeSampleSize} units`
                        : `${doublePlan.stage1.sampleSize} units`}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Defects Found:</span>
                    <strong className="font-mono">
                      {samplingMethod === 'Double' && stage1Decision === 'Second Sample Required'
                        ? `${totalDefectCount + totalStage2Defects} defect(s) [Stage 1: ${totalDefectCount}, Stage 2: ${totalStage2Defects}]`
                        : `${totalDefectCount} defect(s)`}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Applicable Limits:</span>
                    <strong className="font-mono">
                      {samplingMethod === 'Single'
                        ? `Ac: ≤${singlePlan.ac} | Re: ≥${singlePlan.re}`
                        : stage1Decision === 'Second Sample Required'
                        ? `Cumulative Ac2: ≤${doublePlan.stage2.ac} | Re2: ≥${doublePlan.stage2.re}`
                        : `Stage 1 Ac1: ≤${doublePlan.stage1.ac} | Re1: ≥${doublePlan.stage1.re}`}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Exact Defect Reason Breakdown Table */}
              <div className="bg-slate-850 p-4 rounded-xl border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-700">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Itemized Defect Reason Tally & Final Count
                  </span>
                  <span className="text-xs text-slate-400">
                    Component: <strong className="text-white">{componentCode}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="py-1.5 px-2">Defect Reason</th>
                        <th className="py-1.5 px-2 text-center">Exact Count</th>
                        <th className="py-1.5 px-2">Source Category</th>
                        <th className="py-1.5 px-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {defects.filter((d) => d.count > 0).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-3 px-2 text-emerald-400 text-center">
                            ✓ 0 defects found across all reasons in this sample.
                          </td>
                        </tr>
                      ) : (
                        defects
                          .filter((d) => d.count > 0)
                          .map((d) => (
                            <tr key={d.id} className="hover:bg-slate-800/40">
                              <td className="py-1.5 px-2 font-medium text-slate-200">
                                {d.reason}
                              </td>
                              <td className="py-1.5 px-2 text-center font-bold text-amber-300 value-mono">
                                {d.count}
                              </td>
                              <td className="py-1.5 px-2 text-slate-400">
                                {d.sourceCategory || 'Supplier production defect'}
                              </td>
                              <td className="py-1.5 px-2 text-slate-400">
                                {d.notes || '—'}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-700 font-bold bg-slate-900/60">
                      <tr>
                        <td className="py-2 px-2 text-slate-200">
                          Total Non-Conformities Found (Stage 1):
                        </td>
                        <td className="py-2 px-2 text-center text-white value-mono text-sm">
                          {totalDefectCount}
                        </td>
                        <td colSpan={2} className="py-2 px-2 text-slate-400 text-[11px]">
                          Sum of counts across all individual defect reasons
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Second Sample Entry if Double Sampling required */}
              {samplingMethod === 'Double' && stage1Decision === 'Second Sample Required' && (
                <div className="bg-slate-900/90 border border-amber-500/60 p-4 rounded-xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-900/40">
                    <div>
                      <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                        Second Sample Required ({doublePlan.stage2.sampleSize} units)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Stage 1 defects ({totalDefectCount}) fell between Ac1 ({doublePlan.stage1.ac}) and Re1 ({doublePlan.stage1.re}). Enter exact counts per reason for the second sample:
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Stage 2 Subtotal</span>
                      <span className="text-sm font-bold text-amber-300 value-mono">
                        {totalStage2Defects} defects
                      </span>
                    </div>
                  </div>

                  {/* Stage 2 Defect Reasons with controls */}
                  <div className="space-y-2">
                    {stage2Defects.map((d) => (
                      <div
                        key={d.id}
                        className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="font-medium text-slate-200">{d.reason}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleIncrementStage2Defect(d.id, -1)}
                            disabled={d.count <= 0}
                            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-200 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={d.count === 0 ? '0' : d.count}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                              handleUpdateStage2Defect(d.id, val);
                            }}
                            className="w-14 bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-white font-bold text-center value-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleIncrementStage2Defect(d.id, 1)}
                            className="w-6 h-6 rounded bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cumulative Tally Card */}
                  <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-amber-200 block font-semibold">
                        Cumulative Total Defects:
                      </span>
                      <span className="text-[11px] text-amber-300">
                        Stage 1 ({totalDefectCount}) + Stage 2 ({totalStage2Defects}) = <strong className="text-white text-sm">{totalDefectCount + totalStage2Defects} cumulative defects</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Cumulative Criteria</span>
                      <span className="font-bold text-amber-300 value-mono">
                        Accept: ≤{doublePlan.stage2.ac} | Reject: ≥{doublePlan.stage2.re}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Flow Summary for Decision */}
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-2">
                <span className="font-bold text-slate-200 block uppercase tracking-wider text-[10px]">
                  Automatic Downstream Business Workflow:
                </span>
                {decisionPreview === 'Accepted' ? (
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>
                      <strong>Actual Receiving:</strong> +{lotSize} {componentCode} added to MRP Daily Actual.
                    </li>
                    <li>
                      <strong>Incoming Quality Fails:</strong> {totalDefectCount + totalStage2Defects} sample defects recorded.
                    </li>
                    <li>
                      <strong>Net Usable Inventory:</strong> +{lotSize - (totalDefectCount + totalStage2Defects)} {componentCode} net stock effect.
                    </li>
                    <li>
                      <strong>Report:</strong> PDF report queued for Supervisor sign-off.
                    </li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-rose-300">
                    <li>
                      <strong>Actual Receiving:</strong> 0 units (Rejected lot does NOT enter inventory).
                    </li>
                    <li>
                      <strong>Physical Action:</strong> Full lot of {lotSize} units returned in same lorry.
                    </li>
                    <li>
                      <strong>Procurement Alert:</strong> Automatic notification dispatched to {systemConfig.procurementEmail}.
                    </li>
                    <li>
                      <strong>Urgent Replacement:</strong> Order {deliveryNumber}-R1 generated ({lotSize} units, ~2-day target).
                    </li>
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer / Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenSummaryVerification}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>Verify & Finalize Inspection</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Summarized Report & Verification Popup Modal ("Is this correct?") */}
      {showSummaryVerification && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-xl sm:rounded-2xl w-full max-w-3xl text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Inspection Summary Verification</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono border border-blue-800">
                      {deliveryNumber}
                    </span>
                  </h3>
                  <p className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Please verify: Is this summarized inspection report correct?</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryVerification(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close and return to inspection"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Report Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Question Banner */}
              <div className="p-3 bg-amber-950/30 border border-amber-600/50 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-200">
                    Quality Inspection Pre-Finalization Check
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    Check that all defect reasons, exact counts, and lot details match physical findings. If you need to make changes, click <strong className="text-amber-300">"Edit / Make Corrections"</strong>. If everything is verified, click <strong className="text-emerald-300">"Yes, Correct — Finalize & Save"</strong> to commit to the MRP system.
                  </p>
                </div>
              </div>

              {/* Lot & Delivery Info Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-850 p-3.5 rounded-xl border border-slate-700/80">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Delivery / Lot #</span>
                  <span className="font-bold text-white font-mono text-xs">{deliveryNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Component</span>
                  <span className="font-bold text-white text-xs">
                    {componentCode} ({systemConfig.components[componentCode]?.name})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Lot Quantity</span>
                  <span className="font-black text-amber-300 value-mono text-xs">{lotSize} units</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Inspector</span>
                  <span className="font-semibold text-slate-200 text-xs">{currentUser?.name || 'System QA'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Supplier</span>
                  <span className="text-slate-300 text-xs truncate">{systemConfig.supplierName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Vehicle / Lorry</span>
                  <span className="text-slate-300 text-xs font-mono">{vehicleRef || 'None'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Received Timestamp</span>
                  <span className="text-slate-300 text-xs font-mono">{lotReceivedDate} {lotReceivedTime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">AQL Standard</span>
                  <span className="text-blue-300 text-xs font-semibold">ANSI/ASQ Z1.4 Normal II</span>
                </div>
              </div>

              {/* Sampling Plan Specification */}
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sampling Protocol & Limits:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono text-[11px]">
                      {samplingMethod} Sampling (Letter {codeLetter})
                    </span>
                    <span className="text-slate-300 text-xs">
                      Sample Size (n): <strong className="text-white">{samplingMethod === 'Single' ? singlePlan.sampleSize : doublePlan.stage1.sampleSize}</strong> units
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Accept / Reject</span>
                    <span className="font-bold text-amber-300 value-mono text-xs">
                      {samplingMethod === 'Single'
                        ? `Ac: ≤${singlePlan.ac} | Re: ≥${singlePlan.re}`
                        : `Ac1: ≤${doublePlan.stage1.ac} | Re1: ≥${doublePlan.stage1.re}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Physical Defect Reason Breakdown Table */}
              <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-850">
                <div className="px-3.5 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Exact Defect Counts by Failure Reason</span>
                  </span>
                  <span className="text-[11px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                    Grand Total: {totalDefectCount + (samplingMethod === 'Double' && stage1Decision === 'Second Sample Required' ? totalStage2Defects : 0)} defects
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-[10px] uppercase text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Defect Reason</th>
                        <th className="py-2 px-3 text-center">Stage 1 Count</th>
                        {samplingMethod === 'Double' && stage1Decision === 'Second Sample Required' && (
                          <th className="py-2 px-3 text-center">Stage 2 Count</th>
                        )}
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {defects.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">
                            No defect data recorded.
                          </td>
                        </tr>
                      ) : (
                        defects.map((d) => {
                          const s2Item = stage2Defects.find(
                            (s) => s.reason.toLowerCase() === d.reason.toLowerCase()
                          );
                          const s2Count = s2Item ? s2Item.count : 0;
                          const hasDefects = d.count > 0 || s2Count > 0;
                          return (
                            <tr
                              key={d.id}
                              className={`transition-colors ${
                                hasDefects
                                  ? 'bg-amber-950/20 text-slate-200 font-medium'
                                  : 'text-slate-400 opacity-70'
                              }`}
                            >
                              <td className="py-2 px-3">
                                <span className={hasDefects ? 'text-amber-200 font-semibold' : ''}>
                                  {d.reason}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-bold value-mono ${
                                    d.count > 0
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {d.count}
                                </span>
                              </td>
                              {samplingMethod === 'Double' && stage1Decision === 'Second Sample Required' && (
                                <td className="py-2 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold value-mono ${
                                      s2Count > 0
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {s2Count}
                                  </span>
                                </td>
                              )}
                              <td className="py-2 px-3 text-[11px] text-slate-400">
                                {d.sourceCategory || 'Supplier production defect'}
                              </td>
                              <td className="py-2 px-3 text-[11px] text-slate-400">
                                {d.notes || '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-bold">
                      <tr>
                        <td className="py-2.5 px-3 text-white">
                          Total Non-Conformities Found:
                        </td>
                        <td className="py-2.5 px-3 text-center text-amber-300 value-mono text-sm">
                          {totalDefectCount}
                        </td>
                        {samplingMethod === 'Double' && stage1Decision === 'Second Sample Required' && (
                          <td className="py-2.5 px-3 text-center text-purple-300 value-mono text-sm">
                            {totalStage2Defects}
                          </td>
                        )}
                        <td colSpan={2} className="py-2.5 px-3 text-[11px] text-slate-300">
                          Cumulative Total: <strong className="text-white text-xs">{totalDefectCount + (samplingMethod === 'Double' && stage1Decision === 'Second Sample Required' ? totalStage2Defects : 0)} defects</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Quality Verdict & MRP Impact Card */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  decisionPreview === 'Accepted'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : decisionPreview === 'Rejected'
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                      Calculated ANSI/ASQ Z1.4 Verdict:
                    </span>
                    <span
                      className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                        decisionPreview === 'Accepted'
                          ? 'bg-emerald-900/80 text-emerald-300 border-emerald-400'
                          : decisionPreview === 'Rejected'
                          ? 'bg-rose-900/80 text-rose-300 border-rose-400'
                          : 'bg-amber-900/80 text-amber-300 border-amber-400'
                      }`}
                    >
                      {decisionPreview === 'Accepted'
                        ? '✓ ACCEPTED (PASSED)'
                        : decisionPreview === 'Rejected'
                        ? '✗ REJECTED (FAILED)'
                        : 'SECOND SAMPLE REQUIRED'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    {decisionPreview === 'Accepted'
                      ? `Defect count is within the acceptance threshold (≤${samplingMethod === 'Single' ? singlePlan.ac : doublePlan.stage1.ac}). Full lot accepted.`
                      : decisionPreview === 'Rejected'
                      ? `Defect count meets or exceeds the rejection threshold (≥${samplingMethod === 'Single' ? singlePlan.re : doublePlan.stage1.re}). Full lot rejected.`
                      : `Defect count requires second sampling stage of ${doublePlan.stage2.sampleSize} units.`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] opacity-75 block uppercase font-bold">Downstream MRP Impact</span>
                  <span className="text-xs font-bold text-white">
                    {decisionPreview === 'Accepted'
                      ? `+${lotSize} ${componentCode} to Inventory`
                      : decisionPreview === 'Rejected'
                      ? `0 ${componentCode} received, Lorry returned`
                      : 'Pending Stage 2'}
                  </span>
                </div>
              </div>

              {/* Automatic Stock Addition & Warehouse Update Box */}
              <div className="p-3.5 bg-slate-800/90 border border-slate-700 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-400" />
                    <span>Warehouse Inventory & Stock Live Update</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                    Auto-posts to Inventory on Confirmation
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Current Stock</span>
                    <span className="font-bold text-slate-200 value-mono text-sm">
                      {getComponentStock(componentCode)} units
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Lot Received</span>
                    <span className="font-bold text-blue-400 value-mono text-sm">
                      +{decisionPreview === 'Accepted' ? lotSize : 0} units
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Scrap / Defects</span>
                    <span className="font-bold text-amber-400 value-mono text-sm">
                      -{decisionPreview === 'Accepted' ? (totalDefectCount + totalStage2Defects) : 0} units
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-emerald-900/40 bg-emerald-950/20">
                    <span className="text-[10px] text-emerald-400 block font-semibold">Updated Stock Balance</span>
                    <span className="font-black text-emerald-300 value-mono text-sm">
                      {decisionPreview === 'Accepted'
                        ? getComponentStock(componentCode) + lotSize - (totalDefectCount + totalStage2Defects)
                        : getComponentStock(componentCode)}{' '}
                      units
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  {decisionPreview === 'Accepted'
                    ? `✓ Upon clicking "Yes, Correct", +${lotSize} ${componentCode} is immediately credited to warehouse stock. Net usable stock effect: +${lotSize - (totalDefectCount + totalStage2Defects)} units.`
                    : `✗ Rejected lot of ${lotSize} units does NOT enter stock. Warehouse stock remains unchanged at ${getComponentStock(componentCode)} units.`}
                </p>
              </div>
            </div>

            {/* Footer with Edit and Correct Buttons */}
            <div className="px-4 sm:px-6 py-3.5 bg-slate-850 border-t border-slate-800 flex items-center justify-between shrink-0">
              {/* Edit Button: Takes user back to make changes */}
              <button
                type="button"
                onClick={() => {
                  setShowSummaryVerification(false);
                  setStep(3); // Jump right back to Defect Breakdown step to edit!
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-colors shadow-sm"
              >
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Edit / Make Corrections</span>
              </button>

              {/* Correct Button: Confirms and submits the inspection */}
              <button
                type="button"
                onClick={handleConfirmedSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-900/30"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Yes, Correct — Finalize & Save Inspection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
