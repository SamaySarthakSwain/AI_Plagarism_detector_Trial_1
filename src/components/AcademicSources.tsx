import { useState } from 'react';
import { ExternalLink, BookOpen, Loader2, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AcademicSource {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  similarity: number;
  url: string;
  doi?: string;
  citationCount?: number;
}

interface AcademicSourcesProps {
  text: string;
  isVisible: boolean;
}

export const AcademicSources = ({ text, isVisible }: AcademicSourcesProps) => {
  const [sources, setSources] = useState<AcademicSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const searchSources = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      // Extract 3–5 key sentences for query
      const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(s => s.length > 30).slice(0, 3);
      const query = sentences.join(' ').substring(0, 200);

      const res = await fetch('/api/openalex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to fetch sources');
      }

      const data = await res.json();
      setSources(data.results || []);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
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
          <h3 className="font-semibold">Academic Source Matching</h3>
          <span className="text-[10px] font-bold bg-primary/20 text-primary rounded px-1.5 py-0.5">OpenAlex</span>
        </div>
        {!searched && (
          <Button variant="glass" size="sm" onClick={searchSources} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Searching…' : 'Find Sources'}
          </Button>
        )}
      </div>

      {!searched && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Click "Find Sources" to search 250M+ academic papers on OpenAlex for matching content</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {searched && sources.length === 0 && !loading && !error && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No closely matching academic sources found. Your content appears original or highly unique.
        </div>
      )}

      {sources.length > 0 && (
        <div className="space-y-3">
          {sources.map((src, i) => (
            <div key={src.id || i} className="glass rounded-xl p-4 border border-border hover:border-primary/40 transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {src.title}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    {src.authors.slice(0, 3).join(', ')}{src.authors.length > 3 ? ' et al.' : ''}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {src.journal && (
                      <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                        {src.journal}
                      </span>
                    )}
                    {src.year && (
                      <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                        {src.year}
                      </span>
                    )}
                    {src.citationCount !== undefined && (
                      <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                        {src.citationCount} citations
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: src.similarity > 60 ? 'hsl(var(--destructive))' : src.similarity > 35 ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}>
                      {src.similarity}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">similarity</div>
                  </div>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    View Source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${src.similarity}%`,
                    background: src.similarity > 60
                      ? 'hsl(var(--destructive))'
                      : src.similarity > 35
                      ? 'hsl(var(--warning))'
                      : 'hsl(var(--success))'
                  }}
                />
              </div>
            </div>
          ))}
          <Button
            variant="glass"
            size="sm"
            className="w-full mt-2"
            onClick={searchSources}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Refresh Search
          </Button>
        </div>
      )}
    </div>
  );
};
