import { useState } from 'react';
import { Zap, ToggleLeft, ToggleRight, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  lastRun?: string;
}

export const AutomationHub = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    { id: 'auto-scan', name: 'Auto Scan on Upload', description: 'Automatically run AI + plagiarism check when a file is uploaded', active: false },
    { id: 'email-report', name: 'Email Report', description: 'Send a PDF report to an email after each analysis completes', active: false },
    { id: 'bulk-class', name: 'Bulk Class Scan', description: 'Batch-scan an entire student submission folder from Google Drive', active: false },
  ]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/n8n/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const data = await res.json();
      if (data.configured === false || res.status === 501) {
        setConnected(false);
      } else {
        setConnected(true);
        if (data.workflows) {
          setWorkflows(data.workflows);
        }
      }
    } catch {
      setConnected(false);
    } finally {
      setChecking(false);
    }
  };

  const toggle = async (id: string) => {
    if (!connected) return;
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: !w.active } : w));
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Automation Hub</h2>
          <p className="text-sm text-muted-foreground">Powered by n8n workflow engine</p>
        </div>
        <button
          onClick={checkConnection}
          disabled={checking}
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition glass rounded-lg px-3 py-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
          {connected === null ? 'Check Connection' : connected ? '🟢 Connected' : '🔴 Not Connected'}
        </button>
      </div>

      {connected === false && (
        <div className="glass rounded-2xl p-6 border border-warning/30 mb-6 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-warning opacity-70" />
          <h3 className="font-semibold mb-2">n8n Not Connected</h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            To enable workflow automation, set up an n8n instance and configure the endpoint in your environment variables.
          </p>
          <a
            href="https://n8n.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Get n8n <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      <div className="space-y-3">
        {workflows.map(w => (
          <div key={w.id} className={`glass rounded-2xl p-5 border transition-all ${w.active ? 'border-primary/40' : 'border-border'}`}>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{w.name}</span>
                  {w.active && <span className="text-[10px] bg-success/20 text-success rounded px-1.5 py-0.5 font-bold">ACTIVE</span>}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{w.description}</p>
                {w.lastRun && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">Last run: {new Date(w.lastRun).toLocaleString()}</p>
                )}
              </div>
              <button
                onClick={() => toggle(w.id)}
                disabled={!connected}
                className="shrink-0 text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition hover:text-primary"
              >
                {w.active
                  ? <ToggleRight className="h-8 w-8 text-primary" />
                  : <ToggleLeft className="h-8 w-8" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
