import { Link } from "react-router-dom";

export default function ErrorPage() {
  return (
    <section className="empty-state shell not-found" role="alert">
      <span className="empty-icon">!</span>
      <h1>Something went wrong.</h1>
      <p>We couldn’t complete that action. Please try again or return to the home page.</p>
      <Link className="button button-dark" to="/">Back to home</Link>
    </section>
  );
}
