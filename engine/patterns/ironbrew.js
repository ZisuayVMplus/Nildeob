class IronBrewPattern {
  constructor() {
    this.name = 'IronBrew';
  }

  detect(code) {
    const indicators = [];
    let confidence = 0;

    // IronBrew specific patterns
    if (/IronBrew|IB2/i.test(code)) {
      indicators.push('IronBrew signature');
      confidence += 50;
    }

    if (/local\s+\w+\s*=\s*\(\s*function\s*\(\s*\)\s*return\s*\{\s*\}\s*end\s*\)\(\)/.test(code)) {
      indicators.push('IronBrew VM init pattern');
      confidence += 20;
    }

    if (/string\.char\([\d,\s]+\)/.test(code) && code.length > 10000) {
      indicators.push('Large string.char usage');
      confidence += 15;
    }

    if (/loadstring\s*\(\s*string\.char/.test(code)) {
      indicators.push('loadstring with string.char');
      confidence += 15;
    }

    return {
      match: confidence >= 40,
      confidence: Math.min(confidence, 100),
      details: indicators,
    };
  }

  deobfuscate(code, options) {
    let result = code;

    // Remove IronBrew header
    result = result.replace(/--.*IronBrew[^\n]*\n?/gi, '');

    // Attempt to decode string.char sequences
    result = this.decodeStringCharSequences(result);

    // Simplify VM structure
    result = this.simplifyVM(result);

    return result;
  }

  decodeStringCharSequences(code) {
    return code.replace(/string\.char\(([\d,\s]+)\)/g, (match, nums) => {
      try {
        const str = nums.split(',').map(n => String.fromCharCode(parseInt(n.trim()))).join('');
        return `"${str.replace(/["\\]/g, '\\$&')}"`;
      } catch {
        return match;
      }
    });
  }

  simplifyVM(code) {
    return code;
  }
}

module.exports = { IronBrewPattern };
