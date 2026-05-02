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

export default function MembersList() {
  const { users, removeUser } = useApp();
  const members = users.filter((u) => u.role !== "admin");
  const [confirm, setConfirm] = useState(null);

  if (members.length === 0) {
    return <EmptyState icon={User} title="No members yet" body="Verified members will appear here." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((u) => (
        <div
          key={u.id}
          className="rounded-xl border p-4 flex items-center gap-3"
          style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}
        >
          <Avatar name={u.full_name} color={u.avatar_color} size={36} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: T.text }}>{u.full_name}</div>
            <div className="text-xs truncate" style={{ color: T.textMuted }}>{u.email}</div>
          </div>
          <Badge tone="green" icon={ShieldCheck}>Verified</Badge>
          <Button variant="softDanger" size="sm" icon={UserX}
                  onClick={() => setConfirm({ id: u.id, name: u.full_name })}>
            Remove
          </Button>
        </div>
      ))}

      <ConfirmDialog
        open={!!confirm}
        title={`Revoke access for ${confirm?.name}?`}
        body="This member will lose posting access. Their existing posts will remain visible. You can re-verify them later if needed."
        confirmText="Revoke access"
        danger
        onConfirm={() => { removeUser(confirm.id); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
