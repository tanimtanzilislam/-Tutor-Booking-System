import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/ToastContext.jsx";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const previousIds = useRef(null);
  const requestInFlight = useRef(false);
  const isTutor = user?.role === "tutor";

  const refresh = useCallback(async () => {
    if (!isTutor) {
      setNotifications([]);
      setUnreadCount(0);
      setError("");
      setLoading(false);
      return;
    }
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    try {
      if (previousIds.current === null) setLoading(true);
      const result = await api("/notifications/mine");
      const nextIds = new Set(result.notifications.map(({ _id }) => _id));
      if (previousIds.current) {
        const latest = result.notifications.find(({ _id }) => !previousIds.current.has(_id));
        if (latest) notify(`${latest.studentName} booked a ${latest.subject} session.`);
      }
      previousIds.current = nextIds;
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }, [isTutor, notify]);

  useEffect(() => {
    previousIds.current = null;
    if (!isTutor) {
      setNotifications([]);
      setUnreadCount(0);
      setError("");
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [isTutor, refresh]);

  const markRead = useCallback(async (notificationId) => {
    try {
      const { notification } = await api(`/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: "PATCH"
      });
      setNotifications((current) => current.map((item) => (
        item._id === notification._id ? notification : item
      )));
      setUnreadCount((current) => Math.max(
        0,
        current - (notifications.some((item) => item._id === notificationId && !item.readAt) ? 1 : 0)
      ));
      setError("");
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }, [notifications]);

  const value = useMemo(
    () => ({ notifications, unreadCount, error, loading, refresh, markRead }),
    [notifications, unreadCount, error, loading, refresh, markRead]
  );
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotifications must be used inside NotificationProvider.");
  return value;
}
