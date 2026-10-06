import React, { useMemo } from 'react';
import {
  BarChart3,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';

export const QualityAnalyticsView: React.FC = () => {
  const { inspections } = useApp();

  // Defect reasons aggregation
  const defectReasonsData = useMemo(() => {
    const counts: Record<string, number> = {};
    inspections.forEach((insp) => {
      insp.defects.forEach((d) => {
        counts[d.reason] = (counts[d.reason] || 0) + d.count;
      });
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [inspections]);

  // Acceptance rate by component
  const componentQualityData = useMemo(() => {
    const comps = ['AA', 'BB', 'CC'];
    return comps.map((c) => {
      const match = inspections.filter((i) => i.componentCode === c);
      const acc = match.filter((i) => i.finalDecision === 'Accepted').length;
      const rej = match.filter((i) => i.finalDecision === 'Rejected').length;
      const total = match.length;
      const rate = total > 0 ? ((acc / total) * 100).toFixed(1) : '100.0';

      return {
        component: c,
        Accepted: acc,
        Rejected: rej,
        PassRate: parseFloat(rate),
      };
    });
  }, [inspections]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Quality Analytics & Defect Intelligence</span>
          </h2>
          <p className="text-xs text-slate-500">
            Incoming lot conformance trends, defect category Pareto analysis, and supplier quality metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Component Pass Rates */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Inbound Acceptance vs Rejection by Component
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={componentQualityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="component" stroke="#64748b" tick={{ fontSize: 11 }} />
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
                <Bar dataKey="Accepted" fill="#059669" name="Accepted Lots" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rejected" fill="#dc2626" name="Rejected Lots" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Defect Pareto Bar Chart */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Pareto Analysis: Defect Causes
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defectReasonsData.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 10 }} width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="value" fill="#d97706" name="Defect Occurrences" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
