import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, api } from "../api.js";

const AuthContext = createContext(null);

function storedUser() {
  try {
    return JSON.parse(localStorage.getItem("mediqueue-user") || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("mediqueue-token")));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("mediqueue-token")) return;
    api("/auth/me")
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        localStorage.setItem("mediqueue-user", JSON.stringify(currentUser));
      })
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.status === 401) {
          localStorage.removeItem("mediqueue-token");
          localStorage.removeItem("mediqueue-user");
          setUser(null);
          return;
        }
        setError(requestError.message);
      })
      .finally(() => setLoading(false));
  }, []);

  async function signIn(path, values) {
    const result = await api(path, { method: "POST", body: JSON.stringify(values) });
    localStorage.setItem("mediqueue-token", result.token);
    localStorage.setItem("mediqueue-user", JSON.stringify(result.user));
    setUser(result.user);
    setError("");
    return result.user;
  }

  function signOut() {
    localStorage.removeItem("mediqueue-token");
    localStorage.removeItem("mediqueue-user");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, error, signIn, signOut }),
    [user, loading, error]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
