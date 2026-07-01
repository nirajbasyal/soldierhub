import { useCallback } from "react";
import { DEMO_ADMIN_EMAIL } from "@/lib/constants";
import { colorFromString, uid } from "@/lib/helpers";
import * as Auth from "@/lib/supabase/auth";
import * as ProfilesDB from "@/lib/db/profiles";
import { getProfileStatus } from "../utils/appHelpers";

const MIN_SECRET_LENGTH = 10;

function getSignupSecretError(secret) {
  if (!secret) return "Password is required.";
  if (secret.length < MIN_SECRET_LENGTH) return `Password must be at least ${MIN_SECRET_LENGTH} characters.`;
  if (/^(.)\1+$/.test(secret)) return "Password is too easy to guess.";
  if (/password|soldierhub|qwerty|123456|abcdef/i.test(secret)) return "Password is too common.";
  return null;
}

function clearLocalAuthCaches() {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (key === "soldierhub_current_profile_v1" || key.startsWith("soldierhub_notifications_cache_v1_") || key.startsWith("sb-") || key.includes("supabase")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {}

  try {
    const keysToRemove = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key) continue;
      if (key.startsWith("sb-") || key.includes("supabase")) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {}
}

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
    async ({ name, email, phone, bio, password: signupSecret }) => {
      const cleanName = name?.trim() || "";
      const cleanEmail = email?.trim().toLowerCase() || "";
      const cleanPhone = phone?.trim() || "";
      const cleanBio = bio?.trim() || "";
      const secretError = getSignupSecretError(signupSecret);

      if (secretError) {
        pushToast(secretError, "error");
        return { ok: false, error: secretError };
      }

      if (SUPA) {
        const { data, error } = await Auth.signUp({
          email: cleanEmail,
          password: signupSecret,
          fullName: cleanName,
          phone: cleanPhone,
          bio: cleanBio,
          avatarColor: colorFromString(cleanName),
        });

        if (error) {
          pushToast(error.message, "error");
          return { ok: false, error: error.message };
        }

        pushToast("Account created. Please check your email to confirm your address.", "info");
        sendToPendingReview({ email: cleanEmail, name: cleanName, found: 1, status: "pending", replace: true });
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
        password: signupSecret,
        role: cleanEmail === DEMO_ADMIN_EMAIL ? "admin" : "user",
        verification_status: cleanEmail === DEMO_ADMIN_EMAIL ? "verified" : "pending",
        avatar_color: colorFromString(cleanName),
        base: "Fort Bliss",
        created_at: new Date().toISOString(),
      };

      if (cleanEmail === DEMO_ADMIN_EMAIL) {
        setUsers((u) => [...u, newUser]);
        setCurrentUser(newUser);
        setAuthModal(null);
        pushToast("Welcome, admin", "success");
      } else {
        setPendingUsers((u) => [...u, newUser]);
        setAuthModal(null);
        pushToast("Profile submitted for review", "success");
        sendToPendingReview({ email: cleanEmail, name: cleanName, found: 1, status: "pending", replace: true });
      }

      return { ok: true };
    },
    [SUPA, pushToast, sendToPendingReview, setAuthModal, setCurrentUser, setPendingUsers, setUsers]
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
        const { data, error } = await Auth.signIn({ email: cleanEmail, password });
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
    [SUPA, blockedUsers, pendingUsers, pushToast, sendToPendingReview, setAuthModal, setCurrentUser, users]
  );

  const handleLogout = useCallback(async () => {
    setCurrentUser(null);
    setMyUpvotes(new Set());
    setMyReports(new Set());
    setNotifications([]);
    setMyPosts([]);
    setAuthModal(null);
    setMobileMenu(false);
    clearLocalAuthCaches();

    if (typeof window !== "undefined") {
      window.location.assign("/auth/signout");
      return;
    }

    try {
      if (SUPA) await Auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      router.replace("/");
    }
  }, [SUPA, router, setAuthModal, setCurrentUser, setMobileMenu, setMyPosts, setMyReports, setMyUpvotes, setNotifications]);

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

  return { handleSignup, handleLogin, handleLogout, requireAuth };
}
