import * as ProfilesDB from "@/lib/db/profiles";
import * as PostsDB from "@/lib/db/posts";

export function useAdminActions({
  SUPA,
  users,
  pendingUsers,
  blockedUsers,
  setUsers,
  setPendingUsers,
  setBlockedUsers,
  setPosts,
  pushToast,
  reloadPosts,
  reloadPendingUsers,
  reloadVerifiedUsers,
  reloadBlockedUsers,
}) {
  const reloadAll = () => {
    reloadPendingUsers();
    reloadVerifiedUsers();
    reloadBlockedUsers();
  };

  const verifyUser = async (profileId) => {
    if (SUPA) {
      const { error } = await ProfilesDB.adminVerifyProfile(profileId);
      if (error) return pushToast(error.message, "error");
      const found = pendingUsers.find((p) => p.id === profileId);
      pushToast(`Verified ${found?.full_name || "user"}`, "success");
      reloadAll();
      return;
    }

    const u =
      pendingUsers.find((x) => x.id === profileId) ||
      blockedUsers.find((x) => x.id === profileId);
    if (!u) return;

    const verified = { ...u, verification_status: "verified" };
    setUsers((l) => [...l, verified]);
    setPendingUsers((l) => l.filter((x) => x.id !== profileId));
    setBlockedUsers((l) => l.filter((x) => x.id !== profileId));
    pushToast(`Verified ${u.full_name}`, "success");
  };

  const verifyUserByEmail = async (email) => {
    const cleanEmail = email?.trim().toLowerCase() || "";
    if (!cleanEmail) {
      pushToast("Enter an email address first.", "error");
      return { ok: false, error: "Email is required." };
    }

    if (SUPA) {
      const { data, error } = await ProfilesDB.adminVerifyProfileByEmail(cleanEmail);
      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }
      if (!data) {
        pushToast("No profile found with that email.", "error");
        return { ok: false, error: "No profile found with that email." };
      }
      pushToast(`Verified ${data.full_name || cleanEmail}`, "success");
      reloadAll();
      return { ok: true, data };
    }

    const byEmail = (u) => u.email === cleanEmail || u.personal_email === cleanEmail;
    const target = pendingUsers.find(byEmail) || blockedUsers.find(byEmail) || users.find(byEmail);

    if (!target) {
      pushToast("No profile found with that email.", "error");
      return { ok: false, error: "No profile found with that email." };
    }

    const verified = { ...target, verification_status: "verified" };
    setPendingUsers((l) => l.filter((u) => !byEmail(u)));
    setBlockedUsers((l) => l.filter((u) => !byEmail(u)));
    setUsers((l) => {
      const exists = l.some(byEmail);
      return exists ? l.map((u) => (byEmail(u) ? verified : u)) : [...l, verified];
    });
    pushToast(`Verified ${verified.full_name || cleanEmail}`, "success");
    return { ok: true, data: verified };
  };

  const revokeUserByEmail = async (email) => {
    const cleanEmail = email?.trim().toLowerCase() || "";
    if (!cleanEmail) {
      pushToast("Enter an email address first.", "error");
      return { ok: false, error: "Email is required." };
    }

    if (SUPA) {
      const { data, error } = await ProfilesDB.adminRevokeProfileByEmail(cleanEmail);
      if (error) {
        pushToast(error.message, "error");
        return { ok: false, error: error.message };
      }
      if (!data) {
        pushToast("No non-admin profile found with that email.", "error");
        return { ok: false, error: "No non-admin profile found with that email." };
      }
      pushToast(`Revoked access for ${data.full_name || cleanEmail}`, "info");
      reloadAll();
      return { ok: true, data };
    }

    const byEmail = (u) => u.email === cleanEmail || u.personal_email === cleanEmail;
    const target = pendingUsers.find(byEmail) || users.find(byEmail) || blockedUsers.find(byEmail);

    if (!target || target.role === "admin") {
      pushToast("No non-admin profile found with that email.", "error");
      return { ok: false, error: "No non-admin profile found with that email." };
    }

    const revoked = { ...target, verification_status: "revoked" };
    setPendingUsers((l) => l.filter((u) => !byEmail(u)));
    setUsers((l) => l.filter((u) => !byEmail(u)));
    setBlockedUsers((l) => {
      const exists = l.some((u) => u.id === revoked.id);
      return exists ? l.map((u) => (u.id === revoked.id ? revoked : u)) : [revoked, ...l];
    });
    pushToast(`Revoked access for ${revoked.full_name || cleanEmail}`, "info");
    return { ok: true, data: revoked };
  };

  const rejectUser = async (profileId) => {
    if (SUPA) {
      const { error } = await ProfilesDB.adminRejectProfile(profileId);
      if (error) return pushToast(error.message, "error");
      pushToast("Profile rejected. User can request re-review or contact admin.", "info");
      reloadPendingUsers();
      reloadBlockedUsers();
      return;
    }

    const u = pendingUsers.find((x) => x.id === profileId);
    if (!u) return;
    const rejected = { ...u, verification_status: "rejected" };
    setPendingUsers((l) => l.filter((x) => x.id !== profileId));
    setBlockedUsers((l) => [rejected, ...l]);
    pushToast("Profile rejected", "info");
  };

  const removeUser = async (profileId) => {
    if (SUPA) {
      const { error } = await ProfilesDB.adminRemoveProfile(profileId);
      if (error) return pushToast(error.message, "error");
      pushToast("Member access revoked. Their old posts and comments remain visible.", "info");
      reloadVerifiedUsers();
      reloadBlockedUsers();
      return;
    }

    const u = users.find((x) => x.id === profileId);
    if (!u) return;
    const revoked = { ...u, verification_status: "revoked" };
    setUsers((l) => l.filter((x) => x.id !== profileId));
    setBlockedUsers((l) => [revoked, ...l]);
    pushToast("Member access revoked", "info");
  };

  const adminDeletePost = async (postId) => {
    if (!postId) {
      pushToast("Post was not identified. Please refresh and try again.", "error");
      return;
    }

    if (SUPA) {
      const { error } = await PostsDB.adminDeletePost(postId);
      if (error) return pushToast(error.message, "error");
      pushToast("Post permanently deleted", "info");
      reloadPosts();
      return;
    }

    setPosts((arr) => arr.filter((p) => p.id !== postId));
    pushToast("Post permanently deleted", "info");
  };

  const restoreReportedPost = async (postId) => {
    if (SUPA) {
      const { error } = await PostsDB.restoreReportedPost(postId);
      if (error) return pushToast(error.message, "error");
      pushToast("Post sent back to feed", "success");
      reloadPosts();
      return;
    }
    setPosts((arr) =>
      arr.map((p) =>
        p.id === postId ? { ...p, status: "active", report_count: 0 } : p
      )
    );
    pushToast("Post sent back to feed", "success");
  };

  return {
    verifyUser,
    verifyUserByEmail,
    revokeUserByEmail,
    rejectUser,
    removeUser,
    adminDeletePost,
    restoreReportedPost,
  };
}
