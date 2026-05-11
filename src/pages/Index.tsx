import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";

import { Compare } from "@/components/Compare";
import { Testimonials } from "@/components/Testimonials";
import { CTA, Footer } from "@/components/CTAFooter";
import { AuroraBackground } from "@/components/AuroraBackground";

const Index = () => (
  <div className="min-h-screen bg-transparent text-foreground relative z-0">
    <AuroraBackground />
    <Navbar />
    <main>
      <Hero />
      <Features />
      <HowItWorks />

      <Compare />
      <Testimonials />
      <CTA />
    </main>
    <Footer />
  </div>
);

export default Index;
