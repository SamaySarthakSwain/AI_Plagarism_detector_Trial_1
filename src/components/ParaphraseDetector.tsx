import { useState, useEffect } from 'react';
import { Scan, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ParaphrasedSpan {
  text: string;
  similarity: number;
  isParaphrase: boolean;
}

interface ParaphraseResult {
  spans: ParaphrasedSpan[];
  paraphrasePercent: number;
}

interface ParaphraseDetectorProps {
  text: string;
  isVisible: boolean;
  onParaphraseScore?: (score: number) => void;
}

export const ParaphraseDetector = ({ text, isVisible, onParaphraseScore }: ParaphraseDetectorProps) => {
  const [result, setResult] = useState<ParaphraseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset when text changes
    setResult(null);
    setError(null);
  }, [text]);

  const analyze = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/huggingface-embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Paraphrase detection failed');
      }

      const data: ParaphraseResult = await res.json();
      setResult(data);
      onParaphraseScore?.(data.paraphrasePercent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scan className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Paraphrase Detection</h3>
          <span className="text-[10px] font-bold bg-primary/20 text-primary rounded px-1.5 py-0.5">HuggingFace</span>
        </div>
        {!result && (
          <Button variant="glass" size="sm" onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
            {loading ? 'Analyzing…' : 'Detect Paraphrase'}
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--paraphrase)/0.3)', border: '1px solid hsl(var(--paraphrase))' }} />
          Paraphrase Suspected
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-success/20 border border-success/50" />
          Original
        </div>
      </div>

      {!result && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <Scan className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Uses sentence embeddings to detect paraphrased academic content hidden by rewording</p>
        </div>
      )}

      {loading && (
        <div className="glass rounded-xl p-6 animate-pulse">
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-3 bg-muted rounded" style={{ width: `${70 + i * 5}%` }} />)}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <>
          {/* Score card */}
          <div className="flex items-center gap-3 mb-4 glass rounded-xl p-3">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-1">Paraphrase Score</div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${result.paraphrasePercent}%`, background: 'hsl(var(--paraphrase))' }}
                />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'hsl(var(--paraphrase))' }}>
              {result.paraphrasePercent}%
            </div>
          </div>

          {result.paraphrasePercent === 0 ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> No paraphrase patterns detected
            </div>
          ) : (
            <div className="rounded-xl bg-muted/20 border border-border p-4 max-h-60 overflow-auto text-sm leading-relaxed">
              {result.spans.map((span, i) => (
                <span
                  key={i}
                  className="px-0.5 rounded cursor-help"
                  style={span.isParaphrase ? {
                    background: 'hsl(var(--paraphrase)/0.2)',
                    borderBottom: '2px solid hsl(var(--paraphrase))',
                  } : {}}
                  title={span.isParaphrase ? `Similarity: ${span.similarity}% — Possible paraphrase` : ''}
                >
                  {span.text}{' '}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
