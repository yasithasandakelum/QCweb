import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { ComponentCode } from '../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PeriodSelector } from '../common/PeriodSelector';

export const PlannedVsActualView: React.FC = () => {
  const { monthlyPlans, currentMonth, activeComponent, setActiveComponent, currentDay } =
    useApp();

  const plan = monthlyPlans[currentMonth];
  const actualRows = plan?.actualRows?.[activeComponent] || [];
  const plannedRows = plan?.plannedRows?.[activeComponent] || [];

  // Chart data comparing Planned vs Actual Ending Inventory and Safety Stock
  const chartData = actualRows.map((act, i) => {
    const pl = plannedRows[i];
    return {
      day: `D${act.day}`,
      dayNum: act.day,
      PlannedEnding: pl?.plannedEndingInventory ?? null,
      ActualEnding: act.actualEndingInventory,
      SafetyStock: act.safetyStock,
      TotalScrap: act.totalQualityFails,
    };
  });

  // Calculate cumulative variances for past days
  const validDays = actualRows.slice(0, currentDay);
  const totalPlannedUsage = validDays.reduce((sum, _, i) => sum + (plannedRows[i]?.plannedUsage || 0), 0);
  const totalActualUsage = validDays.reduce((sum, r) => sum + (r.actualEffectiveUsage || 0), 0);
  const usageVariance = totalActualUsage - totalPlannedUsage;

  const totalPlannedRec = validDays.reduce(
    (sum, _, i) => sum + (plannedRows[i]?.supplierDeliveryPlan ?? plannedRows[i]?.finalDeliveryPlan ?? 0),
    0
  );
  const totalActualRec = validDays.reduce((sum, r) => sum + (r.actualReceiving || 0), 0);
  const receivingVariance = totalActualRec - totalPlannedRec;

  const totalScrap = validDays.reduce((sum, r) => sum + (r.totalQualityFails || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Planned vs Actual MRP Variance Matrix</span>
          </h2>
          <p className="text-xs text-slate-500">
            Compare monthly baseline forecast against actual shop-floor execution, scrap impact, and inventory variances.
          </p>
        </div>
        <PeriodSelector />
      </div>

      {/* Component Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          {(['AA', 'BB', 'CC'] as ComponentCode[]).map((code) => {
            const isActive = activeComponent === code;
            return (
              <Button
                key={code}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveComponent(code)}
                className="flex items-center gap-2"
              >
                <span>Component {code}</span>
              </Button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500">
          Comparing Through: <strong className="text-blue-600 font-bold">Day {currentDay}</strong> of 31
        </div>
      </div>

      {/* Variance Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
              Usage Variance (M-T-D)
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-2xl font-black value-mono ${
                  usageVariance > 0
                    ? 'text-amber-600'
                    : usageVariance < 0
                    ? 'text-emerald-600'
                    : 'text-slate-800'
                }`}
              >
                {usageVariance > 0 ? `+${usageVariance}` : usageVariance}
              </span>
              {usageVariance > 0 ? (
                <ArrowUpRight className="w-5 h-5 text-amber-600" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              Actual ({totalActualUsage}) vs Plan ({totalPlannedUsage})
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
              Receipts Variance (M-T-D)
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-2xl font-black value-mono ${
                  receivingVariance < 0 ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {receivingVariance > 0 ? `+${receivingVariance}` : receivingVariance}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Actual ({totalActualRec}) vs Plan ({totalPlannedRec})
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-red-200 bg-red-50/30">
          <CardContent className="p-4">
            <span className="text-[10px] text-red-700 block font-bold uppercase tracking-wider">
              Total Quality Fails (Scrap)
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-red-600 value-mono">-{totalScrap}</span>
            </div>
            <span className="text-[10px] text-red-600/80">Unplanned inventory deduction</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
              Day {currentDay} Stock Drift
            </span>
            <div className="flex items-center gap-2 mt-1">
              {actualRows[currentDay - 1] && plannedRows[currentDay - 1] ? (
                <span className="text-2xl font-black text-slate-800 value-mono">
                  {(actualRows[currentDay - 1].actualEndingInventory ?? 0) -
                    (plannedRows[currentDay - 1].plannedEndingInventory ?? 0) >
                  0
                    ? `+${
                        (actualRows[currentDay - 1].actualEndingInventory ?? 0) -
                        (plannedRows[currentDay - 1].plannedEndingInventory ?? 0)
                      }`
                    : (actualRows[currentDay - 1].actualEndingInventory ?? 0) -
                      (plannedRows[currentDay - 1].plannedEndingInventory ?? 0)}
                </span>
              ) : (
                <span className="text-2xl font-black text-slate-400 value-mono">0</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">Actual Ending vs Planned Ending</span>
          </CardContent>
        </Card>
      </div>

      {/* Recharts Trajectory Graph */}
      <Card className="p-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Ending Inventory Trajectory: Planned vs Actual vs Safety Stock
        </h3>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="PlannedEnding"
                stroke="#94a3b8"
                strokeDasharray="4 4"
                name="Planned Baseline Ending"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="SafetyStock"
                stroke="#d97706"
                name="Safety Stock (110%)"
                dot={false}
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey="ActualEnding"
                stroke="#2563eb"
                name="Actual Ending Inventory"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Variance Matrix Table */}
      <Card className="overflow-hidden shadow-xs border-slate-200">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
            Daily Variance Analysis (Days 1–{currentDay})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="mrp-table w-full">
            <thead>
              <tr>
                <th className="row-label">Day</th>
                <th className="text-center">Planned Usage</th>
                <th className="text-center">Actual Usage</th>
                <th className="text-center">Usage Var</th>
                <th className="text-center">Planned Rec</th>
                <th className="text-center">Actual Rec</th>
                <th className="text-center">Quality Fails</th>
                <th className="text-center">Planned End</th>
                <th className="text-center">Actual End</th>
                <th className="text-center">Ending Var</th>
                <th className="text-center">Safety Target</th>
              </tr>
            </thead>
            <tbody>
              {validDays.map((act, i) => {
                const pl = plannedRows[i];
                const uVar = (act.actualEffectiveUsage ?? 0) - (pl?.plannedUsage ?? 0);
                const rVar = (act.actualReceiving ?? 0) - (pl?.finalDeliveryPlan ?? 0);
                const eVar = (act.actualEndingInventory ?? 0) - (pl?.plannedEndingInventory ?? 0);
                const isUnder =
                  act.actualEndingInventory !== null &&
                  act.safetyStock !== null &&
                  act.actualEndingInventory < act.safetyStock;

                return (
                  <tr key={act.day} className="hover:bg-slate-50 text-slate-700">
                    <td className="row-label font-bold text-slate-900 font-sans">
                      Day {act.day} ({act.date})
                    </td>
                    <td className="text-center value-mono">{pl?.plannedUsage ?? '—'}</td>
                    <td className="text-center value-mono font-bold text-blue-700">
                      {act.actualEffectiveUsage ?? '—'}
                    </td>
                    <td
                      className={`text-center value-mono font-bold ${
                        uVar > 0 ? 'text-amber-600' : uVar < 0 ? 'text-emerald-600' : 'text-slate-500'
                      }`}
                    >
                      {uVar > 0 ? `+${uVar}` : uVar}
                    </td>
                    <td className="text-center value-mono">{pl?.finalDeliveryPlan ?? '—'}</td>
                    <td className="text-center value-mono font-bold text-emerald-700">
                      {act.actualReceiving ?? '—'}
                    </td>
                    <td className="text-center value-mono text-red-600 font-bold">
                      {act.totalQualityFails ?? 0}
                    </td>
                    <td className="text-center value-mono">{pl?.plannedEndingInventory ?? '—'}</td>
                    <td
                      className={`text-center value-mono font-bold ${
                        isUnder ? 'text-red-700 bg-red-100' : 'text-slate-900'
                      }`}
                    >
                      {act.actualEndingInventory ?? '—'}
                    </td>
                    <td
                      className={`text-center value-mono font-bold ${
                        eVar > 0 ? 'text-emerald-600' : eVar < 0 ? 'text-red-600' : 'text-slate-500'
                      }`}
                    >
                      {eVar > 0 ? `+${eVar}` : eVar}
                    </td>
                    <td className="text-center value-mono text-amber-700 font-bold">
                      {act.safetyStock ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
