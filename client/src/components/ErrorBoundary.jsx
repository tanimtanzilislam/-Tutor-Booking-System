import { Component } from "react";
import { useLocation } from "react-router-dom";
import ErrorPage from "../pages/ErrorPage.jsx";

class ErrorBoundaryContent extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <ErrorPage />;
    return this.props.children;
  }
}

export default function ErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundaryContent key={pathname}>{children}</ErrorBoundaryContent>;
}
