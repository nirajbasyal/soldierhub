import { useCallback } from "react";
import { ADMIN_EMAIL } from "@/lib/constants";
import { colorFromString, uid } from "@/lib/helpers";
import * as Auth from "@/lib/supabase/auth";
import * as ProfilesDB from "@/lib/db/profiles";
import { getProfileStatus } from "../utils/appHelpers";

export function useAuthActions({
  SUPA,
  router,
  currentUser,
  users,
  pendingUsers,
  blockedUsers,
  setCurrentUser,
  setUsers,
  setPendingUsers,
  setMyPosts,
  setMyUpvotes,
  setMyReports,
  setNotifications,
  setAuthModal,
  setMobileMenu,
  pushToast,
  sendToPendingReview,
}) {
  const handleSignup = useCallback(
    async ({ name, email, phone, bio, password }) => {
      const cleanName = name?.trim() || "";
      const cleanEmail = email?.trim().toLowerCase() || "";
      const cleanPhone = phone?.trim() || "";
      const cleanBio = bio?.trim() || "";

      if (SUPA) {
        const { data, error } = await Auth.signUp({
          email: cleanEmail,
          password,
          fullName: cleanName,
          phone: cleanPhone,
          bio: cleanBio,
          avatarColor: colorFromString(cleanName),
        });

        if (error) {
          pushToast(error.message, "error");
          return { ok: false, error: error.message };
        }

        pushToast(
          "Account created. Please check your email to confirm your address.",
          "info"
        );

        sendToPendingReview({
          email: cleanEmail,
          name: cleanName,
          found: 1,
          status: "pending",
          replace: true,
        });

        setAuthModal(null);
        return { ok: true, data };
      }

      const newUser = {
        id: uid(),
        full_name: cleanName,
        email: cleanEmail,
        personal_email: cleanEmail,
        phone: cleanPhone || null,
        bio: cleanBio,
        password,
        role: cleanEmail === ADMIN_EMAIL ? "admin" : "user",
        status: cleanEmail === ADMIN_EMAIL ? "verified" : "pending",
        verification_status: cleanEmail === ADMIN_EMAIL ? "verified" : "pending",
        avatar_color: colorFromString(cleanName),
        base: "Fort Bliss",
        created_at: new Date().toISOString(),
      };

      if (cleanEmail === ADMIN_EMAIL) {
        setUsers((u) => [...u, newUser]);
        setCurrentUser(newUser);
        setAuthModal(null);
        pushToast("Welcome, admin", "success");
      } else {
        setPendingUsers((u) => [...u, newUser]);
        setAuthModal(null);
        pushToast("Profile submitted for review", "success");
        sendToPendingReview({
          email: cleanEmail,
          name: cleanName,
          found: 1,
          status: "pending",
          replace: true,
        });
      }

      return { ok: true };
    },
    [
      SUPA,
      pushToast,
      sendToPendingReview,
      setAuthModal,
      setCurrentUser,
      setPendingUsers,
      setUsers,
    ]
  );

  const handleLogin = useCallback(
    async (email, password, onError) => {
      const cleanEmail = email?.trim().toLowerCase() || "";

      const routeToPending = ({ profile, status, found = 1 }) => {
        sendToPendingReview({
          email: cleanEmail || profile?.email || profile?.personal_email || "",
          name: profile?.full_name || "",
          found,
          status,
          replace: true,
        });
        setAuthModal(null);
      };

      if (SUPA) {
        const { data, error } = await Auth.signIn({
          email: cleanEmail,
          password,
        });

        if (error) {
          onError && onError(error.message);
          return { ok: false, error: error.message };
        }

        const { data: profile } = await ProfilesDB.getProfile(data.user.id);

        if (!profile) {
          await Auth.signOut();
          setCurrentUser(null);
          routeToPending({ profile: null, status: "pending", found: 0 });
          return { ok: false, error: "Profile not found." };
        }

        const status = getProfileStatus(profile);
        setCurrentUser(profile);

        if (status === "verified") {
          setAuthModal(null);
          pushToast(`Signed in as ${profile.full_name}`, "success");
          return { ok: true, data: profile };
        }

        if (["pending", "rejected", "revoked"].includes(status)) {
          routeToPending({ profile, status, found: 1 });
          return { ok: true, data: profile };
        }

        await Auth.signOut();
        setCurrentUser(null);
        routeToPending({ profile: null, status: "pending", found: 0 });
        return { ok: false, error: "Profile status is not valid." };
      }

      const verified = users.find((u) => u.email === cleanEmail);
      const pending = pendingUsers.find((u) => u.email === cleanEmail);
      const blocked = blockedUsers.find((u) => u.email === cleanEmail);
      const profile = verified || pending || blocked;

      if (!profile) {
        setAuthModal(null);
        routeToPending({ profile: null, status: "pending", found: 0 });
        return { ok: false, error: "Profile not found." };
      }

      if (profile.password && profile.password !== password) {
        onError && onError("Incorrect password.");
        return { ok: false, error: "Incorrect password." };
      }

      const status = getProfileStatus(profile);
      setCurrentUser(profile);

      if (status === "verified") {
        setAuthModal(null);
        pushToast(`Signed in as ${profile.full_name}`, "success");
        return { ok: true, data: profile };
      }

      routeToPending({ profile, status, found: 1 });
      return { ok: true, data: profile };
    },
    [
      SUPA,
      blockedUsers,
      pendingUsers,
      pushToast,
      sendToPendingReview,
      setAuthModal,
      setCurrentUser,
      users,
    ]
  );

  const handleLogout = useCallback(async () => {
    try {
      if (SUPA) await Auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setCurrentUser(null);
      setMyUpvotes(new Set());
      setMyReports(new Set());
      setNotifications([]);
      setMyPosts([]);
      setAuthModal(null);
      setMobileMenu(false);

      if (typeof window !== "undefined") {
        window.location.replace("/");
      } else {
        router.replace("/");
      }
    }
  }, [
    SUPA,
    router,
    setAuthModal,
    setCurrentUser,
    setMobileMenu,
    setMyPosts,
    setMyReports,
    setMyUpvotes,
    setNotifications,
  ]);

  const requireAuth = useCallback(() => {
    if (!currentUser) {
      setAuthModal("login");
      return false;
    }

    const status = getProfileStatus(currentUser);

    if (status !== "verified") {
      sendToPendingReview({
        email: currentUser.email || currentUser.personal_email || "",
        name: currentUser.full_name || "",
        found: 1,
        status,
        replace: true,
      });
      return false;
    }

    return true;
  }, [currentUser, sendToPendingReview, setAuthModal]);

  return {
    handleSignup,
    handleLogin,
    handleLogout,
    requireAuth,
  };
}
