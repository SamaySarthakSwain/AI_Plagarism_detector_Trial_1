import { useState } from 'react';
import { FlaskConical, Loader2, ExternalLink, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScientificResult {
  source: 'arxiv' | 'pubmed';
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  url: string;
  doi?: string;
  arxivId?: string;
  pmid?: string;
  similarity?: number;
}

interface ScientificCheckProps {
  text: string;
  isVisible: boolean;
}

export const ScientificCheck = ({ text, isVisible }: ScientificCheckProps) => {
  const [results, setResults] = useState<ScientificResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [activeSource, setActiveSource] = useState<'all' | 'arxiv' | 'pubmed'>('all');

  const runCheck = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const query = text.replace(/\s+/g, ' ').substring(0, 200);

      const [arxivRes, pubmedRes] = await Promise.allSettled([
        fetch('/api/arxiv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        }).then(r => r.json()),
        fetch('/api/pubmed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        }).then(r => r.json()),
      ]);

      const combined: ScientificResult[] = [];

      if (arxivRes.status === 'fulfilled' && arxivRes.value.results) {
        combined.push(...arxivRes.value.results.map((r: ScientificResult) => ({ ...r, source: 'arxiv' as const })));
      }
      if (pubmedRes.status === 'fulfilled' && pubmedRes.value.results) {
        combined.push(...pubmedRes.value.results.map((r: ScientificResult) => ({ ...r, source: 'pubmed' as const })));
      }

      setResults(combined);
      setChecked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scientific check failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  const filtered = activeSource === 'all' ? results : results.filter(r => r.source === activeSource);
  const arxivCount = results.filter(r => r.source === 'arxiv').length;
  const pubmedCount = results.filter(r => r.source === 'pubmed').length;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Scientific Sources</h3>
          <span className="text-[10px] font-bold bg-success/20 text-success rounded px-1.5 py-0.5">ArXiv + PubMed</span>
        </div>
        <Button variant="glass" size="sm" onClick={runCheck} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          {loading ? 'Scanning…' : checked ? 'Re-scan' : 'Scan STEM Sources'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Searches ArXiv preprints and PubMed biomedical literature. Both APIs are free with no keys required.
      </p>

      {!checked && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Recommended for STEM, medicine, and research papers. Checks against 2M+ ArXiv preprints and 35M+ PubMed articles</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-12 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
              <div className="h-3 bg-muted/60 rounded w-full mb-1" />
              <div className="h-3 bg-muted/40 rounded w-4/5" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {checked && results.length > 0 && (
        <>
          <div className="flex gap-1 mb-4 glass rounded-xl p-1">
            {([
              { key: 'all', label: `All (${results.length})` },
              { key: 'arxiv', label: `ArXiv (${arxivCount})` },
              { key: 'pubmed', label: `PubMed (${pubmedCount})` },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSource(tab.key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${activeSource === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((result, i) => (
              <div key={i} className="glass rounded-xl p-4 border border-border hover:border-primary/40 transition-all">
                <div className="flex items-start gap-3">
                  <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 shrink-0 mt-0.5 ${
                    result.source === 'arxiv' ? 'bg-primary/15 text-primary' : 'bg-success/15 text-success'
                  }`}>
                    {result.source === 'arxiv' ? 'ArXiv' : 'PubMed'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-snug mb-1 line-clamp-2">{result.title}</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {result.authors.slice(0, 3).join(', ')}{result.authors.length > 3 ? ' et al.' : ''} · {result.year}
                    </div>
                    {result.abstract && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{result.abstract}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {result.doi && (
                        <a href={`https://doi.org/${result.doi}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                          DOI <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      <a href={result.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                        View Paper <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {checked && results.length === 0 && !loading && !error && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No related scientific papers found. Your content appears highly original or topic-specific.
        </div>
      )}
    </div>
  );
};
