import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ErrorMessage } from "../components/PageState.jsx";
import { useToast } from "../components/ToastContext.jsx";

function passwordValidationError(password) {
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  return "";
}

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { user, signIn } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ name: "", email: "", password: "", profileImage: "" });
  const [error, setError] = useState(() => (
    new URLSearchParams(window.location.search).get("google") === "failed"
      ? "Google sign-in could not be completed. Please try again or log in with your email."
      : ""
  ));
  const [passwordError, setPasswordError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={location.state?.from || "/"} replace />;

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
    if (event.target.name === "password" && isRegister) {
      setPasswordError(passwordValidationError(event.target.value));
    }
  }

  function continueWithGoogle() {
    const returnTo = location.state?.from || "/";
    window.location.assign(`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (isRegister) {
      const validationError = passwordValidationError(values.password);
      setPasswordError(validationError);
      if (validationError) return;
    }
    if (!event.currentTarget.reportValidity()) return;

    setSubmitting(true);
    try {
      if (isRegister) {
        await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: values.name,
            email: values.email,
            profileImage: values.profileImage,
            password: values.password
          })
        });
        notify("Your account is ready. Log in to continue.");
        navigate("/login", { replace: true });
      } else {
        await signIn("/auth/login", values);
        navigate(location.state?.from || "/", { replace: true });
      }
    } catch (requestError) {
      setError(requestError.message);
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-section shell">
      <div className="auth-aside" data-reveal>
        <p className="eyebrow">Welcome to MediQueue</p>
        <h1>{isRegister ? "Start your learning journey." : "Good to see you again."}</h1>
        <p>Thoughtful tutoring, and a simpler way to find time for it.</p>
        <div className="auth-aside-note"><span>✳</span><p>Come as you are. Leave with a clearer next step.</p></div>
      </div>
      <div className="auth-card" data-reveal>
        <p className="section-kicker">{isRegister ? "Create your account" : "Your account"}</p>
        <h2>{isRegister ? "Register" : "Login"}</h2>
        {!isRegister && location.state?.notice && <p className="form-success" role="status">{location.state.notice}</p>}
        <form onSubmit={submit} noValidate>
          {isRegister && (
            <label>Name<input name="name" value={values.name} onChange={update} autoComplete="name" required maxLength={80} /></label>
          )}
          <label>Email address<input name="email" type="email" value={values.email} onChange={update} autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" value={values.password} onChange={update} autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 6 : undefined} required /></label>
          {isRegister && (
            <>
              <p className="password-hint">At least 6 characters, including an uppercase and a lowercase letter.</p>
              <ErrorMessage>{passwordError}</ErrorMessage>
            </>
          )}
          {isRegister && (
            <label>Photo URL<input name="profileImage" type="url" value={values.profileImage} onChange={update} autoComplete="url" placeholder="https://" required /></label>
          )}
          <ErrorMessage>{error}</ErrorMessage>
          <button className="button button-dark button-full" type="submit" disabled={submitting}>
            {submitting ? (isRegister ? "Registering..." : "Please wait...") : isRegister ? "Register" : "Log in"}
          </button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <button className="google-login-button" type="button" onClick={continueWithGoogle}>
          <span className="google-mark" aria-hidden="true">G</span>
          Continue with Google
        </button>
        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to MediQueue?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Login" : "Register"}</Link>
        </p>
      </div>
    </section>
  );
}
