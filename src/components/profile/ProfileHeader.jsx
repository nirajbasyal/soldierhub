"use client";

import { useState } from "react";
import {
  Check,
  Edit3,
  Mail,
  Shield,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
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
        <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>
          {label}
        </div>
        <div className="text-sm font-semibold truncate" style={{ color: T.navy }}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default function ProfileHeader() {
  const { currentUser, updateProfile, myPosts = [] } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser.full_name || "");
  const [bio, setBio] = useState(currentUser.bio || "");
  const [color, setColor] = useState(currentUser.avatar_color || "#1E4E8C");

  const totalUpvotes = myPosts.reduce((sum, post) => sum + (post.upvote_count || 0), 0);
  const totalReplies = myPosts.reduce((sum, post) => sum + (post.comment_count || 0), 0);

  const save = () => {
    updateProfile({ full_name: name.trim() || currentUser.full_name, bio, avatar_color: color });
    setEditing(false);
  };

  const cancel = () => {
    setName(currentUser.full_name || "");
    setBio(currentUser.bio || "");
    setColor(currentUser.avatar_color || "#1E4E8C");
    setEditing(false);
  };

  return (
    <section
      className="rounded-[32px] border overflow-hidden relative"
      style={{
        borderColor: "#BCD0EA",
        background:
          "linear-gradient(135deg, rgba(220,232,247,0.96) 0%, rgba(253,254,255,0.98) 52%, rgba(253,236,240,0.9) 100%)",
        boxShadow: "0 22px 60px rgba(7,27,51,0.08)",
      }}
    >
      <div className="absolute left-0 top-0 h-full w-2 bg-[#B31942]" />
      <div className="absolute right-0 top-0 h-full w-2 bg-[#1E4E8C]" />

      <div className="p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
          <div className="flex flex-col md:flex-row gap-5 md:items-start min-w-0">
            <div className="flex flex-col items-center md:items-start gap-3 shrink-0">
              <div
                className="rounded-[28px] p-2 border"
                style={{ backgroundColor: "rgba(255,255,255,0.65)", borderColor: "#D5E2F2" }}
              >
                <Avatar
                  name={editing ? name : currentUser.full_name}
                  color={editing ? color : currentUser.avatar_color}
                  size={92}
                />
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
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]"
                    style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2", color: T.blue }}
                  >
                    <UserRound size={14} />
                    My Profile
                  </div>

                  <div className="mt-4 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-[-0.04em] leading-[0.95]" style={{ color: T.navy }}>
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

                  <div className="mt-3 max-w-xl mx-auto md:mx-0">
                    {currentUser.bio ? (
                      <p className="text-[15px] md:text-base leading-7" style={{ color: T.text }}>
                        {currentUser.bio}
                      </p>
                    ) : (
                      <p className="text-[15px] md:text-base leading-7" style={{ color: T.textMuted }}>
                        Add a short bio so other verified community members know who you are.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid sm:grid-cols-2 gap-2 max-w-xl mx-auto md:mx-0">
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
                        Update your display name, bio, and avatar color.
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

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="primary" onClick={save} icon={Check}>
                      Save changes
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
                ["Posts", myPosts.length],
                ["Upvotes", totalUpvotes],
                ["Replies", totalReplies],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border p-3 text-center lg:text-left"
                  style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D5E2F2" }}
                >
                  <div className="text-2xl font-extrabold tabular-nums" style={{ color: T.navy }}>
                    {value}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: T.textSubtle }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!editing && (
          <div className="mt-5 flex justify-center md:justify-start">
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
