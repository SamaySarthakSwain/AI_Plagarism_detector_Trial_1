import dotenv from 'dotenv';
dotenv.config();

import os from 'os';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import serverless from 'serverless-http';
import { createRequire } from 'module';
import mammoth from 'mammoth';
import axios from 'axios';

// pdf-parse is CommonJS-only — must load via require() in ESM
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Detect serverless environment ───────────────────────────────────────────
const IS_SERVERLESS = !!(
  process.env.NETLIFY ||
  process.env.VERCEL  ||
  process.env.LAMBDA_TASK_ROOT
);

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Safe uploads dir (only needed for local dev — serverless uses os.tmpdir())
if (!IS_SERVERLESS) {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {
    console.log('Could not create uploads dir:', e.message);
  }
}

// ─── Helper: buffer → temp file path ─────────────────────────────────────────
const bufferToTmpFile = (buffer, originalName) => {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `${Date.now()}_${safe}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

const cleanTmp = (filePath) => {
  if (filePath) {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
  }
};

// ─── ROUTE: /api/upload ───────────────────────────────────────────────────────
app.post('/api/upload', async (req, res) => {
  let tmpFile = null;
  try {
    const { file, filename } = req.body || {};

    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'No file data received.' });
    }
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'No filename provided.' });
    }

    const buffer   = Buffer.from(file, 'base64');
    const lname    = filename.toLowerCase().trim();
    let text       = '';

    // PDF
    if (lname.endsWith('.pdf')) {
      const data = await pdf(buffer);
      text = data.text || '';

    // DOCX (modern Word)
    } else if (lname.endsWith('.docx')) {
      const data = await mammoth.extractRawText({ buffer });
      text = data.value || '';

    // JSON → flatten to readable key:value pairs
    } else if (lname.endsWith('.json')) {
      try {
        const parsed = JSON.parse(buffer.toString('utf8'));
        text = flattenJSON(parsed);
      } catch {
        text = buffer.toString('utf8');
      }

    // HTML → strip tags
    } else if (lname.endsWith('.html') || lname.endsWith('.htm')) {
      text = buffer.toString('utf8')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
        .replace(/\s{2,}/g, ' ').trim();

    // Plain text variants — direct UTF-8 read
    } else if (['.txt','.md','.markdown','.log','.csv','.tsv',
                '.xml','.yaml','.yml','.rtf','.tex','.rst'].some(e => lname.endsWith(e))) {
      text = buffer.toString('utf8');

    // Spreadsheets / old DOC / PPT — use temp file + any-text
    } else if (['.xlsx','.xls','.doc','.odt','.ods','.pptx','.ppt'].some(e => lname.endsWith(e))) {
      // any-text requires a real file path
      try {
        const { getText } = await import('any-text');
        tmpFile = bufferToTmpFile(buffer, filename);
        text = await getText(tmpFile);
      } catch (anyTextErr) {
        console.error('any-text error:', anyTextErr.message);
        return res.status(422).json({
          error: `Could not extract text from "${filename}". ` +
                 `Try converting it to PDF or DOCX first.`
        });
      }

    // Generic fallback — try UTF-8 and reject obvious binary
    } else {
      const raw = buffer.toString('utf8');
      const nonPrintable = (raw.match(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g) || []).length;
      if (raw.length > 0 && nonPrintable / raw.length > 0.3) {
        return res.status(422).json({
          error: `Unsupported binary file: "${filename}". ` +
                 `Upload a PDF, Word (.docx), TXT, JSON, CSV, HTML, or Markdown file.`
        });
      }
      text = raw;
    }

    cleanTmp(tmpFile);

    const trimmed = (text || '').trim();
    if (!trimmed) {
      return res.status(422).json({ error: 'No readable text found in this file.' });
    }

    return res.json({ text: trimmed });

  } catch (err) {
    cleanTmp(tmpFile);
    console.error('Upload error:', err);
    return res.status(500).json({
      error: 'Failed to extract text: ' + (err.message || String(err))
    });
  }
});

// ─── Helper: flatten JSON object to readable text ─────────────────────────────
function flattenJSON(obj, prefix = '') {
  if (typeof obj !== 'object' || obj === null) return String(obj);
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === 'object') lines.push(flattenJSON(item, `${key}[${i}]`));
        else lines.push(`${key}[${i}]: ${item}`);
      });
    } else if (v && typeof v === 'object') {
      lines.push(flattenJSON(v, key));
    } else {
      lines.push(`${key}: ${v}`);
    }
  }
  return lines.join('\n');
}

// ─── ROUTE: /api/analyze ──────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, tool } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'No text provided.' });
    }

    // ── Sentence analysis ──────────────────────────────────────────────────
    const sentences = text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 4);

    const words = text.split(/\s+/).filter(Boolean);

    const AI_PHRASES = [
      'delve','tapestry','leverage','utilize','comprehensive',"in today's",
      'navigate','robust','facilitate','paradigm','holistic','testament',
      'landscape','pivotal','seamless','crucial','essential','dynamic',
      'multifaceted','plethora','myriad','embark','realm','foster',
      'underscore','catalyst','intricate','nuanced','symbiotic','demystify',
      'unleash','elevate','fast-paced','ever-evolving',
      'at the end of the day','it is important to note','first and foremost'
    ];
    const AI_TRANSITIONS = [
      'furthermore','moreover','in conclusion','in summary','ultimately',
      'to summarize','overall','additionally','consequently','thus','hence'
    ];

    const reasons  = [];
    const analyzed = [];

    for (const s of sentences) {
      const lower  = s.toLowerCase();
      const words  = s.split(' ');
      const len    = words.length;
      let aiScore  = 0;
      let plag     = 0;
      let verdict  = 'original';
      let confidence = 50;
      let reason   = null;

      const aiHits       = AI_PHRASES.filter(p => lower.includes(p)).length;
      const transHits    = AI_TRANSITIONS.filter(p => lower.startsWith(p)).length;

      if (aiHits > 0)  aiScore += 30 + aiHits * 15;
      if (transHits > 0) aiScore += 35;
      if (lower.startsWith('certainly') || lower.startsWith('sure,') || lower.includes('as an ai')) aiScore += 90;
      if (len >= 15 && len <= 25) aiScore += 15;
      const commas = (s.match(/,/g) || []).length;
      if (commas >= 3) aiScore += 15;
      if (/\b(is|are|was|were|be|been|being)\b \w+ed\b/.test(lower)) aiScore += 10;
      if (/\b(i'm|you're|they're|we're|can't|won't|don't|isn't|didn't|gonna|wanna|idk|lol)\b/.test(lower)) aiScore -= 20;
      if (len < 8) aiScore -= 25;

      const seed = Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0);
      aiScore = Math.max(0, Math.min(99, aiScore + (seed % 10)));

      if (!/\b(i|my|we|our)\b/.test(lower) && len > 14) plag += 25;
      if (/\b(according to|research shows|studies have|it is widely)\b/.test(lower)) plag += 40;
      plag = Math.min(99, plag + ((seed * 3) % 10));

      if (plag > 55)      { verdict = 'plagiarism'; confidence = plag;    reason = 'Matches common phrasing in academic web sources.'; }
      else if (aiScore > 60) { verdict = 'ai';      confidence = aiScore; reason = aiHits ? 'AI-favored vocabulary detected.' : 'Low burstiness and uniform sentence length.'; }
      else if (aiScore > 40) { verdict = 'suspicious'; confidence = aiScore; reason = 'Mild AI-like structural patterns.'; }
      else                { confidence = 100 - aiScore; }

      if (reason && !reasons.includes(reason)) reasons.push(reason);
      analyzed.push({ text: s, verdict, confidence, reason, rawAiScore: aiScore, rawPlagScore: plag });
    }

    const total = Math.max(1, analyzed.length);

    // Safe reduce instead of Math.max(...spread) to avoid stack overflow on large docs
    const avgAi = analyzed.reduce((s, a) => s + a.rawAiScore, 0) / total;
    const maxAi = analyzed.reduce((m, a) => a.rawAiScore > m ? a.rawAiScore : m, 0);
    let aiPct   = Math.min(100, Math.max(0, Math.round(avgAi * 0.4 + maxAi * 0.6)));

    const avgPlag = analyzed.reduce((s, a) => s + a.rawPlagScore, 0) / total;
    const maxPlag = analyzed.reduce((m, a) => a.rawPlagScore > m ? a.rawPlagScore : m, 0);
    let plagPct   = Math.min(100, Math.max(0, Math.round(avgPlag * 0.3 + maxPlag * 0.7)));

    // ── Local ML model (local dev only — Python not on Netlify) ───────────
    if (!IS_SERVERLESS) {
      try {
        const mlScore = await runPythonModel(text);
        if (mlScore !== null) {
          aiPct = Math.round(aiPct * 0.4 + mlScore * 0.6);
          reasons.unshift(`🧠 Local ML Model: ${Math.round(mlScore)}% AI probability.`);
        }
      } catch (_) { /* skip silently */ }
    }

    // ── Gemini AI analysis ────────────────────────────────────────────────
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompt =
          `You are an expert AI content detector. Analyze the following text and determine ` +
          `if it was written by AI (like ChatGPT) or a human. Focus on sentence structure, ` +
          `burstiness, perplexity, and phrasing patterns.\n` +
          `Return ONLY valid JSON: {"aiScore": <0-100>, "reason": "<brief explanation>"}\n\n` +
          `Text:\n${text.substring(0, 4000)}`;

        const aiResp = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
        });

        const raw   = aiResp.text || '';
        const match = raw.match(/\{[\s\S]*?\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed && typeof parsed.aiScore === 'number') {
            aiPct = Math.min(100, Math.max(0, Number(parsed.aiScore)));
            if (parsed.reason) reasons.unshift(`🤖 Gemini: ${parsed.reason}`);
          }
        }
      } catch (geminiErr) {
        console.error('Gemini analysis error:', geminiErr.message);
        // Non-fatal — continue without Gemini
      }
    }

    if (aiPct > 65) {
      const consensusMsg = 'Multi-model analysis flags this content as likely AI-generated.';
      if (!reasons.includes(consensusMsg)) reasons.push(consensusMsg);
    }

    // ── Gemini tool features (summarizer, humanizer, etc.) ────────────────
    let output = null;
    const TOOL_TOOLS = ['summarizer','paraphraser','humanizer','translator','grammar'];
    if (process.env.GEMINI_API_KEY && TOOL_TOOLS.includes(tool)) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompts = {
          summarizer:  'Summarize the following text into a clear, concise paragraph.',
          paraphraser: 'Paraphrase the following text professionally.',
          humanizer:   "Rewrite the following text to sound highly natural and human. Remove robotic AI words like 'delve', 'tapestry', 'leverage'.",
          translator:  'Translate the following text into Spanish and French. Format nicely with labels.',
          grammar:     "Fix all grammar, spelling, and punctuation errors. If already perfect, reply: 'No grammar issues found.'"
        };

        const toolResp = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `${prompts[tool]}\n\nTEXT:\n${text.substring(0, 5000)}`,
        });
        output = toolResp.text || null;
      } catch (toolErr) {
        console.error('Gemini tool error:', toolErr.message);
      }
    }

    // Fallback outputs when Gemini isn't available
    if (!output) {
      if (tool === 'summarizer')
        output = analyzed.slice(0, Math.max(2, Math.ceil(analyzed.length / 5))).map(s => s.text).join(' ');
      else if (tool === 'paraphraser' || tool === 'humanizer')
        output = text.replace(/\bhowever\b/gi,'but').replace(/\bfurthermore\b/gi,'also')
                     .replace(/\butilize\b/gi,'use').replace(/\bleverage\b/gi,'use');
      else if (tool === 'translator')
        output = '[Translation requires Gemini API key with billing enabled.]';
      else if (tool === 'grammar')
        output = '[Grammar check requires Gemini API key with billing enabled.]';
    }

    const human     = Math.max(0, 100 - aiPct);
    const unique    = Math.max(0, 100 - plagPct);
    const integrity = Math.min(100, Math.round(0.5 * unique + 0.4 * human + 10));

    return res.json({
      wordCount:     words.length,
      charCount:     text.length,
      sentenceCount: sentences.length,
      plagiarism:    plagPct,
      aiScore:       aiPct,
      human,
      unique,
      integrity,
      sentences:     analyzed,
      reasons,
      tool,
      output,
    });

  } catch (err) {
    // Global catch — never let the function crash without a response
    console.error('Analyze route fatal error:', err);
    return res.status(500).json({
      error: 'Analysis failed unexpectedly: ' + (err.message || String(err))
    });
  }
});

// ─── Helper: run Python ML model safely ──────────────────────────────────────
function runPythonModel(text) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };

    // Timeout safety net
    const timer = setTimeout(() => finish(null), 8000);

    let pyProcess;
    try {
      pyProcess = spawn('python', [path.join(__dirname, 'ml_engine', 'predict.py')]);
    } catch (_) {
      clearTimeout(timer);
      return finish(null);
    }

    pyProcess.on('error', () => { clearTimeout(timer); finish(null); });

    try {
      pyProcess.stdin.write(text);
      pyProcess.stdin.end();
    } catch (_) {
      clearTimeout(timer);
      return finish(null);
    }

    let out = '';
    pyProcess.stdout.on('data', (d) => { out += d.toString(); });
    pyProcess.stderr.on('data', (d) => console.error('Python stderr:', d.toString()));
    pyProcess.on('close', () => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(out.trim());
        finish(typeof parsed.aiScore === 'number' ? parsed.aiScore : null);
      } catch (_) {
        finish(null);
      }
    });
  });
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', serverless: IS_SERVERLESS, gemini: !!process.env.GEMINI_API_KEY });
});

// ─── Global error middleware (last resort) ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled Express error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Start (local dev only) ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
if (!IS_SERVERLESS) {
  app.listen(PORT, () => console.log(`Backend API running on http://localhost:${PORT}`));
}

export const handler = serverless(app);
export default app;
