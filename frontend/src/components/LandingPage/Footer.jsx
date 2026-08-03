import { Github, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Careers", to: "/careers" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Community guidelines", to: "/guidelines" },
      { label: "Support", to: "/support" },
      { label: "Status", to: "/status" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div className="lp-footer__top">
          <div>
            <div className="lp-footer__brand">
              <span className="lp-nav__mark" />
              Circle
            </div>
            <p className="lp-footer__desc">
              A social platform built around the people you'd actually miss —
              not the ones an algorithm picked for you.
            </p>
            <div className="lp-footer__social">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <Github size={16} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <Twitter size={16} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div className="lp-footer__col" key={col.title}>
              <div className="lp-footer__col-title">{col.title}</div>
              <ul>
                {col.links.map((link) =>
                  link.to ? (
                    <li key={link.label}>
                      <Link to={link.to}>{link.label}</Link>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="lp-footer__bottom">
          <span>© 2026 Circle. All rights reserved.</span>
          <div className="lp-footer__bottom-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}