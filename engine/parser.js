class LuaParser {
  constructor() {
    this.tokens = [];
    this.pos = 0;
  }

  parse(code) {
    this.tokens = this.tokenize(code);
    this.pos = 0;
    return this.parseChunk();
  }

  tokenize(code) {
    const tokens = [];
    const patterns = [
      { type: 'comment', regex: /^--\[\[[\s\S]*?\]\]/ },
      { type: 'comment', regex: /^--[^\n]*/ },
      { type: 'string', regex: /^\[=*\[[\s\S]*?\]=*\]/ },
      { type: 'string', regex: /^"(?:[^"\\]|\\.)*"/ },
      { type: 'string', regex: /^'(?:[^'\\]|\\.)*'/ },
      { type: 'number', regex: /^0x[0-9a-fA-F]+/ },
      { type: 'number', regex: /^\d+\.?\d*(?:[eE][+-]?\d+)?/ },
      { type: 'keyword', regex: /^(?:local|function|end|if|then|else|elseif|for|while|do|repeat|until|return|break|continue|in|and|or|not|true|false|nil)\b/ },
      { type: 'identifier', regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
      { type: 'operator', regex: /^(?:==|~=|<=|>=|\.\.\.|?\.\.|\.\.|[+\-*/%^#=<>{}()\[\];:,.])/ },
      { type: 'whitespace', regex: /^\s+/ },
    ];

    let remaining = code;
    while (remaining.length > 0) {
      let matched = false;
      for (const pattern of patterns) {
        const match = remaining.match(pattern.regex);
        if (match) {
          if (pattern.type !== 'whitespace' && pattern.type !== 'comment') {
            tokens.push({ type: pattern.type, value: match[0], pos: code.length - remaining.length });
          }
          remaining = remaining.slice(match[0].length);
          matched = true;
          break;
        }
      }
      if (!matched) {
        remaining = remaining.slice(1);
      }
    }

    return tokens;
  }

  parseChunk() {
    return {
      type: 'Chunk',
      body: this.parseStatements(),
    };
  }

  parseStatements() {
    const statements = [];
    while (this.pos < this.tokens.length) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }
    return statements;
  }

  parseStatement() {
    if (this.pos >= this.tokens.length) return null;
    const token = this.tokens[this.pos];

    if (token.type === 'keyword') {
      switch (token.value) {
        case 'local': return this.parseLocal();
        case 'function': return this.parseFunction();
        case 'return': return this.parseReturn();
        case 'if': return this.parseIf();
        case 'for': return this.parseFor();
        case 'while': return this.parseWhile();
        case 'end': this.pos++; return { type: 'End' };
        default: this.pos++; return null;
      }
    }

    this.pos++;
    return { type: 'Expression', token };
  }

  parseLocal() {
    this.pos++; // skip 'local'
    const names = [];
    while (this.pos < this.tokens.length && this.tokens[this.pos].type === 'identifier') {
      names.push(this.tokens[this.pos].value);
      this.pos++;
      if (this.tokens[this.pos]?.value === ',') this.pos++;
    }
    return { type: 'LocalDeclaration', names };
  }

  parseFunction() {
    this.pos++; // skip 'function'
    return { type: 'FunctionDeclaration' };
  }

  parseReturn() {
    this.pos++; // skip 'return'
    return { type: 'ReturnStatement' };
  }

  parseIf() { this.pos++; return { type: 'IfStatement' }; }
  parseFor() { this.pos++; return { type: 'ForStatement' }; }
  parseWhile() { this.pos++; return { type: 'WhileStatement' }; }
}

module.exports = { LuaParser };
