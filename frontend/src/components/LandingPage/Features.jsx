import {
  MessageCircle,
  Users,
  Sparkles,
  ShieldCheck,
  Images,
  CalendarHeart,
} from "lucide-react";

export function Features() {
  return (
    <section className="lp-section-pad" id="features">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div className="lp-section-head__copy">
            <span className="lp-eyebrow">What you get</span>
            <h2 className="lp-h2">Built for the way people actually talk</h2>
            <p className="lp-lede">
              Not another feed to scroll past. Circle bundles the parts of a
              social platform that people keep coming back for, and leaves
              out the parts that make them leave.
            </p>
          </div>
        </div>

        <div className="lp-features__grid">
          <div className="lp-feature-card lp-feature-card--wide lp-feature-card--accent">
            <div className="lp-feature-card__icon">
              <MessageCircle size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="lp-feature-card__title">Real-time conversations</h3>
              <p className="lp-feature-card__desc">
                Private and group chat with live typing indicators, read
                presence, and one-tap video calls when text isn't enough.
              </p>
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-card__icon">
              <Users size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="lp-feature-card__title">Communities & groups</h3>
              <p className="lp-feature-card__desc">
                Start or join circles around what you actually care about —
                run by members, not algorithms.
              </p>
            </div>
          </div>

          <div className="lp-feature-card lp-feature-card--tall">
            <div className="lp-feature-card__icon">
              <Sparkles size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="lp-feature-card__title">An assistant that knows the room</h3>
              <p className="lp-feature-card__desc">
                Circle's built-in co-pilot suggests who to reconnect with,
                what to post, and which conversations deserve a reply —
                you stay in control of every send.
              </p>
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-card__icon">
              <ShieldCheck size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="lp-feature-card__title">Privacy by default</h3>
              <p className="lp-feature-card__desc">
                Session-based sign-in and clear controls over exactly who
                sees what you share.
              </p>
            </div>
          </div>

          <div className="lp-feature-card lp-feature-card--wide">
            <div className="lp-feature-card__icon">
              <Images size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="lp-feature-card__title">Media that keeps its quality</h3>
              <p className="lp-feature-card__desc">
                Share photos and video in a feed that adapts to what you
                engage with, ordered by relevance instead of just recency.
              </p>
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-card__icon">
              <CalendarHeart size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="lp-feature-card__title">Moments worth keeping</h3>
              <p className="lp-feature-card__desc">
                Birthday reminders and group events, surfaced before you'd
                otherwise notice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}