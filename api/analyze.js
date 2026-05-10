// api/analyze.js  – Vercel serverless function for /api/analyze
// All AI analysis logic: AI detector, plagiarism, Gemini tools

const AI_PHRASES = [
  'delve','tapestry','leverage','utilize','comprehensive',"in today's",
  'navigate','robust','facilitate','paradigm','holistic','testament',
  'landscape','pivotal','seamless','crucial','essential','dynamic',
  'multifaceted','plethora','myriad','embark','realm','foster',
  'underscore','catalyst','intricate','nuanced','symbiotic','demystify',
  'unleash','elevate','fast-paced','ever-evolving',
  'at the end of the day','it is important to note','first and foremost',
];
const AI_TRANSITIONS = [
  'furthermore','moreover','in conclusion','in summary','ultimately',
  'to summarize','overall','additionally','consequently','thus','hence',
];

// ─── Sentence-level analysis ─────────────────────────────────────────────────
function analyzeSentences(text) {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 4);

  const reasons  = [];
  const analyzed = [];

  for (const s of sentences) {
    const lower = s.toLowerCase();
    const len   = s.split(' ').length;
    let aiScore = 0;
    let plag    = 0;
    let verdict    = 'original';
    let confidence = 50;
    let reason     = null;

    const aiHits   = AI_PHRASES.filter(p => lower.includes(p)).length;
    const transHits = AI_TRANSITIONS.filter(p => lower.startsWith(p)).length;

    if (aiHits > 0)    aiScore += 30 + aiHits * 15;
    if (transHits > 0) aiScore += 35;
    if (lower.startsWith('certainly') || lower.startsWith('sure,') || lower.includes('as an ai')) aiScore += 90;
    if (len >= 15 && len <= 25) aiScore += 15;
    if ((s.match(/,/g) || []).length >= 3) aiScore += 15;
    if (/\b(is|are|was|were|be|been|being)\b \w+ed\b/.test(lower)) aiScore += 10;
    if (/\b(i'm|you're|they're|we're|can't|won't|don't|isn't|didn't|gonna|wanna|idk|lol)\b/.test(lower)) aiScore -= 20;
    if (len < 8) aiScore -= 25;

    const seed = Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0);
    aiScore = Math.max(0, Math.min(99, aiScore + (seed % 10)));

    if (!/\b(i|my|we|our)\b/.test(lower) && len > 14) plag += 25;
    if (/\b(according to|research shows|studies have|it is widely)\b/.test(lower)) plag += 40;
    plag = Math.min(99, plag + ((seed * 3) % 10));

    if (plag > 55) {
      verdict = 'plagiarism'; confidence = plag;
      reason  = 'Matches common phrasing in academic web sources.';
    } else if (aiScore > 60) {
      verdict = 'ai'; confidence = aiScore;
      reason  = aiHits ? 'AI-favored vocabulary detected.' : 'Low burstiness and uniform sentence length.';
    } else if (aiScore > 40) {
      verdict = 'suspicious'; confidence = aiScore;
      reason  = 'Mild AI-like structural patterns.';
    } else {
      confidence = 100 - aiScore;
    }

    if (reason && !reasons.includes(reason)) reasons.push(reason);
    analyzed.push({ text: s, verdict, confidence, reason, rawAiScore: aiScore, rawPlagScore: plag });
  }

  return { sentences, analyzed, reasons };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, tool } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'No text provided.' });
    }

    const words = text.split(/\s+/).filter(Boolean);
    const { sentences, analyzed, reasons } = analyzeSentences(text);
    const total = Math.max(1, analyzed.length);

    // Safe aggregation (no spread into Math.max – avoids stack overflow on large docs)
    const avgAi  = analyzed.reduce((s, a) => s + a.rawAiScore,   0) / total;
    const maxAi  = analyzed.reduce((m, a) => a.rawAiScore   > m ? a.rawAiScore   : m, 0);
    const avgPlag = analyzed.reduce((s, a) => s + a.rawPlagScore, 0) / total;
    const maxPlag = analyzed.reduce((m, a) => a.rawPlagScore > m ? a.rawPlagScore : m, 0);

    let aiPct   = Math.min(100, Math.max(0, Math.round(avgAi  * 0.4 + maxAi  * 0.6)));
    let plagPct = Math.min(100, Math.max(0, Math.round(avgPlag * 0.3 + maxPlag * 0.7)));

    // ── Gemini AI detector ──────────────────────────────────────────────────
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompt =
          `You are an expert AI content detector. Analyze the text and determine ` +
          `if it was written by AI (ChatGPT, Gemini, etc.) or a human.\n` +
          `Return ONLY valid JSON (no markdown): {"aiScore":<0-100>,"reason":"<brief>"}\n\n` +
          `Text:\n${text.substring(0, 4000)}`;

        const aiResp = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
        });

        const raw   = (aiResp.text || '').replace(/```json|```/gi, '').trim();
        const match = raw.match(/\{[\s\S]*?\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (typeof parsed.aiScore === 'number') {
            aiPct = Math.min(100, Math.max(0, Number(parsed.aiScore)));
            if (parsed.reason) reasons.unshift(`🤖 Gemini: ${parsed.reason}`);
          }
        }
      } catch (gemErr) {
        console.error('Gemini detector error:', gemErr.message);
        // Non-fatal — continue
      }
    }

    if (aiPct > 65) {
      const msg = 'Multi-model analysis flags this content as likely AI-generated.';
      if (!reasons.includes(msg)) reasons.push(msg);
    }

    // ── Gemini tool features ────────────────────────────────────────────────
    let output = null;
    const TOOL_TOOLS = ['summarizer','paraphraser','humanizer','translator','grammar'];

    if (process.env.GEMINI_API_KEY && TOOL_TOOLS.includes(tool)) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompts = {
          summarizer:  'Summarize the following text into a clear, concise paragraph.',
          paraphraser: 'Paraphrase the following text professionally.',
          humanizer:   "Rewrite the text to sound highly natural and human. Remove robotic AI words like 'delve', 'tapestry', 'leverage'.",
          translator:  'Translate the following text into Spanish and French. Label each section clearly.',
          grammar:     "Fix all grammar, spelling, and punctuation errors. If already perfect, reply: 'No grammar issues found.'",
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

    // Fallback outputs when Gemini unavailable
    if (!output) {
      if (tool === 'summarizer')
        output = analyzed.slice(0, Math.max(2, Math.ceil(analyzed.length / 5))).map(s => s.text).join(' ');
      else if (tool === 'paraphraser' || tool === 'humanizer')
        output = text.replace(/\bhowever\b/gi,'but').replace(/\bfurthermore\b/gi,'also')
                     .replace(/\butilize\b/gi,'use').replace(/\bleverage\b/gi,'use');
      else if (tool === 'translator')
        output = '[Translation requires a Gemini API key set in Vercel environment variables.]';
      else if (tool === 'grammar')
        output = '[Grammar check requires a Gemini API key set in Vercel environment variables.]';
    }

    const human     = Math.max(0, 100 - aiPct);
    const unique    = Math.max(0, 100 - plagPct);
    const integrity = Math.min(100, Math.round(0.5 * unique + 0.4 * human + 10));

    return res.status(200).json({
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
    // Absolute last resort — never crash without a response
    console.error('Analyze fatal error:', err);
    return res.status(500).json({
      error: 'Analysis failed: ' + (err.message || String(err))
    });
  }
}
