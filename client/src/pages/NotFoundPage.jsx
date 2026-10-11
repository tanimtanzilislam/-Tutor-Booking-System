import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return <section className="empty-state shell not-found"><span className="empty-icon">404</span><h1>That page wandered off.</h1><p>The address may have changed, or the page may not exist.</p><Link className="button button-dark" to="/">Back to home</Link></section>;
}
