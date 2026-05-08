import { useCallback, useMemo } from "react";
import * as NotificationsDB from "@/lib/db/notifications";
import { getProfileStatus } from "../utils/appHelpers";

export function useNotificationActions({
  SUPA,
  currentUser,
  notifications,
  setNotifications,
}) {
  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    if (getProfileStatus(currentUser) !== "verified") return [];
    if (SUPA) return notifications;
    return [...notifications]
      .filter((n) => n.recipient_user_id === currentUser.id)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [SUPA, notifications, currentUser]);

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const markNotificationsRead = useCallback(async () => {
    if (!currentUser) return;
    if (getProfileStatus(currentUser) !== "verified") return;

    if (SUPA) {
      await NotificationsDB.markAllNotificationsRead(currentUser.id);
      setNotifications((arr) => arr.map((n) => ({ ...n, read: true })));
      return;
    }

    setNotifications((arr) =>
      arr.map((n) =>
        n.recipient_user_id === currentUser.id ? { ...n, read: true } : n
      )
    );
  }, [SUPA, currentUser, setNotifications]);

  return { userNotifications, unreadCount, markNotificationsRead };
}
