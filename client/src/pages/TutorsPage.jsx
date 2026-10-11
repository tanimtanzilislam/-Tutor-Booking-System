import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ErrorMessage, Loading } from "../components/PageState.jsx";

function availableStarts(tutor) {
  const now = DateTime.now();
  const tutorNow = now.setZone(tutor.timeZone);
  const choices = [];
  for (let offset = 0; offset < 21; offset += 1) {
    const day = tutorNow.plus({ days: offset });
    const weekday = day.weekday % 7;
    const availability = tutor.availability.find((window) => window.dayOfWeek === weekday);
    if (!availability) continue;

    const startMinute = Number(availability.startTime.slice(0, 2)) * 60 + Number(availability.startTime.slice(3));
    const endMinute = Number(availability.endTime.slice(0, 2)) * 60 + Number(availability.endTime.slice(3));
    const startHour = Math.ceil(startMinute / 60);
    const endHourExclusive = Math.floor(endMinute / 60);
    for (let hour = startHour; hour < endHourExclusive; hour += 1) {
      const tutorLocalStart = DateTime.fromObject(
        { year: day.year, month: day.month, day: day.day, hour },
        { zone: tutor.timeZone }
      );
      if (!tutorLocalStart.isValid || tutorLocalStart <= now) continue;
      const studentLocalStart = tutorLocalStart.toLocal();
      choices.push({
        value: tutorLocalStart.toUTC().toISO(),
        label: studentLocalStart.toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY)
      });
    }
  }
  return choices;
}

function TutorCard({ tutor, user }) {
  const [startsAt, setStartsAt] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const choices = useMemo(() => availableStarts(tutor), [tutor]);

  async function book(event) {
    event.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const result = await api("/bookings", {
        method: "POST",
        body: JSON.stringify({ tutorId: tutor._id, startsAt })
      });
      setSuccess(`Booked! Your session token is ${result.booking.sessionToken}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="tutor-card">
      <div className="tutor-card-top"><span className="subject-pill">{tutor.subject}</span><span className="tutor-rate">${tutor.hourlyRate}<small> / hour</small></span></div>
      <h2>{tutor.name}</h2>
      <p className="tutor-bio">{tutor.bio}</p>
      <div className="availability-caption"><span className="availability-dot" />Weekly availability · {tutor.timeZone}</div>
      <form className="booking-form" onSubmit={book}>
        <label htmlFor={`slot-${tutor._id}`}>Available sessions <span>(your local time)</span></label>
        {choices.length ? (
          <select id={`slot-${tutor._id}`} value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required>
            <option value="">Choose a one-hour session</option>
            {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
        ) : <p className="empty-slots">No upcoming sessions are available in the next three weeks.</p>}
        {!user ? (
          <Link className="button button-dark button-full" to="/login" state={{ from: location.pathname }}>Log in to book</Link>
        ) : (
          <button className="button button-dark button-full" type="submit" disabled={!startsAt || submitting || !choices.length}>
            {submitting ? "Booking..." : "Book this session"}
          </button>
        )}
        <ErrorMessage>{error}</ErrorMessage>
        {success && <p className="form-success" role="status">{success} <Link to="/my-sessions">View bookings</Link></p>}
      </form>
    </article>
  );
}

export default function TutorsPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [query, setQuery] = useState("");
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const search = query.trim() ? `?subject=${encodeURIComponent(query.trim())}` : "";
    api(`/tutors${search}`)
      .then(({ tutors: result }) => { if (active) setTutors(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);

  function search(event) {
    event.preventDefault();
    setQuery(subject);
  }

  return (
    <>
      <section className="page-heading shell">
        <p className="section-kicker">Find your person</p>
        <h1>A tutor for the things you want to learn.</h1>
        <p>Explore subjects, compare availability, and book your next one-hour session.</p>
      </section>
      <section className="directory-section shell">
        <form className="search-bar" onSubmit={search}>
          <label className="sr-only" htmlFor="subject-search">Find tutors by subject</label>
          <span aria-hidden="true">⌕</span>
          <input id="subject-search" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Try mathematics, biology, writing..." />
          <button className="button button-dark" type="submit">Search</button>
        </form>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {loading ? <Loading label="Finding tutors..." /> : tutors.length ? (
          <div className="tutor-grid">{tutors.map((tutor) => <TutorCard key={tutor._id} tutor={tutor} user={user} />)}</div>
        ) : (
          <div className="empty-state"><span className="empty-icon">✳</span><h2>No tutors found yet</h2><p>{query ? "Try another subject, or check back as more tutors join." : "There are no tutors to show right now. Check back soon."}</p></div>
        )}
      </section>
    </>
  );
}
