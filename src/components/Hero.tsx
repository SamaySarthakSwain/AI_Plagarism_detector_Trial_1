import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, FileSearch, Brain, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden hero-bg pt-32 pb-24 md:pt-40 md:pb-32">
      {/* Animated blobs */}
      <div className="blob bg-primary/40 h-[420px] w-[420px] -top-32 -left-20" />
      <div className="blob bg-accent/40 h-[360px] w-[360px] top-20 right-0" style={{ animationDelay: "-4s" }} />
      <div className="blob bg-primary-glow/30 h-[300px] w-[300px] bottom-0 left-1/3" style={{ animationDelay: "-8s" }} />

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Explainable AI · Built for academic integrity</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Detect AI. Detect Plagiarism.
            <br />
            <span className="gradient-text">Protect Academic Integrity.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Next-generation plagiarism and AI-content detection powered by explainable
            intelligence. Upload any document — get a verdict in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <Button variant="hero" size="lg" asChild>
              <Link to="/demo">
                Check Your Document
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="glass" size="lg" asChild>
              <Link to="/#how">See how it works</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-primary" /> PDF · DOCX · TXT · PPTX</div>
            <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-accent" /> Sentence-level AI scoring</div>
            <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-success" /> Files auto-deleted</div>
          </div>
        </div>

        {/* 3D Document mock */}
        <div className="relative max-w-4xl mx-auto mt-20 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="absolute -inset-10 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-3xl opacity-60" />
          <div className="relative glass rounded-3xl p-2 card-shadow" style={{ transform: "perspective(1500px) rotateX(8deg)" }}>
            <div className="rounded-2xl bg-card p-6 sm:p-8 overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-destructive/70" />
                <div className="h-3 w-3 rounded-full bg-warning/70" />
                <div className="h-3 w-3 rounded-full bg-success/70" />
                <div className="ml-3 text-xs text-muted-foreground">essay-final.pdf · scanning…</div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2 relative">
                  <div className="absolute inset-x-0 h-12 bg-gradient-to-b from-primary/30 to-transparent" style={{ animation: "scan-line 2.5s linear infinite" }} />
                  <p className="text-sm leading-relaxed">
                    <span className="bg-success/20 text-success-foreground px-1 rounded">Academic integrity is essential to learning.</span>{" "}
                    <span className="bg-destructive/20 px-1 rounded">It refers to the moral code of academia, encompassing values such as honesty, trust, fairness, respect, and responsibility.</span>{" "}
                    <span className="bg-warning/20 px-1 rounded">Modern educational frameworks increasingly emphasize the necessity of robust integrity policies to ensure equitable assessment outcomes.</span>{" "}
                    <span>Students benefit from clear guidelines and supportive feedback throughout their academic journey.</span>
                  </p>
                </div>
                <div className="space-y-3">
                  <ScoreRing label="Plagiarism" value={18} color="hsl(var(--destructive))" />
                  <ScoreRing label="AI-Generated" value={42} color="hsl(var(--warning))" />
                  <ScoreRing label="Integrity" value={84} color="hsl(var(--success))" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ScoreRing = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const c = 2 * Math.PI * 26;
  return (
    <div className="flex items-center gap-3 glass rounded-xl p-3">
      <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90">
        <circle cx="32" cy="32" r="26" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
        <circle cx="32" cy="32" r="26" stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} strokeLinecap="round" />
      </svg>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}%</div>
      </div>
    </div>
  );
};
