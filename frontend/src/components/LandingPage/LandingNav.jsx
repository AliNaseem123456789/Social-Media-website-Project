import { useEffect, useState } from "react";

export function LandingNav({ onLogin, onSignup }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
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
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="lp-nav__actions">
          <button className="lp-btn lp-btn--ghost lp-btn--sm" onClick={onLogin}>
            Log in
          </button>
          <button className="lp-btn lp-btn--primary lp-btn--sm" onClick={onSignup}>
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}