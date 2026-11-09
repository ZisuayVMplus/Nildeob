class CodeAnalyzer {
  analyze(code) {
    return {
      hasVM: this.detectVM(code),
      hasStringEncryption: this.detectStringEncryption(code),
      hasControlFlowFlattening: this.detectCFF(code),
      hasOpaquePredicates: this.detectOpaquePredicates(code),
      hasSelfDecoding: this.detectSelfDecoding(code),
      entryPoint: this.findEntryPoint(code),
      encodedData: this.findEncodedData(code),
      functionTable: this.extractFunctionTable(code),
    };
  }

  detectVM(code) {
    const indicators = [
      /while\s+\w+\s+do/i,
      /if\s+\w+\s*[<>=]+\s*\d+\s+then/i,
      /local\s+\w+\s*=\s*\w+\[\d+\]/,
      /buffer\.(read|write)/,
      /bit32\.(band|bor|bxor|lshift|rshift)/,
    ];
    const matches = indicators.filter(r => r.test(code));
    return matches.length >= 3;
  }

  detectStringEncryption(code) {
    return /\[=+\[.{100,}\]=+\]/.test(code) ||
           /local\s+\w+\s*=\s*"[A-Za-z0-9+/=]{50,}"/.test(code);
  }

  detectCFF(code) {
    const whileCount = (code.match(/while\s+\w+\s+do/g) || []).length;
    const ifCount = (code.match(/if\s+\w+\s*<=?\s*\d+/g) || []).length;
    return whileCount > 2 && ifCount > 5;
  }

  detectOpaquePredicates(code) {
    return /if\s+(true|false|\d+\s*[<>=]+\s*\d+)\s+then/.test(code) ||
           /\w+\s*<=\s*\d+\s+and\s+\w+\s*<=\s*\d+/.test(code);
  }

  detectSelfDecoding(code) {
    return /loadstring|load\s*\(/.test(code) ||
           /string\.(char|byte|rep|sub|gsub)/.test(code);
  }

  findEntryPoint(code) {
    // Look for the final function call pattern like :t8()(...)
    const entryMatch = code.match(/:(\w+)\(\)\(\.\.\.\)\s*$/);
    if (entryMatch) return entryMatch[1];

    // Look for return ... pattern at end
    const returnMatch = code.match(/return\s+.*?:(\w+)\(\)/);
    if (returnMatch) return returnMatch[1];

    return null;
  }

  findEncodedData(code) {
    const results = [];

    // Find long string literals (likely encoded data)
    const longStringRegex = /\[=+\[([\s\S]{50,}?)\]=+\]/g;
    let match;
    while ((match = longStringRegex.exec(code)) !== null) {
      results.push({
        type: 'long_string',
        position: match.index,
        length: match[1].length,
        preview: match[1].substring(0, 50) + '...',
      });
    }

    // Find table assignments with numeric data
    const tableRegex = /local\s+(\w+)\s*=\s*\{[\d,\s]{50,}\}/g;
    while ((match = tableRegex.exec(code)) !== null) {
      results.push({
        type: 'numeric_table',
        name: match[1],
        position: match.index,
      });
    }

    return results;
  }

  extractFunctionTable(code) {
    const functions = {};
    // Match [number]=function or name=function patterns in table constructors
    const funcRegex = /\[(\d+)\]\s*=\s*(?:function|[\w.]+)/g;
    let match;
    while ((match = funcRegex.exec(code)) !== null) {
      functions[match[1]] = { index: parseInt(match[1]) };
    }
    return functions;
  }
}

module.exports = { CodeAnalyzer };
