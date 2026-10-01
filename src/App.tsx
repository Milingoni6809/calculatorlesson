import React, { useState } from 'react';
import { LESSONS } from './data/lessons';
import { TVMRegisters, CashFlowItem, AlgebraRegisters } from './types';
import { Calculator } from './components/Calculator';
import { LessonViewer } from './components/LessonViewer';
import { RegisterInspector } from './components/RegisterInspector';
import { CheatsheetModal } from './components/CheatsheetModal';
import {
  Volume2,
  VolumeX,
  FileText,
  Sparkles,
} from 'lucide-react';
import { setSoundEnabled, isSoundEnabled } from './utils/audio';

export default function App() {
  // Sound toggle
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  // Cheatsheet modal state
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  // Chigoxa Tutorial state
  const [activeLessonId, setActiveLessonId] = useState<string>('tvm');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Calculator mode (NORMAL / Mode 0 vs FINANCIAL / Mode 1)
  const [calculatorMode, setCalculatorMode] = useState<'NORMAL' | 'FINANCIAL'>('FINANCIAL');

  // Shared financial register memory
  const [tvmRegisters, setTvmRegisters] = useState<TVMRegisters>({
    N: null,
    IY: null,
    PV: null,
    PMT: null,
    FV: null,
    PY: 1,
    CY: 1,
    isBGN: false,
  });

  const [cashFlows, setCashFlows] = useState<CashFlowItem[]>([]);

  // Shared algebraic variables memory
  const [algebraRegisters, setAlgebraRegisters] = useState<AlgebraRegisters>({
    A: null,
    B: null,
    C: null,
    D: null,
    E: null,
    F: null,
    X: null,
    Y: null,
    M: null,
  });

  const [lastCalculatedNum, setLastCalculatedNum] = useState<number | null>(null);
  const [loadedFormula, setLoadedFormula] = useState<{ expr: string; val: number | string } | null>(null);
  const [calculatorScale, setCalculatorScale] = useState<'compact' | 'mini' | 'standard'>('standard');

  // Current lesson data
  const currentLesson = LESSONS.find((l) => l.id === activeLessonId) || LESSONS[0];
  const activeStep = currentLesson.steps[currentStepIndex];

  // Toggle key sound
  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  // Tutorial step progression logic with robust key aliases
  const handleTutorialKeyPress = (key: string): boolean => {
    if (currentStepIndex >= currentLesson.steps.length) {
      return true;
    }

    const expectedKey = activeStep?.key;

    // Direct match or equivalent aliases (e.g. ENT matches =, 2ndF matches orange toggles)
    const isDirectMatch = key === expectedKey;
    const isAliasMatch =
      (expectedKey === 'ENT' && (key === '=' || key === 'Enter')) ||
      (expectedKey === 'C' && (key === 'Escape' || key === 'c' || key === 'CA')) ||
      (expectedKey === 'DEL' && key === 'Backspace');

    if (isDirectMatch || isAliasMatch) {
      setCurrentStepIndex((prev) => prev + 1);
      return true;
    }

    return false;
  };

  const handleNextStep = () => {
    if (currentStepIndex < currentLesson.steps.length) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleJumpToStep = (index: number) => {
    if (index >= 0 && index <= currentLesson.steps.length) {
      setCurrentStepIndex(index);
    }
  };

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setCurrentStepIndex(0);
    if (lessonId.startsWith('algebra-')) {
      setCalculatorMode('NORMAL');
    } else {
      setCalculatorMode('FINANCIAL');
    }
  };

  const handleRestartLesson = () => {
    setCurrentStepIndex(0);
  };

  const handleClearAllTVM = () => {
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
  };

  const handleClearAllCashFlows = () => {
    setCashFlows([]);
  };

  const handleClearAlgebraVars = () => {
    setAlgebraRegisters({
      A: null,
      B: null,
      C: null,
      D: null,
      E: null,
      F: null,
      X: null,
      Y: null,
      M: null,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Application Header: Exclusively Chigoxa */}
      <header className="bg-[#1e293b] text-white border-b border-slate-700 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-mono font-black text-white text-lg shadow-sm">
              738
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                  Chigoxa
                </h1>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider shadow-2xs">
                  Sharp EL-738 Guide
                </span>
              </div>
              <p className="text-[11px] text-amber-400 font-semibold">
                Developed by MD Tshigomana aka Mr Chigs
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCheatsheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-600 rounded-lg transition-colors cursor-pointer"
              title="View Sharp EL-738 Keystroke Cheatsheet"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Keystroke Guide</span>
            </button>

            <button
              onClick={handleToggleSound}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors cursor-pointer"
              title={soundOn ? 'Mute Key Clicks' : 'Unmute Key Clicks'}
              aria-label="Toggle Sound"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 flex-1">
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Left Column: Sharp EL-738 Physical Calculator & Registers */}
          <div
            className={`w-full shrink-0 flex flex-col gap-3 sticky top-16 transition-all ${
              calculatorScale === 'mini'
                ? 'lg:w-[270px]'
                : calculatorScale === 'compact'
                ? 'lg:w-[310px]'
                : 'lg:w-[410px] xl:w-[430px]'
            }`}
          >
            <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-xs flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Sharp EL-738 Keypad
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 font-semibold px-2 py-0.5 rounded-full">
                  Target: [{activeStep?.key || 'DONE'}]
                </span>
              </div>

              {/* Physical Calculator */}
              <Calculator
                isTutorialMode={true}
                targetKey={activeStep?.key}
                onTutorialKeyPress={handleTutorialKeyPress}
                tvmRegisters={tvmRegisters}
                setTvmRegisters={setTvmRegisters}
                cashFlows={cashFlows}
                setCashFlows={setCashFlows}
                algebraRegisters={algebraRegisters}
                setAlgebraRegisters={setAlgebraRegisters}
                calculatorMode={calculatorMode}
                onModeChange={setCalculatorMode}
                onCalculatedValueChange={setLastCalculatedNum}
                loadedFormula={loadedFormula}
                scale={calculatorScale}
                onScaleChange={setCalculatorScale}
                displayOverride={
                  currentStepIndex > 0
                    ? currentLesson.steps[currentStepIndex - 1]?.expectedDisplay
                    : '0.'
                }
                statusOverride={
                  currentStepIndex > 0
                    ? currentLesson.steps[currentStepIndex - 1]?.expectedStatus
                    : undefined
                }
              />

              {/* Calculator Keyboard Helper footer */}
              <div className="mt-2 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                <span>Keyboard:</span>
                <span className="font-mono bg-slate-100 px-1 rounded text-[9px]">[Enter]=ENT</span>
                <span className="font-mono bg-slate-100 px-1 rounded text-[9px]">[Esc]=C</span>
              </div>
            </div>

            {/* Financial & Algebra Register Memory Inspector */}
            <RegisterInspector
              tvm={tvmRegisters}
              cashFlows={cashFlows}
              algebraRegisters={algebraRegisters}
              onClearTVM={handleClearAllTVM}
              onClearCashFlows={handleClearAllCashFlows}
              onClearAlgebraVars={handleClearAlgebraVars}
              onLoadValueToInput={(val) => {
                setLoadedFormula({ expr: `RCL = ${val}`, val });
              }}
            />
          </div>

          {/* Right Column: Chigoxa Voice Guide & Guided Lessons */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">
            <LessonViewer
              lessons={LESSONS}
              activeLessonId={activeLessonId}
              onSelectLesson={handleSelectLesson}
              currentStepIndex={currentStepIndex}
              onRestartLesson={handleRestartLesson}
              onNextStep={handleNextStep}
              onPrevStep={handlePrevStep}
              onJumpToStep={handleJumpToStep}
            />
          </div>
        </div>
      </main>

      {/* Footer Attribution */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Chigoxa • Sharp EL-738 Financial & Scientific Calculator Guide</span>
          <span>
            Developed by <strong className="text-slate-800">MD Tshigomana aka Mr Chigs</strong>
          </span>
        </div>
      </footer>

      {/* Cheatsheet Modal */}
      <CheatsheetModal
        isOpen={showCheatsheet}
        onClose={() => setShowCheatsheet(false)}
      />
    </div>
  );
}
