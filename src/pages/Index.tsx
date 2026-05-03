import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Demo } from "@/components/Demo";
import { Compare } from "@/components/Compare";
import { Testimonials } from "@/components/Testimonials";
import { Pricing } from "@/components/Pricing";
import { CTA, Footer } from "@/components/CTAFooter";

const Index = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Navbar />
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <Demo />
      <Compare />
      <Testimonials />
      <Pricing />
      <CTA />
    </main>
    <Footer />
  </div>
);

export default Index;
