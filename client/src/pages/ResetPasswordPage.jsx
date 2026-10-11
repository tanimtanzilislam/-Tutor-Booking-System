import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { ErrorMessage } from "../components/PageState.jsx";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, token, password })
      });
      setMessage(result.message);
      setPassword("");
      setConfirmation("");
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
        <h1>Set a new password</h1>
        <p className="auth-description">Choose a new password with at least 8 characters.</p>
        <form onSubmit={submit}>
          <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
          <label>Confirm new password<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
          <ErrorMessage>{error}</ErrorMessage>
          {message && <p className="form-success" role="status">{message} <Link to="/login">Log in</Link></p>}
          <button className="button button-dark button-full" type="submit" disabled={submitting || !token || !email}>{submitting ? "Updating..." : "Reset password"}</button>
          {(!token || !email) && <ErrorMessage>This reset link is incomplete. Request a new one.</ErrorMessage>}
        </form>
        <p className="auth-switch"><Link to="/login">Back to login</Link></p>
      </div>
    </section>
  );
}
