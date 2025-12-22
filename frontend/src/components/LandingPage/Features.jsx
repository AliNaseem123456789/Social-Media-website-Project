import {
  MessageCircle,
  Users,
  Sparkles,
  Shield,
  Image,
  Calendar,
} from "lucide-react";

const features = [
  { icon: MessageCircle, title: "Real-time Chat", desc: "Private & group messaging" },
  { icon: Users, title: "Community Groups", desc: "Join or create groups" },
  { icon: Sparkles, title: "Personalized Feed", desc: "AI-based content recommendations" },
  { icon: Shield, title: "Privacy & Security", desc: "Data protection & encryption" },
  { icon: Image, title: "Media Sharing", desc: "Photos, videos & links" },
  { icon: Calendar, title: "Events & Activities", desc: "Host or join events" },
];

export function Features() {
  return (
    <section className="features">
      <h2>Features</h2>

      <div className="feature-grid">
        {features.map((f, i) => (
          <div key={i} className="feature-card">
            <f.icon className="feature-icon" />
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
