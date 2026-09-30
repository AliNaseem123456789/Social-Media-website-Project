import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

const LINKS = [
  { label: "What it does", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Questions", href: "#faq" },
];

export function LandingNav({ onLogin, onSignup }) {
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 180, damping: 30, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`lp-nav ${scrolled ? "lp-nav--scrolled" : ""}`}>
      <div className="lp-wrap lp-nav__inner">
        <a href="#top" className="lp-nav__brand">
          <span className="lp-nav__mark" />
          Circle
        </a>

        <nav className="lp-nav__links">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="lp-nav__actions">
          <button className="lp-btn lp-btn--ghost lp-btn--sm" onClick={onLogin}>
            Log in
          </button>
          <button className="lp-btn lp-btn--primary lp-btn--sm" onClick={onSignup}>
            Create account
          </button>
        </div>
      </div>

      {/* How far down the page you are, drawn along the bottom edge of the bar. */}
      <motion.span className="lp-nav__progress" style={{ scaleX: progress }} aria-hidden="true" />
    </header>
  );
}
