import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Footer from "./Footer.jsx";
import Navbar from "./Navbar.jsx";
import RouteTitle from "./RouteTitle.jsx";
import useRevealObserver from "../hooks/useRevealObserver.js";

export default function Layout() {
  const { error } = useAuth();
  useRevealObserver();
  return (
    <>
      <RouteTitle />
      <Navbar />
      {error && <div className="status-banner shell" role="status">{error}</div>}
      <main><Outlet /></main>
      <Footer />
    </>
  );
}
