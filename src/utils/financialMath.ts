/**
 * Financial calculation engine supporting TVM, Cash Flows (NPV, IRR), and Amortization
 * according to standard financial calculator algorithms (matching Sharp EL-738).
 */

export interface TVMInput {
  n: number;
  iy: number; // in percent, e.g. 5 for 5%
  pv: number;
  pmt: number;
  fv: number;
  py?: number; // Payments per year, default 1
  cy?: number; // Compounding per year, default = py
  bgn?: boolean; // false = END, true = BGN
}

// Convert annual nominal rate (I/Y) to effective periodic rate (i) based on P/Y and C/Y
export function getPeriodicRate(iy: number, py = 1, cy = py): number {
  if (iy === 0) return 0;
  const annualRate = iy / 100;
  if (py === cy) {
    return annualRate / py;
  }
  // Formula when P/Y != C/Y: i = (1 + r/cy)^(cy/py) - 1
  return Math.pow(1 + annualRate / cy, cy / py) - 1;
}

/**
 * Calculate Future Value (FV)
 */
export function calculateFV({ n, iy, pv, pmt, py = 1, cy = 1, bgn = false }: TVMInput): number {
  const r = getPeriodicRate(iy, py, cy);
  const type = bgn ? 1 : 0;

  if (Math.abs(r) < 1e-12) {
    return -(pv + pmt * n);
  }

  const factor = Math.pow(1 + r, n);
  const annuityFactor = ((factor - 1) / r) * (1 + r * type);
  return -(pv * factor + pmt * annuityFactor);
}

/**
 * Calculate Present Value (PV)
 */
export function calculatePV({ n, iy, pmt, fv, py = 1, cy = 1, bgn = false }: TVMInput): number {
  const r = getPeriodicRate(iy, py, cy);
  const type = bgn ? 1 : 0;

  if (Math.abs(r) < 1e-12) {
    return -(fv + pmt * n);
  }

  const factor = Math.pow(1 + r, n);
  const annuityFactor = ((factor - 1) / r) * (1 + r * type);
  return -(fv + pmt * annuityFactor) / factor;
}

/**
 * Calculate Payment (PMT)
 */
export function calculatePMT({ n, iy, pv, fv, py = 1, cy = 1, bgn = false }: TVMInput): number {
  const r = getPeriodicRate(iy, py, cy);
  const type = bgn ? 1 : 0;

  if (Math.abs(r) < 1e-12) {
    if (n === 0) return 0;
    return -(pv + fv) / n;
  }

  const factor = Math.pow(1 + r, n);
  const annuityFactor = ((factor - 1) / r) * (1 + r * type);
  if (Math.abs(annuityFactor) < 1e-12) return 0;
  return -(pv * factor + fv) / annuityFactor;
}

/**
 * Calculate Number of Periods (N)
 */
export function calculateN({ iy, pv, pmt, fv, py = 1, cy = 1, bgn = false }: TVMInput): number {
  const r = getPeriodicRate(iy, py, cy);
  const type = bgn ? 1 : 0;

  if (Math.abs(r) < 1e-12) {
    if (Math.abs(pmt) < 1e-12) return 0;
    return -(pv + fv) / pmt;
  }

  const adjustedPmt = pmt * (1 + r * type);

  // PV * (1+r)^N + adjustedPmt/r * ((1+r)^N - 1) + FV = 0
  // (PV + adjustedPmt/r) * (1+r)^N = adjustedPmt/r - FV
  const denom = pv + adjustedPmt / r;
  const numer = adjustedPmt / r - fv;

  if (denom === 0 || numer / denom <= 0) {
    throw new Error('Mathematical domain error: No solution exists for N.');
  }

  return Math.log(numer / denom) / Math.log(1 + r);
}

/**
 * Calculate Interest Rate (I/Y) via Newton-Raphson
 */
export function calculateIY({ n, pv, pmt, fv, py = 1, cy = 1, bgn = false }: TVMInput): number {
  if (n <= 0) throw new Error('N must be greater than 0');

  // If no PMT, analytical solution: ( -FV / PV )^(1/N) - 1
  if (Math.abs(pmt) < 1e-9) {
    if (pv === 0) throw new Error('Cannot compute I/Y when PV is zero with zero payment');
    const ratio = -fv / pv;
    if (ratio <= 0) throw new Error('PV and FV must have opposite signs');
    const periodicR = Math.pow(ratio, 1 / n) - 1;
    return periodicR * py * 100;
  }

  const type = bgn ? 1 : 0;

  // Newton-Raphson solver
  let r = 0.05 / py; // Initial guess: 5% annual
  const maxIter = 100;
  const tol = 1e-8;

  for (let i = 0; i < maxIter; i++) {
    const factor = Math.pow(1 + r, n);
    const dfactor = n * Math.pow(1 + r, n - 1);

    let f = 0;
    let df = 0;

    if (Math.abs(r) < 1e-12) {
      f = pv + pmt * n + fv;
      df = pv * n + pmt * (n * (n + (type ? 1 : -1)) / 2);
    } else {
      const g = (factor - 1) / r;
      const dg = (dfactor * r - (factor - 1)) / (r * r);
      const ann = g * (1 + r * type);
      const dann = dg * (1 + r * type) + g * type;

      f = pv * factor + pmt * ann + fv;
      df = pv * dfactor + pmt * dann;
    }

    if (Math.abs(f) < tol) {
      return r * py * 100;
    }

    if (Math.abs(df) < 1e-12) {
      r += 0.001;
      continue;
    }

    const rNext = r - f / df;
    if (Math.abs(rNext - r) < tol) {
      return rNext * py * 100;
    }
    r = rNext;
    if (r <= -0.999) r = -0.9;
  }

  return r * py * 100;
}

/**
 * Net Present Value (NPV)
 * cashFlows: array of amounts [CF0, CF1, CF2, ...]
 * rate: annual rate in %
 */
export function calculateNPV(cashFlows: number[], ratePercent: number): number {
  const r = ratePercent / 100;
  let npv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + r, t);
  }
  return npv;
}

/**
 * Internal Rate of Return (IRR)
 */
export function calculateIRR(cashFlows: number[]): number {
  if (cashFlows.length < 2) throw new Error('At least 2 cash flows required');

  // Check for at least one sign change
  let hasPositive = false;
  let hasNegative = false;
  for (const cf of cashFlows) {
    if (cf > 0) hasPositive = true;
    if (cf < 0) hasNegative = true;
  }
  if (!hasPositive || !hasNegative) {
    throw new Error('Cash flows must contain at least one positive and one negative value');
  }

  // Secant / Newton solver
  let r0 = 0.1;
  let r1 = 0.15;

  for (let i = 0; i < 100; i++) {
    const npv0 = calculateNPV(cashFlows, r0 * 100);
    const npv1 = calculateNPV(cashFlows, r1 * 100);

    if (Math.abs(npv1) < 1e-7) {
      return r1 * 100;
    }

    if (Math.abs(npv1 - npv0) < 1e-12) {
      r1 += 0.01;
      continue;
    }

    const rNext = r1 - (npv1 * (r1 - r0)) / (npv1 - npv0);
    if (Math.abs(rNext - r1) < 1e-7) {
      return rNext * 100;
    }

    r0 = r1;
    r1 = rNext;
    if (r1 <= -0.99) r1 = -0.9;
  }

  return r1 * 100;
}

/**
 * Amortization Schedule between Period P1 and P2
 */
export function calculateAmortization(
  pv: number,
  iy: number,
  pmt: number,
  p1: number,
  p2: number,
  py = 12
) {
  const r = getPeriodicRate(iy, py, py);
  let balance = Math.abs(pv);
  const payment = Math.abs(pmt);

  let totalPrincipal = 0;
  let totalInterest = 0;

  for (let period = 1; period <= p2; period++) {
    const interest = balance * r;
    const principal = payment - interest;
    balance -= principal;

    if (period >= p1) {
      totalPrincipal += principal;
      totalInterest += interest;
    }
  }

  return {
    balance: Math.max(0, balance),
    principalPaid: totalPrincipal,
    interestPaid: totalInterest,
  };
}

export function formatFinancial(num: number, decimals = 2): string {
  if (isNaN(num) || !isFinite(num)) return 'Error';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
