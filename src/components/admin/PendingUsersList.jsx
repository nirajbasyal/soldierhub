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

function DetailLine({ icon: Icon, children }) {
  return (
    <div className="text-xs truncate flex items-center gap-1.5 mt-1" style={{ color: T.textMuted }}>
      <Icon size={12} className="shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

export default function PendingUsersList({ searchQuery = "" }) {
  const { pendingUsers, verifyUser, rejectUser } = useApp();
  const [confirm, setConfirm] = useState(null);

  const visibleUsers = pendingUsers.filter((user) =>
    userMatchesSearch(user, searchQuery)
  );

  if (pendingUsers.length === 0) {
    return <EmptyState icon={UserCheck} title="No pending users" body="You're all caught up." />;
  }

  if (visibleUsers.length === 0) {
    return <EmptyState icon={UserCheck} title="No matching pending users" body="Try searching by name, email, military email, or phone number." />;
  }

  return (
    <div className="grid gap-3">
      {visibleUsers.map((u) => {
        const email = u.email || u.personal_email || "No email";

        return (
          <article
            key={u.id}
            className="rounded-3xl border p-4 md:p-5 flex flex-col sm:flex-row sm:items-start gap-4 relative overflow-hidden"
            style={{ backgroundColor: T.card, borderColor: "#D5E2F2", boxShadow: "0 10px 26px rgba(7,27,51,0.05)" }}
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-[#1E4E8C]" />

            <div className="pl-2 shrink-0">
              <Avatar name={u.full_name} color={u.avatar_color} size={50} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold truncate" style={{ color: T.navy }}>
                  {u.full_name || "Unnamed user"}
                </h3>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: "rgba(220,232,247,0.95)", color: T.blue }}>
                  Pending review
                </span>
              </div>

              <DetailLine icon={Mail}>{email}</DetailLine>

              {u.military_email && (
                <DetailLine icon={Mail}>Military email: {u.military_email}</DetailLine>
              )}

              {u.phone && <DetailLine icon={Phone}>{u.phone}</DetailLine>}

              {u.bio && (
                <p className="text-xs mt-2 line-clamp-2 leading-5" style={{ color: T.textSubtle }}>
                  {u.bio}
                </p>
              )}
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0 pl-2 sm:pl-0">
              <Button variant="softSuccess" size="sm" icon={Check} onClick={() => verifyUser(u.id)}>
                Verify
              </Button>

              <Button
                variant="softDanger"
                size="sm"
                icon={X}
                onClick={() => setConfirm({ id: u.id, name: u.full_name || "this user" })}
              >
                Reject
              </Button>
            </div>
          </article>
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
