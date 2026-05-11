import { Navbar } from "@/components/Navbar";
import { Checker } from "@/components/Checker";
import { Footer } from "@/components/CTAFooter";
import { AuroraBackground } from "@/components/AuroraBackground";
import { useEffect } from "react";

const Demo = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-foreground relative z-0">
      <AuroraBackground />
      <Navbar />
      <main className="pt-16">
        <Checker />
      </main>
      <Footer />
    </div>
  );
};

export default Demo;
