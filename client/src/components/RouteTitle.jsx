import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const routeTitles = {
  "/": "Home",
  "/tutors": "Tutors",
  "/add-tutor": "Add Tutor",
  "/my-tutors": "My Tutors",
  "/my-sessions": "My Booked Sessions",
  "/profile": "Profile",
  "/login": "Login",
  "/register": "Register",
  "/auth/callback": "Signing In",
  "/error": "Error"
};

export default function RouteTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = routeTitles[pathname] || (
      /^\/tutors\/[^/]+$/.test(pathname) ? "Tutor Details" : "Page Not Found"
    );
    document.title = `${title} | MediQueue`;
  }, [pathname]);

  return null;
}
