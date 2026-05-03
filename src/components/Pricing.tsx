import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  { name: "Student", price: "Free", desc: "Forever free for individuals.", popular: false,
    features: ["10 scans / day", "AI + plagiarism detection", "Explainable highlights", "Downloadable reports"] },
  { name: "Pro", price: "$9", per: "/mo", desc: "For serious researchers.", popular: true,
    features: ["Unlimited scans", "Real-time editor", "Writing fingerprint", "Priority processing", "Citation auto-fixer"] },
  { name: "Institution", price: "Custom", desc: "For colleges & universities.", popular: false,
    features: ["Everything in Pro", "Teacher dashboard", "Cross-student detection", "SSO & analytics", "Dedicated support"] },
];

export const Pricing = () => (
  <section id="pricing" className="py-24 md:py-32 relative">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center mb-14">
        <div className="inline-block text-xs font-semibold tracking-widest text-primary uppercase mb-3">Pricing</div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple, honest plans</h2>
        <p className="text-muted-foreground">Always free for students. Pay only if your team needs more.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {tiers.map((t, i) => (
          <div key={t.name}
            className={`relative glass rounded-2xl p-6 card-shadow hover:-translate-y-1 transition animate-fade-up ${t.popular ? "border-primary/60 ring-2 ring-primary/40 glow-shadow" : ""}`}
            style={{ animationDelay: `${i * 100}ms` }}>
            {t.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Most popular
              </div>
            )}
            <h3 className="font-semibold text-lg">{t.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{t.desc}</p>
            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-4xl font-bold">{t.price}</span>
              {t.per && <span className="text-sm text-muted-foreground">{t.per}</span>}
            </div>
            <Button variant={t.popular ? "hero" : "glass"} className="w-full mb-5">
              {t.price === "Custom" ? "Contact us" : "Get started"}
            </Button>
            <ul className="space-y-2.5">
              {t.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
);
