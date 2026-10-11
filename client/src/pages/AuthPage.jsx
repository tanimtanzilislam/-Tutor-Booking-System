import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { ErrorMessage } from "../components/PageState.jsx";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ name: "", email: "", password: "", profileImage: "" });
  const [error, setError] = useState(() => (
    new URLSearchParams(window.location.search).get("google") === "failed"
      ? "Google sign-in could not be completed. Please try again or log in with your email."
      : ""
  ));
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={location.state?.from || "/"} replace />;

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function continueWithGoogle() {
    const returnTo = location.state?.from || "/";
    window.location.assign(`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`);
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await signIn(isRegister ? "/auth/register" : "/auth/login", values);
      navigate(location.state?.from || "/", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-section shell">
      <div className="auth-aside">
        <p className="eyebrow">Welcome to MediQueue</p>
        <h1>{isRegister ? "Start your learning journey." : "Good to see you again."}</h1>
        <p>Thoughtful tutoring, and a simpler way to find time for it.</p>
        <div className="auth-aside-note"><span>✳</span><p>Come as you are. Leave with a clearer next step.</p></div>
      </div>
      <div className="auth-card">
        <p className="section-kicker">{isRegister ? "Create your account" : "Your account"}</p>
        <h2>{isRegister ? "Join MediQueue" : "Login"}</h2>
        <form onSubmit={submit}>
          {isRegister && (
            <label>Full name<input name="name" value={values.name} onChange={update} autoComplete="name" required maxLength={80} /></label>
          )}
          <label>Email address<input name="email" type="email" value={values.email} onChange={update} autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" value={values.password} onChange={update} autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : undefined} required /></label>
          {!isRegister && <Link className="forgot-password-link" to="/forgot-password">Forgot password?</Link>}
          {isRegister && (
            <label>Profile image URL <span className="optional">(optional)</span><input name="profileImage" type="url" value={values.profileImage} onChange={update} placeholder="https://" /></label>
          )}
          <ErrorMessage>{error}</ErrorMessage>
          <button className="button button-dark button-full" type="submit" disabled={submitting}>{submitting ? "Please wait..." : isRegister ? "Create account" : "Log in"}</button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <button className="google-login-button" type="button" onClick={continueWithGoogle}>
          <span className="google-mark" aria-hidden="true">G</span>
          Continue with Google
        </button>
        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to MediQueue?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Log in" : "Create an account"}</Link>
        </p>
      </div>
    </section>
  );
}
