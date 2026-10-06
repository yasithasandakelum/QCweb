import React from 'react';
import { Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PeriodSelector: React.FC = () => {
  const { currentMonth, setCurrentMonth } = useApp();
  const [year, month] = currentMonth.split('-');

  return (
    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
      <Calendar className="w-4 h-4 text-blue-600" />
      <span className="text-xs font-bold text-slate-700">Period:</span>
      
      <select
        value={month}
        onChange={(e) => setCurrentMonth(`${year}-${e.target.value}`)}
        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
      >
        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => {
          const date = new Date(2000, parseInt(m) - 1, 1);
          return (
            <option key={m} value={m}>
              {date.toLocaleString('default', { month: 'short' })}
            </option>
          );
        })}
      </select>

      <select
        value={year}
        onChange={(e) => setCurrentMonth(`${e.target.value}-${month}`)}
        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
      >
        {[2024, 2025, 2026, 2027, 2028].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
};
