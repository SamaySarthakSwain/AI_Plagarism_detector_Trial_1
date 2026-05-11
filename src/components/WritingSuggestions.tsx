import { useState } from 'react';
import { Lightbulb, Loader2, AlertCircle, ChevronDown, ChevronUp, Sparkles, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WritingSuggestion {
  title: string;
  issue: string;
  before: string;
  after: string;
  tip: string;
}

interface WritingSuggestionsProps {
  text: string;
  isVisible: boolean;
}

export const WritingSuggestions = ({ text, isVisible }: WritingSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);

  const generate = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/writing-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to generate suggestions');
      }

      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setGenerated(true);
      setExpanded(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Writing Improvement</h3>
          <span className="text-[10px] font-bold bg-primary/20 text-primary rounded px-1.5 py-0.5">Gemini AI</span>
        </div>
        <Button variant="glass" size="sm" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Generating…' : generated ? 'Regenerate' : 'Get Suggestions'}
        </Button>
      </div>

      {!generated && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Gemini analyzes your writing and provides 5 specific, actionable suggestions to make it sound more natural and human</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-3" />
              <div className="h-3 bg-muted/60 rounded w-full mb-1" />
              <div className="h-3 bg-muted/40 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((sug, i) => (
            <div key={i} className="glass rounded-xl border border-border overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/15 grid place-items-center text-primary text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{sug.title}</div>
                    <div className="text-xs text-muted-foreground">{sug.issue}</div>
                  </div>
                </div>
                {expanded === i ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {expanded === i && (
                <div className="px-4 pb-4 animate-fade-up">
                  <div className="grid gap-2 mb-3">
                    <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                      <div className="text-[10px] text-destructive font-semibold uppercase mb-1.5">Before</div>
                      <p className="text-xs leading-relaxed text-foreground/80 italic">{sug.before}</p>
                    </div>
                    <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[10px] text-success font-semibold uppercase">After</div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(sug.after); toast.success('Copied improved version!'); }}
                          className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition"
                        >
                          <Copy className="h-3 w-3" /> Apply
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed">{sug.after}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <div className="text-[10px] text-primary font-semibold uppercase mb-1">💡 Tip</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{sug.tip}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
