import { Link } from "react-router-dom";

export default function TutorCard({ tutor }) {
  return (
    <article className="tutor-card">
      <div className="tutor-card-profile">
        {tutor.photoUrl ? <img className="tutor-card-photo" src={tutor.photoUrl} alt={`${tutor.name} profile`} loading="lazy" /> : <div className="tutor-card-photo tutor-card-photo-fallback" aria-hidden="true">{tutor.name.slice(0, 1)}</div>}
        <div>
          <span className="subject-pill">{tutor.subject}</span>
          <h2>{tutor.name}</h2>
          {tutor.institution && <p className="tutor-institution">{tutor.institution}</p>}
        </div>
      </div>
      <div className="tutor-card-top tutor-card-price">
        <span className="tutor-experience">{tutor.experience !== undefined ? `${tutor.experience} years experience` : ""}</span>
        <span className="tutor-rate">${tutor.hourlyRate}<small> / hour</small></span>
      </div>
      <p className="tutor-bio">{[tutor.location, tutor.teachingMode].filter(Boolean).join(" · ") || tutor.bio}</p>
      <div className="availability-caption">
        <span className="availability-dot" />
        {Number(tutor.totalSlots) > 0 ? `${tutor.totalSlots} booking slots remaining` : "Fully booked"} · {tutor.timeZone}
      </div>
      <Link className="button button-dark button-full tutor-card-action" to={`/tutors/${tutor._id}`}>
        Book Session
      </Link>
    </article>
  );
}
