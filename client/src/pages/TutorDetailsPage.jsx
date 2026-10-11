import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ErrorMessage, Loading } from "../components/PageState.jsx";
import { availableStarts } from "../utils/availability.js";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TutorDetailsPage() {
  const { tutorId } = useParams();
  const { user } = useAuth();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api(`/tutors/${encodeURIComponent(tutorId)}`)
      .then(({ tutor: result }) => { if (active) setTutor(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [tutorId]);

  const choices = useMemo(() => tutor ? availableStarts(tutor) : [], [tutor]);

  async function bookSession(event) {
    event.preventDefault();
    setBookingError("");
    setSessionToken("");
    setSubmitting(true);
    try {
      const result = await api("/bookings", {
        method: "POST",
        body: JSON.stringify({ tutorId: tutor._id, startsAt })
      });
      setSessionToken(result.booking.sessionToken);
    } catch (requestError) {
      setBookingError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <section className="content-page shell"><Loading label="Loading tutor details..." /></section>;
  if (error) {
    return (
      <section className="content-page shell">
        <div className="empty-state">
          <span className="empty-icon">!</span>
          <h1>We couldn't load this tutor</h1>
          <ErrorMessage>{error}</ErrorMessage>
          <Link className="button button-dark" to="/tutors">Browse tutors</Link>
        </div>
      </section>
    );
  }
  if (!tutor) return null;

  return (
    <section className="tutor-details-page shell">
      <Link className="back-link" to="/tutors">← Back to tutors</Link>
      <div className="tutor-details-grid">
        <article className="tutor-detail-card">
          <div className="tutor-card-top">
            <span className="subject-pill">{tutor.subject}</span>
            <span className="tutor-rate">${tutor.hourlyRate}<small> / hour</small></span>
          </div>
          <p className="section-kicker detail-kicker">Meet your tutor</p>
          <h1>{tutor.name}</h1>
          <p className="tutor-detail-bio">{tutor.bio}</p>
          <div className="detail-facts">
            <div><span className="availability-dot" /><span>Weekly availability</span></div>
            <p>{tutor.timeZone}</p>
          </div>
          <section className="weekly-availability" aria-labelledby="weekly-heading">
            <h2 id="weekly-heading">Available each week</h2>
            {tutor.availability.map((window) => {
              return (
                <div className="weekly-window" key={window.dayOfWeek}>
                  <span>{weekdays[window.dayOfWeek]}</span>
                  <span>{window.startTime}–{window.endTime}</span>
                </div>
              );
            })}
          </section>
        </article>

        <aside className="session-booking-card">
          <p className="section-kicker">Make it official</p>
          <h2>Book a session</h2>
          <p className="booking-intro">Choose a one-hour time that works for you. Available times are shown in your local timezone.</p>
          <form className="booking-form detail-booking-form" onSubmit={bookSession}>
            <label htmlFor="session-time">Available sessions</label>
            {choices.length ? (
              <select id="session-time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required>
                <option value="">Choose a time</option>
                {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
            ) : (
              <p className="empty-slots">No upcoming sessions are available in the next three weeks.</p>
            )}
            {user ? (
              <button className="button button-dark button-full" type="submit" disabled={!startsAt || submitting || !choices.length}>
                {submitting ? "Booking..." : "Confirm booking"}
              </button>
            ) : (
              <Link className="button button-dark button-full" to="/login" state={{ from: `/tutors/${tutor._id}` }}>
                Log in to book
              </Link>
            )}
            <ErrorMessage>{bookingError}</ErrorMessage>
            {sessionToken && (
              <p className="form-success" role="status">
                Session booked. Your token is <code className="inline-token">{sessionToken}</code>.{" "}
                <Link to="/my-sessions">View sessions</Link>
              </p>
            )}
          </form>
        </aside>
      </div>
    </section>
  );
}
