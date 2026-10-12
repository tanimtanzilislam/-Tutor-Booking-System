import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import { Loading } from "./components/PageState.jsx";
import AddTutorPage from "./pages/AddTutorPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ErrorPage from "./pages/ErrorPage.jsx";
import GoogleCallbackPage from "./pages/GoogleCallbackPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import MySessionsPage from "./pages/MySessionsPage.jsx";
import MyTutorsPage from "./pages/MyTutorsPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import TutorDetailsPage from "./pages/TutorDetailsPage.jsx";
import TutorsPage from "./pages/TutorsPage.jsx";

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Restoring your session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { loading } = useAuth();
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="tutors" element={<TutorsPage />} />
        <Route path="tutors/:tutorId" element={<TutorDetailsPage />} />
        <Route path="login" element={loading ? <Loading label="Restoring your session..." /> : <AuthPage mode="login" />} />
        <Route path="register" element={loading ? <Loading label="Restoring your session..." /> : <AuthPage mode="register" />} />
        <Route path="auth/callback" element={<GoogleCallbackPage />} />
        <Route path="add-tutor" element={<Protected role="tutor"><AddTutorPage /></Protected>} />
        <Route path="my-tutors" element={<Protected role="tutor"><MyTutorsPage /></Protected>} />
        <Route path="notifications" element={<Protected role="tutor"><NotificationsPage /></Protected>} />
        <Route path="my-sessions" element={<Protected role="student"><MySessionsPage /></Protected>} />
        <Route path="profile" element={<Protected><ProfilePage /></Protected>} />
        <Route path="error" element={<ErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
