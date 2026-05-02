"use client";

import { useState } from "react";
import { ShieldCheck, User, UserX } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";

function userMatchesSearch(user, searchQuery) {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;

  return [
    user.full_name,
    user.email,
    user.personal_email,
    user.military_email,
    user.phone,
    user.status,
    user.verification_status,
    user.bio,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export default function MembersList({ searchQuery = "" }) {
  const { users, removeUser } = useApp();
  const [confirm, setConfirm] = useState(null);

  const members = users.filter((u) => u.role !== "admin");

  const visibleUsers = members.filter((user) =>
    userMatchesSearch(user, searchQuery)
  );

  if (members.length === 0) {
    return (
      <EmptyState
        icon={User}
        title="No members yet"
        body="Verified members will appear here."
      />
    );
  }

  if (visibleUsers.length === 0) {
    return (
      <EmptyState
        icon={User}
        title="No matching members"
        body="Try searching by name, email, military email, or phone number."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {visibleUsers.map((u) => {
        const email = u.email || u.personal_email || "No email";

        return (
          <div
            key={u.id}
            className="rounded-xl border p-4 flex items-center gap-3"
            style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}
          >
            <Avatar name={u.full_name} color={u.avatar_color} size={36} />

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: T.text }}>
                {u.full_name || "Unnamed user"}
              </div>

              <div className="text-xs truncate" style={{ color: T.textMuted }}>
                {email}
              </div>

              {u.military_email && (
                <div className="text-xs truncate mt-1" style={{ color: T.textMuted }}>
                  Military email:{" "}
                  <span style={{ color: T.text }}>{u.military_email}</span>
                </div>
              )}

              {u.phone && (
                <div className="text-xs truncate mt-1" style={{ color: T.textMuted }}>
                  Phone: <span style={{ color: T.text }}>{u.phone}</span>
                </div>
              )}
            </div>

            <Badge tone="green" icon={ShieldCheck}>
              Verified
            </Badge>

            <Button
              variant="softDanger"
              size="sm"
              icon={UserX}
              onClick={() =>
                setConfirm({
                  id: u.id,
                  name: u.full_name || "this user",
                  email,
                })
              }
            >
              Revoke
            </Button>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!confirm}
        title={`Revoke access for ${confirm?.name}?`}
        body={`This member will lose verified access. Their existing posts and comments will remain visible. You can re-verify them later if needed.`}
        confirmText="Revoke access"
        danger
        onConfirm={() => {
          removeUser(confirm.id);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}