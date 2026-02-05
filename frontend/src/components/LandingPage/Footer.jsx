import { Github, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom"; // Import Link from react-router-dom

export function Footer() {
  return (
    <footer className="footer bg-white py-12 px-6 border-t border-slate-100 flex flex-col items-center gap-6">
      <p className="text-slate-500 text-sm">© 2026 YourAppName</p>

      {/* Internal Links use 'Link to' */}
      <div className="footer-links flex gap-6 text-sm font-medium text-slate-600">
        <Link to="/about" className="hover:text-[#CE978C] transition-colors">
          About
        </Link>
        <Link to="/contact" className="hover:text-[#CE978C] transition-colors">
          Contact
        </Link>
        <Link to="/privacy" className="hover:text-[#CE978C] transition-colors">
          Privacy
        </Link>
        <Link to="/terms" className="hover:text-[#CE978C] transition-colors">
          Terms
        </Link>
      </div>

      {/* External Links MUST still use <a> with href */}
      <div className="footer-icons flex gap-5 text-slate-400">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-black transition-colors"
        >
          <Github size={20} />
        </a>
        <a
          href="https://twitter.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-400 transition-colors"
        >
          <Twitter size={20} />
        </a>
        <a
          href="https://linkedin.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-700 transition-colors"
        >
          <Linkedin size={20} />
        </a>
      </div>
    </footer>
  );
}
