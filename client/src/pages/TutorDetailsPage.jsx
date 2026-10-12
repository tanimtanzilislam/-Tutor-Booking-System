import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ErrorMessage, Loading } from "../components/PageState.jsx";
import { useToast } from "../components/ToastContext.jsx";
import { availableStarts } from "../utils/availability.js";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TutorDetailsPage() {
  const { tutorId } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
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
  const remainingSlots = tutor && Number.isInteger(tutor.totalSlots) ? tutor.totalSlots : 0;
  const sessionNotStarted = Boolean(
    tutor?.sessionStartDate &&
    DateTime.now().setZone(tutor.timeZone).toISODate() < tutor.sessionStartDate
  );
  const bookingUnavailableMessage = remainingSlots <= 0
    ? "No available slots left. This session is fully booked. You can’t join at the moment."
    : sessionNotStarted
      ? "Booking is not available yet for this tutor."
      : "";

  async function bookSession(event) {
    event.preventDefault();
    setBookingError("");
    setSessionToken("");
    setBookingStatus("");
    setSubmitting(true);
    try {
      const result = await api("/bookings", {
        method: "POST",
        body: JSON.stringify({ tutorId: tutor._id, startsAt, phone })
      });
      setSessionToken(result.booking.sessionToken);
      setBookingStatus(result.booking.status);
      setStartsAt("");
      setTutor((current) => ({ ...current, totalSlots: result.booking.tutor.totalSlots }));
      notify("Your session has been booked.");
    } catch (requestError) {
      setBookingError(requestError.message);
      notify(requestError.message, "error");
      if (requestError.message === "No available slots left.") {
        setTutor((current) => ({ ...current, totalSlots: 0 }));
      }
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
          {tutor.photoUrl && <img className="tutor-detail-photo" src={tutor.photoUrl} alt={`${tutor.name} profile`} />}
          <p className="section-kicker detail-kicker">Meet your tutor</p>
          <h1>{tutor.name}</h1>
          <div className="tutor-profile-facts">
            <p><span>Institution</span>{tutor.institution}</p>
            <p><span>Experience</span>{tutor.experience} years</p>
            <p><span>Location</span>{tutor.location}</p>
            <p><span>Teaching mode</span>{tutor.teachingMode}</p>
            <p><span>Session start date</span>{tutor.sessionStartDate || "Available now"}</p>
            <p><span>Booking slots remaining</span>{remainingSlots}</p>
          </div>
          {tutor.bio && <p className="tutor-detail-bio">{tutor.bio}</p>}
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
          <p className="booking-intro">Choose one of the tutor’s one-hour sessions. Available times are shown in your local timezone.</p>
          <form className="booking-form detail-booking-form" onSubmit={bookSession}>
            <label htmlFor="student-name">Student name</label>
            <input id="student-name" value={user?.name || ""} readOnly />
            <label htmlFor="student-phone">Phone</label>
            <input id="student-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={7} maxLength={20} pattern="[+()0-9][+()0-9 .-]{5,19}" title="Enter a valid phone number with at least 7 digits." />
            <label htmlFor="tutor-id">Tutor ID</label>
            <input id="tutor-id" value={tutor._id} readOnly />
            <label htmlFor="tutor-name">Tutor name</label>
            <input id="tutor-name" value={tutor.name} readOnly />
            <label htmlFor="student-email">Student email</label>
            <input id="student-email" type="email" value={user?.email || ""} readOnly />
            {bookingUnavailableMessage ? (
              <p className="empty-slots" role="status">{bookingUnavailableMessage}</p>
            ) : choices.length ? (
              <>
                <label htmlFor="session-time">Available sessions</label>
                <select id="session-time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required>
                  <option value="">Choose a time</option>
                  {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                </select>
              </>
            ) : (
              <p className="empty-slots">No upcoming sessions are available in the next three weeks.</p>
            )}
            <button className="button button-dark button-full" type="submit" disabled={!user || !startsAt || !phone || submitting || !choices.length || Boolean(bookingUnavailableMessage)}>
              {submitting ? "Booking..." : "Confirm booking"}
            </button>
            {!user && (
              <Link className="button button-dark button-full" to="/login" state={{ from: `/tutors/${tutor._id}` }}>
                Log in to book
              </Link>
            )}
            <ErrorMessage>{bookingError}</ErrorMessage>
            {sessionToken && (
              <p className="form-success" role="status">
                Session booked. Status: {bookingStatus}. Your token is <code className="inline-token">{sessionToken}</code>.{" "}
                <Link to="/my-sessions">View sessions</Link>
              </p>
            )}
            {sessionToken && remainingSlots === 0 && (
              <p className="empty-slots" role="status">This session is fully booked. You can’t join at the moment.</p>
            )}
          </form>
        </aside>
      </div>
    </section>
  );
}
