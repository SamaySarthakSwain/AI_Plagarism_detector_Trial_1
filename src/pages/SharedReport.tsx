import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Loader2, AlertTriangle, Clock, Share2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface SharedData {
  file_name: string;
  tool: string;
  created_at: string;
  expires_at: string;
  scores: { aiScore: number; plagiarism: number; integrity: number; human: number; unique: number };
  highlights: Array<{ text: string; verdict: string; confidence: number }>;
  reasons: string[];
}

const Stat = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="rounded-xl glass p-3">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold" style={{ color }}>{value}%</div>
    <div className="h-1 mt-1 bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

export default function SharedReport() {
  const { uuid } = useParams<{ uuid: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [QRCode, setQRCode] = useState<React.ComponentType<{ value: string; size?: number }> | null>(null);

  useEffect(() => {
    // Load QR code library dynamically
    import('qrcode.react').then(m => setQRCode(() => m.QRCodeSVG ?? m.default)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!uuid) return;

    const fetchReport = async () => {
      try {
        if (supabase) {
          const { data: row, error: err } = await supabase
            .from('shared_reports')
            .select('*')
            .eq('uuid', uuid)
            .single();

          if (err || !row) throw new Error('Report not found or has expired');
          if (new Date(row.expires_at) < new Date()) throw new Error('This report link has expired (7-day limit)');
          setData(row);
        } else {
          // Fallback: fetch from our own API route (non-Supabase path)
          const res = await fetch(`/api/share-report/${uuid}`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Report not found');
          setData(json);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [uuid]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  const url = window.location.href;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md text-center border border-destructive/30">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-70" />
          <h2 className="font-bold text-lg mb-2">Report Unavailable</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Link to="/" className="text-primary hover:underline text-sm">← Back to IntegrityAI</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const verdictColor = (v: string) =>
    v === 'plagiarism' ? 'bg-destructive/25 border-b-2 border-destructive' :
    v === 'ai' ? 'bg-warning/25 border-b-2 border-warning' :
    v === 'suspicious' ? 'bg-warning/15 border-b border-warning/60' : 'bg-success/15';

  return (
    <div className="min-h-screen hero-bg py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Integrity<span className="gradient-text">AI</span></span>
          </Link>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-sm text-muted-foreground">Shared Report</span>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs rounded px-2 py-0.5 font-medium ${daysLeft <= 1 ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground'}`}>
              <Clock className="inline h-3 w-3 mr-1" />{daysLeft}d left
            </span>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 md:p-8 card-shadow border border-border">
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="font-bold text-xl mb-1">{data.file_name}</h1>
              <p className="text-sm text-muted-foreground">
                Analyzed {new Date(data.created_at).toLocaleDateString()} · {data.tool}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="glass" size="sm" onClick={copyLink}>
                <Share2 className="h-4 w-4" /> Copy Link
              </Button>
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            <Stat label="Plagiarism" value={data.scores.plagiarism} color="hsl(var(--destructive))" />
            <Stat label="AI" value={data.scores.aiScore} color="hsl(var(--warning))" />
            <Stat label="Human" value={data.scores.human} color="hsl(var(--primary))" />
            <Stat label="Integrity" value={data.scores.integrity} color="hsl(var(--success))" />
          </div>

          {/* Highlights */}
          {data.highlights && data.highlights.length > 0 && (
            <div className="rounded-xl bg-muted/30 border border-border p-4 max-h-56 overflow-auto text-sm leading-relaxed mb-4">
              {data.highlights.map((s, i) => (
                <span key={i} className={`${verdictColor(s.verdict)} px-1 rounded mr-1 cursor-help`}
                  title={`${s.verdict.toUpperCase()} · ${s.confidence}%`}>{s.text}{' '}</span>
              ))}
            </div>
          )}

          {/* Reasons */}
          {data.reasons && data.reasons.length > 0 && (
            <div className="space-y-1.5 mb-6">
              {data.reasons.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" /> {r}
                </div>
              ))}
            </div>
          )}

          {/* QR Code */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center gap-6">
            {QRCode && (
              <div className="glass rounded-xl p-3">
                <QRCode value={url} size={100} />
              </div>
            )}
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium mb-1">Share this report</p>
              <p className="text-xs text-muted-foreground mb-2 max-w-xs">
                This link is read-only and expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. No file content is stored.
              </p>
              <a href={url} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> {url.substring(0, 60)}{url.length > 60 ? '…' : ''}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
