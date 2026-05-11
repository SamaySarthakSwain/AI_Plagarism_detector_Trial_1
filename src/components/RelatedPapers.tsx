import { useState } from 'react';
import { Network, Loader2, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RelatedPaper {
  paperId: string;
  title: string;
  authors: string[];
  year: number;
  citationCount: number;
  url: string;
  abstract?: string;
}

interface RelatedPapersProps {
  text: string;
  isVisible: boolean;
  onCheckSimilarity?: (title: string) => void;
}

export const RelatedPapers = ({ text, isVisible, onCheckSimilarity }: RelatedPapersProps) => {
  const [papers, setPapers] = useState<RelatedPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const fetchPapers = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const query = text.replace(/\s+/g, ' ').substring(0, 150);
      const res = await fetch('/api/semantic-scholar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to fetch related papers');
      }

      const data = await res.json();
      setPapers(data.papers || []);
      setFetched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Related Papers</h3>
          <span className="text-[10px] font-bold bg-primary/20 text-primary rounded px-1.5 py-0.5">Semantic Scholar</span>
        </div>
        <Button variant="glass" size="sm" onClick={fetchPapers} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {loading ? 'Loading…' : fetched ? 'Refresh' : 'Find Papers'}
        </Button>
      </div>

      {!fetched && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <Network className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Discover related academic papers from Semantic Scholar's 200M+ paper database</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 mb-3" />
              <div className="h-3 bg-muted/60 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {fetched && papers.length === 0 && !loading && !error && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No related papers found. Try a more specific academic text.
        </div>
      )}

      {papers.length > 0 && (
        <div className="space-y-3">
          {papers.map((paper, i) => (
            <div key={paper.paperId || i} className="glass rounded-xl p-4 border border-border hover:border-primary/40 transition-all group">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {paper.title}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''} · {paper.year}
                  </div>
                  {paper.abstract && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                      {paper.abstract}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5 font-medium">
                      {paper.citationCount.toLocaleString()} citations
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {onCheckSimilarity && (
                    <Button
                      variant="glass"
                      size="sm"
                      className="text-[11px] h-7 px-2"
                      onClick={() => onCheckSimilarity(paper.title)}
                    >
                      Check Similarity
                    </Button>
                  )}
                  <a
                    href={paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
