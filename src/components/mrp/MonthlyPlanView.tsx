import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  Edit2,
  Edit3,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateLorryCount } from '../../services/deliveryEngine';
import { ComponentCode, PlannedMRPRow } from '../../types';
import { AUGUST_2026_PLANNED_OUTPUTS } from '../../data/seedData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PeriodSelector } from '../common/PeriodSelector';

interface MonthlyPlanViewProps {
  onNavigate?: (tab: string) => void;
}

export const MonthlyPlanView: React.FC<MonthlyPlanViewProps> = ({ onNavigate }) => {
  const {
    monthlyPlans,
    currentMonth,
    activeComponent,
    setActiveComponent,
    systemConfig,
    plannedOutputs,
    updateAllPlannedOutputs,
    openingInventory,
    updateOpeningInventory,
    manualPlannedDeliveries,
    updateManualPlannedDelivery,
    updateAllManualPlannedDeliveries,
  } = useApp();

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

  // Modals state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showBBDeliveryModal, setShowBBDeliveryModal] = useState(false);
  const [showLogicGuideModal, setShowLogicGuideModal] = useState(false);

  // Edit production schedule modal state
  const [tempOutputs, setTempOutputs] = useState<number[]>(plannedOutputs);
  const [batchValue, setBatchValue] = useState<string>('70');
  const [openingInvEdit, setOpeningInvEdit] = useState<string>(
    String(openingInventory?.[activeComponent] ?? 500)
  );

  // Edit BB delivery modal state
  const [tempBBDeliveries, setTempBBDeliveries] = useState<Record<number, number>>({});

  // KPI Calculations
  const totalPlannedOutput = plannedOutputs.reduce((sum, v) => sum + v, 0);
  const totalPlannedUsage = plannedRows.reduce((sum, r) => sum + r.plannedUsage, 0);
  const totalPlannedDelivery = plannedRows.reduce((sum, r) => sum + r.supplierDeliveryPlan, 0);
  const totalOrdersCount = plannedRows.filter((r) => r.supplierDeliveryPlan > 0).length;
  const totalLorries = plannedRows.reduce(
    (sum, r) => sum + calculateLorryCount(r.supplierDeliveryPlan, compConfig.maxDeliveryQty),
    0
  );
  const shortageDaysCount = plannedRows.filter((r) => r.shortage > 0).length;
  const storageWarningDaysCount = plannedRows.filter((r) => r.storageWarning).length;

  const normalStockRef = compConfig.normalStockMax || (activeComponent === 'BB' ? 640 : 2000);

  // Production schedule handlers
  const handleOpenScheduleModal = () => {
    setTempOutputs([...plannedOutputs]);
    setOpeningInvEdit(String(openingInventory?.[activeComponent] ?? 500));
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    updateAllPlannedOutputs(tempOutputs);
    const parsedOpening = parseInt(openingInvEdit, 10);
    if (!isNaN(parsedOpening) && parsedOpening >= 0) {
      updateOpeningInventory(activeComponent, parsedOpening);
    }
    setShowScheduleModal(false);
  };

  const handleBatchFill = () => {
    const val = parseInt(batchValue, 10);
    if (!isNaN(val) && val >= 0) {
      setTempOutputs(new Array(31).fill(val));
    }
  };

  const handleResetToBaseline = () => {
    setTempOutputs([...AUGUST_2026_PLANNED_OUTPUTS]);
    setOpeningInvEdit('500');
  };

  // BB Delivery Modal handlers
  const handleOpenBBDeliveryModal = () => {
    const currentBBMap: Record<number, number> = {};
    plannedRows.forEach((r) => {
      currentBBMap[r.day] = manualPlannedDeliveries?.BB?.[r.day] ?? r.supplierDeliveryPlan ?? 0;
    });
    setTempBBDeliveries(currentBBMap);
    setShowBBDeliveryModal(true);
  };

  const handleSaveBBDeliveries = (e: React.FormEvent) => {
    e.preventDefault();
    updateAllManualPlannedDeliveries('BB', tempBBDeliveries);
    setShowBBDeliveryModal(false);
  };

  const handleAutoFillBB160s = () => {
    const newDeliveries: Record<number, number> = {};
    let cumReq = 0;
    plannedRows.forEach((r) => {
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
  };

  const handleClearBBDeliveries = () => {
    const cleared: Record<number, number> = {};
    plannedRows.forEach((r) => {
      cleared[r.day] = 0;
    });
    setTempBBDeliveries(cleared);
  };

  // Single BB Day quick toggle: cycles 0 -> 160 (1 lorry) -> 320 (2 lorries) -> 0
  const handleToggleBBLorry = (day: number, currentVal: number) => {
    if (activeComponent !== 'BB') return;
    let nextVal = 160;
    if (currentVal === 160) nextVal = 320;
    else if (currentVal >= 320) nextVal = 0;
    else if (currentVal > 0) nextVal = 160;
    updateManualPlannedDelivery('BB', day, nextVal);
  };

  // CSV Export for authoritative Planned MRP
  const exportCSV = () => {
    const headers = [
      'Day',
      'Date',
      'Row 1: Planned Finished Production',
      'Row 2: Planned Beginning Inventory',
      'Row 3: Planned Safety Stock',
      'Row 4: Planned Usage for Day',
      'Row 5: Remaining Inventory After Usage',
      'Row 6: Shortage for Today',
      'Row 7: 3-Day Demand Capacity',
      'Row 8: Required Receiving (Need)',
      'Row 9: Supplier Delivery Plan (Receive)',
      'Row 10: Order Code',
      'Row 12: Planned Ending Inventory',
      'Row 13: Storage Issue Warning',
      'Operational: Lorries Scheduled',
    ];

    const rows = plannedRows.map((r) => [
      r.day,
      r.date,
      r.plannedProduction,
      r.beginningInventory,
      r.safetyStock,
      r.plannedUsage,
      r.remainingInventory,
      r.shortage,
      r.threeDayDemand,
      r.requiredReceiving,
      r.supplierDeliveryPlan,
      r.orderCode,
      r.plannedEndingInventory,
      r.storageIssueText,
      r.lorryCount ?? calculateLorryCount(r.supplierDeliveryPlan, compConfig.maxDeliveryQty),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Authoritative_Planned_MRP_${activeComponent}_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-800">
              Planned MRP Master Schedule & Delivery Matrix
            </h2>
            <Badge variant="outline" className="hidden sm:inline-flex bg-blue-50 text-blue-700 border-blue-200 text-xs">
              Authoritative Logic
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict sequential forward material requirements planning with 3-day demand, minimum batch accumulation, emergency safety trigger, and ending inventory flow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <PeriodSelector />
          {onNavigate && (
            <Button
              onClick={() => onNavigate('mrp-monthly-input')}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs h-8 text-xs font-bold"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Monthly Planning Setup</span>
            </Button>
          )}

          <Button
            onClick={() => setShowLogicGuideModal(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700 hover:border-blue-300 h-8"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden xs:inline">Logic & Rules</span>
            <span className="xs:hidden">Guide</span>
          </Button>

          {activeComponent === 'BB' && (
            <Button
              onClick={handleOpenBBDeliveryModal}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-xs h-8 text-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit BB Plan</span>
            </Button>
          )}

          <Button
            onClick={handleOpenScheduleModal}
            size="sm"
            variant="secondary"
            className="flex items-center gap-1.5 h-8 text-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Production</span>
          </Button>

          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 h-8 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>
      </div>

      {/* Component Tabs Bar with usage rule indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['AA', 'BB', 'CC'] as ComponentCode[]).map((code) => {
            const isActive = activeComponent === code;
            const multiplierLabel = code === 'CC' ? '3×' : '1×';
            const compName = code === 'AA' ? 'Outer Tub' : code === 'BB' ? 'Inner Tub' : 'Ridgeform';
            const ruleNote =
              code === 'AA'
                ? 'Min 150'
                : code === 'BB'
                ? 'Manual'
                : 'Min 250';

            return (
              <Button
                key={code}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveComponent(code)}
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 h-auto text-left shrink-0 ${
                  isActive
                    ? 'shadow-xs font-semibold'
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-bold text-xs">{code}</span>
                    <span className="text-[10px] opacity-80 font-normal">({compName})</span>
                  </div>
                  <div className="text-[9px] font-normal opacity-75 mt-0.5">
                    {multiplierLabel} Multiplier • {ruleNote}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 px-2 py-0.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Baseline Engine ({currentMonth})</span>
          </Badge>
        </div>
      </div>

      {/* Visual Flow Logic Banner */}
      <div className="p-2.5 sm:p-3 bg-gradient-to-r from-slate-50 via-blue-50/50 to-indigo-50/30 border border-blue-200/80 rounded-xl shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-900 text-xs">MRP Flow:</span>
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-600 font-mono flex-wrap">
              <span>Row 2: Beginning</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span>Row 4: Usage ({compConfig.usageMultiplier}×)</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span>Row 5: Remaining</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span>Row 6: Shortage</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span>Row 7: 3-Day Demand</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-blue-700 font-bold">Row 8: Need 🚚❓</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-emerald-700 font-bold">Row 9: Receive 🚚✅</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-indigo-700 font-bold">Row 12: Ending 📦</span>
            </div>
            <div className="lg:hidden text-[11px] text-slate-600">
              Need (R8) → Receive (R9) → Ending Stock (R12)
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="bg-white text-slate-700 text-[10px] border-slate-300">
              Safety: <strong>50 pcs</strong>
            </Badge>
            <Badge variant="outline" className="bg-white text-slate-700 text-[10px] border-slate-300">
              Cap: <strong>≤ {normalStockRef.toLocaleString()}</strong>
            </Badge>
          </div>
        </div>

        {/* Special BB callout if viewing BB */}
        {activeComponent === 'BB' && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">
                <strong>BB Manual Entry:</strong> Physical receipts (Row 9) are entered manually by planner.
              </span>
            </div>
            <Button
              size="xs"
              variant="outline"
              onClick={handleOpenBBDeliveryModal}
              className="bg-white hover:bg-amber-100 border-amber-300 text-amber-800 text-[11px] shrink-0"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Edit BB Quantities
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {/* Day 1 Opening */}
        <Card className="shadow-2xs">
          <CardContent className="p-2.5 sm:p-3">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Day 1 Opening
            </div>
            <div className="text-lg sm:text-xl font-black text-foreground value-mono mt-0.5">
              {(openingInventory?.[activeComponent] ?? 500).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Row 2 Initial
            </div>
          </CardContent>
        </Card>

        {/* Total Finished Production */}
        <Card className="shadow-2xs border-blue-100 bg-blue-50/20">
          <CardContent className="p-2.5 sm:p-3">
            <div className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
              Finished Output
            </div>
            <div className="text-lg sm:text-xl font-black text-blue-700 value-mono mt-0.5">
              {totalPlannedOutput.toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-600/80 mt-0.5">
              31-Day Target
            </div>
          </CardContent>
        </Card>

        {/* Total Material Usage */}
        <Card className="shadow-2xs border-indigo-100 bg-indigo-50/20">
          <CardContent className="p-2.5 sm:p-3">
            <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
              Row 4: Usage
            </div>
            <div className="text-lg sm:text-xl font-black text-indigo-700 value-mono mt-0.5">
              {totalPlannedUsage.toLocaleString()}
            </div>
            <div className="text-[10px] text-indigo-600/80 mt-0.5">
              {compConfig.usageMultiplier}× Multiplier
            </div>
          </CardContent>
        </Card>

        {/* Total Supplier Deliveries */}
        <Card className="shadow-2xs border-emerald-100 bg-emerald-50/20">
          <CardContent className="p-2.5 sm:p-3">
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
              Row 9: Receipts
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 value-mono mt-0.5">
              {totalPlannedDelivery.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">
              {totalOrdersCount} PO ({totalLorries} Lorries)
            </div>
          </CardContent>
        </Card>

        {/* Shortages Alert */}
        <Card className={`shadow-2xs ${shortageDaysCount > 0 ? 'border-rose-300 bg-rose-50/30' : ''}`}>
          <CardContent className="p-2.5 sm:p-3">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${shortageDaysCount > 0 ? 'text-rose-700' : 'text-muted-foreground'}`}>
              Row 6: Shortages
            </div>
            <div className={`text-lg sm:text-xl font-black value-mono mt-0.5 ${shortageDaysCount > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
              {shortageDaysCount} Days
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {shortageDaysCount === 0 ? 'Full coverage' : 'Deficit alert'}
            </div>
          </CardContent>
        </Card>

        {/* Storage Issue Warnings */}
        <Card className={`shadow-2xs ${storageWarningDaysCount > 0 ? 'border-amber-300 bg-amber-50/20' : ''}`}>
          <CardContent className="p-2.5 sm:p-3">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${storageWarningDaysCount > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
              Row 13: Storage Alert
            </div>
            <div className={`text-lg sm:text-xl font-black value-mono mt-0.5 ${storageWarningDaysCount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
              {storageWarningDaysCount} Days
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {storageWarningDaysCount === 0 ? 'Capacity ok' : 'Overstock risk'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Swipe Horizontal Helper for mobile */}
      <div className="flex md:hidden items-center justify-between px-2 text-[11px] text-slate-500 bg-slate-100/70 py-1 rounded-md">
        <span>↔️ Swipe horizontally to inspect Days 1–31</span>
        <span className="font-mono text-[10px] text-blue-600 font-bold">31 Days</span>
      </div>

      {/* Authoritative 13-Row Matrix Table with Frozen Sticky Column */}
      <Card className="overflow-hidden shadow-xs border-slate-200">
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="mrp-table w-full text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="row-label min-w-[200px] sm:min-w-[260px] p-2 sm:p-2.5 text-left sticky left-0 bg-slate-100 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="text-slate-900 font-bold text-xs flex items-center justify-between">
                    <span>Component {activeComponent} Parameters</span>
                    <Badge variant="outline" className="bg-white font-mono text-[9px]">
                      {activeComponent === 'AA' ? '1×' : activeComponent === 'BB' ? '1×' : '3×'}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    August 2026 Model (Days 1–31)
                  </div>
                </th>
                {plannedRows.map((r) => (
                  <th key={r.day} className="text-center min-w-[56px] sm:min-w-[62px] p-1.5 sm:p-2 font-semibold text-slate-700 border-l border-slate-200">
                    <div className="text-xs font-bold">D{r.day}</div>
                    <div className="text-[9px] font-normal text-slate-400">
                      08/{String(r.day).padStart(2, '0')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Row 1: Daily Finished Production Target */}
              <tr className="border-b border-slate-200 bg-white hover:bg-slate-50/50">
                <td className="row-label sticky left-0 bg-white font-semibold text-slate-700 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-[10px] font-mono text-slate-400 font-bold">R1</span>
                    <span className="truncate">Production Target</span>
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono font-bold text-slate-700 border-l border-slate-200">
                    {r.plannedProduction}
                  </td>
                ))}
              </tr>

              {/* Row 2: 📦 Planned Beginning Inventory */}
              <tr className="border-b border-slate-200 bg-slate-50/40 hover:bg-slate-100/40">
                <td className="row-label sticky left-0 bg-slate-50/95 font-medium text-slate-800 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-[10px] font-mono text-slate-400 font-bold">R2</span>
                    <span className="font-semibold truncate">📦 Beginning Inventory</span>
                  </div>
                  <div className="text-[9px] text-slate-400 pl-6 hidden sm:block">
                    Day 1: Opening • Day 2+: Prev Ending − Safety (50)
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono text-slate-800 border-l border-slate-200 font-semibold">
                    {r.beginningInventory}
                  </td>
                ))}
              </tr>

              {/* Row 3: 🛡️ Planned Safety Stock */}
              <tr className="border-b border-slate-200 bg-indigo-50/15 hover:bg-indigo-50/30">
                <td className="row-label sticky left-0 bg-indigo-50/95 font-medium text-indigo-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-[10px] font-mono text-indigo-400 font-bold">R3</span>
                    <span className="truncate">🛡️ Safety Stock</span>
                  </div>
                  <div className="text-[9px] text-indigo-600/70 pl-6 hidden sm:block">
                    Constant emergency buffer (50 units)
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono text-indigo-700 font-medium border-l border-slate-200">
                    {r.safetyStock}
                  </td>
                ))}
              </tr>

              {/* Row 4: 🏭 Planned Usage for the Day */}
              <tr className="border-b border-slate-200 bg-blue-50/20 hover:bg-blue-50/40">
                <td className="row-label sticky left-0 bg-blue-50/95 font-semibold text-blue-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-[10px] font-mono text-blue-500 font-bold">R4</span>
                    <span className="truncate">🏭 Planned Usage</span>
                  </div>
                  <div className="text-[9px] text-blue-600/80 pl-6 hidden sm:block">
                    Target × {compConfig.usageMultiplier} multiplier
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono text-blue-800 font-bold border-l border-slate-200">
                    {r.plannedUsage}
                  </td>
                ))}
              </tr>

              {/* Row 5: 📉 Remaining Inventory After Usage */}
              <tr className="border-b border-slate-200 bg-teal-50/15 hover:bg-teal-50/30">
                <td className="row-label sticky left-0 bg-teal-50/95 font-medium text-teal-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-[10px] font-mono text-teal-500 font-bold">R5</span>
                    <span className="truncate">📉 Remaining Stock</span>
                  </div>
                  <div className="text-[9px] text-teal-700/70 pl-6 hidden sm:block">
                    MAX(Beginning − Usage, 0)
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono text-teal-800 font-semibold border-l border-slate-200">
                    {r.remainingInventory}
                  </td>
                ))}
              </tr>

              {/* Row 6: 🚨 Shortage for Today */}
              <tr className="border-b border-slate-200 bg-rose-50/20 hover:bg-rose-50/35">
                <td className="row-label sticky left-0 bg-rose-50/95 font-medium text-rose-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-[10px] font-mono text-rose-500 font-bold">R6</span>
                    <span className="truncate">🚨 Shortage Check</span>
                  </div>
                  <div className="text-[9px] text-rose-600/80 pl-6 hidden sm:block">
                    MAX(Planned Usage − Beginning, 0)
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td
                    key={r.day}
                    className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${
                      r.shortage > 0
                        ? 'bg-rose-100 text-rose-800 font-black'
                        : 'text-slate-400'
                    }`}
                  >
                    {r.shortage > 0 ? (
                      <span className="text-rose-700 font-bold">-{r.shortage}</span>
                    ) : (
                      '0'
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 7: 🔭 3-Day Demand Capacity */}
              <tr className="border-b border-slate-200 bg-amber-50/15 hover:bg-amber-50/30">
                <td className="row-label sticky left-0 bg-amber-50/95 font-medium text-amber-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-[10px] font-mono text-amber-500 font-bold">R7</span>
                    <span className="truncate">🔭 3-Day Demand</span>
                  </div>
                  <div className="text-[9px] text-amber-700/80 pl-6 hidden sm:block">
                    Next 3 days usage (excl. today)
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono text-amber-800 font-semibold border-l border-slate-200">
                    {r.threeDayDemand}
                  </td>
                ))}
              </tr>

              {/* Row 8: 🚚 Required Receiving Amount (Need 🚚❓) */}
              <tr className="border-b-2 border-blue-300 bg-blue-50/35 hover:bg-blue-50/50 font-bold">
                <td className="row-label sticky left-0 bg-blue-100 text-blue-950 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 text-[10px] font-mono text-blue-600 font-bold">R8</span>
                      <span className="truncate">🚚 Required Receiving</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-200 text-blue-900 text-[9px] px-1 py-0">
                      Need ❓
                    </Badge>
                  </div>
                  <div className="text-[9px] text-blue-700 pl-6 font-normal hidden sm:block">
                    MAX(3-Day Demand − Remaining + Shortage, 0)
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono text-blue-900 font-bold border-l border-blue-200">
                    {r.requiredReceiving}
                  </td>
                ))}
              </tr>

              {/* Row 9: 📥 Supplier Delivery Plan (Receive 🚚✅) */}
              <tr className="border-b border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50 font-bold">
                <td className="row-label sticky left-0 bg-emerald-100 text-emerald-950 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 text-[10px] font-mono text-emerald-600 font-bold">R9</span>
                      <span className="truncate">📥 Supplier Delivery</span>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-200 text-emerald-900 text-[9px] px-1 py-0">
                      Receive ✅
                    </Badge>
                  </div>
                  <div className="text-[9px] text-emerald-700 pl-6 font-normal hidden sm:block">
                    {activeComponent === 'AA'
                      ? 'Accumulate ≥ 150 (Emergency early trigger)'
                      : activeComponent === 'CC'
                      ? 'Accumulate ≥ 250 (Emergency early trigger)'
                      : '🟡 Manually entered (unconfirmed batch)'}
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td
                    key={r.day}
                    onClick={() => {
                      if (activeComponent === 'BB') {
                        handleToggleBBLorry(r.day, r.supplierDeliveryPlan);
                      }
                    }}
                    className={`text-center p-1.5 sm:p-2 value-mono border-l border-emerald-200 ${
                      activeComponent === 'BB' ? 'cursor-pointer hover:bg-emerald-100/80 transition-colors select-none' : ''
                    } ${
                      r.supplierDeliveryPlan > 0
                        ? 'bg-emerald-100/80 text-emerald-800 font-black'
                        : 'text-slate-400'
                    }`}
                    title={
                      activeComponent === 'BB'
                        ? `Click to toggle fixed 160-unit batch delivery for Day ${r.day}`
                        : undefined
                    }
                  >
                    {r.supplierDeliveryPlan > 0 ? `+${r.supplierDeliveryPlan}` : '0'}
                    {activeComponent === 'BB' && (
                      <span className="block text-[8px] text-amber-700 opacity-70">
                        {r.supplierDeliveryPlan === 160
                          ? '1 lorry (160)'
                          : r.supplierDeliveryPlan > 160
                          ? `${Math.round(r.supplierDeliveryPlan / 160)} lorries`
                          : 'toggle 160'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 10: 🧾 Order Code */}
              <tr className="border-b border-slate-200 bg-indigo-50/10 hover:bg-indigo-50/20">
                <td className="row-label sticky left-0 bg-indigo-50/95 font-semibold text-indigo-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-[10px] font-mono text-indigo-500 font-bold">R10</span>
                    <span className="truncate">🧾 Order Code</span>
                  </div>
                  <div className="text-[9px] text-indigo-600/70 pl-6 hidden sm:block">
                    Sequential PO when delivery {'>'} 0
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono font-bold text-indigo-800 border-l border-slate-200 text-[10px] sm:text-[11px]">
                    {r.orderCode !== '—' ? (
                      <span className="px-1 py-0.5 bg-indigo-100/70 rounded text-indigo-900 font-mono text-[9px] sm:text-[10px]">
                        {r.orderCode}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 11: ─── Blank Separator Row ─── */}
              <tr className="bg-slate-200/60 h-2 border-y border-slate-300">
                <td colSpan={plannedRows.length + 1} className="p-0.5 text-center text-[9px] text-slate-400 font-mono truncate">
                  ──────── Supplier Planning & Ending Inventory Demarcation ────────
                </td>
              </tr>

              {/* Row 12: 📦 Planned Ending Inventory */}
              <tr className="border-b border-slate-300 bg-slate-100 hover:bg-slate-200/60 font-black">
                <td className="row-label sticky left-0 bg-slate-200 font-black text-slate-900 p-2 sm:p-2.5 z-10 border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-[10px] font-mono text-slate-600 font-bold">R12</span>
                    <span className="text-xs sm:text-sm truncate">📦 Ending Inventory</span>
                  </div>
                  <div className="text-[9px] text-slate-600 pl-6 font-normal hidden sm:block">
                    Remaining (R5) + Safety (R3) + Delivery (R9)
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2.5 value-mono font-black text-slate-900 text-xs sm:text-sm border-l border-slate-300">
                    {r.plannedEndingInventory}
                  </td>
                ))}
              </tr>

              {/* Row 13: 🏬 Storage Issue Warning */}
              <tr className="border-b-2 border-slate-400 bg-amber-50/10 hover:bg-amber-50/20">
                <td className="row-label sticky left-0 bg-amber-50/90 font-medium text-amber-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 text-[10px] font-mono text-amber-500 font-bold">R13</span>
                    <span className="truncate">🏬 Storage Issue Warning</span>
                  </div>
                  <div className="text-[9px] text-amber-600/70 pl-6 hidden sm:block">
                    YES if Ending Inventory &gt; {normalStockRef.toLocaleString()} capacity limit
                  </div>
                </td>
                {plannedRows.map((r) => (
                  <td
                    key={r.day}
                    className={`text-center p-1.5 sm:p-2 value-mono font-bold border-l border-slate-200 ${
                      r.storageWarning
                        ? 'bg-amber-100 text-amber-800 font-black'
                        : 'text-slate-400'
                    }`}
                  >
                    {r.storageIssueText}
                  </td>
                ))}
              </tr>

              {/* Operational Sub-Row: Lorries Scheduled */}
              <tr className="bg-purple-50/15 border-b border-slate-200">
                <td className="row-label sticky left-0 bg-purple-50/95 font-medium text-purple-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="truncate">Lorries Scheduled</span>
                  </div>
                  <div className="text-[9px] text-purple-600/70 pl-5 hidden sm:block">
                    Max capacity: {compConfig.maxDeliveryQty} pcs/lorry
                  </div>
                </td>
                {plannedRows.map((r) => {
                  const lorries = calculateLorryCount(r.supplierDeliveryPlan, compConfig.maxDeliveryQty);
                  return (
                    <td
                      key={r.day}
                      className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${
                        lorries > 0 ? 'font-bold text-purple-700 bg-purple-50/30' : 'text-slate-300'
                      }`}
                    >
                      {lorries > 0 ? `${lorries} L` : '0'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Logic Guide Modal */}
      <Dialog open={showLogicGuideModal} onOpenChange={setShowLogicGuideModal}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="bg-slate-900 text-white px-4 sm:px-5 py-3 sm:py-4 m-0 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              <span>Authoritative Planned MRP Logic & Rules Reference</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 m-0">
              Complete formula flow for Material AA (Outer Tub), BB (Inner Tub), and CC (Ridgeform).
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-bold text-blue-900 mb-1">Material AA (Outer Tub)</div>
                <ul className="space-y-1 text-slate-600 text-[11px]">
                  <li>• Usage: <strong>Production × 1</strong></li>
                  <li>• Safety Stock: <strong>50 units</strong></li>
                  <li>• Min Delivery: <strong>150 units</strong></li>
                  <li>• Normal Stock Max: <strong>2,000 units</strong></li>
                  <li>• Pending accumulated until ≥ 150 or emergency</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="font-bold text-amber-900 mb-1">Material BB (Inner Tub)</div>
                <ul className="space-y-1 text-slate-600 text-[11px]">
                  <li>• Usage: <strong>Production × 1</strong></li>
                  <li>• Safety Stock: <strong>50 units</strong></li>
                  <li>• Min Delivery: <strong>Manual Entry</strong></li>
                  <li>• Normal Stock Max: <strong>640 units</strong></li>
                  <li>• Entered manually by business requirements</li>
                </ul>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="font-bold text-emerald-900 mb-1">Material CC (Ridgeform)</div>
                <ul className="space-y-1 text-slate-600 text-[11px]">
                  <li>• Usage: <strong>Production × 3</strong></li>
                  <li>• Safety Stock: <strong>50 units</strong></li>
                  <li>• Min Delivery: <strong>250 units</strong></li>
                  <li>• Normal Stock Max: <strong>2,000 units</strong></li>
                  <li>• Pending accumulated until ≥ 250 or emergency</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-3">
              <h4 className="font-bold text-slate-900">Key Formula Definitions:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 text-[11px]">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="font-semibold text-slate-800">1. Planned Beginning Inventory (Row 2)</div>
                  <div>• Day 1: Monthly Opening Inventory (e.g. 500)</div>
                  <div>• Day 2+: <code>Yesterday's Ending − Yesterday's Safety (50)</code></div>
                  <div className="text-slate-500">Represents usable production inventory.</div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="font-semibold text-slate-800">4. Remaining (Row 5) & Shortage (Row 6)</div>
                  <div>• Remaining: <code>MAX(Beginning − Planned Usage, 0)</code></div>
                  <div>• Shortage: <code>MAX(Planned Usage − Beginning, 0)</code></div>
                  <div className="text-slate-500">Inventory cannot physically be negative.</div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="font-semibold text-slate-800">7. Required Receiving Amount (Row 8)</div>
                  <div>• <code>MAX(3-Day Demand − Remaining + Today's Shortage, 0)</code></div>
                  <div className="text-blue-700 font-semibold">• Row 8 = "Need 🚚❓"</div>
                  <div className="text-slate-500">Calculates coverage for future demand + current shortfall.</div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="font-semibold text-slate-800">9. Supplier Delivery Plan (Row 9)</div>
                  <div>• Physical planned receipt from supplier on that day.</div>
                  <div className="text-emerald-700 font-semibold">• Row 9 = "Receive 🚚✅"</div>
                  <div>• Emergency trigger: If <code>Remaining &lt; Tomorrow's Usage</code>, release early!</div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="font-semibold text-slate-800">10. Order Code (Row 10)</div>
                  <div>• Sequential code created when Row 9 {'>'} 0: <code>AA001, BB001, CC001...</code></div>
                  <div>• If no delivery: <code>—</code></div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="font-semibold text-slate-800">12. Planned Ending Inventory (Row 12)</div>
                  <div>• <code>Remaining Inventory (R5) + Safety Stock (R3) + Supplier Delivery (R9)</code></div>
                  <div>• Only physical planned receipt (Row 9) enters inventory, NOT Row 8!</div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200">
            <Button size="sm" onClick={() => setShowLogicGuideModal(false)}>
              Close Guide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit BB Delivery Plan Modal */}
      <Dialog open={showBBDeliveryModal} onOpenChange={setShowBBDeliveryModal}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="bg-emerald-950 text-white px-4 sm:px-5 py-3 sm:py-4 m-0 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Truck className="w-5 h-5 text-emerald-400" />
              <span>Material BB (Inner Tub) — Scheduled Deliveries (Fixed 160-Unit Lots)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-emerald-200/80 m-0">
              Component BB batch size is strictly fixed at 160 units (1 full lorry load). Select days to schedule 160-unit deliveries.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Toolbar */}
          <div className="p-2.5 sm:p-3 bg-emerald-50/70 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-emerald-900 hidden sm:inline">Helpers:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoFillBB160s}
                className="bg-white hover:bg-emerald-100 border-emerald-300 text-emerald-900 text-xs h-7 sm:h-8 font-bold"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Auto-Batch 160s
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearBBDeliveries}
              className="text-rose-700 hover:bg-rose-50 border-rose-300 text-xs h-7 sm:h-8"
            >
              Clear All to 0
            </Button>
          </div>

          {/* 31-Day Input Matrix */}
          <div className="p-3 sm:p-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {plannedRows.map((r) => {
                const dayVal = tempBBDeliveries[r.day] ?? 0;
                const lorryCount = Math.round(dayVal / 160);
                return (
                  <div
                    key={r.day}
                    className={`p-1.5 sm:p-2 border rounded-lg shadow-2xs transition-colors text-center ${
                      dayVal > 0
                        ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>D{r.day}</span>
                      <span className="text-[9px] font-normal text-slate-400">
                        Need: {r.requiredReceiving}
                      </span>
                    </div>

                    {/* Fixed 160-batch selector */}
                    <select
                      value={lorryCount}
                      onChange={(e) => {
                        const lorries = parseInt(e.target.value, 10) || 0;
                        setTempBBDeliveries((prev) => ({
                          ...prev,
                          [r.day]: lorries * 160,
                        }));
                      }}
                      className={`w-full text-center font-bold text-xs value-mono rounded py-1 border focus:outline-none ${
                        dayVal > 0
                          ? 'bg-white border-emerald-400 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      <option value={0}>0 (None)</option>
                      <option value={1}>160 (1 Lorry)</option>
                      <option value={2}>320 (2 Lorries)</option>
                      <option value={3}>480 (3 Lorries)</option>
                    </select>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {dayVal > 0 ? `${dayVal} units (fixed)` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-2">
            <span className="text-xs text-slate-600 font-medium">
              Total BB Planned Delivery:{' '}
              <strong>
                {(Object.values(tempBBDeliveries) as number[]).reduce((a: number, b: number) => a + b, 0).toLocaleString()} pcs
              </strong>
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBBDeliveryModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveBBDeliveries}
                className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save BB Delivery Plan</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Finished Production Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="bg-slate-900 text-white px-4 sm:px-5 py-3 sm:py-4 m-0 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Edit3 className="w-5 h-5 text-blue-400" />
              <span>Edit Master Finished Production Schedule (Row 1)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 m-0">
              Adjust daily unit output targets for Days 1–31 to immediately re-calculate material usage, 3-day demand, and deliveries.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Fill / Tools Toolbar */}
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <Label className="font-semibold text-slate-700 shrink-0">Batch Fill Output:</Label>
              <Input
                type="number"
                min="0"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
                className="w-20 font-mono text-center font-bold h-8 text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleBatchFill}
                className="h-8 text-xs shrink-0"
              >
                Fill 31 Days
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-slate-700 shrink-0">Opening ({activeComponent}):</Label>
                <Input
                  type="number"
                  min="0"
                  value={openingInvEdit}
                  onChange={(e) => setOpeningInvEdit(e.target.value)}
                  className="w-20 font-mono text-center font-bold h-8 text-xs"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToBaseline}
                className="flex items-center gap-1 h-8 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset (70/day)</span>
              </Button>
            </div>
          </div>

          {/* 31-Day Matrix Inputs Grid */}
          <div className="p-3 sm:p-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {tempOutputs.map((val, idx) => {
                const day = idx + 1;
                return (
                  <div
                    key={day}
                    className="p-1.5 sm:p-2 border border-slate-200 rounded-lg bg-white shadow-2xs focus-within:border-primary"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Day {day}</span>
                      <span className="text-[9px] font-normal text-slate-400">
                        08/{String(day).padStart(2, '0')}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={val}
                      onChange={(e) => {
                        const newOutputs = [...tempOutputs];
                        newOutputs[idx] = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setTempOutputs(newOutputs);
                      }}
                      className="w-full text-center font-mono font-bold h-8 text-xs"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-2">
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              Total Month Finished Target: <strong>{tempOutputs.reduce((a, b) => a + b, 0).toLocaleString()} units</strong>
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveSchedule}
                className="flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Schedule</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
