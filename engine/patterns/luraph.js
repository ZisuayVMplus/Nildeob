class LuraphPattern {
  constructor() {
    this.name = 'Luraph';
    this.version = null;
  }

  detect(code) {
    const indicators = [];
    let confidence = 0;

    // Check for Luraph header comment
    if (/LPH#|Luraph/i.test(code)) {
      indicators.push('Luraph signature found');
      confidence += 40;
    }

    // Check for setmetatable wrapper pattern
    if (/return\s+setmetatable\(\{/.test(code)) {
      indicators.push('setmetatable wrapper');
      confidence += 15;
    }

    // Check for VM dispatch with numeric comparisons
    if (/if\s+\w+\s*<=\s*\d+\s+then[\s\S]*?elseif\s+\w+\s*<=\s*\d+/m.test(code)) {
      indicators.push('VM dispatch pattern');
      confidence += 15;
    }

    // Check for buffer operations (Roblox-specific Luraph)
    if (/buffer\.(readu8|writeu8|readu32|writeu32)/.test(code)) {
      indicators.push('Buffer operations (Roblox Luraph)');
      confidence += 10;
    }

    // Check for bit32 operations
    if (/bit32\.(bxor|band|bor|lshift|rshift)/.test(code)) {
      indicators.push('Bit32 operations');
      confidence += 5;
    }

    // Check for self-decoding pattern
    if (/\[=+\[.{200,}\]=+\]/.test(code)) {
      indicators.push('Large encoded string blob');
      confidence += 10;
    }

    // Check for table-indexed function dispatch
    if (/\[\d+\]\s*=\s*(?:function|[\w.]+)/.test(code)) {
      indicators.push('Table-indexed function table');
      confidence += 5;
    }

    // Detect version
    const versionMatch = code.match(/Luraph\s*(?:Obfuscator\s*)?v?([\d.]+)/i);
    if (versionMatch) {
      this.version = versionMatch[1];
    }

    return {
      match: confidence >= 50,
      confidence: Math.min(confidence, 100),
      details: indicators,
      version: this.version,
    };
  }

  deobfuscate(code, options) {
    let result = code;

    // Step 1: Extract and analyze the VM structure
    const vmStructure = this.analyzeVMStructure(result);

    // Step 2: Extract the encoded bytecode
    const bytecode = this.extractBytecode(result);

    // Step 3: Remove Luraph header
    result = this.removeHeader(result);

    // Step 4: Decode the string table
    if (bytecode) {
      result = this.decodeStringTable(result, bytecode);
    }

    // Step 5: Simplify the VM dispatch
    result = this.simplifyVMDispatch(result);

    // Step 6: Remove anti-tamper checks
    result = this.removeAntiTamper(result);

    // Step 7: Extract constants
    result = this.extractConstants(result);

    // Step 8: Clean up Luraph-specific artifacts
    result = this.cleanupArtifacts(result);

    return result;
  }

  analyzeVMStructure(code) {
    const structure = {
      entryPoint: null,
      functionTable: {},
      stringTable: null,
      constants: [],
    };

    // Find entry point (usually the last method call)
    const entryMatch = code.match(/:(\w+)\(\)\s*\(\.\.\.\)\s*$/);
    if (entryMatch) {
      structure.entryPoint = entryMatch[1];
    }

    // Find function table entries
    const funcTableRegex = /\[(\d+)\]\s*=\s*([\w.]+|function)/g;
    let match;
    while ((match = funcTableRegex.exec(code)) !== null) {
      structure.functionTable[match[1]] = match[2];
    }

    return structure;
  }

  extractBytecode(code) {
    // Find the large encoded string (usually in r8 or similar)
    const longStrMatch = code.match(/(\w+)\s*=\s*\[=+\[([\s\S]{100,}?)\]=+\]/);
    if (longStrMatch) {
      return {
        variable: longStrMatch[1],
        data: longStrMatch[2],
        length: longStrMatch[2].length,
      };
    }
    return null;
  }

  removeHeader(code) {
    // Remove Luraph comment headers
    return code.replace(/--\s*This file (?:was|is) protected using Luraph[^\n]*\n?/gi, '');
  }

  decodeStringTable(code, bytecode) {
    // The string table in Luraph is typically XOR-encrypted
    // We attempt to find the decryption key and decode

    // Look for the decoding function pattern
    const decodeFuncMatch = code.match(/for\s+\w+\s*=\s*\d+\s*,\s*#\w+\s*do\s*([\s\S]*?)end/);

    // For now, mark the encoded section
    if (bytecode) {
      code = code.replace(
        new RegExp(`(${bytecode.variable}\\s*=\\s*\\[=+\\[)[\\s\\S]*?(\\]=+\\])`),
        `$1\n--[[ Encoded bytecode: ${bytecode.length} chars - requires runtime decoding ]]--\n$2`
      );
    }

    return code;
  }

  simplifyVMDispatch(code) {
    let result = code;

    // Pattern: Multiple if/elseif with numeric comparisons for opcode dispatch
    // Try to extract meaningful operations from each branch

    // Remove redundant state variable updates
    result = result.replace(/(\w+)\s*=\s*(\w+)\s*\+\s*1\s*;?\s*\n\s*if\s+\1\s*</g, 'if $1 < ');

    return result;
  }

  removeAntiTamper(code) {
    let result = code;

    // Remove common anti-tamper patterns
    // Pattern: Checking if functions are native
    result = result.replace(/if\s+type\(\w+\)\s*~=\s*"function"\s+then[\s\S]*?end\s*;?/g, '');

    // Remove environment checks
    result = result.replace(/if\s+(?:getfenv|getmetatable)\(\)[\s\S]*?end\s*;?/g, '');

    // Remove integrity checks
    result = result.replace(/assert\([\s\S]*?\)\s*;?/g, '');

    return result;
  }

  extractConstants(code) {
    let result = code;

    // Replace numeric table accesses with their values where possible
    // Pattern: local x = {1, 2, 3}; ... x[1] -> 1
    // This is simplified

    return result;
  }

  cleanupArtifacts(code) {
    let result = code;

    // Remove Luraph-specific variable naming patterns
    // Replace single-letter variable chains with meaningful names

    // Remove unused local declarations
    result = result.replace(/local\s+\w+\s*=\s*nil\s*;?\s*\n/g, '');

    // Clean up excessive semicolons
    result = result.replace(/;{2,}/g, ';');

    return result;
  }
}

module.exports = { LuraphPattern };
