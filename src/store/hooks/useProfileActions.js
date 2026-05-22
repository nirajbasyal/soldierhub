import * as Auth from "@/lib/supabase/auth";
import * as ProfilesDB from "@/lib/db/profiles";

export function useProfileActions({
  SUPA,
  currentUser,
  setCurrentUser,
  setUsers,
  setPendingUsers,
  setBlockedUsers,
  requireAuth,
  pushToast,
  sendToPendingReview,
}) {
  const updateProfile = async (updates) => {
    if (!requireAuth()) {
      return { ok: false, error: "Please sign in again before updating your profile." };
    }

    if (SUPA) {
      const { data, error } = await ProfilesDB.updateMyProfile(
        currentUser.id,
        updates
      );
      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }
      setCurrentUser(data);
      pushToast("Profile updated", "success");
      return { ok: true, data };
    }

    const updated = { ...currentUser, ...updates };

    setCurrentUser(updated);
    setUsers((arr) =>
      arr.map((u) => (u.id === currentUser.id ? { ...u, ...updates } : u))
    );
    pushToast("Profile updated", "success");
    return { ok: true, data: updated };
  };

  const requestRereview = async ({ militaryEmail, phone } = {}) => {
    const cleanMilitaryEmail = militaryEmail?.trim().toLowerCase() || "";
    const cleanPhone = phone?.trim() || "";

    if (!currentUser) {
      return { ok: false, error: "You must be signed in to request re-review." };
    }

    if (SUPA) {
      const { error } = await ProfilesDB.requestProfileRereview({
        militaryEmail: cleanMilitaryEmail,
        phone: cleanPhone,
      });
      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }

      const { profile } = await Auth.getCurrentUser();
      const updated = profile || {
        ...currentUser,
        status: "pending",
        verification_status: "pending",
        military_email: cleanMilitaryEmail || currentUser.military_email,
        phone: cleanPhone || currentUser.phone,
      };

      setCurrentUser(updated);
      pushToast(
        "Re-review request submitted. Your profile is pending admin review again.",
        "success"
      );
      sendToPendingReview({
        email: updated.email || updated.personal_email || "",
        name: updated.full_name || "",
        found: 1,
        status: "pending",
        replace: true,
      });
      return { ok: true, data: updated };
    }

    const updated = {
      ...currentUser,
      status: "pending",
      verification_status: "pending",
      military_email: cleanMilitaryEmail || currentUser.military_email,
      phone: cleanPhone || currentUser.phone,
    };

    const matchesMe = (u) =>
      u.id === currentUser.id ||
      u.email === currentUser.email ||
      u.personal_email === currentUser.personal_email;

    setCurrentUser(updated);
    setUsers((l) => l.filter((u) => !matchesMe(u)));
    setBlockedUsers((l) => l.filter((u) => !matchesMe(u)));
    setPendingUsers((l) => {
      const exists = l.some((u) => u.id === currentUser.id);
      return exists
        ? l.map((u) => (u.id === currentUser.id ? updated : u))
        : [...l, updated];
    });

    pushToast("Re-review request submitted", "success");
    sendToPendingReview({
      email: updated.email || updated.personal_email || "",
      name: updated.full_name || "",
      found: 1,
      status: "pending",
      replace: true,
    });
    return { ok: true, data: updated };
  };

  return { updateProfile, requestRereview };
}
