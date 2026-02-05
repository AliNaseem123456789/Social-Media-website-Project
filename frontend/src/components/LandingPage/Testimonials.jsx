export function Testimonials() {
  return (
    <section className="testimonials">
      <h2>Loved by Communities</h2>

      <div className="testimonial-grid">
        {[
          "Amazing experience!",
          "Best social platform!",
          "Feels like home ",
        ].map((quote, i) => (
          <div key={i} className="testimonial-card">
            <p>“{quote}”</p>
            <span>— Community Member</span>
          </div>
        ))}
      </div>

      <p className="metrics">50+ communities • 1000+ posts shared daily</p>
    </section>
  );
}
