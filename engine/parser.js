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
      // Lua comments
      { type: 'comment', regex: /^--\[(=*)\[[\s\S]*?\]\1\]/ },
      { type: 'comment', regex: /^--[^\n]*/ },

      // Long strings: [[...]], [=[...]=], [==[...]==], ...
      { type: 'string', regex: /^\[(=*)\[[\s\S]*?\]\1\]/ },

      // Normal strings
      { type: 'string', regex: /^"(?:[^"\\]|\\.)*"/ },
      { type: 'string', regex: /^'(?:[^'\\]|\\.)*'/ },

      // Numbers
      { type: 'number', regex: /^0[xX][0-9a-fA-F]+/ },
      { type: 'number', regex: /^\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/ },

      // Keywords
      {
        type: 'keyword',
        regex:
          /^(?:local|function|end|if|then|else|elseif|for|while|do|repeat|until|return|break|continue|in|and|or|not|true|false|nil)\b/
      },

      // Identifiers
      {
        type: 'identifier',
        regex: /^[a-zA-Z_][a-zA-Z0-9_]*/
      },

      // Operators / punctuation
      {
        type: 'operator',
        regex:
          /^(?:==|~=|<=|>=|\.\.\.|\.{2}|[+\-*/%^#=<>()[\]{};:,.])/
      },

      // Whitespace
      {
        type: 'whitespace',
        regex: /^\s+/
      }
    ];

    let remaining = code;

    while (remaining.length > 0) {
      let matched = false;

      for (const pattern of patterns) {
        const match = remaining.match(pattern.regex);

        if (match) {
          if (
            pattern.type !== 'whitespace' &&
            pattern.type !== 'comment'
          ) {
            tokens.push({
              type: pattern.type,
              value: match[0],
              pos: code.length - remaining.length
            });
          }

          remaining = remaining.slice(match[0].length);
          matched = true;
          break;
        }
      }

      // Unknown character.
      // Skip it instead of getting stuck forever.
      if (!matched) {
        remaining = remaining.slice(1);
      }
    }

    return tokens;
  }

  parseChunk() {
    return {
      type: 'Chunk',
      body: this.parseStatements()
    };
  }

  parseStatements() {
    const statements = [];

    while (this.pos < this.tokens.length) {
      const stmt = this.parseStatement();

      if (stmt) {
        statements.push(stmt);
      }
    }

    return statements;
  }

  parseStatement() {
    if (this.pos >= this.tokens.length) {
      return null;
    }

    const token = this.tokens[this.pos];

    if (token.type === 'keyword') {
      switch (token.value) {
        case 'local':
          return this.parseLocal();

        case 'function':
          return this.parseFunction();

        case 'return':
          return this.parseReturn();

        case 'if':
          return this.parseIf();

        case 'for':
          return this.parseFor();

        case 'while':
          return this.parseWhile();

        case 'end':
          this.pos++;
          return {
            type: 'End'
          };

        default:
          this.pos++;
          return null;
      }
    }

    this.pos++;

    return {
      type: 'Expression',
      token
    };
  }

  parseLocal() {
    this.pos++;

    const names = [];

    while (
      this.pos < this.tokens.length &&
      this.tokens[this.pos].type === 'identifier'
    ) {
      names.push(this.tokens[this.pos].value);
      this.pos++;

      if (
        this.tokens[this.pos] &&
        this.tokens[this.pos].value === ','
      ) {
        this.pos++;
      } else {
        break;
      }
    }

    return {
      type: 'LocalDeclaration',
      names
    };
  }

  parseFunction() {
    this.pos++;

    return {
      type: 'FunctionDeclaration'
    };
  }

  parseReturn() {
    this.pos++;

    return {
      type: 'ReturnStatement'
    };
  }

  parseIf() {
    this.pos++;

    return {
      type: 'IfStatement'
    };
  }

  parseFor() {
    this.pos++;

    return {
      type: 'ForStatement'
    };
  }

  parseWhile() {
    this.pos++;

    return {
      type: 'WhileStatement'
    };
  }
}

module.exports = {
  LuaParser
};
