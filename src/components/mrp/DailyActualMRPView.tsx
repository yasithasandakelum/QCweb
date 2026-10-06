import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Factory,
  FileCheck2,
  FileSpreadsheet,
  HelpCircle,
  Info,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActualMRPRow, ComponentCode, PlannedMRPRow, ProductionDefectEvent } from '../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PeriodSelector } from '../common/PeriodSelector';

interface DailyActualMRPViewProps {
  onNavigate?: (tab: string) => void;
}

export const DailyActualMRPView: React.FC<DailyActualMRPViewProps> = ({ onNavigate }) => {
  const {
    monthlyPlans,
    currentMonth,
    activeComponent,
    setActiveComponent,
    systemConfig,
    currentDay,
    setCurrentDay,
    productionRecords,
    defectEvents,
    dayConfirmations,
    deliveries,
    inspections,
    activeRole,
    currentUser,
    manualActualOverrides,
    updateManualActualMRPRow,
    clearManualActualOverride,
    addAuditLog,
    addNotification,
  } = useApp();

  const plan = monthlyPlans[currentMonth];
  const actualRows: ActualMRPRow[] = plan?.actualRows?.[activeComponent] || [];
  const plannedRows: PlannedMRPRow[] = plan?.plannedRows?.[activeComponent] || [];

  // Selected operating day to inspect in the audit checklist & traceability ledger
  const [selectedDay, setSelectedDay] = useState<number>(currentDay);
  const selectedDateStr = `${currentMonth}-${String(selectedDay).padStart(2, '0')}`;

  // Drilldown modals
  const [drilldownType, setDrilldownType] = useState<
    'production' | 'delivery' | 'inspection' | 'defects' | 'formula' | null
  >(null);
  const [selectedFormulaRow, setSelectedFormulaRow] = useState<string | null>(null);

  const activeRow = actualRows[selectedDay - 1];
  const activePlannedRow = plannedRows[selectedDay - 1];
  const overridesForComp = manualActualOverrides?.[activeComponent] || {};

  // Operational records for the selected day
  const dayProdRecord = useMemo(() => {
    return productionRecords.find((p) => p.date === selectedDateStr);
  }, [productionRecords, selectedDateStr]);

  const dayConfirmation = useMemo(() => {
    return dayConfirmations.find((c) => c.date === selectedDateStr);
  }, [dayConfirmations, selectedDateStr]);

  const dayDelivery = useMemo(() => {
    return deliveries.find(
      (d) =>
        d.plannedDate === selectedDateStr &&
        (d.componentCode === activeComponent || (activePlannedRow?.orderCode && d.orderCode === activePlannedRow.orderCode))
    );
  }, [deliveries, selectedDateStr, activeComponent, activePlannedRow]);

  const dayInspection = useMemo(() => {
    return inspections.find(
      (i) => i.lotReceivedDate === selectedDateStr && i.componentCode === activeComponent
    );
  }, [inspections, selectedDateStr, activeComponent]);

  const dayDefects = useMemo(() => {
    return defectEvents.filter(
      (e) => e.date === selectedDateStr && e.componentCode === activeComponent
    );
  }, [defectEvents, selectedDateStr, activeComponent]);

  const isConfirmedDay = dayConfirmation?.status === 'Confirmed';
  const isAdminOrManager = activeRole === 'Manager' || activeRole === 'Admin' || activeRole === 'Supervisor';

  // Section 15: Today's MRP Inputs Checklist calculations
  const productionStatus = useMemo(() => {
    if (!dayProdRecord) {
      return { status: 'Missing', label: 'Not Logged', color: 'text-slate-400 bg-slate-100 border-slate-200' };
    }
    if (isConfirmedDay) {
      return { status: 'Confirmed', label: 'EOD Confirmed', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    return { status: 'Pending', label: 'Awaiting EOD Sign-off', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  }, [dayProdRecord, isConfirmedDay]);

  const deliveryStatus = useMemo(() => {
    if (!dayDelivery) {
      if (activePlannedRow && activePlannedRow.supplierDeliveryPlan > 0) {
        return { status: 'Pending', label: `${activePlannedRow.orderCode} Pending Arrival`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      }
      return { status: 'None', label: 'None Scheduled', color: 'text-slate-400 bg-slate-50 border-slate-200' };
    }
    if (dayDelivery.status === 'Inspected - Accepted') {
      return { status: 'Accepted', label: `${dayDelivery.orderCode || dayDelivery.businessDeliveryNumber} Accepted`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    if (dayDelivery.status === 'Inspected - Rejected') {
      return { status: 'Rejected', label: `${dayDelivery.orderCode || dayDelivery.businessDeliveryNumber} Rejected`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    if (dayDelivery.status === 'Arrived') {
      return { status: 'Arrived', label: `${dayDelivery.orderCode || dayDelivery.businessDeliveryNumber} Arrived`, color: 'text-purple-700 bg-purple-50 border-purple-200' };
    }
    return { status: 'Planned', label: 'Planned / In Transit', color: 'text-blue-700 bg-blue-50 border-blue-200' };
  }, [dayDelivery, activePlannedRow]);

  const inspectionStatus = useMemo(() => {
    if (!dayInspection) {
      if (dayDelivery && dayDelivery.status === 'Arrived') {
        return { status: 'Required', label: 'Inspection Required', color: 'text-amber-700 bg-amber-100 border-amber-300' };
      }
      return { status: 'None', label: 'None Pending', color: 'text-slate-400 bg-slate-50 border-slate-200' };
    }
    if (dayInspection.finalDecision === 'Accepted') {
      return { status: 'Accepted', label: `Accepted (${dayInspection.totalDefectCount} defects)`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    if (dayInspection.finalDecision === 'Rejected') {
      return { status: 'Rejected', label: `Rejected (${dayInspection.totalDefectCount} defects)`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    return { status: 'Pending', label: 'In Progress', color: 'text-blue-700 bg-blue-50 border-blue-200' };
  }, [dayInspection, dayDelivery]);

  const defectsStatus = useMemo(() => {
    if (dayDefects.length === 0) {
      return { status: 'Clean', label: '0 Events Logged', color: 'text-slate-400 bg-slate-50 border-slate-200' };
    }
    const scrapCount = dayDefects.reduce((sum, d) => sum + d.quantity, 0);
    if (isConfirmedDay) {
      return { status: 'Confirmed', label: `Confirmed (${scrapCount} units)`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    return { status: 'Logged', label: `Logged (${scrapCount} units, Unconfirmed)`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
  }, [dayDefects, isConfirmedDay]);

  // Section 13: Itemized Ledger Rows with Data Sources
  const ledgerItems = useMemo(() => {
    if (!activeRow) return [];

    return [
      {
        id: 'R16',
        name: 'Actual Beginning Inventory',
        icon: '📦',
        value: activeRow.beginningInventory !== null ? activeRow.beginningInventory.toLocaleString() : '— Pending',
        sourceType: 'system',
        sourceLabel: '🤖 System Rollforward',
        sourceDesc: "Yesterday's Ending (R37) − Yesterday's Remaining Safety (R32)",
        actionType: 'formula',
      },
      {
        id: 'R17',
        name: 'Beginning Safety Stock',
        icon: '🛡️',
        value: activeRow.beginningSafetyStock !== null ? activeRow.beginningSafetyStock.toLocaleString() : '— Pending',
        sourceType: 'system',
        sourceLabel: '🤖 System Rollforward',
        sourceDesc: "Yesterday's Remaining Safety Stock (R32)",
        actionType: 'formula',
      },
      {
        id: 'R18',
        name: 'Actual Effective Usage',
        icon: '🏭',
        value: activeRow.actualUsage !== null ? `${activeRow.actualUsage.toLocaleString()} units` : '— Pending',
        sourceType: 'actual-inputs',
        sourceLabel: 'Actual MRP Inputs',
        sourceDesc: 'Recorded in Actual MRP Inputs for this date & component',
        actionType: 'actual-inputs-usage',
      },
      {
        id: 'R19',
        name: 'From the Main Stock',
        icon: '📦',
        value: activeRow.fromMainStock !== null ? `${activeRow.fromMainStock.toLocaleString()} units` : '— Pending',
        sourceType: 'calc',
        sourceLabel: 'System Calculated',
        sourceDesc: 'Actual Usage (R18) − From Safety Stock (R20)',
        actionType: 'formula',
      },
      {
        id: 'R20',
        name: 'From the Safety Stock',
        icon: '🛡️',
        value: activeRow.fromSafetyStock !== null ? `${activeRow.fromSafetyStock.toLocaleString()} units` : '— Pending',
        sourceType: 'actual-inputs',
        sourceLabel: 'Actual MRP Inputs',
        sourceDesc: 'Recorded in Actual MRP Inputs (Safety Stock)',
        actionType: 'actual-inputs-usage',
      },
      {
        id: 'R21',
        name: 'Remaining Inventory After Usage',
        icon: '📉',
        value: activeRow.remainingInventory !== null ? `${activeRow.remainingInventory.toLocaleString()} units` : '— Pending',
        sourceType: 'calc',
        sourceLabel: 'System Calculated',
        sourceDesc: 'MAX(Beginning Inventory − Actual Usage, 0)',
        actionType: 'formula',
      },
      {
        id: 'R22',
        name: 'Inventory Shortage for Today',
        icon: '🚨',
        value: activeRow.inventoryShortage && activeRow.inventoryShortage > 0 ? `-${activeRow.inventoryShortage} units` : '0',
        sourceType: 'calc',
        sourceLabel: 'System Calculated',
        sourceDesc: 'MAX(Actual Usage − Beginning Inventory, 0)',
        actionType: 'formula',
      },
      {
        id: 'R23',
        name: 'Order Code',
        icon: '🧾',
        value: activeRow.orderCode && activeRow.orderCode !== '—' ? activeRow.orderCode : '—',
        sourceType: 'delivery',
        sourceLabel: 'Supplier Delivery',
        sourceDesc: 'Links to planned purchase order reference',
        actionType: 'delivery',
      },
      {
        id: 'R24',
        name: 'Actual Receiving Amount',
        icon: '🚚',
        value: activeRow.actualReceiving !== null ? (activeRow.actualReceiving > 0 ? `+${activeRow.actualReceiving.toLocaleString()} units` : '0') : '— Pending',
        sourceType: 'delivery',
        sourceLabel: 'Accepted Delivery',
        sourceDesc: 'Inbound physical lots accepted after AQL inspection',
        actionType: 'delivery',
      },
      {
        id: 'R25',
        name: 'As the Planned Order',
        icon: '📅',
        value: activeRow.asPlannedOrder !== null ? activeRow.asPlannedOrder.toLocaleString() : '—',
        sourceType: 'system',
        sourceLabel: 'Planned MRP Match',
        sourceDesc: 'Original planned quantity for matched order code',
        actionType: 'formula',
      },
      {
        id: 'R26',
        name: 'As Safety Stock Requirement',
        icon: '🛡️',
        value: activeRow.safetyStockRequirement !== null ? activeRow.safetyStockRequirement.toLocaleString() : '0',
        sourceType: 'calc',
        sourceLabel: 'System Calculated',
        sourceDesc: 'Safety buffer replenishment portion of receipt',
        actionType: 'formula',
      },
      {
        id: 'R28',
        name: 'Inspection Defects',
        icon: '🧪',
        value: activeRow.lotQualityFails !== null ? `${activeRow.lotQualityFails} defects` : '0',
        sourceType: 'inspection',
        sourceLabel: 'Lot Inspection',
        sourceDesc: 'Incoming lot inspection defect count (Quality module)',
        actionType: 'inspection',
      },
      {
        id: 'R29',
        name: 'Warehouse Defects',
        icon: '🏬',
        value: activeRow.warehouseQualityFails !== null ? `${activeRow.warehouseQualityFails} defects` : '0',
        sourceType: 'actual-inputs',
        sourceLabel: 'Actual MRP Inputs',
        sourceDesc: 'Warehouse storage handling damages recorded in Actual MRP Inputs',
        actionType: 'actual-inputs-defects',
      },
      {
        id: 'R30',
        name: 'Assembly Defects',
        icon: '🏭',
        value: activeRow.assemblyQualityFails !== null ? `${activeRow.assemblyQualityFails} defects` : '0',
        sourceType: 'actual-inputs',
        sourceLabel: 'Actual MRP Inputs',
        sourceDesc: 'Floor assembly line rejects recorded in Actual MRP Inputs',
        actionType: 'actual-inputs-defects',
      },
      {
        id: 'R31',
        name: 'Safety Stock Defects',
        icon: '🛡️',
        value: activeRow.safetyStockQualityFails !== null ? `${activeRow.safetyStockQualityFails} defects` : '0',
        sourceType: 'actual-inputs',
        sourceLabel: 'Actual MRP Inputs',
        sourceDesc: 'Safety reserve quality failures recorded in Actual MRP Inputs',
        actionType: 'actual-inputs-defects',
      },
      {
        id: 'R27',
        name: 'Quality Fails Total',
        icon: '🔍',
        value: activeRow.qualityFailsTotal !== null ? `${activeRow.qualityFailsTotal} units` : '0',
        sourceType: 'calc',
        sourceLabel: 'System Calculated',
        sourceDesc: 'Inspection Defects (R28) + Warehouse (R29) + Assembly (R30) + Safety Stock (R31)',
        actionType: 'formula',
      },
      {
        id: 'R32',
        name: 'Remaining Safety Stock',
        icon: '🛡️',
        value: activeRow.remainingSafetyStock !== null ? `${activeRow.remainingSafetyStock} units` : '—',
        sourceType: 'calc',
        sourceLabel: 'System Calculated',
        sourceDesc: 'Beginning Safety + Safety Received − Total Quality Fails',
        actionType: 'formula',
      },
      {
        id: 'R33',
        name: 'Safety Stock Shortage',
        icon: '🚨',
        value: activeRow.safetyStockShortage && activeRow.safetyStockShortage > 0 ? `${activeRow.safetyStockShortage} units deficit` : '0',
        sourceType: 'calc',
        sourceLabel: 'System Calculated',
        sourceDesc: 'Triggered when remaining safety stock < 26 units',
        actionType: 'formula',
      },
      {
        id: 'R37',
        name: 'Actual Ending Inventory',
        icon: '📦',
        value: activeRow.actualEndingInventory !== null ? activeRow.actualEndingInventory.toLocaleString() : '— Pending',
        sourceType: 'calc',
        sourceLabel: 'MRP Formula',
        sourceDesc: 'Authoritative Excel Formula: Remaining Stock (R21) + Remaining Safety (R32) + Planned Receipts (R25)',
        actionType: 'formula',
      },
      {
        id: 'R38',
        name: 'Storage Issues Warning',
        icon: '🏬',
        value: activeRow.storageIssue || '—',
        sourceType: 'calc',
        sourceLabel: 'MRP Formula',
        sourceDesc: 'Capacity warning if stock exceeds reference limit',
        actionType: 'formula',
      },
    ];
  }, [activeRow]);

  // CSV Export for authoritative Actual MRP ledger
  const exportCSV = () => {
    const headers = [
      'Day',
      'Date',
      'Row 16: Actual Beginning Inventory',
      'Row 17: Actual Beginning Safety Stock',
      'Row 18: Actual Effective Usage for Day',
      'Row 19: From Main Stock',
      'Row 20: From Safety Stock',
      'Row 21: Remaining Inventory After Usage',
      'Row 22: Inventory Shortage for Today',
      'Row 23: Order Code',
      'Row 24: Actual Receiving Amount',
      'Row 25: As Planned Order',
      'Row 26: As Safety Stock Requirement',
      'Row 27: Quality Fails Total',
      'Row 28: Lot Quality Failures',
      'Row 29: Warehouse Quality Failures',
      'Row 30: Assembly Quality Failures',
      'Row 31: Safety Stock Quality Failures',
      'Row 32: Remaining Safety Stock',
      'Row 33: Safety Stock Shortage',
      'Row 34: Safety Stock Cycle Day',
      'Row 35: Need to Receive Shortage Within',
      'Row 36: Updated Receiving Plan',
      'Row 37: Actual Ending Inventory',
      'Row 38: Are There Any Storage Issues',
    ];

    const rows = actualRows.map((r) => [
      r.day,
      r.date,
      r.beginningInventory ?? '',
      r.beginningSafetyStock ?? '',
      r.actualUsage ?? '',
      r.fromMainStock ?? '',
      r.fromSafetyStock ?? '',
      r.remainingInventory ?? '',
      r.inventoryShortage ?? '',
      r.orderCode ?? '',
      r.actualReceiving ?? '',
      r.asPlannedOrder ?? '',
      r.safetyStockRequirement ?? '',
      r.qualityFailsTotal ?? '',
      r.lotQualityFails ?? '',
      r.warehouseQualityFails ?? '',
      r.assemblyQualityFails ?? '',
      r.safetyStockQualityFails ?? '',
      r.remainingSafetyStock ?? '',
      r.safetyStockShortage ?? '',
      r.safetyStockCycleDay ?? '',
      r.receiveShortageWithin ?? '',
      r.updatedReceivingPlan ?? '',
      r.actualEndingInventory ?? '',
      r.storageIssue ?? '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Actual_MRP_${activeComponent}_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Operational Integration Principles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-800">
              Daily Actual MRP Master Ledger (Read-Only Engine)
            </h2>
            <Badge variant="outline" className="hidden sm:inline-flex bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              3 Operational Input Groups Sync
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Non-editable calculation matrix. Real operational inputs flow automatically from Daily Production, Safety Stock deployment, and Quality/Defects modules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <PeriodSelector />

          {/* Operating Day Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-md text-xs shadow-2xs">
            <span className="text-slate-500 font-medium pl-1 text-[11px]">Inspect Day:</span>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="bg-slate-50 text-slate-800 font-bold px-1.5 py-0.5 rounded border border-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d} (08/{String(d).padStart(2, '0')})
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 h-8 text-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* OPERATIONAL USER EXPERIENCE FLOW BANNER */}
      <div className="p-3 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-lg text-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-blue-300 text-[11px]">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Standard Operational Event Flow</span>
          </div>
          <div className="text-[11px] text-slate-300 hidden md:block">
            Users never type into the MRP table — inputs are recorded where events happen
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-2 pt-2 border-t border-blue-800/60 text-center">
          <div className="p-1.5 bg-white/10 rounded text-[11px]">
            <span className="text-blue-300 font-bold block text-[10px]">Step 1</span>
            <span>Record Production</span>
          </div>
          <div className="p-1.5 bg-white/10 rounded text-[11px]">
            <span className="text-amber-300 font-bold block text-[10px]">Step 2</span>
            <span>Safety-Stock Used (if any)</span>
          </div>
          <div className="p-1.5 bg-white/10 rounded text-[11px]">
            <span className="text-purple-300 font-bold block text-[10px]">Step 3</span>
            <span>Inspection & Defects</span>
          </div>
          <div className="p-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded text-[11px]">
            <span className="text-emerald-300 font-bold block text-[10px]">Step 4</span>
            <span>System Auto-Integrates</span>
          </div>
          <div className="p-1.5 bg-blue-500/20 border border-blue-400/40 rounded text-[11px]">
            <span className="text-cyan-300 font-bold block text-[10px]">Result</span>
            <span>Actual MRP Recalculates</span>
          </div>
        </div>
      </div>

      {/* THE THREE OPERATIONAL INPUT GROUPS & INBOUND DELIVERIES INTEGRATION */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/60 via-slate-50 to-indigo-50/40 shadow-xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-2">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Authoritative Operational Input Feeds — Day {selectedDay} ({selectedDateStr})
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Values already available from other modules are integrated automatically.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Input Group 1: Actual Effective Usage (Row 18) */}
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Factory className="w-3.5 h-3.5 text-blue-600" />
                    <span>(1) Actual Effective Usage</span>
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${productionStatus.color}`}>
                    {productionStatus.label}
                  </Badge>
                </div>
                <div className="mt-1">
                  <span className="text-xs text-slate-500 block">Row 18 Realized:</span>
                  <strong className="text-sm font-black text-blue-700 value-mono">
                    {activeRow?.actualUsage !== null ? `${activeRow?.actualUsage} units` : '— Pending'}
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Obtained automatically from confirmed Daily Production ({activeComponent} multiplier applied)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('mrp-input-usage');
                  } else {
                    setDrilldownType('production');
                  }
                }}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 pt-1 border-t border-slate-100"
              >
                <span>Open in Actual MRP Inputs</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Input Group 2: From the Safety Stock (Row 20) */}
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>(2) From Safety Stock</span>
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${activeRow?.fromSafetyStock && activeRow.fromSafetyStock > 0 ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {activeRow?.fromSafetyStock && activeRow.fromSafetyStock > 0 ? `${activeRow.fromSafetyStock} SS Used` : '0 (Main Stock Only)'}
                  </Badge>
                </div>
                <div className="mt-1">
                  <span className="text-xs text-slate-500 block">Row 20 Realized:</span>
                  <strong className="text-sm font-black text-amber-700 value-mono">
                    {activeRow?.fromSafetyStock !== null ? `${activeRow?.fromSafetyStock} units` : '0'}
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Entered per component only when safety stock is actually used (Main stock: {activeRow?.fromMainStock ?? '—'})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('mrp-input-usage');
                  } else {
                    setDrilldownType('production');
                  }
                }}
                className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 pt-1 border-t border-slate-100"
              >
                <span>Edit in Actual MRP Inputs</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Input Group 3: Quality Fails & Defect Breakdown (Rows 27–31) */}
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>(3) Quality Fails Total</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-rose-50 text-rose-700 border-rose-200 font-mono">
                    Row 27 Sum
                  </Badge>
                </div>
                <div className="mt-1">
                  <span className="text-xs text-slate-500 block">System Calculated Total:</span>
                  <strong className="text-sm font-black text-rose-700 value-mono">
                    {activeRow?.qualityFailsTotal !== null ? `${activeRow?.qualityFailsTotal} units` : '0'}
                  </strong>
                  <div className="text-[10px] text-slate-500 mt-1 space-y-0.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                    <div className="flex justify-between">
                      <span>• Lot QC (R28):</span>
                      <strong className="font-mono text-slate-700">{activeRow?.lotQualityFails ?? 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>• Warehouse (R29):</span>
                      <strong className="font-mono text-slate-700">{activeRow?.warehouseQualityFails ?? 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>• Assembly (R30):</span>
                      <strong className="font-mono text-slate-700">{activeRow?.assemblyQualityFails ?? 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>• Safety Stock (R31):</span>
                      <strong className="font-mono text-slate-700">{activeRow?.safetyStockQualityFails ?? 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('mrp-input-defects');
                  } else {
                    setDrilldownType('defects');
                  }
                }}
                className="text-[11px] text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 pt-1 border-t border-slate-100"
              >
                <span>Edit Defect Inputs</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Integrated Inbound Logistics: Order Code & Actual Gross Receipt (Rows 23–25) */}
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Inbound Deliveries</span>
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${deliveryStatus.color}`}>
                    {deliveryStatus.label}
                  </Badge>
                </div>
                <div className="mt-1">
                  <span className="text-xs text-slate-500 block">Rows 23 & 24 Integrated:</span>
                  <strong className="text-sm font-black text-emerald-700 value-mono">
                    {activeRow?.actualReceiving && activeRow.actualReceiving > 0 ? `+${activeRow.actualReceiving.toLocaleString()} units` : '0'}
                  </strong>
                  <div className="text-[10px] text-slate-500 mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                    <div>Order Code (R23): <strong className="font-mono text-blue-700">{activeRow?.orderCode || '—'}</strong></div>
                    <div>Planned Target (R25): <strong className="font-mono text-slate-700">{activeRow?.asPlannedOrder ?? 0} units</strong></div>
                    <div className="text-slate-400 mt-0.5 italic">Auto-pulled from Deliveries & QC</div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (dayDelivery) {
                    setDrilldownType('delivery');
                  } else if (onNavigate) {
                    onNavigate('supplier-deliveries');
                  }
                }}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 pt-1 border-t border-slate-100"
              >
                <span>{dayDelivery ? 'View Delivery Logistics' : 'Open Deliveries Receiving'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['AA', 'BB', 'CC'] as ComponentCode[]).map((code) => {
            const isActive = activeComponent === code;
            const multiplierLabel = code === 'CC' ? '3×' : '1×';
            const compName = code === 'AA' ? 'Outer Tub' : code === 'BB' ? 'Inner Tub' : 'Ridgeform';

            return (
              <Button
                key={code}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveComponent(code)}
                className={`flex items-center gap-2 px-3 py-1.5 h-auto text-left shrink-0 ${
                  isActive ? 'shadow-xs font-semibold' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-bold text-xs">{code}</span>
                    <span className="text-[10px] opacity-80 font-normal">({compName})</span>
                  </div>
                  <div className="text-[9px] font-normal opacity-75 mt-0.5">
                    {multiplierLabel} Usage Multiplier
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {Object.keys(overridesForComp).length > 0 && (
          <Badge variant="outline" className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-800 border-amber-200 px-2 py-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>
              <strong>{Object.keys(overridesForComp).length}</strong> admin override(s) active on {activeComponent}
            </span>
          </Badge>
        )}
      </div>

      {/* SECTION 13 & 14: Daily Ledger Audit & Source Traceability Matrix */}
      <Card className="shadow-xs border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-xs sm:text-sm">
              Daily Ledger Audit Breakdown: Component {activeComponent} | Day {selectedDay} ({selectedDateStr})
            </h3>
          </div>
          <div className="text-[11px] text-slate-300">
            Click any row to inspect original shop-floor source event.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="mrp-table w-full text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <th className="row-label w-[40px] text-center">Row</th>
                <th className="text-left min-w-[220px]">MRP Ledger Item</th>
                <th className="text-right min-w-[130px]">Realized Value</th>
                <th className="text-left min-w-[180px]">Operational Source</th>
                <th className="text-left hidden md:table-cell">Calculation Logic / Context</th>
                <th className="text-right pr-4 min-w-[120px]">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    if (item.actionType === 'actual-inputs-usage') {
                      if (onNavigate) onNavigate('mrp-input-usage');
                      else setDrilldownType('production');
                    } else if (item.actionType === 'actual-inputs-defects') {
                      if (onNavigate) onNavigate('mrp-input-defects');
                      else setDrilldownType('defects');
                    } else if (item.actionType === 'production') {
                      if (onNavigate) onNavigate('mrp-input-usage');
                      else setDrilldownType('production');
                    } else if (item.actionType === 'delivery') {
                      setDrilldownType('delivery');
                    } else if (item.actionType === 'inspection') {
                      setDrilldownType('inspection');
                    } else if (item.actionType === 'defects') {
                      if (onNavigate) onNavigate('mrp-input-defects');
                      else setDrilldownType('defects');
                    } else {
                      setSelectedFormulaRow(item.id);
                      setDrilldownType('formula');
                    }
                  }}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="text-center font-mono font-bold text-slate-400 text-[10px]">
                    {item.id}
                  </td>
                  <td className="font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                    {item.value}
                  </td>
                  <td>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium ${
                        item.sourceType === 'actual-inputs'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : item.sourceType === 'production'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : item.sourceType === 'delivery'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.sourceType === 'inspection'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : item.sourceType === 'defects'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {item.sourceLabel}
                    </Badge>
                  </td>
                  <td className="text-[11px] text-slate-500 hidden md:table-cell">
                    {item.sourceDesc}
                  </td>
                  <td className="text-right pr-4">
                    <span className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-end gap-1">
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SECTION 12 & 13: Read-Only Authoritative 23-Row Master Grid (Days 1–31) */}
      <Card className="overflow-hidden shadow-xs border-slate-200">
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Authoritative 23-Row Actual MRP Master Ledger (Days 1–31)
            </span>
            <span className="text-[11px] text-slate-500 ml-2">
              (Read-Only System Calculations. Click any day column to load that date into the audit checklist).
            </span>
          </div>
          <Badge variant="outline" className="bg-white text-[10px] font-mono text-slate-600">
            Formula Verified (Excel vFinal)
          </Badge>
        </div>

        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="mrp-table w-full text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="row-label min-w-[200px] sm:min-w-[280px] p-2 sm:p-2.5 text-left sticky left-0 bg-slate-100 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="text-slate-900 font-bold text-xs flex items-center justify-between">
                    <span>Component {activeComponent} Actual Rows</span>
                    <Badge variant="outline" className="bg-white text-[9px] font-mono">
                      {currentMonth}
                    </Badge>
                  </div>
                </th>
                {actualRows.map((r) => {
                  const isSelected = r.day === selectedDay;
                  const isToday = r.day === currentDay;
                  const hasOverride = !!overridesForComp[r.day];
                  return (
                    <th
                      key={r.day}
                      onClick={() => setSelectedDay(r.day)}
                      className={`text-center min-w-[60px] sm:min-w-[65px] p-1.5 cursor-pointer hover:bg-slate-200 border-l border-slate-200 ${
                        isSelected ? 'bg-blue-100 text-blue-950 font-black border-x-2 border-blue-500' : isToday ? 'bg-blue-50/60 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold">D{r.day}</span>
                        {hasOverride && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                      </div>
                      <div className="text-[9px] font-normal text-slate-400">
                        08/{String(r.day).padStart(2, '0')}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* Row 16: Actual Beginning Inventory */}
              <tr className="border-b border-slate-200 bg-white hover:bg-slate-50/50">
                <td className="row-label sticky left-0 bg-white font-medium text-slate-700 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R16</span>
                    <span className="truncate">📦 Actual Beginning Inventory</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono text-slate-700 border-l border-slate-200 ${r.day === selectedDay ? 'bg-blue-50 font-bold' : ''}`}>
                    {r.beginningInventory !== null ? r.beginningInventory.toLocaleString() : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 17: Actual Beginning Safety Stock */}
              <tr className="border-b border-slate-200 bg-slate-50/20 hover:bg-slate-100/40">
                <td className="row-label sticky left-0 bg-slate-50/95 font-medium text-slate-700 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R17</span>
                    <span className="truncate">🛡️ Actual Beginning Safety Stock</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono text-slate-600 border-l border-slate-200 ${r.day === selectedDay ? 'bg-blue-50 font-bold' : ''}`}>
                    {r.beginningSafetyStock !== null ? r.beginningSafetyStock : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 18: Actual Effective Usage for the Day */}
              <tr className="border-b border-slate-200 bg-blue-50/10 hover:bg-blue-50/30">
                <td className="row-label sticky left-0 bg-blue-50/95 font-semibold text-blue-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-blue-500 font-bold">R18</span>
                    <span className="truncate">🏭 Actual Effective Usage</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono font-bold text-blue-800 border-l border-slate-200 ${r.day === selectedDay ? 'bg-blue-100 text-blue-950 font-black' : ''}`}>
                    {r.actualUsage !== null ? r.actualUsage : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 19: From the Main Stock */}
              <tr className="border-b border-slate-200 bg-white hover:bg-slate-50/50">
                <td className="row-label sticky left-0 bg-white font-medium text-slate-700 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R19</span>
                    <span className="truncate">📦 From the Main Stock</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono text-slate-700 border-l border-slate-200 ${r.day === selectedDay ? 'bg-blue-50' : ''}`}>
                    {r.fromMainStock !== null ? r.fromMainStock : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 20: From the Safety Stock */}
              <tr className="border-b border-slate-200 bg-slate-50/20 hover:bg-slate-100/40">
                <td className="row-label sticky left-0 bg-slate-50/95 font-medium text-slate-700 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R20</span>
                    <span className="truncate">🛡️ From the Safety Stock</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${r.day === selectedDay ? 'bg-blue-50' : ''} ${r.fromSafetyStock && r.fromSafetyStock > 0 ? 'text-amber-800 font-bold bg-amber-50/60' : 'text-slate-400'}`}>
                    {r.fromSafetyStock !== null ? r.fromSafetyStock : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 21: Remaining Inventory After Usage */}
              <tr className="border-b border-slate-200 bg-teal-50/10 hover:bg-teal-50/30">
                <td className="row-label sticky left-0 bg-teal-50/95 font-medium text-teal-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-teal-500 font-bold">R21</span>
                    <span className="truncate">📉 Remaining Inventory After Usage</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono font-semibold text-teal-800 border-l border-slate-200 ${r.day === selectedDay ? 'bg-blue-50' : ''}`}>
                    {r.remainingInventory !== null ? r.remainingInventory : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 22: Inventory Shortage for Today */}
              <tr className="border-b border-slate-200 bg-rose-50/10 hover:bg-rose-50/30">
                <td className="row-label sticky left-0 bg-rose-50/95 font-medium text-rose-950 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-rose-500 font-bold">R22</span>
                    <span className="truncate">🚨 Inventory Shortage for Today</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${r.inventoryShortage && r.inventoryShortage > 0 ? 'bg-rose-100 text-rose-800 font-black' : 'text-slate-400'}`}>
                    {r.inventoryShortage && r.inventoryShortage > 0 ? `-${r.inventoryShortage}` : '0'}
                  </td>
                ))}
              </tr>

              {/* Row 23: Order Code */}
              <tr className="border-b border-slate-200 bg-indigo-50/10 hover:bg-indigo-50/30">
                <td className="row-label sticky left-0 bg-indigo-50/95 font-medium text-indigo-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-indigo-500 font-bold">R23</span>
                    <span className="truncate">🧾 Order Code</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono font-bold text-indigo-800 border-l border-slate-200">
                    {r.orderCode !== '—' && r.orderCode ? (
                      <span className="px-1 py-0.5 bg-indigo-100 text-indigo-900 font-mono rounded text-[9px]">
                        {r.orderCode}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 24: Actual Receiving Amount */}
              <tr className="border-b border-slate-200 bg-emerald-50/10 hover:bg-emerald-50/35">
                <td className="row-label sticky left-0 bg-emerald-50/95 font-semibold text-emerald-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-emerald-500 font-bold">R24</span>
                    <span className="truncate">🚚 Actual Receiving Amount</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono font-bold border-l border-slate-200 ${r.actualReceiving && r.actualReceiving > 0 ? 'bg-emerald-100 text-emerald-800 font-black' : 'text-slate-400'}`}>
                    {r.actualReceiving !== null ? (r.actualReceiving > 0 ? `+${r.actualReceiving}` : r.actualReceiving) : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 25: As the Planned Order */}
              <tr className="border-b border-slate-200 bg-white hover:bg-slate-50/50">
                <td className="row-label sticky left-0 bg-white font-medium text-slate-700 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R25</span>
                    <span className="truncate">📅 As the Planned Order</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono text-slate-600 border-l border-slate-200">
                    {r.asPlannedOrder !== null ? r.asPlannedOrder : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 26: As the Safety Stock Requirement */}
              <tr className="border-b border-slate-200 bg-amber-50/5 hover:bg-amber-50/20">
                <td className="row-label sticky left-0 bg-amber-50/90 font-medium text-amber-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-amber-500 font-bold">R26</span>
                    <span className="truncate">🛡️ As Safety Stock Requirement</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${r.safetyStockRequirement && r.safetyStockRequirement > 0 ? 'bg-amber-100/60 font-bold text-amber-800' : 'text-slate-400'}`}>
                    {r.safetyStockRequirement !== null ? r.safetyStockRequirement : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 27: Quality Fails Total */}
              <tr className="border-b border-slate-200 bg-rose-50/20 hover:bg-rose-50/40">
                <td className="row-label sticky left-0 bg-rose-100 font-bold text-rose-950 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-rose-600 font-bold">R27</span>
                    <span className="truncate">🔍 Quality Fails Total</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono font-black border-l border-slate-200 ${r.qualityFailsTotal && r.qualityFailsTotal > 0 ? 'bg-rose-100 text-rose-800' : 'text-slate-400'}`}>
                    {r.qualityFailsTotal !== null ? r.qualityFailsTotal : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 28: Lot Quality Failures */}
              <tr className="border-b border-slate-200 bg-white hover:bg-slate-50/50">
                <td className="row-label sticky left-0 bg-white font-medium text-slate-600 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R28</span>
                    <span className="truncate">🔴 Lot Quality Failures</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${r.lotQualityFails && r.lotQualityFails > 0 ? 'text-red-700 font-semibold' : 'text-slate-400'}`}>
                    {r.lotQualityFails !== null ? r.lotQualityFails : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 29: Warehouse Quality Failures */}
              <tr className="border-b border-slate-200 bg-slate-50/20 hover:bg-slate-100/40">
                <td className="row-label sticky left-0 bg-slate-50/95 font-medium text-slate-600 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R29</span>
                    <span className="truncate">🏬 Warehouse Quality Failures</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${r.warehouseQualityFails && r.warehouseQualityFails > 0 ? 'text-red-700 font-semibold' : 'text-slate-400'}`}>
                    {r.warehouseQualityFails !== null ? r.warehouseQualityFails : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 30: Assembly Quality Failures */}
              <tr className="border-b border-slate-200 bg-white hover:bg-slate-50/50">
                <td className="row-label sticky left-0 bg-white font-medium text-slate-600 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R30</span>
                    <span className="truncate">🏭 Assembly Quality Failures</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${r.assemblyQualityFails && r.assemblyQualityFails > 0 ? 'text-red-700 font-semibold' : 'text-slate-400'}`}>
                    {r.assemblyQualityFails !== null ? r.assemblyQualityFails : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 31: Safety Stock Quality Failures */}
              <tr className="border-b border-slate-200 bg-slate-50/20 hover:bg-slate-100/40">
                <td className="row-label sticky left-0 bg-slate-50/95 font-medium text-slate-600 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R31</span>
                    <span className="truncate">🛡️ Safety Stock Quality Failures</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${r.safetyStockQualityFails && r.safetyStockQualityFails > 0 ? 'text-red-700 font-semibold bg-red-50/30' : 'text-slate-400'}`}>
                    {r.safetyStockQualityFails !== null ? r.safetyStockQualityFails : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 32: Remaining Safety Stock */}
              <tr className="border-b border-slate-200 bg-amber-50/10 hover:bg-amber-50/30 font-semibold text-amber-900">
                <td className="row-label sticky left-0 bg-amber-100 font-bold text-amber-950 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-amber-600 font-bold">R32</span>
                    <span className="truncate">🛡️ Remaining Safety Stock</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${r.day === selectedDay ? 'bg-blue-50 font-bold' : ''}`}>
                    {r.remainingSafetyStock !== null ? r.remainingSafetyStock : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 33: Safety Stock Shortage */}
              <tr className="border-b border-slate-200 bg-rose-50/5 hover:bg-rose-50/20 text-rose-900 font-medium">
                <td className="row-label sticky left-0 bg-rose-100 font-bold text-rose-950 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-rose-600 font-bold">R33</span>
                    <span className="truncate">🚨 Safety Stock Shortage</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${r.safetyStockShortage && r.safetyStockShortage > 0 ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-400'}`}>
                    {r.safetyStockShortage !== null ? r.safetyStockShortage : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 34: Safety Stock Cycle Day */}
              <tr className="border-b border-slate-200 bg-white hover:bg-slate-50/50">
                <td className="row-label sticky left-0 bg-white font-medium text-slate-700 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R34</span>
                    <span className="truncate">🔄 Safety Stock Cycle Day</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono text-slate-600 border-l border-slate-200">
                    {r.safetyStockCycleDay !== null ? r.safetyStockCycleDay : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 35: Need to Receive Shortage Safety Stock Within */}
              <tr className="border-b border-slate-200 bg-slate-50/20 hover:bg-slate-100/40">
                <td className="row-label sticky left-0 bg-slate-50/95 font-medium text-slate-700 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-400 font-bold">R35</span>
                    <span className="truncate">⏳ Receive Shortage Within (Days)</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono border-l border-slate-200 ${r.receiveShortageWithin && r.receiveShortageWithin > 0 ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-slate-400'}`}>
                    {r.receiveShortageWithin !== null ? (r.receiveShortageWithin > 0 ? `${r.receiveShortageWithin} days` : '0') : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 36: Updated Receiving Plan */}
              <tr className="border-b border-indigo-200 bg-indigo-50/5 hover:bg-indigo-50/15">
                <td className="row-label sticky left-0 bg-indigo-50 font-bold text-indigo-950 p-2 z-10 border-r border-indigo-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-indigo-600 font-bold">R36</span>
                    <span className="truncate">🔄 Updated Receiving Plan</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className="text-center p-1.5 sm:p-2 value-mono font-bold text-indigo-900 border-l border-slate-200">
                    {r.updatedReceivingPlan !== null ? r.updatedReceivingPlan : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 37: Actual Ending Inventory */}
              <tr className="border-b-2 border-slate-400 bg-slate-100 hover:bg-slate-200/60 font-black">
                <td className="row-label sticky left-0 bg-slate-200 font-black text-slate-900 p-2.5 z-10 border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-slate-600 font-bold">R37</span>
                    <span className="text-xs sm:text-sm truncate">📦 Actual Ending Inventory</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2.5 value-mono font-black text-xs sm:text-sm border-l border-slate-300 ${r.day === selectedDay ? 'bg-blue-100 text-blue-950' : 'text-slate-900'}`}>
                    {r.actualEndingInventory !== null ? r.actualEndingInventory.toLocaleString() : '—'}
                  </td>
                ))}
              </tr>

              {/* Row 38: Storage Issues Warning */}
              <tr className="bg-amber-50/10 hover:bg-amber-50/30 border-b border-slate-200">
                <td className="row-label sticky left-0 bg-amber-50/95 font-semibold text-amber-900 p-2 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-[10px] font-mono text-amber-600 font-bold">R38</span>
                    <span className="truncate">🏬 Storage Issues Warning</span>
                  </div>
                </td>
                {actualRows.map((r) => (
                  <td key={r.day} className={`text-center p-1.5 sm:p-2 value-mono font-bold border-l border-slate-200 ${r.storageIssue === 'Yes' ? 'bg-amber-200 text-amber-900 font-black' : 'text-slate-300'}`}>
                    {r.storageIssue}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* DRILLDOWN MODAL: Production Event Details */}
      {drilldownType === 'production' && (
        <Dialog open={true} onOpenChange={() => setDrilldownType(null)}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <DialogHeader className="bg-blue-900 text-white p-4">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                <Factory className="w-4 h-4 text-blue-300" />
                <span>Daily Production Log: {selectedDateStr}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-200">
                Shop-floor model outputs feeding Actual MRP component usage.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 space-y-3 text-xs">
              {dayProdRecord ? (
                <>
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-600">Total Finished Output:</span>
                    <strong className="text-base text-blue-700 value-mono font-black">{dayProdRecord.totalFinalProduction} units</strong>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Model Output Breakdown</span>
                    <div className="grid grid-cols-3 gap-2">
                      {dayProdRecord.outputs.map((o) => (
                        <div key={o.model} className="p-1.5 bg-slate-50 rounded border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-500 block">{o.model}</span>
                          <strong className="font-mono text-slate-800">{o.quantity}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 bg-blue-50/50 rounded border border-blue-200 space-y-1">
                    <span className="text-[10px] font-bold text-blue-900 uppercase">Automatic Component Usage Derived:</span>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 block">AA (1×)</span>
                        <strong className="font-mono text-slate-800">{dayProdRecord.usageAA}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">BB (1×)</span>
                        <strong className="font-mono text-slate-800">{dayProdRecord.usageBB}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">CC (3×)</span>
                        <strong className="font-mono text-amber-700 font-bold">{dayProdRecord.usageCC}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 bg-amber-50 rounded border border-amber-200 flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-amber-900">Safety Stock Drawn:</span>
                    <span className="font-mono font-bold text-amber-800">
                      {dayProdRecord.safetyStockUsed
                        ? `AA: ${dayProdRecord.safetyStockUsageAA || 0}, BB: ${dayProdRecord.safetyStockUsageBB || 0}, CC: ${dayProdRecord.safetyStockUsageCC || 0}`
                        : 'None (0 units)'}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-100">
                    <span>Logged by: {dayProdRecord.enteredBy}</span>
                    <span>Status: {isConfirmedDay ? '✅ EOD Confirmed' : '⚠️ Pending Confirmation'}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  No production output recorded for {selectedDateStr}.
                </div>
              )}
            </div>

            <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200">
              <Button size="sm" variant="outline" onClick={() => setDrilldownType(null)} className="text-xs">
                Close
              </Button>
              {onNavigate && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDrilldownType(null);
                    onNavigate('daily-production');
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Edit in Production Screen
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DRILLDOWN MODAL: Delivery Logistics Details */}
      {drilldownType === 'delivery' && (
        <Dialog open={true} onOpenChange={() => setDrilldownType(null)}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <DialogHeader className="bg-emerald-900 text-white p-4">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                <Truck className="w-4 h-4 text-emerald-300" />
                <span>Supplier Delivery Shipment Details</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-200">
                Logistics manifest and arrived quantity tracking.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 space-y-3 text-xs">
              {dayDelivery ? (
                <>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Delivery Number</span>
                      <strong className="text-slate-800">{dayDelivery.businessDeliveryNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Order Code</span>
                      <strong className="text-blue-700 font-mono">{dayDelivery.orderCode || '—'}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Component</span>
                      <strong className="text-slate-800">{dayDelivery.componentCode}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Planned Qty</span>
                      <strong className="text-slate-600 font-mono">{dayDelivery.plannedQuantity}</strong>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 block font-semibold">Arrived Qty</span>
                      <strong className="text-emerald-800 font-mono font-bold text-sm">+{dayDelivery.actualQuantity || dayDelivery.updatedQuantity}</strong>
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 rounded border border-slate-200 space-y-1">
                    <span className="text-[10px] text-slate-400 block">Carrier & Dispatch</span>
                    <div className="flex justify-between text-slate-700">
                      <span>Vehicle / Lorry: <strong>{dayDelivery.vehicleRef || 'ABC-1234'}</strong></span>
                      <span>Arrival Time: <strong>{dayDelivery.arrivalTime || '09:20 AM'}</strong></span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-900">
                    <strong>Quality Status:</strong> {dayDelivery.status === 'Inspected - Accepted' ? '✅ AQL Accepted into usable MRP stock.' : dayDelivery.status === 'Inspected - Rejected' ? '❌ Rejected by QC (withheld in quarantined stock).' : '⚠️ Arrived at bay. Awaiting QC lot inspection before release.'}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  No delivery shipment recorded for {selectedDateStr}.
                </div>
              )}
            </div>

            <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200">
              <Button size="sm" variant="outline" onClick={() => setDrilldownType(null)} className="text-xs">
                Close
              </Button>
              {onNavigate && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDrilldownType(null);
                    onNavigate('supplier-deliveries');
                  }}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Open Deliveries View
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DRILLDOWN MODAL: Lot Inspection Report */}
      {drilldownType === 'inspection' && (
        <Dialog open={true} onOpenChange={() => setDrilldownType(null)}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <DialogHeader className="bg-purple-900 text-white p-4">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="w-4 h-4 text-purple-300" />
                <span>AQL Lot Inspection Record</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-purple-200">
                ANSI/ASQ Z1.4-2003 verification report feeding Lot Defects (Row 28).
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 space-y-3 text-xs">
              {dayInspection ? (
                <>
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Inspection ID</span>
                      <strong className="text-slate-800">{dayInspection.id}</strong>
                    </div>
                    <Badge variant="outline" className={dayInspection.finalDecision === 'Accepted' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold' : 'bg-rose-50 text-rose-800 border-rose-200 font-bold'}>
                      {dayInspection.finalDecision}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Lot Size</span>
                      <strong className="font-mono text-slate-800">{dayInspection.lotSize}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Sample (n)</span>
                      <strong className="font-mono text-slate-800">{dayInspection.sampleSizeStage1}</strong>
                    </div>
                    <div className="p-2 bg-rose-50 rounded border border-rose-200">
                      <span className="text-[10px] text-rose-700 block font-semibold">Defects Found</span>
                      <strong className="font-mono text-rose-800 font-bold">{dayInspection.totalDefectCount}</strong>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Defects Identified in Sample:</span>
                    <div className="space-y-1">
                      {dayInspection.defects.filter((d) => d.count > 0).map((d) => (
                        <div key={d.id} className="p-1.5 bg-slate-50 rounded border border-slate-200 flex justify-between items-center text-[11px]">
                          <span>{d.reason}</span>
                          <span className="font-mono font-bold text-rose-700">+{d.count} pcs</span>
                        </div>
                      ))}
                      {dayInspection.defects.filter((d) => d.count > 0).length === 0 && (
                        <div className="p-2 bg-emerald-50 text-emerald-800 rounded text-center">
                          Zero defects recorded (Clean Lot)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-100">
                    <span>Inspector: {dayInspection.inspectorName}</span>
                    <span>AQL: {dayInspection.aql} (Level II)</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  No lot inspection record filed for {selectedDateStr}.
                </div>
              )}
            </div>

            <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200">
              <Button size="sm" variant="outline" onClick={() => setDrilldownType(null)} className="text-xs">
                Close
              </Button>
              {onNavigate && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDrilldownType(null);
                    onNavigate('inspection-history');
                  }}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Open Quality Inspections
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DRILLDOWN MODAL: Production Defect Events List */}
      {drilldownType === 'defects' && (
        <Dialog open={true} onOpenChange={() => setDrilldownType(null)}>
          <DialogContent className="max-w-lg p-0 overflow-hidden">
            <DialogHeader className="bg-amber-900 text-white p-4">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <span>Production Defect Events: {selectedDateStr}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-amber-200">
                Line scrap events categorized into Warehouse (R29), Assembly (R30), and Safety Stock (R31).
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 space-y-3 text-xs max-h-[60vh] overflow-y-auto">
              {dayDefects.length > 0 ? (
                dayDefects.map((def) => (
                  <div key={def.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 text-[10px]">{def.timestamp}</span>
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${def.sourceCategory === 'Warehouse Defect' ? 'bg-amber-100 text-amber-900 border-amber-300' : def.sourceCategory === 'Safety Stock Defect' ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-blue-100 text-blue-900 border-blue-300'}`}>
                          {def.sourceCategory || 'Assembly Defect'}
                        </Badge>
                      </div>
                      <span className="font-mono font-bold text-rose-700 text-xs">+{def.quantity} units</span>
                    </div>
                    <div className="text-slate-800 font-semibold">{def.defectReason}</div>
                    {def.notes && <div className="text-[10px] text-slate-500 italic">Notes: {def.notes}</div>}
                    <div className="text-[10px] text-slate-400 pt-0.5 flex justify-between">
                      <span>Logged by: {def.enteredBy}</span>
                      <span>Status: {def.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500">
                  No production defect events logged for {selectedDateStr}.
                </div>
              )}
            </div>

            <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200">
              <Button size="sm" variant="outline" onClick={() => setDrilldownType(null)} className="text-xs">
                Close
              </Button>
              {onNavigate && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDrilldownType(null);
                    onNavigate('daily-production');
                  }}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Log New Defect in Production
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DRILLDOWN MODAL: System Formula Details */}
      {drilldownType === 'formula' && (
        <Dialog open={true} onOpenChange={() => setDrilldownType(null)}>
          <DialogContent className="max-w-md p-4 space-y-3 text-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>Authoritative Excel Formula: {selectedFormulaRow}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Deterministic mathematical calculation from The Final One Final.xlsx
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-slate-700">
              <p className="font-semibold text-slate-900">
                Row {selectedFormulaRow} is calculated automatically by the core MRP engine and cannot be edited manually on the shop floor.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600">
                To adjust this realized value, correct the underlying operational event (such as updating the daily production output, revising received delivery quantities, or correcting inspection defect counts).
              </p>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setDrilldownType(null)} className="text-xs">
                Understood
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
