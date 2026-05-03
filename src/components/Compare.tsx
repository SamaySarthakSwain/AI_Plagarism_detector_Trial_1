import { Check, X } from "lucide-react";

const rows = [
  { f: "Free for students", us: true, t: false, s: false, p: false },
  { f: "AI content detection", us: true, t: true, s: true, p: true },
  { f: "Explainable AI reasons", us: true, t: false, s: false, p: false },
  { f: "Sentence-level highlights", us: true, t: true, s: true, p: false },
  { f: "Writing fingerprint", us: true, t: false, s: false, p: false },
  { f: "Real-time editor", us: true, t: false, s: false, p: true },
  { f: "Citation generator", us: true, t: false, s: true, p: true },
  { f: "Files auto-deleted", us: true, t: false, s: true, p: true },
];

const Cell = ({ ok }: { ok: boolean }) =>
  ok ? <Check className="h-5 w-5 text-success mx-auto" /> : <X className="h-5 w-5 text-destructive/70 mx-auto" />;

export const Compare = () => (
  <section id="compare" className="py-24 md:py-32 relative">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <div className="inline-block text-xs font-semibold tracking-widest text-primary uppercase mb-3">Comparison</div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">How we stack up</h2>
      </div>

      <div className="glass rounded-2xl p-2 card-shadow overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left">
              <th className="p-4 font-semibold">Feature</th>
              <th className="p-4 text-center font-semibold">
                <span className="gradient-text text-base">IntegrityAI</span>
              </th>
              <th className="p-4 text-center font-medium text-muted-foreground">Turnitin</th>
              <th className="p-4 text-center font-medium text-muted-foreground">Scribbr</th>
              <th className="p-4 text-center font-medium text-muted-foreground">Paperpal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.f} className={i % 2 ? "bg-muted/30" : ""}>
                <td className="p-4">{r.f}</td>
                <td className="p-4 text-center bg-primary/5 border-x border-primary/20"><Cell ok={r.us} /></td>
                <td className="p-4 text-center"><Cell ok={r.t} /></td>
                <td className="p-4 text-center"><Cell ok={r.s} /></td>
                <td className="p-4 text-center"><Cell ok={r.p} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);
