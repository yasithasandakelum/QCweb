import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  Factory,
  FileCheck,
  FileSpreadsheet,
  HelpCircle,
  History,
  Info,
  Package,
  Plus,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Warehouse,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ActualMRPInputStatus,
  ComponentActualMRPInput,
  ComponentCode,
  DefectSourceCategory,
  ProductionDefectEvent,
} from '../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ActualMRPInputsViewProps {
  initialSubTab?: 'usage' | 'defects' | 'confirmation';
  onNavigate?: (tab: string) => void;
}

const COMPONENT_DETAILS: Record<ComponentCode, { name: string; full: string; color: string; bg: string; border: string }> = {
  AA: { name: 'AA – Outer Tub', full: 'Outer Tub (Main Drum Structure)', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  BB: { name: 'BB – Inner Tub', full: 'Inner Tub (Spin Basket Assembly)', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  CC: { name: 'CC – Ridgeform', full: 'Ridgeform Support Flanges (3x/Unit)', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
};

export const ActualMRPInputsView: React.FC<ActualMRPInputsViewProps> = ({
  initialSubTab = 'usage',
  onNavigate,
}) => {
  const {
    currentMonth,
    currentDay,
    monthlyPlans,
    productionRecords,
    defectEvents,
    inspections,
    dayConfirmations,
    actualMRPInputs,
    saveActualMRPInputDraft,
    confirmActualMRPInputs,
    saveComponentDefectInputs,
    addDefectLogEntry,
    deleteDefectEvent,
    activeRole,
    currentUser,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'usage' | 'defects' | 'confirmation'>(initialSubTab);
  const [activeComp, setActiveComp] = useState<ComponentCode>('AA');

  // Selected Date string (default to currentMonth + currentDay)
  const defaultDateStr = useMemo(() => {
    return `${currentMonth}-${String(currentDay).padStart(2, '0')}`;
  }, [currentMonth, currentDay]);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDateStr);

  // Synchronize when initialSubTab prop changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Available operating days in active month for quick picker
  const operatingDays = useMemo(() => {
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${currentMonth}-${String(d).padStart(2, '0')}`;
    });
  }, [currentMonth]);

  // Load existing data for selected date or initialize empty draft state
  const existingDayRecord = actualMRPInputs[selectedDate];
  const existingProdRecord = useMemo(
    () => productionRecords.find((p) => p.date === selectedDate),
    [productionRecords, selectedDate]
  );
  const isDayConfirmed = useMemo(() => {
    return (
      existingDayRecord?.overallStatus === 'Confirmed' ||
      dayConfirmations.some((c) => c.date === selectedDate && c.status === 'Confirmed')
    );
  }, [existingDayRecord, dayConfirmations, selectedDate]);

  // Derived inspection defect counts for selected date
  const dayInspections = useMemo(() => {
    return inspections.filter(
      (insp) => insp.lotReceivedDate === selectedDate && insp.finalDecision === 'Accepted'
    );
  }, [inspections, selectedDate]);

  // Specific inspection defect matching by Selected Date + Selected Component
  const activeCompInspections = useMemo(() => {
    return inspections.filter(
      (insp) =>
        insp.lotReceivedDate === selectedDate &&
        insp.componentCode === activeComp &&
        insp.finalDecision === 'Accepted'
    );
  }, [inspections, selectedDate, activeComp]);

  const hasCompletedInspectionForActiveComp = activeCompInspections.length > 0;

  const activeCompInspectionDefects = useMemo(() => {
    return activeCompInspections.reduce((sum, insp) => sum + (insp.totalDefectCount || 0), 0);
  }, [activeCompInspections]);

  const inspectionDefectsMap = useMemo(() => {
    const map: Record<ComponentCode, number> = { AA: 0, BB: 0, CC: 0 };
    dayInspections.forEach((insp) => {
      if (map[insp.componentCode] !== undefined) {
        map[insp.componentCode] += insp.totalDefectCount || 0;
      }
    });
    return map;
  }, [dayInspections]);

  // Day defects logged in defectEvents
  const dayDefectEvents = useMemo(() => {
    return defectEvents.filter((ev) => ev.date === selectedDate);
  }, [defectEvents, selectedDate]);

  // Local form state for the 3 components
  const [formInputs, setFormInputs] = useState<Record<ComponentCode, ComponentActualMRPInput>>({
    AA: {
      actualUsage: null,
      safetyStockUsed: false,
      safetyStockQuantity: 0,
      warehouseDefects: 0,
      assemblyDefects: 0,
      safetyStockDefects: 0,
      inspectionDefects: 0,
      qualityFailsTotal: 0,
      status: 'Not Started',
    },
    BB: {
      actualUsage: null,
      safetyStockUsed: false,
      safetyStockQuantity: 0,
      warehouseDefects: 0,
      assemblyDefects: 0,
      safetyStockDefects: 0,
      inspectionDefects: 0,
      qualityFailsTotal: 0,
      status: 'Not Started',
    },
    CC: {
      actualUsage: null,
      safetyStockUsed: false,
      safetyStockQuantity: 0,
      warehouseDefects: 0,
      assemblyDefects: 0,
      safetyStockDefects: 0,
      inspectionDefects: 0,
      qualityFailsTotal: 0,
      status: 'Not Started',
    },
  });

  // Re-sync local form inputs when selectedDate, existingDayRecord, or dayDefectEvents change
  useEffect(() => {
    const components: ComponentCode[] = ['AA', 'BB', 'CC'];
    const updated: Record<ComponentCode, ComponentActualMRPInput> = {} as any;

    components.forEach((code) => {
      // 1. Inspection defects (read-only from lot inspection)
      const inspDefects = inspectionDefectsMap[code] || 0;

      // 2. Existing stored inputs or defaults
      const savedInp = existingDayRecord?.components?.[code];

      // 3. Operational defect events logged
      const whEventsSum = dayDefectEvents
        .filter((e) => e.componentCode === code && e.sourceCategory === 'Warehouse Defect')
        .reduce((s, e) => s + e.quantity, 0);
      const assyEventsSum = dayDefectEvents
        .filter((e) => e.componentCode === code && (e.sourceCategory === 'Assembly Defect' || !e.sourceCategory))
        .reduce((s, e) => s + e.quantity, 0);
      const ssEventsSum = dayDefectEvents
        .filter((e) => e.componentCode === code && e.sourceCategory === 'Safety Stock Defect')
        .reduce((s, e) => s + e.quantity, 0);

      // Usage from saved inputs or existing production record
      let actualUsage: number | null = null;
      let safetyStockUsed = false;
      let safetyStockQuantity = 0;

      if (savedInp && savedInp.actualUsage !== null) {
        actualUsage = savedInp.actualUsage;
        safetyStockUsed = savedInp.safetyStockUsed;
        safetyStockQuantity = savedInp.safetyStockQuantity;
      } else if (existingProdRecord) {
        actualUsage =
          code === 'AA'
            ? existingProdRecord.usageAA
            : code === 'BB'
            ? existingProdRecord.usageBB
            : existingProdRecord.usageCC;

        const ssQty =
          code === 'AA'
            ? existingProdRecord.safetyStockUsageAA ?? 0
            : code === 'BB'
            ? existingProdRecord.safetyStockUsageBB ?? 0
            : existingProdRecord.safetyStockUsageCC ?? 0;

        safetyStockUsed = ssQty > 0 || !!existingProdRecord.safetyStockUsed;
        safetyStockQuantity = ssQty;
      }

      // Defect quantities prefer logged defect events if present, otherwise savedInp
      const warehouseDefects =
        dayDefectEvents.length > 0 ? whEventsSum : savedInp?.warehouseDefects ?? 0;
      const assemblyDefects =
        dayDefectEvents.length > 0 ? assyEventsSum : savedInp?.assemblyDefects ?? 0;
      const safetyStockDefects =
        dayDefectEvents.length > 0 ? ssEventsSum : savedInp?.safetyStockDefects ?? 0;

      const qualityFailsTotal =
        inspDefects + warehouseDefects + assemblyDefects + safetyStockDefects;

      let status: ActualMRPInputStatus = 'Not Started';
      if (isDayConfirmed) {
        status = 'Confirmed';
      } else if (actualUsage !== null) {
        status = 'Ready for Confirmation';
      } else if (
        safetyStockUsed ||
        warehouseDefects > 0 ||
        assemblyDefects > 0 ||
        safetyStockDefects > 0
      ) {
        status = 'Data Entry In Progress';
      }

      updated[code] = {
        actualUsage,
        safetyStockUsed,
        safetyStockQuantity: safetyStockUsed ? safetyStockQuantity : 0,
        warehouseDefects,
        assemblyDefects,
        safetyStockDefects,
        inspectionDefects: inspDefects,
        qualityFailsTotal,
        status,
        notes: savedInp?.notes || '',
      };
    });

    setFormInputs(updated);
  }, [
    selectedDate,
    existingDayRecord,
    existingProdRecord,
    dayDefectEvents,
    inspectionDefectsMap,
    isDayConfirmed,
  ]);

  // Inspection details drilldown modal
  const [selectedInspectionDetails, setSelectedInspectionDetails] = useState<any[] | null>(null);

  // New incremental defect entry modal
  const [isAddDefectOpen, setIsAddDefectOpen] = useState<boolean>(false);
  const [defectForm, setDefectForm] = useState<{
    componentCode: ComponentCode;
    sourceCategory: DefectSourceCategory;
    quantity: number;
    reason: string;
    notes: string;
  }>({
    componentCode: 'AA',
    sourceCategory: 'Warehouse Defect',
    quantity: 1,
    reason: 'Handling damage during storage transfer',
    notes: '',
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [confirmationSuccess, setConfirmationSuccess] = useState<boolean>(false);
  const [defectSaveMessage, setDefectSaveMessage] = useState<string | null>(null);

  // Format date readable (e.g. "10 October 2026")
  const formattedDate = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split('-').map((n) => parseInt(n, 10));
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Checklist computation for Section 8
  const checklistData = useMemo(() => {
    const components: ComponentCode[] = ['AA', 'BB', 'CC'];
    return components.map((code) => {
      const inp = formInputs[code];
      const hasUsage = inp.actualUsage !== null && inp.actualUsage >= 0;
      const hasSS = !inp.safetyStockUsed || (inp.safetyStockUsed && inp.safetyStockQuantity >= 0);
      const inspCount = inp.inspectionDefects;
      const isReady = hasUsage && hasSS;

      return {
        code,
        hasUsage,
        hasSS,
        inspCount,
        isReady,
        status: inp.status,
      };
    });
  }, [formInputs]);

  // Update handlers
  const handleUsageChange = (code: ComponentCode, valStr: string) => {
    const val = valStr === '' ? null : parseInt(valStr, 10);
    setFormInputs((prev) => {
      const current = prev[code];
      const updatedUsage = val !== null && !isNaN(val) ? Math.max(0, val) : null;
      return {
        ...prev,
        [code]: {
          ...current,
          actualUsage: updatedUsage,
          status: updatedUsage !== null ? 'Ready for Confirmation' : 'Data Entry In Progress',
        },
      };
    });
  };

  const handleSafetyStockUsedToggle = (code: ComponentCode, used: boolean) => {
    setFormInputs((prev) => {
      const current = prev[code];
      return {
        ...prev,
        [code]: {
          ...current,
          safetyStockUsed: used,
          safetyStockQuantity: used ? (current.safetyStockQuantity || 10) : 0,
        },
      };
    });
  };

  const handleSafetyStockQtyChange = (code: ComponentCode, valStr: string) => {
    const val = parseInt(valStr, 10);
    const qty = isNaN(val) ? 0 : Math.max(0, val);
    setFormInputs((prev) => {
      const current = prev[code];
      return {
        ...prev,
        [code]: {
          ...current,
          safetyStockQuantity: qty,
        },
      };
    });
  };

  const handleDefectChange = (
    code: ComponentCode,
    field: 'warehouseDefects' | 'assemblyDefects' | 'safetyStockDefects',
    valStr: string
  ) => {
    const val = parseInt(valStr, 10);
    const qty = isNaN(val) ? 0 : Math.max(0, val);
    setFormInputs((prev) => {
      const current = prev[code];
      const updated = { ...current, [field]: qty };
      updated.qualityFailsTotal =
        updated.inspectionDefects +
        updated.warehouseDefects +
        updated.assemblyDefects +
        updated.safetyStockDefects;
      return {
        ...prev,
        [code]: updated,
      };
    });
  };

  // Save Draft action
  const handleSaveDraft = () => {
    saveActualMRPInputDraft(selectedDate, formInputs);
  };

  // Single-Component Defect Save action (Requirement 3: save one component at a time)
  const handleSaveComponentDefects = (code: ComponentCode) => {
    const compInp = formInputs[code];
    if (
      compInp.warehouseDefects < 0 ||
      compInp.assemblyDefects < 0 ||
      compInp.safetyStockDefects < 0
    ) {
      setValidationErrors([`${code} defect quantities cannot be negative.`]);
      return;
    }

    saveComponentDefectInputs(
      selectedDate,
      code,
      {
        warehouseDefects: compInp.warehouseDefects,
        assemblyDefects: compInp.assemblyDefects,
        safetyStockDefects: compInp.safetyStockDefects,
      },
      `Defect inputs saved for ${code} on ${selectedDate}`
    );

    setDefectSaveMessage(
      `Defect inputs for ${COMPONENT_DETAILS[code].name} on ${formattedDate} saved and linked to Actual MRP!`
    );
    setTimeout(() => {
      setDefectSaveMessage(null);
    }, 5000);
  };

  const getComponentDefectStatus = (code: ComponentCode): 'Defect Inputs Saved' | 'Not Entered' => {
    const compData = actualMRPInputs[selectedDate]?.components?.[code];
    if (compData?.defectStatus === 'Defect Inputs Saved') return 'Defect Inputs Saved';
    if (compData?.status === 'Confirmed') return 'Defect Inputs Saved';
    const hasDefectEvents = defectEvents.some(
      (ev) => ev.date === selectedDate && ev.componentCode === code
    );
    if (hasDefectEvents) return 'Defect Inputs Saved';
    return 'Not Entered';
  };

  // Validation
  const validateInputs = (): boolean => {
    const errors: string[] = [];
    const components: ComponentCode[] = ['AA', 'BB', 'CC'];

    components.forEach((code) => {
      const inp = formInputs[code];
      if (inp.actualUsage === null) {
        errors.push(`${code} – Actual Effective Usage is missing. Please enter a valid whole number.`);
      } else if (inp.actualUsage < 0 || !Number.isInteger(inp.actualUsage)) {
        errors.push(`${code} – Actual Effective Usage must be a positive whole number.`);
      }

      if (inp.safetyStockUsed && inp.safetyStockQuantity < 0) {
        errors.push(`${code} – Quantity From Safety Stock cannot be negative.`);
      }

      if (inp.warehouseDefects < 0 || inp.assemblyDefects < 0 || inp.safetyStockDefects < 0) {
        errors.push(`${code} – Defect quantities cannot be negative.`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Confirm & Update Actual MRP action
  const handleConfirmAndRecalculate = () => {
    if (!validateInputs()) {
      return;
    }

    confirmActualMRPInputs(
      selectedDate,
      formInputs,
      `Operational inputs confirmed by ${currentUser?.name || 'Operator'} on ${new Date().toLocaleTimeString()}`
    );

    setConfirmationSuccess(true);
  };

  // Add incremental defect entry submit
  const handleAddIncrementalDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (defectForm.quantity <= 0) return;

    addDefectLogEntry(
      selectedDate,
      defectForm.componentCode,
      defectForm.sourceCategory,
      defectForm.quantity,
      defectForm.reason,
      defectForm.notes
    );

    setIsAddDefectOpen(false);
    setDefectForm({
      componentCode: activeComp,
      sourceCategory: 'Warehouse Defect',
      quantity: 1,
      reason: 'Handling damage during storage transfer',
      notes: '',
    });
  };

  // Inspect inspection details
  const handleOpenInspectionDetails = (code: ComponentCode) => {
    const details = dayInspections.filter((insp) => insp.componentCode === code);
    setSelectedInspectionDetails(details);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                <FileCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Actual MRP Inputs</h1>
              <Badge
                variant="outline"
                className={
                  isDayConfirmed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }
              >
                {isDayConfirmed ? '● Confirmed in Actual MRP' : '○ Pending Confirmation'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Collect and verify physical daily operational inputs. Once confirmed, values automatically feed the Actual MRP calculation engine using authoritative formulas.
            </p>
          </div>

          {/* Date Selector at Top: Date: [ 10 October 2026 ▼ ] */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 shrink-0">
            <span className="text-xs font-semibold text-slate-700">Date:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {operatingDays.map((dateStr) => {
                const dayNum = parseInt(dateStr.split('-')[2], 10);
                const isConfirmed = dayConfirmations.some((c) => c.date === dateStr && c.status === 'Confirmed');
                return (
                  <option key={dateStr} value={dateStr}>
                    {dateStr} (Day {dayNum}){isConfirmed ? ' ✓' : ''}
                  </option>
                );
              })}
            </select>

            <span className="text-xs font-medium text-slate-600 hidden sm:inline px-1">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 border-t border-slate-100 pt-3">
          <button
            onClick={() => setActiveSubTab('usage')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSubTab === 'usage'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Factory className="w-3.5 h-3.5" />
            1. Daily Usage & Safety Stock
          </button>
          <button
            onClick={() => setActiveSubTab('defects')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSubTab === 'defects'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            2. Defect Inputs
          </button>
          <button
            onClick={() => setActiveSubTab('confirmation')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSubTab === 'confirmation'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            3. Daily Input Confirmation
          </button>
        </div>
      </div>

      {/* Checklist Banner (Requirement 8) */}
      <div className="bg-slate-900 text-slate-100 rounded-lg p-3.5 shadow-xs border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold tracking-wide uppercase text-slate-200">
              Today's Actual MRP Inputs Status & Checklist ({formattedDate})
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {checklistData.map((item) => (
              <div key={item.code} className="flex items-center gap-1.5">
                <span className="font-bold text-slate-300">{item.code}:</span>
                {item.hasUsage ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Usage Missing
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 1: DAILY USAGE & SAFETY STOCK */}
      {activeSubTab === 'usage' && (
        <div className="space-y-4">
          {/* Component Tabs / Cards Selector: [ AA - Outer Tub ] [ BB - Inner Tub ] [ CC - Ridgeform ] */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['AA', 'BB', 'CC'] as ComponentCode[]).map((code) => {
              const details = COMPONENT_DETAILS[code];
              const inp = formInputs[code];
              const isSelected = activeComp === code;

              return (
                <button
                  key={code}
                  onClick={() => setActiveComp(code)}
                  className={`text-left p-3.5 rounded-lg border transition-all ${
                    isSelected
                      ? `bg-white border-blue-500 shadow-xs ring-1 ring-blue-500`
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{details.name}</span>
                    <Badge variant="outline" className={details.bg + ' ' + details.color + ' ' + details.border}>
                      {code}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Usage:{' '}
                    <span className="font-bold text-slate-800">
                      {inp.actualUsage !== null ? `${inp.actualUsage} units` : 'Not entered'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Safety Stock:{' '}
                    <span className="font-semibold text-slate-700">
                      {inp.safetyStockUsed ? `Yes (${inp.safetyStockQuantity} units)` : 'No'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Component Input Form */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {COMPONENT_DETAILS[activeComp].name}
                  </h3>
                  <p className="text-xs text-slate-500">{COMPONENT_DETAILS[activeComp].full}</p>
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                  Target Date: <strong className="text-slate-800">{formattedDate}</strong>
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Actual Effective Usage */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Actual Effective Usage
                  </label>
                  <p className="text-xs text-slate-500">
                    Total physical component quantity consumed for production on this operating day.
                  </p>
                  <div className="mt-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 380"
                      value={formInputs[activeComp].actualUsage ?? ''}
                      onChange={(e) => handleUsageChange(activeComp, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Must be a positive whole number.</span>
                    {formInputs[activeComp].actualUsage !== null && (
                      <span className="text-emerald-600 font-semibold">✓ Value Entered</span>
                    )}
                  </div>
                </div>

                {/* 2. Safety Stock Used & Quantity */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Was Safety Stock Used?
                  </label>
                  <p className="text-xs text-slate-500">
                    Indicate if emergency reserve inventory was drawn to meet floor usage.
                  </p>

                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="radio"
                        name={`safety-stock-${activeComp}`}
                        checked={!formInputs[activeComp].safetyStockUsed}
                        onChange={() => handleSafetyStockUsedToggle(activeComp, false)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      ○ No
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="radio"
                        name={`safety-stock-${activeComp}`}
                        checked={formInputs[activeComp].safetyStockUsed}
                        onChange={() => handleSafetyStockUsedToggle(activeComp, true)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      ○ Yes
                    </label>
                  </div>

                  {formInputs[activeComp].safetyStockUsed ? (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Quantity From Safety Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 10"
                        value={formInputs[activeComp].safetyStockQuantity || ''}
                        onChange={(e) => handleSafetyStockQtyChange(activeComp, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      <span className="text-[10px] text-slate-500">
                        Units drawn directly from safety buffer reserve.
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500 italic">
                      Safety stock quantity will be saved as 0.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Buttons: [ Save Draft ] [ Confirm Daily Input ] */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  Save Draft
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveSubTab('defects')}
                    className="flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    Next: Defect Inputs
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setActiveSubTab('confirmation')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Daily Input
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: DEFECT INPUTS */}
      {activeSubTab === 'defects' && (
        <div className="space-y-4">
          {/* Top Selection & Navigation Bar (Flow: Select Date -> Select Component -> Load Inspection Defects -> Enter other defects -> Save) */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Actual MRP Defect Inputs
                </h3>
                <p className="text-xs text-slate-500">
                  Enter and save defect inputs one component at a time. Inspection defects are linked automatically by selected Date and Component.
                </p>
              </div>

              {/* Add incremental defect entry modal launcher */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDefectForm((prev) => ({ ...prev, componentCode: activeComp }));
                  setIsAddDefectOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                + Add Shift Defect Entry
              </Button>
            </div>

            {/* Date and Component Selectors Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Date Dropdown */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Date
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                >
                  {operatingDays.map((dateStr) => {
                    const dayNum = parseInt(dateStr.split('-')[2], 10);
                    const isConfirmed = dayConfirmations.some((c) => c.date === dateStr && c.status === 'Confirmed');
                    return (
                      <option key={dateStr} value={dateStr}>
                        {dateStr} (Day {dayNum}){isConfirmed ? ' ✓ Confirmed' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Component Dropdown */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Component
                </label>
                <select
                  value={activeComp}
                  onChange={(e) => setActiveComp(e.target.value as ComponentCode)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="AA">AA – Outer Tub</option>
                  <option value="BB">BB – Inner Tub</option>
                  <option value="CC">CC – Ridgeform</option>
                </select>
              </div>
            </div>

            {/* Quick Switch Buttons for Component Navigation */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Quick Component Switch:</span>
              {(['AA', 'BB', 'CC'] as ComponentCode[]).map((code) => {
                const isSelected = activeComp === code;
                const status = getComponentDefectStatus(code);
                return (
                  <button
                    key={code}
                    onClick={() => setActiveComp(code)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{COMPONENT_DETAILS[code].name}</span>
                    {status === 'Defect Inputs Saved' ? (
                      <span className="text-[10px] text-emerald-300">✓ Saved</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Not Entered</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Success Banner when Defect Inputs Saved for Single Component */}
          {defectSaveMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-800 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{defectSaveMessage}</span>
              </div>
              <button
                onClick={() => setDefectSaveMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 4 Quality Defect Categories Grid for Selected Date + Selected Component */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 1. 🧪 Inspection Defects (READ-ONLY, automatically linked by Selected Date + Selected Component) */}
            <Card className="border-slate-200 shadow-xs bg-slate-50/80 md:col-span-1">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    🧪 Inspection Defects
                  </span>
                  {hasCompletedInspectionForActiveComp ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px]">
                      Pending
                    </Badge>
                  )}
                </div>

                {hasCompletedInspectionForActiveComp ? (
                  <>
                    <div className="text-3xl font-black text-slate-900">
                      {activeCompInspectionDefects}
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div>
                        Source: <strong className="text-slate-800">Lot Inspection on {formattedDate}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {activeCompInspections.length} accepted lot inspection(s) combined for {activeComp}.
                      </div>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => handleOpenInspectionDetails(activeComp)}
                      className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 pt-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Inspection Details
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-bold text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      Pending / No completed inspection found
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Source: Lot Inspection (Awaiting completed inspection record for {activeComp} on {formattedDate})
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      Do not treat as zero: missing inspection is kept pending until lot test completes.
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 2. 🏬 Warehouse Defects */}
            <Card className="border-slate-200 shadow-xs bg-white md:col-span-1">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
                    🏬 Warehouse Defects
                  </span>
                  <span className="text-[10px] text-slate-500">Storage damage</span>
                </div>

                <div className="pt-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={formInputs[activeComp]?.warehouseDefects ?? 0}
                    onChange={(e) => handleDefectChange(activeComp, 'warehouseDefects', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="text-[11px] text-slate-500">
                  Damage logged during warehouse handling or storage transfers.
                </div>
              </CardContent>
            </Card>

            {/* 3. 🏭 Assembly Defects */}
            <Card className="border-slate-200 shadow-xs bg-white md:col-span-1">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
                    🏭 Assembly Defects
                  </span>
                  <span className="text-[10px] text-slate-500">Station rejects</span>
                </div>

                <div className="pt-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={formInputs[activeComp]?.assemblyDefects ?? 0}
                    onChange={(e) => handleDefectChange(activeComp, 'assemblyDefects', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="text-[11px] text-slate-500">
                  Assembly line reject parts, tooling splits, or mounting issues.
                </div>
              </CardContent>
            </Card>

            {/* 4. 🛡️ Safety Stock Defects */}
            <Card className="border-slate-200 shadow-xs bg-white md:col-span-1">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
                    🛡️ Safety Stock Defects
                  </span>
                  <span className="text-[10px] text-slate-500">Reserve scrap</span>
                </div>

                <div className="pt-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={formInputs[activeComp]?.safetyStockDefects ?? 0}
                    onChange={(e) => handleDefectChange(activeComp, 'safetyStockDefects', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="text-[11px] text-slate-500">
                  Scrapped during emergency safety reserve withdrawals.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 3: Read-only Quality Fails Total Banner & Save Button */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                🔍 Quality Fails Total (System Calculated)
              </span>
              <div className="text-2xl font-black text-blue-950">
                {formInputs[activeComp]?.qualityFailsTotal ?? 0}{' '}
                <span className="text-xs font-bold text-blue-700">total units</span>
              </div>
              <p className="text-xs text-blue-800">
                = Inspection ({hasCompletedInspectionForActiveComp ? activeCompInspectionDefects : 'Pending'}) + Warehouse ({formInputs[activeComp]?.warehouseDefects ?? 0}) + Assembly ({formInputs[activeComp]?.assemblyDefects ?? 0}) + Safety Stock ({formInputs[activeComp]?.safetyStockDefects ?? 0})
              </p>
              <p className="text-[11px] text-blue-600">
                Calculated automatically. Saving links this total directly to the {activeComp} Actual MRP on {formattedDate}.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                onClick={() => handleSaveComponentDefects(activeComp)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Defect Inputs
              </Button>
            </div>
          </div>

          {/* Saved-record behavior: Component Status Display */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Component Defect Inputs Status ({formattedDate})
              </h4>
              <span className="text-[11px] text-slate-500">
                You can save each component independently without completing all three together.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['AA', 'BB', 'CC'] as ComponentCode[]).map((code) => {
                const details = COMPONENT_DETAILS[code];
                const status = getComponentDefectStatus(code);
                const isSaved = status === 'Defect Inputs Saved';
                const isCurrent = activeComp === code;
                const compInp = formInputs[code];

                return (
                  <div
                    key={code}
                    onClick={() => setActiveComp(code)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isCurrent
                        ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/40 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{details.name}</span>
                      {isSaved ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          ✅ Defect Inputs Saved
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">
                          Not Entered
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-600 flex justify-between">
                      <span>Quality Fails Total:</span>
                      <strong className="text-slate-800">{compInp?.qualityFailsTotal ?? 0} units</strong>
                    </div>

                    <div className="text-[10px] text-slate-500 mt-0.5">
                      WH: {compInp?.warehouseDefects ?? 0} · Assembly: {compInp?.assemblyDefects ?? 0} · SS: {compInp?.safetyStockDefects ?? 0}
                    </div>

                    {!isCurrent && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                        Select {code} to enter defects →
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Defect Events Ledger for this component */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Incremental Defect Entries Ledger ({activeComp} on {formattedDate})
                  </h4>
                </div>
                <span className="text-xs text-slate-500">
                  {dayDefectEvents.filter((e) => e.componentCode === activeComp).length} logged entries
                </span>
              </div>

              {dayDefectEvents.filter((e) => e.componentCode === activeComp).length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center italic bg-slate-50 rounded border border-dashed border-slate-200">
                  No individual defect entries logged today for {activeComp}. You can enter daily totals above or click "+ Add Shift Defect Entry".
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Time</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Quantity</th>
                        <th className="py-2 px-3">Reason / Details</th>
                        <th className="py-2 px-3">Logged By</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dayDefectEvents
                        .filter((e) => e.componentCode === activeComp)
                        .map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-mono font-medium text-slate-700">{ev.timestamp}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-[10px]">
                                {ev.sourceCategory || 'Assembly Defect'}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-rose-600">+{ev.quantity}</td>
                            <td className="py-2 px-3 text-slate-700">{ev.defectReason}</td>
                            <td className="py-2 px-3 text-slate-500">{ev.enteredBy}</td>
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => deleteDefectEvent(ev.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete defect entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Navigation button */}
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => setActiveSubTab('confirmation')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Proceed to Daily Input Confirmation
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: DAILY INPUT CONFIRMATION */}
      {activeSubTab === 'confirmation' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Verification & Sign-off
                </span>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  ACTUAL MRP INPUT CONFIRMATION
                </h2>
                <p className="text-xs text-slate-500">{formattedDate}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSubTab('usage')}
                  className="flex items-center gap-1.5 border-slate-300 text-slate-700"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  Edit Inputs
                </Button>

                <Button
                  size="sm"
                  onClick={handleConfirmAndRecalculate}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Confirm & Update Actual MRP
                </Button>
              </div>
            </div>

            {/* Validation Errors Notice */}
            {validationErrors.length > 0 && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Please correct the following inputs before confirming:
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success State Notice */}
            {confirmationSuccess && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="font-bold">Inputs Successfully Confirmed & Linked to Actual MRP!</strong>
                    <p className="text-emerald-700 text-[11px] mt-0.5">
                      All dependent Actual MRP rows were recalculated using authoritative Excel formulas.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => onNavigate?.('mrp-daily-actual')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs shrink-0 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  View Daily Actual MRP
                </Button>
              </div>
            )}

            {/* Summary Cards for AA, BB, and CC */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {(['AA', 'BB', 'CC'] as ComponentCode[]).map((code) => {
                const details = COMPONENT_DETAILS[code];
                const inp = formInputs[code];

                return (
                  <div
                    key={code}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-bold text-sm text-slate-900">{details.name}</span>
                      <Badge
                        variant="outline"
                        className={
                          inp.status === 'Confirmed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inp.status === 'Ready for Confirmation'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      >
                        {inp.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">Actual Effective Usage</span>
                        <strong className="text-slate-900">
                          {inp.actualUsage !== null ? `${inp.actualUsage} units` : '— Missing'}
                        </strong>
                      </div>

                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">From Safety Stock</span>
                        <strong className="text-slate-900">
                          {inp.safetyStockUsed ? `${inp.safetyStockQuantity} units` : '0'}
                        </strong>
                      </div>

                      <div className="pt-2 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Quality Defects:
                      </div>

                      <div className="flex justify-between py-0.5 text-slate-600">
                        <span>🧪 Inspection Defects</span>
                        <span className="font-medium text-slate-800">{inp.inspectionDefects}</span>
                      </div>

                      <div className="flex justify-between py-0.5 text-slate-600">
                        <span>🏬 Warehouse Defects</span>
                        <span className="font-medium text-slate-800">{inp.warehouseDefects}</span>
                      </div>

                      <div className="flex justify-between py-0.5 text-slate-600">
                        <span>🏭 Assembly Defects</span>
                        <span className="font-medium text-slate-800">{inp.assemblyDefects}</span>
                      </div>

                      <div className="flex justify-between py-0.5 text-slate-600">
                        <span>🛡️ Safety Stock Defects</span>
                        <span className="font-medium text-slate-800">{inp.safetyStockDefects}</span>
                      </div>

                      <div className="flex justify-between py-1.5 border-t border-slate-200 mt-2 font-bold text-xs text-blue-900 bg-blue-50/50 px-2 rounded">
                        <span>Quality Fails Total</span>
                        <span>{inp.qualityFailsTotal}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note about calculated MRP rows */}
            <div className="mt-5 p-3 bg-slate-100 rounded-md text-[11px] text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>Note:</strong> Calculated MRP fields (such as Actual Beginning Inventory, Remaining Stock, Shortage, Safety Stock Cycle Day, Ending Inventory) cannot be edited here. They calculate automatically once confirmed.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Inspection Details Traceability */}
      <Dialog
        open={selectedInspectionDetails !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedInspectionDetails(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Lot Inspection Details – {activeComp}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Traceability record for incoming lot quality tests performed on {formattedDate}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            {selectedInspectionDetails && selectedInspectionDetails.length > 0 ? (
              selectedInspectionDetails.map((insp) => (
                <div key={insp.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Lot Number: {insp.lotNumber}</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {insp.finalDecision}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                    <div>Supplier: <strong className="text-slate-800">{insp.supplierName}</strong></div>
                    <div>Delivery: <strong className="text-slate-800">{insp.businessDeliveryNumber}</strong></div>
                    <div>Lot Size: <strong className="text-slate-800">{insp.lotSize} units</strong></div>
                    <div>Sample Size: <strong className="text-slate-800">{insp.stage1SampleSize} units</strong></div>
                    <div>Defects Found: <strong className="text-rose-600 font-bold">{insp.totalDefectCount}</strong></div>
                    <div>Inspector: <strong className="text-slate-800">{insp.inspectorName}</strong></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-6">
                No physical lot inspections were scheduled or received on {formattedDate} for this component.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedInspectionDetails(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Incremental Defect Entry */}
      <Dialog open={isAddDefectOpen} onOpenChange={setIsAddDefectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Log Defect Entry during Shift
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record defect scraps in real time for {formattedDate}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddIncrementalDefect} className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Component</label>
              <select
                value={defectForm.componentCode}
                onChange={(e) => setDefectForm((prev) => ({ ...prev, componentCode: e.target.value as ComponentCode }))}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800"
              >
                <option value="AA">AA – Outer Tub</option>
                <option value="BB">BB – Inner Tub</option>
                <option value="CC">CC – Ridgeform</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Defect Category</label>
              <select
                value={defectForm.sourceCategory}
                onChange={(e) => setDefectForm((prev) => ({ ...prev, sourceCategory: e.target.value as DefectSourceCategory }))}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800"
              >
                <option value="Warehouse Defect">🏬 Warehouse Defect</option>
                <option value="Assembly Defect">🏭 Assembly Defect</option>
                <option value="Safety Stock Defect">🛡️ Safety Stock Defect</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={defectForm.quantity}
                onChange={(e) => setDefectForm((prev) => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason / Station Details</label>
              <input
                type="text"
                required
                value={defectForm.reason}
                onChange={(e) => setDefectForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. Flange crack during assembly fixture mount"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddDefectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Add Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
