import { useState } from "react";
import { DateTime } from "luxon";
import { Link } from "react-router-dom";
import { ErrorMessage, Loading } from "../components/PageState.jsx";
import { useNotifications } from "../notifications/NotificationContext.jsx";

export default function NotificationsPage() {
  const { notifications, error, loading: initialLoading, refresh, markRead } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState("");

  async function reload() {
    setLoading(true);
    try {
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function readNotification(id) {
    setMarkingId(id);
    try {
      await markRead(id);
    } finally {
      setMarkingId("");
    }
  }

  return (
    <section className="content-page shell">
      <div className="page-heading compact-heading">
        <p className="section-kicker">Tutor updates</p>
        <h1>Notifications</h1>
        <p>New student bookings and their session details appear here.</p>
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
            return (
              <article className={`notification-card ${notification.readAt ? "" : "notification-unread"}`} key={notification._id}>
                <div className="notification-card-content">
                  <div className="notification-card-heading">
                    <h2>New booking: {notification.subject}</h2>
                    {!notification.readAt && <span className="notification-new">New</span>}
                  </div>
                  <p><strong>{notification.studentName}</strong> booked a one-hour session.</p>
                  <p className="notification-session-time">
                    {sessionDate.setZone(notification.timeZone).toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY)}
                    {" · "}{notification.timeZone}
                  </p>
                  <span className="notification-created-at">
                    Received {DateTime.fromISO(notification.createdAt).toRelative() || "recently"}
                  </span>
                </div>
                <div className="notification-actions">
                  <Link className="button button-outline" to={`/tutors/${notification.tutor}`}>View tutor profile</Link>
                  {!notification.readAt && (
                    <button
                      className="button button-dark"
                      type="button"
                      onClick={() => readNotification(notification._id)}
                      disabled={markingId === notification._id}
                    >
                      {markingId === notification._id ? "Marking..." : "Mark as read"}
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
          <p>New student bookings will show up here.</p>
        </div>
      )}
    </section>
  );
}
