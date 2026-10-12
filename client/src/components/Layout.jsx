import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNotifications } from "../notifications/NotificationContext.jsx";
import Footer from "./Footer.jsx";
import Navbar from "./Navbar.jsx";
import RouteTitle from "./RouteTitle.jsx";
import useRevealObserver from "../hooks/useRevealObserver.js";

export default function Layout() {
  const { error } = useAuth();
  const { error: notificationError } = useNotifications();
  useRevealObserver();
  return (
    <>
      <RouteTitle />
      <Navbar />
      {error && <div className="status-banner shell" role="status">{error}</div>}
      {notificationError && <div className="status-banner shell" role="alert">{notificationError}</div>}
      <main><Outlet /></main>
      <Footer />
    </>
  );
}
