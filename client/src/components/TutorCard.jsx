import { useState } from "react";
import { Link } from "react-router-dom";

export default function TutorCard({ tutor }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="tutor-card" data-reveal>
      <div className="tutor-card-image-wrap">
        {tutor.photoUrl && !imageFailed
          ? <img className="tutor-card-photo" src={tutor.photoUrl} alt={`${tutor.name} profile`} loading="lazy" onError={() => setImageFailed(true)} />
          : <div className="tutor-card-photo tutor-card-photo-fallback" aria-hidden="true">{tutor.name.slice(0, 1).toUpperCase()}</div>}
        <span className="subject-pill">{tutor.subject}</span>
      </div>
      <div className="tutor-card-content">
        <div className="tutor-card-heading">
          <div>
          <h2>{tutor.name}</h2>
          {tutor.institution && <p className="tutor-institution">{tutor.institution}</p>}
          </div>
          <span className="tutor-rate">${tutor.hourlyRate}<small> / hour</small></span>
        </div>
        <p className="tutor-card-facts">
          {tutor.experience !== undefined && <span>{tutor.experience} years experience</span>}
          {tutor.location && <span>{tutor.location}</span>}
          {tutor.teachingMode && <span>{tutor.teachingMode}</span>}
        </p>
        <div className="availability-caption">
          <span className="availability-dot" />
          {Number(tutor.totalSlots) > 0 ? `${tutor.totalSlots} booking slots remaining` : "Fully booked"}
        </div>
        <Link className="button button-dark button-full tutor-card-action" to={`/tutors/${tutor._id}`}>
          Book Session <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}
