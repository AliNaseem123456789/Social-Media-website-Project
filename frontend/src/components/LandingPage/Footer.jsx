import { Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="footer">
      <p>© 2025 YourAppName</p>

      <div className="footer-links">
        <a href="#">About</a>
        <a href="#">Contact</a>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
      </div>

      <div className="footer-icons">
        <Github />
        <Twitter />
        <Linkedin />
      </div>
    </footer>
  );
} 
