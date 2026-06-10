"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertCircle, ArrowRight, RefreshCw, ShieldCheck, UserCog } from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/helpers";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function displayName(profile, fallback = "Unknown") {
  return profile?.full_name || profile?.email || fallback;
}

function displayEmail(profile) {
  return profile?.email || "No email recorded";
}

function formatDate(value) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusPill({ children }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em]"
      style={{ backgroundColor: T.blueSoft, color: T.blue }}
    >
      {children || "none"}
    </span>
  );
}

function AuditCard({ log }) {
  const targetName = displayName(log.profile, "Unknown profile");
  const actorName = displayName(log.actor, "Unknown admin");
  const changedStatus = log.old_verification_status !== log.new_verification_status;
  const changedRole = log.old_role !== log.new_role;

  return (
    <article
      className="relative overflow-hidden rounded-3xl border p-4 shadow-sm md:p-5"
      style={{ backgroundColor: T.card, borderColor: "#D5E2F2", boxShadow: "0 10px 26px rgba(7,27,51,0.05)" }}
    >
      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#1E4E8C]" />

      <div className="pl-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue" icon={Activity}>Profile audit</Badge>
              {changedStatus && <Badge tone="green" icon={ShieldCheck}>Status changed</Badge>}
              {changedRole && <Badge tone="yellow" icon={UserCog}>Role changed</Badge>}
            </div>

            <h3 className="mt-3 text-base font-extrabold md:text-lg" style={{ color: T.navy }}>
              {targetName}
            </h3>
            <p className="mt-1 text-xs" style={{ color: T.textMuted }}>
              {displayEmail(log.profile)}
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-xs font-bold" style={{ color: T.textMuted }}>
              {timeAgo(log.changed_at)}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: T.textSubtle }}>
              {formatDate(log.changed_at)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border p-3 md:grid-cols-2" style={{ backgroundColor: T.surface, borderColor: T.border }}>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.textSubtle }}>
              Changed by
            </p>
            <p className="mt-1 text-sm font-extrabold" style={{ color: T.navy }}>
              {actorName}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: T.textMuted }}>
              {displayEmail(log.actor)}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.textSubtle }}>
              Change
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {changedStatus ? (
                <>
                  <StatusPill>{log.old_verification_status}</StatusPill>
                  <ArrowRight size={15} style={{ color: T.textSubtle }} />
                  <StatusPill>{log.new_verification_status}</StatusPill>
                </>
              ) : changedRole ? (
                <>
                  <StatusPill>{log.old_role}</StatusPill>
                  <ArrowRight size={15} style={{ color: T.textSubtle }} />
                  <StatusPill>{log.new_role}</StatusPill>
                </>
              ) : (
                <span className="text-sm" style={{ color: T.textMuted }}>No visible field change</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AuditLogs({ onCountChange }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Admin session expired. Please sign in again.");

      const res = await fetch("/api/admin/audit/profile-status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 50 }),
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not load audit logs.");

      const nextLogs = Array.isArray(json.data) ? json.data : [];
      setLogs(nextLogs);
      onCountChange?.(nextLogs.length);
    } catch (err) {
      setError(err?.message || "Could not load audit logs.");
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  if (loading) {
    return <EmptyState icon={Activity} title="Loading audit logs..." body="Recent admin profile changes are being loaded securely." />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border p-5" style={{ backgroundColor: T.card, borderColor: T.border }}>
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 shrink-0" size={20} style={{ color: T.danger }} />
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold" style={{ color: T.navy }}>Could not load audit logs</h3>
            <p className="mt-1 text-sm" style={{ color: T.textMuted }}>{error}</p>
            <Button className="mt-4" size="sm" variant="secondary" icon={RefreshCw} onClick={loadLogs}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return <EmptyState icon={Activity} title="No audit logs yet" body="Profile verification and role changes will appear here." />;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 rounded-3xl border p-4 md:flex-row md:items-center md:justify-between" style={{ backgroundColor: T.surface, borderColor: T.border }}>
        <div>
          <h2 className="text-lg font-extrabold" style={{ color: T.navy }}>Admin audit logs</h2>
          <p className="mt-1 text-sm" style={{ color: T.textMuted }}>
            Recent profile verification and role changes. Latest 50 entries are shown.
          </p>
        </div>
        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={loadLogs}>
          Refresh
        </Button>
      </div>

      {logs.map((log) => <AuditCard key={log.id} log={log} />)}
    </div>
  );
}
