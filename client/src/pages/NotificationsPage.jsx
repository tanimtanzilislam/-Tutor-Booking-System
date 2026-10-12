import { useState } from "react";
import { DateTime } from "luxon";
import { Link } from "react-router-dom";
import { ErrorMessage, Loading } from "../components/PageState.jsx";
import { useNotifications } from "../notifications/NotificationContext.jsx";

export default function NotificationsPage() {
  const { notifications, error, loading: initialLoading, refresh, markRead, decideBooking } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState("");

  async function reload() {
    setLoading(true);
    try {
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function runNotificationAction(id, action) {
    setActingId(id);
    try {
      if (action === "confirm" || action === "decline") {
        await decideBooking(id, action);
      } else {
        await markRead(id);
      }
    } finally {
      setActingId("");
    }
  }

  return (
    <section className="content-page shell">
      <div className="page-heading compact-heading">
        <p className="section-kicker">Tutor updates</p>
        <h1>Notifications</h1>
        <p>Student bookings, cancellations, and their session details appear here.</p>
      </div>
      {error && (
        <div className="management-load-error">
          <ErrorMessage>{error}</ErrorMessage>
          <button className="button button-outline" type="button" onClick={reload} disabled={loading}>Try again</button>
        </div>
      )}
      {loading || initialLoading ? <Loading label="Loading notifications..." /> : notifications.length ? (
        <div className="notification-list">
          {notifications.map((notification) => {
            const sessionDate = DateTime.fromISO(notification.startsAt).toLocal();
            const student = notification.student;
            const bookingStatus = notification.booking?.status || "pending";
            const bookingPending = notification.eventType === "booking_request" && bookingStatus === "pending";
            const bookingCancelled = notification.eventType === "booking_cancelled";
            return (
              <article className={`notification-card ${notification.readAt ? "" : "notification-unread"}`} key={notification._id}>
                <div className="notification-card-content">
                  <div className="notification-card-heading">
                    <h2>{bookingCancelled ? "Booking cancelled" : "New booking"}: {notification.subject}</h2>
                    {!notification.readAt && <span className="notification-new">New</span>}
                  </div>
                  <p>
                    <strong>{notification.studentName}</strong>
                    {bookingCancelled ? " cancelled their one-hour session." : " booked a one-hour session."}
                  </p>
                  <p className="notification-session-time">
                    {sessionDate.setZone(notification.timeZone).toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY)}
                    {" · "}{notification.timeZone}
                  </p>
                  <div className="notification-student-profile">
                    {student?.profileImage
                      ? <img src={student.profileImage} alt={`${student.name} profile`} />
                      : <span className="notification-student-avatar" aria-hidden="true">{(student?.name || notification.studentName).slice(0, 1).toUpperCase()}</span>}
                    <div>
                      <span className="notification-profile-label">Student profile</span>
                      <strong>{student?.name || notification.studentName}</strong>
                      {student?.email && <a href={`mailto:${student.email}`}>{student.email}</a>}
                    </div>
                  </div>
                  <p className="notification-booking-status">
                    Booking status: <strong>{bookingStatus}</strong>
                  </p>
                  <span className="notification-created-at">
                    Received {DateTime.fromISO(notification.createdAt).toRelative() || "recently"}
                  </span>
                </div>
                <div className="notification-actions">
                  {bookingPending ? (
                    <>
                      <button
                        className="button button-outline"
                        type="button"
                        onClick={() => runNotificationAction(notification._id, "decline")}
                        disabled={actingId === notification._id}
                      >
                        {actingId === notification._id ? "Please wait..." : "Decline request"}
                      </button>
                      <button
                        className="button button-dark"
                        type="button"
                        onClick={() => runNotificationAction(notification._id, "confirm")}
                        disabled={actingId === notification._id}
                      >
                        {actingId === notification._id ? "Please wait..." : "Confirm booking"}
                      </button>
                    </>
                  ) : !notification.readAt && (
                    <button
                      className="button button-dark"
                      type="button"
                      onClick={() => runNotificationAction(notification._id, "read")}
                      disabled={actingId === notification._id}
                    >
                      {actingId === notification._id ? "Marking..." : "Mark as read"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : !error && (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">◉</span>
          <h2>You’re all caught up</h2>
          <p>Student booking requests and cancellations will show up here.</p>
        </div>
      )}
    </section>
  );
}
