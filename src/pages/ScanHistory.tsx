import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, ShieldCheck, Loader2, AlertTriangle, Trash2, ExternalLink } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { supabase, isSupabaseConfigured, type ScanRecord } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';

// In-memory session history fallback (when Supabase not configured)
export const sessionHistory: ScanRecord[] = [];

export default function ScanHistory() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (supabase && user) {
        const { data } = await supabase
          .from('scan_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        setRecords(data || []);
      } else {
        // Show in-memory session scans
        setRecords([...sessionHistory].reverse());
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const scoreColor = (v: number, type: 'bad' | 'good') => {
    if (type === 'bad') return v > 60 ? 'text-destructive' : v > 30 ? 'text-warning' : 'text-success';
    return v > 70 ? 'text-success' : v > 40 ? 'text-warning' : 'text-destructive';
  };

  return (
    <div className="min-h-screen hero-bg">
      <Navbar />
      <div className="container py-24 max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center">
            <History className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Scan History</h1>
            <p className="text-sm text-muted-foreground">
              {isSupabaseConfigured ? (user ? 'Your saved scans' : 'Sign in to persist history') : 'Session history (configure Supabase to persist)'}
            </p>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="glass rounded-xl p-4 border border-warning/30 mb-6 text-sm text-warning flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Supabase not configured — history is session-only. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to persist scans.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-border">
            <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="font-semibold mb-2">No scans yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Run your first analysis to see it here</p>
            <Link to="/" className="text-primary hover:underline text-sm">← Start checking</Link>
          </div>
        ) : (
          <div className="glass rounded-2xl border border-border overflow-hidden card-shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">File</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tool</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">AI %</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Plagiarism %</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Integrity %</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id || i} className="border-b border-border/50 hover:bg-muted/20 transition">
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{r.file_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-primary/15 text-primary rounded px-1.5 py-0.5 font-medium">{r.tool}</span>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${scoreColor(r.ai_score, 'bad')}`}>{r.ai_score}%</td>
                      <td className={`px-4 py-3 font-semibold ${scoreColor(r.plagiarism_score, 'bad')}`}>{r.plagiarism_score}%</td>
                      <td className={`px-4 py-3 font-semibold ${scoreColor(r.integrity_score, 'good')}`}>{r.integrity_score}%</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {r.language && (
                          <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground mr-2">{r.language}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
