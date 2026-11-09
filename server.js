const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DeobfuscatorEngine } = require('./engine');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer config for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.lua', '.luau', '.txt'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .lua, .luau, .txt files allowed'));
    }
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// API: Analyze obfuscated code
app.post('/api/analyze', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    const engine = new DeobfuscatorEngine();
    const analysis = engine.analyze(code);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Deobfuscate code
app.post('/api/deobfuscate', (req, res) => {
  try {
    const { code, options } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    const engine = new DeobfuscatorEngine(options);
    const result = engine.deobfuscate(code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// API: Upload file and deobfuscate
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const code = req.file.buffer.toString('utf-8');
    const engine = new DeobfuscatorEngine(req.body.options ? JSON.parse(req.body.options) : {});
    const result = engine.deobfuscate(code);

    res.json({
      originalSize: req.file.size,
      fileName: req.file.originalname,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Download deobfuscated file
app.post('/api/download', (req, res) => {
  try {
    const { code, filename } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    const sanitized = (filename || 'deobfuscated.lua').replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitized}"`);
    res.send(code);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`🔓 Lua Deobfuscator running on port ${PORT}`);
});
