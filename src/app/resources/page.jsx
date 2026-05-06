"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  ExternalLink,
  FileText,
  LifeBuoy,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { listResources } from "@/lib/db/resources";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import ResourceCard from "@/components/resources/ResourceCard";

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function SectionPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 whitespace-nowrap"
      style={{
        background: active
          ? "linear-gradient(135deg, #071B33 0%, #1E4E8C 100%)"
          : "rgba(255,255,255,0.78)",
        color: active ? "#FFFFFF" : T.navy,
        border: `1px solid ${active ? "rgba(7,27,51,0.18)" : "#D5E2F2"}`,
        boxShadow: active ? "0 10px 22px rgba(7,27,51,0.12)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function StatusCard({ icon: Icon, title, body }) {
  return (
    <div
      className="rounded-3xl border p-8 md:p-10 text-center"
      style={{
        backgroundColor: T.card,
        borderColor: T.border,
        boxShadow: "0 12px 30px rgba(7,27,51,0.05)",
      }}
    >
      <div
        className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "rgba(220,232,247,0.95)" }}
      >
        <Icon size={24} style={{ color: T.blue }} strokeWidth={2.2} />
      </div>
      <h2 className="mt-4 text-xl font-bold" style={{ color: T.navy }}>
        {title}
      </h2>
      <p className="mt-2 text-sm leading-7 max-w-md mx-auto" style={{ color: T.textMuted }}>
        {body}
      </p>
    </div>
  );
}

export default function ResourcesPage() {
  const router = useRouter();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedSection, setSelectedSection] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadResources() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await listResources();

      if (!alive) return;

      if (error) {
        setLoadError(error.message || "Could not load resources.");
        setResources([]);
      } else {
        setResources(data || []);
      }

      setLoading(false);
    }

    loadResources();

    return () => {
      alive = false;
    };
  }, []);

  const sections = useMemo(() => {
    const uniqueSections = Array.from(
      new Set(resources.map((resource) => resource.section || "General"))
    );

    return ["All", ...uniqueSections];
  }, [resources]);

  const filteredResources = useMemo(() => {
    const cleanQuery = normalizeText(query);

    return resources.filter((resource) => {
      const section = resource.section || "General";
      const matchesSection =
        selectedSection === "All" || section === selectedSection;

      const searchable = normalizeText(
        `${resource.title} ${resource.description} ${section}`
      );
      const matchesQuery = !cleanQuery || searchable.includes(cleanQuery);

      return matchesSection && matchesQuery;
    });
  }, [resources, selectedSection, query]);

  const groupedResources = useMemo(() => {
    return filteredResources.reduce((groups, resource) => {
      const section = resource.section || "General";

      if (!groups[section]) {
        groups[section] = [];
      }

      groups[section].push(resource);

      return groups;
    }, {});
  }, [filteredResources]);

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(220,232,247,0.9), transparent 32%), linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 48%, #F4F8FD 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
            style={{
              backgroundColor: "rgba(255,255,255,0.86)",
              borderColor: "#D5E2F2",
              color: T.navy,
            }}
          >
            <ArrowLeft size={16} />
            Back to feed
          </button>

          <section
            className="mt-6 rounded-[32px] border overflow-hidden relative"
            style={{
              borderColor: "#BCD0EA",
              background:
                "linear-gradient(135deg, rgba(220,232,247,0.96) 0%, rgba(253,254,255,0.98) 52%, rgba(253,236,240,0.9) 100%)",
              boxShadow: "0 22px 60px rgba(7,27,51,0.08)",
            }}
          >
            <div className="absolute left-0 top-0 h-full w-2 bg-[#B31942]" />
            <div className="absolute right-0 top-0 h-full w-2 bg-[#1E4E8C]" />

            <div className="p-6 md:p-8">
              <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-end">
                <div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.72)",
                      borderColor: "#D5E2F2",
                      color: T.blue,
                    }}
                  >
                    <BookMarked size={15} />
                    Fort Bliss Resources
                  </div>

                  <h1
                    className="mt-5 text-4xl md:text-5xl font-extrabold tracking-[-0.04em] leading-[0.95]"
                    style={{ color: T.navy }}
                  >
                    Resources
                  </h1>

                  <p
                    className="mt-3 max-w-2xl text-sm md:text-base leading-7"
                    style={{ color: T.textMuted }}
                  >
                    Useful links for Fort Bliss soldiers and families, organized
                    for quick access and reviewed by SoldierHub admins.
                  </p>
                </div>

                <div
                  className="rounded-3xl border p-4"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.72)",
                    borderColor: "#D5E2F2",
                  }}
                >
                  <div
                    className="text-xs font-bold uppercase tracking-[0.14em]"
                    style={{ color: T.textSubtle }}
                  >
                    Resource center
                  </div>

                  <div className="mt-3 grid gap-2">
                    <div className="flex items-start gap-3 rounded-2xl border p-3" style={{ backgroundColor: "rgba(255,255,255,0.78)", borderColor: "rgba(188,208,234,0.85)" }}>
                      <ShieldCheck size={18} className="mt-0.5 shrink-0" style={{ color: T.blue }} />
                      <div>
                        <div className="text-sm font-bold" style={{ color: T.navy }}>
                          Admin reviewed
                        </div>
                        <div className="text-xs mt-1 leading-relaxed" style={{ color: T.textMuted }}>
                          Resource entries can be updated as the community grows.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl border p-3" style={{ backgroundColor: "rgba(255,255,255,0.78)", borderColor: "rgba(188,208,234,0.85)" }}>
                      <LifeBuoy size={18} className="mt-0.5 shrink-0" style={{ color: "#B31942" }} />
                      <div>
                        <div className="text-sm font-bold" style={{ color: T.navy }}>
                          Verify urgent info
                        </div>
                        <div className="text-xs mt-1 leading-relaxed" style={{ color: T.textMuted }}>
                          For emergencies, use official emergency channels.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            className="mt-5 rounded-3xl border p-4 md:p-5"
            style={{
              backgroundColor: "rgba(255,255,255,0.86)",
              borderColor: T.border,
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div
                className="flex-1 min-w-0 rounded-2xl border px-3 py-2.5 flex items-center gap-2"
                style={{
                  backgroundColor: T.card,
                  borderColor: "#D5E2F2",
                }}
              >
                <Search size={18} className="shrink-0" style={{ color: T.blue }} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search resources..."
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: T.text }}
                />
              </div>

              <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
                <div className="flex gap-2 min-w-max">
                  {sections.map((section) => (
                    <SectionPill
                      key={section}
                      active={selectedSection === section}
                      onClick={() => setSelectedSection(section)}
                    >
                      {section}
                    </SectionPill>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5">
            {loading ? (
              <StatusCard
                icon={Sparkles}
                title="Loading resources"
                body="Checking the latest SoldierHub resource list."
              />
            ) : loadError ? (
              <StatusCard
                icon={LifeBuoy}
                title="Could not load resources"
                body={loadError}
              />
            ) : resources.length === 0 ? (
              <StatusCard
                icon={FileText}
                title="No resources added yet"
                body="Admins can add helpful links for soldiers and families from the admin dashboard."
              />
            ) : filteredResources.length === 0 ? (
              <StatusCard
                icon={Search}
                title="No matching resources"
                body="Try another search term or choose a different section."
              />
            ) : (
              <div className="flex flex-col gap-8">
                {Object.entries(groupedResources).map(([section, items]) => (
                  <section key={section}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: "rgba(220,232,247,0.95)" }}
                        >
                          <BookMarked size={15} style={{ color: T.blue }} />
                        </div>

                        <h2
                          className="text-sm font-extrabold uppercase tracking-[0.12em]"
                          style={{ color: T.navy }}
                        >
                          {section}
                        </h2>
                      </div>

                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{
                          backgroundColor: "rgba(244,248,253,0.95)",
                          color: T.textSubtle,
                        }}
                      >
                        {items.length} {items.length === 1 ? "link" : "links"}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {items.map((resource) => (
                        <ResourceCard
                          key={resource.id}
                          title={resource.title}
                          description={resource.description}
                          url={resource.link}
                          link={resource.link}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>

          <div
            className="rounded-3xl border p-5 mt-8 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(220,232,247,0.95), rgba(253,254,255,0.98), rgba(253,236,240,0.75))",
              borderColor: "#BCD0EA",
            }}
          >
            <div className="absolute left-0 top-0 h-full w-1.5 bg-[#B31942]" />
            <div className="absolute right-0 top-0 h-full w-1.5 bg-[#1E4E8C]" />

            <div className="flex items-start gap-3 pl-2">
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.78)" }}
              >
                <ExternalLink size={20} style={{ color: T.blue }} />
              </div>

              <div>
                <div className="text-base font-bold" style={{ color: T.navy }}>
                  Have a resource we missed?
                </div>

                <p className="text-sm leading-7 mt-1" style={{ color: T.textMuted }}>
                  Post your suggestion in the feed with the tag{" "}
                  <span style={{ color: T.navy, fontWeight: 700 }}>
                    General Q&amp;A
                  </span>{" "}
                  and admins can review it for inclusion.
                </p>
              </div>
            </div>
          </div>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}
