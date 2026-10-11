import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ErrorMessage, Loading } from "../components/PageState.jsx";

export default function MySessionsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/bookings/mine")
      .then(({ bookings: result }) => setBookings(result))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="content-page shell">
      <div className="page-heading compact-heading"><p className="section-kicker">Your schedule</p><h1>My booked sessions</h1><p>Your upcoming classes and their session tokens, all in one place.</p></div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {loading ? <Loading label="Loading your sessions..." /> : bookings.length ? (
        <div className="sessions-list">
          {bookings.map((booking) => (
            <article className="session-card" key={booking._id}>
              <div className="session-date"><span>{DateTime.fromISO(booking.startsAt).toLocal().toFormat("ccc")}</span><strong>{DateTime.fromISO(booking.startsAt).toLocal().toFormat("dd")}</strong><span>{DateTime.fromISO(booking.startsAt).toLocal().toFormat("LLL")}</span></div>
              <div className="session-main"><span className="subject-pill">{booking.tutor?.subject || "Tutor session"}</span><h2>{booking.tutor?.name || "Tutor"}</h2><p>{DateTime.fromISO(booking.startsAt).toLocal().toLocaleString(DateTime.TIME_SIMPLE)} · 1 hour · Your local time</p></div>
              <div className="session-token"><span>Session token</span><code>{booking.sessionToken}</code></div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><span className="empty-icon">◷</span><h2>Your schedule is open</h2><p>Once you book a session, its time and token will appear here.</p><Link className="button button-dark" to="/tutors">Find a tutor</Link></div>
      )}
    </section>
  );
}
