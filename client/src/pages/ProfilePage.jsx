import { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";

export default function ProfilePage() {
  const { user } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <section className="content-page shell">
      <div className="page-heading compact-heading" data-reveal><p className="section-kicker">Your account</p><h1>My profile</h1><p>Your MediQueue account information.</p></div>
      <article className="profile-card" data-reveal>
        {user.profileImage && !imageFailed ? <img className="profile-large-avatar" src={user.profileImage} alt="" onError={() => setImageFailed(true)} /> : <div className="profile-large-avatar profile-avatar-fallback" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</div>}
        <div><span className="section-kicker">{user.role === "tutor" ? "Tutor" : "Student"}</span><h2>{user.name}</h2><p>{user.email}</p></div>
      </article>
    </section>
  );
}
