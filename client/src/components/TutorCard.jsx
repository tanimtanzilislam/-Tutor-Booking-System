import { Link } from "react-router-dom";

export default function TutorCard({ tutor }) {
  return (
    <article className="tutor-card">
      <div className="tutor-card-top">
        <span className="subject-pill">{tutor.subject}</span>
        <span className="tutor-rate">${tutor.hourlyRate}<small> / hour</small></span>
      </div>
      <h2>{tutor.name}</h2>
      <p className="tutor-bio">{tutor.bio}</p>
      <div className="availability-caption">
        <span className="availability-dot" />
        Weekly availability · {tutor.timeZone}
      </div>
      <Link className="button button-dark button-full tutor-card-action" to={`/tutors/${tutor._id}`}>
        Book Session
      </Link>
    </article>
  );
}
