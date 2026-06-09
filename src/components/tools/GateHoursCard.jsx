"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, DoorOpen, Info, MapPin } from "lucide-react";
import { T } from "@/lib/theme";
import { listGates } from "@/lib/db/gates";

const FALLBACK_GATES = [
  {
    name: "MSG Pena Gate",
    label: "Main Gate",
    hours: "24/7",
    status_type: "always",
    note: "Primary access gate.",
    is_active: true,
    display_order: 1,
  },
  {
    name: "Buffalo Soldier Gate",
    label: "Visitor Center",
    hours: "24/7",
    status_type: "always",
    note: "Gate passes and visitor access can go here.",
    is_active: true,
    display_order: 2,
  },
  {
    name: "Cassidy Gate",
    label: "Access Gate",
    hours: "24/7",
    status_type: "always",
    note: "Open daily.",
    is_active: true,
    display_order: 3,
  },
  {
    name: "Constitution Gate",
    label: "Access Gate",
    hours: "24/7",
    status_type: "always",
    note: "Open daily.",
    is_active: true,
    display_order: 4,
  },
  {
    name: "Old Ironsides Gate",
    label: "Weekday Gate",
    hours: "Mon-Fri · 5 AM-9 PM",
    status_type: "weekday-limited",
    note: "Closed Saturday, Sunday, and national holidays.",
    is_active: true,
    display_order: 5,
  },
];

function formatElPasoTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getScheduleLabel(gate) {
  if (gate.status_type === "closed") return "Listed closed";
  if (gate.status_type === "custom") return gate.custom_status_text || "Custom note";
  if (gate.status_type === "always" || gate.hours === "24/7") return "Published 24/7";
  return "Published hours";
}

function GateRow({ gate }) {
  const scheduleLabel = getScheduleLabel(gate);
  const isClosed = gate.status_type === "closed";

  return (
    <div
      className="rounded-xl border px-3 py-3 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(253,254,255,0.98) 0%, rgba(244,248,253,0.92) 100%)",
        borderColor: "#D5E2F2",
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: isClosed ? "#B31942" : "#1E4E8C" }}
      />

      <div className="flex items-start justify-between gap-3 pl-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: isClosed ? "#B42318" : "#1E4E8C",
              }}
            />

            <div
              className="text-sm font-semibold leading-snug"
              style={{ color: T.navy }}
            >
              {gate.name}
            </div>
          </div>

          <div className="mt-1 text-xs" style={{ color: T.blue }}>
            {gate.label}
          </div>

          {gate.note ? (
            <div className="mt-2 text-xs leading-relaxed" style={{ color: T.textMuted }}>
              {gate.note}
            </div>
          ) : null}
        </div>

        <div className="text-right shrink-0">
          <div
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor: isClosed
                ? "rgba(253,236,240,0.95)"
                : "rgba(220,232,247,0.95)",
              color: isClosed ? "#B31942" : "#1E4E8C",
            }}
          >
            {scheduleLabel}
          </div>

          <div className="mt-1 text-[11px]" style={{ color: T.textSubtle }}>
            {gate.hours}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GateHoursCard() {
  const [now, setNow] = useState(new Date());
  const [gates, setGates] = useState(FALLBACK_GATES);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGates() {
      const { data, error } = await listGates();
      if (cancelled) return;

      if (error || !data?.length) {
        setGates(FALLBACK_GATES);
        setUsingFallback(true);
      } else {
        setGates(data);
        setUsingFallback(false);
      }

      setLoading(false);
    }

    loadGates();

    return () => {
      cancelled = true;
    };
  }, []);

  const localTime = useMemo(() => formatElPasoTime(now), [now]);

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: T.card,
        borderColor: T.border,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(220,232,247,0.95)" }}
        >
          <DoorOpen size={20} style={{ color: T.blue }} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="text-lg font-semibold leading-none"
            style={{ color: T.navy }}
          >
            Gate Hours
          </h3>

          <div
            className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
            style={{ color: T.textSubtle }}
          >
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              Fort Bliss
            </span>

            <span>•</span>

            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} />
              {localTime}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {loading ? (
          <div className="rounded-xl border px-3 py-4 text-center text-xs" style={{ borderColor: "#D5E2F2", color: T.textMuted }}>
            Loading gate hours...
          </div>
        ) : gates.map((gate) => (
          <GateRow
            key={gate.id || gate.name}
            gate={gate}
          />
        ))}
      </div>

      <div
        className="mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed"
        style={{
          background:
            "linear-gradient(135deg, rgba(244,248,253,0.95), rgba(253,254,255,0.95))",
          borderColor: "#D5E2F2",
          color: T.textMuted,
        }}
      >
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: T.blue }} />
        <span>
          Gate hours are public schedule information and can change for holidays, training events, weather, or official updates.
          Confirm with official Fort Bliss channels before travel.
          {usingFallback ? " Showing fallback hours because live gate data is temporarily unavailable." : ""}
        </span>
      </div>
    </div>
  );
}
