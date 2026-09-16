/**
 * Arithmetic parser and math utilities for CalcApp.
 *
 * Implements the Shunting-Yard algorithm to evaluate infix expressions safely
 * without eval or Function constructors.
 */

export interface MathResult {
    readonly success: boolean;
    readonly result?: number;
    readonly error?: string;
}

export function evaluateMath(expression: string): MathResult {
    const cleaned = expression.replace(/\s+/g, '');
    if (cleaned.length === 0) {
        return { success: false, error: 'Empty expression' };
    }

    // Tokenize
    const tokens: string[] = [];
    let i = 0;
    while (i < cleaned.length) {
        const c = cleaned[i];
        if (c === undefined) break;

        if (c === '+' || c === '-' || c === '*' || c === '/' || c === '(' || c === ')') {
            // Handle unary minus at beginning or immediately after operator / open paren
            const prevToken = tokens[tokens.length - 1];
            const isUnary =
                c === '-' &&
                (tokens.length === 0 || prevToken === '(' || ['+', '-', '*', '/'].includes(prevToken ?? ''));

            if (isUnary) {
                let numStr = '-';
                i++;
                while (i < cleaned.length && /[0-9.]/.test(cleaned[i] ?? '')) {
                    numStr += cleaned[i] ?? '';
                    i++;
                }
                if (numStr === '-') return { success: false, error: 'Invalid negative number' };
                tokens.push(numStr);
                continue;
            }
            tokens.push(c);
            i++;
        } else if (/[0-9.]/.test(c)) {
            let numStr = '';
            while (i < cleaned.length && /[0-9.]/.test(cleaned[i] ?? '')) {
                numStr += cleaned[i] ?? '';
                i++;
            }
            tokens.push(numStr);
        } else {
            return { success: false, error: `Invalid character: ${c}` };
        }
    }

    // Shunting-yard algorithm: Infix to RPN
    const outputQueue: string[] = [];
    const operatorStack: string[] = [];
    const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

    for (const token of tokens) {
        if (!isNaN(Number(token))) {
            outputQueue.push(token);
        } else if (token in precedence) {
            const tokenPrec = precedence[token] ?? 0;
            while (operatorStack.length > 0) {
                const top = operatorStack[operatorStack.length - 1] ?? '';
                const topPrec = precedence[top] ?? 0;
                if (top !== '(' && topPrec >= tokenPrec) {
                    outputQueue.push(operatorStack.pop() ?? '');
                } else {
                    break;
                }
            }
            operatorStack.push(token);
        } else if (token === '(') {
            operatorStack.push(token);
        } else if (token === ')') {
            let foundParen = false;
            while (operatorStack.length > 0) {
                const op = operatorStack.pop() ?? '';
                if (op === '(') {
                    foundParen = true;
                    break;
                }
                outputQueue.push(op);
            }
            if (!foundParen) return { success: false, error: 'Mismatched parentheses' };
        }
    }

    while (operatorStack.length > 0) {
        const op = operatorStack.pop() ?? '';
        if (op === '(' || op === ')') return { success: false, error: 'Mismatched parentheses' };
        outputQueue.push(op);
    }

    // Evaluate RPN
    const evalStack: number[] = [];
    for (const token of outputQueue) {
        if (!isNaN(Number(token))) {
            evalStack.push(Number(token));
        } else if (token in precedence) {
            const b = evalStack.pop();
            const a = evalStack.pop();
            if (a === undefined || b === undefined) return { success: false, error: 'Malformed expression' };

            let res: number;
            if (token === '+') res = a + b;
            else if (token === '-') res = a - b;
            else if (token === '*') res = a * b;
            else if (token === '/') {
                if (b === 0) return { success: false, error: 'Division by zero' };
                res = a / b;
            } else {
                return { success: false, error: 'Unknown operator' };
            }
            evalStack.push(res);
        }
    }

    if (evalStack.length !== 1) return { success: false, error: 'Evaluation failed' };
    const finalResult = evalStack[0];
    if (finalResult === undefined || isNaN(finalResult)) return { success: false, error: 'Invalid result' };

    return { success: true, result: finalResult };
}

export function formatResult(val: number): string {
    if (!isFinite(val)) return 'Error';
    // Round to 10 decimal places to eliminate floating point artifacts (e.g. 0.1 + 0.2)
    const rounded = Math.round(val * 1e10) / 1e10;
    return String(rounded);
}
