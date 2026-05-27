"use client";

import { useState } from "react";
import { Mail, Phone, ShieldCheck, User, UserX } from "lucide-react";
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

export default function MembersList({ searchQuery = "" }) {
  const { users, removeUser } = useApp();
  const [confirm, setConfirm] = useState(null);

  const members = users.filter((u) => u.role !== "admin");

  const visibleUsers = members.filter((user) =>
    userMatchesSearch(user, searchQuery)
  );

  if (members.length === 0) {
    return <EmptyState icon={User} title="No members yet" body="Verified members will appear here." />;
  }

  if (visibleUsers.length === 0) {
    return <EmptyState icon={User} title="No matching members" body="Try searching by name, email, or phone number." />;
  }

  return (
    <div className="grid gap-3">
      {visibleUsers.map((u) => {
        const email = u.email || u.personal_email || "No email";

        return (
          <article
            key={u.id}
            className="rounded-3xl border p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 relative overflow-hidden"
            style={{ backgroundColor: T.card, borderColor: "#D5E2F2", boxShadow: "0 10px 26px rgba(7,27,51,0.05)" }}
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-[#1E4E8C]" />

            <div className="pl-2 shrink-0">
              <Avatar name={u.full_name} color={u.avatar_color} size={48} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold truncate" style={{ color: T.navy }}>
                  {u.full_name || "Unnamed user"}
                </h3>
                <Badge tone="green" icon={ShieldCheck}>Verified</Badge>
              </div>

              <DetailLine icon={Mail}>{email}</DetailLine>
              {u.phone && <DetailLine icon={Phone}>Phone: {u.phone}</DetailLine>}
            </div>

            <Button
              variant="softDanger"
              size="sm"
              icon={UserX}
              onClick={() => setConfirm({ id: u.id, name: u.full_name || "this user", email })}
            >
              Revoke
            </Button>
          </article>
        );
      })}

      <ConfirmDialog
        open={!!confirm}
        title={`Revoke access for ${confirm?.name}?`}
        body="This member will lose verified access. Their existing posts and comments will remain visible. You can re-verify them later if needed."
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
