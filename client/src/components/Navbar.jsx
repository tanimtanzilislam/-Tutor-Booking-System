import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNotifications } from "../notifications/NotificationContext.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";

function Avatar({ user, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (user.profileImage && !imageFailed) {
    return <img className={`avatar ${className}`} src={user.profileImage} alt="" onError={() => setImageFailed(true)} />;
  }
  return <span className={`avatar avatar-fallback ${className}`} aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>;
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  function logout() {
    signOut();
    navigate("/");
  }

  return (
    <header className="site-header">
      <nav className="navbar shell" aria-label="Main navigation">
        <Link className="brand" to="/" aria-label="MediQueue home">
          <span className="brand-mark">M</span>
          <span>Medi<span>Queue</span></span>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/tutors">Tutors</NavLink>
          {user && (
            <>
              {user.role === "tutor" && (
                <>
                  <NavLink to="/add-tutor">Create Tutor Profile</NavLink>
                  <NavLink to="/my-tutors">My Tutor Profile</NavLink>
                  <NavLink className="notification-nav-link" to="/notifications">
                    Notifications
                    {unreadCount > 0 && <span className="notification-badge" aria-label={`${unreadCount} unread`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
                  </NavLink>
                </>
              )}
              {user.role === "student" && <NavLink to="/my-sessions">My Booked Sessions</NavLink>}
            </>
          )}
        </div>
        <div className="nav-account">
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            aria-pressed={theme === "dark"}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            <span className="theme-toggle-label">{theme === "light" ? "Dark" : "Light"}</span>
          </button>
          {user ? (
            <details className="profile-menu">
              <summary aria-label="Open profile menu">
                <Avatar user={user} />
                <span className="profile-name">{user.name}</span>
                <span className="chevron" aria-hidden="true">⌄</span>
              </summary>
              <div className="profile-dropdown">
                <Link to="/profile">My profile</Link>
                <button type="button" onClick={logout}>Log out</button>
              </div>
            </details>
          ) : (
            <Link className="button button-small" to="/login">Login / Register</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
