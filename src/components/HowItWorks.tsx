import { Upload, ScanLine, FileBarChart, Sparkles } from "lucide-react";

const steps = [
  { icon: Upload, title: "Upload Document", desc: "Drop in PDF, DOCX, PPTX or TXT. We extract clean text instantly." },
  { icon: ScanLine, title: "AI Analysis", desc: "Our hybrid models scan for plagiarism, AI patterns and citation gaps." },
  { icon: FileBarChart, title: "Detailed Report", desc: "Color-coded highlights with sentence-level confidence scores." },
  { icon: Sparkles, title: "Get Insights", desc: "Explanations, fixes and an integrity score you can act on." },
];

export const HowItWorks = () => (
  <section id="how" className="py-24 md:py-32 relative">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <div className="inline-block text-xs font-semibold tracking-widest text-accent uppercase mb-3">How it works</div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">From upload to verdict in <span className="gradient-text">under a minute</span></h2>
      </div>

      <div className="relative grid md:grid-cols-4 gap-6">
        <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary via-accent to-primary" />
        {steps.map((s, i) => (
          <div key={s.title} className="relative text-center animate-fade-up" style={{ animationDelay: `${i * 120}ms` }}>
            <div className="relative mx-auto h-20 w-20 mb-5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent blur-lg opacity-50" />
              <div className="relative h-full w-full rounded-full glass grid place-items-center border-2 border-primary/40">
                <s.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
