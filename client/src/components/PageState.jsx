export function ErrorMessage({ children }) {
  return children ? <p className="form-error" role="alert">{children}</p> : null;
}

export function Loading({ label = "Loading..." }) {
  return <p className="loading-state" role="status">{label}</p>;
}
