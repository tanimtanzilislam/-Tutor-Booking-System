import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ErrorMessage, Loading } from "../components/PageState.jsx";
import { useToast } from "../components/ToastContext.jsx";

export default function MySessionsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const { notify } = useToast();

  async function loadBookings() {
    setLoading(true);
    setError("");
    try {
      const { bookings: result } = await api("/bookings/mine");
      setBookings(result);
    } catch (requestError) {
      setError(requestError.message);
      notify(requestError.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function cancelBooking() {
    if (!bookingToCancel || cancelling) return;
    setCancelling(true);
    setError("");
    try {
      const result = await api(`/bookings/${encodeURIComponent(bookingToCancel._id)}/cancel`, {
        method: "PATCH"
      });
      setBookings((current) => current.map((booking) => (
        booking._id === result.booking._id ? result.booking : booking
      )));
      setBookingToCancel(null);
      notify(result.message || "Your session has been cancelled.");
    } catch (requestError) {
      setError(requestError.message);
      notify(requestError.message, "error");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="content-page shell">
      <div className="page-heading compact-heading">
        <p className="section-kicker">Your schedule</p>
        <h1>My booked sessions</h1>
        <p>Review your bookings and manage your upcoming sessions.</p>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {loading ? <Loading label="Loading your sessions..." /> : bookings.length ? (
        <div className="sessions-table-wrap" data-reveal>
          <table className="sessions-table">
            <thead>
              <tr>
                <th scope="col">Tutor</th>
                <th scope="col">Student</th>
                <th scope="col">Email</th>
                <th scope="col">Session</th>
                <th scope="col">Status</th>
                <th scope="col">Session token</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const sessionDate = DateTime.fromISO(booking.startsAt).toLocal();
                const status = (booking.status || "confirmed").toLowerCase();
                const canCancel = status === "pending" || status === "confirmed";
                return (
                  <tr key={booking._id}>
                    <td data-label="Tutor">{booking.tutor?.name || "Tutor"}</td>
                    <td data-label="Student">{booking.studentName}</td>
                    <td data-label="Email">{booking.studentEmail}</td>
                    <td data-label="Session">{sessionDate.toLocaleString(DateTime.DATETIME_MED)}</td>
                    <td data-label="Status"><span className={`booking-status status-${status}`}>{status === "pending" ? "Awaiting tutor approval" : status}</span></td>
                    <td data-label="Session token"><code className="table-token">{booking.sessionToken}</code></td>
                    <td data-label="Actions">
                      {canCancel ? (
                        <button className="button button-cancel" type="button" onClick={() => setBookingToCancel(booking)}>
                          Cancel
                        </button>
                      ) : <span className="cancelled-label">{status === "rejected" ? "Declined" : "Cancelled"}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">◷</span>
          <h2>Your schedule is open</h2>
          <p>You haven’t booked a session yet. When you do, it will appear here.</p>
          <Link className="button button-dark" to="/tutors">Find a tutor</Link>
        </div>
      )}
      {bookingToCancel && (
        <div className="modal-backdrop">
          <section className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title" aria-describedby="cancel-description" data-reveal>
            <p className="section-kicker">Please confirm</p>
            <h2 id="cancel-title">Cancel this session?</h2>
            <p id="cancel-description">Your {bookingToCancel.status === "pending" ? "request" : "confirmed session"} with {bookingToCancel.tutor?.name || "this tutor"} will be cancelled. Its booking slot will become available again.</p>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <div className="confirmation-actions">
              <button className="button button-light" type="button" onClick={() => setBookingToCancel(null)} disabled={cancelling}>Keep session</button>
              <button className="button button-cancel" type="button" onClick={cancelBooking} disabled={cancelling}>
                {cancelling ? "Cancelling..." : "Confirm cancellation"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
