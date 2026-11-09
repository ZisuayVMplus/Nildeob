class StringDecoder {
  decode(code) {
    let result = code;

    // Decode string.char sequences
    result = this.decodeStringChar(result);

    // Decode string.byte sequences
    result = this.decodeStringByte(result);

    // Decode XOR-encrypted strings
    result = this.decodeXORStrings(result);

    // Decode base64-like patterns
    result = this.decodeBase64(result);

    // Decode string.rep patterns
    result = this.decodeStringRep(result);

    // Decode string.format patterns
    result = this.decodeStringFormat(result);

    // Decode concatenation chains
    result = this.decodeConcatenation(result);

    return result;
  }

  decodeStringChar(code) {
    // string.char(72, 101, 108, 108, 111) -> "Hello"
    return code.replace(/string\.char\(([\d,\s]+)\)/g, (match, nums) => {
      try {
        const chars = nums.split(',').map(n => {
          const code = parseInt(n.trim());
          return code >= 32 && code < 127 ? String.fromCharCode(code) : `\\${code}`;
        });
        return `"${chars.join('')}"`;
      } catch {
        return match;
      }
    });
  }

  decodeStringByte(code) {
    // Replace known string.byte patterns
    return code.replace(/string\.byte\("([^"])",\s*(\d+)\)/g, (match, str, pos) => {
      const charCode = str.charCodeAt(parseInt(pos) - 1);
      return charCode !== undefined ? charCode.toString() : match;
    });
  }

  decodeXORStrings(code) {
    // Look for bit32.bxor patterns with string operations
    // This is a simplified version - real implementation would need full emulation
    return code.replace(/bit32\.bxor\((\d+),\s*(\d+)\)/g, (match, a, b) => {
      try {
        return (parseInt(a) ^ parseInt(b)).toString();
      } catch {
        return match;
      }
    });
  }

  decodeBase64(code) {
    // Detect and decode base64 patterns if present
    const b64Regex = /"(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?"/g;
    return code; // Placeholder - would need context to determine if it's actually base64
  }

  decodeStringRep(code) {
    return code.replace(/string\.rep\("([^"]*)",\s*(\d+)\)/g, (match, str, count) => {
      try {
        return `"${str.repeat(parseInt(count))}"`;
      } catch {
        return match;
      }
    });
  }

  decodeStringFormat(code) {
    return code.replace(/string\.format\("([^"]*)"(?:,\s*([^)]+))?\)/g, (match, fmt, args) => {
      try {
        if (!args) return `"${fmt}"`;
        const argList = args.split(',').map(a => a.trim());
        let result = fmt;
        let argIdx = 0;
        result = result.replace(/%[dsfq%]/g, (spec) => {
          if (spec === '%%') return '%';
          return argList[argIdx++] || spec;
        });
        return `"${result}"`;
      } catch {
        return match;
      }
    });
  }

  decodeConcatenation(code) {
    // "str1" .. "str2" -> "str1str2"
    let prev;
    let result = code;
    do {
      prev = result;
      result = result.replace(/"([^"]*)"\s*\.\.\s*"([^"]*)"/g, '"$1$2"');
    } while (result !== prev);
    return result;
  }
}

module.exports = { StringDecoder };
