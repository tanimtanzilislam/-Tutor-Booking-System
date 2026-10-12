export function ErrorMessage({ children }) {
  return children ? <p className="form-error" role="alert">{children}</p> : null;
}

export function Loading({ label = "Loading..." }) {
  return <div className="loading-state" role="status"><span className="loading-spinner" aria-hidden="true" />{label}</div>;
}
