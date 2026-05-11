import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Twitter, Github, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

export const CTA = () => (
  <section className="py-24 relative overflow-hidden">
    <div className="container">
      <div className="relative glass rounded-3xl p-10 md:p-16 text-center card-shadow overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />
        <div className="blob bg-primary/40 h-[300px] w-[300px] -top-20 -left-20" />
        <div className="blob bg-accent/40 h-[300px] w-[300px] -bottom-20 -right-20" />
        <div className="relative">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Ready to ensure <span className="gradient-text">academic integrity?</span></h2>
          <p className="text-muted-foreground md:text-lg max-w-xl mx-auto mb-8">Join thousands of students and educators using IntegrityAI today.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/demo">Start Checking Now <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button variant="glass" size="lg" asChild>
              <Link to="/#features">Explore features</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const Footer = () => (
  <footer className="border-t border-border py-12 mt-12">
    <div className="container">
      <div className="grid md:grid-cols-4 gap-8 mb-8">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Integrity<span className="gradient-text">AI</span></span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-sm">Explainable plagiarism &amp; AI detection. Trusted by students, researchers and institutions.</p>
        </div>
        <div>
          <div className="font-semibold text-sm mb-3">Product</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/#features" className="hover:text-primary transition">Features</Link></li>
            <li><Link to="/demo" className="hover:text-primary transition">Demo</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-sm mb-3">Company</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary transition">About</a></li>
            <li><a href="#" className="hover:text-primary transition">Privacy</a></li>
            <li><a href="#" className="hover:text-primary transition">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} IntegrityAI. All rights reserved.</p>
        <div className="flex items-center gap-2">
          {[Twitter, Github, Linkedin].map((I, i) => (
            <a key={i} href="#" className="h-9 w-9 grid place-items-center rounded-lg glass hover:text-primary transition">
              <I className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);
