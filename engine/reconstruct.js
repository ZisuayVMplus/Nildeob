class CodeReconstructor {
  reconstruct(code) {
    let result = code;

    // Step 1: Flatten control flow
    result = this.flattenControlFlow(result);

    // Step 2: Remove VM dispatch patterns
    result = this.removeVMDispatch(result);

    // Step 3: Inline simple assignments
    result = this.inlineAssignments(result);

    // Step 4: Clean up structure
    result = this.cleanup(result);

    // Step 5: Add comments for complex sections
    result = this.addAnnotations(result);

    return result;
  }

  flattenControlFlow(code) {
    // Detect and flatten while true do ... break ... end patterns
    let result = code;

    // Remove state machine patterns
    // Pattern: local state = X; while true do if state == N then ... state = M ... end end
    const stateMachineRegex = /local\s+(\w+)\s*=\s*(\d+)\s*;?\s*while\s+true\s+do\s*([\s\S]*?)\s*end/g;

    result = result.replace(stateMachineRegex, (match, stateVar, initState, body) => {
      // Try to extract the execution order
      const blocks = this.extractStateBlocks(body, stateVar);
      if (blocks.length > 0) {
        return this.reorderBlocks(blocks, parseInt(initState), stateVar);
      }
      return match;
    });

    return result;
  }

  extractStateBlocks(body, stateVar) {
    const blocks = [];
    const blockRegex = new RegExp(
      `if\\s+${stateVar}\\s*==\\s*(\\d+)\\s+then\\s*([\\s\\S]*?)(?=if\\s+${stateVar}|end)`,
      'g'
    );
    let match;
    while ((match = blockRegex.exec(body)) !== null) {
      blocks.push({
        state: parseInt(match[1]),
        code: match[2].trim(),
        next: this.findNextState(match[2], stateVar),
      });
    }
    return blocks;
  }

  findNextState(code, stateVar) {
    const nextMatch = code.match(new RegExp(`${stateVar}\\s*=\\s*(\\d+)`));
    return nextMatch ? parseInt(nextMatch[1]) : null;
  }

  reorderBlocks(blocks, initState, stateVar) {
    const blockMap = new Map(blocks.map(b => [b.state, b]));
    const ordered = [];
    let current = initState;
    const visited = new Set();

    while (current !== null && !visited.has(current)) {
      visited.add(current);
      const block = blockMap.get(current);
      if (!block) break;

      // Remove state transition from code
      let code = block.code.replace(new RegExp(`${stateVar}\\s*=\\s*\\d+\\s*;?`, 'g'), '');
      code = code.replace(/break\s*;?/g, '');
      ordered.push(code.trim());
      current = block.next;
    }

    return ordered.filter(c => c).join('\n');
  }

  removeVMDispatch(code) {
    let result = code;

    // Remove common VM dispatch patterns
    // Pattern: if opcode <= N then ... elseif ... end
    result = result.replace(/local\s+\w+\s*=\s*\w+\[\w+\]\s*;?\s*if\s+\w+\s*<\s*\d+/g, (match) => {
      return '-- [VM Dispatch] ' + match;
    });

    // Remove buffer read/write patterns used for VM state
    result = result.replace(/buffer\.(read|write)(u8|i8|u16|i16|u32|i32|f32|f64)\([^)]*\)/g, (match) => {
      return `--[[ VM: ${match} ]]`;
    });

    return result;
  }

  inlineAssignments(code) {
    let result = code;

    // Inline single-use variables
    // Pattern: local x = expr; ... use x once ...
    // This is simplified - real implementation needs scope analysis

    // Remove redundant local declarations that are immediately used once
    result = result.replace(/local\s+(\w+)\s*=\s*([^;\n]+)\s*;?\s*\n\s*return\s+\1\s*;?/g, 'return $2;');

    return result;
  }

  cleanup(code) {
    let result = code;

    // Remove multiple blank lines
    result = result.replace(/\n{3,}/g, '\n\n');

    // Remove trailing whitespace
    result = result.replace(/[ \t]+$/gm, '');

    // Fix indentation issues
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Remove empty local declarations
    result = result.replace(/local\s+\w+\s*=\s*nil\s*;?\s*\n/g, '');

    return result;
  }

  addAnnotations(code) {
    let result = code;

    // Add section headers for identifiable patterns
    if (result.includes('setmetatable')) {
      result = result.replace(/(return\s+setmetatable)/, '-- [[ Main Entry Point ]]\n$1');
    }

    if (result.includes('local function')) {
      // Count functions and add header
      const funcCount = (result.match(/local\s+function/g) || []).length;
      if (funcCount > 5) {
        result = `-- [[ Contains ${funcCount} local functions ]]\n` + result;
      }
    }

    return result;
  }
}

module.exports = { CodeReconstructor };
