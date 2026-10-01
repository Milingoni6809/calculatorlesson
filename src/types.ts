export interface Step {
  key: string; // The button label or ID
  desc: string; // User instruction, e.g. "Store 10 into [N]"
  expectedDisplay: string; // What the main screen shows
  expectedStatus?: string; // Optional status line text, e.g. "2ndF DEG" or "BGN"
  explanation?: string; // Financial or algebraic explanation why this step is done
}

export type TutorialStep = Step;

export interface Lesson {
  id: string;
  category: 'tvm' | 'loan' | 'cashflow' | 'annuity' | 'amortization' | 'algebra';
  title: string;
  badge: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  scenario: string;
  formulaName?: string;
  formulaLatex?: string;
  formulaExplanation?: string;
  cashFlowsSummary?: { period: string | number; amount: string; type: 'inflow' | 'outflow' | 'rate' }[];
  steps: Step[];
  summaryTip?: string;
}

export interface TVMRegisters {
  N: number | null;
  IY: number | null; // Annual interest rate in %
  PV: number | null;
  PMT: number | null;
  FV: number | null;
  PY: number; // Payments per year (default 1)
  CY: number; // Compounding periods per year (default 1)
  isBGN: boolean; // false = END (ordinary annuity), true = BGN (annuity due)
}

export interface AlgebraRegisters {
  A: number | null;
  B: number | null;
  C: number | null;
  D: number | null;
  E: number | null;
  F: number | null;
  X: number | null;
  Y: number | null;
  M: number | null;
}

export interface CashFlowItem {
  id: number;
  label: string; // CF0, CF1, CF2...
  amount: number;
  freq: number; // N1, N2...
}

export interface AmortizationPeriod {
  period: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface QuizQuestion {
  id: string;
  title: string;
  category?: 'financial' | 'algebra';
  scenario: string;
  targetVariable: 'FV' | 'PV' | 'PMT' | 'N' | 'IY' | 'NPV' | 'IRR' | 'X' | 'ROOT' | 'RESULT';
  givenValues: { label: string; value: string }[];
  correctAnswer: number;
  tolerance: number; // acceptable rounding delta, e.g. 0.5
  unit: string;
  hint: string;
  solutionSteps: string[];
}
