import { Star, Quote } from "lucide-react";

const items = [
  { name: "Aarav Mehta", role: "PhD Researcher · IIT", text: "The explainable highlights changed how I review my own writing. I finally trust the AI score." },
  { name: "Dr. Lena Park", role: "Lecturer · NUS", text: "We replaced two paid tools with IntegrityAI. The writing-fingerprint feature is genuinely novel." },
  { name: "Maya Singh", role: "Undergraduate · DU", text: "Free, fast and accurate. The live editor saved me from accidental citation issues." },
];

export const Testimonials = () => (
  <section className="py-24 md:py-32 relative">
    <div className="container">
      <div className="max-w-2xl mx-auto text-center mb-14">
        <div className="inline-block text-xs font-semibold tracking-widest text-accent uppercase mb-3">Loved by educators</div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Trusted by students &amp; faculty</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {items.map((t, i) => (
          <div key={t.name} className="glass rounded-2xl p-6 card-shadow hover:-translate-y-1 transition animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
            <Quote className="h-6 w-6 text-primary mb-3" />
            <p className="text-sm leading-relaxed mb-4">"{t.text}"</p>
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-warning text-warning" />)}
            </div>
            <div>
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
