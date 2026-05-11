import { Moon, Sun, ShieldCheck, Menu, X, Globe, History, Zap, LogIn, LogOut, User } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";

export type Language = 'en' | 'hi' | 'od' | 'bn' | 'ta' | 'te';

export const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'EN' },
  { code: 'hi', label: 'Hindi', native: 'हि' },
  { code: 'od', label: 'Odia', native: 'ଓ' },
  { code: 'bn', label: 'Bengali', native: 'বা' },
  { code: 'ta', label: 'Tamil', native: 'த' },
  { code: 'te', label: 'Telugu', native: 'తె' },
];

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/demo", label: "Demo" },
  { href: "/history", label: "History", icon: History },
  { href: "/automation", label: "Automation", icon: Zap },
];

interface NavbarProps {
  onLanguageChange?: (lang: Language) => void;
  language?: Language;
}

export const Navbar = ({ onLanguageChange, language = 'en' }: NavbarProps) => {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { user, isConfigured, signInWithEmail, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = () => { setLangOpen(false); setAuthOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await signInWithEmail(email);
    setSending(false);
    if (!error) setSent(true);
  };

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
      <nav className={`mx-auto max-w-7xl px-4 sm:px-6 ${scrolled ? "glass rounded-2xl mx-3 sm:mx-6" : ""} transition-all duration-300`}>
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-accent blur-md opacity-60 group-hover:opacity-100 transition" />
              <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight">
              Integrity<span className="gradient-text">AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <Link key={l.href} to={l.href}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted flex items-center gap-1.5"
                onClick={(e) => {
                  if (l.href.startsWith("/#") && location.pathname === "/") {
                    e.preventDefault();
                    document.getElementById(l.href.substring(2))?.scrollIntoView({ behavior: "smooth" });
                  }
                }}>
                {l.icon && <l.icon className="h-3.5 w-3.5" />}
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            {onLanguageChange && (
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setLangOpen(v => !v)}
                  className="relative h-9 px-2.5 flex items-center gap-1.5 rounded-lg glass hover:scale-105 transition-transform text-sm font-medium"
                  aria-label="Select language"
                >
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-xs">{currentLang.native}</span>
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-11 glass rounded-xl border border-border p-1.5 shadow-xl min-w-[140px] z-50">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { onLanguageChange(lang.code); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition ${lang.code === language ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                      >
                        <span className="text-base">{lang.native}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Auth */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setAuthOpen(v => !v)}
                className="h-9 w-9 grid place-items-center rounded-lg glass hover:scale-105 transition-transform"
                aria-label="Account"
              >
                {user
                  ? <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[10px] font-bold text-primary-foreground">
                      {user.email?.[0].toUpperCase() ?? '?'}
                    </div>
                  : <User className="h-4 w-4 text-muted-foreground" />}
              </button>
              {authOpen && (
                <div className="absolute right-0 top-11 glass rounded-xl border border-border p-4 shadow-xl w-64 z-50">
                  {user ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Signed in as</p>
                      <p className="text-sm font-medium truncate mb-4">{user.email}</p>
                      <button
                        onClick={() => { signOut(); setAuthOpen(false); }}
                        className="w-full flex items-center gap-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg px-3 py-2 transition"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium mb-1">Sign In</p>
                      {!isConfigured ? (
                        <p className="text-xs text-muted-foreground">Configure Supabase to enable accounts</p>
                      ) : sent ? (
                        <p className="text-xs text-success">✓ Magic link sent! Check your email.</p>
                      ) : (
                        <form onSubmit={handleSignIn} className="space-y-2">
                          <input
                            type="email" required value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          />
                          <Button type="submit" variant="hero" size="sm" className="w-full" disabled={sending}>
                            <LogIn className="h-4 w-4" />
                            {sending ? 'Sending…' : 'Send Magic Link'}
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="relative h-10 w-10 grid place-items-center rounded-lg glass hover:scale-105 transition-transform"
            >
              <Sun className={`h-5 w-5 absolute transition-all duration-500 text-warning ${theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`} />
              <Moon className={`h-5 w-5 absolute transition-all duration-500 text-primary ${theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"}`} />
            </button>
            <Button variant="hero" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to="/demo">Try Now</Link>
            </Button>
            <button className="md:hidden h-10 w-10 grid place-items-center rounded-lg glass" onClick={() => setOpen(v => !v)} aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden glass rounded-2xl mt-2 p-3 flex flex-col">
            {navLinks.map(l => (
              <Link key={l.href} to={l.href}
                onClick={(e) => {
                  setOpen(false);
                  if (l.href.startsWith("/#") && location.pathname === "/") {
                    e.preventDefault();
                    document.getElementById(l.href.substring(2))?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted flex items-center gap-2">
                {l.icon && <l.icon className="h-3.5 w-3.5" />}
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
};
