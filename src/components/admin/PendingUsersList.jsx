"use client";

import { useState } from "react";
import { Check, Mail, Phone, UserCheck, X } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
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

export default function PendingUsersList({ searchQuery = "" }) {
  const { pendingUsers, verifyUser, rejectUser } = useApp();
  const [confirm, setConfirm] = useState(null);

  const visibleUsers = pendingUsers.filter((user) =>
    userMatchesSearch(user, searchQuery)
  );

  if (pendingUsers.length === 0) {
    return (
      <EmptyState
        icon={UserCheck}
        title="No pending users"
        body="You're all caught up."
      />
    );
  }

  if (visibleUsers.length === 0) {
    return (
      <EmptyState
        icon={UserCheck}
        title="No matching pending users"
        body="Try searching by name, email, military email, or phone number."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {visibleUsers.map((u) => {
        const email = u.email || u.personal_email || "No email";

        return (
          <div
            key={u.id}
            className="rounded-xl border p-4 flex items-start gap-3"
            style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}
          >
            <Avatar name={u.full_name} color={u.avatar_color} size={42} />

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: T.text }}>
                {u.full_name || "Unnamed user"}
              </div>

              <div
                className="text-xs truncate flex items-center gap-1 mt-0.5"
                style={{ color: T.textMuted }}
              >
                <Mail size={12} />
                <span className="truncate">{email}</span>
              </div>

              {u.military_email && (
                <div
                  className="text-xs truncate mt-1"
                  style={{ color: T.textMuted }}
                >
                  Military email:{" "}
                  <span style={{ color: T.text }}>{u.military_email}</span>
                </div>
              )}

              {u.phone && (
                <div
                  className="text-xs truncate mt-1 flex items-center gap-1"
                  style={{ color: T.textMuted }}
                >
                  <Phone size={12} />
                  <span>{u.phone}</span>
                </div>
              )}

              {u.bio && (
                <div
                  className="text-xs mt-1 line-clamp-2"
                  style={{ color: T.textSubtle }}
                >
                  {u.bio}
                </div>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                variant="softSuccess"
                size="sm"
                icon={Check}
                onClick={() => verifyUser(u.id)}
              >
                Verify
              </Button>

              <Button
                variant="softDanger"
                size="sm"
                icon={X}
                onClick={() =>
                  setConfirm({
                    id: u.id,
                    name: u.full_name || "this user",
                  })
                }
              >
                Reject
              </Button>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!confirm}
        title={`Reject ${confirm?.name}?`}
        body="This user will not be approved right now. They can request re-review later using the same account."
        confirmText="Reject user"
        danger
        onConfirm={() => {
          rejectUser(confirm.id);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}