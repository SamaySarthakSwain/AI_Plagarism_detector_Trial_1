import { useState } from 'react';
import { Copy, CheckCircle2, BookOpen, Loader2, AlertCircle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CitationResult {
  original: string;
  apa: string;
  mla: string;
  ieee: string;
  qualityScore: number;
  issues: string[];
  doi?: string;
}

interface CitationFixerProps {
  text: string;
  isVisible: boolean;
}

const copy = (text: string) => {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard!'));
};

const QualityBadge = ({ score }: { score: number }) => {
  const color = score >= 80 ? 'hsl(var(--success))' : score >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Fair' : 'Poor';
  return (
    <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: `${color}20`, color }}>
      {label} ({score})
    </span>
  );
};

export const CitationFixer = ({ text, isVisible }: CitationFixerProps) => {
  const [citations, setCitations] = useState<CitationResult[]>([]);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<'apa' | 'mla' | 'ieee'>('apa');
  const [checked, setChecked] = useState(false);

  const runCheck = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/crossref', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Citation check failed');
      }

      const data = await res.json();
      setCitations(data.citations || []);
      setOverallScore(data.overallScore ?? null);
      setChecked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Citation Fixer</h3>
          <span className="text-[10px] font-bold bg-primary/20 text-primary rounded px-1.5 py-0.5">CrossRef</span>
        </div>
        <div className="flex items-center gap-2">
          {overallScore !== null && (
            <div className="flex items-center gap-1.5 glass rounded-lg px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Citation Quality:</span>
              <span className="text-sm font-bold" style={{ color: overallScore >= 80 ? 'hsl(var(--success))' : overallScore >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))' }}>
                {overallScore}/100
              </span>
            </div>
          )}
          <Button variant="glass" size="sm" onClick={runCheck} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {loading ? 'Checking…' : 'Fix Citations'}
          </Button>
        </div>
      </div>

      {!checked && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Detects citation patterns in your text and corrects them to APA, MLA, or IEEE format using CrossRef's database</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-muted rounded w-2/3 mb-3" />
              <div className="h-4 bg-muted/60 rounded w-full mb-2" />
              <div className="h-4 bg-muted/40 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {checked && citations.length === 0 && !loading && !error && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
          <p className="text-sm text-muted-foreground">No citation patterns detected in the text. Add references and re-check.</p>
        </div>
      )}

      {citations.length > 0 && (
        <>
          <div className="flex gap-1 mb-4 glass rounded-xl p-1">
            {(['apa', 'mla', 'ieee'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFormat(f)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${activeFormat === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {citations.map((cit, i) => (
              <div key={i} className="glass rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Citation {i + 1}</span>
                  <QualityBadge score={cit.qualityScore} />
                </div>

                {cit.issues.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {cit.issues.map((issue, j) => (
                      <div key={j} className="text-xs text-warning flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 shrink-0" /> {issue}
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-2">
                  <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                    <div className="text-[10px] text-destructive font-semibold uppercase mb-1">Your Version</div>
                    <p className="text-xs leading-relaxed font-mono">{cit.original}</p>
                  </div>
                  <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] text-success font-semibold uppercase">Corrected ({activeFormat.toUpperCase()})</div>
                      <button
                        onClick={() => copy(cit[activeFormat])}
                        className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed">{cit[activeFormat]}</p>
                  </div>
                </div>

                {cit.doi && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    DOI: <a href={`https://doi.org/${cit.doi}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{cit.doi}</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
