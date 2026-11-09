// State
let currentFileName = 'deobfuscated.lua';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupDropZone();
  setupFileInput();
  setupEditorStats();
});

// Drop Zone
function setupDropZone() {
  const dropZone = document.getElementById('dropZone');

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'));
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'));
  });

  dropZone.addEventListener('drop', handleDrop);
  dropZone.addEventListener('click', () => document.getElementById('fileInput').click());
}

function handleDrop(e) {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

function setupFileInput() {
  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  });
}

function processFile(file) {
  currentFileName = file.name.replace(/\.[^.]+$/, '') + '_deobfuscated.lua';
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('inputCode').value = e.target.result;
    updateStats('input');
    showToast(`📁 Loaded: ${file.name}`);
  };
  reader.readAsText(file);
}

// Editor Stats
function setupEditorStats() {
  const input = document.getElementById('inputCode');
  const output = document.getElementById('outputCode');

  input.addEventListener('input', () => updateStats('input'));
  output.addEventListener('input', () => updateStats('output'));
}

function updateStats(type) {
  const el = document.getElementById(type === 'input' ? 'inputCode' : 'outputCode');
  const statsEl = document.getElementById(type === 'input' ? 'inputStats' : 'outputStats');
  const text = el.value;
  const chars = text.length;
  const lines = text.split('\n').length;
  statsEl.textContent = `${chars.toLocaleString()} chars, ${lines.toLocaleString()} lines`;
}

// Deobfuscate
async function deobfuscate() {
  const inputCode = document.getElementById('inputCode').value;
  if (!inputCode.trim()) {
    showToast('⚠️ Please enter code to deobfuscate', 'warning');
    return;
  }

  const btn = document.getElementById('deobfuscateBtn');
  const statusPanel = document.getElementById('statusPanel');
  const statusText = document.getElementById('statusText');

  btn.classList.add('loading');
  statusPanel.style.display = 'flex';

  const options = {
    decodeStrings: document.getElementById('optDecodeStrings').checked,
    simplifyExpressions: document.getElementById('optSimplify').checked,
    removeDeadCode: document.getElementById('optRemoveDead').checked,
    renameVariables: document.getElementById('optRename').checked,
    formatOutput: document.getElementById('optFormat').checked,
  };

  try {
    statusText.textContent = 'Analyzing obfuscation pattern...';

    const response = await fetch('/api/deobfuscate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inputCode, options }),
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById('outputCode').value = result.code;
      updateStats('output');
      showAnalysis(result);
      showToast(`✅ Deobfuscated! Pattern: ${result.pattern} | Reduction: ${result.reduction}`);
    } else {
      showToast(`❌ Error: ${result.error}`, 'error');
      document.getElementById('outputCode').value = `-- Error: ${result.error}\n-- Original code preserved below:\n\n${inputCode}`;
    }
  } catch (err) {
    showToast(`❌ Network error: ${err.message}`, 'error');
  } finally {
    btn.classList.remove('loading');
    statusPanel.style.display = 'none';
  }
}

function showAnalysis(result) {
  const section = document.getElementById('analysisSection');
  const grid = document.getElementById('analysisGrid');
  const log = document.getElementById('logOutput');

  grid.innerHTML = `
    <div class="analysis-item">
      <div class="value">${result.pattern}</div>
      <div class="label">Detected Pattern</div>
    </div>
    <div class="analysis-item">
      <div class="value">${(result.originalSize / 1024).toFixed(1)}KB</div>
      <div class="label">Original Size</div>
    </div>
    <div class="analysis-item">
      <div class="value">${(result.deobfuscatedSize / 1024).toFixed(1)}KB</div>
      <div class="label">Output Size</div>
    </div>
    <div class="analysis-item">
      <div class="value">${result.reduction}</div>
      <div class="label">Reduction</div>
    </div>
    <div class="analysis-item">
      <div class="value">${result.time}ms</div>
      <div class="label">Processing Time</div>
    </div>
  `;

  log.textContent = result.log.join('\n');
  section.style.display = 'block';
}

// Utility Functions
function clearInput() {
  document.getElementById('inputCode').value = '';
  updateStats('input');
}

function loadSample() {
  const sample = `-- Sample obfuscated code
local a = string.char(72, 101, 108, 108, 111)
local b = "Hello" .. " " .. "World"
local c = 1 + 2 + 3
local d = function(x) return x * 2 end
if true then
  print(a)
end
print(b, c, d(5))`;
  document.getElementById('inputCode').value = sample;
  updateStats('input');
  showToast('📋 Sample code loaded');
}

function copyOutput() {
  const output = document.getElementById('outputCode');
  output.select();
  navigator.clipboard.writeText(output.value).then(() => {
    showToast('📋 Copied to clipboard!');
  });
}

function downloadOutput() {
  const code = document.getElementById('outputCode').value;
  if (!code) {
    showToast('⚠️ No output to download', 'warning');
    return;
  }

  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`💾 Downloaded: ${currentFileName}`);
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
