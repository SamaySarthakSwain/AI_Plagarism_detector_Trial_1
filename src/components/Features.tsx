import { FileCheck2, BrainCircuit, Lightbulb, Fingerprint, ShieldCheck, Zap } from "lucide-react";

const features = [
  { icon: FileCheck2, title: "Plagiarism Detection", desc: "Compare against millions of academic sources and web content with sub-second matching." },
  { icon: BrainCircuit, title: "AI Content Detection", desc: "Identify AI-generated writing with calibrated probability scores per sentence." },
  { icon: Lightbulb, title: "Explainable AI", desc: "Understand exactly why content is flagged — burstiness, repetition, structural patterns." },
  { icon: Fingerprint, title: "Writing Fingerprint", desc: "Track each author's style and instantly catch sudden tone or vocabulary shifts." },
  { icon: ShieldCheck, title: "Integrity Score", desc: "One number that combines plagiarism, AI use, citation quality and consistency." },
  { icon: Zap, title: "Real-Time Detection", desc: "Live editor that flags AI-like writing as you type, with actionable suggestions." },
];

export const Features = () => (
  <section id="features" className="py-24 md:py-32 relative">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <div className="inline-block text-xs font-semibold tracking-widest text-primary uppercase mb-3">Capabilities</div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need for <span className="gradient-text">academic integrity</span></h2>
        <p className="text-muted-foreground md:text-lg">Six core engines working together to give you a verdict you can trust — and explain.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div key={f.title}
            className="group relative glass rounded-2xl p-6 hover:-translate-y-2 transition-all duration-300 card-shadow hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.4)] animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition" />
            <div className="relative">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center mb-5 group-hover:scale-110 transition">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
