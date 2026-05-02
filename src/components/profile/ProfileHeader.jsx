"use client";
import { useState } from "react";
import { Check, Edit3, Mail, Shield, ShieldCheck } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";

const COLOR_OPTIONS = [
  "#0B1C2C", "#314A66", "#2E7D5B", "#5B3F8C",
  "#9C2A55", "#9C6A1F", "#1F5A87", "#1F6E66", "#B07D2C",
];

export default function ProfileHeader() {
  const { currentUser, updateProfile } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser.full_name);
  const [bio, setBio] = useState(currentUser.bio || "");
  const [color, setColor] = useState(currentUser.avatar_color);

  const save = () => {
    updateProfile({ full_name: name, bio, avatar_color: color });
    setEditing(false);
  };

  const cancel = () => {
    setName(currentUser.full_name);
    setBio(currentUser.bio || "");
    setColor(currentUser.avatar_color);
    setEditing(false);
  };

  return (
    <div
      className="rounded-2xl border p-6 md:p-8"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div className="flex flex-col md:flex-row gap-5 md:items-center">
        <div className="flex flex-col items-center md:items-start gap-3">
          <Avatar
            name={editing ? name : currentUser.full_name}
            color={editing ? color : currentUser.avatar_color}
            size={84}
          />
          {editing && (
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: c === color ? T.gold : "transparent",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 w-full">
          {!editing ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl leading-tight font-serif" style={{ color: T.navy }}>
                  {currentUser.full_name}
                </h1>
                {currentUser.role === "admin" && <Badge tone="amber" icon={Shield}>Admin</Badge>}
                <Badge tone="green" icon={ShieldCheck}>Verified</Badge>
              </div>
              <div className="text-sm mt-1 flex items-center gap-1.5 flex-wrap" style={{ color: T.textMuted }}>
                <Mail size={13} /> {currentUser.email}
                <span className="text-xs" style={{ color: T.textSubtle }}>
                  · verified email cannot be changed
                </span>
              </div>
              {currentUser.bio && (
                <p className="text-[15px] mt-3 leading-relaxed" style={{ color: T.text }}>
                  {currentUser.bio}
                </p>
              )}
              <div className="mt-4">
                <Button variant="secondary" icon={Edit3} onClick={() => setEditing(true)}>
                  Edit profile
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <TextInput label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
              <TextArea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
              <div className="text-xs" style={{ color: T.textSubtle }}>
                Verified email: {currentUser.email} (cannot be changed)
              </div>
              <div className="flex gap-2 mt-1">
                <Button variant="primary" onClick={save} icon={Check}>Save</Button>
                <Button variant="ghost" onClick={cancel}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
