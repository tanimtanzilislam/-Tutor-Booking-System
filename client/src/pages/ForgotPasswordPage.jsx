import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ErrorMessage } from "../components/PageState.jsx";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-section shell auth-single">
      <div className="auth-card">
        <p className="section-kicker">Account recovery</p>
        <h1>Forgot password?</h1>
        <p className="auth-description">Enter the email address connected to your account. If it exists, we’ll send a password reset link.</p>
        <form onSubmit={submit}>
          <label>Email address<input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <ErrorMessage>{error}</ErrorMessage>
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="button button-dark button-full" type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send reset link"}</button>
        </form>
        <p className="auth-switch"><Link to="/login">Back to login</Link></p>
      </div>
    </section>
  );
}
