const { LuaParser } = require('./parser');
const { CodeAnalyzer } = require('./analyzer');
const { StringDecoder } = require('./decoder');
const { CodeSimplifier } = require('./simplifier');
const { CodeReconstructor } = require('./reconstruct');
const { LuraphPattern } = require('./patterns/luraph');
const { IronBrewPattern } = require('./patterns/ironbrew');
const { GenericPattern } = require('./patterns/generic');

class DeobfuscatorEngine {
  constructor(options = {}) {
    this.options = {
      removeDeadCode: options.removeDeadCode !== false,
      simplifyExpressions: options.simplifyExpressions !== false,
      decodeStrings: options.decodeStrings !== false,
      renameVariables: options.renameVariables !== false,
      inlineFunctions: options.inlineFunctions !== false,
      formatOutput: options.formatOutput !== false,
      maxIterations: options.maxIterations || 50,
      verbose: options.verbose || false,
    };

    this.patterns = [
      new LuraphPattern(),
      new IronBrewPattern(),
      new GenericPattern(),
    ];

    this.log = [];
  }

  analyze(code) {
    const startTime = Date.now();
    const results = {
      detectedPatterns: [],
      structure: null,
      statistics: {},
      warnings: [],
    };

    // Detect obfuscation patterns
    for (const pattern of this.patterns) {
      const detection = pattern.detect(code);
      if (detection.match) {
        results.detectedPatterns.push({
          name: pattern.name,
          confidence: detection.confidence,
          details: detection.details,
        });
      }
    }

    // Analyze structure
    const analyzer = new CodeAnalyzer();
    results.structure = analyzer.analyze(code);

    // Statistics
    results.statistics = {
      originalSize: code.length,
      lineCount: code.split('\n').length,
      functionCount: (code.match(/function/g) || []).length,
      stringCount: (code.match(/"[^"]*"|'[^']*'|\[=*\[/g) || []).length,
      variableCount: (code.match(/local\s+\w+/g) || []).length,
      analysisTime: Date.now() - startTime,
    };

    return results;
  }

  deobfuscate(code) {
    const startTime = Date.now();
    this.log = [];

    try {
      // Step 1: Detect pattern
      this.logStep('Detecting obfuscation pattern...');
      const detectedPattern = this.detectPattern(code);
      this.logStep(`Detected: ${detectedPattern ? detectedPattern.name : 'Unknown/Generic'}`);

      // Step 2: Initial parsing
      this.logStep('Parsing code structure...');
      const parser = new LuaParser();
      let ast = parser.parse(code);

      // Step 3: Apply pattern-specific deobfuscation
      let workingCode = code;
      if (detectedPattern) {
        this.logStep(`Applying ${detectedPattern.name} deobfuscation...`);
        workingCode = detectedPattern.deobfuscate(workingCode, this.options);
      }

      // Step 4: Decode strings
      if (this.options.decodeStrings) {
        this.logStep('Decoding encrypted strings...');
        const decoder = new StringDecoder();
        workingCode = decoder.decode(workingCode);
      }

      // Step 5: Simplify expressions
      if (this.options.simplifyExpressions) {
        this.logStep('Simplifying expressions...');
        const simplifier = new CodeSimplifier();
        workingCode = simplifier.simplify(workingCode);
      }

      // Step 6: Remove dead code
      if (this.options.removeDeadCode) {
        this.logStep('Removing dead code...');
        workingCode = this.removeDeadCode(workingCode);
      }

      // Step 7: Rename variables
      if (this.options.renameVariables) {
        this.logStep('Renaming variables for readability...');
        workingCode = this.renameVariables(workingCode);
      }

      // Step 8: Reconstruct readable code
      this.logStep('Reconstructing code...');
      const reconstructor = new CodeReconstructor();
      workingCode = reconstructor.reconstruct(workingCode);

      // Step 9: Format output
      if (this.options.formatOutput) {
        this.logStep('Formatting output...');
        workingCode = this.formatCode(workingCode);
      }

      const elapsed = Date.now() - startTime;
      this.logStep(`Done in ${elapsed}ms`);

      return {
        success: true,
        code: workingCode,
        pattern: detectedPattern ? detectedPattern.name : 'Generic',
        originalSize: code.length,
        deobfuscatedSize: workingCode.length,
        reduction: ((1 - workingCode.length / code.length) * 100).toFixed(1) + '%',
        log: this.log,
        time: elapsed,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        code: code,
        log: this.log,
        time: Date.now() - startTime,
      };
    }
  }

  detectPattern(code) {
    let bestMatch = null;
    let bestConfidence = 0;

    for (const pattern of this.patterns) {
      const detection = pattern.detect(code);
      if (detection.match && detection.confidence > bestConfidence) {
        bestConfidence = detection.confidence;
        bestMatch = pattern;
      }
    }

    return bestMatch;
  }

  removeDeadCode(code) {
    // Remove unreachable code after return
    code = code.replace(/(return[^;\n]*;\s*)(?!\s*end|else|elseif|until|\})/g, '$1');

    // Remove empty blocks
    code = code.replace(/do\s*end/g, '');
    code = code.replace(/then\s*end/g, 'then end');

    // Remove redundant semicolons
    code = code.replace(/;;+/g, ';');

    // Remove `if true then ... end` patterns
    code = code.replace(/if\s+true\s+then\s*([\s\S]*?)\s*end/g, '$1');

    // Remove `if false then ... end` blocks
    code = code.replace(/if\s+false\s+then\s*[\s\S]*?\s*end/g, '');

    // Remove `while false do ... end`
    code = code.replace(/while\s+false\s+do\s*[\s\S]*?\s*end/g, '');

    return code;
  }

  renameVariables(code) {
    const varMap = new Map();
    let counter = { var: 0, func: 0, param: 0 };

    // Find single-char or obfuscated variable names
    const obfuscatedPattern = /\blocal\s+([IlO0]{1,}|[a-zA-Z_][IlO0]{2,})\b/g;
    let match;

    while ((match = obfuscatedPattern.exec(code)) !== null) {
      const original = match[1];
      if (!varMap.has(original)) {
        varMap.set(original, `var_${++counter.var}`);
      }
    }

    // Apply renaming
    for (const [original, renamed] of varMap) {
      const regex = new RegExp(`\\b${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      code = code.replace(regex, renamed);
    }

    return code;
  }

  formatCode(code) {
    // Basic Lua formatting
    let formatted = code;
    let indent = 0;
    const lines = formatted.split('\n');
    const result = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) {
        result.push('');
        continue;
      }

      // Decrease indent for closing keywords
      if (/^(end|else|elseif|until|\})/.test(line)) {
        indent = Math.max(0, indent - 1);
      }

      result.push('  '.repeat(indent) + line);

      // Increase indent for opening keywords
      if (/\b(function|if|for|while|repeat|do)\b.*$/.test(line) && !/\bend\b/.test(line)) {
        indent++;
      }
      if (/\bthen\b/.test(line) && !/\bend\b/.test(line) && !/\belse\b/.test(line)) {
        indent++;
      }
    }

    return result.join('\n');
  }

  logStep(message) {
    this.log.push(`[${new Date().toISOString()}] ${message}`);
  }
}

module.exports = { DeobfuscatorEngine };
