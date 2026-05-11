import { useState, useCallback } from 'react';
import { Upload, X, Loader2, Download, AlertTriangle, CheckCircle2, FileText, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BatchFileResult {
  fileName: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  aiScore?: number;
  plagiarism?: number;
  integrity?: number;
  human?: number;
  error?: string;
  progress: number;
}

interface BatchUploadProps {
  isVisible: boolean;
}

type SortKey = 'fileName' | 'aiScore' | 'plagiarism' | 'integrity';

export const BatchUpload = ({ isVisible }: BatchUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<BatchFileResult[]>([]);
  const [running, setRunning] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('fileName');
  const [sortAsc, setSortAsc] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f =>
      f.name.match(/\.(txt|md|pdf|docx|html)$/i) || f.name.endsWith('.zip')
    );
    if (valid.length !== newFiles.length) toast.warning('Some file types skipped. Supported: TXT, MD, PDF, DOCX, HTML, ZIP');
    setFiles(prev => {
      const combined = [...prev, ...valid];
      return combined.slice(0, 20); // max 20 files
    });
  }, []);

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const runBatch = async () => {
    if (files.length === 0) return;
    setRunning(true);
    const initial: BatchFileResult[] = files.map(f => ({ fileName: f.name, status: 'pending', progress: 0 }));
    setResults(initial);

    for (let i = 0; i < files.length; i++) {
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'processing', progress: 10 } : r));

      try {
        // Read file content
        let text = '';
        const f = files[i];
        const lname = f.name.toLowerCase();

        if (lname.endsWith('.zip')) {
          // ZIP: use batch-analyze API
          const arrayBuffer = await f.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          const res = await fetch('/api/batch-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: base64, filename: f.name }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'ZIP analysis failed');
          setResults(prev => prev.map((r, idx) => idx === i ? { ...r, ...data, status: 'done', progress: 100 } : r));
          continue;
        }

        if (lname.endsWith('.txt') || lname.endsWith('.md')) {
          text = await f.text();
        } else {
          const arrayBuffer = await f.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: base64, filename: f.name }),
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
          text = uploadData.text || '';
        }

        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, progress: 50 } : r));

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, tool: 'ai' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Analysis failed');

        setResults(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          status: 'done',
          progress: 100,
          aiScore: data.aiScore,
          plagiarism: data.plagiarism,
          integrity: data.integrity,
          human: data.human,
        } : r));
      } catch (e) {
        setResults(prev => prev.map((r, idx) => idx === i ? {
          ...r, status: 'error', progress: 100, error: e instanceof Error ? e.message : 'Failed'
        } : r));
      }
    }

    setRunning(false);
    toast.success('Batch analysis complete!');
  };

  const downloadAll = async () => {
    const done = results.filter(r => r.status === 'done');
    if (done.length === 0) return;

    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      done.forEach(r => {
        zip.file(`${r.fileName}.report.json`, JSON.stringify(r, null, 2));
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'batch_reports.zip'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate ZIP');
    }
  };

  const sorted = [...results].sort((a, b) => {
    const aVal = sortKey === 'fileName' ? a.fileName : (a[sortKey] ?? 0);
    const bVal = sortKey === 'fileName' ? b.fileName : (b[sortKey] ?? 0);
    if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  if (!isVisible) return null;

  // Cross-document similarity warning
  const highAiFiles = results.filter(r => r.status === 'done' && (r.aiScore ?? 0) > 70);
  const copyingWarning = results.length >= 2 && highAiFiles.length >= 2;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Batch File Analysis</h3>
          <span className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">Up to 20 files</span>
        </div>
        {results.some(r => r.status === 'done') && (
          <Button variant="glass" size="sm" onClick={downloadAll}>
            <Download className="h-4 w-4" /> Download ZIP
          </Button>
        )}
      </div>

      {/* Drop Zone */}
      {results.length === 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}`}
        >
          <Archive className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-3">Drag & drop up to 20 files or a ZIP archive</p>
          <p className="text-xs text-muted-foreground/60 mb-4">TXT, MD, PDF, DOCX, HTML, ZIP supported</p>
          <Button variant="glass" size="sm" onClick={() => {
            const inp = document.createElement('input');
            inp.type = 'file'; inp.multiple = true;
            inp.accept = '.txt,.md,.pdf,.docx,.html,.zip';
            inp.onchange = () => inp.files && addFiles(Array.from(inp.files));
            inp.click();
          }}>
            <Upload className="h-4 w-4" /> Select Files
          </Button>
        </div>
      )}

      {/* File list before run */}
      {files.length > 0 && results.length === 0 && (
        <div className="space-y-2 mb-4">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 glass rounded-xl px-4 py-2.5">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="flex-1 text-sm truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="glass" size="sm" onClick={() => {
              const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true;
              inp.accept = '.txt,.md,.pdf,.docx,.html,.zip';
              inp.onchange = () => inp.files && addFiles(Array.from(inp.files)); inp.click();
            }}>
              <Upload className="h-4 w-4" /> Add More
            </Button>
            <Button variant="hero" size="sm" onClick={runBatch} disabled={running} className="flex-1">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              {running ? 'Analyzing…' : `Analyze ${files.length} File${files.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}

      {/* Progress grid */}
      {results.length > 0 && (
        <>
          {copyingWarning && (
            <div className="flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/30 p-3 text-sm text-warning mb-4">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {highAiFiles.length} files show &gt;70% AI content — possible student-to-student copying detected
            </div>
          )}

          {/* Progress cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {results.map((r, i) => (
              <div key={i} className="glass rounded-xl p-3 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  {r.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> :
                   r.status === 'error' ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> :
                   r.status === 'processing' ? <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" /> :
                   <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className="text-xs font-medium truncate">{r.fileName}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary to-accent" style={{ width: `${r.progress}%` }} />
                </div>
                {r.status === 'done' && (
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div><div className="text-[10px] text-muted-foreground">AI%</div><div className="text-sm font-bold text-warning">{r.aiScore}%</div></div>
                    <div><div className="text-[10px] text-muted-foreground">Plag%</div><div className="text-sm font-bold text-destructive">{r.plagiarism}%</div></div>
                    <div><div className="text-[10px] text-muted-foreground">Score</div><div className="text-sm font-bold text-success">{r.integrity}%</div></div>
                  </div>
                )}
                {r.status === 'error' && <p className="text-[10px] text-destructive truncate">{r.error}</p>}
              </div>
            ))}
          </div>

          {/* Summary Table */}
          {sorted.some(r => r.status === 'done') && (
            <div className="glass rounded-xl overflow-hidden border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {[
                        { key: 'fileName', label: 'File' },
                        { key: 'aiScore', label: 'AI %' },
                        { key: 'plagiarism', label: 'Plagiarism %' },
                        { key: 'integrity', label: 'Integrity %' },
                      ].map(col => (
                        <th key={col.key} className="text-left px-3 py-2 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition select-none"
                          onClick={() => toggleSort(col.key as SortKey)}>
                          {col.label} {sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.filter(r => r.status === 'done').map((r, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition">
                        <td className="px-3 py-2 font-medium truncate max-w-[160px]">{r.fileName}</td>
                        <td className="px-3 py-2" style={{ color: (r.aiScore ?? 0) > 60 ? 'hsl(var(--warning))' : 'inherit' }}>{r.aiScore ?? '-'}%</td>
                        <td className="px-3 py-2" style={{ color: (r.plagiarism ?? 0) > 50 ? 'hsl(var(--destructive))' : 'inherit' }}>{r.plagiarism ?? '-'}%</td>
                        <td className="px-3 py-2" style={{ color: 'hsl(var(--success))' }}>{r.integrity ?? '-'}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
