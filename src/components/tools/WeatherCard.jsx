"use client";
import { useEffect, useState } from "react";
import { Droplets, Sparkles, Sun, Wind } from "lucide-react";
import { T } from "@/lib/theme";

// Replace with a real weather API call when wiring production.
const MOCK_WEATHER = {
  temp: 88, feels: 92, wind: 12, humidity: 18, uv: 9, condition: "Sunny",
};

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon size={14} style={{ color: T.textSubtle }} strokeWidth={2.25} />
      <div className="text-xs mt-1" style={{ color: T.textSubtle }}>{label}</div>
      <div className="text-sm font-semibold tabular-nums" style={{ color: T.text }}>{value}</div>
    </div>
  );
}

export default function WeatherCard() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("en-US", {
    timeZone: "America/Denver", hour: "numeric", minute: "2-digit",
  });
  const w = MOCK_WEATHER;

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textSubtle }}>Fort Bliss</div>
          <div className="text-sm font-semibold" style={{ color: T.text }}>El Paso, TX</div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: T.textSubtle }}>Local time</div>
          <div className="text-sm font-medium tabular-nums" style={{ color: T.text }}>{time}</div>
        </div>
      </div>

      <div className="flex items-end gap-3 my-3">
        <div className="text-5xl font-light leading-none tabular-nums font-serif" style={{ color: T.navy }}>
          {w.temp}°
        </div>
        <div className="flex flex-col gap-0.5 mb-1">
          <div className="text-sm font-medium" style={{ color: T.text }}>{w.condition}</div>
          <div className="text-xs" style={{ color: T.textMuted }}>Feels like {w.feels}°F</div>
        </div>
        <div
          className="ml-auto w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: T.goldBg }}
        >
          <Sun size={24} style={{ color: T.gold }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t" style={{ borderColor: T.borderSoft }}>
        <Stat icon={Wind} label="Wind" value={`${w.wind} mph`} />
        <Stat icon={Droplets} label="Humidity" value={`${w.humidity}%`} />
        <Stat icon={Sun} label="UV" value={w.uv} />
      </div>

      <div
        className="mt-3 px-3 py-2 rounded-lg text-xs flex items-start gap-2 leading-relaxed"
        style={{ backgroundColor: T.amberBg, color: T.amber }}
      >
        <Sparkles size={13} className="shrink-0 mt-0.5" />
        High UV — wear sunscreen and hydrate during PT.
      </div>
    </div>
  );
}
