class CodeSimplifier {
  simplify(code) {
    let result = code;
    let iterations = 0;
    const maxIterations = 100;

    do {
      const prev = result;
      result = this.foldConstants(result);
      result = this.simplifyArithmetic(result);
      result = this.simplifyComparisons(result);
      result = this.simplifyBoolean(result);
      result = this.removeRedundantParens(result);
      iterations++;
    } while (result !== code && iterations < maxIterations && result !== code);

    return result;
  }

  foldConstants(code) {
    let result = code;

    // Numeric constant folding
    const arithRegex = /\((\d+)\s*([+\-*/%^])\s*(\d+)\)/g;
    let prev;
    do {
      prev = result;
      result = result.replace(arithRegex, (match, a, op, b) => {
        a = parseFloat(a);
        b = parseFloat(b);
        switch (op) {
          case '+': return (a + b).toString();
          case '-': return (a - b).toString();
          case '*': return (a * b).toString();
          case '/': return b !== 0 ? (a / b).toString() : match;
          case '%': return b !== 0 ? (a % b).toString() : match;
          case '^': return Math.pow(a, b).toString();
          default: return match;
        }
      });
    } while (result !== prev);

    return result;
  }

  simplifyArithmetic(code) {
    let result = code;

    // x + 0 -> x, x - 0 -> x, x * 1 -> x, x / 1 -> x
    result = result.replace(/(\w+)\s*\+\s*0\b/g, '$1');
    result = result.replace(/0\s*\+\s*(\w+)/g, '$1');
    result = result.replace(/(\w+)\s*-\s*0\b/g, '$1');
    result = result.replace(/(\w+)\s*\*\s*1\b/g, '$1');
    result = result.replace(/1\s*\*\s*(\w+)/g, '$1');
    result = result.replace(/(\w+)\s*\/\s*1\b/g, '$1');

    // x * 0 -> 0
    result = result.replace(/(\w+)\s*\*\s*0\b/g, '0');
    result = result.replace(/0\s*\*\s*(\w+)/g, '0');

    return result;
  }

  simplifyComparisons(code) {
    let result = code;

    // Constant comparisons
    result = result.replace(/(\d+)\s*>=\s*(\d+)/g, (m, a, b) => (parseInt(a) >= parseInt(b)).toString());
    result = result.replace(/(\d+)\s*<=\s*(\d+)/g, (m, a, b) => (parseInt(a) <= parseInt(b)).toString());
    result = result.replace(/(\d+)\s*>\s*(\d+)/g, (m, a, b) => (parseInt(a) > parseInt(b)).toString());
    result = result.replace(/(\d+)\s*<\s*(\d+)/g, (m, a, b) => (parseInt(a) < parseInt(b)).toString());
    result = result.replace(/(\d+)\s*==\s*(\d+)/g, (m, a, b) => (parseInt(a) === parseInt(b)).toString());
    result = result.replace(/(\d+)\s*~=\s*(\d+)/g, (m, a, b) => (parseInt(a) !== parseInt(b)).toString());

    return result;
  }

  simplifyBoolean(code) {
    let result = code;

    // true and x -> x, false and x -> false
    result = result.replace(/true\s+and\s+(\w+)/g, '$1');
    result = result.replace(/false\s+and\s+\w+/g, 'false');
    result = result.replace(/(\w+)\s+and\s+true/g, '$1');
    result = result.replace(/(\w+)\s+and\s+false/g, 'false');

    // true or x -> true, false or x -> x
    result = result.replace(/true\s+or\s+\w+/g, 'true');
    result = result.replace(/false\s+or\s+(\w+)/g, '$1');
    result = result.replace(/(\w+)\s+or\s+true/g, 'true');

    // not true -> false, not false -> true
    result = result.replace(/not\s+true/g, 'false');
    result = result.replace(/not\s+false/g, 'true');

    return result;
  }

  removeRedundantParens(code) {
    let result = code;
    let prev;

    do {
      prev = result;
      // ((expr)) -> (expr) when safe
      result = result.replace(/\(\((\w+)\)\)/g, '($1)');
    } while (result !== prev);

    return result;
  }
}

module.exports = { CodeSimplifier };
