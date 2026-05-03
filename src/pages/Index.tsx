import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Checker } from "@/components/Checker";
import { Compare } from "@/components/Compare";
import { Testimonials } from "@/components/Testimonials";
import { CTA, Footer } from "@/components/CTAFooter";

const Index = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Navbar />
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <Checker />
      <Compare />
      <Testimonials />
      <CTA />
    </main>
    <Footer />
  </div>
);

export default Index;

