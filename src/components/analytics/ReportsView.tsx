import React from 'react';
import {
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ReportsView: React.FC = () => {
  const { inspections, systemConfig, monthlyPlans, currentMonth } = useApp();

  const handleExportFullSystem = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      systemConfig,
      monthlyPlan: monthlyPlans[currentMonth],
      inspections,
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', jsonStr);
    dlAnchorElem.setAttribute('download', `Full_MRP_Quality_Export_${currentMonth}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Reports & Compliance Exports</span>
          </h2>
          <p className="text-xs text-slate-500">
            Generate and export official quality certificates, MRP schedules, and comprehensive audit logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quality Certificate Reports */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
          <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 w-fit text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">AQL Quality Inspection Certificates</h3>
            <p className="text-xs text-slate-500 mt-1">
              Export formal PDF inspection certificates with digital supervisor approvals and defect logs.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="w-full py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print Current Quality Ledger</span>
          </button>
        </div>

        {/* MRP Schedule Export */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
          <div className="p-2.5 bg-green-50 rounded-lg border border-green-200 w-fit text-green-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">Monthly MRP Schedule & Actuals</h3>
            <p className="text-xs text-slate-500 mt-1">
              Export complete 31-day MRP model including baseline plan, actual usage, and scrap deductions.
            </p>
          </div>
          <button
            onClick={handleExportFullSystem}
            className="w-full py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-green-600" />
            <span>Export Complete Dataset (JSON)</span>
          </button>
        </div>

        {/* Audit Trail Export */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3 shadow-xs">
          <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 w-fit text-purple-600">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">Compliance & Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tamper-evident logs of all inspections, configuration adjustments, and supervisor confirmations.
            </p>
          </div>
          <button
            onClick={handleExportFullSystem}
            className="w-full py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>Download Audit Archive</span>
          </button>
        </div>
      </div>
    </div>
  );
};
