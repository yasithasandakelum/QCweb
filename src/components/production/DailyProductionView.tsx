import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Factory,
  Layers,
  Plus,
  ShieldAlert,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { COMPONENT_DEFECT_REASONS, PRODUCTION_MODELS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import { ComponentCode, DailyModelOutput, DefectSourceCategory } from '../../types';
import { PeriodSelector } from '../common/PeriodSelector';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export const DailyProductionView: React.FC = () => {
  const {
    productionRecords,
    recordDailyProduction,
    defectEvents,
    addDefectEvent,
    deleteDefectEvent,
    confirmProductionDay,
    dayConfirmations,
    inspections,
    currentUser,
    activeRole,
    currentDay,
    setCurrentDay,
    addNotification,
    currentMonth,
    plannedOutputs,
  } = useApp();

  const selectedDateStr = `${currentMonth}-${String(currentDay).padStart(2, '0')}`;
  const plannedTodayOutput = plannedOutputs[currentDay - 1] ?? 70;

  // Selected Day Record
  const currentRecord = useMemo(() => {
    return productionRecords.find((p) => p.date === selectedDateStr);
  }, [productionRecords, selectedDateStr]);

  // State for recording daily model outputs
  const [modelOutputs, setModelOutputs] = useState<Record<string, number>>({
    'Model A': 25,
    'Model B': 20,
    'Model C': 15,
    'Model D': 30,
    'Model E': 10,
    'Model F': 20,
  });

  // State for safety stock usage
  const [useSafetyStock, setUseSafetyStock] = useState<boolean>(false);
  const [safetyUsageAA, setSafetyUsageAA] = useState<number>(0);
  const [safetyUsageBB, setSafetyUsageBB] = useState<number>(0);
  const [safetyUsageCC, setSafetyUsageCC] = useState<number>(0);

  // Sync state when day or record changes
  useEffect(() => {
    if (currentRecord) {
      const modelMap: Record<string, number> = {};
      currentRecord.outputs.forEach((o) => {
        modelMap[o.model] = o.quantity;
      });
      setModelOutputs(modelMap);
      setUseSafetyStock(currentRecord.safetyStockUsed ?? (currentDay === 1));
      setSafetyUsageAA(currentRecord.safetyStockUsageAA ?? (currentDay === 1 ? 10 : 0));
      setSafetyUsageBB(currentRecord.safetyStockUsageBB ?? 0);
      setSafetyUsageCC(currentRecord.safetyStockUsageCC ?? 0);
    } else {
      // Default initial simulation distribution
      const baseShare = Math.floor(plannedTodayOutput / 6);
      setModelOutputs({
        'Model A': baseShare + 5,
        'Model B': baseShare,
        'Model C': baseShare,
        'Model D': baseShare + 5,
        'Model E': Math.max(0, baseShare - 5),
        'Model F': plannedTodayOutput - (baseShare * 4 + 5),
      });
      setUseSafetyStock(currentDay === 1);
      setSafetyUsageAA(currentDay === 1 ? 10 : 0);
      setSafetyUsageBB(0);
      setSafetyUsageCC(0);
    }
  }, [currentRecord, currentDay, plannedTodayOutput]);

  // State for defect event input
  const [defectComp, setDefectComp] = useState<ComponentCode>('AA');
  const [defectReason, setDefectReason] = useState<string>(COMPONENT_DEFECT_REASONS?.['AA']?.[0] || '');
  const [defectQty, setDefectQty] = useState<number>(1);
  const [defectNotes, setDefectNotes] = useState<string>('');
  const [defectCategory, setDefectCategory] = useState<DefectSourceCategory>('Assembly Defect');

  // Supervisor confirmation notes
  const [confirmNotes, setConfirmNotes] = useState<string>('');

  // Selected Day Defect Events
  const currentDayDefects = useMemo(() => {
    return defectEvents.filter((d) => d.date === selectedDateStr);
  }, [defectEvents, selectedDateStr]);

  // Selected Day Confirmation
  const currentConfirmation = useMemo(() => {
    return dayConfirmations.find((c) => c.date === selectedDateStr);
  }, [dayConfirmations, selectedDateStr]);

  const isConfirmed = currentConfirmation?.status === 'Confirmed';
  const isSupervisor = activeRole === 'Supervisor' || activeRole === 'Admin';

  // Total entered output in form
  const totalEnteredOutput = (Object.values(modelOutputs) as number[]).reduce(
    (sum: number, v: number) => sum + (Number(v) || 0),
    0
  );

  // Component filter for defect events table
  const [compFilter, setCompFilter] = useState<ComponentCode | 'ALL'>('ALL');

  // Breakdown of defects by Component and Category for today
  const defectBreakdown = useMemo(() => {
    const data: Record<ComponentCode, { warehouse: number; assembly: number; safetyStock: number; total: number }> = {
      AA: { warehouse: 0, assembly: 0, safetyStock: 0, total: 0 },
      BB: { warehouse: 0, assembly: 0, safetyStock: 0, total: 0 },
      CC: { warehouse: 0, assembly: 0, safetyStock: 0, total: 0 },
    };

    currentDayDefects.forEach((d) => {
      const comp = d.componentCode;
      if (data[comp]) {
        if (d.sourceCategory === 'Warehouse Defect') {
          data[comp].warehouse += d.quantity;
        } else if (d.sourceCategory === 'Safety Stock Defect') {
          data[comp].safetyStock += d.quantity;
        } else {
          data[comp].assembly += d.quantity;
        }
        data[comp].total += d.quantity;
      }
    });

    return data;
  }, [currentDayDefects]);

  const displayedDefects = useMemo(() => {
    if (compFilter === 'ALL') return currentDayDefects;
    return currentDayDefects.filter((d) => d.componentCode === compFilter);
  }, [currentDayDefects, compFilter]);

  // Today's Lot QC Failures from Accepted Inbound Deliveries
  const dayLotFails = useMemo(() => {
    const data: Record<ComponentCode, number> = { AA: 0, BB: 0, CC: 0 };
    const dayInsps = inspections.filter(
      (insp) => insp.lotReceivedDate === selectedDateStr && insp.finalDecision === 'Accepted'
    );
    dayInsps.forEach((insp) => {
      if (data[insp.componentCode] !== undefined) {
        data[insp.componentCode] += insp.totalDefectCount;
      }
    });
    return data;
  }, [inspections, selectedDateStr]);

  // Derived Main Stock usages (Row 19 = Row 18 - Row 20)
  const mainStockAA = Math.max(0, totalEnteredOutput * 1 - (useSafetyStock ? safetyUsageAA : 0));
  const mainStockBB = Math.max(0, totalEnteredOutput * 1 - (useSafetyStock ? safetyUsageBB : 0));
  const mainStockCC = Math.max(0, totalEnteredOutput * 3 - (useSafetyStock ? safetyUsageCC : 0));

  const handleSaveProduction = (e: React.FormEvent) => {
    e.preventDefault();
    const outputs: DailyModelOutput[] = PRODUCTION_MODELS.map((m) => ({
      model: m.code,
      quantity: Number(modelOutputs[m.code]) || 0,
    }));

    recordDailyProduction(selectedDateStr, outputs, {
      used: useSafetyStock,
      AA: useSafetyStock ? Number(safetyUsageAA) || 0 : 0,
      BB: useSafetyStock ? Number(safetyUsageBB) || 0 : 0,
      CC: useSafetyStock ? Number(safetyUsageCC) || 0 : 0,
    });

    addNotification({
      title: 'Production Log Saved',
      message: `Production records for ${selectedDateStr} (Total: ${totalEnteredOutput} units) have been saved and dispatched to MRP.`,
      type: 'info',
    });
  };

  const handleConfirmDay = (e: React.FormEvent) => {
    e.preventDefault();
    const outputs: DailyModelOutput[] = PRODUCTION_MODELS.map((m) => ({
      model: m.code,
      quantity: Number(modelOutputs[m.code]) || 0,
    }));

    recordDailyProduction(selectedDateStr, outputs, {
      used: useSafetyStock,
      AA: useSafetyStock ? Number(safetyUsageAA) || 0 : 0,
      BB: useSafetyStock ? Number(safetyUsageBB) || 0 : 0,
      CC: useSafetyStock ? Number(safetyUsageCC) || 0 : 0,
    });

    confirmProductionDay(selectedDateStr, confirmNotes);
    setConfirmNotes('');
    addNotification({
      title: 'Day Confirmed & Transferred to MRP',
      message: `Day ${currentDay} production (${totalEnteredOutput} units) and defect totals confirmed. Transferred to Actual MRP.`,
      type: 'info',
    });
  };

  const handleAddDefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (defectQty <= 0) return;
    addDefectEvent(selectedDateStr, defectComp, defectReason, defectQty, defectNotes, defectCategory);
    setDefectQty(1);
    setDefectNotes('');
    addNotification({
      title: 'Production Defect Logged',
      message: `Logged +${defectQty} ${defectComp} defect (${defectCategory}: ${defectReason}).`,
      type: 'warning',
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-800">
              Daily Production & Defect Logging
            </h2>
            <Badge variant="outline" className="hidden sm:inline-flex bg-blue-50 text-blue-700 border-blue-200 text-xs">
              Operational Input Screen
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record actual model assembly and floor defect events. Actual MRP automatically derives component usages (AA×1, BB×1, CC×3) and quality loss rows.
          </p>
        </div>

        {/* Day Selector Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector />
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-lg text-xs shadow-xs">
            <Calendar className="w-4 h-4 text-blue-600 ml-1.5" />
            <span className="text-slate-500 font-medium hidden xs:inline">Select Operating Day:</span>
            <select
              value={currentDay}
              onChange={(e) => setCurrentDay(Number(e.target.value))}
              className="bg-slate-50 text-slate-800 font-bold px-2 py-1 rounded-md border border-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d} ({currentMonth}-{String(d).padStart(2, '0')})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Selected Day Status Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
              Today's Planned Output
            </span>
            <span className="text-2xl font-black text-slate-700 value-mono mt-0.5 block">
              {plannedTodayOutput.toLocaleString()} units
            </span>
            <span className="text-[10px] text-slate-400">Baseline forecast target</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[10px] text-blue-600 block font-bold uppercase tracking-wider">
              Day {currentDay} Actual Output
            </span>
            <span className="text-2xl font-black text-blue-700 value-mono mt-0.5 block">
              {currentRecord ? `${currentRecord.totalFinalProduction.toLocaleString()} units` : 'Not Logged'}
            </span>
            <span className="text-[10px] text-slate-500">
              {currentRecord ? `Feeds Row 18: AA (${currentRecord.usageAA}), BB (${currentRecord.usageBB}), CC (${currentRecord.usageCC})` : 'Pending entry'}
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[10px] text-amber-600 block font-bold uppercase tracking-wider">
              Safety Stock Used (R20)
            </span>
            <div className="text-sm value-mono font-bold text-slate-800 mt-1 space-x-2">
              <span>AA: {useSafetyStock ? safetyUsageAA : 0}</span>
              <span>BB: {useSafetyStock ? safetyUsageBB : 0}</span>
              <span>CC: {useSafetyStock ? safetyUsageCC : 0}</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {useSafetyStock ? 'Buffer reserve deployed' : 'No safety stock utilized'}
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
              Supervisor EOD Status
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              {isConfirmed ? (
                <span className="status-pill status-safe font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>EOD Confirmed</span>
                </span>
              ) : (
                <span className="status-pill status-warning font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Confirmation</span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">
              {currentConfirmation ? `Signed by ${currentConfirmation.confirmedBy}` : 'Awaiting daily supervisor sign-off'}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Production Entry Form by Model */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Record Actual Model Assembly: {selectedDateStr}</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Input actual finished units assembled per model today.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Today's Planned Target</span>
              <span className="text-xs font-bold text-slate-700 value-mono">{plannedTodayOutput} units (read-only)</span>
            </div>
          </div>

          <form onSubmit={handleSaveProduction} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
              {PRODUCTION_MODELS.map((m) => (
                <div
                  key={m.code}
                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1"
                >
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Model {m.code}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modelOutputs[m.code] ?? 0}
                    onChange={(e) =>
                      setModelOutputs({
                        ...modelOutputs,
                        [m.code]: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-center font-bold text-slate-900 focus:outline-none focus:border-blue-500 text-sm value-mono"
                  />
                  <span className="block text-[10px] text-slate-400 truncate">{m.name}</span>
                </div>
              ))}
            </div>

            {/* Total Finished Production & Automatic Component Multipliers */}
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                <span>Total Actual Production Output:</span>
                <span className="text-blue-700 value-mono text-base font-black">{totalEnteredOutput} units</span>
              </div>
              <div className="text-[11px] text-slate-500 italic">
                * Operational rule: Production staff enters model units only. Component usages populate <strong>Actual MRP Row 18</strong> automatically.
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-blue-200/60">
                <div className="p-1.5 bg-white rounded border border-blue-100">
                  <span className="text-slate-500 text-[10px] block font-medium">AA (×1 Multiplier)</span>
                  <strong className="value-mono text-slate-800 text-sm block">{totalEnteredOutput * 1}</strong>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Main: <strong className="font-mono text-slate-800">{mainStockAA}</strong> | SS: <strong className="font-mono text-amber-700">{useSafetyStock ? safetyUsageAA : 0}</strong>
                  </span>
                </div>
                <div className="p-1.5 bg-white rounded border border-blue-100">
                  <span className="text-slate-500 text-[10px] block font-medium">BB (×1 Multiplier)</span>
                  <strong className="value-mono text-slate-800 text-sm block">{totalEnteredOutput * 1}</strong>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Main: <strong className="font-mono text-slate-800">{mainStockBB}</strong> | SS: <strong className="font-mono text-amber-700">{useSafetyStock ? safetyUsageBB : 0}</strong>
                  </span>
                </div>
                <div className="p-1.5 bg-white rounded border border-blue-100">
                  <span className="text-slate-500 text-[10px] block font-medium">CC (×3 Multiplier)</span>
                  <strong className="value-mono text-amber-700 text-sm font-bold block">{totalEnteredOutput * 3}</strong>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Main: <strong className="font-mono text-slate-800">{mainStockCC}</strong> | SS: <strong className="font-mono text-amber-700">{useSafetyStock ? safetyUsageCC : 0}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Safety Stock Usage Small Input Section */}
            <div className="p-3 bg-amber-50/40 rounded-lg border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>🛡️ Was Safety Stock Used Today?</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="useSafetyStock"
                      checked={!useSafetyStock}
                      onChange={() => setUseSafetyStock(false)}
                      className="text-amber-600"
                    />
                    <span>No</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="useSafetyStock"
                      checked={useSafetyStock}
                      onChange={() => setUseSafetyStock(true)}
                      className="text-amber-600"
                    />
                    <span>Yes</span>
                  </label>
                </div>
              </div>

              {useSafetyStock && (
                <div className="pt-2 border-t border-amber-200/60 space-y-2 animate-in fade-in duration-150">
                  <p className="text-[10px] text-amber-800">
                    Specify safety stock quantities drawn for production today. These populate <strong>Actual MRP Row 20 (From Safety Stock)</strong> for each component.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-slate-700">
                        AA - Outer Tub
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={safetyUsageAA}
                        onChange={(e) => setSafetyUsageAA(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs text-center font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-slate-700">
                        BB - Inner Tub
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={safetyUsageBB}
                        onChange={(e) => setSafetyUsageBB(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs text-center font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-semibold text-slate-700">
                        CC - Ridgeform
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={safetyUsageCC}
                        onChange={(e) => setSafetyUsageCC(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs text-center font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Save Production & Dispatch to MRP
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Defect Logger & EOD Sign-off */}
        <div className="lg:col-span-6 space-y-4">
          {/* Defect Event Logger Form */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Log Production Defect Event</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Record scrap events as they happen on the shop floor.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddDefect} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Component *
                  </label>
                  <select
                    value={defectComp}
                    onChange={(e) => {
                      const code = e.target.value as ComponentCode;
                      setDefectComp(code);
                      setDefectReason(COMPONENT_DEFECT_REASONS?.[code]?.[0] || '');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="AA">AA (Outer Tub)</option>
                    <option value="BB">BB (Inner Tub)</option>
                    <option value="CC">CC (Ridgeform)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Defect Area *
                  </label>
                  <select
                    value={defectCategory}
                    onChange={(e) => setDefectCategory(e.target.value as DefectSourceCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="Warehouse Defect">🏬 Warehouse (R29)</option>
                    <option value="Assembly Defect">🏭 Assembly (R30)</option>
                    <option value="Safety Stock Defect">🛡️ Safety Stock (R31)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={defectQty}
                    onChange={(e) => setDefectQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-900 font-bold text-center focus:outline-none focus:border-amber-500 value-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Logged By
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.name || 'System'}
                    className="w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Defect Reason ({defectComp}) *
                </label>
                <select
                  value={defectReason}
                  onChange={(e) => setDefectReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  {(COMPONENT_DEFECT_REASONS?.[defectComp] || []).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={defectNotes}
                  onChange={(e) => setDefectNotes(e.target.value)}
                  placeholder="Optional notes: station, machine tool number, cause..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Save Defect Event (+{defectQty} {defectComp})</span>
              </button>
            </form>
          </div>

          {/* Supervisor End-of-Day Confirmation Card with Exact Summary */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Daily End-of-Day (EOD) Confirmation: {selectedDateStr}</span>
              </h3>
              {isConfirmed && (
                <span className="status-pill status-safe font-bold">
                  Confirmed
                </span>
              )}
            </div>

            {/* EOD Summary Breakdown Table */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center font-bold text-slate-800 pb-1.5 border-b border-slate-200">
                <span>Total Finished Production Output:</span>
                <span className="value-mono font-black text-blue-700">{totalEnteredOutput} units</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Quality Fails Breakdown (Transfers to Row 27)</span>
                  <span className="text-slate-400 font-normal">Lot QC + Wh + Assy + SS</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-1.5 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-900 block">AA - Outer Tub</span>
                    <span className="text-slate-500 block text-[9px] mt-0.5">
                      Lot QC: {dayLotFails.AA} | Wh: {defectBreakdown.AA.warehouse} | Assy: {defectBreakdown.AA.assembly} | SS: {defectBreakdown.AA.safetyStock}
                    </span>
                    <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-medium">Row 27 Total:</span>
                      <strong className="text-rose-600 value-mono font-bold text-xs">{dayLotFails.AA + defectBreakdown.AA.total}</strong>
                    </div>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-900 block">BB - Inner Tub</span>
                    <span className="text-slate-500 block text-[9px] mt-0.5">
                      Lot QC: {dayLotFails.BB} | Wh: {defectBreakdown.BB.warehouse} | Assy: {defectBreakdown.BB.assembly} | SS: {defectBreakdown.BB.safetyStock}
                    </span>
                    <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-medium">Row 27 Total:</span>
                      <strong className="text-rose-600 value-mono font-bold text-xs">{dayLotFails.BB + defectBreakdown.BB.total}</strong>
                    </div>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-slate-200">
                    <span className="font-bold text-slate-900 block">CC - Ridgeform</span>
                    <span className="text-slate-500 block text-[9px] mt-0.5">
                      Lot QC: {dayLotFails.CC} | Wh: {defectBreakdown.CC.warehouse} | Assy: {defectBreakdown.CC.assembly} | SS: {defectBreakdown.CC.safetyStock}
                    </span>
                    <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-medium">Row 27 Total:</span>
                      <strong className="text-rose-600 value-mono font-bold text-xs">{dayLotFails.CC + defectBreakdown.CC.total}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isSupervisor && !isConfirmed ? (
              <form onSubmit={handleConfirmDay} className="space-y-2 pt-1">
                <input
                  type="text"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="Supervisor remarks for official daily sign-off..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Day & Transfer to Actual MRP</span>
                </button>
              </form>
            ) : isConfirmed ? (
              <div className="p-2.5 bg-green-50 rounded-md border border-green-200 text-xs text-green-800">
                ✓ Day {currentDay} confirmed by <strong>{currentConfirmation?.confirmedBy}</strong> at{' '}
                {currentConfirmation?.confirmedAt
                  ? new Date(currentConfirmation.confirmedAt).toLocaleTimeString()
                  : 'EOD'}
                . Values are active in Actual MRP.
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-500">
                Switch role to Supervisor or Admin to sign-off and confirm the production day.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Defect Events Ledger for Selected Day */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Defect Events for {selectedDateStr} ({currentDayDefects.length} logged)
            </span>
            <span className="text-[11px] text-slate-500">
              • Total Today: <strong className="text-red-600 value-mono font-bold">{currentDayDefects.reduce((sum, d) => sum + d.quantity, 0)} scrap units</strong>
            </span>
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-md text-xs">
            <span className="text-[10px] text-slate-400 font-semibold px-1.5 uppercase">Filter:</span>
            {(['ALL', 'AA', 'BB', 'CC'] as const).map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => setCompFilter(filterKey)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  compFilter === filterKey
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filterKey === 'ALL'
                  ? `All (${currentDayDefects.length})`
                  : `${filterKey} (${currentDayDefects.filter((d) => d.componentCode === filterKey).length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="mrp-table w-full">
            <thead>
              <tr>
                <th className="row-label">Time</th>
                <th>Component</th>
                <th>Category</th>
                <th className="text-center">Defect Count</th>
                <th>Defect Reason</th>
                <th>Logged By</th>
                <th>Notes</th>
                <th>Status</th>
                <th className="pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedDefects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400">
                    {currentDayDefects.length === 0
                      ? 'No defect events logged for this date. Use the form above to add defect events throughout the shift.'
                      : `No defect events found for component ${compFilter}.`}
                  </td>
                </tr>
              ) : (
                displayedDefects.map((def) => (
                  <tr key={def.id} className="hover:bg-slate-50 text-slate-700">
                    <td className="row-label value-mono text-slate-600">{def.timestamp}</td>
                    <td className="font-semibold text-slate-800">
                      <span className="status-pill status-safe font-bold">
                        {def.componentCode}
                      </span>
                    </td>
                    <td className="text-slate-600">
                      <Badge variant="outline" className={`text-[10px] ${
                        def.sourceCategory === 'Warehouse Defect' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        def.sourceCategory === 'Safety Stock Defect' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {def.sourceCategory || 'Assembly Defect'}
                      </Badge>
                    </td>
                    <td className="text-center value-mono font-bold text-red-600">
                      +{def.quantity}
                    </td>
                    <td className="font-medium text-slate-800">{def.defectReason}</td>
                    <td className="text-slate-600">{def.enteredBy}</td>
                    <td className="text-slate-500">{def.notes || '—'}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          def.status === 'Confirmed'
                            ? 'status-safe font-bold'
                            : 'status-warning font-semibold'
                        }`}
                      >
                        {def.status}
                      </span>
                    </td>
                    <td className="pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          deleteDefectEvent(def.id);
                          addNotification({
                            title: 'Defect Removed',
                            message: `Deleted ${def.quantity}x ${def.componentCode} defect log.`,
                            type: 'warning',
                          });
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors inline-flex items-center"
                        title="Delete defect record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
