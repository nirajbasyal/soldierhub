"use client";
import { useState } from "react";
import { Check, UserCheck, X } from "lucide-react";
import { T } from "@/lib/theme";
import { useApp } from "@/store/AppContext";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";

export default function PendingUsersList() {
  const { pendingUsers, verifyUser, rejectUser } = useApp();
  const [confirm, setConfirm] = useState(null);

  if (pendingUsers.length === 0) {
    return <EmptyState icon={UserCheck} title="No pending users" body="You're all caught up." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {pendingUsers.map((u) => (
        <div
          key={u.id}
          className="rounded-xl border p-4 flex items-center gap-3"
          style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}
        >
          <Avatar name={u.full_name} color={u.avatar_color} size={42} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: T.text }}>{u.full_name}</div>
            <div className="text-xs truncate" style={{ color: T.textMuted }}>{u.email}</div>
            {u.bio && (
              <div className="text-xs mt-1 line-clamp-2" style={{ color: T.textSubtle }}>{u.bio}</div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="softSuccess" size="sm" icon={Check} onClick={() => verifyUser(u.id)}>
              Verify
            </Button>
            <Button variant="softDanger" size="sm" icon={X}
                    onClick={() => setConfirm({ id: u.id, name: u.full_name })}>
              Reject
            </Button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!confirm}
        title={`Reject ${confirm?.name}?`}
        body="This person won't be able to log in or post. They can sign up again later."
        confirmText="Reject user"
        danger
        onConfirm={() => { rejectUser(confirm.id); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
