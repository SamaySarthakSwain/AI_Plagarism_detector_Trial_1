import { useState } from 'react';
import { HardDrive, Loader2, FileText, Upload, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

interface DriveImportProps {
  onTextLoaded: (text: string, fileName: string) => void;
}

export const DriveImport = ({ onTextLoaded }: DriveImportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const openBrowser = async () => {
    setIsOpen(true);
    setLoading(true);
    try {
      const res = await fetch('/api/drive/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.status === 501 || data.configured === false) {
        setConfigured(false);
      } else {
        setConfigured(true);
        setFiles(data.files || []);
      }
    } catch {
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const importFile = async (file: DriveFile) => {
    setLoading(true);
    try {
      const res = await fetch('/api/drive/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, action: 'export' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      onTextLoaded(data.text || '', file.name);
      setIsOpen(false);
      toast.success(`Imported: ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="glass" size="sm" onClick={openBrowser}>
        <HardDrive className="h-4 w-4" />
        <span className="hidden sm:inline">Drive</span>
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'hsl(0 0% 0% / 0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="glass rounded-2xl p-6 max-w-lg w-full border border-border max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Google Drive</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition text-xl leading-none">×</button>
            </div>

            {loading && (
              <div className="flex-1 flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {!loading && configured === false && (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning opacity-60" />
                <h4 className="font-semibold mb-2">Google OAuth Not Configured</h4>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Set up OAuth credentials in Google Cloud Console to enable Drive integration.
                </p>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline justify-center"
                >
                  Open Google Cloud Console <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {!loading && configured === true && (
              <div className="overflow-auto flex-1 space-y-2">
                {files.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No documents found</p>
                )}
                {files.map(f => (
                  <button
                    key={f.id}
                    onClick={() => importFile(f)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 border border-transparent hover:border-primary/20 transition text-left"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(f.modifiedTime).toLocaleDateString()}</div>
                    </div>
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
