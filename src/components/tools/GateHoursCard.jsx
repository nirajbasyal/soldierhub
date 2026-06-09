"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, DoorOpen, Info, MapPin } from "lucide-react";
import { T } from "@/lib/theme";
import { listGates } from "@/lib/db/gates";

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

function timeToMinutes(value) {
  if (!value) return null;
  const [hour, minute] = String(value).split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function getGateStatus(gate, now) {
  if (gate.status_type === "closed") {
    return { open: false, text: "Closed" };
  }

  if (gate.status_type === "custom") {
    const open = gate.custom_is_open !== false;
    return {
      open,
      text: gate.custom_status_text || (open ? "Open" : "Closed"),
    };
  }

  if (gate.status_type === "always" || gate.hours === "24/7") {
    return { open: true, text: "Open 24/7" };
  }

  const days = Array.isArray(gate.days) && gate.days.length
    ? gate.days
    : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const opensAt = timeToMinutes(gate.open_time) ?? 5 * 60;
  const closesAt = timeToMinutes(gate.close_time) ?? 21 * 60;
  const minutes = now.hour * 60 + now.minute;
  const isOpenDay = days.includes(now.weekday);
  const isOpen = isOpenDay && minutes >= opensAt && minutes < closesAt;

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
        style={{ backgroundColor: status.open ? "#207245" : "#B42318" }}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 pl-1.5">
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

          {gate.note ? (
            <div className="mt-2 text-xs leading-relaxed" style={{ color: T.textMuted }}>
              {gate.note}
            </div>
          ) : null}
        </div>

        <div className="min-w-[86px] max-w-[150px] text-right">
          <div
            className="ml-auto inline-flex w-fit max-w-full justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none whitespace-nowrap"
            style={{
              backgroundColor: status.open
                ? "rgba(236,247,239,0.95)"
                : "rgba(253,236,240,0.95)",
              color: status.open ? "#207245" : "#B42318",
            }}
          >
            {status.text}
          </div>

          <div className="mt-1 text-[11px] leading-snug" style={{ color: T.textSubtle }}>
            {gate.hours}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GateHoursCard() {
  const [now, setNow] = useState(new Date());
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGates() {
      const { data, error } = await listGates();
      if (cancelled) return;

      setGates(error ? [] : data || []);
      setLoadError(Boolean(error));
      setLoading(false);
    }

    loadGates();

    return () => {
      cancelled = true;
    };
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
        {loading ? (
          <div className="rounded-xl border px-3 py-4 text-center text-xs" style={{ borderColor: "#D5E2F2", color: T.textMuted }}>
            Loading gate hours...
          </div>
        ) : gates.length === 0 ? (
          <div className="rounded-xl border px-3 py-4 text-center text-xs" style={{ borderColor: "#D5E2F2", color: T.textMuted }}>
            {loadError ? "Gate hours are temporarily unavailable." : "No gate hours are listed right now."}
          </div>
        ) : gates.map((gate) => (
          <GateRow
            key={gate.id || gate.name}
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
          Gate hours are public schedule information and can change for holidays, training events, weather, or official updates.
          Confirm with official Fort Bliss channels before travel.
        </span>
      </div>
    </div>
  );
}
