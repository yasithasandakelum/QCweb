import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  HelpCircle,
  Lock,
  Search,
  Shield,
  X,
} from 'lucide-react';
import {
  CODE_LETTER_RANGES,
  getCodeLetter,
  getDoubleSamplingPlan,
  getSingleSamplingPlan,
} from '../../services/aqlEngine';
import { AQLValue } from '../../types';

interface AqlTableExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AqlTableExplorerModal: React.FC<AqlTableExplorerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'double' | 'calculator'>('single');
  const [testLotSize, setTestLotSize] = useState<number>(300);
  const [testAql, setTestAql] = useState<AQLValue>(2.5);

  if (!isOpen) return null;

  const testCodeLetter = getCodeLetter(testLotSize);
  const testSinglePlan = getSingleSamplingPlan(testLotSize, testAql);
  const testDoublePlan = getDoubleSamplingPlan(testLotSize, testAql);

  const aqlColumns: AQLValue[] = [1.0, 1.5, 2.5, 4.0, 6.5];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl sm:rounded-2xl w-full max-w-5xl text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                ANSI/ASQ Z1.4-2003 Standards Explorer
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Master Sampling Tables (Level II)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Interactive Tester */}
        <div className="px-3 sm:px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('single')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              Single Sampling (Table II-A)
            </button>
            <button
              onClick={() => setActiveTab('double')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'double'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              Double Sampling (Table III-A)
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'calculator'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              Plan Calculator
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400">Lot Size:</span>
              <input
                type="number"
                min="2"
                value={testLotSize}
                onChange={(e) => setTestLotSize(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-16 bg-slate-900 text-center font-bold text-blue-400 rounded px-1 py-0.5 focus:outline-none border border-slate-700"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400">AQL:</span>
              <select
                value={testAql}
                onChange={(e) => setTestAql(parseFloat(e.target.value) as AQLValue)}
                className="bg-slate-900 text-emerald-400 font-bold rounded px-1 py-0.5 focus:outline-none border border-slate-700"
              >
                <option value={1.0}>1.0</option>
                <option value={1.5}>1.5</option>
                <option value={2.5}>2.5</option>
                <option value={4.0}>4.0</option>
                <option value={6.5}>6.5</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Quick Result Preview Banner */}
          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-slate-400 block text-[11px]">
                Computed for Lot of {testLotSize} units @ AQL {testAql} (General Level II):
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white font-mono">
                  Code Letter: {testCodeLetter}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-blue-400 font-bold">
                  Single: Sample={testSinglePlan.sampleSize}, Ac={testSinglePlan.ac}, Re={testSinglePlan.re}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-purple-400 font-bold">
                  Double: n1={testDoublePlan.stage1.sampleSize} (Ac={testDoublePlan.stage1.ac}/Re={testDoublePlan.stage1.re}), n2={testDoublePlan.stage2.sampleSize} (Ac={testDoublePlan.stage2.ac}/Re={testDoublePlan.stage2.re})
                </span>
              </div>
            </div>
          </div>

          {/* SINGLE SAMPLING TABLE */}
          {activeTab === 'single' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-200 text-sm">
                  Table II-A: Single Sampling Plans for Normal Inspection (Level II)
                </h3>
                <span className="text-slate-400 text-[11px]">
                  Values shown as Accept (Ac) / Reject (Re)
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 pl-3">Lot Size Range</th>
                      <th className="p-2.5 text-center">Letter</th>
                      <th className="p-2.5 text-center">Sample Size (n)</th>
                      {aqlColumns.map((a) => (
                        <th
                          key={a}
                          className={`p-2.5 text-center ${testAql === a ? 'bg-blue-950/80 text-blue-300 font-bold' : ''}`}
                        >
                          AQL {a}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {CODE_LETTER_RANGES.map((row) => {
                      const letter = row.letter;
                      const size = getSingleSamplingPlan(row.min, testAql).sampleSize;
                      const isCurrent = letter === testCodeLetter;

                      return (
                        <tr
                          key={letter}
                          className={`hover:bg-slate-800/60 transition-colors ${
                            isCurrent ? 'bg-blue-950/40 font-bold text-white ring-1 ring-blue-500/40' : 'text-slate-300'
                          }`}
                        >
                          <td className="p-2.5 pl-3 font-mono text-[11px]">
                            {row.min} – {row.max >= 9999999 ? '500,001 and over' : row.max.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center font-bold text-blue-400 font-mono">
                            {letter}
                          </td>
                          <td className="p-2.5 text-center font-bold font-mono">
                            {typeof size === 'number' ? size : '100%'}
                          </td>
                          {aqlColumns.map((a) => {
                            const plan = getSingleSamplingPlan(row.min, a);
                            return (
                              <td
                                key={a}
                                className={`p-2.5 text-center font-mono ${
                                  testAql === a && isCurrent
                                    ? 'bg-blue-600 text-white font-extrabold'
                                    : testAql === a
                                    ? 'bg-slate-800 text-blue-300'
                                    : ''
                                }`}
                              >
                                {plan.ac} / {plan.re}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DOUBLE SAMPLING TABLE */}
          {activeTab === 'double' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-200 text-sm">
                  Table III-A: Double Sampling Plans for Normal Inspection (Level II)
                </h3>
                <span className="text-slate-400 text-[11px]">
                  Stage 1 and Cumulative Stage 2 Limits
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 pl-3">Letter</th>
                      <th className="p-2.5 text-center">Stage</th>
                      <th className="p-2.5 text-center">Sample (n)</th>
                      <th className="p-2.5 text-center">Cum (n)</th>
                      {aqlColumns.map((a) => (
                        <th
                          key={a}
                          className={`p-2.5 text-center ${testAql === a ? 'bg-purple-950/80 text-purple-300 font-bold' : ''}`}
                        >
                          AQL {a} (Ac/Re)
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {CODE_LETTER_RANGES.map((row) => {
                      const letter = row.letter;
                      const isCurrent = letter === testCodeLetter;
                      const dPlan = getDoubleSamplingPlan(row.min, testAql);

                      return (
                        <React.Fragment key={letter}>
                          {/* Stage 1 Row */}
                          <tr
                            className={`hover:bg-slate-800/60 transition-colors ${
                              isCurrent ? 'bg-purple-950/40 text-white font-bold' : 'text-slate-300'
                            }`}
                          >
                            <td rowSpan={2} className="p-2.5 pl-3 font-mono font-bold text-purple-400 border-r border-slate-800">
                              {letter}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {row.min}–{row.max}
                              </span>
                            </td>
                            <td className="p-2 text-center text-slate-400">1st</td>
                            <td className="p-2 text-center font-bold font-mono">{dPlan.stage1.sampleSize}</td>
                            <td className="p-2 text-center font-mono">{dPlan.stage1.sampleSize}</td>
                            {aqlColumns.map((a) => {
                              const p = getDoubleSamplingPlan(row.min, a);
                              return (
                                <td
                                  key={a}
                                  className={`p-2 text-center font-mono ${
                                    testAql === a && isCurrent
                                      ? 'bg-purple-600 text-white font-extrabold'
                                      : ''
                                  }`}
                                >
                                  {p.stage1.ac} / {p.stage1.re}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Stage 2 Row */}
                          <tr
                            className={`hover:bg-slate-800/60 transition-colors border-b border-slate-800/80 ${
                              isCurrent ? 'bg-purple-950/30 text-white font-bold' : 'text-slate-400'
                            }`}
                          >
                            <td className="p-2 text-center text-slate-400">2nd</td>
                            <td className="p-2 text-center font-bold font-mono">{dPlan.stage2.sampleSize}</td>
                            <td className="p-2 text-center font-mono">{dPlan.stage2.cumulativeSampleSize}</td>
                            {aqlColumns.map((a) => {
                              const p = getDoubleSamplingPlan(row.min, a);
                              return (
                                <td
                                  key={a}
                                  className={`p-2 text-center font-mono ${
                                    testAql === a && isCurrent
                                      ? 'bg-purple-700 text-white font-extrabold'
                                      : ''
                                  }`}
                                >
                                  {p.stage2.ac} / {p.stage2.re}
                                </td>
                              );
                            })}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CALCULATOR / RULE EXPLANATION */}
          {activeTab === 'calculator' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-400" />
                  <span>Single Sampling Decision Rules</span>
                </h4>
                <div className="text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    For lot size <strong>{testLotSize}</strong> units at AQL <strong>{testAql}</strong>:
                  </p>
                  <ul className="list-disc list-inside space-y-1 font-mono text-[11px] bg-slate-900 p-3 rounded-lg border border-slate-750">
                    <li>Sample Size (n): {testSinglePlan.sampleSize} units</li>
                    <li>Acceptance Number (Ac): {testSinglePlan.ac}</li>
                    <li>Rejection Number (Re): {testSinglePlan.re}</li>
                  </ul>
                  <p className="text-xs text-slate-400">
                    <strong>Rule:</strong> If defect count in sample ≤ {testSinglePlan.ac} → <strong>ACCEPT LOT</strong>. If defect count ≥ {testSinglePlan.re} → <strong>REJECT LOT</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-purple-400" />
                  <span>Double Sampling Decision Rules</span>
                </h4>
                <div className="text-slate-300 space-y-2 leading-relaxed">
                  <ul className="list-disc list-inside space-y-1 font-mono text-[11px] bg-slate-900 p-3 rounded-lg border border-slate-750">
                    <li>Stage 1 Sample (n1): {testDoublePlan.stage1.sampleSize} units</li>
                    <li>Stage 1 Ac1 = {testDoublePlan.stage1.ac}, Re1 = {testDoublePlan.stage1.re}</li>
                    <li>Stage 2 Sample (n2): {testDoublePlan.stage2.sampleSize} units</li>
                    <li>Stage 2 Ac2 (Cum) = {testDoublePlan.stage2.ac}, Re2 (Cum) = {testDoublePlan.stage2.re}</li>
                  </ul>
                  <p className="text-xs text-slate-400">
                    <strong>Rule:</strong> If Stage 1 defects ≤ Ac1 → ACCEPT. If ≥ Re1 → REJECT. If between Ac1 and Re1 → Inspect second sample of {testDoublePlan.stage2.sampleSize} units. If cumulative defects (Stage 1 + Stage 2) ≤ Ac2 → ACCEPT, else REJECT.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
