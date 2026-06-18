import { useCallback, useMemo } from "react";
import * as NotificationsDB from "@/lib/db/notifications";
import { getProfileStatus } from "../utils/appHelpers";

export function useNotificationActions({
  SUPA,
  currentUser,
  notifications,
  setNotifications,
  unreadCount,
  setUnreadCount,
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

  const localUnreadCount = userNotifications.filter((n) => !n.read).length;
  const safeUnreadCount = SUPA
    ? Math.max(0, Number(unreadCount) || 0)
    : localUnreadCount;

  const markNotificationsRead = useCallback(async () => {
    if (!currentUser) return { ok: false, error: "No signed-in user." };
    if (getProfileStatus(currentUser) !== "verified") {
      return { ok: false, error: "User is not verified." };
    }

    if (SUPA) {
      const { error } = await NotificationsDB.markAllNotificationsRead();
      if (error) {
        console.error("markAllNotificationsRead failed:", error);
        return {
          ok: false,
          error: error.message || "Could not mark notifications as read.",
        };
      }

      setUnreadCount(0);
      NotificationsDB.writeCachedBadgeCount(0);
      setNotifications((arr) => arr.map((n) => ({ ...n, read: true })));
      return { ok: true };
    }

    setNotifications((arr) =>
      arr.map((n) =>
        n.recipient_user_id === currentUser.id ? { ...n, read: true } : n
      )
    );
    return { ok: true };
  }, [SUPA, currentUser, setNotifications, setUnreadCount]);

  return {
    userNotifications,
    unreadCount: safeUnreadCount,
    markNotificationsRead,
  };
}
