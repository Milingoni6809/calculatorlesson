import React, { useState } from 'react';
import { TVMRegisters, CashFlowItem, AlgebraRegisters } from '../types';
import { Database, Trash2, ArrowRight, Variable, ChevronDown, ChevronUp } from 'lucide-react';
import { formatFinancial } from '../utils/financialMath';

interface RegisterInspectorProps {
  tvm: TVMRegisters;
  cashFlows: CashFlowItem[];
  algebraRegisters?: AlgebraRegisters;
  onClearTVM: () => void;
  onClearCashFlows: () => void;
  onClearAlgebraVars?: () => void;
  onLoadValueToInput?: (val: number) => void;
}

export const RegisterInspector: React.FC<RegisterInspectorProps> = ({
  tvm,
  cashFlows,
  algebraRegisters = { A: null, B: null, C: null, D: null, E: null, F: null, X: null, Y: null, M: null },
  onClearTVM,
  onClearCashFlows,
  onClearAlgebraVars,
  onLoadValueToInput,
}) => {
  const [activeView, setActiveView] = useState<'tvm' | 'algebra'>('tvm');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tvmRegs = [
    { label: 'N', name: 'Periods', value: tvm.N, unit: 'periods' },
    { label: 'I/Y', name: 'Rate', value: tvm.IY, unit: '%' },
    { label: 'PV', name: 'Pres. Val', value: tvm.PV, unit: '$' },
    { label: 'PMT', name: 'Pmt', value: tvm.PMT, unit: '$/period' },
    { label: 'FV', name: 'Fut. Val', value: tvm.FV, unit: '$' },
  ];

  const algebraRegsList: { label: keyof AlgebraRegisters; name: string; value: number | null }[] = [
    { label: 'A', name: 'A', value: algebraRegisters.A },
    { label: 'B', name: 'B', value: algebraRegisters.B },
    { label: 'C', name: 'C', value: algebraRegisters.C },
    { label: 'D', name: 'D', value: algebraRegisters.D },
    { label: 'E', name: 'E', value: algebraRegisters.E },
    { label: 'F', name: 'F', value: algebraRegisters.F },
    { label: 'X', name: 'X', value: algebraRegisters.X },
    { label: 'Y', name: 'Y', value: algebraRegisters.Y },
    { label: 'M', name: 'M', value: algebraRegisters.M },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-xs">
      {/* Top Header & Collapse Toggle */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
          <button
            onClick={() => {
              setActiveView('tvm');
              setIsCollapsed(false);
            }}
            className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-all cursor-pointer ${
              activeView === 'tvm'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3 h-3 text-teal-600" />
            <span>TVM & CF</span>
          </button>
          <button
            onClick={() => {
              setActiveView('algebra');
              setIsCollapsed(false);
            }}
            className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-all cursor-pointer ${
              activeView === 'algebra'
                ? 'bg-white text-indigo-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Variable className="w-3 h-3 text-indigo-600" />
            <span>Variables</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {activeView === 'tvm' ? (
            <>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                  tvm.isBGN ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tvm.isBGN ? 'BGN' : 'END'}
              </span>
              <button
                onClick={onClearTVM}
                title="Clear TVM (2ndF CLR TVM)"
                className="text-[10px] text-slate-500 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </>
          ) : (
            <button
              onClick={onClearAlgebraVars}
              title="Clear all algebra variables"
              className="text-[10px] text-slate-500 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand memory view' : 'Collapse memory view'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsed Minimal Strip */}
      {isCollapsed ? (
        <div
          onClick={() => setIsCollapsed(false)}
          className="text-[10px] text-slate-500 flex items-center justify-between py-1 px-1 cursor-pointer hover:bg-slate-50 rounded"
        >
          <span className="truncate font-mono">
            {activeView === 'tvm'
              ? `N:${tvm.N ?? '—'} | I/Y:${tvm.IY ?? '—'}% | PV:${tvm.PV ?? '—'} | PMT:${tvm.PMT ?? '—'} | FV:${tvm.FV ?? '—'}`
              : `A:${algebraRegisters.A ?? '—'} B:${algebraRegisters.B ?? '—'} X:${algebraRegisters.X ?? '—'} Y:${algebraRegisters.Y ?? '—'}`}
          </span>
          <span className="text-teal-700 font-semibold text-[9px] shrink-0 ml-1">Expand</span>
        </div>
      ) : (
        <>
          {/* VIEW 1: TVM & CASH FLOWS */}
          {activeView === 'tvm' && (
            <>
              <div className="grid grid-cols-5 gap-1 mb-2">
                {tvmRegs.map((reg) => {
                  const isSet = reg.value !== null && !isNaN(reg.value);
                  return (
                    <div
                      key={reg.label}
                      className={`p-1.5 rounded border text-center transition-all ${
                        isSet
                          ? 'bg-teal-50/70 border-teal-200 text-teal-950 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase tracking-wider text-teal-800/90">
                        {reg.label}
                      </div>
                      <div
                        className="font-mono text-[11px] font-bold my-0.5 truncate"
                        title={isSet ? String(reg.value) : '0'}
                      >
                        {isSet ? formatFinancial(reg.value!) : '0.00'}
                      </div>
                      <div className="text-[8px] text-slate-500 truncate">{reg.name}</div>
                      {isSet && onLoadValueToInput && (
                        <button
                          onClick={() => onLoadValueToInput(reg.value!)}
                          className="mt-0.5 text-[8px] text-teal-700 hover:underline flex items-center justify-center gap-0.5 w-full opacity-80 hover:opacity-100 cursor-pointer"
                          title="Load into active screen"
                        >
                          Load <ArrowRight className="w-2 h-2" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-700">
                    CFi Cash Flows ({cashFlows.length})
                  </span>
                  {cashFlows.length > 0 && (
                    <button
                      onClick={onClearCashFlows}
                      className="text-[9px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Clear CFs
                    </button>
                  )}
                </div>

                {cashFlows.length === 0 ? (
                  <div className="text-[10px] text-slate-400 italic py-1 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                    No cash flows. Enter amount & press [CFi]
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                    {cashFlows.map((cf, idx) => (
                      <div
                        key={cf.id || idx}
                        className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono"
                      >
                        <span className="font-bold text-teal-700">{cf.label}:</span>
                        <span className={cf.amount < 0 ? 'text-red-600 font-semibold' : 'text-slate-800'}>
                          {formatFinancial(cf.amount)}
                        </span>
                        {cf.freq > 1 && (
                          <span className="text-[9px] text-slate-500 bg-white px-1 rounded border">
                            ×{cf.freq}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* VIEW 2: ALGEBRA VARIABLES */}
          {activeView === 'algebra' && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-500">
                Memory variables. Use <kbd className="font-mono bg-slate-100 px-1 border rounded">STO</kbd> + key to store, <kbd className="font-mono bg-slate-100 px-1 border rounded">RCL</kbd> to recall.
              </p>
              <div className="grid grid-cols-5 gap-1">
                {algebraRegsList.map((v) => {
                  const hasVal = v.value !== null && !isNaN(v.value);
                  return (
                    <div
                      key={v.label}
                      className={`p-1 rounded border text-center transition-all ${
                        hasVal
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] font-mono font-bold text-indigo-700">
                        [{v.label}]
                      </div>
                      <div
                        className="font-mono text-[10px] font-bold truncate"
                        title={hasVal ? String(v.value) : '0'}
                      >
                        {hasVal ? Number(v.value!.toFixed(3)).toString() : '—'}
                      </div>
                      {hasVal && onLoadValueToInput && (
                        <button
                          onClick={() => onLoadValueToInput(v.value!)}
                          className="mt-0.5 text-[8px] text-indigo-600 hover:underline flex items-center justify-center gap-0.5 w-full cursor-pointer"
                        >
                          Load <ArrowRight className="w-2 h-2" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
