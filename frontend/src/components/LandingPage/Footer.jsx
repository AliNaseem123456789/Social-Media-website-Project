import { Link } from "react-router-dom";

// Every destination here is a page that exists. Nothing links to a section that has not been built.
const columns = [
  {
    title: "The product",
    links: [
      { label: "What it does", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Questions", href: "#faq" },
    ],
  },
  {
    title: "Get in",
    links: [
      { label: "Create an account", to: "/signup" },
      { label: "Log in", to: "/login" },
    ],
  },
  {
    title: "The rules",
    links: [
      { label: "Community guidelines", to: "/guidelines" },
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
          <div className="lp-footer__brand-col">
            <div className="lp-footer__brand">
              <span className="lp-nav__mark" />
              Circle
            </div>
            <p className="lp-footer__desc">
              A feed, a group chat and a call button, kept in one place and out of each other's way.
            </p>
          </div>

          {columns.map((col) => (
            <div className="lp-footer__col" key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to}>{link.label}</Link>
                    ) : (
                      <a href={link.href}>{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="lp-footer__bottom">
          <span>© {new Date().getFullYear()} Circle</span>
          <span>Built and run by one person.</span>
        </div>
      </div>
    </footer>
  );
}
