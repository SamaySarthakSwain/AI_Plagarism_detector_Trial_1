import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, Download, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Verdict = "ai" | "plagiarism" | "original" | "suspicious";
interface Sentence { text: string; verdict: Verdict; confidence: number; reason?: string; }
interface Report {
  fileName: string;
  wordCount: number;
  plagiarism: number;
  aiScore: number;
  human: number;
  unique: number;
  integrity: number;
  sentences: Sentence[];
  reasons: string[];
}

// Heuristic mock analyzer — gives believable, deterministic results from text content.
function analyze(text: string, fileName: string): Report {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 4);

  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const aiPhrases = ["furthermore", "moreover", "in conclusion", "delve", "tapestry", "leverage", "utilize", "comprehensive", "in today's", "navigate", "robust", "facilitate", "paradigm", "holistic"];
  const reasons: string[] = [];

  const analyzed: Sentence[] = sentences.map((s, i) => {
    const lower = s.toLowerCase();
    const len = s.split(" ").length;
    const aiHits = aiPhrases.filter(p => lower.includes(p)).length;
    const burstiness = Math.abs(len - 18); // human writing varies more
    const lowVariance = burstiness < 4;
    const hasComplexConnector = /(however|therefore|furthermore|moreover)/.test(lower);

    let aiScore = 0;
    if (aiHits) aiScore += 35 + aiHits * 15;
    if (lowVariance) aiScore += 20;
    if (hasComplexConnector) aiScore += 15;
    if (len > 28) aiScore += 10;

    // Plagiarism heuristic: long, no first-person, formal
    const noFirstPerson = !/\b(i|my|we|our)\b/.test(lower);
    let plag = 0;
    if (noFirstPerson && len > 14) plag += 25;
    if (/\b(according to|research shows|studies have|it is widely)\b/.test(lower)) plag += 40;

    // Hash-ish for stability per sentence
    const seed = Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0);
    aiScore += seed % 12;
    plag += (seed * 3) % 10;

    aiScore = Math.min(99, aiScore);
    plag = Math.min(99, plag);

    let verdict: Verdict = "original";
    let confidence = 50;
    let reason: string | undefined;
    if (plag > 55) { verdict = "plagiarism"; confidence = plag; reason = "Matches common phrasing in academic web sources."; }
    else if (aiScore > 60) { verdict = "ai"; confidence = aiScore; reason = aiHits ? "AI-favored vocabulary detected." : "Low burstiness and uniform sentence length."; }
    else if (aiScore > 40) { verdict = "suspicious"; confidence = aiScore; reason = "Mild AI-like structural patterns."; }
    else { verdict = "original"; confidence = 100 - aiScore; }

    if (reason && !reasons.includes(reason)) reasons.push(reason);
    return { text: s, verdict, confidence, reason };
  });

  const aiCount = analyzed.filter(a => a.verdict === "ai").length;
  const plagCount = analyzed.filter(a => a.verdict === "plagiarism").length;
  const total = Math.max(1, analyzed.length);
  const aiPct = Math.round((aiCount / total) * 100);
  const plagPct = Math.round((plagCount / total) * 100);
  const human = Math.max(0, 100 - aiPct);
  const unique = Math.max(0, 100 - plagPct);
  const integrity = Math.round(0.5 * unique + 0.4 * human + 10);

  return { fileName, wordCount, plagiarism: plagPct, aiScore: aiPct, human, unique, integrity: Math.min(100, integrity), sentences: analyzed, reasons };
}

const sampleText = `Academic integrity is essential to the learning process. In today's rapidly evolving educational landscape, students must navigate a comprehensive set of expectations. Furthermore, the use of generative AI has introduced unprecedented challenges. According to recent studies, plagiarism detection tools must leverage robust methodologies to facilitate fair assessment. I personally believe that honest effort matters more than any score. Moreover, educators should provide clear feedback. The tapestry of modern education is woven with both opportunities and risks.`;

export const Demo = () => {
  const [text, setText] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("untitled.txt");
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (content: string, name: string) => {
    if (content.trim().split(/\s+/).length < 20) {
      toast.error("Please provide at least 20 words for a meaningful analysis.");
      return;
    }
    setLoading(true);
    setReport(null);
    await new Promise(r => setTimeout(r, 1200));
    setReport(analyze(content, name));
    setLoading(false);
    toast.success("Analysis complete");
  };

  const onFile = async (f: File) => {
    setFileName(f.name);
    if (f.name.endsWith(".txt") || f.type.startsWith("text/")) {
      const t = await f.text();
      setText(t);
      run(t, f.name);
    } else {
      toast.info("Demo mode: showing simulated analysis for non-text files. Real PDF/DOCX parsing requires backend processing.");
      setText(sampleText);
      run(sampleText, f.name);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${report.fileName}.integrity-report.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="demo" className="py-24 md:py-32 relative overflow-hidden">
      <div className="blob bg-primary/30 h-[400px] w-[400px] -left-32 top-20" />
      <div className="container relative">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-block text-xs font-semibold tracking-widest text-primary uppercase mb-3">Live Demo</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Try the <span className="gradient-text">detector</span> right now</h2>
          <p className="text-muted-foreground md:text-lg">Upload a file or paste text. Results are color-coded and explained.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="glass rounded-2xl p-6 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Your content</h3>
              <Button variant="ghost" size="sm" onClick={() => { setText(sampleText); setFileName("sample-essay.txt"); }}>
                Load sample
              </Button>
            </div>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary rounded-xl p-6 text-center cursor-pointer transition mb-4 bg-muted/30"
            >
              <Upload className="h-7 w-7 mx-auto mb-2 text-primary" />
              <div className="text-sm font-medium">Drop file or click to upload</div>
              <div className="text-xs text-muted-foreground mt-1">PDF · DOCX · PPTX · TXT (max 10MB)</div>
              <input ref={inputRef} type="file" className="hidden"
                accept=".pdf,.docx,.txt,.pptx,text/plain"
                onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
            </div>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="…or paste your text here"
              className="w-full h-48 rounded-xl bg-muted/40 border border-border p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring transition"
            />

            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-muted-foreground">{text.trim().split(/\s+/).filter(Boolean).length} words</div>
              <Button variant="hero" onClick={() => run(text, fileName)} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Sparkles className="h-4 w-4" /> Analyze</>}
              </Button>
            </div>
          </div>

          {/* Output */}
          <div className="glass rounded-2xl p-6 card-shadow min-h-[420px]">
            {!report && !loading && (
              <div className="h-full grid place-items-center text-center text-muted-foreground py-12">
                <div>
                  <div className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-sm">Your interactive report will appear here.</p>
                </div>
              </div>
            )}
            {loading && (
              <div className="h-full grid place-items-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Running plagiarism + AI models…</p>
                </div>
              </div>
            )}
            {report && <ReportView report={report} onDownload={downloadReport} />}
          </div>
        </div>
      </div>
    </section>
  );
};

const ReportView = ({ report, onDownload }: { report: Report; onDownload: () => void }) => {
  const verdictClass = (v: Verdict) =>
    v === "plagiarism" ? "bg-destructive/25 border-b-2 border-destructive" :
    v === "ai" ? "bg-warning/25 border-b-2 border-warning" :
    v === "suspicious" ? "bg-warning/15 border-b border-warning/60" :
    "bg-success/15";

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">{report.fileName}</h3>
          <p className="text-xs text-muted-foreground">{report.wordCount} words · {report.sentences.length} sentences</p>
        </div>
        <Button variant="glass" size="sm" onClick={onDownload}><Download className="h-4 w-4" /> Report</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <Stat label="Plagiarism" value={report.plagiarism} color="hsl(var(--destructive))" />
        <Stat label="AI" value={report.aiScore} color="hsl(var(--warning))" />
        <Stat label="Human" value={report.human} color="hsl(var(--primary))" />
        <Stat label="Integrity" value={report.integrity} color="hsl(var(--success))" />
      </div>

      <div className="rounded-xl bg-muted/30 border border-border p-4 max-h-56 overflow-auto text-sm leading-relaxed mb-4">
        {report.sentences.map((s, i) => (
          <span key={i} className={`${verdictClass(s.verdict)} px-1 rounded mr-1 cursor-help`} title={`${s.verdict.toUpperCase()} · ${s.confidence}%${s.reason ? " · " + s.reason : ""}`}>
            {s.text}{" "}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Why it was flagged</div>
        {report.reasons.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> No major issues detected.</div>
        ) : report.reasons.slice(0, 4).map(r => (
          <div key={r} className="flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" /> {r}
          </div>
        ))}
      </div>
    </div>
  );
};

const Stat = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="rounded-xl glass p-3">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold" style={{ color }}>{value}%</div>
    <div className="h-1 mt-1 bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);
