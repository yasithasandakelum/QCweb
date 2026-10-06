import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Box,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Layers,
  PackageCheck,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ComponentCode, PlannedMRPRow } from '../../types';
import { AUGUST_2026_PLANNED_OUTPUTS } from '../../data/seedData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PeriodSelector } from '../common/PeriodSelector';

interface MonthlyPlanningSetupViewProps {
  onNavigate?: (tab: string) => void;
}

export const MonthlyPlanningSetupView: React.FC<MonthlyPlanningSetupViewProps> = ({ onNavigate }) => {
  const {
    currentMonth,
    monthlyPlans,
    activeComponent,
    setActiveComponent,
    systemConfig,
    plannedOutputs,
    updateAllPlannedOutputs,
    openingInventory,
    updateOpeningInventory,
    manualPlannedDeliveries,
    updateAllManualPlannedDeliveries,
    addNotification,
  } = useApp();

  // Active plan & data
  const plan = monthlyPlans?.[currentMonth];
  const plannedRows: PlannedMRPRow[] = plan?.plannedRows?.[activeComponent] || [];
  const compConfig = systemConfig?.components?.[activeComponent] || {
    code: activeComponent,
    name: activeComponent === 'AA' ? 'Outer Tub' : activeComponent === 'BB' ? 'Inner Tub' : 'Ridgeform',
    usageMultiplier: activeComponent === 'CC' ? 3 : 1,
    minDeliveryQty: activeComponent === 'AA' ? 150 : activeComponent === 'CC' ? 250 : null,
    maxDeliveryQty: activeComponent === 'AA' ? 300 : activeComponent === 'BB' ? 160 : 560,
    normalStockMin: activeComponent === 'BB' ? 500 : 1500,
    normalStockMax: activeComponent === 'BB' ? 640 : 2000,
    isMinConfirmed: activeComponent !== 'BB',
  };

  // Local state for editable Beginning of Month inputs
  const [localOpeningInv, setLocalOpeningInv] = useState<Record<ComponentCode, number>>({
    AA: openingInventory?.AA ?? 500,
    BB: openingInventory?.BB ?? 500,
    CC: openingInventory?.CC ?? 500,
  });

  // Local state for 31-day planned outputs
  const [localOutputs, setLocalOutputs] = useState<number[]>([...plannedOutputs]);

  // Bulk fill tool state
  const [flatFillValue, setFlatFillValue] = useState<string>('180');
  const [activeStepTab, setActiveStepTab] = useState<'all' | 'baseline' | 'schedule' | 'deliveries'>('all');

  // Delivery plan component tab
  const [deliveryTabComp, setDeliveryTabComp] = useState<ComponentCode>('BB');
  const [tempBBDeliveries, setTempBBDeliveries] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    const bbRows = plan?.plannedRows?.BB || [];
    bbRows.forEach((r) => {
      map[r.day] = manualPlannedDeliveries?.BB?.[r.day] ?? r.supplierDeliveryPlan ?? 0;
    });
    return map;
  });

  // KPI Calculations
  const totalPlannedOutput = localOutputs.reduce((sum, v) => sum + (Number(v) || 0), 0);
  const avgDailyOutput = Math.round(totalPlannedOutput / 31);
  const totalUsageAA = totalPlannedOutput * 1;
  const totalUsageBB = totalPlannedOutput * 1;
  const totalUsageCC = totalPlannedOutput * 3;

  // Day of week calculator for August 2026 (Aug 1, 2026 was Saturday)
  const getWeekdayName = (day: number) => {
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days[(day - 1) % 7];
  };

  const isWeekend = (day: number) => {
    const name = getWeekdayName(day);
    return name === 'Sat' || name === 'Sun';
  };

  // Bulk Fill Handlers
  const handleApplyFlatFill = () => {
    const val = parseInt(flatFillValue, 10);
    if (!isNaN(val) && val >= 0) {
      setLocalOutputs(new Array(31).fill(val));
      addNotification({
        title: 'Schedule Updated',
        message: `Set all 31 days to uniform target of ${val} units.`,
        type: 'info',
      });
    }
  };

  const handleApplyWorkweekPreset = () => {
    const newArr = Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      return isWeekend(day) ? 0 : 200;
    });
    setLocalOutputs(newArr);
    addNotification({
      title: 'Workweek Schedule Applied',
      message: 'Applied 5-Day workweek schedule: Mon-Fri = 200 units, Weekends = 0 units.',
      type: 'info',
    });
  };

  const handleApplyRampUpPreset = () => {
    const newArr = Array.from({ length: 31 }, (_, i) => {
      const step = Math.round(140 + (i / 30) * 80);
      return step;
    });
    setLocalOutputs(newArr);
    addNotification({
      title: 'Ramp-Up Curve Applied',
      message: 'Applied production ramp-up: Scaling from 140 to 220 units across the month.',
      type: 'info',
    });
  };

  const handleResetToWorkbookBaseline = () => {
    setLocalOutputs([...AUGUST_2026_PLANNED_OUTPUTS]);
    setLocalOpeningInv({ AA: 500, BB: 500, CC: 500 });
    addNotification({
      title: 'Baseline Restored',
      message: 'Reset monthly planned outputs and opening inventories to August 2026 master workbook values.',
      type: 'info',
    });
  };

  const handleAdjustPercent = (factor: number) => {
    setLocalOutputs((prev) =>
      prev.map((v) => Math.max(0, Math.round(v * factor)))
    );
  };

  // BB Delivery Auto-fill 160 batches
  const handleAutoFillBB160s = () => {
    const newDeliveries: Record<number, number> = {};
    let cumReq = 0;
    const bbRows = plan?.plannedRows?.BB || [];
    bbRows.forEach((r) => {
      cumReq += r.requiredReceiving;
      if (cumReq >= 160 || (r.shortage > 0 && cumReq > 0)) {
        const batchLots = Math.ceil(cumReq / 160) * 160;
        newDeliveries[r.day] = batchLots;
        cumReq = 0;
      } else {
        newDeliveries[r.day] = 0;
      }
    });
    setTempBBDeliveries(newDeliveries);
    addNotification({
      title: 'BB Delivery Plan Generated',
      message: 'Auto-consolidated Component BB deliveries into standard 160-unit full lorry batches.',
      type: 'info',
    });
  };

  // Master Save Handler
  const handleSaveAllPlanningData = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Save Opening Inventory for all 3 components
    updateOpeningInventory('AA', localOpeningInv.AA);
    updateOpeningInventory('BB', localOpeningInv.BB);
    updateOpeningInventory('CC', localOpeningInv.CC);

    // 2. Save 31-day planned output schedule
    updateAllPlannedOutputs(localOutputs);

    // 3. Save BB manual delivery plan
    updateAllManualPlannedDeliveries('BB', tempBBDeliveries);

    addNotification({
      title: 'Planned MRP Recalculated',
      message: `Successfully saved monthly planning parameters for ${currentMonth}. Planned MRP Rows 1–17 updated across AA, BB, and CC.`,
      type: 'info',
    });
  };

  // Max value in outputs for visual mini-chart
  const maxOutput = Math.max(...localOutputs, 1);

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-800">
              Monthly Planning Setup & Input
            </h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              Manual Planned Inputs
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure the two manual inputs that govern the <strong>Planned MRP</strong> baseline: (1) Beginning-of-Month Opening Inventory &amp; Safety Stock, and (2) Daily Finished Production Schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector />
          {onNavigate && (
            <button
              onClick={() => onNavigate('mrp-monthly-plan')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              <span>View Planned MRP Table (17 Rows)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Monthly KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
              Total Planned Output
            </span>
            <span className="text-2xl font-black text-blue-700 value-mono mt-0.5 block">
              {totalPlannedOutput.toLocaleString()} units
            </span>
            <span className="text-[10px] text-slate-500">
              Avg: <strong>{avgDailyOutput} units/day</strong> across 31 days
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
              BOM Component Usages
            </span>
            <div className="text-xs value-mono font-bold text-slate-700 mt-1 flex flex-wrap gap-2">
              <span>AA: {totalUsageAA.toLocaleString()}</span>
              <span>BB: {totalUsageBB.toLocaleString()}</span>
              <span className="text-amber-700 font-black">CC: {totalUsageCC.toLocaleString()} (×3)</span>
            </div>
            <span className="text-[10px] text-slate-400">Total monthly component consumption</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
              Beginning Stock (Day 1)
            </span>
            <div className="text-xs value-mono font-bold text-slate-800 mt-1 flex gap-2">
              <span>AA: {localOpeningInv.AA}</span>
              <span>BB: {localOpeningInv.BB}</span>
              <span>CC: {localOpeningInv.CC}</span>
            </div>
            <span className="text-[10px] text-slate-500">Day 1 starting warehouse stock</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs bg-slate-900 text-white">
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                Planned MRP Status
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-300">Active Baseline Master</span>
              </div>
            </div>
            <button
              onClick={() => handleSaveAllPlanningData()}
              className="mt-2 w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save &amp; Recalculate MRP</span>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: Beginning of Month (BOM) Baseline Parameters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h3 className="text-sm font-bold text-slate-800">
                Beginning of the Month Parameters (Day 1 Starting State)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-8">
              Set Day 1 Beginning Inventory and verify safety stock targets for each component before month kickoff.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocalOpeningInv({ AA: 500, BB: 500, CC: 500 })}
            className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All to 500 Units</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Component AA */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <strong className="text-xs font-bold text-slate-800 block">Component AA</strong>
                <span className="text-[11px] text-slate-500">Outer Tub (×1 BOM)</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white text-blue-700 border-blue-200">
                Batch: 150 – 300
              </Badge>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 block uppercase">
                Opening Inventory (Day 1)
              </label>
              <input
                type="number"
                min="0"
                value={localOpeningInv.AA}
                onChange={(e) =>
                  setLocalOpeningInv({ ...localOpeningInv, AA: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-bold text-slate-800 value-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
              <div className="flex justify-between">
                <span>Safety Stock Target:</span>
                <strong className="value-mono font-semibold text-slate-700">50 units</strong>
              </div>
              <div className="flex justify-between">
                <span>Normal Warehouse Buffer:</span>
                <span className="value-mono text-slate-600">1,500 – 2,000</span>
              </div>
            </div>
          </div>

          {/* Component BB */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <strong className="text-xs font-bold text-slate-800 block">Component BB</strong>
                <span className="text-[11px] text-slate-500">Inner Tub (×1 BOM)</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white text-amber-700 border-amber-200">
                Fixed Batch: 160
              </Badge>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 block uppercase">
                Opening Inventory (Day 1)
              </label>
              <input
                type="number"
                min="0"
                value={localOpeningInv.BB}
                onChange={(e) =>
                  setLocalOpeningInv({ ...localOpeningInv, BB: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-bold text-slate-800 value-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
              <div className="flex justify-between">
                <span>Safety Stock Target:</span>
                <strong className="value-mono font-semibold text-slate-700">50 units</strong>
              </div>
              <div className="flex justify-between">
                <span>Normal Warehouse Buffer:</span>
                <span className="value-mono text-slate-600">500 – 640</span>
              </div>
            </div>
          </div>

          {/* Component CC */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <strong className="text-xs font-bold text-slate-800 block">Component CC</strong>
                <span className="text-[11px] text-slate-500">Ridgeform (×3 BOM)</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white text-purple-700 border-purple-200">
                Batch: 250 – 560
              </Badge>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 block uppercase">
                Opening Inventory (Day 1)
              </label>
              <input
                type="number"
                min="0"
                value={localOpeningInv.CC}
                onChange={(e) =>
                  setLocalOpeningInv({ ...localOpeningInv, CC: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-bold text-slate-800 value-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
              <div className="flex justify-between">
                <span>Safety Stock Target:</span>
                <strong className="value-mono font-semibold text-slate-700">50 units</strong>
              </div>
              <div className="flex justify-between">
                <span>Normal Warehouse Buffer:</span>
                <span className="value-mono text-slate-600">1,500 – 2,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Cascaded Monthly Planned Production Schedule */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-800">
                Monthly Planned Production Schedule (Days 1 – 31)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-8">
              Daily target units assembled across all product models. Component requirements automatically derive as AA×1, BB×1, and CC×3.
            </p>
          </div>

          {/* Quick presets & toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleApplyWorkweekPreset}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition-colors"
            >
              5-Day Workweek
            </button>
            <button
              type="button"
              onClick={handleApplyRampUpPreset}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition-colors"
            >
              Ramp-Up Curve
            </button>
            <button
              type="button"
              onClick={handleResetToWorkbookBaseline}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Workbook Baseline</span>
            </button>
          </div>
        </div>

        {/* Bulk Uniform Fill Bar */}
        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">Quick Uniform Fill:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={flatFillValue}
                onChange={(e) => setFlatFillValue(e.target.value)}
                className="w-20 bg-white border border-blue-300 rounded px-2 py-1 text-xs font-bold text-center value-mono"
              />
              <span className="text-xs text-slate-500">units/day</span>
            </div>
            <button
              type="button"
              onClick={handleApplyFlatFill}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-2xs transition-colors"
            >
              Apply to All 31 Days
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Batch Scale:</span>
            <button
              type="button"
              onClick={() => handleAdjustPercent(1.1)}
              className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 rounded text-slate-700 font-bold"
            >
              +10%
            </button>
            <button
              type="button"
              onClick={() => handleAdjustPercent(0.9)}
              className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 rounded text-slate-700 font-bold"
            >
              -10%
            </button>
          </div>
        </div>

        {/* Visual Mini-Chart of Production Profile */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
            <span>Monthly Production Target Curve (Days 1 – 31)</span>
            <span className="value-mono">Peak: {maxOutput} units | Avg: {avgDailyOutput} units</span>
          </div>
          <div className="h-16 bg-slate-50 border border-slate-200 rounded-md p-2 flex items-end gap-1 overflow-x-auto">
            {localOutputs.map((qty, idx) => {
              const day = idx + 1;
              const hPct = Math.max(8, Math.min(100, Math.round((qty / maxOutput) * 100)));
              const weekend = isWeekend(day);
              return (
                <div
                  key={day}
                  className="flex-1 min-w-[8px] flex flex-col items-center justify-end h-full group relative"
                  title={`Day ${day} (${getWeekdayName(day)}): ${qty} units`}
                >
                  <div
                    className={`w-full rounded-xs transition-all ${
                      weekend ? 'bg-amber-400 group-hover:bg-amber-500' : 'bg-blue-600 group-hover:bg-blue-700'
                    }`}
                    style={{ height: `${hPct}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 31-Day Input Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {localOutputs.map((qty, idx) => {
            const day = idx + 1;
            const weekday = getWeekdayName(day);
            const weekend = isWeekend(day);
            return (
              <div
                key={day}
                className={`p-2 rounded-lg border text-center transition-all ${
                  weekend
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-1">
                  <span>Day {String(day).padStart(2, '0')}</span>
                  <span className={weekend ? 'text-amber-700' : 'text-slate-400'}>{weekday}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={qty}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    const updated = [...localOutputs];
                    updated[idx] = val;
                    setLocalOutputs(updated);
                  }}
                  className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-center font-bold text-xs value-mono focus:outline-none focus:border-blue-500"
                />
                <div className="text-[9px] text-slate-400 mt-1 flex justify-center gap-1 font-mono">
                  <span>AA:{qty}</span>
                  <span>CC:{qty * 3}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Cascaded Component Inbound Delivery Planning */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                3
              </span>
              <h3 className="text-sm font-bold text-slate-800">
                Supplier Delivery Schedule &amp; Inbound Batches
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-8">
              Component BB uses manual scheduled deliveries (160-unit standard lorry loads), while AA and CC auto-consolidate according to supplier min/max rules.
            </p>
          </div>

          {/* Component Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            {(['AA', 'BB', 'CC'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setDeliveryTabComp(code)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  deliveryTabComp === code
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {code} {code === 'BB' && '★ (Manual 160s)'}
              </button>
            ))}
          </div>
        </div>

        {deliveryTabComp === 'BB' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-xs text-emerald-900">
                <strong>Component BB Fixed Batch Rule:</strong> Delivery batch size is strictly fixed at <strong>160 units (1 full lorry load)</strong>. Deliveries can only be scheduled in exact 160 lots (e.g. Day 2: 160, Day 8: 160).
              </div>
              <button
                type="button"
                onClick={handleAutoFillBB160s}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Schedule 160 Lots</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const currentVal = tempBBDeliveries[day] ?? 0;
                const lorryCount = Math.round(currentVal / 160);
                return (
                  <div
                    key={day}
                    className={`p-2 rounded-lg border text-center transition-colors ${
                      currentVal > 0
                        ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">
                      Day {String(day).padStart(2, '0')}
                    </span>

                    {/* Fixed 160 Lorry Batch Selector - No arbitrary number entry */}
                    <div className="space-y-1">
                      <select
                        value={lorryCount}
                        onChange={(e) => {
                          const lorries = parseInt(e.target.value, 10) || 0;
                          setTempBBDeliveries({
                            ...tempBBDeliveries,
                            [day]: lorries * 160,
                          });
                        }}
                        className={`w-full text-center font-bold text-xs value-mono rounded py-1 px-1 border focus:outline-none ${
                          currentVal > 0
                            ? 'bg-white border-emerald-400 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        <option value={0}>0 (None)</option>
                        <option value={1}>160 (1 Lorry)</option>
                        <option value={2}>320 (2 Lorries)</option>
                        <option value={3}>480 (3 Lorries)</option>
                      </select>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        {currentVal > 0 ? `${currentVal} units (fixed)` : 'No Delivery'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <strong className="text-xs text-slate-800">
                Automated Supplier Delivery Plan for {deliveryTabComp}
              </strong>
            </div>
            <p className="text-xs text-slate-500">
              For Component {deliveryTabComp}, the Planned MRP engine automatically calculates the supplier delivery plan by consolidating daily net requirements against supplier batch constraints:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-bold">Minimum Batch</span>
                <strong className="value-mono text-slate-800">
                  {deliveryTabComp === 'AA' ? '150 units' : '250 units'}
                </strong>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-bold">Maximum Lorry Batch</span>
                <strong className="value-mono text-slate-800">
                  {deliveryTabComp === 'AA' ? '300 units' : '560 units'}
                </strong>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-400 text-[10px] block font-bold">Planned Storage Range</span>
                <strong className="value-mono text-slate-800">1,500 – 2,000 units</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MASTER ACTION & FINAL RECALCULATE BAR */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            Saving these inputs immediately updates <strong>Planned MRP Rows 1–17</strong> and recalculates inventory projections, reorder triggers, and supplier order quantities across all components.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleResetToWorkbookBaseline}
            className="flex-1 sm:flex-none px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md transition-colors"
          >
            Reset All
          </button>
          <button
            type="button"
            onClick={() => handleSaveAllPlanningData()}
            className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save &amp; Recalculate Planned MRP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
