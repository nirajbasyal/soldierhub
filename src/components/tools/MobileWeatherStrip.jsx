"use client";
import { useEffect, useState } from "react";
import { Sun } from "lucide-react";
import { T } from "@/lib/theme";

const MOCK_WEATHER = { temp: 88, feels: 92, condition: "Sunny" };

export default function MobileWeatherStrip() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("en-US", {
    timeZone: "America/Denver", hour: "numeric", minute: "2-digit",
  });
  const date = now.toLocaleDateString("en-US", {
    timeZone: "America/Denver", weekday: "short", month: "short", day: "numeric",
  });
  const w = MOCK_WEATHER;

  return (
    <div
      className="rounded-2xl border p-4 mb-3 flex items-center gap-4"
      style={{ backgroundColor: T.card, borderColor: T.border }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: T.goldBg }}
      >
        <Sun size={22} style={{ color: T.gold }} strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-light leading-none tabular-nums font-serif" style={{ color: T.navy }}>
            {w.temp}°
          </span>
          <span className="text-sm font-medium" style={{ color: T.text }}>{w.condition}</span>
        </div>
        <div className="text-xs mt-1" style={{ color: T.textMuted }}>
          Fort Bliss · feels like {w.feels}°F
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-base font-medium tabular-nums leading-none" style={{ color: T.text }}>{time}</div>
        <div className="text-xs mt-1" style={{ color: T.textSubtle }}>{date}</div>
      </div>
    </div>
  );
}
