import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
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

export const ProductionAnalyticsView: React.FC = () => {
  const { productionRecords, defectEvents } = useApp();

  // Model breakdown chart
  const modelOutputData = useMemo(() => {
    const totals: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    productionRecords.forEach((p) => {
      p.outputs.forEach((o) => {
        totals[o.model] = (totals[o.model] || 0) + o.quantity;
      });
    });

    return Object.entries(totals).map(([model, total]) => ({
      model: `Model ${model}`,
      Units: total,
    }));
  }, [productionRecords]);

  // Daily output trend
  const dailyOutputTrend = useMemo(() => {
    return productionRecords.map((p) => {
      const defectsCount = defectEvents
        .filter((d) => d.date === p.date)
        .reduce((sum, d) => sum + d.quantity, 0);

      return {
        date: p.date.substring(5),
        Output: p.totalFinalProduction,
        Defects: defectsCount,
      };
    });
  }, [productionRecords, defectEvents]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>Production Analytics & Scrap Yield</span>
          </h2>
          <p className="text-xs text-slate-500">
            Output volumes across product models A–F, daily throughput, and scrap yield trends.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Model Outputs Breakdown */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Total Finished Units by Model (A–F)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelOutputData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="model" stroke="#64748b" tick={{ fontSize: 11 }} />
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
                <Bar dataKey="Units" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Throughput vs Defects */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Daily Production Output vs Scrapped Defect Units
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyOutputTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
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
                <Line
                  type="monotone"
                  dataKey="Output"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Finished Units"
                />
                <Line
                  type="monotone"
                  dataKey="Defects"
                  stroke="#dc2626"
                  strokeWidth={2}
                  name="Scrapped Defect Units"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
