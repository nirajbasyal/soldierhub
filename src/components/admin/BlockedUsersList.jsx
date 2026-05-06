"use client";

import { CheckCircle2, Mail, Phone, ShieldAlert, UserX } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Button from "@/components/ui/Button";
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

function StatusBadge({ status }) {
  const isRevoked = status === "revoked";

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: "rgba(253,236,240,0.95)", color: isRevoked ? "#B31942" : T.blue }}
    >
      {isRevoked ? "Revoked" : "Rejected"}
    </span>
  );
}

export default function BlockedUsersList({ searchQuery = "" }) {
  const { blockedUsers, verifyUserByEmail } = useApp();

  const visibleUsers = blockedUsers.filter((user) =>
    userMatchesSearch(user, searchQuery)
  );

  if (!blockedUsers || blockedUsers.length === 0) {
    return <EmptyState icon={UserX} title="No rejected or revoked users" body="Users rejected during verification or revoked later will appear here." />;
  }

  if (visibleUsers.length === 0) {
    return <EmptyState icon={UserX} title="No matching blocked users" body="Try searching by name, email, military email, phone number, rejected, or revoked." />;
  }

  const handleVerify = async (user) => {
    const email = user.email || user.personal_email || "";

    const confirmed = window.confirm(
      `Verify this user again?\n\n${user.full_name || "Unknown user"}\n${email}\n\nThis will change their status to verified.`
    );

    if (!confirmed) return;

    await verifyUserByEmail(email);
  };

  return (
    <div className="grid gap-3">
      {visibleUsers.map((user) => {
        const email = user.email || user.personal_email || "No email";
        const status = user.status || user.verification_status;

        return (
          <article
            key={user.id}
            className="rounded-3xl border p-4 md:p-5 relative overflow-hidden"
            style={{ backgroundColor: T.card, borderColor: "#D5E2F2", boxShadow: "0 10px 26px rgba(7,27,51,0.05)" }}
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-[#B31942]" />

            <div className="pl-2 flex flex-col sm:flex-row sm:items-start gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(253,236,240,0.95)", color: "#B31942" }}
              >
                <ShieldAlert size={21} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold truncate" style={{ color: T.navy }}>
                    {user.full_name || "Unnamed user"}
                  </h3>
                  <StatusBadge status={status} />
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: T.textMuted }}>
                  <Mail size={12} className="shrink-0" />
                  <span className="truncate">{email}</span>
                </div>

                {user.military_email && (
                  <p className="text-xs mt-1" style={{ color: T.textMuted }}>
                    Military email: <span style={{ color: T.text }}>{user.military_email}</span>
                  </p>
                )}

                {user.phone && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: T.textMuted }}>
                    <Phone size={12} />
                    <span>{user.phone}</span>
                  </p>
                )}

                <p className="text-xs leading-5 mt-2" style={{ color: T.textMuted }}>
                  This user cannot post, comment, report, message, sell, or access verified features unless admin verifies them again.
                </p>
              </div>

              <Button variant="primary" icon={CheckCircle2} onClick={() => handleVerify(user)}>
                Verify again
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
