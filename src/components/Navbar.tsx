import { Moon, Sun, ShieldCheck, Menu, X } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#demo", label: "Demo" },
  { href: "#compare", label: "Compare" },
  { href: "#pricing", label: "Pricing" },
];

export const Navbar = () => {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
      <nav className={`mx-auto max-w-7xl px-4 sm:px-6 ${scrolled ? "glass rounded-2xl mx-3 sm:mx-6" : ""} transition-all duration-300`}>
        <div className="flex items-center justify-between h-14">
          <a href="#" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-accent blur-md opacity-60 group-hover:opacity-100 transition" />
              <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight">
              Integrity<span className="gradient-text">AI</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <a key={l.href} href={l.href}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="relative h-10 w-10 grid place-items-center rounded-lg glass hover:scale-105 transition-transform"
            >
              <Sun className={`h-5 w-5 absolute transition-all duration-500 text-warning ${theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`} />
              <Moon className={`h-5 w-5 absolute transition-all duration-500 text-primary ${theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"}`} />
            </button>
            <Button variant="hero" size="sm" className="hidden sm:inline-flex" asChild>
              <a href="#demo">Try Free</a>
            </Button>
            <button className="md:hidden h-10 w-10 grid place-items-center rounded-lg glass" onClick={() => setOpen(v => !v)} aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden glass rounded-2xl mt-2 p-3 flex flex-col">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
                {l.label}
              </a>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
};
