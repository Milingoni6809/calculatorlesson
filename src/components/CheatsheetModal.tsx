import React from 'react';
import { X, BookOpen, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface CheatsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheatsheetModal: React.FC<CheatsheetModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 p-6 text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheatsheet-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 id="cheatsheet-title" className="text-xl font-bold text-slate-900">
                Sharp EL-738 Financial Calculator Keystroke Guide
              </h2>
              <p className="text-xs text-slate-500">Official keystroke conventions, common pitfalls, and memory shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close cheatsheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6 text-sm">
          {/* Section 1: The Golden Rules of TVM */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              The #1 Student Pitfall: Cash Flow Signs (+ / -)
            </h3>
            <p className="text-amber-800 text-xs leading-relaxed">
              On financial calculators, the direction of cash movement determines the sign:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-900 list-disc list-inside">
              <li><strong>Negative (-) sign:</strong> Money leaving your hand (Deposits, Investments, Loan payments). Use the <code className="bg-amber-200 px-1 rounded font-bold">+/-</code> key, NOT the minus subtraction key!</li>
              <li><strong>Positive (+) sign:</strong> Money entering your hand (Loan proceeds received, withdrawals, bond face value at maturity).</li>
              <li>If you solve for N or I/Y and forget to make one value negative, the calculator will return an error or impossible figure.</li>
            </ul>
          </div>

          {/* Section 2: Key Shortcut Table */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Essential Sharp EL-738 Keystroke Reference
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="p-2.5 font-semibold">Action</th>
                    <th className="p-2.5 font-semibold">Keystrokes</th>
                    <th className="p-2.5 font-semibold">Display / Effect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Clear Display & Pending Math</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-mono font-bold">C / ON</kbd></td>
                    <td className="p-2.5">Clears screen to 0. (Preserves TVM memory)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Clear All Registers & Memory</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold">2ndF</kbd> + <kbd className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-mono font-bold">C / ON</kbd> (CA)</td>
                    <td className="p-2.5">Clears all memory and resets modes</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Clear Only TVM Registers</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold">2ndF</kbd> + <kbd className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-mono font-bold">FV</kbd> (CLR TVM)</td>
                    <td className="p-2.5">Resets N, I/Y, PV, PMT, FV to 0</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Toggle BGN / END Mode</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold">2ndF</kbd> + <kbd className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-mono font-bold">PMT</kbd> (BGN)</td>
                    <td className="p-2.5">Toggles BGN indicator in top status line</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Compute Any Financial Unknown</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-mono font-bold">COMP</kbd> + <kbd className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-mono font-bold">[N / IY / PV / PMT / FV]</kbd></td>
                    <td className="p-2.5">Computes and prints the calculated value</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Cash Flow (NPV & IRR) Worksheet</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold">2ndF</kbd> + <kbd className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-mono font-bold">CFi</kbd> (CASH)</td>
                    <td className="p-2.5">Shows RATE(I/Y), NET_PV, and IRR</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">Amortization Worksheet</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-mono font-bold">AMRT</kbd></td>
                    <td className="p-2.5">Allows setting P1 & P2, then views BAL, PRN, INT</td>
                  </tr>
                  <tr className="bg-indigo-50/50">
                    <td className="p-2.5 font-medium text-indigo-950">Switch Mode (Algebra vs Financial)</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold">MODE</kbd></td>
                    <td className="p-2.5">Toggles between Mode 0 (NORMAL/ALGEBRA) and Mode 1 (FINANCIAL)</td>
                  </tr>
                  <tr className="bg-indigo-50/50">
                    <td className="p-2.5 font-medium text-indigo-950">Parentheses ( & )</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold">2ndF</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold">7</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold">8</kbd></td>
                    <td className="p-2.5">Enforces PEMDAS order of operations</td>
                  </tr>
                  <tr className="bg-indigo-50/50">
                    <td className="p-2.5 font-medium text-indigo-950">Powers (yˣ) & Square Root (√)</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold">2ndF</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold">3</kbd> (yˣ) / <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold">9</kbd> (√)</td>
                    <td className="p-2.5">Calculates exponents, powers, and roots</td>
                  </tr>
                  <tr className="bg-indigo-50/50">
                    <td className="p-2.5 font-medium text-indigo-950">Store & Recall Memory Variables</td>
                    <td className="p-2.5"><kbd className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-mono font-bold">STO</kbd> / <kbd className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-mono font-bold">RCL</kbd> + [A-F, X, Y, M]</td>
                    <td className="p-2.5">Stores and recalls variables across calculations</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Period Matching Advice */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              Matching N and I/Y Frequency Rule
            </h3>
            <p className="text-xs text-slate-600 mb-2 leading-relaxed">
              If your payment or compounding occurs more frequently than once a year, you must convert both periods and rate:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <div className="font-bold text-slate-800 mb-1">Annual (1 / yr)</div>
                <div className="text-slate-500">N = Years</div>
                <div className="text-slate-500">I/Y = Annual %</div>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <div className="font-bold text-slate-800 mb-1">Monthly (12 / yr)</div>
                <div className="text-slate-500">N = Years × 12</div>
                <div className="text-slate-500">I/Y = Annual % ÷ 12</div>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <div className="font-bold text-slate-800 mb-1">Quarterly (4 / yr)</div>
                <div className="text-slate-500">N = Years × 4</div>
                <div className="text-slate-500">I/Y = Annual % ÷ 4</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-medium text-xs rounded-lg hover:bg-slate-800 transition-colors"
          >
            Got it, return to calculator
          </button>
        </div>
      </div>
    </div>
  );
};
