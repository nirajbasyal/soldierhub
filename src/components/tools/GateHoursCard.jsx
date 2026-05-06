"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, DoorOpen, Info, MapPin } from "lucide-react";
import { T } from "@/lib/theme";

const GATES = [
  {
    name: "MSG Pena Gate",
    label: "Main Gate",
    hours: "24/7",
    type: "always",
    note: "Primary access gate.",
  },
  {
    name: "Buffalo Soldier Gate",
    label: "Visitor Center",
    hours: "24/7",
    type: "always",
    note: "Gate passes and visitor access can go here.",
  },
  {
    name: "Cassidy Gate",
    label: "Access Gate",
    hours: "24/7",
    type: "always",
    note: "Open daily.",
  },
  {
    name: "Constitution Gate",
    label: "Access Gate",
    hours: "24/7",
    type: "always",
    note: "Open daily.",
  },
  {
    name: "Old Ironsides Gate",
    label: "Weekday Gate",
    hours: "Mon–Fri · 5 AM–9 PM",
    type: "weekday-limited",
    note: "Closed Saturday, Sunday, and national holidays.",
  },
];

function getElPasoParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value;

  return {
    weekday: get("weekday"),
    hour: Number(get("hour") || 0),
    minute: Number(get("minute") || 0),
  };
}

function formatElPasoTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getGateStatus(gate, now) {
  if (gate.type === "always") {
    return {
      open: true,
      text: "Open 24/7",
    };
  }

  const weekday = now.weekday;
  const minutes = now.hour * 60 + now.minute;

  const isWeekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(
    weekday
  );

  const opensAt = 5 * 60;
  const closesAt = 21 * 60;

  const isOpen = isWeekday && minutes >= opensAt && minutes < closesAt;

  return {
    open: isOpen,
    text: isOpen ? "Open now" : "Closed now",
  };
}

function GateRow({ gate, status }) {
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
        style={{ backgroundColor: status.open ? "#1E4E8C" : "#B31942" }}
      />

      <div className="flex items-start justify-between gap-3 pl-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: status.open ? "#207245" : "#B42318",
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

          <div className="mt-2 text-xs leading-relaxed" style={{ color: T.textMuted }}>
            {gate.note}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor: status.open
                ? "rgba(220,232,247,0.95)"
                : "rgba(253,236,240,0.95)",
              color: status.open ? "#1E4E8C" : "#B31942",
            }}
          >
            {status.text}
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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const elPasoNow = useMemo(() => getElPasoParts(now), [now]);
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
        {GATES.map((gate) => (
          <GateRow
            key={gate.name}
            gate={gate}
            status={getGateStatus(gate, elPasoNow)}
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
          Gate hours can change for holidays, training events, or security
          conditions. Confirm with official Fort Bliss channels before travel.
        </span>
      </div>
    </div>
  );
}
