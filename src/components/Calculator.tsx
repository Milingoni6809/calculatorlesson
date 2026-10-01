import React, { useState, useEffect, useCallback } from 'react';
import { TVMRegisters, CashFlowItem, AlgebraRegisters } from '../types';
import {
  calculateFV,
  calculatePV,
  calculatePMT,
  calculateN,
  calculateIY,
  calculateNPV,
  calculateIRR,
  calculateAmortization,
  formatFinancial,
} from '../utils/financialMath';
import { evaluateAlgebraicExpression } from '../utils/algebraMath';
import { playKeyClick } from '../utils/audio';

interface CalculatorProps {
  // Tutorial Props
  isTutorialMode: boolean;
  targetKey?: string;
  onTutorialKeyPress?: (key: string) => boolean | void;
  // State synchronization
  tvmRegisters: TVMRegisters;
  setTvmRegisters: React.Dispatch<React.SetStateAction<TVMRegisters>>;
  cashFlows: CashFlowItem[];
  setCashFlows: React.Dispatch<React.SetStateAction<CashFlowItem[]>>;
  algebraRegisters?: AlgebraRegisters;
  setAlgebraRegisters?: React.Dispatch<React.SetStateAction<AlgebraRegisters>>;
  calculatorMode?: 'NORMAL' | 'FINANCIAL';
  onModeChange?: (mode: 'NORMAL' | 'FINANCIAL') => void;
  onCalculatedValueChange?: (val: number | null) => void;
  // External display override
  displayOverride?: string;
  statusOverride?: string;
  loadedFormula?: { expr: string; val: number | string } | null;
  // Size scale control
  scale?: 'compact' | 'mini' | 'standard';
  onScaleChange?: (scale: 'compact' | 'mini' | 'standard') => void;
}

const CalculatorScaleContext = React.createContext<'compact' | 'mini' | 'standard'>('compact');

export const Calculator: React.FC<CalculatorProps> = ({
  isTutorialMode,
  targetKey,
  onTutorialKeyPress,
  tvmRegisters,
  setTvmRegisters,
  cashFlows,
  setCashFlows,
  algebraRegisters = { A: null, B: null, C: null, D: null, E: null, F: null, X: null, Y: null, M: null },
  setAlgebraRegisters,
  calculatorMode: externalMode,
  onModeChange,
  onCalculatedValueChange,
  displayOverride,
  statusOverride,
  loadedFormula,
  scale: externalScale,
  onScaleChange,
}) => {
  // Size scale state: defaults to 'standard' (Big)
  const [internalScale, setInternalScale] = useState<'compact' | 'mini' | 'standard'>('standard');
  const activeScale = externalScale || internalScale;

  const handleScaleChange = (s: 'compact' | 'mini' | 'standard') => {
    setInternalScale(s);
    if (onScaleChange) onScaleChange(s);
  };
  // Internal mode state (Mode 0: NORMAL / Algebra, Mode 1: FINANCIAL)
  const [internalMode, setInternalMode] = useState<'NORMAL' | 'FINANCIAL'>('FINANCIAL');
  const activeMode = externalMode || internalMode;

  // Calculator internal state
  const [display, setDisplay] = useState('0.');
  const [upperText, setUpperText] = useState('');
  const [is2ndF, setIs2ndF] = useState(false);
  const [isComp, setIsComp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Algebra expression buffer for NORMAL mode
  const [formulaBuffer, setFormulaBuffer] = useState('');

  // STO / RCL pending action
  const [pendingMemoryOp, setPendingMemoryOp] = useState<'STO' | 'RCL' | null>(null);

  // Arithmetic engine state
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<'+' | '-' | '×' | '÷' | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  // Cash flow worksheet state
  const [cashWorksheetRate, setCashWorksheetRate] = useState<number>(0);
  const [cashWorksheetIndex, setCashWorksheetIndex] = useState<'rate' | 'npv' | 'irr'>('rate');
  const [isInCashWorksheet, setIsInCashWorksheet] = useState(false);

  // Amortization worksheet state
  const [isInAmrtWorksheet, setIsInAmrtWorksheet] = useState(false);
  const [amrtP1, setAmrtP1] = useState(1);
  const [amrtP2, setAmrtP2] = useState(1);
  const [amrtView, setAmrtView] = useState<'p1' | 'p2' | 'bal' | 'prn' | 'int'>('p1');

  // Synchronize display when tutorial provides an override
  useEffect(() => {
    if (isTutorialMode && displayOverride !== undefined) {
      setDisplay(displayOverride);
    }
  }, [isTutorialMode, displayOverride]);

  // Handle externally loaded formula or value
  useEffect(() => {
    if (loadedFormula) {
      setDisplay(String(loadedFormula.val));
      setUpperText(loadedFormula.expr);
      setFormulaBuffer(loadedFormula.expr);
      flashScreen('LOADED INTO EL-738', 700);
    }
  }, [loadedFormula]);

  // Handle status indicators
  const currentStatus = statusOverride || [
    activeMode === 'NORMAL' ? 'NORM' : 'FIN',
    is2ndF ? '2ndF' : '',
    isComp ? 'COMP' : '',
    tvmRegisters.isBGN ? 'BGN' : '',
    isInCashWorksheet ? 'CASH' : '',
    isInAmrtWorksheet ? 'AMRT' : '',
    'DEG',
  ].filter(Boolean).join(' ');

  // Notify parent of numeric value currently shown
  const updateNumericOutput = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && onCalculatedValueChange) {
      onCalculatedValueChange(num);
    }
  }, [onCalculatedValueChange]);

  // Flash temporary prompt or error on LCD
  const flashScreen = (msg: string, duration = 800) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, duration);
  };

  // Variable key mapping
  const keyToVarName = (k: string): keyof AlgebraRegisters | null => {
    const map: Record<string, keyof AlgebraRegisters> = {
      '1': 'A',
      '2': 'B',
      '3': 'C',
      '4': 'D',
      '5': 'E',
      '6': 'F',
      '7': 'X',
      '8': 'Y',
      '0': 'M',
      'A': 'A',
      'B': 'B',
      'C': 'C',
      'D': 'D',
      'E': 'E',
      'F': 'F',
      'X': 'X',
      'Y': 'Y',
      'M': 'M',
    };
    return map[k] || null;
  };

  // Main Key Handling Logic
  const handleKeyPress = (key: string) => {
    playKeyClick(
      key === 'C' || key === 'DEL' ? 'error' :
      ['N', 'IY', 'PV', 'PMT', 'FV', 'COMP', 'MODE'].includes(key) ? 'func' : 'num'
    );

    // If tutorial mode is active, handle guided validation
    if (isTutorialMode) {
      if (onTutorialKeyPress) {
        const isMatch = onTutorialKeyPress(key);
        if (isMatch === false) {
          flashScreen('PRESS HIGHLIGHTED KEY');
          playKeyClick('error');
        }
      }
      return;
    }

    // --- 0. STO / RCL Variable Handling ---
    if (pendingMemoryOp) {
      const varName = keyToVarName(key);
      if (varName && setAlgebraRegisters) {
        if (pendingMemoryOp === 'STO') {
          const valToStore = parseFloat(display.replace(/[^0-9.-]/g, '')) || 0;
          setAlgebraRegisters((prev) => ({ ...prev, [varName]: valToStore }));
          flashScreen(`STORED IN [${varName}]`, 700);
          setUpperText(`STO ${varName} = ${valToStore}`);
        } else if (pendingMemoryOp === 'RCL') {
          const storedVal = algebraRegisters[varName];
          if (storedVal !== null && !isNaN(storedVal)) {
            setDisplay(String(storedVal));
            setUpperText(`RCL ${varName}`);
            updateNumericOutput(String(storedVal));
            if (activeMode === 'NORMAL') {
              setFormulaBuffer((prev) => prev + String(storedVal));
            }
          } else {
            flashScreen(`[${varName}] IS EMPTY`, 600);
          }
        }
      }
      setPendingMemoryOp(null);
      setIs2ndF(false);
      return;
    }

    // --- 1. 2ndF (Secondary Function Toggle) ---
    if (key === '2ndF') {
      setIs2ndF((prev) => !prev);
      return;
    }

    // --- 2. MODE Switching (NORMAL / ALGEBRA vs FINANCIAL) ---
    if (key === 'MODE') {
      const nextMode = activeMode === 'NORMAL' ? 'FINANCIAL' : 'NORMAL';
      if (onModeChange) {
        onModeChange(nextMode);
      } else {
        setInternalMode(nextMode);
      }
      flashScreen(nextMode === 'NORMAL' ? 'MODE: 0 (NORMAL / ALGEBRA)' : 'MODE: 1 (FINANCIAL / TVM)', 900);
      setIs2ndF(false);
      return;
    }

    // --- 3. Clear / Reset Keys ---
    if (key === 'C') {
      if (is2ndF) {
        // 2ndF + C = CA (Clear All)
        setTvmRegisters({
          N: null,
          IY: null,
          PV: null,
          PMT: null,
          FV: null,
          PY: 1,
          CY: 1,
          isBGN: false,
        });
        setCashFlows([]);
        if (setAlgebraRegisters) {
          setAlgebraRegisters({ A: null, B: null, C: null, D: null, E: null, F: null, X: null, Y: null, M: null });
        }
        setAccumulator(null);
        setPendingOp(null);
        setIsInCashWorksheet(false);
        setIsInAmrtWorksheet(false);
        setDisplay('0.');
        setUpperText('');
        setFormulaBuffer('');
        setIs2ndF(false);
        setIsComp(false);
        setPendingMemoryOp(null);
        flashScreen('MEMORY CLEARED (CA)', 600);
      } else {
        // C clears current entry and exits worksheets
        setDisplay('0.');
        setUpperText('');
        setFormulaBuffer('');
        setIsComp(false);
        setIsInCashWorksheet(false);
        setIsInAmrtWorksheet(false);
        setPendingMemoryOp(null);
      }
      setIs2ndF(false);
      return;
    }

    // --- 4. DEL (Backspace) ---
    if (key === 'DEL') {
      if (activeMode === 'NORMAL' && formulaBuffer.length > 0) {
        const nextBuf = formulaBuffer.slice(0, -1);
        setFormulaBuffer(nextBuf);
        setUpperText(nextBuf);
      }
      if (display.length > 1 && display !== '0.') {
        setDisplay(display.slice(0, -1));
      } else {
        setDisplay('0.');
      }
      setIs2ndF(false);
      return;
    }

    // --- 5. STO / RCL ---
    if (key === 'STO') {
      setPendingMemoryOp('STO');
      flashScreen('STORE TO [A..F, X, Y, M]', 800);
      setUpperText('STO ?');
      setIs2ndF(false);
      return;
    }

    if (key === 'RCL') {
      setPendingMemoryOp('RCL');
      flashScreen('RECALL [A..F, X, Y, M]', 800);
      setUpperText('RCL ?');
      setIs2ndF(false);
      return;
    }

    // --- 6. 2ndF Secondary Algebraic Functions ---
    // (A) 2ndF + 7 = '(' (Open Parenthesis)
    if (is2ndF && key === '7') {
      setIs2ndF(false);
      if (activeMode === 'NORMAL') {
        const nextBuf = formulaBuffer + '(';
        setFormulaBuffer(nextBuf);
        setUpperText(nextBuf);
      } else {
        flashScreen('SWITCH TO NORMAL MODE', 600);
      }
      return;
    }

    // (B) 2ndF + 8 = ')' (Close Parenthesis)
    if (is2ndF && key === '8') {
      setIs2ndF(false);
      if (activeMode === 'NORMAL') {
        const nextBuf = formulaBuffer + ')';
        setFormulaBuffer(nextBuf);
        setUpperText(nextBuf);
      } else {
        flashScreen('SWITCH TO NORMAL MODE', 600);
      }
      return;
    }

    // (C) 2ndF + 9 = '√' (Square Root)
    if (is2ndF && key === '9') {
      setIs2ndF(false);
      const currentNum = parseFloat(display.replace(/[^0-9.-]/g, ''));
      if (currentNum >= 0) {
        const sq = Math.sqrt(currentNum);
        setDisplay(String(sq));
        updateNumericOutput(String(sq));
        setUpperText(`√(${currentNum}) = ${sq}`);
        if (activeMode === 'NORMAL') {
          setFormulaBuffer((prev) => (prev ? `${prev} + sqrt(${currentNum})` : `sqrt(${currentNum})`));
        }
      } else {
        setDisplay('Error 2');
        flashScreen('NEGATIVE ROOT ERROR', 800);
      }
      return;
    }

    // (D) 2ndF + 1 = 'x²' (Square)
    if (is2ndF && key === '1') {
      setIs2ndF(false);
      const currentNum = parseFloat(display.replace(/[^0-9.-]/g, ''));
      const sq = currentNum * currentNum;
      setDisplay(String(sq));
      updateNumericOutput(String(sq));
      setUpperText(`(${currentNum})² = ${sq}`);
      if (activeMode === 'NORMAL') {
        setFormulaBuffer((prev) => (prev ? `${prev}^2` : `${sq}`));
      }
      return;
    }

    // (E) 2ndF + 2 = '1/x' (Reciprocal)
    if (is2ndF && key === '2') {
      setIs2ndF(false);
      const currentNum = parseFloat(display.replace(/[^0-9.-]/g, ''));
      if (currentNum !== 0) {
        const recip = 1 / currentNum;
        setDisplay(String(recip));
        updateNumericOutput(String(recip));
        setUpperText(`1/(${currentNum}) = ${recip}`);
      } else {
        setDisplay('Error 2');
        flashScreen('DIV BY ZERO', 800);
      }
      return;
    }

    // (F) 2ndF + 3 = 'yˣ' (Power / Exponent ^)
    if (is2ndF && key === '3') {
      setIs2ndF(false);
      if (activeMode === 'NORMAL') {
        const nextBuf = (formulaBuffer || display) + '^';
        setFormulaBuffer(nextBuf);
        setUpperText(nextBuf);
        setWaitingForOperand(true);
      } else {
        setPendingOp('×');
        setWaitingForOperand(true);
        flashScreen('EXPONENT [y^x]', 600);
      }
      return;
    }

    // (G) 2ndF + 6 = '%' (Percent)
    if (is2ndF && key === '6') {
      setIs2ndF(false);
      const currentNum = parseFloat(display.replace(/[^0-9.-]/g, ''));
      const pct = currentNum / 100;
      setDisplay(String(pct));
      updateNumericOutput(String(pct));
      setUpperText(`${currentNum}% = ${pct}`);
      return;
    }

    // (H) 2ndF + EXP = 'π' (Pi)
    if (is2ndF && key === 'EXP') {
      setIs2ndF(false);
      const piVal = Math.PI;
      setDisplay(String(piVal));
      updateNumericOutput(String(piVal));
      setUpperText('π = 3.14159265...');
      if (activeMode === 'NORMAL') {
        setFormulaBuffer((prev) => prev + String(piVal));
      }
      return;
    }

    // (I) EXP = Scientific notation exponent 'E'
    if (key === 'EXP') {
      setIs2ndF(false);
      if (!display.includes('e') && !display.includes('E')) {
        setDisplay((prev) => prev + 'e');
      }
      return;
    }

    // --- 7. Digits (0 - 9) ---
    if (/^[0-9]$/.test(key)) {
      if (waitingForOperand || display === '0.' || display.includes('=')) {
        setDisplay(key);
        setWaitingForOperand(false);
      } else {
        setDisplay((prev) => (prev === '0' ? key : prev + key));
      }

      if (activeMode === 'NORMAL') {
        setFormulaBuffer((prev) => prev + key);
        setUpperText((prev) => prev + key);
      }

      setIs2ndF(false);
      return;
    }

    // --- 8. Decimal Point (.) ---
    if (key === '.') {
      if (waitingForOperand || display.includes('=')) {
        setDisplay('0.');
        setWaitingForOperand(false);
      } else if (!display.includes('.')) {
        setDisplay((prev) => prev + '.');
      }

      if (activeMode === 'NORMAL') {
        setFormulaBuffer((prev) => prev + '.');
        setUpperText((prev) => prev + '.');
      }

      setIs2ndF(false);
      return;
    }

    // --- 9. Sign Toggle (+/-) ---
    if (key === '+/-') {
      const num = parseFloat(display.replace(/,/g, ''));
      if (!isNaN(num)) {
        const toggled = -num;
        setDisplay(String(toggled));
        if (activeMode === 'NORMAL') {
          setFormulaBuffer((prev) => `(-${prev})`);
        }
      }
      setIs2ndF(false);
      return;
    }

    // --- 10. COMP (Compute) ---
    if (key === 'COMP') {
      setIsComp(true);
      setDisplay('COMP');
      setIs2ndF(false);
      return;
    }

    // --- 11. TVM Financial Keys: N, I/Y, PV, PMT, FV ---
    if (['N', 'IY', 'PV', 'PMT', 'FV'].includes(key)) {
      const inputVal = parseFloat(display.replace(/[^0-9.-]/g, ''));

      // 2ndF Combinations:
      if (is2ndF) {
        if (key === 'FV') {
          // 2ndF + FV = CLR TVM
          setTvmRegisters((prev) => ({
            ...prev,
            N: null,
            IY: null,
            PV: null,
            PMT: null,
            FV: null,
          }));
          setDisplay('CLR TVM');
          flashScreen('TVM CLEARED', 600);
          setIs2ndF(false);
          return;
        }

        if (key === 'PMT') {
          // 2ndF + PMT = BGN / END Toggle
          setTvmRegisters((prev) => ({
            ...prev,
            isBGN: !prev.isBGN,
          }));
          flashScreen(tvmRegisters.isBGN ? 'END MODE' : 'BGN MODE', 700);
          setIs2ndF(false);
          return;
        }

        if (key === 'PV') {
          // P/Y (Payments per year)
          if (!isNaN(inputVal) && inputVal > 0) {
            setTvmRegisters((prev) => ({ ...prev, PY: inputVal, CY: inputVal }));
            setDisplay(`P/Y = ${inputVal}`);
          } else {
            setDisplay(`P/Y = ${tvmRegisters.PY}`);
          }
          setIs2ndF(false);
          return;
        }
      }

      // If COMP was pressed: SOLVE for the requested TVM variable
      if (isComp) {
        setIsComp(false);
        try {
          const params = {
            n: tvmRegisters.N ?? 0,
            iy: tvmRegisters.IY ?? 0,
            pv: tvmRegisters.PV ?? 0,
            pmt: tvmRegisters.PMT ?? 0,
            fv: tvmRegisters.FV ?? 0,
            py: tvmRegisters.PY,
            cy: tvmRegisters.CY,
            bgn: tvmRegisters.isBGN,
          };

          let result = 0;
          if (key === 'FV') {
            result = calculateFV(params);
            setTvmRegisters((r) => ({ ...r, FV: result }));
            setDisplay(`FV = ${formatFinancial(result)}`);
          } else if (key === 'PV') {
            result = calculatePV(params);
            setTvmRegisters((r) => ({ ...r, PV: result }));
            setDisplay(`PV = ${formatFinancial(result)}`);
          } else if (key === 'PMT') {
            result = calculatePMT(params);
            setTvmRegisters((r) => ({ ...r, PMT: result }));
            setDisplay(`PMT = ${formatFinancial(result)}`);
          } else if (key === 'N') {
            result = calculateN(params);
            setTvmRegisters((r) => ({ ...r, N: result }));
            setDisplay(`N = ${formatFinancial(result, 2)}`);
          } else if (key === 'IY') {
            result = calculateIY(params);
            setTvmRegisters((r) => ({ ...r, IY: result }));
            setDisplay(`I/Y = ${formatFinancial(result, 2)}`);
          }
          updateNumericOutput(String(result));
        } catch {
          setDisplay('Error 2');
          flashScreen('MATH DOMAIN ERROR', 900);
        }
        return;
      }

      // Otherwise: STORE input value into the selected register
      if (!isNaN(inputVal)) {
        if (key === 'N') {
          setTvmRegisters((r) => ({ ...r, N: inputVal }));
          setDisplay(`N = ${formatFinancial(inputVal, 2)}`);
        } else if (key === 'IY') {
          setTvmRegisters((r) => ({ ...r, IY: inputVal }));
          setDisplay(`I/Y = ${formatFinancial(inputVal, 2)}`);
        } else if (key === 'PV') {
          setTvmRegisters((r) => ({ ...r, PV: inputVal }));
          setDisplay(`PV = ${formatFinancial(inputVal, 2)}`);
        } else if (key === 'PMT') {
          setTvmRegisters((r) => ({ ...r, PMT: inputVal }));
          setDisplay(`PMT = ${formatFinancial(inputVal, 2)}`);
        } else if (key === 'FV') {
          setTvmRegisters((r) => ({ ...r, FV: inputVal }));
          setDisplay(`FV = ${formatFinancial(inputVal, 2)}`);
        }
      }
      setWaitingForOperand(true);
      return;
    }

    // --- 12. CFi and CASH Worksheet ---
    if (key === 'CFi') {
      if (is2ndF) {
        setIsInCashWorksheet(true);
        setCashWorksheetIndex('rate');
        setDisplay(`RATE(I/Y) = ${formatFinancial(cashWorksheetRate)}`);
        setIs2ndF(false);
        return;
      }

      const num = parseFloat(display.replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) {
        const nextId = cashFlows.length;
        setCashFlows((prev) => [
          ...prev,
          { id: nextId, label: `CF${nextId}`, amount: num, freq: 1 },
        ]);
        setDisplay('DATA SET : CFi');
        setWaitingForOperand(true);
      }
      return;
    }

    // --- 13. Arrow Navigation (▲ / ▼) for Worksheets ---
    if (key === 'DOWN' || key === 'UP') {
      if (isInCashWorksheet) {
        const flows = cashFlows.map((c) => c.amount);
        if (key === 'DOWN') {
          if (cashWorksheetIndex === 'rate') {
            setCashWorksheetIndex('npv');
            const npv = calculateNPV(flows, cashWorksheetRate);
            setDisplay(`NET_PV = ${formatFinancial(npv)}`);
            updateNumericOutput(String(npv));
          } else if (cashWorksheetIndex === 'npv') {
            setCashWorksheetIndex('irr');
            try {
              const irr = calculateIRR(flows);
              setDisplay(`IRR = ${formatFinancial(irr, 2)}%`);
              updateNumericOutput(String(irr));
            } catch {
              setDisplay('IRR = Error 2');
            }
          }
        } else {
          if (cashWorksheetIndex === 'irr') {
            setCashWorksheetIndex('npv');
            const npv = calculateNPV(flows, cashWorksheetRate);
            setDisplay(`NET_PV = ${formatFinancial(npv)}`);
          } else if (cashWorksheetIndex === 'npv') {
            setCashWorksheetIndex('rate');
            setDisplay(`RATE(I/Y) = ${formatFinancial(cashWorksheetRate)}`);
          }
        }
        return;
      }

      if (isInAmrtWorksheet) {
        if (key === 'DOWN') {
          const pv = tvmRegisters.PV ?? 0;
          const iy = tvmRegisters.IY ?? 0;
          const pmt = tvmRegisters.PMT ?? 0;
          const sched = calculateAmortization(pv, iy, pmt, amrtP1, amrtP2, tvmRegisters.PY);

          if (amrtView === 'p1') {
            setAmrtView('p2');
            setDisplay(`P2 = ${amrtP2}.00`);
          } else if (amrtView === 'p2') {
            setAmrtView('bal');
            setDisplay(`BAL = ${formatFinancial(sched.balance)}`);
          } else if (amrtView === 'bal') {
            setAmrtView('prn');
            setDisplay(`PRN = -${formatFinancial(sched.principalPaid)}`);
          } else if (amrtView === 'prn') {
            setAmrtView('int');
            setDisplay(`INT = -${formatFinancial(sched.interestPaid)}`);
          }
        }
        return;
      }
    }

    // --- 14. AMRT (Amortization Worksheet) ---
    if (key === 'AMRT') {
      setIsInAmrtWorksheet(true);
      setAmrtView('p1');
      setDisplay(`P1 = ${amrtP1}.00`);
      return;
    }

    // --- 15. Arithmetic Operators: +, -, ×, ÷ ---
    if (['+', '-', '×', '÷'].includes(key)) {
      if (activeMode === 'NORMAL') {
        const symbol = key;
        const nextBuf = (formulaBuffer || display) + ` ${symbol} `;
        setFormulaBuffer(nextBuf);
        setUpperText(nextBuf);
        setWaitingForOperand(true);
        setIs2ndF(false);
        return;
      }

      const currentVal = parseFloat(display.replace(/[^0-9.-]/g, ''));
      if (accumulator === null) {
        setAccumulator(currentVal);
      } else if (pendingOp && !waitingForOperand) {
        let res = accumulator;
        if (pendingOp === '+') res += currentVal;
        if (pendingOp === '-') res -= currentVal;
        if (pendingOp === '×') res *= currentVal;
        if (pendingOp === '÷') res = currentVal !== 0 ? res / currentVal : 0;
        setAccumulator(res);
        setDisplay(String(res));
      }
      setPendingOp(key as '+' | '-' | '×' | '÷');
      setWaitingForOperand(true);
      setIs2ndF(false);
      return;
    }

    // --- 16. ENT / = (Enter or Equal) ---
    if (key === 'ENT') {
      // In CASH worksheet: store discount rate
      if (isInCashWorksheet && cashWorksheetIndex === 'rate') {
        const val = parseFloat(display.replace(/[^0-9.-]/g, ''));
        if (!isNaN(val)) {
          setCashWorksheetRate(val);
          setDisplay(`RATE(I/Y) = ${formatFinancial(val)}`);
        }
        return;
      }

      // In AMRT worksheet
      if (isInAmrtWorksheet) {
        const val = parseInt(display.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(val)) {
          if (amrtView === 'p1') {
            setAmrtP1(val);
            setAmrtView('p2');
            setDisplay(`P2 = ${val}.00`);
          } else if (amrtView === 'p2') {
            setAmrtP2(val);
            setDisplay(`P2 = ${val}.00`);
          }
        }
        return;
      }

      // If in NORMAL / Algebra Mode: evaluate formula buffer
      if (activeMode === 'NORMAL' && formulaBuffer.trim().length > 0) {
        const varScope: Record<string, number> = {};
        Object.entries(algebraRegisters).forEach(([k, v]) => {
          if (v !== null) varScope[k] = v;
        });

        const evalRes = evaluateAlgebraicExpression(formulaBuffer, varScope);
        if (evalRes.error) {
          setDisplay('Error 2');
          flashScreen(evalRes.error.toUpperCase(), 900);
        } else {
          setDisplay(String(evalRes.result));
          setUpperText(`${formulaBuffer} =`);
          updateNumericOutput(String(evalRes.result));
          setFormulaBuffer(String(evalRes.result));
          setWaitingForOperand(true);
        }
        setIs2ndF(false);
        return;
      }

      // Standard arithmetic evaluation
      if (pendingOp && accumulator !== null) {
        const currentVal = parseFloat(display.replace(/[^0-9.-]/g, ''));
        let res = accumulator;
        if (pendingOp === '+') res += currentVal;
        if (pendingOp === '-') res -= currentVal;
        if (pendingOp === '×') res *= currentVal;
        if (pendingOp === '÷') res = currentVal !== 0 ? res / currentVal : 0;

        setDisplay(String(res));
        updateNumericOutput(String(res));
        setAccumulator(null);
        setPendingOp(null);
        setWaitingForOperand(true);
      }
      setIs2ndF(false);
      return;
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key;
      if (/^[0-9]$/.test(key)) {
        handleKeyPress(key);
      } else if (key === '.') {
        handleKeyPress('.');
      } else if (key === '+') {
        handleKeyPress('+');
      } else if (key === '-') {
        handleKeyPress('-');
      } else if (key === '*') {
        handleKeyPress('×');
      } else if (key === '/') {
        handleKeyPress('÷');
      } else if (key === '(') {
        setIs2ndF(true);
        handleKeyPress('7');
      } else if (key === ')') {
        setIs2ndF(true);
        handleKeyPress('8');
      } else if (key === '^') {
        setIs2ndF(true);
        handleKeyPress('3');
      } else if (key.toLowerCase() === 'p') {
        setIs2ndF(true);
        handleKeyPress('EXP');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleKeyPress('ENT');
      } else if (key === 'Backspace') {
        handleKeyPress('DEL');
      } else if (key.toLowerCase() === 'c' || key === 'Escape') {
        handleKeyPress('C');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const isKeyHighlighted = (keyId: string) => {
    return isTutorialMode && targetKey === keyId;
  };

  return (
    <CalculatorScaleContext.Provider value={activeScale}>
      <div className="flex flex-col items-center justify-center select-none">
        {/* Sharp EL-738 Physical Calculator Chassis */}
        <div
          className={`bg-gradient-to-b from-[#d5dae0] via-[#c6ccd4] to-[#b3bac4] transition-all relative ${
            activeScale === 'mini'
              ? 'w-[235px] sm:w-[245px] p-2 rounded-xl border-2 border-[#8e9ca8] shadow-lg'
              : activeScale === 'compact'
              ? 'w-[270px] sm:w-[285px] p-2.5 rounded-xl border-2 sm:border-3 border-[#8e9ca8] shadow-xl'
              : 'w-[365px] sm:w-[395px] p-4 sm:p-5 rounded-2xl border-4 border-[#8e9ca8] shadow-2xl'
          }`}
        >
          {/* Brand Header, Size Switcher & Model Plate */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div>
              <span
                className={`font-extrabold tracking-widest text-[#1e293b] font-sans ${
                  activeScale === 'mini' ? 'text-xs' : activeScale === 'compact' ? 'text-sm' : 'text-base sm:text-lg'
                }`}
              >
                SHARP
              </span>
              <span
                className={`font-mono tracking-wider text-slate-600 block -mt-1 font-bold ${
                  activeScale === 'mini' ? 'text-[8px]' : activeScale === 'compact' ? 'text-[9px]' : 'text-[10px]'
                }`}
              >
                EL-738
              </span>
            </div>

            {/* Quick Size Scale Toggle */}
            <div className="flex items-center gap-0.5 bg-slate-800/10 p-0.5 rounded text-[8px] sm:text-[9px] font-bold text-slate-700">
              <button
                type="button"
                onClick={() => handleScaleChange('mini')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  activeScale === 'mini' ? 'bg-slate-800 text-white shadow-xs' : 'hover:bg-slate-700/10'
                }`}
                title="Mini size"
              >
                Mini
              </button>
              <button
                type="button"
                onClick={() => handleScaleChange('compact')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  activeScale === 'compact' ? 'bg-slate-800 text-white shadow-xs' : 'hover:bg-slate-700/10'
                }`}
                title="Compact size"
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => handleScaleChange('standard')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  activeScale === 'standard' ? 'bg-slate-800 text-white shadow-xs' : 'hover:bg-slate-700/10'
                }`}
                title="Big size (roomy keypad & large screen)"
              >
                Big
              </button>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-600 block">
                {activeMode === 'NORMAL' ? 'ALGEBRA' : 'FINANCIAL'}
              </span>
              <span className="text-[7.5px] tracking-tight text-slate-500 font-mono">
                2-LINE
              </span>
            </div>
          </div>

          {/* Photorealistic 2-Line Dot-Matrix / LCD Display */}
          <div
            className={`bg-[#8b9975] border-2 sm:border-3 border-[#3f4735] shadow-inner flex flex-col justify-between font-mono relative transition-all ${
              activeScale === 'mini'
                ? 'min-h-[50px] p-1.5 pb-2 rounded mb-2'
                : activeScale === 'compact'
                ? 'min-h-[58px] p-2 pb-2.5 rounded mb-2.5'
                : 'min-h-[82px] p-3 pb-3.5 sm:p-3.5 sm:pb-4 rounded-xl mb-3.5 border-3 sm:border-4 border-[#3f4735]'
            }`}
          >
            {/* LCD Backlight & Pixel Texture overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent pointer-events-none rounded" />

            {/* Top Status & Variable Prompt Line */}
            <div
              className={`flex items-center justify-between text-[#242b1f] font-bold tracking-wider relative z-10 ${
                activeScale === 'mini' ? 'text-[8.5px]' : activeScale === 'compact' ? 'text-[9.5px]' : 'text-[11px] sm:text-xs'
              }`}
            >
              <div className="flex gap-1">
                <span className="bg-[#242b1f] text-[#8b9975] px-1 rounded-xs font-bold text-[8px] sm:text-[9px]">
                  {activeMode === 'NORMAL' ? 'NORM' : 'FIN'}
                </span>
                <span className={is2ndF || statusOverride?.includes('2ndF') ? 'bg-[#242b1f] text-[#8b9975] px-1 rounded-xs' : 'opacity-20'}>
                  2ndF
                </span>
                <span className={tvmRegisters.isBGN || statusOverride?.includes('BGN') ? 'bg-[#242b1f] text-[#8b9975] px-1 rounded-xs font-extrabold' : 'opacity-20'}>
                  BGN
                </span>
                <span className={isComp ? 'bg-[#242b1f] text-[#8b9975] px-1 rounded-xs' : 'opacity-20'}>
                  COMP
                </span>
              </div>
              <div className="text-right truncate font-bold text-[#1f2619] max-w-[150px]">
                {upperText || currentStatus}
              </div>
            </div>

            {/* Main LCD Numbers Display */}
            <div
              className={`text-right font-bold text-[#0f140c] leading-normal tracking-tight truncate font-mono drop-shadow-xs relative z-10 mt-0.5 ${
                activeScale === 'mini'
                  ? (display.length > 10 ? 'text-[0.75rem]' : 'text-[0.85rem]')
                  : activeScale === 'compact'
                  ? (display.length > 12 ? 'text-[0.85rem]' : display.length > 9 ? 'text-[0.92rem]' : 'text-[1.02rem] sm:text-[1.1rem]')
                  : (display.length > 12 ? 'text-lg' : display.length > 9 ? 'text-xl' : 'text-2xl sm:text-3xl font-black')
              }`}
            >
              {statusMessage ? (
                <span className="text-[10px] sm:text-[11px] tracking-normal animate-pulse">{statusMessage}</span>
              ) : (
                display
              )}
            </div>
          </div>

          {/* Sharp EL-738 Physical Keypad Matrix */}
          <div
            className={`grid grid-cols-5 transition-all ${
              activeScale === 'mini' ? 'gap-1' : activeScale === 'compact' ? 'gap-1 sm:gap-1.5' : 'gap-1.5 sm:gap-2.5'
            }`}
          >
          {/* Row 1 */}
          <KeyBtn
            id="2ndF"
            label="2ndF"
            color="orange"
            highlight={isKeyHighlighted('2ndF')}
            onClick={() => handleKeyPress('2ndF')}
          />
          <KeyBtn
            id="SETUP"
            label="SET UP"
            secondaryLabel=""
            color="grey"
            highlight={isKeyHighlighted('SETUP')}
            onClick={() => handleKeyPress('SETUP')}
          />
          <KeyBtn
            id="UP"
            label="▲"
            color="grey"
            highlight={isKeyHighlighted('UP')}
            onClick={() => handleKeyPress('UP')}
          />
          <KeyBtn
            id="DOWN"
            label="▼"
            color="grey"
            highlight={isKeyHighlighted('DOWN')}
            onClick={() => handleKeyPress('DOWN')}
          />
          <KeyBtn
            id="C"
            label="C / ON"
            secondaryLabel="CA"
            color="red"
            highlight={isKeyHighlighted('C')}
            onClick={() => handleKeyPress('C')}
          />

          {/* Row 2 */}
          <KeyBtn
            id="MODE"
            label="MODE"
            color="grey"
            highlight={isKeyHighlighted('MODE')}
            onClick={() => handleKeyPress('MODE')}
          />
          <KeyBtn
            id="EXP"
            label="Exp"
            secondaryLabel="π"
            color="grey"
            highlight={isKeyHighlighted('EXP')}
            onClick={() => handleKeyPress('EXP')}
          />
          <KeyBtn
            id="N"
            label="N"
            color="teal"
            highlight={isKeyHighlighted('N')}
            onClick={() => handleKeyPress('N')}
          />
          <KeyBtn
            id="IY"
            label="I/Y"
            color="teal"
            highlight={isKeyHighlighted('IY')}
            onClick={() => handleKeyPress('IY')}
          />
          <KeyBtn
            id="PV"
            label="PV"
            secondaryLabel="P/Y"
            color="teal"
            highlight={isKeyHighlighted('PV')}
            onClick={() => handleKeyPress('PV')}
          />

          {/* Row 3 */}
          <KeyBtn
            id="PMT"
            label="PMT"
            secondaryLabel="BGN"
            color="teal"
            highlight={isKeyHighlighted('PMT')}
            onClick={() => handleKeyPress('PMT')}
          />
          <KeyBtn
            id="FV"
            label="FV"
            secondaryLabel="CLR TVM"
            color="teal"
            highlight={isKeyHighlighted('FV')}
            onClick={() => handleKeyPress('FV')}
          />
          <KeyBtn
            id="COMP"
            label="COMP"
            color="teal"
            highlight={isKeyHighlighted('COMP')}
            onClick={() => handleKeyPress('COMP')}
          />
          <KeyBtn
            id="AMRT"
            label="AMRT"
            color="teal"
            highlight={isKeyHighlighted('AMRT')}
            onClick={() => handleKeyPress('AMRT')}
          />
          <KeyBtn
            id="CFi"
            label="CFi"
            secondaryLabel="CASH"
            color="teal"
            highlight={isKeyHighlighted('CFi')}
            onClick={() => handleKeyPress('CFi')}
          />

          {/* Row 4 */}
          <KeyBtn
            id="STO"
            label="STO"
            color="teal"
            highlight={isKeyHighlighted('STO')}
            onClick={() => handleKeyPress('STO')}
          />
          <KeyBtn
            id="RCL"
            label="RCL"
            color="teal"
            highlight={isKeyHighlighted('RCL')}
            onClick={() => handleKeyPress('RCL')}
          />
          <KeyBtn
            id="7"
            label="7"
            secondaryLabel="("
            color="dark"
            highlight={isKeyHighlighted('7')}
            onClick={() => handleKeyPress('7')}
          />
          <KeyBtn
            id="8"
            label="8"
            secondaryLabel=")"
            color="dark"
            highlight={isKeyHighlighted('8')}
            onClick={() => handleKeyPress('8')}
          />
          <KeyBtn
            id="9"
            label="9"
            secondaryLabel="√"
            color="dark"
            highlight={isKeyHighlighted('9')}
            onClick={() => handleKeyPress('9')}
          />

          {/* Row 5 */}
          <KeyBtn
            id="DEL"
            label="DEL"
            color="red"
            highlight={isKeyHighlighted('DEL')}
            onClick={() => handleKeyPress('DEL')}
          />
          <KeyBtn
            id="÷"
            label="÷"
            color="dark"
            highlight={isKeyHighlighted('÷')}
            onClick={() => handleKeyPress('÷')}
          />
          <KeyBtn
            id="4"
            label="4"
            secondaryLabel="nPr"
            color="dark"
            highlight={isKeyHighlighted('4')}
            onClick={() => handleKeyPress('4')}
          />
          <KeyBtn
            id="5"
            label="5"
            secondaryLabel="nCr"
            color="dark"
            highlight={isKeyHighlighted('5')}
            onClick={() => handleKeyPress('5')}
          />
          <KeyBtn
            id="6"
            label="6"
            secondaryLabel="%"
            color="dark"
            highlight={isKeyHighlighted('6')}
            onClick={() => handleKeyPress('6')}
          />

          {/* Row 6 */}
          <KeyBtn
            id="×"
            label="×"
            color="dark"
            highlight={isKeyHighlighted('×')}
            onClick={() => handleKeyPress('×')}
          />
          <KeyBtn
            id="1"
            label="1"
            secondaryLabel="x²"
            color="dark"
            highlight={isKeyHighlighted('1')}
            onClick={() => handleKeyPress('1')}
          />
          <KeyBtn
            id="2"
            label="2"
            secondaryLabel="1/x"
            color="dark"
            highlight={isKeyHighlighted('2')}
            onClick={() => handleKeyPress('2')}
          />
          <KeyBtn
            id="3"
            label="3"
            secondaryLabel="yˣ"
            color="dark"
            highlight={isKeyHighlighted('3')}
            onClick={() => handleKeyPress('3')}
          />
          <KeyBtn
            id="-"
            label="-"
            color="dark"
            highlight={isKeyHighlighted('-')}
            onClick={() => handleKeyPress('-')}
          />

          {/* Row 7 */}
          <KeyBtn
            id="0"
            label="0"
            secondaryLabel="RND"
            color="dark"
            highlight={isKeyHighlighted('0')}
            onClick={() => handleKeyPress('0')}
          />
          <KeyBtn
            id="+/-"
            label="+/-"
            color="dark"
            highlight={isKeyHighlighted('+/-')}
            onClick={() => handleKeyPress('+/-')}
          />
          <KeyBtn
            id="."
            label="."
            color="dark"
            highlight={isKeyHighlighted('.')}
            onClick={() => handleKeyPress('.')}
          />
          <KeyBtn
            id="+"
            label="+"
            color="dark"
            highlight={isKeyHighlighted('+')}
            onClick={() => handleKeyPress('+')}
          />
          <KeyBtn
            id="ENT"
            label="ENT / ="
            color="orange"
            highlight={isKeyHighlighted('ENT')}
            onClick={() => handleKeyPress('ENT')}
          />
        </div>
      </div>
    </div>
    </CalculatorScaleContext.Provider>
  );
};

// Reusable Photorealistic Button Component with Dynamic Scale
interface KeyBtnProps {
  id: string;
  label: string;
  secondaryLabel?: string;
  color: 'orange' | 'teal' | 'red' | 'grey' | 'dark';
  highlight?: boolean;
  onClick: () => void;
}

const KeyBtn: React.FC<KeyBtnProps> = ({
  id,
  label,
  secondaryLabel,
  color,
  highlight,
  onClick,
}) => {
  const scale = React.useContext(CalculatorScaleContext);

  const colorStyles = {
    orange: 'bg-[#ff9900] text-slate-950 font-bold border-b-2 border-[#b36b00] hover:bg-[#ffa726]',
    teal: 'bg-[#0f766e] text-white font-bold border-b-2 border-[#094e49] hover:bg-[#115e59]',
    red: 'bg-[#dc2626] text-white font-bold border-b-2 border-[#991b1b] hover:bg-[#b91c1c]',
    grey: 'bg-[#475569] text-white font-bold border-b-2 border-[#334155] hover:bg-[#64748b]',
    dark: 'bg-[#1e293b] text-white font-bold border-b-2 border-[#0f172a] hover:bg-[#334155]',
  };

  const btnClasses =
    scale === 'mini'
      ? 'h-6 rounded-xs text-[9px]'
      : scale === 'compact'
      ? 'h-7 sm:h-7.5 rounded text-[10px] sm:text-[10.5px]'
      : 'h-10 sm:h-11 rounded-lg text-xs sm:text-sm font-extrabold shadow-sm';

  const labelClasses =
    scale === 'mini'
      ? 'text-[6.5px] h-2 leading-none'
      : scale === 'compact'
      ? 'text-[7.5px] sm:text-[8px] h-2.5 leading-none'
      : 'text-[9.5px] sm:text-[10.5px] h-3.5 leading-none font-extrabold';

  return (
    <div className="flex flex-col items-center justify-end">
      {/* 2ndF Secondary Action Printed in Orange Above Key */}
      <span className={`font-bold text-[#ea580c] tracking-tight truncate max-w-full ${labelClasses}`}>
        {secondaryLabel || ''}
      </span>
      <button
        id={`btn-${id}`}
        type="button"
        onClick={onClick}
        className={`w-full flex items-center justify-center cursor-pointer transition-all active:translate-y-0.5 active:border-b-0 select-none shadow-xs relative ${btnClasses} ${
          colorStyles[color]
        } ${
          highlight
            ? 'ring-4 ring-amber-400 animate-pulse scale-105 z-20 shadow-lg'
            : ''
        }`}
      >
        <span className="truncate px-0.5">{label}</span>
      </button>
    </div>
  );
};
