import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { ErrorMessage, Loading } from "../components/PageState.jsx";

function safeReturnTo(path) {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/";
}

export default function GoogleCallbackPage() {
  const { completeGoogleSignIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const parameters = new URLSearchParams(window.location.hash.slice(1));
    const token = parameters.get("token");
    const returnTo = safeReturnTo(parameters.get("returnTo") || "/");
    const googleError = parameters.get("google_error") || new URLSearchParams(window.location.search).get("google_error");

    if (googleError) {
      window.history.replaceState(null, "", window.location.pathname);
      setError(
        googleError === "not_configured"
          ? "Google sign-in is not configured yet. Please use email login or try again later."
          : "Google sign-in could not be completed. Please try again or log in with your email."
      );
      return;
    }
    if (!token) {
      setError("Google sign-in did not return a valid session. Please try again.");
      return;
    }

    window.history.replaceState(null, "", window.location.pathname);
    completeGoogleSignIn(token)
      .then(() => navigate(returnTo, { replace: true }))
      .catch((requestError) => setError(requestError.message));
  }, [completeGoogleSignIn, navigate]);

  if (error) {
    return (
      <section className="auth-section shell">
        <div className="auth-card callback-error-card">
          <p className="section-kicker">Google sign-in</p>
          <h1>Sign-in didn’t finish</h1>
          <ErrorMessage>{error}</ErrorMessage>
          <Link className="button button-dark" to="/login">Back to login</Link>
        </div>
      </section>
    );
  }

  return <section className="content-page shell"><Loading label="Finishing Google sign-in..." /></section>;
}
