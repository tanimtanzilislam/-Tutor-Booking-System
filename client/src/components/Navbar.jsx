import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

function Avatar({ user, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (user.profileImage && !imageFailed) {
    return <img className={`avatar ${className}`} src={user.profileImage} alt="" onError={() => setImageFailed(true)} />;
  }
  return <span className={`avatar avatar-fallback ${className}`} aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>;
}

export default function Navbar() {
  const { user, signOut } = useAuth();
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
              <NavLink to="/add-tutor">Add Tutor</NavLink>
              <NavLink to="/my-tutors">My Tutors</NavLink>
              <NavLink to="/my-sessions">My Booked Sessions</NavLink>
            </>
          )}
        </div>
        <div className="nav-account">
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
