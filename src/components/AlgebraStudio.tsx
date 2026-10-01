import React, { useState } from 'react';
import {
  evaluateAlgebraicExpression,
  solveLinearEquation,
  solveQuadraticEquation,
  solveSystem2x2,
  solveBreakEven,
  QuadraticSolution,
  LinearSolution,
  System2x2Solution,
} from '../utils/algebraMath';
import {
  Calculator as CalcIcon,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Layers,
  Send,
} from 'lucide-react';

interface AlgebraStudioProps {
  onLoadIntoCalculator: (value: string | number, formula?: string) => void;
}

export const AlgebraStudio: React.FC<AlgebraStudioProps> = ({ onLoadIntoCalculator }) => {
  // Sub-tabs within Algebra Studio
  const [activeAlgebraTool, setActiveAlgebraTool] = useState<
    'expression' | 'linear' | 'quadratic' | 'system' | 'breakeven'
  >('expression');

  // Tool 1: Algebraic Expression Evaluator State
  const [exprString, setExprString] = useState('(25 + 15) * 3^2 - sqrt(144) + 1/4');
  const [varX, setVarX] = useState<number>(5);
  const [varY, setVarY] = useState<number>(3);
  const [varA, setVarA] = useState<number>(2);
  const [varB, setVarB] = useState<number>(4);

  // Tool 2: Linear Equation (ax + b = c)
  const [linearA, setLinearA] = useState<number>(3);
  const [linearB, setLinearB] = useState<number>(12);
  const [linearC, setLinearC] = useState<number>(45);

  // Tool 3: Quadratic Equation (ax^2 + bx + c = 0)
  const [quadA, setQuadA] = useState<number>(1);
  const [quadB, setQuadB] = useState<number>(-5);
  const [quadC, setQuadC] = useState<number>(6);

  // Tool 4: System of 2 Equations
  const [sysA1, setSysA1] = useState<number>(2);
  const [sysB1, setSysB1] = useState<number>(3);
  const [sysC1, setSysC1] = useState<number>(13);
  const [sysA2, setSysA2] = useState<number>(1);
  const [sysB2, setSysB2] = useState<number>(-1);
  const [sysC2, setSysC2] = useState<number>(4);

  // Tool 5: Break-Even Algebra
  const [fixedCost, setFixedCost] = useState<number>(12000);
  const [pricePerUnit, setPricePerUnit] = useState<number>(85);
  const [varCostPerUnit, setVarCostPerUnit] = useState<number>(35);

  // Computed: Expression evaluation
  const exprEval = evaluateAlgebraicExpression(exprString, {
    X: varX,
    Y: varY,
    A: varA,
    B: varB,
  });

  // Computed: Linear Solution
  const linearSol: LinearSolution = solveLinearEquation(linearA, linearB, linearC);

  // Computed: Quadratic Solution
  let quadSol: QuadraticSolution | null = null;
  let quadError: string | null = null;
  try {
    quadSol = solveQuadraticEquation(quadA, quadB, quadC);
  } catch (err: unknown) {
    quadError = err instanceof Error ? err.message : 'Invalid quadratic equation';
  }

  // Computed: System Solution
  const sysSol: System2x2Solution = solveSystem2x2(sysA1, sysB1, sysC1, sysA2, sysB2, sysC2);

  // Computed: Break-even
  let beSol: {
    breakEvenUnits: number;
    breakEvenRevenue: number;
    contributionMargin: number;
    cmRatio: number;
  } | null = null;
  try {
    beSol = solveBreakEven(fixedCost, pricePerUnit, varCostPerUnit);
  } catch {
    beSol = null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Studio Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Algebra Calculations & Equation Studio
              </h2>
              <p className="text-xs text-slate-500">
                Solve algebraic expressions, linear equations, quadratics, and systems with step-by-step mathematical working
              </p>
            </div>
          </div>

          {/* Sub-tools Navigation Pills */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveAlgebraTool('expression')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeAlgebraTool === 'expression'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expressions (PEMDAS)
            </button>
            <button
              onClick={() => setActiveAlgebraTool('linear')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeAlgebraTool === 'linear'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Linear (ax + b = c)
            </button>
            <button
              onClick={() => setActiveAlgebraTool('quadratic')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeAlgebraTool === 'quadratic'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quadratic (ax² + bx + c = 0)
            </button>
            <button
              onClick={() => setActiveAlgebraTool('system')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeAlgebraTool === 'system'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2x2 System (Cramer)
            </button>
            <button
              onClick={() => setActiveAlgebraTool('breakeven')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeAlgebraTool === 'breakeven'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Break-Even Algebra
            </button>
          </div>
        </div>

        {/* TOOL 1: EXPRESSION EVALUATOR (PEMDAS) */}
        {activeAlgebraTool === 'expression' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Algebraic Expression to Evaluate:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={exprString}
                  onChange={(e) => setExprString(e.target.value)}
                  placeholder="e.g. (2*X + Y)^2 - sqrt(144) + 1/4"
                  className="flex-1 px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
                />
                <button
                  onClick={() => {
                    if (!exprEval.error) {
                      onLoadIntoCalculator(exprEval.result, exprString);
                    }
                  }}
                  disabled={!!exprEval.error}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Send expression result to physical calculator LCD"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to EL-738</span>
                </button>
              </div>
            </div>

            {/* Quick Expression Presets */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Common Algebraic Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'PEMDAS Order', expr: '(15 + 25) / (8 - 3)^2 + 4 * 3' },
                  { label: 'Pythagorean: √(A² + B²)', expr: 'sqrt(A^2 + B^2)' },
                  { label: 'Binomial Expansion: (A + B)²', expr: '(A + B)^2' },
                  { label: 'Compound Growth: P*(1+r)^n', expr: '1000 * (1 + 0.05)^10' },
                  { label: 'Powers & Roots', expr: 'sqrt(256) + 4^3 - 1/5' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setExprString(preset.expr)}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-md transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Variable Sliders (X, Y, A, B) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Active Variable Values (X, Y, A, B):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 font-mono block text-[11px]">Variable X = {varX}</label>
                  <input
                    type="range"
                    min="-20"
                    max="50"
                    value={varX}
                    onChange={(e) => setVarX(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-mono block text-[11px]">Variable Y = {varY}</label>
                  <input
                    type="range"
                    min="-20"
                    max="50"
                    value={varY}
                    onChange={(e) => setVarY(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-mono block text-[11px]">Variable A = {varA}</label>
                  <input
                    type="range"
                    min="-20"
                    max="50"
                    value={varA}
                    onChange={(e) => setVarA(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-mono block text-[11px]">Variable B = {varB}</label>
                  <input
                    type="range"
                    min="-20"
                    max="50"
                    value={varB}
                    onChange={(e) => setVarB(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Evaluated Outcome Box */}
            <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-indigo-200 uppercase tracking-widest font-mono block">
                  Evaluated Result:
                </span>
                {exprEval.error ? (
                  <span className="text-rose-400 font-mono font-bold text-base">
                    Error: {exprEval.error}
                  </span>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-300">
                      {Number(exprEval.result.toFixed(6)).toString()}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      (exact: {exprEval.result})
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right text-xs text-slate-300 font-mono">
                <span className="block text-[11px] text-slate-400">Sharp EL-738 Mode:</span>
                <span className="text-emerald-400 font-bold">NORMAL (Mode 0)</span>
              </div>
            </div>

            {/* How to calculate this on Sharp EL-738 */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                How to Enter Parentheses & Powers on Sharp EL-738:
              </h4>
              <p className="text-slate-600 leading-relaxed mb-2">
                On the Sharp EL-738, parentheses <code className="bg-white px-1 border rounded font-mono">(</code> and <code className="bg-white px-1 border rounded font-mono">)</code> are located above keys <kbd className="font-mono px-1 bg-white border rounded">7</kbd> and <kbd className="font-mono px-1 bg-white border rounded">8</kbd>. Press <kbd className="font-mono px-1 bg-amber-100 text-amber-900 border rounded font-bold">2ndF</kbd> + <kbd className="font-mono px-1 bg-white border rounded">7</kbd> for <kbd>(</kbd>, and <kbd className="font-mono px-1 bg-amber-100 text-amber-900 border rounded font-bold">2ndF</kbd> + <kbd className="font-mono px-1 bg-white border rounded">8</kbd> for <kbd>)</kbd>.
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-600">
                <span className="bg-white px-2 py-0.5 rounded border">Square Root: [2ndF] + [9] (√)</span>
                <span className="bg-white px-2 py-0.5 rounded border">Square: [2ndF] + [1] (x²)</span>
                <span className="bg-white px-2 py-0.5 rounded border">Reciprocal: [2ndF] + [2] (1/x)</span>
                <span className="bg-white px-2 py-0.5 rounded border">Powers: [2ndF] + [3] (yˣ)</span>
              </div>
            </div>
          </div>
        )}

        {/* TOOL 2: LINEAR EQUATION SOLVER (ax + b = c) */}
        {activeAlgebraTool === 'linear' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Linear Equation Format: <code className="font-mono text-indigo-700 font-bold">a · x + b = c</code>
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-500 block mb-1">Coefficient a:</label>
                  <input
                    type="number"
                    value={linearA}
                    onChange={(e) => setLinearA(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-500 block mb-1">Constant b:</label>
                  <input
                    type="number"
                    value={linearB}
                    onChange={(e) => setLinearB(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-500 block mb-1">Constant c:</label>
                  <input
                    type="number"
                    value={linearC}
                    onChange={(e) => setLinearC(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Linear Solution Banner */}
            <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-indigo-200 uppercase font-mono block">
                  Equation: {linearSol.equationStr}
                </span>
                <div className="text-2xl font-mono font-bold text-amber-300 mt-1">
                  {linearSol.isNoSolution
                    ? 'NO SOLUTION'
                    : linearSol.isInfinite
                    ? 'INFINITELY MANY SOLUTIONS'
                    : `x = ${linearSol.x !== null ? Number(linearSol.x.toFixed(6)).toString() : ''}`}
                </div>
              </div>

              {linearSol.x !== null && (
                <button
                  onClick={() => onLoadIntoCalculator(linearSol.x!, `x in ${linearSol.equationStr}`)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Load x into Calculator</span>
                </button>
              )}
            </div>

            {/* Step-by-Step Algebraic Working */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Step-by-Step Algebraic Isolation:
              </h4>
              <div className="space-y-1.5 font-mono text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {linearSol.steps.map((step, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TOOL 3: QUADRATIC EQUATION SOLVER (ax² + bx + c = 0) */}
        {activeAlgebraTool === 'quadratic' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Standard Quadratic Form: <code className="font-mono text-indigo-700 font-bold">a · x² + b · x + c = 0</code>
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-500 block mb-1">Coefficient a (≠ 0):</label>
                  <input
                    type="number"
                    value={quadA}
                    onChange={(e) => setQuadA(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-500 block mb-1">Coefficient b:</label>
                  <input
                    type="number"
                    value={quadB}
                    onChange={(e) => setQuadB(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-500 block mb-1">Constant c:</label>
                  <input
                    type="number"
                    value={quadC}
                    onChange={(e) => setQuadC(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {quadError ? (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
                {quadError}
              </div>
            ) : quadSol ? (
              <>
                {/* Result Hero */}
                <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl text-white flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] text-indigo-200 uppercase font-mono block">
                      Equation: {quadSol.equationStr} (Discriminant Δ = {quadSol.discriminant})
                    </span>
                    <div className="text-xl sm:text-2xl font-mono font-extrabold text-amber-300 mt-1">
                      {quadSol.hasRealRoots ? (
                        quadSol.isDoubleRoot ? (
                          <span>Double Root: x = {Number(quadSol.root1.real.toFixed(6))}</span>
                        ) : (
                          <span>
                            x₁ = {Number(quadSol.root1.real.toFixed(4))}, x₂ = {Number(quadSol.root2.real.toFixed(4))}
                          </span>
                        )
                      ) : (
                        <span>
                          x = {Number(quadSol.root1.real.toFixed(3))} ± {Number(quadSol.root1.imag.toFixed(3))}i (Complex)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      Vertex: ({Number(quadSol.vertex.h.toFixed(3))}, {Number(quadSol.vertex.k.toFixed(3))}) • Axis: x = {Number(quadSol.axisOfSymmetry.toFixed(3))}
                    </div>
                  </div>

                  {quadSol.hasRealRoots && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => onLoadIntoCalculator(quadSol!.root1.real, `Root x1 of ${quadSol!.equationStr}`)}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>Load x₁</span>
                      </button>
                      {!quadSol.isDoubleRoot && (
                        <button
                          onClick={() => onLoadIntoCalculator(quadSol!.root2.real, `Root x2 of ${quadSol!.equationStr}`)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>Load x₂</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Parabola Visualizer (SVG) */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Parabola Curve & Zero Intercepts:
                  </span>
                  <div className="w-full h-36 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center p-2 relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 400 120">
                      {/* Axes */}
                      <line x1="0" y1="60" x2="400" y2="60" stroke="#cbd5e1" strokeWidth="1.5" />
                      <line x1="200" y1="0" x2="200" y2="120" stroke="#cbd5e1" strokeWidth="1.5" />
                      {/* Parabola Curve path */}
                      {(() => {
                        const pts: string[] = [];
                        const scaleX = 15;
                        const scaleY = 3;
                        for (let px = 0; px <= 400; px += 4) {
                          const realX = (px - 200) / scaleX;
                          const realY = quadA * realX * realX + quadB * realX + quadC;
                          const py = 60 - realY * scaleY;
                          pts.push(`${px},${Math.max(-50, Math.min(170, py))}`);
                        }
                        return (
                          <polyline
                            fill="none"
                            stroke="#4f46e5"
                            strokeWidth="2.5"
                            points={pts.join(' ')}
                          />
                        );
                      })()}
                      {/* Vertex Marker */}
                      <circle
                        cx={200 + quadSol.vertex.h * 15}
                        cy={60 - quadSol.vertex.k * 3}
                        r="4"
                        fill="#ea580c"
                      />
                    </svg>
                    <div className="absolute bottom-2 left-3 text-[10px] text-slate-500 font-mono">
                      Vertex: ({Number(quadSol.vertex.h.toFixed(2))}, {Number(quadSol.vertex.k.toFixed(2))})
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Derivation */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono text-xs text-slate-700">
                  <h4 className="font-bold text-slate-900 font-sans text-sm mb-1">
                    Quadratic Formula Derivation:
                  </h4>
                  {quadSol.steps.map((s, idx) => (
                    <div key={idx}>{s}</div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TOOL 4: 2x2 SYSTEM OF LINEAR EQUATIONS */}
        {activeAlgebraTool === 'system' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                System of 2 Equations (Cramer's Rule):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                  <span className="text-[11px] font-bold text-indigo-700 font-mono">Equation (1): a₁x + b₁y = c₁</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="a1"
                      value={sysA1}
                      onChange={(e) => setSysA1(Number(e.target.value))}
                      className="px-2 py-1 text-xs font-mono border rounded"
                    />
                    <input
                      type="number"
                      placeholder="b1"
                      value={sysB1}
                      onChange={(e) => setSysB1(Number(e.target.value))}
                      className="px-2 py-1 text-xs font-mono border rounded"
                    />
                    <input
                      type="number"
                      placeholder="c1"
                      value={sysC1}
                      onChange={(e) => setSysC1(Number(e.target.value))}
                      className="px-2 py-1 text-xs font-mono border rounded"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                  <span className="text-[11px] font-bold text-indigo-700 font-mono">Equation (2): a₂x + b₂y = c₂</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="a2"
                      value={sysA2}
                      onChange={(e) => setSysA2(Number(e.target.value))}
                      className="px-2 py-1 text-xs font-mono border rounded"
                    />
                    <input
                      type="number"
                      placeholder="b2"
                      value={sysB2}
                      onChange={(e) => setSysB2(Number(e.target.value))}
                      className="px-2 py-1 text-xs font-mono border rounded"
                    />
                    <input
                      type="number"
                      placeholder="c2"
                      value={sysC2}
                      onChange={(e) => setSysC2(Number(e.target.value))}
                      className="px-2 py-1 text-xs font-mono border rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* System Solution */}
            <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-indigo-200 uppercase font-mono block">
                  Intersection Solution Point:
                </span>
                <div className="text-2xl font-mono font-bold text-amber-300 mt-1">
                  {sysSol.isConsistent ? (
                    <span>
                      x = {Number(sysSol.x!.toFixed(4))}, y = {Number(sysSol.y!.toFixed(4))}
                    </span>
                  ) : (
                    <span>No Unique Solution (Det D = 0)</span>
                  )}
                </div>
              </div>

              {sysSol.isConsistent && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onLoadIntoCalculator(sysSol.x!, 'System x value')}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                  >
                    Load x ({Number(sysSol.x!.toFixed(2))})
                  </button>
                  <button
                    onClick={() => onLoadIntoCalculator(sysSol.y!, 'System y value')}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                  >
                    Load y ({Number(sysSol.y!.toFixed(2))})
                  </button>
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono text-xs text-slate-700">
              <h4 className="font-bold text-slate-900 font-sans text-sm mb-1">Cramer's Determinant Solution:</h4>
              {sysSol.steps.map((s, idx) => (
                <div key={idx}>{s}</div>
              ))}
            </div>
          </div>
        )}

        {/* TOOL 5: BREAK-EVEN & PROFIT ALGEBRA */}
        {activeAlgebraTool === 'breakeven' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Break-Even Formula: <code className="font-mono text-indigo-700 font-bold">R(x) = C(x) ⟹ Price · x = FixedCost + VariableCost · x</code>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-500 block mb-1">Fixed Overhead Cost ($F):</label>
                  <input
                    type="number"
                    value={fixedCost}
                    onChange={(e) => setFixedCost(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-500 block mb-1">Sale Price Per Unit ($P):</label>
                  <input
                    type="number"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-500 block mb-1">Variable Cost Per Unit ($V):</label>
                  <input
                    type="number"
                    value={varCostPerUnit}
                    onChange={(e) => setVarCostPerUnit(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {beSol && (
              <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl text-white flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-indigo-200 uppercase font-mono block">
                    Break-Even Volume:
                  </span>
                  <div className="text-2xl font-mono font-bold text-amber-300 mt-1">
                    {Math.ceil(beSol.breakEvenUnits).toLocaleString()} units
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Break-even Revenue: ${beSol.breakEvenRevenue.toLocaleString()} • Unit Contribution: ${beSol.contributionMargin}/unit ({beSol.cmRatio.toFixed(1)}%)
                  </div>
                </div>

                <button
                  onClick={() => onLoadIntoCalculator(Math.ceil(beSol!.breakEvenUnits), 'Break-even units')}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Load Units into Calculator</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
