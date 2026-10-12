import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-about">
          <Link className="brand footer-brand" to="/">
            <span className="brand-mark">M</span>
            <span>Medi<span>Queue</span></span>
          </Link>
          <p>Make room for a little more learning.</p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link to="/tutors">Find a tutor</Link>
          <Link to="/#how-it-works">How it works</Link>
        </div>
        <div>
          <h2>Contact</h2>
          <p>Questions about getting started?</p>
          <a href="mailto:hello@example.com">hello@example.com</a>
        </div>
        <div>
          <h2>Follow along</h2>
          <div className="social-placeholder">
            <span className="social-x-mark" aria-label="X">𝕏</span>
            <span>Social links coming soon</span>
          </div>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} MediQueue</span>
        <span>Learning, one session at a time.</span>
      </div>
    </footer>
  );
}
