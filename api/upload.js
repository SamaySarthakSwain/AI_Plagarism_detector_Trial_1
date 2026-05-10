// api/upload.js  – Vercel serverless function for /api/upload
// Handles file text extraction from base64-encoded uploads

import { createRequire } from 'module';
import os   from 'os';
import fs   from 'fs';
import path from 'path';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
const pdf     = require('pdf-parse');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const bufferToTmpFile = (buffer, originalName) => {
  const safe    = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(os.tmpdir(), `${Date.now()}_${safe}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

const cleanTmp = (filePath) => {
  if (filePath) try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
};

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

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let tmpFile = null;
  try {
    const { file, filename } = req.body || {};

    if (!file || typeof file !== 'string')    return res.status(400).json({ error: 'No file data received.' });
    if (!filename || typeof filename !== 'string') return res.status(400).json({ error: 'No filename provided.' });

    const buffer = Buffer.from(file, 'base64');
    const lname  = filename.toLowerCase().trim();
    let   text   = '';

    if (lname.endsWith('.pdf')) {
      const data = await pdf(buffer);
      text = data.text || '';

    } else if (lname.endsWith('.docx')) {
      const data = await mammoth.extractRawText({ buffer });
      text = data.value || '';

    } else if (lname.endsWith('.json')) {
      try {
        const parsed = JSON.parse(buffer.toString('utf8'));
        text = flattenJSON(parsed);
      } catch { text = buffer.toString('utf8'); }

    } else if (lname.endsWith('.html') || lname.endsWith('.htm')) {
      text = buffer.toString('utf8')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
        .replace(/\s{2,}/g, ' ').trim();

    } else if (['.txt','.md','.markdown','.log','.csv','.tsv',
                '.xml','.yaml','.yml','.rtf','.tex','.rst'].some(e => lname.endsWith(e))) {
      text = buffer.toString('utf8');

    } else if (['.xlsx','.xls','.doc','.odt','.ods','.pptx','.ppt'].some(e => lname.endsWith(e))) {
      // any-text needs a temp file; may not work on all serverless envs
      try {
        const { getText } = await import('any-text');
        tmpFile = bufferToTmpFile(buffer, filename);
        text = await getText(tmpFile);
      } catch {
        return res.status(422).json({
          error: `Could not extract text from "${filename}". Try converting to PDF or DOCX first.`
        });
      }

    } else {
      // Generic fallback – try UTF-8, reject obvious binary
      const raw = buffer.toString('utf8');
      const nonPrintable = (raw.match(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g) || []).length;
      if (raw.length > 0 && nonPrintable / raw.length > 0.3) {
        return res.status(422).json({
          error: `Unsupported binary file: "${filename}". Upload PDF, DOCX, TXT, JSON, CSV or HTML.`
        });
      }
      text = raw;
    }

    cleanTmp(tmpFile);

    const trimmed = (text || '').trim();
    if (!trimmed) return res.status(422).json({ error: 'No readable text found in this file.' });

    return res.status(200).json({ text: trimmed });

  } catch (err) {
    cleanTmp(tmpFile);
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Failed to extract text: ' + (err.message || String(err)) });
  }
}
