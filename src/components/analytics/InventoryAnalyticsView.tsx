import React from 'react';
import { Package } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';

export const InventoryAnalyticsView: React.FC = () => {
  const { monthlyPlans, currentMonth } = useApp();

  const plan = monthlyPlans[currentMonth];
  const aaActual = plan?.actualRows?.['AA'] || [];
  const bbActual = plan?.actualRows?.['BB'] || [];
  const ccActual = plan?.actualRows?.['CC'] || [];

  const stockTrendData = aaActual.map((r, idx) => ({
    day: `D${r.day}`,
    AA_Stock: r.actualEndingInventory ?? (r as any).endingInventory ?? 0,
    BB_Stock: bbActual[idx]?.actualEndingInventory ?? (bbActual[idx] as any)?.endingInventory ?? 0,
    CC_Stock: ccActual[idx]?.actualEndingInventory ?? (ccActual[idx] as any)?.endingInventory ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Inventory Analytics & Stock Coverage</span>
          </h2>
          <p className="text-xs text-slate-500">
            Multi-component stock coverage, safety buffer health, and warehouse buffer dynamics.
          </p>
        </div>
      </div>

      {/* Stock Trajectory Graph */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Multi-Component Ending Stock Levels (AA, BB, CC)
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stockTrendData}>
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
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="AA_Stock"
                stroke="#2563eb"
                fill="#3b82f6"
                fillOpacity={0.15}
                name="AA (Outer Tub)"
              />
              <Area
                type="monotone"
                dataKey="BB_Stock"
                stroke="#059669"
                fill="#10b981"
                fillOpacity={0.15}
                name="BB (Inner Tub)"
              />
              <Area
                type="monotone"
                dataKey="CC_Stock"
                stroke="#d97706"
                fill="#f59e0b"
                fillOpacity={0.15}
                name="CC (Ridgeform)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
