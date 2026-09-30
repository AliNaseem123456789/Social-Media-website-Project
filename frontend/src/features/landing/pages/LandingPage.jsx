import { useNavigate } from "react-router-dom";
import "../../../components/LandingPage/landing.css";
import { LandingNav } from "../../../components/LandingPage/LandingNav";
import { Hero } from "../../../components/LandingPage/Hero";
import { CapabilityBand } from "../../../components/LandingPage/CapabilityBand";
import { GraphSection } from "../../../components/LandingPage/GraphSection";
import { Features } from "../../../components/LandingPage/Features";
import { HowItWorks } from "../../../components/LandingPage/HowItWorks";
import { FAQ } from "../../../components/LandingPage/FAQ";
import { CTA } from "../../../components/LandingPage/CTA";
import { Footer } from "../../../components/LandingPage/Footer";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

export default function LandingPage() {
  const navigate = useNavigate();
  const onLogin = () => navigate("/login");
  const onSignup = () => navigate("/signup");
  useDocumentTitle("");

  return (
    <div className="lp-page">
      <LandingNav onLogin={onLogin} onSignup={onSignup} />
      <Hero onLogin={onLogin} onSignup={onSignup} />
      <CapabilityBand />
      <Features />
      <GraphSection />
      <HowItWorks />
      <FAQ />
      <CTA onLogin={onLogin} onSignup={onSignup} />
      <Footer />
    </div>
  );
}
