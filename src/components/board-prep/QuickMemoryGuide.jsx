"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, ChevronDown, ShieldCheck } from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";

const FALLBACK_ITEMS = [
  {
    memory_key: "soldiers-creed",
    title: "Soldier's Creed",
    summary: "Opening, Warrior Ethos, Army Values, readiness.",
    body: "Study the full Soldier's Creed from your board packet. Know the opening, Warrior Ethos, Army Values, readiness, professionalism, and the final line.",
  },
  {
    memory_key: "nco-creed",
    title: "NCO Creed",
    summary: "Professionalism, competence, mission, Soldiers.",
    body: "Study the full Creed of the Noncommissioned Officer. Know the opening, the watchword, the two basic responsibilities, and the closing identity of NCOs as professionals and leaders.",
  },
  {
    memory_key: "army-song",
    title: "Army Song",
    summary: "Official title and confidence cue.",
    body: "Official title: The Army Goes Rolling Along. Practice the intro, verse, and refrain from your official board packet.",
  },
  {
    memory_key: "general-orders",
    title: "General Orders",
    summary: "Three common board questions.",
    body: "1. Guard everything within the limits of my post and quit my post only when properly relieved.\n\n2. Obey my special orders and perform all my duties in a military manner.\n\n3. Report violations of my special orders, emergencies, and anything not covered in my instructions to the commander of the relief.",
  },
];

async function getAccessToken() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export default function QuickMemoryGuide() {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState(FALLBACK_ITEMS);
  const [activeKey, setActiveKey] = useState(FALLBACK_ITEMS[0].memory_key);

  useEffect(() => {
    let alive = true;

    async function loadMemoryItems() {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch("/api/board-prep/memory", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        const nextItems = Array.isArray(json.data) && json.data.length ? json.data : null;
        if (!alive || !res.ok || !nextItems) return;
        setItems(nextItems);
        setActiveKey((current) => nextItems.some((item) => item.memory_key === current || item.id === current) ? current : (nextItems[0].memory_key || nextItems[0].id));
      } catch {
        // Keep safe fallback content if network or permissions fail.
      }
    }

    loadMemoryItems();
    return () => { alive = false; };
  }, []);

  const activeItem = useMemo(() => {
    return items.find((item) => item.memory_key === activeKey || item.id === activeKey) || items[0] || FALLBACK_ITEMS[0];
  }, [items, activeKey]);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border shadow-sm" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${T.blueSoft}, #FFFFFF)`, color: T.blue }}
          >
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black leading-tight" style={{ color: T.navy }}>Quick memory guide</p>
              <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]" style={{ backgroundColor: T.redBg, color: T.brandRed }}>
                Board basics
              </span>
            </div>
            <p className="mt-1 text-xs leading-5" style={{ color: T.textMuted }}>Tap a topic. Read the short board-ready cue.</p>
          </div>
        </div>
        <ChevronDown size={19} className={open ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} style={{ color: T.textMuted }} />
      </button>

      {open && (
        <div className="border-t p-3" style={{ borderColor: T.borderSoft }}>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {items.map((item, index) => {
              const key = item.memory_key || item.id || item.title;
              const selected = key === activeKey || item.id === activeKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveKey(key)}
                  className="min-w-[145px] rounded-2xl border px-3 py-3 text-left transition active:scale-[0.98]"
                  style={{
                    borderColor: selected ? "rgba(179,25,66,0.42)" : T.borderSoft,
                    backgroundColor: selected ? T.redBg : T.surface,
                    boxShadow: selected ? "0 10px 24px rgba(179,25,66,0.10)" : "none",
                  }}
                >
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black" style={{ backgroundColor: selected ? T.brandRed : T.blueSoft, color: selected ? "#fff" : T.blue }}>
                      {index + 1}
                    </span>
                    <p className="line-clamp-1 text-sm font-black" style={{ color: T.navy }}>{item.title}</p>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-4" style={{ color: T.textMuted }}>{item.summary || "Tap to review."}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded-[1.5rem] border p-4" style={{ borderColor: T.borderSoft, background: "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)" }}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: T.blueSoft, color: T.blue }}>
                <BookOpenCheck size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black leading-tight" style={{ color: T.navy }}>{activeItem?.title}</p>
                {activeItem?.summary && <p className="mt-0.5 text-[11px] font-semibold" style={{ color: T.textMuted }}>{activeItem.summary}</p>}
              </div>
            </div>
            <p className="whitespace-pre-line text-sm leading-7" style={{ color: T.text }}>{activeItem?.body}</p>
          </div>
        </div>
      )}
    </section>
  );
}
