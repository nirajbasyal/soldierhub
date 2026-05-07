"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit3,
  KeyRound,
  Mail,
  Shield,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import * as Auth from "@/lib/supabase/auth";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";

const COLOR_OPTIONS = [
  "#0B1C2C",
  "#1E4E8C",
  "#314A66",
  "#B31942",
  "#5B3F8C",
  "#9C2A55",
  "#1F5A87",
  "#1F6E66",
  "#7A5C20",
];

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div
      className="rounded-2xl border px-3 py-2 flex items-start gap-2 min-w-0"
      style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}
    >
      <Icon size={15} className="mt-0.5 shrink-0" style={{ color: T.blue }} />
      <div className="min-w-0">
        <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>
          {label}
        </div>
        <div className="text-xs md:text-sm font-semibold truncate" style={{ color: T.navy }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function postBelongsToCurrentUser(post, currentUser) {
  if (!post || !currentUser?.id) return false;

  return (
    post.author_id === currentUser.id ||
    post.user_id === currentUser.id ||
    post.profile_id === currentUser.id ||
    post.viewer_is_author === true
  );
}

export default function ProfileHeader() {
  const {
    currentUser,
    updateProfile,
    posts = [],
    myPosts = [],
  } = useApp();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser.full_name || "");
  const [bio, setBio] = useState(currentUser.bio || "");
  const [color, setColor] = useState(currentUser.avatar_color || "#1E4E8C");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const visiblePosts = useMemo(() => {
    if (myPosts.length > 0) return myPosts;
    return posts.filter((post) => postBelongsToCurrentUser(post, currentUser));
  }, [currentUser, myPosts, posts]);

  const totalUpvotes = visiblePosts.reduce((sum, post) => sum + (post.upvote_count || 0), 0);
  const totalReplies = visiblePosts.reduce((sum, post) => sum + (post.comment_count || 0), 0);

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
  };

  const save = () => {
    updateProfile({ full_name: name.trim() || currentUser.full_name, bio, avatar_color: color });
    setEditing(false);
  };

  const cancel = () => {
    setName(currentUser.full_name || "");
    setBio(currentUser.bio || "");
    setColor(currentUser.avatar_color || "#1E4E8C");
    resetPasswordForm();
    setEditing(false);
  };

  const changePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Enter your current password, new password, and confirmation password.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from your current password.");
      return;
    }

    setPasswordSaving(true);

    const email = currentUser.email || currentUser.personal_email || "";
    const verify = await Auth.signIn({ email, password: currentPassword });

    if (verify.error) {
      setPasswordSaving(false);
      setPasswordError("Current password is incorrect. Please try again.");
      return;
    }

    const result = await Auth.updatePassword(newPassword);

    setPasswordSaving(false);

    if (result.error) {
      setPasswordError(result.error.message || "Could not update password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSuccess("Password updated successfully.");
  };

  return (
    <section
      className="rounded-[26px] md:rounded-[32px] border overflow-hidden relative"
      style={{
        borderColor: "#BCD0EA",
        background:
          "linear-gradient(135deg, rgba(220,232,247,0.96) 0%, rgba(253,254,255,0.98) 52%, rgba(253,236,240,0.9) 100%)",
        boxShadow: "0 22px 60px rgba(7,27,51,0.08)",
      }}
    >
      <div className="absolute left-0 top-0 h-full w-1.5 md:w-2 bg-[#B31942]" />
      <div className="absolute right-0 top-0 h-full w-1.5 md:w-2 bg-[#1E4E8C]" />

      <div className="px-4 py-5 md:p-8">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:items-start lg:justify-between">
          <div className="flex flex-col md:flex-row gap-3 md:gap-5 md:items-start min-w-0">
            <div className="flex flex-col items-center md:items-start gap-2 md:gap-3 shrink-0">
              <div
                className="rounded-[22px] md:rounded-[28px] p-1.5 md:p-2 border"
                style={{ backgroundColor: "rgba(255,255,255,0.65)", borderColor: "#D5E2F2" }}
              >
                <div className="md:hidden">
                  <Avatar
                    name={editing ? name : currentUser.full_name}
                    color={editing ? color : currentUser.avatar_color}
                    size={68}
                  />
                </div>
                <div className="hidden md:block">
                  <Avatar
                    name={editing ? name : currentUser.full_name}
                    color={editing ? color : currentUser.avatar_color}
                    size={92}
                  />
                </div>
              </div>

              {editing && (
                <div className="flex flex-wrap gap-1.5 justify-center md:justify-start max-w-[180px]">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: c === color ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                        boxShadow: c === color ? "0 0 0 2px #1E4E8C" : "none",
                      }}
                      aria-label={`Choose profile color ${c}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-center md:text-left">
              {!editing ? (
                <>
                  <div
                    className="inline-flex items-center gap-1.5 md:gap-2 rounded-full border px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-[0.12em]"
                    style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2", color: T.blue }}
                  >
                    <UserRound size={13} />
                    My Profile
                  </div>

                  <div className="mt-3 md:mt-4 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                    <h1 className="text-[2rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.04em] leading-[0.95]" style={{ color: T.navy }}>
                      {currentUser.full_name}
                    </h1>

                    {currentUser.role === "admin" && (
                      <Badge tone="amber" icon={Shield}>
                        Admin
                      </Badge>
                    )}

                    <Badge tone="blue" icon={ShieldCheck}>
                      Verified
                    </Badge>
                  </div>

                  <div className="mt-2 md:mt-3 max-w-xl mx-auto md:mx-0">
                    {currentUser.bio ? (
                      <p className="text-sm md:text-base leading-6 md:leading-7" style={{ color: T.text }}>
                        {currentUser.bio}
                      </p>
                    ) : (
                      <p className="text-sm md:text-base leading-6 md:leading-7" style={{ color: T.textMuted }}>
                        Add a short bio so other verified community members know who you are.
                      </p>
                    )}
                  </div>

                  <div className="mt-3 md:mt-4 grid sm:grid-cols-2 gap-2 max-w-xl mx-auto md:mx-0">
                    <InfoPill icon={Mail} label="Email" value={currentUser.email || currentUser.personal_email || "Verified email"} />
                    <InfoPill icon={ShieldCheck} label="Status" value="Verified email cannot be changed" />
                  </div>
                </>
              ) : (
                <div
                  className="rounded-3xl border p-4 md:p-5 text-left"
                  style={{ backgroundColor: "rgba(255,255,255,0.78)", borderColor: "#D5E2F2" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-extrabold" style={{ color: T.navy }}>
                        Edit profile
                      </h2>
                      <p className="text-sm mt-1" style={{ color: T.textMuted }}>
                        Update your display name, bio, avatar color, and password.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={cancel}
                      className="h-9 w-9 rounded-full border flex items-center justify-center shrink-0"
                      style={{ backgroundColor: T.card, borderColor: "#D5E2F2", color: T.textMuted }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid gap-3">
                    <TextInput label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
                    <TextArea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                    <div className="rounded-2xl border px-3 py-2 text-xs" style={{ backgroundColor: "rgba(244,248,253,0.95)", borderColor: "#D5E2F2", color: T.textSubtle }}>
                      Verified email: {currentUser.email} · email cannot be changed after verification.
                    </div>
                  </div>

                  <div
                    className="mt-4 rounded-3xl border p-4"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(244,248,253,0.96), rgba(255,255,255,0.96))",
                      borderColor: "#D5E2F2",
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(220,232,247,0.95)", color: T.blue }}
                      >
                        <KeyRound size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold" style={{ color: T.navy }}>
                          Change password
                        </h3>
                        <p className="text-xs leading-5 mt-0.5" style={{ color: T.textMuted }}>
                          Enter your current password first, then choose a new password.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <TextInput
                        label="Current password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                      <div className="grid sm:grid-cols-2 gap-3">
                        <TextInput
                          label="New password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                        <TextInput
                          label="Confirm new password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    {passwordError && (
                      <div
                        className="text-xs px-3 py-2 rounded-2xl flex items-start gap-2 mt-3 border"
                        style={{ backgroundColor: "rgba(253,236,240,0.95)", borderColor: "#F3C7D1", color: "#B31942" }}
                      >
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        {passwordError}
                      </div>
                    )}

                    {passwordSuccess && (
                      <div
                        className="text-xs px-3 py-2 rounded-2xl flex items-start gap-2 mt-3 border"
                        style={{ backgroundColor: "rgba(220,232,247,0.95)", borderColor: "#BCD0EA", color: T.blue }}
                      >
                        <Check size={14} className="shrink-0 mt-0.5" />
                        {passwordSuccess}
                      </div>
                    )}

                    <div className="mt-3 flex justify-start">
                      <Button
                        variant="ghost"
                        onClick={changePassword}
                        icon={KeyRound}
                        disabled={passwordSaving}
                      >
                        {passwordSaving ? "Updating password…" : "Update password"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="primary" onClick={save} icon={Check}>
                      Save profile changes
                    </Button>
                    <Button variant="ghost" onClick={cancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!editing && (
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:min-w-[150px]">
              {[
                ["Posts", visiblePosts.length],
                ["Upvotes", totalUpvotes],
                ["Replies", totalReplies],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border px-2 py-2.5 md:p-3 text-center lg:text-left"
                  style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}
                >
                  <div className="text-xl md:text-2xl font-extrabold tabular-nums" style={{ color: T.navy }}>
                    {value}
                  </div>
                  <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!editing && (
          <div className="mt-4 md:mt-5 flex justify-center md:justify-start">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)", borderColor: "rgba(7,27,51,0.18)", color: "#FFFFFF" }}
            >
              <Edit3 size={16} />
              Edit profile
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
