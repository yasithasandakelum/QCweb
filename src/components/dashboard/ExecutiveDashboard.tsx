import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Factory,
  FileSpreadsheet,
  FlaskConical,
  Package,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ComponentCode } from '../../types';

import { PeriodSelector } from '../common/PeriodSelector';

interface ExecutiveDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenTestSuite: () => void;
  onOpenNewInspection: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  onNavigate,
  onOpenTestSuite,
  onOpenNewInspection,
}) => {
  const {
    inspections,
    rejectedLots,
    urgentReplenishments,
    productionRecords,
    monthlyPlans,
    currentMonth,
    currentDay,
    systemConfig,
    activeComponent,
    setActiveComponent,
    defectEvents,
  } = useApp();

  const plan = monthlyPlans[currentMonth];

  // Current stock levels on active day
  const aaActual = plan?.actualRows?.['AA'] || [];
  const bbActual = plan?.actualRows?.['BB'] || [];
  const ccActual = plan?.actualRows?.['CC'] || [];

  const currentIdx = Math.max(0, currentDay - 1);
  const activeActualRows = plan?.actualRows?.[activeComponent] || [];
  const activePlannedRows = plan?.plannedRows?.[activeComponent] || [];

  const activeStock =
    activeActualRows[currentIdx]?.actualEndingInventory ??
    systemConfig.defaultOpeningInventory;
  const activeSafetyStock = activeActualRows[currentIdx]?.safetyStock ?? 0;
  const isSafetyStockLow =
    activeStock !== null && activeSafetyStock > 0 && activeStock < activeSafetyStock;

  const totalInspections = inspections.length;
  const acceptedInspections = inspections.filter((i) => i.finalDecision === 'Accepted').length;
  const passRate =
    totalInspections > 0
      ? ((acceptedInspections / totalInspections) * 100).toFixed(1)
      : '100.0';

  const totalGoodUnits = productionRecords.reduce(
    (sum, p) => sum + p.totalFinalProduction,
    0
  );

  const openReplacements = urgentReplenishments.filter(
    (u) => u.status !== 'Completed' && u.status !== 'Cancelled'
  );
  const latestReplacement = openReplacements[0];

  // 7-day snapshot range (centered around currentDay, e.g. Day 10 to Day 16)
  const startDay = Math.max(1, Math.min(25, currentDay - 3));
  const snapshotDays = Array.from({ length: 7 }, (_, i) => startDay + i).filter((d) => d <= 31);

  return (
    <div className="space-y-4">
      {/* View Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Executive Dashboard</h2>
        <PeriodSelector />
      </div>

      {/* TOP KPI CARDS - Responsive 2-col on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Safety Stock */}
        <div
          onClick={() => onNavigate('mrp-daily-actual')}
          className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            Safety Stock - {activeComponent}
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 value-mono">
                {activeStock ?? '—'}
              </span>
              {isSafetyStockLow ? (
                <span className="text-xs font-bold text-red-600 mb-0.5">
                  ▼ LOW (Target: {activeSafetyStock})
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-600 mb-0.5">
                  ▲ SAFE (Target: {activeSafetyStock})
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${isSafetyStockLow ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{
                width: `${Math.min(
                  100,
                  activeSafetyStock > 0
                    ? Math.round(((activeStock ?? 0) / activeSafetyStock) * 100)
                    : 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* KPI 2: Urgent Replacement */}
        <div
          onClick={() => onNavigate('urgent-replenishments')}
          className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            Urgent Replacements
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 value-mono">
                {latestReplacement ? latestReplacement.replacementQuantity : '0'}
              </span>
              {latestReplacement ? (
                <span className="text-xs font-bold text-amber-600 mb-0.5 truncate max-w-[140px]">
                  Lot {latestReplacement.replenishmentNumber}
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-500 mb-0.5">None Pending</span>
              )}
            </div>
          </div>
          <div className="text-[10px] mt-2 text-slate-500 font-medium">
            {latestReplacement ? `Target: ${latestReplacement.targetDate}` : '0 Expedited Orders'}
          </div>
        </div>

        {/* KPI 3: Quality Acceptance */}
        <div
          onClick={() => onNavigate('inspection-history')}
          className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            Quality Acceptance
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 value-mono">{passRate}%</span>
              <span className="text-xs font-bold text-emerald-600 mb-0.5">AQL 2.5 Norm</span>
            </div>
          </div>
          <div className="text-[10px] mt-2 text-slate-500 font-medium">
            {acceptedInspections} / {totalInspections} Inspections Accepted
          </div>
        </div>

        {/* KPI 4: Production Output */}
        <div
          onClick={() => onNavigate('daily-production')}
          className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            Production Output
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 value-mono">
                {totalGoodUnits.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500 mb-0.5">Units / Month</span>
            </div>
          </div>
          <div className="text-[10px] mt-2 text-slate-500 font-medium">
            Models A–F Assembled
          </div>
        </div>
      </div>

      {/* MRP 7-DAY OPERATIONAL SNAPSHOT TABLE */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col overflow-hidden">
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              7-Day Operational Snapshot ({activeComponent} — Days {snapshotDays[0]} to{' '}
              {snapshotDays[snapshotDays.length - 1]})
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-blue-600 font-bold">Variance View: ACTIVE</span>
            <button
              onClick={() => onNavigate('mrp-daily-actual')}
              className="text-[10px] font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1"
            >
              <span>Full 31-Day Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="mrp-table w-full">
            <thead>
              <tr>
                <th className="row-label">Metric</th>
                {snapshotDays.map((dayNum) => {
                  const isToday = dayNum === currentDay;
                  return (
                    <th
                      key={dayNum}
                      className={
                        isToday
                          ? 'bg-blue-50 border-x-2 border-blue-300 font-bold text-blue-900 text-center'
                          : 'text-center'
                      }
                    >
                      Day {dayNum} {isToday ? '(TODAY)' : ''}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Planned Beginning Inv */}
              <tr className="planned">
                <td className="row-label">Plan Beginning Inv.</td>
                {snapshotDays.map((d) => (
                  <td key={d} className="value-mono">
                    {activePlannedRows[d - 1]?.beginningInventory ?? '—'}
                  </td>
                ))}
              </tr>

              {/* Plan Usage */}
              <tr className="planned">
                <td className="row-label">Plan Usage (Model A-F)</td>
                {snapshotDays.map((d) => (
                  <td key={d} className="value-mono">
                    {activePlannedRows[d - 1]?.plannedUsage ?? '—'}
                  </td>
                ))}
              </tr>

              {/* Required Receiving */}
              <tr className="planned font-bold text-blue-800">
                <td className="row-label font-bold text-blue-800">Required Receiving</td>
                {snapshotDays.map((d) => (
                  <td key={d} className="value-mono text-blue-700 font-semibold">
                    {activePlannedRows[d - 1]?.requiredReceiving ?? '0'}
                  </td>
                ))}
              </tr>

              {/* SECTION SEPARATOR */}
              <tr className="border-t-2 border-slate-300">
                <td
                  colSpan={snapshotDays.length + 1}
                  className="bg-slate-200 !text-left !font-bold py-1 px-4 !text-[10px] tracking-widest text-slate-700"
                >
                  ACTUAL DAILY EXECUTION
                </td>
              </tr>

              {/* Actual Beginning Inv */}
              <tr className="actual">
                <td className="row-label">Actual Beginning Inv.</td>
                {snapshotDays.map((d) => {
                  const act = activeActualRows[d - 1];
                  const isPastOrToday = d <= currentDay;
                  return (
                    <td
                      key={d}
                      className={`value-mono ${
                        d === currentDay ? 'bg-blue-100/60 font-bold' : ''
                      } ${!isPastOrToday ? 'text-slate-400' : ''}`}
                    >
                      {isPastOrToday ? act?.beginningInventory ?? '—' : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* Actual Receiving */}
              <tr className="actual">
                <td className="row-label">Actual Receiving</td>
                {snapshotDays.map((d) => {
                  const act = activeActualRows[d - 1];
                  const isPastOrToday = d <= currentDay;
                  return (
                    <td
                      key={d}
                      className={`value-mono font-medium ${
                        d === currentDay ? 'bg-blue-100/60' : ''
                      } ${!isPastOrToday ? 'text-slate-400' : ''}`}
                    >
                      {isPastOrToday ? act?.actualReceiving ?? 0 : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* Total Quality Fails */}
              <tr className="actual">
                <td className="row-label">Total Quality Fails</td>
                {snapshotDays.map((d) => {
                  const act = activeActualRows[d - 1];
                  const isPastOrToday = d <= currentDay;
                  const fails = act?.totalQualityFails ?? 0;
                  return (
                    <td
                      key={d}
                      className={`value-mono ${fails > 0 ? 'quality-fail' : 'text-slate-600'} ${
                        d === currentDay ? 'bg-blue-100/60 font-bold' : ''
                      } ${!isPastOrToday ? 'text-slate-400' : ''}`}
                    >
                      {isPastOrToday ? fails : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* Actual Ending Inv */}
              <tr className="actual font-bold">
                <td className="row-label font-bold text-slate-900">Actual Ending Inv.</td>
                {snapshotDays.map((d) => {
                  const act = activeActualRows[d - 1];
                  const isPastOrToday = d <= currentDay;
                  const isUnder =
                    isPastOrToday &&
                    act?.actualEndingInventory !== null &&
                    act?.safetyStock !== null &&
                    (act?.actualEndingInventory ?? 0) < (act?.safetyStock ?? 0);
                  return (
                    <td
                      key={d}
                      className={`value-mono font-bold ${
                        isUnder
                          ? 'text-red-600 bg-red-50'
                          : d === currentDay
                          ? 'bg-blue-100/60 text-blue-900'
                          : 'text-slate-900'
                      } ${!isPastOrToday ? 'text-slate-400 font-normal' : ''}`}
                    >
                      {isPastOrToday ? act?.actualEndingInventory ?? '—' : '—'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ALERTS & QUALITY LOGS / PRODUCTION DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quality Logs Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Quality Logs (Inbound Inspections)
            </h3>
            <button
              onClick={() => onNavigate('inspection-history')}
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              View All ({inspections.length})
            </button>
          </div>
          <div className="p-3 space-y-2.5 overflow-hidden flex-1">
            {inspections.slice(0, 3).map((insp) => {
              const isAccepted = insp.finalDecision === 'Accepted';
              return (
                <div
                  key={insp.id}
                  className={`flex gap-3 items-start border-l-2 ${
                    isAccepted ? 'border-green-500' : 'border-red-500'
                  } pl-3 py-1 bg-slate-50/50 rounded-r`}
                >
                  <div className={`p-1.5 rounded ${isAccepted ? 'bg-green-50' : 'bg-red-50'}`}>
                    {isAccepted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800">
                      LOT {insp.finalDecision.toUpperCase()}: {insp.deliveryNumber} (
                      {insp.lotSize} Units)
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      Component {insp.componentCode} | AQL {insp.aql} | Defects:{' '}
                      {insp.stage1DefectsCount} | {insp.samplingMethod}
                    </p>
                    <p className="text-[9px] mt-0.5 text-slate-400">
                      {insp.lotReceivedDate} - Inspector: {insp.inspectorName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Production Dashboard Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Production Floor Status
            </h3>
            <button
              onClick={() => onNavigate('daily-production')}
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Daily Production View
            </button>
          </div>
          <div className="p-4 flex flex-col justify-center h-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'Model A', output: 100, target: 120, color: 'bg-blue-600' },
                { name: 'Model B', output: 80, target: 80, color: 'bg-emerald-600' },
                { name: 'Model C', output: 45, target: 50, color: 'bg-blue-600' },
                { name: 'Model D', output: 60, target: 70, color: 'bg-amber-600' },
                { name: 'Model E', output: 50, target: 50, color: 'bg-emerald-600' },
                { name: 'Model F', output: 45, target: 45, color: 'bg-emerald-600' },
              ].map((m) => {
                const pct = Math.min(100, Math.round((m.output / m.target) * 100));
                return (
                  <div key={m.name} className="space-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-700">{m.name}</span>
                      <span className="value-mono text-slate-600 font-semibold">
                        {m.output} / {m.target} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className={`${m.color} h-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
