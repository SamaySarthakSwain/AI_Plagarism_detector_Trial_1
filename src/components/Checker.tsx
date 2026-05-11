import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Brain, UserCheck, Image as ImageIcon, FileSearch, FileText, Repeat,
  SpellCheck, Languages, Calculator, Upload, Loader2, Download, Sparkles,
  AlertTriangle, CheckCircle2, Fingerprint, BookOpen, GitBranch, Globe, Users,
  Share2, Archive, FlaskConical, Lightbulb, Network, Scan,
} from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";
import { AcademicSources } from "./AcademicSources";
import { CitationFixer } from "./CitationFixer";
import { ParaphraseDetector } from "./ParaphraseDetector";
import { RelatedPapers } from "./RelatedPapers";
import { ScientificCheck } from "./ScientificCheck";
import { WritingSuggestions } from "./WritingSuggestions";
import { DriveImport } from "./DriveImport";
import { BatchUpload } from "./BatchUpload";
import { Navbar, type Language } from "./Navbar";
import { sessionHistory } from "@/pages/ScanHistory";

type ToolId =
  | "ai" | "humanizer" | "image" | "plagiarism"
  | "summarizer" | "paraphraser" | "grammar" | "translator" | "wordcount"
  | "stylometry" | "citations" | "rewrite-chain" | "internet-scan" | "hybrid-authorship"
  | "knowledge-graph" | "cross-lang" | "xai-report";

const tools: { id: ToolId; label: string; icon: React.ComponentType<{className?:string}>; placeholder: string; cta: string; badge?: string }[] = [
  { id:"ai",               label:"AI / GPT Detector",    icon:Brain,      placeholder:"Paste or upload text to check for AI content…",           cta:"Detect AI" },
  { id:"plagiarism",       label:"Plagiarism Checker",    icon:FileSearch, placeholder:"Paste or upload document to check for plagiarism…",        cta:"Check Plagiarism" },
  { id:"hybrid-authorship",label:"Hybrid Authorship",     icon:Users,      placeholder:"Paste document to detect paragraph-level AI vs human…",    cta:"Segment Authorship", badge:"NEW" },
  { id:"knowledge-graph",  label:"Logic Graph",           icon:Sparkles,   placeholder:"Paste text to extract subject-verb-object logic graph…",   cta:"Map Logic",          badge:"NEW" },
  { id:"cross-lang",       label:"Cross-Language Check",  icon:Languages,  placeholder:"Paste text to scan for translation plagiarism…",           cta:"Check Languages",    badge:"NEW" },
  { id:"stylometry",       label:"Style Fingerprint",     icon:Fingerprint,placeholder:"Paste text to analyze writing style fingerprint…",         cta:"Analyze Style",      badge:"NEW" },
  { id:"citations",        label:"Citation Fraud Checker",icon:BookOpen,   placeholder:"Paste academic text to verify citations…",                 cta:"Check Citations",    badge:"NEW" },
  { id:"rewrite-chain",    label:"AI Rewrite Detection",  icon:GitBranch,  placeholder:"Paste text to detect ChatGPT→Quillbot rewrite chains…",   cta:"Detect Rewrites",    badge:"NEW" },
  { id:"internet-scan",    label:"Internet Scan",         icon:Globe,      placeholder:"Paste text to scan for web plagiarism in real time…",      cta:"Scan Internet",      badge:"NEW" },
  { id:"xai-report",       label:"Deep AI Report",        icon:FileText,   placeholder:"Analyze text first, then generate a deep reasoning report…",cta:"Generate Deep Report",badge:"PRO" },
  { id:"humanizer",        label:"AI Humanizer",          icon:UserCheck,  placeholder:"Paste AI-written text to humanize it…",                    cta:"Humanize" },
  { id:"image",            label:"AI Image Detector",     icon:ImageIcon,  placeholder:"Upload an image to check if it's AI-generated…",           cta:"Detect Image" },
  { id:"summarizer",       label:"AI Summarizer",         icon:FileText,   placeholder:"Paste long text to summarize…",                            cta:"Summarize" },
  { id:"paraphraser",      label:"AI Paraphraser",        icon:Repeat,     placeholder:"Paste text to rewrite in a fresh voice…",                  cta:"Paraphrase" },
  { id:"grammar",          label:"AI Grammar Check",      icon:SpellCheck, placeholder:"Paste text to check grammar & clarity…",                   cta:"Check Grammar" },
  { id:"translator",       label:"AI Translator",         icon:Languages,  placeholder:"Paste text to translate…",                                 cta:"Translate" },
  { id:"wordcount",        label:"Word Counter",          icon:Calculator, placeholder:"Paste text to count words…",                               cta:"Count" },
];

type Verdict = "ai" | "plagiarism" | "original" | "suspicious";
interface Sentence { text: string; verdict: Verdict; confidence: number; reason?: string | null; }
interface Report {
  fileName: string; wordCount: number; charCount: number; sentenceCount: number;
  plagiarism: number; aiScore: number; human: number; unique: number; integrity: number;
  sentences: Sentence[]; reasons: string[]; tool: ToolId; output?: string | null;
}

type ReportTab = "results" | "sources" | "citations" | "scientific" | "related" | "writing" | "batch" | "share";

const REPORT_TABS: { id: ReportTab; label: string; icon: React.ComponentType<{className?:string}> }[] = [
  { id:"results",   label:"Results",    icon:Brain },
  { id:"sources",   label:"Sources",    icon:BookOpen },
  { id:"citations", label:"Citations",  icon:FileText },
  { id:"scientific",label:"Scientific", icon:FlaskConical },
  { id:"related",   label:"Related",    icon:Network },
  { id:"writing",   label:"Writing",    icon:Lightbulb },
  { id:"batch",     label:"Batch",      icon:Archive },
  { id:"share",     label:"Share",      icon:Share2 },
];

const errMsg = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback;

export const Checker = () => {
  const [active,   setActive]   = useState<ToolId>("ai");
  const [text,     setText]     = useState("");
  const [fileName, setFileName] = useState("untitled.txt");
  const [report,   setReport]   = useState<Report | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [reportTab, setReportTab] = useState<ReportTab>("results");
  const [language, setLanguage] = useState<Language>("en");
  const [paraphraseScore, setParaphraseScore] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tool = tools.find(t => t.id === active)!;

  const onFile = async (f: File) => {
    setFileName(f.name); setLoading(true);
    const lname = f.name.toLowerCase();
    try {
      const textFormats = [".txt",".md",".markdown",".csv",".json",".html",".htm",".xml",".yaml",".yml",".rtf"];
      if (textFormats.some(ext => lname.endsWith(ext))) {
        toast.info(`Reading ${f.name} locally…`);
        setText(await f.text()); toast.success("Loaded successfully"); setLoading(false); return;
      }
      if (lname.endsWith(".docx")) {
        toast.info("Extracting Word document locally…");
        const arrayBuffer = await f.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setText(result.value); toast.success("Loaded Word document"); setLoading(false); return;
      }
      const imgFormats = [".png",".jpg",".jpeg",".webp"];
      if (imgFormats.some(ext => lname.endsWith(ext))) {
        if (active !== "image") setActive("image");
        toast.info("Processing Image via Multi-Modal Engine…");
        const reader = new FileReader(); reader.readAsDataURL(f);
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            const res = await fetch("/api/analyze-image", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ image:base64, filename:f.name }) });
            if (!res.ok) { const b = await res.json(); throw new Error(b.error||"Analysis failed"); }
            const data = await res.json();
            setText(data.text || "[Image Processed]");
            setReport({ fileName:f.name, wordCount:(data.text||"").split(/\s+/).filter(Boolean).length, charCount:(data.text||"").length, sentenceCount:0, plagiarism:data.plagiarism, aiScore:0, human:100, unique:100-data.plagiarism, integrity:data.integrity, sentences:[], reasons:data.matches?.length>0?data.matches.map((m:string)=>`Match: ${m}`):[`No matches found.`], tool:"image", output:`Visual: ${data.visualPlagiarism}%\nText: ${data.plagiarism}%` });
            toast.success("Image Analyzed!");
          } catch(e) { toast.error(errMsg(e,"Image analysis failed")); } finally { setLoading(false); }
        }; return;
      }
      if (f.size > 3*1024*1024) throw new Error(`File too large (${(f.size/1024/1024).toFixed(1)}MB). Max 3MB.`);
      toast.info(`Processing ${f.name} via server…`);
      const reader = new FileReader(); reader.readAsDataURL(f);
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          const res = await fetch("/api/upload", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ file:base64, filename:f.name }) });
          if (!res.ok) { const b = await res.json(); throw new Error(b.error||"Upload failed"); }
          const data = await res.json(); setText(data.text); toast.success("Loaded successfully");
        } catch(e) { toast.error(errMsg(e,"Upload failed")); } finally { setLoading(false); }
      };
    } catch(e) { toast.error(errMsg(e,"Could not read file.")); setLoading(false); }
  };

  const ADVANCED_ROUTES: Partial<Record<ToolId,string>> = {
    "stylometry":"/api/stylometry","citations":"/api/citations","rewrite-chain":"/api/rewrite-chain",
    "internet-scan":"/api/internet-scan","hybrid-authorship":"/api/hybrid-authorship",
    "knowledge-graph":"/api/knowledge-graph","cross-lang":"/api/cross-lang","xai-report":"/api/xai-report",
  };

  const run = async () => {
    if (!text.trim()) { toast.error("Please enter some text or upload a file."); return; }
    setLoading(true); setReport(null); setShareUrl(null); setParaphraseScore(null);
    try {
      const advancedRoute = ADVANCED_ROUTES[active];
      if (advancedRoute) {
        const res = await fetch(advancedRoute, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ text }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error||"Analysis failed");
        const r: Report = { fileName, wordCount:text.split(/\s+/).filter(Boolean).length, charCount:text.length, sentenceCount:0, plagiarism:data.overallRisk??data.rewriteChainScore??data.maxSimilarity??0, aiScore:data.aiLikelihood?.aiLikelihoodScore??data.overallAiScore??0, human:100-(data.overallAiScore??data.aiLikelihood?.aiLikelihoodScore??0), unique:100-(data.overallRisk??data.maxSimilarity??0), integrity:Math.max(0,100-(data.overallRisk??data.rewriteChainScore??0)), sentences:[], tool:active, reasons:[data.verdict??data.overallVerdict??"",...(data.evidence??data.flags??data.authorshipShifts?.map((s:{warning:string})=>s.warning)??[])].filter(Boolean), output:JSON.stringify(data.segments??data.results??data.matches??data.aiLikelihood??data,null,2).slice(0,3000) };
        setReport(r);
        saveToHistory(r);
        return;
      }
      const res = await fetch("/api/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ text, tool:active }) });
      if (!res.ok) { const b = await res.json(); throw new Error(b.error||"Analysis failed"); }
      const data = await res.json();
      let finalReport: Report = { ...data, fileName };

      // Translate output if non-English language selected
      if (language !== "en" && data.output) {
        try {
          const tr = await fetch("/api/translate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ text:data.output, language }) });
          const td = await tr.json();
          if (td.translated) finalReport = { ...finalReport, output: td.translated };
        } catch (_) {}
      }
      setReport(finalReport);
      saveToHistory(finalReport);
      setReportTab("results");
    } catch(e) {
      toast.error(errMsg(e,"Failed to analyze. Is the server online?"));
    } finally { setLoading(false); }
  };

  const saveToHistory = (r: Report) => {
    const record = { id: Date.now().toString(), created_at: new Date().toISOString(), file_name: r.fileName, ai_score: r.aiScore, plagiarism_score: r.plagiarism, integrity_score: r.integrity, human_score: r.human, tool: r.tool, language };
    sessionHistory.push(record);
  };

  const shareReport = async () => {
    if (!report) return;
    setSharing(true);
    try {
      const res = await fetch("/api/share-report", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ fileName:report.fileName, scores:{ aiScore:report.aiScore, plagiarism:report.plagiarism, integrity:report.integrity, human:report.human, unique:report.unique }, highlights:report.sentences.slice(0,50), reasons:report.reasons, tool:report.tool }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"Share failed");
      const url = `${window.location.origin}/report/${data.uuid}`;
      setShareUrl(url);
      navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard!");
      setReportTab("share");
    } catch(e) { toast.error(errMsg(e,"Failed to create share link")); } finally { setSharing(false); }
  };

  const download = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`${report.fileName}.report.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const verdictClass = (v: Verdict) =>
    v==="plagiarism"?"bg-destructive/25 border-b-2 border-destructive":
    v==="ai"?"bg-warning/25 border-b-2 border-warning":
    v==="suspicious"?"bg-warning/15 border-b border-warning/60":"bg-success/15";

  return (
    <section id="checker" className="py-24 md:py-32 relative overflow-hidden">
      <div className="blob bg-primary/30 h-[400px] w-[400px] -left-32 top-20" />
      <div className="container relative">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-block text-xs font-semibold tracking-widest text-primary uppercase mb-3">Document Checker</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Pick a tool. <span className="gradient-text">Check anything.</span></h2>
          <p className="text-muted-foreground md:text-lg">Fast local extraction for DOCX, TXT, JSON, and more. Bypasses upload limits.</p>
        </div>

        <div className="glass rounded-3xl p-3 md:p-4 card-shadow">
          <div className="grid lg:grid-cols-[260px_1fr] gap-3 md:gap-4">
            <aside className="rounded-2xl bg-muted/30 border border-border p-2 max-h-[560px] overflow-auto">
              <nav className="space-y-1">
                {tools.map(t => (
                  <button key={t.id} onClick={() => { setActive(t.id); setReport(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition ${t.id===active?"bg-gradient-to-r from-primary/15 to-accent/15 text-foreground border-l-2 border-primary font-semibold":"text-muted-foreground hover:bg-muted"}`}>
                    <t.icon className={`h-4 w-4 shrink-0 ${t.id===active?"text-primary":""}`} />
                    <span className="truncate flex-1">{t.label}</span>
                    {t.badge && <span className="text-[9px] font-bold bg-primary/20 text-primary rounded px-1 py-0.5">{t.badge}</span>}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="rounded-2xl bg-card/60 border border-border p-5 md:p-6 min-h-[560px] flex flex-col">
              <div className="flex items-center gap-2 mb-4"><tool.icon className="h-5 w-5 text-primary" /><h3 className="font-semibold">{tool.label}</h3></div>

              <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f)onFile(f);}}
                className="relative flex-1 rounded-xl bg-muted/20 border-2 border-dashed border-border focus-within:border-primary transition mb-4">
                <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={tool.placeholder}
                  className="w-full h-full min-h-[260px] bg-transparent p-5 text-sm resize-none focus:outline-none placeholder:text-muted-foreground/70" />
                {!text && <div className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground/60">or drag & drop a file</div>}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-muted-foreground">{text.trim().split(/\s+/).filter(Boolean).length} words · {text.length} chars</div>
                <div className="flex gap-2 sm:justify-end flex-wrap">
                  <DriveImport onTextLoaded={(t,n)=>{setText(t);setFileName(n);}} />
                  <Button variant="glass" onClick={()=>inputRef.current?.click()} disabled={loading}><Upload className="h-4 w-4" /> Upload File</Button>
                  <input ref={inputRef} type="file" className="hidden" onChange={e=>e.target.files?.[0]&&onFile(e.target.files[0])} />
                  <Button variant="hero" onClick={run} disabled={loading} size="lg">
                    {loading?<><Loader2 className="h-4 w-4 animate-spin"/>Working…</>:<><Sparkles className="h-4 w-4"/>{tool.cta}</>}
                  </Button>
                </div>
              </div>

              {report && (
                <div className="mt-6 animate-fade-up">
                  {/* Report header */}
                  <div className="flex items-center justify-between mb-4">
                    <div><div className="font-semibold text-sm">{report.fileName}</div><div className="text-xs text-muted-foreground">{report.wordCount} words · {report.sentenceCount} sentences{language!=="en"&&<span className="ml-2 text-[10px] bg-primary/15 text-primary rounded px-1.5 py-0.5 uppercase">{language}</span>}</div></div>
                    <div className="flex gap-2">
                      <Button variant="glass" size="sm" onClick={shareReport} disabled={sharing}><Share2 className="h-4 w-4"/>{sharing?"Sharing…":"Share"}</Button>
                      <Button variant="glass" size="sm" onClick={download}><Download className="h-4 w-4"/>Report</Button>
                    </div>
                  </div>

                  {/* Tab bar */}
                  <div className="flex gap-1 mb-4 overflow-x-auto pb-1 glass rounded-xl p-1">
                    {REPORT_TABS.map(tab => (
                      <button key={tab.id} onClick={()=>setReportTab(tab.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition shrink-0 ${reportTab===tab.id?"bg-primary text-primary-foreground":"text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                        <tab.icon className="h-3.5 w-3.5"/>
                        {tab.label}
                        {tab.id==="writing"&&<span className="text-[8px] bg-primary-foreground/20 rounded px-1">AI</span>}
                      </button>
                    ))}
                  </div>

                  {/* Results Tab */}
                  {reportTab==="results" && (
                    <>
                      {report.tool!=="wordcount" && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                          <StatCard label="Plagiarism" value={report.plagiarism} color="hsl(var(--destructive))"/>
                          <StatCard label="AI" value={report.aiScore} color="hsl(var(--warning))"/>
                          <StatCard label="Human" value={report.human} color="hsl(var(--primary))"/>
                          <StatCard label="Integrity" value={report.integrity} color="hsl(var(--success))"/>
                          {paraphraseScore!==null&&<StatCard label="Paraphrase" value={paraphraseScore} color="hsl(var(--paraphrase))"/>}
                        </div>
                      )}
                      {report.output&&<div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm leading-relaxed mb-4 whitespace-pre-wrap"><div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">Output</div>{report.output}</div>}
                      <div className="rounded-xl bg-muted/30 border border-border p-4 max-h-56 overflow-auto text-sm leading-relaxed mb-3">
                        {report.sentences.map((s,i)=>(<span key={i} className={`${verdictClass(s.verdict)} px-1 rounded mr-1 cursor-help`} title={`${s.verdict.toUpperCase()} · ${s.confidence}%`}>{s.text}{" "}</span>))}
                      </div>
                      <div className="space-y-1.5">
                        {report.reasons.length===0?<div className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4"/>No major issues detected.</div>:report.reasons.slice(0,5).map((r,i)=>(<div key={i} className="flex items-start gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0"/>{r}</div>))}
                      </div>
                      {/* Paraphrase detection inline */}
                      <div className="mt-4 pt-4 border-t border-border">
                        <ParaphraseDetector text={text} isVisible={true} onParaphraseScore={setParaphraseScore}/>
                      </div>
                    </>
                  )}

                  {reportTab==="sources" && <AcademicSources text={text} isVisible={true}/>}
                  {reportTab==="citations" && <CitationFixer text={text} isVisible={true}/>}
                  {reportTab==="scientific" && <ScientificCheck text={text} isVisible={true}/>}
                  {reportTab==="related" && <RelatedPapers text={text} isVisible={true}/>}
                  {reportTab==="writing" && <WritingSuggestions text={text} isVisible={true}/>}
                  {reportTab==="batch" && <BatchUpload isVisible={true}/>}
                  {reportTab==="share" && (
                    <div className="text-center py-8">
                      <Share2 className="h-12 w-12 mx-auto mb-4 text-primary opacity-60"/>
                      {shareUrl?(
                        <>
                          <p className="font-semibold mb-2">Report shared!</p>
                          <div className="glass rounded-xl p-3 mb-4 text-sm font-mono break-all">{shareUrl}</div>
                          <Button variant="glass" size="sm" onClick={()=>{navigator.clipboard.writeText(shareUrl);toast.success("Copied!");}}>Copy Link</Button>
                          <p className="text-xs text-muted-foreground mt-3">Link expires in 7 days. No file content is stored.</p>
                        </>
                      ):(
                        <>
                          <p className="text-sm text-muted-foreground mb-4">Generate a shareable read-only link for this report</p>
                          <Button variant="hero" onClick={shareReport} disabled={sharing}><Share2 className="h-4 w-4"/>{sharing?"Creating link…":"Share Report"}</Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Batch tab always accessible even before analysis */}
              {!report && (
                <div className="mt-6">
                  <BatchUpload isVisible={true}/>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="rounded-xl glass p-3">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold" style={{color}}>{value}%</div>
    <div className="h-1 mt-1 bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{width:`${value}%`,background:color}}/>
    </div>
  </div>
);
