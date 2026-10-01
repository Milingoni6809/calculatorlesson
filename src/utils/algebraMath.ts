/**
 * Pure TypeScript Algebra Mathematics Engine
 * Supports expression parsing, PEMDAS order of operations,
 * linear equation solving, quadratic equation solving, and system of linear equations.
 */

// Token types for algebraic parsing
export type TokenType =
  | 'NUMBER'
  | 'OP'
  | 'LPAREN'
  | 'RPAREN'
  | 'FUNCTION'
  | 'VARIABLE'
  | 'COMMA';

export interface Token {
  type: TokenType;
  value: string;
}

export interface VariableScope {
  [key: string]: number;
}

/**
 * Tokenize a mathematical/algebraic string
 */
export function tokenizeExpression(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = expr.replace(/\s+/g, '');

  while (i < s.length) {
    const ch = s[i];

    // Numbers (including decimals)
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < s.length && /[0-9]/.test(s[i + 1]))) {
      let numStr = '';
      while (i < s.length && (/[0-9]/.test(s[i]) || s[i] === '.')) {
        numStr += s[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    // Identifiers (functions, constants, or variables)
    if (/[a-zA-Zπ]/.test(ch)) {
      let idStr = '';
      while (i < s.length && /[a-zA-Z0-9π_]/.test(s[i])) {
        idStr += s[i];
        i++;
      }
      const lower = idStr.toLowerCase();
      if (['sqrt', 'sqr', 'abs', 'log', 'ln', 'sin', 'cos', 'tan', 'round'].includes(lower)) {
        tokens.push({ type: 'FUNCTION', value: lower });
      } else if (idStr === 'π' || lower === 'pi') {
        tokens.push({ type: 'NUMBER', value: String(Math.PI) });
      } else if (lower === 'e' && (tokens.length === 0 || tokens[tokens.length - 1].type === 'OP' || tokens[tokens.length - 1].type === 'LPAREN')) {
        tokens.push({ type: 'NUMBER', value: String(Math.E) });
      } else {
        tokens.push({ type: 'VARIABLE', value: idStr.toUpperCase() });
      }
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    // Square root symbol '√'
    if (ch === '√') {
      tokens.push({ type: 'FUNCTION', value: 'sqrt' });
      i++;
      continue;
    }

    // Percentage symbol '%'
    if (ch === '%') {
      tokens.push({ type: 'OP', value: '%' });
      i++;
      continue;
    }

    // Comma
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    // Operators: +, -, *, ×, /, ÷, ^
    if (['+', '-', '*', '×', '/', '÷', '^'].includes(ch)) {
      // Check if '-' is a unary negative sign
      if (
        ch === '-' &&
        (tokens.length === 0 ||
          tokens[tokens.length - 1].type === 'OP' ||
          tokens[tokens.length - 1].type === 'LPAREN')
      ) {
        // Read negative number if followed by digits
        if (i + 1 < s.length && (/[0-9]/.test(s[i + 1]) || s[i + 1] === '.')) {
          let numStr = '-';
          i++;
          while (i < s.length && (/[0-9]/.test(s[i]) || s[i] === '.')) {
            numStr += s[i];
            i++;
          }
          tokens.push({ type: 'NUMBER', value: numStr });
          continue;
        } else {
          // Unary minus as operator
          tokens.push({ type: 'OP', value: 'u-' });
          i++;
          continue;
        }
      }

      let op = ch;
      if (op === '×') op = '*';
      if (op === '÷') op = '/';
      tokens.push({ type: 'OP', value: op });
      i++;
      continue;
    }

    i++;
  }

  return tokens;
}

// Operator Precedence
const PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,
  'u-': 3,
  '^': 4,
};

/**
 * Converts infix tokens to postfix (RPN) using Shunting-yard algorithm
 */
export function infixToRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const opStack: Token[] = [];

  for (const token of tokens) {
    if (token.type === 'NUMBER' || token.type === 'VARIABLE') {
      output.push(token);
    } else if (token.type === 'FUNCTION') {
      opStack.push(token);
    } else if (token.type === 'OP') {
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1].type !== 'LPAREN' &&
        (opStack[opStack.length - 1].type === 'FUNCTION' ||
          (PRECEDENCE[opStack[opStack.length - 1].value] || 0) >= (PRECEDENCE[token.value] || 0))
      ) {
        output.push(opStack.pop()!);
      }
      opStack.push(token);
    } else if (token.type === 'LPAREN') {
      opStack.push(token);
    } else if (token.type === 'RPAREN') {
      while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'LPAREN') {
        output.push(opStack.pop()!);
      }
      if (opStack.length > 0 && opStack[opStack.length - 1].type === 'LPAREN') {
        opStack.pop(); // discard '('
      }
      if (opStack.length > 0 && opStack[opStack.length - 1].type === 'FUNCTION') {
        output.push(opStack.pop()!);
      }
    }
  }

  while (opStack.length > 0) {
    output.push(opStack.pop()!);
  }

  return output;
}

/**
 * Evaluates RPN token queue with given variable scope
 */
export function evaluateRPN(rpn: Token[], vars: VariableScope = {}): number {
  const stack: number[] = [];

  for (const token of rpn) {
    if (token.type === 'NUMBER') {
      stack.push(parseFloat(token.value));
    } else if (token.type === 'VARIABLE') {
      const vName = token.value.toUpperCase();
      const val = vars[vName] ?? 0;
      stack.push(val);
    } else if (token.type === 'FUNCTION') {
      const a = stack.pop() ?? 0;
      if (token.value === 'sqrt') {
        if (a < 0) throw new Error('Square root of negative number');
        stack.push(Math.sqrt(a));
      } else if (token.value === 'sqr') {
        stack.push(a * a);
      } else if (token.value === 'abs') {
        stack.push(Math.abs(a));
      } else if (token.value === 'log') {
        if (a <= 0) throw new Error('Log domain error');
        stack.push(Math.log10(a));
      } else if (token.value === 'ln') {
        if (a <= 0) throw new Error('Natural log domain error');
        stack.push(Math.log(a));
      }
    } else if (token.type === 'OP') {
      if (token.value === 'u-') {
        const a = stack.pop() ?? 0;
        stack.push(-a);
        continue;
      }
      if (token.value === '%') {
        const a = stack.pop() ?? 0;
        stack.push(a / 100);
        continue;
      }

      const b = stack.pop() ?? 0;
      const a = stack.pop() ?? 0;

      switch (token.value) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          stack.push(a / b);
          break;
        case '^':
          stack.push(Math.pow(a, b));
          break;
        default:
          throw new Error(`Unknown operator ${token.value}`);
      }
    }
  }

  if (stack.length === 0) return 0;
  return stack[stack.length - 1];
}

/**
 * Safely parse and calculate an algebraic expression string
 */
export function evaluateAlgebraicExpression(
  expression: string,
  vars: VariableScope = {}
): { result: number; error?: string } {
  try {
    if (!expression.trim()) return { result: 0 };
    const tokens = tokenizeExpression(expression);
    if (tokens.length === 0) return { result: 0 };
    const rpn = infixToRPN(tokens);
    const result = evaluateRPN(rpn, vars);
    if (isNaN(result) || !isFinite(result)) {
      return { result: 0, error: 'Undefined / Out of range' };
    }
    return { result };
  } catch (err: unknown) {
    return {
      result: 0,
      error: err instanceof Error ? err.message : 'Syntax Error',
    };
  }
}

/**
 * Linear Equation Solver: a * x + b = c
 * Result: x = (c - b) / a
 */
export interface LinearSolution {
  a: number;
  b: number;
  c: number;
  x: number | null;
  equationStr: string;
  steps: string[];
  isInfinite: boolean;
  isNoSolution: boolean;
}

export function solveLinearEquation(a: number, b: number, c: number): LinearSolution {
  const eqStr = `${a === 1 ? '' : a === -1 ? '-' : a}x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`} = ${c}`;
  const steps: string[] = [];

  steps.push(`Start with the linear equation: ${eqStr}`);

  if (a === 0) {
    if (b === c) {
      steps.push(`Since 0x + ${b} = ${c} simplifies to ${b} = ${c}, every real number is a solution.`);
      return { a, b, c, x: null, equationStr: eqStr, steps, isInfinite: true, isNoSolution: false };
    } else {
      steps.push(`Since 0x + ${b} = ${c} simplifies to ${b} = ${c} (false), there is NO solution.`);
      return { a, b, c, x: null, equationStr: eqStr, steps, isInfinite: false, isNoSolution: true };
    }
  }

  const cMinusB = c - b;
  steps.push(`Step 1: Isolate the variable term by subtracting (${b}) from both sides:`);
  steps.push(`  ${a}x = ${c} - (${b})`);
  steps.push(`  ${a}x = ${cMinusB}`);

  const x = cMinusB / a;
  steps.push(`Step 2: Divide both sides by the coefficient of x (${a}):`);
  steps.push(`  x = ${cMinusB} ÷ ${a}`);
  steps.push(`  x = ${Number(x.toFixed(6)).toString()}`);

  return { a, b, c, x, equationStr: eqStr, steps, isInfinite: false, isNoSolution: false };
}

/**
 * Quadratic Equation Solver: a * x^2 + b * x + c = 0
 */
export interface QuadraticSolution {
  a: number;
  b: number;
  c: number;
  discriminant: number;
  hasRealRoots: boolean;
  isDoubleRoot: boolean;
  root1: { real: number; imag: number };
  root2: { real: number; imag: number };
  vertex: { h: number; k: number };
  axisOfSymmetry: number;
  equationStr: string;
  steps: string[];
}

export function solveQuadraticEquation(a: number, b: number, c: number): QuadraticSolution {
  if (a === 0) {
    throw new Error('Coefficient "a" cannot be 0 in a quadratic equation.');
  }

  const bSign = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
  const cSign = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;
  const eqStr = `${a === 1 ? '' : a === -1 ? '-' : a}x² ${bSign}x ${cSign} = 0`;

  const steps: string[] = [];
  steps.push(`Quadratic Equation: ${eqStr}`);
  steps.push(`Coefficients: a = ${a}, b = ${b}, c = ${c}`);

  // Discriminant Δ = b² - 4ac
  const discriminant = b * b - 4 * a * c;
  steps.push(`Step 1: Calculate the Discriminant (Δ = b² - 4ac):`);
  steps.push(`  Δ = (${b})² - 4(${a})(${c}) = ${b * b} - ${4 * a * c} = ${discriminant}`);

  // Vertex
  const h = -b / (2 * a);
  const k = c - (b * b) / (4 * a);
  steps.push(`Step 2: Parabola Vertex Coordinates (h, k):`);
  steps.push(`  h = -b / (2a) = -(${b}) / (2 × ${a}) = ${Number(h.toFixed(4))}`);
  steps.push(`  k = f(h) = ${Number(k.toFixed(4))}`);
  steps.push(`  Parabola opens ${a > 0 ? 'UPWARD (minimum vertex)' : 'DOWNWARD (maximum vertex)'}.`);

  let root1 = { real: 0, imag: 0 };
  let root2 = { real: 0, imag: 0 };
  let hasRealRoots = true;
  let isDoubleRoot = false;

  if (discriminant > 0) {
    const sqrtD = Math.sqrt(discriminant);
    const r1 = (-b + sqrtD) / (2 * a);
    const r2 = (-b - sqrtD) / (2 * a);
    root1 = { real: r1, imag: 0 };
    root2 = { real: r2, imag: 0 };
    hasRealRoots = true;
    isDoubleRoot = false;
    steps.push(`Step 3: Since Δ > 0, there are TWO distinct real roots:`);
    steps.push(`  x₁ = (-b + √Δ) / (2a) = (${-b} + ${Number(sqrtD.toFixed(4))}) / (${2 * a}) = ${Number(r1.toFixed(6))}`);
    steps.push(`  x₂ = (-b - √Δ) / (2a) = (${-b} - ${Number(sqrtD.toFixed(4))}) / (${2 * a}) = ${Number(r2.toFixed(6))}`);
  } else if (Math.abs(discriminant) < 1e-12) {
    const r = -b / (2 * a);
    root1 = { real: r, imag: 0 };
    root2 = { real: r, imag: 0 };
    hasRealRoots = true;
    isDoubleRoot = true;
    steps.push(`Step 3: Since Δ = 0, there is ONE repeated real root (double root):`);
    steps.push(`  x = -b / (2a) = ${Number(r.toFixed(6))}`);
  } else {
    hasRealRoots = false;
    isDoubleRoot = false;
    const realPart = -b / (2 * a);
    const imagPart = Math.sqrt(Math.abs(discriminant)) / (2 * Math.abs(a));
    root1 = { real: realPart, imag: imagPart };
    root2 = { real: realPart, imag: -imagPart };
    steps.push(`Step 3: Since Δ < 0, there are TWO complex conjugate roots:`);
    steps.push(`  x₁ = ${Number(realPart.toFixed(4))} + ${Number(imagPart.toFixed(4))}i`);
    steps.push(`  x₂ = ${Number(realPart.toFixed(4))} - ${Number(imagPart.toFixed(4))}i`);
  }

  return {
    a,
    b,
    c,
    discriminant,
    hasRealRoots,
    isDoubleRoot,
    root1,
    root2,
    vertex: { h, k },
    axisOfSymmetry: h,
    equationStr: eqStr,
    steps,
  };
}

/**
 * 2-Variable System of Linear Equations Solver
 * a1*x + b1*y = c1
 * a2*x + b2*y = c2
 */
export interface System2x2Solution {
  x: number | null;
  y: number | null;
  detD: number;
  detDx: number;
  detDy: number;
  isConsistent: boolean;
  steps: string[];
}

export function solveSystem2x2(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number
): System2x2Solution {
  const steps: string[] = [];
  steps.push(`System of Equations:`);
  steps.push(`  (1) ${a1}x + ${b1}y = ${c1}`);
  steps.push(`  (2) ${a2}x + ${b2}y = ${c2}`);

  // Determinant D = a1*b2 - a2*b1
  const detD = a1 * b2 - a2 * b1;
  const detDx = c1 * b2 - c2 * b1;
  const detDy = a1 * c2 - a2 * c1;

  steps.push(`Step 1: Calculate Determinant D:`);
  steps.push(`  D = (${a1} × ${b2}) - (${a2} × ${b1}) = ${detD}`);

  if (Math.abs(detD) < 1e-12) {
    if (Math.abs(detDx) < 1e-12 && Math.abs(detDy) < 1e-12) {
      steps.push(`Since D = 0 and Dx = Dy = 0, the system has INFINITELY MANY SOLUTIONS (coincident lines).`);
    } else {
      steps.push(`Since D = 0 but Dx or Dy ≠ 0, the system has NO SOLUTION (parallel lines).`);
    }
    return { x: null, y: null, detD, detDx, detDy, isConsistent: false, steps };
  }

  const x = detDx / detD;
  const y = detDy / detD;

  steps.push(`Step 2: Solve for x using Cramer's Rule (Dx / D):`);
  steps.push(`  Dx = (${c1} × ${b2}) - (${c2} × ${b1}) = ${detDx}`);
  steps.push(`  x = Dx / D = ${detDx} / ${detD} = ${Number(x.toFixed(6))}`);

  steps.push(`Step 3: Solve for y using Cramer's Rule (Dy / D):`);
  steps.push(`  Dy = (${a1} × ${c2}) - (${a2} × ${c1}) = ${detDy}`);
  steps.push(`  y = Dy / D = ${detDy} / ${detD} = ${Number(y.toFixed(6))}`);

  return { x, y, detD, detDx, detDy, isConsistent: true, steps };
}

/**
 * Break-Even / Profit Algebra Solver
 * Revenue R(x) = Price * x
 * Cost C(x) = FixedCost + VariableCost * x
 * Break-even: x = FixedCost / (Price - VariableCost)
 */
export function solveBreakEven(fixedCost: number, pricePerUnit: number, varCostPerUnit: number) {
  const contributionMargin = pricePerUnit - varCostPerUnit;
  if (contributionMargin <= 0) {
    throw new Error('Price per unit must be strictly greater than variable cost per unit.');
  }
  const breakEvenUnits = fixedCost / contributionMargin;
  const breakEvenRevenue = breakEvenUnits * pricePerUnit;
  const cmRatio = (contributionMargin / pricePerUnit) * 100;

  return {
    breakEvenUnits,
    breakEvenRevenue,
    contributionMargin,
    cmRatio,
  };
}
