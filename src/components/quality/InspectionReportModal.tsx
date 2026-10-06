import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  FileCheck2,
  Lock,
  Printer,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InspectionRecord } from '../../types';
import { EditInspectionModal } from './EditInspectionModal';

interface InspectionReportModalProps {
  inspection: InspectionRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InspectionReportModal: React.FC<InspectionReportModalProps> = ({
  inspection: propInspection,
  isOpen,
  onClose,
}) => {
  const { systemConfig, currentUser, activeRole, approveInspection, inspections } = useApp();
  const [signatureText, setSignatureText] = useState('');
  const [showSignPrompt, setShowSignPrompt] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const inspection = (propInspection && inspections.find((i) => i.id === propInspection.id)) || propInspection;

  if (!isOpen || !inspection) return null;

  const isSupervisor = activeRole === 'Supervisor' || activeRole === 'Admin';
  const isAccepted = inspection.finalDecision === 'Accepted';

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureText.trim()) return;
    approveInspection(
      inspection.id,
      currentUser?.name || 'System',
      `${signatureText.trim()} (Digital Auth ID: SIG-${Date.now().toString(36).toUpperCase()})`
    );
    setShowSignPrompt(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-700 rounded-xl sm:rounded-2xl w-full max-w-4xl text-slate-100 shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black max-h-[94vh] flex flex-col">
        {/* Modal Toolbar (hidden on print) */}
        <div className="px-4 sm:px-6 py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileCheck2 className="w-5 h-5 text-blue-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
              Report: {inspection.deliveryNumber}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-xs"
              title="Edit defect counts or correct inspection notes"
            >
              <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Edit / Correct</span>
            </button>

            {isSupervisor && !inspection.supervisorSignature && (
              <button
                onClick={() => setShowSignPrompt(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Sign & Approve</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formal Inspection Certificate Document (A4 Printable Area) */}
        <div className="p-4 sm:p-8 md:p-12 space-y-6 bg-slate-900 print:bg-white print:text-slate-900 overflow-y-auto flex-1">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-700 print:border-slate-400 pb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-700 text-white font-bold flex items-center justify-center text-base">
                  QC
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white print:text-black">
                    {systemConfig.companyName}
                  </h1>
                  <p className="text-xs text-slate-400 print:text-slate-600">
                    Quality Assurance & Inbound Receiving Department
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 print:text-slate-500 mt-2 font-mono">
                Report No: QC-REP-{inspection.id.toUpperCase()} | Issued:{' '}
                {new Date(inspection.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Official Stamp */}
            <div
              className={`px-5 py-2.5 rounded-xl border-2 font-black tracking-wider text-center text-sm uppercase ${
                isAccepted
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30 print:text-emerald-700 print:border-emerald-600'
                  : 'border-rose-500 text-rose-400 bg-rose-950/30 print:text-rose-700 print:border-rose-600'
              }`}
            >
              <div className="text-base">
                {isAccepted ? 'ACCEPTED LOT' : 'REJECTED LOT'}
              </div>
              <div className="text-[10px] font-normal lowercase tracking-normal">
                {isAccepted ? 'Conforms to AQL Limits' : 'Returned to Supplier'}
              </div>
            </div>
          </div>

          {/* Key Lot & Supplier Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-800/60 print:bg-slate-100 rounded-xl border border-slate-700/60 print:border-slate-300 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">Delivery Number</span>
              <strong className="text-slate-100 print:text-black font-mono text-sm">
                {inspection.deliveryNumber}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">Supplier</span>
              <strong className="text-slate-100 print:text-black">{inspection.supplierName}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">Component</span>
              <strong className="text-slate-100 print:text-black">
                {inspection.componentCode} —{' '}
                {inspection.componentCode === 'AA'
                  ? 'Outer Tub'
                  : inspection.componentCode === 'BB'
                  ? 'Inner Tub'
                  : 'Ridgeform'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">Lot Received Date</span>
              <strong className="text-slate-100 print:text-black">
                {inspection.lotReceivedDate} @ {inspection.lotReceivedTime}
              </strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">Lot Size (Total Arrived)</span>
              <strong className="text-slate-100 print:text-black text-sm">{inspection.lotSize} units</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">Sampling Method</span>
              <strong className="text-slate-100 print:text-black">{inspection.samplingMethod} Sampling</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">Inspection Level</span>
              <strong className="text-slate-100 print:text-black">{inspection.inspectionLevel}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">AQL Level</span>
              <strong className="text-slate-100 print:text-black">AQL {inspection.aql}</strong>
            </div>
          </div>

          {/* Sampling Parameters Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 print:text-slate-800 uppercase tracking-wider mb-2">
              ANSI/ASQ Z1.4-2003 Sampling Plan Matrix
            </h3>
            <table className="w-full text-xs border border-slate-700 print:border-slate-300 rounded-lg overflow-hidden">
              <thead className="bg-slate-800 print:bg-slate-200 text-slate-300 print:text-slate-800">
                <tr>
                  <th className="p-2 text-left">Code Letter</th>
                  <th className="p-2 text-center">Stage</th>
                  <th className="p-2 text-center">Sample Size (n)</th>
                  <th className="p-2 text-center">Accept (Ac)</th>
                  <th className="p-2 text-center">Reject (Re)</th>
                  <th className="p-2 text-center">Defects Found</th>
                  <th className="p-2 text-center">Stage Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-300">
                <tr className="bg-slate-850/50 print:bg-white">
                  <td className="p-2 font-mono font-bold text-blue-400 print:text-blue-700">
                    {inspection.codeLetter}
                  </td>
                  <td className="p-2 text-center">Stage 1</td>
                  <td className="p-2 text-center font-bold">{inspection.sampleSizeStage1}</td>
                  <td className="p-2 text-center font-bold text-emerald-400 print:text-emerald-700">
                    ≤ {inspection.acStage1}
                  </td>
                  <td className="p-2 text-center font-bold text-rose-400 print:text-rose-700">
                    ≥ {inspection.reStage1}
                  </td>
                  <td className="p-2 text-center font-bold">{inspection.stage1DefectsCount}</td>
                  <td className="p-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inspection.finalDecision === 'Accepted'
                          ? 'bg-emerald-950/60 text-emerald-300 print:bg-emerald-100 print:text-emerald-800'
                          : 'bg-rose-950/60 text-rose-300 print:bg-rose-100 print:text-rose-800'
                      }`}
                    >
                      {inspection.finalDecision}
                    </span>
                  </td>
                </tr>

                {inspection.samplingMethod === 'Double' && inspection.sampleSizeStage2 && (
                  <tr className="bg-slate-850/50 print:bg-white">
                    <td className="p-2 font-mono font-bold text-blue-400 print:text-blue-700">
                      {inspection.codeLetter}
                    </td>
                    <td className="p-2 text-center">Stage 2 (Cum)</td>
                    <td className="p-2 text-center font-bold">
                      {inspection.sampleSizeStage2} (Total {inspection.sampleSizeStage1 + inspection.sampleSizeStage2})
                    </td>
                    <td className="p-2 text-center font-bold text-emerald-400 print:text-emerald-700">
                      ≤ {inspection.acStage2}
                    </td>
                    <td className="p-2 text-center font-bold text-rose-400 print:text-rose-700">
                      ≥ {inspection.reStage2}
                    </td>
                    <td className="p-2 text-center font-bold">
                      {inspection.totalDefectCount}
                    </td>
                    <td className="p-2 text-center font-bold">{inspection.finalDecision}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Defect Reasons Breakdown */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 print:text-slate-800 uppercase tracking-wider mb-2">
              Physical Defect Breakdown
            </h3>
            {inspection.defects.length === 0 ? (
              <div className="p-3 bg-emerald-950/30 print:bg-emerald-50 text-emerald-300 print:text-emerald-800 rounded-lg text-xs border border-emerald-800/40">
                ✓ Zero physical non-conformities identified in the sampled units.
              </div>
            ) : (
              <table className="w-full text-xs border border-slate-700 print:border-slate-300 rounded-lg overflow-hidden">
                <thead className="bg-slate-800 print:bg-slate-200 text-slate-300 print:text-slate-800">
                  <tr>
                    <th className="p-2 text-left">Defect Classification</th>
                    <th className="p-2 text-center">Count</th>
                    <th className="p-2 text-left">Source Category</th>
                    <th className="p-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-300">
                  {inspection.defects.map((d) => (
                    <tr key={d.id} className="bg-slate-850/40 print:bg-white">
                      <td className="p-2 font-medium text-slate-200 print:text-slate-900">{d.reason}</td>
                      <td className="p-2 text-center font-bold text-rose-400 print:text-rose-700 value-mono">{d.count}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{d.sourceCategory || '—'}</td>
                      <td className="p-2 text-slate-400 print:text-slate-600">{d.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-800/90 print:bg-slate-200 border-t-2 border-slate-700 print:border-slate-400 font-bold">
                  <tr>
                    <td className="p-2.5 text-slate-100 print:text-slate-900">
                      Total Non-Conformities Found:
                    </td>
                    <td className="p-2.5 text-center text-rose-400 print:text-rose-700 value-mono text-sm">
                      {inspection.totalDefectCount}
                    </td>
                    <td colSpan={2} className="p-2.5 text-slate-400 print:text-slate-600 text-[11px] font-normal">
                      {inspection.samplingMethod === 'Double' && inspection.stage2DefectsCount !== undefined
                        ? `Stage 1: ${inspection.stage1DefectsCount} + Stage 2: ${inspection.stage2DefectsCount} = Cumulative Total: ${inspection.totalDefectCount} defects`
                        : `Sum of exact counts across all defect reasons (Sample Size: ${inspection.sampleSizeStage1} units)`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Visual Defect Documentation Photos */}
          {inspection.images.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-300 print:text-slate-800 uppercase tracking-wider mb-2">
                Attached Photographic Evidence ({inspection.images.length})
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {inspection.images.map((img) => (
                  <div
                    key={img.id}
                    className="border border-slate-700 print:border-slate-300 rounded-lg overflow-hidden bg-slate-800 p-1 text-center"
                  >
                    <img
                      src={img.url}
                      alt={img.caption}
                      className="w-full h-28 object-cover rounded"
                    />
                    <p className="text-[10px] text-slate-300 print:text-slate-700 mt-1 truncate">
                      {img.caption}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signatures & Approvals Section */}
          <div className="pt-6 border-t border-slate-700 print:border-slate-400 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 print:text-slate-600 block uppercase font-bold tracking-wider">
                Quality Inspector Sign-off
              </span>
              <div className="p-3 bg-slate-800/40 print:bg-slate-100 rounded-lg border border-slate-700/60 print:border-slate-300">
                <div className="font-semibold text-slate-200 print:text-black">
                  {inspection.inspectorName}
                </div>
                <div className="text-[10px] text-slate-400 print:text-slate-600">
                  Inspection Timestamp: {new Date(inspection.createdAt).toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono mt-1">
                  ✓ Digital QA Inspector Stamp Active
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 print:text-slate-600 block uppercase font-bold tracking-wider">
                Supervisor Approval & Electronic Signature
              </span>
              <div className="p-3 bg-slate-800/40 print:bg-slate-100 rounded-lg border border-slate-700/60 print:border-slate-300 min-h-[72px]">
                {inspection.supervisorSignature ? (
                  <>
                    <div className="font-semibold text-slate-200 print:text-black">
                      {inspection.supervisorName}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400 print:text-emerald-700 font-bold">
                      {inspection.supervisorSignature}
                    </div>
                    <div className="text-[10px] text-slate-400 print:text-slate-600">
                      Approved: {inspection.approvedAt ? new Date(inspection.approvedAt).toLocaleString() : 'Yes'}
                    </div>
                  </>
                ) : (
                  <div className="text-amber-400 text-[11px] flex items-center gap-1 py-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Awaiting Supervisor Formal Approval Signature</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Supervisor Signature Prompt Modal */}
        {showSignPrompt && (
          <div className="p-6 bg-slate-850 border-t border-slate-700 space-y-4 animate-in fade-in">
            <h4 className="text-sm font-bold text-slate-100">
              Supervisor Approval Authorization
            </h4>
            <form onSubmit={handleSign} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter Electronic Signature Name:
                </label>
                <input
                  type="text"
                  required
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder={`e.g. ${currentUser?.name || 'System'}`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSignPrompt(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Confirm & Apply Signature
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Edit & Correct Modal */}
      {isEditOpen && (
        <EditInspectionModal
          isOpen={isEditOpen}
          inspection={inspection}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </div>
  );
};
